/**
 * Logging Middleware
 * Request/response logging for monitoring and debugging
 */

import type { Request, Response } from "express";

type NextFunction = (err?: any) => void;

import type { JarvisAuthRequest } from "./auth.js";

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip: string;
  jarvisComponent?: string;
  requestId?: string;
  contentLength?: number;
  error?: string;
}

/**
 * HTTP request/response logging middleware
 */
export function loggingMiddleware(req: JarvisAuthRequest, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId =
    (req.headers["x-request-id"] as string) ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add request ID to headers if not present
  if (!req.headers["x-request-id"]) {
    req.headers["x-request-id"] = requestId;
    res.set("X-Request-ID", requestId);
  }

  // Create base log entry
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: getClientIP(req),
    userAgent: req.headers["user-agent"],
    requestId: requestId,
    contentLength: req.headers["content-length"]
      ? parseInt(req.headers["content-length"], 10)
      : undefined,
  };

  // Add Jarvis-specific context
  if (req.headers["x-jarvis-component"]) {
    logEntry.jarvisComponent = req.headers["x-jarvis-component"] as string;
  }

  // Log request
  if (shouldLogRequest(req)) {
    console.log("📨 HTTP Request:", {
      ...logEntry,
      headers: filterHeaders(req.headers),
      body: shouldLogBody(req) ? sanitizeBody(req.body) : "[BODY_HIDDEN]",
    });
  }

  // Hook into response finish event
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    logEntry.statusCode = res.statusCode;
    logEntry.responseTime = responseTime;

    // Determine log level based on status code
    const logLevel = getLogLevel(res.statusCode);
    const logMessage = `${getStatusEmoji(res.statusCode)} HTTP Response:`;

    // Log response
    if (shouldLogResponse(req, res)) {
      const logData = {
        ...logEntry,
        responseHeaders: filterResponseHeaders(res.getHeaders()),
        cached: res.get("X-Cache-Hit") === "true",
      };

      if (logLevel === "error") {
        console.error(logMessage, logData);
      } else if (logLevel === "warn") {
        console.warn(logMessage, logData);
      } else {
        console.log(logMessage, logData);
      }
    }

    // Performance monitoring
    if (responseTime > 5000) {
      console.warn("🐌 Slow Request Detected:", {
        ...logEntry,
        threshold: "5000ms",
        severity: "high",
      });
    } else if (responseTime > 2000) {
      console.warn("⏰ Slow Request Warning:", {
        ...logEntry,
        threshold: "2000ms",
        severity: "medium",
      });
    }

    // Error tracking
    if (res.statusCode >= 500) {
      console.error("💥 Server Error:", {
        ...logEntry,
        errorType: "server_error",
        severity: "critical",
      });
    } else if (res.statusCode >= 400) {
      console.warn("⚠️  Client Error:", {
        ...logEntry,
        errorType: "client_error",
        severity: "low",
      });
    }
  });

  // Hook into response error event
  res.on("error", (error: Error) => {
    logEntry.error = error.message;
    console.error("💥 Response Error:", {
      ...logEntry,
      error: error.message,
      stack: error.stack,
      severity: "critical",
    });
  });

  next();
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string) ||
    (req.headers["x-real-ip"] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

/**
 * Determine if request should be logged
 */
function shouldLogRequest(req: Request): boolean {
  // Skip health check logs in production to reduce noise
  if (process.env.NODE_ENV === "production" && req.path.startsWith("/api/health")) {
    return false;
  }

  // Skip static asset requests
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    return false;
  }

  return true;
}

/**
 * Determine if response should be logged
 */
function shouldLogResponse(req: Request, res: Response): boolean {
  // Always log errors
  if (res.statusCode >= 400) {
    return true;
  }

  // Skip health check logs in production
  if (process.env.NODE_ENV === "production" && req.path.startsWith("/api/health")) {
    return false;
  }

  return true;
}

/**
 * Determine if request body should be logged
 */
