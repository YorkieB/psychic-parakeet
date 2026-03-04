import { ClaudeProvider } from "./claude-provider.js";
import { GPTProvider } from "./gpt-provider.js";
import type { PromptManager } from "./prompt-manager.js";
import type { AIProviderConfig } from "./types.js";
import { VertexAIProvider } from "./vertex-ai-provider.js";

export interface IAssessmentProvider {
  assess(
    request: import("./types.js").AIAssessmentRequest,
  ): Promise<import("./types.js").AIAssessmentResult>;
  healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
  getConfig(): AIProviderConfig;
}

export function createAssessmentProvider(
  config: AIProviderConfig,
  promptManager: PromptManager,
): IAssessmentProvider {
  switch (config.provider) {
    case "claude-sonnet":
      return new ClaudeProvider(config, promptManager);
    case "gpt-4o":
      return new GPTProvider(config, promptManager);
    case "vertex-ai":
      return new VertexAIProvider(config, promptManager);
    case "local-model":
      throw new Error("local-model provider is not implemented; use vertex-ai or claude-sonnet");
    default:
      throw new Error(`Unknown AI provider: ${(config as AIProviderConfig).provider}`);
  }
}
