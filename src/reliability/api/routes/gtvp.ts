/**
 * Ground Truth Verification Protocol (GTVP) API Routes
 * Endpoints for multi-authority verification and dataset generation
 */

import type { Request, Response } from "express";
import express from "express";
import type { DatasetGenerationConfig, VerificationRequest } from "../../components/gtvp/index.js";
import { DatasetGenerator, type GTVPEngine } from "../../components/gtvp/index.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { validationMiddleware } from "../middleware/validation.js";

interface GTVPVerificationRequest extends Request {
  body: {
    claim: string;
    sourceUrl: string;
    domain: string;
    sourceId?: string;
    options?: {
      minimumAuthorities?: number;
      confidenceThreshold?: number;
      timeoutMs?: number;
      enableExpertEscalation?: boolean;
    };
    jarvisContext?: {
      componentId: string;
      requestId: string;
      userId?: string;
      sessionId?: string;
    };
  };
}

interface DatasetGenerationRequest extends Request {
  body: {
    config: {
      totalSources: number;
      distributionStrategy: "BALANCED" | "DOMAIN_FOCUSED" | "COMPLEXITY_FOCUSED";
      minimumConfidenceThreshold: number;
      includeKnownConflicts: boolean;
    };
    jarvisContext?: {
      componentId: string;
      requestId: string;
    };
  };
}

