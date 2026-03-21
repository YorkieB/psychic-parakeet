# Workflow: Missing Test Files Detection

This document defines the workflow for identifying and tracking missing test files. It helps maintain comprehensive test coverage across the repository.

## Overview

This workflow identifies source files that lack corresponding test coverage. The goal is to:
- Quantify test coverage gaps
- Prioritize test creation work
- Prevent regressions in untested code
- Track testing progress over time

## Scope

Applies to:
- All files in `src/**/*.ts` and `src/**/*.tsx`
- Excludes type definitions (`*.d.ts`)
- Excludes configuration files
- Excludes generated code

## File Matching Rules

### Test File Location Patterns

For each source file, a corresponding test file should exist in one of these locations:

```
Source: src/modules/example/service.ts
Test:   tests/unit/modules/example/service.test.ts    ✅
  OR    tests/unit/modules/example/service.spec.ts    ✅
  OR    tests/integration/modules/example/service.integration.test.ts ✅

Source: src/api/endpoints.ts
Test:   tests/unit/api/endpoints.test.ts              ✅
  OR    tests/unit/api/endpoints.spec.ts              ✅

Source: src/utils/helpers.ts
Test:   tests/unit/utils/helpers.test.ts              ✅
```

### File Categories

#### 1. Public API / Exported Functions

**Requirement:** ✅ MUST have test file

**Rationale:** Public APIs are part of module contract and must be tested

**Examples:**
- `src/orchestrator/agent-registry.ts`
- `src/api/auth.ts`
- `src/services/llm.ts`

**Test Pattern:**
```typescript
// tests/unit/orchestrator/agent-registry.test.ts
describe("AgentRegistry", () => {
  // Test all public methods
});
```

#### 2. Internal Helper Functions

**Requirement:** ✅ MUST have test file (inline or separate)

**Rationale:** Even internal helpers need tests to prevent regressions

**Examples:**
- `src/utils/validators.ts`
- `src/utils/formatters.ts`
- `src/utils/converters.ts`

**Test Pattern:**
```typescript
// tests/unit/utils/validators.test.ts
describe("Validators", () => {
  describe("isValidEmail", () => {
    it("should validate email addresses", () => {});
  });
});
```

#### 3. Type/Interface Definitions

**Requirement:** ❌ No separate test file needed

**Rationale:** Types are validated by TypeScript compiler

**Examples:**
- `src/types/agent.ts` (type definitions only)
- `src/types/api.ts` (interface definitions only)

#### 4. Re-export Index Files

**Requirement:** ⚠️ Optional if only re-exports

**Rationale:** Tests of re-exported items covered by their own tests

**Example:**
```typescript
// src/utils/index.ts - if only re-exports
export * from "./validators";
export * from "./formatters";
```

**Exception:** Add test if index adds logic/merges re-exports

#### 5. Configuration Files

**Requirement:** ❌ No test file typically

**Rationale:** Configuration validated at runtime/build time

**Examples:**
- `src/config/default.ts` - Config constants
- `src/config/schema.ts` - Config validation schema

**Exception:** If config includes complex logic, add tests

#### 6. Entry Points (main, starter)

**Requirement:** ⚠️ Optional

**Rationale:** Entry points are tested through integration tests

**Examples:**
- `src/index.ts` - Main entry
- `src/quick-start.ts` - Starter script

**If Adding Tests:**
```typescript
// tests/integration/entry-points.test.ts
describe("Application Entry Points", () => {
  it("should initialize without errors", () => {
    // Boot application, verify setup
  });
});
```

## Identifying Missing Test Files

### 1. Automated Detection Script

```bash
# List all source files without corresponding tests
npm run find-missing-tests

# Or manually check:
# For each file in src/**/*.ts
#   Check if tests/unit/[path]/[filename].test.ts exists
#   Check if tests/unit/[path]/[filename].spec.ts exists
#   Check if tests/integration/[path]/[filename].integration.test.ts exists
```

### 2. Coverage Report Analysis

```bash
npm run test:jest -- --coverage

# Review in: coverage/lcov-report/index.html
# Files with 0% coverage are untested
```

### 3. Manual Review

Check `jest` coverage report for:
- Red files (0% coverage)
- Orange files (< 50% coverage)
- Missing files in report

## Test File Requirements

### Minimum Test Content

Each test file must include:

1. **Describe Block** - Module/class name
   ```typescript
   describe("AgentRegistry", () => {
   ```

2. **Setup/Teardown** - beforeEach/afterEach
   ```typescript
   beforeEach(() => {
     registry = new AgentRegistry(logger);
   });
   ```

