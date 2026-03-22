# Documentation Strategy Implementation Plan

## Executive Summary

This document transforms the research findings from `DOCUMENTATION-STRATEGY.md` into a
scoped, executable work package using the multi-agent governance model defined in `AGENTS.md`.

**Recommended Approach:** Approach D (Governance-Integrated) with evolution toward Approach C.

**Total Effort:** Phase 1 (1–2 weeks) + Phase 2 (2–4 weeks) + Phase 3 (6–8 weeks ongoing).

**Revision Note (2026-03-22):** This version incorporates architectural corrections identified
in the initial plan review: corrected TypeDoc v0.26+ configuration schema, replacement of
hand-authored OpenAPI with `tsoa` code-first generation, addition of `docs/GLOSSARY.md`,
addition of `dependency-cruiser` for architectural drift, replacement of niche drift-detection
tools with `eslint-plugin-jsdoc`, and a versioned GitHub Pages deployment strategy.

---

## Goal Restatement

Transform the Jarvis codebase from minimal documentation to a **self-maintaining,
governance-enforced documentation system** that:

- Generates API reference from code (TypeDoc for TypeScript, tsoa-generated OpenAPI for HTTP endpoints)
- Captures architectural decisions in append-only ADRs
- Prevents documentation drift through CI/CD automation
- Leverages the existing multi-agent governance framework (Docs Guardian role)
- Scales with the codebase as it grows (275+ files and counting)

---

## Current State Gaps

| Area | Current State | Target State | Gap |
|------|--------------|--------------|-----|
| **API Documentation** | None | OpenAPI specs generated from tsoa-decorated routes | Critical |
| **Code Documentation** | Minimal JSDoc | TypeDoc-generated HTML for all modules | High |
| **Architecture Decisions** | Implicit in code | Formal ADRs with templates | High |
| **Module READMEs** | Inconsistent | Hierarchical (root → domain → subsystem) | Medium |
| **CI/CD Integration** | No doc validation | Documentation completeness gate | High |
| **Drift Prevention** | Manual (decays 85%/year) | eslint-plugin-jsdoc + dependency-cruiser on every PR | High |
| **Governance Enforcement** | Docs Guardian role defined | Active enforcement with checklist | Medium |
| **Terminology** | Undefined | Shared GLOSSARY.md for all Jarvis-specific terms | Medium |

---

## Implementation Plan: Three Phases

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Establish the infrastructure and patterns for sustainable documentation.

#### 1.1 Create Documentation Structure

**Agent:** Coder – Feature Agent
**Scope:** `docs/**` directory
**Changes:**
- Create `docs/ARCHITECTURE/` with ADR template: `docs/ARCHITECTURE/ADR-000-TEMPLATE.md`
- Create `docs/APIs/` for OpenAPI specifications
- Create `docs/GUIDES/` for domain-specific onboarding guides
- Create `docs/GLOSSARY.md` for Jarvis-specific terminology (Agent Registry, Orchestrator,
  Reliability Score System, Docs Guardian, Enforcement Supervisor, etc.)

**Why GLOSSARY.md now:** The Jarvis codebase uses custom terminology that does not map
to industry-standard terms. Without a shared glossary, ADRs and READMEs written by
different agents will use inconsistent vocabulary, causing semantic drift that compounds over
time. Creating it in Phase 1 ensures all subsequent documents use consistent terms.

**Success Criteria:**
- Folders exist and are tracked in git
- ADR template follows the structure in `ADR-000-TEMPLATE.md`
- GLOSSARY.md contains at least 15 defined terms covering all Jarvis-specific concepts
- Documentation structure is intuitive and extensible

#### 1.2 Set Up TypeDoc Configuration

**Agent:** Coder – Feature Agent
**Scope:** Root project configuration
**Changes:**
- Create `typedoc.json` using per-domain entry points (NOT a `src/**/*.ts` glob)

**Critical correction from original plan:** TypeDoc performs significantly better with explicit
per-domain entry points than with a glob. Using `src/**/*.ts` causes duplicate symbol
registration and destroys the module hierarchy in generated HTML. Each domain
(`src/agents/index.ts`, `src/security/index.ts`, etc.) should be a named entry point.

**Custom tag format correction:** TypeDoc v0.26+ uses top-level `blockTags` and
`modifierTags` arrays, not the nested `customTags[].definition` structure shown in earlier
documentation. Using the old format silently fails — tags are ignored without error.

