/*
  This file is the unbreakable guard for Jarvis's self-healing system.

  It watches the health monitors themselves, catches process-level crashes,
  uses circuit breakers to avoid wasting time on dead agents, and makes sure
  the entire self-healing pipeline never silently dies. Like the foundation
  of a house — it does not move or break.
*/

import type { Logger } from 'winston';

/**
 * Circuit breaker states for individual agent pings
 */
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextRetryAt: number;
}

/**
 * Heartbeat record for the guard itself
 */
interface Heartbeat {
  timestamp: number;
  healthCheckLoopAlive: boolean;
  watchdogAlive: boolean;
  uptimeSeconds: number;
  guardRestarts: number;
  circuitBreakerSummary: {
    closed: number;
    open: number;
    halfOpen: number;
  };
}

/**
 * Configuration for the HealthGuard
 */
interface HealthGuardConfig {
  /** How often the watchdog checks the health loop (ms) */
  watchdogIntervalMs: number;
  /** How long before the watchdog considers the health loop dead (ms) */
  healthLoopTimeoutMs: number;
  /** Max consecutive failures before a circuit opens */
  circuitBreakerThreshold: number;
  /** How long a circuit stays open before trying again (ms) */
  circuitBreakerResetMs: number;
  /** Per-agent health check timeout (ms) */
  agentPingTimeoutMs: number;
  /** Max number of guard restarts before giving up */
  maxGuardRestarts: number;
}

const DEFAULT_CONFIG: HealthGuardConfig = {
  watchdogIntervalMs: 10000,
  healthLoopTimeoutMs: 90000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 60000,
  agentPingTimeoutMs: 3000,
  maxGuardRestarts: 10,
};

/**
 * HealthGuard — the immovable foundation of the self-healing system.
 *
 * Responsibilities:
 * 1. Watchdog — monitors the health check loop and restarts it if it dies
 * 2. Circuit breaker — stops pinging dead agents, retries after cooldown
 * 3. Process guards — catches uncaught exceptions and unhandled rejections
 * 4. Heartbeat — proof-of-life signal so nothing silently dies
 * 5. Isolated pings — each agent pinged independently with its own timeout
 */
export class HealthGuard {
  private readonly logger: Logger;
  private readonly config: HealthGuardConfig;

  // Circuit breaker per agent
  private readonly circuits: Map<string, CircuitState> = new Map();

  // Watchdog state
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;
  private healthLoopInterval: ReturnType<typeof setInterval> | null = null;
  private lastHealthLoopTick: number = 0;
  private guardRestartCount: number = 0;
  private readonly startTime: number = Date.now();

  // The actual health check function provided by the pool manager
  private healthCheckFn: (() => Promise<void>) | null = null;
  private healthCheckIntervalMs = 30000;

  // Heartbeat
  private lastHeartbeat: Heartbeat | null = null;

  // Process guard installed flag
  private processGuardsInstalled = false;

