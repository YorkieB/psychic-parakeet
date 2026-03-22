# Documentation Strategy Implementation Plan

## Executive Summary

This document transforms the research findings from `DOCUMENTATION-STRATEGY.md` into a scoped, executable work package using the multi-agent governance model defined in `AGENTS.md`.

**Recommended Approach:** Approach D (Governance-Integrated) with evolution toward Approach C.

**Total Effort:** Phase 1 (1–2 weeks) + Phase 2 (2–4 weeks) + Phase 3 (6–8 weeks ongoing).

---

## Goal Restatement

Transform the Jarvis codebase from minimal documentation to a **self-maintaining, governance-enforced documentation system** that:

- Generates API reference from code (TypeDoc for TypeScript, OpenAPI for HTTP endpoints)
- Captures architectural decisions in append-only ADRs
- Prevents documentation drift through CI/CD automation
- Leverages the existing multi-agent governance framework (Docs Guardian role)
- Scales with the codebase as it grows (275+ files and counting)

---

## Current State Gaps

| Area | Current State | Target State | Gap |
|------|--------------|--------------|-----|
| **API Documentation** | None | OpenAPI specs for all HTTP endpoints | Critical |
| **Code Documentation** | Minimal JSDoc | TypeDoc-generated HTML for all modules | High |
| **Architecture Decisions** | Implicit in code | Formal ADRs with templates | High |
| **Module READMEs** | Inconsistent | Hierarchical (root → domain → subsystem) | Medium |
| **CI/CD Integration** | No doc validation | Documentation completeness gate | High |
| **Drift Prevention** | Manual (decays 85%/year) | Automated (DeepDocs on every PR) | High |
| **Governance Enforcement** | Docs Guardian role defined | Active enforcement with checklist | Medium |

---

## Implementation Plan: Three Phases

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Establish the infrastructure and patterns for sustainable documentation.

#### 1.1 Create Documentation Structure

**Agent:** Coder – Feature Agent  
**Scope:** `docs/**` directory  
**Changes:**
- Create `docs/ARCHITECTURE/` folder with ADR template: `docs/ARCHITECTURE/ADR-000-TEMPLATE.md`
- Create `docs/APIs/` folder for OpenAPI specifications
- Create `docs/GUIDES/` folder for domain-specific onboarding guides

**Success Criteria:**
- Folders exist and are tracked in git
- ADR template follows AWS/Microsoft conventions (Status, Context, Decision, Alternatives, Consequences)
- Documentation structure is intuitive and extensible

#### 1.2 Set Up TypeDoc Configuration

**Agent:** Coder – Feature Agent  
**Scope:** Root project configuration  
**Changes:**
- Create `typedoc.json` with:
  - Entry points: explicit per-domain sources (e.g., `src/agents/index.ts`, `src/self-healing/index.ts`, etc.)
  - `entryPointStrategy: "resolve"` for better handling of re-exports and module resolution
  - Output directory: `docs/API-REFERENCE/` (not committed to git, generated only)
  - Exclude patterns: tests, node_modules, temporary files
  - Theme: default or custom modern theme
  - Grouping: by module/domain
  - Tags: custom `@agent`, `@domain`, `@critical` for classification

**Example Configuration:**
```json
{
  "entryPoints": [
    "src/agents/index.ts",
    "src/self-healing/index.ts",
    "src/reliability/index.ts",
    "src/security/index.ts",
    "src/utils/index.ts"
  ],
  "entryPointStrategy": "resolve",
  "out": "docs/API-REFERENCE",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules/**"],
  "excludePrivate": false,
  "excludeProtected": false,
  "includeVersion": true,
  "sort": ["source-order"],
  "categoryOrder": ["Core", "Agents", "Utilities", "Security", "Logging"],
  "customTags": [
    {
      "name": "agent",
      "definition": {
        "kind": "modifier",
        "isInline": false
      }
    }
  ]
}
```

