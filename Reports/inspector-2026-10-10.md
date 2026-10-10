# TheInspector — System Health Audit Report

**Grade: D** &nbsp;|&nbsp; Audit: `run-20261010-082137` &nbsp;|&nbsp; Date: 2026-10-10  
**Branch:** `audit/inspector-2026-10-10-bb0d3a` &nbsp;|&nbsp; Mode: Static-only (services offline)  
**Specialists run:** quality-oracle, dependency-auditor  
**Specialists skipped:** performance-profiler, chaos-monkey (require live services)

---

## 🚨 Security Escalation — TheGuardians Required

Three findings are **escalated to TheGuardians** and must be reviewed before next release:

| Finding | Severity | CVE | Summary |
|---------|----------|-----|---------|
| DEP-001 | P1 · CVSS 9.8 | GHSA-5xrq-8626-4rwp | Vitest UI Server RCE — arbitrary file read/execution |
| DEP-007 | P2 · CVSS 7.5–9.0 | GHSA-m9gg-hp2v-232j | gRPC certificate validation bypass in platform/orchestrator |
| DEP-009 | P3 | GHSA-2j2x-hqr9-3h42 | React Router open redirect via protocol-relative URL |

> No PR/repo context available at audit time.  
> To trigger TheGuardians: read `Teams/TheGuardians/team-leader.md` and follow it. Target an ephemeral isolated environment (required).  
> All non-security findings → TheFixer backlog (see [bug-backlog-2026-10-10.json](Teams/TheInspector/findings/bug-backlog-2026-10-10.json)).

---

## Section 1 — Header

| Item | Value |
|------|-------|
| **Overall Grade** | **D** (5 P1 findings, 0% canonical spec coverage) |
| **Audit Date** | 2026-10-10 |
| **Branch** | `audit/inspector-2026-10-10-bb0d3a` |
| **Scope** | Static — full codebase (services offline) |
| **First Audit** | Yes — no prior baseline |

**Grade badge: D** (orange)  
Grade thresholds from `inspector.config.yml`:
- A: 0 P1, ≤3 P2, ≥80% spec coverage
- B: 0 P1, ≤8 P2, ≥60% spec coverage
- C: ≤2 P1, ≤15 P2, ≥40% spec coverage
- **D: 3+ P1 findings → current (5 P1 findings)**

---

## Section 2 — Scorecards

| Metric | Value |
|--------|-------|
| P1 Findings | **5** (3 from quality-oracle + 2 from dependency-auditor) |
| P2 Findings | **10** (2 from quality-oracle + 8 from dependency-auditor) |
| P3 Findings | **8** |
| P4 / Info | **2** |
| Total | **25** |
| Canonical Spec Coverage | **0%** (0/95 FRs traced) |
| Plans/ Spec Coverage | **100%** (13/13 FRs traced) |
| Escalations → TheGuardians | **3** |
| Routed → TheFixer | **4** (QO-002, QO-003 + DEP-006 upgrade, vite upgrade) |
| FIXED since prior | **N/A** (first audit) |

---

## Section 3 — Executive Summary

Five items an operator needs to act on before next release:

1. **⚠️ Vitest RCE (CVSS 9.8) — upgrade today.** The frontend test runner (`vitest@2.0.5`) can expose arbitrary files and execute code when its UI server is reachable. One command closes two CVEs: `cd Source/Frontend && npm install vitest@^5.0.3`. TheGuardians must confirm the dev environment is not externally reachable.

2. **🔒 gRPC certificate bypass — patch platform/orchestrator.** The orchestrator's `@grpc/grpc-js` can silently accept unauthorized TLS certificates. A malicious gRPC peer can impersonate the orchestrator. Upgrade to `>=1.14.4` immediately.

3. **📋 Canonical specs are stale — zero of 85 FRs trace to code.** A domain pivot occurred (platform → workflow engine) but `Specifications/dev-workflow-platform.md` was never retired. The traceability enforcer only covers 13 FRs in Plans/ and reports false PASSes. Until specs are canonicalized, CI compliance checks are meaningless.

