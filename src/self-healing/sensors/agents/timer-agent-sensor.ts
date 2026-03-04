/**
 * Sensor for TimerAgent
 * Monitors the timer management agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Timer agent sensor
 * Monitors TimerAgent health and performance (placeholder)
 */
export class TimerAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new TimerAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "TimerAgent";
    const defaultLogger = logger || createLogger("TimerAgentSensor");
    const port = parseInt(process.env.TIMER_AGENT_PORT || "3018", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
