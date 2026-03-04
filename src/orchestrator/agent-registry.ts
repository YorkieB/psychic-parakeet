/*
  This file helps Jarvis keep track of all the different agents and their health status.

  It manages agent registration, monitors their performance, and makes sure Jarvis knows which agents are available and working properly while coordinating the entire agent system.
*/

import type { Logger } from "winston";
import { type AgentRegistration, AgentStatus, type HealthCheck } from "../types/agent";

/**
 * Manages agent registration, tracking, and health monitoring.
 * Provides centralized registry for all agents in the system.
 */
export class AgentRegistry {
  private agents: Map<string, AgentRegistration>;
  private healthCheckInterval: NodeJS.Timeout | null;
  private readonly logger: Logger;

  /**
   * Creates a new AgentRegistry instance.
   *
   * @param logger - Winston logger instance for logging operations
   */
  constructor(logger: Logger) {
    this.agents = new Map();
    this.healthCheckInterval = null;
    this.logger = logger;
  }

  /**
   * Registers a new agent with the registry.
   *
   * @param registration - Agent registration information
   * @throws Error if agent with same ID already exists
   */
  async registerAgent(registration: AgentRegistration): Promise<void> {
    if (this.agents.has(registration.agentId)) {
      throw new Error(`Agent ${registration.agentId} is already registered`);
    }

    this.agents.set(registration.agentId, registration);
    this.logger.info(`Agent registered: ${registration.agentId} (v${registration.version})`, {
      agentId: registration.agentId,
      capabilities: registration.capabilities,
      status: registration.status,
    });
  }

  /**
   * Unregisters an agent from the registry.
   * Sets agent status to MAINTENANCE before removal.
   *
   * @param agentId - Unique identifier of the agent to unregister
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = AgentStatus.MAINTENANCE;
      this.agents.delete(agentId);
      this.logger.warn(`Agent unregistered: ${agentId}`);
    }
  }

  /**
   * Checks if an agent is available for handling requests.
   *
   * @param agentId - Unique identifier of the agent
   * @returns True if agent is ONLINE or DEGRADED, false otherwise
   */
  isAvailable(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }
    return agent.status === AgentStatus.ONLINE || agent.status === AgentStatus.DEGRADED;
  }

  /**
   * Retrieves agent registration information.
   *
   * @param agentId - Unique identifier of the agent
   * @returns Agent registration or undefined if not found
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Gets all registered agents, optionally filtered by status.
   *
   * @param statusFilter - Optional status to filter by
   * @returns Array of agent registrations
   */
  getAllAgents(statusFilter?: AgentStatus): AgentRegistration[] {
    const agents = Array.from(this.agents.values());
    if (statusFilter) {
      return agents.filter((agent) => agent.status === statusFilter);
    }
    return agents;
  }

  /**
   * Starts periodic health checks for all registered agents.
   *
   * @param intervalMs - Interval between health checks in milliseconds (default: 30000)
   */
  startHealthChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.logger.warn("Health checks already running");
      return;
    }

    this.logger.info(`Starting health checks with interval: ${intervalMs}ms`);

    // Perform initial health check
    this.performHealthChecks();

    // Set up interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, intervalMs);
  }

  /**
   * Stops periodic health checks.
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info("Health checks stopped");
    }
  }

  /**
   * Gets a summary of agent health and availability.
   *
   * @returns Object containing counts and availability percentage
   */
  getHealthSummary(): {
    total: number;
    online: number;
    degraded: number;
    offline: number;
    availability: number;
  } {
    const agents = Array.from(this.agents.values());
    const total = agents.length;
    const online = agents.filter((a) => a.status === AgentStatus.ONLINE).length;
    const degraded = agents.filter((a) => a.status === AgentStatus.DEGRADED).length;
    const offline = agents.filter(
      (a) => a.status === AgentStatus.OFFLINE || a.status === AgentStatus.MAINTENANCE,
    ).length;

    const availability = total > 0 ? ((online + degraded) / total) * 100 : 0;

    return {
      total,
      online,
      degraded,
      offline,
      availability: Math.round(availability * 100) / 100,
    };
  }

  /**
   * Performs health checks on all registered agents.
   */
  private async performHealthChecks(): Promise<void> {
    const agents = Array.from(this.agents.values());
    const checkPromises = agents.map((agent) => this.checkAgentHealth(agent));
    await Promise.allSettled(checkPromises);
  }

  /**
   * Checks the health of a single agent by calling its health endpoint.
   * Updates agent status based on health check response.
   *
   * @param agent - Agent registration to check
   */
  private async checkAgentHealth(agent: AgentRegistration): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(agent.healthEndpoint, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }

      const healthCheck = (await response.json()) as HealthCheck;

      // Update agent status based on health check
      if (healthCheck.status === "healthy") {
        agent.status = AgentStatus.ONLINE;
      } else if (healthCheck.status === "degraded") {
        agent.status = AgentStatus.DEGRADED;
      } else {
        agent.status = AgentStatus.OFFLINE;
      }

      this.logger.debug(`Health check for ${agent.agentId}: ${healthCheck.status}`, {
        agentId: agent.agentId,
        status: healthCheck.status,
        uptime: healthCheck.uptime,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      agent.status = AgentStatus.OFFLINE;
      this.logger.warn(`Health check failed for ${agent.agentId}`, {
        agentId: agent.agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
