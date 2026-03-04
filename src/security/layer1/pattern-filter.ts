/**
 * Layer 1: Pattern-Based Input Filter
 * Fast pattern matching for known attack vectors (1-5ms latency)
 */

import type { ScanResult } from "../types";

export class PatternFilter {
  private readonly promptInjectionPatterns: RegExp[];
  private readonly jailbreakPatterns: RegExp[];
  private readonly maxLength: number;
  private readonly maxTokens: number;

  constructor() {
    // Prompt injection patterns
    this.promptInjectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
      /forget\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
      /disregard\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
      /override\s+(all\s+)?(previous|prior|earlier)\s+instructions?/i,
      /you\s+are\s+now\s+(a\s+)?(different|new|evil)/i,
      /system\s*:\s*you\s+are/i,
      /assistant\s*:\s*you\s+are/i,
      /\[SYSTEM\]|\[INST\]|\[/i,
      /<\|im_start\|>|<\|im_end\|>/i,
      /roleplay|role\s+play/i,
      /pretend\s+you\s+are/i,
      /act\s+as\s+if/i,
      /simulate\s+being/i,
    ];

    // Jailbreak patterns (DAN, etc.)
    this.jailbreakPatterns = [
      /you\s+are\s+DAN/i,
      /do\s+anything\s+now/i,
      /developer\s+mode/i,
      /jailbreak/i,
      /unrestricted\s+mode/i,
      /bypass\s+(safety|security|restrictions)/i,
      /ignore\s+(safety|security|content)\s+(guidelines|policies|rules)/i,
    ];

    this.maxLength = parseInt(process.env.SECURITY_MAX_INPUT_LENGTH || "50000", 10);
    this.maxTokens = parseInt(process.env.SECURITY_MAX_TOKENS || "10000", 10);
  }

  async check(input: string): Promise<ScanResult & { blocked: boolean }> {
    const startTime = Date.now();

    // Check length
    if (input.length > this.maxLength) {
      return {
        allowed: false,
        blocked: true,
        threat: "length_exceeded",
        reason: `Input exceeds maximum length of ${this.maxLength} characters`,
        latency: Date.now() - startTime,
      };
    }

    // Estimate token count (rough: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(input.length / 4);
    if (estimatedTokens > this.maxTokens) {
      return {
        allowed: false,
        blocked: true,
        threat: "token_overflow",
        reason: `Input exceeds maximum token count of ${this.maxTokens}`,
        latency: Date.now() - startTime,
      };
    }

    // Check for prompt injection patterns
    for (const pattern of this.promptInjectionPatterns) {
      if (pattern.test(input)) {
        return {
          allowed: false,
          blocked: true,
          threat: "prompt_injection",
          reason: `Detected prompt injection pattern: ${pattern.source}`,
          latency: Date.now() - startTime,
        };
      }
    }

    // Check for jailbreak patterns
    for (const pattern of this.jailbreakPatterns) {
      if (pattern.test(input)) {
        return {
          allowed: false,
          blocked: true,
          threat: "jailbreak_attempt",
          reason: `Detected jailbreak pattern: ${pattern.source}`,
          latency: Date.now() - startTime,
        };
      }
    }

    // Check for high entropy (obfuscation attempt)
    const entropy = this.calculateEntropy(input);
    if (entropy > 4.5 && input.length > 100) {
      return {
        allowed: false,
        blocked: true,
        threat: "obfuscation",
        reason: `High entropy detected (${entropy.toFixed(2)}), possible obfuscation`,
        latency: Date.now() - startTime,
      };
    }

    return {
      allowed: true,
      blocked: false,
      latency: Date.now() - startTime,
    };
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
}
