# Jarvis v4 Codebase Assessment & Forward Plan

**Date:** 2026-03-21  
**Automation ID:** 4a4375d7-bd33-4251-bc23-bbba493a8f9f  
**Branch:** `cursor/codebase-assessment-and-plan-9323`

---

## Goal

**Understand the current state of the Jarvis v4 orchestrator codebase, classify code quality, identify governance drift, and produce a phased remediation plan (Discovery → Classification → Repo Clean → Roadmap).**

---

## Executive Summary

**Jarvis v4** is a TypeScript/Express orchestrator with a sophisticated multi-agent architecture, Python vision & memory services, and cross-platform UIs (React dashboard, Electron desktop). The codebase exhibits:

- **Strengths:** Clear domain separation (agents, API, orchestrator, self-healing), solid security foundations in Electron, comprehensive test tooling, and a working CI/CD pipeline.
- **Weaknesses:** Monolithic entry point (`src/index.ts`, ~1500 lines), permissive TypeScript config (no strict mode), environmental configuration drift, fail-open security posture, and inconsistent error handling patterns.
- **Key Risk:** Self-healing system is feature-rich but tightly coupled to bootstrap logic; agent registry has mapping errors that undermine correctness.

This plan outlines a **4-phase remediation** to tighten governance, reduce technical debt, and prepare for production scaling.

---

## Part 1: Project Structure & Technology Stack

### Monorepo Layout

```
/workspace
├── src/                              # Main Node/TypeScript orchestrator
│   ├── index.ts                      # Entry point (1500+ lines, monolithic)
│   ├── agents/                       # ~20+ concrete agents (dialogue, web, knowledge, etc.)
│   ├── orchestrator/                 # AgentRegistry, Orchestrator
│   ├── api/                          # JarvisAPIServer (HTTP + Socket.IO surface)
│   ├── reasoning/                    # Advanced reasoning engine
│   ├── memory/                       # ContextManager
│   ├── self-healing/                 # Autonomous repair system (large subsystem)
│   ├── reliability/                  # Chain-of-thought, debate, AI provider abstraction
│   ├── security/                     # Layered security (layer1–layer5)
│   ├── voice/                        # Voice pipeline
│   ├── llm/                          # LLM client (Vertex, OpenAI, Anthropic)
│   ├── database/                     # PostgreSQL + Redis
│   ├── middleware/                   # Express middleware (auth, error, CORS, etc.)
│   └── utils/                        # Helpers (logger, metrics, validators)
│
├── tests/                            # Heterogeneous test suite (Jest + shell + load)
├── scripts/                          # Ops: DB setup, PM2, lint, metrics
├── jarvis-desktop/                   # Electron + Vite + React desktop UI
├── dashboard/                        # Self-healing dashboard (Vite + React)
├── dashboard-app/                    # Electron wrapper for dashboard
├── codeeditor/                       # Monaco code editor (CRA)
├── jarvis-launcher/                  # JARVIS Launcher (Electron)
├── Jarvis-Visual-Engine/             # Python vision (Flask, OpenCV, face_recognition)
├── Jarvis-Memory/                    # Python memory service (STM/MTM/LTM, knowledge graph)
├── webx/                             # Experimental: lightbrowser, voice assistant
└── .github/workflows/                # GitHub Actions CI
```

### Primary Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20+, TypeScript (non-strict) |
| **HTTP & Real-time** | Express, Socket.IO, Swagger UI |
| **Data** | PostgreSQL, Redis (ioredis) |
| **Auth & APIs** | JWT, bcrypt, Google APIs, Plaid, Hugging Face, OpenAI, Anthropic, AWS S3 |
| **Logging & Monitoring** | Winston (console + rotating files), MetricsCollector |
| **Frontend** | React 18, Vite 5, Tailwind, Zustand, Monaco, Recharts |
| **Desktop** | Electron 31, Tauri (alternative path) |
| **Python Services** | Flask, SQLAlchemy, OpenCV, PyTorch, pytest |
| **Build & QA** | tsc, ESLint, Prettier, Biome, Jest, madge (circular deps), Husky, jscpd |
| **Deployment** | PM2, Docker (Vision), GitHub Actions on `main`/`develop` |

---

## Part 2: Code Quality Assessment

### 2.1 Entry Point (`src/index.ts`)

