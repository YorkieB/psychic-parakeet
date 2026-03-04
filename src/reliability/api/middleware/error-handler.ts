/**
 * Error Handler Middleware
 * Centralized error handling for the API
 */

import type { Request, Response } from "express";

type NextFunction = (err?: any) => void;

import type { JarvisAuthRequest } from "./auth.js";

interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

/**
 * User-facing error class for API errors
 */
export class UserFacingError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 400,
    code: string = "USER_ERROR",
    details?: any,
  ) {
    super(message);
    this.name = "UserFacingError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Jarvis API error class
 */
export class JarvisAPIError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "API_ERROR",
    details?: any,
  ) {
    super(message);
    this.name = "JarvisAPIError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Central error handler for all API errors
 */
export function errorHandler(
  err: APIError,
  req: JarvisAuthRequest,
  res: Response,
  next: NextFunction,
): void {
  // Log error details
  console.error("API Error:", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    component: req.jarvisComponent,
    requestId: req.headers["x-request-id"],
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || "INTERNAL_ERROR";
  let message = err.message || "An unexpected error occurred";
  let details = err.details;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    message = "Request validation failed";
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401;
    errorCode = "UNAUTHORIZED";
    message = "Authentication required";
  } else if (err.name === "ForbiddenError") {
    statusCode = 403;
    errorCode = "FORBIDDEN";
    message = "Insufficient permissions";
  } else if (err.name === "NotFoundError") {
    statusCode = 404;
    errorCode = "NOT_FOUND";
    message = "Resource not found";
  } else if (err.name === "RateLimitError") {
    statusCode = 429;
    errorCode = "RATE_LIMIT_EXCEEDED";
    message = "Too many requests";
  } else if (err.name === "TimeoutError") {
    statusCode = 408;
    errorCode = "REQUEST_TIMEOUT";
    message = "Request timeout";
  }

  // Handle AI provider specific errors
  if (err.message.includes("Both AI providers failed")) {
    statusCode = 503;
    errorCode = "AI_PROVIDERS_UNAVAILABLE";
    message = "AI assessment services are currently unavailable";
    details = "Both primary and secondary AI providers failed to respond";
  } else if (err.message.includes("Rate limit exceeded")) {
    statusCode = 429;
    errorCode = "AI_RATE_LIMIT";
    message = "AI provider rate limit exceeded";
  } else if (err.message.includes("Invalid API key")) {
    statusCode = 503;
    errorCode = "AI_CONFIGURATION_ERROR";
    message = "AI provider configuration error";
    details = "Invalid or missing API key";
  }

  // Handle reliability algorithm specific errors
  if (err.message.includes("Assessment failed")) {
    statusCode = 400;
    errorCode = "ASSESSMENT_FAILED";
    message = "Source reliability assessment failed";
  } else if (err.message.includes("Invalid source URL")) {
    statusCode = 400;
    errorCode = "INVALID_SOURCE_URL";
    message = "The provided source URL is invalid or inaccessible";
  }

  // Handle GTVP specific errors
  if (err.message.includes("GTVP verification failed")) {
    statusCode = 400;
    errorCode = "GTVP_VERIFICATION_FAILED";
    message = "Ground truth verification failed";
  } else if (err.message.includes("Insufficient authorities")) {
    statusCode = 503;
    errorCode = "INSUFFICIENT_AUTHORITIES";
    message = "Not enough verification authorities available";
  }

  // Security-related errors (don't expose internal details)
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
    details = undefined;
  }

  // Error response structure
  const errorResponse: {
    success: boolean;
    error: {
      code: string;
      message: string;
      details?: any;
      timestamp: string;
      requestId: string | string[];
      path: string;
      method: string;
      stack?: string;
      raw?: string;
      jarvisComponent?: string;
    };
  } = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      requestId: req.headers["x-request-id"] || "unknown",
      path: req.originalUrl,
      method: req.method,
    },
  };

  // Add debugging information in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.stack = err.stack;
    errorResponse.error.raw = err.message;
  }

  // Add Jarvis-specific context
  if (req.jarvisComponent) {
    errorResponse.error.jarvisComponent = req.jarvisComponent;
  }

  // Set appropriate headers
  res.set({
    "Content-Type": "application/json",
    "X-Error-Code": errorCode,
    "X-Error-Timestamp": new Date().toISOString(),
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: [
        "GET /api",
        "GET /api/health",
        "POST /api/reliability/assess",
        "POST /api/reliability/batch",
        "POST /api/gtvp/verify",
        "GET /api/system/status",
      ],
    },
  });
}

/**
 * Create operational error
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any,
): APIError {
  const error = new Error(message) as APIError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;
  return error;
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
  console.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Give time for logging to complete, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  console.error("Unhandled Promise Rejection:", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise,
    timestamp: new Date().toISOString(),
  });

  // Give time for logging to complete, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}
