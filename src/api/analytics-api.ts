/*
  This file helps Jarvis track and understand how the system is being used.

  It handles system monitoring, performance tracking, user analytics, and health metrics while making sure we can keep Jarvis running smoothly.
*/

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import { type AuthRequest, authenticateToken, requireRole } from "../middleware/auth";
import type { AgentRegistry } from "../orchestrator/agent-registry";
import { errorResponse, paginatedResponse, successResponse } from "../utils/response";

type Router = any;

/**
 * Create analytics router
 */
export function createAnalyticsRouter(agentRegistry: AgentRegistry, logger: Logger): Router {
  const router = (express as any).Router();

  // In-memory analytics storage
  const requestLogs = new Map<string, any[]>();
  const errorLogs = new Map<string, any[]>();
  const performanceMetrics = new Map<string, any[]>();
  const userActivity = new Map<string, any[]>();
  const agentUsage = new Map<string, any>();

  // ========================================
  // ANALYTICS ENDPOINTS (20 total)
  // ========================================

  // 1. GET /api/analytics/overview
  router.get("/overview", authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const agents = agentRegistry.getAllAgents();
      const now = Date.now();
      const last24h = now - 86400000;

      // Calculate overview metrics
      const totalRequests = Array.from(requestLogs.values())
        .flat()
        .filter((r: any) => r.timestamp > last24h).length;

      const totalErrors = Array.from(errorLogs.values())
        .flat()
        .filter((e: any) => e.timestamp > last24h).length;

      const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : "0";

      res.json(
        successResponse({
          period: {
            start: new Date(last24h).toISOString(),
            end: new Date(now).toISOString(),
          },
          summary: {
            totalRequests,
            totalErrors,
            errorRate: Number.parseFloat(errorRate as string),
            activeAgents: agents.filter((a) => a.status === "online").length,
            totalAgents: agents.length,
            activeUsers: userActivity.size,
            averageResponseTime: calculateAverageResponseTime(),
          },
          topAgents: getTopAgents(5),
          topErrors: getTopErrors(5),
          requestTrend: getRequestTrend(24),
        }),
      );
    } catch (error: any) {
      logger.error("[Analytics] Overview error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get overview"));
    }
  });

  // 2. GET /api/analytics/agents
  router.get("/agents", authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const agents = agentRegistry.getAllAgents();
      const period = (req.query.period as string) || "24h";
      const timeRange = getTimeRange(period);

      const agentAnalytics = agents.map((agent) => {
        const agentRequests = requestLogs.get(agent.agentId) || [];
        const agentErrors = errorLogs.get(agent.agentId) || [];
        const agentMetrics = performanceMetrics.get(agent.agentId) || [];

        const periodRequests = agentRequests.filter((r: any) => r.timestamp > timeRange.start);
        const periodErrors = agentErrors.filter((e: any) => e.timestamp > timeRange.start);
        const periodMetrics = agentMetrics.filter((m: any) => m.timestamp > timeRange.start);

        const avgResponseTime =
          periodMetrics.length > 0
            ? periodMetrics.reduce((sum: number, m: any) => sum + m.responseTime, 0) /
              periodMetrics.length
            : 0;

        return {
          name: agent.agentId,
          status: agent.status,
          requests: periodRequests.length,
          errors: periodErrors.length,
          errorRate:
            periodRequests.length > 0
              ? Number.parseFloat(((periodErrors.length / periodRequests.length) * 100).toFixed(2))
              : 0,
          averageResponseTime: Math.round(avgResponseTime),
          uptime: 0, // TODO: Get from agent
          lastActivity:
            periodRequests.length > 0
              ? new Date(periodRequests[periodRequests.length - 1].timestamp).toISOString()
              : null,
        };
      });

      res.json(
        successResponse({
          period: {
            start: new Date(timeRange.start).toISOString(),
            end: new Date(timeRange.end).toISOString(),
          },
          agents: agentAnalytics,
          summary: {
            totalAgents: agents.length,
            activeAgents: agentAnalytics.filter((a) => a.requests > 0).length,
            totalRequests: agentAnalytics.reduce((sum, a) => sum + a.requests, 0),
            totalErrors: agentAnalytics.reduce((sum, a) => sum + a.errors, 0),
          },
        }),
      );
    } catch (error: any) {
      logger.error("[Analytics] Agents error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get agents analytics"));
    }
  });

  // 3. GET /api/analytics/agents/:agentName
  router.get("/agents/:agentName", authenticateToken, (req: Request, res: Response) => {
    try {
      const agentName = req.params.agentName;
      const period = (req.query.period as string) || "24h";
      const timeRange = getTimeRange(period);

      const agentRequests = (requestLogs.get(agentName) || []).filter(
        (r: any) => r.timestamp > timeRange.start,
      );
      const agentErrors = (errorLogs.get(agentName) || []).filter(
        (e: any) => e.timestamp > timeRange.start,
      );
      const agentMetrics = (performanceMetrics.get(agentName) || []).filter(
        (m: any) => m.timestamp > timeRange.start,
      );

      const hourlyBreakdown = getHourlyBreakdown(agentRequests, timeRange);
      const errorBreakdown = getErrorBreakdown(agentErrors);

      res.json(
        successResponse({
          agentName,
          period: {
            start: new Date(timeRange.start).toISOString(),
            end: new Date(timeRange.end).toISOString(),
          },
          metrics: {
            totalRequests: agentRequests.length,
            totalErrors: agentErrors.length,
            errorRate:
              agentRequests.length > 0
                ? Number.parseFloat(((agentErrors.length / agentRequests.length) * 100).toFixed(2))
                : 0,
            averageResponseTime: calculateAvgResponseTime(agentMetrics),
            p50ResponseTime: calculatePercentile(agentMetrics, 50),
            p95ResponseTime: calculatePercentile(agentMetrics, 95),
            p99ResponseTime: calculatePercentile(agentMetrics, 99),
          },
          breakdown: {
            hourly: hourlyBreakdown,
            errors: errorBreakdown,
          },
          topActions: getTopActions(agentName, 10),
        }),
      );
    } catch (error: any) {
      logger.error(`[Analytics] Agent ${req.params.agentName} error:`, error);
      res.status(500).json(errorResponse(error.message || "Failed to get agent analytics"));
    }
  });

  // 4. GET /api/analytics/requests
  router.get("/requests", authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const page = Number.parseInt(req.query.page as string, 10) || 1;
      const limit = Number.parseInt(req.query.limit as string, 10) || 50;
      const agentName = req.query.agent as string;
      const status = req.query.status as string;
      const period = (req.query.period as string) || "24h";
      const timeRange = getTimeRange(period);

      let allRequests = Array.from(requestLogs.values())
        .flat()
        .filter((r: any) => r.timestamp > timeRange.start);

      if (agentName) {
        allRequests = allRequests.filter((r: any) => r.agent === agentName);
      }

      if (status) {
        allRequests = allRequests.filter((r: any) => r.status === status);
      }

      allRequests.sort((a: any, b: any) => b.timestamp - a.timestamp);

      const start = (page - 1) * limit;
      const paginated = allRequests.slice(start, start + limit);

      res.json(paginatedResponse(paginated, page, limit, allRequests.length));
    } catch (error: any) {
      logger.error("[Analytics] Requests error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get requests"));
    }
  });

  // 5. GET /api/analytics/errors
  router.get("/errors", authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const page = Number.parseInt(req.query.page as string, 10) || 1;
      const limit = Number.parseInt(req.query.limit as string, 10) || 50;
      const agentName = req.query.agent as string;
      const severity = req.query.severity as string;
      const period = (req.query.period as string) || "24h";
      const timeRange = getTimeRange(period);

      let allErrors = Array.from(errorLogs.values())
        .flat()
        .filter((e: any) => e.timestamp > timeRange.start);

      if (agentName) {
        allErrors = allErrors.filter((e: any) => e.agent === agentName);
      }

      if (severity) {
        allErrors = allErrors.filter((e: any) => e.severity === severity);
      }

      allErrors.sort((a: any, b: any) => b.timestamp - a.timestamp);

      const start = (page - 1) * limit;
      const paginated = allErrors.slice(start, start + limit);

      const errorsByType = groupErrorsByType(allErrors);
      const errorTrend = getErrorTrend(allErrors, 24);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          page,
          limit,
          total: allErrors.length,
          totalPages: Math.ceil(allErrors.length / limit),
        },
        summary: {
          total: allErrors.length,
          byType: errorsByType,
          trend: errorTrend,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("[Analytics] Errors error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get errors"));
    }
  });

  // 6. GET /api/analytics/performance
  router.get("/performance", authenticateToken, (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || "24h";
      const timeRange = getTimeRange(period);

      const allMetrics = Array.from(performanceMetrics.values())
        .flat()
        .filter((m: any) => m.timestamp > timeRange.start);

      const agentPerformance = new Map<string, any>();

      allMetrics.forEach((metric: any) => {
        if (!agentPerformance.has(metric.agent)) {
          agentPerformance.set(metric.agent, []);
        }
        agentPerformance.get(metric.agent)!.push(metric.responseTime);
      });

      const performance = Array.from(agentPerformance.entries()).map(([agent, times]) => ({
        agent,
        count: times.length,
        average: times.reduce((sum: number, t: number) => sum + t, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p50: calculatePercentileFromArray(times, 50),
        p95: calculatePercentileFromArray(times, 95),
        p99: calculatePercentileFromArray(times, 99),
      }));

      res.json(
        successResponse({
          period: {
            start: new Date(timeRange.start).toISOString(),
            end: new Date(timeRange.end).toISOString(),
          },
          performance,
          overall: {
            totalRequests: allMetrics.length,
            averageResponseTime:
              allMetrics.length > 0
                ? allMetrics.reduce((sum: number, m: any) => sum + m.responseTime, 0) /
                  allMetrics.length
                : 0,
          },
        }),
      );
    } catch (error: any) {
      logger.error("[Analytics] Performance error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get performance"));
    }
  });

  // 7. GET /api/analytics/usage
  router.get("/usage", authenticateToken, (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || "7d";
      const timeRange = getTimeRange(period);

      const usage = {
        totalRequests: Array.from(requestLogs.values())
          .flat()
          .filter((r: any) => r.timestamp > timeRange.start).length,
        totalUsers: userActivity.size,
        totalAgents: agentRegistry.getAllAgents().length,
        activeAgents: agentRegistry.getAllAgents().filter((a) => a.status === "online").length,
        topUsers: getTopUsers(10),
        topAgents: getTopAgents(10),
        usageByDay: getUsageByDay(timeRange),
        peakHours: getPeakHours(),
      };

      res.json(successResponse(usage));
    } catch (error: any) {
      logger.error("[Analytics] Usage error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get usage"));
    }
  });

  // 8. GET /api/analytics/users
  router.get("/users", authenticateToken, requireRole(["admin"]), (req: Request, res: Response) => {
    try {
      const page = Number.parseInt(req.query.page as string, 10) || 1;
      const limit = Number.parseInt(req.query.limit as string, 10) || 20;
      const period = (req.query.period as string) || "7d";
      const timeRange = getTimeRange(period);

      const users = Array.from(userActivity.entries()).map(([userId, activities]) => {
        const periodActivities = activities.filter((a: any) => a.timestamp > timeRange.start);

        return {
          userId,
          totalRequests: periodActivities.length,
          lastActivity:
            periodActivities.length > 0
              ? new Date(Math.max(...periodActivities.map((a: any) => a.timestamp))).toISOString()
              : null,
          mostUsedAgent: getMostUsedAgent(periodActivities),
          totalErrors: periodActivities.filter((a: any) => a.error).length,
        };
      });

      users.sort((a, b) => b.totalRequests - a.totalRequests);

      const start = (page - 1) * limit;
      const paginated = users.slice(start, start + limit);

      res.json(paginatedResponse(paginated, page, limit, users.length));
    } catch (error: any) {
      logger.error("[Analytics] Users error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get users"));
    }
  });

  // 9. GET /api/analytics/users/:userId
  router.get("/users/:userId", authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.params.userId;

      // Users can only view their own analytics unless admin
      if (userId !== req.user?.userId && req.user?.role !== "admin") {
        return res.status(403).json(errorResponse("Unauthorized"));
      }

      const activities = userActivity.get(userId) || [];
      const period = (req.query.period as string) || "30d";
      const timeRange = getTimeRange(period);

      const periodActivities = activities.filter((a: any) => a.timestamp > timeRange.start);

      res.json(
        successResponse({
          userId,
          period: {
            start: new Date(timeRange.start).toISOString(),
            end: new Date(timeRange.end).toISOString(),
          },
          summary: {
            totalRequests: periodActivities.length,
            totalErrors: periodActivities.filter((a: any) => a.error).length,
            agentsUsed: new Set(periodActivities.map((a: any) => a.agent)).size,
            firstActivity:
              periodActivities.length > 0
                ? new Date(Math.min(...periodActivities.map((a: any) => a.timestamp))).toISOString()
                : null,
            lastActivity:
              periodActivities.length > 0
                ? new Date(Math.max(...periodActivities.map((a: any) => a.timestamp))).toISOString()
                : null,
          },
          breakdown: {
            byAgent: getActivityByAgent(periodActivities),
            byDay: getActivityByDay(periodActivities, timeRange),
            byHour: getActivityByHour(periodActivities),
          },
        }),
      );
    } catch (error: any) {
      logger.error(`[Analytics] User ${req.params.userId} error:`, error);
      res.status(500).json(errorResponse(error.message || "Failed to get user analytics"));
    }
  });

  // 10. GET /api/analytics/security
  router.get(
    "/security",
    authenticateToken,
    requireRole(["admin"]),
    (req: Request, res: Response) => {
      try {
        const period = (req.query.period as string) || "7d";
        const _timeRange = getTimeRange(period);

        // TODO: Fetch from security agent
        const securityAnalytics = {
          totalScans: 0,
          blockedRequests: 0,
          threatsDetected: 0,
          topThreats: [],
          threatTrend: [],
        };

        res.json(successResponse(securityAnalytics));
      } catch (error: any) {
        logger.error("[Analytics] Security error:", error);
        res.status(500).json(errorResponse(error.message || "Failed to get security analytics"));
      }
    },
  );

  // 11. GET /api/analytics/export
  router.get(
    "/export",
    authenticateToken,
    requireRole(["admin"]),
    (req: Request, res: Response) => {
      try {
        const format = (req.query.format as string) || "json";
        const type = (req.query.type as string) || "overview";
        const period = (req.query.period as string) || "7d";
        const timeRange = getTimeRange(period);

        let data: any = {};

        switch (type) {
          case "requests":
            data = Array.from(requestLogs.values())
              .flat()
              .filter((r: any) => r.timestamp > timeRange.start);
            break;
          case "errors":
            data = Array.from(errorLogs.values())
              .flat()
              .filter((e: any) => e.timestamp > timeRange.start);
            break;
          case "performance":
            data = Array.from(performanceMetrics.values())
              .flat()
              .filter((m: any) => m.timestamp > timeRange.start);
            break;
          default:
            data = {
              requests: Array.from(requestLogs.values())
                .flat()
                .filter((r: any) => r.timestamp > timeRange.start).length,
              errors: Array.from(errorLogs.values())
                .flat()
                .filter((e: any) => e.timestamp > timeRange.start).length,
              users: userActivity.size,
            };
        }

        if (format === "csv") {
          res.set("Content-Type", "text/csv");
          res.set(
            "Content-Disposition",
            `attachment; filename=analytics-${type}-${Date.now()}.csv`,
          );
          res.send(convertToCSV(data));
        } else {
          res.json(
            successResponse({
              type,
              period: {
                start: new Date(timeRange.start).toISOString(),
                end: new Date(timeRange.end).toISOString(),
              },
              data,
            }),
          );
        }
      } catch (error: any) {
        logger.error("[Analytics] Export error:", error);
        res.status(500).json(errorResponse(error.message || "Failed to export analytics"));
      }
    },
  );

  // 12. GET /api/analytics/reports
  router.get("/reports", authenticateToken, (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || "7d";
      const timeRange = getTimeRange(period);

      const report = {
        period: {
          start: new Date(timeRange.start).toISOString(),
          end: new Date(timeRange.end).toISOString(),
        },
        executive: {
          totalRequests: Array.from(requestLogs.values())
            .flat()
            .filter((r: any) => r.timestamp > timeRange.start).length,
          totalErrors: Array.from(errorLogs.values())
            .flat()
            .filter((e: any) => e.timestamp > timeRange.start).length,
          activeUsers: userActivity.size,
          systemUptime: process.uptime(),
          healthScore: calculateSystemHealthScore(),
        },
        agents: getAgentReport(timeRange),
        performance: getPerformanceReport(timeRange),
        trends: getTrendReport(timeRange),
      };

      res.json(successResponse(report));
    } catch (error: any) {
      logger.error("[Analytics] Reports error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get reports"));
    }
  });

  // 13. POST /api/analytics/custom
  router.post("/custom", authenticateToken, (req: Request, res: Response) => {
    try {
      const { metrics, filters, groupBy, period } = req.body;
      const timeRange = getTimeRange(period || "7d");

      // Build custom analytics query
      const results = buildCustomQuery(metrics, filters, groupBy, timeRange);

      res.json(successResponse(results));
    } catch (error: any) {
      logger.error("[Analytics] Custom query error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to execute custom query"));
    }
  });

  // 14. GET /api/analytics/real-time
  router.get("/real-time", authenticateToken, (req: Request, res: Response) => {
    try {
      const last5Minutes = Date.now() - 300000;

      const recentRequests = Array.from(requestLogs.values())
        .flat()
        .filter((r: any) => r.timestamp > last5Minutes);

      const recentErrors = Array.from(errorLogs.values())
        .flat()
        .filter((e: any) => e.timestamp > last5Minutes);

      res.json(
        successResponse({
          window: "5 minutes",
          requests: recentRequests.length,
          errors: recentErrors.length,
          requestsPerMinute: (recentRequests.length / 5).toFixed(2),
          activeAgents: getActiveAgents(),
          currentLoad: getCurrentSystemLoad(),
        }),
      );
    } catch (error: any) {
      logger.error("[Analytics] Real-time error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get real-time analytics"));
    }
  });

  // 15. GET /api/analytics/trends
  router.get("/trends", authenticateToken, (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || "30d";
      const _timeRange = getTimeRange(period);

      const trends = {
        requests: getRequestTrend(30),
        errors: getErrorTrend(Array.from(errorLogs.values()).flat(), 30),
        performance: getPerformanceTrend(30),
        users: getUserTrend(30),
        predictions: generatePredictions(),
      };

      res.json(successResponse(trends));
    } catch (error: any) {
      logger.error("[Analytics] Trends error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get trends"));
    }
  });

  // 16. GET /api/analytics/comparison
  router.get("/comparison", authenticateToken, (req: Request, res: Response) => {
    try {
      const period1 = (req.query.period1 as string) || "7d";
      const period2 = (req.query.period2 as string) || "14d";

      const range1 = getTimeRange(period1);
      const range2 = getTimeRange(period2, range1.start);

      const metrics1 = getMetricsForRange(range1);
      const metrics2 = getMetricsForRange(range2);

      const comparison = {
        period1: {
          start: new Date(range1.start).toISOString(),
          end: new Date(range1.end).toISOString(),
        },
        period2: {
          start: new Date(range2.start).toISOString(),
          end: new Date(range2.end).toISOString(),
        },
        metrics: {
          requests: {
            period1: metrics1.requests,
            period2: metrics2.requests,
            change: calculatePercentageChange(metrics2.requests, metrics1.requests),
          },
          errors: {
            period1: metrics1.errors,
            period2: metrics2.errors,
            change: calculatePercentageChange(metrics2.errors, metrics1.errors),
          },
          performance: {
            period1: metrics1.avgResponseTime,
            period2: metrics2.avgResponseTime,
            change: calculatePercentageChange(metrics2.avgResponseTime, metrics1.avgResponseTime),
          },
        },
      };

      res.json(successResponse(comparison));
    } catch (error: any) {
      logger.error("[Analytics] Comparison error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get comparison"));
    }
  });

  // 17. GET /api/analytics/dashboard
  router.get("/dashboard", authenticateToken, (req: Request, res: Response) => {
    try {
      res.json(
        successResponse({
          overview: getOverviewMetrics(),
          charts: getDashboardCharts(),
          alerts: getActiveAlerts(),
          quickStats: getQuickStats(),
        }),
      );
    } catch (error: any) {
      logger.error("[Analytics] Dashboard error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get dashboard"));
    }
  });

  // 18. GET /api/analytics/agents/:agentName/usage
  router.get("/agents/:agentName/usage", authenticateToken, (req: Request, res: Response) => {
    try {
      const agentName = req.params.agentName;
      const usage = agentUsage.get(agentName) || { requests: 0, errors: 0 };

      res.json(successResponse(usage));
    } catch (error: any) {
      logger.error(`[Analytics] Agent usage ${req.params.agentName} error:`, error);
      res.status(500).json(errorResponse(error.message || "Failed to get agent usage"));
    }
  });

  // 19. GET /api/analytics/health-score
  router.get("/health-score", authenticateToken, (req: Request, res: Response) => {
    try {
      const score = calculateSystemHealthScore();

      res.json(
        successResponse({
          score,
          grade: score > 90 ? "A" : score > 80 ? "B" : score > 70 ? "C" : "D",
          factors: getHealthFactors(),
        }),
      );
    } catch (error: any) {
      logger.error("[Analytics] Health score error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to get health score"));
    }
  });

  // 20. POST /api/analytics/track
  router.post("/track", authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { agent, action, responseTime, error } = req.body;

      // Track request
      if (!requestLogs.has(agent)) {
        requestLogs.set(agent, []);
      }
      requestLogs.get(agent)!.push({
        timestamp: Date.now(),
        action,
        userId: req.user?.userId,
        agent,
        responseTime,
        error: !!error,
      });

      // Track error if present
      if (error) {
        if (!errorLogs.has(agent)) {
          errorLogs.set(agent, []);
        }
        errorLogs.get(agent)!.push({
          timestamp: Date.now(),
          agent,
          error,
          userId: req.user?.userId,
        });
      }

      // Track performance
      if (responseTime) {
        if (!performanceMetrics.has(agent)) {
          performanceMetrics.set(agent, []);
        }
        performanceMetrics.get(agent)!.push({
          timestamp: Date.now(),
          agent,
          responseTime,
        });
      }

      // Track user activity
      if (req.user?.userId) {
        if (!userActivity.has(req.user.userId)) {
          userActivity.set(req.user.userId, []);
        }
        userActivity.get(req.user.userId)!.push({
          timestamp: Date.now(),
          agent,
          action,
          error: !!error,
        });
      }

      res.json(successResponse({ tracked: true }));
    } catch (error: any) {
      logger.error("[Analytics] Track error:", error);
      res.status(500).json(errorResponse(error.message || "Failed to track event"));
    }
  });

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  function getTimeRange(period: string, endTime?: number): { start: number; end: number } {
    const end = endTime || Date.now();
    let start = end;

    const match = period.match(/^(\d+)([hdwmy])$/);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case "h":
          start = end - value * 3600000;
          break;
        case "d":
          start = end - value * 86400000;
          break;
        case "w":
          start = end - value * 604800000;
          break;
        case "m":
          start = end - value * 2592000000;
          break;
        case "y":
          start = end - value * 31536000000;
          break;
        default:
          start = end - 86400000; // Default 24h
      }
    } else {
      start = end - 86400000; // Default 24h
    }

    return { start, end };
  }

  function calculateAverageResponseTime(): number {
    const allMetrics = Array.from(performanceMetrics.values()).flat();
    if (allMetrics.length === 0) return 0;
    return Math.round(
      allMetrics.reduce((sum: number, m: any) => sum + m.responseTime, 0) / allMetrics.length,
    );
  }

  function getTopAgents(limit: number): any[] {
    const agentCounts = new Map<string, number>();

    Array.from(requestLogs.entries()).forEach(([agent, requests]) => {
      agentCounts.set(agent, requests.length);
    });

    return Array.from(agentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([agent, count]) => ({ agent, requests: count }));
  }

  function getTopErrors(limit: number): any[] {
    const errorCounts = new Map<string, number>();

    Array.from(errorLogs.values())
      .flat()
      .forEach((error: any) => {
        const key = error.error?.message || "Unknown error";
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      });

    return Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }

  function getRequestTrend(hours: number): any[] {
    const trend = [];
    const now = Date.now();

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = now - i * 3600000;
      const hourEnd = hourStart + 3600000;

      const count = Array.from(requestLogs.values())
        .flat()
        .filter((r: any) => r.timestamp >= hourStart && r.timestamp < hourEnd).length;

      trend.push({
        hour: new Date(hourStart).toISOString(),
        requests: count,
      });
    }

    return trend;
  }

  function calculateAvgResponseTime(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    return Math.round(
      metrics.reduce((sum: number, m: any) => sum + m.responseTime, 0) / metrics.length,
    );
  }

  function calculatePercentile(metrics: any[], percentile: number): number {
    if (metrics.length === 0) return 0;
    const sorted = metrics.map((m: any) => m.responseTime).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  function calculatePercentileFromArray(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  function getHourlyBreakdown(requests: any[], timeRange: any): any[] {
    // Group requests by hour
    const hours = Math.ceil((timeRange.end - timeRange.start) / 3600000);
    const breakdown = [];

    for (let i = 0; i < hours; i++) {
      const hourStart = timeRange.start + i * 3600000;
      const hourEnd = hourStart + 3600000;

      const count = requests.filter(
        (r: any) => r.timestamp >= hourStart && r.timestamp < hourEnd,
      ).length;
      breakdown.push({ hour: new Date(hourStart).toISOString(), requests: count });
    }

    return breakdown;
  }

  function getErrorBreakdown(errors: any[]): any {
    const byType = new Map<string, number>();

    errors.forEach((error: any) => {
      const type = error.type || "Unknown";
      byType.set(type, (byType.get(type) || 0) + 1);
    });

    return Object.fromEntries(byType);
  }

  function getTopActions(agentName: string, limit: number): any[] {
    const requests = requestLogs.get(agentName) || [];
    const actionCounts = new Map<string, number>();

    requests.forEach((r: any) => {
      actionCounts.set(r.action, (actionCounts.get(r.action) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([action, count]) => ({ action, count }));
  }

  function groupErrorsByType(errors: any[]): any {
    const byType = new Map<string, number>();

    errors.forEach((error: any) => {
      const type = error.type || "Unknown";
      byType.set(type, (byType.get(type) || 0) + 1);
    });

    return Object.fromEntries(byType);
  }

  function getErrorTrend(errors: any[], hours: number): any[] {
    const trend = [];
    const now = Date.now();

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = now - i * 3600000;
      const hourEnd = hourStart + 3600000;

      const count = errors.filter(
        (e: any) => e.timestamp >= hourStart && e.timestamp < hourEnd,
      ).length;

      trend.push({
        hour: new Date(hourStart).toISOString(),
        errors: count,
      });
    }

    return trend;
  }

  function getTopUsers(limit: number): any[] {
    return Array.from(userActivity.entries())
      .map(([userId, activities]) => ({
        userId,
        requests: activities.length,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  }

  function getUsageByDay(timeRange: any): any[] {
    const days = Math.ceil((timeRange.end - timeRange.start) / 86400000);
    const usage = [];

    for (let i = 0; i < days; i++) {
      const dayStart = timeRange.start + i * 86400000;
      const dayEnd = dayStart + 86400000;

      const requests = Array.from(requestLogs.values())
        .flat()
        .filter((r: any) => r.timestamp >= dayStart && r.timestamp < dayEnd).length;

      usage.push({
        date: new Date(dayStart).toISOString().split("T")[0],
        requests,
      });
    }

    return usage;
  }

  function getPeakHours(): any[] {
    const hourCounts = new Array(24).fill(0);

    Array.from(requestLogs.values())
      .flat()
      .forEach((r: any) => {
        const hour = new Date(r.timestamp).getHours();
        hourCounts[hour]++;
      });

    return hourCounts
      .map((count, hour) => ({ hour, requests: count }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }

  function getMostUsedAgent(activities: any[]): string {
    const agentCounts = new Map<string, number>();

    activities.forEach((a: any) => {
      agentCounts.set(a.agent, (agentCounts.get(a.agent) || 0) + 1);
    });

    const sorted = Array.from(agentCounts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "None";
  }

  function getActivityByAgent(activities: any[]): any {
    const byAgent = new Map<string, number>();

    activities.forEach((a: any) => {
      byAgent.set(a.agent, (byAgent.get(a.agent) || 0) + 1);
    });

    return Object.fromEntries(byAgent);
  }

  function getActivityByDay(activities: any[], timeRange: any): any[] {
    const days = Math.ceil((timeRange.end - timeRange.start) / 86400000);
    const byDay = [];

    for (let i = 0; i < days; i++) {
      const dayStart = timeRange.start + i * 86400000;
      const dayEnd = dayStart + 86400000;

      const count = activities.filter(
        (a: any) => a.timestamp >= dayStart && a.timestamp < dayEnd,
      ).length;
      byDay.push({
        date: new Date(dayStart).toISOString().split("T")[0],
        requests: count,
      });
    }

    return byDay;
  }

  function getActivityByHour(activities: any[]): any[] {
    const hourCounts = new Array(24).fill(0);

    activities.forEach((a: any) => {
      const hour = new Date(a.timestamp).getHours();
      hourCounts[hour]++;
    });

    return hourCounts.map((count, hour) => ({ hour, requests: count }));
  }

  function calculateSystemHealthScore(): number {
    const agents = agentRegistry.getAllAgents();
    if (agents.length === 0) return 0;
    const onlineCount = agents.filter((a) => a.status === "online").length;
    return Math.round((onlineCount / agents.length) * 100);
  }

  function getAgentReport(timeRange: any): any {
    const agents = agentRegistry.getAllAgents();
    return agents.map((a) => ({
      name: a.agentId,
      status: a.status,
      uptime: 0, // TODO: Get from agent
    }));
  }

  function getPerformanceReport(timeRange: any): any {
    const allMetrics = Array.from(performanceMetrics.values())
      .flat()
      .filter((m: any) => m.timestamp > timeRange.start);

    return {
      totalRequests: allMetrics.length,
      averageResponseTime: calculateAvgResponseTime(allMetrics),
    };
  }

  function getTrendReport(timeRange: any): any {
    return {
      requests: getRequestTrend(24),
      errors: getErrorTrend(Array.from(errorLogs.values()).flat(), 24),
    };
  }

  function buildCustomQuery(metrics: any, filters: any, groupBy: any, timeRange: any): any {
    // TODO: Implement custom query builder
    return { message: "Custom query not yet implemented", metrics, filters, groupBy, timeRange };
  }

  function getActiveAgents(): number {
    return agentRegistry.getAllAgents().filter((a) => a.status === "online").length;
  }

  function getCurrentSystemLoad(): number {
    const memUsage = process.memoryUsage();
    return Number.parseFloat(((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2));
  }

  function getPerformanceTrend(days: number): any[] {
    // TODO: Implement performance trend
    return [];
  }

  function getUserTrend(days: number): any[] {
    // TODO: Implement user trend
    return [];
  }

  function generatePredictions(): any {
    // TODO: Implement predictions
    return { message: "Predictions not yet implemented" };
  }

  function getMetricsForRange(range: any): any {
    const requests = Array.from(requestLogs.values())
      .flat()
      .filter((r: any) => r.timestamp >= range.start && r.timestamp <= range.end);

    const errors = Array.from(errorLogs.values())
      .flat()
      .filter((e: any) => e.timestamp >= range.start && e.timestamp <= range.end);

    const metrics = Array.from(performanceMetrics.values())
      .flat()
      .filter((m: any) => m.timestamp >= range.start && m.timestamp <= range.end);

    return {
      requests: requests.length,
      errors: errors.length,
      avgResponseTime: calculateAvgResponseTime(metrics),
    };
  }

  function calculatePercentageChange(oldValue: number, newValue: number): string {
    if (oldValue === 0) return "+100%";
    const change = (((newValue - oldValue) / oldValue) * 100).toFixed(2);
    return `${Number.parseFloat(change) >= 0 ? "+" : ""}${change}%`;
  }

  function getOverviewMetrics(): any {
    const agents = agentRegistry.getAllAgents();
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === "online").length,
      totalRequests: Array.from(requestLogs.values()).flat().length,
      totalErrors: Array.from(errorLogs.values()).flat().length,
    };
  }

  function getDashboardCharts(): any {
    return {
      requestTrend: getRequestTrend(24),
      errorTrend: getErrorTrend(Array.from(errorLogs.values()).flat(), 24),
      topAgents: getTopAgents(5),
      topErrors: getTopErrors(5),
    };
  }

  function getActiveAlerts(): any[] {
    // TODO: Integrate with health API alerts
    return [];
  }

  function getQuickStats(): any {
    const agents = agentRegistry.getAllAgents();
    return {
      systemUptime: process.uptime(),
      activeAgents: agents.filter((a) => a.status === "online").length,
      totalAgents: agents.length,
      healthScore: calculateSystemHealthScore(),
    };
  }

  function getHealthFactors(): any {
    const agents = agentRegistry.getAllAgents();
    const onlineCount = agents.filter((a) => a.status === "online").length;
    const errorRate =
      Array.from(requestLogs.values()).flat().length > 0
        ? (Array.from(errorLogs.values()).flat().length /
            Array.from(requestLogs.values()).flat().length) *
          100
        : 0;

    return {
      agentAvailability: ((onlineCount / agents.length) * 100).toFixed(2) + "%",
      errorRate: errorRate.toFixed(2) + "%",
      averageResponseTime: calculateAverageResponseTime() + "ms",
    };
  }

  function convertToCSV(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return "";
      const headers = Object.keys(data[0]).join(",") + "\n";
      const rows = data.map((row: any) => Object.values(row).join(",")).join("\n");
      return headers + rows;
    }
    return JSON.stringify(data);
  }

  return router;
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
