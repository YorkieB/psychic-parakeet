/**
 * Sensor for SpeechAgent
 * Monitors the text-to-speech agent
 * Note: Maps to VoiceAgent - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Speech agent sensor
 * Monitors SpeechAgent health and performance (maps to VoiceAgent)
 */
export class SpeechAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new SpeechAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "SpeechAgent";
    const defaultLogger = logger || createLogger("SpeechAgentSensor");
    const port = parseInt(process.env.VOICE_AGENT_PORT || "3008", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