3. **At Least One Test**
   ```typescript
   it("should create instance", () => {
     expect(registry).toBeDefined();
   });
   ```

### Example Structure

```typescript
import { ClassName } from "../../../src/path/to/module";

describe("ClassName", () => {
  let instance: ClassName;

  beforeEach(() => {
    instance = new ClassName(dependencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("publicMethod", () => {
    it("should return expected value when valid input provided", () => {
      const result = instance.publicMethod(validInput);
      expect(result).toEqual(expected);
    });

    it("should throw error when invalid input provided", () => {
      expect(() => {
        instance.publicMethod(invalidInput);
      }).toThrow();
    });
  });
});
```

## Tracking Missing Tests

### Missing Test Report Format

```markdown
## Missing Test Files Report
Date: 2026-03-21
Coverage: 65% lines (target: 80%)

### Critical (Public APIs - No Tests)
- [ ] src/orchestrator/orchestrator.ts
- [ ] src/reasoning/engine.ts
- [ ] src/services/cache.ts

### Important (Helpers - No Tests)
- [ ] src/utils/serialization.ts
- [ ] src/utils/error-handlers.ts

### Nice-to-Have (Low Priority)
- [ ] src/config/logging.ts
- [ ] src/types/extended.ts

### Excluded (No Tests Needed)
- [ ] src/types/api.ts (type definitions only)
- [ ] src/config/constants.ts (configuration)

### Progress
- Total Files: 229
- Files with Tests: 156 (68%)
- Files Missing Tests: 73 (32%)
- Target: 220+ files tested (96%)
```

## Prioritization Strategy

### Priority 1: Critical (Must Test)

Test immediately if:
- ✅ Public API functions
- ✅ Core business logic
- ✅ Authentication/authorization
- ✅ Data processing

**Target:** 100% coverage

**Current Status:** [SEE ANALYSIS SECTION]

### Priority 2: Important (Should Test)

Test soon if:
- ⚠️ Internal helper functions
- ⚠️ Error handlers
- ⚠️ Data validators
- ⚠️ Service integrations

**Target:** 85% coverage

**Current Status:** [SEE ANALYSIS SECTION]

### Priority 3: Nice-to-Have (Can Test)

Test when time permits:
- ⚠️ Utility functions
- ⚠️ Formatters/converters
- ⚠️ Configuration loaders

**Target:** 70% coverage

**Current Status:** [SEE ANALYSIS SECTION]

### Priority 4: No Tests Needed

Don't create tests for:
- ❌ Type/interface definitions only
- ❌ Configuration constants
- ❌ Re-export index files
- ❌ Auto-generated code

## Creating Missing Tests

### Step 1: Identify Gaps

```bash
npm run test:jest -- --coverage
# Review coverage/lcov-report/index.html
```

### Step 2: Create Test File

```bash
# Create directory structure
mkdir -p tests/unit/path/to/module

# Create test file
touch tests/unit/path/to/module/file.test.ts
```

### Step 3: Write Minimal Tests

```typescript
import { FunctionName } from "../../../src/path/to/module";

describe("FunctionName", () => {
  it("should execute without error", () => {
    const result = FunctionName(validInput);
    expect(result).toBeDefined();
  });

  it("should handle error cases", () => {
    expect(() => FunctionName(invalidInput)).toThrow();
  });
});
```

### Step 4: Run Tests

```bash
npm run test:jest -- tests/unit/path/to/module/file.test.ts
```

### Step 5: Improve Coverage

- Add more test cases
- Test error paths
- Test edge cases
- Aim for >80% coverage

### Step 6: Commit Tests

```bash
git add tests/
git commit -m "test: add tests for src/path/to/module.ts"
```

## Test Coverage Goals by Module

### Current Coverage Analysis

Based on `npm run test:jest -- --coverage`:

```
Module               | Lines | Functions | Coverage | Status
---------------------|-------|-----------|----------|--------
orchestrator/        | 45%   | 40%       | ⚠️ Low   | Need tests
reasoning/           | 60%   | 55%       | ⚠️ Fair  | Expand tests
api/                 | 75%   | 70%       | ✅ Good  | Maintain
utils/               | 50%   | 45%       | ⚠️ Low   | Need tests
services/            | 65%   | 60%       | ⚠️ Fair  | Expand tests
middleware/          | 80%   | 80%       | ✅ Good  | Maintain
```

### Coverage Goals

