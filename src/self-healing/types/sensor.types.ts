/**
 * Sensor data types for self-healing infrastructure
 */

/**
 * Agent metrics collected by sensors
 */
export interface AgentMetrics {
  // State
  status: "active" | "idle" | "busy" | "error" | "offline";
  uptime: number; // Seconds since spawn
  lastActivity: Date;

  // Performance
  responseTime: number; // ms (p95)
  successRate: number; // % successful operations
  errorRate: number; // % failed operations

  // Resources
  memoryUsage: number; // MB
  cpuUsage: number; // %
  activeRequests: number;
  queuedRequests: number;

  // Lifecycle
  spawnCount: number; // How many times respawned
  crashCount: number; // How many crashes
  lastCrash?: Date;
  lastRespawn?: Date;

  // Health indicators
  isResponsive: boolean; // Ping test passed
  isHealthy: boolean; // All checks passed
  healthScore: number; // 0-100
}

/**
 * Sensor reading result
 */
export interface SensorReading {
  sensorType: string;
  agentName?: string;
  timestamp: Date;
  metrics: AgentMetrics;
  rawData?: Record<string, unknown>;
}
