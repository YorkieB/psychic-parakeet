# Documentation Implementation Execution Plan Summary

**Date:** 2026-03-22  
**Role:** Planning & PA Agent  
**Status:** Ready for human owner decision and Phase 1 execution  
**Branch:** `cursor/documentation-plan-management-67f9`

---

## Goal Restatement

Transform the Jarvis codebase from minimal/inconsistent documentation to a **self-maintaining, governance-enforced documentation system** that:

1. **Generates API reference automatically** from code (TypeDoc for TypeScript, OpenAPI for HTTP endpoints)
2. **Captures architectural decisions** in append-only ADRs with clear reasoning and consequences
3. **Prevents documentation drift** through CI/CD automation and governance enforcement
4. **Leverages the multi-agent governance model** (Docs Guardian role expansion and active enforcement)
5. **Scales sustainably** with the codebase (275+ files, growing agent inventory)

---

## Current State Assessment

### What's Already in Place ✅

| Component | Status | Details |
|-----------|--------|---------|
| **Governance Framework** | ✅ Complete | AGENTS.md defines all roles; Docs Guardian exists but not yet active |
| **Research & Strategy** | ✅ Complete | DOCUMENTATION-STRATEGY.md (research findings, 4 approaches) |
| **Implementation Plan** | ✅ Complete | IMPLEMENTATION-PLAN-DOCUMENTATION.md (3 phases, fully detailed) |
| **Governance Standards** | ✅ Complete | 80+ workflow docs in `.github/docs/**`; LAYERING, TESTING, SECURITY standards exist |
| **README Structure** | ⚠️ Partial | 15+ README files across codebase; inconsistent depth and coverage |

### Critical Gaps (Blocking Documentation Success) ⚠️

| Gap | Severity | Impact | Phase |
|-----|----------|--------|-------|
| **No TypeDoc Configuration** | Critical | Can't auto-generate API docs; 275+ files undocumented | Phase 1 |
| **No OpenAPI Specs** | Critical | HTTP endpoints invisible to clients; no Swagger UI | Phase 1 |
| **Zero ADRs for Major Decisions** | High | New contributors confused; architecture reasoning lost | Phase 1 |
| **Minimal JSDoc Comments** | High | TypeDoc will generate bare stubs; documentation is empty | Phase 1 |
| **No CI/CD Integration** | High | Documentation rot accelerates; no drift detection | Phase 2 |
| **Docs Guardian Not Active** | Medium | No enforcement; documentation becomes optional | Phase 2 |
| **No Drift Detection Tool** | Medium | 85% annual decay; no automated gap warnings | Phase 3 |

---

## Recommended Approach: Governance-Integrated (Approach D)

**Why Approach D?**

- ✅ **Aligns perfectly** with existing AGENTS.md governance framework
- ✅ **Clear accountability** through Docs Guardian role expansion
- ✅ **Phased enforcement** prevents team overwhelm (advisory → hard gate progression)
- ✅ **Natural evolution** toward Approach C (AI-assisted) as tooling matures
- ✅ **No conflicts detected** with existing governance standards

---

## Three-Phase Implementation Plan

### Phase 1: Foundation (Weeks 1–2) — Establish Infrastructure

**Goal:** Set up the patterns and configuration for sustainable documentation.

#### Phase 1.1: Create Documentation Structure
- **Agent:** Coder – Feature Agent
- **Files to Create:**
  - `docs/ARCHITECTURE/` folder (contains ADR template and decisions)
  - `docs/APIs/` folder (contains OpenAPI specifications)
  - `docs/GUIDES/` folder (contains domain-specific guides)
  - `docs/ARCHITECTURE/ADR-000-TEMPLATE.md` (AWS/Microsoft standard template)

#### Phase 1.2: Configure TypeDoc
- **Agent:** Coder – Feature Agent
- **Deliverable:** `typedoc.json` with:
  - Entry points: `src/**/*.ts`
  - Output: `docs/API-REFERENCE/` (git-ignored, CI artifact only)
  - Exclusions: tests, node_modules, temporary files
  - Custom tags: `@agent`, `@domain`, `@critical`
- **Success:** `npx typedoc` runs without errors locally

