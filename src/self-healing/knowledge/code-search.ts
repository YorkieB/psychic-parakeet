/**
 * Code Search Engine
 * Finds relevant code examples for detected bugs
 */

import type { Logger } from "winston";
import type { CacheManager } from "./cache-manager";
import type { LicenseFilter } from "./license-filter";
import type { SoftwareHeritageClient } from "./software-heritage-client";
import type { StackV2Record, StackV2StreamingClient } from "./stack-v2-client";

export interface CodeSearchQuery {
  language: string; // e.g., 'TypeScript', 'JavaScript'
  errorType: string; // e.g., 'memory-leak', 'null-pointer'
  keywords: string[]; // e.g., ['EventEmitter', 'removeListener']
  contextPath?: string; // e.g., 'src/agents/'
  maxResults?: number; // Maximum results to return
  licenseTypes?: Array<"permissive" | "no_license">;
}

export interface CodeSearchResult {
  blobId: string;
  content: string;
  repo: string;
  path: string;
  relevanceScore: number;
  license: string;
  language: string;
  size: number;
}

export class CodeSearchEngine {
  private logger: Logger;
  private stackClient: StackV2StreamingClient;
  private swhClient: SoftwareHeritageClient;
  private cache: CacheManager;
  private maxS3Fetches: number;
  private relevanceThreshold: number;

  constructor(
    logger: Logger,
    stackClient: StackV2StreamingClient,
    swhClient: SoftwareHeritageClient,
    cache: CacheManager,
    _licenseFilter: LicenseFilter,
    maxS3Fetches: number = 50,
    relevanceThreshold: number = 0.3,
  ) {
    this.logger = logger;
    this.stackClient = stackClient;
    this.swhClient = swhClient;
    this.cache = cache;
    this.maxS3Fetches = maxS3Fetches;
    this.relevanceThreshold = relevanceThreshold;
  }

  /**
   * Search for relevant code examples
   */
  async search(query: CodeSearchQuery): Promise<CodeSearchResult[]> {
    this.logger.info("Starting code search:", {
      language: query.language,
      errorType: query.errorType,
      keywords: query.keywords,
    });

    const results: CodeSearchResult[] = [];
    const candidateRecords: StackV2Record[] = [];

    try {
      // Step 1: Stream metadata matching language + license
      const licenseTypes = query.licenseTypes || ["permissive", "no_license"];

      for (const licenseType of licenseTypes) {
        const metadataStream = this.stackClient.search({
          language: query.language,
          licenseType,
          pathPattern: query.contextPath ? new RegExp(query.contextPath, "i") : undefined,
          maxResults: this.maxS3Fetches,
        });

        // Step 2: Filter by keywords in path/repo
        for await (const record of metadataStream) {
          if (this.matchesKeywords(record, query.keywords)) {
            candidateRecords.push(record);

            // Limit candidates to avoid fetching too much
            if (candidateRecords.length >= this.maxS3Fetches) {
              break;
            }
          }
        }

        if (candidateRecords.length >= this.maxS3Fetches) {
          break;
        }
      }

      this.logger.debug(`Found ${candidateRecords.length} candidate records`);

      // Step 3: Fetch actual content from S3 for top candidates
      const blobIds = candidateRecords.map((r) => r.blob_id);
      const contentMap = await this.swhClient.fetchBatch(blobIds, {
        concurrency: 10,
        timeout: 10000,
      });

      // Step 4: Score relevance and build results
      for (const record of candidateRecords) {
        const content = contentMap.get(record.blob_id);

        if (!content) {
          // Try fetching individually (might have failed in batch)
          try {
            const fetched = await this.fetchWithCache(record.blob_id);
            if (fetched) {
              const score = this.calculateRelevance(fetched, query);
              if (score >= this.relevanceThreshold) {
                results.push(this.buildResult(record, fetched, score));
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch ${record.blob_id}:`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
          continue;
        }

        // Cache the content
        await this.cache.set(record.blob_id, content);

        // Score relevance
        const score = this.calculateRelevance(content, query);

        if (score >= this.relevanceThreshold) {
          results.push(this.buildResult(record, content, score));
        }
      }

      // Sort by relevance
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Limit results
      const maxResults = query.maxResults || 10;
      const finalResults = results.slice(0, maxResults);

      this.logger.info(`Code search complete: ${finalResults.length} relevant results`);

      return finalResults;
    } catch (error) {
      this.logger.error("Code search failed:", {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      throw error;
    }
  }

  /**
   * Fetch content with cache check
   */
  private async fetchWithCache(blobId: string): Promise<string | null> {
    // Check cache first
    const cached = await this.cache.get(blobId);
    if (cached) {
      return cached;
    }

    // Fetch from S3
    try {
      const content = await this.swhClient.fetchContent(blobId);
      await this.cache.set(blobId, content);
      return content;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Check if record matches keywords
   */
  private matchesKeywords(record: StackV2Record, keywords: string[]): boolean {
    if (keywords.length === 0) {
      return true;
    }

    const searchText = `${record.path} ${record.repo_name}`.toLowerCase();

    return keywords.some((kw) => {
      const keyword = kw.toLowerCase();
      return (
        searchText.includes(keyword) ||
        record.path.toLowerCase().includes(keyword) ||
        record.repo_name.toLowerCase().includes(keyword)
      );
    });
  }

  /**
   * Calculate relevance score for content
   */
  private calculateRelevance(content: string, query: CodeSearchQuery): number {
    let score = 0;
    const contentLower = content.toLowerCase();

    // Keyword matching (40% weight)
    for (const keyword of query.keywords) {
      const keywordLower = keyword.toLowerCase();
      const matches = (contentLower.match(new RegExp(keywordLower, "g")) || []).length;
      score += Math.min(matches * 0.1, 0.4); // Cap at 0.4
    }

    // Error type matching (30% weight)
    const errorPatterns = this.getErrorPatterns(query.errorType);
    for (const pattern of errorPatterns) {
      if (contentLower.includes(pattern)) {
        score += 0.3;
        break;
      }
    }

    // File size preference (10% weight) - prefer focused examples
    if (content.length < 5000) {
      score += 0.1;
    } else if (content.length > 50000) {
      score -= 0.05; // Penalize very large files
    }

    // Context path matching (20% weight)
    if (query.contextPath) {
      // This is already filtered in the search, but boost score
      score += 0.2;
    }

    return Math.min(Math.max(score, 0), 1.0); // Clamp between 0 and 1
  }

  /**
   * Get error patterns for error type
   */
  private getErrorPatterns(errorType: string): string[] {
    const patterns: Record<string, string[]> = {
      "memory-leak": [
        "memory",
        "leak",
        "removeListener",
        "removeAllListeners",
        "cleanup",
        "dispose",
      ],
      "null-pointer": ["null", "undefined", "optional", "?.", "??"],
      timeout: ["timeout", "setTimeout", "clearTimeout", "expired"],
      "connection-error": ["connection", "connect", "disconnect", "socket", "network"],
      "async-error": ["async", "await", "promise", "then", "catch"],
      "type-error": ["type", "typeof", "instanceof", "TypeError"],
    };

    return patterns[errorType] || [errorType.toLowerCase()];
  }

  /**
   * Build search result from record and content
   */
  private buildResult(record: StackV2Record, content: string, score: number): CodeSearchResult {
    return {
      blobId: record.blob_id,
      content,
      repo: record.repo_name,
      path: record.path,
      relevanceScore: score,
      license: record.license_type,
      language: record.lang,
      size: record.size,
    };
  }
}
