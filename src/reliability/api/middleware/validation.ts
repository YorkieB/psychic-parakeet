/**
 * Request Validation Middleware
 * Validates incoming requests against predefined schemas
 */

import type { Request, Response } from "express";

type NextFunction = (err?: any) => void;

import Joi from "joi";

// Validation schemas for different request types
const schemas = {
  reliabilityAssessment: Joi.object({
    sourceUrl: Joi.string().uri().required().messages({
      "string.uri": "sourceUrl must be a valid URL",
      "any.required": "sourceUrl is required",
    }),
    sourceContent: Joi.string().max(1000000).optional(), // 1MB limit
    priority: Joi.string().valid("low", "normal", "high").default("normal"),
    forceConsensus: Joi.boolean().optional(),
    runInBackground: Joi.boolean().optional(),
    madOptions: Joi.object({
      forceMad: Joi.boolean().optional(),
      useRAGVerification: Joi.boolean().optional(),
      useFallacyDetection: Joi.boolean().optional(),
      useSelfConsistency: Joi.boolean().optional(),
      customRounds: Joi.number().integer().min(1).max(10).optional(),
      customTemperature: Joi.number().min(0).max(1).optional(),
    }).optional(),
    gtvpOptions: Joi.object({
      forceGTVP: Joi.boolean().optional(),
      minimumAuthorities: Joi.number().integer().min(1).max(10).optional(),
      confidenceThreshold: Joi.number().min(0).max(1).optional(),
      verificationTimeout: Joi.number().integer().min(1000).max(30000).optional(),
      enableExpertEscalation: Joi.boolean().optional(),
      domainRestriction: Joi.array().items(Joi.string()).optional(),
    }).optional(),
    jarvisContext: Joi.object({
      componentId: Joi.string().required(),
      requestId: Joi.string().required(),
      userId: Joi.string().optional(),
      sessionId: Joi.string().optional(),
    }).optional(),
  }),

  batchAssessment: Joi.object({
    sources: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          sourceUrl: Joi.string().uri().required(),
          sourceContent: Joi.string().max(500000).optional(), // 500KB limit for batch
          priority: Joi.string().valid("low", "normal", "high").default("normal"),
        }),
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least 1 source is required",
        "array.max": "Maximum 50 sources allowed in batch",
      }),
    options: Joi.object({
      maxConcurrent: Joi.number().integer().min(1).max(10).default(5),
      timeout: Joi.number().integer().min(5000).max(60000).default(30000),
    }).optional(),
    jarvisContext: Joi.object({
      componentId: Joi.string().required(),
      requestId: Joi.string().required(),
      userId: Joi.string().optional(),
      sessionId: Joi.string().optional(),
    }).optional(),
  }),

  gtvpVerification: Joi.object({
    claim: Joi.string().min(10).max(1000).required().messages({
      "string.min": "Claim must be at least 10 characters",
      "string.max": "Claim must not exceed 1000 characters",
    }),
    sourceUrl: Joi.string().uri().required(),
    domain: Joi.string()
      .valid(
        "medical",
        "climate",
        "political",
        "economic",
        "technology",
        "legal",
        "academic",
        "general",
      )
      .required(),
    sourceId: Joi.string().optional(),
    options: Joi.object({
      minimumAuthorities: Joi.number().integer().min(1).max(10).default(2),
      confidenceThreshold: Joi.number().min(0).max(1).default(0.7),
      timeoutMs: Joi.number().integer().min(1000).max(30000).default(10000),
      enableExpertEscalation: Joi.boolean().default(false),
    }).optional(),
    jarvisContext: Joi.object({
      componentId: Joi.string().required(),
      requestId: Joi.string().required(),
      userId: Joi.string().optional(),
      sessionId: Joi.string().optional(),
    }).optional(),
  }),

  datasetGeneration: Joi.object({
    config: Joi.object({
      totalSources: Joi.number().integer().min(5).max(100).required().messages({
        "number.min": "Minimum 5 sources required",
        "number.max": "Maximum 100 sources allowed",
      }),
      distributionStrategy: Joi.string()
        .valid("BALANCED", "DOMAIN_FOCUSED", "COMPLEXITY_FOCUSED")
        .required(),
      minimumConfidenceThreshold: Joi.number().min(0).max(1).default(0.5),
      includeKnownConflicts: Joi.boolean().default(true),
    }).required(),
    jarvisContext: Joi.object({
      componentId: Joi.string().required(),
      requestId: Joi.string().required(),
    }).optional(),
  }),
};

/**
 * Validation middleware factory
 */
export function validationMiddleware(schemaName: keyof typeof schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = schemas[schemaName];

    if (!schema) {
      res.status(500).json({
        success: false,
        error: {
          code: "VALIDATION_SCHEMA_NOT_FOUND",
          message: `Validation schema '${schemaName}' not found`,
        },
      });
      return;
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown properties
      convert: true, // Convert types when possible
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Request validation failed",
          details: validationErrors,
          validationSchema: schemaName,
        },
      });
      return;
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQueryParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: "QUERY_VALIDATION_FAILED",
          message: "Query parameter validation failed",
          details: validationErrors,
        },
      });
      return;
    }

    req.query = value;
    next();
  };
}

/**
 * Validate URL parameters
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: "PARAMS_VALIDATION_FAILED",
          message: "URL parameter validation failed",
          details: validationErrors,
        },
      });
      return;
    }

    req.params = value;
    next();
  };
}

/**
 * Custom validation rules
 */
export const customValidators = {
  jarvisRequestId: Joi.string()
    .pattern(/^[a-zA-Z0-9\-_]{8,64}$/)
    .messages({
      "string.pattern.base":
        "Request ID must be 8-64 characters, alphanumeric with hyphens and underscores only",
    }),

  jarvisComponentId: Joi.string()
    .pattern(/^jarvis-[a-z][a-z0-9-]*[a-z0-9]$/)
    .messages({
      "string.pattern.base":
        'Component ID must start with "jarvis-" followed by lowercase letters, numbers, and hyphens',
    }),

  url: Joi.string()
    .uri()
    .custom((value, helpers) => {
      try {
        const url = new URL(value);

        // Block localhost and private IPs for security
        if (
          url.hostname === "localhost" ||
          url.hostname.match(/^127\./) ||
          url.hostname.match(/^192\.168\./) ||
          url.hostname.match(/^10\./) ||
          url.hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
        ) {
          return helpers.error("url.private");
        }

        // Require HTTPS in production
        if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
          return helpers.error("url.insecure");
        }

        return value;
      } catch {
        return helpers.error("string.uri");
      }
    })
    .messages({
      "url.private": "Private/localhost URLs are not allowed",
      "url.insecure": "HTTPS is required in production",
    }),

  priority: Joi.string().valid("low", "normal", "high").default("normal"),

  confidence: Joi.number().min(0).max(1).precision(3),

  reliabilityScore: Joi.number().min(0).max(1).precision(3),
};

/**
 * Sanitize request data
 */
export function sanitizeMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize common fields
    if (req.body.sourceContent && typeof req.body.sourceContent === "string") {
      // Remove potential XSS payloads
      req.body.sourceContent = req.body.sourceContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "");
    }

    // Ensure request IDs are properly formatted
    if (req.body.jarvisContext?.requestId) {
      req.body.jarvisContext.requestId = req.body.jarvisContext.requestId
        .replace(/[^a-zA-Z0-9\-_]/g, "")
        .substring(0, 64);
    }

    next();
  };
}
