/**
 * Phase 3 - Reliability Algorithm Integration
 * Main types for the unified reliability assessment system
 */

import type { AIAssessmentResult, AIEngineConfig, ConsensusResult } from "../ai-engine/types.js";
import type { InstructionPayload, SourceAnalysis, SourceMetadata } from "../rules-engine/types.js";

/**
 * Configuration for the complete reliability algorithm
 */
export interface ReliabilityConfig {
  /** Configuration for the AI assessment engine */
  aiEngine: AIEngineConfig;

  /** Enable debug logging for development */
  enableDebugLogging?: boolean;

  /** Timeout for complete assessment in milliseconds */
  assessmentTimeout?: number;

  /** Custom validation rules (optional) */
  customValidation?: ValidationConfig;

  /** Performance monitoring settings */
  monitoring?: MonitoringConfig;

  /** Multi-Agent Debate (MAD) framework configuration */
  madFramework?: MADFrameworkConfig;

  /** Ground Truth Verification Protocol (GTVP) configuration */
  gtvpFramework?: GTVPFrameworkConfig;
}

/**
 * Custom validation configuration
 */
export interface ValidationConfig {
  /** Additional prohibited assessment types */
  additionalProhibited?: string[];

  /** Custom confidence thresholds by source type */
  confidenceThresholds?: Record<string, number>;

  /** Custom scoring boundaries by source type */
  scoringBoundaries?: Record<string, { min: number; max: number }>;
}

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
  /** Track assessment timing */
  trackTiming?: boolean;

  /** Track provider usage statistics */
  trackProviderStats?: boolean;

  /** Track validation failures */
  trackValidationFailures?: boolean;
}

/**
 * Multi-Agent Debate (MAD) framework configuration
 */
export interface MADFrameworkConfig {
  /** Enable MAD framework */
  enabled: boolean;

  /** Claude provider configuration for Prosecutor role */
  claudeConfig?: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    timeout?: number;
  };

  /** GPT provider configuration for Defense role */
  gptConfig?: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    timeout?: number;
  };

  /** Debate engine configuration */
  debateConfig?: {
    /** Maximum rounds per debate */
    maxRounds: number;
    /** Temperature for debate arguments */
    temperature: number;
    /** Semantic entropy threshold for stopping */
    semanticEntropyThreshold: number;
    /** Confidence plateau threshold for stopping */
    confidencePlateauThreshold: number;
    /** Fallacy penalty multiplier */
    fallacyPenaltyMultiplier: number;
    /** RAG verification weight in scoring */
    ragVerificationWeight: number;
    /** Number of runs for self-consistency */
    selfConsistencyRuns: number;
    /** Maximum confidence (epistemic humility) */
    maxConfidence: number;
    /** Cost threshold per debate */
    costThreshold: number;
  };

  /** Default options for MAD tasks */
  defaults?: {
    /** Use RAG verification by default */
    useRAGVerification: boolean;
    /** Use fallacy detection by default */
    useFallacyDetection: boolean;
    /** Use self-consistency by default */
    useSelfConsistency: boolean;
    /** Enable background processing by default */
    enableBackground: boolean;
  };

  /** RAG verification sources configuration */
  ragSources?: {
    /** Enable PubMed queries */
    enablePubMed: boolean;
    /** Enable Wikipedia queries */
    enableWikipedia: boolean;
    /** Enable government data queries */
    enableGovernmentData: boolean;
    /** Enable fact-checking sites */
    enableFactCheck: boolean;
    /** API keys for external services */
    apiKeys?: {
      factCheckApi?: string;
      governmentDataApi?: string;
    };
  };

  /** Fallacy detection configuration */
  fallacyDetection?: {
    /** Confidence threshold for reporting fallacies */
    confidenceThreshold: number;
    /** Custom fallacy library path */
    customLibraryPath?: string;
    /** Enable context analysis */
    enableContextAnalysis: boolean;
  };

  /** Performance and cost controls */
  performance?: {
    /** Enable adaptive stopping */
    enableAdaptiveStopping: boolean;
    /** Maximum parallel debates */
    maxParallelDebates: number;
    /** Request timeout in milliseconds */
    requestTimeout: number;
    /** Cost alerts threshold */
    costAlertThreshold: number;
  };
}

