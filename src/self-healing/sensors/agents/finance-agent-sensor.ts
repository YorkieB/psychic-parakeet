/**
 * Sensor for FinanceAgent
 * Monitors the financial operations agent
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Finance agent sensor
 * Monitors FinanceAgent health and performance
 */
export class FinanceAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new FinanceAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "FinanceAgent";
    const defaultLogger = logger || createLogger("FinanceAgentSensor");
    const port = parseInt(process.env.FINANCE_AGENT_PORT || "3004", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