| Aspect | Finding |
|--------|---------|
| **Lines of Code** | ~1500 lines (monolithic) |
| **Responsibilities** | Dotenv, watchdog setup, LLM initialization, manual agent construction & registration (repeated), API server bootstrap, background services (self-healing, DB pool, sensors), global error handlers, PM2 coordination, shutdown orchestration |
| **Coupling** | High: imports agents, API server, self-healing, voice, orchestrator, DB repos, etc. in one file |
| **Duplication** | DB init appears in multiple blocks (Security Agent, `initializeBackgroundServices`); manual `registerExistingAgent` repeated for each agent |
| **Type Safety** | `llm!` non-null assertions, widespread `any` types, `as any` casts for agents |
| **Technical Debt** | **Severe**: Hard to review, easy to break ordering, agent mislabeling (e.g. `WebAgent` registered as `CommandAgent`, `KnowledgeAgent` as `ContextAgent`—undermines self-healing correctness) |

**Verdict:** 🔴 **Weakness**—blocks refactors, hides bugs, high change risk.

---

### 2.2 Module Dependency Graph

| Component | Observation | Risk |
|-----------|-------------|------|
| **Orchestrator** | Clean design: depends only on `AgentRegistry` & types; no reverse deps. | **Low** |
| **AgentRegistry** | Singleton, well-scoped, registration pattern clear. | **Low** |
| **Agent Hierarchy** | `BaseAgent` → `EnhancedBaseAgent`; not all agents use enhanced layer consistently. | **Medium** |
| **Cross-module State** | Globals like `(global as any).reasoningEngine` and `(global as any).llm` wired in `index.ts`. | **High** |
| **Circular Deps** | `npm run analyze:circular` defined but not measured here; star-shaped from `index.ts` suggests risk. | **Medium** |

**Verdict:** 🟡 **Mixed**—architecture is sound, but entry point coupling defeats it.

---

### 2.3 Error Handling

| Area | Pattern | Assessment |
|------|---------|-----------|
| **HTTP API** | `createErrorHandler` in `src/middleware/error-handler.ts`; JSON response with status, code, timestamp, optional dev stack. | ✅ Consistent, structured |
| **Orchestrator** | Responses include `success` flag; retries on transient failures. | ✅ Reasonable |
| **Agents** | `BaseAgent.start()` catches, logs, rethrows; sets `OFFLINE` state. | ✅ Clear contract |
| **Security Middleware** | **Fails open** when Security agent unavailable (503 returns 403, not block). | ⚠️ Security vs availability trade-off, not uniform |
| **Global Handlers** | `uncaughtException` and `unhandledRejection` swallow until threshold. | ⚠️ Can mask bugs in production |

**Verdict:** 🟡 **Inconsistent**—good frameworks, but fail-open design is not security-first; threshold swallowing hides signals.

---

### 2.4 Type Safety

| Finding | Impact |
|---------|--------|
| **tsconfig.json:** `"strict": false`, `noImplicitAny: false`, `strictNullChecks: false` | Functions can receive/return `any` without warning |
| **Widespread `any` usage** | `BaseAgent.app: any`, `JarvisAPIServer` fields, many function signatures in `index.ts` | Silent bugs at runtime |
| **Non-null assertions** | `llm!` in index.ts; assumes LLM client always present after Vertex init | Crashes if Vertex fails |
| **Casting** | `as any` for agent lists that may lack LLM interface | Type erasure, loss of contract safety |

**Verdict:** 🔴 **Weakness**—TypeScript is not enforcing its contract; refactors and nullability bugs slip through.

---

### 2.5 Code Patterns (Agents)

| Layer | Pattern | Consistency |
|-------|---------|-------------|
| **BaseAgent** | Lifecycle hooks: `start()`, `stop()`, abstract `initialize()` / `startServer()` | ✅ Enforced by inheritance |
| **EnhancedBaseAgent** | Standard routes: `/api/capabilities`, `/api/status`, metrics, logging | ✅ Opt-in, well-documented |
| **Concrete Agents** | Hand-wired in `index.ts`; each agent constructor slightly different | ⚠️ Not all agents use EnhancedBase; onboarding cost high |
| **Registration Metadata** | Duplicated next to agent classes in `index.ts` | ⚠️ Single source of truth split |

