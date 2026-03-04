/**
 * Agent spawner
 * Handles spawning and respawning of agents
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Logger } from "winston";
import type { BaseAgent } from "../../agents/base-agent";
import { createLogger } from "../../utils/logger";
import type { RespawnTrigger, SpawnConfig, SpawnResult } from "../types/spawn.types";
import type { AgentLifecycle } from "./agent-lifecycle";

const _execAsync = promisify(exec);

/**
 * Agent spawner
 */
export class AgentSpawner {
  private readonly logger: Logger;
  private readonly lifecycle: AgentLifecycle;
  private readonly spawnConfigs: Map<string, SpawnConfig> = new Map();
  private readonly activeAgents: Map<string, BaseAgent> = new Map();
  private readonly spawnTimestamps: Map<string, Date> = new Map();
  private readonly crashCounts: Map<string, number> = new Map();
  private readonly lastCrashTimes: Map<string, Date> = new Map();

  /**
   * Creates a new agent spawner
   *
   * @param logger - Winston logger instance
   * @param lifecycle - Agent lifecycle tracker
   */
  constructor(logger: Logger, lifecycle: AgentLifecycle) {
    this.logger = logger;
    this.lifecycle = lifecycle;
  }

  /**
   * Register spawn configuration for an agent
   */
  registerConfig(config: SpawnConfig): void {
    this.spawnConfigs.set(config.agentName, config);
    this.crashCounts.set(config.agentName, 0);
    this.logger.debug(`Registered spawn config for ${config.agentName}`);
  }