export function gtvpRoutes(gtvpEngine: GTVPEngine): any {
  const router = (express as any).Router();

  /**
   * POST /api/gtvp/verify
   * Verify ground truth using multi-authority verification
   */
  router.post(
    "/verify",
    validationMiddleware("gtvpVerification"),
    asyncHandler(async (req: GTVPVerificationRequest, res: Response) => {
      const {
        claim,
        sourceUrl,
        domain,
        sourceId,
        options: _options = {},
        jarvisContext,
      } = req.body;

      const verificationRequest: VerificationRequest = {
        claim,
        sourceUrl,
        domain,
        sourceId: sourceId || `gtvp-${Date.now()}`,
        requestTimestamp: new Date(),
      };

      const startTime = Date.now();

      try {
        const result = await gtvpEngine.verifyGroundTruth(verificationRequest);
        const processingTime = Date.now() - startTime;

        // Format response for Jarvis ecosystem
        const jarvisResponse = {
          // Verification results
          verification: {
            sourceId: result.sourceId,
            claim: result.claim,
            finalConfidence: result.finalConfidence,
            groundTruth: result.groundTruth,
            verificationCount: result.verifications.length,
            conflictCount: result.conflicts.length,
          },

          // Authority details
          authorities: result.verifications.map((v) => ({
            name: v.authority.name,
            tier: v.authority.tier,
            weight: v.authority.weight,
            status: v.status,
            confidence: v.confidence,
            responseTime: v.responseTime,
            evidence: v.evidence.substring(0, 200) + "...", // Truncate for API response
          })),

          // Conflict resolution
          conflicts: result.conflicts.map((c) => ({
            type: c.type,
            reasoning: c.reasoning,
            confidencePenalty: c.confidencePenalty,
          })),

          // Quality indicators
          quality: {
            flags: result.flags,
            processingTime: result.processingTime,
            auditTrail: result.auditTrail.slice(0, 10), // Limit for API response
          },

          // Jarvis integration
          jarvis: {
            requestId: jarvisContext?.requestId || `gtvp-${Date.now()}`,
            componentId: jarvisContext?.componentId || "gtvp-system",
            timestamp: new Date().toISOString(),
            version: "2.0.0",
          },
        };

        res.status(200).json({
          success: true,
          data: jarvisResponse,
          meta: {
            processingTime,
            apiVersion: "2.0.0",
          },
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: "GTVP_VERIFICATION_FAILED",
            message: "Failed to verify ground truth",
            details: error instanceof Error ? error.message : "Unknown error",
            jarvisRequestId: jarvisContext?.requestId,
          },
        });
      }
    }),
  );

  /**
   * POST /api/gtvp/generate-dataset
   * Generate a GTVP-verified dataset for validation
   */
  router.post(
    "/generate-dataset",
    validationMiddleware("datasetGeneration"),
    asyncHandler(async (req: DatasetGenerationRequest, res: Response) => {
      const { config, jarvisContext } = req.body;

      const datasetConfig: DatasetGenerationConfig = {
        totalSources: Math.min(config.totalSources, 100), // Cap at 100 for API
        distributionStrategy: config.distributionStrategy,
        minimumConfidenceThreshold: config.minimumConfidenceThreshold,
        includeKnownConflicts: config.includeKnownConflicts,
        expertValidationRequired: false, // Always false for API generation
      };

      const startTime = Date.now();

      try {
        const generator = new DatasetGenerator(gtvpEngine, datasetConfig);
        const dataset = await generator.generateDataset();
        const processingTime = Date.now() - startTime;

        // Calculate dataset statistics
        const statistics = {
          totalSources: dataset.length,
          averageConfidence:
            dataset.reduce((sum, source) => sum + source.gtvpResult.finalConfidence, 0) /
            dataset.length,
          domainDistribution: dataset.reduce(
            (acc, source) => {
              acc[source.domain] = (acc[source.domain] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
          confidenceGrades: dataset.reduce(
            (acc, source) => {
              acc[source.confidenceGrade] = (acc[source.confidenceGrade] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
          validationStatus: dataset.reduce(
            (acc, source) => {
              acc[source.validationStatus] = (acc[source.validationStatus] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        };

        // Format dataset for Jarvis ecosystem
        const jarvisResponse = {
          dataset: {
            metadata: {
              version: "2.0-GTVP",
              created: new Date().toISOString(),
              totalSources: dataset.length,
              verificationMethod: "GTVP Triple-Authority Verification",
              processingTime,
            },
            sources: dataset.map((source) => ({
              id: source.id,
              url: source.url,
              title: source.title,
              category: source.category,
              domain: source.domain,
              claim: source.claim,
              groundTruthScore: source.gtvpResult.finalConfidence,
              groundTruthLabel: determineReliabilityLabel(source.gtvpResult.finalConfidence),
              confidenceGrade: source.confidenceGrade,
              validationStatus: source.validationStatus,
              verificationSummary: {
                authoritiesConsulted: source.gtvpResult.verifications.length,
                conflictsResolved: source.gtvpResult.conflicts.length,
                flags: source.gtvpResult.flags,
              },
            })),
            statistics,
          },

          jarvis: {
            requestId: jarvisContext?.requestId || `dataset-${Date.now()}`,
            componentId: jarvisContext?.componentId || "gtvp-system",
            timestamp: new Date().toISOString(),
            version: "2.0.0",
          },
        };

        res.status(200).json({
          success: true,
          data: jarvisResponse,
          meta: {
            processingTime,
            apiVersion: "2.0.0",
          },
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: "DATASET_GENERATION_FAILED",
            message: "Failed to generate GTVP dataset",
            details: error instanceof Error ? error.message : "Unknown error",
            jarvisRequestId: jarvisContext?.requestId,
          },
        });
      }
    }),
  );

  /**
   * GET /api/gtvp/authorities
   * Get available verification authorities by domain
   */
  router.get(
    "/authorities",
    asyncHandler(async (req: Request, res: Response) => {
      const { domain } = req.query;

      // This would normally query the GTVP engine for available authorities
      const mockAuthorities = [
        {
          name: "PubMed/NIH",
          tier: 1,
          domains: ["medical", "health", "scientific"],
          credibilityScore: 0.95,
          status: "operational",
        },
        {
          name: "Reuters",
          tier: 1,
          domains: ["news", "political", "economic"],
          credibilityScore: 0.92,
          status: "operational",
        },
        {
          name: "IPCC Climate Database",
          tier: 1,
          domains: ["climate", "environment"],
          credibilityScore: 0.96,
          status: "operational",
        },
      ];

      const filteredAuthorities = domain
        ? mockAuthorities.filter((auth) => auth.domains.includes(domain as string))
        : mockAuthorities;

      res.status(200).json({
        success: true,
        data: {
          authorities: filteredAuthorities,
          totalAvailable: filteredAuthorities.length,
          filterApplied: domain ? { domain } : null,
        },
      });
    }),
  );

  /**
   * GET /api/gtvp/domains
   * Get supported verification domains
   */
  router.get(
    "/domains",
    asyncHandler(async (req: Request, res: Response) => {
      const domains = [
        {
          name: "medical",
          description: "Medical and health-related information",
          authorities: 3,
          avgConfidence: 0.89,
        },
        {
          name: "climate",
          description: "Climate science and environmental data",
          authorities: 2,
          avgConfidence: 0.91,
        },
        {
          name: "political",
          description: "Political events and current affairs",
          authorities: 3,
          avgConfidence: 0.82,
        },
        {
          name: "economic",
          description: "Economic data and financial information",
          authorities: 2,
          avgConfidence: 0.85,
        },
        {
          name: "technology",
          description: "Technology and innovation research",
          authorities: 2,
          avgConfidence: 0.87,
        },
      ];

      res.status(200).json({
        success: true,
        data: {
          domains,
          totalDomains: domains.length,
        },
      });
    }),
  );

  /**
   * GET /api/gtvp/stats
   * Get GTVP system statistics
   */
  router.get(
    "/stats",
    asyncHandler(async (req: Request, res: Response) => {
      // In a real implementation, these would be tracked metrics
      const stats = {
        totalVerifications: 1542,
        averageConfidence: 0.847,
        conflictResolutionRate: 0.15,
        authorityCoverage: {
          tier1: 5,
          tier2: 8,
          tier3: 12,
        },
        domainCoverage: {
          medical: 89,
          climate: 67,
          political: 124,
          economic: 45,
          technology: 78,
        },
        performanceMetrics: {
          averageProcessingTime: 2340,
          successRate: 0.967,
          apiUptime: 0.999,
        },
      };

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  return router;
}

/**
 * Helper function to determine reliability label from confidence score
 */
function determineReliabilityLabel(confidence: number): string {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "moderate";
  if (confidence >= 0.4) return "low";
  return "unreliable";
}
