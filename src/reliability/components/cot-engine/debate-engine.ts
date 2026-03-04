/**
 * Multi-Agent Debate Engine
 * Implements JoT (Judgment of Thought) framework with Prosecutor/Defense/Judge
 */

import { ClaudeProvider } from "../ai-engine/claude-provider.js";
import type { GPTProvider } from "../ai-engine/gpt-provider.js";
import type { AIAssessmentRequest } from "../ai-engine/types.js";
import type { InstructionPayload, SourceAnalysis } from "../rules-engine/types.js";
import { AdaptiveStopping } from "./adaptive-stopping.js";
import { CompositeScorer } from "./composite-scorer.js";
import { DebatePrompts } from "./debate-prompts.js";
import type {
  CompositeScore,
  DebateArgument,
  DebateEngineConfig,
  DebateRequest,
  DebateResult,
  DebateRole,
  DebateRound,
  JudgeEvaluation,
} from "./debate-types.js";
import type { FallacyDetector } from "./fallacy-detector.js";
import type { RAGVerifier } from "./rag-verifier.js";
import type { SelfConsistency } from "./self-consistency.js";

export class DebateEngine {
  private readonly config: DebateEngineConfig;
  private readonly claudeProvider: ClaudeProvider;
  private readonly gptProvider: GPTProvider;
  private readonly fallacyDetector?: FallacyDetector;
  private readonly ragVerifier?: RAGVerifier;
  private readonly selfConsistency?: SelfConsistency;
  private readonly adaptiveStopping: AdaptiveStopping;
  private readonly compositeScorer: CompositeScorer;

  constructor(
    config: DebateEngineConfig,
    claudeProvider: ClaudeProvider,
    gptProvider: GPTProvider,
    fallacyDetector?: FallacyDetector,
    ragVerifier?: RAGVerifier,
    selfConsistency?: SelfConsistency,
  ) {
    this.config = config;
    this.claudeProvider = claudeProvider;
    this.gptProvider = gptProvider;
    this.fallacyDetector = fallacyDetector;
    this.ragVerifier = ragVerifier;
    this.selfConsistency = selfConsistency;
    this.adaptiveStopping = new AdaptiveStopping(config);
    this.compositeScorer = new CompositeScorer(config);
  }

  /**
   * Execute a complete multi-agent debate
   */
  public async executeDebate(request: DebateRequest): Promise<DebateResult> {
    const startTime = Date.now();
    const rounds: DebateRound[] = [];
    let totalTokensUsed = 0;
    let totalCost = 0;
    const auditTrail: string[] = [];

    auditTrail.push(`[DEBATE_START] Claim: "${request.claim}"`);
    auditTrail.push(
      `[CONFIG] Max rounds: ${request.maxRounds || this.config.maxRounds}, Temperature: ${request.temperature || this.config.temperature}`,
    );

    // Self-consistency mode: run multiple debate instances
    if (request.useSelfConsistency && this.selfConsistency) {
      auditTrail.push("[SELF_CONSISTENCY] Running multiple debate instances for consensus");
      const selfConsistencyResult = await this.selfConsistency.runMultipleDebates(
        request,
        this.config.selfConsistencyRuns,
      );

      // Use the majority result as the primary debate
      const primaryResult = selfConsistencyResult.runs[0]; // Best performing run
      return {
        ...primaryResult,
        selfConsistency: selfConsistencyResult,
        auditTrail: [...primaryResult.auditTrail, ...auditTrail],
      };
    }

    // Standard single debate execution
    for (
      let roundNumber = 1;
      roundNumber <= (request.maxRounds || this.config.maxRounds);
      roundNumber++
    ) {
      auditTrail.push(`[ROUND_${roundNumber}] Starting debate round`);

      const round = await this.executeRound(request, rounds, roundNumber, auditTrail);
      rounds.push(round);

      totalTokensUsed += this.calculateRoundTokens(round);
      totalCost += this.calculateRoundCost(round);

      // Check adaptive stopping conditions
      const stoppingDecision = await this.adaptiveStopping.shouldStop(rounds, roundNumber);

      if (stoppingDecision.shouldStop) {
        auditTrail.push(
          `[STOPPING] ${stoppingDecision.reason} - Debate concluded after ${roundNumber} rounds`,
        );

        const finalScore = await this.generateFinalScore(request, rounds, auditTrail);

        return {
          request,
          rounds,
          winner: this.determineWinner(finalScore),
          finalScore,
          stoppingDecision,
          processingTime: Date.now() - startTime,
          totalTokensUsed,
          totalCost,
          auditTrail,
        };
      }

      // Cost safety check
      if (totalCost > this.config.costThreshold) {
        auditTrail.push(`[COST_LIMIT] Stopping debate due to cost threshold (${totalCost})`);
        break;
      }
    }

    // Generate final result
    const finalScore = await this.generateFinalScore(request, rounds, auditTrail);

    return {
      request,
      rounds,
      winner: this.determineWinner(finalScore),
      finalScore,
      stoppingDecision: {
        shouldStop: true,
        reason: "max_rounds",
        roundsCompleted: rounds.length,
      },
      processingTime: Date.now() - startTime,
      totalTokensUsed,
      totalCost,
      auditTrail,
    };
  }

