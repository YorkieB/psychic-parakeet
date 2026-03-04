/**
 * Agent state types for self-healing infrastructure
 */

/**
 * Agent operational status
 */
export type AgentStatus =
  | "spawning"
  | "active"
  | "idle"
  | "error"
  | "respawning"
  | "killed"
  | "offline";

/**
 * Agent lifecycle event types
 */
export type LifecycleEventType =
  | "agent_spawned"
  | "agent_ready"
  | "agent_active"
  | "agent_idle"
  | "agent_error"
  | "agent_crashed"
  | "agent_respawning"
  | "agent_killed";

/**
 * Agent state tracking
 */
export interface AgentState {
  name: string;
  status: AgentStatus;
  pid?: number; // Process ID if separate process
  threadId?: number; // Thread ID if threaded
  spawnedAt: Date;
  lastPing: Date;
  metadata: Record<string, unknown>;
}

/**
 * Agent lifecycle event
 */
export interface LifecycleEvent {
  agentName: string;
  eventType: LifecycleEventType;
  timestamp: Date;
  details: Record<string, unknown>;
  errorMessage?: string;
}

/**
 * Agent spawn history record
 */
export interface AgentSpawnHistory {
  agentName: string;
  spawnCount: number;
  crashCount: number;
  lastSpawn: Date;
  lastCrash?: Date;
  spawnDurationMs?: number;
}
