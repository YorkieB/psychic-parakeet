/**
 * Reliability Assessment API Routes
 * Core endpoints for source reliability evaluation
 */

import type { Request, Response } from "express";
import express from "express";
import type { ReliabilityAlgorithm } from "../../components/reliability-algorithm/reliability-algorithm.js";
import type {
  ReliabilityAssessmentRequest,
  ReliabilityAssessmentResult,
} from "../../components/reliability-algorithm/types.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { validationMiddleware } from "../middleware/validation.js";

interface JarvisReliabilityRequest extends Request {
  body: {
    sourceUrl: string;
    sourceContent?: string;
    priority?: "low" | "normal" | "high";
    forceConsensus?: boolean;
    runInBackground?: boolean;
    madOptions?: {
      forceMad?: boolean;
      useRAGVerification?: boolean;
      useFallacyDetection?: boolean;
      useSelfConsistency?: boolean;
      customRounds?: number;
    };
    gtvpOptions?: {
      forceGTVP?: boolean;
      minimumAuthorities?: number;
      confidenceThreshold?: number;
    };
    jarvisContext?: {
      componentId: string;
      requestId: string;
      userId?: string;
      sessionId?: string;
    };
  };
}

interface BatchAssessmentRequest extends Request {
  body: {
    sources: Array<{
      id: string;
      sourceUrl: string;
      sourceContent?: string;
      priority?: "low" | "normal" | "high";
    }>;
    options?: {
      maxConcurrent?: number;
      timeout?: number;
    };
    jarvisContext?: {
      componentId: string;
      requestId: string;
      userId?: string;
      sessionId?: string;
    };
  };
}

