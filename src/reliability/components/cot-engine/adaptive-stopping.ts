/**
 * Adaptive Stopping Logic for Multi-Agent Debate
 * Implements semantic entropy, confidence plateau, and beta-binomial stability detection
 */

import type { AdaptiveStoppingDecision, DebateEngineConfig, DebateRound } from "./debate-types.js";

interface StoppingCriteria {
  semanticEntropyThreshold: number;
  confidencePlateauThreshold: number;
  minRoundsBeforeStop: number;
  maxRoundsHardLimit: number;
  consensusThreshold: number;
}

interface ConvergenceMetrics {
  semanticEntropy: number;
  confidenceChange: number;
  scoreStability: number;
  argumentNovelty: number;
  consensusStrength: number;
}

export class AdaptiveStopping {
  private readonly config: DebateEngineConfig;
  private readonly criteria: StoppingCriteria;

  constructor(config: DebateEngineConfig) {
    this.config = config;
    this.criteria = {
      semanticEntropyThreshold: config.semanticEntropyThreshold || 0.3,
      confidencePlateauThreshold: config.confidencePlateauThreshold || 0.02,
      minRoundsBeforeStop: 2, // Minimum rounds before considering stopping
      maxRoundsHardLimit: config.maxRounds || 5,
      consensusThreshold: 0.8, // High consensus threshold
    };
  }

  /**
   * Determine if debate should stop based on multiple criteria
   */
  public async shouldStop(
    rounds: DebateRound[],
    currentRound: number,
  ): Promise<AdaptiveStoppingDecision> {
    // Always continue if below minimum rounds
    if (currentRound < this.criteria.minRoundsBeforeStop) {
      return {
        shouldStop: false,
        reason: "max_rounds", // Placeholder
        roundsCompleted: currentRound,
      };
    }

    // Hard limit check
    if (currentRound >= this.criteria.maxRoundsHardLimit) {
      return {
        shouldStop: true,
        reason: "max_rounds",
        roundsCompleted: currentRound,
      };
    }

    // Calculate convergence metrics
    const metrics = await this.calculateConvergenceMetrics(rounds);

    // Check stopping criteria in order of priority

    // 1. Semantic Entropy - Low entropy indicates high consensus
    if (metrics.semanticEntropy <= this.criteria.semanticEntropyThreshold) {
      return {
        shouldStop: true,
        reason: "semantic_entropy",
        semanticEntropy: metrics.semanticEntropy,
        roundsCompleted: currentRound,
      };
    }

    // 2. Confidence Plateau - Minimal confidence change indicates convergence
    if (metrics.confidenceChange <= this.criteria.confidencePlateauThreshold) {
      return {
        shouldStop: true,
        reason: "confidence_plateau",
        confidenceChange: metrics.confidenceChange,
        roundsCompleted: currentRound,
      };
    }

    // 3. Strong Consensus - High agreement across dimensions
    if (metrics.consensusStrength >= this.criteria.consensusThreshold) {
      return {
        shouldStop: true,
        reason: "consensus_reached",
        roundsCompleted: currentRound,
      };
    }

    // Continue debate
    return {
      shouldStop: false,
      reason: "max_rounds", // Will be updated if we actually reach max
      roundsCompleted: currentRound,
    };
  }

  /**
   * Calculate comprehensive convergence metrics
   */
  private async calculateConvergenceMetrics(rounds: DebateRound[]): Promise<ConvergenceMetrics> {
    if (rounds.length < 2) {
      return {
        semanticEntropy: 1.0, // High entropy for single round
        confidenceChange: 1.0,
        scoreStability: 0.0,
        argumentNovelty: 1.0,
        consensusStrength: 0.0,
      };
    }

    // Calculate semantic entropy
    const semanticEntropy = await this.calculateSemanticEntropy(rounds);

    // Calculate confidence change
    const confidenceChange = this.calculateConfidenceChange(rounds);

    // Calculate score stability
    const scoreStability = this.calculateScoreStability(rounds);

    // Calculate argument novelty
    const argumentNovelty = this.calculateArgumentNovelty(rounds);

    // Calculate consensus strength
    const consensusStrength = this.calculateConsensusStrength(rounds);

    return {
      semanticEntropy,
      confidenceChange,
      scoreStability,
      argumentNovelty,
      consensusStrength,
    };
  }