```json
{
  "entryPoints": [
    "src/agents/index.ts",
    "src/orchestrator/index.ts",
    "src/security/index.ts",
    "src/self-healing/index.ts",
    "src/reliability/index.ts",
    "src/knowledge/index.ts",
    "src/voice/index.ts",
    "src/dashboard/index.ts",
    "src/shared/index.ts"
  ],
  "entryPointStrategy": "resolve",
  "out": "docs/API-REFERENCE",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules/**", "**/*.d.ts"],
  "excludePrivate": false,
  "excludeProtected": false,
  "includeVersion": true,
  "sort": ["source-order"],
  "categoryOrder": ["Core", "Agents", "Orchestrator", "Security", "Self-Healing", "Knowledge", "Voice", "Dashboard", "Utilities", "Logging"],
  "blockTags": ["@agent", "@domain", "@reliabilityThreshold"],
  "modifierTags": ["@critical", "@internal", "@experimental"]
}
```

**Success Criteria:**
- TypeDoc runs locally without errors: `npx typedoc`
- HTML output shows correct module hierarchy (one section per domain)
- No duplicate symbols in generated output
- Configuration is committed to git

#### 1.3 Add JSDoc to 10–15 Critical Agent Files

**Agent:** Coder – Feature Agent
**Scope:** `src/agents/*.ts` (10–15 most critical files)

**Recommended workflow:** Use Cursor/Copilot to generate JSDoc boilerplate for each file,
then review and edit for accuracy. AI-assisted JSDoc generation for 275+ files is feasible in
Phase 1 if done systematically — attempt it now and fall back to the 15-file minimum if
quality is insufficient.

```typescript
/**
 * @agent DialogueAgent
 * @description Handles conversational interactions with users via the LangGraph
 * ReAct loop. Manages session state via PostgresSaver checkpoints.
 * @domain core
 * @critical
 * @param {string} userInput The user's input message
 * @returns {Promise<VerifiedOutput>} The agent's response with provenance envelope
 * @throws {InvalidInputError} If user input fails Layer 1 sanitisation
 * @throws {AgentOfflineError} If the agent registry reports status OFFLINE
 */
```

**Success Criteria:**
- JSDoc coverage > 80% for selected files
- All `@agent`, `@domain`, `@critical` tags are used consistently
- Comments explain design intent, not just parameters

#### 1.4 Generate OpenAPI Specs via tsoa (NOT hand-authored YAML)

**Agent:** Coder – Feature Agent
**Scope:** HTTP endpoints for 3 agents (Dialogue, Web, Knowledge)

**Critical change from original plan:** The original plan proposed hand-authoring OpenAPI
YAML. This creates dual-maintenance burden: code and spec drift from each other within
weeks. Instead, use **tsoa** (TypeScript OpenAPI) to generate specs from TypeScript route
decorators:

```typescript
@Route("agents/dialogue")
@Tags("Dialogue Agent")
export class DialogueAgentController extends Controller {

  @Post("process")
  @OperationId("processDialogueRequest")
  public async process(@Body() body: DialogueRequest): Promise<VerifiedOutput> {
    return dialogueAgent.process(body);
  }
}
```

tsoa generates both the OpenAPI 3.1 spec and Express route handlers from the same source
— eliminating drift by definition. The generated spec can be served via Swagger UI at
`/docs/api`.

**Add to package.json:**
```json
"scripts": {
  "docs:generate": "typedoc",
  "docs:openapi": "tsoa spec",
  "docs:routes": "tsoa routes",
  "docs:serve": "http-server docs/API-REFERENCE"
}
```

**Success Criteria:**
- tsoa generates valid OpenAPI 3.1 spec from decorated controllers
- Spec renders in Swagger UI without errors
- Each controller has ≥ 5 documented endpoints with request/response examples
- No hand-authored YAML — spec is always generated from source

#### 1.5 Create First 3 ADRs

**Agent:** Coder – Feature Agent
**Scope:** `docs/ARCHITECTURE/`

The following fully-written ADRs are provided as immediate deliverables:

- **ADR-001:** Agent Orchestration Pattern (Registry + Supervisor + Worker-Dispatcher)
- **ADR-002:** Security Layer Design (5-layer defence strategy, Reliability Score enforcement)
- **ADR-003:** Self-Healing & Diagnostic Approach (jarvis-guardian, error/fix database, 3-tier recovery)

All three ADRs include a `Date Superseded` field (blank until superseded) to support the
Phase 3 quarterly review process without requiring template changes later.

**Success Criteria:**
- 3 ADRs committed to `docs/ARCHITECTURE/`
- Each ADR covers all template sections
- `Date Superseded` field is present (blank)
- Status is "Accepted"

#### 1.6 Expand Docs Guardian Role

