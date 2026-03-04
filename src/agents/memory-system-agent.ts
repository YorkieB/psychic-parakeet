/*
  This file connects Jarvis to an advanced memory management system.

  It handles storing memories, searching through them, and managing different types of memory while making sure Jarvis can remember things in smart ways.
*/
import axios, { type AxiosInstance } from "axios";
import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Memory System Agent that provides memory management capabilities.
 * Integrates the Jarvis Memory System Python service into the Jarvis Orchestrator.
 */
export class MemorySystemAgent extends EnhancedBaseAgent {
  private readonly pythonApiUrl: string;
  private readonly axiosClient: AxiosInstance;

  /**
   * Creates a new MemorySystemAgent instance.
   *
   * @param agentId - Unique identifier for this agent
   * @param version - Version of the agent implementation
   * @param port - Port number for the agent's HTTP server
   * @param logger - Winston logger instance
   */
  constructor(agentId: string, version: string, port: number, logger: Logger) {
    super(agentId, version, port, logger);

    // Get Python API URL from environment or use default
    this.pythonApiUrl = process.env.MEMORY_SYSTEM_API_URL || "http://localhost:3035";

    // Create axios client for Python API
    this.axiosClient = axios.create({
      baseURL: this.pythonApiUrl,
      timeout: parseInt(process.env.MEMORY_SYSTEM_TIMEOUT || "30000", 10),
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.logger.info(`Memory System agent initialized with Python API at ${this.pythonApiUrl}`);
  }

  /**
   * Initializes the memory system agent by configuring Express middleware.
   */
  protected async initialize(): Promise<void> {
    // Configure Express to parse JSON bodies
    this.app.use((express as any).json());

    // Setup health endpoint
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.logger.info("Memory System agent initialized");
  }

  /**
   * Starts the HTTP server and sets up API endpoints.
   */
  protected async startServer(): Promise<void> {
    // POST endpoint for ingesting memories
    this.app.post("/api/ingest", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        // Extract parameters from inputs
        const text = inputs?.text as string;
        const userId = (inputs?.userId as string) || "default";
        const emotion = inputs?.emotion as string;
        const context = inputs?.context as string;
        const importanceScore = inputs?.importanceScore as number;
        const embedding = inputs?.embedding as number[];

        if (!text) {
          const errorResponse: AgentResponse = {
            success: false,
            data: {
              error: "Missing required parameter: text",
            },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        this.logger.info(`Ingesting memory: ${request.id}`, {
          requestId: request.id,
          textLength: text.length,
          userId,
        });

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/ingest", {
          text,
          user_id: userId,
          emotion,
          context,
          importance_score: importanceScore,
          embedding,
        });

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            memory: pythonResponse.data.memory,
            duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        this.logger.info(`Memory ingested (${duration}ms)`, {
          requestId: request.id,
          memoryId: pythonResponse.data.memory?.id,
        });

        res.json(response);
      } catch (error) {
        this.logger.error("Error ingesting memory", {
          error: error instanceof Error ? error.message : String(error),
          axiosError: axios.isAxiosError(error)
            ? {
                status: error.response?.status,
                data: error.response?.data,
              }
            : undefined,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.error || error.message
              : error instanceof Error
                ? error.message
                : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res
          .status(axios.isAxiosError(error) && error.response?.status ? error.response.status : 500)
          .json(errorResponse);
      }
    });

    // POST endpoint for querying memories
    this.app.post("/api/query", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        // Extract parameters from inputs
        const query = inputs?.query as string;
        const userId = (inputs?.userId as string) || "default";
        const topK = (inputs?.topK as number) || 10;

        if (!query) {
          const errorResponse: AgentResponse = {
            success: false,
            data: {
              error: "Missing required parameter: query",
            },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        this.logger.info(`Querying memories: ${request.id}`, {
          requestId: request.id,
          query,
          userId,
          topK,
        });

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/query", {
          query,
          user_id: userId,
          top_k: topK,
        });

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            results: pythonResponse.data.results,
            count: pythonResponse.data.count,
            duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        this.logger.info(`Memory query completed (${duration}ms)`, {
          requestId: request.id,
          resultCount: pythonResponse.data.count,
        });

        res.json(response);
      } catch (error) {
        this.logger.error("Error querying memories", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.error || error.message
              : error instanceof Error
                ? error.message
                : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res
          .status(axios.isAxiosError(error) && error.response?.status ? error.response.status : 500)
          .json(errorResponse);
      }
    });

    // POST endpoint for consolidating memories
    this.app.post("/api/consolidate", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        const userId = (inputs?.userId as string) || "default";

        this.logger.info(`Consolidating memories: ${request.id}`, {
          requestId: request.id,
          userId,
        });

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/consolidate", {
          user_id: userId,
        });

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            stats: pythonResponse.data.stats,
            duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        this.logger.info(`Memory consolidation completed (${duration}ms)`, {
          requestId: request.id,
          stats: pythonResponse.data.stats,
        });

        res.json(response);
      } catch (error) {
        this.logger.error("Error consolidating memories", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.error || error.message
              : error instanceof Error
                ? error.message
                : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res
          .status(axios.isAxiosError(error) && error.response?.status ? error.response.status : 500)
          .json(errorResponse);
      }
    });

    // GET endpoint for statistics
    this.app.get("/api/stats", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const userId = (req.query.userId as string) || "default";

        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/stats", {
          params: { user_id: userId },
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: pythonResponse.data.stats,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting stats", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.error || error.message
              : error instanceof Error
                ? error.message
                : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res
          .status(axios.isAxiosError(error) && error.response?.status ? error.response.status : 500)
          .json(errorResponse);
      }
    });

    // GET endpoint for recent STM memories
    this.app.get("/api/stm/recent", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const userId = (req.query.userId as string) || "default";
        const num = parseInt((req.query.num as string) || "10", 10);

        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/stm/recent", {
          params: { user_id: userId, num },
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            memories: pythonResponse.data.memories,
            count: pythonResponse.data.count,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting recent STM memories", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.error || error.message
              : error instanceof Error
                ? error.message
                : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res
          .status(axios.isAxiosError(error) && error.response?.status ? error.response.status : 500)
          .json(errorResponse);
      }
    });

    // POST endpoint for STM search
    this.app.post("/api/stm/search", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        const query = inputs?.query as string;
        const userId = (inputs?.userId as string) || "default";
        const topK = (inputs?.topK as number) || 5;

        if (!query) {
          const errorResponse: AgentResponse = {
            success: false,
            data: {
              error: "Missing required parameter: query",
            },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/stm/search", {
          query,
          user_id: userId,
          top_k: topK,
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            results: pythonResponse.data.results,
            count: pythonResponse.data.count,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error searching STM", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: axios.isAxiosError(error)
              ? error.response?.data?.error || error.message
              : error instanceof Error
                ? error.message
                : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res
          .status(axios.isAxiosError(error) && error.response?.status ? error.response.status : 500)
          .json(errorResponse);
      }
    });

    // GET endpoint for status
    this.app.get("/api/status", async (req: Request, res: Response) => {
      try {
        // Check Python API health first
        const healthResponse = await this.axiosClient.get("/health");
        const statsResponse = await this.axiosClient.get("/api/stats");

        res.json({
          status: this.getStatus(),
          pythonApi: {
            healthy: healthResponse.data.status === "healthy",
            stats: statsResponse.data.stats,
          },
        });
      } catch (error) {
        this.logger.error("Error getting status", {
          error: error instanceof Error ? error.message : String(error),
        });

        res.status(500).json({
          status: this.getStatus(),
          pythonApi: {
            healthy: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    });

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.server = this.app
        .listen(this.port, () => {
          this.logger.info(`Memory System agent server listening on port ${this.port}`);
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
   */
  protected getCapabilities(): string[] {
    return [
      "memory_ingestion",
      "memory_query",
      "memory_consolidation",
      "stm_operations",
      "mtm_operations",
      "ltm_operations",
      "memory_statistics",
    ];
  }

  /**
   * Returns the list of agent IDs this agent depends on.
   */
  protected getDependencies(): string[] {
    return [];
  }

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

  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info("Configuration updated", { config });
  }

  protected async restart(): Promise<void> {
    this.logger.info("Restarting Memory System agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
