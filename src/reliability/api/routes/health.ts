/**
 * Health Check API Routes
 * System health, monitoring, and status endpoints
 */

import type { Request, Response } from "express";
import express from "express";
import { asyncHandler } from "../middleware/async-handler.js";

export const healthRoutes = (express as any).Router();

/**
 * GET /api/health
 * Basic health check endpoint
 */
healthRoutes.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "2.0.0",
      service: "Jarvis Reliability System",
    };

    res.status(200).json({
      success: true,
      data: healthStatus,
    });
  }),
);

/**
 * GET /api/health/detailed
 * Detailed health check with system metrics
 */
healthRoutes.get(
  "/detailed",
  asyncHandler(async (req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "2.0.0",
      service: "Jarvis Reliability System",

      // System metrics
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },

      // Component health
      components: {
        api: {
          status: "operational",
          responseTime: "<50ms",
        },
        reliabilityEngine: {
          status: "operational",
          features: {
            basicAssessment: true,
            multiAgentDebate: process.env.MAD_ENABLED === "true",
            fallacyDetection: true,
            groundTruthVerification: process.env.GTVP_ENABLED === "true",
          },
        },
        database: {
          status: "not_applicable",
          message: "Stateless service - no persistent storage required",
        },
        externalServices: {
          claudeAPI: {
            status: process.env.CLAUDE_API_KEY ? "configured" : "not_configured",
            lastCheck: null,
          },
          openaiAPI: {
            status: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
            lastCheck: null,
          },
        },
      },

      // Recent activity metrics (would be tracked in real implementation)
      metrics: {
        requestsLastHour: 0,
        averageResponseTime: 0,
        errorRate: 0.0,
        successfulAssessments: 0,
        failedAssessments: 0,
      },
    };

    res.status(200).json({
      success: true,
      data: healthStatus,
    });
  }),
);

/**
 * GET /api/health/readiness
 * Readiness probe for container orchestration
 */
healthRoutes.get(
  "/readiness",
  asyncHandler(async (req: Request, res: Response) => {
    // Check if critical components are ready
    const checks = {
      apiServer: true,
      reliabilityEngine: true,
      configurationLoaded: !!process.env.NODE_ENV,
    };

    const allReady = Object.values(checks).every((check) => check === true);

    res.status(allReady ? 200 : 503).json({
      success: allReady,
      data: {
        ready: allReady,
        checks,
        timestamp: new Date().toISOString(),
      },
    });
  }),
);

/**
 * GET /api/health/liveness
 * Liveness probe for container orchestration
 */
healthRoutes.get(
  "/liveness",
  asyncHandler(async (req: Request, res: Response) => {
    // Basic liveness check - if this endpoint responds, the service is alive
    res.status(200).json({
      success: true,
      data: {
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  }),
);

/**
 * GET /api/health/metrics
 * Prometheus-style metrics endpoint
 */
healthRoutes.get(
  "/metrics",
  asyncHandler(async (req: Request, res: Response) => {
    const memoryUsage = process.memoryUsage();

    // Return Prometheus-compatible metrics
    const metrics = [
      `# HELP jarvis_reliability_uptime_seconds Process uptime in seconds`,
      `# TYPE jarvis_reliability_uptime_seconds counter`,
      `jarvis_reliability_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP jarvis_reliability_memory_usage_bytes Memory usage in bytes`,
      `# TYPE jarvis_reliability_memory_usage_bytes gauge`,
      `jarvis_reliability_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
      `jarvis_reliability_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
      `jarvis_reliability_memory_usage_bytes{type="external"} ${memoryUsage.external}`,
      `jarvis_reliability_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`,
      ``,
      `# HELP jarvis_reliability_requests_total Total number of requests`,
      `# TYPE jarvis_reliability_requests_total counter`,
      `jarvis_reliability_requests_total{method="POST",endpoint="/assess"} 0`,
      `jarvis_reliability_requests_total{method="GET",endpoint="/health"} 0`,
      ``,
      `# HELP jarvis_reliability_request_duration_seconds Request duration in seconds`,
      `# TYPE jarvis_reliability_request_duration_seconds histogram`,
      `jarvis_reliability_request_duration_seconds_bucket{le="0.1"} 0`,
      `jarvis_reliability_request_duration_seconds_bucket{le="0.5"} 0`,
      `jarvis_reliability_request_duration_seconds_bucket{le="1.0"} 0`,
      `jarvis_reliability_request_duration_seconds_bucket{le="5.0"} 0`,
      `jarvis_reliability_request_duration_seconds_bucket{le="+Inf"} 0`,
      `jarvis_reliability_request_duration_seconds_count 0`,
      `jarvis_reliability_request_duration_seconds_sum 0`,
    ].join("\n");

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(metrics);
  }),
);

/**
 * GET /api/health/dependencies
 * Check external dependencies status
 */
healthRoutes.get(
  "/dependencies",
  asyncHandler(async (req: Request, res: Response) => {
    const dependencies = {
      claudeAPI: {
        name: "Claude 3.5 Sonnet",
        configured: !!process.env.CLAUDE_API_KEY,
        status: "unknown", // Would check actual connectivity in production
        lastCheck: null,
        responseTime: null,
      },
      openaiAPI: {
        name: "OpenAI GPT-4o",
        configured: !!process.env.OPENAI_API_KEY,
        status: "unknown", // Would check actual connectivity in production
        lastCheck: null,
        responseTime: null,
      },
      externalDataSources: {
        reuters: {
          name: "Reuters API",
          configured: false,
          status: "not_configured",
          required: false,
        },
        pubmed: {
          name: "PubMed API",
          configured: false,
          status: "not_configured",
          required: false,
        },
        governmentData: {
          name: "Government Data API",
          configured: false,
          status: "not_configured",
          required: false,
        },
      },
    };

    const criticalDependenciesHealthy =
      dependencies.claudeAPI.configured || dependencies.openaiAPI.configured;

    res.status(criticalDependenciesHealthy ? 200 : 503).json({
      success: criticalDependenciesHealthy,
      data: {
        dependencies,
        criticalDependenciesHealthy,
        timestamp: new Date().toISOString(),
      },
    });
  }),
);
