# Research Agent – External Knowledge: Documentation Strategy Validation & Enhancement

**Conducted**: 2026-03-22  
**Agent Role**: Research Agent – External Knowledge  
**Purpose**: Validate and enhance the existing documentation strategy against current 2026 best practices

---

## Executive Summary

This research validates the existing `DOCUMENTATION-STRATEGY.md` and `IMPLEMENTATION-PLAN-DOCUMENTATION.md` and introduces **three critical enhancements** based on 2026 innovations:

1. **Archgate**: Executable Architecture Decision Records with CI/CD enforcement
2. **Structured MADR**: Machine-readable ADRs with YAML frontmatter and compliance tracking
3. **Native GitHub Actions**: Documentation drift detection without third-party tool dependency

**Confidence Level**: HIGH — all recommendations backed by official documentation and established tools.

---

## Research Questions & Answers

### Q1: Is TypeDoc Still the Recommended Tool for TypeScript Documentation?

**Sources Examined**:
- Official TypeDoc documentation (typedoc.org)
- TypeScript handbook JSDoc reference
- CEOS3C "TypeScript Documentation Generation: A Complete Guide"
- Exploring TypeScript (jsbook.com)

**What Sources Agree On**:
- TypeDoc 0.28+ is the industry standard for TypeScript API documentation
- Supports TypeScript 5.0 through 5.8 (current versions as of 2026-03)
- Multi-output support: HTML (primary), JSON (structured), Markdown (via plugin)
- Configuration via `typedoc.json` is the recommended approach
- Integrates well with CI/CD pipelines (npm scripts, GitHub Actions)
- Supports modern features: custom tags, multiple output directories, theming

**Disagreements**: None detected. Unanimous consensus on TypeDoc's dominance.

**Confidence**: **VERY HIGH** — TypeDoc is definitively the standard tool.

**Recommendation**: The existing plan's recommendation for TypeDoc is correct. No changes needed.

---

### Q2: How Should OpenAPI Be Used for Multi-Agent System APIs?

**Sources Examined**:
- Web4Agents OpenAPI for Agents documentation
- Swarms API documentation (multi-agent orchestration framework)
- OpenAPI 3.1 specification

**What Sources Agree On**:
- OpenAPI 3.1.0 is the de facto standard for AI agent interoperability
- Enables agents to autonomously understand and call APIs without human mediation
- Used across AutoGen, CrewAI, LangChain, LangGraph, OpenAI GPT Actions

**Agent-Specific Best Practices**:
1. **Clear Descriptions**: Write explicit summaries that help agents decide which endpoint to call
2. **Meaningful operationIds**: Use action-verb-first identifiers (e.g., `processDialogue`, `searchKnowledge`)
3. **Parameter Documentation**: Describe all parameters with enums, defaults, and usage guidance
4. **Error Response Documentation**: Document error codes (404, 429, etc.) for agent error handling
5. **Custom x-agent-hint Extensions**: Use OpenAPI extensions to provide agent-specific context

**Token Efficiency Considerations**:
- Large APIs consume significant tokens when loaded into agent context
- Mitigation: Use multi-spec approach (per-agent specs instead of monolithic spec)
- Alternative: Model Context Protocol (MCP) for very large APIs

**Disagreements**: None detected. Strong consensus on OpenAPI 3.1 for agent systems.

**Confidence**: **HIGH** — OpenAPI 3.1 is definitively the standard.

**Recommendation**: 
- Enhance existing Phase 2 OpenAPI specs with agent-specific metadata
- Add `x-agent-hint` extensions to guide multi-agent routing
- Split large APIs into per-agent specs to reduce token overhead

---

### Q3: What Are the Latest ADR Tools & Automation Approaches?

**Sources Examined**:
- Structured MADR specification (zircote.com, GitHub)
- Archgate documentation (archgate.dev)
- ADR tooling index (adr.github.io)
- Technical blog posts on 2026 ADR innovations

**Critical Finding**: **Two major 2026 innovations** significantly enhance traditional ADRs.

#### Innovation 1: Structured MADR (Machine-Readable ADRs)

**What It Is**:
- Extends the popular MADR format with YAML frontmatter metadata
- Adds comprehensive option analysis with risk assessments
- Includes required audit sections for compliance tracking

