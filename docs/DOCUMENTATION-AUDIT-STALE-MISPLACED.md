# Documentation Audit: Stale and Misplaced Documents

**Generated**: 2026-03-22 02:02 UTC  
**Role**: Docs Guardian — Analysis-Only  
**Scope**: All documentation files across repository

---

## Document Organization Status

According to `AGENTS.md`, governance documents must be **centralized in `docs/**`**. This audit identifies documents that are:
1. **Stale** — outdated or superseded
2. **Misplaced** — should be in `docs/**` but are in root or elsewhere
3. **Orphaned** — referenced in governance but missing entirely

---

## Misplaced Documents (Should be in `docs/**`)

### Root-Level READMEs (Not Linked from Governance)

| File | Current Location | Should Be | Status | Issue |
|------|------------------|-----------|--------|-------|
| `README-TESTING.md` | `/workspace/` | `docs/GUIDES/TESTING.md` or similar | ⚠️ Misplaced | Not linked from root README; should be in docs/ |
| `README-CODE-QUALITY.md` | `/workspace/` | `docs/STANDARDS/CODE-QUALITY.md` or similar | ⚠️ Misplaced | Supporting docs scattered in root |

### Governance Documents in Wrong Location

| Document | Current | Expected Location | Status |
|----------|---------|-------------------|--------|
| `AGENTS.md` | `/workspace/AGENTS.md` | `/workspace/docs/GOVERNANCE-FRAMEWORK.md` or link from docs | ⚠️ Root OK but should be indexed from docs/ |

**Remediation**: 
- Move supporting READMEs to `docs/GUIDES/` or `docs/STANDARDS/`
- Create index in `docs/` linking to all governance docs
- Update root README to reference `docs/**` for standards

---

## Stale Documents

### In Root Directory

| Document | Last Modified | Age | Status | Content Issue |
|----------|---------------|-----|--------|---|
| `VOICE-ENGINE-STATUS.md` | ~21 days ago | Stale | ⚠️ Status outdated | References features; unclear if still accurate |
| `OPTIMIZATION_GUIDE.md` | ~21 days ago | Stale | ⚠️ Status outdated | Optimization recommendations may be superseded |
| `VOICE-ENGINE-ANALYSIS.md` | ~21 days ago | Stale | ⚠️ Status outdated | Analysis likely incomplete |
| `TROUBLESHOOTING.md` | ~21 days ago | Stale | ⚠️ Status outdated | May contain obsolete workarounds |
| `SENSOR-HEALTH-INTEGRATION-COMPLETE.md` | ~21 days ago | Stale | ⚠️ Status outdated | Indicates completed work; unclear if current |

**Issue**: These appear to be status/progress reports that should be archived, not kept in root.

### Recommendation:
- Move all status/report documents to `docs/ARCHIVE/` with date prefix
- Keep only current, maintained documentation in root
- Update root README to link only to maintained docs

---

## Documents Outside docs/** Violating Singleton Path Enforcement

Per `AGENTS.md` Section "Singleton Path Enforcement":

> Status/report docs must live under `docs/archive/**`.

### Current Violations

| Document | Location | Type | Should Be In |
|----------|----------|------|--------------|
| `VOICE-ENGINE-STATUS.md` | `/workspace/` | Status Report | `docs/archive/VOICE-ENGINE-STATUS-2026-03-21.md` |
| `VOICE-ENGINE-ANALYSIS.md` | `/workspace/` | Analysis Report | `docs/archive/VOICE-ENGINE-ANALYSIS-2026-03-21.md` |
| `SENSOR-HEALTH-INTEGRATION-COMPLETE.md` | `/workspace/` | Completion Report | `docs/archive/SENSOR-HEALTH-INTEGRATION-COMPLETE-2026-03-21.md` |
| `OPTIMIZATION_GUIDE.md` | `/workspace/` | Guide | Either `docs/GUIDES/` or `docs/archive/` |
| `TROUBLESHOOTING.md` | `/workspace/` | Guide | `docs/GUIDES/TROUBLESHOOTING.md` |

**Remediation Steps**:
1. Create `docs/archive/` directory
2. Move all status/report files to `docs/archive/` with date suffix
3. Move guides to `docs/GUIDES/`
4. Update root `.gitignore` to exclude archived docs from being published
5. Document this pattern in `AGENTS.md` under Singleton Path Enforcement

---

## Orphaned Documents (Referenced but Missing)

### Required by AGENTS.md but Not Found Anywhere

These governance documents are required for all Guardians to function, but **do not exist in `/workspace/docs/`**:

