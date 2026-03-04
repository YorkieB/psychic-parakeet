import { DomainRulesSets } from "./domain-rules.js";
import { SourceClassifier } from "./source-classifier.js";
import type {
  InstructionPayload,
  RulesEngineConfig,
  RulesEngineResult,
  RuleViolation,
  SourceAnalysis,
  SourceMetadata,
} from "./types.js";

/**
 * Rules Engine - Core Component
 * Mandatory first layer that governs all AI assessments
 * Implements the rules-first architecture from the research specification
 */
export class RulesEngine {
  private readonly classifier: SourceClassifier;
  private readonly config: RulesEngineConfig;
  private auditTrail: string[] = [];

  constructor(config: RulesEngineConfig) {
    this.config = config;
    this.classifier = new SourceClassifier();
  }

  /**
   * Main entry point: Analyze request and generate AI instruction payload
   * This is the mandatory first step for every reliability assessment
   */
  public async processRequest(metadata: SourceMetadata): Promise<RulesEngineResult> {
    this.auditTrail = [];
    const violations: RuleViolation[] = [];

    try {
      // Step 1: Perform source analysis
      const analysis = await this.analyzeSource(metadata);
      this.auditTrail.push(`Source classified as: ${analysis.sourceType}`);

      // Step 2: Check blacklist/whitelist
      this.checkBlacklistWhitelist(analysis, violations);

      // Step 3: Apply domain-specific rules
      const domainRules = DomainRulesSets.getRulesForSourceType(analysis.sourceType);
      this.auditTrail.push(`Applied ${analysis.sourceType} domain rules`);

      // Step 4: Generate instruction payload
      const instructionPayload = this.generateInstructionPayload(analysis, domainRules, violations);

      // Step 5: Validate instruction payload
      this.validateInstructionPayload(instructionPayload, violations);

      return {
        analysis,
        instructionPayload,
        violations,
        rulesApplied: [...this.auditTrail],
        timestamp: new Date(),
        success: violations.filter((v) => v.severity === "CRITICAL").length === 0,
      };
    } catch (error) {
      violations.push({
        type: "processing_error",
        severity: "CRITICAL",
        description: `Rules engine processing failed: ${error}`,
        timestamp: new Date(),
      });

      return {
        analysis: this.getFailsafeAnalysis(metadata),
        instructionPayload: this.getFailsafeInstructions(),
        violations,
        rulesApplied: [...this.auditTrail],
        timestamp: new Date(),
        success: false,
      };
    }
  }

  /**
   * Analyze source using classifier and additional checks
   */
  private async analyzeSource(metadata: SourceMetadata): Promise<SourceAnalysis> {
    // Basic classification
    const analysis = this.classifier.analyzeSource(metadata);

    // Enhanced domain age and SSL checks
    analysis.domainAge = metadata.domainAge;
    analysis.sslCertificate = metadata.hasSSL ?? false;

    // Apply blacklist/whitelist status
    analysis.blacklistStatus = this.config.blacklistedDomains.has(metadata.domain);
    analysis.whitelistStatus = this.config.whitelistedDomains.has(metadata.domain);

    if (analysis.blacklistStatus) {
      this.auditTrail.push(`Domain ${metadata.domain} found in blacklist`);
    }

    if (analysis.whitelistStatus) {
      this.auditTrail.push(`WHITELIST: Domain ${metadata.domain} found in whitelist`);
    }

    return analysis;
  }

  /**
   * Check blacklist and whitelist status, add violations if needed
   */
  private checkBlacklistWhitelist(analysis: SourceAnalysis, violations: RuleViolation[]): void {
    if (analysis.blacklistStatus) {
      violations.push({
        type: "blacklisted_domain",
        severity: "CRITICAL",
        description: `Domain ${analysis.domain} is blacklisted`,
        timestamp: new Date(),
      });
    }

    if (analysis.whitelistStatus) {
      this.auditTrail.push(`Whitelist boost applied for ${analysis.domain}`);
    }
  }

  /**
   * Generate AI instruction payload based on rules and analysis
   */
  private generateInstructionPayload(
    analysis: SourceAnalysis,
    domainRules: any,
    violations: RuleViolation[],
  ): InstructionPayload {
    // Check for hard fail conditions
    const hardFail = this.checkHardFailConditions(analysis, violations);

    const payload: InstructionPayload = {
      sourceType: analysis.sourceType,
      allowedDimensions: [...domainRules.allowedDimensions],
      prohibitedAssessments: [...domainRules.prohibitedAssessments],
      dimensionWeights: { ...domainRules.defaultWeights },
      minScore: domainRules.minScore,
      maxScore: domainRules.maxScore,
      confidenceThreshold: domainRules.confidenceThreshold,
      requireConsensus: analysis.sourceType === "academic", // Academic requires consensus
      temperature: this.calculateTemperature(analysis),
      hardFail,
      hardFailReason: hardFail ? this.getHardFailReason(violations) : undefined,
      specialNotes: this.generateSpecialNotes(analysis, domainRules),
    };

    this.auditTrail.push(
      `Generated instruction payload for ${analysis.sourceType}`,
      `Allowed dimensions: ${payload.allowedDimensions.join(", ")}`,
      `Prohibited assessments: ${payload.prohibitedAssessments.join(", ")}`,
    );

    return payload;
  }

