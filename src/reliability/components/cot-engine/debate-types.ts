/**
 * Types for Multi-Agent Debate Framework
 * Implements JoT (Judgment of Thought) with Prosecutor/Defense/Judge roles
 */

export type DebateRole = "prosecutor" | "defense" | "judge";

export interface DebateRequest {
  claim: string;
  source?: string;
  context?: string;
  maxRounds?: number;
  temperature?: number;
  useRAGVerification?: boolean;
  useFallacyDetection?: boolean;
  useSelfConsistency?: boolean;
}

export interface DebateArgument {
  role: DebateRole;
  content: string;
  evidence: string[];
  reasoning: string[];
  confidence: number;
  timestamp: number;
  tokensUsed?: number;
}

export interface DebateRound {
  roundNumber: number;
  prosecutorArgument: DebateArgument;
  defenseArgument: DebateArgument;
  judgeEvaluation?: JudgeEvaluation;
  fallaciesDetected?: FallacyDetection[];
  ragVerification?: RAGVerificationResult;
  semanticEntropy?: number;
}

export interface JudgeEvaluation {
  evidenceScore: {
    prosecutor: number; // 0-30
    defense: number; // 0-30
  };
  logicScore: {
    prosecutor: number; // 0-25
    defense: number; // 0-25
  };
  rebuttalScore: {
    prosecutor: number; // 0-20
    defense: number; // 0-20
  };
  humilityScore: {
    prosecutor: number; // 0-15
    defense: number; // 0-15
  };
  consistencyScore: {
    prosecutor: number; // 0-10
    defense: number; // 0-10
  };
  totalScore: {
    prosecutor: number;
    defense: number;
  };
  reasoning: string;
  confidence: number;
}

export interface FallacyDetection {
  type: FallacyType;
  description: string;
  confidence: number; // 0-100%
  location: string; // Which argument/section
  severity: "low" | "medium" | "high" | "critical";
  severityScore: number; // 1-10 research-based severity score
}

export type FallacyType =
  | "gish_gallop"
  | "motivated_reasoning"
  | "false_dichotomy"
  | "cherry_picking"
  | "post_hoc"
  | "appeal_to_emotion"
  | "confirmation_bias"
  | "straw_man"
  | "circular_reasoning"
  | "slippery_slope"
  | "hasty_generalization"
  | "red_herring"
  | "anecdotal_evidence"
  | "false_equivalence"
  | "no_true_scotsman"
  | "loaded_question"
  | "ad_hominem"
  | "appeal_to_authority"
  | "bandwagon"
  | "tu_quoque";

export interface RAGVerificationResult {
  claims: FactualClaim[];
  overallVerification: "confirmed" | "contradicted" | "insufficient_data" | "mixed";
  confidence: number;
  sources: string[];
}

export interface FactualClaim {
  claim: string;
  status: "confirmed" | "contradicted" | "insufficient_data";
  confidence: number;
  sources: string[];
  context?: string;
}

export interface SelfConsistencyResult {
  runs: DebateResult[];
  consensusStrength: number; // 0-1
  majorityVerdict: "prosecutor_wins" | "defense_wins" | "tie";
  confidenceAdjustment: number; // Multiplier for final confidence
}

export interface AdaptiveStoppingDecision {
  shouldStop: boolean;
  reason: "semantic_entropy" | "confidence_plateau" | "max_rounds" | "consensus_reached";
  semanticEntropy?: number;
  confidenceChange?: number;
  roundsCompleted: number;
}

export interface CompositeScore {
  primaryJudgeScore: number;
  selfConsistencyAdjustment: number;
  fallacyPenalty: number;
  ragVerificationBonus: number;
  finalScore: number;
  confidence: number; // Capped at 95% for epistemic humility
  auditTrail: string[];
}

export interface DebateResult {
  request: DebateRequest;
  rounds: DebateRound[];
  winner: "prosecutor" | "defense" | "tie";
  finalScore: CompositeScore;
  stoppingDecision: AdaptiveStoppingDecision;
  selfConsistency?: SelfConsistencyResult;
  processingTime: number;
  totalTokensUsed: number;
  totalCost: number;
  auditTrail: string[];
}

export interface DebateEngineConfig {
  maxRounds: number;
  temperature: number;
  semanticEntropyThreshold: number;
  confidencePlateauThreshold: number;
  fallacyPenaltyMultiplier: number;
  ragVerificationWeight: number;
  selfConsistencyRuns: number;
  maxConfidence: number; // Epistemic humility cap
  costThreshold: number; // Max cost per debate
}

export interface VerificationLayer {
  name: string;
  enabled: boolean;
  weight: number;
  result?: unknown;
}
