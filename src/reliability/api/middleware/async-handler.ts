/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors automatically
 */

import type { Request, Response } from "express";

type NextFunction = (err?: any) => void;

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps async route handlers to automatically catch errors
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
