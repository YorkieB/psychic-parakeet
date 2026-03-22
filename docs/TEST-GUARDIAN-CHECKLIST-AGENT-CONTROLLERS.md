# Test Guardian Checklist
## Agent Controller Test Implementation Checklist

**Use this checklist to track test implementation progress across all 5 controller files.**

---

## Pre-Implementation Setup

- [ ] Create directory: `tests/api/controllers/`
- [ ] Create directory: `tests/fixtures/` (for test data)
- [ ] Create file: `tests/api/controllers/test-helpers.ts` (shared utilities)
- [ ] Review `.github/docs/quality/TESTING-STANDARDS.md`
- [ ] Review `.github/docs/workflows/WORKFLOW-TEST-ENFORCEMENT.md`
- [ ] Set up local test environment: `npm install && npm run test --watch`

---

## File 1: dialogue-agent-controller.test.ts

### Basic Structure
- [ ] Import DialogueAgentController
- [ ] Import mock services
- [ ] Setup describe block with beforeEach/afterEach

### Routing Tests (5 tests)
- [ ] POST /agents/dialogue/chat – valid request → 200 OK
- [ ] POST /agents/dialogue/context – context update → 200 OK
- [ ] GET /agents/dialogue/status/{sessionId} – get status → 200 OK
- [ ] POST /agents/dialogue/chat – missing auth → 401 Unauthorized
- [ ] POST /agents/dialogue/chat – rate limited → 429 Too Many Requests

### Validation Tests (5 tests)
- [ ] POST /agents/dialogue/chat – empty message → 400 Bad Request
- [ ] POST /agents/dialogue/chat – missing sessionId → 400 Bad Request
- [ ] POST /agents/dialogue/chat – invalid agentId type → 400 Bad Request
- [ ] POST /agents/dialogue/context – context > MAX_SIZE → 413 Payload Too Large
- [ ] POST /agents/dialogue/chat – special characters in message → 200 (sanitized)

### Response Format Tests (5 tests)
- [ ] Response includes success: true/false
- [ ] Response includes data object (or error)
- [ ] Response includes meta.processingTime
- [ ] Response includes jarvis.requestId
- [ ] Response includes jarvis.timestamp (ISO format)

### Error Path Tests (5 tests)
- [ ] Service timeout → 504 Gateway Timeout
- [ ] Service exception → 500 Internal Server Error
- [ ] Invalid JWT token → 401 Unauthorized
- [ ] DB connection error → 503 Service Unavailable
- [ ] Error response includes correlationId

### Integration Tests (3-5 tests)
- [ ] Context persists across multiple chat requests
- [ ] Concurrent chat requests handled safely
- [ ] Session status reflects message history

### OpenAPI Compliance (2 tests)
- [ ] Request validates against OpenAPI schema
- [ ] Response validates against OpenAPI schema

**Target:** 25-30 tests | Coverage: 100% line/branch/function/statement

---

## File 2: web-agent-controller.test.ts

### Routing Tests (4 tests)
- [ ] POST /agents/web/browse – valid URL → 200 OK with content
- [ ] POST /agents/web/extract – valid HTML → 200 OK with extracted data
- [ ] POST /agents/web/interact – valid commands → 200 OK with result
- [ ] GET /agents/web/browse – method not allowed → 405 Method Not Allowed

### URL Validation Tests (4 tests)
- [ ] Valid HTTPS URL → accepted
- [ ] Valid HTTP URL → accepted
- [ ] Invalid URL (malformed) → 400 Bad Request
- [ ] Relative path (no scheme) → 400 Bad Request

### Content Extraction Tests (3 tests)
- [ ] Extract page title and metadata
- [ ] Extract specific DOM selector → correct content
- [ ] Malformed HTML → partial extraction or 200 with error field

### Security Tests (4 tests)
- [ ] Page with <script> tags → stripped/escaped in response
- [ ] XSS payload in response → sanitized
- [ ] blocked content (robots.txt) → 403 Forbidden or informative error
- [ ] SQL injection in selector → sanitized

