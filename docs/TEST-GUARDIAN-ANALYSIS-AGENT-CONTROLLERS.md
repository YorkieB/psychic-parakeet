# Test Guardian Analysis: Agent Controllers
## Test Requirements Assessment for Dialogue, Web, and Knowledge Agent Controllers

**Analysis Date:** 2026-03-22  
**Scope:** Agent controller files (prospective)  
**Standards Applied:** 
- `.github/docs/quality/TESTING-STANDARDS.md`
- `.github/docs/workflows/WORKFLOW-TEST-ENFORCEMENT.md`
- `.github/docs/workflows/WORKFLOW-MISSING-TEST-FILES.md`

---

## Executive Summary

**Status: FAIL – Missing Test Files**

The following controller files are referenced in the task scope but do not exist in the repository:

1. `src/api/controllers/dialogue-agent-controller.ts`
2. `src/api/controllers/web-agent-controller.ts`
3. `src/api/controllers/knowledge-agent-controller.ts`
4. `src/api/controllers/agent-controller-support.ts`
5. `src/api/controllers/agent-doc-models.ts`

**Testing Status:** `fail` – Missing test files would trigger `WORKFLOW-MISSING-TEST-FILES` CI blocker.

---

## Key Findings

### 1. Current State

- **Files Exist:** NO – None of the scoped controller files exist in `src/api/controllers/`
- **Test Files Exist:** NO – Correspondingly, no test files exist in `tests/api/controllers/`
- **Existing API Structure:** Tests exist for existing API routes (e.g., `src/reliability/api/routes/reliability.ts`), but no dedicated controller layer tests found
- **OpenAPI Specs:** Exist for reliability system (`src/reliability/api/openapi-spec.ts`) but not for agent controllers

### 2. Testing Standards Applicable

Per `.github/docs/quality/TESTING-STANDARDS.md`:

| Requirement | Applies? | Details |
|---|---|---|
| 100% line, branch, function, statement coverage | ✅ YES | All exported controller functions must have unit tests |
| Test file mirroring structure | ✅ YES | `src/api/controllers/*.ts` → `tests/api/controllers/*.test.ts` |
| Unit, Integration, Accessibility tests | ✅ YES | Controller routing, HTTP handling, error paths |
| Async/error testing | ✅ YES | Controllers handle async operations and error responses |
| 100% enforcement in CI | ✅ YES | `WORKFLOW-TEST-ENFORCEMENT` will fail on coverage gaps |

### 3. Critical Gaps

**Per WORKFLOW-MISSING-TEST-FILES:**
- Scanner will detect missing `.test.ts` counterparts
- CI will fail on PR until test files are created
- Enforcement is **blocking** – no merge until tests exist

---

## Proposed Test Files and Test Cases

### File 1: `src/api/controllers/dialogue-agent-controller.ts`

**Purpose (Inferred):** Handle HTTP requests for dialogue agent operations (conversation, context management, response generation)

**Expected Test File:** `tests/api/controllers/dialogue-agent-controller.test.ts`

#### Test Cases (Vitest + Express testing patterns)

