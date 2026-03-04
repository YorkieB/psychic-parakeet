/*
  This file gives Jarvis eyes to see and understand the world around it.

  It handles face recognition, motion detection, scene analysis, and visual intelligence while making sure Jarvis can interpret what it sees.
*/
import axios, { type AxiosInstance } from "axios";
import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Visual Engine Agent that provides computer vision and face recognition capabilities.
 * Integrates the Jarvis Visual Engine Python service into the Jarvis Orchestrator.
 */
export class VisualEngineAgent extends EnhancedBaseAgent {
  private readonly pythonApiUrl: string;
  private readonly axiosClient: AxiosInstance;
  private readonly apiKey?: string;

  /**
   * Creates a new VisualEngineAgent instance.
   *
   * @param agentId - Unique identifier for this agent
   * @param version - Version of the agent implementation
   * @param port - Port number for the agent's HTTP server
   * @param logger - Winston logger instance
   */
  constructor(agentId: string, version: string, port: number, logger: Logger) {
    super(agentId, version, port, logger);

    // Get Python API URL from environment or use default
    this.pythonApiUrl = process.env.VISUAL_ENGINE_API_URL || "http://localhost:5000";
    this.apiKey = process.env.VISUAL_ENGINE_API_KEY;

    // Create axios client for Python API
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    this.axiosClient = axios.create({
      baseURL: this.pythonApiUrl,
      timeout: parseInt(process.env.VISUAL_ENGINE_TIMEOUT || "60000", 10),
      headers,
    });

    this.logger.info(`Visual Engine agent initialized with Python API at ${this.pythonApiUrl}`);
  }

  /**
   * Initializes the visual engine agent by configuring Express middleware.
   */
  protected async initialize(): Promise<void> {
    // Configure Express to parse JSON bodies
    this.app.use((express as any).json());

    // Setup health endpoint
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.logger.info("Visual Engine agent initialized");
  }

  /**
   * Starts the HTTP server and sets up API endpoints.
   */
  protected async startServer(): Promise<void> {
    // POST endpoint for triggering analysis
    this.app.post("/api/analyze", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;

        this.logger.info(`Triggering visual analysis: ${request.id}`, {
          requestId: request.id,
        });

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/v1/analyze");

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: {
            status: pythonResponse.data.status,
            message: pythonResponse.data.message,
            frameSize: pythonResponse.data.frame_size,
            camera: pythonResponse.data.camera,
            duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        this.logger.info(`Visual analysis triggered (${duration}ms)`, {
          requestId: request.id,
          status: pythonResponse.data.status,
        });

        res.status(202).json(response);
      } catch (error) {
        this.logger.error("Error triggering visual analysis", {
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

    // GET endpoint for status
    this.app.get("/api/status", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/v1/status");

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting visual engine status", {
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

    // GET endpoint for faces
    this.app.get("/api/faces", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/v1/faces");

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting faces", {
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

    // POST endpoint for adding faces
    this.app.post("/api/faces", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        const name = inputs?.name as string;
        const imageData = inputs?.imageData as string; // Base64 encoded image

        if (!name || !imageData) {
          const errorResponse: AgentResponse = {
            success: false,
            data: {
              error: "Missing required parameters: name and imageData",
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
        const pythonResponse = await this.axiosClient.post("/api/v1/faces", {
          name,
          image_data: imageData,
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error adding face", {
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

    // GET endpoint for locations
    this.app.get("/api/locations", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/v1/locations");

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting locations", {
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

    // GET endpoint for events
    this.app.get("/api/events", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const limit = parseInt((req.query.limit as string) || "50", 10);
        const offset = parseInt((req.query.offset as string) || "0", 10);

        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/v1/events", {
          params: { limit, offset },
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting events", {
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

    // POST endpoint for spatial query
    this.app.post("/api/spatial/query", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        const query = inputs?.query as string;
        const personId = inputs?.personId as string;

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
        const pythonResponse = await this.axiosClient.post("/api/v1/spatial/query", {
          query,
          person_id: personId,
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error querying spatial memory", {
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

    // GET endpoint for intelligence insights
    this.app.get("/api/intelligence/insights", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/v1/intelligence/insights");

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: true,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting intelligence insights", {
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

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.server = this.app
        .listen(this.port, () => {
          this.logger.info(`Visual Engine agent server listening on port ${this.port}`);
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
      "visual_analysis",
      "face_recognition",
      "spatial_memory",
      "motion_detection",
      "scene_analysis",
      "object_detection",
      "intelligence_insights",
      "event_tracking",
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
    this.logger.info("Restarting Visual Engine agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
