# Documentation Strategy Implementation Plan – Planning & PA Agent Deliverable

## Executive Summary

This document transforms the research findings from `DOCUMENTATION-STRATEGY.md` and the implementation roadmap from `IMPLEMENTATION-PLAN-DOCUMENTATION.md` into **scoped, executable work packages** using the multi-agent governance framework defined in `AGENTS.md`.

**Status**: Ready for human owner review and approval  
**Recommended Approach**: Approach D (Governance-Integrated) with evolution toward Approach C  
**Total Effort**: Phase 1 (1–2 weeks) + Phase 2 (2–4 weeks) + Phase 3 (6–8 weeks initial, 1–2 days/month ongoing)

---

## Goal Restatement (2–4 Bullets)

1. **Eliminate documentation rot** by generating API reference from code (TypeDoc, OpenAPI) and preventing drift via CI/CD automation.
2. **Establish governance-enforced documentation** leveraging the existing Docs Guardian role and multi-agent framework.
3. **Capture architectural reasoning** in formal, append-only Architecture Decision Records (ADRs) to preserve intent when team members change.
4. **Enable rapid onboarding** with hierarchical, domain-specific README files and standardized examples for each agent subsystem.

---

## Current State Assessment

### Strengths
- ✅ **Extensive governance framework** (`AGENTS.md` defines clear roles and accountability)
- ✅ **Strong architectural patterns** (registry pattern, orchestrator pattern, layered security)
- ✅ **Clear separation of concerns** (agents, security layers, self-healing, reliability subsystems)
- ✅ **Established workflow validators** and CI/CD integration points
- ✅ **275+ TypeScript files** with potential for automated documentation generation

### Critical Gaps
| Area | Current | Target | Severity |
|------|---------|--------|----------|
| **API Documentation** | None | OpenAPI 3.1 specs for all HTTP endpoints | CRITICAL |
| **Code Documentation** | Minimal JSDoc | TypeDoc-generated HTML for all modules | HIGH |
| **Architecture Decisions** | Implicit in code | Formal ADRs with templates (5–10 decisions) | HIGH |
| **Module READMEs** | Inconsistent depth | Hierarchical (root → domain → subsystem) | MEDIUM |
| **CI/CD Validation** | Not present | Documentation completeness gate | HIGH |
| **Drift Prevention** | Manual (decays 85%/year) | Automated detection (DeepDocs on PR) | HIGH |
| **Docs Guardian Enforcement** | Role defined | Active enforcement + checklist | MEDIUM |

---

## Proposed Implementation Plan: Three Phases

### Phase 1: Foundation (1–2 weeks)

**Goal**: Establish infrastructure, patterns, and governance integration.

#### 1.1 Create Documentation Directory Structure
**Agent**: Coder – Feature Agent  
**Scope**: `docs/**` directory  
**Deliverables**:
- `docs/ARCHITECTURE/` – ADR storage
- `docs/ARCHITECTURE/ADR-000-TEMPLATE.md` – ADR template (Status, Context, Decision, Alternatives, Consequences)
- `docs/APIs/` – OpenAPI specification storage
- `docs/GUIDES/` – Domain-specific onboarding and tutorials
- `docs/archive/` – Superseded ADRs and legacy docs

**Success Criteria**:
- ✅ Folders created and committed
- ✅ ADR template follows AWS/Microsoft conventions
- ✅ Structure documented in root `docs/README.md`

**Commands to Run**:
```bash
mkdir -p docs/{ARCHITECTURE,APIs,GUIDES,archive}
git add docs/
git commit -m "chore: establish documentation directory structure"
```

---

#### 1.2 Configure TypeDoc for Automated API Reference
**Agent**: Coder – Feature Agent  
**Scope**: Root project configuration  
**Deliverables**:
- `typedoc.json` – TypeDoc configuration
- `package.json` update – Add `"docs:generate"` script
- `.gitignore` update – Exclude generated docs (optional: track in separate release branch)

**Configuration**:
```json
{
  "entryPoints": ["src/**/*.ts"],
  "out": "docs/API-REFERENCE",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules/**"],
  "excludePrivate": false,
  "excludeProtected": false,
  "includeVersion": true,
  "sort": ["source-order"],
  "categoryOrder": ["Core", "Agents", "Security", "Reliability", "Utils"],
  "customTags": [
    { "name": "agent", "definition": { "kind": "modifier" } },
    { "name": "critical", "definition": { "kind": "modifier" } }
  ]
}
```

**Success Criteria**:
- ✅ `npx typedoc` runs without errors
- ✅ HTML output is clean, navigable, and organized by domain
- ✅ Configuration is version-controlled

---

