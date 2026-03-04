/**
 * RAG Pipeline
 * Combines code search + LLM to generate fixes
 */

import type { Logger } from "winston";
import type { VertexLLMClient } from "../../llm";
import type { CodeSearchEngine, CodeSearchQuery, CodeSearchResult } from "./code-search";
import type { EmbeddingService } from "./embedding-service";

export interface BugReport {
  agentName: string;
  errorMessage: string;
  stackTrace: string;
  component: string;
  language: string;
  context?: string; // Additional context about the bug
}

export interface RepairSuggestion {
  diagnosis: string;
  rootCause: string;
  fixCode: string;
  confidence: number;
  sources: Array<{
    repo: string;
    path: string;
    license: string;
    relevanceScore: number;
  }>;
  explanation: string;
}

export class RAGRepairPipeline {
  private logger: Logger;
  private search: CodeSearchEngine;
  private llm: VertexLLMClient;
  private embeddingService: EmbeddingService;

  constructor(
    logger: Logger,
    search: CodeSearchEngine,
    llm: VertexLLMClient,
    embeddingService: EmbeddingService,
  ) {
    this.logger = logger;
    this.search = search;
    this.llm = llm;
    this.embeddingService = embeddingService;
  }

  /**
   * Generate fix for a bug using RAG
   */
  async generateFix(bug: BugReport): Promise<RepairSuggestion> {
    this.logger.info(`Generating fix for ${bug.agentName}...`);

    try {
      // Step 1: Extract keywords from error
      const keywords = this.extractKeywords(bug);

      // Step 2: Search Stack v2 for similar fixes
      const searchQuery: CodeSearchQuery = {
        language: bug.language,
        errorType: this.classifyError(bug.errorMessage),
        keywords,
        contextPath: this.inferContextPath(bug.component),
        maxResults: 10,
        licenseTypes: ["permissive", "no_license"],
      };

      const codeExamples = await this.search.search(searchQuery);

      if (codeExamples.length === 0) {
        this.logger.warn("No code examples found, generating fix without examples");
        return this.generateFixWithoutExamples(bug);
      }

      // Step 3: Build LLM prompt with examples
      const prompt = this.buildPrompt(bug, codeExamples);

      // Step 4: Generate fix using LLM
      const response = await this.llm.complete(prompt, {
        model: process.env.OPENAI_MODEL || "gpt-4",
        temperature: 0.2,
        maxTokens: 2000,
      } as any);

      // Step 5: Parse response
      const suggestion = this.parseResponse(response, codeExamples);

      this.logger.info(`Fix generated with confidence: ${suggestion.confidence}`);

      return suggestion;
    } catch (error) {
      this.logger.error("Failed to generate fix:", {
        error: error instanceof Error ? error.message : String(error),
        bug,
      });
      throw error;
    }
  }

  /**
   * Extract keywords from bug report
   */
  private extractKeywords(bug: BugReport): string[] {
    const keywords: string[] = [];

    // Extract from stack trace
    const stackMatches = bug.stackTrace.match(/at\s+(\w+\.)*(\w+)/g) || [];
    stackMatches.forEach((match) => {
      if (typeof match === "string") {
        const parts = match.replace(/\s+at\s+/, "").split(".");
        keywords.push(...parts.filter((p) => p.length > 2));
      }
    });

    // Extract from error message
    const errorWords = bug.errorMessage
      .split(/\s+/)
      .filter((w) => w.length > 3 && /^[A-Z]/.test(w)); // Capitalized words (likely class names)
    keywords.push(...errorWords);

    // Extract from component name
    if (bug.component) {
      keywords.push(bug.component);
    }

    // Remove duplicates and limit
    return Array.from(new Set(keywords)).slice(0, 10);
  }

  /**
   * Classify error type
   */
  private classifyError(message: string): string {
    const msg = message.toLowerCase();

    if (msg.includes("memory") || msg.includes("leak")) return "memory-leak";
    if (msg.includes("null") || msg.includes("undefined")) return "null-pointer";
    if (msg.includes("timeout") || msg.includes("expired")) return "timeout";
    if (msg.includes("connection") || msg.includes("socket")) return "connection-error";
    if (msg.includes("async") || msg.includes("promise")) return "async-error";
    if (msg.includes("type") && msg.includes("error")) return "type-error";

    return "unknown";
  }