export function reliabilityRoutes(reliabilityAlgorithm: ReliabilityAlgorithm): any {
  const router = (express as any).Router();

  /**
   * POST /api/reliability/assess
   * Assess the reliability of a single source
   */
  router.post(
    "/assess",
    validationMiddleware("reliabilityAssessment"),
    asyncHandler(async (req: JarvisReliabilityRequest, res: Response) => {
      const {
        sourceUrl,
        sourceContent,
        priority = "normal",
        forceConsensus,
        runInBackground,
        madOptions,
        gtvpOptions,
        jarvisContext,
      } = req.body;

      // Build assessment request
      const assessmentRequest: ReliabilityAssessmentRequest = {
        sourceUrl,
        sourceContent,
        priority,
        forceConsensus,
        runInBackground,
        madOptions,
        gtvpOptions,
      };

      const startTime = Date.now();

      try {
        const result = await reliabilityAlgorithm.assess(assessmentRequest);
        const processingTime = Date.now() - startTime;

        // Check if this is a background task response
        if ("taskId" in result) {
          // Background task - return task info
          return res.status(202).json({
            taskId: result.taskId,
            status: result.status,
            message: result.message,
            jarvis: {
              requestId: jarvisContext?.requestId || `jarvis-${Date.now()}`,
              componentId: jarvisContext?.componentId || "reliability-system",
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Full assessment result - format response for Jarvis ecosystem
        const jarvisResponse = {
          // Core reliability data
          reliability: {
            score: result.reliabilityScore,
            label: result.reliabilityLabel,
            confidence: result.confidence,
          },

          // Assessment details
          assessment: {
            reasoning: result.reasoning,
            assessmentNotes: result.assessmentNotes,
            factorsAnalyzed: result.factorsAnalyzed,
          },

          // Processing metadata
          processing: {
            totalTime: processingTime,
            providersUsed: result.processingMetadata.providersUsed,
            consensusModeUsed: result.processingMetadata.consensusModeUsed,
            algorithmVersion: result.processingMetadata.algorithmVersion,
            assessmentTimestamp: result.processingMetadata.assessmentTimestamp,
          },

          // Quality metrics
          quality: {
            sourceAnalysis: result.sourceAnalysis,
            aiAssessmentResult: result.aiAssessmentResult,
            warnings: result.processingMetadata.warnings || [],
          },

          // Jarvis integration
          jarvis: {
            requestId: jarvisContext?.requestId || `jarvis-${Date.now()}`,
            componentId: jarvisContext?.componentId || "reliability-system",
            timestamp: new Date().toISOString(),
            version: "2.0.0",
          },
        };

        return res.status(200).json({
          success: true,
          data: jarvisResponse,
          meta: {
            processingTime,
            cacheHit: false,
            apiVersion: "2.0.0",
          },
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: "ASSESSMENT_FAILED",
            message: "Failed to assess source reliability",
            details: error instanceof Error ? error.message : "Unknown error",
            jarvisRequestId: jarvisContext?.requestId,
          },
        });
      }
    }),
  );

  /**
   * POST /api/reliability/batch
   * Assess multiple sources in batch
   */
  router.post(
    "/batch",
    validationMiddleware("batchAssessment"),
    asyncHandler(async (req: BatchAssessmentRequest, res: Response) => {
      const { sources, options = {}, jarvisContext } = req.body;
      const { maxConcurrent = 5, timeout = 30000 } = options;

      const startTime = Date.now();
      const results: any[] = [];
      const errors: any[] = [];

      // Process sources in chunks to avoid overwhelming the system
      const chunks = [];
      for (let i = 0; i < sources.length; i += maxConcurrent) {
        chunks.push(sources.slice(i, i + maxConcurrent));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (source) => {
          try {
            const assessmentRequest: ReliabilityAssessmentRequest = {
              sourceUrl: source.sourceUrl,
              sourceContent: source.sourceContent,
              priority: source.priority || "normal",
            };

            const result = (await Promise.race([
              reliabilityAlgorithm.assess(assessmentRequest),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
            ])) as ReliabilityAssessmentResult;

            results.push({
              id: source.id,
              sourceUrl: source.sourceUrl,
              reliability: {
                score: result.reliabilityScore,
                label: result.reliabilityLabel,
                confidence: result.confidence,
              },
              assessment: {
                reasoning: result.reasoning,
                assessmentNotes: result.assessmentNotes?.slice(0, 3), // Limit for batch response
              },
              processing: {
                providersUsed: result.processingMetadata.providersUsed,
                consensusModeUsed: result.processingMetadata.consensusModeUsed,
              },
            });
          } catch (error) {
            errors.push({
              id: source.id,
              sourceUrl: source.sourceUrl,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        });

        await Promise.allSettled(promises);
      }

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          results,
          errors,
          summary: {
            total: sources.length,
            successful: results.length,
            failed: errors.length,
            processingTime,
          },
        },
        jarvis: {
          requestId: jarvisContext?.requestId || `jarvis-batch-${Date.now()}`,
          componentId: jarvisContext?.componentId || "reliability-system",
          timestamp: new Date().toISOString(),
        },
      });
    }),
  );

  /**
   * GET /api/reliability/status/{requestId}
   * Get status of a background assessment
   */
  router.get(
    "/status/:requestId",
    asyncHandler(async (req: Request, res: Response) => {
      const { requestId } = req.params;

      // In a real implementation, this would check a job queue or database
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          requestId,
          status: "completed", // pending, processing, completed, failed
          progress: 100,
          result: null, // Would contain the assessment result when completed
          estimatedCompletion: null,
        },
      });
    }),
  );

  /**
   * GET /api/reliability/capabilities
   * Get system capabilities and configuration
   */
  router.get(
    "/capabilities",
    asyncHandler(async (req: Request, res: Response) => {
      const madAvailable = reliabilityAlgorithm.isMADAvailable();

      res.status(200).json({
        success: true,
        data: {
          features: {
            basicAssessment: true,
            multiAgentDebate: madAvailable,
            fallacyDetection: true,
            ragVerification: madAvailable,
            selfConsistency: madAvailable,
            groundTruthVerification: false, // Would check GTVP availability
            batchProcessing: true,
            backgroundProcessing: true,
            realTimeWebSocket: true,
          },
          limits: {
            maxBatchSize: 50,
            maxConcurrentAssessments: 10,
            maxContentLength: 1000000, // 1MB
            rateLimitPerMinute: 100,
          },
          aiProviders: [
            { name: "Claude 3.5 Sonnet", available: true, type: "primary" },
            { name: "GPT-4o", available: true, type: "secondary" },
          ],
          version: "2.0.0",
          buildDate: new Date().toISOString(),
        },
      });
    }),
  );

  /**
   * POST /api/reliability/debug
   * Debug endpoint for development (only if enabled)
   */
  if (process.env.NODE_ENV === "development") {
    router.post(
      "/debug",
      asyncHandler(async (req: Request, res: Response) => {
        const { sourceUrl, enableDebugMode: _enableDebugMode = true } = req.body;

        const assessmentRequest: ReliabilityAssessmentRequest = {
          sourceUrl,
          sourceContent: "Debug test content for reliability assessment",
          priority: "normal",
        };

        try {
          const result = await reliabilityAlgorithm.assess(assessmentRequest);

          res.status(200).json({
            success: true,
            debug: true,
            data: {
              result,
              internalState: {
                rulesEngineStatus: "operational",
                aiEngineStatus: "operational",
                madEngineStatus: reliabilityAlgorithm.isMADAvailable() ? "operational" : "disabled",
              },
              performance: {
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime(),
              },
            },
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            debug: true,
            error: {
              message: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
            },
          });
        }
      }),
    );
  }

  return router;
}