  /**
   * Check for conditions that should cause hard fail (skip AI entirely)
   */
  private checkHardFailConditions(analysis: SourceAnalysis, violations: RuleViolation[]): boolean {
    // Blacklisted domains cause hard fail
    if (analysis.blacklistStatus) {
      return true;
    }

    // Critical violations cause hard fail
    const criticalViolations = violations.filter((v) => v.severity === "CRITICAL");
    if (criticalViolations.length > 0) {
      return true;
    }

    // No SSL for sensitive domains
    if (!analysis.sslCertificate && ["government", "academic"].includes(analysis.sourceType)) {
      violations.push({
        type: "missing_ssl_sensitive_domain",
        severity: "HIGH",
        description: "Sensitive domain lacks SSL certificate",
        timestamp: new Date(),
      });
    }

    return false;
  }

  /**
   * Calculate AI temperature based on source characteristics
   */
  private calculateTemperature(analysis: SourceAnalysis): number {
    // Conservative defaults based on source type
    switch (analysis.sourceType) {
      case "academic":
      case "government":
        return 0.1; // Very conservative for authoritative sources
      case "wikipedia":
        return 0.3; // Slightly higher for collaborative content
      case "news":
        return 0.2; // Standard for news
      case "blog":
      case "forum":
        return 0.4; // Higher for informal content
      case "commercial":
        return 0.1; // Conservative for biased sources
      default:
        return 0.3; // Moderate for unknown
    }
  }

  /**
   * Generate special handling notes for the AI
   */
  private generateSpecialNotes(analysis: SourceAnalysis, domainRules: any): string[] {
    const notes: string[] = [];

    if (analysis.whitelistStatus) {
      notes.push("WHITELIST_BOOST: This domain is pre-approved for higher reliability");
    }

    if (analysis.commercialIndicators.length > 0) {
      notes.push(
        `COMMERCIAL_DETECTED: Found indicators: ${analysis.commercialIndicators.join(", ")}`,
      );
    }

    if (analysis.authoritySignals.length > 0) {
      notes.push(`AUTHORITY_SIGNALS: Found signals: ${analysis.authoritySignals.join(", ")}`);
    }

    if (domainRules.specialHandling?.trustBaseline) {
      notes.push(`TRUST_BASELINE: Minimum score ${domainRules.specialHandling.trustBaseline}`);
    }

    if (domainRules.specialHandling?.requirePeerReview) {
      notes.push("REQUIRE_PEER_REVIEW: Must verify peer-review status");
    }

    return notes;
  }

  /**
   * Validate the generated instruction payload
   */
  private validateInstructionPayload(
    payload: InstructionPayload,
    violations: RuleViolation[],
  ): void {
    // Check weight sum doesn't exceed 1.0
    const weightSum = Object.values(payload.dimensionWeights).reduce(
      (sum, weight) => sum + (weight || 0),
      0,
    );
    if (weightSum > 1.1) {
      // Allow small tolerance
      violations.push({
        type: "weight_sum_exceeded",
        severity: "MEDIUM",
        description: `Dimension weights sum to ${weightSum}, exceeds 1.0`,
        expected: "≤ 1.0",
        actual: weightSum,
        timestamp: new Date(),
      });
    }

    // Validate score boundaries
    if (payload.minScore < 0 || payload.maxScore > 1 || payload.minScore >= payload.maxScore) {
      violations.push({
        type: "invalid_score_boundaries",
        severity: "HIGH",
        description: "Invalid min/max score boundaries",
        expected: "0 ≤ minScore < maxScore ≤ 1",
        actual: `min: ${payload.minScore}, max: ${payload.maxScore}`,
        timestamp: new Date(),
      });
    }

    this.auditTrail.push("Instruction payload validation completed");
  }

  /**
   * Get hard fail reason from violations
   */
  private getHardFailReason(violations: RuleViolation[]): string {
    const criticalViolations = violations.filter((v) => v.severity === "CRITICAL");
    if (criticalViolations.length > 0) {
      return criticalViolations.map((v) => v.description).join("; ");
    }
    return "Unknown hard fail condition";
  }

  /**
   * Generate failsafe analysis when processing fails
   */
  private getFailsafeAnalysis(metadata: SourceMetadata): SourceAnalysis {
    return {
      sourceType: "unknown",
      domain: metadata.domain,
      tld: metadata.tld,
      sslCertificate: false,
      blacklistStatus: false,
      whitelistStatus: false,
      commercialIndicators: [],
      authoritySignals: [],
    };
  }

  /**
   * Generate failsafe instructions when processing fails
   */
  private getFailsafeInstructions(): InstructionPayload {
    const defaultRules = DomainRulesSets.getRulesForSourceType("unknown");
    return {
      sourceType: "unknown",
      allowedDimensions: defaultRules.allowedDimensions,
      prohibitedAssessments: defaultRules.prohibitedAssessments,
      dimensionWeights: defaultRules.defaultWeights,
      minScore: 0,
      maxScore: 0.3, // Very conservative for failed processing
      confidenceThreshold: 0.4,
      requireConsensus: false,
      temperature: 0.5,
      hardFail: true,
      hardFailReason: "Rules engine processing failed",
    };
  }
}
