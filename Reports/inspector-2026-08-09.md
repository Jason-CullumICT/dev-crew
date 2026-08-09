# TheInspector — System Health Audit Report

**Audit ID:** `run-20260809-035558`  
**Date:** 2026-08-09  
**Branch:** main  
**Scope:** Full codebase (static analysis — services offline)  
**Specialists:** quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⚠️ skipped · chaos-monkey ⚠️ skipped

---

## 1 · Header

| | |
|---|---|
| **Overall Grade** | 🔴 **D** |
| **Grade Rationale** | 4 P1 findings exceed C threshold (max 2 P1s). Three P1s are critical CVEs (CVSS 9.8) escalated to TheGuardians. |
| **Audit Date** | 2026-08-09 |
| **Branch** | main |
| **Scope Mode** | Full codebase · static analysis |
| **Prior Audit** | None — first audit run |

---

## 2 · Scorecards

| Metric | quality-oracle | dependency-auditor | Total |
|--------|---------------|-------------------|-------|
| P1 findings | 1 | 3 | **4** |
| P2 findings | 4 | 4 | **8** |
| P3 findings | 3 | 4 | **7** |
| P4 findings | 2 | 2 | **4** |
| Spec coverage (source) | 93% (113/121 files) | — | **93%** |
| Spec coverage (tests) | 96% (56/58 files) | — | **96%** |
| FR-dependency-* coverage | 0% (ID mismatch) | — | **0%** |
| CVEs found | — | 99 (9 critical) | **99** |
| FIXED since last audit | N/A (first run) | N/A | **0** |
| Dynamic mode | static | static | static only |

---

## 3 · Executive Summary

Five things an operator needs to know right now:

1. **🔴 Three critical CVEs (CVSS 9.8) require immediate patching** — handlebars JavaScript injection, vitest UI file read/RCE, and protobufjs RCE are present in production and dev dependencies. Escalated to **TheGuardians** for urgent security review. Until patched, CI should run vitest with `--ui=false`.

2. **🔴 The traceability tooling is blind to the main app** — `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`, missing `portal/` entirely. Every dev-workflow-platform enforcer run reports 34 false failures. This is a one-line fix but blocks reliable compliance gating.

3. **🟠 3 dependency-linking features remain unimplemented** — `blocked_by` field missing from API types, seed data absent, and two test files don't exist. The `DependencyPicker.tsx` uses `as any` casts as a workaround. A dispatch plan already exists in `Plans/dependency-linking/requirements.md`.

4. **🟠 Route handler makes direct DB calls** — `portal/Backend/src/routes/teamDispatches.ts` bypasses the service layer entirely, violating a non-negotiable architecture rule. No spec covers this feature.

5. **🟡 8 high-severity CVEs need patching within 2–4 weeks** — brace-expansion DoS, form-data CRLF injection, React Router open redirect, and body-parser DoS are all addressable via `npm audit fix` or targeted upgrades.

---

## 4 · Scope & Environment

