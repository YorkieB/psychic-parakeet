/**
 * Agent lifecycle tracker
 * Tracks agent state, lifecycle events, and spawn history
 */

import type { Logger } from "winston";
import type { DatabaseClient } from "../../database";
import type { AgentState, LifecycleEventType } from "../types/agent.types";

/**
 * Agent lifecycle tracker
 */
export class AgentLifecycle {
  private readonly logger: Logger;
  private readonly db: DatabaseClient;
  private agentStates: Map<string, AgentState> = new Map();

  /**
   * Creates a new agent lifecycle tracker
   *
   * @param logger - Winston logger instance
   * @param db - Database client
   */
  constructor(logger: Logger, db: DatabaseClient) {
    this.logger = logger;
    this.db = db;
  }

  /**
   * Record agent spawned event
   */
  async recordSpawned(agentName: string, pid?: number, threadId?: number): Promise<void> {
    const state: AgentState = {
      name: agentName,
      status: "spawning",
      pid,
      threadId,
      spawnedAt: new Date(),
      lastPing: new Date(),
      metadata: {},
    };

    this.agentStates.set(agentName, state);
    await this.saveState(agentName, state);
    await this.recordEvent(agentName, "agent_spawned", { pid, threadId });
    await this.updateSpawnHistory(agentName, true);
  }

  /**
   * Record agent ready event
   */
  async recordReady(agentName: string): Promise<void> {
    await this.updateStatus(agentName, "active");
    await this.recordEvent(agentName, "agent_ready");
  }

  /**
   * Record agent active event
   */
  async recordActive(agentName: string): Promise<void> {
    await this.updateStatus(agentName, "active");
    await this.recordEvent(agentName, "agent_active");
  }

  /**
   * Record agent idle event
   */
  async recordIdle(agentName: string): Promise<void> {
    await this.updateStatus(agentName, "idle");
    await this.recordEvent(agentName, "agent_idle");
  }

  /**
   * Record agent error event
   */
  async recordError(agentName: string, error: Error | string): Promise<void> {
    await this.updateStatus(agentName, "error");
    await this.recordEvent(
      agentName,
      "agent_error",
      {},
      error instanceof Error ? error.message : error,
    );
  }

  /**
   * Record agent crashed event
   */
  async recordCrashed(agentName: string, error?: Error | string): Promise<void> {
    await this.updateStatus(agentName, "error");
    await this.recordEvent(
      agentName,
      "agent_crashed",
      {},
      error instanceof Error ? error.message : error,
    );
    await this.updateSpawnHistory(agentName, false, true);
  }

  /**
   * Record agent respawning event
   */
  async recordRespawning(agentName: string): Promise<void> {
    await this.updateStatus(agentName, "respawning");
    await this.recordEvent(agentName, "agent_respawning");
  }

  /**
   * Record agent killed event
   */
  async recordKilled(agentName: string): Promise<void> {
    await this.updateStatus(agentName, "killed");
    await this.recordEvent(agentName, "agent_killed");
    this.agentStates.delete(agentName);
  }

  /**
   * Update agent ping timestamp
   */
  async updatePing(agentName: string): Promise<void> {
    const state = this.agentStates.get(agentName);
    if (state) {
      state.lastPing = new Date();
      await this.saveState(agentName, state);
    }
  }

  /**
   * Get agent state
   */
  getState(agentName: string): AgentState | undefined {
    return this.agentStates.get(agentName);
  }

  /**
   * Get all agent states
   */
  getAllStates(): AgentState[] {
    return Array.from(this.agentStates.values());
  }

  /**
   * Update agent status
   */
  private async updateStatus(agentName: string, status: AgentState["status"]): Promise<void> {
    const state = this.agentStates.get(agentName);
    if (state) {
      state.status = status;
      await this.saveState(agentName, state);
    }
  }

  /**
   * Save agent state to database
   */
  private async saveState(agentName: string, state: AgentState): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO agent_states (agent_name, status, pid, thread_id, spawned_at, last_ping, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (agent_name) 
         DO UPDATE SET 
           status = EXCLUDED.status,
           pid = EXCLUDED.pid,
           thread_id = EXCLUDED.thread_id,
           last_ping = EXCLUDED.last_ping,
           metadata = EXCLUDED.metadata`,
        [
          state.name,
          state.status,
          state.pid || null,
          state.threadId || null,
          state.spawnedAt,
          state.lastPing,
          JSON.stringify(state.metadata),
        ],
      );
    } catch (error) {
      this.logger.error(`Failed to save agent state for ${agentName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record lifecycle event
   */
  private async recordEvent(
    agentName: string,
    eventType: LifecycleEventType,
    details: Record<string, unknown> = {},
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO agent_lifecycle_events (agent_name, event_type, timestamp, details, error_message)
         VALUES ($1, $2, NOW(), $3, $4)`,
        [agentName, eventType, JSON.stringify(details), errorMessage || null],
      );

      this.logger.debug(`[${agentName}] Lifecycle event: ${eventType}`, { details, errorMessage });
    } catch (error) {
      this.logger.error(`Failed to record lifecycle event for ${agentName}`, {
        error: error instanceof Error ? error.message : String(error),
        eventType,
      });
    }
  }

  /**
   * Update spawn history
   */
  private async updateSpawnHistory(
    agentName: string,
    isSpawn: boolean,
    isCrash: boolean = false,
  ): Promise<void> {
    try {
      if (isSpawn) {
        await this.db.query(
          `INSERT INTO agent_spawn_history (agent_name, spawn_count, last_spawn)
           VALUES ($1, 1, NOW())
           ON CONFLICT (agent_name) 
           DO UPDATE SET 
             spawn_count = agent_spawn_history.spawn_count + 1,
             last_spawn = NOW()`,
          [agentName],
        );
      }

      if (isCrash) {
        await this.db.query(
          `INSERT INTO agent_spawn_history (agent_name, crash_count, last_crash)
           VALUES ($1, 1, NOW())
           ON CONFLICT (agent_name) 
           DO UPDATE SET 
             crash_count = agent_spawn_history.crash_count + 1,
             last_crash = NOW()`,
          [agentName],
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update spawn history for ${agentName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get spawn history for an agent
   */
  async getSpawnHistory(agentName: string): Promise<{
    spawnCount: number;
    crashCount: number;
    lastSpawn: Date | null;
    lastCrash: Date | null;
  } | null> {
    try {
      const result = await this.db.query(
        `SELECT spawn_count, crash_count, last_spawn, last_crash
         FROM agent_spawn_history
         WHERE agent_name = $1`,
        [agentName],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        spawnCount: row.spawn_count,
        crashCount: row.crash_count,
        lastSpawn: row.last_spawn,
        lastCrash: row.last_crash,
      };
    } catch (error) {
      this.logger.error(`Failed to get spawn history for ${agentName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