/**
 * Ground Truth Verification Protocol (GTVP) framework configuration
 */
export interface GTVPFrameworkConfig {
  /** Enable GTVP framework */
  enabled: boolean;

  /** GTVP engine configuration */
  gtvpConfig?: {
    /** Minimum number of authorities required */
    requireMinimumVerifications: number;
    /** Confidence threshold for acceptance */
    confidenceThreshold: number;
    /** Enable expert escalation */
    enableExpertEscalation: boolean;
    /** Timeout for verification requests */
    timeoutMs: number;
    /** Number of retry attempts */
    retryAttempts: number;
  };

  /** Authority sources configuration */
  authorities?: {
    /** API keys for authority services */
    apiKeys?: {
      reuters?: string;
      pubmed?: string;
      governmentData?: string;
      who?: string;
      worldBank?: string;
      ieee?: string;
    };
    /** Authority tier weights */
    tierWeights?: {
      tier1: number;
      tier2: number;
      tier3: number;
    };
  };

  /** Dataset generation configuration */
  datasetGeneration?: {
    /** Enable automatic dataset generation */
    autoGenerate: boolean;
    /** Target dataset size */
    targetSize: number;
    /** Distribution strategy */
    distributionStrategy: "BALANCED" | "DOMAIN_FOCUSED" | "COMPLEXITY_FOCUSED";
    /** Minimum confidence threshold for inclusion */
    minimumConfidenceThreshold: number;
  };

  /** Integration with reliability assessment */
  integration?: {
    /** Use GTVP for high-stakes assessments */
    useForHighStakes: boolean;
    /** Confidence threshold to trigger GTVP */
    triggerThreshold: number;
    /** Enable real-time verification */
    enableRealTimeVerification: boolean;
  };
}

/**
 * Input for a complete reliability assessment
 */
export interface ReliabilityAssessmentRequest {
  /** Source URL to assess */
  sourceUrl: string;

  /** Source content (optional - will be fetched if not provided) */
  sourceContent?: string;

  /** Additional source metadata (optional) */
  sourceMetadata?: Partial<SourceMetadata>;

  /** Assessment priority level */
  priority?: "low" | "normal" | "high";

  /** Force consensus mode regardless of default rules */
  forceConsensus?: boolean;

  /** Run deep analysis in the background and return a TaskID immediately */
  runInBackground?: boolean;

  /** Custom instruction modifications */
  customInstructions?: Partial<InstructionPayload>;

  /** Options for Multi-Agent Debate framework */
  madOptions?: {
    /** Force MAD processing regardless of default rules */
    forceMad?: boolean;
    /** Use RAG verification in debate */
    useRAGVerification?: boolean;
    /** Use fallacy detection in debate */
    useFallacyDetection?: boolean;
    /** Use self-consistency scoring */
    useSelfConsistency?: boolean;
    /** Number of debate rounds (overrides config) */
    customRounds?: number;
    /** Custom temperature for arguments */
    customTemperature?: number;
  };

  /** Options for Ground Truth Verification Protocol (GTVP) */
  gtvpOptions?: {
    /** Force GTVP verification regardless of default rules */
    forceGTVP?: boolean;
    /** Minimum number of authorities to consult */
    minimumAuthorities?: number;
    /** Confidence threshold for acceptance */
    confidenceThreshold?: number;
    /** Timeout for verification process */
    verificationTimeout?: number;
    /** Enable expert escalation for conflicts */
    enableExpertEscalation?: boolean;
    /** Specific domains to restrict authority selection */
    domainRestriction?: string[];
  };
}

/**
 * Result for a background task initiation
 */
export interface BackgroundAssessmentResponse {
  taskId: string;
  status: "pending" | "processing";
  message: string;
}

/**
 * Complete reliability assessment result
 */
export interface ReliabilityAssessmentResult {
  /** Final reliability score (0.0 to 1.0) */
  reliabilityScore: number;

