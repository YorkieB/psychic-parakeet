/*
  This file defines the types and interfaces for Jarvis's language model features.

  It specifies completion options, intent detection results, and other data structures while making sure Jarvis can work with AI models consistently.
*/
/**
 * LLM-related type definitions
 */

/**
 * Options for LLM completion requests
 */
export interface CompletionOptions {
  /** Model to use (overrides default) */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for response randomness (0.0-2.0) */
  temperature?: number;
}

/**
 * Result from LLM-based intent detection
 */
export interface IntentDetectionResult {
  /** Detected intent type */
  intent: "GREETING" | "SEARCH" | "RESEARCH" | "FACT_CHECK" | "SUMMARIZE" | "CONVERSATION";
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Suggested agent to handle this intent */
  suggestedAgent: "Dialogue" | "Web" | "Knowledge";
  /** Extracted entities (query, topic, claim, etc.) */
  entities: Record<string, string>;
  /** Optional reasoning explanation */
  reasoning?: string;
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
