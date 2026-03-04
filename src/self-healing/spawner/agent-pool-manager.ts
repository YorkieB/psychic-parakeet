/**
 * Agent pool manager
 * Manages all agents in the system with spawning, health monitoring, and auto-respawn
 */

import type { Logger } from 'winston';
import type { BaseAgent } from '../../agents/base-agent';
import type { AgentWebSocketEvents } from '../dashboard/websocket-events';
import type { BaseAgentSensor } from '../sensors/agents/base-agent-sensor';
import type { AgentState } from '../types/agent.types';
import type { SpawnConfig } from '../types/spawn.types';
import type { AgentLifecycle } from './agent-lifecycle';
import { AgentSpawner } from './agent-spawner';
import type { HealthEventHandler } from './health-event-handler';

/**
 * Agent pool manager
 */
export class AgentPoolManager {
  private readonly logger: Logger;
  private readonly spawner: AgentSpawner;
  private readonly lifecycle: AgentLifecycle;
  private readonly sensors: Map<string, BaseAgentSensor> = new Map();
  private readonly wsEvents?: AgentWebSocketEvents;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private healthEventHandler?: HealthEventHandler;

  /**
   * Creates a new agent pool manager
   *
   * @param logger - Winston logger instance
   * @param lifecycle - Agent lifecycle tracker
   * @param wsEvents - Optional WebSocket event emitter
   * @param healthEventHandler - Optional health event handler (for knowledge base integration)
   */
  constructor(
    logger: Logger,
    lifecycle: AgentLifecycle,
    wsEvents?: AgentWebSocketEvents,
    healthEventHandler?: HealthEventHandler
  ) {
    this.logger = logger;
    this.lifecycle = lifecycle;
    this.spawner = new AgentSpawner(logger, lifecycle);
    this.wsEvents = wsEvents;
    this.healthEventHandler = healthEventHandler;
  }

  /**
   * Register spawn configuration
   */
  registerConfig(config: SpawnConfig): void {
    this.spawner.registerConfig(config);
  }

  /**
   * Register agent sensor
   */
  registerSensor(agentName: string, sensor: BaseAgentSensor): void {
    this.sensors.set(agentName, sensor);
    this.logger.debug(`Registered sensor for ${agentName}`);
  }