#### 1.3 Add JSDoc Comments to 15 Critical Agent Files
**Agent**: Coder – Feature Agent  
**Scope**: `src/agents/**/*.ts` (representative files)  
**Target Files** (examples; prioritize based on usage frequency):
- `src/agents/dialogue-agent.ts` (core)
- `src/agents/web-agent.ts` (core)
- `src/agents/knowledge-agent.ts` (core)
- `src/security/security-agent.ts` (security layer)
- `src/self-healing/repair/repair-engine.ts` (self-healing)
- `src/reliability/api/server.ts` (API surface)
- Plus 9 additional high-traffic files

**JSDoc Standard**:
```typescript
/**
 * Brief description (one line).
 * 
 * Extended explanation with context, behavior, and edge cases.
 * 
 * @param paramName – parameter description
 * @returns – return value description
 * @throws Error if precondition violated
 * @example
 * const result = functionName(arg1, arg2);
 * // => expected output
 * 
 * @agent dialogue – Mark which agent this belongs to
 * @critical – If safety/security critical
 */
```

**Success Criteria**:
- ✅ 80%+ of exported functions/classes have JSDoc
- ✅ TypeDoc generates clean output for these files
- ✅ Examples are runnable/copyable

---

#### 1.4 Create 3 Representative OpenAPI Specifications
**Agent**: Coder – Feature Agent  
**Scope**: REST API endpoints for 3 representative agents  
**Specifications**:
- `docs/APIs/dialogue-agent.openapi.yaml` – Dialogue agent HTTP endpoints
- `docs/APIs/web-agent.openapi.yaml` – Web agent HTTP endpoints
- `docs/APIs/knowledge-agent.openapi.yaml` – Knowledge base HTTP endpoints

**OpenAPI Template**:
```yaml
openapi: 3.1.0
info:
  title: Dialogue Agent API
  version: 1.0.0
  description: REST API for Dialogue Agent orchestration and communication
servers:
  - url: http://localhost:3000
paths:
  /agents/dialogue/chat:
    post:
      summary: Send a chat message
      operationId: postDialogueChat
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                sessionId:
                  type: string
      responses:
        '200':
          description: Successful chat response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                  meta:
                    type: object
                  error:
                    type: null
        '400':
          description: Invalid request
```

**Success Criteria**:
- ✅ 3 OpenAPI specs created and valid (validate with `swagger-cli validate`)
- ✅ All HTTP endpoints documented with request/response examples
- ✅ Specs follow OpenAPI 3.1 conventions

---

#### 1.5 Create 3 Foundational ADRs
**Agent**: Coder – Feature Agent  
**Scope**: `docs/ARCHITECTURE/`  
**ADRs**:

1. **ADR-001: Agent Orchestration Pattern (Registry + Router Architecture)**
   - **Context**: Multiple agents need coordinated dispatch without tight coupling
   - **Decision**: Implement registry pattern + router pattern
   - **Consequences**: Scalable, allows runtime agent registration; adds dispatch layer

2. **ADR-002: Multi-Layer Security Defense Strategy**
   - **Context**: LLM inputs carry injection, prompt manipulation, and jailbreak risks
   - **Decision**: 5-layer defense (input firewall, dual LLM router, tool gate, output validator, audit log)
   - **Consequences**: High safety; adds latency (mitigated by caching)

3. **ADR-003: Self-Healing and Diagnostic Approach**
   - **Context**: Agents can fail due to external API changes, resource exhaustion, misconfiguration
   - **Decision**: Autonomous repair engine + diagnostic framework + human feedback loop
   - **Consequences**: Improved resilience; requires knowledge base maintenance

**Success Criteria**:
- ✅ 3 ADRs written using template
- ✅ Each ADR is ~500–800 words
- ✅ Historical context and decisions are preserved in append-only records

---

#### 1.6 Expand Docs Guardian Role and Checklist
**Agent**: Enforcement Supervisor (in coordination with Planning & PA Agent)  
**Scope**: Update `AGENTS.md` and create `docs/GOVERNANCE-DOCS-GUARDIAN.md`  
**Changes**:
- Extend Docs Guardian section in `AGENTS.md` with Phase 1 responsibilities
- Create `docs/GOVERNANCE-DOCS-GUARDIAN.md` with:
  - Documentation completeness checklist
  - What constitutes "sufficient documentation" per layer/module
  - When Docs Guardian should block merges (advisory in Phase 1; blocking in Phase 3)

**Success Criteria**:
- ✅ Docs Guardian responsibilities are explicit
- ✅ Checklist is tied to enforcement workflow
- ✅ Team knows who enforces and what passes/fails

---

### Phase 1 Summary Table

