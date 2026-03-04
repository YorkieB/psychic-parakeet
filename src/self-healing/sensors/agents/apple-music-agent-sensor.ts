/**
 * Sensor for AppleMusicAgent
 * Monitors the Apple Music control agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Apple Music agent sensor
 * Monitors AppleMusicAgent health and performance
 */
export class AppleMusicAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new AppleMusicAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "AppleMusicAgent";
    const defaultLogger = logger || createLogger("AppleMusicAgentSensor");
    const port = parseInt(process.env.APPLE_MUSIC_AGENT_PORT || "3013", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