**Agent:** Planning & PA Agent
**Scope:** `AGENTS.md` update
**Changes:**
- Add enforcement checklist to Docs Guardian section
- Link to this implementation plan
- Link to `DOCUMENTATION-STRATEGY.md`
- Set Phase 1 enforcement level: advisory

---

### Phase 1 Checklist

- [ ] `docs/ARCHITECTURE/`, `docs/APIs/`, `docs/GUIDES/` folders exist
- [ ] `docs/GLOSSARY.md` created with ≥ 15 defined terms
- [ ] `typedoc.json` uses per-domain entry points (not glob)
- [ ] TypeDoc generates clean HTML with correct module hierarchy
- [ ] JSDoc coverage > 80% for 10–15 critical agent files
- [ ] tsoa installed and generating OpenAPI 3.1 spec from controllers
- [ ] 3 representative OpenAPI specs generated (not hand-authored)
- [ ] ADR-001, ADR-002, ADR-003 committed with `Date Superseded` field
- [ ] Docs Guardian role expanded in `AGENTS.md`

**Agent Sequence for Phase 1:**
1. **Coder – Feature Agent** — folder structure, typedoc.json, JSDoc, tsoa setup, ADRs, GLOSSARY
2. **Enforcement Supervisor** — verify structure complies with AGENTS.md and LAYERING-STANDARDS.md
3. **Docs Guardian** — audit READMEs for quick wins
4. **Planning & PA Agent** — confirm Phase 1 readiness before Phase 2 kickoff

---

### Phase 2: Coverage (Weeks 3–6)

**Goal:** Generate comprehensive API documentation and establish governance enforcement.

#### 2.1 Configure TypeDoc CI Integration

**Agent:** Coder – Feature Agent
**Scope:** `.github/workflows/`

Add GitHub Actions workflow `WORKFLOW-TYPEDOC-GENERATION.yml`:
- Trigger: push to `master`, PR to `master`
- Cache `node_modules` keyed on `package-lock.json` hash (prevents 3–5 minute builds)
- Step: `npx typedoc`
- Step: Upload HTML as build artifact
- On merge to master: Deploy to GitHub Pages at `/{version}/` (e.g., `/v4/`, `/v5/`)

**Versioned deployment:** GitHub Pages should deploy TypeDoc output to a versioned path
(`gh-pages/v4/`) rather than overwriting the root. This allows developers to reference
documentation for a specific release. Use `peaceiris/actions-gh-pages` with `destination_dir`
set to the release tag.

```json
"scripts": {
  "docs:generate": "typedoc",
  "docs:openapi": "tsoa spec && tsoa routes",
  "docs:serve": "http-server docs/API-REFERENCE"
}
```

#### 2.2 Generate TypeDoc for All Source Files

**Success Criteria:** JSDoc coverage > 95% for all exported APIs. TypeDoc HTML is clean,
navigable, and warning-free. All module relationships visible.

#### 2.3 Expand ADR Coverage

Phase 1 delivered ADR-001 through ADR-003. Phase 2 expansion: create ADR-004 and
ADR-005 for decisions that emerged during Phase 1 implementation. All must use the updated
template with `Date Superseded` field.

#### 2.4 Create Domain-Specific READMEs

Create READMEs for: `src/agents/`, `src/self-healing/`, `src/reliability/`, `src/security/`,
`src/knowledge/`, `dashboard/`. Each README follows the standard template (Overview,
Architecture, Usage, Key Components, Common Patterns, Related Documentation, Contributing).

#### 2.5 Standardise OpenAPI Specs via tsoa

Extend tsoa controller coverage to all HTTP-based agents. Create `docs/APIs/INDEX.md`
listing all agents, endpoint counts, and links to Swagger UI.

#### 2.6 Add eslint-plugin-jsdoc and dependency-cruiser to CI

**Critical addition to original plan:**

`eslint-plugin-jsdoc` enforces JSDoc completeness as a linting rule — no external service
needed, integrates with the existing Static Analysis Guardian role:

```json
// .eslintrc additions
{
  "plugins": ["jsdoc"],
  "rules": {
    "jsdoc/require-jsdoc": ["warn", { "publicOnly": true }],
    "jsdoc/require-description": "warn",
    "jsdoc/require-param": "warn",
    "jsdoc/require-returns": "warn"
  }
}
```

`dependency-cruiser` detects when module relationships violate defined rules — catching
architectural drift that TypeDoc and JSDoc coverage metrics cannot:

```json
// .dependency-cruiser.js: forbid agents importing from security internals directly
{ "name": "no-agent-to-security-internals", "from": { "path": "^src/agents" },
  "to": { "path": "^src/security/internals" } }
```