**Verdict:** 🟡 **Partial**—shared base is good; enforcement is weak.

---

### 2.6 Configuration Management

| Aspect | Status |
|--------|--------|
| **.env.example** | Covers core ports, DB URL, LLM keys, web search; does **not** document per-agent ports, self-healing flags, Vertex-only paths, many integrations |
| **Config Reads** | Scattered `process.env` reads across agents and `index.ts` |
| **Port Conflicts** | Concrete bug: `RELIABILITY_AGENT_PORT` and `LLM_AGENT_PORT` both default to **3032** |
| **Documentation** | Large config surface is **undocumented**; reproducing deploys is error-prone |

**Verdict:** 🔴 **Weakness**—configuration drift, port conflicts, discovery gap.

---

### 2.7 Logging & Monitoring

| Feature | Implementation | Gaps |
|---------|-----------------|------|
| **Logger Factory** | `createLogger` via Winston; console + rotating files under `logs/` | ✅ Centralized |
| **Metrics** | `MetricsCollector` tracks request/error counts; `src/utils/metrics.ts` used in API | ✅ Exists |
| **Structured Logging** | JSON metadata in Winston; emoji-heavy logs in `index.ts` aid human scanning | ⚠️ Not machine-first |
| **Distributed Tracing** | No trace IDs across agent HTTP calls; Socket.IO logging is ad hoc | 🔴 Missing for multi-agent workflows |

**Verdict:** 🟡 **Partial**—file persistence is good; observability for distributed workflows is thin.

---

### 2.8 Security

