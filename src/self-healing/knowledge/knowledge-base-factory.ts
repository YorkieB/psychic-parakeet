/**
 * Knowledge Base Factory
 * Creates and initializes all knowledge base components
 */

import type { Logger } from "winston";
import type { VertexLLMClient } from "../../llm";
import { KNOWLEDGE_CONFIG } from "../config/knowledge.config";
import { type CacheManager, createCacheManager } from "./cache-manager";
import { CodeSearchEngine } from "./code-search";
import { EmbeddingService } from "./embedding-service";
import { LicenseFilter } from "./license-filter";
import { RAGRepairPipeline } from "./rag-pipeline";
import { SoftwareHeritageClient } from "./software-heritage-client";
import { StackV2StreamingClient } from "./stack-v2-client";

export interface KnowledgeBaseComponents {
  stackClient: StackV2StreamingClient;
  swhClient: SoftwareHeritageClient;
  cache: CacheManager;
  licenseFilter: LicenseFilter;
  search: CodeSearchEngine;
  embeddingService: EmbeddingService;
  ragPipeline: RAGRepairPipeline;
}

export class KnowledgeBaseFactory {
  /**
   * Create and initialize all knowledge base components
   */
  static async create(logger: Logger, llm: VertexLLMClient): Promise<KnowledgeBaseComponents> {
    logger.info("Initializing knowledge base components...");

    // Create clients
    const stackClient = new StackV2StreamingClient(logger);
    const swhClient = new SoftwareHeritageClient(logger);

    // Create cache (try Redis, fallback to memory)
    const useRedis = !!process.env.REDIS_URL;
    const cache = createCacheManager(
      logger,
      useRedis,
      process.env.REDIS_URL,
      KNOWLEDGE_CONFIG.maxCacheItems,
      KNOWLEDGE_CONFIG.cacheTTLHours,
    );

    // Create license filter
    const licenseFilter = new LicenseFilter(logger, KNOWLEDGE_CONFIG.licenseTypes);

    // Create code search engine
    const search = new CodeSearchEngine(
      logger,
      stackClient,
      swhClient,
      cache,
      licenseFilter,
      KNOWLEDGE_CONFIG.maxS3Fetches,
      KNOWLEDGE_CONFIG.relevanceThreshold,
    );

    // Create embedding service
    const embeddingService = new EmbeddingService(logger, llm);

    // Create RAG pipeline
    const ragPipeline = new RAGRepairPipeline(logger, search, llm, embeddingService);

    // Initialize Stack v2 client (async)
    await stackClient.initialize();

    logger.info("✅ Knowledge base components initialized");

    return {
      stackClient,
      swhClient,
      cache,
      licenseFilter,
      search,
      embeddingService,
      ragPipeline,
    };
  }
}
