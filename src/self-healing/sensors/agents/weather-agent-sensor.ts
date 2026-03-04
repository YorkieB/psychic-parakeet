/**
 * Sensor for WeatherAgent
 * Monitors the weather information agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Weather agent sensor
 * Monitors WeatherAgent health and performance (placeholder)
 */
export class WeatherAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new WeatherAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "WeatherAgent";
    const defaultLogger = logger || createLogger("WeatherAgentSensor");
    const port = parseInt(process.env.WEATHER_AGENT_PORT || "3015", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