4. **🔴 5 tests fail on every CI run.** `GET /api/search` is missing its route handler. The test file explicitly documents this. Implement the route or mark tests `todo()`. Ignoring permanent red CI normalizes failure.

5. **🛠️ Vite + jest major upgrades needed this week.** 8 high-severity CVEs across the build toolchain (vite, jest, browserslist, ws) are resolved by two commands: `npm install vite@^6.5.0` and `npm install jest@^30.5.2`.

---

## Section 4 — Scope & Environment

| Item | Detail |
|------|--------|
| Audit Mode | Static-only (services offline) |
| Source scanned | `Source/`, `platform/orchestrator`, `Specifications/`, `Plans/`, `tools/` |
| Specs audited | `Specifications/dev-workflow-platform.md` (~85 FRs), `Specifications/tiered-merge-pipeline.md` (10 FRs), `Plans/self-judging-workflow/requirements.md` (13 FRs) |
| Dependencies scanned | 7 npm workspaces · ~23 direct · ~450 transitive |
| Backend | `http://localhost:3001` — **offline** |
| Frontend | `http://localhost:5173` — **offline** |
| Skipped specialists | performance-profiler, chaos-monkey (require live services) |
| Caveats | No live latency data. No dynamic fault injection. CVE status based on package manifest versions; actual runtime exposure may vary. |

---

## Section 5 — Trend

> **First audit — no baseline.** All 25 findings are NEW. A prior audit report is required to compute FIXED / STILL OPEN / REGRESSED deltas. The next run will compare against this report.

---

## Section 6 — Specialist Reports

| Specialist | Mode | Verdict | P1 | P2 | P3 | P4 | Notes |
|------------|------|---------|----|----|----|----|-------|
| quality-oracle | Static | **FAIL — D** | 3 | 2 | 2 | — | 0% canonical coverage; stale spec; false-positive enforcer; failing CI tests |
| dependency-auditor | Static | **FAIL — F** | 2 | 6 | 6 | 2 | CVSS 9.8 RCE; gRPC cert bypass; 7 pkgs outdated; license ✅ |
| *performance-profiler* | *Skipped* | *N/A* | — | — | — | — | *Services offline* |
| *chaos-monkey* | *Skipped* | *N/A* | — | — | — | — | *Requires all services online* |

---

## Section 7 — Re-Verification Summary

| Status | Count | Detail |
|--------|-------|--------|
| **NEW** | 25 | All findings — first audit, no prior baseline |
| FIXED | 0 | No prior audit |
| STILL OPEN | 0 | No prior audit |
| REGRESSED | 0 | No prior audit |

---

## Section 8 — Cross-Reference Map

Root causes that span multiple findings — fix once, close many:

### Root Cause A: Vitest / Vite / Build Toolchain Not Upgraded
**Findings:** DEP-001, DEP-002, DEP-003, DEP-004, DEP-005, DEP-008, DEP-011, DEP-012 (8 findings)  
**Single fix:** `cd Source/Frontend && npm install vitest@^5.0.3 vite@^6.5.0`  
Vitest upgrade resolves DEP-001/002. Vite upgrade resolves DEP-003/012 and transitively fixes browserslist (DEP-004/005), ws (DEP-008), and baseline-browser-mapping (DEP-011).

### Root Cause B: Canonical Specifications/ Not Canonicalized + Enforcer Blind Spot
**Findings:** QO-001, QO-002, QO-004, QO-007 (4 findings)  
**Fix path:** (1) Archive/status-mark `dev-workflow-platform.md` (closes QO-001). (2) Update traceability enforcer to scan `Specifications/*.md` (closes QO-002). (3) Create `Plans/dependency-feature/requirements.md` (closes QO-004). (4) Add PLATFORM/PLANNED marker to tiered-merge spec (closes QO-007). All four are documentation changes — no Source/ edits required.

