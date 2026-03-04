/**
 * Base class for all agent sensors
 * Provides common functionality for monitoring agent health and performance
 */

import type { Logger } from "winston";
import type { AgentMetrics } from "../../types/sensor.types";

/**
 * Base agent sensor that all individual agent sensors extend
 */
export abstract class BaseAgentSensor {
  protected readonly agentName: string;
  protected readonly logger: Logger;
  protected readonly healthEndpoint: string;
  protected readonly apiEndpoint: string;
  protected checkInterval: number; // ms
  protected lastCheck: Date | null = null;
  protected metricsHistory: AgentMetrics[] = [];
  protected readonly maxHistorySize = 100;

  /**
   * Creates a new base agent sensor
   *
   * @param agentName - Name of the agent to monitor
   * @param logger - Winston logger instance
   * @param healthEndpoint - HTTP endpoint for health checks
   * @param apiEndpoint - HTTP endpoint for API requests
   * @param checkInterval - How often to check (ms)
   */
  constructor(
    agentName: string,
    logger: Logger,
    healthEndpoint: string,
    apiEndpoint: string,
    checkInterval: number = 30000,
  ) {
    this.agentName = agentName;
    this.logger = logger;
    this.healthEndpoint = healthEndpoint;
    this.apiEndpoint = apiEndpoint;
    this.checkInterval = checkInterval;
  }

  /**
   * Performs a complete health check on the agent
   *
   * @returns Promise resolving to agent metrics
   */
  async checkHealth(): Promise<AgentMetrics> {
    const startTime = Date.now();
    this.lastCheck = new Date();

    try {
      // Run all health checks in parallel
      const [pingResult, loadResult, memoryResult, responseTimeResult, errorResult, _crashResult] =
        await Promise.allSettled([
          this.pingTest(),
          this.loadTest(),
          this.memoryCheck(),
          this.responseTimeCheck(),
          this.errorTracking(),
          this.crashDetection(),
        ]);

      // Aggregate results
      const metrics: AgentMetrics = {
        status: this.determineStatus(pingResult, errorResult),
        uptime: await this.getUptime(),
        lastActivity: await this.getLastActivity(),
        responseTime: this.extractResult(responseTimeResult, 0),
        successRate: this.calculateSuccessRate(errorResult),
        errorRate: this.calculateErrorRate(errorResult),
        memoryUsage: this.extractResult(memoryResult, 0),
        cpuUsage: await this.getCpuUsage(),
        activeRequests: this.extractResult(loadResult, 0),
        queuedRequests: await this.getQueuedRequests(),
        spawnCount: await this.getSpawnCount(),
        crashCount: await this.getCrashCount(),
        lastCrash: await this.getLastCrash(),
        lastRespawn: await this.getLastRespawn(),
        isResponsive: pingResult.status === "fulfilled" && pingResult.value === true,
        isHealthy: this.calculateIsHealthy(pingResult, errorResult, responseTimeResult),
        healthScore: this.calculateHealthScore(
          pingResult,
          errorResult,
          responseTimeResult,
          memoryResult,
        ),
      };

      // Store in history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`[${this.agentName}] Health check completed in ${duration}ms`, {
        healthScore: metrics.healthScore,
        isHealthy: metrics.isHealthy,
      });