| Area | Strength | Concern |
|------|----------|---------|
| **Electron Hardening** | `nodeIntegration: false`, `contextIsolation: true`, preload bridge | ✅ Solid defaults |
| **API Middleware** | `helmet`, CORS, rate limiters, auth middleware, validation | ✅ Layered defense |
| **IPC Surface** | Preload types include `Promise<any>` in several places | ⚠️ Loose typing, validation needed |
| **Security Agent** | HTTP scan for malicious content; **fails open** when unavailable (logs 403 but doesn't block) | 🔴 Security vs availability—not secure-by-default |
| **Socket.IO CORS** | `origin: '*'` | 🔴 Permissive, should be restricted |
| **Credentials** | No evidence of committed live keys in `src/` (placeholders in examples) | ✅ Appears clean |

**Verdict:** 🟡 **Mixed**—strong electron isolation; fail-open scanning and open CORS undermine confidentiality.

---

### 2.9 API Versioning

| Pattern | Current State |
|---------|---------------|
| **Path-based versioning** | **Not used**; routes are `/api/...`, not `/api/v1/...` |
| **Metadata versioning** | `GET /api/version` returns `apiVersion: '2.0.0'` and `version: '4.0.0'` |
| **Backward Compatibility** | No deprecation headers or versioned contracts |

**Verdict:** 🔴 **Weakness**—breaking JSON changes will hit desktop/dashboard clients without migration path.

---

### 2.10 Self-Healing System

| Aspect | Finding |
|--------|---------|
| **Scope** | Pool manager, sensors, diagnostic/repair engines, WebSocket events under `src/self-healing/` |
| **Initialization** | Bootstrapped from `index.ts` via `initializeBackgroundServices()` |
| **Coupling** | Shares global module state; registers agents with **wrong names** (e.g. mapping `WebAgent` to `CommandAgent`) |
| **API Leakage** | Health endpoints wired into `JarvisAPIServer`; not a separate service |
| **Database** | Self-healing duplicates DB setup with other paths (inconsistency risk) |
| **Design** | Feature-rich subsystem; **not well-contained** from startup, registry, and API concerns |

**Verdict:** 🔴 **Weakness**—feature-rich but tightly coupled; incorrect pool registration **risks wrong respawn/repair targets**, undermining reliability.

---

### 2.11 Desktop App Quality (Electron / React)

| Component | Status |
|-----------|--------|
| **Build System** | Vite + React + TypeScript; separate builds for main/preload/renderer | ✅ Modern, clean |
| **Security Isolation** | `BrowserWindow`: `nodeIntegration: false`, `contextIsolation: true` | ✅ Hardened |
| **Type Safety** | Preload types include `Promise<any>`; IPC surface loosely typed | ⚠️ Should be strict |
| **State Management** | Zustand for React; electron-store for persistence | ✅ Appropriate tools |
| **IPC Handlers** | Bridge validates calls but types are loose; sanitization not fully reviewed | ⚠️ Needs audit |

**Verdict:** 🟡 **Good baseline**—needs type strictness on IPC surface.

---

### 2.12 Testing Coverage & Organization

| Aspect | Finding |
|--------|---------|
| **Test Framework** | Jest (`roots: ["<rootDir>/tests"]`, `collectCoverageFrom: ["src/**/*.ts"]`) |
| **Test Suite Composition** | Unit tests, integration/smoke/load/security scripts, Postman collection, shell/PowerShell, Artillery YAML—**heterogeneous** |
| **Critical Paths** | Entry point (`index.ts`) composition and multi-agent startup **likely under-tested** |
| **Organization** | Tests spread across Jest unit, custom TS runners, shell scripts, external tools; not clear what CI always runs |
| **Coverage** | Self-healing registration and startup orchestration likely **thin on coverage** |

**Verdict:** 🟡 **Breadth, not depth**—many test types; critical path coverage is likely insufficient; flakiness risk in integration tests.

---

## Part 3: Strengths & Weaknesses Summary

### Strengths 🟢

1. **Clear domain separation** — agents, API, orchestrator, security, self-healing are in distinct folders.
2. **Solid Electron hardening** — proper isolation, preload bridge, no arbitrary code execution.
3. **Layered middleware** — helmet, CORS, rate limit, auth, error handling.
4. **Working CI/CD** — GitHub Actions with linting, type checks, circular dep detection, tests on `main`/`develop`.
5. **Comprehensive test tooling** — Jest, shell runners, load tests, Postman collection.
6. **Multi-service architecture** — agents can start/stop independently; orchestrator is loosely coupled.
7. **Logging infrastructure** — Winston with files, structured metadata.
8. **Self-healing subsystem** — autonomous repair, sensor health, diagnostic capabilities.

### Weaknesses 🔴

1. **Monolithic entry point** — `src/index.ts` (~1500 lines) handles dotenv, LLM, all agents, API server, background services, error handlers, PM2 coordination. Single change touches dozens of concerns.
2. **Non-strict TypeScript** — `"strict": false`, widespread `any` types, non-null assertions. Type erasure hides bugs.
3. **Configuration drift** — `.env.example` doesn't match code; port conflicts (3032 for two agents); scattered `process.env` reads.
4. **Fail-open security** — Security agent doesn't block when unavailable; Socket.IO CORS is `*`.
5. **Agent registry mislabeling** — `registerExistingAgent` maps `WebAgent` → `CommandAgent`, etc.; undermines self-healing correctness and pool targeting.
6. **Inconsistent error handling** — Some endpoints fail open, others fail closed; global exception swallowing masks signals.
7. **Self-healing coupling** — Tightly integrated with bootstrap; duplicated DB init; health endpoints leak into API server.
8. **No API versioning** — Breaking JSON contract changes will crash desktop/dashboard clients without migration path.
9. **Loose IPC typing** — Preload bridge has `Promise<any>` types; validation not comprehensive.
10. **Under-tested critical paths** — Entry point composition, multi-agent startup, self-healing registration not well-covered by Jest.

### Governance Drift 🟡

1. **Configuration as documentation gap** — Code supports many flags/ports that `.env.example` doesn't list.
2. **Branch naming misalignment** — CI targets `main`/`develop`, but workflow/readme may reference `master`.
3. **Agent metadata duplication** — Registration info in `index.ts` not tied to agent class definitions.
4. **Scattered integration tests** — Jest, custom runners, shell, Artillery—not a unified test command.
5. **Inconsistent patterns across agents** — Some use `EnhancedBaseAgent`, others don't; constructor signatures differ.

---

## Part 4: Phased Remediation Plan

### Phase 1: Discovery & Measurement (Week 1–2)

**Goal:** Quantify current state; establish metrics and baselines.

**Tasks:**

1. **Run static analysis tools**
   - `npm run analyze:circular` — measure circular dependencies
   - `npm run lint` — baseline ESLint violations
   - `npm run test` — record test count, coverage %
   - `jscpd` — measure code duplication
   - `madge --json` — circular dependency graph

2. **Document current config surface**
   - Grep all `process.env` reads in `src/`
   - List all default ports
   - Verify `.env.example` against code expectations
   - Document self-healing flags (`ENABLE_AUTO_REPAIR`, `MIN_REPAIR_CONFIDENCE`, etc.)

3. **Audit agent registry**
   - Map declared agent names in `index.ts` vs. actual `AgentRegistry.registerAgent` calls
   - Verify no mislabeling (e.g. `WebAgent` should register as `WebAgent`, not `CommandAgent`)
   - Check for duplicate registrations or missed agents

4. **Test coverage assessment**
   - Run Jest with `--coverage`; measure % for `src/` and critical paths
   - Check if `index.ts` composition is tested
   - Verify self-healing startup is covered

5. **Security posture audit**
   - Scan for hardcoded credentials in `src/`
   - Verify preload IPC handlers validate all inputs
   - Check CORS config on Socket.IO and HTTP

6. **Checklist: Create GOVERNANCE.md**
   - Document current patterns
   - Record findings from (1)–(5)
   - Establish baseline metrics

---

### Phase 2: Classification & Priority (Week 2–3)

**Goal:** Classify issues; prioritize by impact and effort; plan order of fixes.

**Tasks:**

1. **Classify issues into tiers:**
   - **Tier 1 (Critical):** Security (fail-open patterns, CORS), correctness (agent mislabeling, port conflicts), crashes (non-null assertions)
   - **Tier 2 (High):** Type safety (enable strict mode), monolithic entry point, config drift, under-tested paths
   - **Tier 3 (Medium):** API versioning, IPC typing, logging observability
   - **Tier 4 (Low):** Refactor, polish, documentation

2. **Rank by risk & dependency:**
   - Fix Tier 1 first (blocking correctness & security)
   - Tier 2 enables easier Tier 3 work
   - Tier 3+ can be parallelized

3. **Estimate scope:**
   - Entry point decomposition: large (10+ files, many touch points)
   - Type safety: medium (enable strict, audit casts)
   - Config cleanup: small (env consolidation, port conflict)
   - Agent registry: small (fix mapping, add test)
   - Self-healing decoupling: medium (new interfaces, refactor bootstrap)

4. **Create ROADMAP.md with:**
   - Phased timeline (Phases 2–4 work, not calendar weeks—technical units)
   - Per-phase deliverables
   - Known blockers / dependencies
   - Success criteria per phase

---

### Phase 3: Repo Clean & Type Safety (Phase 2 of execution)

**Goal:** Fix critical issues; enable strict TypeScript; tighten configuration.

**Tasks:**

1. **Fix agent registry (Tier 1—quick)**
   - Audit all `registerExistingAgent` calls in `index.ts`
   - Correct misnamed registrations (e.g. `WebAgent` → `WebAgent`, not `CommandAgent`)
   - Add test: `tests/unit/agent-registry.test.ts` should verify name=registry entry
   - Verify self-healing pool manager uses correct agent names for respawn

2. **Fix configuration (Tier 1—quick)**
   - Resolve port conflicts: assign unique ports to `RELIABILITY_AGENT_PORT`, `LLM_AGENT_PORT`, etc.
   - Update `.env.example` with all documented flags
   - Create `src/config/env.ts` that validates `process.env` at startup and throws if missing

3. **Fix security (Tier 1)**
   - Change Security agent to **fail closed** (block, don't allow, when unavailable)
   - Restrict Socket.IO CORS: `origin: process.env.CLIENT_URLS?.split(',') || []`
   - Add input validation to all preload IPC handlers
   - Add test coverage for security endpoints

4. **Enable TypeScript strict mode (Tier 2—medium)**
   - Update `tsconfig.json`: enable `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
   - Audit codebase; fix type errors in phases:
     - Phase A: `src/index.ts`, core orchestrator, agents
     - Phase B: `src/api/`, middleware
     - Phase C: utilities, remaining modules
   - Remove unsafe `as any` casts; use proper types
   - Fix non-null assertions (e.g. `llm!`) with optional chaining or error handling

5. **Decompose entry point (Tier 2—large)**
   - Extract agent initialization into `src/bootstrap/agent-registry.ts`
   - Extract background services into `src/bootstrap/background-services.ts`
   - Extract server bootstrap into `src/bootstrap/api-server.ts`
   - Extract error handlers into `src/bootstrap/error-handlers.ts`
   - Reduce `src/index.ts` to ~200 lines: import, wire, await, start
   - Add tests for each bootstrap module

6. **Decouple self-healing (Tier 2—medium)**
   - Create `src/self-healing/interfaces.ts` with `SelfHealingService` contract
   - Refactor `src/self-healing/index.ts` to export a service with clean initialization
   - Move health endpoints from `JarvisAPIServer` to a separate health router
   - Consolidate DB init into a single path (both startup and self-healing use same function)
   - Add test: verify self-healing can start/stop independently

7. **Update `.env.example` and create CONFIGURATION.md**
   - Document every `process.env` variable with type, default, and purpose
   - Add examples for local dev vs. production
   - Include self-healing flags, per-agent ports, security config

---

### Phase 4: API Versioning & Testing (Phase 3 of execution)

**Goal:** Implement versioning; improve test coverage.

**Tasks:**

1. **Add API versioning (Tier 3)**
   - Introduce `/api/v1/` namespace for existing endpoints
   - Add deprecation headers to old paths
   - Document versioning strategy in CONFIGURATION.md
   - Create migration guide for desktop/dashboard clients

2. **Tighten preload IPC (Tier 3)**
   - Replace `Promise<any>` with concrete types (e.g. `Promise<{ success: boolean; error?: string }>`)
   - Add runtime validation for all IPC payloads (use `joi` or zod)
   - Document IPC contract in `jarvis-desktop/IPC_PROTOCOL.md`
   - Add test coverage for IPC handlers

3. **Improve test coverage (Tier 2–3)**
   - Add Jest tests for `src/bootstrap/` modules (agent init, background services, etc.)
   - Add integration test: multi-agent startup sequence
   - Add integration test: self-healing pool registration and respawn
   - Add security test: verify fail-closed behavior when Security agent unavailable
   - Consolidate test runners into a single `npm test` command (Jest primary, shell/load optional)

4. **Add distributed tracing (Tier 3–4)**
   - Integrate OpenTelemetry (or simpler: correlation ID in Winston logs)
   - Add trace ID to all HTTP requests and agent-to-agent calls
   - Update logging to include trace ID in all entries
   - Document observability strategy in README

5. **Update documentation**
   - Create `GOVERNANCE.md` (baseline metrics, patterns, rules)
   - Create `ROADMAP.md` (phases, timeline, milestones)
   - Update `README.md` with architecture notes on entry point, bootstrap, self-healing
   - Create `CONFIGURATION.md` (env vars, defaults, examples)
   - Update `README-TESTING.md` with unified test command and coverage expectations

---

### Phase 5: Optimization & Hardening (Phase 4 of execution, ongoing)

**Goal:** Polish, performance, production readiness.

**Tasks:**

1. **Performance & reliability (Tier 4)**
   - Profile `index.ts` startup time; optimize agent initialization order
   - Add startup timeout with graceful degradation (skip non-critical agents if slow)
   - Implement circuit breaker for LLM client (fail fast if Vertex unavailable)
   - Add health checks for all agents in `/health/agents` endpoint

2. **Monitoring & alerting (Tier 4)**
   - Export metrics to Prometheus format (add `GET /metrics`)
   - Document alerting thresholds (agent error rate, pool respawn frequency, etc.)
   - Add dashboard widget: agent health status, error rates, latency

3. **Security hardening (ongoing)**
   - Conduct code review of preload, API server, agent communication
   - Add rate limiting per endpoint (not just global)
   - Implement request signing for agent-to-agent calls
   - Add audit logging for sensitive operations (registry changes, pool respawns, etc.)

4. **Clean up technical debt (Tier 4)**
   - Remove deprecated agents or consolidate duplicates
   - Standardize all agents on `EnhancedBaseAgent` or clear why not
   - Migrate away from `winston` file logging if using centralized observability (ELK, Datadog)
   - Refactor `src/utils/` into domain-specific modules (avoid god-utility)

---

## Part 5: Checklist for Human Review & Approval

Use this checklist to validate the plan before execution:

### Strategic Alignment
- [ ] Is the phased approach (Discovery → Classification → Repo Clean → Roadmap) suitable for your team?
- [ ] Are the Tier 1 priorities (security, correctness, crashes) aligned with your risk tolerance?
- [ ] Do you agree with deferring API versioning and tracing to later phases?

### Scope & Effort
- [ ] Is entry point decomposition (~1500 → ~200 lines) worth the refactor effort?
- [ ] Is enabling strict TypeScript a team priority, or should it be deferred?
- [ ] Are port conflicts (`3032` duplication) blocking current development?
- [ ] Is self-healing decoupling a must-have before scaling, or nice-to-have?

### Execution Model
- [ ] Should phases be run sequentially or can they overlap (e.g. Phase 3 & 4 in parallel)?
- [ ] Who owns each phase? (e.g. Platform team = bootstrap/config, Security team = security fixes)
- [ ] What is the testing/review cadence? (Per commit, per phase, per deliverable?)

### Blockers & Dependencies
- [ ] Are there active features that depend on `src/index.ts` that would conflict with refactoring?
- [ ] Does enabling strict TypeScript require updating CI/CD or deployment tooling?
- [ ] Are there teams using the API that need communication about versioning changes?

### Success Criteria
- [ ] What is the target coverage % for Phase 3? (e.g. 60%+, 80%+?)
- [ ] Should all Tier 1 fixes be done before merging, or can Tier 2 be phased?
- [ ] Is there a date/milestone by which all phases should be complete?

---

## Part 6: Decisions Needed from Stakeholders

Before proceeding, confirm:

1. **TypeScript Strictness**
   - **Q:** Should strict mode be enabled during Phase 3, or deferred to Phase 4+?
   - **Impact:** Enables IDE tooling, catches bugs early; ~1–2 weeks of audit and fixes.

2. **Security Posture**
   - **Q:** Should security failures (e.g., Security agent unavailable) cause the API to fail closed (return 403/block all) or fail open (allow with logging)?
   - **Impact:** Fail-closed improves security but may cause outages if Security agent is unstable; fail-open is current but risky.

3. **API Versioning Strategy**
   - **Q:** Should desktop/dashboard clients expect `/api/v1/` namespace, or should breaking changes be coordinated with client releases?
   - **Impact:** Namespace versioning adds complexity but enables independent release cycles.

4. **Self-Healing Autonomy**
   - **Q:** Should self-healing be a separate microservice, or remain embedded in the main orchestrator?
   - **Impact:** Separate service improves resilience but adds operational complexity; embedding keeps it simple but couples concerns.

5. **Test Coverage Target**
   - **Q:** What is the minimum acceptable code coverage %? (e.g., 60% for main, 80% for critical paths?)
   - **Impact:** Affects effort in Phase 4 and ongoing maintenance burden.

6. **Timeline**
   - **Q:** What is the target completion date for all phases? (e.g., 4 weeks, 8 weeks, indefinite?)
   - **Impact:** Determines parallelization and priority of lower-tier work.

---

## Part 7: Example Prompts for Next Agents

Once decisions are made, hand off to execution agents with these prompts:

### Agent: Bootstrap Decomposition
```
Refactor src/index.ts (~1500 lines) into modules:
- src/bootstrap/agent-registry.ts: Initialize and register all agents
- src/bootstrap/background-services.ts: Start self-healing, DB pool, sensors
- src/bootstrap/api-server.ts: Configure Express, middleware, Socket.IO
- src/bootstrap/error-handlers.ts: Global error handler setup
- src/index.ts: Reduced to ~200 lines (import, wire, await, start)

Requirements:
1. No logic should move; refactoring only.
2. Maintain existing startup order (order matters for agent dependencies).
3. Add tests in tests/unit/bootstrap/ for each module.
4. Verify agents still initialize and register with correct names.
5. Commit each module separately for easier review.
```

### Agent: TypeScript Strict Mode
```
Enable strict TypeScript and fix type errors:

1. Update tsconfig.json: "strict": true, "noImplicitAny": true, "strictNullChecks": true
2. Fix type errors in phases:
   - Phase A: src/index.ts, src/orchestrator/, src/agents/ (critical paths)
   - Phase B: src/api/, src/middleware/ (HTTP surface)
   - Phase C: src/utils/, remaining modules
3. Replace unsafe "as any" casts with proper types.
4. Fix non-null assertions (e.g., llm!) with optional chaining or guards.
5. Verify npm run build and npm test pass with no TS errors.
6. Commit per-module for review.
```

### Agent: Configuration Audit & Fix
```
Audit and fix configuration:

1. Grep all process.env reads in src/; list in CONFIG_SURFACE.md
2. Resolve port conflicts (RELIABILITY_AGENT_PORT and LLM_AGENT_PORT both default to 3032)
3. Update .env.example with all variables, types, defaults, and purpose
4. Create src/config/env.ts that validates process.env at startup and throws if missing
5. Add unit test: verify required env vars are documented and validated
6. Verify .env.example matches code expectations
7. Commit config module and documentation update.
```

### Agent: Security Fix (Fail-Closed)
```
Implement fail-closed security:

1. Update Security agent endpoint to return 403 if scan unavailable (not 503→allow)
2. Restrict Socket.IO CORS from "*" to process.env.CLIENT_URLS or empty array
3. Add input validation to all preload IPC handlers in jarvis-desktop/src/preload/
4. Add test: verify security endpoint blocks when agent unavailable
5. Add test: verify IPC handlers reject invalid payloads
6. Verify no hardcoded URLs in Electron main/preload
7. Commit security fixes separately.
```

### Agent: Agent Registry Fix
```
Fix agent registry mislabeling:

1. Audit all registerExistingAgent() calls in src/index.ts
2. Verify agent name matches declared class (e.g., WebAgent → "WebAgent", not "CommandAgent")
3. Create test in tests/unit/agent-registry.test.ts that verifies no mismatches
4. Verify self-healing pool manager receives correct agent names for respawn
5. Add test: spawn an agent, verify registry returns correct instance
6. Commit registry fix and test.
```

### Agent: Self-Healing Decoupling
```
Decouple self-healing from bootstrap:

1. Create src/self-healing/interfaces.ts with SelfHealingService contract
2. Refactor src/self-healing/ to export a service with initialize() and shutdown()
3. Move health endpoints from JarvisAPIServer to separate health router
4. Consolidate DB initialization: both startup and self-healing use same function
5. Update src/index.ts to initialize self-healing as a service (not inline)
6. Add test: verify self-healing can start/stop independently
7. Add test: verify pool manager respawns agents with correct names
8. Commit per-module for review.
```

---

## Part 8: Success Metrics

Use these to measure progress and impact:

| Metric | Baseline | Target | Phase |
|--------|----------|--------|-------|
| **Entry point lines** | ~1500 | ~200 | 3 |
| **Circular dependencies** | Measured in Phase 1 | 0 (if possible) | 3–4 |
| **Type safety (any count)** | Measured in Phase 1 | < 5% of src/ | 3 |
| **Test coverage** | Measured in Phase 1 | 65%+ overall, 80%+ critical paths | 4 |
| **Configuration variables documented** | ~30% | 100% in .env.example | 3 |
| **Agent registry accuracy** | Current mismatches detected | 100% correct mapping | 3 |
| **Port conflicts** | 2 (LLM + Reliability) | 0 | 3 |
| **Security test coverage** | Current | +50% new tests for fail-closed behavior | 3–4 |
| **Self-healing integration** | Coupled to index.ts | Clean service interface | 3 |
| **API endpoints versioned** | 0 | 100% under /api/v1/ | 4 |

---

## Part 9: Conclusion

**Jarvis v4** is a mature, feature-rich orchestrator with solid architectural foundations. The main technical debt clusters around:

1. **Monolithic entry point** (tightly couples dozens of concerns)
2. **Permissive TypeScript** (loses type safety benefits)
3. **Configuration drift** (port conflicts, undocumented env vars)
4. **Security anomalies** (fail-open patterns, open CORS)
5. **Self-healing coupling** (improves features but undermines autonomy)

The **4-phase plan** systematically addresses these through discovery, classification, repo clean, and hardening. **Phase 3 is the critical turnaround:** fixing Tier 1 issues (correctness, security), enabling strict TypeScript, and decomposing the entry point will unlock faster iteration and safer refactors.

**Phase 4** adds polish (versioning, observability, hardening) and prepares for production scale.

**Success requires:** clear prioritization (Tier 1 first), parallel where possible (e.g., config cleanup during type audit), disciplined code review (each module separately), and updated documentation (governance, configuration, roadmap).

---

**Next Step:** Human review and approval of decisions in **Part 6**. Once confirmed, hand off phased work to execution agents per **Part 7** examples.

