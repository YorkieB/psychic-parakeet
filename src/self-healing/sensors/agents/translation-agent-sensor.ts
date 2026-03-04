/**
 * Sensor for TranslationAgent
 * Monitors the language translation agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Translation agent sensor
 * Monitors TranslationAgent health and performance (placeholder)
 */
export class TranslationAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new TranslationAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "TranslationAgent";
    const defaultLogger = logger || createLogger("TranslationAgentSensor");
    const port = parseInt(process.env.TRANSLATION_AGENT_PORT || "3025", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