| Task | Agent | Estimated Time | Dependencies | Blockers |
|------|-------|-----------------|--------------|----------|
| 1.1: Dir Structure | Coder – Feature | 2 hours | None | None |
| 1.2: TypeDoc Config | Coder – Feature | 3 hours | None | Need TypeDoc installed |
| 1.3: JSDoc Comments | Coder – Feature | 2–3 days | 1.2 | Agent list consensus |
| 1.4: OpenAPI Specs | Coder – Feature | 2–3 days | 1.1 | API endpoint audit |
| 1.5: 3 ADRs | Coder – Feature | 2–3 days | 1.1 | Domain knowledge |
| 1.6: Docs Guardian | Enforcement Supervisor | 1–2 days | All above | None |
| **Phase 1 Total** | — | **1–2 weeks** | — | — |

**Phase 1 Success Criteria**:
- ✅ TypeDoc runs locally and generates HTML
- ✅ 15 agent files have JSDoc comments (80%+ exported APIs documented)
- ✅ 3 OpenAPI specs exist and validate
- ✅ 3 ADRs written and merged
- ✅ Docs Guardian role is assigned and checklist exists

---

### Phase 2: Coverage (2–4 weeks)

**Goal**: Expand documentation to cover all major modules and integrate into CI/CD.

#### 2.1 Achieve Full JSDoc Coverage (95%+ Exported APIs)
**Agent**: Coder – Feature Agent  
**Scope**: Remaining agent files, security layers, reliability components  
**Approach**: 
- Complete remaining agent files (next 30–40 files)
- Add JSDoc to critical utility modules
- Target 95%+ coverage of exported functions/classes

**Success Criteria**:
- ✅ `npx typedoc` with coverage report shows ≥95% exported symbols documented
- ✅ Generated HTML is comprehensive and searchable

---

#### 2.2 Integrate TypeDoc + OpenAPI Generation into CI/CD
**Agent**: Workflow Guardian (with Coder support)  
**Scope**: `.github/workflows/`, `package.json`  
**Deliverables**:
- New workflow: `.github/workflows/generate-docs.yml`
  - Trigger: On push to main/release branches, on PR (optional)
  - Steps: `npm run docs:generate`, validate output, artifact upload
- Update `package.json`: 
  - `"docs:generate": "typedoc && openapi-generator validate docs/APIs/*.yaml"`
  - `"docs:validate": "..."`

**Success Criteria**:
- ✅ Workflow runs successfully on every push
- ✅ TypeDoc + OpenAPI specs generated automatically
- ✅ Artifacts archived for each release

---

#### 2.3 Write Complete OpenAPI Specs for All Agents
**Agent**: Coder – Feature Agent  
**Scope**: All HTTP-accessible agents  
**Estimated**: 8–10 additional OpenAPI specs  
**Success Criteria**:
- ✅ OpenAPI specs cover all agent REST endpoints
- ✅ All request/response payloads documented
- ✅ Examples are copyable (curl, SDK)

---

#### 2.4 Create Domain-Specific READMEs (5+ modules)
**Agent**: Coder – Feature Agent  
**Scope**: Key subsystems  
**READMEs**:
- `src/self-healing/README.md` – Self-healing architecture, sensors, repair engines
- `src/reliability/README.md` – Reliability assessment, GTVP, AI engines
- `src/security/README.md` – 5-layer security strategy and layer descriptions
- `dashboard/README.md` – Dashboard setup, WebSocket endpoints, health APIs
- `src/orchestrator/README.md` – Agent orchestration and registry patterns

**Content Standard** (per README):
- Name + brief description
- High-level architecture diagram (ASCII or SVG reference)
- Key components and responsibilities
- How to extend / add new agents
- Common troubleshooting
- Links to ADRs and API docs

**Success Criteria**:
- ✅ 5+ domain READMEs are comprehensive and current
- ✅ Each includes onboarding guidance for new contributors

---

#### 2.5 Add Documentation Validation to Enforcement Supervisor
**Agent**: Enforcement Supervisor + Docs Guardian  
**Scope**: Workflow enforcement  
**Changes**:
- Add "documentation" checklist to Enforcement Supervisor output
- Create advisory gate: "Documentation coverage is X%; recommended minimum is 90%"
- Link to missing docs from the checklist