#### Phase 1.3: Add JSDoc to Critical Files
- **Agent:** Coder – Feature Agent
- **Scope:** 10–15 most critical agent files in `src/agents/*.ts`
- **Target:** JSDoc coverage >80% for exported APIs
- **Focus:** Explain "why" (intent), not just "what" (parameters)

#### Phase 1.4: Generate OpenAPI Specs for 3 Representative Agents
- **Agent:** Coder – Feature Agent
- **Agents:** Dialogue, Web, Knowledge (representative HTTP endpoints)
- **Deliverables:**
  - `docs/APIs/agents/DIALOGUE-AGENT-API.yaml`
  - `docs/APIs/agents/WEB-AGENT-API.yaml`
  - `docs/APIs/agents/KNOWLEDGE-AGENT-API.yaml`
- **Content:** Endpoints, request/response schemas, authentication, error codes, standardized response envelope

#### Phase 1.5: Create First 3 ADRs
- **Agent:** Coder – Feature Agent
- **ADRs:**
  - ADR-001: Agent Orchestration Pattern (registry + router)
  - ADR-002: Security Layer Design (5-layer defense)
  - ADR-003: Self-Healing & Diagnostic Approach
- **Template:** Status, Date, Context, Decision, Alternatives Considered, Consequences, Related Decisions
- **Content:** ≥500 words each; links to governance standards

#### Phase 1.6: Expand Docs Guardian Role
- **Agent:** Planning & PA Agent
- **Update:** AGENTS.md Docs Guardian section with:
  - Responsibility for documentation completeness checklist
  - Enforcement level (Phase 1 = advisory; escalate Phase 2+)
  - Links to DOCUMENTATION-STRATEGY.md and IMPLEMENTATION-PLAN-DOCUMENTATION.md
  - Quarterly ADR review cadence

#### Phase 1 Checklist (Before Phase 2 Kickoff)
- [ ] `docs/ARCHITECTURE/`, `docs/APIs/`, `docs/GUIDES/` folders created
- [ ] `typedoc.json` configured and runs without errors
- [ ] TypeDoc generates clean HTML for 10–15 critical files
- [ ] JSDoc coverage >80% for selected files
- [ ] 3 representative OpenAPI specs exist and are valid YAML/JSON
- [ ] 3 critical ADRs written, reviewed, and merged
- [ ] Docs Guardian role expanded in AGENTS.md
- [ ] CI artifact configuration prepared for TypeDoc generation

**Phase 1 Owners:** Coder – Feature Agent (primary), Enforcement Supervisor (governance review), Planning & PA Agent (coordination)

---

### Phase 2: Coverage (Weeks 3–6) — Achieve Comprehensive Documentation

**Goal:** Generate API documentation for all modules and integrate governance enforcement.

#### Phase 2.1: Configure TypeDoc CI Integration
- **Agent:** Coder – Feature Agent
- **Deliverable:** GitHub Actions workflow `WORKFLOW-TYPEDOC-GENERATION.md`
- **Trigger:** On push to master, on PR to master
- **Steps:**
  1. Install dependencies
  2. Run `npx typedoc`
  3. Upload HTML as build artifact (for PR review)
  4. Deploy to GitHub Pages on master merge
- **Integration:** Add `docs:generate` and `docs:serve` scripts to `package.json`

#### Phase 2.2: Generate TypeDoc for All Source Files
- **Agent:** Coder – Feature Agent
- **Target:** JSDoc coverage >95% for all exported APIs
- **Scope:** `src/**/*.ts` (all exported classes, functions, interfaces)
- **Tags:** Mark internal-only modules with `@internal`
- **Result:** Clean, warning-free TypeDoc HTML output

#### Phase 2.3: Create 3+ Backfill ADRs (Optional)
- **Agent:** Coder – Feature Agent
- **Review:** Phase 1's 3 ADRs; create additional ADR-004, ADR-005 if needed
- **Refinement:** Incorporate team feedback on Phase 1 ADRs

#### Phase 2.4: Create Domain-Specific READMEs
- **Agent:** Coder – Feature Agent
- **Scope:** 5+ domain README files:
  - Root `README.md` update (overview, quick start, architecture)
  - `src/agents/README.md` (agent registry, lifecycle, adding new agents)
  - `src/self-healing/README.md` (patterns, diagnostic tools, recovery)
  - `src/reliability/README.md` (resilience, circuit breakers, retries)
  - `src/security/README.md` (layers, threat model, defense)
  - `dashboard/README.md` (features, data flow, customization)
