/**
 * Health event types
 */

export interface HealthEvent {
  agentName: string;
  timestamp: Date;
  eventType: "error" | "warning" | "info" | "crash" | "recovery";
  message: string;
  details?: {
    component?: string;
    stackTrace?: string;
    error?: Error | { message: string; stack?: string };
    metrics?: Record<string, unknown>;
    state?: string;
  };
}