Both tools run on every PR and report violations as warnings (Phase 2) escalating to errors
(Phase 3).

#### 2.7 Document Documentation Strategy in Governance

- Finalise this file as `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md`
- Add reference in `AGENTS.md` Docs Guardian section
- Update `DOCUMENTATION-STRATEGY.md` with Phase 1 completion status

---

### Phase 2 Checklist

- [ ] TypeDoc CI workflow with `node_modules` caching
- [ ] Versioned GitHub Pages deployment (`/v4/`) configured
- [ ] JSDoc coverage > 95% for all exported APIs
- [ ] ADR-004 and ADR-005 created if new decisions emerged
- [ ] 6 domain READMEs complete
- [ ] tsoa generating OpenAPI for all HTTP-based agents
- [ ] `eslint-plugin-jsdoc` running on PRs (advisory level)
- [ ] `dependency-cruiser` running on PRs (advisory level)
- [ ] Docs Guardian actively reviewing PRs

---

### Phase 3: Automation (Weeks 7–14+ ongoing)

**Goal:** Fully automate documentation generation and drift detection; establish hard
enforcement gates.

#### 3.1 Escalate eslint-plugin-jsdoc to Blocking

Escalate from advisory to error-level. All PRs touching exported APIs must have JSDoc.
Exception: `SKIP_DOC_CHECK` label for emergency patches, with mandatory post-merge
documentation within 2 business days.

#### 3.2 Escalate dependency-cruiser to Blocking

Architectural boundary violations block merge. Update `.dependency-cruiser.js` with any new
boundary rules discovered during Phase 2.

#### 3.3 Establish "Documentation as Test" Gate

Create mandatory CI checks (blocking merges):
1. All public APIs have JSDoc (`eslint-plugin-jsdoc` — error level)
2. No architectural boundary violations (`dependency-cruiser` — error level)
3. ADRs for architectural changes (detected by Docs Guardian PR review)
4. tsoa-generated OpenAPI specs are valid
5. TypeDoc generates without warnings

#### 3.4 Establish Quarterly ADR Review Process

Quarterly review (Mar 31, Jun 30, Sep 30, Dec 31):
1. Review all ADRs created in past quarter
2. Identify decisions that may be outdated
3. Create superseding ADRs (new record) for changes — never edit existing ADRs
4. Mark old ADRs as "Superseded" with link to new record and `Date Superseded` populated

Document process in `docs/GOVERNANCE-PROCESSES.md`.

#### 3.5 Documentation Metrics & Dashboarding

Metrics to collect:
- TypeDoc: total exported APIs vs. documented (% coverage)
- JSDoc: quality score by module (words per API, tag completeness)
- ADRs: total by status, age, decision recency
- Dependency violations: count by module, trend over time

Quarterly health report surfacing gaps and priorities.

#### 3.6 Documentation Site Setup

**Recommended path:**
- Phase 3 start: TypeDoc HTML deployed to GitHub Pages at versioned paths (already set up
  in Phase 2 CI)
- Phase 3 end: Evaluate MkDocs or Docusaurus if a unified site combining TypeDoc, ADRs,
  GLOSSARY, and Swagger UI is needed. This is optional — start with GitHub Pages only and
  evolve based on actual usage.

---

### Phase 3 Checklist

- [ ] eslint-plugin-jsdoc is blocking merges
- [ ] dependency-cruiser is blocking merges
- [ ] Hard documentation gate blocks all PRs with violations
- [ ] ADR quarterly review process is held and documented
- [ ] Docs Guardian enforcing on 100% of PRs
- [ ] Documentation coverage metrics collected and reported
- [ ] Quarterly health report generated

---

## Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **TypeDoc breaks on TS upgrades** | Low | Pin TypeDoc version in package.json; add version check to CI |
| **tsoa decorators add boilerplate overhead** | Medium | Limit to HTTP-facing controllers only; pure internal agents use TypeDoc only |
| **eslint-plugin-jsdoc false positives** | Low | Configure `publicOnly: true`; start at warn level, tighten after 2 weeks |
| **dependency-cruiser rules too restrictive** | Medium | Start permissive; add rules incrementally based on real violations observed |
| **ADR fatigue** | Medium | Keep template simple; make ADR creation part of PR process; enforce template |
| **Phase 1 JSDoc effort underestimated** | Medium | Use Cursor/Copilot for initial boilerplate generation; review for accuracy |
| **Versioned GitHub Pages complexity** | Low | Use `peaceiris/actions-gh-pages` with `destination_dir`; tested pattern |
| **Team resistance to blocking gates** | High | Phase 1 = advisory only; show value before enforcement; good communication |

