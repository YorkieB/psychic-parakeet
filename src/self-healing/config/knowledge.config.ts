/**
 * Knowledge Base Configuration
 */

export type LicenseType = "permissive" | "no_license" | "copyleft" | "unknown";

export interface KnowledgeConfig {
  // Languages to search (prioritize what Jarvis uses)
  languages: string[];

  // License filter (only permissive code)
  licenseTypes: LicenseType[];

  // Cache strategy
  cacheStrategy: "lru" | "fifo" | "ttl";
  maxCacheItems: number;
  cacheTTLHours: number;

  // Search limits
  maxS3Fetches: number; // Max S3 calls per search
  maxResultsReturned: number;
  relevanceThreshold: number;

  // Preferred repos (high-quality codebases)
  preferredRepos: string[];

  // Rate limiting
  s3Concurrency: number;
  s3Timeout: number;
  s3Retries: number;

  // Embedding settings
  useEmbeddings: boolean;
  embeddingModel: string;

  // LLM settings
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
}

export const KNOWLEDGE_CONFIG: KnowledgeConfig = {
  languages: ["TypeScript", "JavaScript", "Python"],

  licenseTypes: ["permissive", "no_license"],

  cacheStrategy: "lru",
  maxCacheItems: 10000,
  cacheTTLHours: 24,

  maxS3Fetches: 50,
  maxResultsReturned: 10,
  relevanceThreshold: 0.3,

  preferredRepos: ["microsoft/", "facebook/", "google/", "vercel/", "nodejs/", "typescript/"],

  s3Concurrency: 10,
  s3Timeout: 10000,
  s3Retries: 3,

  useEmbeddings: false, // Can enable for semantic search
  embeddingModel: "text-embedding-3-small",

  llmModel: process.env.OPENAI_MODEL || "gpt-4",
  llmTemperature: 0.2,
  llmMaxTokens: 2000,
};
