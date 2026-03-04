import { AIAssessmentEngine } from "../ai-engine/ai-assessment-engine.js";
import type { ClaudeProvider } from "../ai-engine/claude-provider.js";
import type { GPTProvider } from "../ai-engine/gpt-provider.js";
import type {
  AIAssessmentRequest,
  AIAssessmentResult,
  ConsensusResult,
  FactorAnalysis,
} from "../ai-engine/types.js";
import { COTEngine } from "../cot-engine/cot-engine.js";
import type { DebateEngineConfig } from "../cot-engine/debate-types.js";
import { DomainRulesSets } from "../rules-engine/domain-rules.js";
import { RulesEngine } from "../rules-engine/rules-engine.js";
import { SourceClassifier } from "../rules-engine/source-classifier.js";
import type { InstructionPayload, SourceAnalysis, SourceMetadata } from "../rules-engine/types.js";
import type {
  AssessmentStatus,
  BackgroundAssessmentResponse,
  ContentFetcher,
  ReliabilityAssessmentError,
  ReliabilityAssessmentRequest,
  ReliabilityAssessmentResult,
  ReliabilityCache,
  ReliabilityConfig,
  ReliabilityEventListener,
  ReliabilityProcessingMetadata,
} from "./types.js";

/**
 * Type guard to check if result is ConsensusResult
 */
function isConsensusResult(
  result: AIAssessmentResult | ConsensusResult,
): result is ConsensusResult {
  return "consensusStrength" in result && "primaryResult" in result;
}

/**
 * Type guard to check if result is AIAssessmentResult
 */
function isAIAssessmentResult(
  result: AIAssessmentResult | ConsensusResult,
): result is AIAssessmentResult {
  return "metadata" in result && !("consensusStrength" in result);
}

/**
 * Main Reliability Algorithm - Phase 3 Integration Layer
 * Orchestrates Rules Engine + AI Assessment Engine into unified system
 */
export class ReliabilityAlgorithm {
  private readonly config: ReliabilityConfig;
  private readonly rulesEngine: RulesEngine;
  private readonly sourceClassifier: SourceClassifier;

  private readonly aiEngine: AIAssessmentEngine;
  private readonly cotEngine: COTEngine;
  private readonly contentFetcher?: ContentFetcher;
  private readonly cache?: ReliabilityCache;
  private readonly eventListeners: ReliabilityEventListener[] = [];

  /** Algorithm version for compatibility tracking */
  public readonly version = "3.0.0";

  constructor(
    config: ReliabilityConfig,
    contentFetcher?: ContentFetcher,
    cache?: ReliabilityCache,
    claudeProvider?: ClaudeProvider,
    gptProvider?: GPTProvider,
    debateConfig?: DebateEngineConfig,
  ) {
    this.config = config;
    this.contentFetcher = contentFetcher;
    this.cache = cache;

    // Initialize core components
    this.sourceClassifier = new SourceClassifier();

    this.rulesEngine = new RulesEngine({
      domainRules: new Map(),
      blacklistedDomains: new Set(),
      whitelistedDomains: new Set(),
      defaultRules: DomainRulesSets.getRulesForSourceType("unknown"),
      enableAuditTrail: true,
      strictMode: true,
    });
    this.aiEngine = new AIAssessmentEngine(config.aiEngine, cache as any);

    // Initialize COT Engine with MAD support
    // Resolve debate configuration (prefer explicit argument, then config.madFramework)
    const resolvedDebateConfig: DebateEngineConfig | undefined =
      debateConfig ?? (config.madFramework?.enabled ? config.madFramework.debateConfig : undefined);

    const cotConfig = {
      deepThinkerModel: config.aiEngine.primaryProvider.model,
      useConsensus: config.aiEngine.enableConsensusMode,
      timeout: config.assessmentTimeout || 30000,
      enableMAD: config.madFramework?.enabled ?? true,
      madConfig: resolvedDebateConfig,
      madDefaults: {
        maxRounds: 3,
        temperature: 0.7,
        useRAGVerification: true,
        useFallacyDetection: true,
        useSelfConsistency: false,
      },
    };

    this.cotEngine = new COTEngine(
      this.aiEngine,
      cotConfig,
      claudeProvider,
      gptProvider,
      resolvedDebateConfig,
    );

    this.validateConfiguration();
  }

