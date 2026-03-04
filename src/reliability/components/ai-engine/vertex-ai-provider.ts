/**
 * Vertex AI (dedicated endpoint) integration
 * Uses your deployed model on Vertex AI for reliability assessments.
 * Supports dedicated endpoint URL and Google Application Default Credentials.
 */

import type { PromptManager } from "./prompt-manager.js";
import type {
  AIAssessmentRequest,
  AIAssessmentResult,
  AIProviderConfig,
  FactorAnalysis,
  ProcessingMetrics,
} from "./types.js";

const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

/**
 * Get a Bearer token for Vertex AI using Application Default Credentials.
 */
async function getVertexAccessToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    throw new Error("Vertex AI: failed to obtain access token (ADC)");
  }
  return token;
}

/**
 * Vertex AI dedicated endpoint provider.
 * Endpoint URL format: https://{endpoint-id}.{region}.{project}.prediction.vertexai.goog
 * Use RawPredict for flexible request body (e.g. prompt/content); use Predict for instances/parameters.
 */
export class VertexAIProvider {
  private readonly config: AIProviderConfig;
  private readonly promptManager: PromptManager;
  private requestCounter = 0;

  constructor(config: AIProviderConfig, promptManager: PromptManager) {
    this.config = config;
    this.promptManager = promptManager;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.vertexEndpointUrl?.trim()) {
      throw new Error("Vertex AI provider requires vertexEndpointUrl");
    }
    const url = this.config.vertexEndpointUrl.replace(/\/+$/, "");
    if (!url.startsWith("https://")) {
      throw new Error("Vertex AI vertexEndpointUrl must be HTTPS");
    }
    (this.config as any).vertexEndpointUrl = url;
  }

  private getPredictUrl(): string {
    const base = (this.config as any).vertexEndpointUrl as string;
    return this.config.vertexUseRawPredict ? `${base}/v1:rawPredict` : `${base}/v1:predict`;
  }

  public async assess(request: AIAssessmentRequest): Promise<AIAssessmentResult> {
    const requestId = this.generateRequestId();
    const metrics: ProcessingMetrics = {
      requestId,
      startTime: new Date(),
      provider: "vertex-ai",
      model: this.config.model,
      tokensUsed: 0,
      success: false,
      retryCount: 0,
    };

    try {
      const template = this.promptManager.getTemplate(
        request.instructionPayload.sourceType,
        request.requireConsensus,
      );
      const { systemPrompt, userPrompt } = this.promptManager.buildPrompt(
        template,
        request.instructionPayload,
        request.sourceAnalysis,
        request.sourceContent,
        request.sourceUrl,
      );

      const temperature = request.instructionPayload.temperature ?? this.config.temperature ?? 0.2;
      const rawContent = await this.callVertexAPI(systemPrompt, userPrompt, temperature, requestId);

      const assessmentResult = await this.parseResponse(rawContent, request, metrics, requestId);
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

  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await getVertexAccessToken();
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  private generateRequestId(): string {
    this.requestCounter += 1;
    return `vertex-${Date.now()}-${this.requestCounter}`;
  }

  private async callVertexAPI(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    _requestId: string,
  ): Promise<string> {
    const token = await getVertexAccessToken();
    const url = this.getPredictUrl();
    const timeoutMs = this.config.timeout ?? 60000;

    const fullPrompt =
      systemPrompt +
      "\n\nIMPORTANT: You must respond with valid JSON containing the required assessment fields.";

    let body: string;
    if (this.config.vertexUseRawPredict) {
      body = JSON.stringify({
        prompt: fullPrompt + "\n\n" + userPrompt,
        max_tokens: this.config.maxTokens,
        temperature,
      });
    } else {
      body = JSON.stringify({
        instances: [{ prompt: fullPrompt + "\n\n" + userPrompt }],
        parameters: {
          maxOutputTokens: this.config.maxTokens,
          temperature,
        },
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Vertex AI API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      predictions?: unknown[];
      error?: string;
      [key: string]: unknown;
    };

    if (data.error) {
      throw new Error(String(data.error));
    }

    const predictions = data.predictions;
    if (!Array.isArray(predictions) || predictions.length === 0) {
      throw new Error("Vertex AI response missing predictions");
    }

    const first = predictions[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      if (typeof obj.content === "string") return obj.content;
      if (typeof obj.text === "string") return obj.text;
      if (typeof obj.prediction === "string") return obj.prediction;
      if (typeof obj.output === "string") return obj.output;
      try {
        return JSON.stringify(first);
      } catch {
        return String(first);
      }
    }
    return String(first);
  }

  private async parseResponse(
    rawContent: string,
    request: AIAssessmentRequest,
    metrics: ProcessingMetrics,
    requestId: string,
  ): Promise<AIAssessmentResult> {
    let parsed: Record<string, unknown>;
    try {
      const jsonMatch =
        rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as Record<string, unknown>;
      } else {
        parsed = JSON.parse(rawContent) as Record<string, unknown>;
      }
    } catch (error) {
      throw new Error(`Failed to parse Vertex AI response as JSON: ${error}`);
    }

    return this.normalizeAssessmentResult(parsed, request, metrics, requestId);
  }

  private normalizeAssessmentResult(
    parsed: Record<string, unknown>,
    request: AIAssessmentRequest,
    metrics: ProcessingMetrics,
    requestId: string,
  ): AIAssessmentResult {
    if (typeof parsed.reliabilityScore !== "number") {
      throw new TypeError("Missing or invalid reliabilityScore in Vertex response");
    }
    if (typeof parsed.confidence !== "number") {
      throw new TypeError("Missing or invalid confidence in Vertex response");
    }

    const score = Math.max(
      request.instructionPayload.minScore,
      Math.min(request.instructionPayload.maxScore, parsed.reliabilityScore as number),
    );
    const label = this.scoreToLabel(score);

    const factorsAnalyzed: Record<string, FactorAnalysis> = {};
    if (parsed.factorsAnalyzed && typeof parsed.factorsAnalyzed === "object") {
      for (const [factor, analysis] of Object.entries(parsed.factorsAnalyzed)) {
        if (request.instructionPayload.allowedDimensions.includes(factor)) {
          factorsAnalyzed[factor] = this.normalizeFactorAnalysis(
            analysis as Record<string, unknown>,
            factor,
          );
        }
      }
    }

    const prohibitedCheck: Record<string, boolean> = {};
    for (const prohibited of request.instructionPayload.prohibitedAssessments) {
      prohibitedCheck[prohibited] = !Object.hasOwn(factorsAnalyzed, prohibited);
    }

    return {
      reliabilityScore: score,
      reliabilityLabel: label,
      confidence: Math.max(0, Math.min(1, parsed.confidence as number)),
      factorsAnalyzed,
      prohibitedCheck,
      reasoning: Array.isArray(parsed.reasoning) ? (parsed.reasoning as string[]) : [],
      evidence: Array.isArray(parsed.evidence) ? (parsed.evidence as string[]) : [],
      metadata: {
        provider: "vertex-ai",
        model: this.config.model,
        processingTime: metrics.duration ?? 0,
        tokensUsed: metrics.tokensUsed,
        temperature: request.instructionPayload.temperature ?? 0.2,
        requestId,
      },
    };
  }

  private normalizeFactorAnalysis(
    analysis: Record<string, unknown>,
    factor: string,
  ): FactorAnalysis {
    return {
      factor,
      score: typeof analysis.score === "number" ? analysis.score : 0,
      weight: typeof analysis.weight === "number" ? analysis.weight : 0,
      confidence: typeof analysis.confidence === "number" ? analysis.confidence : 0,
      reasoning: Array.isArray(analysis.reasoning) ? (analysis.reasoning as string[]) : [],
      evidence: Array.isArray(analysis.evidence) ? (analysis.evidence as string[]) : [],
    };
  }

  private scoreToLabel(score: number): "high" | "moderate" | "low" | "unreliable" {
    if (score >= 80) return "high";
    if (score >= 60) return "moderate";
    if (score >= 40) return "low";
    return "unreliable";
  }

  private handleError(error: unknown, requestId: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Vertex AI assessment failed (${requestId}): ${message}`);
  }
}
