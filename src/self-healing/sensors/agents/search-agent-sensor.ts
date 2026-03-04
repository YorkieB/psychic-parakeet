/**
 * Sensor for SearchAgent
 * Monitors the web search agent
 * Note: Maps to WebAgent - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Search agent sensor
 * Monitors SearchAgent health and performance (maps to WebAgent)
 */
export class SearchAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new SearchAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "SearchAgent";
    const defaultLogger = logger || createLogger("SearchAgentSensor");
    const port = parseInt(process.env.WEB_AGENT_PORT || "3002", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
