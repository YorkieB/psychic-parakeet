/**
 * Sensor for StoryAgent
 * Monitors the story generation agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Story agent sensor
 * Monitors StoryAgent health and performance (placeholder)
 */
export class StoryAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new StoryAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "StoryAgent";
    const defaultLogger = logger || createLogger("StoryAgentSensor");
    const port = parseInt(process.env.STORY_AGENT_PORT || "3020", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
