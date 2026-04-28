# TheInspector Health Report — 2026-04-28

**Overall Grade: D** &nbsp;|&nbsp; Audit ID: `run-20260428-054452` &nbsp;|&nbsp; Branch: `audit/inspector-2026-04-28-ff2edc`

> **Specialists run:** quality-oracle (static), dependency-auditor (static)
> **Skipped:** performance-profiler, chaos-monkey — both services were offline during the audit

---

## ⚠ Security Escalation → TheGuardians

**2 critical CVEs (CVSS 9.8) require a TheGuardians review before next release:**

| ID | Package | Vulnerability | Projects |
|----|---------|---------------|---------|
| DEP-001 | `handlebars@<4.7.9` | JavaScript Injection via AST Type Confusion | Source/Backend, platform/orchestrator, portal/Backend |
| DEP-002 | `protobufjs@<7.5.5` | Arbitrary Code Execution via .proto parsing | platform/orchestrator, portal/Backend |

Both are transitive dependencies. Immediate fix: `npm update` in the affected projects (see §9 of HTML report). TheGuardians must confirm whether user-controlled input can reach these code paths.

---

## Scorecards

| Metric | Value |
|--------|-------|
| **P1 Critical** | 3 (2 security escalations + 1 code defect) |
| **P2 High** | 7 |
| **P3 Moderate** | 10 |
| **P4 Low** | 1 |
| **Total Findings** | 21 (all NEW — first audit) |
| **CVEs found** | 17 across 6 projects |
| **Gated spec coverage** | 12% (13/108+ requirements) |
| **Estimated total coverage** | ~55% |
| **Tests failing in CI** | 5 (search route not wired) |
| **License compliance** | ✅ All permissive (MIT, Apache-2.0) |

---

## Executive Summary — Top 5 Findings

1. **CI is red right now (QO-001).** `GET /api/search` is not wired in `app.ts` → 5 tests fail on every CI run. The `DependencyPicker` typeahead is broken for users. Fix is ~10 lines. → **TheFixer, block deployment.**

2. **Two CVSS 9.8 vulnerabilities in transitive dependencies (DEP-001, DEP-002).** Handlebars.js JavaScript injection and protobufjs arbitrary code execution affect the orchestrator and portal backend. → **TheGuardians before next release.**

3. **17 known CVEs across 6 projects (DEP-003..DEP-012).** Beyond the critical pair: ReDoS in path-to-regexp and picomatch, path traversal in Vite, XSS in PostCSS, process-hang in brace-expansion. All fixable with `npm update`. → **TheFixer this sprint.**

4. **Traceability gate checks only 12% of spec requirements (QO-002).** The enforcer scans `Plans/` only — blind to `Specifications/dev-workflow-platform.md` (~85 FRs) and `Specifications/tiered-merge-pipeline.md` (10 FRs). CI reports "TRACEABILITY PASSED" while 95+ requirements have no safety net. → **TheFixer next sprint.**

5. **Dependency-linking feature is partially shipped (QO-004, QO-005, QO-006).** Three portal items not delivered: shared types missing `blocked_by` field (forcing `as any` casts), portal seed never created, and DependencySection/BlockedBadge tests absent. → **TheFixer this sprint.**

---

## Grading

| Grade | Criteria | Result |
|-------|----------|--------|
| A | max_p1=0, max_p2≤3, coverage≥80% | ❌ 3 P1s, 12% coverage |
| B | max_p1=0, max_p2≤8, coverage≥60% | ❌ 3 P1s |
| C | max_p1≤2, max_p2≤15, coverage≥40% | ❌ 3 P1s (exceeds max of 2) |
| **D** | max_p1=unlimited | ✅ **Assigned** |

---

## P1 Findings

### QO-001 — `GET /api/search` Not Wired (5 CI failures)
- **Severity:** P1 · **Route to:** TheFixer
- **File:** `Source/Backend/src/app.ts` (missing) + `Source/Backend/tests/routes/search.test.ts`
- **Spec:** `FR-dependency-search`
- **Fix:** Add `app.get('/api/search', ...)` mount before `errorHandler`. Filter `store.getAllItems()` by `title`/`description` matching `req.query.q`.

### DEP-001 — Handlebars.js CVSS 9.8 `[ESCALATE → TheGuardians]`
- **Severity:** P1 · **Route to:** TheGuardians
- **CVE:** GHSA-2w6w-674q-4c4q · **Package:** `handlebars@<4.7.9` (transitive)
- **Affected:** Source/Backend, platform/orchestrator, portal/Backend
- **Fix:** `npm update handlebars` in each affected project

### DEP-002 — protobufjs CVSS 9.8 `[ESCALATE → TheGuardians]`
- **Severity:** P1 · **Route to:** TheGuardians
- **CVE:** GHSA-xq3m-2v4x-88gg · **Package:** `protobufjs@<7.5.5` (transitive)
- **Affected:** platform/orchestrator, portal/Backend
- **Fix:** `npm update protobufjs` in each affected project

---

## P2 Findings

