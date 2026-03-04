/**
 * Self-Consistency Layer for Multi-Agent Debate
 * Implements 5-7 way majority voting with confidence adjustment
 */

import type { DebateRequest, DebateResult, SelfConsistencyResult } from "./debate-types.js";

export class SelfConsistency {
  private readonly defaultRuns = 7; // Optimal for accuracy vs cost balance
  private readonly temperatureVariation = 0.2; // ±0.2 from base temperature
  private readonly consensusThreshold = 0.6; // 60% agreement needed for strong consensus

  /**
   * Run multiple independent debate instances and calculate consensus
   */
  public async runMultipleDebates(
    originalRequest: DebateRequest,
    numRuns: number = this.defaultRuns,
  ): Promise<SelfConsistencyResult> {
    const runs: DebateResult[] = [];
    const _startTime = Date.now();

    // Create variations of the original request
    const requestVariations = this.generateRequestVariations(originalRequest, numRuns);

    // Execute debates in parallel for efficiency
    const debatePromises = requestVariations.map((request, index) =>
      this.runSingleDebateVariation(request, index),
    );

    try {
      const results = await Promise.all(debatePromises);
      runs.push(...results);
    } catch (error) {
      throw new Error(
        `Self-consistency execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Calculate consensus
    const consensusResult = this.calculateConsensus(runs);

    return {
      runs,
      consensusStrength: consensusResult.strength,
      majorityVerdict: consensusResult.verdict,
      confidenceAdjustment: this.calculateConfidenceAdjustment(consensusResult.strength),
    };
  }

  /**
   * Generate request variations with different temperatures and slight prompt modifications
   */
  private generateRequestVariations(
    originalRequest: DebateRequest,
    numRuns: number,
  ): DebateRequest[] {
    const variations: DebateRequest[] = [];
    const baseTemperature = originalRequest.temperature || 0.7;

    for (let i = 0; i < numRuns; i++) {
      // Vary temperature within reasonable bounds
      const temperatureOffset = (Math.random() - 0.5) * this.temperatureVariation * 2;
      const temperature = Math.max(0.1, Math.min(1.0, baseTemperature + temperatureOffset));

      // Create slight variations in context to encourage diverse reasoning paths
      const contextVariations = [
        "Analyze this claim thoroughly and objectively.",
        "Evaluate this statement with careful attention to evidence quality.",
        "Assess this assertion using rigorous logical analysis.",
        "Examine this proposition with academic precision.",
        "Review this claim with skeptical but fair evaluation.",
        "Consider this statement from multiple analytical perspectives.",
        "Investigate this assertion with systematic reasoning.",
      ];

      const variation: DebateRequest = {
        ...originalRequest,
        temperature,
        context:
          `${originalRequest.context || ""} ${contextVariations[i % contextVariations.length]}`.trim(),
        // Ensure each run is independent
        maxRounds: originalRequest.maxRounds || 3,
      };

      variations.push(variation);
    }

    return variations;
  }

  /**
   * Run a single debate variation with error handling
   */
  private async runSingleDebateVariation(
    request: DebateRequest,
    runIndex: number,
  ): Promise<DebateResult> {
    try {
      // Note: This would normally import and use DebateEngine, but to avoid circular deps,
      // we'll expect this to be injected or handled by the calling code
      // For now, create a placeholder result structure

      // In actual implementation, this would be:
      // const debateEngine = new DebateEngine(config, claudeProvider, gptProvider, ...);
      // return await debateEngine.executeDebate(request);

      // Placeholder implementation - this will be replaced when integrated
      return this.createPlaceholderResult(request, runIndex);
    } catch (error) {
      throw new Error(
        `Debate run ${runIndex} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create placeholder result (will be removed when integrated with actual DebateEngine)
   */
  private createPlaceholderResult(request: DebateRequest, runIndex: number): DebateResult {
    // This is a temporary implementation for testing
    const mockScore = 0.5 + (Math.random() - 0.5) * 0.4; // Random score between 0.3-0.7

    return {
      request,
      rounds: [], // Would be populated by actual debate
      winner: mockScore > 0.5 ? "defense" : "prosecutor",
      finalScore: {
        primaryJudgeScore: mockScore,
        selfConsistencyAdjustment: 0,
        fallacyPenalty: 0,
        ragVerificationBonus: 0,
        finalScore: mockScore,
        confidence: 0.7,
        auditTrail: [`[PLACEHOLDER] Run ${runIndex} result`],
      },
      stoppingDecision: {
        shouldStop: true,
        reason: "max_rounds",
        roundsCompleted: 1,
      },
      processingTime: 1000,
      totalTokensUsed: 1000,
      totalCost: 0.02,
      auditTrail: [`[PLACEHOLDER] Self-consistency run ${runIndex}`],
    };
  }

  /**
   * Calculate consensus from multiple debate results
   */
  private calculateConsensus(runs: DebateResult[]): {
    verdict: "prosecutor_wins" | "defense_wins" | "tie";
    strength: number;
    distribution: { prosecutor: number; defense: number; tie: number };
  } {
    const distribution = {
      prosecutor: 0,
      defense: 0,
      tie: 0,
    };

    // Count outcomes
    runs.forEach((run) => {
      switch (run.winner) {
        case "prosecutor":
          distribution.prosecutor++;
          break;
        case "defense":
          distribution.defense++;
          break;
        case "tie":
          distribution.tie++;
          break;
      }
    });

    // Determine majority verdict
    const total = runs.length;
    const prosecutorRatio = distribution.prosecutor / total;
    const defenseRatio = distribution.defense / total;
    const tieRatio = distribution.tie / total;

    let verdict: "prosecutor_wins" | "defense_wins" | "tie";
    let consensusStrength: number;

    if (prosecutorRatio >= this.consensusThreshold) {
      verdict = "prosecutor_wins";
      consensusStrength = prosecutorRatio;
    } else if (defenseRatio >= this.consensusThreshold) {
      verdict = "defense_wins";
      consensusStrength = defenseRatio;
    } else if (prosecutorRatio === defenseRatio) {
      verdict = "tie";
      consensusStrength = Math.max(prosecutorRatio, defenseRatio, tieRatio);
    } else {
      // Weak majority
      if (prosecutorRatio > defenseRatio && prosecutorRatio > tieRatio) {
        verdict = "prosecutor_wins";
        consensusStrength = prosecutorRatio;
      } else if (defenseRatio > prosecutorRatio && defenseRatio > tieRatio) {
        verdict = "defense_wins";
        consensusStrength = defenseRatio;
      } else {
        verdict = "tie";
        consensusStrength = tieRatio;
      }
    }

    return {
      verdict,
      strength: consensusStrength,
      distribution,
    };
  }

  /**
   * Calculate confidence adjustment based on consensus strength
   */
  private calculateConfidenceAdjustment(consensusStrength: number): number {
    // Strong consensus (>= 0.8): Boost confidence by up to 20%
    if (consensusStrength >= 0.8) {
      return 1.0 + (consensusStrength - 0.8) * 1.0; // Max 1.2x multiplier
    }

    // Moderate consensus (0.6-0.8): Slight boost
    if (consensusStrength >= 0.6) {
      return 1.0 + (consensusStrength - 0.6) * 0.5; // Up to 1.1x multiplier
    }

    // Weak consensus (0.4-0.6): Neutral adjustment
    if (consensusStrength >= 0.4) {
      return 1.0;
    }

    // Very weak/no consensus (<0.4): Reduce confidence
    return 0.7 + consensusStrength * 0.75; // 0.7x to 1.0x multiplier
  }

  /**
   * Analyze disagreement patterns for insights
   */
  public analyzeDisagreementPatterns(runs: DebateResult[]): {
    averageConfidence: number;
    standardDeviation: number;
    outliers: DebateResult[];
    convergenceMetrics: {
      scoreVariance: number;
      reasoningDiversity: number;
    };
  } {
    const scores = runs.map((run) => run.finalScore.finalScore);
    const confidences = runs.map((run) => run.finalScore.confidence);

    // Calculate basic statistics
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    const scoreVariance =
      scores.reduce((sum, score) => sum + (score - averageScore) ** 2, 0) / scores.length;
    const standardDeviation = Math.sqrt(scoreVariance);

    // Identify outliers (scores more than 1.5 standard deviations from mean)
    const outliers = runs.filter(
      (run) => Math.abs(run.finalScore.finalScore - averageScore) > 1.5 * standardDeviation,
    );

    // Calculate reasoning diversity (simplified - would use more sophisticated NLP in practice)
    const reasoningTexts = runs.map((run) => run.auditTrail.join(" ").toLowerCase());
    const uniqueReasoningElements = new Set();

    reasoningTexts.forEach((text) => {
      const words = text.split(/\s+/).filter((word) => word.length > 4);
      words.forEach((word) => uniqueReasoningElements.add(word));
    });

    const reasoningDiversity = uniqueReasoningElements.size / (reasoningTexts.length * 100); // Normalized

    return {
      averageConfidence,
      standardDeviation,
      outliers,
      convergenceMetrics: {
        scoreVariance,
        reasoningDiversity,
      },
    };
  }

  /**
   * Generate consensus report for audit trail
   */
  public generateConsensusReport(result: SelfConsistencyResult): string[] {
    const report: string[] = [];

    report.push(`[SELF_CONSISTENCY] Executed ${result.runs.length} debate instances`);
    report.push(`[CONSENSUS] Majority verdict: ${result.majorityVerdict}`);
    report.push(`[CONSENSUS] Strength: ${(result.consensusStrength * 100).toFixed(1)}%`);
    report.push(`[CONFIDENCE] Adjustment multiplier: ${result.confidenceAdjustment.toFixed(3)}x`);

    // Distribution breakdown
    const distribution = { prosecutor: 0, defense: 0, tie: 0 };
    result.runs.forEach((run) => {
      distribution[run.winner]++;
    });

    report.push(`[DISTRIBUTION] Prosecutor wins: ${distribution.prosecutor}/${result.runs.length}`);
    report.push(`[DISTRIBUTION] Defense wins: ${distribution.defense}/${result.runs.length}`);
    report.push(`[DISTRIBUTION] Ties: ${distribution.tie}/${result.runs.length}`);

    // Analysis insights
    const analysis = this.analyzeDisagreementPatterns(result.runs);
    report.push(`[ANALYSIS] Average confidence: ${(analysis.averageConfidence * 100).toFixed(1)}%`);
    report.push(`[ANALYSIS] Score standard deviation: ${analysis.standardDeviation.toFixed(3)}`);
    report.push(`[ANALYSIS] Outliers detected: ${analysis.outliers.length}`);

    if (result.consensusStrength < 0.6) {
      report.push(`[WARNING] Low consensus detected - consider manual review`);
    }

    return report;
  }

  /**
   * Select best representative result from multiple runs
   */
  public selectBestRepresentativeResult(result: SelfConsistencyResult): DebateResult {
    // Strategy: Select result that is closest to consensus verdict and has good confidence
    const targetVerdict = result.majorityVerdict;
    const candidateRuns = result.runs.filter((run) => {
      if (targetVerdict === "tie") return run.winner === "tie";
      if (targetVerdict === "prosecutor_wins") return run.winner === "prosecutor";
      if (targetVerdict === "defense_wins") return run.winner === "defense";
      return false;
    });

    if (candidateRuns.length === 0) {
      // Fallback to highest confidence result
      return result.runs.reduce((best, current) =>
        current.finalScore.confidence > best.finalScore.confidence ? current : best,
      );
    }

    // Among matching results, select the one with highest confidence and most thorough reasoning
    return candidateRuns.reduce((best, current) => {
      const currentQuality = current.finalScore.confidence + current.auditTrail.length / 100;
      const bestQuality = best.finalScore.confidence + best.auditTrail.length / 100;
      return currentQuality > bestQuality ? current : best;
    });
  }
}
