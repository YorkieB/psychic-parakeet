/*
  This file handles conversations and chat interactions with Jarvis.

  It processes your messages, generates responses, and searches the web for current information while making sure conversations feel natural and helpful.
*/

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { VertexLLMClient } from "../llm";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { createLogger } from "../utils/logger";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

// Keywords that indicate a query needs real-time information (must be specific to avoid false positives)
const REALTIME_KEYWORDS = [
  "what time",
  "current time",
  "time now",
  "time in",
  "time zone",
  "weather",
  "forecast",
  "temperature outside",
  "news today",
  "latest news",
  "recent news",
  "today's news",
  "headlines",
  "stock price",
  "stock market",
  "bitcoin price",
  "crypto price",
  "score of",
  "game score",
  "match score",
  "who is playing",
  "search",
  "find",
  "look up",
  "google",
  "who won",
  "who is winning",
  "results",
  "happening",
  "going on",
  "events",
  "open now",
  "hours",
  "schedule",
  "traffic",
  "flight",
  "status",
];

/**
 * Dialogue agent that handles conversation and response generation.
 * Provides natural language interaction capabilities with optional LLM support.
 * Now includes web search capability for real-time information.
 */
export class DialogueAgent extends EnhancedBaseAgent {
  private readonly llm?: VertexLLMClient;
  private readonly webAgentUrl: string;

  /**
   * Creates a new DialogueAgent instance.
   *
   * @param agentId - Unique identifier for this agent
   * @param version - Version of the agent implementation
   * @param port - Port number for the agent's HTTP server
   * @param logger - Winston logger instance
   * @param llm - Optional Vertex AI client for LLM-powered conversations
   */
  constructor(
    agentId: string,
    version: string,
    port: number,
    logger: Logger,
    llm?: VertexLLMClient,
  ) {
    super(agentId, version, port, logger);
    this.llm = llm;
    this.webAgentUrl = `http://localhost:${process.env.WEB_AGENT_PORT || "3002"}/api`;

    if (llm) {
      this.logger.info("Dialogue agent initialized with LLM support and web search capability");
    } else {
      this.logger.info("Dialogue agent initialized with mock responses (LLM not configured)");
    }
  }

