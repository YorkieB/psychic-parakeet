/**
 * Sensor for AlarmAgent
 * Monitors the alarm system agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Alarm agent sensor
 * Monitors AlarmAgent health and performance (placeholder)
 */
export class AlarmAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new AlarmAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "AlarmAgent";
    const defaultLogger = logger || createLogger("AlarmAgentSensor");
    const port = parseInt(process.env.ALARM_AGENT_PORT || "3019", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
