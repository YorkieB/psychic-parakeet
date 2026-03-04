/**
 * Security Agent Type Definitions
 */

export interface ScanContext {
  userId: string;
  sessionId?: string;
  strictMode?: boolean;
  source?: "user" | "email" | "pdf" | "web" | "api";
}

export interface ScanResult {
  allowed: boolean;
  threat?: string;
  reason?: string;
  confidence?: Record<string, number>;
  redacted?: string;
  latency: number;
}

export interface Redaction {
  type: "email" | "phone" | "api_key" | "system_prompt_leak" | "other";
  value?: string;
  position?: { start: number; end: number };
}

export interface SanitizedOutput {
  sanitized: string;
  redactions: Redaction[];
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  confirmationPrompt?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  userId: string;
  sessionId?: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, unknown>;
  blocked?: boolean;
}

export interface ThreatLevel {
  level: "low" | "medium" | "high" | "critical";
  reasons: string[];
}

export interface RateLimitState {
  calls: number[];
  windowStart: number;
}

export interface ToolPermissions {
  readOnly: boolean;
  requiresConfirmation: boolean;
  rateLimit: {
    tool: string;
    maxCalls: number;
    windowMs: number;
  };
}

export interface RequestContext {
  userId: string;
  sessionId?: string;
  userConfirmed?: boolean;
  toolName?: string;
  params?: Record<string, unknown>;
}