| Item | Detail |
|------|--------|
| **Audit scope** | Full codebase — Source/, portal/, platform/, Specifications/, tools/ |
| **Services checked** | backend (http://localhost:3001/) — **offline** · frontend (http://localhost:5173) — **offline** |
| **Dynamic testing** | Skipped — all services offline. performance-profiler and chaos-monkey ran static analysis only; no reports produced. |
| **quality-oracle mode** | Static — full spec-traceability scan |
| **dependency-auditor mode** | Static — npm audit + package manifest scan across 10 projects |
| **Packages scanned** | 10 npm manifests across Source/, platform/, portal/ |
| **Total transitive deps** | 1,801 (portal/Backend alone: 577) |
| **Specs audited** | workflow-engine.md, dev-workflow-platform.md, tiered-merge-pipeline.md |
| **Date caveats** | No dynamic load testing performed; latency baselines unavailable. Re-run with services up for full picture. |

---

## 5 · Trend

**First audit — no baseline available.**

All 23 findings are marked **NEW**. Establish this D-grade report as the baseline. Next audit will track FIXED / STILL OPEN / REGRESSED / NEW against these IDs.

| Target grade | What must be resolved |
|---|---|
| C | Fix 2 of the 4 P1s (at minimum: DEP-001 handlebars + QO-001 enforcer) |
| B | Resolve all 4 P1s and keep P2s ≤8 |
| A | 0 P1s, ≤3 P2s, ≥80% spec coverage |

---

## 6 · Specialist Reports

### quality-oracle — Static Mode
| | |
|---|---|
| **Mode** | Static |
| **Verdict** | ⚠️ Issues found |
| **Findings** | 1 P1 · 4 P2 · 3 P3 · 2 P4 |
| **Spec coverage** | FR-WF-*: 100% · FR-001…069: 100% · FR-TMP-*: 90% · FR-dependency-*: 0% (ID mismatch) |
| **Source traceability** | 93% (113/121 files carry `// Verifies:` comments) |
| **Test traceability** | 96% (56/58 test files) |
| **Grade awarded** | C (own assessment); D after dependency findings included |

### dependency-auditor — Static Mode
| | |
|---|---|
| **Mode** | Static — npm audit across 10 packages |
| **Verdict** | 🔴 Critical findings — escalation required |
| **CVEs found** | 99 total: 9 critical · 36 high · 44 moderate · 10 low |
| **P1 findings** | 3 (DEP-001, DEP-002, DEP-003) |
| **P2 findings** | 4 (DEP-004, DEP-005, DEP-006, DEP-007) |
| **Highest CVSS** | 9.8 (handlebars, vitest, protobufjs) |
| **License status** | ✅ Clean — MIT/Apache 2.0 only |
| **Supply chain** | ✅ No post-install scripts |

### performance-profiler — Not run
| | |
|---|---|
| **Mode** | N/A — services offline |
| **Verdict** | Skipped |
| **Notes** | No latency baselines established. Re-run with backend on port 3001. |

### chaos-monkey — Not run
| | |
|---|---|
| **Mode** | N/A — services offline |
| **Verdict** | Skipped |
| **Notes** | Static fault scenarios from config not evaluated. Re-run with all services up. |

---

## 7 · Re-Verification Summary

First audit — no prior findings to compare against.

| Status | Count |
|--------|-------|
| 🆕 NEW | 23 |
| ✅ FIXED | 0 |
| ⚠️ STILL OPEN | 0 |
| 🔴 REGRESSED | 0 |

---

## 8 · Cross-Reference Map

Single fixes that resolve findings across multiple specialists:

| Root Cause | Affected Findings | Single Fix | Fix Impact |
|---|---|---|---|
| `portal/` not registered in tooling configs | QO-001 (enforcer blind to portal/) · QO-008 (inspector config omits portal/) | Add `portal/` to `source_dirs` in traceability-enforcer.py line 70 **AND** to `source.dirs` in inspector.config.yml | Closes 2 findings; stops false enforcer failures; gives future audits visibility into primary app |
| Dependency-linking feature incomplete | QO-002 (ID mismatch) · QO-003 (3 unimplemented items) | Align `// Verifies:` IDs in portal/ code to canonical spec IDs, then implement the 3 missing items (api-types, seed, frontend-tests) | Closes 2 findings; brings FR-dependency-* coverage from 0% to 100% |
| teamDispatches unspecced + unserviced | QO-004 (direct DB calls) · QO-006 (unlinked implementation) | Add FR to spec → create teamDispatchService.ts → add traceability comment | Closes 2 findings; restores architecture integrity for this route |
| npm dependency hygiene (auto-patchable) | DEP-004 (brace-expansion) · DEP-005 (form-data) · DEP-007 (body-parser) | `npm audit fix` in Source/Backend | Closes 3 findings in one command |

---

## 9 · P1 Findings

### QO-001 · Traceability Enforcer Blind to `portal/` ⚠️ TheFixer

| | |
|---|---|
| **ID** | QO-001 |
| **Severity** | P1 |
| **Category** | spec-drift / tooling |
| **Specialist** | quality-oracle |
| **File** | `tools/traceability-enforcer.py:70` |
| **Status** | 🆕 NEW |

**Exploit / Failure Scenario:** Line 70 hardcodes `source_dirs = ["Source", "E2E"]`. The entire `portal/` directory — containing FR-001 through FR-095 and all FR-dependency-* implementations — is never scanned. Running `python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md` reports 34 MISSING requirements that actually exist in `portal/`. The gate is generating false P1 failures for every dev-workflow-platform plan while silently ignoring the real application for compliance purposes.

**Impact:** Every automated traceability check on dev-workflow-platform gives incorrect results. Engineers may add workarounds or ignore the gate output entirely, defeating the spec-first discipline.

**Recommendation:** Add `"portal"` to the `source_dirs` list on line 70. One-line fix. Also update `inspector.config.yml` to include portal/ under `source.dirs` and `source.test_dirs` (cross-ref: QO-008).

---

### DEP-001 · Handlebars.js JavaScript Injection [ESCALATE → TheGuardians]

| | |
|---|---|
| **ID** | DEP-001 |
| **Severity** | P1 |
| **Category** | CVE / Injection |
| **CVSS** | 9.8 (Network, Low Complexity, No Privileges) |
| **CVE** | GHSA-2w6w-674q-4c4q |
| **Specialist** | dependency-auditor |
| **File** | `Source/Backend/package-lock.json` (handlebars transitive, ≤4.7.8) |
| **Status** | 🆕 NEW · [ESCALATE → TheGuardians] |

**Exploit Scenario:** An attacker submits malformed Handlebars template data that exploits AST type confusion, achieving arbitrary JavaScript execution at build time. Multiple related CVEs also present: prototype pollution and CLI injection via the same package.

**Impact:** Build-time template injection. Could allow code execution in CI/CD pipeline if template data is attacker-controlled.

**Recommendation:** `npm audit fix` in Source/Backend or manually pin handlebars to ≥4.7.9.

---

### DEP-002 · Vitest UI Arbitrary File Read + RCE [ESCALATE → TheGuardians]

| | |
|---|---|
| **ID** | DEP-002 |
| **Severity** | P1 |
| **Category** | CVE / Information Disclosure + Code Execution |
| **CVSS** | 9.8 (Network, Low Complexity, No Authentication) |
| **CVE** | GHSA-5xrq-8626-4rwp |
| **Specialist** | dependency-auditor |
| **Files** | `Source/Frontend/package.json` (vitest ^2.0.5) · `portal/Frontend/package.json` (vitest ^1.4.0) |
| **Status** | 🆕 NEW · [ESCALATE → TheGuardians] |

**Exploit Scenario:** When the Vitest UI server is running (default in dev mode), any unauthenticated user on the network can read arbitrary project files — including secrets in `.env` files — and potentially execute code. No credentials required.

**Impact:** 🔴 HIGH — Dev and CI environments are vulnerable. Secrets in project root readable without authentication.

**Recommendation:**
- Source/Frontend: `npm install vitest@^4.1.10` (major version bump required)
- portal/Frontend: `npm install vitest@^1.6.0`
- **Immediate workaround:** Add `--ui=false` to all CI vitest invocations until upgraded.

---

### DEP-003 · protobufjs Arbitrary Code Execution [ESCALATE → TheGuardians]

| | |
|---|---|
| **ID** | DEP-003 |
| **Severity** | P1 |
| **Category** | CVE / Remote Code Execution |
| **CVSS** | 9.8 |
| **CVE** | Unknown — check npm registry directly |
| **Specialist** | dependency-auditor |
| **Files** | `platform/orchestrator/package-lock.json` · `portal/Backend/package-lock.json` |
| **Status** | 🆕 NEW · [ESCALATE → TheGuardians] |

**Exploit Scenario:** RCE vulnerability in the protobufjs transitive dependency. Affects both the production orchestrator platform and the portal backend. Exact attack vector unclear from static analysis — live investigation required.

**Impact:** 🔴 CRITICAL — Potential RCE in production orchestrator (the pipeline infrastructure itself) and the portal backend.

**Recommendation:** `npm audit fix` in platform/orchestrator and portal/Backend immediately. If no auto-fix available, investigate affected protobufjs version and pin/patch manually.

---

## 10 · Risk Matrix

|  | **Zero-precondition** | **Authenticated** | **Privileged** | **Admin** | **Physical** |
|--|----------------------|-------------------|----------------|-----------|--------------|
| **P1 · Critical** | DEP-002 (vitest RCE) · DEP-003 (protobufjs RCE) | — | DEP-001 (handlebars injection via template input) | — | — |
| **P2 · High** | DEP-006 (open redirect) · DEP-007 (body-parser DoS) | DEP-004 (brace-expansion DoS via glob) · DEP-005 (CRLF injection) | QO-004 (direct DB via route) · QO-005 (silent error swallow) | — | — |
| **P3 · Medium** | — | DEP-009 (open redirect via outdated router) | QO-002 (untraceable spec IDs) · QO-003 (3 unimplemented FRs) | — | — |
| **P4 · Low** | — | — | QO-009 (oversized services) · QO-010 (eslint-disable) | — | — |

**Exploitability scale:** Zero-precondition = any network user, no auth · Authenticated = valid credentials (any role) · Privileged = specific permissions · Admin = superuser · Physical = hardware access

---

## 11 · Spec Coverage

| Specification | FR IDs | Implemented | Coverage |
|---|---|---|---|
| `Specifications/workflow-engine.md` (FR-WF-*) | 13 | 13 | ✅ 100% |
| `Specifications/dev-workflow-platform.md` (FR-001…FR-069) | 69 | 69 | ✅ 100% |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 9 | ⚠️ 90% (FR-TMP-008 untraced) |
| `Specifications/dev-workflow-platform.md` (FR-dependency-*) | 15 | 0 | 🔴 0% (wrong ID scheme in code) |

**Source file traceability:** 113/121 files (93%) carry `// Verifies:` comments  
**Test file traceability:** 56/58 files (96%) carry `// Verifies:` comments

**Top uncovered requirements:**
1. FR-dependency-schema (ID mismatch — code uses different alias)
2. FR-dependency-service (ID mismatch)
3. FR-dependency-api-client (ID mismatch)
4. FR-dependency-blocked-badge (ID mismatch)
5. FR-dependency-api-types (`blocked_by` field missing from UpdateBugInput)
6. FR-dependency-seed (seed.ts does not exist)
7. FR-dependency-frontend-tests (DependencySection.test.tsx missing)
8. FR-TMP-008 (gh CLI in Dockerfile.worker — no `// Verifies:` comment)
9. teamDispatches route (no spec FR exists for this feature)
10. RepoSelector / TeamsPage (no spec FR exists for these components)

---

## 12 · Latency Baselines

**Not available — services were offline during this audit.**

Performance-profiler was not invoked. No p50/p95/p99 data collected. Latency budgets from config:
- `/api/work-items` target: p95 ≤ 100ms
- `/api/dashboard` target: p95 ≤ 150ms
- Default: p95 ≤ 200ms, p99 ≤ 500ms

Re-run TheInspector with backend running on `http://localhost:3001/` to establish baselines.

---

## 13 · P2 Findings

| ID | Category | Title | File | Status |
|----|----------|-------|------|--------|
| QO-002 | spec-drift | FR-dependency-* ID mismatch — 15 spec IDs untraceable | portal/Shared/types.ts | 🆕 NEW |
| QO-003 | spec-drift | 3 dependency-linking items remain unimplemented | portal/Shared/api.ts · portal/Backend/src/database/ · portal/Frontend/tests/ | 🆕 NEW |
| QO-004 | architecture-violation | Direct DB calls from teamDispatches route handler | portal/Backend/src/routes/teamDispatches.ts:7 | 🆕 NEW |
| QO-005 | architecture-violation | Silent error swallowing in RepoSelector.tsx | portal/Frontend/src/components/common/RepoSelector.tsx:19 | 🆕 NEW |
| DEP-004 | cve | brace-expansion DoS (Source/Backend transitive) | Source/Backend/package-lock.json | 🆕 NEW |
| DEP-005 | cve | form-data CRLF Injection (Source/Backend) | Source/Backend/package-lock.json | 🆕 NEW |
| DEP-006 | cve | React Router open redirect (both frontends) | Source/Frontend/package.json · portal/Frontend/package.json | 🆕 NEW |
| DEP-007 | cve | body-parser DoS — invalid limit value | Source/Backend/package-lock.json | 🆕 NEW |

---

## 14 · Fixed Findings

None — this is the first audit run. No prior baseline to compare against.

---

## 15 · Recommendations

### 🚫 Block Deployment (P1 CVEs)
| Action | Finding | Owner |
|--------|---------|-------|
| Add `--ui=false` to all CI vitest commands **immediately** | DEP-002 | TheFixer |
| `npm audit fix` in Source/Backend (handlebars) | DEP-001 | TheFixer |
| `npm audit fix` in platform/orchestrator + portal/Backend (protobufjs) | DEP-003 | TheFixer |
| Trigger TheGuardians security audit of all three CVEs | DEP-001/002/003 | TheGuardians |

### 🏃 This Sprint (P1 + High P2)
| Action | Finding | Owner |
|--------|---------|-------|
| Add `"portal"` to `source_dirs` in traceability-enforcer.py line 70 | QO-001 | TheFixer |
| Update inspector.config.yml: add portal/ to source.dirs and test_dirs | QO-008 | TheFixer |
| Upgrade vitest: Source/Frontend →`^4.1.10`; portal/Frontend → `^1.6.0` | DEP-002 | TheFixer |
| Upgrade react-router-dom to 7.x in both frontends | DEP-006/009 | TheFixer |
| Extract teamDispatches DB logic into teamDispatchService.ts | QO-004 | TheFixer |
| Replace `.catch(() => {})` in RepoSelector with structured error log | QO-005 | TheFixer |

### 📋 Next Sprint (P2 spec-drift + remaining CVEs)
| Action | Finding | Owner |
|--------|---------|-------|
| Align FR-dependency-* traceability IDs in portal/ code | QO-002 | TheFixer |
| Implement 3 open dependency-linking items (api-types, seed, tests) | QO-003 | TheFixer |
| `npm audit fix` for brace-expansion, form-data, body-parser | DEP-004/005/007 | TheFixer |
| Add FR spec for team dispatch history feature | QO-006 | TheFixer |

### 📦 Backlog (P3/P4)
| Action | Finding | Owner |
|--------|---------|-------|
| Add `// Verifies: FR-TMP-008` in Dockerfile.worker | QO-007 | TheFixer |
| Upgrade React 18 → 19, pino 8 → 10, uuid 9 → 14 | DEP-008/010/011 | TheFixer |
| Split cycleService.ts and featureRequestService.ts | QO-009 | TheFixer |
| Add explanatory comments to eslint-disable suppressions | QO-010 | TheFixer |
| Monitor portal/Backend transitive dep count (577) | DEP-TREE | TheFixer |

---

## 16 · P3/P4 Summary

| ID | Severity | Category | Title | File |
|----|---------|----------|-------|------|
| QO-006 | P3 | spec-drift | RepoSelector, TeamsPage, teamDispatches — no spec backing | portal/Frontend/src/components/common/RepoSelector.tsx + TeamsPage.tsx · portal/Backend/src/routes/teamDispatches.ts |
| QO-007 | P3 | spec-drift | FR-TMP-008 has no traceability reference | Specifications/tiered-merge-pipeline.md |
| QO-008 | P3 | architecture-violation | Inspector config omits portal/ from source dirs | Teams/TheInspector/inspector.config.yml:42 |
| DEP-008 | P3 | outdated-dependency | React 18 → 19 available | Source/Frontend/package.json · portal/Frontend/package.json |
| DEP-009 | P3 | outdated-dependency | React Router 6 → 7 (also fixes DEP-006 CVE) | Source/Frontend/package.json · portal/Frontend/package.json |
| DEP-010 | P3 | outdated-dependency | pino 8 → 10 in Source/Backend (2 majors behind) | Source/Backend/package.json |
| DEP-011 | P3 | outdated-dependency | uuid 9 → 14 in Source/Backend (5 majors behind) | Source/Backend/package.json |
| QO-009 | P4 | pattern-violation | cycleService.ts (526 ln) + featureRequestService.ts (506 ln) exceed 500-line threshold | portal/Backend/src/services/ |
| QO-010 | P4 | pattern-violation | eslint-disable comments without explanation (2 occurrences) | portal/Frontend/src/hooks/useApi.ts:35 · portal/Backend/src/middleware/errorHandler.ts:21 |
| DEP-TREE | P4 | dependency-hygiene | portal/Backend has 577 transitive dependencies | portal/Backend/package-lock.json |
| DEP-LICENSE | P4 | license-compliance | ✅ License audit clean — no GPL/AGPL (informational) | all packages |

---

## Appendix — JSON Bug Backlog

Full machine-readable backlog saved to:  
`Teams/TheInspector/findings/bug-backlog-2026-08-09.json`

Escalations array (TheGuardians): `DEP-001`, `DEP-002`, `DEP-003`  
TheFixer backlog: all remaining findings

```json
{
  "audit_id": "run-20260809-035558",
  "audit_date": "2026-08-09",
  "grade": "D",
  "summary": {
    "p1_total": 4,
    "p2_total": 8,
    "p3_total": 7,
    "p4_total": 4,
    "new_total": 23,
    "fixed_total": 0
  },
  "escalations": [
    { "id": "DEP-001", "team": "TheGuardians", "title": "Handlebars.js JavaScript Injection (CVSS 9.8)", "cvss": 9.8 },
    { "id": "DEP-002", "team": "TheGuardians", "title": "Vitest UI Arbitrary File Read + RCE (CVSS 9.8)", "cvss": 9.8 },
    { "id": "DEP-003", "team": "TheGuardians", "title": "protobufjs Arbitrary Code Execution (CVSS 9.8)", "cvss": 9.8 }
  ],
  "p1_thefixer": [
    { "id": "QO-001", "title": "Traceability enforcer ignores portal/ — one-line fix in tools/traceability-enforcer.py:70" }
  ],
  "p2_thefixer": [
    { "id": "QO-002", "title": "FR-dependency-* ID mismatch — 15 spec IDs untraceable" },
    { "id": "QO-003", "title": "3 dependency-linking items unimplemented (api-types, seed, frontend-tests)" },
    { "id": "QO-004", "title": "Direct DB calls from teamDispatches route handler" },
    { "id": "QO-005", "title": "Silent error swallowing in RepoSelector.tsx" },
    { "id": "DEP-004", "title": "brace-expansion DoS (Source/Backend)" },
    { "id": "DEP-005", "title": "form-data CRLF Injection (Source/Backend)" },
    { "id": "DEP-006", "title": "React Router open redirect (both frontends)" },
    { "id": "DEP-007", "title": "body-parser DoS — invalid limit (Source/Backend)" }
  ]
}
```

---

_Report generated by TheInspector team-leader · Audit ID `run-20260809-035558` · 2026-08-09_