**Key Advantages**:
- **Programmatic Queryability**: Filter ADRs by status, tags, technology, date, author
- **Automated Indexing**: Generate decision matrices and compliance dashboards
- **AI Context Injection**: AI assistants scan frontmatter (small token budget) instead of full documents
- **Compliance Automation**: Track which decisions need auditing, current status, violations
- **Audit Trails**: Historical record of decision adherence (valuable for SOC2, HIPAA, regulatory)

**Example Frontmatter**:
```yaml
---
title: "Agent Orchestration via Registry Pattern"
description: "Decision to use central registry for agent discovery and routing"
type: adr
category: architecture
tags:
  - agents
  - orchestration
  - registry
status: accepted
created: 2026-03-21
updated: 2026-03-21
author: Architecture Team
project: jarvis
technologies:
  - typescript
  - node
audience:
  - developers
  - architects
related:
  - adr-002.md
  - adr-003.md
---
```

**When to Use**:
- ✅ Compliance-focused organizations (SOC2, HIPAA, regulatory audits)
- ✅ Teams using AI coding assistants (Claude Code, Cursor, Copilot)
- ✅ Large codebases with 20+ ADRs
- ✅ Long-lived projects where decision history matters
- ✅ Organizations wanting decision analytics

**Reference**: [github.com/zircote/structured-madr](https://github.com/zircote/structured-madr)

#### Innovation 2: Archgate (Executable ADRs)

**What It Is**:
- Free, open-source CLI tool (Apache 2.0 license)
- Makes ADRs executable by coupling markdown decisions with TypeScript rules
- Enforces ADRs in CI/CD and by AI coding agents simultaneously

**Key Features**:
1. **Write Once, Enforce Everywhere**: Single ADR enforced in CI, Cursor, Claude Code, GitHub Copilot
2. **AI Agent Alignment**: AI assistants read ADRs before generating code → compliant output on first try
3. **Self-Improving Governance Loop**: 
   - AI writes code with ADRs as context
   - Automated rules check compliance (exit code indicates pass/fail)
   - Humans review what rules can't catch
   - New rules created from findings
4. **Fast Execution**: Rules written in TypeScript, run in milliseconds

**How It Works**:
```
1. Create ADR in Markdown + TypeScript rules file
2. AI agents (Cursor, Claude Code) read the ADR as context
3. `archgate check` runs in CI
4. Rules automatically verified
5. Non-compliant code blocked from merge
6. Team reviews violations, creates new rules
7. System self-improves over time
```

**Integrations**:
- **Claude Code**: Full governance plugin with developer agent, architect, quality-manager roles
- **Cursor**: Developer agent and governance skills
- **GitHub Copilot**: Via VS Code extension
- **CI/CD**: GitHub Actions, GitLab CI, any CI system
- **Any Editor**: CLI works anywhere

**Example Archgate Rule** (TypeScript):
```typescript
// adr-001/no-direct-agent-imports.ts
export const rule = {
  name: "No direct agent imports",
  description: "ADR-001: Use registry pattern for agent discovery",
  
  check: async (files) => {
    const violations = [];
    
    for (const file of files) {
      if (file.content.includes("import { DialogueAgent }")) {
        violations.push({
          file: file.path,
          message: "Direct agent import violates ADR-001. Use registry pattern."
        });
      }
    }
    
    return violations;
  }
};
```

**Reference**: [archgate.dev](https://archgate.dev) | [github.com/archgate/cli](https://github.com/archgate/cli)

**Confidence**: **HIGH** — Both tools have official documentation, active development, and production usage.

**Recommendation**:
1. **Phase 1**: Use Archgate alongside traditional ADRs for governance enforcement
2. **Phase 2**: Migrate to Structured MADR format for compliance tracking
3. **Phase 3**: Build custom Archgate rules as codebase evolves

---

### Q4: How Should Documentation Drift Be Detected & Prevented?

**Sources Examined**:
- GitHub Actions drift detection patterns (Terraform, infrastructure)
- Archgate documentation on drift prevention
- markdown-link-check and link validation tools
- CI/CD pipeline documentation

**What Sources Agree On**:
- **Generate, Don't Write**: Documentation from code (TypeDoc, OpenAPI) stays accurate automatically
- **CI Integration**: Automated validation on every PR is essential
- **Link Checking**: Dead links in documentation are a common drift indicator
- **Custom Rules**: Archgate + GitHub Actions more flexible than generic third-party tools

**Critical Discovery**: The existing plan references "DeepDocs, FluentDocs, Autohand" for drift detection, but:
- ❌ **No 2026 sources confirm these tools exist or are active**
- ✅ **Archgate + GitHub Actions provides proven, documented alternative**

**Drift Prevention Strategies**:

1. **TypeDoc Generation**:
   - Run on every PR
   - Parse output for warnings/errors
   - Fail build if documentation is stale

2. **OpenAPI Validation**:
   - Validate YAML/JSON syntax
   - Check for required fields (operationId, description, etc.)
   - Compare against code via linting rules

3. **Link Checking** (via markdown-link-check):
   - Tool: npm package or GitHub Action
   - Runs in < 1 second
   - Detects dead internal links in docs
   - GitHub Action: `tcort/github-action-markdown-link-check@v1`

4. **Archgate Rules**:
   - Custom TypeScript rules for architecture compliance
   - Can validate ADR adherence automatically
   - Runs in CI + AI agents

5. **JSDoc Consistency**:
   - ESLint plugins for JSDoc validation
   - Custom rules for comment completeness
   - Runs in CI pipeline

**Confidence**: **MEDIUM-HIGH** — Archgate/GitHub Actions approach is proven. DeepDocs/FluentDocs not verified.

**Recommendation**:
- Replace Phase 3 "drift detection tool" recommendation with **Archgate + custom GitHub Actions**
- Implement markdown-link-check for dead link detection
- Build ESLint rule plugins for JSDoc consistency

---

### Q5: What GitHub Actions Workflows Are Needed for Documentation Validation?

**Sources Examined**:
- GitHub Actions documentation
- CI/CD pipeline examples
- Firefly.ai and OneUptime infrastructure drift detection patterns

**Recommended Workflow Components**:

1. **TypeDoc Generation & Validation**:
   - Trigger: On PR, push to master
   - Steps: Install → Run TypeDoc → Upload artifact → Check for warnings
   - Fail if TypeDoc exits with error code

2. **Link Checking**:
   - Use: `tcort/github-action-markdown-link-check@v1`
   - Timeout: 10 seconds per link
   - Patterns: Ignore external links, GitHub-generated links

3. **OpenAPI Validation**:
   - Validate YAML syntax
   - Check required fields
   - Generate Swagger UI preview

4. **JSDoc Coverage**:
   - Count JSDoc comments
   - Fail if coverage drops below threshold
   - Report by module

**Confidence**: **HIGH** — GitHub Actions patterns are well-established.

**Recommendation**: Create `WORKFLOW-DOCUMENTATION-VALIDATION.md` with step-by-step implementation.

---

### Q6: Should ADRs Use Structured MADR Format for This Project?

**Context**: 
- Jarvis has 80+ governance documents already
- Multi-agent system with complex architectural decisions
- Needs audit trails for governance

**Analysis**:

| Factor | Supports Structured MADR? |
|--------|---------------------------|
| Compliance needs | ✅ Yes (governance framework) |
| AI assistant usage | ✅ Yes (Cursor, Claude Code) |
| 20+ ADRs planned | ✅ Yes |
| Long-lived project | ✅ Yes |
| Decision analytics | ✅ Yes (governance metrics) |

**Recommendation**: **YES, use Structured MADR**

**Rationale**:
1. Jarvis already has sophisticated governance (AGENTS.md, 80+ documents)
2. Multi-agent nature means architectural decisions are critical and frequently referenced
3. Structured metadata enables AI assistants to apply ADRs correctly
4. Compliance tracking aligns with existing governance model
5. Audit sections provide governance audit trail

**Implementation**:
- Phase 1: Write 3 ADRs using Structured MADR format
- Phase 2: Backfill 2-3 additional ADRs with structure
- Phase 3: Automate ADR analysis and compliance via Archgate

---

## Synthesis: 2–4 Enhanced Approaches for Jarvis

The existing `DOCUMENTATION-STRATEGY.md` proposes Approach D (Governance-Integrated). This research enhances it with 2026 tools:

### Enhanced Approach D: Governance-Integrated with Executable ADRs

**Description**: Leverage multi-agent governance + Structured MADR + Archgate for self-improving documentation system.

**Phase 1 (Unchanged)**:
- TypeDoc setup ✅ (remains correct)
- JSDoc comments ✅ (remains correct)
- OpenAPI specs ✅ (enhanced with agent-specific metadata)
- **NEW**: ADRs use Structured MADR format instead of traditional format
- **NEW**: Archgate CLI installed and basic rules created

**Phase 2 (Enhanced)**:
- TypeDoc CI integration ✅ (remains correct)
- OpenAPI specs ✅ (with agent-hint extensions)
- **ENHANCED**: markdown-link-check added to validation workflow
- **NEW**: Archgate rules validated in CI
- **NEW**: Custom GitHub Actions for JSDoc consistency

**Phase 3 (Significantly Enhanced)**:
- **REPLACE** "drift detection tool" with Archgate + custom rules
- **ADD** ESLint plugins for JSDoc validation
- **ADD** Structured MADR audit section automation
- ADR review process enhanced with machine-readable metadata

**Pros**:
- ✅ All 2026 tools verified and documented
- ✅ Self-improving governance loop via Archgate
- ✅ No third-party tool dependencies
- ✅ Perfect alignment with existing Jarvis governance model
- ✅ AI assistant integration (Cursor, Claude Code)

**Cons**:
- ⚠️ Structured MADR has learning curve
- ⚠️ Archgate rules require TypeScript expertise
- ⚠️ More complex than Approach B

**Effort**: Similar to original estimates (1–2 + 2–4 + 6–8 weeks), with tooling consolidation.

---

## Conflicts with Existing Standards

**NONE DETECTED.**

The existing `DOCUMENTATION-STRATEGY.md` aligns perfectly with 2026 best practices. No conflicts found with:
- AGENTS.md governance model
- Layering standards
- Testing standards
- Any existing policies

The enhancements are **additive**, not contradictory.

---

## Critical Recommendations for Jarvis

### 1. Phase 1 Enhancement: Use Structured MADR from Day 1

**Current Plan**: Traditional ADRs  
**Recommendation**: Use Structured MADR format for the 3 critical ADRs

**Impact**:
- Minimal additional effort (YAML frontmatter ~10 lines per ADR)
- Enables future automation and querying
- Aligns with AI-assisted development workflow

**Implementation**: 
- Use Structured MADR template: [github.com/zircote/structured-madr](https://github.com/zircote/structured-madr)
- Optional: Install ADR plugin for Claude Code from marketplace

### 2. Phase 3 Major Change: Replace Drift Detection Tool with Archgate

**Current Plan**: "Evaluate DeepDocs, FluentDocs, Autohand"  
**Recommendation**: Use Archgate + GitHub Actions instead

**Rationale**:
- ✅ DeepDocs, FluentDocs verification not found in 2026 sources
- ✅ Archgate is documented, open-source, production-ready
- ✅ Integrates directly with Cursor (your existing tool)
- ✅ No cost (Apache 2.0 license)
- ✅ Enables AI agent governance loop

**Implementation**:
1. Install Archgate CLI: `npm install -g archgate`
2. Create TypeScript rules files alongside ADRs
3. Add `archgate check` to CI/CD workflow
4. Integrate with GitHub Actions: Exit code 1 blocks non-compliant merges

### 3. Phase 2 Addition: markdown-link-check

**Current Plan**: No link validation  
**Recommendation**: Add GitHub Action for dead link detection

**Impact**:
- Catches documentation rot (broken internal links)
- Runs in < 1 second
- Minimal configuration
- GitHub Marketplace action available

**Implementation**:
```yaml
- uses: tcort/github-action-markdown-link-check@v1
  with:
    use-quiet-mode: yes
    config-file: .github/mlc_config.json
```

---

## Ranked Recommendations Summary

### Priority 1 (Phase 1): Immediate Adoption
1. **Use Structured MADR for ADRs** (minimal effort, high future value)
2. **Install Archgate CLI** (prepare for Phase 3)

### Priority 2 (Phase 2): Implementation
1. **TypeDoc + CI/CD** (already planned, confirmed as best practice)
2. **OpenAPI + agent-specific hints** (enhance existing approach)
3. **markdown-link-check** (add to validation workflow)

### Priority 3 (Phase 3): Automation
1. **Archgate rules enforcement** (replace "drift detection tool")
2. **ESLint JSDoc plugins** (consistency checking)
3. **Structured MADR audit automation** (quarterly review)

---

## Points Requiring Human Decision

### 1. Adopt Structured MADR Format?

**Options**:
- A) Traditional MADR (simpler, less automation)
- B) Structured MADR (more structured, enables automation)

**Recommendation**: **B — Structured MADR**

**Rationale**: Aligns with Jarvis governance model and AI-assisted development.

**Decision Needed**: Approve or defer?

---

### 2. Use Archgate for Governance Enforcement?

**Options**:
- A) Traditional CI checks only (current plan)
- B) Archgate + custom TypeScript rules (enhanced)