  /**
   * Calculate semantic entropy across debate rounds
   * Lower entropy indicates higher convergence/consensus
   */
  private async calculateSemanticEntropy(rounds: DebateRound[]): Promise<number> {
    if (rounds.length < 2) return 1.0;

    // Extract argument texts from recent rounds
    const recentRounds = rounds.slice(-3); // Focus on last 3 rounds
    const prosecutorTexts = recentRounds.map((r) => r.prosecutorArgument.content.toLowerCase());
    const defenseTexts = recentRounds.map((r) => r.defenseArgument.content.toLowerCase());

    // Calculate semantic similarity between arguments
    const prosecutorEntropy = this.calculateTextEntropy(prosecutorTexts);
    const defenseEntropy = this.calculateTextEntropy(defenseTexts);

    // Cross-argument entropy (similarity between prosecutor and defense)
    const crossEntropy = this.calculateCrossTextEntropy(prosecutorTexts, defenseTexts);

    // Combined entropy measure
    const combinedEntropy = (prosecutorEntropy + defenseEntropy + crossEntropy) / 3;

    return Math.min(1.0, Math.max(0.0, combinedEntropy));
  }

  /**
   * Calculate entropy within similar texts (same role across rounds)
   */
  private calculateTextEntropy(texts: string[]): number {
    if (texts.length < 2) return 1.0;

    const wordFrequencies = new Map<string, number>();
    const totalWords = texts.reduce((total, text) => {
      const words = text.split(/\s+/).filter((word) => word.length > 3);
      words.forEach((word) => {
        wordFrequencies.set(word, (wordFrequencies.get(word) || 0) + 1);
      });
      return total + words.length;
    }, 0);

    if (totalWords === 0) return 1.0;

    // Calculate Shannon entropy
    let entropy = 0;
    for (const frequency of wordFrequencies.values()) {
      const probability = frequency / totalWords;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    // Normalize entropy (higher diversity = higher entropy)
    const maxPossibleEntropy = Math.log2(wordFrequencies.size);
    return maxPossibleEntropy > 0 ? entropy / maxPossibleEntropy : 0;
  }

  /**
   * Calculate cross-entropy between different roles
   * Lower cross-entropy indicates arguments are becoming more similar (convergence)
   */
  private calculateCrossTextEntropy(texts1: string[], texts2: string[]): number {
    if (texts1.length === 0 || texts2.length === 0) return 1.0;

    // Calculate word overlap between prosecutor and defense arguments
    const words1 = new Set<string>();
    const words2 = new Set<string>();

    texts1.forEach((text) => {
      text
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .forEach((word) => words1.add(word));
    });

    texts2.forEach((text) => {
      text
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .forEach((word) => words2.add(word));
    });

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter((word) => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    const similarity = union.size > 0 ? intersection.size / union.size : 0;

    // Convert similarity to entropy (high similarity = low entropy)
    return 1 - similarity;
  }

  /**
   * Calculate confidence change over recent rounds
   */
  private calculateConfidenceChange(rounds: DebateRound[]): number {
    if (rounds.length < 2) return 1.0;

    const confidences = rounds
      .filter((r) => r.judgeEvaluation)
      .map((r) => r.judgeEvaluation!.confidence);

    if (confidences.length < 2) return 1.0;

    // Calculate average change over last few rounds
    const recentConfidences = confidences.slice(-3);
    if (recentConfidences.length < 2) return 1.0;

    let totalChange = 0;
    for (let i = 1; i < recentConfidences.length; i++) {
      totalChange += Math.abs(recentConfidences[i] - recentConfidences[i - 1]);
    }

    return totalChange / (recentConfidences.length - 1);
  }

  /**
   * Calculate score stability across rounds
   */
  private calculateScoreStability(rounds: DebateRound[]): number {
    if (rounds.length < 2) return 0.0;

    const scores = rounds
      .filter((r) => r.judgeEvaluation)
      .map((r) => {
        const evaluation = r.judgeEvaluation!;
        const total = evaluation.totalScore.prosecutor + evaluation.totalScore.defense;
        return total > 0 ? evaluation.totalScore.defense / total : 0.5;
      });

    if (scores.length < 2) return 0.0;

    // Calculate coefficient of variation
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Stability is inverse of coefficient of variation
    return mean > 0 ? 1 - Math.min(1.0, stdDev / mean) : 0;
  }

  /**
   * Calculate argument novelty in recent rounds
   * Lower novelty indicates repetitive arguments (convergence)
   */
  private calculateArgumentNovelty(rounds: DebateRound[]): number {
    if (rounds.length < 3) return 1.0;

    const recentRounds = rounds.slice(-3);

    // Calculate novelty for prosecutor arguments
    const prosecutorNovelty = this.calculateRoleArgumentNovelty(
      recentRounds.map((r) => r.prosecutorArgument.content),
    );

    // Calculate novelty for defense arguments
    const defenseNovelty = this.calculateRoleArgumentNovelty(
      recentRounds.map((r) => r.defenseArgument.content),
    );

    return (prosecutorNovelty + defenseNovelty) / 2;
  }

  /**
   * Calculate argument novelty for a specific role
   */
  private calculateRoleArgumentNovelty(argumentTexts: string[]): number {
    if (argumentTexts.length < 2) return 1.0;

    // Calculate uniqueness of most recent argument compared to previous ones
    const latestArg = argumentTexts[argumentTexts.length - 1].toLowerCase();
    const previousArgs = argumentTexts.slice(0, -1).map((arg) => arg.toLowerCase());

    let maxSimilarity = 0;
    for (const prevArg of previousArgs) {
      const similarity = this.calculateTextSimilarity(latestArg, prevArg);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // Novelty is inverse of maximum similarity
    return 1 - maxSimilarity;
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter((word) => word.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter((word) => word.length > 3));

    const intersection = new Set([...words1].filter((word) => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate consensus strength across judge evaluations
   */
  private calculateConsensusStrength(rounds: DebateRound[]): number {
    if (rounds.length < 2) return 0.0;

    const evaluations = rounds.filter((r) => r.judgeEvaluation).map((r) => r.judgeEvaluation!);
    if (evaluations.length < 2) return 0.0;

    // Calculate consistency in judge decisions
    const scores = evaluations.map((evaluation) => {
      const total = evaluation.totalScore.prosecutor + evaluation.totalScore.defense;
      return total > 0 ? evaluation.totalScore.defense / total : 0.5;
    });

    // Calculate how consistently the judge is scoring
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Strong consensus = low standard deviation
    const consistency = 1 - Math.min(1.0, standardDeviation / 0.5); // Normalize by max possible std dev

    // Also consider confidence levels
    const avgConfidence =
      evaluations.reduce((sum, evaluation) => sum + evaluation.confidence, 0) / evaluations.length;

    // Combined consensus strength
    return consistency * 0.7 + avgConfidence * 0.3;
  }

  /**
   * Generate stopping analysis report
   */
  public async generateStoppingAnalysis(rounds: DebateRound[]): Promise<string[]> {
    const report: string[] = [];
    const metrics = await this.calculateConvergenceMetrics(rounds);

    report.push(`[ADAPTIVE_STOPPING] Convergence Analysis after ${rounds.length} rounds`);
    report.push(
      `[SEMANTIC_ENTROPY] ${metrics.semanticEntropy.toFixed(3)} (threshold: ${this.criteria.semanticEntropyThreshold})`,
    );
    report.push(
      `[CONFIDENCE_CHANGE] ${metrics.confidenceChange.toFixed(3)} (threshold: ${this.criteria.confidencePlateauThreshold})`,
    );
    report.push(`[SCORE_STABILITY] ${metrics.scoreStability.toFixed(3)}`);
    report.push(`[ARGUMENT_NOVELTY] ${metrics.argumentNovelty.toFixed(3)}`);
    report.push(
      `[CONSENSUS_STRENGTH] ${metrics.consensusStrength.toFixed(3)} (threshold: ${this.criteria.consensusThreshold})`,
    );

    // Stopping recommendations
    if (metrics.semanticEntropy <= this.criteria.semanticEntropyThreshold) {
      report.push(`[RECOMMENDATION] STOP - Low semantic entropy indicates consensus`);
    } else if (metrics.confidenceChange <= this.criteria.confidencePlateauThreshold) {
      report.push(`[RECOMMENDATION] STOP - Confidence plateau reached`);
    } else if (metrics.consensusStrength >= this.criteria.consensusThreshold) {
      report.push(`[RECOMMENDATION] STOP - Strong consensus achieved`);
    } else {
      report.push(`[RECOMMENDATION] CONTINUE - No stopping criteria met`);
    }

    return report;
  }

  /**
   * Update stopping criteria (for configuration)
   */
  public updateStoppingCriteria(newCriteria: Partial<StoppingCriteria>): void {
    Object.assign(this.criteria, newCriteria);
  }

  /**
   * Get current stopping configuration
   */
  public getStoppingConfiguration(): StoppingCriteria {
    return { ...this.criteria };
  }

  /**
   * Calculate Beta-Binomial stability for advanced stopping
   * (Research-based approach for detecting when additional rounds won't change outcome)
   */
  public calculateBetaBinomialStability(rounds: DebateRound[]): number {
    if (rounds.length < 3) return 0.0;

    // Extract binary outcomes (prosecutor wins = 0, defense wins = 1)
    const outcomes = rounds
      .filter((r) => r.judgeEvaluation)
      .map((r) => {
        const evaluation = r.judgeEvaluation!;
        return evaluation.totalScore.defense > evaluation.totalScore.prosecutor ? 1 : 0;
      });

    if (outcomes.length < 3) return 0.0;

    // Calculate win proportion for defense
    const defenseWins = outcomes.reduce((sum: number, outcome) => sum + outcome, 0);
    const totalRounds = outcomes.length;
    const _winRate = defenseWins / totalRounds;

    // Beta-Binomial posterior parameters (using uninformative prior)
    const alpha = defenseWins + 1;
    const beta = totalRounds - defenseWins + 1;

    // Calculate credible interval width (narrower interval = more stability)
    const credibleInterval = this.betaCredibleInterval(alpha, beta, 0.95);
    const intervalWidth = credibleInterval.upper - credibleInterval.lower;

    // Stability is inverse of interval width
    return Math.max(0, 1 - intervalWidth * 2); // Scale so that width of 0.5 = 0 stability
  }

  /**
   * Calculate Beta distribution credible interval
   */
  private betaCredibleInterval(
    alpha: number,
    beta: number,
    confidence: number,
  ): { lower: number; upper: number } {
    // Simplified approximation using normal approximation to Beta distribution
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);

    const z = confidence === 0.95 ? 1.96 : 2.58; // 95% or 99% confidence

    return {
      lower: Math.max(0, mean - z * stdDev),
      upper: Math.min(1, mean + z * stdDev),
    };
  }

  /**
   * Predict optimal stopping point based on current trends
   */
  public async predictOptimalStoppingPoint(rounds: DebateRound[]): Promise<{
    predictedRounds: number;
    confidence: number;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];

    if (rounds.length < 2) {
      return {
        predictedRounds: this.criteria.maxRoundsHardLimit,
        confidence: 0.1,
        reasoning: ["Insufficient data for prediction"],
      };
    }

    const _metrics = this.calculateConvergenceMetrics(rounds);

    // Estimate convergence rate
    const entropyTrend = await this.calculateEntropyTrend(rounds);
    const confidenceTrend = this.calculateConfidenceTrend(rounds);

    let predictedRounds = rounds.length + 1; // Default: one more round
    let confidence = 0.5;

    // If rapid convergence is happening
    if (entropyTrend < -0.1 && confidenceTrend < 0.05) {
      predictedRounds = rounds.length + 1;
      confidence = 0.8;
      reasoning.push("Rapid convergence detected - expect stopping soon");
    }
    // If slow convergence
    else if (entropyTrend > -0.02 && confidenceTrend > 0.1) {
      predictedRounds = Math.min(this.criteria.maxRoundsHardLimit, rounds.length + 3);
      confidence = 0.6;
      reasoning.push("Slow convergence - likely need several more rounds");
    }
    // If stagnation
    else if (Math.abs(entropyTrend) < 0.01 && confidenceTrend < 0.02) {
      predictedRounds = rounds.length + 1;
      confidence = 0.9;
      reasoning.push("Stagnation detected - should stop soon");
    } else {
      predictedRounds = rounds.length + 2;
      confidence = 0.4;
      reasoning.push("Mixed signals - moderate continuation expected");
    }

    return {
      predictedRounds: Math.min(predictedRounds, this.criteria.maxRoundsHardLimit),
      confidence,
      reasoning,
    };
  }

  /**
   * Calculate entropy trend (rate of change)
   */
  private async calculateEntropyTrend(rounds: DebateRound[]): Promise<number> {
    if (rounds.length < 3) return 0;

    // Calculate entropy for sliding windows
    const windowSize = 2;
    const entropies: number[] = [];

    for (let i = windowSize; i <= rounds.length; i++) {
      const windowRounds = rounds.slice(i - windowSize, i);
      const entropy = await this.calculateSemanticEntropy(windowRounds);
      entropies.push(entropy);
    }

    if (entropies.length < 2) return 0;

    // Calculate trend (slope)
    const n = entropies.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = entropies.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * entropies[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate confidence trend (rate of change)
   */
  private calculateConfidenceTrend(rounds: DebateRound[]): number {
    const confidences = rounds
      .filter((r) => r.judgeEvaluation)
      .map((r) => r.judgeEvaluation!.confidence);

    if (confidences.length < 2) return 0;

    // Calculate average absolute change
    let totalChange = 0;
    for (let i = 1; i < confidences.length; i++) {
      totalChange += Math.abs(confidences[i] - confidences[i - 1]);
    }

    return totalChange / (confidences.length - 1);
  }
}