  /**
   * Perform complete reliability assessment
   * @ts-expect-error - Core algorithm requires comprehensive logic flow
   * eslint-disable-next-line sonarjs/cognitive-complexity, complexity
   */
  public async assess(
    request: ReliabilityAssessmentRequest,
  ): Promise<ReliabilityAssessmentResult | BackgroundAssessmentResponse> {
    const startTime = Date.now();
    const assessmentId = this.generateAssessmentId();

    this.log("info", "Starting reliability assessment", {
      url: request.sourceUrl,
      priority: request.priority,
      assessmentId,
    });

    try {
      // Update status: Initializing
      await this.updateStatus({
        phase: "initializing",
        progress: 0,
        currentOperation: "Preparing assessment pipeline",
      });

      // Check cache first
      if (this.cache) {
        const cacheKey = this.generateCacheKey(request);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          this.log("info", "Returning cached result", { assessmentId });
          await this.notifyComplete(cached);
          return cached;
        }
      }

      // Step 1: Source Analysis and Content Preparation
      await this.updateStatus({
        phase: "source_analysis",
        progress: 10,
        currentOperation: "Analyzing source and fetching content",
      });

      const { sourceMetadata, sourceContent } = await this.prepareSourceData(request);
      const sourceAnalysis = this.sourceClassifier.analyzeSource(sourceMetadata);

      // Step 2: Rules Engine Processing
      await this.updateStatus({
        phase: "rules_engine",
        progress: 30,
        currentOperation: "Applying domain-specific rules and generating instructions",
      });

      const rulesEngineStart = Date.now();
      const instructionPayload = await this.generateInstructionPayload(
        sourceMetadata,
        request.customInstructions,
      );
      const rulesEngineTime = Date.now() - rulesEngineStart;

      // Handle Background Mode
      if (request.runInBackground) {
        const taskId = await this.cotEngine.startTask(
          request.sourceUrl,
          sourceContent,
          sourceAnalysis,
          instructionPayload,
        );

        this.log("info", "Started background thinking task", { taskId });

        return {
          taskId,
          status: "processing",
          message:
            "Sir, I'm checking that in the background. I'll notify you when the deep analysis is complete.",
        };
      }

      // Step 3: AI Assessment
      await this.updateStatus({
        phase: "ai_assessment",
        progress: 60,
        currentOperation: "Performing AI-powered reliability assessment",
      });

      const aiAssessmentStart = Date.now();
      const aiAssessmentRequest: AIAssessmentRequest = {
        sourceUrl: request.sourceUrl,
        sourceContent,
        instructionPayload,
        sourceAnalysis,
        priority: request.priority || "normal",
        requireConsensus: request.forceConsensus || false,
      };

      const aiResult = await this.aiEngine.assess(aiAssessmentRequest);
      const aiAssessmentTime = Date.now() - aiAssessmentStart;

      // Step 4: Final Validation and Result Assembly
      await this.updateStatus({
        phase: "validation",
        progress: 90,
        currentOperation: "Validating results and assembling final assessment",
      });

      const validationStart = Date.now();
      const finalResult = await this.assembleResult(sourceAnalysis, instructionPayload, aiResult, {
        totalProcessingTime: 0, // Will be set below
        rulesEngineTime,
        aiAssessmentTime,
        validationTime: 0, // Will be set below
        assessmentTimestamp: new Date(),
        algorithmVersion: this.version,
        consensusModeUsed: "consensusStrength" in aiResult && "finalScore" in aiResult,
        providersUsed: this.extractProvidersUsed(aiResult),
      });
      const validationTime = Date.now() - validationStart;

      // Update timing metadata
      finalResult.processingMetadata.totalProcessingTime = Date.now() - startTime;
      // Provide alias expected by integration tests
      (finalResult.processingMetadata as any).totalTime =
        finalResult.processingMetadata.totalProcessingTime;
      finalResult.processingMetadata.validationTime = validationTime;

      // Cache the result
      if (this.cache) {
        const cacheKey = this.generateCacheKey(request);
        await this.cache.set(cacheKey, finalResult, this.config.assessmentTimeout || 3600000);
      }

      await this.updateStatus({
        phase: "completed",
        progress: 100,
        currentOperation: "Assessment completed successfully",
        intermediateResults: finalResult,
      });

      this.log("info", "Reliability assessment completed", {
        assessmentId,
        score: finalResult.reliabilityScore,
        confidence: finalResult.confidence,
        processingTime: finalResult.processingMetadata.totalProcessingTime,
      });

      await this.notifyComplete(finalResult);
      return finalResult;
    } catch (error) {
      const reliabilityError = this.wrapError(error);
      this.log("error", "Reliability assessment failed", {
        assessmentId,
        error: reliabilityError.message,
        type: reliabilityError.type,
      });

      await this.updateStatus({
        phase: "failed",
        progress: 0,
        currentOperation: `Assessment failed: ${reliabilityError.message}`,
      });

      await this.notifyError(reliabilityError);
      throw reliabilityError;
    }
  }

  /**
   * Prepare source data (metadata and content)
   */
  private async prepareSourceData(request: ReliabilityAssessmentRequest): Promise<{
    sourceMetadata: SourceMetadata;
    sourceContent: string;
  }> {
    try {
      // Parse URL and extract basic metadata
      const url = new URL(request.sourceUrl);
      const domain = url.hostname.replace(/^www\./, "");
      const tld = domain.split(".").pop() || "";

      let sourceMetadata: SourceMetadata = {
        url: request.sourceUrl,
        domain,
        tld,
        hasSSL: url.protocol === "https:",
        ...request.sourceMetadata,
      };

      let sourceContent = request.sourceContent || "";

      // Fetch content if not provided
      if (!sourceContent && this.contentFetcher?.supports(request.sourceUrl)) {
        try {
          const fetchResult = await this.contentFetcher.fetch(request.sourceUrl);
          sourceContent = fetchResult.content;
          sourceMetadata = { ...sourceMetadata, ...fetchResult.metadata };
        } catch (fetchError) {
          this.log("warn", "Content fetch failed, proceeding with URL-only analysis", {
            url: request.sourceUrl,
            error: fetchError,
          });
        }
      }

      if (!sourceContent) {
        throw new Error("No source content available for assessment");
      }

      return { sourceMetadata, sourceContent };
    } catch (error) {
      throw this.createError(
        "CONTENT_FETCH_FAILED",
        `Failed to prepare source data: ${error}`,
        error,
      );
    }
  }

  /**
   * Generate instruction payload using rules engine
   */
  private async generateInstructionPayload(
    sourceMetadata: SourceMetadata,
    customInstructions?: Partial<InstructionPayload>,
  ): Promise<InstructionPayload> {
    try {
      const rulesResult = await this.rulesEngine.processRequest(sourceMetadata);
      const baseInstructions = rulesResult.instructionPayload;

      // Apply custom instruction modifications
      if (customInstructions) {
        return {
          ...baseInstructions,
          ...customInstructions,
          // Ensure arrays are properly merged
          allowedDimensions:
            customInstructions.allowedDimensions || baseInstructions.allowedDimensions,
          prohibitedAssessments: [
            ...(baseInstructions.prohibitedAssessments || []),
            ...(customInstructions.prohibitedAssessments || []),
          ],
        };
      }

      return baseInstructions;
    } catch (error) {
      throw this.createError(
        "RULES_ENGINE_FAILED",
        `Rules engine processing failed: ${error}`,
        error,
      );
    }
  }

  /**
   * Assemble final reliability assessment result
   */
  private async assembleResult(
    sourceAnalysis: SourceAnalysis,
    instructionPayload: InstructionPayload,
    aiResult: AIAssessmentResult | ConsensusResult,
    processingMetadata: ReliabilityProcessingMetadata,
  ): Promise<ReliabilityAssessmentResult> {
    try {
      // Extract core data from AI result
      const isConsensus = "consensusStrength" in aiResult && "finalScore" in aiResult;
      const score = isConsensus ? aiResult.finalScore : aiResult.reliabilityScore;
      const label = isConsensus ? aiResult.finalLabel : aiResult.reliabilityLabel;
      const confidence = isConsensus ? aiResult.finalConfidence : aiResult.confidence;
      const rawFactors = isConsensusResult(aiResult)
        ? aiResult.primaryResult.factorsAnalyzed
        : isAIAssessmentResult(aiResult)
          ? aiResult.factorsAnalyzed
          : {};

      // Transform FactorAnalysis to expected format (reasoning: string[] -> string)
      const factors: Record<string, { score: number; weight: number; reasoning: string }> = {};
      for (const [key, factor] of Object.entries(rawFactors)) {
        factors[key] = {
          score: factor.score,
          weight: factor.weight,
          reasoning: Array.isArray(factor.reasoning)
            ? factor.reasoning.join(" ")
            : factor.reasoning,
        };
      }

      // Generate comprehensive reasoning
      const reasoning = this.generateComprehensiveReasoning(
        sourceAnalysis,
        instructionPayload,
        aiResult,
        isConsensus,
      );

      // Generate assessment notes
      const assessmentNotes = this.generateAssessmentNotes(sourceAnalysis, aiResult, isConsensus);

      // Apply custom validation if configured
      if (this.config.customValidation) {
        await this.applyCustomValidation(
          score,
          confidence,
          factors as any,
          sourceAnalysis.sourceType,
        );
      }

      return {
        reliabilityScore: score,
        reliabilityLabel: label,
        confidence,
        factorsAnalyzed: factors,
        sourceAnalysis,
        rulesEngineResult: instructionPayload,
        aiAssessmentResult: aiResult,
        reasoning,
        assessmentNotes,
        processingMetadata,
        auditTrail: [
          "ASSESSMENT_START",
          `SOURCE:${sourceAnalysis.domain || "unknown"}`,
          `PROVIDERS:${processingMetadata.providersUsed.join(", ") || "fallback"}`,
          "PHASE_1_RULES",
          "RULES_APPLIED",
          "AI_ASSESSMENT",
          "RESULT_ASSEMBLY",
          "ASSESSMENT_COMPLETE",
        ],
      };
    } catch (error) {
      throw this.createError("VALIDATION_FAILED", `Result assembly failed: ${error}`, error);
    }
  }

  /**
   * Generate comprehensive assessment reasoning
   */
  private generateComprehensiveReasoning(
    sourceAnalysis: SourceAnalysis,
    instructionPayload: InstructionPayload,
    aiResult: AIAssessmentResult | ConsensusResult,
    isConsensus: boolean,
  ): string {
    const parts: string[] = [];

    // Source analysis summary
    parts.push(
      `Source Classification: ${sourceAnalysis.sourceType} (${sourceAnalysis.domain} domain)`,
    );

    if (sourceAnalysis.authoritySignals?.length > 0) {
      parts.push(`Authority Signals: ${sourceAnalysis.authoritySignals.join(", ")}`);
    }

    if (sourceAnalysis.commercialIndicators?.length > 0) {
      parts.push(`Commercial Indicators: ${sourceAnalysis.commercialIndicators.join(", ")}`);
    }

    // Rules application
    if (instructionPayload.allowedDimensions && instructionPayload.allowedDimensions.length > 0) {
      parts.push(
        `Applied ${instructionPayload.allowedDimensions.length} assessment dimensions: ${instructionPayload.allowedDimensions.join(", ")}`,
      );
    }

    if (
      instructionPayload.prohibitedAssessments &&
      instructionPayload.prohibitedAssessments.length > 0
    ) {
      parts.push(`Prohibited assessments: ${instructionPayload.prohibitedAssessments.join(", ")}`);
    }

    // AI assessment summary
    if (isConsensus && isConsensusResult(aiResult)) {
      parts.push(
        `Consensus Mode: ${aiResult.consensusStrength?.toFixed(2) || "N/A"} agreement between providers`,
      );
      if (aiResult.disagreements?.length > 0) {
        parts.push(`Key disagreements: ${aiResult.disagreements.slice(0, 2).join("; ")}`);
      }
    } else if (isAIAssessmentResult(aiResult)) {
      const provider = aiResult.metadata?.provider || "Unknown";
      parts.push(`Single Provider Assessment: ${provider}`);
    }

    // Extract reasoning from AI
    const aiReasoning = isConsensusResult(aiResult)
      ? aiResult.primaryResult?.reasoning
      : isAIAssessmentResult(aiResult)
        ? aiResult.reasoning
        : [];
    if (aiReasoning) {
      const reasoningText = Array.isArray(aiReasoning) ? aiReasoning.join("; ") : aiReasoning;
      if (reasoningText && reasoningText.length > 0) {
        parts.push(
          `AI Analysis: ${reasoningText.substring(0, 200)}${reasoningText.length > 200 ? "..." : ""}`,
        );
      }
    }

    return parts.join("\n\n");
  }

  /**
   * Generate assessment notes
   */
  private generateAssessmentNotes(
    sourceAnalysis: SourceAnalysis,
    aiResult: AIAssessmentResult | ConsensusResult,
    isConsensus: boolean,
  ): string[] {
    const notes: string[] = [];

    // Source-specific notes
    switch (sourceAnalysis.sourceType) {
      case "academic":
        notes.push("Academic source assessed with strict peer-review standards");
        break;
      case "government":
        notes.push("Government source assessed for official accuracy and authority");
        break;
      case "news":
        notes.push("News source evaluated for journalistic standards and bias");
        break;
      case "wikipedia":
        notes.push("Wikipedia content assessed for citation quality and neutrality");
        break;
      case "forum":
        notes.push("Forum content evaluated with increased scrutiny for reliability");
        break;
    }

    // Consensus-specific notes
    if (isConsensus && isConsensusResult(aiResult)) {
      if (aiResult.consensusStrength > 0.8) {
        notes.push("High consensus achieved between multiple AI models");
      } else if (aiResult.consensusStrength > 0.6) {
        notes.push("Moderate consensus between AI models - weighted by confidence");
      } else {
        notes.push("Low consensus between AI models - conservative assessment applied");
      }
    }

    // Note: AI-provided notes functionality disabled as assessmentNotes doesn't exist in current interfaces

    return notes;
  }

  /**
   * Apply custom validation rules
   */
  private async applyCustomValidation(
    score: number,
    confidence: number,
    factors: Record<string, FactorAnalysis>,
    sourceType: string,
  ): Promise<void> {
    const validation = this.config.customValidation!;

    // Check additional prohibited assessments
    if (validation.additionalProhibited) {
      for (const prohibited of validation.additionalProhibited) {
        if (Object.keys(factors).some((factor) => factor.includes(prohibited))) {
          throw new Error(`Custom prohibited assessment detected: ${prohibited}`);
        }
      }
    }

    // Check custom confidence thresholds
    if (validation.confidenceThresholds?.[sourceType]) {
      const threshold = validation.confidenceThresholds[sourceType];
      if (confidence < threshold) {
        throw new Error(
          `Confidence ${confidence} below custom threshold ${threshold} for ${sourceType}`,
        );
      }
    }

    // Check custom scoring boundaries
    if (validation.scoringBoundaries?.[sourceType]) {
      const bounds = validation.scoringBoundaries[sourceType];
      if (score < bounds.min || score > bounds.max) {
        throw new Error(
          `Score ${score} outside custom bounds ${bounds.min}-${bounds.max} for ${sourceType}`,
        );
      }
    }
  }

  /**
   * Extract provider names from AI result
   */
  private extractProvidersUsed(aiResult: AIAssessmentResult | ConsensusResult): string[] {
    if ("consensusStrength" in aiResult && "finalScore" in aiResult) {
      const providers: string[] = [];
      if (aiResult.primaryResult?.metadata?.provider) {
        providers.push(aiResult.primaryResult.metadata.provider);
      }
      if (aiResult.secondaryResults) {
        providers.push(
          ...aiResult.secondaryResults
            .filter((r: AIAssessmentResult) => r?.metadata?.provider)
            .map((r: AIAssessmentResult) => r.metadata.provider),
        );
      }
      const normalized = providers.flatMap((p) => [p, p.split("-")[0]]);
      return normalized.length > 0 ? Array.from(new Set(normalized)) : ["consensus"];
    }
    if (aiResult?.metadata?.provider) {
      const base = aiResult.metadata.provider.split("-")[0];
      return Array.from(new Set([aiResult.metadata.provider, base]));
    }
    return ["unknown"];
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: ReliabilityAssessmentRequest): string {
    const keyData = {
      url: request.sourceUrl,
      priority: request.priority || "normal",
      forceConsensus: request.forceConsensus || false,
      customInstructions: request.customInstructions || {},
      algorithmVersion: this.version,
    };
    return btoa(JSON.stringify(keyData)).replaceAll(/[^a-zA-Z0-9]/g, "");
  }

  /**
   * Generate unique assessment ID
   */
  private generateAssessmentId(): string {
    return `assess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    if (!this.config.aiEngine) {
      throw new Error("AI engine configuration is required");
    }

    if (this.config.assessmentTimeout && this.config.assessmentTimeout < 1000) {
      throw new Error("Assessment timeout must be at least 1000ms");
    }
  }

  /**
   * Update assessment status
   */
  private async updateStatus(status: AssessmentStatus): Promise<void> {
    for (const listener of this.eventListeners) {
      try {
        listener.onStatusChange?.(status);
      } catch (error) {
        this.log("warn", "Event listener error", { error });
      }
    }
  }

  /**
   * Notify assessment completion
   */
  private async notifyComplete(result: ReliabilityAssessmentResult): Promise<void> {
    for (const listener of this.eventListeners) {
      try {
        listener.onComplete?.(result);
      } catch (error) {
        this.log("warn", "Event listener error", { error });
      }
    }
  }

  /**
   * Notify assessment error
   */
  private async notifyError(error: ReliabilityAssessmentError): Promise<void> {
    for (const listener of this.eventListeners) {
      try {
        listener.onError?.(error);
      } catch (error) {
        this.log("warn", "Event listener error", { error });
      }
    }
  }

  /**
   * Log message to event listeners
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (this.config.enableDebugLogging || level !== "debug") {
      for (const listener of this.eventListeners) {
        try {
          listener.onLog?.(level, message, data);
        } catch (error) {
          console.warn("Logging event listener error:", error);
        }
      }
    }
  }

  /**
   * Create typed reliability error
   */
  private createError(
    type: ReliabilityAssessmentError["type"],
    message: string,
    originalError?: unknown,
  ): ReliabilityAssessmentError {
    const recoverable = ["TIMEOUT_EXCEEDED", "CONTENT_FETCH_FAILED"].includes(type);
    return {
      name: "ReliabilityAssessmentError",
      message,
      type,
      details: originalError,
      recoverable,
      stack: new Error(message).stack,
    } as ReliabilityAssessmentError;
  }

  /**
   * Wrap unknown error as reliability error
   */
  private wrapError(error: unknown): ReliabilityAssessmentError {
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      typeof (error as any).type === "string"
    ) {
      return error as ReliabilityAssessmentError;
    }
    const message =
      error && typeof error === "object" && "message" in error
        ? (error as any).message
        : String(error);
    return this.createError("AI_ASSESSMENT_FAILED", message, error);
  }

  /**
   * Perform Multi-Agent Debate assessment
   */
  public async assessWithMAD(
    request: ReliabilityAssessmentRequest & {
      claim: string;
      madOptions?: {
        maxRounds?: number;
        temperature?: number;
        useRAGVerification?: boolean;
        useFallacyDetection?: boolean;
        useSelfConsistency?: boolean;
      };
    },
  ): Promise<ReliabilityAssessmentResult | BackgroundAssessmentResponse> {
    if (!this.cotEngine.isMADAvailable()) {
      throw this.createError(
        "CONFIGURATION_ERROR",
        "MAD framework not available - requires Claude and GPT providers",
      );
    }

    const assessmentId = this.generateAssessmentId();
    this.log("info", "Starting MAD assessment", {
      url: request.sourceUrl,
      claim: request.claim,
      assessmentId,
    });

    try {
      // If background processing requested
      if ((request as any).backgroundAnalysis) {
        const taskId = await this.cotEngine.startMADTask(
          request.claim,
          request.sourceUrl,
          (request as any).context,
          request.madOptions,
        );

        return {
          taskId,
          status: "pending" as BackgroundAssessmentResponse["status"],
          message: "MAD analysis started in background",
        };
      }

      // Synchronous MAD processing
      const taskId = await this.cotEngine.startMADTask(
        request.claim,
        request.sourceUrl,
        (request as any).context,
        request.madOptions,
      );

      // Wait for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes timeout

      while (attempts < maxAttempts) {
        const task = this.cotEngine.getTask(taskId);
        if (!task) break;

        if (task.status === "completed") {
          const madResult = this.cotEngine.getMADResult(taskId);
          if (madResult) {
            return this.convertMADResultToReliabilityResult(madResult, assessmentId, request);
          }
        } else if (task.status === "failed") {
          throw this.createError(
            "AI_ASSESSMENT_FAILED",
            `MAD assessment failed: ${task.error}`,
            task.error,
          );
        }

        const delay = process.env.NODE_ENV === "test" ? 50 : 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempts++;
      }

      throw this.createError("TIMEOUT_EXCEEDED", "MAD assessment timed out");
    } catch (error) {
      this.log("error", "MAD assessment failed", { error, assessmentId });
      throw error;
    }
  }

  /**
   * Check if Multi-Agent Debate is available
   */
  public isMADAvailable(): boolean {
    return this.cotEngine.isMADAvailable();
  }

  /**
   * Get background MAD task result
   */
  public async getMADTaskResult(taskId: string): Promise<ReliabilityAssessmentResult | null> {
    const madResult = this.cotEngine.getMADResult(taskId);
    if (!madResult) return null;

    const assessmentId = this.generateAssessmentId();
    const mockRequest: ReliabilityAssessmentRequest = {
      sourceUrl: madResult.request.source || "",
      priority: "normal",
    };

    return this.convertMADResultToReliabilityResult(madResult, assessmentId, mockRequest);
  }

  /**
   * Convert MAD result to reliability assessment result
   */
  private convertMADResultToReliabilityResult(
    madResult: any,
    assessmentId: string,
    request: ReliabilityAssessmentRequest,
  ): ReliabilityAssessmentResult {
    // Convert MAD score (0=prosecutor wins, 1=defense wins) to reliability score
    const reliabilityScore = madResult.finalScore.finalScore;

    // Determine reliability label based on score
    let reliabilityLabel: string;
    if (reliabilityScore >= 0.8) {
      reliabilityLabel = "high";
    } else if (reliabilityScore >= 0.6) {
      reliabilityLabel = "moderate";
    } else if (reliabilityScore >= 0.4) {
      reliabilityLabel = "low";
    } else {
      reliabilityLabel = "unreliable";
    }

    // Extract reasoning from debate rounds
    const reasoning: string[] = [];
    madResult.rounds.forEach((round: any, index: number) => {
      reasoning.push(
        `Round ${index + 1}: ${round.judgeEvaluation?.reasoning || "No reasoning available"}`,
      );
    });

    // Extract evidence from debate arguments
    const evidence: string[] = [];
    madResult.rounds.forEach((round: any) => {
      if (round.prosecutorArgument.evidence) {
        evidence.push(...round.prosecutorArgument.evidence);
      }
      if (round.defenseArgument.evidence) {
        evidence.push(...round.defenseArgument.evidence);
      }
    });

    return {
      reliabilityScore,
      reliabilityLabel: reliabilityLabel as ReliabilityAssessmentResult["reliabilityLabel"],
      confidence: madResult.finalScore.confidence,
      factorsAnalyzed: {}, // Would need to extract from MAD result
      sourceAnalysis: {} as SourceAnalysis, // Would need to extract from MAD context
      rulesEngineResult: {} as InstructionPayload, // Would need to extract from MAD context
      aiAssessmentResult: {} as AIAssessmentResult, // Would need to extract from MAD result
      reasoning: Array.isArray(reasoning) ? reasoning.join("\n") : reasoning,
      assessmentNotes: Array.isArray(evidence) ? evidence : [],
      processingMetadata: {
        totalProcessingTime: madResult.processingTime,
        rulesEngineTime: 0, // Not applicable for MAD
        aiAssessmentTime: madResult.processingTime,
        validationTime: 0, // Not applicable for MAD
        assessmentTimestamp: new Date(),
        algorithmVersion: this.version,
        consensusModeUsed: false,
        providersUsed: ["claude", "gpt"],
        warnings: [],
      },
    };
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: ReliabilityEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: ReliabilityEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get system health status
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean;
    rulesEngine: { healthy: boolean };
    aiEngine: { healthy: boolean; providers: Record<string, unknown>; errors?: string[] };
    cache?: { healthy: boolean };
    version: string;
  }> {
    const aiHealth = await this.aiEngine.getHealthStatus();

    return {
      healthy: aiHealth.healthy,
      rulesEngine: { healthy: true }, // Rules engine has no async dependencies
      aiEngine: aiHealth,
      cache: this.cache ? { healthy: true } : undefined, // Basic cache health check
      version: this.version,
    };
  }

  /**
   * Get assessment statistics (if monitoring enabled)
   */
  public getStatistics(): {
    version: string;
    eventListenersCount: number;
    cacheEnabled: boolean;
    contentFetcherEnabled: boolean;
    debugLogging: boolean;
  } {
    return {
      version: this.version,
      eventListenersCount: this.eventListeners.length,
      cacheEnabled: !!this.cache,
      contentFetcherEnabled: !!this.contentFetcher,
      debugLogging: !!this.config.enableDebugLogging,
    };
  }
}
