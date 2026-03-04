/**
 * Security Agent - Complete Firewall Around Jarvis
 * "He can get out, but no-one can get in"
 *
 * Multi-layer defense system:
 * - Layer 1: Input Firewall (pattern filter, PII detection, Lakera Guard)
 * - Layer 2: Dual-LLM Router (quarantine untrusted data)
 * - Layer 3: Output Sanitizer (redact sensitive data)
 * - Layer 4: Tool Gate (rate limiting, permissions, confirmations)
 * - Layer 5: Security Monitor (anomaly detection, alerting)
 */

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import { BaseAgent } from "../agents/base-agent";
import type { DatabaseClient } from "../database";
import type { VertexLLMClient } from "../llm";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { errorResponse, successResponse } from "../utils/response";
import { InputFirewall } from "./layer1/input-firewall";
import { DualLLMRouter } from "./layer2/dual-llm-router";
import { OutputSanitizer } from "./layer3/output-sanitizer";
import { ToolGate } from "./layer4/tool-gate";
import { SecurityMonitor } from "./layer5/security-monitor";
import type { RequestContext, ScanContext } from "./types";

export class SecurityAgent extends BaseAgent {
  private inputFirewall: InputFirewall;
  private dualLLMRouter: DualLLMRouter;
  private outputSanitizer: OutputSanitizer;
  private toolGate: ToolGate;
  private securityMonitor: SecurityMonitor;
  private llm: VertexLLMClient;
  private db?: DatabaseClient;
  private blockedUsers: Set<string> = new Set();
  private promptInjectionPatterns: any[] = [];
  private jailbreakPatterns: any[] = [];
  private redactionLog: any[] = [];
  private avgScanTime: number = 0;

  constructor(
    agentId: string,
    version: string,
    port: number,
    logger: Logger,
    llm: VertexLLMClient,
    db?: DatabaseClient,
  ) {
    super(agentId, version, port, logger);
    this.llm = llm;
    this.db = db;

    // Initialize all security layers
    this.inputFirewall = new InputFirewall(logger);
    this.dualLLMRouter = new DualLLMRouter(logger, llm);
    this.outputSanitizer = new OutputSanitizer();
    this.toolGate = new ToolGate(logger, db);
    this.securityMonitor = new SecurityMonitor(logger, db);

    this.logger.info("Security Agent initialized with 5-layer defense system");
  }

  protected async initialize(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.logger.info("Security Agent initialized");
  }

