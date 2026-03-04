/*
  This file helps Jarvis talk to Google's Vertex AI language models for advanced conversations.

  It handles authentication, chat completions, and response processing while making sure Jarvis can use Google's powerful AI models effectively.
*/
/**
 * Vertex AI (dedicated endpoint or standard API) client for chat completion.
 * Use your own LLM on Vertex: set VERTEX_AI_ENDPOINT_URL and either:
 * - Use a service account key from the SAME GCP project: set GOOGLE_APPLICATION_CREDENTIALS to the key JSON path.
 * - Use standard API (recommended for "my own LLM"): set VERTEX_AI_USE_STANDARD_API=true, VERTEX_AI_PROJECT_ID=your-project-id, VERTEX_AI_REGION=europe-west4, and keep VERTEX_AI_ENDPOINT_URL (endpoint ID is parsed from it).
 */

import type { Logger } from "winston";
import type { CompletionOptions } from "./types";

const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

async function getVertexAccessToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  // Uses ADC: GOOGLE_APPLICATION_CREDENTIALS (service account key path) or gcloud application-default credentials
  const auth = new GoogleAuth({ scopes: [VERTEX_SCOPE] });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    throw new Error(
      "Vertex AI: failed to obtain access token. For your own LLM, use a service account key from the project that owns the endpoint: set GOOGLE_APPLICATION_CREDENTIALS to the path of the JSON key file.",
    );
  }
  return token;
}

function getEnv(key: string, def: string): string {
  const v = process.env[key];
  return v != null && v.trim() !== "" ? v.trim() : def;
}