### Timeout Tests (3 tests)
- [ ] Page load timeout → 504 Gateway Timeout
- [ ] Interaction timeout → 504 Gateway Timeout
- [ ] Custom timeout param → respected

### Upstream Error Tests (3 tests)
- [ ] Target site returns 404 → 502 Bad Gateway with upstream code
- [ ] Target site returns 500 → 502 Bad Gateway
- [ ] Target site unreachable → 504 Gateway Timeout

### Rate Limiting Tests (2 tests)
- [ ] Rapid requests to same domain → 429 after threshold
- [ ] Rate limit headers present (X-RateLimit-*)

### JavaScript/Interaction Tests (2-3 tests)
- [ ] JS-heavy page renders or returns raw HTML
- [ ] Interaction commands (click, fill, submit) → success
- [ ] JS error on interaction → 400 or 500 with error details

**Target:** 20-25 tests | Coverage: 100% line/branch/function/statement

---

## File 3: knowledge-agent-controller.test.ts

### Search Tests (5 tests)
- [ ] POST /agents/knowledge/search – valid query → 200 with results array
- [ ] Search with pagination (limit, offset) → correct results
- [ ] Search with filters (domain, date) → filtered results
- [ ] Empty query string → 400 Bad Request
- [ ] Query with special chars (XSS, SQL injection) → sanitized, 200 OK

### Result Ranking Tests (2 tests)
- [ ] Results ordered by relevance score (descending)
- [ ] Each result includes score, source, metadata

### Embedding Tests (4 tests)
- [ ] Generate embedding for text → array of floats
- [ ] Batch embedding (multiple texts) → array of arrays
- [ ] Text > MAX_LENGTH → 413 Payload Too Large (or auto-truncate)
- [ ] Identical input twice → cached result or faster response

### Document Ingestion Tests (5 tests)
- [ ] Upload document (multipart) → 202 Accepted with docId
- [ ] File size validation → 413 if > MAX_SIZE
- [ ] MIME type validation → 400 if unsupported
- [ ] Corrupted file → 400 or 202 with error in status
- [ ] Extract metadata (title, author, date) → included in response

### Status Polling Tests (3 tests)
- [ ] GET /agents/knowledge/status/{docId} – valid docId → status object
- [ ] GET /agents/knowledge/status/{docId} – invalid docId → 404
- [ ] Status includes progress, estimatedTime

### RAG Query Tests (4 tests)
- [ ] POST /agents/knowledge/query-with-rag – question → 200 with answer + sources
- [ ] Answer includes source citations (document references)
- [ ] Domain-restricted search → only specified domains
- [ ] No matching sources → fallback answer or error

### Error Handling Tests (3 tests)
- [ ] DB unavailable → 503 Service Unavailable
- [ ] Embedding service error → 502 Bad Gateway
- [ ] Rate limit exceeded → 429 with retry headers

### Zero Results Tests (2 tests)
- [ ] Search with no matches → 200 with empty results array
- [ ] Status: { total: 0, results: [] }

**Target:** 25-30 tests | Coverage: 100% line/branch/function/statement

---

## File 4: agent-controller-support.test.ts

### Request Validation (5 tests)
- [ ] Valid jarvisContext → passes validation
- [ ] Invalid jarvisContext (missing requestId) → throws error
- [ ] URL normalization → relative to absolute
- [ ] Priority enum ("low", "normal", "high") → all valid
- [ ] Priority invalid value → rejected

### Response Formatting (5 tests)
- [ ] Success response format → { success: true, data, meta, jarvis }
- [ ] Error response format → { success: false, error, meta, jarvis }
- [ ] jarvisContext included → requestId, componentId, timestamp
- [ ] processingTime included → number in ms
- [ ] Timestamp format → ISO 8601

### Error Translation (4 tests)
- [ ] ServiceTimeoutError → 504 status code
- [ ] ValidationError → 400 status code
- [ ] AuthError → 401 status code
- [ ] NotFoundError → 404 status code