```
MISSING:
├── docs/
│   ├── LAYERING-STANDARDS.md ........................... ❌ MISSING (needed by Architecture Guardian)
│   ├── TESTING-STANDARDS.md ............................ ❌ MISSING (needed by Test Guardian)
│   ├── STATIC-ANALYSIS-TEST-RULES.md .................. ❌ MISSING (needed by Static Analysis Guardian)
│   ├── CHANGE-DETECTION-TEST-RULES.md ................. ❌ MISSING (needed by Change Detection Guardian)
│   ├── LINT-TEST-RULES.md ............................. ❌ MISSING (needed by Static Analysis Guardian)
│   ├── NAMING-CONVENTIONS.md ........................... ❌ MISSING (needed by Static Analysis Guardian)
│   ├── LOGGING-STANDARDS.md ............................ ❌ MISSING (needed by Logging & Invariants Guardian)
│   ├── INVARIANT-ENFORCEMENT-STANDARDS.md ............. ❌ MISSING (needed by Logging & Invariants Guardian)
│   ├── PURE-FUNCTION-STANDARDS.md ..................... ❌ MISSING (needed by Logging & Invariants Guardian)
│   ├── PERFORMANCE-STANDARDS.md ........................ ❌ MISSING (needed by Performance Guardian)
│   ├── SECURITY-TEST-RULES.md ......................... ❌ MISSING (needed by Security Guardian)
│   ├── WORKFLOW-*.md (all workflow docs) .............. ❌ MISSING (needed by Workflow Guardian)
│   ├── DOMAIN-BOUNDARY-RULES.md ........................ ❌ MISSING (referenced in Architecture Guardian)
│   └── MODULE-BOUNDARY-RULES.md ........................ ❌ MISSING (referenced in Architecture Guardian)
```

**Impact**: 
- Enforcement Supervisor cannot read standards to produce enforcement checklist
- All Guardian agents are blocked from validating code
- CI/CD enforcement cannot proceed

