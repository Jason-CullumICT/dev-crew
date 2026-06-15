# TheInspector — System Health Audit Report

**Date:** 2026-06-15  
**Branch:** `audit/inspector-2026-06-15-63eb9b`  
**Run ID:** `run-20260615-073757`  
**Scope:** Full codebase (static analysis — services offline)

---

## ⚠ Overall Grade: **D**

| Threshold | Requirement | Actual | Result |
|-----------|------------|--------|--------|
| Grade A | max P1=0, max P2=3, spec coverage ≥80% | P1=4, P2=9 | ✗ |
| Grade B | max P1=0, max P2=8, spec coverage ≥60% | P1=4 | ✗ |
| Grade C | max P1=2, max P2=15, spec coverage ≥40% | P1=4 (exceeds max of 2) | ✗ |
| **Grade D** | max P1=999 | P1=4 | **✓ APPLIES** |
| Grade F | Confirmed auth bypass + critical domain failure | Not confirmed | Not applicable |

**Rationale:** 4 P1 findings exceed the C-grade maximum of 2. Grade D applies. F is reserved for confirmed exploitable auth bypass or critical domain failure — not demonstrated here, though DEP-001/DEP-002 are escalated to TheGuardians for exploitability confirmation.

> ⚠ **Performance Profiler** and **Chaos Monkey** were **skipped** — backend (http://localhost:3001) and frontend (http://localhost:5173) were unreachable at audit time. Static analysis only.

---

## Finding Totals

| Severity | Quality Oracle | Dependency Auditor | **Total** |
|----------|---------------|-------------------|-----------|
| P1 Critical | 1 | 3 | **4** |
| P2 High | 4 | 5 | **9** |
| P3 Medium | 3 | 4 | **7** |
| P4 Low/Info | 2 | 1 | **3** |
| **Total** | **10** | **13** | **23** |

**First audit — all findings are NEW. No prior baseline.**

---

## 🚨 Escalations → TheGuardians (3 findings)

These findings contain injection or supply chain vectors per the escalation policy (`security_triggers`). They require security assessment before the fix SLA applies.

| ID | Title | CVSS | Trigger | Action |
|----|-------|------|---------|--------|
| **DEP-001** | Handlebars JavaScript Injection RCE | 9.8 | injection | [ESCALATE → TheGuardians] Confirm no untrusted template evaluation |
| **DEP-002** | esbuild Binary Integrity — Supply Chain RCE | 8.1 | supply chain / injection | [ESCALATE → TheGuardians] Assess CI/CD build pipeline compromise risk. **BLOCKS RELEASES** |
| **DEP-003** | vitest Cascading esbuild Vulnerabilities | 8.1 | supply chain | [ESCALATE → TheGuardians] Part of DEP-002 supply chain risk |

---

## P1 Findings

### DEP-001 · P1 · Handlebars JavaScript Injection RCE `[ESCALATE → TheGuardians]`
**File:** `Source/Backend` and `portal/Backend` (transitive dep)  
**CVSS:** 9.8 · `GHSA-2w6w-674q-4c4q`, `GHSA-3mfm-83xf-c92r`

Handlebars ≤4.7.8 fails to validate AST node types, enabling arbitrary JavaScript execution via crafted templates. Full RCE if any endpoint passes user-controlled input to `Handlebars.compile()`.

**Fix:** `npm audit fix` in Source/Backend and portal/Backend (upgrades to ≥4.7.9)

---

### DEP-002 · P1 · esbuild Binary Integrity — Supply Chain RCE `[ESCALATE → TheGuardians]` ⚠ BLOCKS RELEASES
**Files:** `portal/Backend`, `portal/Frontend`, `Source/Frontend` (via vite)  
**CVSS:** 8.1 · `GHSA-gv7w-rqvm-qjhr`

esbuild <0.28.1 downloads platform-specific binaries without integrity verification (CWE-494, CWE-426). A compromised registry or MITM during CI can inject malicious binaries into every production build.

**Fix:**
```bash
cd portal/Frontend  && npm install vite@^8.0.16
cd Source/Frontend  && npm install vite@^8.0.16
cd portal/Backend   && npm install tsx@latest
```

---

### DEP-003 · P1 · vitest Critical Vulnerabilities (cascading esbuild/vite) `[ESCALATE → TheGuardians]`
**File:** `portal/Frontend`  
**CVSS:** 8.1 (cascading)

vitest ^1.4.0 transitively pulls vulnerable vite/esbuild (same root as DEP-002).

**Fix:** `cd portal/Frontend && npm install vitest@^4.1.9`

---

### QO-001 · P1 · Traceability Enforcer Blind Spot — `portal/` Not Scanned
**File:** `tools/traceability-enforcer.py:71`

The verification gate scans only `Source/` and `E2E/`. The primary production app `portal/` (FR-001…FR-069, 50+ routes) is invisible to the enforcer. Creates: (1) **false passes** — CI gate always passes ignoring portal/ regressions; (2) **false failures** — running against dev-workflow-platform.md reports 34 phantom "MISSING" requirements.

**Fix:**
```python
# tools/traceability-enforcer.py line 71:
source_dirs = ["Source", "E2E", "portal"]
```

**Cross-refs:** QO-003, QO-006

---

## P2 Findings → TheFixer Backlog

| ID | Category | Title | File |
|----|----------|-------|------|
| QO-002 | arch-violation | Direct SQL in route handler (teamDispatches.ts) | `portal/Backend/src/routes/teamDispatches.ts:37-44,72-75` |
| QO-003 | arch-violation | inspector.config.yml missing portal/ in source.dirs | `Teams/TheInspector/inspector.config.yml:42` |
| QO-004 | spec-drift | FR-dependency-linking ID mismatch (should be FR-dependency-search) | `portal/Backend/src/routes/search.ts:1,15` |
| QO-006 | untested | 3 untraced unspecced production files (TeamsPage, RepoSelector, teamDispatches) | `portal/Frontend/…, portal/Backend/…` |
| DEP-004 | CVE (7.5) | path-to-regexp Open Redirect | `platform/orchestrator, portal/Backend` |
| DEP-005 | CVE (7.2) | gaxios SSRF + joi Validation Bypass | `portal/Backend (via OpenTelemetry)` |
| DEP-006 | CVE | Joi Input Validation Bypass | `portal/Backend (via OpenTelemetry)` |
| DEP-007 | CVE (6.1) | postcss XSS via unescaped </style> (HIGH in SPA) | `portal/Frontend, Source/Frontend` |
| DEP-008 | CVE | esbuild Path Traversal in Dev Server | `All Frontend (via vite) — covered by DEP-002 fix` |

---

## Cross-Reference Map (root causes spanning multiple specialists)

### Root 1: `portal/` excluded from all tooling
**Findings:** QO-001 (P1) + QO-003 (P2) + QO-006 (P2)  
**Single fix:** Add `portal/` to `source_dirs` in `tools/traceability-enforcer.py:71` AND to `source.dirs` in `inspector.config.yml`

### Root 2: esbuild <0.28.1 in build toolchain
**Findings:** DEP-002 (P1) + DEP-003 (P1) + DEP-008 (P2)  
**Single fix:** `npm install vite@^8.0.16` across Frontend workspaces + `vitest@^4.1.9` in portal/Frontend

### Root 3: teamDispatches feature shipped without spec or service layer
**Findings:** QO-002 (P2) + QO-006 (P2)  
**Single fix:** Create spec FR for team dispatches + extract `teamDispatchService.ts` + add traceability comments

---

## Spec Coverage

| Specification | Requirements | Traced | Coverage |
|---------------|-------------|--------|----------|
| Self-Judging Workflow (FR-WF-*) | 13 | 13 | **100%** |
| Dependency Linking (FR-dependency-*) | 16 | 13 | **81%** |
| Dev Workflow Platform (FR-001…069) | 69 | 69 | **100%** ⚠ enforcer blind spot |
| Tiered Merge Pipeline (FR-TMP-*) | 10 | 0 | **0%** (platform-layer, out-of-scope) |

**3 unimplemented dependency-linking requirements:** FR-dependency-seed, FR-dependency-api-types, FR-dependency-frontend-tests

---

## P3/P4 Summary

| ID | Sev | Title |
|----|-----|-------|
| QO-005 | P3 | Enforcer false positives from seed data IDs and FR-XXX placeholders |
| QO-007 | P3 | cycleService.ts (526 lines), featureRequestService.ts (506 lines) exceed 500-line threshold |
| QO-008 | P3 | 3 `eslint-disable react-hooks/exhaustive-deps` suppressions without explanatory comments |
| DEP-009 | P3 | body-parser & qs prototype pollution (CVSS 5.3–6.5) |
| DEP-010 | P3 | brace-expansion Zero-Step Sequence DoS (CVSS 6.5) |
| DEP-011 | P3 | react-router-dom Open Redirect in 6.26.0 (need >=6.30.4) |
| DEP-012 | P3 | 6 packages 1–5 major versions behind |
| QO-009 | P4 | FR-TMP-001…010 untraced (platform-layer, not in Source/ or portal/) |
| QO-010 | P4 | Silent OTel init failure — no warning log emitted |
| DEP-013 | P4 | prom-client 15.1.0 — satisfactory (patch only) |

---

## Remediation Timeline

| Phase | Deadline | Findings | Est. Hours |
|-------|----------|----------|-----------|
| **Phase 1: CRITICAL** | 2026-06-17 (48h) | DEP-001, DEP-002, DEP-003, QO-001 | ~5h |
| **Phase 2: HIGH** | 2026-06-22 (1 week) | DEP-004–008, QO-002, QO-003, QO-004, QO-006 | ~8h |
| **Phase 3: MEDIUM** | 2026-06-29 (2 weeks) | DEP-009–012, QO-005, QO-007, QO-008 | ~8h |
| **Backlog** | Next quarter | QO-009, QO-010, DEP-013 + policy items | ~3h |

---

## Report Files

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-06-15-D.html` | Full 16-section HTML report |
| `Teams/TheInspector/findings/bug-backlog-2026-06-15.json` | Structured JSON bug backlog |
| `Teams/TheInspector/findings/audit-2026-06-15-C.md` | Quality Oracle detailed findings |
| `Teams/TheInspector/findings/dependency-audit-20260615.md` | Dependency Auditor detailed findings |

---

## Bug Backlog JSON (summary)

```json
{
  "audit_metadata": {
    "run_id": "run-20260615-073757",
    "audit_date": "2026-06-15",
    "grade": "D",
    "specialists_run": ["quality-oracle", "dependency-auditor"],
    "specialists_skipped": ["performance-profiler", "chaos-monkey"],
    "skip_reason": "Services offline at audit time"
  },
  "totals": {
    "P1": 4,
    "P2": 9,
    "P3": 7,
    "P4": 3,
    "total_findings": 23,
    "new": 23
  },
  "escalations": [
    { "id": "DEP-001", "escalate_to": "TheGuardians", "trigger": "injection", "cvss": 9.8 },
    { "id": "DEP-002", "escalate_to": "TheGuardians", "trigger": "supply-chain", "cvss": 8.1, "note": "BLOCKS RELEASES" },
    { "id": "DEP-003", "escalate_to": "TheGuardians", "trigger": "supply-chain", "cvss": 8.1 }
  ]
}
```

Full backlog at: `Teams/TheInspector/findings/bug-backlog-2026-06-15.json`
