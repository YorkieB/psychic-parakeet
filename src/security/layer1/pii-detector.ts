/**
 * Layer 1: PII Detector
 * Detects and redacts personally identifiable information (5-10ms latency)
 */

import type { Redaction, ScanResult } from "../types";

export class PIIDetector {
  private readonly emailPattern: RegExp;
  private readonly phonePatterns: RegExp[];
  private readonly apiKeyPatterns: RegExp[];
  private readonly creditCardPattern: RegExp;
  private readonly ssnPattern: RegExp;

  constructor() {
    // Email pattern
    this.emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

    // Phone patterns (UK, US, international)
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

    // Credit card pattern (basic - Luhn validation would be better)
    this.creditCardPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

    // SSN pattern (US)
    this.ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
  }

  async scan(
    input: string,
    strictMode: boolean = false,
  ): Promise<ScanResult & { containsPII: boolean; redacted?: string; redactions?: Redaction[] }> {
    const startTime = Date.now();
    let redacted = input;
    const redactions: Redaction[] = [];

    // Detect emails
    const emails = input.match(this.emailPattern);
    if (emails) {
      emails.forEach((email) => {
        redactions.push({ type: "email", value: email });
        redacted = redacted.replace(email, "[EMAIL_REDACTED]");
      });
    }

    // Detect phone numbers
    for (const pattern of this.phonePatterns) {
      const phones = input.match(pattern);
      if (phones) {
        phones.forEach((phone) => {
          redactions.push({ type: "phone", value: phone });
          redacted = redacted.replace(phone, "[PHONE_REDACTED]");
        });
      }
    }

    // Detect API keys
    for (const pattern of this.apiKeyPatterns) {
      const keys = input.match(pattern);
      if (keys) {
        keys.forEach((key) => {
          redactions.push({ type: "api_key", value: key });
          redacted = redacted.replace(key, "[API_KEY_REDACTED]");
        });
      }
    }

    // Detect credit cards
    const cards = input.match(this.creditCardPattern);
    if (cards) {
      cards.forEach((card) => {
        redactions.push({ type: "other", value: card });
        redacted = redacted.replace(card, "[CARD_REDACTED]");
      });
    }

    // Detect SSN
    const ssns = input.match(this.ssnPattern);
    if (ssns) {
      ssns.forEach((ssn) => {
        redactions.push({ type: "other", value: ssn });
        redacted = redacted.replace(ssn, "[SSN_REDACTED]");
      });
    }

    const containsPII = redactions.length > 0;

    return {
      allowed: !strictMode || !containsPII,
      containsPII,
      redacted: containsPII ? redacted : undefined,
      redactions: containsPII ? redactions : undefined,
      latency: Date.now() - startTime,
    };
  }
}