**Remediation**:
1. Extract these standards from existing configuration, comments, and AGENTS.md
2. Create individual `.md` files in `docs/**` for each
3. Ensure each standard includes:
   - Purpose (why this standard exists)
   - Scope (what it applies to)
   - Rules (specific requirements)
   - Examples (correct vs incorrect)
   - Exceptions (what's allowed to violate it)

---

## Inconsistent Documentation in Subdirectories

### Jarvis-Visual-Engine Documentation

| File | Purpose | Status |
|------|---------|--------|
| `Jarvis-Visual-Engine/README_START_HERE.md` | Entry point | ⚠️ Inconsistent naming (prefer `README.md`) |
| `Jarvis-Visual-Engine/README.md` | Main docs | ✅ Standard naming |
| `Jarvis-Visual-Engine/*.md` (20+ guides) | Feature guides | ⚠️ Scattered in root; should be organized |

**Issue**: Multiple guides in root directory should be organized under subdirectories (e.g., `docs/`, `guides/`, `setup/`).

**Remediation**:
- Consolidate under `Jarvis-Visual-Engine/docs/` or similar
- Update relative links in all guides
- Create index file linking all guides

### Dashboard Documentation

| File | Purpose | Status |
|------|---------|--------|
| `dashboard/README.md` | Dashboard guide | ✅ Standard but minimal |

**Issue**: Needs expansion to cover:
- Architecture overview
- Component structure
- Data flow diagrams
- Customization guide

---

## Stale Subdirectory Documentation

### /workspace/Jarvis-Visual-Engine/

Documents last modified ~21 days ago (likely from initial project setup):

```
FACE_RECOGNITION_READY.md
FACE_RECOGNITION_COMPLETE.md
DLIB_INSTALLATION_STATUS.md
DEPENDENCY_INSTALLATION_STATUS.md
INSTALLATION_COMPLETE.md
IMPLEMENTATION_SUMMARY.md
COMPLETE_IMPLEMENTATION.md
WORKING_DEMONSTRATION.md
SYSTEM_STATUS.md
SERVER_STATUS.md
API_SERVER_WORKING.md
FLASK_API_FIXED.md
DEMONSTRATION_COMMANDS.md
Vision_Engine_BUILD_GUIDE.md
QUICK_START_USB.md
QUICK_START_EMEET.md
USB_CAMERA_SETUP.md
EMEET_PIXY_SETUP.md
FEATURE_COMPARISON.md
SERVER_ACCESS.md
```

**Pattern**: All appear to be status/setup documents from ~3 weeks ago.

**Issue**: 
- Unclear if these are still current
- No way to track which are superseded
- Mix of setup guides and status reports

**Remediation**:
1. Audit each file (is it still relevant?)
2. Move current guides to `Jarvis-Visual-Engine/docs/GUIDES/`
3. Move stale status reports to `Jarvis-Visual-Engine/docs/ARCHIVE/` with dates
4. Create `Jarvis-Visual-Engine/README.md` index linking to current guides

---

## Root-Level Documentation Files (Not in docs/)

Per Singleton Path Enforcement in `AGENTS.md`, these should be examined:

| File | Type | Current Location | Status |
|------|------|------------------|--------|
| `README.md` | Main project README | Root (✅ Correct) | ✅ Correct location |
| `AGENTS.md` | Governance framework | Root (⚠️ Consider) | ⚠️ Should be indexed from docs/ |
| `README-TESTING.md` | Supporting guide | Root (❌ Wrong) | ❌ Should be `docs/GUIDES/` |
| `README-CODE-QUALITY.md` | Supporting guide | Root (❌ Wrong) | ❌ Should be `docs/GUIDES/` |
| `ADD-TO-DESKTOP-INSTRUCTIONS.md` | User guide | Root (❌ Wrong) | ❌ Should be `docs/GUIDES/` |
| `APPLE_MUSIC_SETUP.md` | Setup guide | Root (❌ Wrong) | ❌ Should be `docs/SETUP/` |
| `CREATIVE_APIS_SETUP.md` | Setup guide | Root (❌ Wrong) | ❌ Should be `docs/SETUP/` |
| `CODE-QUALITY-SUITE-SUMMARY.md` | Summary/Report | Root (❌ Wrong) | ❌ Should be `docs/ARCHIVE/` |
| `CODING-STANDARDS.md` | Standard | Root (❌ Wrong) | ❌ Should be `docs/STANDARDS/` |
| `create-desktop-shortcut.ps1` | Script | Root (✅ Correct) | ✅ Script in root OK |
| `COMPLETE_API_DOCUMENTATION.md` | API reference | Root (❌ Wrong) | ❌ Should be `docs/REFERENCE/` |
| `COMPLETE_FEATURE_LIST.md` | Feature reference | Root (❌ Wrong) | ❌ Should be `docs/REFERENCE/` |

---

## Recommendations for Documentation Reorganization

### Phase 0 — Immediate Cleanup (1–2 days)

**Step 1: Archive Stale Documents**
```bash
mkdir -p /workspace/docs/archive
mv /workspace/VOICE-ENGINE-*.md /workspace/docs/archive/VOICE-ENGINE-2026-03-21/
mv /workspace/SENSOR-HEALTH-*.md /workspace/docs/archive/SENSOR-HEALTH-2026-03-21/
mv /workspace/OPTIMIZATION_GUIDE.md /workspace/docs/archive/
```

**Step 2: Organize Guides**
```bash
mkdir -p /workspace/docs/guides
mv /workspace/README-TESTING.md /workspace/docs/guides/
mv /workspace/README-CODE-QUALITY.md /workspace/docs/guides/
mv /workspace/TROUBLESHOOTING.md /workspace/docs/guides/
mv /workspace/ADD-TO-DESKTOP-INSTRUCTIONS.md /workspace/docs/guides/
```

**Step 3: Organize Setup Guides**
```bash
mkdir -p /workspace/docs/setup
mv /workspace/APPLE_MUSIC_SETUP.md /workspace/docs/setup/
mv /workspace/CREATIVE_APIS_SETUP.md /workspace/docs/setup/
```

**Step 4: Create Standards Directory**
```bash
mkdir -p /workspace/docs/standards
mv /workspace/CODING-STANDARDS.md /workspace/docs/standards/
```

### Phase 1 — Structure Establishment (1 week)

**Within `docs/**`**:
- [ ] `docs/ARCHITECTURE/` — ADRs and architecture decisions
- [ ] `docs/STANDARDS/` — All governance standards
- [ ] `docs/GUIDES/` — User and developer guides
- [ ] `docs/SETUP/` — Setup and installation guides
- [ ] `docs/REFERENCE/` — API reference and feature lists
- [ ] `docs/ARCHIVE/` — Historical and stale documents with date suffixes

**Link all from**:
- [ ] Root `README.md` — Updated to link to guides and standards
- [ ] `AGENTS.md` — Updated to reference docs/** locations
- [ ] New `docs/INDEX.md` — Central index of all documentation

### Phase 2 — Validation and Automation (2 weeks)

- [ ] Create `.gitignore` rules for archived docs
- [ ] Add CI check to ensure no new docs created in root (except README.md, AGENTS.md, .gitignore entry)
- [ ] Add check to ensure governance standards exist in docs/**
- [ ] Create docs structure validator

---

## Success Criteria

✅ Documentation reorganization is **COMPLETE** when:

1. **No stale status reports in root** — all moved to `docs/archive/`
2. **No guides in root** — all moved to `docs/guides/` or `docs/setup/`
3. **No orphaned governance docs** — all 12+ standards in `docs/standards/`
4. **Singleton path enforcement active** — only `README.md`, `AGENTS.md`, config, and scripts in root
5. **All governance docs linked** — `AGENTS.md` references all docs/** locations
6. **Index created** — `docs/INDEX.md` provides central navigation
7. **CI validation added** — prevents future root-level misplacement

---

## Related Documents

- `docs/DOCUMENTATION-INTEGRITY-REPORT.md` — Comprehensive integrity check
- `docs/DOCUMENTATION-STRATEGY.md` — Strategic vision
- `docs/IMPLEMENTATION-PLAN-DOCUMENTATION.md` — Phased roadmap
- `/workspace/AGENTS.md` — Governance framework with Singleton Path Enforcement rules

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Status** | ANALYSIS-ONLY (non-blocking recommendations) |
| **Generated** | 2026-03-22 02:02 UTC |
| **Role** | Docs Guardian |
| **Scope** | All .md files in repository root and subdirectories |
| **Severity** | MEDIUM — Organization/maintenance issue |
| **Next Review** | After Phase 0 cleanup (2026-03-24) |
| **Audience** | Engineering team, Planning & PA Agent |

