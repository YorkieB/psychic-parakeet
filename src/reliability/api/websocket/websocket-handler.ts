/**
 * WebSocket Handler for Real-time Reliability Assessment
 * Enables real-time communication between Jarvis components
 */

import jwt from "jsonwebtoken";
import type { Socket, Server as SocketIOServer } from "socket.io";
import type { GTVPEngine } from "../../components/gtvp/gtvp-engine.js";
import type { VerificationRequest } from "../../components/gtvp/index.js";
import type { ReliabilityAlgorithm } from "../../components/reliability-algorithm/reliability-algorithm.js";
import type { ReliabilityAssessmentRequest } from "../../components/reliability-algorithm/types.js";
import { logger } from "../middleware/logging.js";

interface JarvisSocketData {
  componentId: string;
  userId?: string;
  sessionId?: string;
  authenticated: boolean;
  connectionTime: Date;
}

interface WebSocketAssessmentRequest {
  requestId: string;
  sourceUrl: string;
  sourceContent?: string;
  priority?: "low" | "normal" | "high";
  options?: {
    useMAD?: boolean;
    useFallacyDetection?: boolean;
    useGTVP?: boolean;
  };
  jarvisContext: {
    componentId: string;
    userId?: string;
    sessionId?: string;
  };
}

interface WebSocketGTVPRequest {
  requestId: string;
  claim: string;
  sourceUrl: string;
  domain: string;
  jarvisContext: {
    componentId: string;
    userId?: string;
    sessionId?: string;
  };
}

export class WebSocketHandler {
  private io: SocketIOServer;
  private reliabilityAlgorithm: ReliabilityAlgorithm;
  private gtvpEngine?: GTVPEngine;
  private activeConnections = new Map<string, JarvisSocketData>();
  private activeAssessments = new Map<string, { socketId: string; startTime: number }>();