### Middleware Chain (5 tests)
- [ ] Authentication middleware runs before controller
- [ ] Validation middleware validates before processing
- [ ] Async errors caught and formatted
- [ ] requestId injected into all responses
- [ ] Request/response logged

### Rate Limiting (4 tests)
- [ ] Per-IP rate limit enforced
- [ ] Per-user rate limit enforced (if authenticated)
- [ ] X-RateLimit-* headers present
- [ ] Rate limit counter resets after time period

### Caching (4 tests)
- [ ] GET requests cached when configured
- [ ] Cache invalidated on POST/PUT/DELETE
- [ ] Cache-Control headers included
- [ ] client cache-control header respected (no-cache)

### Timeout Handling (3 tests)
- [ ] Default timeout applied to all requests
- [ ] Custom timeout per endpoint respected
- [ ] Timeout error → 504 status

### Logging (4 tests)
- [ ] Request logged (method, path, query)
- [ ] Sensitive fields masked in logs
- [ ] requestId included in all log lines
- [ ] Performance metrics logged (time, memory)

### OpenAPI Validation (2 tests)
- [ ] Request validates against OpenAPI schema
- [ ] Response validates against OpenAPI schema

**Target:** 30-35 tests | Coverage: 100% line/branch/function/statement

---

## File 5: agent-doc-models.test.ts

### Request Model Validation (5 tests)
- [ ] DialogueAgentRequest – valid instance created
- [ ] DialogueAgentRequest – required fields validated
- [ ] WebAgentRequest – URL field validation
- [ ] KnowledgeAgentRequest – query field validation
- [ ] JarvisContext – componentId and requestId required

### Response Model Validation (4 tests)
- [ ] AgentResponse – { success, data, meta, jarvis }
- [ ] ErrorResponse – { success: false, error }
- [ ] PaginatedResponse – { total, offset, limit, hasMore }
- [ ] AsyncOperationResponse – { jobId/taskId, status, statusUrl }

### Type Guards (3 tests)
- [ ] isDialogueAgentRequest() – discriminates types
- [ ] isWebAgentRequest() – discriminates types
- [ ] isKnowledgeAgentRequest() – discriminates types

### JSON Serialization (3 tests)
- [ ] Serialize to JSON → valid JSON
- [ ] Deserialize from JSON → valid instance
- [ ] Circular references handled cleanly

### OpenAPI Schema (3 tests)
- [ ] generateSchema() produces valid OpenAPI schema
- [ ] Schema includes examples
- [ ] Schema includes descriptions

### Documentation (2 tests)
- [ ] JSDoc comments parseable by TypeDoc
- [ ] @param and @returns tags present
- [ ] External schema links included

### Type Safety (3 tests)
- [ ] TypeScript strict mode compiles
- [ ] Type errors caught by type checker
- [ ] Controller parameter types match models

### Backward Compatibility (2 tests)
- [ ] Old code using types still compiles
- [ ] Deprecated types marked with @deprecated

**Target:** 20-25 tests | Coverage: 100% line/branch/function/statement

---

## Post-Implementation Verification

### Coverage Check
- [ ] Run: `npm run test:coverage`
- [ ] All metrics at 100% (line, branch, function, statement)
- [ ] No files with < 100% coverage

### Linting
- [ ] Run: `npm run lint:tests`
- [ ] All test files pass linting
- [ ] No unused imports or variables

### Type Check
- [ ] Run: `npm run type-check`
- [ ] All test files type-safe
- [ ] No @ts-ignore needed

### Local Test Execution
- [ ] Run: `npm test -- tests/api/controllers/`
- [ ] All tests pass
- [ ] No warnings or errors

### CI Validation
- [ ] Push to branch
- [ ] Wait for CI to run both workflows:
  - [ ] WORKFLOW-MISSING-TEST-FILES → ✅ PASS
  - [ ] WORKFLOW-TEST-ENFORCEMENT → ✅ PASS
