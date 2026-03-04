#!/bin/bash
# Pre-release validation check script

set -e

echo "========================================="
echo "PRE-RELEASE VALIDATION CHECK"
echo "========================================="
echo ""

ERRORS=0
WARNINGS=0

# Helper function
check_pass() {
    echo "✓ $1"
}

check_fail() {
    echo "✗ $1"
    ((ERRORS++))
}

check_warn() {
    echo "⚠ $1"
    ((WARNINGS++))
}

echo "1. Checking code quality..."
if npm run lint:eslint > /dev/null 2>&1; then
    check_pass "ESLint passed"
else
    check_fail "ESLint failed"
fi

if npm run lint:prettier > /dev/null 2>&1; then
    check_pass "Prettier passed"
else
    check_fail "Prettier failed"
fi

if npm run lint:types > /dev/null 2>&1; then
    check_pass "TypeScript type check passed"
else
    check_fail "TypeScript type check failed"
fi
echo ""

echo "2. Checking dependencies..."
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || echo '{}')
CRITICAL=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
HIGH=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
MODERATE=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.moderate // 0' 2>/dev/null || echo "0")

if [ "$CRITICAL" -eq 0 ] && [ "$HIGH" -eq 0 ]; then
    check_pass "No critical or high vulnerabilities"
else
    check_fail "Found $CRITICAL critical and $HIGH high vulnerabilities"
fi

if [ "$MODERATE" -gt 0 ]; then
    check_warn "$MODERATE moderate vulnerabilities found"
fi
echo ""

echo "3. Checking build..."
if npm run build > /dev/null 2>&1; then
    check_pass "Build successful"
else
    check_fail "Build failed"
fi
echo ""

echo "4. Running tests..."
if npm run test:quick > /dev/null 2>&1; then
    check_pass "Quick tests passed"
else
    check_fail "Quick tests failed"
fi
echo ""

echo "5. Checking code metrics..."
npm run analyze > /dev/null 2>&1 || true

# Check for large files
if command -v find &> /dev/null && command -v wc &> /dev/null; then
    LARGE_FILES=$(find src -name "*.ts" -type f -exec wc -l {} \; 2>/dev/null | awk '$1 > 500 {print $2}' | wc -l || echo "0")
    if [ "$LARGE_FILES" -gt 0 ]; then
        check_warn "$LARGE_FILES files exceed 500 lines"
    else
        check_pass "No files exceed 500 lines"
    fi
else
    check_warn "Could not check file sizes (find/wc not available)"
fi

# Check complexity
COMPLEX_FILES=$(npx eslint "src/**/*.ts" --rule "complexity: [error, 20]" --format json 2>/dev/null | jq '[.[].messages[]] | length' 2>/dev/null || echo "0")
if [ "$COMPLEX_FILES" -eq 0 ]; then
    check_pass "No files with excessive complexity"
else
    check_warn "$COMPLEX_FILES files with high complexity"
fi
echo ""

echo "6. Checking documentation..."
if [ -f "README.md" ]; then
    check_pass "README.md exists"
else
    check_fail "README.md missing"
fi

if [ -f "COMPLETE_API_DOCUMENTATION.md" ]; then
    check_pass "API documentation exists"
else
    check_warn "API documentation missing"
fi
echo ""

echo "========================================="
echo "PRE-RELEASE CHECK COMPLETE"
echo "========================================="
echo ""
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ "$ERRORS" -eq 0 ]; then
    echo "✓ All checks passed! Ready for release."
    exit 0
else
    echo "✗ Found $ERRORS error(s). Please fix before release."
    exit 1
fi
