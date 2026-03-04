import type { AIAssessmentResult, ConsensusResult } from "../ai-engine/types.js";
import type { InstructionPayload, SourceAnalysis } from "../rules-engine/types.js";
import type { DebateEngineConfig, DebateResult } from "./debate-types.js";

/**
 * State of a background thinking task
 */
export type ThinkingTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

/**
 * Type of thinking task
 */
export type ThinkingTaskType = "cot" | "mad";

/**
 * Base request for thinking tasks
 */
export interface BaseThinkingRequest {
  type?: ThinkingTaskType;
}

/**
 * COT (Chain of Thought) task request
 */
export interface COTTaskRequest extends BaseThinkingRequest {
  type?: "cot";
  sourceUrl: string;
  sourceContent: string;
  sourceAnalysis: SourceAnalysis;
  instructionPayload: InstructionPayload;
}

/**
 * MAD (Multi-Agent Debate) task request
 */
export interface MADTaskRequest extends BaseThinkingRequest {
  type: "mad";
  claim: string;
  source?: string;
  context?: string;
  options?: {
    maxRounds?: number;
    temperature?: number;
    useRAGVerification?: boolean;
    useFallacyDetection?: boolean;
    useSelfConsistency?: boolean;
  };
}

/**
 * Background thinking task definition
 */
export interface ThinkingTask {
  id: string;
  status: ThinkingTaskStatus;
  startTime: Date;
  endTime?: Date;
  request: COTTaskRequest | MADTaskRequest;
  result?: AIAssessmentResult | ConsensusResult | DebateResult;
  error?: string;
  progress: number; // 0-100
}

/**
 * Event listener for background thinking tasks
 */
export interface ThinkingTaskListener {
  onTaskStarted?: (task: ThinkingTask) => void;
  onTaskProgress?: (task: ThinkingTask) => void;
  onTaskComplete?: (task: ThinkingTask) => void;
  onTaskFailed?: (task: ThinkingTask, error: string) => void;
}

/**
 * Configuration for the COT Engine
 */
export interface COTEngineConfig {
  /** Model to use for deep thinking (e.g., 'claude-3-opus') */
  deepThinkerModel: string;
  /** Whether to use multi-model consensus for background tasks */
  useConsensus: boolean;
  /** Max time allowed for deep thinking in ms */
  timeout: number;
  /** Enable Multi-Agent Debate framework */
  enableMAD?: boolean;
  /** Configuration for Multi-Agent Debate engine */
  madConfig?: DebateEngineConfig;
  /** Default settings for MAD tasks */
  madDefaults?: {
    maxRounds: number;
    temperature: number;
    useRAGVerification: boolean;
    useFallacyDetection: boolean;
    useSelfConsistency: boolean;
  };
}

/**
 * Task creation options
 */
export interface TaskCreationOptions {
  priority?: "low" | "normal" | "high" | "urgent";
  timeout?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Task filter options for querying
 */
export interface TaskFilterOptions {
  status?: ThinkingTaskStatus | ThinkingTaskStatus[];
  type?: ThinkingTaskType | ThinkingTaskType[];
  startTimeAfter?: Date;
  startTimeBefore?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Task statistics interface
 */
export interface TaskStatistics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  madTasks: number;
  cotTasks: number;
  averageProcessingTime: number;
  successRate: number;
}

/**
 * Enhanced task listener with MAD-specific events
 */
export interface EnhancedThinkingTaskListener extends ThinkingTaskListener {
  onMADRoundStarted?: (task: ThinkingTask, roundNumber: number) => void;
  onMADRoundCompleted?: (task: ThinkingTask, roundNumber: number) => void;
  onMADConsensusReached?: (task: ThinkingTask) => void;
  onMADFallacyDetected?: (task: ThinkingTask, fallacyCount: number) => void;
  onRAGVerificationComplete?: (task: ThinkingTask, verificationResult: string) => void;
}
