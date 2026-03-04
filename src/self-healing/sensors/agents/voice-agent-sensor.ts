/**
 * Sensor for VoiceAgent
 * Monitors the voice/speech agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Voice agent sensor
 * Monitors VoiceAgent health and performance
 */
export class VoiceAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new VoiceAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "VoiceAgent";
    const defaultLogger = logger || createLogger("VoiceAgentSensor");
    const port = parseInt(process.env.VOICE_AGENT_PORT || "3008", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
