/**
 * Sensor for PersonalityAgent
 * Monitors the personality configuration agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Personality agent sensor
 * Monitors PersonalityAgent health and performance (placeholder)
 */
export class PersonalityAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new PersonalityAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "PersonalityAgent";
    const defaultLogger = logger || createLogger("PersonalityAgentSensor");
    const port = parseInt(process.env.PERSONALITY_AGENT_PORT || "3027", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
