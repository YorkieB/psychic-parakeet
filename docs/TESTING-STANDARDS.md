# Testing Standards

This document defines comprehensive testing standards for the Jarvis v4 repository. All new features, modifications, and bug fixes must adhere to these standards.

## Overview

Testing is mandatory for all source code changes. The repository uses **Jest** as the primary testing framework, with additional test suites for integration, performance, security, and load testing.

## Test Framework and Configuration

### Primary Framework: Jest

- **Configuration:** `jest.config.js`
- **Test Root:** `tests/` directory
- **Test Pattern:** `**/__tests__/**/*.ts` or `**/?(*.)+(spec|test).ts`
- **Environment:** Node.js
- **Coverage Collection:** Enabled for all `src/**/*.ts` files
- **Default Timeout:** 30 seconds per test

### Test Execution

```bash
# Jest unit tests (primary)
npm run test:jest

# Automated integration test runner
npm test

# Quick smoke test (critical endpoints)
npm run test:quick

# Watch mode for development
npm run test:watch
```

## Test Types and Requirements

### 1. Unit Tests

**Purpose:** Test individual functions, methods, and classes in isolation.

**Location:** `tests/unit/*.test.ts`

**Requirements:**
- Every public function/method must have unit tests
- Test all branches and error paths
- Use descriptive test names following `should [expected behavior] when [condition]`
- Mock external dependencies (network, database, file system)
- Aim for >80% code coverage within a module

**Example Structure:**

```typescript
describe("ModuleName", () => {
  let instance: ClassName;

  beforeEach(() => {
    instance = new ClassName(dependencies);
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe("methodName", () => {
    it("should return expected value when conditions are met", async () => {
      const input = { /* test data */ };
      const result = await instance.methodName(input);
      expect(result).toEqual(expectedValue);
    });

    it("should throw error when invalid input provided", async () => {
      await expect(instance.methodName(invalid)).rejects.toThrow();
    });
  });
});
```

### 2. Integration Tests

**Purpose:** Test interactions between multiple modules/services.

**Location:** `tests/integration/*.test.ts`

**Requirements:**
- Test API endpoints with actual service interactions
- Use test databases/environments when applicable
- Validate request/response contracts
- Test error flows and edge cases
- Use real or realistic mock data

**Example:**

```typescript
describe("AgentRegistry Integration", () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry(logger);
  });

  it("should successfully register and retrieve agent", async () => {
    await registry.registerAgent(agentConfig);
    const agent = registry.getAgent("test-agent");
    expect(agent).toBeDefined();
  });
});
```

### 3. API/Endpoint Tests

**Purpose:** Validate HTTP endpoint behavior and response contracts.

**Location:** `tests/*.test.ts` or test runners in `tests/`

**Requirements:**
- Test all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Verify response status codes
- Validate response body structure and types
- Test authentication/authorization flows
- Include error cases (400, 401, 403, 404, 500)

**Coverage:**
- Health checks: 10 endpoints ✅
- Authentication: 15 endpoints ✅
- Agent Management: 15 endpoints ✅
- System Management: 10 endpoints ✅
- Batch Operations: 5 endpoints ✅
- Individual Agents: 259+ endpoints ✅

### 4. Performance Tests

**Purpose:** Validate performance characteristics and detect regressions.

**Location:** `tests/performance-benchmark.ts`

**Requirements:**
- Measure execution time for critical operations
- Set baseline thresholds per operation type
- Alert on regressions >10% from baseline
- Document expected performance targets

**Thresholds:**
- Health checks: < 50ms
- Agent queries: < 100ms
- Analytics: < 200ms
- Complex operations: < 500ms

### 5. Security Tests

**Purpose:** Validate security controls and identify vulnerabilities.

**Location:** `tests/security-audit.ts` or `test-security.ts`

**Requirements:**
- Test authentication enforcement
- Validate authorization rules
- Check for SQL injection vulnerabilities
- Verify secure headers are present
- Test input validation and sanitization
- Validate JWT token handling

### 6. Load/Stress Tests

**Purpose:** Validate system behavior under high load.

**Location:** `tests/stress-test.ts` or `tests/load-test.yml`

**Requirements:**
- Simulate concurrent users
- Measure response times under load
- Identify resource bottlenecks
- Test graceful degradation
- Validate error handling at scale

### 7. Data Integrity Tests

**Purpose:** Ensure data consistency and correctness.

**Location:** `tests/data-integrity-test.ts`

**Requirements:**
- Validate database constraints
- Test transaction handling
- Check for race conditions
- Verify data consistency across operations

## Coverage Requirements

### Code Coverage Targets

| Metric | Target | Minimum |
|--------|--------|---------|
| Lines | 80% | 70% |
| Branches | 75% | 60% |
| Functions | 80% | 70% |
| Statements | 80% | 70% |

### Coverage Exclusions

- `src/**/*.d.ts` - Type definition files
- `src/**/index.ts` - Re-export files (if only re-exports)
- Auto-generated files
- Configuration files
- Entry points that require manual testing

### Generate Coverage Report

```bash
npm run test:jest -- --coverage
```

## Test Naming Conventions

### Test Suites

```typescript
describe("[Module/Feature Name]", () => {
  // Use feature or module name
});

describe("[Class Name]", () => {
  // Use class name for class tests
});
```

### Test Cases

Use BDD-style naming:

- ✅ `"should return value when condition"` - Good
- ✅ `"should throw error on invalid input"` - Good
- ✅ `"should update database with new record"` - Good
- ❌ `"test1"` - Bad
- ❌ `"works"` - Bad
- ❌ `"invalid scenario"` - Bad

