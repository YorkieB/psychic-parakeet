/**
 * Example configuration for Multi-Agent Debate (MAD) framework
 * Copy this file to mad-config.ts and update with your API keys
 */

import type { DebateEngineConfig } from "../components/cot-engine/debate-types.js";
import type { MADFrameworkConfig } from "../components/reliability-algorithm/types.js";

/**
 * Complete MAD framework configuration example
 */
export const madConfigExample: MADFrameworkConfig = {
  enabled: true,

  // Claude provider for Prosecutor role
  claudeConfig: {
    apiKey: process.env.CLAUDE_API_KEY || "your-claude-api-key-here",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 2000,
    timeout: 30000,
  },

  // GPT provider for Defense role
  gptConfig: {
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
    model: "gpt-4o",
    maxTokens: 2000,
    timeout: 30000,
  },

  // Core debate engine settings
  debateConfig: {
    maxRounds: 3,
    temperature: 0.7,
    semanticEntropyThreshold: 0.3,
    confidencePlateauThreshold: 0.02,
    fallacyPenaltyMultiplier: 0.7,
    ragVerificationWeight: 0.1,
    selfConsistencyRuns: 5,
    maxConfidence: 0.95,
    costThreshold: 5.0, // $5 per debate
  },

  // Default settings for MAD assessments
  defaults: {
    useRAGVerification: true,
    useFallacyDetection: true,
    useSelfConsistency: false, // Expensive, use for critical assessments
    enableBackground: true,
  },

  // RAG verification sources
  ragSources: {
    enablePubMed: true,
    enableWikipedia: true,
    enableGovernmentData: true,
    enableFactCheck: true,
    apiKeys: {
      factCheckApi: process.env.FACT_CHECK_API_KEY,
      governmentDataApi: process.env.GOVERNMENT_DATA_API_KEY,
    },
  },

  // Fallacy detection settings
  fallacyDetection: {
    confidenceThreshold: 0.3,
    enableContextAnalysis: true,
    // customLibraryPath: './custom-fallacies.json' // Optional
  },

  // Performance and cost controls
  performance: {
    enableAdaptiveStopping: true,
    maxParallelDebates: 3,
    requestTimeout: 120000, // 2 minutes
    costAlertThreshold: 100.0, // Alert if daily cost exceeds $100
  },
};

/**
 * Minimal MAD configuration for testing
 */
export const madConfigMinimal: MADFrameworkConfig = {
  enabled: true,

  claudeConfig: {
    apiKey: process.env.CLAUDE_API_KEY || "",
    model: "claude-3-5-sonnet-20241022",
  },

  gptConfig: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4o",
  },

  debateConfig: {
    maxRounds: 2,
    temperature: 0.7,
    semanticEntropyThreshold: 0.4,
    confidencePlateauThreshold: 0.05,
    fallacyPenaltyMultiplier: 0.7,
    ragVerificationWeight: 0.1,
    selfConsistencyRuns: 3,
    maxConfidence: 0.95,
    costThreshold: 1.0,
  },

  defaults: {
    useRAGVerification: false, // Disable for faster testing
    useFallacyDetection: true,
    useSelfConsistency: false,
    enableBackground: false,
  },
};

/**
 * High-accuracy MAD configuration for critical assessments
 */
export const madConfigHighAccuracy: MADFrameworkConfig = {
  enabled: true,

  claudeConfig: {
    apiKey: process.env.CLAUDE_API_KEY || "",
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 4000,
    timeout: 60000,
  },

  gptConfig: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4o",
    maxTokens: 4000,
    timeout: 60000,
  },

  debateConfig: {
    maxRounds: 5,
    temperature: 0.3, // Lower temperature for consistency
    semanticEntropyThreshold: 0.2, // Stricter consensus requirement
    confidencePlateauThreshold: 0.01,
    fallacyPenaltyMultiplier: 0.8,
    ragVerificationWeight: 0.2, // Higher weight for external verification
    selfConsistencyRuns: 7,
    maxConfidence: 0.92, // More conservative epistemic humility
    costThreshold: 20.0, // Higher cost tolerance for accuracy
  },

  defaults: {
    useRAGVerification: true,
    useFallacyDetection: true,
    useSelfConsistency: true, // Enable for maximum accuracy
    enableBackground: true,
  },

  ragSources: {
    enablePubMed: true,
    enableWikipedia: true,
    enableGovernmentData: true,
    enableFactCheck: true,
    apiKeys: {
      factCheckApi: process.env.FACT_CHECK_API_KEY,
      governmentDataApi: process.env.GOVERNMENT_DATA_API_KEY,
    },
  },

  fallacyDetection: {
    confidenceThreshold: 0.2, // Lower threshold for more sensitive detection
    enableContextAnalysis: true,
  },

  performance: {
    enableAdaptiveStopping: true,
    maxParallelDebates: 1, // Sequential processing for stability
    requestTimeout: 300000, // 5 minutes for complex debates
    costAlertThreshold: 500.0,
  },
};

