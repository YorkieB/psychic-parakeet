/**
 * Chain of Thought (CoT) Engine - Advanced Critical Thinking Module
 * Implements Multi-Agent Debate (MAD) framework with fallacy detection
 */

export { AdaptiveStopping } from "./adaptive-stopping.js";
export { CompositeScorer } from "./composite-scorer.js";
export { COTEngine } from "./cot-engine.js";
export { DebateEngine } from "./debate-engine.js";
// Export types from debate-types.js
export type {
  AdaptiveStoppingDecision,
  CompositeScore,
  DebateArgument,
  DebateEngineConfig,
  DebateRequest,
  DebateResult,
  DebateRole,
  DebateRound,
  FactualClaim,
  FallacyDetection,
  FallacyType,
  JudgeEvaluation,
  RAGVerificationResult,
  SelfConsistencyResult,
  VerificationLayer,
} from "./debate-types.js";
export { FallacyDetector } from "./fallacy-detector.js";
export { RAGVerifier } from "./rag-verifier.js";
export { SelfConsistency } from "./self-consistency.js";
// Export types from types.js
export type {
  COTEngineConfig,
  COTTaskRequest,
  EnhancedThinkingTaskListener,
  MADTaskRequest,
  TaskCreationOptions,
  TaskFilterOptions,
  TaskStatistics,
  ThinkingTask,
  ThinkingTaskListener,
  ThinkingTaskStatus,
  ThinkingTaskType,
} from "./types.js";
