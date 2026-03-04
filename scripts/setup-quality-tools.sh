#!/bin/bash
# Setup script for code quality tools

set -e

echo "========================================="
echo "SETTING UP CODE QUALITY TOOLS"
echo "========================================="
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install --save-dev \
  @commitlint/cli \
  @commitlint/config-conventional \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  @types/node \
  eslint \
  eslint-config-prettier \
  eslint-import-resolver-typescript \
  eslint-plugin-import \
  eslint-plugin-node \
  eslint-plugin-promise \
  eslint-plugin-security \
  prettier \
  husky \
  lint-staged \
  madge \
  jscpd \
  organize-imports-cli \
  ts-prune \
  chalk \
  typescript

echo "✓ Dependencies installed"
echo ""

# 2. Setup Husky
echo "🪝 Setting up Git hooks with Husky..."
npx husky install || true
npx husky add .husky/pre-commit "npx lint-staged" || true
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"' || true
chmod +x .husky/pre-commit 2>/dev/null || true
chmod +x .husky/commit-msg 2>/dev/null || true

echo "✓ Git hooks configured"
echo ""

# 3. Create necessary directories
echo "📁 Creating directories..."
mkdir -p .vscode
mkdir -p scripts
mkdir -p tests
mkdir -p .github/workflows

echo "✓ Directories created"
echo ""

# 4. Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/fix-all.sh 2>/dev/null || true
chmod +x scripts/setup-quality-tools.sh 2>/dev/null || true
chmod +x scripts/pre-release-check.sh 2>/dev/null || true

echo "✓ Scripts are now executable"
echo ""

echo "========================================="
echo "SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Available commands:"
echo "  npm run lint              - Run all linting checks"
echo "  npm run fix               - Auto-fix all issues"
echo "  npm run analyze           - Generate code metrics"
echo "  npm run quality           - Run full quality check"
echo ""
echo "Git hooks installed:"
echo "  pre-commit                - Runs linting on staged files"
echo "  commit-msg                - Validates commit message format"
echo ""