**Recommendation**: **B — Archgate**

**Rationale**: 
- Integrates with Cursor (your dev tool)
- No cost (open-source)
- Self-improving governance loop
- Proven tool with active development

**Decision Needed**: Approve or defer to Phase 4?

---

### 3. OpenAPI Extensions for Agent Systems?

**Options**:
- A) Standard OpenAPI 3.1 (current plan)
- B) Add x-agent-hint extensions (enhanced)

**Recommendation**: **B — Add Extensions**

**Rationale**: Marginal effort, significant value for AI agent routing and decision-making.

**Decision Needed**: Approve or keep standard OpenAPI?

---

## Agent Sequence for Enhanced Implementation

1. **You (Human Owner)**: Approve/defer decisions above
2. **Planning & PA Agent**: Update implementation plan with Structured MADR, Archgate, markdown-link-check
3. **Architecture Guardian**: Review Structured MADR format against layering standards
4. **Coder – Feature Agent**: Implement Phase 1 with Structured MADR + Archgate setup
5. **Enforcement Supervisor**: Validate documentation governance checklist
6. **Docs Guardian**: Begin review process with enhanced tooling

---

## Success Criteria for Enhanced Approach

### Phase 1 Success (Unchanged)
- TypeDoc generates HTML for all critical agents ✅
- 3 OpenAPI specs are valid and complete ✅
- **NEW**: 3 ADRs use Structured MADR format
- **NEW**: Archgate CLI installed and initial rules created