**Success Criteria**:
- ✅ Documentation validation runs on every PR
- ✅ Checklist output is actionable (human can see what's missing)
- ✅ No hard failures in Phase 2 (advisory only)

---

#### 2.6 Backfill Historical Decisions (2–3 Additional ADRs)
**Agent**: Coder – Feature Agent  
**Scope**: `docs/ARCHITECTURE/`  
**ADRs** (examples; confirm with team):
- ADR-004: Caching strategy for sensor health data
- ADR-005: Real-time WebSocket event streaming for dashboard
- ADR-006: (Optional) Fallback LLM providers (Claude, GPT, Vertex)

**Success Criteria**:
- ✅ 2–3 additional ADRs completed (6 total)
- ✅ Capture decisions that frequently confuse new team members

---

### Phase 2 Summary Table

| Task | Agent | Estimated Time | Dependencies |
|------|-------|-----------------|--------------|
| 2.1: Full JSDoc (95%+) | Coder – Feature | 1–2 weeks | Phase 1.3 complete |
| 2.2: CI/CD Integration | Workflow Guardian | 2–3 days | 2.1 complete |
| 2.3: All OpenAPI Specs | Coder – Feature | 1–2 weeks | Phase 1.4 complete |
| 2.4: Domain READMEs (5+) | Coder – Feature | 2–3 days | 2.3 complete |
| 2.5: Validation Checklist | Enforcement Supervisor | 1–2 days | All above |
| 2.6: Backfill ADRs | Coder – Feature | 2–3 days | Phase 1.5 complete |
| **Phase 2 Total** | — | **2–4 weeks** | — |

**Phase 2 Success Criteria**:
- ✅ 95%+ JSDoc coverage across all exported APIs
- ✅ TypeDoc + OpenAPI specs generate automatically in CI/CD
- ✅ Complete OpenAPI specs for all agents
- ✅ 5+ domain-specific READMEs
- ✅ Documentation validation is advisory (appears in PR review)
- ✅ 6+ ADRs written and merged

---

### Phase 3: Automation & Long-Term (6–8 weeks initial + 1–2 days/month ongoing)

**Goal**: Enforce documentation as a quality gate and prevent drift automatically.

#### 3.1 Evaluate and Integrate Drift Detection Tool
**Agent**: Research Agent – External Knowledge (evaluation), Workflow Guardian (integration)  
**Scope**: CI/CD integration  
**Candidates**:
- **DeepDocs** – AI-powered documentation gap detection
- **FluentDocs** – Auto-generation from code patterns
- **Custom solution** – GitHub Actions + TypeDoc + OpenAPI validation

**Success Criteria**:
- ✅ Tool selected and evaluated
- ✅ CI integration prototype working
- ✅ Catches documentation gaps on PR

---

#### 3.2 Establish Hard Enforcement ("Documentation as Test")
**Agent**: Enforcement Supervisor  
**Scope**: CI/CD workflow  
**Policy**:
- PR fails if:
  - Critical files lack JSDoc
  - OpenAPI specs are invalid or outdated
  - ADRs missing for architectural changes
  - Critical documentation files not updated (e.g., root README)

**Success Criteria**:
- ✅ CI workflow enforces documentation completeness
- ✅ Developers understand why PRs fail
- ✅ Guidance is provided (link to missing docs, template examples)

---

#### 3.3 Implement Quarterly ADR Review Process
**Agent**: Docs Guardian + Planning & PA Agent  
**Scope**: All ADRs  
**Process**:
- Quarterly meeting (30–45 min)
- Review all ADRs for relevance and supersession
- Create new ADRs for decisions made since last review
- Archive or supersede outdated ADRs (append-only, never edit)

**Success Criteria**:
- ✅ ADR review process is scheduled and attended
- ✅ New ADRs created quarterly
- ✅ Archive tracks superseded decisions

---

#### 3.4 Build Documentation Health Dashboard
**Agent**: Coder – Feature Agent or Research Agent  
**Scope**: Metrics and monitoring  
**Metrics**:
- % JSDoc coverage by module
- % OpenAPI endpoints documented
- % READMEs updated (by last commit date)
- ADR count and freshness
- Documentation generation success rate

**Success Criteria**:
- ✅ Dashboard exists (can be simple: static HTML or integrated into existing dashboard)
- ✅ Metrics are updated automatically (via CI/CD job)
- ✅ Team can see documentation health at a glance

---

#### 3.5 Expand Docs Guardian Enforcement Scope
**Agent**: Enforcement Supervisor  
**Scope**: Multi-agent governance  
**Changes**:
- Docs Guardian now has authority to:
  - Block PRs for documentation violations
  - Request ADRs for architectural changes
  - Recommend documentation refactors
- Update AGENTS.md with expanded Docs Guardian authority

**Success Criteria**:
- ✅ Docs Guardian can block PRs (hard gate)
- ✅ Team knows documentation is a quality dimension
- ✅ Governance is clear and consistently enforced

---

### Phase 3 Summary Table

| Task | Agent | Estimated Time | Dependencies |
|------|-------|-----------------|--------------|
| 3.1: Tool Integration | Research + Workflow Guardian | 1–2 weeks | Phase 2 complete |
| 3.2: Hard Enforcement | Enforcement Supervisor | 1 week | 3.1 complete |
| 3.3: ADR Review Process | Docs Guardian | Ongoing (30 min/quarter) | 2.6 complete |
| 3.4: Health Dashboard | Coder – Feature | 1–2 weeks | 2.1, 2.3, 3.2 complete |
| 3.5: Guardian Authority | Enforcement Supervisor | 2–3 days | All above |
| **Phase 3 Total** | — | **6–8 weeks initial** | — |

**Phase 3 Success Criteria**:
- ✅ Drift detection tool integrated and working
- ✅ Documentation is a hard CI gate (PRs fail without sufficient docs)
- ✅ Quarterly ADR reviews scheduled and attended
- ✅ Documentation health dashboard is public/visible
- ✅ Docs Guardian has enforcement authority

---

## Agent Sequencing and Execution Order

Follow this sequence to minimize dependencies and maximize parallel work:

1. **Planning & PA Agent** (current) → Create this plan ✅
2. **Enforcement Supervisor** → Validate plan against governance (1 day)
3. **Docs Guardian** → Audit current state and identify Phase 1 priorities (1 day)
4. **Coder – Feature Agent** → Phase 1 infrastructure (1–2 weeks)
   - In parallel: Docs Guardian helps identify 15 critical files
5. **Coder – Feature Agent** → Phase 2 coverage (2–4 weeks)
   - In parallel: Workflow Guardian prepares CI/CD integration
6. **Workflow Guardian** → Integrate TypeDoc + OpenAPI into CI/CD
7. **Research Agent – External Knowledge** → Evaluate drift detection tools (1 week)
8. **Enforcement Supervisor** → Hard enforcement policy design
9. **Coder – Feature Agent** → Phase 3 automation (6–8 weeks initial)
10. **Tester – Test Implementation Agent** → Documentation validation tests

---

## Critical Decisions for Human Owner

### Decision 1: Approach Selection

**Question**: Which documentation approach should Jarvis adopt?

**Options**:
- **A (Quick Win)**: JSDoc on critical files + 3–5 ADRs + basic READMEs. Effort: 1–2 weeks. Gaps: No OpenAPI, minimal automation.
- **B (Comprehensive)**: OpenAPI for all agents + TypeDoc + 5–10 ADRs + hierarchical READMEs + CI generation. Effort: 3–4 weeks. Gaps: Still manual, no drift detection.
- **C (AI-Assisted)**: Approach B + DeepDocs for drift detection + AI-generated ADRs. Effort: 6–8 weeks. Gaps: Tool costs, human review overhead.
- **D (Governance-Integrated)** [RECOMMENDED]: Approach B + Docs Guardian enforcement + quarterly reviews. Effort: 4–5 weeks + ongoing 1–2 days/month. Aligns with AGENTS.md.

**Recommendation**: **Approach D** — Leverages your existing multi-agent governance, avoids duplication, scales with team.

**Human Decision Required**: Approve Approach D or select alternative?

---

### Decision 2: OpenAPI Scope

**Question**: Should OpenAPI specs cover all agents or just core agents?

**Options**:
- **Option A**: Core agents only (Dialogue, Web, Knowledge, Security). Phase 1 deliverable: 3 specs. Phase 2: expand to 5–6.
- **Option B**: All agents with HTTP endpoints. Phase 1: 3 specs. Phase 2: all 8–10.
- **Option C**: No OpenAPI; rely on TypeDoc only. Phase 1: Skip 1.4. Phase 2: Skip 2.3.

**Recommendation**: **Option B** — Comprehensive OpenAPI coverage enables client code generation, Swagger UI exploration, and automated validation. Worth the 2–3 additional days in Phase 1 and 1–2 weeks in Phase 2.

**Human Decision Required**: Approve full OpenAPI coverage (Option B) or limit to core agents (Option A)?

---

### Decision 3: ADR Backfill Scope

**Question**: Should Jarvis backfill historical ADRs (for past decisions) or only document future decisions?

**Options**:
- **Option A**: Document future decisions only. Skip Phase 1.5 backfill. Save 1–2 days.
- **Option B**: Backfill 3 critical decisions (orchestration, security, self-healing). Adds 2–3 days in Phase 1.
- **Option C**: Backfill 8–10 most impactful decisions. Adds 1 week to Phase 1.

**Recommendation**: **Option B** — Backfill 3 critical decisions that most frequently confuse new contributors. Captures institutional knowledge without massive overhead.

**Human Decision Required**: Approve 3-decision backfill (Option B) or skip backfill (Option A)?

---

### Decision 4: Documentation Enforcement Timing

**Question**: When should documentation become a hard CI gate (blocks PRs)?

**Options**:
- **Option A**: Advisory only (Phase 1 + 2). Never hard enforcement. Risks drift over time.
- **Option B**: Advisory Phase 1–2, hard gate starting Phase 3. Gives team time to adapt.
- **Option C**: Hard gate immediately (Phase 1). Highest enforcement; may slow initial PRs.

**Recommendation**: **Option B** — Phased enforcement allows team to adapt while ensuring critical systems stay documented. Advisory Phase 1–2 (visible checklist, no merge block); hard Phase 3 (merge fails without sufficient docs).

**Human Decision Required**: Approve phased enforcement (Option B) or skip hard enforcement (Option A)?

---

### Decision 5: Tool Evaluation and Licensing

**Question**: Is budget available for drift detection tools (DeepDocs, FluentDocs, etc.)?

**Options**:
- **Option A**: Custom solution using GitHub Actions + TypeDoc + schema validation. Cost: free (labor). Scope: manual, not AI-powered.
- **Option B**: DeepDocs trial (freemium tier). Cost: free tier available; paid tier ~$500–1000/month. Scope: AI-powered drift detection.
- **Option C**: Skip Phase 3 automation. Stay at Phase 2 manual enforcement. Cost: $0. Gaps: Continued manual effort, drift over time.

**Recommendation**: **Option B** — Evaluate DeepDocs on freemium tier in Phase 3. If cost is prohibitive, fall back to Option A.

**Human Decision Required**: Approve tool budget evaluation (Option B) or implement custom solution only (Option A)?

---

## Risk Assessment and Mitigation

### Risk 1: JSDoc Comments Become Stale
**Probability**: High (85% decay per year without enforcement)  
**Impact**: API docs degrade in usefulness  
**Mitigation**: Hard CI gate in Phase 3; quarterly governance reviews

### Risk 2: ADRs Are Written But Never Read
**Probability**: Medium (common governance antipattern)  
**Impact**: Decisions lose value; mistakes repeat  
**Mitigation**: Link ADRs from code comments; require ADR reference in PR for architectural changes; quarterly reviews

### Risk 3: OpenAPI Specs Diverge from Implementation
**Probability**: Medium (specs require synchronization)  
**Impact**: Client code breaks; trust erodes  
**Mitigation**: Generate OpenAPI from code (via decorators/annotations) where possible; validate specs in CI

### Risk 4: Tool Integration Costs More Than Expected
**Probability**: Low (tools are well-established)  
**Impact**: Phase 3 delayed  
**Mitigation**: Budget 2–3 weeks for tool evaluation; have fallback plan (custom solution)

### Risk 5: Team Resists Documentation Gate
**Probability**: Medium (always some resistance to new process)  
**Impact**: Docs Guardian authority undermined  
**Mitigation**: Phase 1–2 advisory period builds buy-in; show examples of documentation value; tie to onboarding success

---

## Success Metrics and Checkpoints

### Phase 1 Checkpoint (End of Week 2)
- [ ] `docs/ARCHITECTURE/`, `docs/APIs/`, `docs/GUIDES/` folders created
- [ ] `typedoc.json` configured and generating clean HTML
- [ ] 15 critical agent files have JSDoc (80%+ coverage)
- [ ] 3 OpenAPI specs created and validated
- [ ] 3 ADRs written and merged
- [ ] Docs Guardian role assigned and checklist exists

### Phase 2 Checkpoint (End of Week 6)
- [ ] 95%+ JSDoc coverage on all exported APIs
- [ ] TypeDoc + OpenAPI generation integrated into CI/CD (runs on every push)
- [ ] Complete OpenAPI specs for 8–10 agents
- [ ] 5+ domain-specific READMEs written and current
- [ ] Documentation validation checklist in PR reviews (advisory)
- [ ] 2–3 additional ADRs completed (6 total)

### Phase 3 Checkpoint (End of Week 14 + ongoing)
- [ ] Drift detection tool integrated (DeepDocs or custom)
- [ ] Hard enforcement active (PRs fail without sufficient docs)
- [ ] First quarterly ADR review completed
- [ ] Documentation health dashboard deployed
- [ ] Docs Guardian has merge-block authority and exercises it judiciously

---

## Checklist of Next Actions for Human Owner

### Before Implementation Starts

- [ ] **Review and Approve**: This plan (docs/DOCUMENTATION-IMPLEMENTATION-PLAN.md)
- [ ] **Decide**: Which approach? (Recommend: D)
- [ ] **Decide**: OpenAPI scope? (Recommend: Option B, all agents)
- [ ] **Decide**: ADR backfill scope? (Recommend: Option B, 3 decisions)
- [ ] **Decide**: Enforcement timing? (Recommend: Option B, phased)
- [ ] **Decide**: Tool budget? (Recommend: Option B, evaluate DeepDocs)
- [ ] **Assign**: Docs Guardian role (name and responsibilities)
- [ ] **Assign**: Phase 1 lead (Coder – Feature Agent)

### During Phase 1

- [ ] Monitor progress at end of Week 1 (Phase 1 checkpoint)
- [ ] Approve 15 critical agent files list (before Coder starts JSDoc)
- [ ] Review 3 ADRs for accuracy and completeness before merge
- [ ] Ensure Docs Guardian is actively engaged

### During Phase 2

- [ ] Monitor progress at end of Week 6 (Phase 2 checkpoint)
- [ ] Review domain READMEs and provide feedback
- [ ] Approve CI/CD workflow additions
- [ ] Build team buy-in for Phase 3 hard enforcement

### During Phase 3

- [ ] Approve tool selection (DeepDocs, custom, or other)
- [ ] Support Docs Guardian with authority to block PRs
- [ ] Schedule and attend quarterly ADR reviews
- [ ] Monitor documentation health dashboard

---

## Detailed Work Packages by Agent Role

### For Coder – Feature Agent (Phase 1)

**Scope**: Tasks 1.1–1.5 below

1. **Task 1.1: Directory Structure**
   - [ ] Create `docs/{ARCHITECTURE,APIs,GUIDES,archive}` folders
   - [ ] Create `docs/README.md` explaining structure
   - [ ] Commit with message: "chore: establish documentation directory structure"

2. **Task 1.2: TypeDoc Configuration**
   - [ ] Install TypeDoc: `npm install --save-dev typedoc`
   - [ ] Create `typedoc.json` (see Phase 1.2 above for example)
   - [ ] Test: `npx typedoc` generates HTML in `docs/API-REFERENCE/`
   - [ ] Update `.gitignore` to exclude `docs/API-REFERENCE/` (if not tracking)
   - [ ] Add script to `package.json`: `"docs:generate": "typedoc"`
   - [ ] Commit with message: "chore: configure TypeDoc for API reference generation"

3. **Task 1.3: JSDoc Comments (15 Critical Files)**
   - [ ] Coordinate with Docs Guardian to identify 15 critical files
   - [ ] Add JSDoc following standard above (examples: @param, @returns, @throws, @example, @agent, @critical)
   - [ ] Test: `npx typedoc` includes these files in output
   - [ ] Verify generated HTML is accurate
   - [ ] Commit with message: "docs: add JSDoc to 15 critical agent files (80% coverage)"

4. **Task 1.4: 3 Representative OpenAPI Specs**
   - [ ] Audit REST endpoints for Dialogue, Web, Knowledge agents
   - [ ] Create `docs/APIs/dialogue-agent.openapi.yaml`
   - [ ] Create `docs/APIs/web-agent.openapi.yaml`
   - [ ] Create `docs/APIs/knowledge-agent.openapi.yaml`
   - [ ] Validate each spec: `npx swagger-cli validate docs/APIs/*.yaml`
   - [ ] Commit with message: "docs: add OpenAPI specs for 3 representative agents"

5. **Task 1.5: 3 Foundational ADRs**
   - [ ] Create `docs/ARCHITECTURE/ADR-000-TEMPLATE.md` (reference)
   - [ ] Create `docs/ARCHITECTURE/ADR-001-AGENT-ORCHESTRATION.md`
   - [ ] Create `docs/ARCHITECTURE/ADR-002-SECURITY-LAYERS.md`
   - [ ] Create `docs/ARCHITECTURE/ADR-003-SELF-HEALING.md`
   - [ ] Have team review for accuracy and completeness
   - [ ] Commit with message: "docs: add 3 foundational architecture decision records"

---

### For Enforcement Supervisor

**Scope**: Task 1.6 below

1. **Task 1.6: Expand Docs Guardian Responsibilities**
   - [ ] Update `AGENTS.md` Docs Guardian section with Phase 1 specifics
   - [ ] Create `docs/GOVERNANCE-DOCS-GUARDIAN.md` with:
     - Documentation completeness checklist
     - What constitutes "sufficient documentation" per layer
     - Advisory enforcement in Phase 1–2
     - Hard enforcement in Phase 3
   - [ ] Ensure checklist is integrated into Enforcement Supervisor workflow
   - [ ] Commit with message: "docs: establish Docs Guardian governance and checklist"

---

### For Phase 2: Coder – Feature Agent

**High-level tasks** (detailed task breakdown in Phase 2 section above):

1. **Task 2.1**: Expand JSDoc to 95%+ coverage (remaining 30–40 files)
2. **Task 2.3**: Complete OpenAPI specs (8–10 total agents)
3. **Task 2.4**: Write 5+ domain-specific READMEs
4. **Task 2.6**: Backfill 2–3 additional ADRs

---

### For Phase 2: Workflow Guardian

**Scope**: Task 2.2 below

1. **Task 2.2: CI/CD Integration**
   - [ ] Create `.github/workflows/generate-docs.yml`
   - [ ] Trigger: push to main/master, PR (optional)
   - [ ] Steps: install deps, run `npm run docs:generate`, validate output, artifact upload
   - [ ] Test on sample PR
   - [ ] Commit with message: "ci: add documentation generation workflow"

---

## Example Prompts for Human Owner to Invoke Agents

### To Start Phase 1

```
Act as Enforcement Supervisor and review the implementation plan at 
docs/DOCUMENTATION-IMPLEMENTATION-PLAN.md for governance compliance with 
AGENTS.md and docs/** standards. Provide a pass/fail checklist and recommend 
which agents to invoke first.
```

```
Act as Docs Guardian and audit the current documentation state in the 
Jarvis repository. Identify which of the 15 critical agent files should 
be prioritized for JSDoc in Phase 1 based on usage frequency and API surface.
```

```
Act as Coder – Feature Agent and implement Phase 1 of the documentation strategy 
(tasks 1.1–1.5 from docs/DOCUMENTATION-IMPLEMENTATION-PLAN.md). Start with 
directory structure and TypeDoc configuration, then add JSDoc to the 15 
critical files identified by Docs Guardian.
```

### To Start Phase 2

```
Act as Coder – Feature Agent and implement Phase 2 coverage (task 2.1, 2.3, 2.4, 2.6 
from docs/DOCUMENTATION-IMPLEMENTATION-PLAN.md). Expand JSDoc to 95% coverage, 
complete all agent OpenAPI specs, write 5+ domain READMEs, and backfill 2–3 ADRs.
```

```
Act as Workflow Guardian and integrate TypeDoc and OpenAPI generation into the 
CI/CD pipeline (task 2.2 from docs/DOCUMENTATION-IMPLEMENTATION-PLAN.md). 
Create .github/workflows/generate-docs.yml and test on a sample PR.
```

### To Start Phase 3

```
Act as Research Agent – External Knowledge and evaluate drift detection tools 
for Phase 3 (DeepDocs, FluentDocs, custom GitHub Actions). Provide a recommendation 
with pros/cons and licensing information.
```

```
Act as Enforcement Supervisor and design hard enforcement policy for documentation 
(Phase 3.2 from docs/DOCUMENTATION-IMPLEMENTATION-PLAN.md). Define what documentation 
violations should block PRs, how to communicate failures, and guidance to developers.
```

---

## Governance and Escalation

- **Human Owner Authority**: Final approval on all decisions (approach, scope, budget, enforcement timeline)
- **Enforcement Supervisor**: Ensures documentation plan aligns with AGENTS.md and docs/** governance
- **Docs Guardian**: Enforces documentation completeness (advisory Phase 1–2, hard Phase 3)
- **Escalation**: Any blocker or needs_human_review → surfaces to human owner immediately

---

## Summary

This plan transforms Jarvis documentation from minimal coverage to a **governance-enforced, self-maintaining system** by:

1. **Phase 1 (1–2 weeks)**: Establish TypeDoc infrastructure, write JSDoc on critical files, create 3 representative OpenAPI specs, document 3 key architectural decisions, and expand Docs Guardian responsibilities.

2. **Phase 2 (2–4 weeks)**: Achieve 95%+ JSDoc coverage, integrate documentation generation into CI/CD, write complete OpenAPI specs for all agents, create 5+ domain READMEs, and add documentation validation checklist to PR reviews.

3. **Phase 3 (6–8 weeks initial + ongoing)**: Integrate drift detection tools, enforce documentation as a hard CI gate, establish quarterly ADR reviews, build documentation health dashboard, and expand Docs Guardian enforcement authority.

**Expected Outcome**: 
- Developers can onboard 3× faster using TypeDoc and domain READMEs
- API clients have current, discoverable OpenAPI specs
- Architectural decisions are preserved in append-only ADRs
- Documentation remains accurate (drift caught on PR, not months later)
- Docs Guardian is the single accountable role for documentation quality

**Next Step**: Human owner reviews, provides decisions on 5 critical questions, and approves plan. Once approved, Phase 1 begins immediately with Coder – Feature Agent.

---

## Document Metadata

- **Created**: 2026-03-22
- **Status**: Ready for human owner review and approval
- **Author**: Planning & PA Agent (automated agent)
- **Related Documents**:
  - `docs/DOCUMENTATION-STRATEGY.md` (research foundations)
  - `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md` (detailed technical roadmap)
  - `AGENTS.md` (governance framework)
  - `docs/GOVERNANCE-DOCS-GUARDIAN.md` (to be created in Phase 1.6)
- **Next Review**: After human owner approval; then Phase 1 kickoff