**Success Criteria:**
- TypeDoc runs locally without errors: `npx typedoc`
- HTML output is clean and navigable by per-domain sections
- Configuration is committed to git
- Per-domain entryPoints are properly resolved and documented

#### 1.3 Add JSDoc to 10–15 Critical Agent Files

**Agent:** Coder – Feature Agent  
**Scope:** `src/agents/*.ts` (10–15 most critical files)  
**Changes:**
- Add standardized JSDoc comments to each exported class, function, and interface:
  ```typescript
  /**
   * @agent DialogueAgent
   * @description Handles conversational interactions with users
   * @domain core
   * @critical true
   * @param {string} userInput The user's input message
   * @returns {Promise<Response>} The agent's response
   * @throws {InvalidInputError} If user input is empty
   * @example
   * const response = await dialogueAgent.process("Hello");
   */
  ```
- Focus on public APIs and exported interfaces only
- Document intent ("why"), not just parameters ("what")

**Success Criteria:**
- JSDoc coverage > 80% for selected files
- TypeDoc generates HTML without warnings
- Comments explain non-obvious design choices

#### 1.4 Set Up tsoa for OpenAPI Spec Generation

**Agent:** Coder – Feature Agent  
**Scope:** HTTP controllers and tsoa configuration  
**Changes:**
- Install tsoa: `npm install --save-dev tsoa`
- Create `tsoa.json` configuration with:
  - `entryPoint`: `src/controllers/index.ts` or root HTTP controllers file
  - `outDir`: `docs/APIs/generated/`
  - `routes`: `docs/APIs/routes.ts` (for runtime route generation if needed)
  - `spec`: OpenAPI 3.1 spec output file location
  - `target`: "es2020" or appropriate TypeScript target
  - Standardized response envelope schema in `tsoa.json` or shared types
- Create `src/controllers/index.ts` with:
  - Import all HTTP endpoint controllers
  - Export for tsoa spec generation
- Decorate 2–3 representative controllers with `@tsoa` decorators (e.g., Dialogue, Web, Knowledge agents):
  ```typescript
  import { Controller, Get, Post, Route, Response } from 'tsoa';
  
  @Route('agents/dialogue')
  export class DialogueController extends Controller {
    /**
     * Process user dialogue
     * @param userInput The user's input message
     */
    @Post('process')
    async process(userInput: string): Promise<DialogueResponse> {
      // implementation
    }
  }
  ```
- Add npm script: `"docs:openapi": "tsoa spec-and-routes"`

**Deliverables:**
- `tsoa.json` committed to git
- `docs/APIs/generated/swagger.json` and `openapi.json` (generated, git-ignored)
- Controllers decorated with tsoa annotations
- README at `docs/APIs/README.md` explaining OpenAPI generation and Swagger UI access

**Success Criteria:**
- tsoa generates valid OpenAPI 3.1 spec without errors
- Generated spec covers all decorated HTTP endpoints
- Spec includes request/response schemas and examples
- Spec is renderable in Swagger UI
- Generated specs are git-ignored (only source decorators committed)

#### 1.5 Create First 3 ADRs

**Agent:** Coder – Feature Agent  
**Scope:** `docs/ARCHITECTURE/`  
**Changes:**
- Create ADR-001: Agent Orchestration Pattern (registry + router architecture)
- Create ADR-002: Security Layer Design (5-layer defense strategy)
- Create ADR-003: Self-Healing & Diagnostic Approach

**Template for each ADR:**
```markdown
# ADR-001: Agent Orchestration Pattern

## Status
Accepted

## Date
2026-03-21

## Context
Jarvis manages multiple autonomous agents (Dialogue, Web, Knowledge, etc.). Decisions needed:
- How are agents discovered and registered?
- How are requests routed to appropriate agents?
- How do agents communicate?

## Decision
Implement registry pattern with:
1. Central agent registry (singleton)
2. Router middleware for request routing
3. Orchestrator service for agent lifecycle management

## Alternatives Considered
1. Direct agent imports (tight coupling, not scalable)
2. Service mesh (too heavyweight for internal use)
3. Publish-subscribe (async, not suitable for synchronous requests)

## Consequences
- ✅ Agents are loosely coupled
- ✅ New agents can be registered without code changes
- ⚠️ Adds indirection layer (minimal performance impact)
- ⚠️ Requires careful registry cleanup on agent removal

## Related Decisions
- ADR-002: Security Layer Design (orchestrator position in security chain)
- ADR-003: Self-Healing (orchestrator monitors agent health)
```