  /**
   * Spawn all agents (pre-spawn strategy)
   */
  async spawnAll(): Promise<void> {
    this.logger.info('🚀 Spawning all agents...');

    // Get all pre-spawn agents
    const preSpawnConfigs = this.spawner
      .getAllConfigs()
      .filter(config => config.spawnStrategy === 'pre-spawn');

    // Spawn all pre-spawn agents in parallel
    const spawnPromises = preSpawnConfigs.map(config => this.spawn(config.agentName));
    const results = await Promise.allSettled(spawnPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    this.logger.info(`✅ Spawned ${successful} agents, ${failed} failed`);

    // Emit WebSocket events for spawned agents
    for (const config of preSpawnConfigs) {
      const state = this.lifecycle.getState(config.agentName);
      if (state && this.wsEvents) {
        this.wsEvents.emitAgentSpawned(config.agentName, state);
      }
    }

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Spawn a specific agent
   *
   * @param agentName - Name of the agent to spawn
   * @returns Promise resolving to agent instance
   */
  async spawn(agentName: string): Promise<BaseAgent> {
    const result = await this.spawner.spawn(agentName);

    if (!result.success || !result.agent) {
      throw new Error(result.error || 'Failed to spawn agent');
    }

    // Emit WebSocket event
    const state = this.lifecycle.getState(agentName);
    if (state && this.wsEvents) {
      this.wsEvents.emitAgentSpawned(agentName, state);
    }

    return result.agent;
  }

  /**
   * Respawn an agent
   *
   * @param agentName - Name of the agent to respawn
   * @param trigger - What triggered the respawn
   * @returns Promise resolving to agent instance
   */
  async respawn(
    agentName: string,
    trigger:
      | 'agent_crash'
      | 'health_check_fail'
      | 'performance_degradation'
      | 'memory_leak'
      | 'manual_trigger' = 'manual_trigger'
  ): Promise<BaseAgent> {
    const result = await this.spawner.respawn(agentName, trigger);

    if (!result.success || !result.agent) {
      throw new Error(result.error || 'Failed to respawn agent');
    }

    // Emit WebSocket event
    const state = this.lifecycle.getState(agentName);
    if (state && this.wsEvents) {
      this.wsEvents.emitAgentRespawned(agentName, state, trigger);
    }

    return result.agent;
  }

  /**
   * Kill an agent
   *
   * @param agentName - Name of the agent to kill
   */
  async kill(agentName: string): Promise<void> {
    const state = this.lifecycle.getState(agentName);
    await this.spawner.kill(agentName);

    // Emit WebSocket event
    if (state && this.wsEvents) {
      this.wsEvents.emitAgentKilled(agentName, state);
    }
  }

  /**
   * Get agent status
   *
   * @param agentName - Name of the agent
   * @returns Agent state or undefined
   */
  getStatus(agentName: string): AgentState | undefined {
    return this.lifecycle.getState(agentName);
  }

  /**
   * Get all agent statuses
   *
   * @returns Array of all agent states
   */
  getAllStatuses(): AgentState[] {
    return this.lifecycle.getAllStates();
  }

  /**
   * Health check all agents
   *
   * @returns Map of agent names to health status
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const healthMap = new Map<string, boolean>();

    // Run ALL agent checks in parallel with isolated timeouts.
    // One hung or crashed agent can NEVER block or delay the others.
    const checkPromises = Array.from(this.sensors.entries()).map(([agentName, sensor]) =>
      this.isolatedHealthCheck(agentName, sensor, healthMap)
    );

    await Promise.allSettled(checkPromises);

    return healthMap;
  }

  /**
   * Isolated health check for a single agent.
   * Wrapped in its own try-catch and timeout so it can never crash the loop
   * or block other agents.
   */
  private async isolatedHealthCheck(
    agentName: string,
    sensor: BaseAgentSensor,
    healthMap: Map<string, boolean>
  ): Promise<void> {
    try {
      // Race the health check against a 5-second deadline
      const deadline = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout (5s)')), 5000)
      );
      const metrics = await Promise.race([sensor.checkHealth(), deadline]);
      healthMap.set(agentName, metrics.isHealthy);

      // Update ping timestamp (isolated — failure here won't crash anything)
      await this.lifecycle.updatePing(agentName).catch(() => {});

      const state = this.lifecycle.getState(agentName);
      const config = this.spawner.getConfig(agentName);

      // Skip if agent not active or no config
      if (!state || state.status !== 'active' || !config) {
        return;
      }

      // Check for crash detection
      if (!metrics.isResponsive && state.status === 'active') {
        this.logger.error(`💥 Agent ${agentName} appears to have crashed (not responding)`);
        await this.lifecycle.recordCrashed(agentName, 'Agent not responding to health checks');

        if (this.wsEvents) {
          this.wsEvents.emitAgentCrashed(agentName, state, 'Agent not responding to health checks');
        }

        if (this.healthEventHandler) {
          await this.healthEventHandler
            .handleHealthEvent(
              agentName,
              metrics,
              'Agent not responding to health checks',
              'Crash detected during health check'
            )
            .catch(error => {
              this.logger.warn(`Health event handling failed for ${agentName}:`, {
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }

        if (config.criticalAgent || config.spawnStrategy === 'auto-respawn') {
          this.logger.info(`🔄 Auto-respawning crashed agent: ${agentName}`);
          await this.respawn(agentName, 'agent_crash').catch(error => {
            this.logger.error(`Failed to auto-respawn ${agentName}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
        return;
      }

      // Check for performance degradation
      if (metrics.isHealthy) {
        const memoryLeakDetected = await this.detectMemoryLeak(agentName, sensor, metrics);
        if (memoryLeakDetected) {
          this.logger.warn(`🔴 Memory leak detected in ${agentName} (${metrics.memoryUsage}MB)`);
          if (config.spawnStrategy === 'auto-respawn' || config.criticalAgent) {
            this.logger.info(`🔄 Respawning ${agentName} due to memory leak`);
            await this.respawn(agentName, 'memory_leak').catch(error => {
              this.logger.error(`Failed to respawn ${agentName}`, {
                error: error instanceof Error ? error.message : String(error),
              });
            });
          }
          return;
        }

        if (metrics.responseTime > 5000) {
          this.logger.warn(
            `🐌 Agent ${agentName} has slow response time (${metrics.responseTime}ms)`
          );
          if (config.spawnStrategy === 'auto-respawn' && metrics.responseTime > 10000) {
            this.logger.info(`🔄 Respawning ${agentName} due to performance degradation`);
            await this.respawn(agentName, 'performance_degradation').catch(error => {
              this.logger.error(`Failed to respawn ${agentName}`, {
                error: error instanceof Error ? error.message : String(error),
              });
            });
          }
          return;
        }
      }

      // Emit health changed event (only if significant change)
      const previousMetrics = sensor.getMetricsHistory().slice(-2)[0];
      if (previousMetrics && Math.abs(previousMetrics.healthScore - metrics.healthScore) > 10) {
        if (this.wsEvents) {
          this.wsEvents.emitAgentHealthChanged(agentName, metrics, state);
        }
      }

      // If unhealthy, trigger respawn (if configured)
      if (!metrics.isHealthy) {
        this.logger.warn(
          `⚠️  Agent ${agentName} is unhealthy (health score: ${metrics.healthScore})`
        );

        if (this.wsEvents) {
          this.wsEvents.emitAgentHealthChanged(agentName, metrics, state);
        }

        if (config.spawnStrategy === 'auto-respawn' || config.criticalAgent) {
          this.logger.info(`🔄 Auto-respawning unhealthy agent: ${agentName}`);
          await this.respawn(agentName, 'health_check_fail').catch(error => {
            this.logger.error(`Failed to auto-respawn ${agentName}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
      }
    } catch (error) {
      // This agent's check failed but it CANNOT crash the loop or block other agents.
      this.logger.error(`Health check failed for ${agentName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      healthMap.set(agentName, false);
    }
  }

  /**
   * Detect memory leak by checking if memory usage is growing unbounded
   *
   * @param agentName - Name of the agent
   * @param sensor - Agent sensor
   * @param currentMetrics - Current metrics
   * @returns True if memory leak detected
   */
  private async detectMemoryLeak(
    _agentName: string,
    sensor: BaseAgentSensor,
    currentMetrics: import('../types/sensor.types').AgentMetrics
  ): Promise<boolean> {
    const history = sensor.getMetricsHistory();

    // Need at least 5 data points to detect a trend
    if (history.length < 5) {
      return false;
    }

    // Check last 5 measurements
    const recentMetrics = history.slice(-5);
    const memoryValues = recentMetrics.map(m => m.memoryUsage);

    // Check if memory is consistently growing
    let growingCount = 0;
    for (let i = 1; i < memoryValues.length; i++) {
      if (memoryValues[i] > memoryValues[i - 1]) {
        growingCount++;
      }
    }

    // If memory is growing in 4 out of 5 measurements
    if (growingCount >= 4) {
      // Check if growth is significant (> 100MB increase)
      const growth = currentMetrics.memoryUsage - memoryValues[0];
      if (growth > 100) {
        return true;
      }
    }

    // Also check if memory usage is extremely high (> 1GB)
    if (currentMetrics.memoryUsage > 1000) {
      return true;
    }

    return false;
  }

  /**
   * Get agent instance
   *
   * @param agentName - Name of the agent
   * @returns Agent instance or undefined
   */
  getAgent(agentName: string): BaseAgent | undefined {
    return this.spawner.getAgent(agentName);
  }

  /**
   * Check if agent has a registered spawn configuration
   *
   * @param agentName - Name of the agent
   * @returns True if agent has a spawn config registered
   */
  hasConfig(agentName: string): boolean {
    return this.spawner.getConfig(agentName) !== undefined;
  }

  /**
   * Get spawn configuration for an agent
   *
   * @param agentName - Name of the agent
   * @returns Spawn config or undefined
   */
  getConfig(agentName: string): SpawnConfig | undefined {
    return this.spawner.getConfig(agentName);
  }

  /**
   * Register an existing agent instance with the pool manager
   * This allows the pool manager to track agents that were started outside of it
   *
   * @param agentName - Name of the agent (must match spawn config name)
   * @param agent - The agent instance to register
   */
  registerExistingAgent(agentName: string, agent: BaseAgent): void {
    this.spawner.registerExistingAgent(agentName, agent);

    // Also update lifecycle state
    this.lifecycle.recordSpawned(agentName, process.pid);
  }

  /**
   * Start health monitoring loop
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheckAll();
      } catch (error) {
        // CRITICAL GUARD: The monitoring loop MUST NEVER DIE.
        // Catch everything, log it, but keep the interval alive.
        this.logger.error('[PoolManager] Health monitoring iteration failed — loop continues', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.healthCheckIntervalMs);

    this.logger.info(`Started health monitoring (interval: ${this.healthCheckIntervalMs}ms)`);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.info('Stopped health monitoring');
    }
  }
}
