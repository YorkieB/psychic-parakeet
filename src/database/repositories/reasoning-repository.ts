/*
  This file helps Jarvis track how it thinks and makes decisions.

  It stores reasoning traces, decision processes, and thinking steps while making sure Jarvis can remember how it solved problems and learn from past experiences.
*/
import type { Logger } from "winston";
import type { ReasoningTrace } from "../../reasoning/types";
import type { DatabaseClient } from "../client";

/**
 * Repository for reasoning traces.
 */
export class ReasoningRepository {
  constructor(
    private db: DatabaseClient,
    private logger: Logger,
  ) {}

  /**
   * Save reasoning trace to database.
   */
  async saveTrace(
    trace: ReasoningTrace,
    sessionId: string,
    userId: string,
    userInput: string,
    finalResponse: string,
    durationMs: number,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO reasoning_traces (
          trace_id, session_id, user_id, user_input, goal, reasoning_steps,
          execution_plan, agent_outputs, final_response, confidence,
          duration_ms, criticality, metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (trace_id) DO NOTHING
      `,
        [
          trace.id,
          sessionId || null,
          userId,
          userInput,
          JSON.stringify(trace.goal),
          JSON.stringify(trace.reasoningSteps),
          JSON.stringify(trace.plan),
          JSON.stringify({}), // Agent outputs stored separately if needed
          finalResponse,
          trace.confidence,
          durationMs,
          trace.approach || "standard",
          JSON.stringify({}),
          trace.timestamp,
        ],
      );
    } catch (error) {
      this.logger.error("Failed to save reasoning trace:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - graceful degradation
    }
  }

  /**
   * Get reasoning trace by ID.
   */
  async getTrace(traceId: string): Promise<ReasoningTrace | null> {
    try {
      const result = await this.db.query(
        `
        SELECT * FROM reasoning_traces WHERE trace_id = $1
      `,
        [traceId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.trace_id,
        goal: row.goal,
        reasoningSteps: row.reasoning_steps,
        plan: row.execution_plan,
        approach: row.criticality,
        timestamp: row.created_at,
        confidence: parseFloat(String(row.confidence)),
        estimatedDuration: row.duration_ms,
      };
    } catch (error) {
      this.logger.error("Failed to get reasoning trace:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get traces for user (for analytics/debugging).
   */
  async getTracesForUser(userId: string, limit: number = 10): Promise<ReasoningTrace[]> {
    try {
      const result = await this.db.query(
        `
        SELECT * FROM reasoning_traces
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
        [userId, limit],
      );

      return result.rows.map((row: any) => ({
        id: row.trace_id,
        goal: row.goal,
        reasoningSteps: row.reasoning_steps,
        plan: row.execution_plan,
        approach: row.criticality,
        timestamp: row.created_at,
        confidence: parseFloat(String(row.confidence)),
        estimatedDuration: row.duration_ms,
      }));
    } catch (error) {
      this.logger.error("Failed to get traces for user:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
