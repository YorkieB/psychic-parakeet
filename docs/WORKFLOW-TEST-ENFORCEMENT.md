# Workflow: Test Enforcement

This document defines the Test Enforcement workflow for the Jarvis repository. It ensures all code changes include appropriate tests and maintain quality standards.

## Overview

The Test Enforcement workflow validates:
- All source file changes have corresponding tests
- Tests cover new behaviors and error paths
- Code coverage thresholds are maintained
- Test execution passes without failures
- Test code follows naming and structure conventions

## Scope

This workflow applies to:
- All pull requests affecting `src/**` files
- All direct commits to `master` branch
- Feature branch code reviews
- Automated enforcement on CI/CD

## Test Types by Change

### New Feature Implementation

| Test Type | Required | Coverage Target |
|-----------|----------|-----------------|
| Unit Tests | ✅ Yes | >80% for new code |
| Integration Tests | ⚠️ If cross-module | >75% for interactions |
| API/Endpoint Tests | ✅ Yes (if applicable) | All endpoints |
| Error Path Tests | ✅ Yes | All error branches |
| Performance Tests | ⚠️ For critical paths | < defined thresholds |

**Example:**
- Implementing new REST endpoint → Unit + Integration + API tests required
- Adding utility function → Unit tests + error paths required
- Modifying existing code → Tests must be updated

### Bug Fixes

| Test Type | Required | Note |
|-----------|----------|------|
| Regression Tests | ✅ Yes | Verify bug is fixed |
| Error Path Tests | ✅ Yes | Cover condition that caused bug |
| Unit Tests | ⚠️ If logic changed | Update existing tests |
| Integration Tests | ⚠️ If interactions changed | Update as needed |

**Example:**
- Fixing authentication logic → Add test that verifies correct auth flow
- Fixing null pointer error → Test that null/undefined is handled

### Refactoring

| Test Type | Required | Note |
|-----------|----------|------|
| All existing tests | ✅ Must pass | Behavior unchanged |
| New tests | ❌ No | Unless improving coverage |
| Coverage | ✅ Maintain | Cannot decrease |

**Example:**
- Extracting method to utility file → All existing tests still pass
- Reorganizing module structure → All tests pass without changes

## Pre-Commit Enforcement

### Automated Checks

Run automatically before commit (via `.husky/pre-commit`):

```bash
# 1. Lint staged files
lint-staged

# 2. Type checking
npm run typecheck

# 3. Quick test suite
npm run test:quick
```

**Failure Action:** Commit blocked until issues resolved

### Manual Verification

Before pushing changes:

```bash
# Run all tests for affected modules
npm run test:jest

# Check coverage
npm run test:jest -- --coverage

# Verify types
npm run typecheck
```

## Pull Request Enforcement

### Required Checks

All PRs must pass:

1. ✅ **Lint Checks** - No eslint/prettier violations
2. ✅ **Type Checks** - TypeScript types valid
3. ✅ **Test Execution** - All tests pass (no failures, flakes)
4. ✅ **Code Coverage** - Thresholds maintained
5. ✅ **Test Quality** - Naming, structure conventions followed

### Review Checklist

PR reviewers verify:

- [ ] All changed `src/**` files have corresponding tests
- [ ] Tests cover new behaviors/branches
- [ ] Error paths are tested
- [ ] Test names follow BDD conventions (`should...when...`)
- [ ] Mocks are appropriate and necessary
- [ ] No flaky or timing-dependent tests
- [ ] Coverage thresholds not decreased
- [ ] Tests follow project structure conventions

### Automated CI/CD Validation

GitHub Actions workflow runs:

```yaml
name: Test Enforcement
on: [pull_request]
jobs:
  test-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint:all
      - run: npm run typecheck
      - run: npm run test:jest -- --coverage
      - run: npm run test:quick
```

**Failure blocks merge** until resolved.

## Coverage Requirements

### Minimum Thresholds

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Lines | 80% | 70% |
| Branches | 75% | 60% |
| Functions | 80% | 70% |
| Statements | 80% | 70% |

### Coverage Exceptions

