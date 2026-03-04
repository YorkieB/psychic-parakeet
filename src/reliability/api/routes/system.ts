/**
 * System API Routes
 * System status, configuration, and management endpoints
 */

import type { Request, Response } from "express";
import express from "express";
import { asyncHandler } from "../middleware/async-handler.js";

export const systemRoutes = (express as any).Router();

/**
 * GET /api/system/status
 * Overall system status for Jarvis integration
 */
systemRoutes.get(
  "/status",
  asyncHandler(async (req: Request, res: Response) => {
    const systemStatus = {
      service: "Jarvis Reliability System",
      version: "2.0.0",
      status: "operational",
      timestamp: new Date().toISOString(),

      // Core capabilities
      capabilities: {
        reliabilityAssessment: {
          enabled: true,
          status: "operational",
          features: {
            basicScoring: true,
            aiAssessment: true,
            consensusMode: true,
            batchProcessing: true,
          },
        },
        multiAgentDebate: {
          enabled: process.env.MAD_ENABLED === "true",
          status: process.env.MAD_ENABLED === "true" ? "operational" : "disabled",
          features: {
            prosecutorDefenseDebate: true,
            judgeEvaluation: true,
            fallacyDetection: true,
            ragVerification: true,
            selfConsistency: true,
          },
        },
        groundTruthVerification: {
          enabled: process.env.GTVP_ENABLED === "true",
          status: process.env.GTVP_ENABLED === "true" ? "operational" : "disabled",
          features: {
            tripleAuthorityVerification: true,
            conflictResolution: true,
            datasetGeneration: true,
          },
        },
      },

      // Integration points for other Jarvis components
      integrationPoints: {
        restAPI: {
          endpoint: "/api",
          version: "2.0.0",
          authentication: process.env.ENABLE_AUTH === "true",
          rateLimit: true,
        },
        webSocket: {
          endpoint: "/socket.io",
          enabled: process.env.ENABLE_WEBSOCKET !== "false",
          realTimeAssessment: true,
        },
        jarvisMessaging: {
          status: "ready",
          supportedFormats: ["json", "structured"],
          responseTypes: ["reliability_score", "detailed_analysis", "batch_results"],
        },
      },

      // Performance metrics
      performance: {
        uptime: process.uptime(),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        requestsProcessed: 0, // Would track in real implementation
        averageResponseTime: 0,
        errorRate: 0.0,
      },
    };

    res.status(200).json({
      success: true,
      data: systemStatus,
    });
  }),
);

/**
 * GET /api/system/config
 * System configuration for other Jarvis components
 */
systemRoutes.get(
  "/config",
  asyncHandler(async (req: Request, res: Response) => {
    const config = {
      service: {
        name: "Jarvis Reliability System",
        version: "2.0.0",
        environment: process.env.NODE_ENV || "development",
      },

      // API configuration
      api: {
        version: "2.0.0",
        baseUrl: "/api",
        endpoints: {
          assess: "/api/reliability/assess",
          batch: "/api/reliability/batch",
          verify: "/api/gtvp/verify",
          health: "/api/health",
        },
        limits: {
          maxRequestSize: "10mb",
          rateLimitPerMinute: 100,
          maxBatchSize: 50,
          maxConcurrentRequests: 10,
        },
      },

      // Feature flags for Jarvis integration
      features: {
        basicReliabilityAssessment: true,
        multiAgentDebate: process.env.MAD_ENABLED === "true",
        fallacyDetection: true,
        groundTruthVerification: process.env.GTVP_ENABLED === "true",
        batchProcessing: true,
        realTimeWebSocket: process.env.ENABLE_WEBSOCKET !== "false",
        backgroundProcessing: true,
      },

      // AI providers configuration
      aiProviders: {
        primary: {
          provider: "claude",
          model: "claude-3-5-sonnet-20241022",
          configured: !!process.env.CLAUDE_API_KEY,
          maxTokens: 4000,
          temperature: 0.1,
        },
        secondary: {
          provider: "openai",
          model: "gpt-4o",
          configured: !!process.env.OPENAI_API_KEY,
          maxTokens: 4000,
          temperature: 0.1,
        },
      },

      // Integration schemas
      schemas: {
        assessmentRequest: {
          required: ["sourceUrl"],
          optional: ["sourceContent", "priority", "madOptions", "gtvpOptions"],
          responseFormat: "JarvisReliabilityResponse",
        },
        verificationRequest: {
          required: ["claim", "sourceUrl", "domain"],
          optional: ["options"],
          responseFormat: "GTVPVerificationResponse",
        },
      },
    };

    res.status(200).json({
      success: true,
      data: config,
    });
  }),
);

/**
 * GET /api/system/integration
 * Integration guide for other Jarvis components
 */