  /**
   * Execute a single round of debate (Prosecutor -> Defense -> Judge)
   */
  private async executeRound(
    request: DebateRequest,
    previousRounds: DebateRound[],
    roundNumber: number,
    auditTrail: string[],
  ): Promise<DebateRound> {
    const previousArguments = this.extractPreviousArguments(previousRounds);

    // Step 1: Prosecutor presents case (Claude 3.5 Sonnet)
    auditTrail.push(`[ROUND_${roundNumber}] Prosecutor presenting case`);
    const prosecutorArgument = await this.generateArgument(
      "prosecutor",
      request,
      previousArguments,
      roundNumber,
      this.claudeProvider,
    );

    // Step 2: Defense responds (GPT-4o)
    auditTrail.push(`[ROUND_${roundNumber}] Defense presenting response`);
    const defenseArgument = await this.generateArgument(
      "defense",
      request,
      [...previousArguments, prosecutorArgument],
      roundNumber,
      this.gptProvider,
    );

    // Step 3: Judge evaluates both sides (Alternating between GPT-4o and Claude)
    const judgeProvider = roundNumber % 2 === 1 ? this.gptProvider : this.claudeProvider;
    auditTrail.push(
      `[ROUND_${roundNumber}] Judge evaluation using ${judgeProvider.constructor.name}`,
    );
    const judgeEvaluation = await this.generateJudgeEvaluation(
      request,
      [prosecutorArgument, defenseArgument],
      roundNumber,
      judgeProvider,
    );

    // Step 4: Optional verification layers
    const round: DebateRound = {
      roundNumber,
      prosecutorArgument,
      defenseArgument,
      judgeEvaluation,
    };

    // Fallacy detection
    if (request.useFallacyDetection && this.fallacyDetector) {
      auditTrail.push(`[ROUND_${roundNumber}] Running fallacy detection`);
      round.fallaciesDetected = await this.fallacyDetector.detectFallacies([
        prosecutorArgument,
        defenseArgument,
      ]);
    }

    // RAG verification
    if (request.useRAGVerification && this.ragVerifier) {
      auditTrail.push(`[ROUND_${roundNumber}] Running RAG verification`);
      round.ragVerification = await this.ragVerifier.verifyFactualClaims([
        prosecutorArgument,
        defenseArgument,
      ]);
    }

    // Calculate semantic entropy for adaptive stopping
    round.semanticEntropy = await this.calculateSemanticEntropy(round);

    return round;
  }