Files that can be excluded (documented):
- `src/**/*.d.ts` - Type definitions
- Configuration entry points
- Auto-generated code
- Platform-specific implementations (with justification)

### Coverage Report Generation

```bash
npm run test:jest -- --coverage
# Report available in: coverage/lcov-report/index.html
```

## Test Execution Requirements

### Before Commit

```bash
npm run test:quick   # Essential quick tests
npm run lint:all     # All lint checks
npm run typecheck    # Type validation
```

### Before Push

```bash
npm run test:jest    # Full test suite
npm run test:jest -- --coverage  # Coverage verification
```

### Before Release

```bash
npm run test:all     # Complete test suite
npm run test:performance  # Performance regression check
npm run test:security    # Security validation
```

## Test File Placement

### Standard Location

```
src/
  modules/
    example/
      example.ts
      
tests/
  unit/
    example.test.ts
  integration/
    example.integration.test.ts
```

### File Naming Convention

- Test file mirrors source file path
- Add `.test.ts` or `.spec.ts` extension
- Location under `tests/` directory

**Examples:**
- `src/orchestrator/agent-registry.ts` → `tests/unit/orchestrator/agent-registry.test.ts`
- `src/api/auth.ts` → `tests/unit/api/auth.test.ts`
- `src/services/llm.ts` → `tests/integration/services/llm.integration.test.ts`

## Test Structure Requirements

### Describe Blocks

```typescript
// ✅ Good
describe("AgentRegistry", () => {
  describe("registerAgent", () => {
    // tests
  });
});

// ❌ Bad
describe("test suite", () => {
  // tests
});
```

### Test Names (BDD Style)

```typescript
// ✅ Good
it("should register agent with valid config", () => {});
it("should throw error when agentId is missing", () => {});
it("should return registered agent when queried", () => {});

// ❌ Bad
it("registers agent", () => {});
it("test agent registration", () => {});
it("it works", () => {});
```

### Setup/Teardown

```typescript
beforeEach(() => {
  // Create fresh instances
  registry = new AgentRegistry(logger);
});

afterEach(() => {
  // Cleanup
  jest.clearAllMocks();
  registry?.stopHealthChecks?.();
});
```

## Error Path Testing

### Required Tests for Error Scenarios

For each function, test:

1. **Happy Path** - Normal operation
2. **Invalid Input** - Null, undefined, wrong type
3. **Business Logic Errors** - Validation failures
4. **System Errors** - Network, database failures
5. **Edge Cases** - Boundaries, limits, concurrent operations

### Error Testing Pattern

```typescript
describe("processData", () => {
  it("should process valid data", async () => {
    const result = await processData(validData);
    expect(result).toEqual(expected);
  });

  it("should throw error on null input", async () => {
    await expect(processData(null)).rejects.toThrow();
  });

  it("should throw error on invalid type", async () => {
    await expect(processData("invalid")).rejects.toThrow();
  });

  it("should handle network error gracefully", async () => {
    mockNetworkCall.mockRejectedValueOnce(new Error("Network error"));
    await expect(processData(data)).rejects.toThrow("Network error");
  });
});
```

## Integration Test Requirements

### Database Tests

- Use test database or in-memory fixtures
- Test transaction handling
- Validate constraints
- Test concurrent access

### API Endpoint Tests

- Test all HTTP methods
- Validate request/response contracts
- Test authentication/authorization
- Test error responses
- Validate status codes

### Service Integration Tests

- Test service-to-service communication
- Mock external APIs
- Test error handling
- Validate timeout behavior

## Performance Test Requirements

### When Required

- Critical path operations (< 100ms expected)
- Database queries
- Algorithm-heavy operations
- API endpoints under load

### What to Measure

```typescript
it("should complete within 100ms", () => {
  const start = performance.now();
  const result = processData(largeDataSet);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});
```

## Mocking Requirements

### Mock Usage Policy

**Mock When:**
- ✅ Testing external API calls
- ✅ Testing database operations
- ✅ Testing file system operations
- ✅ Testing time-dependent code

**Don't Mock When:**
- ❌ Testing core business logic
- ❌ Testing error handling
- ❌ Testing real-world behavior
- ❌ Testing module integration

### Mock Creation Patterns