**Success Criteria:**
- 3 ADRs created, following template structure
- Each ADR ≥500 words covering all sections
- ADRs are linked to governance standards
- Status is "Accepted" or "Proposed" (human review before merge)

#### 1.6 Expand Docs Guardian Role

**Agent:** Planning & PA Agent  
**Scope:** `AGENTS.md` update  
**Changes:**
- Add to Docs Guardian section:
  - Responsibility for documentation completeness checklist
  - Enforcement level (Phase 1 = advisory; Phase 2 = blocking)
  - Links to this implementation plan
  - Quarterly review cadence for ADRs

**Success Criteria:**
- Docs Guardian role is clearly defined
- Enforcement checklist is documented
- Links to this plan and DOCUMENTATION-STRATEGY.md are in place

---

### Phase 1 Checklist

**Before Phase 2 starts, verify:**

- [ ] `docs/ARCHITECTURE/`, `docs/APIs/`, `docs/GUIDES/` folders exist
- [ ] `typedoc.json` is configured with per-domain entryPoints and `entryPointStrategy: "resolve"`
- [ ] `tsoa.json` is configured and committed
- [ ] TypeDoc generates HTML for all per-domain sources without errors
- [ ] JSDoc coverage > 80% for selected agent files
- [ ] 2–3 representative controllers are decorated with tsoa `@Route`, `@Post`, etc. annotations
- [ ] tsoa generates valid OpenAPI 3.1 spec: `npm run docs:openapi`
- [ ] 3 critical ADRs are written and merged
- [ ] Docs Guardian role is expanded in AGENTS.md
- [ ] CI artifact configuration prepared for TypeDoc and OpenAPI generation

**Agent Sequence for Phase 1:**
1. **Coder – Feature Agent** – Create folder structure, configure TypeDoc per-domain, set up tsoa, add JSDoc, decorate sample controllers, create ADRs
2. **Enforcement Supervisor** – Verify documentation structure complies with AGENTS.md and LAYERING-STANDARDS.md
3. **Docs Guardian** – Audit README files for quick wins; recommend updates
4. **Planning & PA Agent** – Confirm Phase 1 readiness before Phase 2 kickoff

---

### Phase 2: Coverage (Weeks 3–6)

**Goal:** Generate comprehensive API documentation and establish governance enforcement.

#### 2.1 Configure TypeDoc CI Integration

**Agent:** Coder – Feature Agent  
**Scope:** `.github/workflows/`, project build configuration  
**Changes:**
- Add GitHub Actions workflow `WORKFLOW-TYPEDOC-GENERATION.md`:
  - Trigger: on push to `master`, on PR to `master`
  - Step 1: Install dependencies
  - Step 2: Run `npx typedoc`
  - Step 3: Upload HTML as build artifact (for PR review)
  - Step 4: (On merge to master) Deploy to documentation site or GitHub Pages
- Add TypeDoc generation to `package.json` scripts:
  ```json
  "scripts": {
    "docs:generate": "typedoc",
    "docs:serve": "http-server docs/API-REFERENCE"
  }
  ```
- Ensure TypeDoc runs on every PR (no merge without documentation)

**Success Criteria:**
- Workflow file is created and documented
- TypeDoc generation runs in CI without errors
- Artifacts are available for review in PRs
- Documentation deploys to GitHub Pages on master merge

#### 2.2 Generate TypeDoc for All Source Files

