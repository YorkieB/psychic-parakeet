# Implementation Updates: 2026 Research Findings

## Quick Reference for Enforcement Supervisor

This document summarizes changes to the `IMPLEMENTATION-PLAN-DOCUMENTATION.md` based on external research.

---

## Phase 1 Updates (1–2 weeks)

### Add: TSDoc Recommendation
**New Step 1.3a: Use TSDoc Format for JSDoc Comments**

In section 1.3 (Add JSDoc to 10–15 Critical Agent Files), update guidance:

```typescript
// ❌ Avoid JSDoc style (still supported but less optimal)
/**
 * @param {string} userInput The user's input message
 */

// ✅ Prefer TSDoc style (better IDE support)
/**
 * @param userInput - The user's input message
 */
```

**Key differences:**
- TSDoc requires hyphens after parameter names
- No types in comments (TypeScript infers types)
- Better IntelliSense in VS Code
- Fully backward compatible with TypeDoc v0.28

**Success criteria addition:**
- TSDoc format used for new comments in Phase 1
- Mixed TSDoc/JSDoc acceptable during transition
- No migration of existing JSDoc required yet

---

## Phase 2 Updates (2–4 weeks)

### Add: Vale Prose Linting
**New Step 2.6a: Vale Configuration**

In section 2.6 (Add Documentation Checklist to CI), add new validation:

**Create `.vale.ini` file:**
```ini
[core]
StylesPath = .styles
MinAlertLevel = warning

[*.md]
BasedOnStyles = Vale
```

**Add Vale checks to CI workflow:**
- Grammar and style consistency
- Spelling validation
- Jargon consistency (define domain-specific terms)
- Readability level (optional)

**Success criteria addition:**
- Vale validation runs on all PRs (advisory level in Phase 2)
- Common style violations are documented in linting report
- Team begins following consistent style

### Update: Drift Detection Planning
**Clarify Phase 3 tool selection in section 2.6**

Replace: "Evaluate tools: DeepDocs, FluentDocs, Autohand"
With: "Phase 3 will evaluate: Drift (free), DocDrift (commercial with auto-remediation), FluentDocs (SaaS)"

---

## Phase 3 Updates (6–8 weeks ongoing)

### Tool Recommendation: Drift
**Update section 3.1 (Integrate Drift Detection Tool)**

**Recommended tool for Phase 3: Drift**

**Configuration:**
```yaml
# .github/workflows/docs-drift.yml
name: Documentation Drift Detection
on: [pull_request, push]

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: driftdev/drift-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          rules: jsdoc,markdown,examples,api-changes
```

**Why Drift:**
- ✅ Free, open-source
- ✅ Native GitHub Actions integration
- ✅ 15 drift detection rules (TypeScript-focused)
- ✅ JSDoc validation with type-checking
- ✅ Example validation against code
- ⚠️ Limited AI-powered remediation (unlike DocDrift)

**Alternative (if budget allows):**
- DocDrift: Commercial tool with automatic remediation via Devin AI

**Fallback (if Drift doesn't work):**
- Vale prose linting + custom GitHub Actions script

**Success criteria:**
- Drift runs on every PR without errors
- Violations are clearly reported in PR comments
- Team adopts recommendations, documentation improves

### Add: Vale as Hard Gate
**Update section 3.2 (Documentation as Test Gate)**

Add Vale as blocking check in Phase 3:
- Spell checking must pass (0 violations)
- Style consistency must pass (optional: advisory in Phase 3, blocking in future quarters)
- Grammar rules advisory in Phase 3

---

## New Decision Points

### 1. TSDoc Adoption Timeline (Phase 1)
**Recommendation: Immediate adoption for new comments**
- No migration of existing JSDoc required in Phase 1
- Mixed usage acceptable; focus on new APIs

### 2. Vale Prose Linting (Phase 2)
**Recommendation: Advisory level (warnings only)**
- Phase 2: Warns about violations, doesn't block PRs
- Phase 3+: Escalate spelling to hard gate
- Style rules remain advisory for flexibility

### 3. Drift Tool (Phase 3)
**Recommendation: Start with Drift (free), evaluate DocDrift if team grows**
- Drift covers 90% of use cases
- DocDrift worth considering if auto-remediation becomes critical

---

## Summary of Changes

| Phase | Update | Effort | Risk |
|-------|--------|--------|------|
| **Phase 1** | Use TSDoc for new comments | None (format only) | None |
| **Phase 2** | Add Vale linting (advisory) | 1–2 hours setup | Low (warnings only) |
| **Phase 3** | Add Drift tool + hard gates | 1–2 hours setup | Low (tool is stable) |

---

## No Conflicts Detected

✅ All updates enhance (not conflict with) existing governance standards
✅ AGENTS.md Docs Guardian role remains unchanged
✅ Implementation plan structure remains valid
✅ Existing decisions preserved

---

## Next Steps

1. **Enforcement Supervisor:** Review these updates and validate against AGENTS.md
2. **Planning & PA Agent:** Update `IMPLEMENTATION-PLAN-DOCUMENTATION.md` with these refinements
3. **Coder – Feature Agent:** Proceed with Phase 1 using TSDoc format
4. **Research Agent – External Knowledge:** This work is complete; archive in docs/archive/ after Phase 1 kickoff

---

## References

- `RESEARCH-EXTERNAL-KNOWLEDGE-UPDATED.md` — Full research findings
- `DOCUMENTATION-STRATEGY.md` — Original research (validated, no changes needed)
- `AGENTS.md` — Governance framework (unchanged)

---

**Document Metadata**
- Created: 2026-03-22
- Status: Ready for Enforcement Supervisor review
- Audience: Enforcement Supervisor, Planning & PA Agent, Coder – Feature Agent
