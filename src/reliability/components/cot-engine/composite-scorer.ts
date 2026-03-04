/**
 * Composite Scorer for Multi-Agent Debate
 * Implements 4-step scoring: Judge → Self-Consistency → Fallacy → RAG
 */

import type {
  CompositeScore,
  DebateEngineConfig,
  DebateRequest,
  DebateRound,
  RAGVerificationResult,
} from "./debate-types.js";

interface ScoringWeights {
  judgeWeight: number;
  selfConsistencyWeight: number;
  fallacyWeight: number;
  ragWeight: number;
}

export class CompositeScorer {
  private readonly config: DebateEngineConfig;
  private readonly weights: ScoringWeights;
  private readonly maxConfidence: number;

  constructor(config: DebateEngineConfig) {
    this.config = config;
    this.maxConfidence = config.maxConfidence || 0.95; // Epistemic humility cap

    // Default scoring weights (can be configured)
    this.weights = {
      judgeWeight: 0.5, // Primary judge scores carry most weight
      selfConsistencyWeight: 0.2, // Consensus adjustment
      fallacyWeight: 0.2, // Logical integrity penalty
      ragWeight: 0.1, // External verification bonus/penalty
    };
  }

  /**
   * Calculate final composite score from all verification layers
   */
  public async calculateFinalScore(
    request: DebateRequest,
    rounds: DebateRound[],
    auditTrail: string[],
  ): Promise<CompositeScore> {
    auditTrail.push("[COMPOSITE_SCORING] Beginning 4-step scoring process");

    // Step 1: Calculate primary judge scores
    const primaryScore = this.calculatePrimaryJudgeScore(rounds, auditTrail);

    // Step 2: Self-consistency adjustment
    const selfConsistencyAdjustment = this.calculateSelfConsistencyAdjustment(
      rounds,
      request,
      auditTrail,
    );

    // Step 3: Fallacy detection penalties
    const fallacyPenalty = this.calculateFallacyPenalty(rounds, auditTrail);

    // Step 4: RAG verification bonus/penalty
    const ragBonus = this.calculateRAGBonus(rounds, auditTrail);

    // Combine all scores
    const finalScore = this.combineScores(
      primaryScore,
      selfConsistencyAdjustment,
      fallacyPenalty,
      ragBonus,
      auditTrail,
    );

    // Calculate final confidence with epistemic humility
    const confidence = this.calculateFinalConfidence(
      rounds,
      selfConsistencyAdjustment,
      fallacyPenalty,
      ragBonus,
      auditTrail,
    );

    const compositeScore: CompositeScore = {
      primaryJudgeScore: primaryScore,
      selfConsistencyAdjustment,
      fallacyPenalty,
      ragVerificationBonus: ragBonus,
      finalScore,
      confidence: Math.min(confidence, this.maxConfidence),
      auditTrail: [...auditTrail],
    };

    auditTrail.push(
      `[FINAL_SCORE] ${finalScore.toFixed(4)} (confidence: ${(confidence * 100).toFixed(1)}%)`,
    );

    return compositeScore;
  }

  /**
   * Step 1: Calculate primary judge scores across all rounds
   */
  private calculatePrimaryJudgeScore(rounds: DebateRound[], auditTrail: string[]): number {
    if (rounds.length === 0) {
      auditTrail.push("[JUDGE_SCORE] No rounds available - default 0.5");
      return 0.5;
    }

    let totalProsecutorPoints = 0;
    let totalDefensePoints = 0;
    let validRounds = 0;

    for (const round of rounds) {
      if (round.judgeEvaluation) {
        totalProsecutorPoints += round.judgeEvaluation.totalScore.prosecutor;
        totalDefensePoints += round.judgeEvaluation.totalScore.defense;
        validRounds++;

        auditTrail.push(
          `[JUDGE_ROUND_${round.roundNumber}] P:${round.judgeEvaluation.totalScore.prosecutor} D:${round.judgeEvaluation.totalScore.defense}`,
        );
      }
    }

    if (validRounds === 0) {
      auditTrail.push("[JUDGE_SCORE] No valid judge evaluations - default 0.5");
      return 0.5;
    }

    // Average scores across rounds
    const avgProsecutor = totalProsecutorPoints / validRounds;
    const avgDefense = totalDefensePoints / validRounds;

    // Convert to 0-1 scale (judge scores are 0-100 each)
    const _totalPossible = 200; // Max 100 points each side
    const _prosecutorRatio = avgProsecutor / 100;
    const _defenseRatio = avgDefense / 100;

    // Calculate relative performance (0.0 = prosecutor wins completely, 1.0 = defense wins completely)
    const totalScore = avgProsecutor + avgDefense;
    let primaryScore: number;

    if (totalScore === 0) {
      primaryScore = 0.5; // Neutral if no scores
    } else {
      primaryScore = avgDefense / (avgProsecutor + avgDefense);
    }

    auditTrail.push(
      `[JUDGE_SCORE] Avg P:${avgProsecutor.toFixed(1)} D:${avgDefense.toFixed(1)} → Score:${primaryScore.toFixed(4)}`,
    );

    return primaryScore;
  }