**Agent:** Coder – Feature Agent  
**Scope:** Entire codebase (`src/**/*.ts`)  
**Changes:**
- Add JSDoc comments to all exported APIs (not just critical ones)
- Ensure consistency: all classes, functions, interfaces have documentation
- Add `@internal` tags to private/internal modules
- Generate final TypeDoc output

**Success Criteria:**
- JSDoc coverage > 95% for all exported APIs
- TypeDoc generates clean, warning-free HTML
- Documentation is navigable and searchable
- All module relationships are clear in generated docs

#### 2.3 Write 3 Critical ADRs (Backfill)

**Agent:** Coder – Feature Agent  
**Scope:** `docs/ARCHITECTURE/` (add to Phase 1's 3 ADRs)  
**Changes:**
- Phase 1 already covers ADR-001, ADR-002, ADR-003
- Phase 2 expansion: If additional decisions emerge, create ADR-004, ADR-005, etc.
- Alternatively: Review and refine existing ADRs based on team feedback

**Success Criteria:**
- 3–5 total ADRs exist
- Each ADR is linked from ARCHITECTURE.md index
- Quarterly review process is documented

#### 2.4 Create Domain-Specific READMEs

**Agent:** Coder – Feature Agent  
**Scope:** Key subsystems  
**Changes:**
- Update root `README.md` (if needed): name, description, quick start, features, architecture overview
- Create `src/agents/README.md`: agent registry, how to add new agent, agent lifecycle, examples
- Create `src/self-healing/README.md`: self-healing patterns, diagnostic tools, recovery mechanisms
- Create `src/reliability/README.md`: resilience patterns, circuit breakers, retries
- Create `src/security/README.md`: security layers, threat model, defense strategies
- Create `dashboard/README.md`: dashboard features, data flow, customization

**Template for each README:**
```markdown
# [Subsystem Name]

## Overview
Brief description (1–2 paragraphs) of what this subsystem does.

## Architecture
Key classes, patterns, and how they interact.

## Usage
Quick start example with code snippet.

## Key Components
- Component A: what it does
- Component B: what it does

## Common Patterns
- Pattern X: when to use it
- Pattern Y: when to use it

## Related Documentation
- Link to relevant ADRs
- Link to API reference (TypeDoc)
- Link to governance standards

## Contributing
Pointer to CONTRIBUTING.md; reference governance standards.
```

**Success Criteria:**
- All domain READMEs are created (≥5 files)
- Each README is 200–500 words, clear, and complete
- Examples include working code snippets
- Links to TypeDoc and ADRs are present

#### 2.5 Expand tsoa OpenAPI Generation to All Controllers

**Agent:** Coder – Feature Agent  
**Scope:** All HTTP controllers  
**Changes:**
- Extend Phase 1's 2–3 decorated controllers to all HTTP-based agents
- Add tsoa decorators to remaining controllers
- Configure `tsoa.json` to generate complete OpenAPI 3.1 spec
- Create `docs/APIs/README.md` with:
  - Overview of OpenAPI spec generation via tsoa
  - Link to generated Swagger UI
  - Instructions for adding new endpoints (document with tsoa decorators, then regenerate)
  - List of all documented agents and endpoints
- Add CI workflow step to regenerate specs on every PR (see 2.1)
- Verify decorators match actual behavior (request/response types match implementation)

**Success Criteria:**
- All agent endpoints have tsoa decorators
- OpenAPI spec generates automatically from controllers
- Spec covers all HTTP endpoints (100% generation coverage)
- Specs are valid per OpenAPI 3.1 schema
- Swagger UI renders spec without errors
- Developers understand decorator workflow for adding new endpoints

#### 2.6 Add Documentation Checklist to CI

**Agent:** Enforcement Supervisor  
**Scope:** Workflow configuration, CI validation  
**Changes:**
- Create validation workflow: `WORKFLOW-DOCUMENTATION-VALIDATION.md`
- Checks:
  1. New/changed APIs have JSDoc comments
  2. New ADRs (if any) follow template
  3. No broken links in documentation
  4. TypeDoc generates without warnings
  5. OpenAPI specs are valid YAML/JSON
- Enforcement level (Phase 2): Advisory/warning only; escalate to error in Phase 3
- Integration point: Add to Enforcement Supervisor checklist

**Success Criteria:**
- Validation workflow runs on every PR
- Violations are reported (not blocking merges yet)
- Docs Guardian reviews violations and recommends fixes
- Documentation health improves as team adapts

#### 2.7 Document Documentation Strategy in Governance

**Agent:** Planning & PA Agent  
**Scope:** `AGENTS.md`, `docs/**`  
**Changes:**
- Finalize this implementation plan as `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md` (this file)
- Add reference in `AGENTS.md` Docs Guardian section
- Update `docs/DOCUMENTATION-STRATEGY.md` with status of Phase 1 completion
- Link from governance index to documentation standards

**Success Criteria:**
- Implementation plan is finalized and committed
- Governance documents link to it
- Next steps for Phase 3 are documented

---

### Phase 2 Checklist

**Before Phase 3 starts, verify:**

- [ ] TypeDoc generation is configured in CI
- [ ] Workflow generates and artifacts TypeDoc HTML on every PR
- [ ] JSDoc coverage > 95% for all exported APIs
- [ ] TypeDoc HTML is clean and navigable
- [ ] 3–5 ADRs exist and are linked from governance
- [ ] 5+ domain READMEs are complete and comprehensive
- [ ] OpenAPI specs cover all HTTP endpoints
- [ ] OpenAPI specs are valid and renderable in Swagger UI
- [ ] Documentation validation workflow runs on PRs
- [ ] Docs Guardian role is actively enforcing (advisory level)

**Agent Sequence for Phase 2:**
1. **Coder – Feature Agent** – Configure CI, add JSDoc, create READMEs, finalize OpenAPI specs
2. **Enforcement Supervisor** – Add documentation validation to CI workflows
3. **Docs Guardian** – Begin reviewing PRs for documentation completeness
4. **Static Analysis Guardian** – Verify JSDoc style consistency and naming conventions

---

### Phase 3: Automation (Weeks 7–14+ ongoing)

**Goal:** Fully automate documentation generation and drift detection; establish governance enforcement.

#### 3.1 Establish Drift Prevention with eslint-plugin-jsdoc and dependency-cruiser

**Agent:** Coder – Feature Agent  
**Scope:** Linting and dependency analysis configuration  
**Changes:**
- Configure `eslint-plugin-jsdoc` to enforce:
  - All exported APIs must have JSDoc comments
  - JSDoc tags must follow conventions (`@param`, `@returns`, `@throws`, `@example`)
  - Missing documentation on public functions fails lint
  - Custom tags validated (e.g., `@agent`, `@domain`, `@critical`)
- Install and configure `dependency-cruiser`:
  - Add `.dependency-cruiser.json` with:
    - Module boundary rules (e.g., agents cannot import from security internals)
    - Cycle detection rules
    - Forbidden dependency patterns
  - Add npm script: `"validate:deps": "depcruise src"`
- Add to CI workflows:
  - `npm run lint:jsdoc` (check JSDoc completeness)
  - `npm run validate:deps` (check dependency health)
  - Both run on every PR and fail merge if violations found
- Document in `.github/docs/workflows/WORKFLOW-JSDoc-ENFORCEMENT.md` and `.github/docs/workflows/WORKFLOW-DEPENDENCY-INTEGRITY.md`

**Rationale:**
- **eslint-plugin-jsdoc** prevents documentation drift at the source (enforces JSDoc completeness)
- **dependency-cruiser** prevents architectural drift (enforces layering and domain boundaries)
- Both are open-source, zero-cost, deeply integrated into TypeScript tooling
- External tools (DeepDocs, etc.) remain optional for advanced analysis but are not critical

**Success Criteria:**
- eslint-plugin-jsdoc is installed and configured
- dependency-cruiser is installed and configured
- Both run successfully on existing codebase
- CI fails if JSDoc coverage drops or dependency rules violated
- Team understands rules and workflow

#### 3.2 Establish "Documentation as Test" Gate

**Agent:** Enforcement Supervisor  
**Scope:** CI/CD workflows  
**Changes:**
- Create mandatory documentation checks (blocking merges):
  1. All public APIs must have JSDoc
  2. New ADRs must follow template
  3. No broken documentation links
  4. OpenAPI specs must validate
  5. TypeDoc generates without warnings
- Enforcement level: **Hard gate** (fail merge if violations)
- Exceptions:
  - Trivial changes (e.g., variable rename in unused internal utility)
  - Emergency patches (marked with `SKIP_DOC_CHECK` label, requires post-merge documentation within 2 days)

**Success Criteria:**
- Documentation validation is blocking on master
- Team adapts to documentation requirements
- Documentation-related failures are minimal (< 5% of PRs)
- Exception process is clear and tracked

#### 3.3 Establish Quarterly ADR Review Process

**Agent:** Planning & PA Agent  
**Scope:** Governance process  
**Changes:**
- Schedule quarterly ADR review meetings (e.g., end of each quarter: Mar 31, Jun 30, Sep 30, Dec 31)
- Attendees: Architects, Planning & PA Agent, Enforcement Supervisor, Docs Guardian (5–10 people)
- Meeting flow:
  1. Review all ADRs created in past quarter
  2. Identify decisions that may be outdated
  3. Create "superseding ADRs" (new record) for changes, not edits
  4. Mark old ADRs as "Superseded" with link to new record
- Document process in `docs/GOVERNANCE-PROCESSES.md`

**Success Criteria:**
- Quarterly review is scheduled and attended
- Meeting notes are recorded
- Superseding ADRs are created when needed
- Historical ADR trail is maintained (no deletions, only superseding)

#### 3.4 Expand Docs Guardian Scope

**Agent:** Planning & PA Agent  
**Scope:** `AGENTS.md` Docs Guardian role  
**Changes:**
- Docs Guardian responsibilities now include:
  1. **API Documentation Completeness**: Ensure all public APIs have TypeDoc comments and OpenAPI specs
  2. **ADR Freshness**: Track when ADRs become outdated; recommend quarterly review
  3. **README Accuracy**: Monitor for stale README information
  4. **Link Health**: Regularly check for broken links in documentation
  5. **Coverage Metrics**: Report documentation coverage (% of exported APIs documented, % of critical systems with ADRs)
- Add enforcement checklist:
  - All PRs touching core systems must pass documentation validation
  - ADRs for architectural changes are non-negotiable
  - Phase 3 violations block merge

**Success Criteria:**
- Docs Guardian actively runs on 100% of PRs
- Documentation coverage metrics improve over time
- Violations are resolved before merge

#### 3.5 Documentation Metrics & Dashboarding

**Agent:** Coder – Feature Agent  
**Scope:** Metrics collection and reporting  
**Changes:**
- Add metrics to TypeDoc generation:
  - Total API count vs. documented API count (% documented)
  - JSDoc quality score (by module)
  - Comment depth (words per API)
- Add metrics for ADRs:
  - Total ADRs by status (Accepted, Proposed, Superseded)
  - ADR age (when last ADR was created)
  - Decision recency (% of decisions < 1 year old)
- Create quarterly documentation health report:
  - Include metrics
  - Highlight gaps
  - Recommend priorities
- Optional: Create simple dashboard (README.md or GitHub Pages HTML) showing metrics

**Success Criteria:**
- Metrics are collected and reported
- Quarterly health reports are generated
- Documentation coverage is > 90%
- Team has visibility into documentation status

#### 3.6 Documentation Site Setup (Optional)

**Agent:** Coder – Feature Agent  
**Scope:** Static documentation hosting  
**Changes:**
- Option A: Deploy TypeDoc HTML to GitHub Pages automatically
- Option B: Build static site (e.g., MkDocs, Docusaurus) combining TypeDoc, ADRs, guides, OpenAPI specs
- Option C: Keep documentation in git only; no separate hosting
- Recommendation: Start with Option A (lower effort), evolve to Option B if needed

**Success Criteria:**
- Documentation is discoverable (either at GitHub Pages or linked from main README)
- Links are stable (no 404s)
- Search functionality is available (if using static site generator)

---

### Phase 3 Checklist

**Ongoing verification (quarterly):**

- [ ] eslint-plugin-jsdoc is enforcing JSDoc completeness on all exports
- [ ] dependency-cruiser is enforcing module boundaries and preventing cycles
- [ ] Both tools run on every PR and fail merge if violations found
- [ ] Documentation validation is blocking merges
- [ ] ADR review process is held quarterly
- [ ] Docs Guardian is actively enforcing documentation standards
- [ ] Documentation coverage metrics are collected and reported
- [ ] Documentation health report is generated each quarter
- [ ] Team morale regarding documentation tooling is positive (informal feedback)
- [ ] Optional: External drift detection tools (DeepDocs, FluentDocs) evaluated for advanced use cases

**Agent Sequence for Phase 3:**
1. **Coder – Feature Agent** – Configure eslint-plugin-jsdoc and dependency-cruiser; integrate into CI
2. **Enforcement Supervisor** – Escalate documentation validation to hard gate; establish exception handling
3. **Planning & PA Agent** – Establish quarterly ADR review process and governance
4. **Docs Guardian** – Begin active enforcement with metrics reporting
5. **Research Agent – External Knowledge** (optional) – Evaluate external tools for advanced analysis beyond eslint-plugin-jsdoc and dependency-cruiser

---

## Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Phase 1 delay** (JSDoc comments take longer than expected) | Medium | Prioritize top 15 files only; hire or recruit team members if needed |
| **Tool integration fails** (OpenAPI spec creation is complex) | Medium | Start with 2–3 specs; use tool or AI assistant to auto-generate boilerplate |
| **Team resistance** (documentation becomes blocker) | High | Phase 1 = advisory only; good communication about "why"; show benefits |
| **Drift detection false positives** (too many warnings) | Medium | Tune tool thresholds; start permissive, tighten over time |
| **ADR fatigue** (team stops creating ADRs) | Medium | Make ADR creation part of PR process; enforce template; keep format simple |
| **TypeDoc breaks on code changes** | Low | Test locally before push; add TypeDoc generation to pre-commit hook |

---

## Decision Points for Human Owner

### 1. Approach Selection
**Status:** ✅ **Recommended: Approach D (Governance-Integrated)**
- Leverages existing AGENTS.md framework
- Clear accountability through Docs Guardian
- Evolves naturally toward Approach C over time
- **Human decision required if preferring different approach**

### 2. TypeDoc Configuration Strategy
**Status:** ✅ **Recommended: Per-domain entryPoints with `entryPointStrategy: "resolve"`**
- Explicit per-domain sources (agents, self-healing, reliability, security, utils) are cleanly documented
- `entryPointStrategy: "resolve"` handles re-exports and module resolution correctly
- Resulting docs are organized by domain, improving discoverability
- **Human decision: Accept per-domain approach or revert to glob patterns?**

### 3. OpenAPI Specification Approach
**Status:** ✅ **Recommended: tsoa-generated specs from controllers**
- Eliminates hand-authored YAML (source of truth is code decorators)
- Decorators stay synchronized with implementation
- Automatic spec generation on every build (zero drift)
- Simpler Phase 1 (2–3 decorated controllers) with easy Phase 2 expansion
- **Human decision: Accept tsoa approach or prefer hand-authored specs?**

### 4. Drift Prevention & Enforcement Tools
**Status:** ✅ **Recommended: eslint-plugin-jsdoc + dependency-cruiser (primary); external tools optional**
- **eslint-plugin-jsdoc**: Enforces JSDoc completeness (prevents documentation rot at source)
- **dependency-cruiser**: Enforces module boundaries and prevents cycles (architectural drift prevention)
- Both are open-source, zero-cost, deeply integrated
- Simpler Phase 3 (focus on linting enforcement vs. external tool integration)
- External tools (DeepDocs, FluentDocs) remain optional for advanced analysis
- **Human decision: Accept eslint-plugin-jsdoc + dependency-cruiser as primary, or require external tools?**

### 5. ADR Backfill Scope
**Status:** ✅ **Recommended: 3 critical ADRs (orchestration, security, self-healing)**
- Focuses on decisions most affecting new contributors
- Reduces initial burden
- **Human decision: Expand if specific decisions are frequently questioned**

### 6. Enforcement Level Timeline
**Status:** ✅ **Recommended: Phase 1 = advisory; Phase 2 = advisory; Phase 3 = blocking**
- Allows team to adapt gradually
- Demonstrates value before enforcement
- **Human decision: Accelerate enforcement if team is ready?**

---

## Success Metrics

### Phase 1 Success
- ✅ TypeDoc generates HTML for all critical agents
- ✅ 3 OpenAPI specs are valid and complete
- ✅ 3 critical ADRs are written and merged
- ✅ JSDoc coverage > 80% for critical files
- ✅ Docs Guardian role is expanded

### Phase 2 Success
- ✅ JSDoc coverage > 95% for all exported APIs
- ✅ TypeDoc integrates into CI pipeline
- ✅ 5+ domain READMEs are complete
- ✅ Documentation validation runs on all PRs
- ✅ Team begins adapting to documentation requirements

### Phase 3 Success
- ✅ Drift detection catches 90%+ of documentation gaps
- ✅ Documentation validation blocks merges for violations
- ✅ Quarterly ADR review process is established
- ✅ Documentation coverage > 90%
- ✅ Documentation rot is < 10% year-over-year (vs. 85% baseline)

---

## Next Steps (Immediate)

1. **Human owner decision:** Accept Approach D recommendation or prefer different approach?
2. **Planning & PA Agent:** Assign Phase 1 tasks to Coder – Feature Agent
3. **Enforcement Supervisor:** Review documentation requirements against governance standards
4. **Docs Guardian:** Audit current READMEs and identify Phase 1 quick wins

---

## Timeline Summary

| Phase | Duration | Key Deliverables | Owners |
|-------|----------|-----------------|--------|
| **Phase 1** | 1–2 weeks | TypeDoc (per-domain), tsoa setup, 2–3 decorated controllers, JSDoc comments, 3 ADRs | Coder, Planning |
| **Phase 2** | 2–4 weeks | CI integration (TypeDoc, tsoa), all controllers decorated, domain READMEs, eslint-plugin-jsdoc + dependency-cruiser linting | Coder, Supervisor |
| **Phase 3** | 6–8 weeks (initial); ongoing | eslint-plugin-jsdoc + dependency-cruiser enforcement, hard gate, quarterly ADR reviews, metrics | Coder, Supervisor, Planning |

---

## Related Documents

- `DOCUMENTATION-STRATEGY.md` – Research findings and candidate approaches
- `AGENTS.md` – Governance framework and agent roles
- `docs/ARCHITECTURE/ADR-000-TEMPLATE.md` – ADR template (to be created)
- `.github/docs/workflows/WORKFLOW-DOCUMENTATION-VALIDATION.md` – CI validation workflow (to be created)

---

## Document Metadata

- **Created:** 2026-03-21
- **Updated:** 2026-03-22
- **Status:** Ready for Human Review (revised with per-domain TypeDoc, tsoa, and linting-focused drift prevention)
- **Audience:** Engineering team, human owner, Enforcement Supervisor, Docs Guardian
- **Next Review:** After Phase 1 completion (approximately 2026-04-04)
