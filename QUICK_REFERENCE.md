# Quick Reference Guide

## What This Project Is
**Jarvis v4** - A sophisticated multi-agent AI orchestration system that coordinates 36+ specialized agents (dialogue, music, finance, etc.) through a central orchestrator.

**Key Technologies**: TypeScript, Node.js, Express, PostgreSQL, Redis, Multiple LLMs (GPT, Claude, Ollama)

---

## Quick Commands

```bash
# Setup
npm install                    # Install dependencies (REQUIRED FIRST)

# Development
npm run dev                    # Start in development mode
npm run dev:all               # Start with dashboard
npm run dev:watch             # Auto-recompile on changes

# Production
npm run build                  # Compile TypeScript
npm run start                  # Run compiled version
npm run stable                 # Production with PM2

# Testing
npm run test:all              # Full test suite
npm run test:quick            # Quick smoke tests
npm run test:performance      # Load/stress tests
npm run monitor:health        # Continuous health monitoring

# Code Quality
npm run lint                   # Check for issues
npm run lint:fix              # Auto-fix issues
npm run format                # Format code
npm run typecheck             # TypeScript validation

# Analysis
npm run analyze:deps          # Check dependencies
npm run analyze:circular      # Find circular imports
```

---

## Critical Issues to Fix (Before Using)

| Issue | Severity | Fix |
|-------|----------|-----|
| Dependencies not installed | 🔴 CRITICAL | Run `npm install` |
| No build artifacts (dist/) | 🔴 CRITICAL | Run `npm run build` |
| 30+ incomplete TODOs in APIs | 🟠 HIGH | See list below |
| 779 instances of `any` type | 🟠 HIGH | Enable strict TypeScript |
| Hardcoded Windows paths | 🟡 MEDIUM | Update ecosystem.config.js |

---

## TODO Items Needing Attention

**Health Monitoring (src/api/server.ts)**:
- Line 488: Database health check not implemented
- Line 534: DB ping not implemented
- Line 1070: Agent health check not implemented

**Authentication (src/api/auth-api.ts)**:
- Line 339: Password reset token generation
- Line 357: Email verification

**Analytics (src/api/analytics-api.ts)**:
- Line 1119: Custom query builder
- Line 1133: Performance trends
- Line 1143: Prediction models

**Batch Operations (src/api/server.ts)**:
- Line 1747-1783: Batch tracking, cancellation, history

---

## Directory Guide

| Path | Purpose |
|------|---------|
| `src/agents/` | 36+ agent implementations |
| `src/api/` | REST API endpoints |
| `src/orchestrator/` | Agent routing & registry |
| `src/reasoning/` | Multi-step AI reasoning |
| `src/reliability/` | Quality assurance systems |
| `src/self-healing/` | Diagnostic & repair |
| `Jarvis-Visual-Engine/` | Python computer vision |
| `dashboard/` | React monitoring UI |
| `tests/` | Comprehensive test suites |

---

## Architecture Pattern

```
Request → Orchestrator → Agent Registry → Specialized Agent → Response
                        ↓
                    Health Monitor (self-healing)
                        ↓
                    Repair Engine (if needed)
```

---

## Key Files

- **src/index.ts** - Main entry point, starts all agents
- **src/api/server.ts** - Main REST API (main issues here)
- **src/orchestrator/orchestrator.ts** - Request routing
- **ecosystem.config.js** - PM2 process config (has Windows path issue)

---

## Tooling Stack

**Linting**: ESLint + TypeScript strict rules
**Formatting**: Prettier + Biome
**Testing**: Jest + ts-node + pytest (for Python)
**Process Management**: PM2
**Load Testing**: Artillery
**Code Analysis**: madge (circular deps), jscpd (duplication)

---

## Environment Setup

```bash
# Install Node.js 20+
node --version

# Install npm dependencies  
npm install

# Copy environment template
cp .env.example .env

# Update .env with your API keys:
# - OpenAI API key
# - Claude API key
# - Ollama endpoint (if using)
# - Database credentials
# - Google/Gmail credentials
```

---

## File Count & Sizes

- TypeScript source: 34,119 lines across ~150 files
- Python Visual Engine: 4.8MB
- Dashboard: 1.5MB  
- Documentation: 212 markdown files
- Total: ~9MB (excluding node_modules)

---

## Next Steps

1. **Run `npm install`** - Install all dependencies
2. **Run `npm run build`** - Compile TypeScript
3. **Review TODOs** - Decide which features to complete
4. **Run tests** - `npm run test:quick` to verify setup
5. **Start dev** - `npm run dev` or `npm run dev:all`
6. **Monitor health** - `npm run monitor:health` in separate terminal

---

**Last Updated**: March 12, 2024 | **Version**: 4.0.0