## Test Data and Fixtures

### Fixture Location

Store test fixtures in:
- `tests/fixtures/` - Static test data
- `tests/mocks/` - Mock objects and functions
- Inline factory functions for dynamic data

### Factory Pattern

```typescript
// tests/factories/agent.factory.ts
export function createMockAgent(overrides?: Partial<Agent>): Agent {
  return {
    agentId: "test-agent",
    version: "1.0.0",
    status: AgentStatus.ONLINE,
    ...overrides,
  };
}
```

## Mocking and Dependencies

### When to Mock

- External API calls
- Database operations
- File system operations
- Network requests
- Date/time (when determinism needed)

### When NOT to Mock

- Core business logic
- Error handling paths
- Integration between modules
- Database transactions

### Mocking Patterns

```typescript
// Using Jest mocks
jest.mock("../module", () => ({
  externalService: {
    call: jest.fn().mockResolvedValue(expectedData),
  },
}));

// Using dependency injection for testability
const instance = new Service(mockDependency);
```

## Asynchronous Testing

### Async/Await Pattern (Recommended)

```typescript
it("should handle async operation", async () => {
  const result = await asyncFunction();
  expect(result).toEqual(expected);
});
```

### Promises with done() Callback

```typescript
it("should handle promise", (done) => {
  promise.then((result) => {
    expect(result).toEqual(expected);
    done();
  });
});
```

### Timeouts for Long-Running Tests

```typescript
it("should complete within timeout", async () => {
  jest.setTimeout(60000); // 60 seconds for this test
  const result = await longRunningOperation();
  expect(result).toBeDefined();
});
```

## Error Handling in Tests

### Testing Thrown Errors

```typescript
// Test synchronous error
expect(() => {
  throwingFunction();
}).toThrow("expected message");

// Test async error
await expect(asyncThrowingFunction()).rejects.toThrow("expected message");
```

### Testing Error Properties

```typescript
await expect(operation()).rejects.toMatchObject({
  statusCode: 404,
  message: "Not found",
});
```

## Test Isolation and Cleanup

### Setup and Teardown

```typescript
beforeEach(() => {
  // Setup before each test
  // Create fresh instances
});

afterEach(() => {
  // Cleanup after each test
  // Clear mocks, close connections
  jest.clearAllMocks();
});

beforeAll(() => {
  // Setup once before all tests
});

afterAll(() => {
  // Cleanup once after all tests
});
```

### Avoiding Test Interdependence

- ❌ Tests should not depend on execution order
- ❌ Tests should not share state
- ✅ Each test should be independently runnable
- ✅ Use fresh instances in beforeEach

## Running Tests

### Run All Tests

```bash
npm run test:jest
npm test  # includes integration tests
```

### Run Specific Test File

```bash
npm run test:jest -- tests/unit/specific.test.ts
```

### Run Tests Matching Pattern

```bash
npm run test:jest -- --testNamePattern="should return value"
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:jest -- --coverage
```

## CI/CD Integration

### Pre-commit Checks

Tests configured in `lint-staged` and `.husky/pre-commit`:
- Lint fixes
- Type checking
- Quick smoke tests

### Pre-push Checks

`package.json` script `"prepush"` runs:
- All lint checks
- Code analysis
- Quick test suite

### Continuous Integration

GitHub Actions workflows validate:
- All unit tests pass
- Code coverage meets thresholds
- Integration tests pass
- No security vulnerabilities

## Performance and Optimization

### Test Execution Time

- Individual unit test: < 100ms
- Full test suite: < 5 minutes
- Quick smoke test: < 1 minute

### Optimization Strategies

- Use `test.only()` during development (remove before commit)
- Run tests in parallel (Jest default)
- Mock I/O operations
- Use test fixtures instead of creating data repeatedly
- Disable logging in tests

### Debugging Tests

```bash
# Run with detailed output
npm run test:jest -- --verbose

# Debug specific test
node --inspect-brk node_modules/.bin/jest tests/specific.test.ts
```

## Common Issues and Solutions

### Tests Fail Intermittently

**Cause:** Async timing issues, shared state, or flaky assertions

**Solution:**
- Ensure promises are properly awaited
- Use `beforeEach` to reset state
- Increase timeout for flaky operations
- Mock time-dependent operations

### Coverage Not Meeting Targets

**Cause:** Untested branches or error paths

**Solution:**
- Review coverage report: `npm run test:jest -- --coverage`
- Add tests for error paths
- Test conditional branches
- Add integration tests for complex flows

### Mock Not Working

**Cause:** Incorrect mock path or module resolution

**Solution:**
- Verify mock path matches actual import
- Check `moduleNameMapper` in `jest.config.js`
- Use explicit mock functions for clarity

## Related Standards

- [WORKFLOW-TEST-ENFORCEMENT.md](./WORKFLOW-TEST-ENFORCEMENT.md) - Test enforcement workflow
- [WORKFLOW-MISSING-TEST-FILES.md](./WORKFLOW-MISSING-TEST-FILES.md) - Missing test detection
- [CODING-STANDARDS.md](../CODING-STANDARDS.md) - Code quality standards
- [Static Analysis Rules](./STATIC-ANALYSIS-TEST-RULES.md) - Linting and quality checks

## Enforcement

All changes to `src/**` files must:

1. ✅ Include appropriate tests (unit, integration, or both)
2. ✅ Maintain or improve code coverage
3. ✅ Pass all existing tests
4. ✅ Follow BDD naming conventions
5. ✅ Include error path tests
6. ✅ Run without warnings or flakiness

Violations result in:
- PR review rejection
- CI/CD pipeline failure
- Commit hook prevention