```typescript
// tests/api/controllers/dialogue-agent-controller.test.ts

describe("DialogueAgentController", () => {
  
  describe("POST /agents/dialogue/chat", () => {
    it("should accept valid dialogue request and return conversation response", async () => {
      // Arrange: valid request payload
      // Act: POST with Message, sessionId, context
      // Assert: status 200, response has data.conversation
    });

    it("should include jarvisContext in response metadata", async () => {
      // Assert: response.jarvis.requestId, componentId, timestamp
    });

    it("should handle empty message input with 400 error", async () => {
      // Arrange: message = ""
      // Assert: status 400, error.code = "INVALID_MESSAGE"
    });

    it("should handle missing required fields with validation error", async () => {
      // Test: missing sessionId, missing agentId
      // Assert: 400, "VALIDATION_FAILED"
    });

    it("should return 401 on missing authentication", async () => {
      // No Authorization header
      // Assert: 401, error about auth required
    });

    it("should return 429 on rate limit exceeded", async () => {
      // Simulate rate limiter trigger
      // Assert: 429, Retry-After header
    });

    it("should handle dialogue service timeout with 504", async () => {
      // Mock service timeout
      // Assert: 504, error.message includes "timeout"
    });

    it("should handle dialogue service exception with 500", async () => {
      // Mock service throw
      // Assert: 500, error.code = "INTERNAL_ERROR"
    });
  });

  describe("POST /agents/dialogue/context", () => {
    it("should accept context update with valid payload", async () => {
      // Arrange: { userId, contextData, metadata }
      // Assert: 200, success: true
    });

    it("should validate context size limits", async () => {
      // Test: contextData > MAX_SIZE
      // Assert: 413, "PAYLOAD_TOO_LARGE"
    });

    it("should preserve context across multiple requests", async () => {
      // Integration: send context, then chat request
      // Assert: chat response includes saved context
    });

    it("should handle concurrent context updates safely", async () => {
      // Race condition test: simultaneous updates
      // Assert: one wins, no corruption
    });
  });

  describe("GET /agents/dialogue/status/{sessionId}", () => {
    it("should return current session status", async () => {
      // Assert: { sessionId, status, messageCount, lastActivity }
    });

    it("should return 404 for nonexistent session", async () => {
      // Assert: 404, error.code = "SESSION_NOT_FOUND"
    });

    it("should include processing metadata", async () => {
      // Assert: response.processing.totalTime, providersUsed
    });
  });

  describe("Error Paths", () => {
    it("should log errors with requestId for traceability", async () => {
      // Mock logger, trigger error
      // Assert: logger called with requestId
    });

    it("should sanitize error messages (no sensitive data)", async () => {
      // Trigger error with API key in message
      // Assert: response error message doesn't contain key
    });

    it("should provide error correlation ID in response", async () => {
      // Assert: error.correlationId matches logging
    });
  });

  describe("OpenAPI Spec Compliance", () => {
    it("should match OpenAPI schema for request", async () => {
      // Validate request against spec
    });

    it("should match OpenAPI schema for response", async () => {
      // Validate response against spec
    });
  });
});
```

**Coverage Targets:**
- Routing: All endpoints (chat, context, status, error paths)
- Request Validation: Missing fields, type mismatches, size limits
- Authentication: Bearer token, custom headers, missing auth
- Error Handling: Service errors, timeouts, validation failures
- Rate Limiting: Limit exceeded, header presence
- Response Format: Standard envelope, jarvis metadata, timestamps
- Async Operations: Promise resolution, error handling

---

### File 2: `src/api/controllers/web-agent-controller.ts`

**Purpose (Inferred):** Handle HTTP requests for web agent operations (web browsing, content extraction, DOM interaction)

**Expected Test File:** `tests/api/controllers/web-agent-controller.test.ts`

#### Test Cases

```typescript
describe("WebAgentController", () => {
  
  describe("POST /agents/web/browse", () => {
    it("should accept URL and return page content", async () => {
      // Arrange: { url, selector?, timeout? }
      // Act: POST
      // Assert: 200, data.content, data.metadata.title
    });

    it("should validate URL format", async () => {
      // Test: invalid URL, relative path
      // Assert: 400, "INVALID_URL"
    });

    it("should respect page load timeout", async () => {
      // Mock slow page
      // Assert: 504 or timeout error
    });

    it("should sanitize content output (XSS prevention)", async () => {
      // Mock page with script tags
      // Assert: response content stripped/escaped
    });

    it("should handle JavaScript rendering with timeout", async () => {
      // JS-heavy page
      // Assert: renders or returns raw HTML on timeout
    });

    it("should extract specified DOM selector correctly", async () => {
      // Mock DOM, specify selector
      // Assert: extracted content matches selector
    });

    it("should handle 404 and 500 HTTP responses from target", async () => {
      // Mock upstream errors
      // Assert: 502 or 502, include upstream status in response
    });

    it("should include page metadata (title, URL, encoding)", async () => {
      // Assert: response.metadata has title, finalUrl, charset
    });

    it("should rate limit per domain to prevent abuse", async () => {
      // Multiple requests to same domain
      // Assert: 429 after threshold
    });

    it("should not follow redirects beyond limit", async () => {
      // Redirect loop
      // Assert: 508 or error about redirect depth
    });
  });

  describe("POST /agents/web/extract", () => {
    it("should extract structured data from HTML", async () => {
      // Arrange: { content, schema }
      // Assert: 200, data.extracted matches schema
    });

    it("should validate extraction schema", async () => {
      // Invalid schema
      // Assert: 400, "INVALID_SCHEMA"
    });

    it("should handle malformed HTML gracefully", async () => {
      // Broken HTML
      // Assert: 200, partial extraction or empty
    });

    it("should handle large HTML content (>10MB)", async () => {
      // Assert: 413 or processes with chunking
    });
  });

  describe("POST /agents/web/interact", () => {
    it("should accept interaction commands (click, fill, submit)", async () => {
      // Commands: { actions: [{ type, target, value }] }
      // Assert: 200, data.success: true
    });

    it("should validate interaction commands", async () => {
      // Invalid command type
      // Assert: 400
    });

    it("should capture screenshots after interaction", async () => {
      // Assert: response includes base64 image or URL
    });

    it("should timeout long interaction sequences", async () => {
      // Mock slow interactions
      // Assert: 504
    });

    it("should handle JavaScript errors during interaction", async () => {
      // Mock JS error on click
      // Assert: 400 or 500 with error details
    });
  });

  describe("Error Handling", () => {
    it("should handle blocked/restricted content", async () => {
      // robots.txt, auth walls
      // Assert: 403 or informative error
    });

    it("should handle network timeouts", async () => {
      // Mock network timeout
      // Assert: 504, "NETWORK_TIMEOUT"
    });

    it("should include browser console errors in debug mode", async () => {
      // NODE_ENV=development
      // Assert: error includes console.error logs
    });
  });

  describe("OpenAPI Spec Compliance", () => {
    it("should return valid OpenAPI response", () => {
      // Validate against spec
    });
  });
});
```

