/**
 * Sensor for ComputerControlAgent
 * Monitors the system control agent
 * Note: Agent not yet implemented - placeholder sensor
 */

import type { Logger } from "winston";
import { createLogger } from "../../../utils/logger";
import { BaseAgentSensor } from "./base-agent-sensor";

/**
 * Computer control agent sensor
 * Monitors ComputerControlAgent health and performance (placeholder)
 */
export class ComputerControlAgentSensor extends BaseAgentSensor {
  /**
   * Creates a new ComputerControlAgent sensor
   *
   * @param logger - Winston logger instance (optional)
   * @param checkInterval - Health check interval in ms (default: 30000 for standard agent)
   */
  constructor(logger?: Logger, checkInterval: number = 30000) {
    const agentName = "ComputerControlAgent";
    const defaultLogger = logger || createLogger("ComputerControlAgentSensor");
    const port = parseInt(process.env.COMPUTER_CONTROL_AGENT_PORT || "3021", 10);
    const healthEndpoint = `http://localhost:${port}/health`;
    const apiEndpoint = `http://localhost:${port}/api`;

    super(agentName, defaultLogger, healthEndpoint, apiEndpoint, checkInterval);
  }
}