  /**
   * Step 2: Calculate self-consistency adjustment
   */
  private calculateSelfConsistencyAdjustment(
    rounds: DebateRound[],
    request: DebateRequest,
    auditTrail: string[],
  ): number {
    // Check if self-consistency was used
    if (!request.useSelfConsistency) {
      auditTrail.push("[SELF_CONSISTENCY] Not used - no adjustment");
      return 0;
    }

    // In actual implementation, this would come from SelfConsistencyResult
    // For now, simulate based on round consistency
    const consistency = this.calculateRoundConsistency(rounds);

    let adjustment: number;
    if (consistency > 0.8) {
      adjustment = 0.1; // Strong consensus boosts confidence
      auditTrail.push(
        `[SELF_CONSISTENCY] High consistency (${(consistency * 100).toFixed(1)}%) → +${adjustment}`,
      );
    } else if (consistency > 0.6) {
      adjustment = 0.05; // Moderate consensus
      auditTrail.push(
        `[SELF_CONSISTENCY] Moderate consistency (${(consistency * 100).toFixed(1)}%) → +${adjustment}`,
      );
    } else if (consistency < 0.4) {
      adjustment = -0.1; // Low consistency reduces confidence
      auditTrail.push(
        `[SELF_CONSISTENCY] Low consistency (${(consistency * 100).toFixed(1)}%) → ${adjustment}`,
      );
    } else {
      adjustment = 0; // Neutral
      auditTrail.push(
        `[SELF_CONSISTENCY] Neutral consistency (${(consistency * 100).toFixed(1)}%) → ${adjustment}`,
      );
    }

    return adjustment;
  }

  /**
   * Calculate consistency across rounds
   */
  private calculateRoundConsistency(rounds: DebateRound[]): number {
    if (rounds.length < 2) return 1.0;

    const scores: number[] = [];
    for (const round of rounds) {
      if (round.judgeEvaluation) {
        const roundScore =
          round.judgeEvaluation.totalScore.defense /
          (round.judgeEvaluation.totalScore.prosecutor + round.judgeEvaluation.totalScore.defense);
        scores.push(roundScore);
      }
    }

    if (scores.length < 2) return 1.0;

    // Calculate standard deviation
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (lower std dev = higher consistency)
    return Math.max(0, 1 - stdDev * 2);
  }

