/**
 * Sensor for SpotifyAgent
 * Monitors the Spotify music control agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Spotify agent sensor
 * Monitors SpotifyAgent health and performance
 */
export class SpotifyAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new SpotifyAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "SpotifyAgent";
    const defaultLogger = logger || createLogger("SpotifyAgentSensor");
    const port = parseInt(process.env.SPOTIFY_AGENT_PORT || "3012", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
