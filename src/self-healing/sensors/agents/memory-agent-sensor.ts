/**
 * Sensor for MemoryAgent (KnowledgeAgent)
 * Monitors the conversation memory agent
 * Note: Currently maps to KnowledgeAgent as it handles context/memory
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Memory agent sensor
 * Monitors KnowledgeAgent health and performance (used for memory management)
 */
export class MemoryAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new MemoryAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 15000 for critical agent)
   */
  constructor(logger?: Logger, checkInterval: number = 15000) {
    const agentName = "MemoryAgent";
    const defaultLogger = logger || createLogger("MemoryAgentSensor");
    const port = parseInt(process.env.KNOWLEDGE_AGENT_PORT || "3003", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
