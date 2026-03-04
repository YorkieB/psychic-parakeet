import type { PromptManager } from "./prompt-manager.js";
import type {
  AIAssessmentRequest,
  AIAssessmentResult,
  AIEngineError,
  AIProviderConfig,
  ProcessingMetrics,
} from "./types.js";

/**
 * GPT-4o Integration
 * Secondary AI provider for consensus mode and validation
 */
export class GPTProvider {
  private readonly config: AIProviderConfig;
  private readonly promptManager: PromptManager;
  private requestCounter: number = 0;

  constructor(config: AIProviderConfig, promptManager: PromptManager) {
    this.config = config;
    this.promptManager = promptManager;
    this.validateConfig();
  }

  /**
   * Perform reliability assessment using GPT-4o
   */
  public async assess(request: AIAssessmentRequest): Promise<AIAssessmentResult> {
    const requestId = this.generateRequestId();
    const metrics: ProcessingMetrics = {
      requestId,
      startTime: new Date(),
      provider: "gpt-4o",
      model: this.config.model,
      tokensUsed: 0,
      success: false,
      retryCount: 0,
    };

    try {
      // Get consensus template for GPT (always use consensus mode for secondary)
      const template = this.promptManager.getTemplate("consensus", true);

      // Build prompt from template
      const { systemPrompt, userPrompt } = this.promptManager.buildPrompt(
        template,
        request.instructionPayload,
        request.sourceAnalysis,
        request.sourceContent,
        request.sourceUrl,
      );

      // Call OpenAI API (add JSON instruction for response format)
      const jsonSystemPrompt =
        systemPrompt +
        "\n\nIMPORTANT: You must respond with valid JSON format containing the required fields.";
      const gptResponse = await this.callOpenAIAPI(
        jsonSystemPrompt,
        userPrompt,
        request.instructionPayload.temperature || this.config.temperature || 0.2,
        requestId,
      );

      // Parse and validate response
      const assessmentResult = await this.parseResponse(gptResponse, request, metrics, requestId);

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
   * Health check for GPT provider
   */
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();

    try {
      const testResponse = await fetch(`${this.getAPIUrl()}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 10,
        }),
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
   * Call OpenAI API with error handling
   */
  private async callOpenAIAPI(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    requestId: string,
  ): Promise<any> {
    // Ensure the word "json" appears to satisfy OpenAI response_format requirement
    const jsonAwareSystemPrompt = `${systemPrompt}\n\nReturn a json object containing reliabilityScore, confidence, reasoning, and evidence fields.`;

    const payload = {
      model: this.config.model,
      messages: [
        { role: "system", content: jsonAwareSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: this.config.maxTokens,
      temperature,
      response_format: { type: "json_object" }, // Force JSON response
    };

    const timeoutMs = this.config.timeout ?? 30000;

    const response = await fetch(this.getAPIUrl(), {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    return await response.json();
  }

  /**
   * Parse GPT response into standardized assessment result
   */
  private async parseResponse(
    gptResponse: any,
    request: AIAssessmentRequest,
    metrics: ProcessingMetrics,
    requestId: string,
  ): Promise<AIAssessmentResult> {
    // Extract content from GPT response
    const content = gptResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in GPT response");
    }

    // Update token usage
    metrics.tokensUsed = gptResponse.usage?.total_tokens || 0;

    // Parse JSON response
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse GPT response as JSON: ${error}`);
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
    // Gracefully handle missing fields by falling back to defaults
    const reliabilityScore =
      typeof parsed.reliabilityScore === "number"
        ? parsed.reliabilityScore
        : typeof parsed.score === "number"
          ? parsed.score
          : 0.5;

    const _confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;

    // Ensure score is within bounds
    const score = Math.max(
      request.instructionPayload.minScore,
      Math.min(request.instructionPayload.maxScore, reliabilityScore),
    );

    // Convert score to reliability label
    const label = this.scoreToLabel(score);

    // Normalize factor analysis
    const factorsAnalyzed: Record<string, any> = {};

    if (parsed.factorsAnalyzed) {
      for (const [factor, analysis] of Object.entries(parsed.factorsAnalyzed)) {
        if (request.instructionPayload.allowedDimensions.includes(factor)) {
          factorsAnalyzed[factor] = {
            factor,
            score: (analysis as any).score || 0,
            weight: (analysis as any).weight || 0,
            confidence: Math.max(0, Math.min(1, (analysis as any).confidence || 0.5)),
            reasoning: Array.isArray((analysis as any).reasoning)
              ? (analysis as any).reasoning
              : [],
            evidence: Array.isArray((analysis as any).evidence) ? (analysis as any).evidence : [],
          };
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
        provider: "gpt-4o",
        model: this.config.model,
        processingTime: metrics.duration || 0,
        tokensUsed: metrics.tokensUsed,
        temperature: request.instructionPayload.temperature || 0.2,
        requestId,
      },
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
    return `gpt-${Date.now()}-${++this.requestCounter}`;
  }

  /**
   * Get API URL
   */
  private getAPIUrl(): string {
    return this.config.baseUrl || "https://api.openai.com/v1/chat/completions";
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
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
          message: "OpenAI API request timed out",
          provider: "gpt-4o",
          retryable: true,
          details: { requestId, originalError: error.message },
        };
      }

      // API errors
      if (error.message.includes("429")) {
        return {
          code: "RATE_LIMIT",
          message: "OpenAI API rate limit exceeded",
          provider: "gpt-4o",
          retryable: true,
          details: { requestId },
        };
      }

      if (error.message.includes("401") || error.message.includes("403")) {
        return {
          code: "AUTH_ERROR",
          message: "OpenAI API authentication failed",
          provider: "gpt-4o",
          retryable: false,
          details: { requestId },
        };
      }

      // Parsing errors
      if (error.message.includes("parse") || error.message.includes("JSON")) {
        return {
          code: "PARSE_ERROR",
          message: "Failed to parse OpenAI response",
          provider: "gpt-4o",
          retryable: false,
          details: { requestId, originalError: error.message },
        };
      }
    }

    // Generic error
    return {
      code: "UNKNOWN_ERROR",
      message: error?.message || "Unknown error occurred",
      provider: "gpt-4o",
      retryable: false,
      details: { requestId },
    };
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    if (!this.config.model) {
      throw new Error("OpenAI model is required");
    }

    if (this.config.maxTokens <= 0) {
      throw new Error("Invalid maxTokens configuration");
    }

    if (this.config.timeout <= 0) {
      throw new Error("Invalid timeout configuration");
    }
  }
}