- **Format:** 200–500 words each; includes working code examples
- **Links:** Reference ADRs and TypeDoc

#### Phase 2.5: Standardize and Expand OpenAPI Specs
- **Agent:** Coder – Feature Agent
- **Expansion:** From Phase 1's 3 to **all HTTP-based agents**
- **Deliverable:** `docs/APIs/INDEX.md` (listing all agents, endpoints, Swagger UI link)
- **Publishing:** Options: GitHub Pages, Swagger UI at `/docs/api`, release artifacts

#### Phase 2.6: Add Documentation Validation to CI
- **Agent:** Enforcement Supervisor
- **Deliverable:** `WORKFLOW-DOCUMENTATION-VALIDATION.md`
- **Checks:**
  1. New/changed APIs have JSDoc comments
  2. New ADRs follow template
  3. No broken links in documentation
  4. TypeDoc generates without warnings
  5. OpenAPI specs are valid YAML/JSON
- **Enforcement Level:** Advisory (warnings only, not blocking merges yet)
- **Integration:** Add to Enforcement Supervisor workflow checklist

#### Phase 2.7: Document Documentation Strategy in Governance
- **Agent:** Planning & PA Agent
- **Updates:**
  - Finalize `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md` status
  - Update `AGENTS.md` Docs Guardian section
  - Create cross-links from governance index to docs standards

#### Phase 2 Checklist (Before Phase 3 Kickoff)
- [ ] TypeDoc generation integrated into CI pipeline
- [ ] Workflow generates and artifacts TypeDoc HTML on every PR
- [ ] JSDoc coverage >95% for all exported APIs
- [ ] TypeDoc HTML is clean and navigable
- [ ] 3–5+ ADRs exist and are linked from governance
- [ ] 5+ domain READMEs are complete and comprehensive
- [ ] OpenAPI specs cover all HTTP endpoints
- [ ] OpenAPI specs are valid and renderable in Swagger UI
- [ ] Documentation validation workflow runs on PRs (advisory level)
- [ ] Docs Guardian role is actively enforcing (advisory level)

**Phase 2 Owners:** Coder – Feature Agent (primary), Enforcement Supervisor (CI integration), Docs Guardian (advisory review), Static Analysis Guardian (JSDoc style)

---

### Phase 3: Automation (Weeks 7–14+ ongoing) — Full Automation & Hard Enforcement

**Goal:** Fully automate documentation generation and drift detection; establish governance enforcement as blocking gate.

#### Phase 3.1: Integrate Drift Detection Tool
- **Agent:** Research Agent – External Knowledge
- **Task:** Evaluate and recommend drift detection tool:
  - DeepDocs, FluentDocs, or Autohand
  - Cost, integration complexity, quality of generated docs
  - Team workflow compatibility
- **Integration:** Add tool to CI; parse output; post as PR comment
- **Tie to Governance:** Link recommendations to governance documentation

#### Phase 3.2: Establish "Documentation as Test" Gate
- **Agent:** Enforcement Supervisor
- **Mandatory Checks (Hard Gate):**
  1. All public APIs must have JSDoc
  2. New ADRs must follow template
  3. No broken documentation links
  4. OpenAPI specs must validate
  5. TypeDoc generates without warnings
- **Enforcement Level:** **Blocking merges** (fail if violations)
- **Exceptions:** Marked with `SKIP_DOC_CHECK` label (post-merge documentation within 2 days)
- **Phase 3 Success Criteria:** <5% of PRs fail documentation validation

#### Phase 3.3: Establish Quarterly ADR Review Process
- **Agent:** Planning & PA Agent
- **Schedule:** End of each quarter (Mar 31, Jun 30, Sep 30, Dec 31)
- **Attendees:** Architects, Planning & PA Agent, Enforcement Supervisor, Docs Guardian
- **Flow:**
  1. Review all ADRs created in past quarter
  2. Identify decisions that may be outdated
  3. Create "superseding ADRs" (new record, not edits)
  4. Mark old ADRs as "Superseded" with link to new record
- **Documentation:** Process in `docs/GOVERNANCE-PROCESSES.md`