systemRoutes.get(
  "/integration",
  asyncHandler(async (req: Request, res: Response) => {
    const integrationGuide = {
      overview: "Integration guide for connecting Jarvis components to the Reliability System",
      version: "2.0.0",

      // Quick start for other Jarvis components
      quickStart: {
        basicAssessment: {
          endpoint: "POST /api/reliability/assess",
          minimumPayload: {
            sourceUrl: "https://example.com/article",
            jarvisContext: {
              componentId: "jarvis-search",
              requestId: "unique-request-id",
            },
          },
          expectedResponse: {
            reliability: { score: 0.85, label: "high", confidence: 0.9 },
            processing: { totalTime: 2500, providersUsed: ["claude"] },
          },
        },
        batchAssessment: {
          endpoint: "POST /api/reliability/batch",
          useCase: "Process multiple sources from search results",
          maxSources: 50,
        },
        realTimeWebSocket: {
          endpoint: "ws://host:port/socket.io",
          events: ["assessment_request", "assessment_complete", "assessment_error"],
          authentication: "JWT token required if auth enabled",
        },
      },

      // Common integration patterns
      patterns: {
        searchIntegration: {
          description: "Assess reliability of search results before presenting to user",
          workflow: [
            "1. Jarvis Search finds sources",
            "2. Send batch assessment request",
            "3. Filter/rank results by reliability",
            "4. Present to user with reliability indicators",
          ],
        },
        chatIntegration: {
          description: "Real-time assessment of sources during conversation",
          workflow: [
            "1. User asks question referencing a source",
            "2. Send WebSocket assessment request",
            "3. Receive real-time reliability feedback",
            "4. Include reliability context in response",
          ],
        },
        knowledgeBaseIntegration: {
          description: "Verify ground truth when building knowledge base",
          workflow: [
            "1. Identify claims requiring verification",
            "2. Use GTVP verification endpoint",
            "3. Store verification results with claims",
            "4. Use for future knowledge validation",
          ],
        },
      },

      // Error handling
      errorHandling: {
        standardErrors: {
          400: "Bad Request - Invalid payload or parameters",
          401: "Unauthorized - Missing or invalid authentication",
          429: "Too Many Requests - Rate limit exceeded",
          500: "Internal Server Error - System failure",
        },
        retryStrategy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
        fallbackBehavior: "Return basic heuristic scores if AI assessment fails",
      },

      // Authentication for Jarvis ecosystem
      authentication: {
        enabled: process.env.ENABLE_AUTH === "true",
        type: "JWT",
        header: "Authorization: Bearer <token>",
        claims: {
          iss: "jarvis-auth-service",
          aud: "jarvis-reliability-service",
          componentId: "required-for-tracking",
        },
      },
    };

    res.status(200).json({
      success: true,
      data: integrationGuide,
    });
  }),
);

/**
 * GET /api/system/schema
 * API schema for code generation and validation
 */
systemRoutes.get(
  "/schema",
  asyncHandler(async (req: Request, res: Response) => {
    const apiSchema = {
      openapi: "3.0.0",
      info: {
        title: "Jarvis Reliability System API",
        version: "2.0.0",
        description: "Source reliability assessment with advanced AI capabilities",
      },
      servers: [
        {
          url: "/api",
          description: "Jarvis Reliability API",
        },
      ],
      components: {
        schemas: {
          JarvisReliabilityRequest: {
            type: "object",
            required: ["sourceUrl"],
            properties: {
              sourceUrl: { type: "string", format: "uri" },
              sourceContent: { type: "string" },
              priority: { type: "string", enum: ["low", "normal", "high"] },
              jarvisContext: {
                type: "object",
                properties: {
                  componentId: { type: "string" },
                  requestId: { type: "string" },
                  userId: { type: "string" },
                  sessionId: { type: "string" },
                },
              },
            },
          },
          JarvisReliabilityResponse: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  reliability: {
                    type: "object",
                    properties: {
                      score: { type: "number", minimum: 0, maximum: 1 },
                      label: { type: "string", enum: ["unreliable", "low", "moderate", "high"] },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                    },
                  },
                  assessment: {
                    type: "object",
                    properties: {
                      reasoning: { type: "array", items: { type: "string" } },
                      evidence: { type: "array", items: { type: "string" } },
                    },
                  },
                  processing: {
                    type: "object",
                    properties: {
                      totalTime: { type: "number" },
                      providersUsed: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    res.status(200).json({
      success: true,
      data: apiSchema,
    });
  }),
);

/**
 * GET /api/system/version
 * Version information for compatibility checking
 */
systemRoutes.get(
  "/version",
  asyncHandler(async (req: Request, res: Response) => {
    const versionInfo = {
      service: "Jarvis Reliability System",
      version: "2.0.0",
      apiVersion: "2.0.0",
      buildDate: new Date().toISOString(),
      nodeVersion: process.version,

      // Compatibility information
      compatibility: {
        jarvisCore: ">=3.0.0",
        jarvisSearch: ">=2.1.0",
        jarvisChat: ">=4.0.0",
        jarvisKnowledge: ">=1.5.0",
      },

      // Feature support by version
      features: {
        "2.0.0": [
          "Multi-Agent Debate Framework",
          "Enhanced Fallacy Detection",
          "Ground Truth Verification Protocol",
          "WebSocket Real-time Assessment",
          "Batch Processing",
          "Jarvis Integration API",
        ],
        "1.0.0": ["Basic Reliability Assessment", "AI-powered Analysis", "REST API"],
      },

      // Breaking changes
      breakingChanges: {
        "2.0.0": [
          "API response format updated for Jarvis integration",
          "Authentication scheme changed to JWT",
          "WebSocket events restructured",
        ],
      },
    };

    res.status(200).json({
      success: true,
      data: versionInfo,
    });
  }),
);