### Root Cause C: Test Infrastructure Needs Both Route Fix + jest Upgrade
**Findings:** QO-003, DEP-006  
**Fix:** Implement `Source/Backend/src/routes/search.ts` OR convert to `test.todo()` (closes QO-003). `npm install jest@^30.5.2` in Source/Backend (closes DEP-006). Together these restore CI to a clean green baseline.

---

## Section 9 — P1 Findings

### QO-001 · P1 · Spec Drift → TheFixer / requirements-reviewer
**Title:** Canonical Platform Spec (~85 FRs) Entirely Unimplemented — Domain Pivot Not Retired  
**File:** `Specifications/dev-workflow-platform.md`  
**Detail:** `dev-workflow-platform.md` defines a SQLite-backed platform with 85+ FRs. The actual implementation is a completely different domain: an in-memory workflow engine. Zero of the 85 canonical spec FRs have a `Verifies:` reference in `Source/`. A domain pivot occurred but the stale spec was never retired.  
**Exploit scenario:** Agents following the canonical spec build the wrong product. CI compliance gates that eventually check Specifications/ will always fail.  
**Recommendation:** Determine which spec is canonical. Move `dev-workflow-platform.md` to `docs/archive/` if superseded, or add `## Status: PLANNED — Not Yet Implemented`. Update traceability enforcer to distinguish active vs. roadmap specs.

---

### QO-002 · P1 · Spec Drift → TheFixer *(cross-refs QO-001, QO-004, QO-007)*
**Title:** Traceability Enforcer Blind to Specifications/ — False-Positive PASSED Signal  
**File:** `tools/traceability-enforcer.py`  
**Detail:** Enforcer auto-selects `Plans/self-judging-workflow/requirements.md` (13 FRs) and ignores 95+ FRs in `Specifications/`. CI reports `TRACEABILITY PASSED` while 100% of canonical spec FRs go unchecked.  
**Exploit scenario:** Developer adds a feature contradicting Specifications/. CI enforcer passes. Bug ships.  
**Recommendation:** Add `--specs-dir Specifications/` mode or update auto-detect logic to scan all `Specifications/*.md` for requirement IDs.

---

### QO-003 · P1 · Implementation Gap → TheFixer
**Title:** GET /api/search Not Wired — 5 Tests Intentionally Failing in CI  
**File:** `Source/Backend/tests/routes/search.test.ts:1`  
**Detail:** Test file explicitly documents the route is not in `app.ts`. Five test cases hit a 404. Running `npm test` in `Source/Backend/` produces 5 failures. Violates the zero-new-failures verification gate rule.  
**Exploit scenario:** Any CI gate running `npm test` fails. If CI is gated, every deployment is blocked. If CI ignores it, real regressions slip through.  
**Recommendation:** Create `Source/Backend/src/routes/search.ts`, register in `app.ts`. Alternatively convert to `test.todo()` markers while feature is deferred.

---

### DEP-001 · P1 · CVE RCE (CVSS 9.8) → **[ESCALATE → TheGuardians]**
**Title:** Vitest UI Server Arbitrary File Read/Execution  
**File:** `Source/Frontend/package.json` — `vitest@2.0.5`  
**CVE:** GHSA-5xrq-8626-4rwp · CVSS 9.8 · AV:N/AC:L/PR:N/UI:N  
**CWE:** CWE-22 (Path Traversal), CWE-862 (Missing Authorization)  
**Impact:** Remote code execution in dev environment; sensitive file exfiltration. No authentication required.  
**Exploit scenario:** Attacker sends crafted HTTP request to Vitest UI server. Server reads and executes arbitrary host files (`.env`, SSH keys, source code with embedded secrets).  
**Recommendation:** `cd Source/Frontend && npm install vitest@^5.0.3` (fixes DEP-001 and DEP-002). TheGuardians confirm dev environment is not externally reachable.

