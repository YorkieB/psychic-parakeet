/**
 * OpenAPI 3.0 Specification for Jarvis Reliability System API
 * Complete API documentation for Swagger UI
 */

export const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Jarvis Reliability System API",
    version: "2.0.0",
    description:
      "Advanced source reliability assessment with Multi-Agent Debate (MAD) framework, Ground Truth Verification Protocol (GTVP), and enhanced fallacy detection for the Jarvis AI ecosystem.",
    contact: {
      name: "Jarvis Development Team",
      email: "dev@jarvis-ai.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },

  servers: [
    {
      url: "/api",
      description: "Jarvis Reliability API",
    },
  ],

  tags: [
    {
      name: "reliability",
      description: "Source reliability assessment operations",
    },
    {
      name: "gtvp",
      description: "Ground Truth Verification Protocol operations",
    },
    {
      name: "health",
      description: "System health and monitoring endpoints",
    },
    {
      name: "system",
      description: "System information and integration endpoints",
    },
  ],

  components: {
    securitySchemes: {
      JarvisAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT authentication for Jarvis components",
      },
      JarvisToken: {
        type: "apiKey",
        in: "header",
        name: "X-Jarvis-Token",
        description: "Alternative authentication via custom header",
      },
    },

    schemas: {
      // Core reliability assessment schemas
      ReliabilityAssessmentRequest: {
        type: "object",
        required: ["sourceUrl"],
        properties: {
          sourceUrl: {
            type: "string",
            format: "uri",
            description: "URL of the source to assess",
            example: "https://www.nature.com/articles/example",
          },
          sourceContent: {
            type: "string",
            maxLength: 1000000,
            description: "Optional source content to analyze directly",
            example: "Recent advances in AI have shown remarkable progress...",
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high"],
            default: "normal",
            description: "Processing priority level",
          },
          forceConsensus: {
            type: "boolean",
            description: "Force consensus mode using multiple AI providers",
          },
          runInBackground: {
            type: "boolean",
            description: "Execute assessment in background and return task ID",
          },
          madOptions: {
            $ref: "#/components/schemas/MADOptions",
          },
          gtvpOptions: {
            $ref: "#/components/schemas/GTVPOptions",
          },
          jarvisContext: {
            $ref: "#/components/schemas/JarvisContext",
          },
        },
      },

      MADOptions: {
        type: "object",
        description: "Multi-Agent Debate framework options",
        properties: {
          forceMad: {
            type: "boolean",
            description: "Force MAD processing regardless of default rules",
          },
          useRAGVerification: {
            type: "boolean",
            description: "Enable RAG verification in debate",
          },
          useFallacyDetection: {
            type: "boolean",
            description: "Enable fallacy detection in arguments",
          },
          useSelfConsistency: {
            type: "boolean",
            description: "Enable self-consistency scoring",
          },
          customRounds: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Custom number of debate rounds",
          },
          customTemperature: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Custom temperature for debate arguments",
          },
        },
      },

      GTVPOptions: {
        type: "object",
        description: "Ground Truth Verification Protocol options",
        properties: {
          forceGTVP: {
            type: "boolean",
            description: "Force GTVP verification regardless of default rules",
          },
          minimumAuthorities: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Minimum number of authorities to consult",
          },
          confidenceThreshold: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence threshold for acceptance",
          },
          verificationTimeout: {
            type: "integer",
            minimum: 1000,
            maximum: 30000,
            description: "Timeout for verification process in milliseconds",
          },
          enableExpertEscalation: {
            type: "boolean",
            description: "Enable expert escalation for conflicts",
          },
          domainRestriction: {
            type: "array",
            items: { type: "string" },
            description: "Restrict authority selection to specific domains",
          },
        },
      },

      JarvisContext: {
        type: "object",
        description: "Jarvis ecosystem integration context",
        properties: {
          componentId: {
            type: "string",
            description: "ID of the requesting Jarvis component",
            example: "jarvis-search",
          },
          requestId: {
            type: "string",
            description: "Unique request identifier",
            example: "req-1234567890",
          },
          userId: {
            type: "string",
            description: "Optional user identifier",
            example: "user-789",
          },
          sessionId: {
            type: "string",
            description: "Optional session identifier",
            example: "session-abc123",
          },
        },
      },

      ReliabilityAssessmentResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "Indicates if the request was successful",
          },
          data: {
            type: "object",
            properties: {
              reliability: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Reliability score from 0.0 to 1.0",
                  },
                  label: {
                    type: "string",
                    enum: ["unreliable", "low", "moderate", "high"],
                    description: "Human-readable reliability label",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Confidence in the assessment",
                  },
                },
              },
              assessment: {
                type: "object",
                properties: {
                  reasoning: {
                    type: "array",
                    items: { type: "string" },
                    description: "Detailed reasoning steps",
                  },
                  evidence: {
                    type: "array",
                    items: { type: "string" },
                    description: "Supporting evidence for the assessment",
                  },
                  factorsAnalyzed: {
                    type: "object",
                    description: "Factors analyzed during assessment",
                  },
                },
              },
              processing: {
                type: "object",
                properties: {
                  totalTime: {
                    type: "integer",
                    description: "Total processing time in milliseconds",
                  },
                  providersUsed: {
                    type: "array",
                    items: { type: "string" },
                    description: "AI providers used in assessment",
                  },
                  madProcessed: {
                    type: "boolean",
                    description: "Whether Multi-Agent Debate was used",
                  },
                  gtvpProcessed: {
                    type: "boolean",
                    description: "Whether GTVP verification was used",
                  },
                  fallaciesDetected: {
                    type: "integer",
                    description: "Number of fallacies detected",
                  },
                },
              },
              quality: {
                type: "object",
                properties: {
                  auditTrail: {
                    type: "array",
                    items: { type: "string" },
                    description: "Complete audit trail of processing steps",
                  },
                  validationPassed: {
                    type: "boolean",
                    description: "Whether all validation checks passed",
                  },
                  warnings: {
                    type: "array",
                    items: { type: "string" },
                    description: "Any warnings generated during processing",
                  },
                },
              },
              jarvis: {
                $ref: "#/components/schemas/JarvisResponse",
              },
            },
          },
          meta: {
            type: "object",
            properties: {
              processingTime: {
                type: "integer",
                description: "API processing time in milliseconds",
              },
              cacheHit: {
                type: "boolean",
                description: "Whether result was served from cache",
              },
              apiVersion: {
                type: "string",
                description: "API version used",
              },
            },
          },
        },
      },

      JarvisResponse: {
        type: "object",
        description: "Jarvis ecosystem response metadata",
        properties: {
          requestId: {
            type: "string",
            description: "Request identifier",
          },
          componentId: {
            type: "string",
            description: "Responding component identifier",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp",
          },
          version: {
            type: "string",
            description: "Component version",
          },
        },
      },

      // GTVP schemas
      GTVPVerificationRequest: {
        type: "object",
        required: ["claim", "sourceUrl", "domain"],
        properties: {
          claim: {
            type: "string",
            minLength: 10,
            maxLength: 1000,
            description: "Claim to verify for ground truth",
          },
          sourceUrl: {
            type: "string",
            format: "uri",
            description: "Source URL containing the claim",
          },
          domain: {
            type: "string",
            enum: [
              "medical",
              "climate",
              "political",
              "economic",
              "technology",
              "legal",
              "academic",
              "general",
            ],
            description: "Domain for authority selection",
          },
          sourceId: {
            type: "string",
            description: "Optional source identifier",
          },
          options: {
            type: "object",
            properties: {
              minimumAuthorities: {
                type: "integer",
                minimum: 1,
                maximum: 10,
                default: 2,
              },
              confidenceThreshold: {
                type: "number",
                minimum: 0,
                maximum: 1,
                default: 0.7,
              },
              timeoutMs: {
                type: "integer",
                minimum: 1000,
                maximum: 30000,
                default: 10000,
              },
              enableExpertEscalation: {
                type: "boolean",
                default: false,
              },
            },
          },
          jarvisContext: {
            $ref: "#/components/schemas/JarvisContext",
          },
        },
      },

      Error: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            enum: [false],
          },
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "Error code",
              },
              message: {
                type: "string",
                description: "Human-readable error message",
              },
              details: {
                description: "Additional error details",
              },
              timestamp: {
                type: "string",
                format: "date-time",
              },
              requestId: {
                type: "string",
              },
            },
          },
        },
      },
    },
  },

  paths: {
    "/": {
      get: {
        tags: ["system"],
        summary: "API root endpoint",
        description: "Get basic API information and feature availability",
        responses: {
          "200": {
            description: "API information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    service: { type: "string" },
                    version: { type: "string" },
                    status: { type: "string" },
                    features: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/reliability/assess": {
      post: {
        tags: ["reliability"],
        summary: "Assess source reliability",
        description:
          "Evaluate the reliability of a source using AI-powered analysis with optional MAD framework and GTVP verification",
        security: [{ JarvisAuth: [] }, { JarvisToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ReliabilityAssessmentRequest",
              },
              examples: {
                basic: {
                  summary: "Basic assessment",
                  value: {
                    sourceUrl: "https://www.nature.com/articles/example",
                    jarvisContext: {
                      componentId: "jarvis-search",
                      requestId: "req-1234567890",
                    },
                  },
                },
                advanced: {
                  summary: "Advanced assessment with MAD and GTVP",
                  value: {
                    sourceUrl: "https://controversial-source.com/article",
                    sourceContent: "This article claims...",
                    priority: "high",
                    madOptions: {
                      forceMad: true,
                      useRAGVerification: true,
                      useFallacyDetection: true,
                      useSelfConsistency: true,
                    },
                    gtvpOptions: {
                      forceGTVP: true,
                      minimumAuthorities: 3,
                      confidenceThreshold: 0.8,
                    },
                    jarvisContext: {
                      componentId: "jarvis-chat",
                      requestId: "req-advanced-001",
                      userId: "user-123",
                      sessionId: "session-abc",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful reliability assessment",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ReliabilityAssessmentResponse",
                },
              },
            },
          },
          "400": {
            description: "Bad request - validation failed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "401": {
            description: "Unauthorized - authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Too many requests - rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },

    "/gtvp/verify": {
      post: {
        tags: ["gtvp"],
        summary: "Verify ground truth",
        description: "Verify ground truth using multi-authority verification protocol",
        security: [{ JarvisAuth: [] }, { JarvisToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GTVPVerificationRequest",
              },
              examples: {
                medical: {
                  summary: "Medical claim verification",
                  value: {
                    claim: "COVID-19 vaccines reduce severe disease hospitalization by 90%",
                    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/example",
                    domain: "medical",
                    jarvisContext: {
                      componentId: "jarvis-knowledge",
                      requestId: "gtvp-medical-001",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful ground truth verification",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        verification: {
                          type: "object",
                          properties: {
                            finalConfidence: { type: "number" },
                            groundTruth: { type: "string" },
                            verificationCount: { type: "integer" },
                            conflictCount: { type: "integer" },
                          },
                        },
                        authorities: {
                          type: "array",
                          items: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/health": {
      get: {
        tags: ["health"],
        summary: "Basic health check",
        description: "Get basic system health status",
        responses: {
          "200": {
            description: "System is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string" },
                        uptime: { type: "number" },
                        version: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/system/status": {
      get: {
        tags: ["system"],
        summary: "System status for Jarvis integration",
        description:
          "Get comprehensive system status including capabilities and integration points",
        responses: {
          "200": {
            description: "System status information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        service: { type: "string" },
                        version: { type: "string" },
                        capabilities: { type: "object" },
                        integrationPoints: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
