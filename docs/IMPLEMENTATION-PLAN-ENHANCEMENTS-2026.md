# Documentation Strategy: Enhanced Implementation Addendum (2026)

**Date**: 2026-03-22  
**Reference**: `IMPLEMENTATION-PLAN-DOCUMENTATION.md`  
**Status**: Enhancement based on external research validation

---

## Overview

This addendum enhances the existing Implementation Plan with 2026 discoveries and tooling improvements. All recommendations are backward-compatible with the existing three-phase plan.

---

## Phase 1 Enhancements

### 1.5.1 Use Structured MADR for ADRs (NEW)

**Current Plan Section**: 1.5 (Create First 3 ADRs)

**Enhancement**: 
Use **Structured MADR** format instead of traditional MADR format. This adds machine-readable metadata to ADRs while maintaining readability.

**Changes to Section 1.5**:

Add YAML frontmatter to each ADR file:

```yaml
---
title: "Agent Orchestration Pattern"
description: "Decision to use registry pattern for agent discovery and routing"
type: adr
category: architecture
tags:
  - agents
  - orchestration
  - registry-pattern
status: accepted
created: 2026-03-21
updated: 2026-03-21
author: Architecture Team
project: jarvis
technologies:
  - typescript
  - nodejs
audience:
  - developers
  - architects
related:
  - adr-002.md  # Security Layer Design
  - adr-003.md  # Self-Healing Approach
---

# ADR-001: Agent Orchestration Pattern

## Context
[rest of markdown as before]
```

**Additional Section to Add**: Audit Section

Before closing each ADR markdown file, add:

```markdown
## Audit

### 2026-03-21

**Status:** Accepted (not yet reviewed for implementation)

**Findings:**

| Finding | Status | Files | Notes |
|---------|--------|-------|-------|
| Registry pattern prototype | pending | `src/agents/registry.ts` | Initial implementation in progress |
| Router middleware | pending | `src/orchestrator/router.ts` | To be implemented in Phase 2 |
| Lifecycle manager | pending | `src/orchestrator/lifecycle.ts` | To be implemented in Phase 2 |

**Summary:** ADR accepted. Implementation to begin in Phase 2. No compliance violations found (implementation pending).

**Action Required:** Code review upon Phase 2 completion.
```

**Rationale**:
- Minimal additional effort (YAML frontmatter ~10 lines, audit section ~10 lines)
- Enables future automation and querying (Phase 3)
- Aligns with AI-assisted development workflows
- Supports compliance tracking without manual auditing
- Integrates with Archgate governance (see 1.6.1 below)

