import type {
  AIAssessmentResult,
  AIProvider,
  FactorAnalysis,
  InstructionPayload,
} from "./types.js";

type ReliabilityLabel = "high" | "moderate" | "low" | "unreliable";

/**
 * Response Parser - Validates and normalizes AI responses
 * Ensures AI outputs conform to rules engine constraints
 */
export class ResponseParser {
  /**
   * Parse and validate Claude Sonnet response
   */
  public parseClaudeResponse(
    rawResponse: string,
    instructionPayload: InstructionPayload,
  ): AIAssessmentResult {
    try {
      // Extract JSON from response (Claude often includes explanatory text)
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(rawResponse);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return this.validateAndNormalize(parsed, instructionPayload, "claude-sonnet");
    } catch (error) {
      throw new Error(`Failed to parse Claude response: ${error}`);
    }
  }

  /**
   * Parse and validate GPT response
   */
  public parseGPTResponse(
    rawResponse: unknown,
    instructionPayload: InstructionPayload,
  ): AIAssessmentResult {
    try {
      // If GPT response is a string, delegate to parseClaudeResponse
      if (typeof rawResponse === "string") {
        return this.parseClaudeResponse(rawResponse, instructionPayload);
      }

      // Raw response should be an object at this point
      if (typeof rawResponse !== "object" || rawResponse === null) {
        throw new Error("GPT response is not a valid object");
      }

      return this.validateAndNormalize(
        rawResponse as Record<string, unknown>,
        instructionPayload,
        "gpt-4o",
      );
    } catch (error) {
      throw new Error(
        `Failed to parse GPT response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate and normalize parsed response
   */
  private validateAndNormalize(
    parsed: Record<string, unknown>,
    instructionPayload: InstructionPayload,
    provider: AIProvider,
  ): AIAssessmentResult {
    // Validate required fields exist
    this.validateRequiredFields(parsed);

    // Get raw score for validation
    const rawScore = parsed.reliabilityScore || parsed.score || parsed.reliability_score;

    // Normalize score (but don't clamp yet - we'll validate first)
    const normalizedScore = this.normalizeScoreWithoutClamping(rawScore);

    // Validate score bounds BEFORE clamping
    if (
      normalizedScore < instructionPayload.minScore ||
      normalizedScore > instructionPayload.maxScore
    ) {
      throw new Error(
        `Score ${normalizedScore} outside allowed range ${instructionPayload.minScore}-${instructionPayload.maxScore}`,
      );
    }

    // Now clamp it (shouldn't change it since we validated, but ensures consistency)
    const reliabilityScore = Math.max(
      instructionPayload.minScore,
      Math.min(instructionPayload.maxScore, normalizedScore),
    );

    // Normalize confidence
    const confidence = this.normalizeConfidence(parsed.confidence || parsed.confidence_score);

    // Normalize label
    const reliabilityLabel = this.normalizeLabel(
      parsed.reliabilityLabel ||
        parsed.label ||
        parsed.reliability_label ||
        this.scoreToLabel(reliabilityScore),
    );

    // Parse factors analyzed
    const factorsAnalyzed = this.parseFactorsAnalyzed(
      parsed.factorsAnalyzed || parsed.factors || parsed.analysis || {},
      instructionPayload,
    );

    // Extract reasoning
    const reasoning = this.extractReasoning(
      parsed.reasoning || parsed.explanation || parsed.rationale || [],
    );

    // Extract evidence
    const evidence = this.extractEvidence(parsed.evidence || []);

    // Note: assessmentNotes removed from interface, but extraction logic kept for future use

    // Build prohibited check confirmation
    const prohibitedCheck: Record<string, boolean> = {};
    for (const prohibited of instructionPayload.prohibitedAssessments) {
      prohibitedCheck[prohibited] = true; // Confirmed not assessed
    }

    // Validate remaining constraints
    this.validateConstraints(reliabilityScore, confidence, factorsAnalyzed, instructionPayload);

    return {
      reliabilityScore,
      reliabilityLabel,
      confidence,
      factorsAnalyzed,
      prohibitedCheck,
      reasoning,
      evidence,
      metadata: {
        provider,
        model: typeof parsed.model === "string" ? parsed.model : "unknown",
        processingTime: 0, // Will be set by caller
        tokensUsed: typeof parsed.tokensUsed === "number" ? parsed.tokensUsed : 0,
        temperature: instructionPayload.temperature,
        requestId: this.generateApiCallId(),
      },
    };
  }

  /**
   * Validate required fields exist in response
   */
  private validateRequiredFields(parsed: Record<string, unknown>): void {
    const scoreFields = ["reliabilityScore", "score", "reliability_score"];
    const confidenceFields = ["confidence", "confidence_score"];

    const hasScore = scoreFields.some((field) => parsed[field] !== undefined);
    const hasConfidence = confidenceFields.some((field) => parsed[field] !== undefined);

    if (!hasScore) {
      throw new Error(`Missing score field. Expected one of: ${scoreFields.join(", ")}`);
    }

    if (!hasConfidence) {
      throw new Error(`Missing confidence field. Expected one of: ${confidenceFields.join(", ")}`);
    }
  }

  /**
   * Normalize score without clamping (for validation purposes)
   */
  private normalizeScoreWithoutClamping(score: unknown): number {
    let normalized: number;

    if (typeof score === "string") {
      // Handle string scores like "0.75" or "75%"
      if (score.includes("%")) {
        normalized = Number.parseFloat(score.replace("%", "")) / 100;
      } else {
        normalized = Number.parseFloat(score);
      }
    } else if (typeof score === "number") {
      normalized = score;
    } else {
      throw new TypeError(`Invalid score type: ${typeof score}`);
    }

    if (Number.isNaN(normalized)) {
      throw new TypeError(`Could not parse score: ${score}`);
    }

    // If score is >= 10, assume it's a percentage (reliability scores are 0-1, so >= 10 is clearly a percentage)
    if (normalized >= 10 && normalized <= 100) {
      normalized = normalized / 100;
    }

    return Math.round(normalized * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Normalize score to valid range (with clamping)
   */
  private normalizeScore(score: unknown, instructionPayload: InstructionPayload): number {
    const normalized = this.normalizeScoreWithoutClamping(score);

    // Ensure within bounds (clamp)
    const clamped = Math.max(
      instructionPayload.minScore,
      Math.min(instructionPayload.maxScore, normalized),
    );

    return clamped;
  }

  /**
   * Normalize confidence to valid range
   */
  private normalizeConfidence(confidence: unknown): number {
    let normalized: number;

    if (typeof confidence === "string") {
      if (confidence.includes("%")) {
        normalized = Number.parseFloat(confidence.replace("%", "")) / 100;
      } else {
        normalized = Number.parseFloat(confidence);
      }
    } else if (typeof confidence === "number") {
      normalized = confidence;
    } else {
      throw new TypeError(`Invalid confidence type: ${typeof confidence}`);
    }

    if (Number.isNaN(normalized)) {
      throw new TypeError(`Could not parse confidence: ${confidence}`);
    }

    // If confidence is > 1, assume it's a percentage
    if (normalized > 1 && normalized <= 100) {
      normalized = normalized / 100;
    }

    // Ensure within 0-1 range
    normalized = Math.max(0, Math.min(1, normalized));

    return Math.round(normalized * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Normalize reliability label
   */
  private normalizeLabel(label: unknown): ReliabilityLabel {
    if (typeof label !== "string") {
      throw new TypeError(`Invalid label type: ${typeof label}`);
    }

    const normalized = label.toLowerCase().trim();

    // Map various forms to standard labels
    const mappings: Record<string, ReliabilityLabel> = {
      high: "high",
      "high reliability": "high",
      reliable: "high",
      "very reliable": "high",
      excellent: "high",
      good: "high",

      moderate: "moderate",
      medium: "moderate",
      "moderate reliability": "moderate",
      fair: "moderate",
      average: "moderate",
      acceptable: "moderate",

      low: "low",
      "low reliability": "low",
      poor: "low",
      weak: "low",
      questionable: "low",

      unreliable: "unreliable",
      "very low": "unreliable",
      untrustworthy: "unreliable",
      "poor quality": "unreliable",
      "not reliable": "unreliable",
    };

    if (mappings[normalized]) {
      return mappings[normalized];
    }

    throw new Error(`Unknown reliability label: ${label}`);
  }

  /**
   * Parse factors analyzed from various response formats
   */
  private parseFactorsAnalyzed(
    factors: unknown,
    instructionPayload: InstructionPayload,
  ): Record<string, FactorAnalysis> {
    if (!factors || typeof factors !== "object") {
      return {};
    }

    const result: Record<string, FactorAnalysis> = {};

    for (const [key, value] of Object.entries(factors)) {
      this.validateFactorKey(key, instructionPayload);

      if (!this.isFactorAllowed(key, instructionPayload)) {
        continue;
      }

      const factorAnalysis = this.createFactorAnalysis(key, value, instructionPayload);
      if (factorAnalysis) {
        result[key] = factorAnalysis;
      }
    }

    return result;
  }

  /**
   * Extract and clean reasoning text
   */
  private extractReasoning(reasoning: unknown): string[] {
    // Handle array of reasoning strings
    if (Array.isArray(reasoning)) {
      return reasoning
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 10); // Limit to 10 items
    }

    // Handle single string
    if (typeof reasoning === "string") {
      const cleaned = reasoning
        .trim()
        .replaceAll(/\n{3,}/g, "\n\n") // Reduce multiple newlines
        .replaceAll(/\s{2,}/g, " ") // Reduce multiple spaces
        .slice(0, 2000); // Limit length

      return cleaned ? [cleaned] : [];
    }

    return [];
  }

  /**
   * Extract and validate evidence array
   */
  private extractEvidence(evidence: unknown): string[] {
    if (!Array.isArray(evidence)) {
      if (typeof evidence === "string") {
        return [evidence];
      }
      return [];
    }

    return evidence
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 20); // Limit to 20 evidence items
  }

  /**
   * Validate factor key against prohibited assessments
   */
  private validateFactorKey(key: string, instructionPayload: InstructionPayload): void {
    const isProhibited = instructionPayload.prohibitedAssessments.some(
      (prohibited) =>
        key.toLowerCase().includes(prohibited.toLowerCase()) ||
        prohibited.toLowerCase().includes(key.toLowerCase()),
    );

    if (isProhibited) {
      throw new Error(`Prohibited assessment detected: ${key}`);
    }
  }

  /**
   * Check if factor is in allowed dimensions
   */
  private isFactorAllowed(key: string, instructionPayload: InstructionPayload): boolean {
    return instructionPayload.allowedDimensions.some(
      (dim) =>
        key.toLowerCase().includes(dim.toLowerCase()) ||
        dim.toLowerCase().includes(key.toLowerCase()),
    );
  }

  /**
   * Create factor analysis from various value types
   */
  private createFactorAnalysis(
    key: string,
    value: unknown,
    instructionPayload: InstructionPayload,
  ): FactorAnalysis | null {
    if (typeof value === "number") {
      return this.createSimpleFactorAnalysis(key, value, instructionPayload);
    }

    if (typeof value === "object" && value !== null) {
      return this.createStructuredFactorAnalysis(
        key,
        value as Record<string, unknown>,
        instructionPayload,
      );
    }

    return null; // Skip string or other types
  }

  /**
   * Create factor analysis from numeric value
   */
  private createSimpleFactorAnalysis(
    key: string,
    value: number,
    instructionPayload: InstructionPayload,
  ): FactorAnalysis {
    return {
      factor: key,
      score: this.normalizeScore(value, instructionPayload),
      weight: 1 / instructionPayload.allowedDimensions.length,
      confidence: 0.8,
      reasoning: [`${key} assessment`],
      evidence: [],
    };
  }

  /**
   * Create factor analysis from structured object
   */
  private createStructuredFactorAnalysis(
    key: string,
    valueObj: Record<string, unknown>,
    instructionPayload: InstructionPayload,
  ): FactorAnalysis {
    return {
      factor: key,
      score: this.normalizeScore(valueObj.score ?? 0, instructionPayload),
      weight: Math.max(
        0,
        Math.min(
          1,
          typeof valueObj.weight === "number"
            ? valueObj.weight
            : 1 / instructionPayload.allowedDimensions.length,
        ),
      ),
      confidence: Math.max(
        0,
        Math.min(1, typeof valueObj.confidence === "number" ? valueObj.confidence : 0.8),
      ),
      reasoning: this.extractFactorReasoning(valueObj, key),
      evidence: Array.isArray(valueObj.evidence) ? (valueObj.evidence as string[]) : [],
    };
  }

  /**
   * Extract reasoning from factor analysis object
   */
  private extractFactorReasoning(valueObj: Record<string, unknown>, key: string): string[] {
    if (Array.isArray(valueObj.reasoning)) {
      return valueObj.reasoning as string[];
    }

    const reasoningText = valueObj.reasoning || valueObj.explanation;
    if (reasoningText && typeof reasoningText === "string") {
      return [reasoningText];
    }

    return [`${key} assessment`];
  }

  /**
   * Validate all constraints are met
   */
  private validateConstraints(
    score: number,
    confidence: number,
    factorsAnalyzed: Record<string, FactorAnalysis>,
    instructionPayload: InstructionPayload,
  ): void {
    // Score bounds
    if (score < instructionPayload.minScore || score > instructionPayload.maxScore) {
      throw new Error(
        `Score ${score} outside allowed range ${instructionPayload.minScore}-${instructionPayload.maxScore}`,
      );
    }

    // Confidence threshold
    if (confidence < instructionPayload.confidenceThreshold) {
      throw new Error(
        `Confidence ${confidence} below threshold ${instructionPayload.confidenceThreshold}`,
      );
    }

    // Check for prohibited assessments
    for (const prohibited of instructionPayload.prohibitedAssessments) {
      const found = Object.keys(factorsAnalyzed).some((factor) =>
        factor.toLowerCase().includes(prohibited.toLowerCase()),
      );
      if (found) {
        throw new Error(`Prohibited assessment detected: ${prohibited}`);
      }
    }

    // Validate factor weights sum (if multiple factors)
    const factors = Object.values(factorsAnalyzed);
    if (factors.length > 1) {
      const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.1) {
        // Allow 10% tolerance
        if (process.env.NODE_ENV !== "test") {
          console.warn(`Factor weights sum to ${totalWeight}, expected ~1.0`);
        }
      }
    }
  }

  /**
   * Convert score to label (backup method)
   */
  private scoreToLabel(score: number): ReliabilityLabel {
    if (score >= 0.8) return "high";
    if (score >= 0.6) return "moderate";
    if (score >= 0.3) return "low";
    return "unreliable";
  }

  /**
   * Generate unique API call ID
   */
  private generateApiCallId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Validate and extract structured error from response
   */
  public parseErrorResponse(response: unknown): {
    error: string;
    retryable: boolean;
    details?: unknown;
  } {
    if (typeof response === "string") {
      return {
        error: response,
        retryable: false,
      };
    }

    if (response && typeof response === "object") {
      const errorObj = response as Record<string, unknown>;
      const errorMessage = errorObj.error || errorObj.message;
      return {
        error: typeof errorMessage === "string" ? errorMessage : "Unknown error",
        retryable: Boolean(errorObj.retryable) || false,
        details: errorObj.details || errorObj.data,
      };
    }

    return {
      error: "Unknown error format",
      retryable: false,
    };
  }
}
