/**
 * WebSocket events for real-time agent updates
 * Emits events when agents spawn, crash, respawn, or health changes
 */

import { EventEmitter } from "node:events";
import type { Logger } from "winston";
import type { AgentState } from "../types/agent.types";
import type { AgentMetrics } from "../types/sensor.types";

/**
 * WebSocket event types
 */
export type AgentEventType =
  | "agent_spawned"
  | "agent_crashed"
  | "agent_respawned"
  | "agent_health_changed"
  | "agent_killed"
  | "agent_error";

/**
 * Agent event payload
 */
export interface AgentEvent {
  type: AgentEventType;
  agentName: string;
  timestamp: Date;
  data: {
    state?: AgentState;
    metrics?: AgentMetrics;
    error?: string;
    trigger?: string;
  };
}

/**
 * WebSocket event emitter for agent lifecycle events
 */
export class AgentWebSocketEvents extends EventEmitter {
  private logger: Logger;

  /**
   * Creates a new WebSocket event emitter
   *
   * @param logger - Winston logger instance
   */
  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Emit agent spawned event
   */
  emitAgentSpawned(agentName: string, state: AgentState): void {
    const event: AgentEvent = {
      type: "agent_spawned",
      agentName,
      timestamp: new Date(),
      data: { state },
    };

    this.emit("agent_spawned", event);
    this.logger.debug(`[WebSocket] Emitted agent_spawned for ${agentName}`);
  }

  /**
   * Emit agent crashed event
   */
  emitAgentCrashed(agentName: string, state: AgentState, error?: string): void {
    const event: AgentEvent = {
      type: "agent_crashed",
      agentName,
      timestamp: new Date(),
      data: { state, error },
    };

    this.emit("agent_crashed", event);
    this.logger.debug(`[WebSocket] Emitted agent_crashed for ${agentName}`);
  }

  /**
   * Emit agent respawned event
   */
  emitAgentRespawned(agentName: string, state: AgentState, trigger?: string): void {
    const event: AgentEvent = {
      type: "agent_respawned",
      agentName,
      timestamp: new Date(),
      data: { state, trigger },
    };

    this.emit("agent_respawned", event);
    this.logger.debug(`[WebSocket] Emitted agent_respawned for ${agentName}`);
  }

  /**
   * Emit agent health changed event
   */
  emitAgentHealthChanged(agentName: string, metrics: AgentMetrics, state: AgentState): void {
    const event: AgentEvent = {
      type: "agent_health_changed",
      agentName,
      timestamp: new Date(),
      data: { metrics, state },
    };

    this.emit("agent_health_changed", event);
    // Only log if health score changed significantly
    if (metrics.healthScore < 50) {
      this.logger.debug(
        `[WebSocket] Emitted agent_health_changed for ${agentName} (score: ${metrics.healthScore})`,
      );
    }
  }

  /**
   * Emit agent killed event
   */
  emitAgentKilled(agentName: string, state: AgentState): void {
    const event: AgentEvent = {
      type: "agent_killed",
      agentName,
      timestamp: new Date(),
      data: { state },
    };

    this.emit("agent_killed", event);
    this.logger.debug(`[WebSocket] Emitted agent_killed for ${agentName}`);
  }

  /**
   * Emit agent error event
   */
  emitAgentError(agentName: string, state: AgentState, error: string): void {
    const event: AgentEvent = {
      type: "agent_error",
      agentName,
      timestamp: new Date(),
      data: { state, error },
    };

    this.emit("agent_error", event);
    this.logger.debug(`[WebSocket] Emitted agent_error for ${agentName}`);
  }

  /**
   * Get all listeners for a specific event type
   */
  getListeners(eventType: AgentEventType): ((...args: unknown[]) => void)[] {
    return this.listeners(eventType) as ((...args: unknown[]) => void)[];
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): this {
    super.removeAllListeners();
    this.logger.debug("[WebSocket] Removed all event listeners");
    return this;
  }
}