  /** Human-readable reliability label */
  reliabilityLabel: "unreliable" | "low" | "moderate" | "high";

  /** Confidence in the assessment */
  confidence: number;

  /** Detailed factor analysis */
  factorsAnalyzed: Record<
    string,
    {
      score: number;
      weight: number;
      reasoning: string;
    }
  >;

  /** Source classification and analysis */
  sourceAnalysis: SourceAnalysis;

  /** Rules engine results */
  rulesEngineResult: InstructionPayload;

  /** AI assessment results (single or consensus) */
  aiAssessmentResult: AIAssessmentResult | ConsensusResult;

  /** Assessment reasoning and explanation */
  reasoning: string;

  /** Additional assessment notes */
  assessmentNotes: string[];

  /** Processing metadata and timing */
  processingMetadata: ReliabilityProcessingMetadata;

  /** Optional audit trail for debugging / transparency */
  auditTrail?: string[];
}

/**
 * Processing metadata for reliability assessment
 */
export interface ReliabilityProcessingMetadata {
  /** Total processing time in milliseconds */
  totalProcessingTime: number;
  /** Alias for total processing time expected by integration tests */
  totalTime?: number;

  /** Rules engine processing time */
  rulesEngineTime: number;

  /** AI assessment processing time */
  aiAssessmentTime: number;

  /** Validation processing time */
  validationTime: number;

  /** Assessment timestamp */
  assessmentTimestamp: Date;

  /** Version of the algorithm used */
  algorithmVersion: string;

  /** Whether consensus mode was used */
  consensusModeUsed: boolean;

  /** Provider(s) used for AI assessment */
  providersUsed: string[];

  /** Any warnings or issues during assessment */
  warnings?: string[];
}

/**
 * Error types for reliability assessment
 */
export type ReliabilityError =
  | "INVALID_URL"
  | "CONTENT_FETCH_FAILED"
  | "SOURCE_ANALYSIS_FAILED"
  | "RULES_ENGINE_FAILED"
  | "AI_ASSESSMENT_FAILED"
  | "VALIDATION_FAILED"
  | "TIMEOUT_EXCEEDED"
  | "CONFIGURATION_ERROR";

/**
 * Reliability assessment error
 */
export interface ReliabilityAssessmentError extends Error {
  readonly type: ReliabilityError;
  readonly details?: any;
  readonly recoverable: boolean;
}

/**
 * Assessment status for monitoring
 */
export interface AssessmentStatus {
  /** Current phase of assessment */
  phase:
    | "initializing"
    | "source_analysis"
    | "rules_engine"
    | "ai_assessment"
    | "validation"
    | "completed"
    | "failed";

  /** Progress percentage (0-100) */
  progress: number;

  /** Current operation description */
  currentOperation: string;

  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;

  /** Any intermediate results */
  intermediateResults?: Partial<ReliabilityAssessmentResult>;
}

/**
 * Content fetcher interface for external content retrieval
 */
export interface ContentFetcher {
  /** Fetch content from URL */
  fetch(url: string): Promise<{
    content: string;
    metadata?: Partial<SourceMetadata>;
  }>;

  /** Check if URL is supported */
  supports(url: string): boolean;
}

/**
 * Cache interface for reliability assessments
 */
export interface ReliabilityCache {
  /** Get cached assessment result */
  get(key: string): Promise<ReliabilityAssessmentResult | null>;

  /** Set cached assessment result */
  set(key: string, result: ReliabilityAssessmentResult, ttl?: number): Promise<void>;

  /** Check if result is cached */
  has(key: string): Promise<boolean>;

  /** Clear cache */
  clear(): Promise<void>;
}

/**
 * Event listener interface for assessment monitoring
 */
export interface ReliabilityEventListener {
  /** Called when assessment status changes */
  onStatusChange?(status: AssessmentStatus): void;

  /** Called when assessment completes */
  onComplete?(result: ReliabilityAssessmentResult): void;

  /** Called when assessment fails */
  onError?(error: ReliabilityAssessmentError): void;

  /** Called for debug/info logging */
  onLog?(level: "debug" | "info" | "warn" | "error", message: string, data?: any): void;
}
