import type { PromptManager } from "./prompt-manager.js";
import type {
  AIAssessmentRequest,
  AIAssessmentResult,
  AIEngineError,
  AIProviderConfig,
  FactorAnalysis,
  ProcessingMetrics,
} from "./types.js";

/**
 * Claude Sonnet Integration
 * Primary AI provider for the assessment engine (95% of volume)
 */
export class ClaudeProvider {
  private readonly config: AIProviderConfig;
  private readonly promptManager: PromptManager;
  private requestCounter: number = 0;

  constructor(config: AIProviderConfig, promptManager: PromptManager) {
    this.config = config;
    this.promptManager = promptManager;
    this.validateConfig();
  }

  /**
   * Perform reliability assessment using Claude Sonnet
   */
  public async assess(request: AIAssessmentRequest): Promise<AIAssessmentResult> {
    const requestId = this.generateRequestId();
    const metrics: ProcessingMetrics = {
      requestId,
      startTime: new Date(),
      provider: "claude-sonnet",
      model: this.config.model,
      tokensUsed: 0,
      success: false,
      retryCount: 0,
    };

    try {
      // Get appropriate prompt template
      const template = this.promptManager.getTemplate(
        request.instructionPayload.sourceType,
        request.requireConsensus,
      );

      // Build prompt from template
      const { systemPrompt, userPrompt } = this.promptManager.buildPrompt(
        template,
        request.instructionPayload,
        request.sourceAnalysis,
        request.sourceContent,
        request.sourceUrl,
      );

      // Call Claude API
      const claudeResponse = await this.callClaudeAPI(
        systemPrompt,
        userPrompt,
        request.instructionPayload.temperature || this.config.temperature || 0.2,
        requestId,
      );

      // Parse and validate response
      const assessmentResult = await this.parseResponse(
        claudeResponse,
        request,
        metrics,
        requestId,
      );

      metrics.success = true;
      metrics.endTime = new Date();
      metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();

      return assessmentResult;
    } catch (error) {
      metrics.success = false;
      metrics.endTime = new Date();
      metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();

      throw this.handleError(error, requestId);
    }
  }

  /**
   * Check if the provider is available and healthy
   */
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();

    try {
      const testResponse = await fetch(`${this.getAPIUrl()}/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (testResponse.ok) {
        return {
          healthy: true,
          latency: Date.now() - start,
        };
      } else {
        return {
          healthy: false,
          error: `API returned ${testResponse.status}`,
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get provider configuration
   */
  public getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  /**
   * Call Claude API with proper error handling and retries
   */
  private async callClaudeAPI(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    requestId: string,
  ): Promise<any> {
    const timeoutMs = this.config.timeout ?? 30000;
    const payload = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };

    const response = await fetch(this.getAPIUrl(), {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorBody}`);
    }

