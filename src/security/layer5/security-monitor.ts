/**
 * Layer 5: Security Monitor
 * Anomaly detection, threat pattern recognition, and alerting
 */

import type { Logger } from "winston";
import type { DatabaseClient } from "../../database";
import type { SecurityEvent, ThreatLevel } from "../types";

export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private logger: Logger;
  private db?: DatabaseClient;
  private blockedUsers = new Set<string>();

  constructor(logger: Logger, db?: DatabaseClient) {
    this.logger = logger;
    this.db = db;
  }

  async detectAnomalies(userId: string): Promise<ThreatLevel> {
    const window = 60 * 60 * 1000; // 1 hour
    const events = await this.getSecurityEvents(userId, window);

    // Pattern 1: Repeated prompt injection attempts
    const injectionAttempts = events.filter(
      (e) => e.type === "input_blocked" && e.details?.threat === "prompt_injection",
    );

    if (injectionAttempts.length > 5) {
      await this.autoBlockUser(userId, "repeated_injection_attempts");
      await this.alertAdmin({
        severity: "critical",
        message: `User ${userId} made ${injectionAttempts.length} injection attempts in 1 hour`,
        action: "auto_blocked",
      });
      return { level: "critical", reasons: ["repeated_injection_attempts"] };
    }

    // Pattern 2: High entropy prompts (obfuscation attempt)
    const highEntropyCount = events.filter((e) => {
      if (e.details?.input) {
        const entropy = this.calculateEntropy(String(e.details.input));
        return entropy > 4.5;
      }
      return false;
    }).length;

    if (highEntropyCount > 3) {
      await this.alertAdmin({
        severity: "high",
        message: `User ${userId} sent ${highEntropyCount} high-entropy prompts (possible obfuscation)`,
        action: "monitor",
      });
      return { level: "high", reasons: ["high_entropy_obfuscation"] };
    }

    // Pattern 3: Rapid tool usage (automation/scraping)
    const toolCalls = events.filter((e) => e.type === "tool_call");
    if (toolCalls.length > 100) {
      await this.throttleUser(userId, 0.5); // Reduce rate limits by 50%
      await this.alertAdmin({
        severity: "medium",
        message: `User ${userId} made ${toolCalls.length} tool calls in 1 hour`,
        action: "throttled",
      });
      return { level: "medium", reasons: ["excessive_tool_usage"] };
    }

    // Pattern 4: PII exposure attempts
    const piiAttempts = events.filter((e) => e.type === "output_sanitized");
    if (piiAttempts.length > 10) {
      await this.alertAdmin({
        severity: "high",
        message: `User ${userId} triggered ${piiAttempts.length} PII redactions`,
        action: "review",
      });
      return { level: "high", reasons: ["excessive_pii_exposure"] };
    }

    return { level: "low", reasons: [] };
  }

  async logSecurityEvent(event: Omit<SecurityEvent, "id" | "timestamp">): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...event,
    };

    this.events.push(securityEvent);

    // Save to database if available
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO security_events (id, timestamp, user_id, session_id, threat_type, severity, blocked, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            securityEvent.id,
            new Date(securityEvent.timestamp),
            securityEvent.userId,
            securityEvent.sessionId || null,
            securityEvent.type,
            securityEvent.severity,
            securityEvent.blocked || false,
            JSON.stringify(securityEvent.details),
          ],
        );
      } catch (error) {
        this.logger.error("Failed to save security event to database", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info("Security event logged", {
      type: securityEvent.type,
      severity: securityEvent.severity,
      userId: securityEvent.userId,
    });

    // Immediate threat detection
    if (securityEvent.severity === "critical" || securityEvent.severity === "high") {
      await this.detectAnomalies(securityEvent.userId);
    }
  }

  // Alias method for backwards compatibility
  async logEvent(event: {
    userId: string;
    threatType: string;
    severity: string;
    blocked: boolean;
    reason?: string;
    details?: any;
  }): Promise<void> {
    await this.logSecurityEvent({
      userId: event.userId,
      type: event.threatType as SecurityEvent["type"],
      severity: event.severity as SecurityEvent["severity"],
      blocked: event.blocked,
      details: { reason: event.reason, ...event.details },
    });
  }

  private async getSecurityEvents(userId: string, windowMs: number): Promise<SecurityEvent[]> {
    const now = Date.now();
    const inMemoryEvents = this.events.filter(
      (e) => e.userId === userId && now - e.timestamp < windowMs,
    );

    // Also fetch from database if available
    if (this.db) {
      try {
        const result = await this.db.query(
          `SELECT * FROM security_events 
           WHERE user_id = $1 
           AND timestamp > NOW() - INTERVAL '${windowMs} milliseconds'
           ORDER BY timestamp DESC`,
          [userId],
        );

        const dbEvents: SecurityEvent[] = result.rows.map((row: any) => ({
          id: row.id,
          timestamp: new Date(row.timestamp).getTime(),
          userId: row.user_id,
          sessionId: row.session_id,
          type: row.threat_type,
          severity: row.severity,
          details: row.details || {},
          blocked: row.blocked,
        }));

        return [...inMemoryEvents, ...dbEvents];
      } catch (error) {
        this.logger.error("Failed to fetch security events from database", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return inMemoryEvents;
  }

  private calculateEntropy(text: string): number {
    const frequencies = new Map<string, number>();
    for (const char of text) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    let entropy = 0;
    const length = text.length;

    for (const freq of frequencies.values()) {
      const probability = freq / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private async autoBlockUser(userId: string, reason: string): Promise<void> {
    this.blockedUsers.add(userId);
    this.logger.warn("User auto-blocked", { userId, reason });

    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO suspicious_users (user_id, reason, attack_count, auto_blocked)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) 
           DO UPDATE SET attack_count = suspicious_users.attack_count + 1, auto_blocked = true`,
          [userId, reason, 1, true],
        );
      } catch (error) {
        this.logger.error("Failed to save blocked user to database", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async throttleUser(userId: string, factor: number): Promise<void> {
    this.logger.warn("User throttled", { userId, factor });
    // In production: Update rate limits in database/cache
  }

  private async alertAdmin(alert: {
    severity: string;
    message: string;
    action: string;
  }): Promise<void> {
    this.logger.error("ADMIN ALERT", alert);
    // In production: Send email, Slack notification, etc.
  }

  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }

  private generateId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
