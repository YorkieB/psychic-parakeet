/**
 * Reliability Algorithm Module - Main exports
 * Phase 3: Integration layer that orchestrates Rules Engine + AI Assessment Engine
 */

export { ReliabilityAlgorithm } from "./reliability-algorithm.js";

// Export types from this module
export type {
  AssessmentStatus,
  BackgroundAssessmentResponse,
  ContentFetcher,
  ReliabilityAssessmentError,
  ReliabilityAssessmentRequest,
  ReliabilityAssessmentResult,
  ReliabilityCache,
  ReliabilityConfig,
  ReliabilityEventListener,
} from "./types.js";