---

## Decision Points for Human Owner

### 1. tsoa vs. hand-authored OpenAPI
**Status:** ✅ **Recommended: tsoa (code-first generation)**
Eliminates dual-maintenance. Only consider hand-authored YAML for agents that do not use
Express/HTTP (e.g., pure LangGraph agents with no HTTP surface).

### 2. eslint-plugin-jsdoc vs. DeepDocs/FluentDocs
**Status:** ✅ **Recommended: eslint-plugin-jsdoc + dependency-cruiser (free, integrated)**
Zero external service dependency. Integrates with existing ESLint configuration.
DeepDocs/FluentDocs remain options if AI-generated documentation suggestions are wanted —
but are not needed for enforcement.

### 3. Versioned GitHub Pages
**Status:** ✅ **Recommended: versioned paths (/v4/, /v5/)**
Prevents documentation for V5 from overwriting V4 reference. Requires `destination_dir`
config in the GitHub Pages action.

### 4. GLOSSARY.md scope
**Status:** ✅ **Recommended: Phase 1 — at least 15 terms**
Focus on: Agent Registry, Orchestrator, Supervisor Node, Docs Guardian, Enforcement Supervisor,
Reliability Score, VerifiedOutput, Worker-Dispatcher, jarvis-guardian, Thread ID,
Checkpointer, ADR, tsoa, Drift Detection, Domain Entry Point.

### 5. Enforcement Timeline
**Status:** ✅ **Phase 1 = advisory; Phase 2 = advisory; Phase 3 = blocking**
No change from original recommendation.

---

## Success Metrics

### Phase 1 Success
- ✅ TypeDoc generates HTML with correct per-domain module hierarchy
- ✅ 3 tsoa-generated OpenAPI specs are valid and renderable in Swagger UI
- ✅ ADR-001, ADR-002, ADR-003 committed with `Date Superseded` field
- ✅ JSDoc coverage > 80% for critical files
- ✅ GLOSSARY.md with ≥ 15 terms
- ✅ Docs Guardian role expanded

### Phase 2 Success
- ✅ JSDoc coverage > 95% for all exported APIs
- ✅ TypeDoc integrates into CI with caching and versioned GitHub Pages deployment
- ✅ 6 domain READMEs complete
- ✅ eslint-plugin-jsdoc running on all PRs
- ✅ dependency-cruiser running on all PRs

### Phase 3 Success
- ✅ All documentation checks are blocking on master
- ✅ Quarterly ADR review process established
- ✅ Documentation coverage > 90%
- ✅ Documentation rot < 10% year-over-year (vs. 85% baseline)

---

## Next Steps (Immediate)

1. Drop `ADR-001`, `ADR-002`, `ADR-003`, `ADR-000-TEMPLATE.md` into `docs/ARCHITECTURE/`
2. Drop `typedoc.json` into project root
3. Create `docs/GLOSSARY.md` with initial 15 terms
4. Install tsoa: `npm install tsoa --save-dev`
5. **Planning & PA Agent:** Assign Phase 1 tasks to Coder – Feature Agent
6. **Enforcement Supervisor:** Review documentation requirements against governance standards

---

## Timeline Summary

| Phase | Duration | Key Deliverables | Owners |
|-------|----------|-----------------|--------|
| **Phase 1** | 1–2 weeks | typedoc.json (per-domain), JSDoc, 3 tsoa OpenAPI specs, 3 ADRs, GLOSSARY | Coder, Planning |
| **Phase 2** | 2–4 weeks | CI (cached TypeDoc + versioned Pages), domain READMEs, eslint-plugin-jsdoc, dependency-cruiser | Coder, Supervisor |
| **Phase 3** | 6–8 weeks (initial); ongoing | Hard gates, quarterly ADR reviews, metrics dashboard | Research, Coder, Supervisor |

---

## Related Documents

- `DOCUMENTATION-STRATEGY.md` — Research findings and candidate approaches
- `AGENTS.md` — Governance framework and agent roles
- `docs/ARCHITECTURE/ADR-000-TEMPLATE.md` — ADR template
- `docs/GLOSSARY.md` — Jarvis-specific terminology (to be created)
- `.github/workflows/WORKFLOW-TYPEDOC-GENERATION.yml` — CI TypeDoc workflow (to be created)
- `.github/workflows/WORKFLOW-DOCUMENTATION-VALIDATION.yml` — CI validation workflow (to be created)

---

*Last updated: 2026-03-22. Revision 2 — incorporates architectural corrections from Phase 0 review.*