**Coverage Targets:**
- HTTP method routing (POST, GET)
- URL validation and normalization
- Content extraction and sanitization
- DOM interaction and event handling
- JavaScript rendering and timeout
- Error responses from target sites
- Security: XSS prevention, rate limiting, redirect limits
- Large payload handling
- Network error scenarios

---

### File 3: `src/api/controllers/knowledge-agent-controller.ts`

**Purpose (Inferred):** Handle HTTP requests for knowledge agent (RAG, embeddings, search, knowledge base operations)

**Expected Test File:** `tests/api/controllers/knowledge-agent-controller.test.ts`

#### Test Cases

```typescript
describe("KnowledgeAgentController", () => {
  
  describe("POST /agents/knowledge/search", () => {
    it("should search knowledge base with query", async () => {
      // Arrange: { query, limit?, filters? }
      // Assert: 200, data.results array
    });

    it("should rank results by relevance", async () => {
      // Assert: results[0].score > results[1].score
    });

    it("should apply filters (domain, date range)", async () => {
      // Arrange: { filters: { domain: "medical", yearMin: 2020 } }
      // Assert: all results match filters
    });

    it("should handle empty query string", async () => {
      // query: ""
      // Assert: 400, "EMPTY_QUERY"
    });

    it("should handle special characters in query", async () => {
      // query with SQL injection, XSS attempts
      // Assert: sanitized or escaped in results
    });

    it("should paginate results correctly", async () => {
      // Arrange: { query, limit: 10, offset: 10 }
      // Assert: returns 10 results, correct offset
    });

    it("should include relevance scores and metadata", async () => {
      // Assert: each result has score, source, metadata
    });

    it("should timeout long-running searches", async () => {
      // Mock slow query
      // Assert: 504 after timeout
    });

    it("should handle zero results gracefully", async () => {
      // query with no matches
      // Assert: 200, data.results = [], data.total = 0
    });
  });

  describe("POST /agents/knowledge/embed", () => {
    it("should generate embeddings for text", async () => {
      // Arrange: { text }
      // Assert: 200, data.embedding is array of floats
    });

    it("should batch embed multiple texts", async () => {
      // Arrange: { texts: [...] }
      // Assert: data.embeddings array matches input length
    });

    it("should validate text length", async () => {
      // text > MAX_LENGTH
      // Assert: 413 or auto-truncate
    });

    it("should handle encoding issues", async () => {
      // Unicode, special characters
      // Assert: 200, correctly encoded
    });

    it("should cache embeddings for identical inputs", async () => {
      // Call twice with same text
      // Assert: second call faster or returns cached
    });
  });

  describe("POST /agents/knowledge/ingest", () => {
    it("should accept document upload", async () => {
      // Multipart: file, metadata
      // Assert: 202, data.docId
    });

    it("should validate file size", async () => {
      // > MAX_SIZE
      // Assert: 413
    });

    it("should validate MIME type", async () => {
      // Unsupported type
      // Assert: 400, "UNSUPPORTED_TYPE"
    });

    it("should process document asynchronously", async () => {
      // Assert: 202 (Accepted) immediately
      // Assert: can check status via GET /status/{docId}
    });

    it("should extract metadata (title, author, date)", async () => {
      // Assert: response includes extracted metadata
    });

    it("should handle corrupted files", async () => {
      // Corrupted PDF/doc
      // Assert: 400 or 202 with error in status
    });
  });

  describe("GET /agents/knowledge/status/{docId}", () => {
    it("should return ingestion status", async () => {
      // Assert: { docId, status, progress, estimatedTime }
    });

    it("should return 404 for nonexistent doc", async () => {
      // Invalid docId
      // Assert: 404
    });

    it("should return error details on failure", async () => {
      // Failed ingestion
      // Assert: status: "failed", error message
    });
  });

  describe("POST /agents/knowledge/query-with-rag", () => {
    it("should search and generate answer with RAG", async () => {
      // Arrange: { question }
      // Assert: 200, data.answer, data.sources
    });

    it("should include source citations", async () => {
      // Assert: data.sources array with doc refs
    });

    it("should handle fallback when sources not found", async () => {
      // No matching documents
      // Assert: 200, answer based on general knowledge or error
    });

    it("should respect source constraints", async () => {
      // Arrange: { question, restrictToDomains: [...] }
      // Assert: sources only from specified domains
    });

    it("should generate consistent answers for same query", async () => {
      // Deterministic: mock LLM
      // Assert: same answer on repeated calls
    });
  });

  describe("Error Handling", () => {
    it("should handle knowledge base connection errors", async () => {
      // Mock DB unavailable
      // Assert: 503, "SERVICE_UNAVAILABLE"
    });

    it("should handle embedding service errors", async () => {
      // Mock embedding API error
      // Assert: 502
    });

    it("should include rate limit headers", async () => {
      // Assert: X-RateLimit-* headers present
    });

    it("should not expose internal error details in production", async () => {
      // NODE_ENV=production
      // Assert: generic error message
    });
  });

  describe("OpenAPI Spec Compliance", () => {
    it("should match OpenAPI spec for all endpoints", () => {
      // Validate request/response against spec
    });
  });
});
```

