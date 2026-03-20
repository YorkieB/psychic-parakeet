/**
 * Cache Manager
 * Caches frequently accessed code to reduce S3 calls
 */

import type { Logger } from "winston";

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export interface CacheManager {
  get(blobId: string): Promise<string | null>;
  set(blobId: string, content: string, ttl?: number): Promise<void>;
  has(blobId: string): Promise<boolean>;
  delete(blobId: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

/**
 * In-memory cache implementation (fallback if Redis unavailable)
 */
export class MemoryCacheManager implements CacheManager {
  private logger: Logger;
  private cache: Map<string, { content: string; expiresAt: number }>;
  private maxSize: number;
  private hits: number = 0;
  private misses: number = 0;
  private defaultTTL: number;

  constructor(logger: Logger, maxSize: number = 1000, defaultTTLHours: number = 24) {
    this.logger = logger;
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLHours * 3600 * 1000; // Convert to milliseconds
  }

  async get(blobId: string): Promise<string | null> {
    const entry = this.cache.get(blobId);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(blobId);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.content;
  }

  async set(blobId: string, content: string, ttl?: number): Promise<void> {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(blobId)) {
      this.evictLRU();
    }

    const ttlMs = ttl ? ttl * 1000 : this.defaultTTL;
    this.cache.set(blobId, {
      content,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async has(blobId: string): Promise<boolean> {
    const entry = this.cache.get(blobId);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(blobId);
      return false;
    }
    return true;
  }

  async delete(blobId: string): Promise<void> {
    this.cache.delete(blobId);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async getStats(): Promise<CacheStats> {
    // Clean expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate,
    };
  }

  private evictLRU(): void {
    // Simple eviction: remove oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
  }
}

/**
 * Redis cache implementation (preferred)
 */
export class RedisCacheManager implements CacheManager {
  private logger: Logger;
  private redis: any; // Redis client
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(logger: Logger, redisUrl?: string, defaultTTLHours: number = 24) {
    this.logger = logger;
    this.defaultTTL = defaultTTLHours * 3600; // Convert to seconds for Redis

    try {
      // Dynamic import - ioredis is optional; cache silently degrades if unavailable
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require("ioredis") as new (url: string, opts?: Record<string, unknown>) => unknown;
      this.redis = new Redis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", {
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.error("Redis connection failed after 3 retries");
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on("error", (error: Error) => {
        this.logger.warn("Redis error:", { error: error.message });
      });

      this.redis.on("connect", () => {
        this.logger.info("✅ Redis cache connected");
      });
    } catch (error) {
      this.logger.warn("Redis not available, falling back to memory cache:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async get(blobId: string): Promise<string | null> {
    try {
      const key = `swh:${blobId}`;
      const content = await this.redis.get(key);

      if (content) {
        this.hits++;
        return content;
      } else {
        this.misses++;
        return null;
      }
    } catch (error) {
      this.logger.warn("Redis get error:", {
        error: error instanceof Error ? error.message : String(error),
        blobId,
      });
      this.misses++;
      return null;
    }
  }

  async set(blobId: string, content: string, ttl?: number): Promise<void> {
    try {
      const key = `swh:${blobId}`;
      const ttlSeconds = ttl || this.defaultTTL;
      await this.redis.setex(key, ttlSeconds, content);
    } catch (error) {
      this.logger.warn("Redis set error:", {
        error: error instanceof Error ? error.message : String(error),
        blobId,
      });
      // Don't throw - cache miss is acceptable
    }
  }

  async has(blobId: string): Promise<boolean> {
    try {
      const key = `swh:${blobId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (_error) {
      return false;
    }
  }

  async delete(blobId: string): Promise<void> {
    try {
      const key = `swh:${blobId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn("Redis delete error:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys("swh:*");
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.hits = 0;
      this.misses = 0;
    } catch (error) {
      this.logger.warn("Redis clear error:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const size = await this.redis.dbsize();
      const total = this.hits + this.misses;
      const hitRate = total > 0 ? this.hits / total : 0;

      return {
        hits: this.hits,
        misses: this.misses,
        size,
        hitRate,
      };
    } catch (error) {
      this.logger.warn("Redis stats error:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        hits: this.hits,
        misses: this.misses,
        size: 0,
        hitRate: 0,
      };
    }
  }
}

/**
 * Factory function to create appropriate cache manager
 */
export function createCacheManager(
  logger: Logger,
  useRedis: boolean = true,
  redisUrl?: string,
  maxSize: number = 1000,
  defaultTTLHours: number = 24,
): CacheManager {
  if (useRedis) {
    try {
      return new RedisCacheManager(logger, redisUrl, defaultTTLHours);
    } catch (_error) {
      logger.warn("Falling back to memory cache");
      return new MemoryCacheManager(logger, maxSize, defaultTTLHours);
    }
  }

  return new MemoryCacheManager(logger, maxSize, defaultTTLHours);
}
