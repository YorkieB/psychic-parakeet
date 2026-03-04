// Core types for the Rules Engine component
// Based on the rules-governed AI architecture specification

export type SourceType =
  | "academic"
  | "wikipedia"
  | "news"
  | "government"
  | "blog"
  | "commercial"
  | "forum"
  | "unknown";

export type ReliabilityLabel = "unreliable" | "low" | "moderate" | "high";

export type ViolationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SourceMetadata {
  url: string;
  domain: string;
  tld: string;
  title?: string;
  author?: string;
  publishDate?: string;
  hasSSL?: boolean;
  domainAge?: number;
}

export interface SourceAnalysis {
  sourceType: SourceType;
  domain: string;
  tld: string;
  domainAge?: number;
  sslCertificate: boolean;
  blacklistStatus: boolean;
  whitelistStatus: boolean;
  commercialIndicators: string[];
  authoritySignals: string[];
}

export interface DimensionWeight {
  citations: number;
  editStability: number;
  expertReview: number;
  completeness: number;
  controversy: number;
  authorCredentials: number;
  institutionalAffiliation: number;
  politicalBias: number;
  commercialIntent: number;
}

export interface InstructionPayload {
  sourceType: SourceType;
  allowedDimensions: string[];
  prohibitedAssessments: string[];
  dimensionWeights: Partial<DimensionWeight>;
  minScore: number;
  maxScore: number;
  confidenceThreshold: number;
  requireConsensus: boolean;
  temperature: number;
  hardFail: boolean;
  hardFailReason?: string;
  specialNotes?: string[];
}

export interface RuleViolation {
  type: string;
  severity: ViolationSeverity;
  description: string;
  factor?: string;
  expected?: any;
  actual?: any;
  timestamp: Date;
}

export interface RulesEngineResult {
  analysis: SourceAnalysis;
  instructionPayload: InstructionPayload;
  violations: RuleViolation[];
  rulesApplied: string[];
  timestamp: Date;
  success: boolean;
}

export interface DomainRules {
  sourceType: SourceType;
  allowedDimensions: string[];
  prohibitedAssessments: string[];
  defaultWeights: Partial<DimensionWeight>;
  minScore: number;
  maxScore: number;
  confidenceThreshold: number;
  specialHandling?: {
    trustBaseline?: number;
    skipCommercialDetection?: boolean;
    requirePeerReview?: boolean;
    enhancedFactChecking?: boolean;
  };
}

export interface RulesEngineConfig {
  domainRules: Map<string, DomainRules>;
  blacklistedDomains: Set<string>;
  whitelistedDomains: Set<string>;
  defaultRules: DomainRules;
  enableAuditTrail: boolean;
  strictMode: boolean;
}