  /**
   * Step 3: Calculate fallacy detection penalty (enhanced with research-based severity scoring)
   */
  private calculateFallacyPenalty(rounds: DebateRound[], auditTrail: string[]): number {
    let totalPenalty = 0;
    let totalFallacies = 0;
    let criticalFallacies = 0;
    let highSeverityFallacies = 0;

    for (const round of rounds) {
      if (round.fallaciesDetected && round.fallaciesDetected.length > 0) {
        for (const fallacy of round.fallaciesDetected) {
          // Use research-based severity score (1-10) if available, fallback to categorical
          const severityMultiplier = fallacy.severityScore
            ? this.getResearchBasedSeverityMultiplier(fallacy.severityScore)
            : this.getFallacySeverityMultiplier(fallacy.severity);

          const penalty =
            fallacy.confidence * severityMultiplier * this.config.fallacyPenaltyMultiplier;
          totalPenalty += penalty;
          totalFallacies++;

          // Track critical fallacies for special handling
          if (fallacy.severityScore && fallacy.severityScore >= 9) {
            criticalFallacies++;
          } else if (fallacy.severityScore && fallacy.severityScore >= 8) {
            highSeverityFallacies++;
          } else if (fallacy.severity === "critical") {
            criticalFallacies++;
          }

          auditTrail.push(
            `[FALLACY_PENALTY] ${fallacy.type} (severity: ${fallacy.severityScore || fallacy.severity}) → -${penalty.toFixed(3)}`,
          );
        }
      }
    }

    if (totalFallacies === 0) {
      auditTrail.push("[FALLACY_PENALTY] No fallacies detected → 0");
      return 0;
    }

    // Critical fallacy escalation (Gish Gallop, etc.)
    if (criticalFallacies > 0) {
      totalPenalty *= 1.5; // 50% penalty increase for critical fallacies
      auditTrail.push(
        `[CRITICAL_FALLACY_ESCALATION] ${criticalFallacies} critical fallacies detected → 1.5x penalty multiplier`,
      );
    }

    // High-severity fallacy clustering penalty
    if (highSeverityFallacies >= 3) {
      totalPenalty *= 1.2; // 20% penalty increase for multiple high-severity fallacies
      auditTrail.push(
        `[FALLACY_CLUSTERING] ${highSeverityFallacies} high-severity fallacies → 1.2x penalty multiplier`,
      );
    }

    // Diminishing returns for multiple fallacies
    const adjustedPenalty = totalPenalty * (1 - Math.exp(-totalFallacies / 5));
    auditTrail.push(
      `[FALLACY_PENALTY] Total: ${totalFallacies} fallacies (${criticalFallacies} critical, ${highSeverityFallacies} high) → -${adjustedPenalty.toFixed(3)}`,
    );

    return -Math.min(0.4, adjustedPenalty); // Increased cap to 40% for research-based severity
  }

  /**
   * Get severity multiplier for fallacies (categorical)
   */
  private getFallacySeverityMultiplier(severity: "low" | "medium" | "high" | "critical"): number {
    switch (severity) {
      case "critical":
        return 1.0;
      case "high":
        return 0.7;
      case "medium":
        return 0.4;
      case "low":
        return 0.2;
      default:
        return 0.4;
    }
  }

  /**
   * Get research-based severity multiplier (1-10 scale from Professor of Logic analysis)
   */
  private getResearchBasedSeverityMultiplier(severityScore: number): number {
    // Convert 1-10 research severity score to penalty multiplier
    // Higher severity = higher penalty multiplier
    if (severityScore >= 9) {
      return 1.2; // Critical (Gish Gallop) - highest penalty
    } else if (severityScore >= 8) {
      return 1.0; // High severity (Motivated Reasoning, False Dichotomy, etc.)
    } else if (severityScore >= 7) {
      return 0.7; // Medium-high (Straw Man, Circular Reasoning, etc.)
    } else if (severityScore >= 6) {
      return 0.5; // Medium-low (Ad Hominem, Appeal to Authority, etc.)
    } else {
      return 0.3; // Low severity (< 6)
    }
  }

  /**
   * Step 4: Calculate RAG verification bonus/penalty
   */
  private calculateRAGBonus(rounds: DebateRound[], auditTrail: string[]): number {
    let totalBonus = 0;
    let ragRoundsCount = 0;

    for (const round of rounds) {
      if (round.ragVerification) {
        ragRoundsCount++;
        const ragImpact = this.calculateRAGImpact(round.ragVerification);
        totalBonus += ragImpact;

        auditTrail.push(
          `[RAG_ROUND_${round.roundNumber}] ${round.ragVerification.overallVerification} → ${ragImpact > 0 ? "+" : ""}${ragImpact.toFixed(3)}`,
        );
      }
    }

    if (ragRoundsCount === 0) {
      auditTrail.push("[RAG_BONUS] RAG not used → 0");
      return 0;
    }

    const avgBonus = totalBonus / ragRoundsCount;
    auditTrail.push(
      `[RAG_BONUS] Average across ${ragRoundsCount} rounds → ${avgBonus > 0 ? "+" : ""}${avgBonus.toFixed(3)}`,
    );

    return avgBonus;
  }

