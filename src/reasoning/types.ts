/**
 * Advanced Reasoning Engine Type Definitions
 */

// Types are imported inline where needed

/**
 * Re-export UserInput for convenience
 */
export type { UserInput } from "../types/agent";

/**
 * Structured goal parsed from user input
 */
export interface Goal {
  /** Unique identifier for this goal */
  id: string;
  /** Primary objective statement */
  primaryObjective: string;
  /** Sub-goals that contribute to the primary objective */
  subGoals: string[];
  /** Domains involved (finance, web, calendar, system, security, privacy, knowledge, etc.) */
  domains: string[];
  /** Optional time constraints */
  timeConstraints?: {
    /** Deadline for completion */
    deadline?: Date;
    /** Expected duration in milliseconds */
    duration?: number;
  };
  /** Criteria that define success */
  successCriteria: string[];
  /** Risk level of this goal */
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  /** Confidence in goal understanding (0.0-1.0) */
  confidence: number;
  /** Research depth needed for this goal */
  researchDepth?: "QUICK" | "MEDIUM" | "DEEP";
}

/**
 * Criticality level for reasoning approach
 */
export type Criticality = "LOW" | "MEDIUM" | "CRITICAL";

/**
 * A single step in the reasoning process
 */
export interface ReasoningStep {
  /** Step number in sequence */
  stepNumber: number;
  /** Type of reasoning step */
  type: "ANALYSIS" | "PLANNING" | "VERIFICATION" | "DECISION";
  /** Content/description of this step */
  content: string;
  /** Confidence in this step (0.0-1.0) */
  confidence: number;
  /** Alternative approaches considered (optional) */
  alternatives?: string[];
  /** Justification for this step */
  justification: string;
}

/**
 * Complete reasoning trace with goal, steps, and plan
 */
export interface ReasoningTrace {
  /** Unique identifier for this trace */
  id: string;
  /** The goal being pursued */
  goal: Goal;
  /** Chain-of-thought reasoning steps */
  reasoningSteps: ReasoningStep[];
  /** Execution plan derived from reasoning */
  plan: EnhancedExecutionPlan;
  /** Approach taken (for multi-path reasoning) */
  approach?: string;
  /** Timestamp when trace was created */
  timestamp: Date;
  /** Overall confidence (0.0-1.0) */
  confidence: number;
  /** Estimated cost in USD (optional) */
  estimatedCost?: number;
  /** Estimated duration in milliseconds (optional) */
  estimatedDuration?: number;
}

/**
 * Result of pre-execution verification
 */
export interface VerificationResult {
  /** Whether all checks passed */
  passed: boolean;
  /** Individual verification checks */
  checks: VerificationCheck[];
  /** Timestamp of verification */
  timestamp: Date;
  /** Blockers that prevent execution (optional) */
  blockers?: string[];
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  /** Name of the check */
  name: string;
  /** Whether this check passed */
  passed: boolean;
  /** Details about the check result */
  details: string;
  /** Severity level */
  severity: "INFO" | "WARNING" | "ERROR";
}

/**
 * Enhanced execution plan with dependencies and fallback
 */
export interface EnhancedExecutionPlan {
  /** Unique identifier for this plan */
  id: string;
  /** Steps to execute */
  steps: import("../types/agent").PlanStep[];
  /** Groups of step IDs that can run in parallel */
  canRunInParallel: string[][];
  /** Estimated duration in milliseconds */
  estimatedDuration: number;
  /** Map of step IDs to their dependent step IDs */
  dependencies: Map<string, string[]>;
  /** Groups of steps that can run in parallel (duplicate for compatibility) */
  parallelizable: string[][];
  /** Alternative plan if this one fails (optional) */
  fallbackPlan?: EnhancedExecutionPlan;
}

/**
 * Enhanced Jarvis response with reasoning visibility
 */
export interface JarvisResponse {
  /** Response text to show user */
  text: string;
  /** ID of the reasoning trace */
  reasoningTraceId: string;
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Agents used in this response */
  agentsUsed: string[];
  /** Timestamp when response was generated */
  timestamp: Date;
  /** Suggested follow-up actions (optional) */
  suggestedFollowUps?: string[];
  /** Explicit list of uncertainties (AI_RULES_MANDATORY Rule 1) */
  uncertainties?: string[];
  /** Additional metadata */
  metadata?: {
    /** Detected intent type */
    intentType?: string;
    /** Visible reasoning steps */
    reasoning?: ReasoningStep[];
    /** Total duration in milliseconds */
    duration?: number;
    /** Detailed timing breakdown */
    timings?: Record<string, number>;
    /** Whether response was served from cache */
    cached?: boolean;
    /** Cache age in milliseconds */
    cacheAge?: number;
    /** Whether fast-path was used */
    fastPath?: boolean;
    /** Whether context was used for reference resolution */
    contextUsed?: boolean;
    /** Resolved references (reference -> entity) */
    referencesResolved?: [string, string][];
  };
}

/**
 * Cached response entry
 */
export interface CachedResponse {
  /** The cached response */
  response: JarvisResponse;
  /** Timestamp when cached */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt: number;
}