| ID | Title | File | Route |
|----|-------|------|-------|
| QO-002 | Traceability enforcer blind to 95+ requirements in `Specifications/` | `tools/traceability-enforcer.py:49-57` | TheFixer |
| QO-003 | `dependencyCheckDuration` histogram missing from metrics | `Source/Backend/src/metrics.ts` | TheFixer |
| QO-004 | `portal/Shared/api.ts` missing `blocked_by` in Update types | `portal/Shared/api.ts:32-38,59-67` | TheFixer |
| QO-005 | Portal seed.ts not created | `portal/Backend/src/database/` | TheFixer |
| QO-006 | DependencySection + BlockedBadge have zero test coverage | `portal/Frontend/tests/` | TheFixer |
| DEP-003 | path-to-regexp ReDoS (CVSS 7.5) | platform/orchestrator, portal/Backend | TheFixer |
| DEP-004 | picomatch ReDoS (CVSS 7.5, build-time) | portal/Frontend | TheFixer |

---

## Cross-Reference Map — Maximum Remediation Leverage

| Root Cause | Findings | Single Fix |
|------------|----------|------------|
| Incomplete dependency-linking feature | QO-001, QO-004, QO-005, QO-006 | Complete the feature: wire search, add types, create seed, add tests — resolves **1 P1 + 3 P2** |
| Staleness in orchestrator/portal transitive deps | DEP-001, DEP-002, DEP-003 | `npm update` in platform/orchestrator + portal/Backend — resolves **2 P1 + 1 P2** |
| Enforcer scope gap (Plans/ not Specifications/) | QO-002, QO-003, QO-004, QO-005, QO-006 | Extend enforcer with `--spec-file`; update CLAUDE.md gates — **prevents future drift on 95+ reqs** |

---

## P3/P4 Summary

| ID | Sev | Title |
|----|-----|-------|
| QO-007 | P3 | Dual logger abstraction in Source/Backend |
| QO-008 | P3 | `eslint-disable` suppressions without explanation |
| DEP-005 | P3 | vite <5.2.0 path traversal (dev server) |
| DEP-006 | P3 | esbuild CORS bypass (dev server) |
| DEP-007 | P3 | PostCSS XSS via `</style>` |
| DEP-008 | P3 | brace-expansion process hang |
| DEP-009 | P3 | uuid missing bounds check (5 major versions behind) |
| DEP-010 | P3 | dockerode transitive uuid vuln |
| DEP-011 | P3 | @vitest/mocker transitive vite dep |
| DEP-012 | P3 | gaxios transitive uuid dep |
| QO-009 | P4 | DebugPortalPage Verifies comment not FR-XXX format |

---

## Spec Coverage

| Spec | FRs | Gate? | Coverage |
|------|-----|-------|---------|
| `workflow-engine.md` | 13 | ✅ Enforcer | **100%** |
| `dev-workflow-platform.md` | ~85 | ❌ None | ~96% (manual) |
| `tiered-merge-pipeline.md` | 10 | ❌ None | ~40% |
| **Gated total** | **13/108+** | — | **12%** |

---

## Prioritised Action List

### 🚫 Block Deployment
- [DEP-001, DEP-002] `npm update` handlebars + protobufjs — trigger TheGuardians audit *(2 hours)*
- [QO-001] Wire `GET /api/search` in `app.ts` *(30 minutes)*

### ⚡ This Sprint — TheFixer
- [DEP-003, DEP-004] Update path-to-regexp, picomatch *(20 min)*
- [DEP-005, DEP-006, DEP-007] Update vite, esbuild, postcss *(1 hour)*
- [QO-004] Add `blocked_by?` to portal Shared types *(15 min)*
- [QO-005] Create `portal/Backend/src/database/seed.ts` *(1 hour)*
- [QO-006] Add DependencySection + BlockedBadge tests *(2-3 hours)*
- [QO-003] Add `dependencyCheckDuration` histogram *(1 hour)*

### 📅 Next Sprint — TheFixer
- [QO-002] Extend traceability-enforcer to scan `Specifications/` *(4-6 hours)*
- [DEP-008, DEP-009, DEP-010] Update brace-expansion, uuid, dockerode *(2-3 hours)*
- [QO-007] Standardise logger abstraction *(2 hours)*
- [QO-008] Add explanatory comments to eslint-disable *(15 min)*

### 📋 Backlog
- Plan Express@5, Pino@10, React@19, React-Router@7 upgrades
- Re-run TheInspector with services online (latency baselines, chaos scenarios)
- [QO-009] Fix DebugPortalPage Verifies comment format

---

## Artifacts

| File | Location |
|------|----------|
| Full HTML Report | `Teams/TheInspector/findings/audit-2026-04-28-D.html` |
| Bug Backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-04-28.json` |
| Quality Oracle findings | `Teams/TheInspector/findings/audit-2026-04-28-C.md` |
| Dependency audit report | `Teams/TheInspector/findings/dependency-audit-2026-04-28.md` |
| Dependency metrics JSON | `Teams/TheInspector/findings/dependency-audit-metrics-2026-04-28.json` |

---

*Generated by TheInspector · Team Leader · Audit ID: run-20260428-054452 · 2026-04-28*
*Route: security P1s → TheGuardians · code P1s + P2s → TheFixer*
