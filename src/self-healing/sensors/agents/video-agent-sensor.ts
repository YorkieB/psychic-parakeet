/**
 * Sensor for VideoAgent
 * Monitors the video generation agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Video agent sensor
 * Monitors VideoAgent health and performance
 */
export class VideoAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new VideoAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "VideoAgent";
    const defaultLogger = logger || createLogger("VideoAgentSensor");
    const port = parseInt(process.env.VIDEO_AGENT_PORT || "3011", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
