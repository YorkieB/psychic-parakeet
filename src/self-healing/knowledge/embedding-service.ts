/**
 * Embedding Service
 * Generates embeddings for error signatures and code for semantic search
 */

import type { Logger } from "winston";
import type { VertexLLMClient } from "../../llm";

export interface Embedding {
  vector: number[];
  text: string;
}

export class EmbeddingService {
  private logger: Logger;
  private llm: VertexLLMClient;
  private cache: Map<string, number[]>;

  constructor(logger: Logger, llm: VertexLLMClient) {
    this.logger = logger;
    this.llm = llm;
    this.cache = new Map();
  }

  /**
   * Generate embedding for text
   * Note: Requires OpenAI client with embeddings support
   */
  async embed(text: string): Promise<number[]> {
    // Check cache
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    try {
      // Use OpenAI embeddings API via direct client access
      // This requires the OpenAI client to have embeddings support
      // For now, return a placeholder - embeddings can be added later
      this.logger.warn("Embeddings not yet implemented - using placeholder");

      // Placeholder: return zero vector (embeddings disabled by default)
      const placeholder = new Array(1536).fill(0);
      this.cache.set(text, placeholder);
      return placeholder;
    } catch (error) {
      this.logger.error("Failed to generate embedding:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate embedding for error signature
   */
  async embedError(errorMessage: string, stackTrace: string): Promise<number[]> {
    const signature = this.buildErrorSignature(errorMessage, stackTrace);
    return this.embed(signature);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embeddings must have same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Build error signature from error message and stack trace
   */
  private buildErrorSignature(errorMessage: string, stackTrace: string): string {
    // Extract key information
    const errorType = errorMessage.split(":")[0];
    const functionNames = this.extractFunctionNames(stackTrace);
    const filePaths = this.extractFilePaths(stackTrace);

    return [
      `Error type: ${errorType}`,
      `Functions: ${functionNames.join(", ")}`,
      `Files: ${filePaths.join(", ")}`,
      `Message: ${errorMessage}`,
    ].join("\n");
  }

  /**
   * Extract function names from stack trace
   */
  private extractFunctionNames(stackTrace: string): string[] {
    const matches = stackTrace.match(/\s+at\s+(\w+\.)*(\w+)/g) || [];
    return matches
      .map((m) => m.replace(/\s+at\s+/, "").split(".")[0])
      .filter((name, index, arr) => arr.indexOf(name) === index) // Unique
      .slice(0, 5); // Limit to 5
  }

  /**
   * Extract file paths from stack trace
   */
  private extractFilePaths(stackTrace: string): string[] {
    const matches = stackTrace.match(/\(([^)]+\.(ts|js|tsx|jsx))\)/g) || [];
    return matches
      .map((m) => m.replace(/[()]/g, ""))
      .filter((path, index, arr) => arr.indexOf(path) === index) // Unique
      .slice(0, 5); // Limit to 5
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
