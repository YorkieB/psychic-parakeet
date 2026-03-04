/**
 * API Configuration
 * Centralized configuration for the Jarvis Reliability API Server
 */

import type { ReliabilityConfig } from "../../components/reliability-algorithm/types.js";
import type { JarvisAPIConfig } from "../server.js";

/**
 * Load environment variables with defaults
 */
function getEnvVar(key: string, defaultValue: string): string;
function getEnvVar(key: string, defaultValue: number): number;
function getEnvVar(key: string, defaultValue: boolean): boolean;
function getEnvVar(key: string, defaultValue: any): any {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof defaultValue === "boolean") {
    return value.toLowerCase() === "true";
  }

  if (typeof defaultValue === "number") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  return value;
}

/**
 * Create development configuration
 */
/** Build primary AI provider from env (Vertex AI when VERTEX_AI_ENDPOINT_URL is set). */
function getPrimaryProvider(): ReliabilityConfig["aiEngine"]["primaryProvider"] {
  const vertexUrl = process.env.VERTEX_AI_ENDPOINT_URL?.trim();
  if (vertexUrl) {
    return {
      provider: "vertex-ai",
      vertexEndpointUrl: vertexUrl,
      vertexUseRawPredict: getEnvVar("VERTEX_AI_USE_RAW_PREDICT", "false") === "true",
      model: getEnvVar("VERTEX_AI_MODEL", "qwen3-30b-a3b-claude-4_5-opus-high-reasoning"),
      maxTokens: getEnvVar("VERTEX_AI_MAX_TOKENS", 4000),
      temperature: getEnvVar("VERTEX_AI_TEMPERATURE", 0.1),
      timeout: getEnvVar("VERTEX_AI_TIMEOUT", 60000),
    };
  }
  return {
    provider: "claude-sonnet",
    apiKey: getEnvVar("CLAUDE_API_KEY", "test-key"),
    model: "claude-3-haiku-20240307",
    maxTokens: 4000,
    temperature: 0.1,
    timeout: 30000,
  };
}

export function createDevelopmentConfig(): JarvisAPIConfig {
  const reliabilityConfig: ReliabilityConfig = {
    aiEngine: {
      primaryProvider: getPrimaryProvider(),
      secondaryProvider: {
        provider: "gpt-4o",
        apiKey: getEnvVar("OPENAI_API_KEY", "test-key"),
        model: "gpt-4o",
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
      },
      enableConsensusMode: true,
      consensusThreshold: 0.1,
      promptLibrary: new Map(),
      enableCaching: true,
      cacheTimeout: 30,
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
        timeoutMs: 30000,
      },
      rateLimiting: {
        requestsPerMinute: 100,
        burstLimit: 20,
      },
    },

    // Enable MAD framework in development
    madFramework: {
      enabled: getEnvVar("MAD_ENABLED", true),
      claudeConfig: {
        apiKey: getEnvVar("CLAUDE_API_KEY", "test-key"),
        model: "claude-3-haiku-20240307",
        maxTokens: 4000,
        timeout: 30000,
      },
      gptConfig: {
        apiKey: getEnvVar("OPENAI_API_KEY", "test-key"),
        model: "gpt-4o",
        maxTokens: 4000,
        timeout: 30000,
      },
      debateConfig: {
        maxRounds: 3,
        temperature: 0.3,
        semanticEntropyThreshold: 0.15,
        confidencePlateauThreshold: 0.02,
        fallacyPenaltyMultiplier: 0.2,
        ragVerificationWeight: 0.15,
        selfConsistencyRuns: 3,
        maxConfidence: 0.95,
        costThreshold: 10.0,
      },
      defaults: {
        useRAGVerification: true,
        useFallacyDetection: true,
        useSelfConsistency: true,
        enableBackground: false,
      },
      fallacyDetection: {
        confidenceThreshold: 0.6,
        enableContextAnalysis: true,
      },
      performance: {
        enableAdaptiveStopping: true,
        maxParallelDebates: 2,
        requestTimeout: 30000,
        costAlertThreshold: 5.0,
      },
    },

    // Enable GTVP framework in development
    gtvpFramework: {
      enabled: getEnvVar("GTVP_ENABLED", true),
      gtvpConfig: {
        requireMinimumVerifications: 2,
        confidenceThreshold: 0.7,
        enableExpertEscalation: false,
        timeoutMs: 10000,
        retryAttempts: 2,
      },
      datasetGeneration: {
        autoGenerate: false,
        targetSize: 20,
        distributionStrategy: "BALANCED",
        minimumConfidenceThreshold: 0.5,
      },
      integration: {
        useForHighStakes: true,
        triggerThreshold: 0.9,
        enableRealTimeVerification: false,
      },
    },
  };

  return {
    port: getEnvVar("PORT", 3000),
    host: getEnvVar("HOST", "0.0.0.0"),
    corsOrigin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    rateLimitWindow: getEnvVar("RATE_LIMIT_WINDOW", 60000), // 1 minute
    rateLimitMax: getEnvVar("RATE_LIMIT_MAX", 100),
    reliabilityConfig,
    enableWebSocket: getEnvVar("ENABLE_WEBSOCKET", true),
    enableSwaggerUI: getEnvVar("ENABLE_SWAGGER_UI", true),
    enableAuthentication: getEnvVar("ENABLE_AUTH", false),
    jwtSecret: getEnvVar("JWT_SECRET", "development-secret-key"),
    logLevel: getEnvVar("LOG_LEVEL", "debug") as "debug" | "info" | "warn" | "error",
  };
}

