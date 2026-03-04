/**
 * Layer 1: Input Firewall
 * Multi-stage input scanning before reaching LLM
 */

import type { Logger } from "winston";
import type { ScanContext, ScanResult } from "../types";
import { PatternFilter } from "./pattern-filter";
import { PIIDetector } from "./pii-detector";

export class InputFirewall {
  private patternFilter: PatternFilter;
  private piiDetector: PIIDetector;
  private logger: Logger;
  private lakeraEnabled: boolean;
  private lakeraApiKey?: string;

  constructor(logger: Logger) {
    this.logger = logger;
    this.patternFilter = new PatternFilter();
    this.piiDetector = new PIIDetector();
    this.lakeraEnabled = process.env.LAKERA_GUARD_ENABLED === "true";
    this.lakeraApiKey = process.env.LAKERA_GUARD_API_KEY;
  }

  async scan(input: string, context: ScanContext): Promise<ScanResult> {
    const totalStartTime = Date.now();

    // Stage 1: Fast pattern matching (1-5ms)
    const patternResult = await this.patternFilter.check(input);
    if (patternResult.blocked) {
      this.logger.warn("Input blocked by pattern filter", {
        userId: context.userId,
        threat: patternResult.threat,
        reason: patternResult.reason,
      });
      return {
        allowed: false,
        threat: patternResult.threat,
        reason: patternResult.reason,
        latency: patternResult.latency,
      };
    }

    // Stage 2: PII detection (5-10ms)
    const piiResult = await this.piiDetector.scan(input, context.strictMode);
    if (piiResult.containsPII && context.strictMode) {
      this.logger.warn("Input blocked due to PII in strict mode", {
        userId: context.userId,
        redactions: piiResult.redactions?.length,
      });
      return {
        allowed: false,
        threat: "pii_detected",
        reason: `PII detected: ${piiResult.redactions?.map((r) => r.type).join(", ")}`,
        redacted: piiResult.redacted,
        latency: piiResult.latency,
      };
    }

    // Stage 3: Lakera Guard AI detection (30-50ms) - Optional
    if (this.lakeraEnabled && this.lakeraApiKey) {
      try {
        const lakeraResult = await this.checkLakeraGuard(input);
        if (lakeraResult.flagged) {
          this.logger.warn("Input flagged by Lakera Guard", {
            userId: context.userId,
            categories: lakeraResult.categories,
            scores: lakeraResult.scores,
          });
          return {
            allowed: false,
            threat: lakeraResult.categories.join(","),
            confidence: lakeraResult.scores,
            reason: "Lakera Guard detected potential threat",
            latency: lakeraResult.latency,
          };
        }
      } catch (error) {
        this.logger.warn("Lakera Guard check failed, continuing without it", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue without Lakera if it fails
      }
    }

    const totalLatency = Date.now() - totalStartTime;

    return {
      allowed: true,
      latency: totalLatency,
      redacted: piiResult.redacted, // Return redacted version even if allowed
    };
  }

  private async checkLakeraGuard(input: string): Promise<{
    flagged: boolean;
    categories: string[];
    scores: Record<string, number>;
    latency: number;
  }> {
    const startTime = Date.now();

    if (!this.lakeraApiKey) {
      return { flagged: false, categories: [], scores: {}, latency: Date.now() - startTime };
    }

    try {
      const response = await fetch("https://api.lakera.ai/v1/prompt_injection", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.lakeraApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`Lakera API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        results?: Array<{
          flagged?: boolean;
          categories?: string[];
          scores?: Record<string, number>;
        }>;
      };
      const flagged = data.results?.[0]?.flagged || false;
      const categories = data.results?.[0]?.categories || [];
      const scores = data.results?.[0]?.scores || {};

      return {
        flagged,
        categories,
        scores,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error("Lakera Guard API call failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fail open - allow request if Lakera is unavailable
      return { flagged: false, categories: [], scores: {}, latency: Date.now() - startTime };
    }
  }
}
