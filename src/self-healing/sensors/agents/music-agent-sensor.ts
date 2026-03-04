/**
 * Sensor for MusicAgent
 * Monitors the music generation agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Music agent sensor
 * Monitors MusicAgent health and performance
 */
export class MusicAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new MusicAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "MusicAgent";
    const defaultLogger = logger || createLogger("MusicAgentSensor");
    const port = parseInt(process.env.MUSIC_AGENT_PORT || "3009", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