---

### DEP-002 · P1 · CVE Path Traversal (CVSS 5.9) *(cross-refs DEP-001)*
**Title:** Vitest @vitest/mocker Path Traversal  
**File:** `Source/Frontend/package.json` — `vitest@2.0.5`  
**CVE:** GHSA-82fw-gwwq-j7x9 · CVSS 5.9  
**Impact:** Redirect mock can bypass path restrictions allowing arbitrary file reads from test infrastructure.  
**Recommendation:** Resolved by DEP-001 fix: `npm install vitest@^5.0.3`.

---

## Section 10 — Risk Matrix

| Severity | Zero-precondition (no auth) | Authenticated | Privileged | Admin | Physical |
|----------|-----------------------------|---------------|------------|-------|---------|
| **P1** | DEP-001 RCE (9.8), DEP-002 | — | DEP-007 gRPC cert bypass | — | — |
| **P2** | DEP-004/005 Browserslist DoS, DEP-008 ws DoS | DEP-003 Vite FS, DEP-006 Jest ReDoS | — | — | — |
| **P3** | DEP-009 Open Redirect | DEP-010 Babel SourceMap | — | — | — |
| **P4** | DEP-015 Large dep tree | — | — | — | — |

*Note: QO-001–003 are spec/tooling failures, not exploitability-axis items.*

---

## Section 11 — Spec Coverage

| Spec Document | FRs | Verifies in Source | Coverage |
|---------------|-----|--------------------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | ✅ **100%** |
| `Specifications/dev-workflow-platform.md` | ~85 | 0 | ❌ **0%** |
| `Specifications/tiered-merge-pipeline.md` | 10 | 0 | ❌ **0%** |
| **Canonical Specifications/ total** | **~95** | **0** | ❌ **0%** |

**Top 10 uncovered canonical FRs:**
1. FR-001: Feature Request CRUD (title, description, priority, status)
2. FR-002: Bug Report CRUD (severity, reproduction steps)
3. FR-003: Development Cycle management
4. FR-004: SQLite persistence layer
5. FR-022: React frontend with feature request list view
6. FR-033: Prometheus metrics at GET /metrics
7. FR-042: Pagination on all list endpoints
8. FR-TMP-001: Risk classification for PRs
9. FR-TMP-005: Auto-merge for low-risk approved PRs
10. FR-TMP-008: E2E test generation from PR diff

> Note: Most uncovered FRs likely reflect the domain pivot, not missing implementation. See QO-001 for resolution.

---

## Section 12 — Latency Baselines

**None — services offline.** performance-profiler was not run.

Latency budget targets (from `inspector.config.yml`) for next audit:
- `GET /api/work-items`: p95 ≤ 100ms
- `GET /api/dashboard`: p95 ≤ 150ms
- Default: p95 ≤ 200ms, p99 ≤ 500ms

---

## Section 13 — P2 Findings

| ID | Category | Title | File | Route | Fix |
|----|----------|-------|------|-------|-----|
| QO-004 | Spec Drift | FR-dependency-* IDs (13 instances) have no backing spec | `Source/Backend/src/services/dependency.ts` | TheFixer | Create `Plans/dependency-feature/requirements.md` |
| QO-005 | Pattern Violation | eslint-disable without rationale (2 locations) | `DependencyPicker.tsx:82`, `useWorkItems.ts:63` | TheFixer | Add inline rationale comment |
| DEP-003 | CVE Path Traversal (7.5) | Vite Server FS Deny Bypass on Windows | `Source/Frontend/package.json` | TheFixer | `npm install vite@^6.5.0` |
| DEP-004 | CVE DoS (7.5) | Browserslist Unbounded Memory Growth | transitive via Vite | TheFixer | Resolved by `vite@^6.5.0` |
| DEP-005 | CVE DoS (7.5) | Browserslist Prototype Pollution | transitive via Vite | TheFixer | Resolved by `vite@^6.5.0` |
| DEP-006 | CVE DoS (7.5+) | Jest micromatch ReDoS Cascade | `Source/Backend/package.json` | TheFixer | `npm install jest@^30.5.2` |
| DEP-007 | CVE Auth Bypass | gRPC Cert Bypass + Server Crash | `platform/orchestrator` | **TheGuardians** | `npm install @grpc/grpc-js@^1.14.4` |
| DEP-008 | CVE DoS (7.5) | Ws WebSocket Memory Exhaustion | transitive via Vite | TheFixer | Resolved by `vite@^6.5.0` |

