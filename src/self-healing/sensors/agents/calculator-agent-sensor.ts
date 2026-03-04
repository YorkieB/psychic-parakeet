/**
 * Sensor for CalculatorAgent
 * Monitors the mathematical operations agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Calculator agent sensor
 * Monitors CalculatorAgent health and performance (placeholder)
 */
export class CalculatorAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new CalculatorAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "CalculatorAgent";
    const defaultLogger = logger || createLogger("CalculatorAgentSensor");
    const port = parseInt(process.env.CALCULATOR_AGENT_PORT || "3023", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