  /**
   * Generate argument for specific role
   */
  private async generateArgument(
    role: DebateRole,
    request: DebateRequest,
    previousArguments: DebateArgument[],
    roundNumber: number,
    provider: ClaudeProvider | GPTProvider,
  ): Promise<DebateArgument> {
    const systemPrompt = this.getSystemPromptForRole(role);
    const userPrompt = DebatePrompts.getUserPrompt(role, request, previousArguments, roundNumber);

    const _startTime = Date.now();
    const temperature = request.temperature || this.config.temperature;

    let response: string;
    let tokensUsed = 0;

    if (provider instanceof ClaudeProvider) {
      const assessmentRequest: AIAssessmentRequest = {
        sourceContent: request.claim,
        sourceUrl: request.source || "",
        instructionPayload: {
          systemPrompt,
          userPromptTemplate: userPrompt,
          temperature,
          maxTokens: 2000,
          allowedDimensions: [],
          prohibitedAssessments: [],
          scoreRange: { min: 0, max: 1 },
        } as unknown as InstructionPayload,
        sourceAnalysis: {
          url: request.source || "",
          content: request.claim,
          sourceType: "unknown",
          domain: "",
          title: request.claim,
        } as unknown as SourceAnalysis,
        priority: "normal",
        requireConsensus: false,
      };
      const result = await provider.assess(assessmentRequest);
      response = result.reasoning.join("\n");
      tokensUsed = result.metadata.tokensUsed;
    } else {
      const assessmentRequest: AIAssessmentRequest = {
        sourceContent: request.claim,
        sourceUrl: request.source || "",
        instructionPayload: {
          systemPrompt,
          userPromptTemplate: userPrompt,
          temperature,
          maxTokens: 2000,
          allowedDimensions: [],
          prohibitedAssessments: [],
          scoreRange: { min: 0, max: 1 },
        } as unknown as InstructionPayload,
        sourceAnalysis: {
          url: request.source || "",
          content: request.claim,
          sourceType: "unknown",
          domain: "",
          title: request.claim,
        } as unknown as SourceAnalysis,
        priority: "normal",
        requireConsensus: false,
      };
      const result = await provider.assess(assessmentRequest);
      response = result.reasoning.join("\n");
      tokensUsed = result.metadata.tokensUsed;
    }

    return {
      role,
      content: response,
      evidence: this.extractEvidence(response),
      reasoning: this.extractReasoning(response),
      confidence: this.extractConfidence(response),
      timestamp: Date.now(),
      tokensUsed,
    };
  }

  /**
   * Generate judge evaluation for the round
   */
  private async generateJudgeEvaluation(
    request: DebateRequest,
    debateArguments: DebateArgument[],
    roundNumber: number,
    provider: ClaudeProvider | GPTProvider,
  ): Promise<JudgeEvaluation> {
    const systemPrompt = DebatePrompts.getJudgeSystemPrompt();
    const userPrompt = DebatePrompts.getUserPrompt("judge", request, debateArguments, roundNumber);
    const temperature = 0.3; // Lower temperature for judge consistency

    let response: string;

    // Create common assessment request for judge evaluation
    const assessmentRequest: AIAssessmentRequest = {
      sourceContent: request.claim,
      sourceUrl: request.source || "",
      instructionPayload: {
        systemPrompt,
        userPromptTemplate: userPrompt,
        temperature,
        maxTokens: 2000,
        allowedDimensions: [],
        prohibitedAssessments: [],
        scoreRange: { min: 0, max: 1 },
      } as unknown as InstructionPayload,
      sourceAnalysis: {
        url: request.source || "",
        content: request.claim,
        sourceType: "unknown",
        domain: "",
        title: request.claim,
      } as unknown as SourceAnalysis,
      priority: "normal",
      requireConsensus: false,
    };

    if (provider instanceof ClaudeProvider) {
      const result = await provider.assess(assessmentRequest);
      response = result.reasoning.join("\n");
    } else {
      const result = await provider.assess(assessmentRequest);
      response = result.reasoning.join("\n");
    }

    return this.parseJudgeEvaluation(response);
  }

  /**
   * Get system prompt for specific role
   */
  private getSystemPromptForRole(role: DebateRole): string {
    switch (role) {
      case "prosecutor":
        return DebatePrompts.getProsecutorSystemPrompt();
      case "defense":
        return DebatePrompts.getDefenseSystemPrompt();
      case "judge":
        return DebatePrompts.getJudgeSystemPrompt();
      default:
        throw new Error(`Unknown debate role: ${role}`);
    }
  }

  /**
   * Extract evidence from argument text
   */
  private extractEvidence(content: string): string[] {
    const evidencePattern = /(?:Source|Citation|Study|Research|Evidence):\s*([^\n]+)/gi;
    const matches = content.match(evidencePattern) || [];
    return matches.map((match) =>
      match.replace(/^(?:Source|Citation|Study|Research|Evidence):\s*/i, "").trim(),
    );
  }

  /**
   * Extract reasoning from argument text
   */
  private extractReasoning(content: string): string[] {
    const reasoningPattern =
      /(?:Because|Therefore|Since|Given that|This shows|This demonstrates)([^.]+\.)/gi;
    const matches = content.match(reasoningPattern) || [];
    return matches.map((match) => match.trim());
  }

