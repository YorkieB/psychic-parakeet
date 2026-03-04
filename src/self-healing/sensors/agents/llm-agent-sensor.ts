/**
 * Sensor for LLMAgent
 * Monitors the direct LLM access agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * LLM agent sensor
 * Monitors LLMAgent health and performance (placeholder)
 */
export class LLMAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new LLMAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "LLMAgent";
    const defaultLogger = logger || createLogger("LLMAgentSensor");
    const port = parseInt(process.env.LLM_AGENT_PORT || "3026", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
