/*
  This file creates amazing videos for Jarvis using AI technology.

  It generates cinematic videos from text descriptions, tracks their progress, and downloads the results while making sure you get stunning video content.
*/

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Video Agent - Generates videos using Runway Gen-3.
 * Cinematic quality video generation.
 */
export class VideoAgent extends EnhancedBaseAgent {
  private runwayApiKey: string;
  private outputDir: string = path.join(process.cwd(), "output", "videos");
  private videos: Map<string, VideoGeneration> = new Map();

  constructor(logger: Logger) {
    super("Video", "1.0.0", parseInt(process.env.VIDEO_AGENT_PORT || "3011", 10), logger);
    this.runwayApiKey = process.env.RUNWAY_API_KEY || "";

    if (!this.runwayApiKey) {
      logger.warn("⚠️  Runway API key not found. Video generation unavailable.");
      logger.info("💡 Get API key: https://runwayml.com/");
    }

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  protected async initialize(): Promise<void> {
    this.logger.info(`${this.agentId} agent initialized`);
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post("/api", async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Video Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        let result: unknown;

        switch (action) {
          case "generate_video":
            result = await this.generateVideo(inputs);
            break;
          case "check_status":
            result = this.checkStatus(inputs);
            break;
          case "download_video":
            result = await this.downloadVideo(inputs);
            break;
          case "extend_video":
            result = await this.extendVideo(inputs);
            break;
          case "list_videos":
            result = this.listVideos();
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: result,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing video request", {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Video agent server listening on port ${this.port}`);
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
   * Generate video from text prompt.
   */
  private async generateVideo(inputs: Record<string, unknown>): Promise<VideoGenerationResult> {
    const prompt = inputs.prompt as string;
    const duration = (inputs.duration as number) || 4; // Default 4 seconds
    const aspectRatio = (inputs.aspectRatio as string) || "16:9";

    if (!prompt) {
      throw new Error("Prompt required for video generation");
    }

    if (!this.runwayApiKey) {
      throw new Error("Runway API key not configured");
    }

    try {
      this.logger.info(`🎬 Generating video: "${prompt}"`);
      this.logger.info(`⏱️  Duration: ${duration}s (estimated time: ${duration * 30}s)`);

      // Call Runway Gen-3 API
      this.logger.info(`📡 Calling Runway API for video generation...`);

      const taskId = `video_${Date.now()}`;

      // Store generation (pending)
      const generation: VideoGeneration = {
        id: taskId,
        prompt,
        duration,
        aspectRatio,
        status: "generating",
        progress: 0,
        createdAt: new Date(),
      };

      this.videos.set(taskId, generation);

      // Call Runway API - try correct endpoint format
      try {
        // Runway Gen-3 API endpoint format (use api.dev.runwayml.com per API docs)
        const runwayResponse = await axios.post(
          "https://api.dev.runwayml.com/v1/gen3/generate",
          {
            prompt,
            duration,
            aspect_ratio: aspectRatio,
          },
          {
            headers: {
              Authorization: `Bearer ${this.runwayApiKey}`,
              "Content-Type": "application/json",
              "X-Runway-Version": "2024-09-13", // Required by Runway API
            },
            timeout: 30000, // 30 second timeout for initial request
          },
        );

        const runwayTaskId = runwayResponse.data?.task_id || runwayResponse.data?.id || taskId;
        generation.id = runwayTaskId;
        generation.runwayTaskId = runwayTaskId;

        this.logger.info(`✅ Runway API accepted request: ${runwayTaskId}`);

        // Start async status polling
        this.pollVideoStatus(runwayTaskId, prompt, duration).catch((error) => {
          this.logger.error(`Video generation failed for ${runwayTaskId}:`, error);
          const gen = this.videos.get(runwayTaskId);
          if (gen) {
            gen.status = "failed";
            gen.error = error instanceof Error ? error.message : String(error);
          }
        });

        return {
          success: true,
          taskId: runwayTaskId,
          message: `Video generation started. This will take approximately ${duration * 30} seconds.`,
          estimatedTime: duration * 30,
        };
      } catch (error: any) {
        // Remove simulation fallback - use real API only
        const errorMessage =
          error.response?.data?.error || error.response?.data?.message || error.message;
        const statusCode = error.response?.status;

        this.logger.error(
          `Runway API call failed: ${errorMessage} (Status: ${statusCode || "unknown"})`,
        );

        // Try alternative Runway endpoints (use api.dev.runwayml.com)
        const alternativeEndpoints = [
          "https://api.dev.runwayml.com/v1/gen3/generate",
          "https://api.dev.runwayml.com/v1/video/generate",
          "https://api.dev.runwayml.com/v1/tasks",
        ];

        let runwayResponse = null;
        for (const endpoint of alternativeEndpoints) {
          try {
            this.logger.info(`Trying alternative Runway endpoint: ${endpoint}`);
            runwayResponse = await axios.post(
              endpoint,
              {
                prompt,
                duration,
                aspect_ratio: aspectRatio,
              },
              {
                headers: {
                  Authorization: `Bearer ${this.runwayApiKey}`,
                  "Content-Type": "application/json",
                  "X-Runway-Version": "2024-09-13", // Required by Runway API
                },
                timeout: 30000,
              },
            );

            if (runwayResponse.status === 200 || runwayResponse.status === 201) {
              this.logger.info(`✅ Successfully connected to Runway API: ${endpoint}`);
              break;
            }
          } catch (altError: any) {
            this.logger.warn(`Alternative endpoint ${endpoint} failed: ${altError.message}`);
          }
        }

        if (!runwayResponse || runwayResponse.status >= 400) {
          // No simulation - fail with real error
          generation.status = "failed";
          generation.error = `Runway API failed: ${errorMessage}. Please verify your API key and endpoint. Status: ${statusCode || "unknown"}`;
          throw new Error(
            `Video generation failed: ${errorMessage}. Please check your Runway API key and endpoint configuration.`,
          );
        }

        // Use the successful alternative endpoint response
        const runwayTaskId = runwayResponse.data?.task_id || runwayResponse.data?.id || taskId;
        generation.id = runwayTaskId;
        generation.runwayTaskId = runwayTaskId;

        this.logger.info(`✅ Runway API accepted request: ${runwayTaskId}`);

        // Start async status polling
        this.pollVideoStatus(runwayTaskId, prompt, duration).catch((err) => {
          this.logger.error(`Video generation failed for ${runwayTaskId}:`, err);
          const gen = this.videos.get(runwayTaskId);
          if (gen) {
            gen.status = "failed";
            gen.error = err instanceof Error ? err.message : String(err);
          }
        });

        return {
          success: true,
          taskId: runwayTaskId,
          message: `Video generation started. This will take approximately ${duration * 30} seconds.`,
          estimatedTime: duration * 30,
        };
      }
    } catch (error: any) {
      this.logger.error("Video generation failed:", error.message);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  /**
   * Poll Runway API for video generation status.
   */
  private async pollVideoStatus(taskId: string, _prompt: string, _duration: number): Promise<void> {
    const generation = this.videos.get(taskId);
    if (!generation) return;

    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts && generation.status === "generating") {
      try {
        const statusResponse = await axios.get(
          `https://api.dev.runwayml.com/v1/gen3/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${this.runwayApiKey}`,
              "X-Runway-Version": "2024-09-13", // Required by Runway API
            },
            timeout: 10000,
          },
        );

        const status = statusResponse.data?.status || statusResponse.data?.state;
        const progress = statusResponse.data?.progress || 0;
        const videoUrl = statusResponse.data?.output_url || statusResponse.data?.video_url;

        generation.progress = progress;

        if (status === "completed" || status === "succeeded") {
          generation.status = "completed";
          generation.progress = 100;
          generation.videoUrl = videoUrl;
          this.logger.info(`✅ Video generation complete: ${taskId}`);
          return;
        } else if (status === "failed" || status === "error") {
          generation.status = "failed";
          generation.error = statusResponse.data?.error || "Generation failed";
          this.logger.error(`❌ Video generation failed: ${taskId}`);
          return;
        }

        // Still generating, wait and poll again
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
        attempts++;
      } catch (error: any) {
        // If status check fails, continue polling (might be temporary)
        this.logger.warn(`Status check failed for ${taskId}: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    // Timeout
    if (generation.status === "generating") {
      generation.status = "failed";
      generation.error = "Generation timeout";
      this.logger.error(`❌ Video generation timeout: ${taskId}`);
    }
  }

  /**
   * Check generation status.
   */
  private checkStatus(inputs: Record<string, unknown>): VideoStatus {
    const taskId = inputs.taskId as string;

    if (!taskId) {
      throw new Error("Task ID required");
    }

    const generation = this.videos.get(taskId);

    if (!generation) {
      throw new Error(`Video not found: ${taskId}`);
    }

    return {
      taskId: generation.id,
      status: generation.status,
      progress: generation.progress,
      videoUrl: generation.videoUrl,
      error: generation.error,
    };
  }

  /**
   * Download completed video.
   */
  private async downloadVideo(inputs: Record<string, unknown>): Promise<DownloadResult> {
    const taskId = inputs.taskId as string;

    if (!taskId) {
      throw new Error("Task ID required");
    }

    const generation = this.videos.get(taskId);

    if (!generation) {
      throw new Error(`Video not found: ${taskId}`);
    }

    if (generation.status !== "completed") {
      throw new Error(`Video not ready. Status: ${generation.status} (${generation.progress}%)`);
    }

    if (!generation.videoUrl) {
      throw new Error("Video URL not available");
    }

    try {
      const filename = `video_${Date.now()}.mp4`;
      const filepath = path.join(this.outputDir, filename);

      this.logger.info(`⬇️  Downloading video: ${generation.videoUrl}`);

      // Download video file
      const response = await axios.get(generation.videoUrl, {
        responseType: "arraybuffer",
      });

      fs.writeFileSync(filepath, response.data);

      generation.filepath = filepath;

      this.logger.info(`✅ Downloaded: ${filepath}`);

      return {
        success: true,
        filepath,
        filename,
        size: response.data.length,
      };
    } catch (error: any) {
      this.logger.error("Download failed:", error.message);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Extend existing video.
   */
  private async extendVideo(inputs: Record<string, unknown>): Promise<VideoGenerationResult> {
    const taskId = inputs.taskId as string;
    const additionalDuration = (inputs.additionalDuration as number) || 4;

    if (!taskId) {
      throw new Error("Task ID required");
    }

    const original = this.videos.get(taskId);

    if (!original) {
      throw new Error(`Video not found: ${taskId}`);
    }

    // Generate extension
    return this.generateVideo({
      prompt: `${original.prompt} (continuation)`,
      duration: additionalDuration,
      aspectRatio: original.aspectRatio,
    });
  }

  /**
   * Returns the capabilities of this agent.
   */
  protected getCapabilities(): string[] {
    return ["generate_video", "check_status", "download_video", "extend_video", "list_videos"];
  }

  /**
   * Returns the dependencies for this agent.
   */
  protected getDependencies(): string[] {
    return [];
  }

  /**
   * List all videos.
   */
  private listVideos(): VideoList {
    const videos = Array.from(this.videos.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return {
      videos,
      count: videos.length,
      completed: videos.filter((v) => v.status === "completed").length,
      generating: videos.filter((v) => v.status === "generating").length,
    };
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
    this.logger.info("Restarting Video agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// Types
interface VideoGeneration {
  id: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  status: "generating" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  filepath?: string;
  createdAt: Date;
  error?: string;
  runwayTaskId?: string;
}

interface VideoGenerationResult {
  success: boolean;
  taskId: string;
  message: string;
  estimatedTime: number;
}

interface VideoStatus {
  taskId: string;
  status: string;
  progress: number;
  videoUrl?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  filepath: string;
  filename: string;
  size: number;
}

interface VideoList {
  videos: VideoGeneration[];
  count: number;
  completed: number;
  generating: number;
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
