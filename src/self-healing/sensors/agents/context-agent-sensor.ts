/**
 * Sensor for ContextAgent (KnowledgeAgent)
 * Monitors the context management agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Context agent sensor
 * Monitors KnowledgeAgent health and performance (used for context management)
 */
export class ContextAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new ContextAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 15000 for critical agent)
   */
  constructor(logger?: Logger, checkInterval: number = 15000) {
    const agentName = "ContextAgent";
    const defaultLogger = logger || createLogger("ContextAgentSensor");
    const port = parseInt(process.env.KNOWLEDGE_AGENT_PORT || "3003", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