**Reference**: [Structured MADR Specification](https://github.com/zircote/structured-madr)

**Success Criteria** (modified):
- ✅ 3 ADRs created in Structured MADR format
- ✅ Each ADR includes YAML frontmatter with all required fields
- ✅ Each ADR includes initial Audit section with "Accepted" status
- ✅ ADRs are valid YAML (can be parsed by tools)

---

### 1.6.1 Install Archgate for Governance Enforcement (NEW)

**After Section 1.6** (Expand Docs Guardian Role)

**New Subsection**: 1.6.1 Set Up Archgate CLI

**Agent**: Coder – Feature Agent  
**Scope**: Project configuration, governance tooling  
**Changes**:

1. Install Archgate CLI:
```bash
# Via npm (recommended for Node.js projects)
npm install --save-dev archgate

# Or via curl (macOS/Linux)
curl -fsSL https://cli.archgate.dev/install-unix | sh
```

2. Create `.archgate/config.json`:
```json
{
  "projectName": "jarvis",
  "adrsPath": "docs/ARCHITECTURE",
  "rulesPath": "docs/ARCHITECTURE/rules",
  "ciCommand": "archgate check",
  "format": "structured-madr"
}
```

3. Create initial rule file `docs/ARCHITECTURE/rules/adr-001-registry-pattern.ts`:
```typescript
export const rule = {
  name: "ADR-001: Use registry pattern for agent discovery",
  description: "Agents must be registered via central registry, not directly imported",
  
  check: async (files) => {
    const violations = [];
    
    for (const file of files) {
      // Skip test files and registry itself
      if (file.path.includes(".test.") || file.path.includes("registry")) {
        continue;
      }
      
      // Check for direct agent imports (violation)
      if (file.content.match(/import\s+\{.*Agent\}\s+from\s+["'].*agents\/.*["']/)) {
        violations.push({
          file: file.path,
          severity: "error",
          message: "Direct agent import violates ADR-001. Use registry.getAgent(name) instead."
        });
      }
    }
    
    return violations;
  }
};
```

**Success Criteria** (new):
- ✅ Archgate CLI is installed
- ✅ `.archgate/config.json` exists
- ✅ Initial rule for ADR-001 created and tested locally
- ✅ `archgate check` runs without errors on current codebase

**Integration**: Rules will be enforced in Phase 2 CI/CD workflow.

---

### 1.4.1 Enhance OpenAPI Specs with Agent-Specific Metadata (NEW)

**Current Plan Section**: 1.4 (Generate OpenAPI Specs for 2–3 Representative Agents)

**Enhancement**: 
Add agent-specific metadata extensions to make specs compatible with AI agent routing and decision-making.

**Example Enhancement for DIALOGUE-AGENT-API.yaml**:

```yaml
# Add to top-level specification
x-agent-classification:
  category: "conversation"
  complexity: "medium"
  requires_context: ["user_history", "knowledge_base"]
  token_cost_estimate: 500  # avg tokens for routing decision

# For each endpoint, add x-agent-hint extensions:
/agents/dialogue/process:
  post:
    operationId: processDialogue
    x-agent-hint:
      routing:
        - use_when: "User asking conversational questions"
        - avoid_when: "User needs real-time data or external API calls"
      context_required:
        - user_profile
        - conversation_history
      fallback_agent: "knowledge-agent"
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              userInput:
                type: string
                description: "User's input message"
              sessionId:
                type: string
                description: "Conversation session ID for context"
              includeContext:
                type: boolean
                description: "Whether to include conversation history"
```

**Rationale**:
- Minimal change (5-10 additional lines per endpoint)
- Significant value for AI agent routing
- Aligns with OpenAPI 3.1 best practices for agent systems
- Reduces token overhead for agent context windows

**Reference**: [Web4Agents: OpenAPI for Agents](https://web4agents.org/en/docs/openapi-for-agents)

**Success Criteria** (modified):
- ✅ OpenAPI specs include `x-agent-classification` at spec level
- ✅ All endpoints include `x-agent-hint` with routing guidance
- ✅ Specs remain valid per OpenAPI 3.1 schema
- ✅ Swagger UI renders without errors

---

## Phase 2 Enhancements

### 2.5.1 Add Link Checking to Validation Workflow (NEW)

**After Section 2.6** (Add Documentation Checklist to CI)

**New Subsection**: 2.6.1 Link Validation

**Agent**: Coder – Feature Agent  
**Scope**: `.github/workflows/`, CI configuration  
**Changes**:

1. Add markdown-link-check to `package.json`:
```json
{
  "devDependencies": {
    "markdown-link-check": "^3.14.2"
  },
  "scripts": {
    "docs:check-links": "markdown-link-check -c .github/mlc_config.json \"**/*.md\" -r"
  }
}
```

2. Create `.github/mlc_config.json`:
```json
{
  "ignorePatterns": [
    "^https://github.com/[^/]+/[^/]+$",
    "^https://github.com/[^/]+/[^/]+/issues$"
  ],
  "replacementPatterns": [],
  "timeout": "10s",
  "retryOn429": true,
  "retryCount": 2
}
```

3. Add to documentation validation workflow:
```yaml
name: Documentation Validation

on:
  pull_request:
  push:
    branches:
      - master

jobs:
  link-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check Markdown Links
        run: |
          npm install markdown-link-check
          npm run docs:check-links
```

**Success Criteria** (new):
- ✅ markdown-link-check installed
- ✅ Link checking runs in CI on every PR
- ✅ No dead links in documentation
- ✅ Runs in < 5 seconds

---

### 2.6.2 Archgate Check Integration in CI (NEW)

**After Section 2.6.1**

**Agent**: Coder – Feature Agent  
**Scope**: `.github/workflows/`  
**Changes**:

Add to documentation validation workflow:

```yaml
jobs:
  archgate-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Archgate
        run: npm install -g archgate
      
      - name: Run Archgate Rule Checks
        run: archgate check
        
      - name: Report Violations
        if: failure()
        run: |
          echo "::error::Archgate governance violations detected"
          echo "Run 'archgate check --verbose' locally for details"
```

**Success Criteria** (new):
- ✅ Archgate rules run in CI
- ✅ Non-compliant code is reported
- ✅ Warnings are advisory (not blocking yet)

---

## Phase 3 Enhancements

### 3.1 REPLACEMENT: Use Archgate + GitHub Actions Instead of Third-Party Tool

**Current Plan Section**: 3.1 (Integrate Drift Detection Tool)

**Enhancement**: 
Replace the recommendation to evaluate "DeepDocs, FluentDocs, Autohand" with a proven, open-source approach using Archgate.

**Changes to Section 3.1**:

**Before** (Current):
```
Research and evaluate tools:
- DeepDocs: Detects documentation gaps on PR
- FluentDocs: Auto-generates architecture documentation
- Autohand: Proposes documentation updates
```

**After** (Enhanced):
```
Use Archgate + GitHub Actions + Custom Rules:
- Archgate: Executable governance rules in TypeScript (free, open-source)
- GitHub Actions: Scheduled documentation audits
- Custom Rules: ADR compliance checking
```

**Expanded Implementation Plan**:

#### 3.1.1 Expand Archgate Rules for Documentation

Create rules for documentation completeness:

`docs/ARCHITECTURE/rules/adr-compliance-check.ts`:
```typescript
export const rule = {
  name: "All architectural changes require ADRs",
  description: "Significant changes to architecture must have corresponding ADR",
  
  check: async (files) => {
    const violations = [];
    const changedArchFiles = files.filter(f => 
      f.path.includes("src/") && 
      f.path.endsWith(".ts") &&
      f.status === "modified"
    );
    
    // For now, advisory only (Phase 3 escalates to blocking)
    if (changedArchFiles.length > 5) {
      violations.push({
        file: "docs/ARCHITECTURE/",
        severity: "warning",
        message: `${changedArchFiles.length} architecture files changed. Consider if ADR is needed.`
      });
    }
    
    return violations;
  }
};
```

`docs/ARCHITECTURE/rules/jsndoc-coverage.ts`:
```typescript
export const rule = {
  name: "JSDoc coverage for public APIs",
  description: "All exported functions and classes must have JSDoc comments",
  
  check: async (files) => {
    const violations = [];
    
    for (const file of files) {
      if (!file.path.endsWith(".ts") || file.path.includes(".test.")) continue;
      
      // Check for exported items without JSDoc
      const exports = file.content.match(/export\s+(class|function|const|interface)\s+(\w+)/g) || [];
      const jsdoc = file.content.match(/\/\*\*[\s\S]*?\*\//g) || [];
      
      if (exports.length > jsdoc.length) {
        violations.push({
          file: file.path,
          severity: "warning",
          message: `${exports.length} exports but only ${jsdoc.length} JSDoc comments found`
        });
      }
    }
    
    return violations;
  }
};
```

#### 3.1.2 Enforce Archgate Violations as Blocking Gate

Upgrade violation severity from advisory to blocking:

```yaml
# In .archgate/config.json
{
  "enforcement": {
    "blockingRules": [
      "adr-compliance-check",
      "adr-001-registry-pattern"
    ],
    "advisoryRules": [
      "jsndoc-coverage"  # Advisory in Phase 3; blocking in Phase 4
    ]
  }
}
```

**Rationale for Change**:
- ✅ Archgate is documented and actively maintained
- ✅ Free and open-source (Apache 2.0 license)
- ✅ Integrates directly with Cursor (development tool already in use)
- ✅ Enables self-improving governance (human findings → automated rules)
- ❌ DeepDocs, FluentDocs not verified in 2026 sources

**Success Criteria** (modified):
- ✅ Archgate rules execute in CI/CD
- ✅ Documentation compliance violations are reported
- ✅ Non-compliant merges blocked (enforced as hard gate)
- ✅ Custom rules are authored and maintained
- ✅ Quarterly review of rule effectiveness

---

### 3.3.1 Structured MADR Audit Automation (NEW)

**After Section 3.3** (Quarterly ADR Review Process)

**Agent**: Coder – Feature Agent  
**Scope**: `docs/ARCHITECTURE/`, automation scripts  
**Changes**:

Create automated audit script that updates ADR audit sections quarterly:

`scripts/audit-adrs.ts`:
```typescript
import fs from 'fs';
import path from 'path';

interface ADRMetadata {
  title: string;
  tags: string[];
  status: string;
  created: string;
}

function parseADRFrontmatter(content: string): ADRMetadata | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  try {
    // Simple YAML parsing (use proper parser in production)
    const frontmatter = match[1];
    return {
      title: frontmatter.match(/title:\s*"([^"]+)"/)?.[1] || '',
      tags: frontmatter.match(/tags:\s*\[([^\]]+)\]/)?.[1]?.split(',').map(t => t.trim()) || [],
      status: frontmatter.match(/status:\s*(\w+)/)?.[1] || 'pending',
      created: frontmatter.match(/created:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || ''
    };
  } catch {
    return null;
  }
}

function addAuditSection(adrPath: string): void {
  const content = fs.readFileSync(adrPath, 'utf-8');
  
  // Check if audit section already exists
  if (content.includes('## Audit')) {
    console.log(`${path.basename(adrPath)}: Audit section already exists`);
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const auditSection = `
## Audit

### ${today}

**Status:** Accepted (implementation pending)

**Findings:**

| Finding | Status | Notes |
|---------|--------|-------|
| - | pending | Initial audit section created |

**Summary:** ADR accepted. Awaiting implementation review.

**Action Required:** None (scheduled for quarterly review)
`;
  
  // Append audit section before closing the file
  const updated = content + '\n' + auditSection;
  fs.writeFileSync(adrPath, updated);
  console.log(`${path.basename(adrPath)}: Audit section added`);
}

// Main
const adrDir = path.join(__dirname, '../docs/ARCHITECTURE');
const adrFiles = fs.readdirSync(adrDir).filter(f => f.startsWith('adr-') && f.endsWith('.md'));

adrFiles.forEach(file => {
  addAuditSection(path.join(adrDir, file));
});

console.log(`Processed ${adrFiles.length} ADRs`);
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "adrs:audit": "ts-node scripts/audit-adrs.ts"
  }
}
```

**Rationale**:
- Automates quarterly audit section population
- Provides compliance trail without manual effort
- Enables metrics collection (which ADRs are stale, which are compliant)

**Success Criteria** (new):
- ✅ Script generates audit sections
- ✅ Quarterly automated audit runs
- ✅ Compliance metrics collected and reported

---

## Summary of All Enhancements

| Phase | Enhancement | Effort | Value |
|-------|-------------|--------|-------|
| **Phase 1** | Use Structured MADR format | +10% | High (future automation) |
| **Phase 1** | Install Archgate CLI | +5% | Medium (prepare for Phase 3) |
| **Phase 1** | Add agent-specific OpenAPI metadata | +10% | High (AI agent integration) |
| **Phase 2** | markdown-link-check integration | +5% | Medium (catches drift early) |
| **Phase 2** | Archgate CI/CD check | +5% | Medium (advisory enforcement) |
| **Phase 3** | Replace generic drift tool with Archgate | -20% | High (proven open-source) |
| **Phase 3** | Automated ADR audit section population | +10% | Medium (compliance automation) |
| **Total** | Net effort | ~+20% | Very High |

---

## Backward Compatibility

**All enhancements are backward-compatible** with the existing Implementation Plan. Teams can:
- ✅ Start with traditional MADR format, upgrade to Structured MADR later
- ✅ Skip Archgate in Phase 1, add in Phase 2 or 3
- ✅ Use simple OpenAPI specs, enhance with agent hints later

**Recommendation**: Adopt all Phase 1 enhancements immediately (minimal effort, high future value).

---

## Decision Points for Human Owner

### 1. Adopt Structured MADR in Phase 1?
**Recommended**: YES
- Minimal additional effort
- Enables Phase 3 automation
- Aligns with Jarvis governance model

### 2. Install Archgate in Phase 1?
**Recommended**: YES
- Prepares for Phase 3 integration
- No cost (Apache 2.0 license)
- Minimal installation overhead

### 3. Add Agent-Specific OpenAPI Metadata?
**Recommended**: YES
- Marginal effort (~10% increase)
- Significant value for multi-agent routing
- Aligns with OpenAPI 3.1 best practices

### 4. Use Archgate Instead of Third-Party Drift Tool?
**Recommended**: YES
- Open-source and actively maintained
- Integrates with Cursor
- Cheaper than paid alternatives
- Community support

---

## Related External Resources

- [Structured MADR](https://github.com/zircote/structured-madr)
- [Archgate](https://archgate.dev)
- [markdown-link-check](https://github.com/tcort/markdown-link-check)
- [Research: External Knowledge 2026](./RESEARCH-EXTERNAL-KNOWLEDGE-2026.md)

---

## Document Metadata

- **Created**: 2026-03-22
- **Based on**: IMPLEMENTATION-PLAN-DOCUMENTATION.md (2026-03-21)
- **Status**: Enhancement ready for approval
- **Related**: RESEARCH-EXTERNAL-KNOWLEDGE-2026.md
- **Revision**: 1.0