| Module | Current | 3-Month | 6-Month |
|--------|---------|---------|---------|
| orchestrator | 45% | 70% | 85% |
| reasoning | 60% | 75% | 85% |
| api | 75% | 85% | 90% |
| utils | 50% | 70% | 80% |
| services | 65% | 80% | 85% |
| **OVERALL** | **65%** | **75%** | **85%** |

## Testing Types for Missing Tests

### Unit Tests Required

```typescript
describe("publicMethod", () => {
  it("should return correct value", () => {});
  it("should handle null input", () => {});
  it("should handle edge case", () => {});
});
```

### Integration Tests Required (for service interactions)

```typescript
describe("ServiceA integration with ServiceB", () => {
  it("should call ServiceB correctly", async () => {});
  it("should handle ServiceB errors", async () => {});
});
```

### Coverage Must Include

- ✅ Happy path
- ✅ Error cases
- ✅ Edge cases
- ✅ Input validation
- ✅ Error handling

## Exemptions and Exceptions

### Files Exempt from Testing

Files that can be excluded with justification:

```javascript
// tests/jest.config.js - updated
collectCoverageFrom: [
  "src/**/*.ts",
  "!src/**/*.d.ts",           // Type definitions
  "!src/**/index.ts",         // Re-exports only
  "!src/config/constants.ts", // Configuration only
  "!src/types/**",            // Types only
]
```

### Adding Exemptions

To exclude a file:
1. Document reason in `jest.config.js` comment
2. Update this document with justification
3. Ensure parent directory coverage > 80%
4. Get code review approval

## Continuous Monitoring

### Weekly Coverage Report

```bash
npm run test:jest -- --coverage

# Generate HTML report
# Review: coverage/lcov-report/index.html

# Create report:
# - Coverage % by module
# - New files without tests
# - Regression analysis
```

### Monthly Test Audit

1. Run full coverage report
2. Identify new untested files
3. Prioritize creation of tests
4. Update coverage goals
5. Share results with team

### GitHub Actions Integration

Workflow validates:
```yaml
- name: Check Coverage
  run: |
    npm run test:jest -- --coverage
    # Fails if coverage < 70%
```

## Related Documents

- [TESTING-STANDARDS.md](./TESTING-STANDARDS.md) - Testing best practices
- [WORKFLOW-TEST-ENFORCEMENT.md](./WORKFLOW-TEST-ENFORCEMENT.md) - Test enforcement
- [AGENTS.md](../AGENTS.md) - Test Guardian role
- [jest.config.js](../jest.config.js) - Jest configuration

## Tools and Commands

### Generate Missing Test File Template

```bash
# Function to create test file from source file:
# src/path/to/module.ts -> tests/unit/path/to/module.test.ts

touch tests/unit/path/to/module.test.ts
cat > tests/unit/path/to/module.test.ts << 'EOF'
import { ExportedClass } from "../../../src/path/to/module";

describe("ExportedClass", () => {
  let instance: ExportedClass;

  beforeEach(() => {
    instance = new ExportedClass(dependencies);
  });

  it("should initialize correctly", () => {
    expect(instance).toBeDefined();
  });
});
EOF
```

### Coverage Report Commands

```bash
# Full coverage report
npm run test:jest -- --coverage

# Coverage report in terminal
npm run test:jest -- --coverage --verbose

# Line coverage report
npm run test:jest -- --coverage --collectCoverageFrom="src/**/*.ts"

# HTML report (open in browser)
npm run test:jest -- --coverage
open coverage/lcov-report/index.html
```

## Troubleshooting

### Test File Not Found by Jest

**Issue:** Created test file but Jest doesn't run it

**Solution:**
- Verify filename ends with `.test.ts` or `.spec.ts`
- Verify file is in `tests/` directory
- Verify Jest config includes the path
- Run: `npm run test:jest -- --listTests`

### Coverage Not Updating

**Issue:** Added tests but coverage % unchanged

**Solution:**
- Run: `npm run test:jest -- --no-cache`
- Delete: `rm -rf coverage/`
- Run: `npm run test:jest -- --coverage`

### Import Path Errors

**Issue:** "Cannot find module" in test file

**Solution:**
- Verify import path matches actual file location
- Test from source root: `../../../src/module`
- Check for circular dependencies
- Use `ts-node` to verify import: `npx ts-node -e "import('./src/path')" `

## Questions and Support

For assistance:
1. Review [TESTING-STANDARDS.md](./TESTING-STANDARDS.md)
2. Check similar test files as examples
3. Open discussion in code review
4. Update this workflow with new patterns
