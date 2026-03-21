# Jarvis v4 Planning Checklist

**Status:** ✅ Discovery Complete  
**Date:** 2026-03-21  
**Main Document:** [PLANNING-ASSESSMENT.md](./PLANNING-ASSESSMENT.md)

---

## For Stakeholders: Key Findings Summary

### Critical Issues Found (Must-Fix)

- 🔴 **Agent Registry Mislabeling** — `WebAgent` registered as `CommandAgent`, etc.; breaks self-healing pool targeting
- 🔴 **Port Conflicts** — `RELIABILITY_AGENT_PORT` and `LLM_AGENT_PORT` both default to 3032
- 🔴 **Fail-Open Security** — Security agent doesn't block when unavailable; logs 403 but allows traffic
- 🔴 **Monolithic Entry Point** — `src/index.ts` is ~1500 lines; touches 10+ concerns (agents, API, background services, error handlers, PM2)

### Type Safety Gap

- Strict TypeScript disabled (`"strict": false`)
- Widespread `any` types (~10%+ of codebase)
- Non-null assertions (`llm!`) with no fallback
- Breaks IDE tooling and hides runtime bugs

### Configuration Drift

- `.env.example` missing ~40% of documented env vars
- Per-agent ports, self-healing flags, Vertex-only paths undocumented
- Config reads scattered across files (hard to audit)

### Self-Healing Coupling

- Tightly integrated with bootstrap; not a separate service
- DB initialization duplicated (startup + self-healing paths)
- Health endpoints leak into main API server
- Incorrect agent pool registration undermines reliability

### Testing Gaps

- Entry point composition not well-tested
- Multi-agent startup sequence lacks integration test
- Self-healing pool respawn behavior not covered
- Test suite is heterogeneous (Jest + shell + custom runners)

---

## For Leads: Phased Remediation Overview

| Phase | Focus | Effort | Duration |
|-------|-------|--------|----------|
| **1: Discovery** | Measure baselines, audit registry, catalog env vars | Small | ~3–5 days |
| **2: Classification** | Tier issues, estimate scope, build roadmap | Small | ~2–3 days |
| **3: Repo Clean** | Fix Tier 1 (security, registry, ports), enable strict TS, decompose entry point | **Large** | ~1–2 weeks |
| **4: Testing & Versioning** | Improve coverage, add API versioning, tighten IPC | Medium | ~1 week |
| **5: Optimization** | Performance, monitoring, hardening (ongoing) | Medium | Ongoing |

**Critical Path:** Phase 3 (Repo Clean) = most impact; unblocks all downstream work.

---

## Pre-Execution Decision Checklist

**Have these conversations with stakeholders before proceeding to Phase 3:**

- [ ] **TypeScript Strictness:** Enable during Phase 3, or defer? (Effort: 1–2 weeks)
- [ ] **Security Posture:** Fail-closed (block on unavailability) or fail-open (allow with logging)? (Risk vs Availability trade-off)
- [ ] **API Versioning:** Use `/api/v1/` namespace, or coordinate with clients? (Affects client deployment)
- [ ] **Self-Healing Autonomy:** Stay embedded in orchestrator, or become separate microservice? (Ops complexity)
- [ ] **Test Coverage Target:** Minimum acceptable %? (60% overall, 80% critical paths?)
- [ ] **Timeline:** Target completion date for all phases? (Affects parallelization)

**If unclear on any of these, escalate to decision-makers before next phase.**

---

## Execution Checklist (For Development Teams)

### Phase 1: Discovery (Do First)
- [ ] Run `npm run analyze:circular` → record output
- [ ] Run `npm run lint` → record baseline violations
- [ ] Run `npm test -- --coverage` → record coverage %
- [ ] Create `BASELINE-METRICS.md` with findings
- [ ] Grep `process.env` reads in `src/` → create `CONFIG_SURFACE.md`
- [ ] Audit `registerExistingAgent` calls → create `REGISTRY_AUDIT.md` (list any mismatches)
- [ ] Verify port defaults → document conflicts in `PORT_AUDIT.md`

### Phase 2: Classification (Do Second)
- [ ] Tier all issues (1=critical, 2=high, 3=medium, 4=low)
- [ ] Rank by risk & dependency
- [ ] Estimate scope per issue (effort in days/weeks, not calendar time)
- [ ] Create `ROADMAP.md` with phased work items

### Phase 3: Repo Clean (Do Third)
- [ ] **Task 1 (Quick):** Fix agent registry mislabeling
  - [ ] Correct all `registerExistingAgent` calls
  - [ ] Add test: verify name matches registry entry
  - [ ] Verify self-healing pool manager receives correct names
  - [ ] Commit & push
- [ ] **Task 2 (Quick):** Fix port conflicts
  - [ ] Assign unique ports to all agents
  - [ ] Update `.env.example`
  - [ ] Create `src/config/env.ts` with validation
  - [ ] Commit & push
- [ ] **Task 3 (Quick):** Fix security (fail-closed)
  - [ ] Update Security agent endpoint to block when unavailable
  - [ ] Restrict Socket.IO CORS
  - [ ] Add input validation to preload IPC handlers
  - [ ] Add tests for security behavior
  - [ ] Commit & push
- [ ] **Task 4 (Large):** Enable strict TypeScript
  - [ ] Update `tsconfig.json`
  - [ ] Fix `src/index.ts` type errors
  - [ ] Fix `src/orchestrator/` type errors
  - [ ] Fix `src/agents/` type errors
  - [ ] Fix `src/api/` type errors
  - [ ] Fix remaining modules
  - [ ] Commit per-module