/**
 * Create production configuration
 */
export function createProductionConfig(): JarvisAPIConfig {
  // Validate required environment variables
  const requiredVars = ["CLAUDE_API_KEY", "OPENAI_API_KEY", "JWT_SECRET"];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  }

  const reliabilityConfig: ReliabilityConfig = {
    aiEngine: {
      primaryProvider: (() => {
        const vertexUrl = process.env.VERTEX_AI_ENDPOINT_URL?.trim();
        if (vertexUrl) {
          return {
            provider: "vertex-ai" as const,
            vertexEndpointUrl: vertexUrl,
            vertexUseRawPredict: process.env.VERTEX_AI_USE_RAW_PREDICT === "true",
            model: process.env.VERTEX_AI_MODEL || "qwen3-30b-a3b-claude-4_5-opus-high-reasoning",
            maxTokens: parseInt(process.env.VERTEX_AI_MAX_TOKENS || "4000", 10),
            temperature: parseFloat(process.env.VERTEX_AI_TEMPERATURE || "0.1"),
            timeout: parseInt(process.env.VERTEX_AI_TIMEOUT || "60000", 10),
          };
        }
        return {
          provider: "claude-sonnet" as const,
          apiKey: process.env.CLAUDE_API_KEY!,
          model: "claude-3-haiku-20240307",
          maxTokens: 4000,
          temperature: 0.1,
          timeout: 30000,
        };
      })(),
      secondaryProvider: {
        provider: "gpt-4o",
        apiKey: process.env.OPENAI_API_KEY!,
        model: "gpt-4o",
        maxTokens: 4000,
        temperature: 0.1,
        timeout: 30000,
      },
      enableConsensusMode: true,
      consensusThreshold: 0.1,
      promptLibrary: new Map(),
      enableCaching: true,
      cacheTimeout: 60,
      retryConfig: {
        maxRetries: 3,
        backoffMs: 2000,
        timeoutMs: 45000,
      },
      rateLimiting: {
        requestsPerMinute: 200,
        burstLimit: 50,
      },
    },

    madFramework: {
      enabled: getEnvVar("MAD_ENABLED", true),
      claudeConfig: {
        apiKey: process.env.CLAUDE_API_KEY!,
        model: "claude-3-haiku-20240307",
        maxTokens: 4000,
        timeout: 45000,
      },
      gptConfig: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: "gpt-4o",
        maxTokens: 4000,
        timeout: 45000,
      },
      debateConfig: {
        maxRounds: 3,
        temperature: 0.3,
        semanticEntropyThreshold: 0.15,
        confidencePlateauThreshold: 0.02,
        fallacyPenaltyMultiplier: 0.2,
        ragVerificationWeight: 0.15,
        selfConsistencyRuns: 3,
        maxConfidence: 0.95,
        costThreshold: 25.0, // Higher cost threshold for production
      },
      defaults: {
        useRAGVerification: true,
        useFallacyDetection: true,
        useSelfConsistency: true,
        enableBackground: true, // Enable background processing in production
      },
      fallacyDetection: {
        confidenceThreshold: 0.6,
        enableContextAnalysis: true,
      },
      performance: {
        enableAdaptiveStopping: true,
        maxParallelDebates: 5, // Higher concurrency in production
        requestTimeout: 45000,
        costAlertThreshold: 15.0,
      },
    },

    gtvpFramework: {
      enabled: getEnvVar("GTVP_ENABLED", true),
      gtvpConfig: {
        requireMinimumVerifications: 3, // Higher requirement in production
        confidenceThreshold: 0.8, // Higher threshold in production
        enableExpertEscalation: getEnvVar("GTVP_EXPERT_ESCALATION", true),
        timeoutMs: 15000,
        retryAttempts: 3,
      },
      authorities: {
        apiKeys: {
          reuters: process.env.REUTERS_API_KEY,
          pubmed: process.env.PUBMED_API_KEY,
          governmentData: process.env.GOVERNMENT_DATA_API_KEY,
        },
      },
      datasetGeneration: {
        autoGenerate: getEnvVar("GTVP_AUTO_GENERATE", false),
        targetSize: 100,
        distributionStrategy: "BALANCED",
        minimumConfidenceThreshold: 0.7,
      },
      integration: {
        useForHighStakes: true,
        triggerThreshold: 0.95, // Higher threshold for production
        enableRealTimeVerification: getEnvVar("GTVP_REALTIME", true),
      },
    },
  };

  return {
    port: getEnvVar("PORT", 8080),
    host: getEnvVar("HOST", "0.0.0.0"),
    corsOrigin: process.env.CORS_ORIGIN?.split(",") || [
      "https://jarvis-ui.com",
      "https://jarvis-dashboard.com",
    ],
    rateLimitWindow: getEnvVar("RATE_LIMIT_WINDOW", 60000),
    rateLimitMax: getEnvVar("RATE_LIMIT_MAX", 500), // Higher rate limit for production
    reliabilityConfig,
    enableWebSocket: getEnvVar("ENABLE_WEBSOCKET", true),
    enableSwaggerUI: getEnvVar("ENABLE_SWAGGER_UI", false), // Disable in production by default
    enableAuthentication: getEnvVar("ENABLE_AUTH", true),
    jwtSecret: process.env.JWT_SECRET!,
    logLevel: getEnvVar("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",
  };
}

