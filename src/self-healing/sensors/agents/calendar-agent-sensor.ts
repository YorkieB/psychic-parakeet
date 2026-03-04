/**
 * Sensor for CalendarAgent
 * Monitors the calendar management agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Calendar agent sensor
 * Monitors CalendarAgent health and performance
 */
export class CalendarAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new CalendarAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "CalendarAgent";
    const defaultLogger = logger || createLogger("CalendarAgentSensor");
    const port = parseInt(process.env.CALENDAR_AGENT_PORT || "3005", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