  /**
   * Spawn an agent
   *
   * @param agentName - Name of the agent to spawn
   * @returns Promise resolving to spawn result
   */
  async spawn(agentName: string): Promise<SpawnResult> {
    const startTime = Date.now();
    const config = this.spawnConfigs.get(agentName);

    if (!config) {
      return {
        success: false,
        error: `No spawn configuration found for ${agentName}`,
        spawnDurationMs: Date.now() - startTime,
      };
    }

    try {
      this.logger.info(`🚀 Spawning agent: ${agentName}`);

      // Record spawning event
      await this.lifecycle.recordSpawned(agentName);

      // Create agent instance
      // Create a new logger for each agent to avoid issues with child loggers
      // #region agent log
      const agentLogger = createLogger(`${agentName}`);
      fetch("http://127.0.0.1:7243/ingest/8478357a-e016-4def-8839-55f49596181b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "agent-spawner.ts:73",
          message: "Creating agent with logger",
          data: { agentName, hasInfoMethod: typeof agentLogger?.info === "function" },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "D",
        }),
      }).catch(() => {});
      // #endregion
      const agent = new config.agentClass(
        config.agentName,
        "1.0.0",
        this.getPortForAgent(agentName),
        agentLogger,
      );

      // Start agent with timeout
      const spawnPromise = agent.start();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Spawn timeout")), config.spawnTimeout);
      });

      await Promise.race([spawnPromise, timeoutPromise]);

      // Record ready event
      await this.lifecycle.recordReady(agentName);

      // Store agent
      this.activeAgents.set(agentName, agent);
      this.spawnTimestamps.set(agentName, new Date());

      const duration = Date.now() - startTime;
      this.logger.info(`✅ Agent spawned: ${agentName} (${duration}ms)`);

      return {
        success: true,
        agent,
        spawnDurationMs: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      // #region agent log
      fetch("http://127.0.0.1:7243/ingest/8478357a-e016-4def-8839-55f49596181b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "agent-spawner.ts:105",
          message: "Spawn error caught",
          data: { agentName, errorMessage, duration },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "D",
        }),
      }).catch(() => {});
      // #endregion

      this.logger.error(`❌ Failed to spawn agent: ${agentName}`, {
        error: errorMessage,
        duration,
      });

      await this.lifecycle.recordError(agentName, errorMessage);

      return {
        success: false,
        error: errorMessage,
        spawnDurationMs: duration,
      };
    }
  }

  /**
   * Respawn an agent (kill old instance and spawn new one)
   *
   * @param agentName - Name of the agent to respawn
   * @param trigger - What triggered the respawn
   * @returns Promise resolving to spawn result
   */
  async respawn(
    agentName: string,
    trigger: RespawnTrigger = "manual_trigger",
  ): Promise<SpawnResult> {
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8478357a-e016-4def-8839-55f49596181b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "agent-spawner.ts:125",
        message: "Respawn called",
        data: { agentName, trigger },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    const config = this.spawnConfigs.get(agentName);

    if (!config) {
      // #region agent log
      fetch("http://127.0.0.1:7243/ingest/8478357a-e016-4def-8839-55f49596181b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "agent-spawner.ts:130",
          message: "No spawn config found",
          data: { agentName },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "B",
        }),
      }).catch(() => {});
      // #endregion
      return {
        success: false,
        error: `No spawn configuration found for ${agentName}`,
        spawnDurationMs: 0,
      };
    }

    // Check respawn limits
    const crashCount = this.crashCounts.get(agentName) || 0;
    const lastCrashTime = this.lastCrashTimes.get(agentName);

    // Check if we've exceeded max restarts in the last hour
    if (lastCrashTime) {
      const hoursSinceLastCrash = (Date.now() - lastCrashTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastCrash < 1 && crashCount >= config.maxRestarts) {
        this.logger.warn(
          `🚨 Respawn limit reached for ${agentName} (${crashCount}/${config.maxRestarts} in last hour)`,
        );
        return {
          success: false,
          error: `Respawn limit reached: ${crashCount}/${config.maxRestarts} restarts in last hour`,
          spawnDurationMs: 0,
        };
      }
    }

    this.logger.info(`🔄 Respawning agent: ${agentName} (trigger: ${trigger})`);

    // Record respawning event
    await this.lifecycle.recordRespawning(agentName);

    // Kill old instance if exists
    const oldAgent = this.activeAgents.get(agentName);
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8478357a-e016-4def-8839-55f49596181b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "agent-spawner.ts:165",
        message: "Checking for old agent",
        data: { agentName, hasOldAgent: !!oldAgent },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
    if (oldAgent) {
      try {
        // Stop the old agent's server before removing it
        this.logger.info(`Stopping old agent instance: ${agentName}`);
        await oldAgent.stop();
        this.activeAgents.delete(agentName);
        this.logger.info(`Old agent instance stopped: ${agentName}`);
      } catch (error) {
        this.logger.warn(`Failed to cleanly stop old agent instance: ${agentName}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        // Still remove from active agents even if stop failed
        this.activeAgents.delete(agentName);
      }

      // Give the OS a moment to release the port
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      // No tracked agent - try to gracefully stop via HTTP shutdown endpoint
      // This handles agents started outside the spawner
      const port = this.getPortForAgent(agentName);
      this.logger.info(
        `No tracked agent for ${agentName}, attempting graceful shutdown via HTTP on port ${port}...`,
      );

      try {
        // Try to call a shutdown endpoint if the agent supports it
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(`http://localhost:${port}/shutdown`, {
          method: "POST",
          signal: controller.signal,
        }).catch(() => {
          // Shutdown endpoint might not exist, that's okay
        });

        clearTimeout(timeoutId);

        // Give the agent time to shut down gracefully
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch {
        // Ignore errors - the agent might not have a shutdown endpoint
      }
    }

    // Wait for restart delay (unless immediate for critical agents)
    if (trigger !== "agent_crash" || !config.criticalAgent) {
      await new Promise((resolve) => setTimeout(resolve, config.restartDelay));
    }

    // Spawn new instance
    const result = await this.spawn(agentName);
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/8478357a-e016-4def-8839-55f49596181b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "agent-spawner.ts:185",
        message: "Spawn result",
        data: { agentName, success: result.success, error: result.error },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    if (result.success) {
      // Reset crash count if respawn successful
      if (trigger === "agent_crash") {
        this.crashCounts.set(agentName, crashCount + 1);
        this.lastCrashTimes.set(agentName, new Date());
      }
    }

    return result;
  }

  /**
   * Kill an agent
   *
   * @param agentName - Name of the agent to kill
   */
  async kill(agentName: string): Promise<void> {
    const agent = this.activeAgents.get(agentName);
    if (agent) {
      this.logger.info(`🛑 Killing agent: ${agentName}`);
      this.activeAgents.delete(agentName);
      await this.lifecycle.recordKilled(agentName);
    }
  }

  /**
   * Get active agent instance
   *
   * @param agentName - Name of the agent
   * @returns Agent instance or undefined
   */
  getAgent(agentName: string): BaseAgent | undefined {
    return this.activeAgents.get(agentName);
  }

  /**
   * Check if agent is active
   *
   * @param agentName - Name of the agent
   * @returns True if agent is active
   */
  isActive(agentName: string): boolean {
    return this.activeAgents.has(agentName);
  }

  /**
   * Get spawn configuration for an agent
   */
  getConfig(agentName: string): SpawnConfig | undefined {
    return this.spawnConfigs.get(agentName);
  }

  /**
   * Get all registered configs
   */
  getAllConfigs(): SpawnConfig[] {
    return Array.from(this.spawnConfigs.values());
  }

  /**
   * Register an existing agent instance with the spawner
   * This allows the spawner to track agents that were started outside of it
   */
  registerExistingAgent(agentName: string, agent: BaseAgent): void {
    this.activeAgents.set(agentName, agent);
    this.logger.info(`Registered existing agent: ${agentName}`);
  }

  /**
   * Get port for agent based on agent name
   * This is a helper to map agent names to ports
   */
  private getPortForAgent(agentName: string): number {
    // Map agent names to ports based on environment variables or defaults
    const portMap: Record<string, string> = {
      ConversationAgent: "DIALOGUE_AGENT_PORT",
      DialogueAgent: "DIALOGUE_AGENT_PORT",
      CodeAgent: "CODE_AGENT_PORT",
      ContextAgent: "KNOWLEDGE_AGENT_PORT",
      MemoryAgent: "KNOWLEDGE_AGENT_PORT",
      CommandAgent: "WEB_AGENT_PORT",
      WebAgent: "WEB_AGENT_PORT",
      FinanceAgent: "FINANCE_AGENT_PORT",
      KnowledgeAgent: "KNOWLEDGE_AGENT_PORT",
    };

    const envVar = portMap[agentName] || "DIALOGUE_AGENT_PORT";
    return parseInt(process.env[envVar] || "3001", 10);
  }
}