**Coverage Targets:**
- Search queries, filtering, pagination
- Text embedding generation and batching
- Document ingestion with async processing
- RAG query generation with citations
- Status polling for async operations
- Input validation (size, encoding, MIME types)
- Caching and performance
- Error handling and service failures
- OpenAPI compliance

---

### File 4: `src/api/controllers/agent-controller-support.ts`

**Purpose (Inferred):** Shared utilities, middleware, and helpers for all agent controllers

**Expected Test File:** `tests/api/controllers/agent-controller-support.test.ts`

#### Test Cases

```typescript
describe("AgentControllerSupport", () => {
  
  describe("Request Validation", () => {
    it("should validate jarvisContext structure", () => {
      // Valid context
      // Assert: returns validated context
      
      // Invalid context
      // Assert: throws ValidationError
    });

    it("should normalize URL inputs", () => {
      // Various URL formats
      // Assert: normalized to absolute URL
      
      // Invalid URLs
      // Assert: throws InvalidURLError
    });

    it("should validate priority enum", () => {
      // "low", "normal", "high"
      // Assert: all valid
      
      // Invalid priority
      // Assert: throws error
    });

    it("should sanitize string inputs for XSS", () => {
      // Input with <script>
      // Assert: cleaned or escaped
    });
  });

  describe("Response Formatting", () => {
    it("should format success response with standard envelope", () => {
      // Arrange: data object
      // Assert: { success: true, data, meta: { ... } }
    });

    it("should format error response consistently", () => {
      // Arrange: error, code, details
      // Assert: { success: false, error: { code, message, ... } }
    });

    it("should include jarvisContext in response", () => {
      // Arrange: context with requestId, componentId
      // Assert: response.jarvis includes all fields
    });

    it("should add timestamp to all responses", () => {
      // Assert: response.meta.timestamp or response.jarvis.timestamp
    });

    it("should include processing time", () => {
      // Assert: response.meta.processingTime is number
    });
  });

  describe("Error Translation", () => {
    it("should translate service errors to HTTP status", () => {
      // ServiceTimeoutError → 504
      // ValidationError → 400
      // AuthError → 401
      // RateLimitError → 429
      // NotFoundError → 404
    });

    it("should preserve error details in response", () => {
      // Arrange: error with message, code, details
      // Assert: all included in response
    });

    it("should not leak stack traces in production", () => {
      // NODE_ENV=production, error with stack
      // Assert: response.error.stack undefined
    });

    it("should log errors with full context", () => {
      // Mock logger
      // Assert: logger.error called with error, context, requestId
    });
  });

  describe("Middleware Chain", () => {
    it("should authenticate requests before processing", () => {
      // Mock auth middleware
      // Assert: called before controller
    });

    it("should validate requests before processing", () => {
      // Mock validation middleware
      // Assert: invalid requests rejected
    });

    it("should catch async errors and format response", () => {
      // Controller throws
      // Assert: error caught and formatted
    });

    it("should add requestId to all responses", () => {
      // Assert: jarvis.requestId present
    });

    it("should log request/response", () => {
      // Mock logger
      // Assert: both logged
    });
  });

  describe("Rate Limiting Helpers", () => {
    it("should enforce per-IP rate limits", () => {
      // Rapid requests from same IP
      // Assert: 429 after threshold
    });

    it("should enforce per-user rate limits", () => {
      // Rapid requests same user (if authenticated)
      // Assert: 429 per user, not per IP
    });

    it("should include rate limit headers", () => {
      // Assert: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
    });

    it("should reset rate limits on time boundary", () => {
      // Wait for reset period
      // Assert: counter resets
    });
  });

  describe("Caching Helpers", () => {
    it("should cache GET requests when configured", () => {
      // Mock cache
      // Assert: second request returns cached
    });

    it("should invalidate cache on PUT/POST/DELETE", () => {
      // POST, then GET
      // Assert: cache invalidated
    });

    it("should include cache headers in response", () => {
      // Assert: Cache-Control, ETag, Last-Modified
    });

    it("should respect cache-control header from clients", () => {
      // no-cache, must-revalidate
      // Assert: fresh data returned
    });
  });

  describe("Timeout Handling", () => {
    it("should apply default timeout to all requests", () => {
      // Mock slow operation
      // Assert: 504 after DEFAULT_TIMEOUT
    });

    it("should allow custom timeout per endpoint", () => {
      // Endpoint with higher timeout
      // Assert: respects custom timeout
    });

    it("should return 504 on timeout", () => {
      // Assert: status 504, error about timeout
    });
  });

  describe("Logging Utilities", () => {
    it("should log request details", () => {
      // Assert: method, path, query, body (masked)
    });

    it("should mask sensitive fields", () => {
      // password, token, apiKey
      // Assert: not logged in plain text
    });

    it("should include requestId in all logs", () => {
      // Assert: log lines include requestId for correlation
    });

    it("should log performance metrics", () => {
      // Assert: processing time, memory usage included
    });
  });

  describe("OpenAPI Helpers", () => {
    it("should validate request against OpenAPI schema", () => {
      // Valid request
      // Assert: passes
      
      // Invalid request
      // Assert: 400
    });

    it("should validate response against OpenAPI schema", () => {
      // Response data
      // Assert: matches schema or warning
    });

    it("should generate OpenAPI documentation", () => {
      // Assert: can render in Swagger UI
    });
  });

  describe("Type Safety", () => {
    it("should maintain TypeScript types through chain", () => {
      // Request type
      // Assert: properly typed in controller
      
      // Response type
      // Assert: properly typed in helpers
    });

    it("should catch type mismatches in tests", () => {
      // Type errors in code
      // Assert: caught by type checker
    });
  });
});
```