  protected async startServer(): Promise<void> {
    // Main security scan endpoint
    this.app.post("/api/scan", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        const input = inputs?.input as string;
        const userId = (inputs?.userId as string) || "default";
        const sessionId = inputs?.sessionId as string;
        const strictMode = inputs?.strictMode === true;

        if (!input) {
          const errorResponse: AgentResponse = {
            success: false,
            data: { error: "Missing required parameter: input" },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        // Check if user is blocked
        if (this.securityMonitor.isUserBlocked(userId)) {
          const errorResponse: AgentResponse = {
            success: false,
            data: { error: "User is blocked due to security violations" },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(403).json(errorResponse);
          return;
        }

        // Layer 1: Input Firewall
        const scanContext: ScanContext = {
          userId,
          sessionId,
          strictMode,
          source: (inputs?.source as "user" | "email" | "pdf" | "web" | "api") || "user",
        };

        const scanResult = await this.inputFirewall.scan(input, scanContext);

        if (!scanResult.allowed) {
          // Log security event
          await this.securityMonitor.logSecurityEvent({
            userId,
            sessionId,
            type: "input_blocked",
            severity: scanResult.threat === "prompt_injection" ? "high" : "medium",
            details: {
              threat: scanResult.threat,
              reason: scanResult.reason,
              inputHash: this.hashInput(input),
            },
            blocked: true,
          });

          const errorResponse: AgentResponse = {
            success: false,
            data: {
              error: "Input blocked by security firewall",
              threat: scanResult.threat,
              reason: scanResult.reason,
            },
            metadata: {
              duration: scanResult.latency,
              retryCount: 0,
            },
          };
          res.status(403).json(errorResponse);
          return;
        }

        // Layer 2: Dual-LLM Router (if needed)
        const requestContext: RequestContext = {
          userId,
          sessionId,
        };

        const processedInput = scanResult.redacted || input;
        let response: string;

        // Check if untrusted data detected
        const hasUntrustedData = this.dualLLMRouter.detectUntrustedSources(processedInput);

        if (hasUntrustedData) {
          response = await this.dualLLMRouter.handleRequest(processedInput, requestContext);
        } else {
          // Direct processing for trusted input
          const llmResponse = await this.llm.chat([{ role: "user", content: processedInput }], {
            maxTokens: 2000,
            temperature: 0.7,
          });
          response = llmResponse;
        }

        // Layer 3: Output Sanitization
        const sanitized = this.outputSanitizer.sanitize(response);

        if (sanitized.redactions.length > 0) {
          await this.securityMonitor.logSecurityEvent({
            userId,
            sessionId,
            type: "output_sanitized",
            severity: "medium",
            details: {
              redactionCount: sanitized.redactions.length,
              redactionTypes: sanitized.redactions.map((r) => r.type),
            },
            blocked: false,
          });
        }

        const duration = Date.now() - startTime;

        const successResponse: AgentResponse = {
          success: true,
          data: {
            response: sanitized.sanitized,
            redactions: sanitized.redactions.length > 0 ? sanitized.redactions : undefined,
            scanLatency: scanResult.latency,
            totalLatency: duration,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(successResponse);
      } catch (error) {
        this.logger.error("Error in security scan", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: error instanceof Error ? error.message : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    // Tool permission check endpoint
    this.app.post("/api/check-tool", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const request: AgentRequest = req.body;
        const { inputs } = request;

        const userId = (inputs?.userId as string) || "default";
        const toolName = inputs?.toolName as string;
        const params = (inputs?.params as Record<string, unknown>) || {};

        if (!toolName) {
          const errorResponse: AgentResponse = {
            success: false,
            data: { error: "Missing required parameter: toolName" },
            metadata: {
              duration: Date.now() - startTime,
              retryCount: 0,
            },
          };
          res.status(400).json(errorResponse);
          return;
        }

        const permission = await this.toolGate.checkPermission(userId, toolName, params);

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: permission.allowed,
          data: {
            allowed: permission.allowed,
            reason: permission.reason,
            confirmationPrompt: permission.confirmationPrompt,
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error checking tool permission", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: error instanceof Error ? error.message : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    // Security events endpoint
    this.app.get("/api/events", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const userId = req.query.userId as string;
        const limit = parseInt((req.query.limit as string) || "50", 10);

        // In production, fetch from database
        const events = (this.securityMonitor as any).events
          .filter((e) => !userId || e.userId === userId)
          .slice(-limit)
          .reverse();

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: { events },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error fetching security events", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: error instanceof Error ? error.message : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    // Threat level endpoint
    this.app.get("/api/threat-level", async (req: Request, res: Response) => {
      const startTime = Date.now();
      try {
        const userId = (req.query.userId as string) || "default";

        const threatLevel = await this.securityMonitor.detectAnomalies(userId);

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: threatLevel,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error detecting threat level", {
          error: error instanceof Error ? error.message : String(error),
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          data: {
            error: error instanceof Error ? error.message : "Internal server error",
          },
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    // ============================================
    // ADDITIONAL SECURITY ENDPOINTS (20 endpoints)
    // ============================================

    // 5. GET /api/stats - Security statistics
    this.app.get("/api/stats", async (req: Request, res: Response) => {
      try {
        const events = (this.securityMonitor as any).events || [];
        const blockedUsers = (this.securityMonitor as any).blockedUsers || new Set();

        // Count threats by type
        const threatsDetected: Record<string, number> = {};
        events.forEach((event: any) => {
          if (event.threatType) {
            threatsDetected[event.threatType] = (threatsDetected[event.threatType] || 0) + 1;
          }
        });

        // Get top threats
        const topThreats = Object.entries(threatsDetected)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([type, count]) => ({ type, count }));

        res.json(
          successResponse({
            totalScans: events.length,
            blockedRequests: events.filter((e: any) => e.blocked).length,
            threatsDetected,
            topThreats,
            blockedUsers: blockedUsers.size,
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting security stats:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get security stats"));
      }
    });

    // 6. GET /api/users/:userId - User security profile
    this.app.get("/api/users/:userId", async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const threatLevel = await this.securityMonitor.detectAnomalies(userId);
        const isBlocked = this.securityMonitor.isUserBlocked(userId);

        const events = ((this.securityMonitor as any).events || []).filter(
          (e: any) => e.userId === userId,
        );

        const lastThreat = events
          .filter((e: any) => e.threatType)
          .sort(
            (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )[0];

        res.json(
          successResponse({
            userId,
            threatLevel: threatLevel.level,
            isBlocked,
            eventCount: events.length,
            lastThreat: lastThreat
              ? {
                  type: lastThreat.threatType,
                  timestamp: lastThreat.timestamp,
                }
              : null,
          }),
        );
      } catch (error: any) {
        this.logger.error(`Error getting user security profile for ${req.params.userId}:`, error);
        res.status(500).json(errorResponse(error.message || "Failed to get user profile"));
      }
    });

    // 7. POST /api/users/:userId/unblock - Unblock user
    this.app.post("/api/users/:userId/unblock", async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;

        // Unblock user
        const blockedUsers = (this.securityMonitor as any).blockedUsers as Set<string>;
        if (blockedUsers) {
          blockedUsers.delete(userId);
        }

        // Reset anomaly counters
        const anomalyCounters = (this.securityMonitor as any).anomalyCounters as Map<
          string,
          number
        >;
        if (anomalyCounters) {
          anomalyCounters.delete(userId);
        }

        this.logger.info(`User ${userId} unblocked via API`);

        res.json(
          successResponse(
            {
              userId,
              unblocked: true,
            },
            "User unblocked successfully",
          ),
        );
      } catch (error: any) {
        this.logger.error(`Error unblocking user ${req.params.userId}:`, error);
        res.status(500).json(errorResponse(error.message || "Failed to unblock user"));
      }
    });

    // 8. POST /api/users/:userId/block - Block user
    this.app.post("/api/users/:userId/block", async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { reason } = req.body;

        const blockedUsers = (this.securityMonitor as any).blockedUsers as Set<string>;
        if (blockedUsers) {
          blockedUsers.add(userId);
        }

        // Log blocking event
        await this.securityMonitor.logEvent({
          userId,
          threatType: "manual_block",
          severity: "high",
          blocked: true,
          reason: reason || "Manual block via API",
        });

        this.logger.warn(`User ${userId} blocked via API: ${reason || "No reason provided"}`);

        res.json(
          successResponse(
            {
              userId,
              blocked: true,
              reason: reason || "Manual block",
            },
            "User blocked successfully",
          ),
        );
      } catch (error: any) {
        this.logger.error(`Error blocking user ${req.params.userId}:`, error);
        res.status(500).json(errorResponse(error.message || "Failed to block user"));
      }
    });

    // 9. GET /api/rate-limits - Rate limit status
    this.app.get("/api/rate-limits", async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId as string;
        const toolName = req.query.toolName as string;

        // Get rate limits from tool gate
        const rateLimits = (this.toolGate as any).rateLimits || new Map();

        const limits: any[] = [];
        rateLimits.forEach((limit: any, key: string) => {
          const [limitUserId, limitToolName] = key.split(":");

          if (userId && limitUserId !== userId) return;
          if (toolName && limitToolName !== toolName) return;

          limits.push({
            userId: limitUserId,
            toolName: limitToolName,
            remaining: limit.remaining || 0,
            resetAt: limit.resetAt || null,
            limit: limit.limit || 0,
          });
        });

        res.json(
          successResponse({
            rateLimits: limits,
            count: limits.length,
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting rate limits:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get rate limits"));
      }
    });

    // 10. POST /api/rate-limits/reset - Reset rate limits
    this.app.post("/api/rate-limits/reset", async (req: Request, res: Response) => {
      try {
        const { userId, toolName } = req.body;

        const rateLimits = (this.toolGate as any).rateLimits as Map<string, any>;
        if (!rateLimits) {
          res.json(successResponse({}, "No rate limits to reset"));
          return;
        }

        let resetCount = 0;
        if (userId && toolName) {
          // Reset specific user/tool combination
          const key = `${userId}:${toolName}`;
          if (rateLimits.has(key)) {
            rateLimits.delete(key);
            resetCount = 1;
          }
        } else if (userId) {
          // Reset all limits for user
          for (const [key] of rateLimits.entries()) {
            if (key.startsWith(`${userId}:`)) {
              rateLimits.delete(key);
              resetCount++;
            }
          }
        } else if (toolName) {
          // Reset all limits for tool
          for (const [key] of rateLimits.entries()) {
            if (key.endsWith(`:${toolName}`)) {
              rateLimits.delete(key);
              resetCount++;
            }
          }
        } else {
          // Reset all
          resetCount = rateLimits.size;
          rateLimits.clear();
        }

        res.json(
          successResponse(
            {
              resetCount,
              userId: userId || "all",
              toolName: toolName || "all",
            },
            "Rate limits reset successfully",
          ),
        );
      } catch (error: any) {
        this.logger.error("Error resetting rate limits:", error);
        res.status(500).json(errorResponse(error.message || "Failed to reset rate limits"));
      }
    });

    // 11. GET /api/patterns - Threat patterns
    this.app.get("/api/patterns", async (req: Request, res: Response) => {
      try {
        const patternFilter = (this.inputFirewall as any).patternFilter;
        const promptInjectionPatterns = patternFilter
          ? (patternFilter as any).promptInjectionPatterns || []
          : [];
        const jailbreakPatterns = patternFilter
          ? (patternFilter as any).jailbreakPatterns || []
          : [];

        res.json(
          successResponse({
            promptInjection: promptInjectionPatterns.map((p: any) => ({
              pattern: p.pattern || p,
              severity: p.severity || "high",
            })),
            jailbreak: jailbreakPatterns.map((p: any) => ({
              pattern: p.pattern || p,
              severity: p.severity || "high",
            })),
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting threat patterns:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get patterns"));
      }
    });

    // 12. POST /api/patterns - Add threat pattern
    this.app.post("/api/patterns", async (req: Request, res: Response) => {
      try {
        const { type, pattern, severity = "high" } = req.body;

        if (!type || !pattern) {
          res.status(400).json(errorResponse("Type and pattern are required", "MISSING_FIELDS"));
          return;
        }

        const patternFilter = (this.inputFirewall as any).patternFilter;
        if (!patternFilter) {
          res.status(500).json(errorResponse("Pattern filter not available"));
          return;
        }

        if (type === "prompt_injection") {
          const patterns = (patternFilter as any).promptInjectionPatterns || [];
          patterns.push({ pattern, severity });
          (patternFilter as any).promptInjectionPatterns = patterns;
        } else if (type === "jailbreak") {
          const patterns = (patternFilter as any).jailbreakPatterns || [];
          patterns.push({ pattern, severity });
          (patternFilter as any).jailbreakPatterns = patterns;
        } else {
          res.status(400).json(errorResponse("Invalid pattern type", "INVALID_TYPE"));
          return;
        }

        this.logger.info(`Added ${type} pattern: ${pattern}`);

        res.json(
          successResponse(
            {
              type,
              pattern,
              severity,
            },
            "Pattern added successfully",
          ),
        );
      } catch (error: any) {
        this.logger.error("Error adding threat pattern:", error);
        res.status(500).json(errorResponse(error.message || "Failed to add pattern"));
      }
    });

    // 13. DELETE /api/patterns/:patternId - Remove threat pattern
    this.app.delete("/api/patterns/:patternId", async (req: Request, res: Response) => {
      try {
        const { patternId } = req.params;
        const { type } = req.query;

        if (!type) {
          res.status(400).json(errorResponse("Type query parameter is required", "MISSING_TYPE"));
          return;
        }

        const patternFilter = (this.inputFirewall as any).patternFilter;
        if (!patternFilter) {
          res.status(500).json(errorResponse("Pattern filter not available"));
          return;
        }

        let removed = false;
        if (type === "prompt_injection") {
          const patterns = (patternFilter as any).promptInjectionPatterns || [];
          const index = Number.parseInt(patternId, 10);
          if (index >= 0 && index < patterns.length) {
            patterns.splice(index, 1);
            (patternFilter as any).promptInjectionPatterns = patterns;
            removed = true;
          }
        } else if (type === "jailbreak") {
          const patterns = (patternFilter as any).jailbreakPatterns || [];
          const index = Number.parseInt(patternId, 10);
          if (index >= 0 && index < patterns.length) {
            patterns.splice(index, 1);
            (patternFilter as any).jailbreakPatterns = patterns;
            removed = true;
          }
        }

        if (removed) {
          res.json(successResponse({ patternId, type }, "Pattern removed successfully"));
        } else {
          res.status(404).json(errorResponse("Pattern not found", "PATTERN_NOT_FOUND"));
        }
      } catch (error: any) {
        this.logger.error(`Error removing pattern ${req.params.patternId}:`, error);
        res.status(500).json(errorResponse(error.message || "Failed to remove pattern"));
      }
    });

    // 14. GET /api/redactions - PII redaction log
    this.app.get("/api/redactions", async (req: Request, res: Response) => {
      try {
        const limit = Number.parseInt((req.query.limit as string) || "50", 10);
        const userId = req.query.userId as string;

        // In production, fetch from database
        const redactions = ((this.outputSanitizer as any).redactionLog || [])
          .filter((r: any) => !userId || r.userId === userId)
          .slice(-limit)
          .reverse();

        res.json(
          successResponse({
            redactions,
            count: redactions.length,
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting redaction log:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get redaction log"));
      }
    });

    // 15. GET /api/config - Security configuration
    this.app.get("/api/config", (_req: Request, res: Response) => {
      try {
        res.json(
          successResponse({
            strictMode: process.env.SECURITY_STRICT_MODE === "true",
            lakeraGuardEnabled: !!process.env.LAKERA_GUARD_API_KEY,
            rateLimitingEnabled: true,
            anomalyDetectionEnabled: true,
            autoBlockEnabled: process.env.SECURITY_AUTO_BLOCK === "true",
            maxInputLength: Number.parseInt(process.env.MAX_INPUT_LENGTH || "10000", 10),
            threatThreshold: Number.parseInt(process.env.THREAT_THRESHOLD || "5", 10),
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting security config:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get config"));
      }
    });

    // 16. POST /api/config - Update security configuration
    this.app.post("/api/config", async (req: Request, res: Response) => {
      try {
        const { strictMode, autoBlockEnabled, maxInputLength, threatThreshold } = req.body;

        // Update environment variables (in production, use config file or database)
        if (strictMode !== undefined) {
          process.env.SECURITY_STRICT_MODE = strictMode ? "true" : "false";
        }
        if (autoBlockEnabled !== undefined) {
          process.env.SECURITY_AUTO_BLOCK = autoBlockEnabled ? "true" : "false";
        }
        if (maxInputLength !== undefined) {
          process.env.MAX_INPUT_LENGTH = String(maxInputLength);
        }
        if (threatThreshold !== undefined) {
          process.env.THREAT_THRESHOLD = String(threatThreshold);
        }

        this.logger.info("Security configuration updated via API");

        res.json(
          successResponse(
            {
              strictMode: process.env.SECURITY_STRICT_MODE === "true",
              autoBlockEnabled: process.env.SECURITY_AUTO_BLOCK === "true",
              maxInputLength: Number.parseInt(process.env.MAX_INPUT_LENGTH || "10000", 10),
              threatThreshold: Number.parseInt(process.env.THREAT_THRESHOLD || "5", 10),
            },
            "Configuration updated successfully",
          ),
        );
      } catch (error: any) {
        this.logger.error("Error updating security config:", error);
        res.status(500).json(errorResponse(error.message || "Failed to update config"));
      }
    });

    // 17. GET /api/threats/summary - Threat summary
    this.app.get("/api/threats/summary", async (req: Request, res: Response) => {
      try {
        const events = (this.securityMonitor as any).events || [];
        const last24h = events.filter((e: any) => {
          const eventTime = new Date(e.timestamp).getTime();
          return Date.now() - eventTime < 24 * 60 * 60 * 1000;
        });

        const threatsByType: Record<string, number> = {};
        last24h.forEach((event: any) => {
          if (event.threatType) {
            threatsByType[event.threatType] = (threatsByType[event.threatType] || 0) + 1;
          }
        });

        res.json(
          successResponse({
            last24h: {
              total: last24h.length,
              blocked: last24h.filter((e: any) => e.blocked).length,
              threatsByType,
            },
            allTime: {
              total: events.length,
              blocked: events.filter((e: any) => e.blocked).length,
            },
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting threat summary:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get threat summary"));
      }
    });

    // 18. GET /api/blocked-users - List blocked users
    this.app.get("/api/blocked-users", (_req: Request, res: Response) => {
      try {
        const blockedUsers =
          ((this.securityMonitor as any).blockedUsers as Set<string>) || new Set();
        const users = Array.from(blockedUsers);

        res.json(
          successResponse({
            users,
            count: users.length,
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting blocked users:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get blocked users"));
      }
    });

    // 19. GET /api/health - Health check (override base)
    this.app.get("/health", (_req: Request, res: Response) => {
      try {
        const events = (this.securityMonitor as any).events || [];
        const recentErrors = events.filter((e: any) => e.severity === "critical").slice(-10);

        res.json({
          status: "online",
          agentId: this.agentId,
          version: this.version,
          capabilities: this.getCapabilities(),
          uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
          recentErrors: recentErrors.length,
        });
      } catch (error: any) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // 20. GET /api/analytics - Security analytics
    this.app.get("/api/analytics", async (req: Request, res: Response) => {
      try {
        const { startTime, endTime } = req.query;
        const events = (this.securityMonitor as any).events || [];

        let filteredEvents = events;
        if (startTime || endTime) {
          filteredEvents = events.filter((e: any) => {
            const eventTime = new Date(e.timestamp).getTime();
            if (startTime && eventTime < new Date(startTime as string).getTime()) return false;
            if (endTime && eventTime > new Date(endTime as string).getTime()) return false;
            return true;
          });
        }

        const threatsByType: Record<string, number> = {};
        const threatsBySeverity: Record<string, number> = {};
        filteredEvents.forEach((event: any) => {
          if (event.threatType) {
            threatsByType[event.threatType] = (threatsByType[event.threatType] || 0) + 1;
          }
          if (event.severity) {
            threatsBySeverity[event.severity] = (threatsBySeverity[event.severity] || 0) + 1;
          }
        });

        res.json(
          successResponse({
            period: {
              startTime: startTime || "all",
              endTime: endTime || "now",
            },
            totalEvents: filteredEvents.length,
            blockedEvents: filteredEvents.filter((e: any) => e.blocked).length,
            threatsByType,
            threatsBySeverity,
            uniqueUsers: new Set(filteredEvents.map((e: any) => e.userId)).size,
          }),
        );
      } catch (error: any) {
        this.logger.error("Error getting security analytics:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get analytics"));
      }
    });

    // Additional Security Endpoints (21-25)

    // 21. GET /api/stats/summary
    this.app.get("/api/stats/summary", (req: Request, res: Response) => {
      try {
        const events = (this.securityMonitor as any).events || [];
        const scanCount = events.length;
        const blockedCount = events.filter((e: any) => e.blocked).length;

        res.json(
          successResponse({
            totalScans: scanCount,
            blocked: blockedCount,
            blockRate: scanCount > 0 ? (blockedCount / scanCount) * 100 : 0,
            avgScanTime: this.avgScanTime || 0,
          }),
        );
      } catch (error: any) {
        res.status(500).json(errorResponse(error.message || "Failed to get stats summary"));
      }
    });

    // 22. GET /api/stats/realtime
    this.app.get("/api/stats/realtime", (req: Request, res: Response) => {
      try {
        const now = Date.now();
        const recentScans = (this.securityMonitor as any).events || [];
        const lastMinute = recentScans.filter((s: any) => {
          const scanTime = new Date(s.timestamp).getTime();
          return scanTime > now - 60000;
        });

        res.json(
          successResponse({
            scansLastMinute: lastMinute.length,
            blockedLastMinute: lastMinute.filter((s: any) => s.blocked).length,
            currentLoad: lastMinute.length, // Simple load metric
          }),
        );
      } catch (error: any) {
        res.status(500).json(errorResponse(error.message || "Failed to get realtime stats"));
      }
    });

    // 23. GET /api/stats/trends
    this.app.get("/api/stats/trends", (req: Request, res: Response) => {
      try {
        const hours = Number.parseInt(req.query.hours as string, 10) || 24;
        const events = (this.securityMonitor as any).events || [];
        const cutoff = Date.now() - hours * 60 * 60 * 1000;

        const recentEvents = events.filter((e: any) => {
          const eventTime = new Date(e.timestamp).getTime();
          return eventTime > cutoff;
        });

        // Calculate hourly trends
        const hourlyTrends: Record<string, number> = {};
        recentEvents.forEach((e: any) => {
          const hour = new Date(e.timestamp).toISOString().substring(0, 13) + ":00:00Z";
          hourlyTrends[hour] = (hourlyTrends[hour] || 0) + 1;
        });

        res.json(
          successResponse({
            period: `${hours} hours`,
            totalEvents: recentEvents.length,
            hourlyTrends,
            averagePerHour: recentEvents.length / hours,
          }),
        );
      } catch (error: any) {
        res.status(500).json(errorResponse(error.message || "Failed to get trends"));
      }
    });

    // 24. GET /api/stats/export
    this.app.get("/api/stats/export", (req: Request, res: Response) => {
      try {
        const { startDate, endDate, format = "json" } = req.query;
        const events = (this.securityMonitor as any).events || [];

        let filtered = events;
        if (startDate || endDate) {
          filtered = events.filter((e: any) => {
            const eventTime = new Date(e.timestamp).getTime();
            if (startDate && eventTime < new Date(startDate as string).getTime()) return false;
            if (endDate && eventTime > new Date(endDate as string).getTime()) return false;
            return true;
          });
        }

        if (format === "csv") {
          res.set("Content-Type", "text/csv");
          res.set("Content-Disposition", "attachment; filename=security-stats.csv");
          let csv = "timestamp,userId,threatType,severity,blocked\n";
          filtered.forEach((e: any) => {
            csv += `${e.timestamp},${e.userId},${e.threatType || ""},${e.severity || ""},${e.blocked}\n`;
          });
          res.send(csv);
        } else {
          res.json(
            successResponse({
              events: filtered,
              count: filtered.length,
              period: { startDate: startDate || "all", endDate: endDate || "now" },
            }),
          );
        }
      } catch (error: any) {
        res.status(500).json(errorResponse(error.message || "Failed to export stats"));
      }
    });

    // 25. GET /api/patterns/test
    this.app.post("/api/patterns/test", (req: Request, res: Response) => {
      try {
        const { input } = req.body;
        if (!input) {
          return res.status(400).json(errorResponse("input is required"));
        }

        const patternFilter = (this.inputFirewall as any).patternFilter;
        const promptInjectionPatterns = patternFilter
          ? (patternFilter as any).promptInjectionPatterns || []
          : [];
        const jailbreakPatterns = patternFilter
          ? (patternFilter as any).jailbreakPatterns || []
          : [];

        const matches: any[] = [];

        // Test against prompt injection patterns
        promptInjectionPatterns.forEach((pattern: any, index: number) => {
          const patternStr = pattern.pattern || pattern;
          if (
            typeof patternStr === "string" &&
            input.toLowerCase().includes(patternStr.toLowerCase())
          ) {
            matches.push({
              type: "prompt_injection",
              pattern: patternStr,
              index,
              severity: pattern.severity || "high",
            });
          }
        });

        // Test against jailbreak patterns
        jailbreakPatterns.forEach((pattern: any, index: number) => {
          const patternStr = pattern.pattern || pattern;
          if (
            typeof patternStr === "string" &&
            input.toLowerCase().includes(patternStr.toLowerCase())
          ) {
            matches.push({
              type: "jailbreak",
              pattern: patternStr,
              index,
              severity: pattern.severity || "high",
            });
          }
        });

        res.json(
          successResponse({
            input,
            matches,
            wouldBlock: matches.length > 0,
          }),
        );
      } catch (error: any) {
        res.status(500).json(errorResponse(error.message || "Failed to test patterns"));
      }
    });

    // Start listening on port
    return new Promise<void>((resolve, reject) => {
      this.server = this.app
        .listen(this.port, () => {
          this.logger.info(`Security agent server listening on port ${this.port}`);
          resolve();
        })
        .on("error", (error: Error) => {
          this.logger.error(`Failed to start server on port ${this.port}`, {
            error: error.message,
          });
          reject(error);
        });
    });
  }

  protected getCapabilities(): string[] {
    return [
      "input_scanning",
      "prompt_injection_detection",
      "pii_detection",
      "output_sanitization",
      "tool_access_control",
      "rate_limiting",
      "anomaly_detection",
      "threat_monitoring",
    ];
  }

  protected getDependencies(): string[] {
    return [];
  }

  private hashInput(input: string): string {
    // Simple hash for logging (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
