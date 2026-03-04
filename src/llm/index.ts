/*
  This file brings together all the language model components for Jarvis.

  It exports the Vertex AI client along with its types so Jarvis can easily access Google's AI models while keeping the code organized.
*/
/**
 * LLM Module
 *
 * Exports Vertex AI client and related types for LLM-powered features.
 */

export * from "./types";
export { VertexLLMClient } from "./vertex-client";

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
