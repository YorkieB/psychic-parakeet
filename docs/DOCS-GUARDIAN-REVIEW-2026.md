# Docs Guardian: Documentation Strategy Research Summary & Next Actions

**Date**: 2026-03-22  
**Prepared for**: Docs Guardian role  
**Reference**: AGENTS.md (Docs Guardian section)

---

## Overview

External research has validated and enhanced the existing documentation strategy. This summary highlights what the Docs Guardian needs to review and approve before implementation proceeds.

---

## Research Validation Results

### ✅ VALIDATED (No Changes Needed)

1. **TypeDoc as primary tool** — Confirmed as industry standard
2. **OpenAPI 3.1 for HTTP APIs** — Confirmed as best practice
3. **ADR approach** — Confirmed as sound (with enhancements available)
4. **Three-phase implementation** — Confirmed as reasonable timeline
5. **Docs Guardian role** — Confirmed as appropriate governance point

### 🆕 ENHANCED (Recommendations for Improvement)

1. **Use Structured MADR for ADRs** (Phase 1)
   - Add YAML frontmatter metadata
   - Add audit sections for compliance tracking
   - Minimal effort, significant future value

2. **Archgate for Governance Enforcement** (Phase 1 + Phase 3)
   - Install CLI in Phase 1
   - Create executable rules alongside ADRs
   - Phase 3: Use instead of generic drift detection tools

3. **Agent-Specific OpenAPI Metadata** (Phase 1)
   - Add `x-agent-hint` extensions to specs
   - Enables AI agent routing and decision-making
   - Marginal additional effort

4. **markdown-link-check for Dead Links** (Phase 2)
   - Detect documentation drift early
   - Runs in CI/CD < 5 seconds
   - Free, open-source tool

### ❌ UNVALIDATED (Replacing Recommendations)

1. **DeepDocs, FluentDocs, Autohand** — No 2026 sources confirm these exist
   - **Replacement**: Use Archgate + GitHub Actions instead
   - **Benefit**: Open-source, integrated with Cursor, self-improving

---

## Critical Enhancements Approved by Research

### Enhancement 1: Structured MADR Format

**Impact on Docs Guardian Responsibilities**:
- ADRs become queryable (filter by status, tags, technology)
- Audit sections simplify compliance tracking
- Integration with AI assistants (Claude Code, Cursor)

**Docs Guardian Action Required**:
- ✅ Review Structured MADR template
- ✅ Approve or recommend modifications
- ✅ Prepare team for slightly more complex ADR format

