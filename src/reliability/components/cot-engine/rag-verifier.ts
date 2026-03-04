/**
 * RAG (Retrieval-Augmented Generation) Verifier
 * External knowledge verification for factual claims in debate arguments
 */

import type { DebateArgument, FactualClaim, RAGVerificationResult } from "./debate-types.js";
import type { KnowledgeSources } from "./knowledge-sources.js";

interface ClaimExtractionConfig {
  minClaimLength: number;
  maxClaims: number;
  confidenceThreshold: number;
}

interface VerificationConfig {
  sourceTimeout: number;
  maxSources: number;
  requireMultipleConfirmation: boolean;
  trustScoreThreshold: number;
}

export class RAGVerifier {
  private readonly knowledgeSources: KnowledgeSources;
  private readonly extractionConfig: ClaimExtractionConfig;
  private readonly verificationConfig: VerificationConfig;

  constructor(
    knowledgeSources: KnowledgeSources,
    extractionConfig?: Partial<ClaimExtractionConfig>,
    verificationConfig?: Partial<VerificationConfig>,
  ) {
    this.knowledgeSources = knowledgeSources;
    this.extractionConfig = {
      minClaimLength: 10,
      maxClaims: 10,
      confidenceThreshold: 0.6,
      ...extractionConfig,
    };
    this.verificationConfig = {
      sourceTimeout: 5000,
      maxSources: 5,
      requireMultipleConfirmation: true,
      trustScoreThreshold: 0.7,
      ...verificationConfig,
    };
  }

  /**
   * Verify factual claims in debate arguments
   */
  public async verifyFactualClaims(
    debateArguments: DebateArgument[],
  ): Promise<RAGVerificationResult> {
    const allClaims: FactualClaim[] = [];
    const sources: string[] = [];

    // Extract claims from all arguments
    for (const argument of debateArguments) {
      const extractedClaims = await this.extractFactualClaims(argument);
      allClaims.push(...extractedClaims);
    }

    // Verify each claim against external sources
    const verifiedClaims: FactualClaim[] = [];
    for (const claim of allClaims) {
      const verifiedClaim = await this.verifyIndividualClaim(claim);
      verifiedClaims.push(verifiedClaim);

      // Collect unique sources
      verifiedClaim.sources.forEach((source) => {
        if (!sources.includes(source)) {
          sources.push(source);
        }
      });
    }

    // Calculate overall verification result
    const overallResult = this.calculateOverallVerification(verifiedClaims);
    const confidence = this.calculateVerificationConfidence(verifiedClaims);

    return {
      claims: verifiedClaims,
      overallVerification: overallResult,
      confidence,
      sources,
    };
  }

