/**
 * Sensor for CommandAgent (WebAgent)
 * Monitors the command parsing and routing agent
 * Note: Currently maps to WebAgent as it handles search/routing
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Command agent sensor
 * Monitors WebAgent health and performance (used for command routing)
 */
export class CommandAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new CommandAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 15000 for critical agent)
   */
  constructor(logger?: Logger, checkInterval: number = 15000) {
    const agentName = "CommandAgent";
    const defaultLogger = logger || createLogger("CommandAgentSensor");
    const port = parseInt(process.env.WEB_AGENT_PORT || "3002", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
