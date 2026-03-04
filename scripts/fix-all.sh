#!/bin/bash
# Auto-fix script for code quality issues

set -e

echo "========================================="
echo "AUTO-FIXING CODE ISSUES"
echo "========================================="
echo ""

# 1. Format code with Prettier
echo "🎨 Formatting code with Prettier..."
npx prettier --write "src/**/*.ts"
echo "✓ Prettier formatting complete"
echo ""

# 2. Auto-fix ESLint issues
echo "📋 Auto-fixing ESLint issues..."
npx eslint "src/**/*.ts" --fix
echo "✓ ESLint auto-fix complete"
echo ""

# 3. Organize imports (if available)
if command -v organize-imports-cli &> /dev/null; then
  echo "📦 Organizing imports..."
  npx organize-imports-cli "src/**/*.ts"
  echo "✓ Imports organized"
  echo ""
fi

# 4. Remove unused imports (if available)
if command -v ts-prune &> /dev/null; then
  echo "🧹 Checking for unused imports..."
  npx ts-prune --error || true
  echo "✓ Unused imports checked"
  echo ""
fi

echo "========================================="
echo "AUTO-FIX COMPLETE"
echo "========================================="
echo ""
echo "Run 'npm run lint' to verify all issues are fixed"