      return metrics;
    } catch (error) {
      this.logger.error(`[${this.agentName}] Health check failed`, {
        error: error instanceof Error ? error.message : String(error),
      });

      // Return unhealthy metrics
      return {
        status: "offline",
        uptime: 0,
        lastActivity: new Date(0),
        responseTime: 0,
        successRate: 0,
        errorRate: 100,
        memoryUsage: 0,
        cpuUsage: 0,
        activeRequests: 0,
        queuedRequests: 0,
        spawnCount: await this.getSpawnCount(),
        crashCount: await this.getCrashCount(),
        lastCrash: await this.getLastCrash(),
        lastRespawn: await this.getLastRespawn(),
        isResponsive: false,
        isHealthy: false,
        healthScore: 0,
      };
    }
  }

  /**
   * Ping test - Can agent respond to health check?
   *
   * @returns Promise resolving to true if agent responds
   */
  protected async pingTest(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(this.healthEndpoint, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as { status?: string };
        return data.status === "healthy" || data.status === "degraded";
      }

      return false;
    } catch (error) {
      this.logger.debug(`[${this.agentName}] Ping test failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Load test - Can agent handle current workload?
   *
   * @returns Promise resolving to number of active requests
   */
  protected async loadTest(): Promise<number> {
    try {
      const response = await fetch(this.healthEndpoint, {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { metadata?: { activeRequests?: number } };
        // Try to extract active requests from health check response
        return (data.metadata?.activeRequests as number) || 0;
      }

      return 0;
    } catch (error) {
      this.logger.debug(`[${this.agentName}] Load test failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Memory check - Agent not leaking memory?
   *
   * @returns Promise resolving to memory usage in MB
   */
  protected async memoryCheck(): Promise<number> {
    try {
      const response = await fetch(this.healthEndpoint, {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { memory?: { heapUsed?: number } };
        if (data.memory) {
          // Convert bytes to MB
          const heapUsed = (data.memory.heapUsed as number) || 0;
          return Math.round(heapUsed / 1024 / 1024);
        }
      }

      return 0;
    } catch (error) {
      this.logger.debug(`[${this.agentName}] Memory check failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Response time check - Agent responding within SLA?
   *
   * @returns Promise resolving to response time in ms
   */
  protected async responseTimeCheck(): Promise<number> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      await fetch(this.healthEndpoint, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return Date.now() - startTime;
    } catch (_error) {
      return Date.now() - startTime; // Return time even if failed
    }
  }

  /**
   * Error tracking - Agent failing operations?
   *
   * @returns Promise resolving to error rate percentage
   */
  protected async errorTracking(): Promise<number> {
    // Check recent metrics history for errors
    if (this.metricsHistory.length === 0) {
      return 0;
    }

    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 checks
    const totalChecks = recentMetrics.length;
    const errorChecks = recentMetrics.filter((m) => !m.isHealthy || m.status === "error").length;

    return totalChecks > 0 ? (errorChecks / totalChecks) * 100 : 0;
  }

  /**
   * Crash detection - Agent crashed recently?
   *
   * @returns Promise resolving to true if crash detected
   */
  protected async crashDetection(): Promise<boolean> {
    // Check if agent is not responding and was previously healthy
    const wasHealthy =
      this.metricsHistory.length > 0 &&
      this.metricsHistory[this.metricsHistory.length - 1]?.isHealthy;
    const isNowUnhealthy = !(await this.pingTest());

    return wasHealthy && isNowUnhealthy;
  }

  /**
   * Get agent uptime in seconds
   */
  protected async getUptime(): Promise<number> {
    try {
      const response = await fetch(this.healthEndpoint, {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { uptime?: number };
        return (data.uptime as number) || 0;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get last activity timestamp
   */
  protected async getLastActivity(): Promise<Date> {
    // Use last check time as proxy for last activity
    return this.lastCheck || new Date();
  }

  /**
   * Get CPU usage percentage
   */
  protected async getCpuUsage(): Promise<number> {
    // CPU usage is difficult to get from HTTP endpoint
    // This is a placeholder - can be enhanced with process monitoring
    return 0;
  }

  /**
   * Get queued requests count
   */
  protected async getQueuedRequests(): Promise<number> {
    // Placeholder - can be enhanced with agent-specific metrics
    return 0;
  }

  /**
   * Get spawn count from database
   */
  protected async getSpawnCount(): Promise<number> {
    // Placeholder - will be implemented with database integration
    return 0;
  }

  /**
   * Get crash count from database
   */
  protected async getCrashCount(): Promise<number> {
    // Placeholder - will be implemented with database integration
    return 0;
  }

  /**
   * Get last crash timestamp from database
   */
  protected async getLastCrash(): Promise<Date | undefined> {
    // Placeholder - will be implemented with database integration
    return undefined;
  }

  /**
   * Get last respawn timestamp from database
   */
  protected async getLastRespawn(): Promise<Date | undefined> {
    // Placeholder - will be implemented with database integration
    return undefined;
  }

  /**
   * Determine agent status from check results
   */
  protected determineStatus(
    pingResult: PromiseSettledResult<boolean>,
    errorResult: PromiseSettledResult<number>,
  ): "active" | "idle" | "busy" | "error" | "offline" {
    if (pingResult.status === "rejected" || !pingResult.value) {
      return "offline";
    }

    if (errorResult.status === "fulfilled" && errorResult.value > 50) {
      return "error";
    }

    // Default to active if responsive
    return "active";
  }

  /**
   * Calculate success rate from error tracking
   */
  protected calculateSuccessRate(errorResult: PromiseSettledResult<number>): number {
    if (errorResult.status === "fulfilled") {
      return Math.max(0, 100 - errorResult.value);
    }
    return 100; // Assume success if we can't determine
  }

  /**
   * Calculate error rate from error tracking
   */
  protected calculateErrorRate(errorResult: PromiseSettledResult<number>): number {
    if (errorResult.status === "fulfilled") {
      return errorResult.value;
    }
    return 0;
  }

  /**
   * Extract result from PromiseSettledResult
   */
  protected extractResult<T>(result: PromiseSettledResult<T>, defaultValue: T): T {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return defaultValue;
  }

  /**
   * Calculate if agent is healthy
   */
  protected calculateIsHealthy(
    pingResult: PromiseSettledResult<boolean>,
    errorResult: PromiseSettledResult<number>,
    responseTimeResult: PromiseSettledResult<number>,
  ): boolean {
    const isResponsive = pingResult.status === "fulfilled" && pingResult.value === true;
    const errorRate = this.extractResult(errorResult, 0);
    const responseTime = this.extractResult(responseTimeResult, Infinity);

    return isResponsive && errorRate < 10 && responseTime < 5000; // < 5 seconds
  }

  /**
   * Calculate health score (0-100)
   */
  protected calculateHealthScore(
    pingResult: PromiseSettledResult<boolean>,
    errorResult: PromiseSettledResult<number>,
    responseTimeResult: PromiseSettledResult<number>,
    memoryResult: PromiseSettledResult<number>,
  ): number {
    let score = 0;

    // Responsiveness (40 points)
    if (pingResult.status === "fulfilled" && pingResult.value) {
      score += 40;
    }

    // Error rate (30 points)
    const errorRate = this.extractResult(errorResult, 100);
    score += Math.max(0, 30 * (1 - errorRate / 100));

    // Response time (20 points)
    const responseTime = this.extractResult(responseTimeResult, Infinity);
    if (responseTime < 1000) {
      score += 20;
    } else if (responseTime < 5000) {
      score += 10;
    }

    // Memory usage (10 points) - lower is better
    const memoryUsage = this.extractResult(memoryResult, Infinity);
    if (memoryUsage < 500) {
      score += 10;
    } else if (memoryUsage < 1000) {
      score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): AgentMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): AgentMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get check interval
   */
  getCheckInterval(): number {
    return this.checkInterval;
  }

  /**
   * Set check interval
   */
  setCheckInterval(interval: number): void {
    this.checkInterval = interval;
  }
}
