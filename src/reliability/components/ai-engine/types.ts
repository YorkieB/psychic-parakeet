// AI Assessment Engine Types
// Layer 2 of the rules-governed AI architecture

import type {
  InstructionPayload,
  ReliabilityLabel,
  SourceAnalysis,
  ViolationSeverity,
} from "../rules-engine/types.js";

// Re-export needed types
export type { InstructionPayload, ReliabilityLabel, ViolationSeverity, SourceAnalysis };

export type AIProvider = "claude-sonnet" | "gpt-4o" | "vertex-ai" | "local-model";

export interface AIProviderConfig {
  provider: AIProvider;
  /** API key (optional for Vertex AI when using ADC) */
  apiKey?: string;
  baseUrl?: string;
  /** Vertex AI: dedicated endpoint base URL, e.g. https://{endpoint-id}.{region}.{project}.prediction.vertexai.goog */
  vertexEndpointUrl?: string;
  /** Vertex AI: use RawPredict (arbitrary JSON body) vs Predict (instances/parameters) */
  vertexUseRawPredict?: boolean;
  model: string;
  maxTokens: number;
  temperature?: number;
  timeout: number;
}

export interface AIAssessmentRequest {
  sourceContent: string;
  sourceUrl?: string;
  instructionPayload: InstructionPayload;
  sourceAnalysis: SourceAnalysis;
  priority: "low" | "normal" | "high";
  requireConsensus: boolean;
}

export interface FactorAnalysis {
  factor: string;
  score: number;
  weight: number;
  confidence: number;
  reasoning: string[];
  evidence: string[];
}

export interface AIAssessmentResult {
  reliabilityScore: number;
  reliabilityLabel: ReliabilityLabel;
  confidence: number;
  factorsAnalyzed: Record<string, FactorAnalysis>;
  prohibitedCheck: Record<string, boolean>; // Confirmation of what wasn't assessed
  reasoning: string[];
  evidence: string[];
  metadata: {
    provider: AIProvider;
    model: string;
    processingTime: number;
    tokensUsed: number;
    temperature: number;
    requestId: string;
  };
}

export interface ConsensusResult {
  finalScore: number;
  finalLabel: ReliabilityLabel;
  finalConfidence: number;
  consensusStrength: number; // 0-1, how much models agreed
  primaryResult: AIAssessmentResult;
  secondaryResults: AIAssessmentResult[];
  disagreements: string[];
  consensusReasoning: string[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: any;
  supportedDimensions: string[];
  version: string;
}

export interface AIEngineConfig {
  primaryProvider: AIProviderConfig;
  secondaryProvider?: AIProviderConfig; // For consensus
  enableConsensusMode: boolean;
  consensusThreshold: number; // Disagreement threshold to trigger consensus
  promptLibrary: Map<string, PromptTemplate>;
  enableCaching: boolean;
  cacheTimeout: number; // Minutes
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
    timeoutMs: number;
  };
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface ProcessingMetrics {
  requestId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  provider: AIProvider;
  model: string;
  tokensUsed: number;
  success: boolean;
  errorType?: string;
  retryCount: number;
}

export interface AIEngineError {
  code: string;
  message: string;
  provider: AIProvider;
  retryable: boolean;
  details?: any;
}

// Response validation interfaces
export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  correctedResult?: AIAssessmentResult;
}

export interface ValidationViolation {
  type: string;
  severity: ViolationSeverity;
  description: string;
  field?: string;
  expected?: any;
  actual?: any;
}

// Cache interfaces
export interface CacheEntry {
  key: string;
  result: AIAssessmentResult;
  timestamp: Date;
  expiresAt: Date;
  requestHash: string;
}

export interface CacheManager {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, result: AIAssessmentResult, ttlMinutes: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
}
