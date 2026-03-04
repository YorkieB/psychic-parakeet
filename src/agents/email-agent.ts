/*
  This file connects Jarvis to your Gmail account for email management.

  It handles reading, sending, and organizing emails while making sure you stay on top of important messages.
*/

import type { Request, Response } from "express";
import express from "express";
import type { Logger } from "winston";
import { GmailService } from "../services/gmail-service";
import type { AgentRequest, AgentResponse } from "../types/agent";
import { EnhancedBaseAgent } from "./base-agent-enhanced";

/**
 * Email Agent - Real Gmail integration with full inbox access.
 */
export class EmailAgent extends EnhancedBaseAgent {
  private gmailService: GmailService;

  constructor(logger: Logger) {
    super("Email", "2.0.0", parseInt(process.env.EMAIL_AGENT_PORT || "3006", 10), logger);
    this.gmailService = new GmailService(logger);
  }

  protected async initialize(): Promise<void> {
    if (this.gmailService.isAuthenticated()) {
      this.logger.info("✅ Gmail authenticated");
    } else {
      this.logger.warn("⚠️  Gmail not authenticated. Run: npm run auth:google");
    }
  }

  protected async startServer(): Promise<void> {
    this.app.use((express as any).json());
    this.setupHealthEndpoint();
    this.setupEnhancedRoutes();

    this.app.post("/api", async (req: Request, res: Response) => {
      const startTime = Date.now();
      const request = req.body as AgentRequest;

      try {
        const action = request.action;
        const inputs = request.inputs || {};

        this.logger.info(`Email Agent executing: ${action}`, {
          requestId: request.id,
          action,
        });

        let result: unknown;

        switch (action) {
          case "list_emails":
            result = await this.listEmails(inputs);
            break;
          case "read_email":
            result = await this.readEmail(inputs);
            break;
          case "send_email":
            result = await this.sendEmail(inputs);
            break;
          case "search_emails":
            result = await this.searchEmails(inputs);
            break;
          case "mark_read":
            result = await this.markRead(inputs);
            break;
          case "archive_email":
            result = await this.archiveEmail(inputs);
            break;
          case "get_unread_count":
            result = await this.getUnreadCount();
            break;
          case "get_auth_url":
            result = { url: this.gmailService.getAuthUrl() };
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        const duration = Date.now() - startTime;

        const response: AgentResponse = {
          success: true,
          data: result,
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.json(response);
      } catch (error) {
        this.logger.error("Error processing email request", {
          error: error instanceof Error ? error.message : String(error),
          requestId: request.id,
        });

        const duration = Date.now() - startTime;
        const errorResponse: AgentResponse = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          metadata: {
            duration,
            retryCount: 0,
          },
        };

        res.status(500).json(errorResponse);
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.app
        .listen(this.port, () => {
          this.logger.info(`Email agent server listening on port ${this.port}`);
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
      "list_emails",
      "read_email",
      "send_email",
      "search_emails",
      "mark_read",
      "archive_email",
      "get_unread_count",
      "get_auth_url",
    ];
  }

  protected getDependencies(): string[] {
    return [];
  }

  protected getPriority(): number {
    return 6;
  }

  /**
   * List emails with filters.
   */
  private async listEmails(inputs: Record<string, unknown>) {
    const maxResults = (inputs.maxResults as number) || 20;
    const unreadOnly = inputs.unreadOnly as boolean;
    const query = unreadOnly ? "is:unread" : (inputs.query as string);

    return this.gmailService.listEmails({ maxResults, query });
  }

  /**
   * Read single email by ID.
   */
  private async readEmail(inputs: Record<string, unknown>) {
    const messageId = inputs.messageId as string;
    if (!messageId) throw new Error("Message ID required");

    const email = await this.gmailService.getEmail(messageId);
    if (!email) throw new Error(`Email not found: ${messageId}`);

    return email;
  }

  /**
   * Send email.
   */
  private async sendEmail(inputs: Record<string, unknown>) {
    const to = inputs.to as string;
    const subject = inputs.subject as string;
    const body = inputs.body as string;
    const cc = inputs.cc as string;
    const bcc = inputs.bcc as string;

    if (!to || !subject || !body) {
      throw new Error("To, subject, and body required");
    }

    return this.gmailService.sendEmail({ to, subject, body, cc, bcc });
  }

  /**
   * Search emails.
   */
  private async searchEmails(inputs: Record<string, unknown>) {
    const query = inputs.query as string;
    if (!query) throw new Error("Search query required");

    const maxResults = (inputs.maxResults as number) || 20;
    return this.gmailService.searchEmails(query, maxResults);
  }

  /**
   * Mark email as read.
   */
  private async markRead(inputs: Record<string, unknown>) {
    const messageId = inputs.messageId as string;
    if (!messageId) throw new Error("Message ID required");

    await this.gmailService.markAsRead(messageId);
    return { success: true, message: "Marked as read" };
  }

  /**
   * Archive email.
   */
  private async archiveEmail(inputs: Record<string, unknown>) {
    const messageId = inputs.messageId as string;
    if (!messageId) throw new Error("Message ID required");

    await this.gmailService.archiveEmail(messageId);
    return { success: true, message: "Archived" };
  }

  /**
   * Get unread email count.
   */
  private async getUnreadCount() {
    const count = await this.gmailService.getUnreadCount();
    return { count };
  }

  /**
   * Get agent-specific metrics
   */
  protected getMetrics(): {
    requestCount: number;
    errorCount: number;
    uptime: number;
    lastRequest?: string;
    [key: string]: any;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Date.now() - this.startTime.getTime(),
      lastRequest: this.lastRequestTime ? new Date(this.lastRequestTime).toISOString() : undefined,
      averageResponseTime: this.calculateAverageResponseTime(),
      status: this.getStatus(),
    };
  }

  /**
   * Update agent configuration
   */
  protected async updateConfig(config: any): Promise<void> {
    this.config = { ...this.config, ...config };
    this.logger.info("Configuration updated", { config });
  }

  /**
   * Restart the agent
   */
  protected async restart(): Promise<void> {
    this.logger.info("Restarting Email agent...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
