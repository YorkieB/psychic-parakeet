/**
 * Jarvis Reliability System API Server
 * RESTful API for integrating with the broader Jarvis ecosystem
 */

import { createServer } from "node:http";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Server as SocketIOServer } from "socket.io";
import swaggerUi from "swagger-ui-express";
import { GTVPEngine } from "../components/gtvp/gtvp-engine.js";
import { ReliabilityAlgorithm } from "../components/reliability-algorithm/reliability-algorithm.js";
import type { ReliabilityConfig } from "../components/reliability-algorithm/types.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { loggingMiddleware } from "./middleware/logging.js";
import { apiSpec } from "./openapi-spec.js";
import { gtvpRoutes } from "./routes/gtvp.js";
import { healthRoutes } from "./routes/health.js";
import { reliabilityRoutes } from "./routes/reliability.js";
import { systemRoutes } from "./routes/system.js";
import { WebSocketHandler } from "./websocket/websocket-handler.js";

export interface JarvisAPIConfig {
  port: number;
  host: string;
  corsOrigin?: string | string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  reliabilityConfig: ReliabilityConfig;
  enableWebSocket: boolean;
  enableSwaggerUI: boolean;
  enableAuthentication: boolean;
  jwtSecret?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export class JarvisAPIServer {
  private app: any;
  private server: any;
  private io?: SocketIOServer;
  private reliabilityAlgorithm: ReliabilityAlgorithm;
  private gtvpEngine?: GTVPEngine;
  private config: JarvisAPIConfig;
  private wsHandler?: any;

  constructor(config: JarvisAPIConfig) {
    this.config = config;
    this.app = (express as any)();
    this.server = createServer(this.app);

    // Initialize core components
    this.reliabilityAlgorithm = new ReliabilityAlgorithm(config.reliabilityConfig);

    // Initialize GTVP if enabled
    if (config.reliabilityConfig.gtvpFramework?.enabled) {
      this.gtvpEngine = new GTVPEngine(config.reliabilityConfig.gtvpFramework.gtvpConfig!);
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      }),
    );

    // CORS
    this.app.use(
      cors({
        origin: this.config.corsOrigin || "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Jarvis-Component", "X-Request-ID"],
      }),
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindow,
      max: this.config.rateLimitMax,
      message: {
        error: "Too many requests",
        message: `Rate limit exceeded. Max ${this.config.rateLimitMax} requests per ${this.config.rateLimitWindow / 1000} seconds`,
        retryAfter: this.config.rateLimitWindow / 1000,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use("/api/", limiter);

    // Body parsing
    this.app.use((express as any).json({ limit: "10mb" }));
    this.app.use((express as any).urlencoded({ extended: true, limit: "10mb" }));

    // Logging
    this.app.use(loggingMiddleware);

    // Authentication (if enabled)
    if (this.config.enableAuthentication) {
      this.app.use("/api/", authMiddleware(this.config.jwtSecret!));
    }
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // API Documentation
    if (this.config.enableSwaggerUI) {
      this.app.use(
        "/api/docs",
        swaggerUi.serve,
        swaggerUi.setup(apiSpec, {
          customCss: ".swagger-ui .topbar { display: none }",
          customSiteTitle: "Jarvis Reliability API",
          customfavIcon: "/favicon.ico",
        }),
      );
    }

    // Health and system routes
    this.app.use("/api/health", healthRoutes);
    this.app.use("/api/system", systemRoutes);

    // Core reliability routes
    this.app.use("/api/reliability", reliabilityRoutes(this.reliabilityAlgorithm));

    // GTVP routes (if enabled)
    if (this.gtvpEngine) {
      this.app.use("/api/gtvp", gtvpRoutes(this.gtvpEngine));
    }

    // Root endpoint
    this.app.get("/api", (req: Request, res: Response) => {
      res.json({
        service: "Jarvis Reliability System",
        version: "2.0.0",
        status: "operational",
        features: {
          reliabilityAssessment: true,
          multiAgentDebate: this.config.reliabilityConfig.madFramework?.enabled || false,
          groundTruthVerification: this.config.reliabilityConfig.gtvpFramework?.enabled || false,
          fallacyDetection: true,
          realTimeWebSocket: this.config.enableWebSocket,
        },
        documentation: this.config.enableSwaggerUI ? "/api/docs" : null,
        timestamp: new Date().toISOString(),
      });
    });

    // Catch-all for undefined routes
    this.app.use("/api/*", (req: Request, res: Response) => {
      res.status(404).json({
        error: "Endpoint not found",
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
        availableEndpoints: [
          "GET /api",
          "GET /api/health",
          "POST /api/reliability/assess",
          "GET /api/system/status",
        ],
      });
    });

    // Static files for documentation assets
    this.app.use("/assets", (express as any).static("assets"));
  }

