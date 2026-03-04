/**
 * Layer 3: Output Sanitizer
 * Redacts sensitive data from responses before sending to user
 */

import type { Redaction, SanitizedOutput } from "../types";

export class OutputSanitizer {
  private readonly emailPattern: RegExp;
  private readonly phonePatterns: RegExp[];
  private readonly apiKeyPatterns: RegExp[];
  private readonly systemPromptPatterns: RegExp[];

  constructor() {
    // Email pattern
    this.emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

    // Phone patterns
    this.phonePatterns = [
      /(\+44|0)[0-9\s]{10,}/g, // UK
      /(\+1)?[0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, // US
      /\+\d{1,3}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,9}/g, // International
    ];

    // API key patterns
    this.apiKeyPatterns = [
      /sk-[a-zA-Z0-9]{32,}/g, // OpenAI
      /pk_live_[a-zA-Z0-9]{32,}/g, // Stripe live
      /pk_test_[a-zA-Z0-9]{32,}/g, // Stripe test
      /AIza[0-9A-Za-z_-]{35}/g, // Google API
      /ghp_[a-zA-Z0-9]{36}/g, // GitHub
      /xox[baprs]-[0-9a-zA-Z-]{10,48}/g, // Slack
    ];

    // System prompt leakage patterns
    this.systemPromptPatterns = [
      /you\s+are\s+a\s+helpful\s+assistant/i,
      /system\s+prompt/i,
      /your\s+instructions\s+are/i,
      /you\s+were\s+trained/i,
      /your\s+training\s+data/i,
    ];
  }

  sanitize(output: string): SanitizedOutput {
    let sanitized = output;
    const redactions: Redaction[] = [];

    // Redact emails
    sanitized = sanitized.replace(this.emailPattern, (match) => {
      redactions.push({ type: "email", value: match });
      return "[EMAIL_REDACTED]";
    });

    // Redact phone numbers
    for (const pattern of this.phonePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        redactions.push({ type: "phone", value: match });
        return "[PHONE_REDACTED]";
      });
    }

    // Redact API keys
    for (const pattern of this.apiKeyPatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        redactions.push({ type: "api_key", value: match });
        return "[API_KEY_REDACTED]";
      });
    }

    // Prevent system prompt leakage
    for (const pattern of this.systemPromptPatterns) {
      if (pattern.test(sanitized)) {
        redactions.push({ type: "system_prompt_leak" });
        sanitized = "I cannot share my system configuration or training details.";
        break;
      }
    }

    // Sanitize code blocks to prevent injection
    sanitized = this.sanitizeCodeBlocks(sanitized);

    return { sanitized, redactions };
  }

  private sanitizeCodeBlocks(text: string): string {
    // Escape HTML entities in code blocks to prevent XSS
    return text.replace(/```([\s\S]*?)```/g, (match, code) => {
      const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
      return "```" + escaped + "```";
    });
  }
}
