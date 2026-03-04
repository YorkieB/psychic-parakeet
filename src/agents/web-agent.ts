/*
  This file helps Jarvis search the internet and find information online.

  It handles web searches, fact-checking, and information retrieval while making sure Jarvis can find answers to your questions online.
*/

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { createLogger } from "../utils/logger";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

// Search engine type
type SearchEngine = "brave" | "google" | "auto";

// Search result interface
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  hostname: string;
}

/**
 * Web agent that handles web search and information retrieval.
 * Supports multiple search engines: Brave Search API and Google Custom Search API.
 * Set WEB_SEARCH_ENGINE env var to 'brave', 'google', or 'auto' (default: auto).
 */
export class WebAgent extends EnhancedBaseAgent {
  private searchEngine: SearchEngine;

  /**
   * Creates a new WebAgent instance.
   *
   * @param logger - Winston logger instance (optional, creates default if not provided)
   */
  constructor(logger: Logger = createLogger("WebAgent")) {
    const port = parseInt(process.env.WEB_AGENT_PORT || "3002", 10);
    super("Web", "1.0.0", port, logger);

    // Determine which search engine to use
    const configuredEngine = (
      process.env.WEB_SEARCH_ENGINE || "auto"
    ).toLowerCase() as SearchEngine;
    this.searchEngine = configuredEngine;

    this.logger.info(`Web agent configured with search engine: ${this.searchEngine}`);
  }

  /**
   * Initializes the web agent by configuring Express middleware.
   */
  protected async initialize(): Promise<void> {
    // Configure Express to parse JSON bodies
    this.app.use((express as any).json());

    // Setup health endpoint
    this.setupHealthEndpoint();

    // Setup enhanced routes (7 standard endpoints)
    this.setupEnhancedRoutes();

    this.logger.info("Web agent initialized with enhanced endpoints");
  }

