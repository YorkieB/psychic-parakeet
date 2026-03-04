/**
 * Sensor for UnitConverterAgent
 * Monitors the unit conversion agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Unit converter agent sensor
 * Monitors UnitConverterAgent health and performance (placeholder)
 */
export class UnitConverterAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new UnitConverterAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 60000 for low-priority agent)
   */
  constructor(logger?: Logger, checkInterval: number = 60000) {
    const agentName = "UnitConverterAgent";
    const defaultLogger = logger || createLogger("UnitConverterAgentSensor");
    const port = parseInt(process.env.UNIT_CONVERTER_AGENT_PORT || "3024", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