  /**
   * Setup WebSocket support
   */
  private setupWebSocket(): void {
    if (!this.config.enableWebSocket) return;

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.corsOrigin || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.wsHandler = new WebSocketHandler(this.io, this.reliabilityAlgorithm, this.gtvpEngine);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      console.error("Uncaught Exception:", error);
      this.gracefulShutdown("SIGTERM");
    });

    process.on("unhandledRejection", (reason: any) => {
      console.error("Unhandled Rejection:", reason);
      this.gracefulShutdown("SIGTERM");
    });
  }

  /**
   * Start the API server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.config.port, this.config.host, () => {
          console.log(`🚀 Jarvis Reliability API Server started`);
          console.log(`📍 Host: ${this.config.host}:${this.config.port}`);
          console.log(
            `📖 API Documentation: http://${this.config.host}:${this.config.port}/api/docs`,
          );
          console.log(`🔌 WebSocket: ${this.config.enableWebSocket ? "Enabled" : "Disabled"}`);
          console.log(
            `🔐 Authentication: ${this.config.enableAuthentication ? "Enabled" : "Disabled"}`,
          );
          console.log(
            `⚡ Features: MAD=${this.config.reliabilityConfig.madFramework?.enabled}, GTVP=${this.config.reliabilityConfig.gtvpFramework?.enabled}`,
          );
          resolve();
        });

        // Setup graceful shutdown
        ["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) => {
          process.on(signal, () => this.gracefulShutdown(signal));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server gracefully
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log("🛑 Shutting down Jarvis Reliability API Server...");

      if (this.io) {
        this.io.close();
        console.log("✅ WebSocket server closed");
      }

      this.server.close(() => {
        console.log("✅ HTTP server closed");
        resolve();
      });
    });
  }

  /**
   * Get server health status
   */
  public getHealthStatus() {
    return {
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      components: {
        reliabilityAlgorithm: this.reliabilityAlgorithm ? "operational" : "unavailable",
        gtvpEngine: this.gtvpEngine ? "operational" : "disabled",
        webSocket: this.io ? "operational" : "disabled",
      },
      features: {
        madFramework: this.config.reliabilityConfig.madFramework?.enabled || false,
        gtvpFramework: this.config.reliabilityConfig.gtvpFramework?.enabled || false,
        fallacyDetection: true,
      },
    };
  }

  /**
   * Graceful shutdown handler
   */
  private gracefulShutdown(signal: string): void {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    setTimeout(() => {
      console.log("⏰ Shutdown timeout reached. Forcing exit.");
      process.exit(1);
    }, 10000); // 10 second timeout

    this.stop()
      .then(() => {
        console.log("✅ Jarvis Reliability API Server stopped gracefully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
      });
  }

  /**
   * Get Express app instance (for testing)
   */
  public getApp(): any {
    return this.app;
  }

  /**
   * Get reliability algorithm instance
   */
  public getReliabilityAlgorithm(): ReliabilityAlgorithm {
    return this.reliabilityAlgorithm;
  }

  /**
   * Get GTVP engine instance
   */
  public getGTVPEngine(): GTVPEngine | undefined {
    return this.gtvpEngine;
  }
}
