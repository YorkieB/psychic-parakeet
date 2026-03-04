/**
 * Sensor for CodeAgent
 * Monitors the code generation and debugging agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Code agent sensor
 * Monitors CodeAgent health and performance
 */
export class CodeAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new CodeAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 15000 for critical agent)
   */
  constructor(logger?: Logger, checkInterval: number = 15000) {
    const agentName = "CodeAgent";
    const defaultLogger = logger || createLogger("CodeAgentSensor");
    const port = parseInt(process.env.CODE_AGENT_PORT || "3007", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
