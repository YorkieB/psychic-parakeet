/*
  This file helps Jarvis verify who you are and keep your account secure.

  It handles JWT authentication, checks user tokens, and makes sure only authorized users can access Jarvis's features while protecting your privacy.
*/
/**
 * JWT Authentication middleware
 */

import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

type NextFunction = () => void;

const JWT_SECRET = process.env.JWT_SECRET || "jarvis-secret-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "jarvis-refresh-secret-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
  // Explicitly declare inherited properties for TypeScript compatibility
  query: Request["query"];
  params: Request["params"];
  body: any;
  headers: Request["headers"];
}

/**
 * Authenticate JWT token (required)
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Access token required",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || "user",
    };
    next();
  } catch (_error) {
    // Return 401 for invalid tokens (authentication failure)
    // 403 is for authorization failures (valid user, insufficient permissions)
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || "user",
      };
    } catch (_error) {
      // Silent fail - token invalid but endpoint allows anonymous
    }
  }

  next();
};

/**
 * Require specific roles
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

/**
 * Generate access token
 * Each token includes a unique jti (JWT ID) to prevent session fixation
 */
export const generateToken = (userId: string, email: string, role: string = "user"): string => {
  // Add a unique jti (JWT ID) to ensure each token is unique
  const jti = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  return jwt.sign({ userId, email, role, jti }, JWT_SECRET, { expiresIn: "24h" });
};

/**
 * Generate refresh token
 * Each token includes a unique jti (JWT ID) to prevent session fixation
 */
export const generateRefreshToken = (userId: string): string => {
  // Add a unique jti (JWT ID) to ensure each token is unique
  const jti = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  return jwt.sign({ userId, jti }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    return { userId: decoded.userId };
  } catch (_error) {
    return null;
  }
};

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