- [ ] **Task 5 (Large):** Decompose entry point
  - [ ] Extract agent init → `src/bootstrap/agent-registry.ts`
  - [ ] Extract background services → `src/bootstrap/background-services.ts`
  - [ ] Extract server bootstrap → `src/bootstrap/api-server.ts`
  - [ ] Extract error handlers → `src/bootstrap/error-handlers.ts`
  - [ ] Reduce `src/index.ts` to ~200 lines
  - [ ] Add tests for each bootstrap module
  - [ ] Commit per-module
- [ ] **Task 6 (Medium):** Decouple self-healing
  - [ ] Create `src/self-healing/interfaces.ts` with contract
  - [ ] Refactor self-healing to export a service
  - [ ] Move health endpoints to separate router
  - [ ] Consolidate DB init
  - [ ] Add tests for independent start/stop
  - [ ] Commit
- [ ] **Task 7 (Quick):** Update documentation
  - [ ] Create `GOVERNANCE.md` (baseline metrics, patterns)
  - [ ] Create `CONFIGURATION.md` (all env vars, defaults, examples)
  - [ ] Update `README.md` with architecture notes
  - [ ] Commit

### Phase 4: Testing & Versioning (Do Fourth)
- [ ] **Task 1:** Add API versioning
  - [ ] Introduce `/api/v1/` namespace
  - [ ] Add deprecation headers to old paths
  - [ ] Document versioning strategy
  - [ ] Commit
- [ ] **Task 2:** Tighten preload IPC
  - [ ] Replace `Promise<any>` with concrete types
  - [ ] Add runtime validation for IPC payloads
  - [ ] Document IPC contract
  - [ ] Add test coverage
  - [ ] Commit
- [ ] **Task 3:** Improve test coverage
  - [ ] Add Jest tests for `src/bootstrap/` modules
  - [ ] Add integration test: multi-agent startup
  - [ ] Add integration test: self-healing pool registration
  - [ ] Add security test: fail-closed behavior
  - [ ] Consolidate test runners into `npm test`
  - [ ] Commit per-test-suite

### Phase 5: Optimization (Ongoing)
- [ ] Profile startup; optimize agent init order
- [ ] Add circuit breaker for LLM client
- [ ] Export Prometheus metrics
- [ ] Document alerting thresholds
- [ ] Security audit & code review
- [ ] Refactor remaining technical debt

---

## Success Criteria

| Metric | Target |
|--------|--------|
| **Entry point size** | Reduce to ~200 lines (from 1500) |
| **Type safety** | Enable strict mode; < 5% `any` usage |
| **Agent registry** | 100% correct name mapping |
| **Port conflicts** | Zero (unique port per agent) |
| **Configuration** | 100% documented in `.env.example` |
| **Test coverage** | 65%+ overall, 80%+ critical paths |
| **Security tests** | +50% new tests for fail-closed behavior |
| **Self-healing** | Clean service interface |
| **API versioning** | 100% endpoints under `/api/v1/` |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| **Startup order changes break initialization** | Critical | Medium | Test multi-agent startup before/after; use integration tests |
| **Type audit takes longer than estimated** | High | Medium | Start with critical modules; may need dedicated TypeScript engineer |
| **Agent registry fix breaks self-healing** | High | Low | Add test verification; coordinate with self-healing owner |
| **Security fail-closed causes outages** | Medium | Medium | Communicate to ops/on-call; provide circuit breaker for recovery |
| **Breaking API changes hit clients** | Medium | Low | Implement versioning; communicate deprecation timeline to clients |
| **Self-healing decoupling affects monitoring** | Medium | Low | Add health checks to new service interface; verify Socket.IO still broadcasts |

---

## Approval Gates

**Before proceeding from each phase, confirm:**

1. **After Phase 1 (Discovery):** Stakeholders sign off on findings and baseline metrics
2. **After Phase 2 (Classification):** Leads confirm tier prioritization and scope estimates
3. **Before Phase 3 (Repo Clean):** Six decisions confirmed (see section above)
4. **After Phase 3 (Repo Clean):** Tier 1 issues all fixed; strict TS enabled; entry point decomposed
5. **After Phase 4 (Testing):** Coverage target met; versioning implemented; IPC types tightened
6. **After Phase 5 (Optimization):** Production readiness checklist signed off

---

## Example Prompts for Agents

Detailed prompts for executing each work item are in [PLANNING-ASSESSMENT.md, Part 7](./PLANNING-ASSESSMENT.md#part-7-example-prompts-for-next-agents).

Quick links:
- **Bootstrap Decomposition** — Refactor entry point into modules
- **TypeScript Strict Mode** — Enable strict checks and fix errors
- **Configuration Audit** — Fix port conflicts, document env vars
- **Security Fix** — Implement fail-closed behavior
- **Agent Registry Fix** — Correct mislabeled agents
- **Self-Healing Decoupling** — Extract into service interface

---

## Timeline Estimate

*Note: No calendar estimates; using technical units.*

- **Phase 1 (Discovery):** ~5–10 engineer-days (parallel measurement)
- **Phase 2 (Classification):** ~2–3 engineer-days (planning + prioritization)
- **Phase 3 (Repo Clean):** ~10–15 engineer-days (largest; can parallelize tasks 1–3 with 4–6)
- **Phase 4 (Testing):** ~5–8 engineer-days (can overlap with Phase 3)
- **Phase 5 (Optimization):** Ongoing (lower priority; done between feature work)

**Total effort:** ~25–40 engineer-days across 2–4 weeks if team of 3–4 engineers.

---

## Contact & Escalation

- **Questions on findings?** → See [PLANNING-ASSESSMENT.md](./PLANNING-ASSESSMENT.md)
- **Questions on decisions?** → Escalate to lead/architect
- **Ready to execute Phase 1?** → Confirm and begin discovery
- **Ready to execute Phase 3?** → Confirm six decisions first