**Reference**: [github.com/zircote/structured-madr](https://github.com/zircote/structured-madr)

---

### Enhancement 2: Archgate for Governance

**Impact on Docs Guardian Responsibilities**:
- Governance rules executed automatically in CI
- Self-improving: violations → new rules → better compliance
- Phase 3 replaces manual "drift detection tool" with proven technology

**Docs Guardian Action Required**:
- ✅ Review Archgate documentation
- ✅ Approve integration into CI/CD workflow
- ✅ Plan for quarterly rule maintenance

**Reference**: [archgate.dev](https://archgate.dev)

---

### Enhancement 3: OpenAPI Agent Metadata

**Impact on Docs Guardian Responsibilities**:
- OpenAPI specs become compatible with AI agent routing
- Marginal specification changes (~10 lines per endpoint)
- Supports multi-agent system architecture

**Docs Guardian Action Required**:
- ✅ Review `x-agent-hint` extension examples
- ✅ Approve for Phase 1 rollout
- ✅ Ensure consistency across all agent specs

**Reference**: [Web4Agents: OpenAPI for Agents](https://web4agents.org/en/docs/openapi-for-agents)

---

## Docs Guardian Expanded Scope (Post-Phase 1)

The research suggests expanding Docs Guardian responsibilities:

### Current Responsibilities (from AGENTS.md)
- Keep high-level docs consistent with implemented behaviour
- Flag stale, contradictory, or misplaced docs

### Recommended Additions (Phase 3+)

1. **ADR Metadata Management**
   - Ensure YAML frontmatter is complete and accurate
   - Track ADR status transitions (Proposed → Accepted → Superseded)
   - Generate ADR health dashboards

2. **Archgate Rule Maintenance**
   - Review quarterly for rule effectiveness
   - Identify new violations → propose new rules
   - Escalate false positives to development team

3. **Documentation Metrics**
   - Collect TypeDoc coverage (% of APIs documented)
   - Track OpenAPI endpoint coverage
   - Monitor ADR age and freshness
   - Generate quarterly health reports

4. **Compliance Auditing**
   - Use Structured MADR audit sections to track adherence
   - Report violations to Enforcement Supervisor
   - Maintain audit trail for governance reviews

**Implementation**: Phase 3 (after tools are in place)

---

## Timeline & Checkpoints

### Phase 1 Checkpoint (1–2 weeks)

**Docs Guardian Reviews**:
- ✅ Structured MADR template and 3 pilot ADRs
- ✅ Archgate CLI installation and initial rule
- ✅ OpenAPI specs with agent metadata
- ✅ JSDoc coverage report (10–15 critical files)

**Docs Guardian Approves**:
- README quality (5+ domain READMEs)
- Documentation structure (ARCHITECTURE/, APIs/, GUIDES/ folders)
- Compliance with AGENTS.md governance

---

### Phase 2 Checkpoint (2–4 weeks)

**Docs Guardian Reviews**:
- ✅ TypeDoc HTML generation and quality
- ✅ CI/CD workflow validation (markdown-link-check, Archgate check)
- ✅ OpenAPI spec completeness (all agents documented)
- ✅ ADR usage by team (are new ADRs being created?)

**Docs Guardian Approves**:
- Documentation validation workflow
- Link checking configuration
- Archgate rule coverage

---

### Phase 3 Checkpoint (6–8 weeks initial)

**Docs Guardian Reviews**:
- ✅ Archgate enforcement effectiveness
- ✅ Structured MADR audit sections (quarterly)
- ✅ Documentation health metrics
- ✅ False positive rate in governance rules

**Docs Guardian Approves**:
- Escalation of advisory checks to blocking checks
- New Archgate rules based on team experience
- Metrics dashboard and quarterly reporting

---

## Decisions Required from Docs Guardian

### Decision 1: Approve Structured MADR?

**Question**: Should ADRs use Structured MADR format with YAML frontmatter and audit sections?

**Options**:
- A) Traditional MADR (simpler, less automation potential)
- B) Structured MADR (more structured, enables Phase 3 automation)

**Recommendation**: **B — Structured MADR**

**Rationale**: 
- Aligns with Jarvis governance model
- Minimal additional effort in Phase 1
- Significant value in Phase 3
- Supports AI-assisted development

**Action**: ☐ Approve Structured MADR  ☐ Defer to Phase 2  ☐ Decline (keep traditional)

---

### Decision 2: Adopt Archgate for Governance?

**Question**: Should Archgate be integrated into CI/CD for automatic governance enforcement?

**Options**:
- A) Current plan: Manual Docs Guardian reviews, optional automation
- B) Enhanced plan: Archgate automatically enforces rules, Phase 3 blocks merges

**Recommendation**: **B — Archgate Integration**

**Rationale**:
- Proven open-source tool (Apache 2.0 license)
- Direct Cursor integration (your development tool)
- Self-improving governance loop
- Reduces manual review burden

**Action**: ☐ Adopt Archgate  ☐ Phase 2 pilot  ☐ Skip for now

---

### Decision 3: Enforce Documentation in CI?

**Question**: When should documentation violations block merges?

**Options**:
- A) Phase 2: Advisory only (warnings, not blocking)
- B) Phase 3: Hard gate (blocks non-compliant merges)
- C) Never: Documentation is optional

**Recommendation**: **A → B (phased enforcement)**

**Rationale**:
- Soft start allows team adaptation
- Hard gate ensures quality long-term
- Aligns with governance-integrated approach