#### Phase 3.4: Expand Docs Guardian Scope
- **Agent:** Planning & PA Agent
- **New Responsibilities:**
  1. **API Documentation Completeness:** TypeDoc + OpenAPI coverage metrics
  2. **ADR Freshness:** Track when ADRs become outdated
  3. **README Accuracy:** Monitor for stale information
  4. **Link Health:** Regularly check for broken links
  5. **Coverage Metrics:** Report % of APIs documented, % of critical systems with ADRs
- **Enforcement Checklist:**
  - All PRs touching core systems must pass documentation validation
  - ADRs for architectural changes are non-negotiable
  - Phase 3 violations block merge

#### Phase 3.5: Documentation Metrics & Dashboarding
- **Agent:** Coder – Feature Agent
- **Metrics Collected:**
  - Total APIs vs. documented (% documented)
  - JSDoc quality score by module
  - Comment depth (words per API)
  - ADRs by status (Accepted, Proposed, Superseded)
  - Decision recency (% of ADRs < 1 year old)
- **Deliverable:** Quarterly documentation health report
  - Metrics dashboard (README or GitHub Pages)
  - Coverage gaps and recommendations

#### Phase 3.6: Documentation Site Setup (Optional)
- **Agent:** Coder – Feature Agent
- **Options:**
  - Option A: Deploy TypeDoc HTML to GitHub Pages automatically (lower effort)
  - Option B: Static site (MkDocs, Docusaurus) combining TypeDoc, ADRs, guides, specs
  - Option C: Keep in git only (lowest effort, less discoverable)
- **Recommendation:** Start with Option A; evolve to Option B if needed

#### Phase 3 Checklist (Quarterly Verification)
- [ ] Drift detection tool is running and preventing documentation rot
- [ ] Documentation validation is blocking merges
- [ ] ADR review process is held quarterly
- [ ] Docs Guardian is actively enforcing documentation standards
- [ ] Documentation coverage metrics are collected and reported
- [ ] Documentation health report is generated each quarter
- [ ] Team morale regarding documentation is positive (informal feedback)

**Phase 3 Owners:** Research Agent – External Knowledge (tool eval), Coder – Feature Agent (metrics, site), Enforcement Supervisor (hard gate), Planning & PA Agent (process), Docs Guardian (enforcement)

---

## Risk Assessment & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Phase 1 delay** (JSDoc takes longer) | Medium | Prioritize top 15 files; recruit team support |
| **Tool integration fails** (OpenAPI complexity) | Medium | Start with 2–3 specs; use generators; AI assistance |
| **Team resistance** (docs as blocker) | High | Phase 1 = advisory only; communicate benefits early; show wins |
| **Drift detection false positives** | Medium | Tune tool thresholds; start permissive, tighten over time |
| **ADR fatigue** (team stops creating) | Medium | Enforce in PR process; keep template simple; show value |
| **TypeDoc breaks on code changes** | Low | Test locally; add pre-commit hook |

---

## Human Owner Decisions Required

### 1. Approach Confirmation
**Recommended:** Approach D (Governance-Integrated)

**Options:**
- A: Minimal Compliance (quick, limited scope)
- B: Comprehensive API + Architecture (balanced)
- C: AI-Assisted (full automation, higher upfront effort)
- D: Governance-Integrated (recommended; aligns with AGENTS.md)

**Decision:** Accept Approach D, or prefer different approach?

---

### 2. OpenAPI Scope
**Recommended:** All HTTP-based agents in Phase 2

**Options:**
- Limited: 2–3 agents only (Phase 1 fast track)
- Comprehensive: All HTTP agents (Phase 2, recommended)
- Deferred: Phase 3 if budget tight

**Decision:** Which scope for OpenAPI coverage?

---

### 3. ADR Backfill
**Recommended:** 3 critical ADRs (orchestration, security, self-healing)

**Options:**
- Minimal: Only future decisions (no backfill)
- Focused: 3 critical (recommended; impacts new contributors most)
- Comprehensive: 5–10 historical decisions (higher effort)

**Decision:** Which ADRs to backfill initially?

---

### 4. Enforcement Timeline
**Recommended:** Phase 1 = advisory → Phase 2 = advisory → Phase 3 = blocking