  /**
   * Calculate RAG impact from verification result
   */
  private calculateRAGImpact(ragResult: RAGVerificationResult): number {
    const confirmedClaims = ragResult.claims.filter((c) => c.status === "confirmed");
    const contradictedClaims = ragResult.claims.filter((c) => c.status === "contradicted");

    let impact = 0;

    // Bonus for confirmed claims
    for (const claim of confirmedClaims) {
      impact += claim.confidence * 0.02; // Up to 2% bonus per confirmed claim
    }

    // Penalty for contradicted claims (more severe)
    for (const claim of contradictedClaims) {
      impact -= claim.confidence * 0.05; // Up to 5% penalty per contradicted claim
    }

    // Additional penalty for high-confidence contradictions
    const criticalContradictions = contradictedClaims.filter((c) => c.confidence > 0.8);
    for (const _claim of criticalContradictions) {
      impact -= 0.03; // Additional 3% penalty for high-confidence contradictions
    }

    return Math.max(-0.2, Math.min(0.1, impact)); // Cap between -20% and +10%
  }

  /**
   * Combine all scores into final result
   */
  private combineScores(
    primaryScore: number,
    selfConsistencyAdjustment: number,
    fallacyPenalty: number,
    ragBonus: number,
    auditTrail: string[],
  ): number {
    // Apply adjustments to primary score
    let finalScore = primaryScore;

    // Apply self-consistency adjustment (multiplicative for confidence)
    const consistencyMultiplier = 1 + selfConsistencyAdjustment;
    finalScore = this.adjustScore(finalScore, consistencyMultiplier, "multiply");

    // Apply fallacy penalty (subtractive)
    finalScore = this.adjustScore(finalScore, fallacyPenalty, "add");

    // Apply RAG bonus/penalty (additive)
    finalScore = this.adjustScore(finalScore, ragBonus, "add");

    // Ensure final score is within bounds
    finalScore = Math.max(0.0, Math.min(1.0, finalScore));

    auditTrail.push(`[SCORE_COMBINATION] ${primaryScore.toFixed(4)} → ${finalScore.toFixed(4)}`);
    auditTrail.push(
      `[ADJUSTMENTS] Self-consistency: ${selfConsistencyAdjustment > 0 ? "+" : ""}${selfConsistencyAdjustment.toFixed(3)}`,
    );
    auditTrail.push(`[ADJUSTMENTS] Fallacy penalty: ${fallacyPenalty.toFixed(3)}`);
    auditTrail.push(`[ADJUSTMENTS] RAG bonus: ${ragBonus > 0 ? "+" : ""}${ragBonus.toFixed(3)}`);

    return finalScore;
  }

  /**
   * Apply score adjustment with different methods
   */
  private adjustScore(baseScore: number, adjustment: number, method: "add" | "multiply"): number {
    switch (method) {
      case "add":
        return baseScore + adjustment;
      case "multiply":
        return baseScore * adjustment;
      default:
        return baseScore;
    }
  }

  /**
   * Calculate final confidence score with epistemic humility
   */
  private calculateFinalConfidence(
    rounds: DebateRound[],
    selfConsistencyAdjustment: number,
    fallacyPenalty: number,
    ragBonus: number,
    auditTrail: string[],
  ): number {
    // Base confidence from judge evaluations
    let baseConfidence = 0.7; // Default confidence

    if (rounds.length > 0) {
      const confidences = rounds
        .filter((r) => r.judgeEvaluation)
        .map((r) => r.judgeEvaluation!.confidence);

      if (confidences.length > 0) {
        baseConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
      }
    }

    // Adjust confidence based on verification layers
    let finalConfidence = baseConfidence;

    // Self-consistency boosts confidence
    if (selfConsistencyAdjustment > 0) {
      finalConfidence *= 1 + selfConsistencyAdjustment;
    } else if (selfConsistencyAdjustment < 0) {
      finalConfidence *= 1 + selfConsistencyAdjustment * 0.5; // Reduce penalty impact
    }

    // Fallacies reduce confidence significantly
    if (fallacyPenalty < 0) {
      finalConfidence *= 1 + fallacyPenalty; // Penalty reduces confidence
    }

    // RAG verification affects confidence
    if (Math.abs(ragBonus) > 0.05) {
      // Significant RAG impact
      if (ragBonus > 0) {
        finalConfidence *= 1.1; // Confirmed claims boost confidence
      } else {
        finalConfidence *= 0.8; // Contradicted claims reduce confidence
      }
    }

    // Additional factors for epistemic humility

    // Reduce confidence for complex debates (more rounds = more uncertainty)
    if (rounds.length > 3) {
      finalConfidence *= 1 - (rounds.length - 3) * 0.05;
    }

    // Reduce confidence if evidence is limited
    const totalEvidence = rounds.reduce((sum, r) => {
      return (
        sum +
        (r.prosecutorArgument.evidence?.length || 0) +
        (r.defenseArgument.evidence?.length || 0)
      );
    }, 0);

    if (totalEvidence < 5) {
      finalConfidence *= 0.9; // Reduce confidence for low evidence
    }

    // Cap confidence for epistemic humility
    finalConfidence = Math.min(finalConfidence, this.maxConfidence);
    finalConfidence = Math.max(0.1, finalConfidence); // Minimum confidence floor

    auditTrail.push(
      `[CONFIDENCE] Base: ${baseConfidence.toFixed(3)} → Final: ${finalConfidence.toFixed(3)} (capped at ${this.maxConfidence})`,
    );

    return finalConfidence;
  }

