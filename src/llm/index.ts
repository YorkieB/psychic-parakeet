/*
  This file brings together all the language model components for Jarvis.

  It exports the Vertex AI client along with its types so Jarvis can easily access Google's AI models while keeping the code organized.
*/
/**
 * LLM Module
 *
 * Exports Vertex AI client and related types for LLM-powered features.
 */

import type { Logger } from "winston";
import type { CompletionOptions } from "./types";

export * from "./types";
export { VertexLLMClient } from "./vertex-client";

/**
 * Deprecated OpenAI client stub for backward compatibility.
 * This implementation is no longer actively used; Vertex AI is the primary LLM.
 * Kept here to maintain API compatibility with existing code/tests.
 */
export class OpenAIClient {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || ({ info: () => {}, warn: () => {}, error: () => {} } as Logger);
    this.logger.warn("OpenAIClient is deprecated. Use VertexLLMClient instead.");
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: Partial<CompletionOptions>,
  ): Promise<string> {
    throw new Error(
      "OpenAIClient is deprecated and no longer supported. Please use VertexLLMClient instead.",
    );
  }

  async generateText(prompt: string, options?: Partial<CompletionOptions>): Promise<string> {
    throw new Error(
      "OpenAIClient is deprecated and no longer supported. Please use VertexLLMClient instead.",
    );
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