**Options:**
- Gradual: Phase 1 advisory → Phase 2 advisory → Phase 3 hard (recommended)
- Accelerated: Hard enforcement from Phase 2 (faster, higher team friction)
- Delayed: Soft enforcement through Phase 3 (slower adoption)

**Decision:** Which enforcement timeline?

---

### 5. Drift Detection Tool
**Status:** Pending Phase 3 research from Research Agent – External Knowledge

**Options:**
- Free/open-source tools only
- Paid tools (DeepDocs, FluentDocs, Autohand) if budget allows
- Defer decision to Phase 3 research

**Decision:** Budget constraint for drift detection tool?

---

## Success Metrics by Phase

### Phase 1 Success ✅
- ✅ TypeDoc generates HTML for all critical agents
- ✅ 3 OpenAPI specs are valid and complete
- ✅ 3 critical ADRs are written and merged
- ✅ JSDoc coverage >80% for critical files
- ✅ Docs Guardian role is expanded in AGENTS.md

### Phase 2 Success ✅
- ✅ JSDoc coverage >95% for all exported APIs
- ✅ TypeDoc integrates into CI pipeline
- ✅ 5+ domain READMEs are complete and comprehensive
- ✅ Documentation validation runs on all PRs (advisory)
- ✅ Team begins adapting to documentation requirements

### Phase 3 Success ✅
- ✅ Drift detection catches 90%+ of documentation gaps
- ✅ Documentation validation blocks merges for violations
- ✅ Quarterly ADR review process is established and attended
- ✅ Documentation coverage >90%
- ✅ Documentation rot is <10% year-over-year (vs. 85% baseline)

---

## Ready-to-Use Agent Invocation Prompts

### For Coder – Feature Agent (Phase 1 Execution)

```
Act as Coder – Feature Agent.

Goal: Implement Phase 1 of the documentation implementation plan.

Scope: 
- docs/ARCHITECTURE/, docs/APIs/, docs/GUIDES/ folders (create structure)
- typedoc.json (create and test configuration)
- src/agents/*.ts (10–15 critical files)
- docs/APIs/agents/ (OpenAPI specs for Dialogue, Web, Knowledge)
- docs/ARCHITECTURE/ADR-001, ADR-002, ADR-003 (create ADRs)

Requirements:
- Create documentation structure per IMPLEMENTATION-PLAN-DOCUMENTATION.md section 1.1
- Configure TypeDoc per section 1.2; verify runs locally: npx typedoc
- Add JSDoc to critical files per section 1.3; target >80% coverage
- Generate OpenAPI specs per section 1.4; validate as YAML/JSON
- Create ADRs per section 1.5; follow AWS/Microsoft template; ≥500 words each

Success Criteria:
- All folders and files created
- TypeDoc runs without errors
- JSDoc coverage verified
- OpenAPI specs are valid and renderable
- ADRs are complete, reviewed, and ready for merge

Output:
- List of files created/modified
- Rationale per file
- Commands to verify (lint, test, TypeDoc generation)
- Ready for git commit and push to cursor/documentation-plan-management-67f9
```

### For Enforcement Supervisor (Phase 1 Governance Review)

```
Act as Enforcement Supervisor.

Task: Review Phase 1 documentation implementation for governance alignment.

Scope:
- docs/** (new structure: ARCHITECTURE/, APIs/, GUIDES/)
- typedoc.json (configuration)
- AGENTS.md Docs Guardian role expansion
- Phase 1 ADRs created

Governance Standards to Check:
- LAYERING-STANDARDS.md (documentation doesn't violate layering)
- AGENTS.md (Docs Guardian role is correctly expanded)
- ACTION-DOCUMENTATION-REQUIREMENTS.md (documentation requirements met)
- Any relevant WORKFLOW-*.md documents

Output:
- layering: pass | fail | not_applicable — <reason>
- docs: pass | fail | not_applicable — <reason>
- workflows: pass | fail | not_applicable — <reason>
- Recommend which specialists to invoke next
```

### For Docs Guardian (Phase 1 Advisory Audit)

