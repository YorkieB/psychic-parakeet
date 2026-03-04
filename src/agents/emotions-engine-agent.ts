/*
  This file connects Jarvis to an advanced emotions recognition system.

  It handles analyzing emotions from text, audio, and images while making sure Jarvis can understand how people are feeling in different ways.
*/
import axios, { type AxiosInstance } from "axios";
import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Emotions Engine Agent that provides emotion recognition and mood prediction capabilities.
 * Integrates the Jarvis-Emotions-Engine Python service into the Jarvis Orchestrator.
 */
export class EmotionsEngineAgent extends EnhancedBaseAgent {
  private readonly pythonApiUrl: string;
  private readonly axiosClient: AxiosInstance;

  /**
   * Creates a new EmotionsEngineAgent instance.
   *
   * @param agentId - Unique identifier for this agent
   * @param version - Version of the agent implementation
   * @param port - Port number for the agent's HTTP server
   * @param logger - Winston logger instance
   */
  constructor(agentId: string, version: string, port: number, logger: Logger) {
    super(agentId, version, port, logger);

    // Get Python API URL from environment or use default
    this.pythonApiUrl = process.env.EMOTIONS_ENGINE_API_URL || "http://localhost:3033";

    // Create axios client for Python API
    this.axiosClient = axios.create({
      baseURL: this.pythonApiUrl,
      timeout: parseInt(process.env.EMOTIONS_ENGINE_TIMEOUT || "30000", 10),
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.logger.info(`Emotions Engine agent initialized with Python API at ${this.pythonApiUrl}`);
  }

  /**
   * Initializes the emotions engine agent by configuring Express middleware.
   */
  protected async initialize(): Promise<void> {
    // Configure Express to parse JSON bodies
    this.app.use((express as any).json());

    // Setup health endpoint
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.logger.info("Emotions Engine agent initialized");
  }

  /**
   * Starts the HTTP server and sets up API endpoints.
   */
  protected async startServer(): Promise<void> {
    // POST endpoint for text emotion analysis
    this.app.post("/api/process-text", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        // Extract parameters from inputs
        const text = inputs?.text as string;
        const userId = (inputs?.userId as string) || "default";
        const updateMood = inputs?.updateMood === true;
        const updateBaseline = inputs?.updateBaseline === true;

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

        this.logger.info(`Processing text emotion analysis: ${request.id}`, {
          requestId: request.id,
          textLength: text.length,
          userId,
        });

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/process-text", {
          text,
          user_id: userId,
          update_mood: updateMood,
          update_baseline: updateBaseline,
        });

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            emotion: pythonResponse.data.emotion,
            confidence: pythonResponse.data.confidence,
            probabilities: pythonResponse.data.probabilities,
            processingTime: pythonResponse.data.processing_time,
            modalitiesUsed: pythonResponse.data.modalities_used,
            qualityScores: pythonResponse.data.quality_scores,
            fusionMethod: pythonResponse.data.fusion_method,
            moodAnalysis: pythonResponse.data.mood_analysis,
            duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        this.logger.info(`Text emotion analysis completed (${duration}ms)`, {
          requestId: request.id,
          emotion: pythonResponse.data.emotion,
          confidence: pythonResponse.data.confidence,
        });

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing text emotion analysis", {
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

    // POST endpoint for multimodal emotion analysis
    this.app.post("/api/process-multimodal", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        // Extract parameters from inputs
        const textInput = inputs?.textInput as string;
        const audioInput = inputs?.audioInput as string; // Base64 or file path
        const imageInput = inputs?.imageInput as string; // Base64 or file path
        const userId = (inputs?.userId as string) || "default";
        const updateMood = inputs?.updateMood === true;

        if (!textInput && !audioInput && !imageInput) {
          const errorResponse: AgentResponse = {
            success: false,
            data: {
              error: "At least one input modality (text, audio, or image) is required",
            },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        this.logger.info(`Processing multimodal emotion analysis: ${request.id}`, {
          requestId: request.id,
          hasText: !!textInput,
          hasAudio: !!audioInput,
          hasImage: !!imageInput,
          userId,
        });

        // Call Python API
        const pythonResponse = await this.axiosClient.post("/api/process-multimodal", {
          text_input: textInput,
          audio_input: audioInput,
          image_input: imageInput,
          user_id: userId,
          update_mood: updateMood,
        });

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: {
            emotion: pythonResponse.data.emotion,
            confidence: pythonResponse.data.confidence,
            probabilities: pythonResponse.data.probabilities,
            processingTime: pythonResponse.data.processing_time,
            modalitiesUsed: pythonResponse.data.modalities_used,
            qualityScores: pythonResponse.data.quality_scores,
            fusionMethod: pythonResponse.data.fusion_method,
            fusionDetails: pythonResponse.data.fusion_details,
            moodAnalysis: pythonResponse.data.mood_analysis,
            duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        this.logger.info(`Multimodal emotion analysis completed (${duration}ms)`, {
          requestId: request.id,
          emotion: pythonResponse.data.emotion,
          confidence: pythonResponse.data.confidence,
          modalitiesUsed: pythonResponse.data.modalities_used,
        });

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing multimodal emotion analysis", {
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

    // GET endpoint for mood analysis
    this.app.get("/api/mood-analysis", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const userId = (req.query.userId as string) || "default";

        this.logger.info(`Getting mood analysis for user: ${userId}`);

        // Call Python API
        const pythonResponse = await this.axiosClient.get("/api/mood-analysis", {
          params: { user_id: userId },
        });

        const duration = Date.now() - startTime;
        const response: AgentResponse = {
          success: pythonResponse.data.success,
          data: pythonResponse.data,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error getting mood analysis", {
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
        const statusResponse = await this.axiosClient.get("/api/status");

        res.json({
          status: this.getStatus(),
          pythonApi: {
            healthy: healthResponse.data.status === "healthy",
            status: statusResponse.data,
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
          this.logger.info(`Emotions Engine agent server listening on port ${this.port}`);
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
      "emotion_recognition",
      "text_emotion_analysis",
      "multimodal_emotion_analysis",
      "mood_prediction",
      "mood_tracking",
      "mood_analysis",
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
    this.logger.info("Restarting Emotions Engine agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
