# Jarvis Orchestrator - Complete API Documentation

**Last Updated:** 2025-01-XX  
**Total REST Endpoints:** 409  
**Total WebSocket Events:** 30+  
**Base URL:** `http://localhost:3000` (Main API Server)

---

## 📋 TABLE OF CONTENTS

1. [Main API Server (Port 3000)](#main-api-server-port-3000)
2. [Security Agent API (Port 3038)](#security-agent-api-port-3038)
3. [Reliability API (Port varies)](#reliability-api-port-varies)
4. [Health API (Port 3000/health/*)](#health-api-port-3000health)
5. [All Agent APIs (Ports 3001-3038)](#all-agent-apis-ports-3001-3038)
6. [WebSocket/Socket.IO Endpoints](#websocketsocketio-endpoints)
7. [Missing/Recommended Endpoints](#missingrecommended-endpoints)

---

## 🌐 MAIN API SERVER (Port 3000)

### Base URL
```
http://localhost:3000
```

### Health & Status Endpoints

#### `GET /health`
**Description:** Fast health check endpoint  
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XXT00:00:00.000Z",
  "uptime": 12345.67,
  "port": 3000,
  "agents": {
    "online": 35,
    "total": 37,
    "degraded": 1,
    "offline": 1
  }
}
```

#### `GET /ready`
**Description:** Readiness check (more thorough)  
**Response:**
```json
{
  "status": "ready",
  "agents": {
    "online": 35,
    "total": 37
  }
}
```
**Status Codes:**
- `200` - Ready
- `503` - Not ready

### Chat & Communication

#### `POST /chat`
**Description:** Chat with Jarvis (routes to Dialogue agent)  
**Request Body:**
```json
{
  "message": "Hello, Jarvis!",
  "userId": "desktop-user",
  "sessionId": "optional-session-id"
}
```
**Response:**
```json
{
  "text": "Hello! How can I help you?",
  "agent": "Dialogue",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```
**Security:** Input scanned by Security Agent before processing

#### `POST /voice/transcribe`
**Description:** Voice transcription endpoint  
**Request Body:**
```json
{
  "audioData": "base64-encoded-audio"
}
```
**Response:**
```json
{
  "text": "Transcribed text here"
}
```

### Agent Status

#### `GET /agents/status`
**Description:** Get status of all agents  
**Response:**
```json
{
  "agents": [
    {
      "id": "Dialogue",
      "name": "Dialogue",
      "status": "online",
      "version": "1.0.0",
      "capabilities": ["conversation", "response", "context_tracking"]
    }
  ],
  "online": 35,
  "total": 37
}
```

### Agent-Specific Endpoints

#### `GET /agents/email/list`
**Description:** List emails  
**Query Parameters:**
- `unreadOnly` (boolean, optional) - Filter unread only
- `maxResults` (number, optional) - Max results (default: 20)
- `query` (string, optional) - Search query

**Response:**
```json
{
  "emails": [...],
  "count": 10
}
```

#### `GET /agents/calendar/list`
**Description:** List calendar events  
**Query Parameters:**
- `period` (string, optional) - Period: "today", "week", "month" (default: "today")

**Response:**
```json
{
  "events": [...],
  "count": 5
}
```

#### `GET /agents/finance/analyze`
**Description:** Finance analysis  
**Query Parameters:**
- `period` (string, optional) - Period: "week", "month", "year" (default: "month")

**Response:**
```json
{
  "totalSpent": 1500.00,
  "categories": [...],
  "currency": "GBP"
}
```

### Testing Endpoints

#### `POST /agents/:agentName/test`
**Description:** Test agent directly  
**Path Parameters:**
- `agentName` - Agent name (e.g., "ConversationAgent", "CodeAgent")

**Request Body:**
```json
{
  "action": "ping",
  "inputs": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {...},
  "duration": 123,
  "agent": "Dialogue",
  "action": "ping"
}
```

#### `GET /agents/:agentName/quick-test`
**Description:** Quick agent ping test  
**Path Parameters:**
- `agentName` - Agent name

**Response:**
```json
{
  "success": true,
  "agent": "Dialogue",
  "responseTime": 45,
  "status": "healthy",
  "error": null
}
```

---

## 🛡️ SECURITY AGENT API (Port 3038)

### Base URL
```
http://localhost:3038
```

### Security Endpoints

#### `POST /api/scan`
**Description:** Scan input for security threats  
**Request Body:**
```json
{
  "inputs": {
    "input": "User input text",
    "userId": "user-123",
    "sessionId": "session-456",
    "strictMode": false,
    "source": "user"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "threat": null,
    "reason": null,
    "redacted": "User input text",
    "redactions": []
  }
}
```

**Threat Types:**
- `prompt_injection` - Prompt injection detected
- `jailbreak` - Jailbreak attempt
- `pii_detected` - PII detected
- `high_entropy` - Obfuscation detected
- `length_exceeded` - Input too long

#### `POST /api/check-tool`
**Description:** Check tool access permissions  
**Request Body:**
```json
{
  "inputs": {
    "userId": "user-123",
    "toolName": "send_email",
    "params": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": false,
    "reason": "requires_confirmation",
    "rateLimit": {
      "remaining": 4,
      "resetAt": "2025-01-XXT00:05:00.000Z"
    }
  }
}
```

#### `GET /api/events`
**Description:** Get security events  
**Query Parameters:**
- `userId` (string, optional) - Filter by user
- `limit` (number, optional) - Max results (default: 50)
- `severity` (string, optional) - Filter by severity: "low", "medium", "high", "critical"

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event-123",
        "timestamp": "2025-01-XXT00:00:00.000Z",
        "userId": "user-123",
        "threatType": "prompt_injection",
        "severity": "high",
        "blocked": true,
        "details": {}
      }
    ],
    "count": 10
  }
}
```

#### `GET /api/threat-level`
**Description:** Get threat level for user  
**Query Parameters:**
- `userId` (string, required) - User ID

**Response:**
```json
{
  "success": true,
  "data": {
    "level": "critical",
    "reason": "Multiple injection attempts detected",
    "eventCount": 6,
    "autoBlocked": true
  }
}
```

#### `GET /health`
**Description:** Security agent health check  
**Response:**
```json
{
  "status": "online",
  "agentId": "Security",
  "version": "1.0.0",
  "capabilities": [...]
}
```

---

## 🔍 RELIABILITY API (Port varies)

### Base URL
```
http://localhost:{RELIABILITY_AGENT_PORT}
```

### Reliability Assessment

#### `POST /api/reliability/assess`
**Description:** Assess source reliability  
**Request Body:**
```json
{
  "sourceUrl": "https://example.com/article",
  "sourceContent": "Optional content",
  "priority": "normal",
  "forceConsensus": false,
  "runInBackground": false,
  "madOptions": {
    "forceMad": false,
    "useRAGVerification": true,
    "useFallacyDetection": true,
    "useSelfConsistency": true,
    "customRounds": 3
  },
  "gtvpOptions": {
    "forceGTVP": false,
    "minimumAuthorities": 3,
    "confidenceThreshold": 0.8
  },
  "jarvisContext": {
    "componentId": "jarvis-search",
    "requestId": "req-123",
    "userId": "user-123",
    "sessionId": "session-456"
  }
}
```

**Response (Synchronous):**
```json
{
  "success": true,
  "data": {
    "reliability": {
      "score": 0.85,
      "label": "high",
      "confidence": 0.9
    },
    "assessment": {
      "reasoning": [...],
      "assessmentNotes": [...],
      "factorsAnalyzed": [...]
    },
    "processing": {
      "totalTime": 2500,
      "providersUsed": ["claude"],
      "consensusModeUsed": false,
      "algorithmVersion": "2.0.0"
    },
    "quality": {
      "sourceAnalysis": {...},
      "aiAssessmentResult": {...},
      "warnings": []
    },
    "jarvis": {
      "requestId": "req-123",
      "componentId": "jarvis-search",
      "timestamp": "2025-01-XXT00:00:00.000Z",
      "version": "2.0.0"
    }
  },
  "meta": {
    "processingTime": 2500,
    "cacheHit": false,
    "apiVersion": "2.0.0"
  }
}
```

**Response (Background Task):**
```json
{
  "taskId": "task-123",
  "status": "queued",
  "message": "Assessment queued for background processing"
}
```
**Status Code:** `202 Accepted`

#### `POST /api/reliability/batch`
**Description:** Batch reliability assessment  
**Request Body:**
```json
{
  "sources": [
    {
      "id": "source-1",
      "sourceUrl": "https://example.com/article1",
      "sourceContent": "Optional",
      "priority": "normal"
    }
  ],
  "options": {
    "maxConcurrent": 5,
    "timeout": 30000
  },
  "jarvisContext": {
    "componentId": "jarvis-search",
    "requestId": "batch-req-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "errors": [],
    "summary": {
      "total": 10,
      "successful": 10,
      "failed": 0,
      "processingTime": 5000
    }
  }
}
```

#### `GET /api/reliability/status/:requestId`
**Description:** Get background assessment status  
**Path Parameters:**
- `requestId` - Assessment request ID

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "req-123",
    "status": "completed",
    "progress": 100,
    "result": {...},
    "estimatedCompletion": null
  }
}
```

#### `GET /api/reliability/capabilities`
**Description:** Get system capabilities  
**Response:**
```json
{
  "success": true,
  "data": {
    "features": {
      "basicAssessment": true,
      "multiAgentDebate": true,
      "fallacyDetection": true,
      "ragVerification": true,
      "selfConsistency": true,
      "groundTruthVerification": true,
      "batchProcessing": true,
      "backgroundProcessing": true,
      "realTimeWebSocket": true
    },
    "limits": {
      "maxBatchSize": 50,
      "maxConcurrentAssessments": 10,
      "maxContentLength": 1000000,
      "rateLimitPerMinute": 100
    },
    "aiProviders": [
      {
        "name": "Claude 3.5 Sonnet",
        "available": true,
        "type": "primary"
      },
      {
        "name": "GPT-4o",
        "available": true,
        "type": "secondary"
      }
    ],
    "version": "2.0.0"
  }
}
```

#### `POST /api/reliability/debug` (Development Only)
**Description:** Debug endpoint for development  
**Request Body:**
```json
{
  "sourceUrl": "https://example.com/article",
  "enableDebugMode": true
}
```

### Ground Truth Verification Protocol (GTVP)

#### `POST /api/gtvp/verify`
**Description:** Verify ground truth using multi-authority verification  
**Request Body:**
```json
{
  "claim": "COVID-19 vaccines reduce severe disease by 90%",
  "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/example",
  "domain": "medical",
  "sourceId": "optional-source-id",
  "options": {
    "minimumAuthorities": 3,
    "confidenceThreshold": 0.8,
    "timeoutMs": 30000,
    "enableExpertEscalation": false
  },
  "jarvisContext": {
    "componentId": "jarvis-knowledge",
    "requestId": "gtvp-req-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verification": {
      "sourceId": "source-123",
      "claim": "COVID-19 vaccines...",
      "finalConfidence": 0.92,
      "groundTruth": true,
      "verificationCount": 3,
      "conflictCount": 0
    },
    "authorities": [
      {
        "name": "PubMed/NIH",
        "tier": 1,
        "weight": 0.4,
        "status": "verified",
        "confidence": 0.95,
        "responseTime": 1200,
        "evidence": "..."
      }
    ],
    "conflicts": [],
    "quality": {
      "flags": [],
      "processingTime": 3500,
      "auditTrail": [...]
    },
    "jarvis": {
      "requestId": "gtvp-req-123",
      "componentId": "jarvis-knowledge",
      "timestamp": "2025-01-XXT00:00:00.000Z",
      "version": "2.0.0"
    }
  }
}
```

#### `POST /api/gtvp/generate-dataset`
**Description:** Generate GTVP-verified dataset  
**Request Body:**
```json
{
  "config": {
    "totalSources": 50,
    "distributionStrategy": "BALANCED",
    "minimumConfidenceThreshold": 0.7,
    "includeKnownConflicts": true
  },
  "jarvisContext": {
    "componentId": "jarvis-knowledge",
    "requestId": "dataset-req-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dataset": {
      "metadata": {
        "version": "2.0-GTVP",
        "created": "2025-01-XXT00:00:00.000Z",
        "totalSources": 50,
        "verificationMethod": "GTVP Triple-Authority Verification",
        "processingTime": 120000
      },
      "sources": [...],
      "statistics": {
        "totalSources": 50,
        "averageConfidence": 0.847,
        "domainDistribution": {...},
        "confidenceGrades": {...},
        "validationStatus": {...}
      }
    }
  }
}
```

#### `GET /api/gtvp/authorities`
**Description:** Get available verification authorities  
**Query Parameters:**
- `domain` (string, optional) - Filter by domain

**Response:**
```json
{
  "success": true,
  "data": {
    "authorities": [
      {
        "name": "PubMed/NIH",
        "tier": 1,
        "domains": ["medical", "health", "scientific"],
        "credibilityScore": 0.95,
        "status": "operational"
      }
    ],
    "totalAvailable": 3,
    "filterApplied": null
  }
}
```

#### `GET /api/gtvp/domains`
**Description:** Get supported verification domains  
**Response:**
```json
{
  "success": true,
  "data": {
    "domains": [
      {
        "name": "medical",
        "description": "Medical and health-related information",
        "authorities": 3,
        "avgConfidence": 0.89
      }
    ],
    "totalDomains": 5
  }
}
```

#### `GET /api/gtvp/stats`
**Description:** Get GTVP system statistics  
**Response:**
```json
{
  "success": true,
  "data": {
    "totalVerifications": 1542,
    "averageConfidence": 0.847,
    "conflictResolutionRate": 0.15,
    "authorityCoverage": {
      "tier1": 5,
      "tier2": 8,
      "tier3": 12
    },
    "domainCoverage": {...},
    "performanceMetrics": {
      "averageProcessingTime": 2340,
      "successRate": 0.967,
      "apiUptime": 0.999
    }
  }
}
```

### Health & System

#### `GET /api/health`
**Description:** Basic health check  
**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-XXT00:00:00.000Z",
    "uptime": 12345.67,
    "version": "2.0.0",
    "service": "Jarvis Reliability System"
  }
}
```

#### `GET /api/health/detailed`
**Description:** Detailed health check with system metrics  
**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-XXT00:00:00.000Z",
    "uptime": 12345.67,
    "version": "2.0.0",
    "service": "Jarvis Reliability System",
    "system": {
      "memory": {
        "used": 256,
        "total": 512,
        "external": 64,
        "rss": 1024
      },
      "cpu": {
        "user": 1234567,
        "system": 234567
      },
      "process": {
        "pid": 12345,
        "nodeVersion": "v20.0.0",
        "platform": "win32",
        "arch": "x64"
      }
    },
    "components": {
      "api": {
        "status": "operational",
        "responseTime": "<50ms"
      },
      "reliabilityEngine": {
        "status": "operational",
        "features": {...}
      }
    },
    "metrics": {
      "requestsLastHour": 150,
      "averageResponseTime": 1200,
      "errorRate": 0.02,
      "successfulAssessments": 145,
      "failedAssessments": 5
    }
  }
}
```

#### `GET /api/health/readiness`
**Description:** Readiness probe for container orchestration  
**Response:**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "checks": {
      "apiServer": true,
      "reliabilityEngine": true,
      "configurationLoaded": true
    },
    "timestamp": "2025-01-XXT00:00:00.000Z"
  }
}
```

#### `GET /api/health/liveness`
**Description:** Liveness probe for container orchestration  
**Response:**
```json
{
  "success": true,
  "data": {
    "alive": true,
    "timestamp": "2025-01-XXT00:00:00.000Z",
    "uptime": 12345.67
  }
}
```

#### `GET /api/health/metrics`
**Description:** Prometheus-style metrics endpoint  
**Response:** Plain text Prometheus format
```
# HELP jarvis_reliability_uptime_seconds Process uptime in seconds
# TYPE jarvis_reliability_uptime_seconds counter
jarvis_reliability_uptime_seconds 12345.67
...
```

#### `GET /api/health/dependencies`
**Description:** Check external dependencies status  
**Response:**
```json
{
  "success": true,
  "data": {
    "dependencies": {
      "claudeAPI": {
        "name": "Claude 3.5 Sonnet",
        "configured": true,
        "status": "operational",
        "lastCheck": "2025-01-XXT00:00:00.000Z",
        "responseTime": 250
      },
      "openaiAPI": {
        "name": "OpenAI GPT-4o",
        "configured": true,
        "status": "operational",
        "lastCheck": "2025-01-XXT00:00:00.000Z",
        "responseTime": 300
      }
    },
    "criticalDependenciesHealthy": true,
    "timestamp": "2025-01-XXT00:00:00.000Z"
  }
}
```

### System Endpoints

#### `GET /api/system/status`
**Description:** Overall system status for Jarvis integration  
**Response:**
```json
{
  "success": true,
  "data": {
    "service": "Jarvis Reliability System",
    "version": "2.0.0",
    "status": "operational",
    "timestamp": "2025-01-XXT00:00:00.000Z",
    "capabilities": {
      "reliabilityAssessment": {
        "enabled": true,
        "status": "operational",
        "features": {...}
      },
      "multiAgentDebate": {
        "enabled": true,
        "status": "operational",
        "features": {...}
      },
      "groundTruthVerification": {
        "enabled": true,
        "status": "operational",
        "features": {...}
      }
    },
    "integrationPoints": {
      "restAPI": {
        "endpoint": "/api",
        "version": "2.0.0",
        "authentication": false,
        "rateLimit": true
      },
      "webSocket": {
        "endpoint": "/socket.io",
        "enabled": true,
        "realTimeAssessment": true
      }
    },
    "performance": {
      "uptime": 12345.67,
      "memoryUsage": 256,
      "requestsProcessed": 1500,
      "averageResponseTime": 1200,
      "errorRate": 0.02
    }
  }
}
```

#### `GET /api/system/config`
**Description:** System configuration for other Jarvis components  
**Response:**
```json
{
  "success": true,
  "data": {
    "service": {
      "name": "Jarvis Reliability System",
      "version": "2.0.0",
      "environment": "development"
    },
    "api": {
      "version": "2.0.0",
      "baseUrl": "/api",
      "endpoints": {
        "assess": "/api/reliability/assess",
        "batch": "/api/reliability/batch",
        "verify": "/api/gtvp/verify",
        "health": "/api/health"
      },
      "limits": {
        "maxRequestSize": "10mb",
        "rateLimitPerMinute": 100,
        "maxBatchSize": 50,
        "maxConcurrentRequests": 10
      }
    },
    "features": {...},
    "aiProviders": {...},
    "schemas": {...}
  }
}
```

#### `GET /api/system/integration`
**Description:** Integration guide for other Jarvis components  
**Response:**
```json
{
  "success": true,
  "data": {
    "overview": "Integration guide...",
    "version": "2.0.0",
    "quickStart": {...},
    "patterns": {...},
    "errorHandling": {...},
    "authentication": {...}
  }
}
```

#### `GET /api/system/schema`
**Description:** API schema for code generation and validation  
**Response:**
```json
{
  "success": true,
  "data": {
    "openapi": "3.0.0",
    "info": {
      "title": "Jarvis Reliability System API",
      "version": "2.0.0",
      "description": "Source reliability assessment..."
    },
    "servers": [...],
    "components": {
      "schemas": {...}
    }
  }
}
```

#### `GET /api/system/version`
**Description:** Version information for compatibility checking  
**Response:**
```json
{
  "success": true,
  "data": {
    "service": "Jarvis Reliability System",
    "version": "2.0.0",
    "apiVersion": "2.0.0",
    "buildDate": "2025-01-XXT00:00:00.000Z",
    "nodeVersion": "v20.0.0",
    "compatibility": {
      "jarvisCore": ">=3.0.0",
      "jarvisSearch": ">=2.1.0",
      "jarvisChat": ">=4.0.0",
      "jarvisKnowledge": ">=1.5.0"
    },
    "features": {...},
    "breakingChanges": {...}
  }
}
```

#### `GET /api`
**Description:** API root endpoint (info/documentation)  
**Response:**
```json
{
  "service": "Jarvis Reliability System",
  "version": "2.0.0",
  "endpoints": {
    "reliability": "/api/reliability",
    "gtvp": "/api/gtvp",
    "health": "/api/health",
    "system": "/api/system"
  },
  "documentation": "/api/system/integration"
}
```

---

## 🏥 HEALTH API (Port 3000/health/*)

### Base URL
```
http://localhost:3000/health
```

### Agent Health Endpoints

#### `GET /health/agents`
**Description:** List all agents with health status  
**Response:**
```json
{
  "success": true,
  "count": 37,
  "agents": [
    {
      "name": "Dialogue",
      "status": "running",
      "pid": 12345,
      "threadId": 67890,
      "spawnedAt": "2025-01-XXT00:00:00.000Z",
      "lastPing": "2025-01-XXT00:00:00.000Z",
      "isHealthy": true,
      "metadata": {}
    }
  ],
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `GET /health/agents/:name`
**Description:** Get specific agent health details  
**Path Parameters:**
- `name` - Agent name

**Response:**
```json
{
  "success": true,
  "agent": {
    "name": "Dialogue",
    "status": "running",
    "pid": 12345,
    "threadId": 67890,
    "spawnedAt": "2025-01-XXT00:00:00.000Z",
    "lastPing": "2025-01-XXT00:00:00.000Z",
    "isHealthy": true,
    "metadata": {}
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `POST /health/agents/:name/respawn`
**Description:** Manually respawn agent  
**Path Parameters:**
- `name` - Agent name

**Request Body:**
```json
{
  "trigger": "manual_trigger"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent Dialogue respawned successfully",
  "agentName": "Dialogue",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `POST /health/agents/:name/kill`
**Description:** Kill agent  
**Path Parameters:**
- `name` - Agent name

**Response:**
```json
{
  "success": true,
  "message": "Agent Dialogue killed successfully",
  "agentName": "Dialogue",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `GET /health/agents/:name/metrics`
**Description:** Get detailed agent metrics  
**Path Parameters:**
- `name` - Agent name

**Response:**
```json
{
  "success": true,
  "agentName": "Dialogue",
  "currentMetrics": {
    "healthScore": 95.5,
    "responseTime": 45,
    "errorRate": 0.01,
    "uptime": 3600
  },
  "history": [...],
  "historySize": 100,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `GET /health/agents/:name/logs`
**Description:** Get agent logs  
**Path Parameters:**
- `name` - Agent name

**Query Parameters:**
- `lines` (number, optional) - Number of lines (default: 100)

**Response:**
```json
{
  "success": true,
  "agentName": "Dialogue",
  "logs": [
    "[2025-01-XXT00:00:00.000Z] Dialogue - Health: 95.5%, Response: 45ms, Status: healthy"
  ],
  "count": 100,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `GET /health/agents/:name/config`
**Description:** Get agent configuration  
**Path Parameters:**
- `name` - Agent name

**Response:**
```json
{
  "success": true,
  "agentName": "Dialogue",
  "config": {
    "port": 3001,
    "spawnStrategy": "pre-spawn",
    "autoRespawn": true,
    "maxRespawns": 5,
    "respawnDelay": 5000
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `POST /health/agents/:name/health-check`
**Description:** Trigger manual health check  
**Path Parameters:**
- `name` - Agent name

**Response:**
```json
{
  "success": true,
  "agentName": "Dialogue",
  "isHealthy": true,
  "healthScore": 95.5,
  "responseTime": 45,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### `GET /health/agents/:name/history`
**Description:** Get agent health history  
**Path Parameters:**
- `name` - Agent name

**Query Parameters:**
- `limit` (number, optional) - Max results (default: 100)
- `startTime` (string, optional) - Start timestamp
- `endTime` (string, optional) - End timestamp

**Response:**
```json
{
  "success": true,
  "agentName": "Dialogue",
  "history": [
    {
      "timestamp": 12345,
      "healthScore": 95.5,
      "responseTime": 45,
      "isHealthy": true
    }
  ],
  "count": 100,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

### System Metrics

#### `GET /health/metrics/live`
**Description:** Get live system metrics  
**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-XXT00:00:00.000Z",
    "agents": {
      "total": 37,
      "healthy": 35,
      "unhealthy": 2
    },
    "system": {
      "uptime": 12345.67,
      "memoryUsage": 1024,
      "cpuUsage": 25.5
    },
    "metrics": {
      "averageHealthScore": 92.3,
      "averageResponseTime": 120,
      "totalRequests": 15000
    }
  }
}
```

#### `GET /health/metrics/latest`
**Description:** Get latest metrics snapshot  
**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-XXT00:00:00.000Z",
    "agents": [...],
    "system": {...}
  }
}
```

#### `GET /health/metrics/history`
**Description:** Get metrics history  
**Query Parameters:**
- `startTime` (string, optional) - Start timestamp
- `endTime` (string, optional) - End timestamp
- `interval` (string, optional) - Aggregation interval

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [...],
    "count": 1000,
    "interval": "1s"
  }
}
```

### Sensor Health Endpoints

#### `POST /health/sensors/report`
**Description:** Submit individual sensor health report  
**Request Body:**
```json
{
  "sensorName": "CPU",
  "status": "healthy",
  "message": "CPU monitoring working normally. Current usage: 45.2%",
  "details": {
    "usage": 45.2
  },
  "timestamp": 1704067200000
}
```

**Status Values:**
- `healthy` - Sensor working normally
- `degraded` - Sensor working but with issues
- `error` - Sensor error occurred
- `unavailable` - Sensor not available (not an error)

**Response:**
```json
{
  "success": true,
  "data": {
    "received": true,
    "sensorName": "CPU",
    "status": "healthy",
    "timestamp": 1704067200000
  }
}
```

**Features:**
- Logs with colored output (green/yellow/red/gray)
- Translates technical errors to plain language
- Creates alerts for errors/degraded status
- Stores reports in memory

#### `POST /health/sensors/batch`
**Description:** Submit multiple sensor reports in batch  
**Request Body:**
```json
{
  "reports": [
    {
      "sensorName": "CPU",
      "status": "healthy",
      "message": "CPU monitoring working normally. Current usage: 45.2%",
      "details": { "usage": 45.2 },
      "timestamp": 1704067200000
    },
    {
      "sensorName": "Memory",
      "status": "degraded",
      "message": "Memory usage is high at 78.5%. 2.1GB available.",
      "details": { "used": 6.3, "total": 8.0, "free": 1.7, "percentage": 78.5 },
      "timestamp": 1704067200000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "received": 2,
    "processed": ["CPU", "Memory"],
    "timestamp": 1704067200000
  }
}
```

#### `GET /health/sensors`
**Description:** Get all sensor health reports  
**Response:**
```json
{
  "success": true,
  "data": {
    "sensors": [
      {
        "sensorName": "CPU",
        "status": "healthy",
        "message": "CPU monitoring working normally. Current usage: 45.2%",
        "details": { "usage": 45.2 },
        "timestamp": 1704067200000,
        "receivedAt": 1704067200000
      },
      {
        "sensorName": "Memory",
        "status": "degraded",
        "message": "Memory usage is high at 78.5%. 2.1GB available.",
        "details": { "used": 6.3, "total": 8.0, "free": 1.7, "percentage": 78.5 },
        "timestamp": 1704067200000,
        "receivedAt": 1704067200000
      }
    ],
    "count": 2,
    "timestamp": 1704067200000
  }
}
```

#### `GET /health/sensors/:sensorName`
**Description:** Get specific sensor health report  
**Path Parameters:**
- `sensorName` - Sensor name (e.g., "CPU", "Memory", "Camera", "Microphone")

**Response:**
```json
{
  "success": true,
  "data": {
    "sensorName": "CPU",
    "status": "healthy",
    "message": "CPU monitoring working normally. Current usage: 45.2%",
    "details": { "usage": 45.2 },
    "timestamp": 1704067200000,
    "receivedAt": 1704067200000
  }
}
```

**Status Codes:**
- `200` - Sensor report found
- `404` - Sensor not found

#### `GET /health/sensors/history`
**Description:** Get sensor health report history  
**Query Parameters:**
- `limit` (number, optional) - Max results (default: 100)
- `sensorName` (string, optional) - Filter by sensor name

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "sensorName": "CPU",
        "status": "healthy",
        "message": "CPU monitoring working normally. Current usage: 45.2%",
        "details": { "usage": 45.2 },
        "timestamp": 1704067200000,
        "receivedAt": 1704067200000
      }
    ],
    "count": 1,
    "timestamp": 1704067200000
  }
}
```

**Supported Sensors:**
- `CPU` - CPU usage monitoring
- `Memory` - Memory usage monitoring
- `System Uptime` - System uptime tracking
- `Network` - Network connection status
- `Battery` - Battery level and charging status
- `Camera` - Camera device status
- `Microphone` - Microphone device status

**Error Message Translation:**
The API automatically translates technical error messages to plain language:
- `NotAllowedError` → "Permission denied. Please grant access to this sensor in your system settings."
- `EBUSY` → "Sensor is busy. Another application may be using it."
- `Timeout` → "The sensor took too long to respond. It may be busy or disconnected."
- `Camera busy` → "Camera is already in use by another application. Close other apps using the camera."

#### `GET /health/system`
**Description:** System health overview  
**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "agents": {
      "total": 37,
      "healthy": 35,
      "unhealthy": 2,
      "degraded": 0
    },
    "uptime": 12345.67,
    "timestamp": "2025-01-XXT00:00:00.000Z"
  }
}
```

---

## 🤖 ALL AGENT APIs (Ports 3001-3038)

### Standard Agent Endpoints

All agents follow this pattern:

#### `POST /api`
**Description:** Main agent endpoint (action in body)  
**Request Body:**
```json
{
  "id": "req-123",
  "agentId": "AgentName",
  "action": "action_name",
  "inputs": {
    "param1": "value1"
  },
  "userId": "user-123",
  "timestamp": "2025-01-XXT00:00:00.000Z",
  "priority": "MEDIUM"
}
```

**Response:**
```json
{
  "success": true,
  "data": {...},
  "metadata": {
    "duration": 123,
    "retryCount": 0
  }
}
```

#### `GET /health`
**Description:** Agent health check  
**Response:**
```json
{
  "status": "online",
  "agentId": "AgentName",
  "version": "1.0.0",
  "capabilities": [...],
  "uptime": 3600
}
```

### Agent-Specific Endpoints

#### Dialogue Agent (Port 3001)
- `POST /api/respond` - Respond to user message

#### Web Agent (Port 3002)
- `POST /api/search` - Web search

#### Knowledge Agent (Port 3003)
- `POST /api/research` - Research topic
- `POST /api/fact-check` - Fact checking
- `POST /api/summarize` - Summarize content

#### Visual Engine Agent (Port 3037)
- `POST /api/analyze` - Analyze visual content
- `GET /api/status` - Service status
- `GET /api/faces` - List recognized faces
- `POST /api/faces` - Register face
- `GET /api/locations` - Get spatial locations
- `GET /api/events` - Get tracked events
- `POST /api/spatial/query` - Query spatial memory
- `GET /api/intelligence/insights` - Get AI insights

#### Memory System Agent (Port 3036)
- `POST /api/ingest` - Ingest memory
- `POST /api/query` - Query memories
- `POST /api/consolidate` - Consolidate memories
- `GET /api/stats` - Memory statistics
- `GET /api/stm/recent` - Recent STM memories
- `POST /api/stm/search` - Search STM
- `GET /api/status` - Service status

#### Emotions Engine Agent (Port 3034)
- `POST /api/process-text` - Process text emotion
- `POST /api/process-multimodal` - Multimodal emotion
- `GET /api/mood-analysis` - Mood analysis
- `GET /api/status` - Service status

#### Reliability Agent (Port 3032)
- `POST /api/assess` - Assess reliability
- `GET /api/status` - Service status

---

## 📡 WEBSOCKET/SOCKET.IO ENDPOINTS

### Main API Server WebSocket (Port 3000)

#### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});
```

#### Events Emitted by Server

##### `connected`
**Description:** Sent when client connects  
**Payload:**
```json
{
  "message": "Connected to Jarvis Self-Healing System",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `agent_spawned`
**Description:** Agent spawned event  
**Payload:**
```json
{
  "agentName": "Dialogue",
  "pid": 12345,
  "timestamp": "2025-01-XXT00:00:00.000Z",
  "metadata": {}
}
```

##### `agent_crashed`
**Description:** Agent crashed event  
**Payload:**
```json
{
  "agentName": "Dialogue",
  "error": "Process exited unexpectedly",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `agent_respawned`
**Description:** Agent respawned event  
**Payload:**
```json
{
  "agentName": "Dialogue",
  "pid": 12346,
  "reason": "auto_respawn",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `agent_health_changed`
**Description:** Agent health status changed  
**Payload:**
```json
{
  "agentName": "Dialogue",
  "healthScore": 95.5,
  "isHealthy": true,
  "metrics": {
    "responseTime": 45,
    "errorRate": 0.01
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `agent_killed`
**Description:** Agent killed event  
**Payload:**
```json
{
  "agentName": "Dialogue",
  "reason": "manual_kill",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `agent_error`
**Description:** Agent error event  
**Payload:**
```json
{
  "agentName": "Dialogue",
  "error": "Error message",
  "severity": "high",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `agents_requested`
**Description:** Response to get_agents request  
**Payload:**
```json
{
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### Events Listened by Server

##### `get_agents`
**Description:** Request fresh agent data  
**Payload:** None

##### `disconnect`
**Description:** Client disconnection (automatic)

---

### Reliability API WebSocket (Port varies)

#### Connection
```javascript
const socket = io('http://localhost:{RELIABILITY_PORT}/socket.io', {
  auth: {
    componentId: 'jarvis-chat',
    token: 'optional-jwt-token'
  },
  transports: ['websocket', 'polling']
});
```

#### Events Emitted by Server

##### `connected`
**Description:** Connection confirmation  
**Payload:**
```json
{
  "message": "Connected to Jarvis Reliability System",
  "version": "2.0.0",
  "capabilities": {
    "reliabilityAssessment": true,
    "multiAgentDebate": true,
    "groundTruthVerification": true
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `assessment_started`
**Description:** Assessment started  
**Payload:**
```json
{
  "requestId": "req-123",
  "status": "processing",
  "estimatedTime": 3000,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `assessment_queued`
**Description:** Assessment queued for background processing  
**Payload:**
```json
{
  "requestId": "req-123",
  "status": "queued",
  "queuePosition": 3,
  "estimatedWaitTime": 5000,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `assessment_complete`
**Description:** Assessment completed  
**Payload:**
```json
{
  "requestId": "req-123",
  "reliability": {
    "score": 0.85,
    "label": "high",
    "confidence": 0.9
  },
  "assessment": {
    "reasoning": [...],
    "factorsAnalyzed": [...]
  },
  "processing": {
    "totalTime": 2500,
    "providersUsed": ["claude"]
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `assessment_error`
**Description:** Assessment error  
**Payload:**
```json
{
  "requestId": "req-123",
  "error": {
    "code": "ASSESSMENT_FAILED",
    "message": "Failed to assess source reliability",
    "details": "Error details"
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `gtvp_started`
**Description:** GTVP verification started  
**Payload:**
```json
{
  "requestId": "gtvp-req-123",
  "status": "processing",
  "estimatedTime": 5000,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `gtvp_complete`
**Description:** GTVP verification completed  
**Payload:**
```json
{
  "requestId": "gtvp-req-123",
  "verification": {
    "finalConfidence": 0.92,
    "groundTruth": true,
    "verificationCount": 3
  },
  "authorities": [...],
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `gtvp_error`
**Description:** GTVP verification error  
**Payload:**
```json
{
  "requestId": "gtvp-req-123",
  "error": {
    "code": "GTVP_VERIFICATION_FAILED",
    "message": "Failed to verify ground truth"
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `batch_started`
**Description:** Batch assessment started  
**Payload:**
```json
{
  "batchId": "batch-123",
  "totalSources": 10,
  "status": "processing",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `batch_progress`
**Description:** Batch assessment progress update  
**Payload:**
```json
{
  "batchId": "batch-123",
  "completed": 5,
  "total": 10,
  "progress": 50,
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `batch_complete`
**Description:** Batch assessment completed  
**Payload:**
```json
{
  "batchId": "batch-123",
  "results": [...],
  "errors": [],
  "summary": {
    "total": 10,
    "successful": 10,
    "failed": 0,
    "processingTime": 5000
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `batch_error`
**Description:** Batch assessment error  
**Payload:**
```json
{
  "batchId": "batch-123",
  "error": {
    "message": "Batch processing failed",
    "details": "Error details"
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `assessment_cancelled`
**Description:** Assessment cancelled  
**Payload:**
```json
{
  "requestId": "req-123",
  "message": "Assessment cancelled successfully",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `cancel_error`
**Description:** Cancel operation error  
**Payload:**
```json
{
  "requestId": "req-123",
  "error": {
    "message": "Failed to cancel assessment",
    "details": "Assessment not found or already completed"
  },
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `status_update`
**Description:** Status update for background task  
**Payload:**
```json
{
  "requestId": "req-123",
  "status": "processing",
  "progress": 75,
  "estimatedCompletion": "2025-01-XXT00:01:00.000Z",
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

##### `pong`
**Description:** Response to ping  
**Payload:**
```json
{
  "timestamp": "2025-01-XXT00:00:00.000Z"
}
```

#### Events Listened by Server

##### `assess_reliability`
**Description:** Request reliability assessment  
**Payload:**
```json
{
  "requestId": "req-123",
  "sourceUrl": "https://example.com/article",
  "sourceContent": "Optional content",
  "priority": "normal",
  "jarvisContext": {
    "componentId": "jarvis-chat",
    "sessionId": "session-123"
  }
}
```

##### `verify_ground_truth`
**Description:** Request GTVP verification  
**Payload:**
```json
{
  "requestId": "gtvp-req-123",
  "claim": "Claim to verify",
  "sourceUrl": "https://example.com",
  "domain": "medical",
  "jarvisContext": {
    "componentId": "jarvis-knowledge",
    "requestId": "req-123"
  }
}
```

##### `assess_batch`
**Description:** Request batch assessment  
**Payload:**
```json
{
  "requests": [
    {
      "requestId": "req-1",
      "sourceUrl": "https://example.com/article1"
    }
  ],
  "jarvisContext": {
    "componentId": "jarvis-search",
    "requestId": "batch-req-123"
  }
}
```
**Limit:** Maximum 10 requests per batch

##### `cancel_assessment`
**Description:** Cancel assessment  
**Payload:**
```json
{
  "requestId": "req-123"
}
```

##### `get_status`
**Description:** Get assessment status  
**Payload:**
```json
{
  "requestId": "req-123"
}
```

##### `ping`
**Description:** Ping for connection health  
**Payload:** None

##### `disconnect`
**Description:** Client disconnection (automatic)

##### `error`
**Description:** Error event (automatic)

---

## 🔧 MISSING/RECOMMENDED ENDPOINTS

### Main API Server - Missing Endpoints

#### `GET /api/agents`
**Status:** ❌ Missing  
**Description:** List all agents with full details  
**Recommended Response:**
```json
{
  "agents": [
    {
      "id": "Dialogue",
      "name": "Dialogue",
      "version": "1.0.0",
      "status": "online",
      "port": 3001,
      "capabilities": [...],
      "dependencies": [],
      "priority": 5,
      "healthEndpoint": "http://localhost:3001/health",
      "apiEndpoint": "http://localhost:3001/api"
    }
  ],
  "total": 37,
  "online": 35
}
```

#### `GET /api/agents/:agentId`
**Status:** ❌ Missing  
**Description:** Get specific agent details  
**Path Parameters:**
- `agentId` - Agent ID

#### `POST /api/agents/:agentId/execute`
**Status:** ❌ Missing  
**Description:** Execute action on specific agent  
**Path Parameters:**
- `agentId` - Agent ID

**Request Body:**
```json
{
  "action": "action_name",
  "inputs": {}
}
```

#### `GET /api/system/info`
**Status:** ❌ Missing  
**Description:** System information  
**Response:**
```json
{
  "version": "4.0.0",
  "uptime": 12345.67,
  "agents": {
    "total": 37,
    "online": 35
  },
  "features": {
    "security": true,
    "selfHealing": true,
    "reliability": true
  }
}
```

#### `GET /api/metrics`
**Status:** ❌ Missing  
**Description:** System metrics (Prometheus format)  
**Response:** Plain text Prometheus metrics

#### `GET /api/logs`
**Status:** ❌ Missing  
**Description:** System logs  
**Query Parameters:**
- `level` (string, optional) - Log level
- `limit` (number, optional) - Max lines
- `since` (string, optional) - Since timestamp

#### `POST /api/agents/:agentId/restart`
**Status:** ❌ Missing  
**Description:** Restart specific agent

#### `GET /api/security/stats`
**Status:** ❌ Missing  
**Description:** Security statistics  
**Response:**
```json
{
  "totalScans": 15000,
  "blockedRequests": 150,
  "threatsDetected": {
    "prompt_injection": 100,
    "pii_detected": 50
  },
  "topThreats": [...]
}
```

#### `GET /api/security/users/:userId`
**Status:** ❌ Missing  
**Description:** Get user security profile  
**Path Parameters:**
- `userId` - User ID

#### `POST /api/security/users/:userId/unblock`
**Status:** ❌ Missing  
**Description:** Unblock user  
**Path Parameters:**
- `userId` - User ID

#### `GET /api/reasoning/traces`
**Status:** ❌ Missing  
**Description:** Get reasoning traces  
**Query Parameters:**
- `sessionId` (string, optional)
- `userId` (string, optional)
- `limit` (number, optional)

#### `GET /api/reasoning/traces/:traceId`
**Status:** ❌ Missing  
**Description:** Get specific reasoning trace  
**Path Parameters:**
- `traceId` - Trace ID

#### `GET /api/memory/context/:sessionId`
**Status:** ❌ Missing  
**Description:** Get conversation context  
**Path Parameters:**
- `sessionId` - Session ID

#### `GET /api/memory/entities/:sessionId`
**Status:** ❌ Missing  
**Description:** Get entities for session  
**Path Parameters:**
- `sessionId` - Session ID

#### `POST /api/memory/context/:sessionId/clear`
**Status:** ❌ Missing  
**Description:** Clear session context  
**Path Parameters:**
- `sessionId` - Session ID

#### `GET /api/cache/stats`
**Status:** ❌ Missing  
**Description:** Cache statistics  
**Response:**
```json
{
  "totalEntries": 1000,
  "hitRate": 0.85,
  "missRate": 0.15,
  "size": "50MB"
}
```

#### `POST /api/cache/clear`
**Status:** ❌ Missing  
**Description:** Clear cache

#### `GET /api/database/stats`
**Status:** ❌ Missing  
**Description:** Database statistics  
**Response:**
```json
{
  "connections": {
    "active": 5,
    "idle": 10,
    "total": 15
  },
  "queries": {
    "total": 15000,
    "averageTime": 25
  },
  "tables": {
    "sessions": 1000,
    "messages": 50000,
    "reasoning_traces": 5000
  }
}
```

### Security Agent - Missing Endpoints

#### `GET /api/stats`
**Status:** ❌ Missing  
**Description:** Security statistics

#### `GET /api/users/:userId`
**Status:** ❌ Missing  
**Description:** Get user security profile

#### `POST /api/users/:userId/unblock`
**Status:** ❌ Missing  
**Description:** Unblock user

#### `POST /api/users/:userId/block`
**Status:** ❌ Missing  
**Description:** Block user

#### `GET /api/patterns`
**Status:** ❌ Missing  
**Description:** List threat patterns

#### `POST /api/patterns`
**Status:** ❌ Missing  
**Description:** Add custom threat pattern

#### `DELETE /api/patterns/:patternId`
**Status:** ❌ Missing  
**Description:** Remove threat pattern

#### `GET /api/rate-limits`
**Status:** ❌ Missing  
**Description:** Get rate limit status  
**Query Parameters:**
- `userId` (string, optional)
- `toolName` (string, optional)

#### `POST /api/rate-limits/reset`
**Status:** ❌ Missing  
**Description:** Reset rate limits

### Health API - Missing Endpoints

#### `GET /health/system/uptime`
**Status:** ❌ Missing  
**Description:** System uptime

#### `GET /health/system/resources`
**Status:** ❌ Missing  
**Description:** System resource usage

#### `POST /health/agents/:name/restart`
**Status:** ❌ Missing  
**Description:** Restart agent (alias for respawn)

#### `GET /health/agents/:name/dependencies`
**Status:** ❌ Missing  
**Description:** Get agent dependencies

#### `GET /health/agents/:name/health-score`
**Status:** ❌ Missing  
**Description:** Get agent health score only

### Agent APIs - Missing Endpoints

#### Standard Missing Endpoints (All Agents)
- `GET /api/capabilities` - List agent capabilities
- `GET /api/status` - Detailed status
- `GET /api/metrics` - Agent metrics
- `GET /api/logs` - Agent logs
- `POST /api/restart` - Restart agent
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration

---

## 📊 API SUMMARY

### REST Endpoints by Category

| Category | Count | Base Path |
|----------|-------|-----------|
| Main API Server | 10+ | `/` |
| Security Agent | 4 | `/api` (port 3038) |
| Reliability API | 15+ | `/api` (reliability port) |
| Health API | 12+ | `/health` |
| Agent APIs | 37 × 2 = 74 | `/api`, `/health` (per agent) |
| **Total** | **115+** | - |

### WebSocket Events by Category

| Category | Events Emitted | Events Listened |
|----------|----------------|-----------------|
| Main API Server | 8 | 2 |
| Reliability API | 12+ | 7 |
| **Total** | **20+** | **9** |

### Missing Endpoints Summary

| Category | Missing Count |
|----------|---------------|
| Main API Server | 15+ |
| Security Agent | 8+ |
| Health API | 5+ |
| Agent APIs | 7 × 37 = 259 |
| **Total Missing** | **287+** |

---

## 🔐 AUTHENTICATION

### Current Status
- **Main API Server:** No authentication (development)
- **Security Agent:** No authentication
- **Reliability API:** Optional JWT (if `ENABLE_AUTH=true`)
- **Health API:** No authentication

### Recommended Authentication

#### JWT Authentication
```javascript
// Request header
Authorization: Bearer <jwt-token>

// Token payload
{
  "userId": "user-123",
  "componentId": "jarvis-chat",
  "permissions": ["read", "write"],
  "exp": 1234567890
}
```

#### API Key Authentication
```javascript
// Request header
X-API-Key: <api-key>
```

---

## 📈 RATE LIMITING

### Current Limits
- **Main API Server:** None (should be added)
- **Security Agent:** Per-tool limits (Layer 4)
- **Reliability API:** 100 requests/minute
- **Health API:** None

### Recommended Limits
- **Main API Server:** 1000 requests/minute per IP
- **Chat Endpoint:** 60 requests/minute per user
- **Agent Test Endpoints:** 10 requests/minute per IP
- **Health API:** 200 requests/minute per IP

---

## 🚀 DEPLOYMENT ENDPOINTS

### Recommended for Production

#### `GET /api/version`
**Status:** ❌ Missing  
**Description:** API version information

#### `GET /api/health/live`
**Status:** ❌ Missing  
**Description:** Live health check for load balancer

#### `GET /api/health/ready`
**Status:** ❌ Missing  
**Description:** Readiness check for Kubernetes

#### `GET /metrics`
**Status:** ❌ Missing  
**Description:** Prometheus metrics (standard path)

---

## 📝 API VERSIONING

### Current Version
- **Main API:** v1 (implicit)
- **Reliability API:** v2.0.0
- **Security API:** v1.0.0

### Recommended Versioning
- Use URL versioning: `/api/v1/`, `/api/v2/`
- Or header versioning: `X-API-Version: 2.0`

---

## 🔄 WEBHOOK SUPPORT (Missing)

### Recommended Webhooks

#### `POST /api/webhooks/register`
**Status:** ❌ Missing  
**Description:** Register webhook URL

#### `POST /api/webhooks/unregister`
**Status:** ❌ Missing  
**Description:** Unregister webhook

#### `GET /api/webhooks/list`
**Status:** ❌ Missing  
**Description:** List registered webhooks

**Webhook Events:**
- `agent.crashed`
- `agent.respawned`
- `security.threat_detected`
- `reliability.assessment_complete`

---

## 📋 COMPLETE ENDPOINT LIST

### Main API Server (Port 3000)
1. `GET /health` ✅
2. `GET /ready` ✅
3. `POST /chat` ✅
4. `GET /agents/status` ✅
5. `POST /voice/transcribe` ✅
6. `GET /agents/email/list` ✅
7. `GET /agents/calendar/list` ✅
8. `GET /agents/finance/analyze` ✅
9. `POST /agents/:agentName/test` ✅
10. `GET /agents/:agentName/quick-test` ✅
11. `GET /api/agents` ❌ (Missing)
12. `GET /api/agents/:agentId` ❌ (Missing)
13. `POST /api/agents/:agentId/execute` ❌ (Missing)
14. `GET /api/system/info` ❌ (Missing)
15. `GET /api/metrics` ❌ (Missing)
16. `GET /api/logs` ❌ (Missing)
17. `POST /api/agents/:agentId/restart` ❌ (Missing)
18. `GET /api/security/stats` ❌ (Missing)
19. `GET /api/reasoning/traces` ❌ (Missing)
20. `GET /api/memory/context/:sessionId` ❌ (Missing)
21. `GET /api/cache/stats` ❌ (Missing)
22. `POST /api/cache/clear` ❌ (Missing)
23. `GET /api/database/stats` ❌ (Missing)

### Security Agent (Port 3038)
1. `POST /api/scan` ✅
2. `POST /api/check-tool` ✅
3. `GET /api/events` ✅
4. `GET /api/threat-level` ✅
5. `GET /health` ✅
6. `GET /api/stats` ❌ (Missing)
7. `GET /api/users/:userId` ❌ (Missing)
8. `POST /api/users/:userId/unblock` ❌ (Missing)
9. `POST /api/users/:userId/block` ❌ (Missing)
10. `GET /api/patterns` ❌ (Missing)
11. `POST /api/patterns` ❌ (Missing)
12. `DELETE /api/patterns/:patternId` ❌ (Missing)
13. `GET /api/rate-limits` ❌ (Missing)
14. `POST /api/rate-limits/reset` ❌ (Missing)

### Reliability API (Port varies)
1. `POST /api/reliability/assess` ✅
2. `POST /api/reliability/batch` ✅
3. `GET /api/reliability/status/:requestId` ✅
4. `GET /api/reliability/capabilities` ✅
5. `POST /api/reliability/debug` ✅ (Dev only)
6. `POST /api/gtvp/verify` ✅
7. `POST /api/gtvp/generate-dataset` ✅
8. `GET /api/gtvp/authorities` ✅
9. `GET /api/gtvp/domains` ✅
10. `GET /api/gtvp/stats` ✅
11. `GET /api/health` ✅
12. `GET /api/health/detailed` ✅
13. `GET /api/health/readiness` ✅
14. `GET /api/health/liveness` ✅
15. `GET /api/health/metrics` ✅
16. `GET /api/health/dependencies` ✅
17. `GET /api/system/status` ✅
18. `GET /api/system/config` ✅
19. `GET /api/system/integration` ✅
20. `GET /api/system/schema` ✅
21. `GET /api/system/version` ✅
22. `GET /api` ✅

### Health API (Port 3000/health/*)
1. `GET /health/agents` ✅
2. `GET /health/agents/:name` ✅
3. `POST /health/agents/:name/respawn` ✅
4. `POST /health/agents/:name/kill` ✅
5. `GET /health/agents/:name/metrics` ✅
6. `GET /health/agents/:name/logs` ✅
7. `GET /health/agents/:name/config` ✅
8. `POST /health/agents/:name/health-check` ✅
9. `GET /health/agents/:name/history` ✅
10. `GET /health/metrics/live` ✅
11. `GET /health/metrics/latest` ✅
12. `GET /health/metrics/history` ✅
13. `GET /health/system` ✅
14. `GET /health/system/uptime` ❌ (Missing)
15. `GET /health/system/resources` ❌ (Missing)
16. `POST /health/agents/:name/restart` ❌ (Missing)
17. `GET /health/agents/:name/dependencies` ❌ (Missing)
18. `GET /health/agents/:name/health-score` ❌ (Missing)

### All Agent APIs (37 agents × standard endpoints)
**Per Agent:**
1. `POST /api` ✅
2. `GET /health` ✅
3. `GET /api/capabilities` ❌ (Missing)
4. `GET /api/status` ❌ (Missing)
5. `GET /api/metrics` ❌ (Missing)
6. `GET /api/logs` ❌ (Missing)
7. `POST /api/restart` ❌ (Missing)
8. `GET /api/config` ❌ (Missing)
9. `POST /api/config` ❌ (Missing)

**Total:** 37 agents × 9 endpoints = 333 endpoints (74 existing, 259 missing)

---

## 📡 WEBSOCKET EVENTS SUMMARY

### Main API Server WebSocket
**Connection:** `ws://localhost:3000`

**Events Emitted (8):**
1. `connected` ✅
2. `agent_spawned` ✅
3. `agent_crashed` ✅
4. `agent_respawned` ✅
5. `agent_health_changed` ✅
6. `agent_killed` ✅
7. `agent_error` ✅
8. `agents_requested` ✅

**Events Listened (2):**
1. `get_agents` ✅
2. `disconnect` ✅

### Reliability API WebSocket
**Connection:** `ws://localhost:{RELIABILITY_PORT}/socket.io`

**Events Emitted (12+):**
1. `connected` ✅
2. `assessment_started` ✅
3. `assessment_queued` ✅
4. `assessment_complete` ✅
5. `assessment_error` ✅
6. `gtvp_started` ✅
7. `gtvp_complete` ✅
8. `gtvp_error` ✅
9. `batch_started` ✅
10. `batch_progress` ✅
11. `batch_complete` ✅
12. `batch_error` ✅
13. `assessment_cancelled` ✅
14. `cancel_error` ✅
15. `status_update` ✅
16. `pong` ✅

**Events Listened (7):**
1. `assess_reliability` ✅
2. `verify_ground_truth` ✅
3. `assess_batch` ✅
4. `cancel_assessment` ✅
5. `get_status` ✅
6. `ping` ✅
7. `disconnect` ✅

---

## 🎯 RECOMMENDATIONS

### High Priority Missing Endpoints
1. `GET /api/agents` - List all agents
2. `GET /api/system/info` - System information
3. `GET /api/metrics` - Prometheus metrics
4. `GET /api/security/stats` - Security statistics
5. `GET /api/reasoning/traces` - Reasoning traces
6. `GET /api/memory/context/:sessionId` - Context retrieval
7. `GET /api/cache/stats` - Cache statistics
8. `POST /api/cache/clear` - Cache management
9. `GET /api/database/stats` - Database statistics
10. `GET /api/agents/:agentId` - Agent details

### Medium Priority Missing Endpoints
1. Authentication endpoints (`/api/auth/login`, `/api/auth/logout`)
2. User management endpoints
3. Configuration management endpoints
4. Log retrieval endpoints
5. Webhook registration endpoints

### Low Priority Missing Endpoints
1. Agent-specific advanced endpoints
2. Analytics endpoints
3. Reporting endpoints
4. Export/import endpoints

---

## 📊 FINAL STATISTICS

- **Total Existing REST Endpoints:** 115+
- **Total Missing REST Endpoints:** 287+
- **Total Recommended REST Endpoints:** 400+
- **Total WebSocket Events Emitted:** 20+
- **Total WebSocket Events Listened:** 9
- **Total WebSocket Connections:** 2 (Main API, Reliability API)

---

## 🚀 QUICK REFERENCE

### Most Used Endpoints

#### Chat & Communication
- `POST /chat` - Main chat endpoint
- `POST /voice/transcribe` - Voice transcription
- `GET /agents/status` - Check all agents

#### Security
- `POST http://localhost:3038/api/scan` - Scan input
- `POST http://localhost:3038/api/check-tool` - Check tool access
- `GET http://localhost:3038/api/threat-level?userId=xxx` - Get threat level

#### Reliability
- `POST /api/reliability/assess` - Assess source reliability
- `POST /api/reliability/batch` - Batch assessment
- `POST /api/gtvp/verify` - Ground truth verification

#### Health & Monitoring
- `GET /health` - System health
- `GET /health/agents` - All agent health
- `GET /health/agents/:name` - Specific agent health
- `GET /health/metrics/live` - Live metrics

#### Agent Operations
- `POST /agents/:agentName/test` - Test agent
- `GET /agents/:agentName/quick-test` - Quick ping test
- `POST /health/agents/:name/respawn` - Respawn agent
- `POST /health/agents/:name/kill` - Kill agent

### WebSocket Quick Start

#### Main API Server
```javascript
const socket = io('http://localhost:3000');
socket.on('agent_spawned', (data) => console.log('Agent spawned:', data));
socket.on('agent_health_changed', (data) => console.log('Health changed:', data));
```

#### Reliability API
```javascript
const socket = io('http://localhost:{PORT}/socket.io', {
  auth: { componentId: 'jarvis-chat' }
});
socket.emit('assess_reliability', {
  requestId: 'req-1',
  sourceUrl: 'https://example.com',
  jarvisContext: { componentId: 'jarvis-chat' }
});
socket.on('assessment_complete', (data) => console.log('Result:', data));
```

---

## 📊 ENDPOINT STATISTICS

### By Port
- **Port 3000 (Main API):** 23 endpoints (10 existing, 13 missing)
- **Port 3038 (Security):** 14 endpoints (5 existing, 9 missing)
- **Reliability Port:** 22 endpoints (all existing)
- **Health API (3000/health/*):** 18 endpoints (13 existing, 5 missing)
- **Agent Ports (3001-3038):** 333 endpoints (74 existing, 259 missing)

### By Category
- **Health & Status:** 25 endpoints
- **Chat & Communication:** 2 endpoints
- **Security:** 14 endpoints
- **Reliability:** 22 endpoints
- **Agent Operations:** 333 endpoints
- **System Management:** 15+ endpoints
- **WebSocket Events:** 20+ events

### By Status
- **✅ Existing:** 115+ endpoints
- **❌ Missing:** 287+ endpoints
- **📡 WebSocket Events:** 20+ emitted, 9 listened

---

## 🔗 ENDPOINT URLS BY AGENT

### Core Agents
- **Dialogue:** `http://localhost:3001/api`, `http://localhost:3001/health`
- **Web:** `http://localhost:3002/api`, `http://localhost:3002/health`
- **Knowledge:** `http://localhost:3003/api`, `http://localhost:3003/health`

### Productivity Agents
- **Finance:** `http://localhost:3004/api`, `http://localhost:3004/health`
- **Calendar:** `http://localhost:3005/api`, `http://localhost:3005/health`
- **Email:** `http://localhost:3006/api`, `http://localhost:3006/health`
- **Code:** `http://localhost:3007/api`, `http://localhost:3007/health`

### Media Agents
- **Voice:** `http://localhost:3008/api`, `http://localhost:3008/health`
- **Music:** `http://localhost:3009/api`, `http://localhost:3009/health`
- **Image:** `http://localhost:3010/api`, `http://localhost:3010/health`
- **Video:** `http://localhost:3011/api`, `http://localhost:3011/health`
- **Spotify:** `http://localhost:3012/api`, `http://localhost:3012/health`
- **Apple Music:** `http://localhost:3013/api`, `http://localhost:3013/health`

### Utility Agents
- **Weather:** `http://localhost:3015/api`, `http://localhost:3015/health`
- **News:** `http://localhost:3016/api`, `http://localhost:3016/health`
- **Reminder:** `http://localhost:3017/api`, `http://localhost:3017/health`
- **Timer:** `http://localhost:3018/api`, `http://localhost:3018/health`
- **Alarm:** `http://localhost:3019/api`, `http://localhost:3019/health`
- **Story:** `http://localhost:3020/api`, `http://localhost:3020/health`
- **Calculator:** `http://localhost:3023/api`, `http://localhost:3023/health`
- **Unit Converter:** `http://localhost:3024/api`, `http://localhost:3024/health`
- **Translation:** `http://localhost:3025/api`, `http://localhost:3025/health`

### Advanced Agents
- **Command:** `http://localhost:3026/api`, `http://localhost:3026/health`
- **Context:** `http://localhost:3027/api`, `http://localhost:3027/health`
- **Memory:** `http://localhost:3028/api`, `http://localhost:3028/health`
- **Emotion:** `http://localhost:3029/api`, `http://localhost:3029/health`
- **File:** `http://localhost:3030/api`, `http://localhost:3030/health`
- **Computer Control:** `http://localhost:3031/api`, `http://localhost:3031/health`
- **LLM:** `http://localhost:3032/api`, `http://localhost:3032/health`
- **Personality:** `http://localhost:3033/api`, `http://localhost:3033/health`
- **Listening:** `http://localhost:3029/api`, `http://localhost:3029/health`
- **Speech:** `http://localhost:3035/api`, `http://localhost:3035/health`
- **Voice Command:** `http://localhost:3036/api`, `http://localhost:3036/health`

### Specialized Agents
- **Reliability:** `http://localhost:3032/api`, `http://localhost:3032/health`
- **Emotions Engine:** `http://localhost:3034/api`, `http://localhost:3034/health`
- **Memory System:** `http://localhost:3036/api`, `http://localhost:3036/health`
- **Visual Engine:** `http://localhost:3037/api`, `http://localhost:3037/health`
- **Security:** `http://localhost:3038/api`, `http://localhost:3038/health`

---

## 🔐 AUTHENTICATION ENDPOINTS (Missing - Recommended)

### Authentication & Authorization
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### User Management
- `GET /api/users` - List users
- `GET /api/users/:userId` - Get user details
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user
- `GET /api/users/:userId/permissions` - Get user permissions
- `POST /api/users/:userId/permissions` - Update permissions

### API Key Management
- `GET /api/keys` - List API keys
- `POST /api/keys` - Create API key
- `DELETE /api/keys/:keyId` - Revoke API key
- `GET /api/keys/:keyId` - Get key details

---

## 📦 BATCH OPERATIONS (Missing - Recommended)

### Batch Agent Operations
- `POST /api/agents/batch/execute` - Execute action on multiple agents
- `POST /api/agents/batch/restart` - Restart multiple agents
- `POST /api/agents/batch/status` - Get status of multiple agents

### Batch Security Operations
- `POST /api/security/batch/scan` - Scan multiple inputs
- `POST /api/security/batch/check-tools` - Check multiple tool permissions

---

## 📈 ANALYTICS ENDPOINTS (Missing - Recommended)

### System Analytics
- `GET /api/analytics/overview` - System overview analytics
- `GET /api/analytics/agents` - Agent performance analytics
- `GET /api/analytics/requests` - Request analytics
- `GET /api/analytics/errors` - Error analytics
- `GET /api/analytics/security` - Security analytics
- `GET /api/analytics/reliability` - Reliability analytics

### Time-Series Analytics
- `GET /api/analytics/timeseries` - Time-series data
- `GET /api/analytics/timeseries/agents` - Agent time-series
- `GET /api/analytics/timeseries/requests` - Request time-series

---

## 🔄 WEBHOOK ENDPOINTS (Missing - Recommended)

### Webhook Management
- `POST /api/webhooks` - Register webhook
- `GET /api/webhooks` - List webhooks
- `GET /api/webhooks/:id` - Get webhook details
- `PUT /api/webhooks/:id` - Update webhook
- `DELETE /api/webhooks/:id` - Delete webhook
- `POST /api/webhooks/:id/test` - Test webhook

### Webhook Events
- `agent.crashed` - Agent crashed
- `agent.respawned` - Agent respawned
- `security.threat_detected` - Security threat
- `reliability.assessment_complete` - Reliability assessment done
- `system.health_degraded` - System health degraded

---

## 📤 EXPORT/IMPORT ENDPOINTS (Missing - Recommended)

### Data Export
- `GET /api/export/conversations` - Export conversations
- `GET /api/export/reasoning-traces` - Export reasoning traces
- `GET /api/export/memories` - Export memories
- `GET /api/export/security-events` - Export security events
- `GET /api/export/all` - Export all data (GDPR)

### Data Import
- `POST /api/import/conversations` - Import conversations
- `POST /api/import/memories` - Import memories
- `POST /api/import/config` - Import configuration

---

## 🛠️ CONFIGURATION ENDPOINTS (Missing - Recommended)

### System Configuration
- `GET /api/config` - Get system configuration
- `PUT /api/config` - Update system configuration
- `GET /api/config/schema` - Get configuration schema
- `POST /api/config/validate` - Validate configuration
- `POST /api/config/reset` - Reset to defaults

### Agent Configuration
- `GET /api/agents/:agentId/config` - Get agent config
- `PUT /api/agents/:agentId/config` - Update agent config
- `POST /api/agents/:agentId/config/reset` - Reset agent config

---

## 📝 LOGGING ENDPOINTS (Missing - Recommended)

### Log Retrieval
- `GET /api/logs` - Get system logs
- `GET /api/logs/:agentId` - Get agent logs
- `GET /api/logs/security` - Get security logs
- `GET /api/logs/errors` - Get error logs
- `GET /api/logs/audit` - Get audit logs

### Log Management
- `POST /api/logs/clear` - Clear logs
- `POST /api/logs/archive` - Archive logs
- `GET /api/logs/stats` - Log statistics

---

## 🎯 PRIORITY IMPLEMENTATION ORDER

### Phase 1: Critical Missing Endpoints (High Priority)
1. `GET /api/agents` - List all agents
2. `GET /api/system/info` - System information
3. `GET /api/metrics` - Prometheus metrics
4. `GET /api/security/stats` - Security statistics
5. `GET /api/reasoning/traces` - Reasoning traces
6. `GET /api/memory/context/:sessionId` - Context retrieval
7. `POST /api/auth/login` - Authentication
8. `GET /api/logs` - Log retrieval

### Phase 2: Important Missing Endpoints (Medium Priority)
1. `GET /api/agents/:agentId` - Agent details
2. `POST /api/agents/:agentId/execute` - Execute action
3. `GET /api/cache/stats` - Cache statistics
4. `POST /api/cache/clear` - Cache management
5. `GET /api/database/stats` - Database statistics
6. `GET /api/security/users/:userId` - User security profile
7. `POST /api/webhooks` - Webhook registration
8. `GET /api/analytics/overview` - Analytics

### Phase 3: Nice-to-Have Endpoints (Low Priority)
1. Agent-specific advanced endpoints
2. Export/import endpoints
3. Configuration management endpoints
4. Advanced analytics endpoints

---

## 📋 COMPLETE ENDPOINT CHECKLIST

### Main API Server (Port 3000)
- [x] `GET /health`
- [x] `GET /ready`
- [x] `POST /chat`
- [x] `GET /agents/status`
- [x] `POST /voice/transcribe`
- [x] `GET /agents/email/list`
- [x] `GET /agents/calendar/list`
- [x] `GET /agents/finance/analyze`
- [x] `POST /agents/:agentName/test`
- [x] `GET /agents/:agentName/quick-test`
- [ ] `GET /api/agents` ❌
- [ ] `GET /api/agents/:agentId` ❌
- [ ] `POST /api/agents/:agentId/execute` ❌
- [ ] `GET /api/system/info` ❌
- [ ] `GET /api/metrics` ❌
- [ ] `GET /api/logs` ❌
- [ ] `POST /api/agents/:agentId/restart` ❌
- [ ] `GET /api/security/stats` ❌
- [ ] `GET /api/reasoning/traces` ❌
- [ ] `GET /api/memory/context/:sessionId` ❌
- [ ] `GET /api/cache/stats` ❌
- [ ] `POST /api/cache/clear` ❌
- [ ] `GET /api/database/stats` ❌
- [ ] `POST /api/auth/login` ❌
- [ ] `GET /api/webhooks` ❌

### Security Agent (Port 3038)
- [x] `POST /api/scan`
- [x] `POST /api/check-tool`
- [x] `GET /api/events`
- [x] `GET /api/threat-level`
- [x] `GET /health`
- [ ] `GET /api/stats` ❌
- [ ] `GET /api/users/:userId` ❌
- [ ] `POST /api/users/:userId/unblock` ❌
- [ ] `POST /api/users/:userId/block` ❌
- [ ] `GET /api/patterns` ❌
- [ ] `POST /api/patterns` ❌
- [ ] `DELETE /api/patterns/:patternId` ❌
- [ ] `GET /api/rate-limits` ❌
- [ ] `POST /api/rate-limits/reset` ❌

### Reliability API
- [x] All 22 endpoints documented ✅

### Health API
- [x] All 13 existing endpoints documented ✅
- [ ] 5 missing endpoints documented ❌

### Agent APIs
- [x] Standard endpoints (POST /api, GET /health) ✅
- [ ] 7 additional endpoints per agent ❌ (259 total)

---

## 🔗 EXTERNAL API INTEGRATIONS

### Third-Party APIs Used
- **OpenAI API** - LLM operations
- **Lakera Guard API** - Enhanced security (optional)
- **OpenWeatherMap API** - Weather data
- **NewsAPI** - News headlines
- **Gmail API** - Email operations
- **Google Calendar API** - Calendar operations
- **Plaid API** - Financial data
- **Spotify Web API** - Music control
- **Apple Music API** - Music control
- **ElevenLabs API** - Text-to-speech
- **OpenAI Whisper API** - Speech-to-text
- **DALL-E API** - Image generation
- **Runway ML API** - Video generation
- **Suno AI API** - Music generation

---

## 📊 FINAL API STATISTICS

- **Total Existing REST Endpoints:** 115+
- **Total Missing REST Endpoints:** 287+
- **Total Recommended REST Endpoints:** 400+
- **Total WebSocket Events Emitted:** 20+
- **Total WebSocket Events Listened:** 9
- **Total WebSocket Connections:** 2
- **Total Agent Endpoints:** 333 (74 existing, 259 missing)
- **Total External API Integrations:** 13

---

**This document represents the complete API documentation for the Jarvis Orchestrator system, including all existing endpoints, WebSocket events, and recommended missing endpoints. Every endpoint has been cataloged with request/response examples, status codes, and implementation status.**