**Coverage Targets:**
- Request validation helpers
- Response formatting utilities
- Error translation and handling
- Middleware composition
- Rate limiting implementation
- Caching strategies
- Timeout management
- Logging with masking
- OpenAPI validation
- Type safety

---

### File 5: `src/api/controllers/agent-doc-models.ts`

**Purpose (Inferred):** TypeScript interfaces and models for agent controller request/response types

**Expected Test File:** `tests/api/controllers/agent-doc-models.test.ts`

#### Test Cases

```typescript
describe("AgentDocModels", () => {
  
  describe("Request Models", () => {
    describe("DialogueAgentRequest", () => {
      it("should create valid instance with required fields", () => {
        // message, sessionId, agentId
        // Assert: instance created
      });

      it("should validate message type", () => {
        // string | MessageObject
        // Assert: both accepted
      });

      it("should optional context field", () => {
        // With and without context
        // Assert: both valid
      });
    });

    describe("WebAgentRequest", () => {
      it("should validate URL field", () => {
        // Valid URL
        // Assert: valid
        
        // Invalid URL
        // Assert: rejected
      });

      it("should enforce timeout within limits", () => {
        // timeout: 5000
        // Assert: valid
        
        // timeout: 1000000
        // Assert: rejected
      });
    });

    describe("KnowledgeAgentRequest", () => {
      it("should validate search query", () => {
        // String, valid
        // Assert: valid
        
        // Empty string
        // Assert: rejected
      });

      it("should handle complex filters", () => {
        // filters: { domain: "medical", yearMin: 2020 }
        // Assert: validated
      });
    });

    describe("JarvisContext Model", () => {
      it("should require componentId and requestId", () => {
        // Both present
        // Assert: valid
        
        // Missing requestId
        // Assert: rejected
      });

      it("should validate requestId format", () => {
        // UUID or custom format
        // Assert: both accepted
      });

      it("should optional userId and sessionId", () => {
        // With and without
        // Assert: both valid
      });
    });
  });

  describe("Response Models", () => {
    describe("AgentResponse", () => {
      it("should have success and data fields", () => {
        // Assert: { success: boolean, data: T }
      });

      it("should include meta with processingTime", () => {
        // Assert: meta.processingTime is number
      });

      it("should include jarvis metadata", () => {
        // Assert: jarvis.requestId, componentId, timestamp
      });
    });

    describe("ErrorResponse", () => {
      it("should have success: false and error object", () => {
        // Assert: { success: false, error: {...} }
      });

      it("should include error code and message", () => {
        // Assert: error.code and error.message
      });

      it("should optionally include details", () => {
        // Assert: error.details present or absent
      });

      it("should include requestId for tracing", () => {
        // Assert: error.requestId matches request
      });
    });

    describe("PaginatedResponse", () => {
      it("should include pagination metadata", () => {
        // Assert: total, offset, limit
      });

      it("should calculate hasMore correctly", () => {
        // offset + limit < total
        // Assert: hasMore: true
        
        // offset + limit >= total
        // Assert: hasMore: false
      });
    });

    describe("AsyncOperationResponse", () => {
      it("should return status 202 Accepted", () => {
        // Assert: statusCode: 202
      });

      it("should include jobId or taskId", () => {
        // Assert: data.jobId or data.taskId
      });

      it("should include status endpoint", () => {
        // Assert: data.statusUrl or data.checkStatusAt
      });
    });
  });

  describe("Model Validation", () => {
    describe("Type Guards", () => {
      it("should distinguish DialogueAgentRequest from others", () => {
        // isDialogueAgentRequest()
        // Assert: correct type identified
      });

      it("should handle union types safely", () => {
        // AgentRequest = Dialogue | Web | Knowledge
        // Assert: can narrow type
      });
    });

    describe("Runtime Validation", () => {
      it("should reject undefined required fields", () => {
        // message: undefined
        // Assert: ValidationError
      });

      it("should accept null for optional fields", () => {
        // context: null
        // Assert: valid
      });

      it("should coerce types when safe", () => {
        // timeout: "5000" (string)
        // Assert: coerced to number or rejected
      });
    });

    describe("Serialization", () => {
      it("should serialize to JSON safely", () => {
        // JSON.stringify(request)
        // Assert: valid JSON
      });

      it("should deserialize from JSON", () => {
        // JSON.parse(json)
        // Assert: valid instance
      });

      it("should handle circular references", () => {
        // Circular ref in model
        // Assert: handled or rejected cleanly
      });
    });
  });

  describe("OpenAPI Schema Compliance", () => {
    describe("Schema Export", () => {
      it("should export OpenAPI schemas for all models", () => {
        // generateSchema(DialogueAgentRequest)
        // Assert: valid OpenAPI schema
      });

      it("should include examples", () => {
        // Assert: example field with valid data
      });

      it("should include descriptions", () => {
        // Assert: description field populated
      });
    });

    describe("Schema Validation", () => {
      it("should validate against OpenAPI spec", () => {
        // Parse schema as OpenAPI
        // Assert: valid per spec
      });

      it("should catch schema conflicts", () => {
        // Multiple schemas with same name
        // Assert: warning or error
      });
    });
  });

  describe("Documentation Generation", () => {
    it("should generate JSDoc from models", () => {
      // Export with comments
      // Assert: TypeDoc can parse
    });

    it("should include @param and @returns", () => {
      // Function with model types
      // Assert: documented
    });

    it("should link to external schemas", () => {
      // Reference to OpenAPI
      // Assert: links present
    });
  });

  describe("Type Coverage", () => {
    it("should export all public types", () => {
      // Check export from index.ts
      // Assert: all main types exported
    });

    it("should maintain backward compatibility", () => {
      // Old code using types
      // Assert: still compiles
    });

    it("should mark deprecated types", () => {
      // @deprecated tag
      // Assert: marked in JSDoc
    });
  });

  describe("Integration with Controllers", () => {
    it("should type-check controller parameters", () => {
      // Controller uses request models
      // Assert: type errors caught
    });

    it("should type-check response data", () => {
      // response.json(data)
      // Assert: data typed correctly
    });

    it("should support middleware passing typed data", () => {
      // middleware sets req.body typed
      // Assert: controller sees typed data
    });
  });
});
```