function getEnvNum(key: string, def: number): number {
  const v = process.env[key];
  if (v == null || v.trim() === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** Parse endpoint ID from dedicated endpoint URL host (e.g. mg-endpoint-xxx from hostname). */
function parseEndpointIdFromUrl(endpointUrl: string): string {
  try {
    const u = new URL(endpointUrl.startsWith("http") ? endpointUrl : `https://${endpointUrl}`);
    return u.hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

/** Get host (authority) from endpoint URL for dedicated full-path requests. */
function getHostFromEndpointUrl(endpointUrl: string): string {
  try {
    const u = new URL(endpointUrl.startsWith("http") ? endpointUrl : `https://${endpointUrl}`);
    return u.hostname;
  } catch {
    return endpointUrl.replace(/^https?:\/\//, "").split("/")[0] || "";
  }
}

/**
 * Vertex AI client for text completion (chat). Use when VERTEX_AI_ENDPOINT_URL is set.
 */
export class VertexLLMClient {
  private readonly logger: Logger;
  private readonly endpointUrl: string;
  private readonly useStandardApi: boolean;
  private readonly useDedicatedFullPath: boolean;
  private readonly projectId: string;
  private readonly projectNumber: string;
  private readonly region: string;
  private readonly endpointId: string;
  private readonly dedicatedHost: string;
  private readonly useRawPredict: boolean;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeout: number;

  constructor(
    logger: Logger,
    config?: { model?: string; maxTokens?: number; temperature?: number; timeout?: number },
  ) {
    this.logger = logger;
    const base = getEnv("VERTEX_AI_ENDPOINT_URL", "");
    if (!base) {
      throw new Error("VertexLLMClient requires VERTEX_AI_ENDPOINT_URL");
    }
    this.endpointUrl = base.replace(/\/+$/, "");
    this.dedicatedHost = getHostFromEndpointUrl(this.endpointUrl);
    this.useStandardApi = getEnv("VERTEX_AI_USE_STANDARD_API", "false").toLowerCase() === "true";
    this.projectNumber = getEnv("VERTEX_AI_PROJECT_NUMBER", "");
    this.useDedicatedFullPath = this.projectNumber.length > 0;
    this.projectId = getEnv("VERTEX_AI_PROJECT_ID", "");
    this.region = getEnv("VERTEX_AI_REGION", "europe-west4");
    this.endpointId =
      getEnv("VERTEX_AI_ENDPOINT_ID", "") || parseEndpointIdFromUrl(this.endpointUrl);
    this.useRawPredict = getEnv("VERTEX_AI_USE_RAW_PREDICT", "false").toLowerCase() === "true";
    this.model =
      config?.model ?? getEnv("VERTEX_AI_MODEL", "qwen3-30b-a3b-claude-4_5-opus-high-reasoning");
    this.maxTokens = config?.maxTokens ?? getEnvNum("VERTEX_AI_MAX_TOKENS", 4000);
    this.temperature = config?.temperature ?? getEnvNum("VERTEX_AI_TEMPERATURE", 0.7);
    this.timeout = config?.timeout ?? getEnvNum("VERTEX_AI_TIMEOUT", 60000);
    this.logger.info("Vertex LLM client initialized for chat", {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      useDedicatedFullPath: this.useDedicatedFullPath,
      useStandardApi: this.useStandardApi,
      projectId: this.useStandardApi ? this.projectId : undefined,
    });
  }

  private getPredictUrl(): string {
    if (this.useDedicatedFullPath && this.dedicatedHost && this.endpointId) {
      const path = `/v1/projects/${this.projectNumber}/locations/${this.region}/endpoints/${this.endpointId}:predict`;
      return `https://${this.dedicatedHost}${path}`;
    }
    if (this.useStandardApi && this.projectId && this.endpointId) {
      const base = `https://${this.region}-aiplatform.googleapis.com`;
      const path = `/v1/projects/${this.projectId}/locations/${this.region}/endpoints/${this.endpointId}:predict`;
      return `${base}${path}`;
    }
    return this.useRawPredict
      ? `${this.endpointUrl}/v1:rawPredict`
      : `${this.endpointUrl}/v1:predict`;
  }

  /**
   * Chat completion using messages array. Tries OpenAI-compatible format first,
   * then falls back to instances/prompt format.
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: Partial<CompletionOptions>,
  ): Promise<string> {
    const maxTokens = options?.maxTokens ?? this.maxTokens;
    const temperature = options?.temperature ?? this.temperature;
    const token = await getVertexAccessToken();

    // Try OpenAI-compatible /v1/chat/completions endpoint first (supported by many Vertex dedicated endpoints)
    const baseUrl = this.endpointUrl.replace(/\/v1\/.*$/, "");
    const chatUrl = `${baseUrl}/v1/chat/completions`;

    try {
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages, max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          this.logger.info("Vertex chat response via OpenAI-compat", { length: text.length });
          return text;
        }
      }
    } catch {
      // fall through to instances format
    }

    // Fall back to instances format with messages array
    const url = this.getPredictUrl();
    const body = JSON.stringify({
      instances: [{ messages }],
      parameters: { maxOutputTokens: maxTokens, temperature },
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Vertex AI error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const text = this.extractTextFromVertexResponse(data);
    return (text ?? "").trim();
  }

  /**
   * Complete a prompt (single user message). Used by Dialogue agent for chat.
   */
  async complete(prompt: string, options?: Partial<CompletionOptions>): Promise<string> {
    const maxTokens = options?.maxTokens ?? this.maxTokens;
    const temperature = options?.temperature ?? this.temperature;

    this.logger.debug("Vertex completion request", {
      promptLen: prompt.length,
      maxTokens,
      temperature,
    });

    const token = await getVertexAccessToken();
    const url = this.getPredictUrl();

    let body: string;
    if (this.useRawPredict) {
      body = JSON.stringify({
        prompt,
        max_tokens: maxTokens,
        temperature,
      });
    } else {
      body = JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error("Vertex API error", { status: response.status, body: text });
      throw new Error(`Vertex AI error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      predictions?: unknown[];
      candidates?: unknown[];
      error?: string;
      [key: string]: unknown;
    };

    if (data.error) {
      throw new Error(String(data.error));
    }

    const text = this.extractTextFromVertexResponse(data);
    if (text === null) {
      const raw = JSON.stringify(data).slice(0, 500);
      this.logger.error("Vertex AI response missing or unparseable predictions", { raw });
      throw new Error(
        `Vertex AI response missing predictions. Response keys: ${Object.keys(data).join(", ")}. Check backend logs for raw response.`,
      );
    }

    const trimmed = text.trim();
    if (!trimmed) {
      this.logger.error("Vertex AI returned empty text after trimming", { rawLength: text.length });
      throw new Error(
        "Vertex AI returned an empty response. The model may need a clearer prompt or different parameters.",
      );
    }
    this.logger.info("Vertex completion response", { length: trimmed.length });
    return trimmed;
  }

  /**
   * Extract completion text from various Vertex/dedicated-endpoint response shapes.
   */
  private extractTextFromVertexResponse(data: Record<string, unknown>): string | null {
    // Standard: { predictions: [ string | object ] }
    const predictions = data.predictions;
    if (Array.isArray(predictions) && predictions.length > 0) {
      const out = this.extractTextFromPrediction(predictions[0]);
      if (out !== null) return out;
    }

    // Gemini-style: { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
    const candidates = data.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const c = candidates[0] as Record<string, unknown>;
      const content = c?.content as Record<string, unknown> | undefined;
      const parts = content?.parts as Array<{ text?: string }> | undefined;
      if (Array.isArray(parts) && parts.length > 0 && typeof parts[0]?.text === "string") {
        return parts[0].text;
      }
    }

    // Top-level generatedContent / generated_text / result (some endpoints)
    if (typeof data.generatedContent === "string") return data.generatedContent;
    if (typeof data.generated_text === "string") return data.generated_text;
    if (typeof data.result === "string") return data.result;

    return null;
  }

  private extractTextFromPrediction(first: unknown): string | null {
    if (typeof first === "string") return first;
    if (first == null || typeof first !== "object") return null;
    const obj = first as Record<string, unknown>;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.prediction === "string") return obj.prediction;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.generatedContent === "string") return obj.generatedContent;
    if (typeof obj.generated_text === "string") return obj.generated_text;
    // Nested: prediction.candidates[0].content.parts[0].text
    const candidates = obj.candidates as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const content = candidates[0]?.content as Record<string, unknown> | undefined;
      const parts = content?.parts as Array<{ text?: string }> | undefined;
      if (Array.isArray(parts) && parts.length > 0 && typeof parts[0]?.text === "string") {
        return parts[0].text;
      }
    }
    return null;
  }
}

// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
