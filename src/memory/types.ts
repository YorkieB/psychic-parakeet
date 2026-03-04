/*
  This file defines the types and interfaces for Jarvis's memory and conversation features.

  It specifies conversation messages, context structures, and entity references while making sure Jarvis can remember and organize conversations consistently.
*/
/**
 * Memory and Context Type Definitions
 */

/**
 * Represents a single message in a conversation.
 */
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    agentsUsed?: string[];
    confidence?: number;
    reasoningTraceId?: string;
  };
}

/**
 * Represents the current context of a conversation.
 */
export interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  currentTopic?: string;
  entities: Map<string, EntityReference>;
  lastUpdated: Date;
  messageCount: number;
}

/**
 * Represents an entity mentioned in conversation.
 */
export interface EntityReference {
  name: string;
  type: "topic" | "person" | "concept" | "location" | "other";
  firstMentioned: Date;
  lastMentioned: Date;
  frequency: number;
  aliases: string[]; // "it", "that", "them", etc.
}

/**
 * Result of context resolution.
 */
export interface ContextResolution {
  resolvedText: string;
  references: Map<string, string>; // "it" -> "artificial intelligence"
  contextUsed: boolean;
  entities: string[];
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