    return await response.json();
  }

  /**
   * Parse Claude response into standardized assessment result
   */
  private async parseResponse(
    claudeResponse: any,
    request: AIAssessmentRequest,
    metrics: ProcessingMetrics,
    requestId: string,
  ): Promise<AIAssessmentResult> {
    // Extract content from Claude response
    const content = claudeResponse.content?.[0]?.text || claudeResponse.message?.content;
    if (!content) {
      throw new Error("No content in Claude response");
    }

    // Update token usage
    metrics.tokensUsed = claudeResponse.usage?.total_tokens || 0;

    // Try to parse JSON from response
    let parsedContent: any;
    try {
      // Claude sometimes wraps JSON in markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        // Fallback: try to parse entire content
        parsedContent = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`Failed to parse Claude response as JSON: ${error}`);
    }

    // Validate and normalize the parsed content
    return this.normalizeAssessmentResult(parsedContent, request, metrics, requestId);
  }

  /**
   * Normalize parsed response into standard format
   */
  private normalizeAssessmentResult(
    parsed: any,
    request: AIAssessmentRequest,
    metrics: ProcessingMetrics,
    requestId: string,
  ): AIAssessmentResult {
    // Validate required fields
    if (typeof parsed.reliabilityScore !== "number") {
      throw new TypeError("Missing or invalid reliabilityScore in response");
    }

    if (typeof parsed.confidence !== "number") {
      throw new TypeError("Missing or invalid confidence in response");
    }

    // Ensure score is within bounds
    const score = Math.max(
      request.instructionPayload.minScore,
      Math.min(request.instructionPayload.maxScore, parsed.reliabilityScore),
    );

    // Convert score to reliability label
    const label = this.scoreToLabel(score);

    // Normalize factor analysis
    const factorsAnalyzed: Record<string, FactorAnalysis> = {};

    if (parsed.factorsAnalyzed) {
      for (const [factor, analysis] of Object.entries(parsed.factorsAnalyzed)) {
        if (request.instructionPayload.allowedDimensions.includes(factor)) {
          factorsAnalyzed[factor] = this.normalizeFactorAnalysis(analysis as any, factor);
        }
      }
    }

    // Build prohibited check confirmation
    const prohibitedCheck: Record<string, boolean> = {};
    for (const prohibited of request.instructionPayload.prohibitedAssessments) {
      prohibitedCheck[prohibited] = !Object.keys(factorsAnalyzed).includes(prohibited);
    }

    return {
      reliabilityScore: score,
      reliabilityLabel: label,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      factorsAnalyzed,
      prohibitedCheck,
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      metadata: {
        provider: "claude-sonnet",
        model: this.config.model,
        processingTime: metrics.duration || 0,
        tokensUsed: metrics.tokensUsed,
        temperature: request.instructionPayload.temperature || 0.2,
        requestId,
      },
    };
  }

  /**
   * Normalize individual factor analysis
   */
  private normalizeFactorAnalysis(analysis: any, factor: string): FactorAnalysis {
    return {
      factor,
      score: typeof analysis.score === "number" ? analysis.score : 0,
      weight: typeof analysis.weight === "number" ? analysis.weight : 0,
      confidence:
        typeof analysis.confidence === "number"
          ? Math.max(0, Math.min(1, analysis.confidence))
          : 0.5,
      reasoning: Array.isArray(analysis.reasoning) ? analysis.reasoning : [],
      evidence: Array.isArray(analysis.evidence) ? analysis.evidence : [],
    };
  }

  /**
   * Convert reliability score to label
   */
  private scoreToLabel(score: number) {
    if (score >= 0.8) return "high";
    if (score >= 0.6) return "moderate";
    if (score >= 0.3) return "low";
    return "unreliable";
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `claude-${Date.now()}-${++this.requestCounter}`;
  }

  /**
   * Get API URL based on configuration
   */
  private getAPIUrl(): string {
    return this.config.baseUrl || "https://api.anthropic.com/v1/messages";
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-API-Key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: any, requestId: string): AIEngineError {
    if (error instanceof Error) {
      // Network or timeout errors
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return {
          code: "TIMEOUT",
          message: "Claude API request timed out",
          provider: "claude-sonnet",
          retryable: true,
          details: { requestId, originalError: error.message },
        };
      }

      // API errors
      if (error.message.includes("429")) {
        return {
          code: "RATE_LIMIT",
          message: "Claude API rate limit exceeded",
          provider: "claude-sonnet",
          retryable: true,
          details: { requestId },
        };
      }

      if (error.message.includes("401") || error.message.includes("403")) {
        return {
          code: "AUTH_ERROR",
          message: "Claude API authentication failed",
          provider: "claude-sonnet",
          retryable: false,
          details: { requestId },
        };
      }

      // Parsing errors
      if (error.message.includes("parse") || error.message.includes("JSON")) {
        return {
          code: "PARSE_ERROR",
          message: "Failed to parse Claude response",
          provider: "claude-sonnet",
          retryable: false,
          details: { requestId, originalError: error.message },
        };
      }
    }

    // Generic error
    return {
      code: "UNKNOWN_ERROR",
      message: error?.message || "Unknown error occurred",
      provider: "claude-sonnet",
      retryable: false,
      details: { requestId },
    };
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("Claude API key is required");
    }

    if (!this.config.model) {
      throw new Error("Claude model is required");
    }

    if (this.config.maxTokens <= 0) {
      throw new Error("Invalid maxTokens configuration");
    }

    if (this.config.timeout <= 0) {
      throw new Error("Invalid timeout configuration");
    }
  }
}
