/**
 * Authentication Middleware for Jarvis Integration
 * JWT-based authentication for inter-component communication
 */

import type { Request, Response } from "express";

type NextFunction = (err?: any) => void;

import jwt from "jsonwebtoken";

export interface JarvisAuthPayload {
  componentId: string;
  userId?: string;
  sessionId?: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface JarvisAuthRequest extends Request {
  auth?: JarvisAuthPayload;
  jarvisComponent?: string;
  // Explicitly declare inherited properties for TypeScript compatibility
  headers: Request["headers"];
  method: Request["method"];
  path: Request["path"];
  originalUrl: Request["originalUrl"];
  body: any;
  query: Request["query"];
  params: Request["params"];
}

/**
 * JWT Authentication middleware for Jarvis ecosystem
 */
export function authMiddleware(jwtSecret: string) {
  return (req: JarvisAuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Extract token from Authorization header or X-Jarvis-Token header
      const authHeader = req.headers.authorization;
      const jarvisToken = req.headers["x-jarvis-token"] as string;

      let token: string | undefined;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (jarvisToken) {
        token = jarvisToken;
      }

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: "MISSING_TOKEN",
            message: "Authentication token is required",
            details: "Provide JWT token in Authorization header or X-Jarvis-Token header",
          },
        });
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, jwtSecret) as JarvisAuthPayload;

      // Validate required claims
      if (!decoded.componentId) {
        res.status(401).json({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Token missing required componentId claim",
          },
        });
        return;
      }

      // Check if token is issued for the correct service
      if (decoded.aud !== "jarvis-reliability-service") {
        res.status(401).json({
          success: false,
          error: {
            code: "WRONG_AUDIENCE",
            message: "Token not issued for this service",
          },
        });
        return;
      }

      // Check if component has required permissions
      const requiredPermission = getRequiredPermission(req.method, req.path);
      if (requiredPermission && !decoded.permissions.includes(requiredPermission)) {
        res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `Component lacks required permission: ${requiredPermission}`,
            requiredPermission,
            componentPermissions: decoded.permissions,
          },
        });
        return;
      }

      // Attach auth info to request
      req.auth = decoded;
      req.jarvisComponent = decoded.componentId;

      // Add component tracking headers to response
      res.set("X-Jarvis-Component", decoded.componentId);
      res.set("X-Request-Authenticated", "true");

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "Authentication token has expired",
            expiredAt: error.expiredAt,
          },
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Authentication token is invalid",
            details: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "AUTH_ERROR",
            message: "Authentication failed",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }
  };
}

/**
 * Get required permission for a specific endpoint
 */
function getRequiredPermission(method: string, path: string): string | null {
  // Define permission requirements for different endpoints
  const permissionMap: Record<string, string> = {
    "POST /api/reliability/assess": "reliability:assess",
    "POST /api/reliability/batch": "reliability:batch",
    "POST /api/gtvp/verify": "gtvp:verify",
    "POST /api/gtvp/generate-dataset": "gtvp:admin",
    "GET /api/system/config": "system:read",
    "GET /api/health": "health:read",
  };

  const key = `${method} ${path}`;

  // Check for exact matches first
  if (permissionMap[key]) {
    return permissionMap[key];
  }

  // Check for pattern matches
  for (const [pattern, permission] of Object.entries(permissionMap)) {
    const regex = new RegExp(pattern.replace(/:\w+/g, "\\w+").replace(/\*/g, ".*"));
    if (regex.test(key)) {
      return permission;
    }
  }

  // Health and system endpoints are generally accessible
  if (path.startsWith("/api/health") || path.startsWith("/api/system/status")) {
    return null;
  }

  // Default permission for reliability endpoints
  if (path.startsWith("/api/reliability")) {
    return "reliability:read";
  }

  // Default permission for GTVP endpoints
  if (path.startsWith("/api/gtvp")) {
    return "gtvp:read";
  }

  return null;
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuthMiddleware(jwtSecret: string) {
  return (req: JarvisAuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const jarvisToken = req.headers["x-jarvis-token"] as string;

    if (!authHeader && !jarvisToken) {
      // No authentication provided, continue without auth
      next();
      return;
    }

    // If auth is provided, validate it
    authMiddleware(jwtSecret)(req, res, next);
  };
}

/**
 * Generate a JWT token for testing/development
 */
export function generateTestToken(payload: Partial<JarvisAuthPayload>, secret: string): string {
  const defaultPayload: JarvisAuthPayload = {
    componentId: "test-component",
    permissions: ["reliability:assess", "reliability:batch", "gtvp:verify"],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    iss: "jarvis-auth-service",
    aud: "jarvis-reliability-service",
    ...payload,
  };

  return jwt.sign(defaultPayload, secret);
}

/**
 * Middleware to validate component ID in requests
 */
export function validateComponentId() {
  return (req: JarvisAuthRequest, res: Response, next: NextFunction): void => {
    const componentIdHeader = req.headers["x-jarvis-component"] as string;
    const authComponentId = req.auth?.componentId;

    if (authComponentId && componentIdHeader && authComponentId !== componentIdHeader) {
      res.status(400).json({
        success: false,
        error: {
          code: "COMPONENT_ID_MISMATCH",
          message: "Component ID in token does not match header",
          tokenComponentId: authComponentId,
          headerComponentId: componentIdHeader,
        },
      });
      return;
    }

    next();
  };
}