  /**
   * Extract confidence from argument text
   */
  private extractConfidence(content: string): number {
    const confidencePattern = /(?:Confidence|confidence):\s*(\d+)%/i;
    const match = content.match(confidencePattern);
    return match ? parseInt(match[1], 10) / 100 : 0.7; // Default confidence
  }

  /**
   * Parse judge evaluation from response text
   */
  private parseJudgeEvaluation(response: string): JudgeEvaluation {
    // Extract scores using regex patterns
    const extractScore = (pattern: RegExp): { prosecutor: number; defense: number } => {
      const matches = response.match(pattern);
      return {
        prosecutor: matches?.[1] ? parseInt(matches[1], 10) : 0,
        defense: matches?.[2] ? parseInt(matches[2], 10) : 0,
      };
    };

    const evidenceScore = extractScore(
      /Evidence Quality:\s*(\d+)\/30.*?Evidence Quality:\s*(\d+)\/30/s,
    );
    const logicScore = extractScore(
      /Logical Reasoning:\s*(\d+)\/25.*?Logical Reasoning:\s*(\d+)\/25/s,
    );
    const rebuttalScore = extractScore(
      /Rebuttal Effectiveness:\s*(\d+)\/20.*?Rebuttal Effectiveness:\s*(\d+)\/20/s,
    );
    const humilityScore = extractScore(
      /Intellectual Humility:\s*(\d+)\/15.*?Intellectual Humility:\s*(\d+)\/15/s,
    );
    const consistencyScore = extractScore(/Consistency:\s*(\d+)\/10.*?Consistency:\s*(\d+)\/10/s);

    const prosecutorTotal =
      evidenceScore.prosecutor +
      logicScore.prosecutor +
      rebuttalScore.prosecutor +
      humilityScore.prosecutor +
      consistencyScore.prosecutor;
    const defenseTotal =
      evidenceScore.defense +
      logicScore.defense +
      rebuttalScore.defense +
      humilityScore.defense +
      consistencyScore.defense;

    return {
      evidenceScore,
      logicScore,
      rebuttalScore,
      humilityScore,
      consistencyScore,
      totalScore: {
        prosecutor: prosecutorTotal,
        defense: defenseTotal,
      },
      reasoning: response,
      confidence: this.extractConfidence(response),
    };
  }

  /**
   * Calculate semantic entropy for adaptive stopping
   */
  private async calculateSemanticEntropy(round: DebateRound): Promise<number> {
    // Simplified semantic entropy calculation
    // In practice, this would use more sophisticated NLP techniques
    const _prosecutorWords = round.prosecutorArgument.content.split(" ").length;
    const _defenseWords = round.defenseArgument.content.split(" ").length;
    const overlap = this.calculateTextOverlap(
      round.prosecutorArgument.content,
      round.defenseArgument.content,
    );

    // Higher overlap indicates lower entropy (more consensus)
    return Math.max(0, 1 - overlap);
  }

  /**
   * Calculate text overlap between two arguments
   */
  private calculateTextOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Extract previous arguments from rounds
   */
  private extractPreviousArguments(rounds: DebateRound[]): DebateArgument[] {
    const debateArguments: DebateArgument[] = [];
    rounds.forEach((round) => {
      debateArguments.push(round.prosecutorArgument);
      debateArguments.push(round.defenseArgument);
    });
    return debateArguments;
  }

  /**
   * Generate final composite score
   */
  private async generateFinalScore(
    request: DebateRequest,
    rounds: DebateRound[],
    auditTrail: string[],
  ): Promise<CompositeScore> {
    return this.compositeScorer.calculateFinalScore(request, rounds, auditTrail);
  }

  /**
   * Determine winner based on final score
   */
  private determineWinner(score: CompositeScore): "prosecutor" | "defense" | "tie" {
    if (Math.abs(score.finalScore - 0.5) < 0.05) {
      return "tie";
    }
    return score.finalScore < 0.5 ? "prosecutor" : "defense";
  }

  /**
   * Calculate tokens used in a round
   */
  private calculateRoundTokens(round: DebateRound): number {
    return (round.prosecutorArgument.tokensUsed || 0) + (round.defenseArgument.tokensUsed || 0);
  }

  /**
   * Calculate cost for a round (rough estimation)
   */
  private calculateRoundCost(round: DebateRound): number {
    const tokensUsed = this.calculateRoundTokens(round);
    // Rough cost estimation: $0.002 per 1K tokens
    return (tokensUsed / 1000) * 0.002;
  }
}