/**
 * Convert MADFrameworkConfig to DebateEngineConfig for direct use
 */
export function extractDebateEngineConfig(madConfig: MADFrameworkConfig): DebateEngineConfig {
  return {
    maxRounds: madConfig.debateConfig?.maxRounds || 3,
    temperature: madConfig.debateConfig?.temperature || 0.7,
    semanticEntropyThreshold: madConfig.debateConfig?.semanticEntropyThreshold || 0.3,
    confidencePlateauThreshold: madConfig.debateConfig?.confidencePlateauThreshold || 0.02,
    fallacyPenaltyMultiplier: madConfig.debateConfig?.fallacyPenaltyMultiplier || 0.7,
    ragVerificationWeight: madConfig.debateConfig?.ragVerificationWeight || 0.1,
    selfConsistencyRuns: madConfig.debateConfig?.selfConsistencyRuns || 5,
    maxConfidence: madConfig.debateConfig?.maxConfidence || 0.95,
    costThreshold: madConfig.debateConfig?.costThreshold || 10.0,
  };
}

/**
 * Validate MAD configuration
 */
export function validateMADConfig(config: MADFrameworkConfig): string[] {
  const errors: string[] = [];

  if (!config.enabled) {
    return errors; // Skip validation if disabled
  }

  if (!config.claudeConfig?.apiKey) {
    errors.push("Claude API key is required when MAD is enabled");
  }

  if (!config.gptConfig?.apiKey) {
    errors.push("OpenAI API key is required when MAD is enabled");
  }

  if (config.debateConfig) {
    const { debateConfig } = config;

    if (debateConfig.maxRounds < 1 || debateConfig.maxRounds > 10) {
      errors.push("maxRounds must be between 1 and 10");
    }

    if (debateConfig.temperature < 0 || debateConfig.temperature > 2) {
      errors.push("temperature must be between 0 and 2");
    }

    if (debateConfig.maxConfidence < 0.5 || debateConfig.maxConfidence > 1.0) {
      errors.push("maxConfidence must be between 0.5 and 1.0");
    }

    if (debateConfig.costThreshold < 0) {
      errors.push("costThreshold must be positive");
    }
  }

  if (config.performance) {
    const { performance } = config;

    if (performance.maxParallelDebates < 1 || performance.maxParallelDebates > 10) {
      errors.push("maxParallelDebates must be between 1 and 10");
    }

    if (performance.requestTimeout < 10000) {
      errors.push("requestTimeout must be at least 10 seconds");
    }
  }

  return errors;
}

/**
 * Create a development-friendly MAD configuration
 */
export function createDevMADConfig(): MADFrameworkConfig {
  return {
    ...madConfigMinimal,
    performance: {
      enableAdaptiveStopping: false, // Disable for predictable testing
      maxParallelDebates: 1,
      requestTimeout: 30000,
      costAlertThreshold: 10.0,
    },
    defaults: {
      useRAGVerification: false,
      useFallacyDetection: true,
      useSelfConsistency: false,
      enableBackground: false,
    },
  };
}

/**
 * Environment-based configuration factory
 */
export function createMADConfigFromEnv(): MADFrameworkConfig {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return madConfigHighAccuracy;
    case "test":
      return createDevMADConfig();
    default:
      return madConfigExample;
  }
}