```
Act as Docs Guardian.

Task: Audit current README files and identify Phase 1 quick-wins.

Scope:
- Root README.md
- src/agents/README.md (if exists)
- src/self-healing/README.md (if exists)
- src/reliability/README.md (if exists)
- src/security/README.md (if exists)
- dashboard/README.md (if exists)

Check For:
- Coverage gaps (missing sections, outdated info)
- Consistency with code (features, APIs, patterns)
- Quick wins for Phase 2 (what needs updating, what's good to keep)
- Links to new ADRs and TypeDoc once Phase 1 completes

Output:
- docs: pass | fail | not_applicable — <reason>
- List of quick-wins with specific recommendations for Phase 2
- Flagged areas that need updates post-Phase 1
```

### For Research Agent – External Knowledge (Phase 3 Tool Evaluation)

```
Act as Research Agent – External Knowledge.

Task: Research and recommend drift detection tool for Phase 3.

Research Questions:
1. What are the leading documentation drift detection tools in 2026?
2. How do DeepDocs, FluentDocs, and Autohand compare (features, cost, quality)?
3. Which tool integrates best with GitHub Actions and TypeScript/TypeDoc?
4. What are the false-positive rates and tuning options for each?
5. Which tool has the best community and support?

Constraints:
- Evaluate free/open-source first; note if budget is required
- Prioritize tools that integrate with GitHub Actions
- Look for ease of integration with existing AGENTS.md governance
- Cross-check claims across multiple sources

Output:
- Ranked recommendations (1st, 2nd, 3rd choice)
- Pros/cons and cost for each
- Integration effort estimate
- False-positive rate and tuning strategy
- Recommendation for cursor/documentation-plan-management-67f9 branch
```

---

## Next Steps (Immediate Actions)

### For Human Owner
1. **Review this execution plan** and provide feedback
2. **Make 5 key decisions** (approach, OpenAPI scope, ADR backfill, enforcement timeline, tool budget)
3. **Approve Phase 1 kickoff** once decisions are finalized
4. **Set quarterly review cadence** for ADR reviews (Phase 3)

### For Planning & PA Agent
1. ✅ Create this execution plan summary (this document)
2. **Await human owner decisions** on the 5 decision points above
3. **Assign Phase 1 tasks to Coder – Feature Agent** once approved
4. **Track progress** and provide updates every 2 weeks
5. **Prepare for Phase 2 kickoff** based on Phase 1 completion

### For Enforcement Supervisor
1. **Review proposed documentation structure** against LAYERING-STANDARDS.md
2. **Verify AGENTS.md Docs Guardian role** will be correctly expanded
3. **Prepare documentation validation workflow** for Phase 2 integration

### For Docs Guardian
1. **Begin Phase 1 advisory audits** (review current README files)
2. **Identify quick-wins** for Phase 2 README updates
3. **Prepare for active enforcement** in Phase 2 (advisory level)

---

## Timeline Summary

| Phase | Duration | Key Deliverables | Owners | Success Metrics |
|-------|----------|------------------|--------|-----------------|
| **Phase 1** | 1–2 weeks | Folders, TypeDoc, JSDoc (10–15 files), 3 OpenAPI, 3 ADRs | Coder, Planning | JSDoc >80%, 3 specs valid, 3 ADRs merged |
| **Phase 2** | 2–4 weeks | CI integration, JSDoc (all files), 5+ READMEs, validation workflow | Coder, Supervisor, Docs Guardian | JSDoc >95%, CI working, advisory validation active |
| **Phase 3** | 6–8 weeks (initial); ongoing | Drift tool, hard gate, quarterly reviews, metrics | Research, Coder, Supervisor, Planning | Drift detection 90%+, docs >90%, hard gate active |

---

## Related Documents

- **`docs/DOCUMENTATION-STRATEGY.md`** – Research findings and 4 candidate approaches
- **`docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md`** – Detailed 3-phase implementation plan (694 lines)
- **`AGENTS.md`** – Governance framework and agent roles
- **`.github/docs/governance/ACTION-DOCUMENTATION-REQUIREMENTS.md`** – Documentation policy
- **`.github/docs/architecture/LAYERING-STANDARDS.md`** – Architecture boundary rules

---

## Document Metadata

- **Created:** 2026-03-22 10:35 UTC
- **Status:** Ready for Human Owner Review & Decision
- **Audience:** Human owner, Planning & PA Agent, Enforcement Supervisor, Docs Guardian, Coder – Feature Agent
- **Next Review:** After human owner decisions are made (immediate)
- **Quarterly Review:** 2026-06-22 (after Phase 1 & 2 completion)
