/**
 * Sensor for ListeningAgent
 * Monitors the speech-to-text agent
 * Note: Maps to VoiceAgent - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Listening agent sensor
 * Monitors ListeningAgent health and performance (maps to VoiceAgent)
 */
export class ListeningAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new ListeningAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "ListeningAgent";
    const defaultLogger = logger || createLogger("ListeningAgentSensor");
    const port = parseInt(process.env.VOICE_AGENT_PORT || "3008", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