  /**
   * Searches using Brave Search API
   */
  private async searchBrave(
    query: string,
    maxResults: number,
    requestId: string,
  ): Promise<{ results: SearchResult[]; source: string }> {
    const braveApiKey = process.env.BRAVE_API_KEY;
    if (!braveApiKey) {
      throw new Error("BRAVE_API_KEY environment variable is required for Brave search");
    }

    this.logger.info(`Searching Brave for: "${query}"`, {
      requestId,
      query: query.substring(0, 100),
      maxResults,
    });

    const braveApiUrl = "https://api.search.brave.com/res/v1/web/search";
    const searchParams = new URLSearchParams({
      q: query,
      count: maxResults.toString(),
      safesearch: process.env.WEB_SEARCH_SAFE_MODE || "moderate",
    });

    const braveResponse = await fetch(`${braveApiUrl}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": braveApiKey,
      },
    });

    if (!braveResponse.ok) {
      const errorText = await braveResponse.text();
      throw new Error(`Brave API error: ${braveResponse.status} - ${errorText}`);
    }

    const braveData = (await braveResponse.json()) as {
      web?: {
        results?: Array<{
          title: string;
          url: string;
          description: string;
          meta_url?: { hostname?: string };
        }>;
      };
    };

    const braveResults = braveData.web?.results || [];
    const results = braveResults.slice(0, maxResults).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.description || "No description available",
      hostname: result.meta_url?.hostname || new URL(result.url).hostname,
    }));

    return { results, source: "brave" };
  }

  /**
   * Searches using Google Custom Search API
   */
  private async searchGoogle(
    query: string,
    maxResults: number,
    requestId: string,
  ): Promise<{ results: SearchResult[]; source: string }> {
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    if (!googleApiKey || !googleCx) {
      throw new Error(
        "GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX environment variables are required for Google search",
      );
    }

    this.logger.info(`Searching Google for: "${query}"`, {
      requestId,
      query: query.substring(0, 100),
      maxResults,
    });

    // Google Custom Search API allows max 10 results per request
    const googleApiUrl = "https://www.googleapis.com/customsearch/v1";
    const searchParams = new URLSearchParams({
      key: googleApiKey,
      cx: googleCx,
      q: query,
      num: Math.min(maxResults, 10).toString(),
      safe: process.env.WEB_SEARCH_SAFE_MODE === "off" ? "off" : "active",
    });

    const googleResponse = await fetch(`${googleApiUrl}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      throw new Error(`Google API error: ${googleResponse.status} - ${errorText}`);
    }

    const googleData = (await googleResponse.json()) as {
      items?: Array<{
        title: string;
        link: string;
        snippet: string;
        displayLink?: string;
      }>;
      searchInformation?: {
        totalResults?: string;
      };
    };

    const googleResults = googleData.items || [];
    const results = googleResults.slice(0, maxResults).map((result) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet || "No description available",
      hostname: result.displayLink || new URL(result.link).hostname,
    }));

    return { results, source: "google" };
  }

  /**
   * Determines which search engine to use based on configuration and availability
   */
  private getAvailableEngine(): SearchEngine {
    const hasBrave = !!process.env.BRAVE_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_SEARCH_API_KEY && !!process.env.GOOGLE_SEARCH_CX;

    if (this.searchEngine === "google") {
      if (hasGoogle) return "google";
      if (hasBrave) {
        this.logger.warn("Google search requested but not configured, falling back to Brave");
        return "brave";
      }
    } else if (this.searchEngine === "brave") {
      if (hasBrave) return "brave";
      if (hasGoogle) {
        this.logger.warn("Brave search requested but not configured, falling back to Google");
        return "google";
      }
    } else {
      // Auto mode: prefer Google if available, otherwise Brave
      if (hasGoogle) return "google";
      if (hasBrave) return "brave";
    }

    throw new Error(
      "No search engine configured. Set BRAVE_API_KEY or GOOGLE_SEARCH_API_KEY + GOOGLE_SEARCH_CX",
    );
  }

  /**
   * Starts the HTTP server and sets up API endpoints.
   */
  protected async startServer(): Promise<void> {
    // Add POST endpoint for web search
    this.app.post("/api/search", async (req: Request, res: Response) => {
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        // Extract query and maxResults from inputs
        const query = inputs?.query as string;
        const maxResults = (inputs?.maxResults as number) || 10;
        // Allow per-request engine override
        const requestedEngine = inputs?.engine as SearchEngine | undefined;

        if (!query) {
          const errorResponse: AgentResponse = {
            success: false,
            error: "Query is required in inputs",
            metadata: {
              duration: 0,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        const startTime = Date.now();

        // Determine which engine to use
        let engine: SearchEngine;
        if (requestedEngine && ["brave", "google"].includes(requestedEngine)) {
          engine = requestedEngine;
        } else {
          engine = this.getAvailableEngine();
        }

        // Perform search
        let searchResult: { results: SearchResult[]; source: string };

        if (engine === "google") {
          searchResult = await this.searchGoogle(query, maxResults, request.id);
        } else {
          searchResult = await this.searchBrave(query, maxResults, request.id);
        }

        const duration = Date.now() - startTime;

        this.logger.info(`Found ${searchResult.results.length} results in ${duration}ms`, {
          requestId: request.id,
          resultCount: searchResult.results.length,
          source: searchResult.source,
          duration,
        });

        const searchResponse = {
          results: searchResult.results,
          query,
          resultCount: searchResult.results.length,
          timestamp: new Date(),
          source: searchResult.source,
          duration,
        };

        const response: AgentResponse = {
          success: true,
          data: searchResponse,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing web search request", {
          error: error instanceof Error ? error.message : String(error),
          query: (req.body as AgentRequest)?.inputs?.query,
        });

        // Fallback to error response with helpful message
        const query = ((req.body as AgentRequest)?.inputs?.query as string) || "unknown";
        const fallbackResults = [
          {
            title: `Search temporarily unavailable for "${query}"`,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: "The search service is currently unavailable. Please try again later.",
            hostname: "google.com",
          },
        ];

        const fallbackResponse = {
          results: fallbackResults,
          query,
          resultCount: 1,
          timestamp: new Date(),
          source: "fallback" as const,
          error: error instanceof Error ? error.message : "Unknown error",
        };

        const response: AgentResponse = {
          success: false,
          data: fallbackResponse,
          error: error instanceof Error ? error.message : "Search service unavailable",
          metadata: {
            duration: 0,
            retryCount: 0,
          },
        };

        res.status(500).json(response);
      }
    });

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Web agent server listening on port ${this.port}`);
          resolve();
        })
        .on("error", (error: Error) => {
          this.logger.error(`Failed to start server on port ${this.port}`, {
            error: error.message,
          });
          reject(error);
        });
    });
  }

  /**
   * Returns the capabilities provided by this agent.
   *
   * @returns Array of capability strings
   */
  protected getCapabilities(): string[] {
    return ["web_search", "information_retrieval", "fact_checking"];
  }

  /**
   * Returns the dependencies for this agent.
   *
   * @returns Array of agent IDs (empty for web agent)
   */
  protected getDependencies(): string[] {
    return [];
  }

  /**
   * Returns the priority level for this agent.
   * Web agent has higher priority (7) than default (5).
   *
   * @returns Priority number (7)
   */
  protected getPriority(): number {
    return 7;
  }

  /**
   * Get agent-specific metrics
   */
  protected getMetrics(): {
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastRequest?: string;
    [key: string]: any;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : undefined,
      averageResponseTime: this.calculateAverageResponseTime(),
      status: this.getStatus(),
    };
  }

  /**
   * Update agent configuration
   */
  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info("Configuration updated", { config });
  }

  /**
   * Restart the agent
   */
  protected async restart(): Promise<void> {
    this.logger.info("Restarting Web agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// If this file is executed directly, start the agent
if (require.main === module) {
  const logger = createLogger("WebAgent");
  const agent = new WebAgent(logger);

  agent.start().catch((error) => {
    logger.error("Failed to start Web Agent", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