function shouldLogBody(req: Request): boolean {
  // Don't log body for GET requests
  if (req.method === "GET") {
    return false;
  }

  // Don't log sensitive endpoints
  if (req.path.includes("auth") || req.path.includes("token")) {
    return false;
  }

  // Don't log large payloads
  const contentLength = req.headers["content-length"];
  if (contentLength && parseInt(contentLength, 10) > 10000) {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

/**
 * Filter sensitive headers
 */
function filterHeaders(headers: any): any {
  const filtered = { ...headers };
  const sensitiveHeaders = [
    "authorization",
    "x-jarvis-token",
    "cookie",
    "x-api-key",
    "x-auth-token",
  ];

  sensitiveHeaders.forEach((header) => {
    if (filtered[header]) {
      filtered[header] = "[REDACTED]";
    }
  });

  return filtered;
}

/**
 * Filter response headers
 */
function filterResponseHeaders(headers: any): any {
  const filtered = { ...headers };

  // Only keep relevant headers for logging
  const relevantHeaders = [
    "content-type",
    "content-length",
    "x-request-id",
    "x-jarvis-component",
    "x-processing-time",
    "x-cache-hit",
  ];

  const result: any = {};
  relevantHeaders.forEach((header) => {
    if (filtered[header]) {
      result[header] = filtered[header];
    }
  });

  return result;
}

/**
 * Sanitize request body for logging
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sanitized = { ...body };

  // Remove or truncate sensitive/large fields
  if (sanitized.sourceContent && sanitized.sourceContent.length > 200) {
    sanitized.sourceContent = sanitized.sourceContent.substring(0, 200) + "... [TRUNCATED]";
  }

  if (sanitized.password) {
    sanitized.password = "[REDACTED]";
  }

  if (sanitized.apiKey) {
    sanitized.apiKey = "[REDACTED]";
  }

  if (sanitized.token) {
    sanitized.token = "[REDACTED]";
  }

  return sanitized;
}

/**
 * Get log level based on status code
 */
function getLogLevel(statusCode: number): "info" | "warn" | "error" {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  return "info";
}

/**
 * Get emoji for status code
 */
function getStatusEmoji(statusCode: number): string {
  if (statusCode >= 500) return "💥";
  if (statusCode >= 400) return "⚠️";
  if (statusCode >= 300) return "↪️";
  if (statusCode >= 200) return "✅";
  return "📨";
}

/**
 * Structured logging for specific events
 */
export const logger = {
  /**
   * Log reliability assessment
   */
  assessment: (data: {
    requestId: string;
    sourceUrl: string;
    score: number;
    label: string;
    confidence: number;
    processingTime: number;
    providersUsed: string[];
    jarvisComponent?: string;
  }) => {
    console.log("🎯 Reliability Assessment:", {
      event: "reliability_assessment",
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * Log GTVP verification
   */
  gtvpVerification: (data: {
    requestId: string;
    claim: string;
    domain: string;
    finalConfidence: number;
    authoritiesConsulted: number;
    conflictsResolved: number;
    processingTime: number;
    jarvisComponent?: string;
  }) => {
    console.log("⚖️  GTVP Verification:", {
      event: "gtvp_verification",
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * Log MAD debate
   */
  madDebate: (data: {
    requestId: string;
    sourceUrl: string;
    rounds: number;
    fallaciesDetected: number;
    finalScore: number;
    processingTime: number;
    jarvisComponent?: string;
  }) => {
    console.log("🤺 MAD Debate:", {
      event: "mad_debate",
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * Log system events
   */
  system: (event: string, data: any) => {
    console.log(`🔧 System Event: ${event}`, {
      event: "system_event",
      timestamp: new Date().toISOString(),
      ...data,
    });
  },

  /**
   * Log security events
   */
  security: (event: string, data: any) => {
    console.warn(`🔒 Security Event: ${event}`, {
      event: "security_event",
      timestamp: new Date().toISOString(),
      severity: "high",
      ...data,
    });
  },
};
