/**
 * Health Event Handler
 * Integrates knowledge base diagnostic and repair with health monitoring
 */

import type { Logger } from "winston";
import type { DiagnosticEngine } from "../diagnostic/diagnostic-engine";
import type { RepairEngine } from "../repair/repair-engine";
import type { AgentMetrics, HealthEvent } from "../types";

export interface HealthEventHandlerConfig {
  enableAutoDiagnosis: boolean;
  enableAutoRepair: boolean;
  minConfidenceForRepair: number;
  repairStrategies: Array<"code-fix" | "config-fix" | "restart" | "manual">;
}

export class HealthEventHandler {
  private logger: Logger;
  private diagnostic: DiagnosticEngine;
  private repair: RepairEngine;
  private config: HealthEventHandlerConfig;
  private eventHistory: Map<string, HealthEvent[]> = new Map();

  constructor(
    logger: Logger,
    diagnostic: DiagnosticEngine,
    repair: RepairEngine,
    config?: Partial<HealthEventHandlerConfig>,
  ) {
    this.logger = logger;
    this.diagnostic = diagnostic;
    this.repair = repair;
    this.config = {
      enableAutoDiagnosis: config?.enableAutoDiagnosis ?? true,
      enableAutoRepair: config?.enableAutoRepair ?? false, // Default to false for safety
      minConfidenceForRepair: config?.minConfidenceForRepair ?? 0.7,
      repairStrategies: config?.repairStrategies ?? ["restart"],
    };
  }

  /**
   * Handle a health event (error, crash, performance issue)
   */
  async handleHealthEvent(
    agentName: string,
    metrics: AgentMetrics,
    errorMessage?: string,
    stackTrace?: string,
  ): Promise<void> {
    // Determine event type
    let eventType: HealthEvent["eventType"] = "info";
    if (!metrics.isResponsive || metrics.status === "error") {
      eventType = "error";
    } else if (metrics.status === "offline") {
      eventType = "crash";
    } else if (metrics.healthScore < 50) {
      eventType = "warning";
    }

    // Create health event
    const healthEvent: HealthEvent = {
      agentName,
      timestamp: new Date(),
      eventType,
      message: errorMessage || this.generateEventMessage(metrics, eventType),
      details: {
        component: agentName,
        stackTrace,
        metrics: {
          healthScore: metrics.healthScore,
          responseTime: metrics.responseTime,
          memoryUsage: metrics.memoryUsage,
          errorRate: metrics.errorRate,
          crashCount: metrics.crashCount,
        },
        state: metrics.status,
      },
    };

    // Store in history
    if (!this.eventHistory.has(agentName)) {
      this.eventHistory.set(agentName, []);
    }
    const history = this.eventHistory.get(agentName)!;
    history.push(healthEvent);
    if (history.length > 100) {
      history.shift();
    }

    // Handle based on event type
    if (eventType === "error" || eventType === "crash") {
      await this.handleErrorEvent(healthEvent);
    } else if (eventType === "warning") {
      await this.handleWarningEvent(healthEvent);
    }
  }

  /**
   * Handle error or crash event
   */
  private async handleErrorEvent(healthEvent: HealthEvent): Promise<void> {
    this.logger.warn(`🔍 Handling error event for ${healthEvent.agentName}...`);

    if (!this.config.enableAutoDiagnosis) {
      this.logger.debug("Auto-diagnosis disabled, skipping");
      return;
    }

    try {
      // Step 1: Diagnose the issue
      const diagnosis = await this.diagnostic.diagnose(healthEvent);

      this.logger.info(`📋 Diagnosis for ${healthEvent.agentName}:`, {
        diagnosis: diagnosis.diagnosis,
        rootCause: diagnosis.rootCause,
        confidence: diagnosis.confidence,
        strategy: diagnosis.fixStrategy,
      });

      // Step 2: Attempt repair if enabled and confidence is high
      if (
        this.config.enableAutoRepair &&
        diagnosis.confidence >= this.config.minConfidenceForRepair &&
        this.config.repairStrategies.includes(diagnosis.fixStrategy)
      ) {
        this.logger.info(`🔧 Attempting auto-repair for ${healthEvent.agentName}...`);

        const repairResult = await this.repair.repair(healthEvent);

        if (repairResult.success) {
          this.logger.info(`✅ Auto-repair successful for ${healthEvent.agentName}`);
        } else {
          this.logger.warn(`⚠️  Auto-repair failed for ${healthEvent.agentName}:`, {
            error: repairResult.error,
            strategy: repairResult.strategy,
          });
        }
      } else {
        this.logger.info(`💡 Diagnosis available but auto-repair not triggered:`, {
          autoRepairEnabled: this.config.enableAutoRepair,
          confidence: diagnosis.confidence,
          minConfidence: this.config.minConfidenceForRepair,
          strategy: diagnosis.fixStrategy,
          allowedStrategies: this.config.repairStrategies,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to handle error event for ${healthEvent.agentName}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle warning event (performance degradation)
   */
  private async handleWarningEvent(healthEvent: HealthEvent): Promise<void> {
    this.logger.debug(
      `⚠️  Warning event for ${healthEvent.agentName} (health score: ${healthEvent.details?.metrics?.healthScore})`,
    );
    // For warnings, we just log - no auto-repair
  }

  /**
   * Generate event message from metrics
   */
  private generateEventMessage(metrics: AgentMetrics, eventType: HealthEvent["eventType"]): string {
    switch (eventType) {
      case "crash":
        return `Agent crashed (not responding, crash count: ${metrics.crashCount})`;
      case "error":
        return `Agent error (health score: ${metrics.healthScore}, error rate: ${metrics.errorRate}%)`;
      case "warning":
        return `Performance degradation (health score: ${metrics.healthScore})`;
      default:
        return `Health event (status: ${metrics.status}, health score: ${metrics.healthScore})`;
    }
  }

  /**
   * Get event history for an agent
   */
  getEventHistory(agentName: string): HealthEvent[] {
    return this.eventHistory.get(agentName) || [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HealthEventHandlerConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info("Health event handler config updated", this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): HealthEventHandlerConfig {
    return { ...this.config };
  }
}