  /**
   * Infer context path from component name
   */
  private inferContextPath(component: string): string {
    if (component.includes("Agent")) return "src/agents/";
    if (component.includes("API") || component.includes("api")) return "src/api/";
    if (component.includes("Database") || component.includes("db")) return "src/database/";
    if (component.includes("Service")) return "src/services/";
    return "src/";
  }

  /**
   * Build LLM prompt with code examples
   */
  private buildPrompt(bug: BugReport, examples: CodeSearchResult[]): string {
    const examplesText = examples
      .slice(0, 5) // Top 5 examples
      .map(
        (ex, i) => `
Example ${i + 1} (from ${ex.repo}, relevance: ${(ex.relevanceScore * 100).toFixed(0)}%):
File: ${ex.path}
License: ${ex.license}

\`\`\`${ex.language}
${ex.content.substring(0, 800)}${ex.content.length > 800 ? "..." : ""}
\`\`\`
`,
      )
      .join("\n");

    return `You are an expert code repair assistant. Diagnose and fix this bug in the ${bug.agentName} component.

ERROR DETAILS:
- Agent: ${bug.agentName}
- Component: ${bug.component}
- Language: ${bug.language}
- Error: ${bug.errorMessage}
- Stack Trace:
${bug.stackTrace.substring(0, 1000)}${bug.stackTrace.length > 1000 ? "..." : ""}
${bug.context ? `- Context: ${bug.context}` : ""}

SIMILAR CODE EXAMPLES FROM OPEN SOURCE:
${examplesText}

TASK:
1. Diagnose what caused this error
2. Identify the root cause
3. Generate a fix (code snippet) that can be applied
4. Provide confidence score (0.0-1.0)

RESPONSE FORMAT (JSON):
{
  "diagnosis": "Brief description of what caused the error",
  "rootCause": "Why this error occurred",
  "fixCode": "The code fix to apply (complete function/class if needed)",
  "confidence": 0.85,
  "explanation": "Why this fix should work"
}

Only return valid JSON, no markdown formatting.`;
  }

  /**
   * Parse LLM response
   */
  private parseResponse(response: string, examples: CodeSearchResult[]): RepairSuggestion {
    try {
      // Try to extract JSON from response
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/```json?\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      }

      const parsed = JSON.parse(jsonStr);

      return {
        diagnosis: parsed.diagnosis || "Unknown diagnosis",
        rootCause: parsed.rootCause || "Unknown root cause",
        fixCode: parsed.fixCode || "",
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        explanation: parsed.explanation || "",
        sources: examples.slice(0, 5).map((ex) => ({
          repo: ex.repo,
          path: ex.path,
          license: ex.license,
          relevanceScore: ex.relevanceScore,
        })),
      };
    } catch (error) {
      this.logger.warn("Failed to parse LLM response, using fallback:", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback response
      return {
        diagnosis: "Unable to parse diagnosis from LLM",
        rootCause: "Analysis incomplete",
        fixCode: "",
        confidence: 0.3,
        explanation: "LLM response parsing failed",
        sources: examples.slice(0, 5).map((ex) => ({
          repo: ex.repo,
          path: ex.path,
          license: ex.license,
          relevanceScore: ex.relevanceScore,
        })),
      };
    }
  }

  /**
   * Generate fix without code examples (fallback)
   */
  private async generateFixWithoutExamples(bug: BugReport): Promise<RepairSuggestion> {
    const prompt = `Diagnose and fix this bug:

Agent: ${bug.agentName}
Error: ${bug.errorMessage}
Stack Trace: ${bug.stackTrace.substring(0, 500)}

Provide a fix as JSON with diagnosis, rootCause, fixCode, confidence, and explanation.`;

    try {
      const response = await this.llm.complete(prompt, {
        model: process.env.OPENAI_MODEL || "gpt-4",
        temperature: 0.2,
      } as any);

      return this.parseResponse(response, []);
    } catch (error) {
      this.logger.error("Failed to generate fix without examples:", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        diagnosis: "Unable to generate fix",
        rootCause: "No code examples found and LLM generation failed",
        fixCode: "",
        confidence: 0.1,
        explanation: "Both code search and LLM generation failed",
        sources: [],
      };
    }
  }
}
