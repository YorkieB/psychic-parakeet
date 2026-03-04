/**
 * Sensor for EmotionAgent
 * Monitors the emotional intelligence agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Emotion agent sensor
 * Monitors EmotionAgent health and performance (placeholder)
 */
export class EmotionAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new EmotionAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "EmotionAgent";
    const defaultLogger = logger || createLogger("EmotionAgentSensor");
    const port = parseInt(process.env.EMOTION_AGENT_PORT || "3014", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