---

## Section 14 — Fixed Findings

**None.** First audit — no prior baseline. Fixed items will appear here in subsequent audit runs.

---

## Section 15 — Recommendations

### 🛑 Block Deployment
- **[DEP-001/002]** Upgrade vitest: `cd Source/Frontend && npm install vitest@^5.0.3`. CVSS 9.8 RCE cannot ship.
- **[DEP-007]** Patch platform/orchestrator gRPC: `npm install @grpc/grpc-js@^1.14.4`. Certificate bypass in the orchestrator is a platform integrity risk.
- **[QO-003]** Fix or todo() the 5 failing search tests. Broken CI gates normalized = missed regressions.

### 🚀 This Sprint
- **[DEP-003/004/005/008/011/012]** `cd Source/Frontend && npm install vite@^6.5.0` — closes 6 CVEs transitively.
- **[DEP-006]** `cd Source/Backend && npm install jest@^30.5.2` — stops micromatch cascade.
- **[DEP-009]** `cd Source/Frontend && npm install react-router-dom@^7.0.0` — open redirect.
- **[QO-001]** Archive stale spec or add `## Status: PLANNED` header. Requirements-reviewer sign-off needed.
- **[QO-002]** Update traceability enforcer to scan `Specifications/`.

### 📅 Next Sprint
- **[QO-004]** Create `Plans/dependency-feature/requirements.md` for all FR-dependency-* IDs.
- **[QO-005]** Add rationale comments to two `eslint-disable` suppressions.
- **[DEP-010]** `npm install @babel/core@^7.30.0` across workspaces.
- **[DEP-013/014]** Major version upgrades: express@5, pino@10, react@19, react-dom@19.
- Schedule performance-profiler + chaos-monkey run with live services.

### 📋 Backlog
- **[QO-006]** Add suppression comment to `Source/Frontend/src/api/client.ts:26`.
- **[QO-007]** Add PLATFORM/PLANNED marker to tiered-merge-pipeline spec.
- **[DEP-015]** Consider jest→vitest migration (lighter footprint, active maintenance).
- Add `npm audit` to CI security gates.

---

## Section 16 — P3/P4 Summary

| ID | Sev | Category | Title | Fix |
|----|-----|----------|-------|-----|
| QO-006 | P3 | Pattern Violation | Swallowed JSON parse error missing suppression comment | Add inline comment to `client.ts:26` |
| QO-007 | P3 | Spec Drift | FR-TMP-001–010 have zero source Verifies | Add PLATFORM status marker to spec |
| DEP-009 | P3 | CVE Open Redirect | React Router open redirect via `//protocol-relative` URL | `npm install react-router-dom@^7.0.0` |
| DEP-010 | P3 | CVE Info Disclosure | @babel/core arbitrary file read via sourcemap (CVSS 3.2) | `npm install @babel/core@^7.30.0` |
| DEP-011 | P3 | CVE DoS | baseline-browser-mapping process termination | Resolved by `vite@^6.5.0` |
| DEP-012 | P3 | CVE Path Traversal | Vite NTLMv2 hash disclosure on Windows | Resolved by `vite@^6.5.0` |
| DEP-013 | P3 | Outdated | Backend: express (1 major), pino (2 major), uuid (5 major) behind | `npm install express@latest pino@latest uuid@latest` |
| DEP-014 | P3 | Outdated | Frontend: react/react-dom/react-router-dom 1 major behind | `npm install react@19 react-dom@19 react-router-dom@7` |
| DEP-015 | P4 | Supply Chain | Large transitive dependency tree (~450 deps) | Consider jest→vitest migration |
| DEP-016 | P4 | Supply Chain | Post-install scripts | ✅ PASS — no scripts detected |

