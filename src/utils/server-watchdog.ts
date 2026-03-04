/**
 * Server Watchdog - Monitors server health and prevents crashes
 *
 * Features:
 * - Memory monitoring with automatic GC triggers
 * - Heartbeat monitoring
 * - Automatic recovery from common issues
 * - Crash prevention through proactive resource management
 */

import type { Logger } from "winston";

export interface WatchdogConfig {
  memoryThresholdMB: number; // Trigger GC when memory exceeds this
  memoryMaxMB: number; // Force restart if memory exceeds this
  heartbeatIntervalMs: number; // How often to check health
  maxConsecutiveErrors: number; // Errors before taking action
  enableAutoGC: boolean; // Enable automatic garbage collection
}

const DEFAULT_CONFIG: WatchdogConfig = {
  memoryThresholdMB: 1024, // 1GB - trigger GC
  memoryMaxMB: 1800, // 1.8GB - critical threshold
  heartbeatIntervalMs: 30000, // 30 seconds
  maxConsecutiveErrors: 5,
  enableAutoGC: true,
};

export class ServerWatchdog {
  private logger: Logger;
  private config: WatchdogConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private consecutiveErrors: number = 0;
  private isRunning: boolean = false;
  private lastHeartbeat: Date = new Date();
  private startTime: Date = new Date();
  private gcCount: number = 0;
  private errorCounts: Map<string, number> = new Map();

  constructor(logger: Logger, config: Partial<WatchdogConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the watchdog monitoring
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn("[Watchdog] Already running");
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.logger.info("[Watchdog] Starting server health monitoring", {
      config: this.config,
    });

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatIntervalMs);

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Stop the watchdog
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isRunning = false;
    this.logger.info("[Watchdog] Stopped");
  }

  /**
   * Perform a health check
   */
  private performHealthCheck(): void {
    try {
      this.lastHeartbeat = new Date();
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);

      // Check memory usage
      if (heapUsedMB > this.config.memoryMaxMB) {
        this.logger.error("[Watchdog] CRITICAL: Memory usage exceeded maximum!", {
          heapUsedMB,
          maxMB: this.config.memoryMaxMB,
        });
        this.triggerEmergencyGC();
      } else if (heapUsedMB > this.config.memoryThresholdMB) {
        this.logger.warn("[Watchdog] High memory usage detected", {
          heapUsedMB,
          thresholdMB: this.config.memoryThresholdMB,
        });
        this.triggerGC();
      }

      // Log periodic health status
      const uptimeSeconds = Math.round((Date.now() - this.startTime.getTime()) / 1000);
      if (uptimeSeconds % 300 < 30) {
        // Log every ~5 minutes
        this.logger.info("[Watchdog] Health check OK", {
          heapUsedMB,
          rssMB,
          uptimeSeconds,
          gcCount: this.gcCount,
          consecutiveErrors: this.consecutiveErrors,
        });
      }

      // Reset error count on successful check
      this.consecutiveErrors = 0;
    } catch (error) {
      this.consecutiveErrors++;
      this.logger.error("[Watchdog] Health check failed", {
        error: error instanceof Error ? error.message : String(error),
        consecutiveErrors: this.consecutiveErrors,
      });

      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.logger.error("[Watchdog] Too many consecutive errors, attempting recovery");
        this.attemptRecovery();
      }
    }
  }

  /**
   * Trigger garbage collection if available
   */
  private triggerGC(): void {
    if (!this.config.enableAutoGC) return;

    if (global.gc) {
      this.logger.info("[Watchdog] Triggering garbage collection");
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freedMB = Math.round((before - after) / 1024 / 1024);
      this.gcCount++;
      this.logger.info("[Watchdog] GC completed", { freedMB, gcCount: this.gcCount });
    }
  }

  /**
   * Emergency GC - more aggressive
   */
  private triggerEmergencyGC(): void {
    if (global.gc) {
      this.logger.warn("[Watchdog] Triggering EMERGENCY garbage collection");
      // Run GC multiple times for more thorough cleanup
      for (let i = 0; i < 3; i++) {
        global.gc();
      }
      this.gcCount += 3;

      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      this.logger.info("[Watchdog] Emergency GC completed", { heapUsedMB });
    }
  }

  /**
   * Attempt to recover from errors
   */
  private attemptRecovery(): void {
    this.logger.warn("[Watchdog] Attempting system recovery");

    // Clear error counts
    this.errorCounts.clear();
    this.consecutiveErrors = 0;

    // Force garbage collection
    this.triggerEmergencyGC();

    // Clear any module caches that might be causing issues
    // (This is a soft recovery - doesn't restart the process)
  }

  /**
   * Record an error for tracking
   */
  recordError(category: string, error: Error): void {
    const count = (this.errorCounts.get(category) || 0) + 1;
    this.errorCounts.set(category, count);

    this.logger.warn("[Watchdog] Error recorded", {
      category,
      count,
      error: error.message,
    });

    // If too many errors in a category, log a warning
    if (count >= 10) {
      this.logger.error("[Watchdog] High error count in category", {
        category,
        count,
      });
    }
  }

  /**
   * Get current health status
   */
  getStatus(): {
    isRunning: boolean;
    uptime: number;
    memoryMB: number;
    gcCount: number;
    consecutiveErrors: number;
    lastHeartbeat: Date;
  } {
    const memUsage = process.memoryUsage();
    return {
      isRunning: this.isRunning,
      uptime: Math.round((Date.now() - this.startTime.getTime()) / 1000),
      memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      gcCount: this.gcCount,
      consecutiveErrors: this.consecutiveErrors,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  /**
   * Wrap an async function with error protection
   */
  wrapAsync<T>(fn: () => Promise<T>, category: string): Promise<T> {
    return fn().catch((error) => {
      this.recordError(category, error instanceof Error ? error : new Error(String(error)));
      throw error;
    });
  }
}

// Singleton instance
let watchdogInstance: ServerWatchdog | null = null;

export function getWatchdog(logger?: Logger, config?: Partial<WatchdogConfig>): ServerWatchdog {
  if (!watchdogInstance && logger) {
    watchdogInstance = new ServerWatchdog(logger, config);
  }
  if (!watchdogInstance) {
    throw new Error("Watchdog not initialized. Call with logger first.");
  }
  return watchdogInstance;
}

export function initializeWatchdog(
  logger: Logger,
  config?: Partial<WatchdogConfig>,
): ServerWatchdog {
  watchdogInstance = new ServerWatchdog(logger, config);
  watchdogInstance.start();
  return watchdogInstance;
}
