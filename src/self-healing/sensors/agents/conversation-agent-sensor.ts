/**
 * Sensor for ConversationAgent (DialogueAgent)
 * Monitors the conversation handling agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Conversation agent sensor
 * Monitors DialogueAgent health and performance
 */
export class ConversationAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new ConversationAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 15000 for critical agent)
   */
  constructor(logger?: Logger, checkInterval: number = 15000) {
    const agentName = "ConversationAgent";
    const defaultLogger = logger || createLogger("ConversationAgentSensor");
    const port = parseInt(process.env.DIALOGUE_AGENT_PORT || "3001", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
