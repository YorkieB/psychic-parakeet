/**
 * Diagnostic Engine
 * Uses RAG pipeline to diagnose and generate fixes for agent issues
 */

import type { Logger } from "winston";
import type { BugReport, RAGRepairPipeline } from "../knowledge/rag-pipeline";
import type { HealthEvent } from "../types";

export interface Diagnosis {
  diagnosis: string;
  rootCause: string;
  fixStrategy: "code-fix" | "config-fix" | "restart" | "manual";
  confidence: number;
  fixCode?: string;
  sources?: Array<{
    repo: string;
    path: string;
    license: string;
  }>;
  explanation?: string;
}

export class DiagnosticEngine {
  private logger: Logger;
  private rag: RAGRepairPipeline;
  private enabled: boolean;

  constructor(logger: Logger, rag: RAGRepairPipeline, enabled: boolean = true) {
    this.logger = logger;
    this.rag = rag;
    this.enabled = enabled;
  }

  /**
   * Diagnose a health event and generate fix suggestion
   */
  async diagnose(healthEvent: HealthEvent): Promise<Diagnosis> {
    if (!this.enabled) {
      return {
        diagnosis: "Diagnostic engine disabled",
        rootCause: "RAG pipeline not available",
        fixStrategy: "manual",
        confidence: 0,
      };
    }

    try {
      this.logger.info(`Diagnosing issue for ${healthEvent.agentName}...`);

      // Convert health event to bug report
      const bug: BugReport = {
        agentName: healthEvent.agentName,
        errorMessage: healthEvent.message || "Unknown error",
        stackTrace: this.extractStackTrace(healthEvent),
        component: healthEvent.agentName,
        language: "TypeScript", // Jarvis is TypeScript
        context: this.extractContext(healthEvent),
      };

      // Generate fix using RAG pipeline
      const suggestion = await this.rag.generateFix(bug);

      // Convert to diagnosis format
      return {
        diagnosis: suggestion.diagnosis,
        rootCause: suggestion.rootCause,
        fixStrategy: suggestion.fixCode ? "code-fix" : "manual",
        confidence: suggestion.confidence,
        fixCode: suggestion.fixCode,
        sources: suggestion.sources,
        explanation: suggestion.explanation,
      };
    } catch (error) {
      this.logger.error("Diagnosis failed:", {
        error: error instanceof Error ? error.message : String(error),
        healthEvent,
      });

      return {
        diagnosis: "Diagnosis failed",
        rootCause: error instanceof Error ? error.message : "Unknown error",
        fixStrategy: "manual",
        confidence: 0,
      };
    }
  }

  /**
   * Extract stack trace from health event
   */
  private extractStackTrace(event: HealthEvent): string {
    if (event.details?.stackTrace) {
      return event.details.stackTrace;
    }
    if (event.details?.error?.stack) {
      return event.details.error.stack;
    }
    if (event.message) {
      return event.message;
    }
    return "No stack trace available";
  }

  /**
   * Extract context from health event
   */
  private extractContext(event: HealthEvent): string {
    const context: string[] = [];

    if (event.details?.component) {
      context.push(`Component: ${event.details.component}`);
    }
    if (event.details?.metrics) {
      context.push(`Metrics: ${JSON.stringify(event.details.metrics)}`);
    }
    if (event.details?.state) {
      context.push(`State: ${event.details.state}`);
    }

    return context.join("\n");
  }

  /**
   * Enable/disable diagnostic engine
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.info(`Diagnostic engine ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if diagnostic engine is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