/**
 * Create test configuration
 */
export function createTestConfig(): JarvisAPIConfig {
  const reliabilityConfig: ReliabilityConfig = {
    aiEngine: {
      primaryProvider: {
        provider: "claude-sonnet",
        apiKey: "test-key",
        model: "claude-3-haiku-20240307",
        maxTokens: 1000,
        temperature: 0.1,
        timeout: 5000,
      },
      secondaryProvider: {
        provider: "gpt-4o",
        apiKey: "test-key",
        model: "gpt-4o",
        maxTokens: 1000,
        temperature: 0.1,
        timeout: 5000,
      },
      enableConsensusMode: false, // Disabled in test for simplicity
      consensusThreshold: 0.1,
      promptLibrary: new Map(),
      enableCaching: false, // Disabled in test
      cacheTimeout: 5,
      retryConfig: {
        maxRetries: 1,
        backoffMs: 100,
        timeoutMs: 5000,
      },
      rateLimiting: {
        requestsPerMinute: 1000,
        burstLimit: 100,
      },
    },

    madFramework: {
      enabled: false, // Disable MAD in tests for speed
    },

    gtvpFramework: {
      enabled: false, // Disable GTVP in tests for speed
    },
  };

  return {
    port: getEnvVar("TEST_PORT", 3001),
    host: "127.0.0.1",
    corsOrigin: "*",
    rateLimitWindow: 60000,
    rateLimitMax: 1000,
    reliabilityConfig,
    enableWebSocket: false,
    enableSwaggerUI: false,
    enableAuthentication: false,
    jwtSecret: "test-secret",
    logLevel: "error",
  };
}

/**
 * Get configuration based on environment
 */
export function getAPIConfig(): JarvisAPIConfig {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return createProductionConfig();
    case "test":
      return createTestConfig();
    default:
      return createDevelopmentConfig();
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: JarvisAPIConfig): void {
  const errors: string[] = [];

  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push("Invalid port number");
  }

  if (!config.host) {
    errors.push("Host is required");
  }

  if (config.enableAuthentication && !config.jwtSecret) {
    errors.push("JWT secret is required when authentication is enabled");
  }

  const primary = config.reliabilityConfig.aiEngine.primaryProvider;
  if (process.env.NODE_ENV === "production") {
    if (primary.provider === "vertex-ai") {
      if (!(primary as any).vertexEndpointUrl) {
        errors.push("Vertex AI primary provider requires VERTEX_AI_ENDPOINT_URL in production");
      }
    } else if (!primary.apiKey) {
      errors.push("Primary AI provider API key is required in production");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
}