- [ ] Code coverage artifact available

### Documentation
- [ ] Update root README with test command
- [ ] Add section in `docs/` about controller testing
- [ ] Link to this checklist from governance docs

---

## Quick Commands Reference

```bash
# Run all controller tests
npm test -- tests/api/controllers/

# Watch mode (re-run on file change)
npm test -- --watch tests/api/controllers/

# Coverage report
npm run test:coverage

# Check specific file
npm test -- dialogue-agent-controller.test.ts

# Lint tests
npm run lint

# Type check
npm run type-check

# Run CI checks locally (dry-run)
npm run test:coverage && npm run lint
```

---

## Test Implementation Tips

### 1. Use Descriptive Test Names
```typescript
// ❌ Bad
it("works", () => {});

// ✅ Good
it("should reject empty message with 400 Bad Request status code", () => {});
```

### 2. Follow AAA Pattern (Arrange-Act-Assert)
```typescript
it("should...", async () => {
  // Arrange: setup test data
  const request = { message: "Hello" };
  
  // Act: execute code
  const result = await controller.chat(request);
  
  // Assert: verify outcome
  expect(result.status).toBe(200);
});
```

### 3. Use Test Helpers Consistently
```typescript
import { createMockRequest, expectStandardResponse } from "./test-helpers";

it("should...", async () => {
  const req = createMockRequest({ body: { ... } });
  await controller.method(req, res);
  expectStandardResponse(res, 200);
});
```

### 4. Mock External Services
```typescript
import { vi } from "vitest";

const mockService = {
  method: vi.fn().mockResolvedValue({ ... }),
};

beforeEach(() => {
  vi.clearAllMocks();
});
```

### 5. Group Related Tests
```typescript
describe("DialogueAgentController", () => {
  describe("POST /agents/dialogue/chat", () => {
    // Related tests here
  });
  
  describe("Error handling", () => {
    // Error tests here
  });
});
```

---

## Known Issues & Workarounds

### Issue: Tests run but coverage doesn't update
**Workaround:** Run `npm run test:coverage -- --force` to rebuild coverage

### Issue: Mock not being called
**Workaround:** Ensure mock is set up before calling method, use `vi.spyOn()` if needed

### Issue: Async tests timeout
**Workaround:** Increase timeout: `it("test", async () => {...}, 10000);`

### Issue: "Cannot find module" errors
**Workaround:** Ensure tsconfig.json includes test path mappings

---

## Progress Tracking

| File | Status | Tests Implemented | Coverage | Notes |
|---|---|---|---|---|
| dialogue-agent-controller.test.ts | ⏳ TODO | 0/25-30 | 0% | Awaiting implementation |
| web-agent-controller.test.ts | ⏳ TODO | 0/20-25 | 0% | Awaiting implementation |
| knowledge-agent-controller.test.ts | ⏳ TODO | 0/25-30 | 0% | Awaiting implementation |
| agent-controller-support.test.ts | ⏳ TODO | 0/30-35 | 0% | Awaiting implementation |
| agent-doc-models.test.ts | ⏳ TODO | 0/20-25 | 0% | Awaiting implementation |
| **TOTAL** | ⏳ TODO | **0/120-145** | **0%** | In Progress |

---

## Resources

- **Full Analysis:** `docs/TEST-GUARDIAN-ANALYSIS-AGENT-CONTROLLERS.md`
- **Summary Report:** `docs/TEST-GUARDIAN-SUMMARY-AGENT-CONTROLLERS.md`
- **Testing Standards:** `.github/docs/quality/TESTING-STANDARDS.md`
- **Reference Implementation:** `src/reliability/api/routes/reliability.ts`
- **Vitest Docs:** https://vitest.dev/
- **Testing Library Docs:** https://testing-library.com/

---

**Created:** 2026-03-22  
**Status:** Ready for Implementation  
**Guardian:** Test Guardian  