**Coverage Targets:**
- Model instantiation and validation
- Required vs optional fields
- Type guards and narrowing
- JSON serialization/deserialization
- OpenAPI schema compliance
- JSDoc documentation
- Type safety in TypeScript
- Backward compatibility
- Integration with controllers

---

## Test Files Required

### Summary Table

| Source File | Test File | Status | Estimated Tests | Coverage Metrics |
|---|---|---|---|---|
| `src/api/controllers/dialogue-agent-controller.ts` | `tests/api/controllers/dialogue-agent-controller.test.ts` | MISSING | 25-30 | 100% line, branch, function |
| `src/api/controllers/web-agent-controller.ts` | `tests/api/controllers/web-agent-controller.test.ts` | MISSING | 20-25 | 100% line, branch, function |
| `src/api/controllers/knowledge-agent-controller.ts` | `tests/api/controllers/knowledge-agent-controller.test.ts` | MISSING | 25-30 | 100% line, branch, function |
| `src/api/controllers/agent-controller-support.ts` | `tests/api/controllers/agent-controller-support.test.ts` | MISSING | 30-35 | 100% line, branch, function |
| `src/api/controllers/agent-doc-models.ts` | `tests/api/controllers/agent-doc-models.test.ts` | MISSING | 20-25 | 100% line, branch, function |

