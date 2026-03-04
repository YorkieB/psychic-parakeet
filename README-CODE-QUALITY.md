# Jarvis v4.0 - Code Quality & Standards Suite

Comprehensive code quality checking, linting, formatting, and standards enforcement.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Quality Checks
```bash
npm run quality
# or
npm run lint:all
```

## 📋 Available Commands

### Linting
```bash
# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Run comprehensive quality check (all tools)
npm run lint:all
```

### Formatting
```bash
# Format all code with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

### Type Checking
```bash
# TypeScript type checking (no emit)
npm run typecheck
```

## 🔍 Quality Checks Included

### 1. **ESLint** - TypeScript Linting
- TypeScript-specific rules
- Security vulnerability detection
- Code complexity analysis
- Import/export validation
- Promise handling
- Node.js best practices

**Configuration:** `.eslintrc.json`

### 2. **Prettier** - Code Formatting
- Consistent code style
- Automatic formatting
- Configurable rules

**Configuration:** `.prettierrc.json`

### 3. **TypeScript Compiler** - Type Checking
- Strict type checking
- Unused variable detection
- Implicit return validation
- Index signature safety

**Configuration:** `tsconfig.json`

### 4. **Dependency Security** - npm audit
- Vulnerability scanning
- Critical/High/Moderate/Low severity
- Security recommendations

### 5. **Code Complexity** - Cyclomatic Complexity
- Function complexity limits
- Nested callback detection
- Max depth enforcement

### 6. **Import Analysis** - Circular Dependencies
- Circular dependency detection
- Import order validation
- Self-import prevention

### 7. **Code Duplication** - Copy/Paste Detection
- Duplicate code detection
- Percentage threshold (5%)
- Refactoring recommendations

### 8. **File Structure** - Directory Validation
- Required directory checks
- Project structure validation

## 📊 Quality Report

After running `npm run lint:all`, a detailed report is generated:

- **Console Output:** Real-time colored output
- **JSON Report:** `code-quality-report.json`

### Report Format
```json
{
  "timestamp": "2026-02-01T15:30:00.000Z",
  "results": [
    {
      "name": "ESLint",
      "passed": true,
      "errors": 0,
      "warnings": 5,
      "duration": 1234
    }
  ],
  "summary": {
    "totalErrors": 0,
    "totalWarnings": 5,
    "allPassed": true
  }
}
```

## ⚙️ Configuration Files

### `.eslintrc.json`
Comprehensive ESLint configuration with:
- TypeScript support
- Security plugins
- Import validation
- Promise handling
- Code complexity rules

### `.prettierrc.json`
Code formatting rules:
- Single quotes
- 2-space indentation
- 100 character line width
- Semicolons enabled
- Trailing commas (ES5)

### `tsconfig.json`
Enhanced TypeScript configuration:
- Strict mode enabled
- All strict checks enabled
- Unused variable detection
- Index signature safety
- Incremental compilation

## 🎯 Quality Standards

### Code Style
- ✅ Single quotes for strings
- ✅ 2-space indentation
- ✅ Max 100 characters per line
- ✅ Semicolons required
- ✅ Trailing commas (ES5)

### TypeScript
- ✅ Strict mode enabled
- ✅ No `any` types (warnings)
- ✅ Explicit return types (warnings)
- ✅ No unused variables/parameters
- ✅ No implicit returns

### Complexity
- ✅ Max cyclomatic complexity: 15
- ✅ Max function depth: 4
- ✅ Max nested callbacks: 3
- ✅ Max parameters: 5
- ✅ Max lines per function: 100

### Security
- ✅ Object injection detection
- ✅ Unsafe regex detection
- ✅ Eval detection
- ✅ Timing attack warnings
- ✅ CSRF protection checks

### Imports
- ✅ Alphabetical ordering
- ✅ No circular dependencies
- ✅ No self-imports
- ✅ No duplicate imports

## 🔧 Pre-commit Hooks

### Recommended Setup
```bash
# Install husky (optional)
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run quality"
```

### Manual Pre-commit
Before committing, run:
```bash
npm run quality
```

## 📈 CI/CD Integration

### GitHub Actions
```yaml
name: Code Quality
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run quality
```

### GitLab CI
```yaml
quality:
  script:
    - npm install
    - npm run quality
```

## 🐛 Troubleshooting

### ESLint Errors
```bash
# Auto-fix what can be fixed
npm run lint:fix

# Check specific file
npx eslint src/path/to/file.ts
```

### Prettier Issues
```bash
# Format all files
npm run format

# Check specific file
npx prettier --check src/path/to/file.ts
```

### TypeScript Errors
```bash
# Check types
npm run typecheck

# See detailed errors
npx tsc --noEmit --pretty
```

### Missing Dependencies
```bash
# Install all quality tools
npm install --save-dev \
  eslint \
  prettier \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-import \
  eslint-plugin-security \
  eslint-plugin-promise \
  eslint-plugin-node \
  eslint-import-resolver-typescript
```

## 📚 Best Practices

1. **Run quality checks before committing**
   ```bash
   npm run quality
   ```

2. **Auto-fix issues when possible**
   ```bash
   npm run lint:fix
   npm run format
   ```

3. **Review warnings** - Not all warnings need fixing, but review them

4. **Keep dependencies updated**
   ```bash
   npm audit
   npm audit fix
   ```

5. **Use TypeScript strictly** - Avoid `any` types

6. **Keep functions small** - Max 100 lines, complexity < 15

7. **Avoid circular dependencies** - Refactor when detected

## 🎯 Quality Metrics

### Target Metrics
- ✅ **0 Errors** - All checks must pass
- ⚠️ **< 10 Warnings** - Keep warnings minimal
- ✅ **100% Type Coverage** - No `any` types
- ✅ **< 5% Code Duplication** - Refactor duplicates
- ✅ **0 Circular Dependencies** - Clean architecture
- ✅ **0 Security Vulnerabilities** - Critical/High only

## 📖 Additional Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [TypeScript Config](https://www.typescriptlang.org/tsconfig)
- [Code Quality Best Practices](./README.md)

---

## ✅ Quick Reference

```bash
# Full quality check
npm run quality

# Individual checks
npm run lint          # ESLint
npm run lint:fix      # Auto-fix ESLint
npm run format        # Format code
npm run format:check  # Check formatting
npm run typecheck     # Type checking
```

**All quality reports saved to:** `code-quality-report.json`