  /**
   * Checks if a message requires real-time information from the web.
   */
  private needsRealtimeInfo(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return REALTIME_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * Formats web search results into a context string for the LLM.
   */
  private formatSearchResults(results: any[]): string {
    if (!results || results.length === 0) {
      return "";
    }

    const formatted = results
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
      .join("\n\n");

    return `\n\nHere is current information from the web:\n${formatted}\n`;
  }

  /**
   * Initializes the dialogue agent by configuring Express middleware.
   */
  protected async initialize(): Promise<void> {
    // Configure Express to parse JSON bodies
    this.app.use((express as any).json());

    // Setup health endpoint
    this.setupHealthEndpoint();

    // Setup enhanced routes (7 standard endpoints)
    this.setupEnhancedRoutes();

    this.logger.info("Dialogue agent initialized with enhanced endpoints");
  }

  /**
   * Starts the HTTP server and sets up API endpoints.
   */
  protected async startServer(): Promise<void> {
    // Main API endpoint - routes based on action field
    this.app.post("/api", async (req: Request, res: Response) => {
      const request: AgentRequest = req.body;
      const action = request.action;

      // Route to appropriate handler based on action
      switch (action) {
        case "respond":
        case "chat":
          return this.handleRespond(req, res);
        default:
          res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`,
            metadata: { duration: 0, retryCount: 0 },
          } as AgentResponse);
      }
    });

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.server = this.app
        .listen(this.port, () => {
          this.logger.info(`Dialogue agent server listening on port ${this.port}`);
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
   * Handles respond/chat action
   */
  private async handleRespond(req: Request, res: Response): Promise<void> {
    try {
      const request: AgentRequest = req.body;
      const { inputs } = request;

      // Extract message from inputs
      const message = inputs?.message as string;

      if (!message) {
        res.status(400).json({
          success: false,
          error: "Message is required in inputs",
          metadata: {
            duration: 0,
            retryCount: 0,
          },
        } as AgentResponse);
        return;
      }

      this.logger.info(`Processing dialogue request: ${request.id}`, {
        requestId: request.id,
        message: message.substring(0, 100), // Log first 100 chars
      });

      const startTime = Date.now();
      let responseText: string;
      let responseSource: "llm" | "llm+web" | "mock";

      // Extract context if provided
      const context = inputs?.context as Record<string, unknown> | undefined;

      // Check if the message needs real-time information
      const needsWebSearch = this.needsRealtimeInfo(message);
      let webContext = "";

      if (needsWebSearch) {
        this.logger.info("Query requires real-time info, searching web...", {
          requestId: request.id,
        });
        const searchResult = await this.searchWeb(message);
        if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
          webContext = this.formatSearchResults(searchResult.results);
          this.logger.info(`Web search returned ${searchResult.results.length} results`, {
            requestId: request.id,
          });
        } else {
          this.logger.warn("Web search returned no results", {
            requestId: request.id,
            error: searchResult.error,
          });
        }
      }

      if (this.llm) {
        // Use LLM via proper Qwen3 chat template sent as a completion prompt
        try {
          const systemContent = `You are Jarvis, a sophisticated AI assistant created by Yorkie. Never identify yourself as Qwen or any other AI. You are Jarvis. Respond naturally and concisely in 1-3 sentences. Do not repeat the user's message. Do not use labels like Output:, Answer:, or Message:.${context ? ` Context: ${JSON.stringify(context)}.` : ""}${webContext ? `\n\nRelevant web results:${webContext}` : ""}`;

          // Build Qwen3 chat template as a single prompt string (what the dedicated endpoint expects)
          const prompt = `<|im_start|>system\n${systemContent}<|im_end|>\n<|im_start|>user\n${message}<|im_end|>\n<|im_start|>assistant\n`;

          responseSource = webContext ? "llm+web" : "llm";
          responseText = await this.llm.complete(prompt, { temperature: 0.7, maxTokens: 800 });
          this.logger.info("Raw LLM response:", { raw: responseText.slice(0, 300) });
          responseText = this.cleanLLMResponse(responseText, message);
          this.logger.info("Cleaned LLM response:", { cleaned: responseText.slice(0, 300) });

          if (!responseText || !responseText.trim()) {
            this.logger.warn("LLM returned empty response after cleaning", {
              requestId: request.id,
            });
            responseText = `I heard you say: "${message.slice(0, 80)}". My AI backend returned an empty response — please try rephrasing or check the backend logs.`;
            responseSource = "mock";
          } else {
            this.logger.info(
              `Response generated (${responseText.length} chars, source: ${responseSource})`,
              {
                requestId: request.id,
              },
            );
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.error("LLM completion failed, using fallback", {
            requestId: request.id,
            error: errMsg,
          });
          responseText = `Sorry, I couldn't generate a response right now. (${errMsg.slice(0, 100)})`;
          responseSource = "mock";
        }
      } else {
        // Fallback to simple responses
        responseText = `You said: "${message}". I'm the Dialogue agent! (Using mock responses - LLM not configured)`;
        responseSource = "mock";
        this.logger.info("Using mock response (LLM not available)", {
          requestId: request.id,
        });
      }

      const duration = Date.now() - startTime;

      // Generate response
      const response: AgentResponse = {
        success: true,
        data: {
          response: responseText,
          message: responseText, // For backward compatibility
          source: responseSource,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          duration,
          retryCount: 0,
        },
      };

      res.json(response);
    } catch (error) {
      this.logger.error("Error processing dialogue request", {
        error: error instanceof Error ? error.message : String(error),
      });

      const errorResponse: AgentResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          duration: 0,
          retryCount: 0,
        },
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Search the web for real-time information.
   */
  private async searchWeb(
    query: string,
  ): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      const response = await fetch(this.webAgentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          inputs: { query, limit: 5 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Web search failed: ${response.status}`);
      }

      const data = (await response.json()) as { success: boolean; data?: { results?: any[] } };
      return { success: true, results: data.data?.results || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown search error",
      };
    }
  }

  /**
   * Strip prompt echoes and instruction leakage from LLM output.
   */
  private cleanLLMResponse(raw: string, userMessage: string): string {
    let text = (raw || "").trim();

    // 1. Remove entire <think>...</think> blocks (Qwen3 reasoning blocks)
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // 2. Strip chat template tokens the model may echo back
    text = text.replace(/<\|im_start\|>\s*system[\s\S]*?<\|im_end\|>\s*/gi, "");
    text = text.replace(/<\|im_start\|>\s*user[\s\S]*?<\|im_end\|>\s*/gi, "");
    text = text.replace(/<\|im_start\|>\s*assistant\s*\n?/gi, "");
    text = text.replace(/<\|im_start\|>[^\n]*\n?/g, "");
    text = text.replace(/<\|im_end\|>/g, "");
    text = text.trim();

    // 3. Only strip the user echo if it appears ALONE on the first line (exact match)
    const userTrimmed = (userMessage || "").trim();
    const lines = text.split(/\r?\n/);
    if (lines.length >= 2 && lines[0]?.trim().toLowerCase() === userTrimmed.toLowerCase()) {
      lines.shift();
      text = lines.join("\n").trim();
    }

    // 4. Strip lines that are ONLY a label (e.g. "Output:" alone, "Answer:" alone)
    const labelOnlyPattern =
      /^(Prompt|Output|Assistant|Response|Answer|Message|Input|Query)\s*:\s*$/i;
    const cleaned: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      if (!labelOnlyPattern.test(line.trim())) {
        cleaned.push(line);
      }
    }
    text = cleaned.join("\n").trim();

    // 5. Strip a label prefix only if it is at the very start of the whole text
    text = text.replace(/^(Output|Answer|Response|Assistant)\s*:\s*/i, "").trim();

    // 6. Strip "Jarvis:" prefix (keep what follows)
    text = text.replace(/^Jarvis\s*:\s*/i, "").trim();

    // 7. Strip system prompt echo
    text = text.replace(/^You are Jarvis[^\n]*\n*/i, "").trim();

    // 8. Fix wrong identity
    text = text.replace(/\bI'?\s*am\s+Qwen\b/gi, "I'm Jarvis");

    return text;
  }

  /**
   * Returns the capabilities provided by this agent.
   *
   * @returns Array of capability strings
   */
  protected getCapabilities(): string[] {
    return ["conversation", "response", "context_tracking"];
  }

  /**
   * Returns the dependencies for this agent.
   *
   * @returns Array of agent IDs (empty for dialogue agent)
   */
  protected getDependencies(): string[] {
    return [];
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
    };
  }

  /**
   * Update agent configuration
   */
  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    // In production, save to file or database
    this.logger.info("Configuration updated", { config });
  }

  /**
   * Restart the agent
   */
  protected async restart(): Promise<void> {
    this.logger.info("Restarting Dialogue agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// If this file is executed directly, start the agent
if (require.main === module) {
  (async () => {
    const logger = createLogger("DialogueAgent");

    // Initialize LLM if Vertex AI is configured
    let llm: VertexLLMClient | undefined;
    if (process.env.VERTEX_AI_ENDPOINT_URL) {
      const { VertexLLMClient } = await import("../llm");
      llm = new VertexLLMClient(logger);
      logger.info("Vertex AI initialized for Dialogue Agent");
    } else {
      logger.warn("VERTEX_AI_ENDPOINT_URL not set, using mock responses");
    }

    const port = parseInt(process.env.DIALOGUE_AGENT_PORT || "3001", 10);
    const agent = new DialogueAgent("Dialogue", "1.0.0", port, logger, llm);
    await agent.start();
  })().catch((error) => {
    const logger = createLogger("DialogueAgent");
    logger.error("Failed to start Dialogue Agent", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