  constructor(logger: Logger, config?: Partial<HealthGuardConfig>) {
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Install process-level crash guards.
   * These catch fatal errors that would normally kill the entire process.
   * Called once at startup — never removed.
   */
  installProcessGuards(): void {
    if (this.processGuardsInstalled) return;

    process.on('uncaughtException', (error: Error) => {
      this.logger.error(
        '[HealthGuard] UNCAUGHT EXCEPTION — the system caught a crash that would have killed everything',
        {
          message: error.message,
          stack: error.stack,
          file: this.extractFileFromStack(error.stack),
        }
      );
      // Do NOT exit — the guard keeps the process alive
      // The watchdog will restart any dead subsystems
    });

    process.on('unhandledRejection', (reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.logger.error(
        '[HealthGuard] UNHANDLED REJECTION — a promise failed silently but the guard caught it',
        {
          message,
          stack,
          file: this.extractFileFromStack(stack),
        }
      );
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      this.logger.info(`[HealthGuard] Received ${signal} — shutting down gracefully`);
      this.stop();
      setTimeout(() => process.exit(0), 2000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    this.processGuardsInstalled = true;
    this.logger.info(
      '[HealthGuard] Process-level crash guards installed — uncaught exceptions and rejections will be caught'
    );
  }

  /**
   * Start the guard with a health check function.
   * The guard will call this function on an interval and watch it.
   */
  start(healthCheckFn: () => Promise<void>, intervalMs = 30000): void {
    this.healthCheckFn = healthCheckFn;
    this.healthCheckIntervalMs = intervalMs;

    this.startHealthLoop();
    this.startWatchdog();

    this.logger.info('[HealthGuard] Guard is active and watching the self-healing system', {
      watchdogInterval: `${this.config.watchdogIntervalMs}ms`,
      healthLoopTimeout: `${this.config.healthLoopTimeoutMs}ms`,
      circuitBreakerThreshold: this.config.circuitBreakerThreshold,
      agentPingTimeout: `${this.config.agentPingTimeoutMs}ms`,
    });
  }

  /**
   * Stop the guard and all intervals.
   */
  stop(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    if (this.healthLoopInterval) {
      clearInterval(this.healthLoopInterval);
      this.healthLoopInterval = null;
    }
    this.logger.info('[HealthGuard] Guard stopped');
  }

  /**
   * Ping a single agent with circuit breaker protection and isolated timeout.
   * Returns the health response or null if the agent is unreachable.
   */
  async pingAgent(agentName: string, port: number): Promise<any | null> {
    const circuit = this.getCircuit(agentName);

    // If circuit is open, skip this agent until cooldown expires
    if (circuit.state === 'open') {
      if (Date.now() < circuit.nextRetryAt) {
        return null; // Still in cooldown
      }
      // Cooldown expired — try half-open
      circuit.state = 'half-open';
      this.logger.info(
        `[HealthGuard] Circuit half-open for ${agentName} — retrying after cooldown`
      );
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.agentPingTimeoutMs);

      const resp = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();

      // Success — close the circuit
      if (circuit.state === 'half-open' || circuit.failures > 0) {
        this.logger.info(`[HealthGuard] ${agentName} recovered — circuit closed`);
      }
      circuit.failures = 0;
      circuit.state = 'closed';

      return data;
    } catch (_error) {
      circuit.failures++;
      circuit.lastFailure = Date.now();

      if (circuit.failures >= this.config.circuitBreakerThreshold) {
        circuit.state = 'open';
        circuit.nextRetryAt = Date.now() + this.config.circuitBreakerResetMs;
        this.logger.warn(
          `[HealthGuard] Circuit OPEN for ${agentName} — ${circuit.failures} consecutive failures. ` +
            `Will retry in ${this.config.circuitBreakerResetMs / 1000}s`
        );
      }

      return null;
    }
  }

  /**
   * Check if an agent's circuit breaker is open (meaning it's been failing).
   */
  isCircuitOpen(agentName: string): boolean {
    const circuit = this.circuits.get(agentName);
    return circuit?.state === 'open';
  }

  /**
   * Get circuit breaker state for an agent.
   */
  getCircuitState(agentName: string): CircuitState {
    return this.getCircuit(agentName);
  }

  /**
   * Get all circuit breaker states.
   */
  getAllCircuitStates(): Map<string, CircuitState> {
    return new Map(this.circuits);
  }

  /**
   * Get the latest heartbeat.
   */
  getHeartbeat(): Heartbeat | null {
    return this.lastHeartbeat;
  }

  /**
   * Get guard status summary.
   */
  getStatus(): {
    alive: boolean;
    uptimeSeconds: number;
    guardRestarts: number;
    watchdogActive: boolean;
    healthLoopActive: boolean;
    lastHealthLoopTick: number;
    processGuardsInstalled: boolean;
    circuitBreakers: Record<string, { state: string; failures: number }>;
  } {
    const circuitBreakers: Record<string, { state: string; failures: number }> = {};
    for (const [name, circuit] of this.circuits) {
      circuitBreakers[name] = { state: circuit.state, failures: circuit.failures };
    }

    return {
      alive: true,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      guardRestarts: this.guardRestartCount,
      watchdogActive: this.watchdogInterval !== null,
      healthLoopActive: this.healthLoopInterval !== null,
      lastHealthLoopTick: this.lastHealthLoopTick,
      processGuardsInstalled: this.processGuardsInstalled,
      circuitBreakers,
    };
  }

  // ─── Private methods ───────────────────────────────────

  /**
   * Start the health check loop with crash isolation.
   * Each iteration is wrapped in try-catch so one failure never kills the loop.
   */
  private startHealthLoop(): void {
    if (this.healthLoopInterval) {
      clearInterval(this.healthLoopInterval);
    }

    this.lastHealthLoopTick = Date.now();

    this.healthLoopInterval = setInterval(async () => {
      try {
        this.lastHealthLoopTick = Date.now();

        if (this.healthCheckFn) {
          await this.healthCheckFn();
        }
      } catch (error) {
        // CRITICAL: The health check loop MUST NOT DIE.
        // Catch everything and log it, but keep the loop running.
        this.logger.error(
          '[HealthGuard] Health check loop iteration failed — but the loop continues',
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            file: error instanceof Error ? this.extractFileFromStack(error.stack) : undefined,
          }
        );
      }
    }, this.healthCheckIntervalMs);

    this.logger.info(
      `[HealthGuard] Health check loop started (every ${this.healthCheckIntervalMs / 1000}s)`
    );
  }

  /**
   * Start the watchdog that monitors the health check loop.
   * If the health loop hasn't ticked in too long, the watchdog restarts it.
   */
  private startWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }

    this.watchdogInterval = setInterval(() => {
      try {
        const now = Date.now();
        const timeSinceLastTick = now - this.lastHealthLoopTick;
        const healthLoopAlive = timeSinceLastTick < this.config.healthLoopTimeoutMs;

        // Build heartbeat
        let closed = 0;
        let open = 0;
        let halfOpen = 0;
        for (const circuit of this.circuits.values()) {
          if (circuit.state === 'closed') closed++;
          else if (circuit.state === 'open') open++;
          else halfOpen++;
        }

        this.lastHeartbeat = {
          timestamp: now,
          healthCheckLoopAlive: healthLoopAlive,
          watchdogAlive: true,
          uptimeSeconds: Math.floor((now - this.startTime) / 1000),
          guardRestarts: this.guardRestartCount,
          circuitBreakerSummary: { closed, open, halfOpen },
        };

        // If the health loop is dead, restart it
        if (!healthLoopAlive) {
          this.guardRestartCount++;

          if (this.guardRestartCount > this.config.maxGuardRestarts) {
            this.logger.error(
              `[HealthGuard] CRITICAL — health loop has been restarted ${this.guardRestartCount} times. ` +
                'Something is fundamentally wrong. Check the logs above for the root cause.'
            );
            // Still restart — we never give up
          }

          this.logger.warn(
            `[HealthGuard] WATCHDOG ALERT — health check loop appears dead ` +
              `(last tick ${Math.floor(timeSinceLastTick / 1000)}s ago). Restarting it now. ` +
              `(restart #${this.guardRestartCount})`
          );

          this.startHealthLoop();
        }
      } catch (error) {
        // The watchdog itself MUST NOT DIE.
        this.logger.error('[HealthGuard] Watchdog iteration failed — but the watchdog continues', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.config.watchdogIntervalMs);

    this.logger.info(
      `[HealthGuard] Watchdog started (checking every ${this.config.watchdogIntervalMs / 1000}s)`
    );
  }

  /**
   * Get or create a circuit breaker for an agent.
   */
  private getCircuit(agentName: string): CircuitState {
    let circuit = this.circuits.get(agentName);
    if (!circuit) {
      circuit = {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
        nextRetryAt: 0,
      };
      this.circuits.set(agentName, circuit);
    }
    return circuit;
  }

  /**
   * Extract file path from a stack trace for diagnostics.
   */
  private extractFileFromStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/at .+\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/);
      if (match && !match[1].includes('node_modules')) {
        return `${match[1].replace(/\\/g, '/').replace(/^.*\/src\//, 'src/')}:${match[2]}`;
      }
    }
    return undefined;
  }
}