  /**
   * Generate detailed scoring breakdown
   */
  public generateScoringReport(score: CompositeScore): string[] {
    const report: string[] = [];

    report.push(
      `[COMPOSITE_SCORE] Final Score: ${score.finalScore.toFixed(4)} (${(score.confidence * 100).toFixed(1)}% confidence)`,
    );
    report.push(`[BREAKDOWN] Primary Judge: ${score.primaryJudgeScore.toFixed(4)}`);

    if (score.selfConsistencyAdjustment !== 0) {
      report.push(
        `[BREAKDOWN] Self-Consistency: ${score.selfConsistencyAdjustment > 0 ? "+" : ""}${score.selfConsistencyAdjustment.toFixed(3)}`,
      );
    }

    if (score.fallacyPenalty !== 0) {
      report.push(`[BREAKDOWN] Fallacy Penalty: ${score.fallacyPenalty.toFixed(3)}`);
    }

    if (score.ragVerificationBonus !== 0) {
      report.push(
        `[BREAKDOWN] RAG Verification: ${score.ragVerificationBonus > 0 ? "+" : ""}${score.ragVerificationBonus.toFixed(3)}`,
      );
    }

    // Interpretation
    if (score.finalScore > 0.7) {
      report.push(`[INTERPRETATION] Strong case for Defense position`);
    } else if (score.finalScore < 0.3) {
      report.push(`[INTERPRETATION] Strong case for Prosecutor position`);
    } else if (Math.abs(score.finalScore - 0.5) < 0.1) {
      report.push(`[INTERPRETATION] Balanced arguments - close decision`);
    } else if (score.finalScore > 0.5) {
      report.push(`[INTERPRETATION] Moderate case for Defense position`);
    } else {
      report.push(`[INTERPRETATION] Moderate case for Prosecutor position`);
    }

    // Confidence interpretation
    if (score.confidence < 0.6) {
      report.push(`[CONFIDENCE_NOTE] Low confidence - recommend human review`);
    } else if (score.confidence > 0.9) {
      report.push(`[CONFIDENCE_NOTE] High confidence in assessment`);
    }

    return report;
  }

  /**
   * Update scoring weights (for configuration)
   */
  public updateScoringWeights(newWeights: Partial<ScoringWeights>): void {
    Object.assign(this.weights, newWeights);

    // Ensure weights sum to reasonable total
    const total =
      this.weights.judgeWeight +
      this.weights.selfConsistencyWeight +
      this.weights.fallacyWeight +
      this.weights.ragWeight;

    if (Math.abs(total - 1.0) > 0.1) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(`Warning: Scoring weights sum to ${total.toFixed(3)}, expected ~1.0`);
      }
    }
  }

  /**
   * Get current scoring configuration
   */
  public getScoringConfiguration(): {
    weights: ScoringWeights;
    maxConfidence: number;
    fallacyPenaltyMultiplier: number;
  } {
    return {
      weights: { ...this.weights },
      maxConfidence: this.maxConfidence,
      fallacyPenaltyMultiplier: this.config.fallacyPenaltyMultiplier,
    };
  }
}