---

## Generated Artifacts

| Artifact | Path |
|----------|------|
| HTML report (full 16-section) | `Teams/TheInspector/findings/audit-2026-10-10-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-10-10.json` |
| Dependency audit detail | `Teams/TheInspector/findings/audit-2026-10-10-critical.md` |
| Dependency summary JSON | `Teams/TheInspector/findings/audit-2026-10-10-summary.json` |

---

## JSON Bug Backlog

```json
{
  "meta": {
    "audit_id": "run-20261010-082137",
    "audit_date": "2026-10-10",
    "grade": "D",
    "p1_total": 5,
    "p2_total": 10,
    "p3_total": 8,
    "p4_total": 2,
    "total_findings": 25,
    "first_audit": true,
    "spec_coverage_pct": 0
  },
  "escalations": [
    {
      "id": "DEP-001", "route_to": "TheGuardians",
      "title": "Vitest UI Server RCE (CVSS 9.8)",
      "cve": "GHSA-5xrq-8626-4rwp",
      "fix": "cd Source/Frontend && npm install vitest@^5.0.3"
    },
    {
      "id": "DEP-007", "route_to": "TheGuardians",
      "title": "gRPC Certificate Validation Bypass (platform/orchestrator)",
      "cves": ["GHSA-5375-pq7m-f5r2", "GHSA-99f4-grh7-6pcq", "GHSA-m9gg-hp2v-232j"],
      "fix": "cd platform/orchestrator && npm install @grpc/grpc-js@^1.14.4"
    },
    {
      "id": "DEP-009", "route_to": "TheGuardians",
      "title": "React Router Open Redirect",
      "cve": "GHSA-2j2x-hqr9-3h42",
      "fix": "cd Source/Frontend && npm install react-router-dom@^7.0.0"
    }
  ],
  "thefixer_backlog": [
    { "id": "QO-001", "sev": "P1", "title": "Retire stale dev-workflow-platform.md spec" },
    { "id": "QO-002", "sev": "P1", "title": "Update traceability enforcer to scan Specifications/" },
    { "id": "QO-003", "sev": "P1", "title": "Implement GET /api/search or convert tests to todo()" },
    { "id": "DEP-002", "sev": "P1", "title": "Vitest mocker path traversal (fixed by vitest@^5.0.3)" },
    { "id": "QO-004", "sev": "P2", "title": "Create Plans/dependency-feature/requirements.md" },
    { "id": "QO-005", "sev": "P2", "title": "Add rationale to eslint-disable suppressions" },
    { "id": "DEP-003", "sev": "P2", "title": "Upgrade vite to ^6.5.0 (closes 6 CVEs)" },
    { "id": "DEP-006", "sev": "P2", "title": "Upgrade jest to ^30.5.2 (micromatch cascade)" },
    { "id": "QO-006", "sev": "P3", "title": "Add suppression comment to api/client.ts:26" },
    { "id": "QO-007", "sev": "P3", "title": "Add PLATFORM status marker to tiered-merge spec" },
    { "id": "DEP-010", "sev": "P3", "title": "Upgrade @babel/core to ^7.30.0" },
    { "id": "DEP-013", "sev": "P3", "title": "Upgrade Backend: express, pino, uuid" },
    { "id": "DEP-014", "sev": "P3", "title": "Upgrade Frontend: react@19, react-router-dom@7" }
  ]
}
```

---

*Generated by TheInspector team-leader · `run-20261010-082137` · 2026-10-10*
