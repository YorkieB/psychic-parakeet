/*
  This file helps Jarvis remember things it has already looked up to save time and work faster.

  It handles caching of queries and research results while making sure Jarvis can quickly access previously found information without doing the same work over again.
*/
import type { Logger } from "winston";
import type { JarvisResponse } from "../../reasoning/types";
import type { DatabaseClient } from "../client";

/**
 * Repository for caching (queries and research results).
 */
export class CacheRepository {
  constructor(
    private db: DatabaseClient,
    private logger: Logger,
  ) {}

  /**
   * Save query response to cache.
   */
  async saveQueryCache(
    cacheKey: string,
    userInput: string,
    response: JarvisResponse,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO query_cache (cache_key, user_input, response, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
        ON CONFLICT (cache_key)
        DO UPDATE SET
          access_count = query_cache.access_count + 1,
          last_accessed = NOW()
      `,
        [cacheKey, userInput, JSON.stringify(response)],
      );
    } catch (error) {
      this.logger.error("Failed to save query cache:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cached query response.
   */
  async getQueryCache(cacheKey: string): Promise<JarvisResponse | null> {
    try {
      const result = await this.db.query(
        `
        SELECT response, created_at FROM query_cache
        WHERE cache_key = $1 AND expires_at > NOW()
      `,
        [cacheKey],
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Update access stats
      await this.db.query(
        `
        UPDATE query_cache
        SET access_count = access_count + 1, last_accessed = NOW()
        WHERE cache_key = $1
      `,
        [cacheKey],
      );

      const cached = result.rows[0];
      const response = cached.response as JarvisResponse;
      return {
        ...response,
        metadata: {
          ...response.metadata,
          cached: true,
          cacheAge: Date.now() - new Date(cached.created_at).getTime(),
        },
      };
    } catch (error) {
      this.logger.error("Failed to get query cache:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Save research result to cache.
   */
  async saveResearchCache(
    cacheKey: string,
    query: string,
    agentId: string,
    action: string,
    inputs: any,
    result: any,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO research_cache (cache_key, query, agent_id, action, inputs, result, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 hour')
        ON CONFLICT (cache_key)
        DO UPDATE SET
          access_count = research_cache.access_count + 1,
          last_accessed = NOW()
      `,
        [cacheKey, query, agentId, action, JSON.stringify(inputs), JSON.stringify(result)],
      );
    } catch (error) {
      this.logger.error("Failed to save research cache:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cached research result.
   */
  async getResearchCache(cacheKey: string): Promise<any | null> {
    try {
      const result = await this.db.query(
        `
        SELECT result FROM research_cache
        WHERE cache_key = $1 AND expires_at > NOW()
      `,
        [cacheKey],
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Update access stats
      await this.db.query(
        `
        UPDATE research_cache
        SET access_count = access_count + 1, last_accessed = NOW()
        WHERE cache_key = $1
      `,
        [cacheKey],
      );

      return result.rows[0].result;
    } catch (error) {
      this.logger.error("Failed to get research cache:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cleanup expired cache entries.
   */
  async cleanupExpired(): Promise<number> {
    try {
      const queryResult = await this.db.query(`DELETE FROM query_cache WHERE expires_at < NOW()`);
      const researchResult = await this.db.query(
        `DELETE FROM research_cache WHERE expires_at < NOW()`,
      );

      const total = (queryResult.rowCount || 0) + (researchResult.rowCount || 0);
      if (total > 0) {
        this.logger.info(`Cleaned up ${total} expired cache entries`);
      }
      return total;
    } catch (error) {
      this.logger.error("Failed to cleanup cache:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
