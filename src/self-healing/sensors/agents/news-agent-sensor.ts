/**
 * Sensor for NewsAgent
 * Monitors the news retrieval agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * News agent sensor
 * Monitors NewsAgent health and performance (placeholder)
 */
export class NewsAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new NewsAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "NewsAgent";
    const defaultLogger = logger || createLogger("NewsAgentSensor");
    const port = parseInt(process.env.NEWS_AGENT_PORT || "3016", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