**Action**: ☐ Phase 2 advisory, Phase 3 hard gate  ☐ Soft enforcement only  ☐ Hard gate from Phase 1

---

## Quick Reference: What Docs Guardian Should Know

### Key Tools (All Free & Open-Source)

| Tool | Purpose | License | Cost |
|------|---------|---------|------|
| TypeDoc | TypeScript API documentation | Apache 2.0 | $0 |
| OpenAPI 3.1 | REST API specification standard | OpenAPI Initiative | $0 |
| Structured MADR | Machine-readable ADRs | MIT | $0 |
| Archgate | Executable governance rules | Apache 2.0 | $0 |
| markdown-link-check | Dead link detection | MIT | $0 |

### Key Metrics to Track (Phase 3+)

- **Documentation Coverage**: % of public APIs with JSDoc
- **OpenAPI Coverage**: % of HTTP endpoints documented
- **ADR Freshness**: Age of most recent ADR, % < 1 year old
- **Compliance**: % of accepted ADRs with zero violations
- **Drift Detection**: False positives in automated rules

### Docs Guardian Meetings & Cadence

- **Weekly**: Review PRs for documentation completeness (advisory phase)
- **Monthly**: Report on documentation health metrics
- **Quarterly**: ADR review and superseding process
- **As-needed**: Rule adjustment and false positive resolution

---

## Next Steps

### Immediate (This Week)

1. **Review** the three research documents:
   - `DOCUMENTATION-STRATEGY.md` (original research)
   - `RESEARCH-EXTERNAL-KNOWLEDGE-2026.md` (validation & new findings)
   - `IMPLEMENTATION-PLAN-ENHANCEMENTS-2026.md` (enhanced plan)

2. **Decide** on the three critical decisions (above)

3. **Approve** or recommend modifications to enhanced approach

### Short-term (Next 2 Weeks)

1. **Plan** Phase 1 with Planning & PA Agent
2. **Prepare** team for Structured MADR format
3. **Stage** Archgate installation

### Medium-term (Weeks 3–6)

1. **Supervise** Phase 1 completion
2. **Audit** initial ADRs, TypeDoc output, OpenAPI specs
3. **Prepare** for Phase 2 CI/CD integration

---

## Questions for Docs Guardian to Raise

Before approving the enhanced plan, consider:

1. **Team Readiness**: Is the team ready for more structured documentation format?
2. **Tooling Complexity**: Are Archgate rules maintainable by the team long-term?
3. **Enforcement Timeline**: Is phased enforcement (advisory → hard gate) appropriate?
4. **Governance Alignment**: Does this enhance or conflict with existing AGENTS.md?
5. **Metrics**: Which metrics matter most for quarterly reporting?

---

## References

### Documentation
- `DOCUMENTATION-STRATEGY.md` — Original research findings
- `IMPLEMENTATION-PLAN-DOCUMENTATION.md` — Original implementation plan
- `RESEARCH-EXTERNAL-KNOWLEDGE-2026.md` — 2026 validation and enhancements
- `IMPLEMENTATION-PLAN-ENHANCEMENTS-2026.md` — Enhanced implementation plan
- `AGENTS.md` — Governance framework

### External Resources
- [TypeDoc Official Docs](https://typedoc.org)
- [OpenAPI 3.1 Specification](https://spec.openapis.org)
- [Structured MADR](https://github.com/zircote/structured-madr)
- [Archgate Documentation](https://archgate.dev)
- [markdown-link-check](https://github.com/tcort/markdown-link-check)

---

## Document Metadata

- **Created**: 2026-03-22
- **Audience**: Docs Guardian role, Planning & PA Agent
- **Status**: Ready for review and decision
- **Related**: RESEARCH-EXTERNAL-KNOWLEDGE-2026.md, IMPLEMENTATION-PLAN-ENHANCEMENTS-2026.md
- **Next Review**: After Phase 1 checkpoint (approx. 2026-04-04)

---

**Next Action**: Docs Guardian should read the three research documents, consider the three critical decisions, and provide feedback within 3 business days.
