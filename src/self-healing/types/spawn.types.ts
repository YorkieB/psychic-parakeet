/**
 * Spawn configuration and strategy types
 */

import type { BaseAgent } from "../../agents/base-agent";

/**
 * Spawn strategy types
 */
export type SpawnStrategy =
  | "on-demand"
  | "pre-spawn"
  | "lazy-spawn"
  | "auto-respawn"
  | "scale-to-zero";

/**
 * Respawn trigger types
 */
export type RespawnTrigger =
  | "agent_crash"
  | "health_check_fail"
  | "performance_degradation"
  | "memory_leak"
  | "manual_trigger";

/**
 * Constructor type for agents that extend BaseAgent
 */
export type AgentConstructor = new (...args: any[]) => BaseAgent;

/**
 * Spawn configuration for an agent
 */
export interface SpawnConfig {
  agentName: string;
  agentClass: AgentConstructor;
  maxRestarts: number; // Max respawns per hour (default: 5)
  restartDelay: number; // ms between respawns (default: 5000)
  healthCheckInterval: number; // ms (default: 30000)
  spawnTimeout: number; // ms (default: 10000)
  dependencies: string[]; // Other agents this needs
  spawnStrategy: SpawnStrategy;
  criticalAgent: boolean; // Never kill this agent
  sourceFile?: string; // Path to source file for git restore (relative to project root)
}

/**
 * Spawn result
 */
export interface SpawnResult {
  success: boolean;
  agent?: BaseAgent;
  error?: string;
  pid?: number;
  threadId?: number;
  spawnDurationMs: number;
}
