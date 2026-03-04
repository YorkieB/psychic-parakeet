/**
 * Sensor for FileAgent
 * Monitors the file operations agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * File agent sensor
 * Monitors FileAgent health and performance (placeholder)
 */
export class FileAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new FileAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "FileAgent";
    const defaultLogger = logger || createLogger("FileAgentSensor");
    const port = parseInt(process.env.FILE_AGENT_PORT || "3022", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
