/**
 * Sensor for ReminderAgent
 * Monitors the reminder system agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Reminder agent sensor
 * Monitors ReminderAgent health and performance (placeholder)
 */
export class ReminderAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new ReminderAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "ReminderAgent";
    const defaultLogger = logger || createLogger("ReminderAgentSensor");
    const port = parseInt(process.env.REMINDER_AGENT_PORT || "3017", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