  /**
   * Extract factual claims from a debate argument
   */
  private async extractFactualClaims(argument: DebateArgument): Promise<FactualClaim[]> {
    const content = argument.content;
    const claims: FactualClaim[] = [];

    // Pattern-based claim extraction
    const factualPatterns = [
      // Statistical claims
      /(\d+(?:\.\d+)?%\s+of\s+[^.!?]+)/gi,
      /((?:studies?|research|data)\s+shows?\s+(?:that\s+)?[^.!?]+)/gi,
      // Historical claims
      /(in\s+\d{4},?\s+[^.!?]+)/gi,
      /((?:according\s+to|based\s+on)\s+[^,]+,\s*[^.!?]+)/gi,
      // Scientific claims
      /((?:scientists?|researchers?)\s+(?:found|discovered|concluded)\s+(?:that\s+)?[^.!?]+)/gi,
      // Causal claims
      /((?:[a-z\s]+)\s+causes?\s+[^.!?]+)/gi,
      // Comparative claims
      /((?:more|less|higher|lower|better|worse)\s+than\s+[^.!?]+)/gi,
    ];

    // Extract claims using patterns
    for (const pattern of factualPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match.length >= this.extractionConfig.minClaimLength) {
            claims.push({
              claim: match.trim(),
              status: "insufficient_data", // Will be updated during verification
              confidence: 0.5,
              sources: [],
              context: `From ${argument.role} argument`,
            });
          }
        }
      }
    }

    // Additional extraction for specific claim types
    const evidenceClaims = this.extractEvidenceClaims(content);
    const expertClaims = this.extractExpertClaims(content);

    claims.push(...evidenceClaims, ...expertClaims);

    // Limit number of claims to prevent overwhelming verification
    return claims.slice(0, this.extractionConfig.maxClaims);
  }

  /**
   * Extract evidence-based claims
   */
  private extractEvidenceClaims(content: string): FactualClaim[] {
    const claims: FactualClaim[] = [];
    const evidencePatterns = [
      /evidence\s+shows\s+(?:that\s+)?([^.!?]+)/gi,
      /research\s+indicates\s+(?:that\s+)?([^.!?]+)/gi,
      /data\s+suggests\s+(?:that\s+)?([^.!?]+)/gi,
      /analysis\s+reveals\s+(?:that\s+)?([^.!?]+)/gi,
    ];

    for (const pattern of evidencePatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && match[1].length >= this.extractionConfig.minClaimLength) {
          claims.push({
            claim: match[1].trim(),
            status: "insufficient_data",
            confidence: 0.6, // Higher initial confidence for evidence claims
            sources: [],
            context: "Evidence-based claim",
          });
        }
      }
    }

    return claims;
  }

  /**
   * Extract expert/authority claims
   */
  private extractExpertClaims(content: string): FactualClaim[] {
    const claims: FactualClaim[] = [];
    const expertPatterns = [
      /((?:dr\.?|professor|expert)\s+\w+\s+(?:states?|claims?|argues?|says?)\s+(?:that\s+)?[^.!?]+)/gi,
      /(according\s+to\s+(?:dr\.?|professor|expert)\s+\w+,\s*[^.!?]+)/gi,
      /((?:leading|renowned|top)\s+(?:scientist|researcher|expert)s?\s+[^.!?]+)/gi,
    ];

    for (const pattern of expertPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match.length >= this.extractionConfig.minClaimLength) {
            claims.push({
              claim: match.trim(),
              status: "insufficient_data",
              confidence: 0.4, // Lower confidence for unverified expert claims
              sources: [],
              context: "Expert authority claim",
            });
          }
        }
      }
    }

    return claims;
  }

  /**
   * Verify an individual claim against external sources
   */
  private async verifyIndividualClaim(claim: FactualClaim): Promise<FactualClaim> {
    try {
      // Query multiple knowledge sources in parallel
      const verificationPromises = [
        this.knowledgeSources.queryPubMed(claim.claim),
        this.knowledgeSources.queryWikipedia(claim.claim),
        this.knowledgeSources.queryGovernmentData(claim.claim),
        this.knowledgeSources.queryFactCheckSites(claim.claim),
      ];

      const results = await Promise.allSettled(
        verificationPromises.map((p) =>
          Promise.race([
            p,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), this.verificationConfig.sourceTimeout),
            ),
          ]),
        ),
      );

      // Process verification results
      const verificationResults: Array<{
        source: string;
        status: "confirmed" | "contradicted" | "insufficient_data";
        confidence: number;
        evidence?: string;
      }> = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          verificationResults.push(result.value as any);
        }
      });

      // Determine final status based on multiple sources
      const finalStatus = this.determineClaimStatus(verificationResults);
      const finalConfidence = this.calculateClaimConfidence(verificationResults);
      const sources = verificationResults.map((r) => r.source).filter(Boolean);

      return {
        ...claim,
        status: finalStatus,
        confidence: finalConfidence,
        sources: sources.slice(0, this.verificationConfig.maxSources),
      };
    } catch (_error) {
      // Return original claim with insufficient data status on error
      return {
        ...claim,
        status: "insufficient_data",
        confidence: 0.1,
        sources: [],
      };
    }
  }

  /**
   * Determine final status from multiple verification results
   */
  private determineClaimStatus(
    results: Array<{
      source: string;
      status: "confirmed" | "contradicted" | "insufficient_data";
      confidence: number;
    }>,
  ): "confirmed" | "contradicted" | "insufficient_data" {
    if (results.length === 0) return "insufficient_data";

    const confirmed = results.filter((r) => r.status === "confirmed");
    const contradicted = results.filter((r) => r.status === "contradicted");
    const _insufficient = results.filter((r) => r.status === "insufficient_data");

    // High-confidence contradiction from trusted source
    const highConfidenceContradiction = contradicted.find((r) => r.confidence > 0.8);
    if (highConfidenceContradiction) {
      return "contradicted";
    }

    // Multiple confirmations required for positive verification
    if (this.verificationConfig.requireMultipleConfirmation) {
      if (confirmed.length >= 2 && confirmed.length > contradicted.length) {
        return "confirmed";
      }
    } else {
      if (confirmed.length > contradicted.length && confirmed.length > 0) {
        return "confirmed";
      }
    }

    // More contradictions than confirmations
    if (contradicted.length > confirmed.length && contradicted.length > 0) {
      return "contradicted";
    }

    // Default to insufficient data
    return "insufficient_data";
  }

  /**
   * Calculate confidence for verified claim
   */
  private calculateClaimConfidence(
    results: Array<{
      source: string;
      status: "confirmed" | "contradicted" | "insufficient_data";
      confidence: number;
    }>,
  ): number {
    if (results.length === 0) return 0.1;

    const relevant = results.filter((r) => r.status !== "insufficient_data");
    if (relevant.length === 0) return 0.3;

    // Weighted average based on source reliability
    const totalWeight = relevant.reduce((sum, r) => sum + r.confidence, 0);
    const weightedConfidence = relevant.reduce((sum, r) => sum + r.confidence * r.confidence, 0);

    const baseConfidence = weightedConfidence / totalWeight;

    // Boost confidence for multiple agreeing sources
    const consensusBonus = Math.min(0.2, (relevant.length - 1) * 0.05);

    return Math.min(0.95, baseConfidence + consensusBonus);
  }

  /**
   * Calculate overall verification result
   */
  private calculateOverallVerification(
    claims: FactualClaim[],
  ): "confirmed" | "contradicted" | "insufficient_data" | "mixed" {
    if (claims.length === 0) return "insufficient_data";

    const confirmed = claims.filter((c) => c.status === "confirmed").length;
    const contradicted = claims.filter((c) => c.status === "contradicted").length;
    const insufficient = claims.filter((c) => c.status === "insufficient_data").length;

    // If any critical claims are contradicted
    if (contradicted > 0) {
      if (confirmed > 0) return "mixed";
      return "contradicted";
    }

    // If majority confirmed
    if (confirmed > insufficient && confirmed > 0) {
      return "confirmed";
    }

    // If mixed results
    if (confirmed > 0 && insufficient > 0) {
      return "mixed";
    }

    return "insufficient_data";
  }

  /**
   * Calculate overall verification confidence
   */
  private calculateVerificationConfidence(claims: FactualClaim[]): number {
    if (claims.length === 0) return 0.1;

    const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;

    // Penalize for insufficient data
    const insufficientRatio =
      claims.filter((c) => c.status === "insufficient_data").length / claims.length;
    const penalty = insufficientRatio * 0.3;

    return Math.max(0.1, avgConfidence - penalty);
  }

  /**
   * Generate RAG verification report
   */
  public generateVerificationReport(result: RAGVerificationResult): string[] {
    const report: string[] = [];

    report.push(`[RAG_VERIFICATION] Analyzed ${result.claims.length} factual claims`);
    report.push(`[OVERALL_STATUS] ${result.overallVerification.toUpperCase()}`);
    report.push(`[CONFIDENCE] ${(result.confidence * 100).toFixed(1)}%`);

    // Status breakdown
    const statusCounts = {
      confirmed: result.claims.filter((c) => c.status === "confirmed").length,
      contradicted: result.claims.filter((c) => c.status === "contradicted").length,
      insufficient_data: result.claims.filter((c) => c.status === "insufficient_data").length,
    };

    report.push(
      `[BREAKDOWN] Confirmed: ${statusCounts.confirmed}, Contradicted: ${statusCounts.contradicted}, Insufficient: ${statusCounts.insufficient_data}`,
    );

    // High-confidence contradictions (critical for debate scoring)
    const criticalContradictions = result.claims.filter(
      (c) => c.status === "contradicted" && c.confidence > 0.8,
    );

    if (criticalContradictions.length > 0) {
      report.push(
        `[CRITICAL] ${criticalContradictions.length} high-confidence contradictions found`,
      );
      criticalContradictions.forEach((claim) => {
        report.push(
          `[CONTRADICTION] "${claim.claim.substring(0, 100)}..." (${(claim.confidence * 100).toFixed(1)}%)`,
        );
      });
    }

    // Strong confirmations
    const strongConfirmations = result.claims.filter(
      (c) => c.status === "confirmed" && c.confidence > 0.8,
    );

    if (strongConfirmations.length > 0) {
      report.push(`[CONFIRMATIONS] ${strongConfirmations.length} well-supported claims verified`);
    }

    // Sources used
    if (result.sources.length > 0) {
      report.push(`[SOURCES] ${result.sources.length} external sources consulted`);
      report.push(
        `[SOURCE_LIST] ${result.sources.slice(0, 5).join(", ")}${result.sources.length > 5 ? "..." : ""}`,
      );
    }

    return report;
  }

  /**
   * Calculate scoring impact for composite scorer
   */
  public calculateScoringImpact(result: RAGVerificationResult): {
    bonus: number;
    penalty: number;
    netImpact: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let bonus = 0;
    let penalty = 0;

    // Strong confirmations boost score
    const strongConfirmations = result.claims.filter(
      (c) => c.status === "confirmed" && c.confidence > 0.7,
    ).length;

    if (strongConfirmations > 0) {
      bonus = Math.min(0.15, strongConfirmations * 0.03);
      reasoning.push(`+${(bonus * 100).toFixed(1)}% for ${strongConfirmations} verified claims`);
    }

    // Contradictions penalize score heavily
    const contradictions = result.claims.filter((c) => c.status === "contradicted");
    if (contradictions.length > 0) {
      penalty = Math.min(0.3, contradictions.length * 0.1);
      reasoning.push(
        `-${(penalty * 100).toFixed(1)}% for ${contradictions.length} contradicted claims`,
      );
    }

    // High-confidence contradictions are especially damaging
    const criticalContradictions = contradictions.filter((c) => c.confidence > 0.8);
    if (criticalContradictions.length > 0) {
      const additionalPenalty = criticalContradictions.length * 0.05;
      penalty += additionalPenalty;
      reasoning.push(
        `-${(additionalPenalty * 100).toFixed(1)}% additional penalty for high-confidence contradictions`,
      );
    }

    const netImpact = bonus - penalty;

    return {
      bonus,
      penalty,
      netImpact,
      reasoning,
    };
  }

  /**
   * Get verification statistics for analysis
   */
  public getVerificationStatistics(result: RAGVerificationResult): {
    totalClaims: number;
    verificationRate: number;
    averageConfidence: number;
    sourcesCovered: number;
    reliabilityScore: number;
  } {
    const totalClaims = result.claims.length;
    const verifiedClaims = result.claims.filter((c) => c.status !== "insufficient_data").length;
    const verificationRate = totalClaims > 0 ? verifiedClaims / totalClaims : 0;

    const averageConfidence =
      totalClaims > 0 ? result.claims.reduce((sum, c) => sum + c.confidence, 0) / totalClaims : 0;

    const sourcesCovered = result.sources.length;

    // Overall reliability score combines verification rate and confidence
    const reliabilityScore = verificationRate * 0.6 + averageConfidence * 0.4;

    return {
      totalClaims,
      verificationRate,
      averageConfidence,
      sourcesCovered,
      reliabilityScore,
    };
  }
}