```typescript
// Using factory functions (recommended)
const mockAgent = createMockAgent({ agentId: "test" });

// Using jest.mock()
jest.mock("../external-service", () => ({
  call: jest.fn().mockResolvedValue(data),
}));

// Using dependency injection
const service = new Service(mockDependency);
```

## Test Flakiness Prevention

### Common Causes

- ❌ Hard-coded timeouts
- ❌ Timing-dependent assertions
- ❌ Shared state between tests
- ❌ Non-deterministic behavior
- ❌ External system dependencies

### Prevention Strategies

```typescript
// ✅ Use async/await, not timeouts
await waitFor(() => expect(element).toBeVisible());

// ✅ Mock time for deterministic tests
jest.useFakeTimers();
jest.advanceTimersByTime(1000);

// ✅ Use beforeEach to reset state
beforeEach(() => {
  jest.clearAllMocks();
  setupFreshInstance();
});

// ✅ Avoid external dependencies
jest.mock("external-service");
```

## Test Review Criteria

### What Reviewers Check

1. **Coverage** - New code has tests
2. **Quality** - Tests are meaningful, not trivial
3. **Structure** - Follows conventions
4. **Isolation** - Tests don't depend on execution order
5. **Naming** - BDD style, describes behavior
6. **Error Paths** - Edge cases tested
7. **Mocks** - Used appropriately
8. **Documentation** - Complex tests explained

### Common Review Comments

- ❌ "This function has no tests" → Add unit tests
- ❌ "Test name doesn't describe behavior" → Rename to BDD style
- ❌ "Missing error path tests" → Add tests for error conditions
- ❌ "Test is flaky" → Fix timing/state issues
- ❌ "Assertion is too broad" → Be specific about expectations

## Enforcement Actions

### Automated Enforcement

1. **Pre-commit Hook** (`.husky/pre-commit`)
   - Blocks commit if tests fail
   - Blocks commit if lint issues
   - Runs quick test suite

2. **CI/CD Pipeline** (GitHub Actions)
   - Runs full test suite
   - Validates coverage thresholds
   - Blocks merge if tests fail

### Manual Enforcement

1. **Code Review** (PR reviewers)
   - Check test coverage
   - Verify test quality
   - Ensure error paths tested

2. **Release Validation** (Release manager)
   - Run full test suite
   - Verify performance
   - Sign off on quality

## Exceptions and Escalation

### When to Request Exception

File an exception if:
- Testing requires setup not feasible in CI
- External system dependency unavoidable
- Performance requirements conflict with test coverage
- Test would be brittle/flaky

### Exception Process

1. Document reason in PR comment
2. Link to related GitHub issue
3. Get approval from code lead
4. Mark with `test-exception` label
5. Document in [TESTING-STANDARDS.md](./TESTING-STANDARDS.md) for future reference

## Related Documents

- [TESTING-STANDARDS.md](./TESTING-STANDARDS.md) - Detailed testing standards
- [WORKFLOW-MISSING-TEST-FILES.md](./WORKFLOW-MISSING-TEST-FILES.md) - Identify untested files
- [STATIC-ANALYSIS-TEST-RULES.md](./STATIC-ANALYSIS-TEST-RULES.md) - Code quality validation
- [AGENTS.md](../AGENTS.md) - Test Guardian role definition

## Troubleshooting

### Tests Fail Locally But Pass in CI

**Cause:** Environment differences, timing issues

**Solution:**
- Run in CI environment: `npm run test:jest`
- Check environment variables
- Increase test timeout
- Check for flakiness

### Coverage Threshold Not Met

**Cause:** Untested code paths

**Solution:**
- Review coverage report: `npm run test:jest -- --coverage`
- Add tests for uncovered branches
- Document exclusions if justified

### CI Test Validation Fails

**Solution:**
- Run tests locally: `npm run test:jest`
- Check for environment-specific issues
- Verify mock setup
- Check test isolation

## Questions and Support

For questions about this workflow:
1. Review [TESTING-STANDARDS.md](./TESTING-STANDARDS.md)
2. Check existing test examples
3. Ask in code review or team discussion
4. Update this document if clarifications needed