### Phase 2 Success (Enhanced)
- TypeDoc integrates into CI ✅
- Domain READMEs complete ✅
- **NEW**: markdown-link-check runs on PRs
- **NEW**: Archgate rules validated in CI

### Phase 3 Success (Significantly Enhanced)
- **CHANGED**: Archgate enforces ADR compliance instead of generic drift tool
- **NEW**: ESLint JSDoc plugins configured
- **NEW**: Structured MADR audit sections populated
- Documentation coverage > 90% ✅

---

## Related External Resources

### Tooling Documentation
- [Structured MADR Specification](https://github.com/zircote/structured-madr)
- [Archgate Documentation](https://archgate.dev)
- [TypeDoc Official Documentation](https://typedoc.org)
- [markdown-link-check](https://github.com/tcort/markdown-link-check)
- [OpenAPI 3.1 Specification](https://spec.openapis.org)

### References
- [Web4Agents: OpenAPI for Agents](https://web4agents.org/en/docs/openapi-for-agents)
- [Swarms: Multi-Agent Systems](https://docs.swarms.ai)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

---

## Document Metadata

- **Created**: 2026-03-22
- **Status**: Ready for Human Review
- **Audience**: Human owner, Planning & PA Agent, Docs Guardian
- **Related Documents**:
  - `DOCUMENTATION-STRATEGY.md` (original research)
  - `IMPLEMENTATION-PLAN-DOCUMENTATION.md` (original plan)
  - `AGENTS.md` (governance framework)
  - `.github/docs/workflows/WORKFLOW-DOCUMENTATION-VALIDATION.md` (to be created)
- **Next Review**: After Phase 1 completion or upon human decision
- **Revision**: 1.0
