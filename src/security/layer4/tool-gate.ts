/**
 * Layer 4: Tool Access Control
 * Rate limiting, permissions, and high-stakes confirmations
 */

import type { Logger } from "winston";
import type { DatabaseClient } from "../../database";
import type { PermissionResult, RateLimitState, ToolPermissions } from "../types";

export class ToolGate {
  private rateLimits = new Map<string, RateLimitState>();
  private toolPermissions: Map<string, ToolPermissions>;
  private logger: Logger;
  private db?: DatabaseClient;

  constructor(logger: Logger, db?: DatabaseClient) {
    this.logger = logger;
    this.db = db;

    // Define tool permissions
    this.toolPermissions = new Map([
      [
        "search_web",
        {
          readOnly: true,
          requiresConfirmation: false,
          rateLimit: { tool: "search_web", maxCalls: 20, windowMs: 60000 },
        },
      ],
      [
        "read_email",
        {
          readOnly: true,
          requiresConfirmation: false,
          rateLimit: { tool: "read_email", maxCalls: 10, windowMs: 60000 },
        },
      ],
      [
        "send_email",
        {
          readOnly: false,
          requiresConfirmation: true,
          rateLimit: { tool: "send_email", maxCalls: 5, windowMs: 60000 },
        },
      ],
      [
        "delete_file",
        {
          readOnly: false,
          requiresConfirmation: true,
          rateLimit: { tool: "delete_file", maxCalls: 2, windowMs: 60000 },
        },
      ],
      [
        "execute_code",
        {
          readOnly: false,
          requiresConfirmation: true,
          rateLimit: { tool: "execute_code", maxCalls: 3, windowMs: 60000 },
        },
      ],
      [
        "make_payment",
        {
          readOnly: false,
          requiresConfirmation: true,
          rateLimit: { tool: "make_payment", maxCalls: 1, windowMs: 3600000 }, // 1 per hour
        },
      ],
      [
        "create_file",
        {
          readOnly: false,
          requiresConfirmation: false,
          rateLimit: { tool: "create_file", maxCalls: 10, windowMs: 60000 },
        },
      ],
      [
        "read_file",
        {
          readOnly: true,
          requiresConfirmation: false,
          rateLimit: { tool: "read_file", maxCalls: 20, windowMs: 60000 },
        },
      ],
    ]);
  }

  async checkPermission(
    userId: string,
    toolName: string,
    params: Record<string, unknown> = {},
  ): Promise<PermissionResult> {
    const permissions = this.toolPermissions.get(toolName);

    if (!permissions) {
      this.logger.warn("Unknown tool requested", { userId, toolName });
      return {
        allowed: false,
        reason: `Unknown tool: ${toolName}`,
      };
    }

    // Check rate limit
    const rateLimitKey = `${userId}:${toolName}`;
    const rateLimit = this.checkRateLimit(rateLimitKey, permissions.rateLimit);

    if (!rateLimit.allowed) {
      await this.logSecurityEvent({
        userId,
        type: "rate_limit_exceeded",
        severity: "medium",
        details: {
          toolName,
          limit: permissions.rateLimit.maxCalls,
          window: permissions.rateLimit.windowMs,
        },
      });

      return {
        allowed: false,
        reason: `Rate limit exceeded: ${permissions.rateLimit.maxCalls} calls per ${permissions.rateLimit.windowMs / 1000}s`,
      };
    }

    // High-stakes operations require confirmation
    if (permissions.requiresConfirmation && !params.userConfirmed) {
      return {
        allowed: false,
        reason: "requires_confirmation",
        confirmationPrompt: `Confirm: ${toolName} with parameters: ${JSON.stringify(params, null, 2)}`,
      };
    }

    // Check user permissions (in production, fetch from database)
    const userPermissions = await this.getUserPermissions(userId);
    if (!userPermissions.includes(toolName)) {
      await this.logSecurityEvent({
        userId,
        type: "unauthorized_tool_access",
        severity: "high",
        details: { toolName, params },
      });

      return {
        allowed: false,
        reason: "insufficient_permissions",
      };
    }

    // Record successful access
    this.incrementRateLimit(rateLimitKey, permissions.rateLimit);

    return { allowed: true };
  }

  private checkRateLimit(
    key: string,
    config: { maxCalls: number; windowMs: number },
  ): { allowed: boolean } {
    const now = Date.now();
    const state = this.rateLimits.get(key) || { calls: [], windowStart: now };

    // Remove old calls outside window
    state.calls = state.calls.filter((timestamp) => now - timestamp < config.windowMs);

    // Check if limit exceeded
    if (state.calls.length >= config.maxCalls) {
      return { allowed: false };
    }

    return { allowed: true };
  }

  private incrementRateLimit(key: string, config: { maxCalls: number; windowMs: number }): void {
    const now = Date.now();
    const state = this.rateLimits.get(key) || { calls: [], windowStart: now };
    state.calls.push(now);
    this.rateLimits.set(key, state);
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    // In production, fetch from database
    // For now, return all tools for all users
    return Array.from(this.toolPermissions.keys());
  }

  private async logSecurityEvent(event: {
    userId: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    details: Record<string, unknown>;
  }): Promise<void> {
    this.logger.warn("Security event", event);

    // Save to database if available
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO security_events (user_id, threat_type, severity, blocked, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            event.userId,
            event.type,
            event.severity,
            true, // blocked
            JSON.stringify(event.details),
          ],
        );
      } catch (error) {
        this.logger.error("Failed to log security event to database", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