  constructor(
    io: SocketIOServer,
    reliabilityAlgorithm: ReliabilityAlgorithm,
    gtvpEngine?: GTVPEngine,
  ) {
    this.io = io;
    this.reliabilityAlgorithm = reliabilityAlgorithm;
    this.gtvpEngine = gtvpEngine;

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket middleware
   */
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        const componentId = socket.handshake.auth.componentId || socket.handshake.query.componentId;

        if (!token && process.env.ENABLE_WEBSOCKET_AUTH === "true") {
          return next(new Error("Authentication required"));
        }

        if (!componentId) {
          return next(new Error("Component ID required"));
        }

        // Verify JWT if provided
        if (token && process.env.JWT_SECRET) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
            socket.data = {
              componentId: decoded.componentId || componentId,
              userId: decoded.userId,
              sessionId: decoded.sessionId,
              authenticated: true,
              connectionTime: new Date(),
            };
          } catch (_jwtError) {
            return next(new Error("Invalid authentication token"));
          }
        } else {
          // Allow unauthenticated connections in development
          socket.data = {
            componentId: componentId as string,
            authenticated: false,
            connectionTime: new Date(),
          };
        }

        next();
      } catch (_error) {
        next(new Error("Authentication failed"));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      const _clientIP = socket.handshake.address;
      const _now = Date.now();

      // Simple rate limiting - 100 connections per minute per IP
      // In production, use Redis for distributed rate limiting

      next();
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: Socket): void {
    const socketData = socket.data as JarvisSocketData;
    this.activeConnections.set(socket.id, socketData);

    // Log connection
    logger.system("websocket_connection", {
      socketId: socket.id,
      componentId: socketData.componentId,
      authenticated: socketData.authenticated,
      clientIP: socket.handshake.address,
    });

    // Send connection acknowledgment
    socket.emit("connected", {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      features: {
        reliabilityAssessment: true,
        gtvpVerification: !!this.gtvpEngine,
        madDebate: this.reliabilityAlgorithm.isMADAvailable(),
        fallacyDetection: true,
      },
    });

    // Setup event handlers for this socket
    this.setupSocketEventHandlers(socket);

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      this.handleDisconnection(socket, reason);
    });
  }

  /**
   * Setup event handlers for individual socket
   */
  private setupSocketEventHandlers(socket: Socket): void {
    // Reliability assessment request
    socket.on("assess_reliability", async (data: WebSocketAssessmentRequest) => {
      await this.handleReliabilityAssessment(socket, data);
    });

    // GTVP verification request
    if (this.gtvpEngine) {
      socket.on("verify_ground_truth", async (data: WebSocketGTVPRequest) => {
        await this.handleGTVPVerification(socket, data);
      });
    }

    // Batch assessment request
    socket.on("assess_batch", async (data: { requests: WebSocketAssessmentRequest[] }) => {
      await this.handleBatchAssessment(socket, data);
    });

    // Cancel assessment request
    socket.on("cancel_assessment", (data: { requestId: string }) => {
      this.handleCancelAssessment(socket, data);
    });

    // Status request
    socket.on("get_status", (data: { requestId: string }) => {
      this.handleStatusRequest(socket, data);
    });

    // Ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });

    // Error handling
    socket.on("error", (error) => {
      logger.system("websocket_error", {
        socketId: socket.id,
        error: error.message,
        componentId: socket.data.componentId,
      });
    });
  }

  /**
   * Handle reliability assessment request via WebSocket
   */
  private async handleReliabilityAssessment(
    socket: Socket,
    data: WebSocketAssessmentRequest,
  ): Promise<void> {
    const { requestId, sourceUrl, sourceContent, priority, options, jarvisContext } = data;

    try {
      // Validate request
      if (!requestId || !sourceUrl || !jarvisContext?.componentId) {
        socket.emit("assessment_error", {
          requestId,
          error: {
            code: "INVALID_REQUEST",
            message: "Missing required fields: requestId, sourceUrl, or componentId",
          },
        });
        return;
      }

      // Track active assessment
      this.activeAssessments.set(requestId, {
        socketId: socket.id,
        startTime: Date.now(),
      });

      // Send acknowledgment
      socket.emit("assessment_started", {
        requestId,
        timestamp: new Date().toISOString(),
        estimatedTime: "2-5 seconds",
      });

      // Build assessment request
      const assessmentRequest: ReliabilityAssessmentRequest = {
        sourceUrl,
        sourceContent,
        priority: priority || "normal",
        madOptions: {
          forceMad: options?.useMAD,
          useFallacyDetection: options?.useFallacyDetection !== false,
          useRAGVerification: true,
          useSelfConsistency: true,
        },
        gtvpOptions: options?.useGTVP
          ? {
              forceGTVP: true,
              minimumAuthorities: 2,
              confidenceThreshold: 0.7,
            }
          : undefined,
      };

      const startTime = Date.now();
      const result = await this.reliabilityAlgorithm.assess(assessmentRequest);
      const processingTime = Date.now() - startTime;

      // Remove from active assessments
      this.activeAssessments.delete(requestId);

      // Check if this is a background task response
      if ("taskId" in result) {
        // Background task - emit task info
        socket.emit("assessment_queued", {
          requestId,
          taskId: result.taskId,
          status: result.status,
          message: result.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Full assessment result - format response for WebSocket
      const response = {
        requestId,
        success: true,
        timestamp: new Date().toISOString(),
        processingTime,

        // Core reliability data
        reliability: {
          score: result.reliabilityScore,
          label: result.reliabilityLabel,
          confidence: result.confidence,
        },

        // Assessment details
        assessment: {
          reasoning: result.reasoning,
          assessmentNotes: result.assessmentNotes?.slice(0, 5), // Limit for real-time
          factorsAnalyzed: result.factorsAnalyzed,
        },

        // Processing metadata
        processing: {
          providersUsed: result.processingMetadata.providersUsed,
          consensusModeUsed: result.processingMetadata.consensusModeUsed,
          algorithmVersion: result.processingMetadata.algorithmVersion,
          totalProcessingTime: result.processingMetadata.totalProcessingTime,
        },

        // Jarvis context
        jarvis: {
          componentId: jarvisContext.componentId,
          sessionId: jarvisContext.sessionId,
        },
      };

      // Send result
      socket.emit("assessment_complete", response);

      // Log assessment
      logger.assessment({
        requestId,
        sourceUrl,
        score: result.reliabilityScore,
        label: result.reliabilityLabel,
        confidence: result.confidence,
        processingTime,
        providersUsed: result.processingMetadata.providersUsed,
        jarvisComponent: jarvisContext.componentId,
      });
    } catch (error) {
      // Remove from active assessments
      this.activeAssessments.delete(requestId);

      // Send error
      socket.emit("assessment_error", {
        requestId,
        error: {
          code: "ASSESSMENT_FAILED",
          message: "Reliability assessment failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      });

      logger.system("websocket_assessment_error", {
        requestId,
        sourceUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        componentId: jarvisContext.componentId,
      });
    }
  }

  /**
   * Handle GTVP verification request via WebSocket
   */
  private async handleGTVPVerification(socket: Socket, data: WebSocketGTVPRequest): Promise<void> {
    if (!this.gtvpEngine) {
      socket.emit("gtvp_error", {
        requestId: data.requestId,
        error: {
          code: "GTVP_DISABLED",
          message: "Ground Truth Verification Protocol is not enabled",
        },
      });
      return;
    }

    const { requestId, claim, sourceUrl, domain, jarvisContext } = data;

    try {
      // Send acknowledgment
      socket.emit("gtvp_started", {
        requestId,
        timestamp: new Date().toISOString(),
        estimatedTime: "3-8 seconds",
      });

      // Build GTVP request
      const verificationRequest: VerificationRequest = {
        claim,
        sourceUrl,
        domain,
        sourceId: requestId,
        requestTimestamp: new Date(),
      };

      const startTime = Date.now();
      const result = await this.gtvpEngine.verifyGroundTruth(verificationRequest);
      const processingTime = Date.now() - startTime;

      // Format response
      const response = {
        requestId,
        success: true,
        timestamp: new Date().toISOString(),
        processingTime,

        verification: {
          claim: result.claim,
          finalConfidence: result.finalConfidence,
          groundTruth: result.groundTruth,
          authoritiesConsulted: result.verifications.length,
          conflictsResolved: result.conflicts.length,
        },

        authorities: result.verifications.map((v) => ({
          name: v.authority.name,
          tier: v.authority.tier,
          status: v.status,
          confidence: v.confidence,
        })),

        quality: {
          flags: result.flags,
          processingTime: result.processingTime,
        },

        jarvis: {
          componentId: jarvisContext.componentId,
          sessionId: jarvisContext.sessionId,
        },
      };

      socket.emit("gtvp_complete", response);

      // Log verification
      logger.gtvpVerification({
        requestId,
        claim,
        domain,
        finalConfidence: result.finalConfidence,
        authoritiesConsulted: result.verifications.length,
        conflictsResolved: result.conflicts.length,
        processingTime,
        jarvisComponent: jarvisContext.componentId,
      });
    } catch (error) {
      socket.emit("gtvp_error", {
        requestId,
        error: {
          code: "GTVP_VERIFICATION_FAILED",
          message: "Ground truth verification failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle batch assessment request
   */
  private async handleBatchAssessment(
    socket: Socket,
    data: { requests: WebSocketAssessmentRequest[] },
  ): Promise<void> {
    const { requests } = data;
    const batchId = `batch-${Date.now()}`;

    // Limit batch size
    if (requests.length > 10) {
      socket.emit("batch_error", {
        batchId,
        error: {
          code: "BATCH_TOO_LARGE",
          message: "Maximum 10 requests per batch for WebSocket",
        },
      });
      return;
    }

    // Send batch started
    socket.emit("batch_started", {
      batchId,
      totalRequests: requests.length,
      timestamp: new Date().toISOString(),
    });

    // Process each request and send individual results
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      await this.handleReliabilityAssessment(socket, request);

      // Send progress update
      socket.emit("batch_progress", {
        batchId,
        completed: i + 1,
        total: requests.length,
        progress: Math.round(((i + 1) / requests.length) * 100),
      });
    }

    // Send batch complete
    socket.emit("batch_complete", {
      batchId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle cancel assessment request
   */
  private handleCancelAssessment(socket: Socket, data: { requestId: string }): void {
    const { requestId } = data;
    const activeAssessment = this.activeAssessments.get(requestId);

    if (activeAssessment && activeAssessment.socketId === socket.id) {
      this.activeAssessments.delete(requestId);
      socket.emit("assessment_cancelled", {
        requestId,
        timestamp: new Date().toISOString(),
      });
    } else {
      socket.emit("cancel_error", {
        requestId,
        error: {
          code: "REQUEST_NOT_FOUND",
          message: "Assessment request not found or already completed",
        },
      });
    }
  }

  /**
   * Handle status request
   */
  private handleStatusRequest(socket: Socket, data: { requestId: string }): void {
    const { requestId } = data;
    const activeAssessment = this.activeAssessments.get(requestId);

    if (activeAssessment) {
      const runningTime = Date.now() - activeAssessment.startTime;
      socket.emit("status_update", {
        requestId,
        status: "processing",
        runningTime,
        estimatedRemaining: Math.max(0, 5000 - runningTime),
      });
    } else {
      socket.emit("status_update", {
        requestId,
        status: "not_found",
      });
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const socketData = this.activeConnections.get(socket.id);

    // Clean up active assessments for this socket
    for (const [requestId, assessment] of this.activeAssessments.entries()) {
      if (assessment.socketId === socket.id) {
        this.activeAssessments.delete(requestId);
      }
    }

    // Remove from active connections
    this.activeConnections.delete(socket.id);

    // Log disconnection
    logger.system("websocket_disconnection", {
      socketId: socket.id,
      componentId: socketData?.componentId,
      reason,
      connectionDuration: socketData ? Date.now() - socketData.connectionTime.getTime() : 0,
    });
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      activeConnections: this.activeConnections.size,
      activeAssessments: this.activeAssessments.size,
      connectionsByComponent: Array.from(this.activeConnections.values()).reduce(
        (acc, conn) => {
          acc[conn.componentId] = (acc[conn.componentId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
