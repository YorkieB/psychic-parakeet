/**
 * Sensor for EmailAgent
 * Monitors the email operations agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Email agent sensor
 * Monitors EmailAgent health and performance
 */
export class EmailAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new EmailAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "EmailAgent";
    const defaultLogger = logger || createLogger("EmailAgentSensor");
    const port = parseInt(process.env.EMAIL_AGENT_PORT || "3006", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