**Total Missing Tests:** 120-145 test cases across 5 files

---

## Testing Strategy

### Phase 1: Unit Tests (Routing and Request Handling)

**Focus:** Controller behavior in isolation

```
- Valid request acceptance
- Input validation (types, ranges, formats)
- Error response formatting
- Status code correctness
- Authentication/authorization checks
```

### Phase 2: Integration Tests (API Layer)

**Focus:** Controllers + middleware + error handling

```
- Full request/response cycle
- Async operation handling
- Rate limiting enforcement
- Caching behavior
- Service error propagation
- Concurrent request handling
```

### Phase 3: OpenAPI Compliance Tests

**Focus:** Specification compliance

```
- Request schema validation
- Response schema validation
- Status code matching spec
- Header requirements
- Example correctness
```

### Phase 4: Error Path Tests

**Focus:** Resilience and robustness

```
- Timeout scenarios
- Network failures
- Malformed input
- Service unavailability
- Rate limit exceeded
- Authentication failures
- Authorization failures
```

---

## Test Implementation Patterns

### Pattern 1: Standard Controller Test

```typescript
describe("DialogueAgentController", () => {
  let controller: DialogueAgentController;
  let dialogueService: Mock<DialogueService>;
  let req: Request;
  let res: Response;

  beforeEach(() => {
    dialogueService = mock<DialogueService>();
    controller = new DialogueAgentController(dialogueService);
    req = { body: {}, params: {}, query: {} } as any;
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
  });

  it("should handle valid chat request", async () => {
    // Setup
    req.body = { message: "Hello", sessionId: "s1", agentId: "d1" };
    dialogueService.chat.mockResolvedValue({ response: "Hi" });

    // Execute
    await controller.chat(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ response: "Hi" }),
      })
    );
  });
});
```

### Pattern 2: Error Handling Test

```typescript
it("should return 400 on validation error", async () => {
  req.body = { message: "" }; // Invalid: empty

  await controller.chat(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: "VALIDATION_ERROR",
      }),
    })
  );
});
```

### Pattern 3: Async Operation Test

```typescript
it("should return 202 for background processing", async () => {
  req.body = { document: largeFile, background: true };
  dialogueService.ingest.mockResolvedValue({ 
    jobId: "j123", 
    status: "pending" 
  });

  await controller.ingestDocument(req, res);

  expect(res.status).toHaveBeenCalledWith(202);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ jobId: "j123" }),
    })
  );
});
```

---

## CI/CD Integration

### `WORKFLOW-MISSING-TEST-FILES` Impact

When any of these controller files are added:

1. **Scan Phase:** CI scans for matching `.test.ts` files
2. **Detection:** If missing, workflow fails with:
   ```
   Missing test file: tests/api/controllers/dialogue-agent-controller.test.ts
   Missing test file: tests/api/controllers/web-agent-controller.test.ts
   ...
   ```
