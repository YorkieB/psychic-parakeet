/**
 * Sensor for ImageGenerationAgent (ImageAgent)
 * Monitors the image generation agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Image generation agent sensor
 * Monitors ImageAgent health and performance
 */
export class ImageGenerationAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new ImageGenerationAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "ImageGenerationAgent";
    const defaultLogger = logger || createLogger("ImageGenerationAgentSensor");
    const port = parseInt(process.env.IMAGE_AGENT_PORT || "3010", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
