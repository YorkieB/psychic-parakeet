/**
 * Sensor for VoiceCommandAgent
 * Monitors the voice command processing agent
 * Note: Maps to VoiceAgent - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Voice command agent sensor
 * Monitors VoiceCommandAgent health and performance (maps to VoiceAgent)
 */
export class VoiceCommandAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new VoiceCommandAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "VoiceCommandAgent";
    const defaultLogger = logger || createLogger("VoiceCommandAgentSensor");
    const port = parseInt(process.env.VOICE_AGENT_PORT || "3008", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