3. **Blocker:** PR cannot merge until test files created
4. **Recovery:** Create test files and push

### `WORKFLOW-TEST-ENFORCEMENT` Impact

When test files are created:

1. **Coverage Requirement:** Must achieve 100% line, branch, function, statement coverage
2. **Command:** `npm run test:coverage`
3. **Threshold:** All metrics must be 100%
4. **Failure:** Coverage report shows gaps
5. **Recovery:** Add tests for uncovered code paths

---

## Success Criteria

### Immediate Actions (Before File Creation)

✅ This document: Test requirements defined  
✅ Test files exist at correct paths  
✅ Basic smoke tests pass  

### Short Term (Phase 1)

✅ All 120-145 test cases implemented  
✅ 100% coverage for all 5 controller files  
✅ CI tests pass on PR  

### Medium Term (Phase 2)

✅ Integration tests added  
✅ OpenAPI compliance verified  
✅ Error scenarios fully covered  

### Long Term (Phase 3+)

✅ Test maintenance and updates  
✅ Coverage remains above 95%  
✅ New features include tests from day 1  

---

## Recommendations

### 1. Create Test Files First (TDD)

Recommend writing test file skeletons before implementing controllers:

```
Step 1: Create tests/api/controllers/ directory
Step 2: Add test files with describe/it stubs
Step 3: Implement controllers to pass tests
Step 4: Run coverage and iterate
```

### 2. Use Shared Test Utilities

Create `tests/api/controllers/test-helpers.ts`:

```typescript
export function createMockRequest(overrides?: Partial<Request>) {
  return { body: {}, params: {}, query: {}, ...overrides } as Request;
}

export function expectStandardSuccessResponse(res, data) {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: true,
      data,
      meta: expect.objectContaining({ processingTime: expect.any(Number) }),
    })
  );
}
```

### 3. Use Fixtures for Complex Data

Create `tests/fixtures/agent-requests.ts`:

```typescript
export const validDialogueRequest = {
  message: "Hello world",
  sessionId: "session-123",
  agentId: "dialogue-1",
  jarvisContext: {
    componentId: "test-component",
    requestId: "req-123",
  },
};
```

### 4. Mock External Services Consistently

Use `vi.mock()` or dependency injection:

```typescript
import { mock, when } from "vitest-mock";

const dialogueService = mock<DialogueService>();
when(dialogueService.chat).thenResolve({ response: "test" });
```

### 5. Test OpenAPI Compliance Automatically

Integrate OpenAPI validator:

```typescript
import { validateRequest, validateResponse } from "openapi-validator";

it("should match OpenAPI spec", async () => {
  const spec = loadOpenAPISpec();
  validateRequest(spec, req);
  validateResponse(spec, res.json.mock.calls[0][0]);
});
```

---

## Related Documentation

- `.github/docs/quality/TESTING-STANDARDS.md` – Coverage requirements, test types
- `.github/docs/workflows/WORKFLOW-TEST-ENFORCEMENT.md` – CI enforcement, 100% coverage
- `.github/docs/workflows/WORKFLOW-MISSING-TEST-FILES.md` – File pairing requirements
- `src/reliability/api/routes/reliability.ts` – Example API route structure
- `src/reliability/api/openapi-spec.ts` – Example OpenAPI spec

---

## Final Assessment

| Category | Status | Details |
|---|---|---|
| **Test File Coverage** | ❌ FAIL | 0/5 test files exist |
| **Test Case Coverage** | ❌ FAIL | ~0 test cases implemented |
| **Specification Coverage** | ❌ FAIL | No OpenAPI compliance tests |
| **Error Path Coverage** | ❌ FAIL | No error scenarios tested |
| **CI Readiness** | ❌ FAIL | Will fail WORKFLOW-MISSING-TEST-FILES |

**Overall Testing Status: FAIL** ❌

**Reason:** None of the required test files exist. Per `WORKFLOW-MISSING-TEST-FILES`, this will block CI/CD until test files are created.

**Next Steps:**
1. Create 5 test files at paths specified in this analysis
2. Implement 120-145 test cases per requirements above
3. Achieve 100% coverage (line, branch, function, statement)
4. Ensure CI passes before merge

---

**Document Metadata**

- **Created:** 2026-03-22
- **Guardian Role:** Test Guardian
- **Status:** Analysis Complete – Ready for Implementation
- **Action Required:** Create test files and implement test cases
- **Blocking:** Yes – CI will fail without test files
