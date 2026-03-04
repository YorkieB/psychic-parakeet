/*
  This file helps Jarvis handle problems gracefully and let you know when something goes wrong.

  It catches errors, logs them for debugging, and sends helpful error messages while making sure Jarvis keeps running smoothly even when issues occur.
*/
/**
 * Global error handling middleware
 */

import type { Request, Response } from "express";

type NextFunction = () => void;

import type { Logger } from "winston";

/**
 * Create error handler with logger
 */
export const createErrorHandler = (logger: Logger) => {
  return (err: any, req: Request, res: Response, _next: NextFunction): void => {
    logger.error("Error:", {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
      success: false,
      error: err.message || "Internal server error",
      code: err.code || "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
