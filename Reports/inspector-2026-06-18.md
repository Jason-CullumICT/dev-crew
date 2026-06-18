# TheInspector — System Health Audit Report

**Date:** 2026-06-18 | **Grade: D** | **Audit ID:** run-20260618-070843
**Scope:** Full codebase, static mode (services offline)
**Specialists:** quality-oracle · dependency-auditor *(performance-profiler, chaos-monkey: SKIP — services offline)*

> **HTML report:** `Teams/TheInspector/findings/audit-2026-06-18-D.html`
> **Bug backlog:** `Teams/TheInspector/findings/bug-backlog-2026-06-18.json`

---

## 1. Header

| Field | Value |
|-------|-------|
| **Grade** | 🟠 **D** — 5 P1 findings (3 exploitable CVEs + 2 process violations) exceed C threshold (max_p1: 2) |
| **Branch** | main |
| **Date** | 2026-06-18 |
| **Audit ID** | run-20260618-070843 |
| **Scope** | Full codebase · Static analysis only (backend + frontend services offline) |
| **Specialists run** | quality-oracle (static), dependency-auditor (static) |
| **Specialists skipped** | performance-profiler (backend offline), chaos-monkey (services offline) |

---

## 2. Scorecards

| Specialist | P1 | P2 | P3 | P4 | Coverage | Tests | Grade |
|------------|----|----|----|----|----------|-------|-------|
| quality-oracle | 2 | 3 | 2 | 1 | 93% (Source/ scoped) | 5 failing | **B** |
| dependency-auditor | 3 | 8 | 35 | 3 | N/A | N/A | **D** |
| performance-profiler | — | — | — | — | — | — | **SKIP** |
| chaos-monkey | — | — | — | — | — | — | **SKIP** |
| **COMBINED** | **5** | **11** | **37** | **4** | — | **5 failing** | **D** |

**Derived metrics:** 0 FIXED (first audit · no prior baseline) · 57 total findings · 49 CVEs across 1,069 transitive dependencies

---

## 3. Executive Summary

Five findings demand immediate operator attention:

1. **🔴 3 critical CVEs block deployment** — `protobufjs` (CVSS 9.8 RCE in orchestrator), `vitest` (CVSS 9.8 file read/RCE in test tooling), `@opentelemetry` (CVSS 7.5 metrics endpoint DoS). Patch within 24 hours before any production deployment. **[ESCALATE → TheGuardians]**

2. **🔴 Dependency search is broken at runtime** — `GET /api/search` endpoint not registered in `app.ts`. `DependencyPicker` component calls `/search?q=` and gets 404. 5 backend tests actively failing with documented explanation that the route is absent. Feature unusable.

3. **🔴 Route handlers bypass service layer** — `workItems.ts`, `intake.ts`, `workflow.ts` all import `workItemStore` directly, violating the CLAUDE.md architecture rule "No direct DB calls from route handlers." Service files exist for complex operations but basic CRUD is unguarded.

4. **🟠 Traceability gate is gameable** — `tools/traceability-enforcer.py` hardcodes `source_dirs = ["Source", "E2E"]`. The entire `portal/` production app (76 FRs) is invisible. A developer can strip all `// Verifies:` comments from portal/ and the CI gate still reports PASSED.

5. **🟠 8 additional HIGH CVEs require this-week patching** — path traversal (vite), header injection (form-data), server crashes (gRPC × 2), WebSocket DoS, ReDoS vectors (path-to-regexp, picomatch), open redirect (react-router). Multiple modules affected.

---

## 4. Scope & Environment

| Item | Value |
|------|-------|
| **Audit mode** | Full codebase — all source directories |
| **Source scanned** | `Source/` (Backend + Frontend + E2E), `portal/` (Backend + Frontend), `platform/orchestrator` |
| **Specs scanned** | `Specifications/` (3 documents), `Plans/` (dependency-linking, self-judging-workflow requirements) |
| **Package manifests** | 6 `package-lock.json` files · 1,069 total transitive dependencies |
| **Dynamic testing** | NOT performed — backend (`:3001`) and frontend (`:5173`) offline |
| **Services** | backend: offline · frontend: offline |
| **quality-oracle mode** | Static — spec drift, traceability, architecture rules, test quality |
| **dependency-auditor mode** | Static — `npm audit` across all modules, CVE database lookup |
| **performance-profiler** | SKIPPED (requires backend `:3001` health check) |
| **chaos-monkey** | SKIPPED (requires all services healthy) |
| **Data caveats** | In-memory store — no persistent data layer; no DB integrity checks possible |
| **Test data size** | 169 backend tests (5 failing) · 135 frontend tests (all pass) |

---

## 5. Trend

**First full inspector audit — no prior baseline for comparison.**

All findings are classified **NEW**. No FIXED / REGRESSED / STILL OPEN status available.

> *Next audit recommended after P1 patches are applied (emergency re-audit in 24–48 hours), then routine monthly audit on 2026-07-18.*

---

## 6. Specialist Reports

### quality-oracle
| Field | Value |
|-------|-------|
| Mode | Static |
| Verdict | **B** — 2 P1-process, 3 P2, 2 P3, 1 P4 |
| Spec coverage | 100% workflow engine · 87.5% dependency linking · ~79% portal · 0% tiered-merge |
| Tests | 164 backend passing · 5 failing (search route) · 135 frontend passing |
| Key finding | `GET /api/search` not implemented — DependencyPicker broken at runtime |
| Findings | QO-001 · QO-002 · QO-003 · QO-004 · QO-005 · QO-006 · QO-007 · QO-008 |

### dependency-auditor
| Field | Value |
|-------|-------|
| Mode | Static (`npm audit`) |
| Verdict | **D** — 3 P1 (CRITICAL CVEs), 8 P2 (HIGH), 35 P3 (moderate), 3 P4 (low) |
| Total CVEs | 49 across 1,069 transitive dependencies |
| Modules clean | Source/E2E (0 CVEs), portal/Backend (0 CVEs) |
| Highest risk | platform/orchestrator (CRITICAL: protobufjs RCE, gRPC crash, OTel DoS) |
| Key finding | protobufjs CVSS 9.8 RCE — arbitrary code execution in orchestrator |
| Findings | DEP-001 through DEP-014+ |

### performance-profiler
| Field | Value |
|-------|-------|
| Mode | SKIPPED |
| Reason | Backend service `http://localhost:3001/` offline at time of audit |
| Fallback | Static checks noted by quality-oracle (unbounded list, no pagination) |

### chaos-monkey
| Field | Value |
|-------|-------|
| Mode | SKIPPED |
| Reason | All services required offline at time of audit |
| Fallback | Static fault-analysis noted in inspector.config.yml scenarios |

---

## 7. Re-Verification Summary

| Finding ID | Title | Prior Status | Current Status |
|------------|-------|-------------|----------------|
| All 57 findings | — | N/A (first audit) | **NEW** |

*No prior audit on record. All findings are newly discovered. Re-verification will be available on next audit run after fixes are applied.*

---

## 8. Cross-Reference Map

Root causes spanning multiple findings — a single fix resolves all findings in each group.

| Root Cause | Affected Findings | Specialists | Single Fix | Fix Impact |
|------------|-------------------|-------------|------------|------------|
| **Stale npm dependencies (no Dependabot/Renovate)** | DEP-001, DEP-002, DEP-003, DEP-004, DEP-005, DEP-006, DEP-007, DEP-008, DEP-009, DEP-010, DEP-011 | dependency-auditor | Enable Dependabot + run `npm audit fix --force` across all 6 modules | Resolves 3 P1 + 8 P2 = **11 findings** |
| **Missing search route implementation** | QO-002 (broken endpoint), QO-003 (histogram for same feature area) | quality-oracle | Create `routes/search.ts`, register in `app.ts`, add `dependencyCheckDuration` histogram to `metrics.ts` | Resolves 1 P1 + 1 P2 = **2 findings** |
| **Route layer directly accesses store** | QO-004 (3 route files bypass service layer) | quality-oracle | Extract `services/workItemService.ts` wrapping all store CRUD | Resolves **1 P2 (3 files)** |
| **Hardcoded tool configuration** | QO-001 (enforcer ignores portal/) | quality-oracle | Add `portal` to `source_dirs` in enforcer, wire from `inspector.config.yml → source.dirs` | Resolves **1 P1** + prevents future gate evasion |

---

## 9. P1 Findings

### DEP-001 — Arbitrary Code Execution in protobufjs
**P1 · CVE · CVSS 9.8 · [ESCALATE → TheGuardians]**

| Field | Value |
|-------|-------|
| File | `platform/orchestrator/package-lock.json` |
| CVE | GHSA-xq3m-2v4x-88gg |
| Affected | protobufjs < 7.5.5 |
| Exploit scenario | Attacker crafts malicious protobuf payload → `protobufjs` deserializes it → arbitrary code executed inside the orchestrator process. No authentication required — the orchestrator gRPC port is the only precondition. |
| Impact | Full compromise of the orchestrator: agent dispatch, pipeline state, all CI/CD operations |
| Recommendation | `npm update protobufjs@>=7.5.5` in `platform/orchestrator` · Verify with `npm audit` |
| CROSS-REF | [CROSS-REF: dependency-auditor] Root cause: stale npm deps |

---

### DEP-002 — Vitest UI Arbitrary File Read & Execution
**P1 · CVE · CVSS 9.8 · [ESCALATE → TheGuardians]**

| Field | Value |
|-------|-------|
| Files | `Source/Frontend/package-lock.json`, `portal/Frontend/package-lock.json` |
| CVE | GHSA-5xrq-8626-4rwp |
| Affected | vitest < 3.2.6 |
| Exploit scenario | If `vitest --ui` server is exposed on the network (common in dev/CI environments), attacker can read and execute arbitrary files from the host filesystem — including secrets, SSH keys, and CI credentials. |
| Impact | Credential exfiltration, arbitrary code execution in CI environments |
| Mitigating control | Disable `--ui` flag in all CI and production test commands immediately |
| Recommendation | `npm update vitest@>=3.2.6` in `Source/Frontend` and `portal/Frontend` · Audit CI scripts for `--ui` flag |
| CROSS-REF | [CROSS-REF: dependency-auditor] Root cause: stale npm deps |

---

### DEP-003 — OpenTelemetry Prometheus Metrics Endpoint DoS
**P1 · CVE · CVSS 7.5 · [ESCALATE → TheGuardians]**

| Field | Value |
|-------|-------|
| File | `platform/orchestrator/package-lock.json` |
| CVE | GHSA-q7rr-3cgh-j5r3 |
| Affected | @opentelemetry/auto-instrumentations-node < 0.77.0 |
| Exploit scenario | Attacker sends malformed HTTP request to `GET /metrics` → Prometheus exporter crashes → orchestrator unavailable. Zero authentication required if metrics port is accessible. |
| Impact | Orchestrator service unavailability; pipeline stalls; no metrics during incident |
| Recommendation | `npm update @opentelemetry/auto-instrumentations-node@>=0.77.0` · Restrict `/metrics` to internal network |
| CROSS-REF | [CROSS-REF: dependency-auditor] Root cause: stale npm deps |

---

### QO-001 — Traceability Enforcer Blind to `portal/`
**P1 · architecture-violation · process**

| Field | Value |
|-------|-------|
| File | `tools/traceability-enforcer.py:70` |
| Detail | `source_dirs = ["Source", "E2E"]` is hardcoded. `portal/` contains a full production app implementing 76 FRs from `Specifications/dev-workflow-platform.md`. The CLAUDE.md pipeline gate (`python3 tools/traceability-enforcer.py`) auto-selects Plans/self-judging-workflow (most recently modified) and never scans portal/ at all. Running the enforcer against `Plans/dev-workflow-platform/requirements.md` falsely reports all 34 FRs as missing. |
| Impact | A developer can strip all `// Verifies: FR-XXX` comments from `portal/` and the CI gate reports PASSED. Spec-to-code traceability is unverified for the portal app. |
| Recommendation | Add `portal` to `source_dirs` in the enforcer, or read scan dirs from `inspector.config.yml → source.dirs` (config already has `Source/`, needs portal added) |
| CROSS-REF | TheFixer (code fix to enforcer) |

---

### QO-002 — `GET /api/search` Endpoint Not Implemented — 5 Tests Failing
**P1 · spec-drift · runtime breakage**

| Field | Value |
|-------|-------|
| Files | `Source/Backend/src/app.ts` (missing route), `Source/Backend/tests/routes/search.test.ts` |
| Spec | FR-dependency-search |
| Detail | The search route is not registered in `app.ts`. The test file documents this explicitly: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests will FAIL until implemented."* 5 tests fail. The `DependencyPicker` frontend component calls `workItemsApi.searchItems()` → `/search?q=` → 404 at runtime. Dependency search is completely broken. |
| Impact | `DependencyPicker` typeahead returns no results; dependency linking is non-functional in the UI |
| Recommendation | Create `Source/Backend/src/routes/search.ts` filtering the in-memory store by `q` across title+description, excluding soft-deleted items. Register at `/api/search` in `app.ts`. Add `// Verifies: FR-dependency-search` traceability. |
| CROSS-REF | TheFixer (implementation) · FR-dependency-api-client (frontend already wired) |

---

## 10. Risk Matrix

*Severity (P1-P4) vs Exploitability — how much access does an attacker need?*

|  | Zero-precondition | Authenticated | Privileged | Admin | Insider/Process |
|--|-------------------|---------------|------------|-------|-----------------|
| **P1** | DEP-001 (protobufjs RCE) · DEP-002 (vitest RCE, if --ui exposed) · DEP-003 (OTel DoS) | — | — | — | QO-001 (dev can bypass gate) |
| **P1 (functional)** | QO-002 (broken endpoint — not exploitable, unusable) | — | — | — | — |
| **P2** | DEP-006 (gRPC crash) · DEP-007 (ws DoS) · DEP-008 (ReDoS) · DEP-009 (picomatch ReDoS) | DEP-004 (vite Windows only) · DEP-005 (form-data, transitive) · DEP-011 (open redirect) | — | — | QO-004 (route bypasses service layer — internal code smell) |
| **P2 (quality)** | — | — | — | — | QO-003 (missing histogram) · QO-005 (duplicate tests) |
| **P3** | DEP-012 (uuid overflow) · DEP-014 (PostCSS XSS, user CSS) | — | — | — | QO-006 (eslint-disable) · QO-007 (FR-TMP unimplemented) |
| **P4** | DEP-low × 3 | — | — | — | QO-008 (seed scope mismatch) |

**Exploitability scale:** Zero-precondition = any network access · Authenticated = valid creds · Privileged = role required · Admin = superuser · Insider/Process = requires developer/CI access

---

## 11. Spec Coverage

| Spec Area | Spec File | FRs Defined | FRs Traced | Coverage |
|-----------|-----------|-------------|------------|----------|
| Workflow engine | Plans/self-judging-workflow/requirements.md | 13 (FR-WF-001..013) | 13 | **100%** ✓ |
| Dependency linking | Plans/dependency-linking/requirements.md | 16 (FR-dependency-*) | 14 | **87.5%** ⚠️ |
| Dev workflow platform (portal) | Specifications/dev-workflow-platform.md | 76 (FR-001..069+) | ~60+ | **~79%** ⚠️ |
| Tiered merge pipeline | Specifications/tiered-merge-pipeline.md | 10 (FR-TMP-001..010) | 0 | **0%** ❌ |

```
Workflow engine      [████████████████████] 100%
Dependency linking   [█████████████████░░░]  87.5%
Dev workflow (portal)[█████████████████░░░]  ~79%
Tiered merge pipeline[░░░░░░░░░░░░░░░░░░░░]   0%
```

**Top 10 uncovered requirements:**
1. `FR-dependency-search` — search endpoint (QO-002: implementation missing)
2. `FR-dependency-seed` — seed data (QO-008: scope mismatch)
3. `FR-TMP-001` — risk classification engine
4. `FR-TMP-002` — Playwright E2E runner integration
5. `FR-TMP-003` — auto-PR creation
6. `FR-TMP-004` — AI PR review trigger
7. `FR-TMP-005` — auto-merge on green
8. `FR-TMP-006` — risk score persistence
9. `FR-TMP-007` — tiered approval gates
10. `FR-TMP-008` — rollback on red

**Note on enforcer:** The default enforcer run reports `TRACEABILITY PASSED` because it only scans Plans/self-judging-workflow (auto-selected). portal/ traceability is not enforced — see QO-001.

---

## 12. Latency Baselines

**Not available — services were offline at time of audit (static mode only).**

Configured budgets (from `inspector.config.yml`) for reference:
| Endpoint | p95 budget | p99 budget | Status |
|----------|------------|------------|--------|
| `GET /api/work-items` | 100ms | 500ms | Not measured |
| `GET /api/dashboard` | 150ms | 500ms | Not measured |
| All other routes | 200ms | 500ms | Not measured |

*Latency baselines will be populated on next audit run when backend is online.*

---

## 13. P2 Findings

| ID | Category | Title | File / Module | Status |
|----|----------|-------|---------------|--------|
| QO-003 | spec-drift | `dependencyCheckDuration` histogram missing from metrics | `Source/Backend/src/metrics.ts` | NEW |
| QO-004 | arch-violation | Route handlers bypass service layer (3 files) | `routes/workItems.ts`, `intake.ts`, `workflow.ts` | NEW |
| QO-005 | doc-stale | Duplicate frontend test files (root vs `tests/pages/`) | `Source/Frontend/tests/` | NEW |
| DEP-004 | CVE/PathTraversal | Vite `server.fs.deny` bypass (Windows alternate paths) | `Source/Frontend`, `portal/Frontend` | NEW |
| DEP-005 | CVE/Injection | form-data CRLF header injection | `Source/Frontend`, `portal/Frontend` | NEW |
| DEP-006 | CVE/DoS | @grpc/grpc-js server crash on malformed requests (2 CVEs) | `platform/orchestrator` | NEW |
| DEP-007 | CVE/DoS | ws WebSocket memory exhaustion DoS | `Source/Frontend`, `portal/Frontend` | NEW |
| DEP-008 | CVE/ReDoS | path-to-regexp ReDoS via multiple route parameters | `platform/orchestrator` | NEW |
| DEP-009 | CVE/ReDoS | picomatch ReDoS + method injection in glob matching | `portal/Frontend` | NEW |
| DEP-010 | CVE/Cascade | @opentelemetry auto-instrumentation — 10+ cascading CVEs | `platform/orchestrator` | NEW |
| DEP-011 | CVE/Redirect | react-router-dom open redirect via protocol-relative URLs | `Source/Frontend`, `portal/Frontend` | NEW |

---

## 14. Fixed Findings

**None — this is the first full inspector audit. No prior state to compare against.**

*Fixed findings will appear here on subsequent audit runs.*

---

## 15. Recommendations

### Block Deployment
These must be resolved before any production release:

- [ ] **[DEP-001]** `npm update protobufjs@>=7.5.5` in `platform/orchestrator` — CVSS 9.8 RCE
- [ ] **[DEP-002]** `npm update vitest@>=3.2.6` in `Source/Frontend` and `portal/Frontend` — CVSS 9.8 file read/RCE
- [ ] **[DEP-002 control]** Audit all CI scripts: remove `--ui` flag from all vitest invocations immediately
- [ ] **[DEP-003]** `npm update @opentelemetry/auto-instrumentations-node@>=0.77.0` in `platform/orchestrator` — DoS
- [ ] Trigger **TheGuardians** security audit for DEP-001, DEP-002, DEP-003, DEP-005

### This Sprint
These block feature completion or create active test failures:

- [ ] **[QO-002]** Create `Source/Backend/src/routes/search.ts`, register at `/api/search` in `app.ts` — fixes 5 failing tests, unblocks DependencyPicker runtime
- [ ] **[QO-003]** Add `dependencyCheckDuration` Histogram to `Source/Backend/src/metrics.ts` — completes FR-dependency-metrics
- [ ] **[QO-001]** Add `portal` to `source_dirs` in `tools/traceability-enforcer.py` — closes gate evasion window
- [ ] **[DEP-004]** `npm update vite@>=8.0.16` in `Source/Frontend` and `portal/Frontend` — fixes 4+ CVEs
- [ ] **[DEP-005]** `npm update form-data@>=4.0.6` — CRLF injection
- [ ] **[DEP-006]** `npm update @grpc/grpc-js@>=1.14.4` in `platform/orchestrator` — server crash
- [ ] **[DEP-007]** `npm update ws@>=8.21.0` — WebSocket DoS

### Next Sprint
Architecture and quality improvements:

- [ ] **[QO-004]** Create `Source/Backend/src/services/workItemService.ts` wrapping all store CRUD; update 3 route files to import from service — fixes CLAUDE.md architecture rule violation
- [ ] **[DEP-008]** `npm update path-to-regexp@>=0.1.13` in `platform/orchestrator`
- [ ] **[DEP-009]** `npm update picomatch@>=2.3.2 && picomatch@>=4.0.4` in `portal/Frontend`
- [ ] **[DEP-011]** `npm update react-router-dom@>=6.30.4` in frontend modules
- [ ] **[QO-007]** Create `Plans/tiered-merge-pipeline/` entry or add `status: planned` to `Specifications/tiered-merge-pipeline.md` — makes 10 FRs visible to pipeline tracking

### Backlog
Lower-priority cleanup:

- [ ] **[QO-005]** Remove root-level duplicate test files: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` (keep `tests/pages/` versions)
- [ ] **[QO-006]** Add justification comments to both `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions in `DependencyPicker.tsx:82` and `useWorkItems.ts:63`
- [ ] **[QO-008]** Resolve FR-dependency-seed scope mismatch — move to portal plan or create Source/ seed with WI-XXX IDs
- [ ] **[DEP-012]** `npm update uuid@>=9.0.1` in `Source/Backend` — buffer overflow fix
- [ ] **[DEP-013]** Plan jest ecosystem major version upgrade (Source/Backend)
- [ ] **[DEP-014]** `npm update postcss@>=8.5.10` — XSS if user-controlled CSS processed
- [ ] Deduplicate @opentelemetry packages (12+ copies in `platform/orchestrator`)
- [ ] Plan express 4.x → 5.x and pino 8.x → 10.x upgrade paths

---

## 16. P3/P4 Summary

| ID | Severity | Category | Title | Module | Status |
|----|----------|----------|-------|--------|--------|
| QO-006 | P3 | pattern-violation | eslint-disable without justification | Source/Frontend | NEW |
| QO-007 | P3 | spec-drift | FR-TMP-001..010 unimplemented, no plan | Specifications/ | NEW |
| DEP-012 | P3 | CVE/Overflow | uuid buffer overflow (v3/v5/v6 with custom buffer) | Source/Backend | NEW |
| DEP-013 | P3 | CVE/Multiple | jest/babel ecosystem ~12 moderate CVEs (js-yaml DoS etc.) | Source/Backend | NEW |
| DEP-014 | P3 | CVE/XSS | PostCSS XSS when user-controlled CSS processed | Source/Frontend, portal/Frontend | NEW |
| DEP-015..049 | P3 | CVE/Various | 31 additional moderate CVEs across transitive deps | Various | NEW |
| QO-008 | P4 | spec-drift | FR-dependency-seed scope mismatch (portal vs Source IDs) | Plans/ | NEW |
| DEP-050..052 | P4 | CVE/Low | 3 low-severity CVEs | Various | NEW |

*Full P3/P4 CVE list: see `Teams/TheInspector/findings/dependency-audit-2026-06-18.md`*

---

## Escalation Status

The following findings triggered security escalation per `inspector.config.yml → escalation.security_triggers` (injection, sensitive data exposed):

| Finding | Trigger | Action |
|---------|---------|--------|
| DEP-001 — protobufjs RCE | injection (CWE-94) | **[ESCALATE → TheGuardians]** |
| DEP-002 — vitest file read/RCE | sensitive data exposed (CWE-862) | **[ESCALATE → TheGuardians]** |
| DEP-003 — OTel DoS | infrastructure crash → service unavailability | **[ESCALATE → TheGuardians]** |
| DEP-005 — form-data CRLF | injection (CWE-93) | **[ESCALATE → TheGuardians]** |

All other P1/P2 findings → **TheFixer** backlog (see bug-backlog JSON).

---

## Appendix: JSON Bug Backlog

```json
{
  "audit_id": "run-20260618-070843",
  "audit_date": "2026-06-18",
  "grade": "D",
  "generated_by": "TheInspector team-leader",
  "specialists_run": ["quality-oracle", "dependency-auditor"],
  "specialists_skipped": ["performance-profiler", "chaos-monkey"],
  "summary": {
    "p1_total": 5,
    "p2_total": 11,
    "p3_total": 37,
    "p4_total": 4,
    "tests_failing": 5,
    "cves_total": 49
  },
  "escalations": [
    {
      "id": "DEP-001",
      "severity": "P1",
      "team": "TheGuardians",
      "trigger": "injection",
      "title": "protobufjs RCE — CVSS 9.8",
      "cve": "GHSA-xq3m-2v4x-88gg",
      "module": "platform/orchestrator",
      "fix": "npm update protobufjs@>=7.5.5"
    },
    {
      "id": "DEP-002",
      "severity": "P1",
      "team": "TheGuardians",
      "trigger": "sensitive data exposed",
      "title": "vitest UI arbitrary file read/execution — CVSS 9.8",
      "cve": "GHSA-5xrq-8626-4rwp",
      "module": "Source/Frontend, portal/Frontend",
      "fix": "npm update vitest@>=3.2.6 + disable --ui in CI"
    },
    {
      "id": "DEP-003",
      "severity": "P1",
      "team": "TheGuardians",
      "trigger": "infrastructure crash",
      "title": "OpenTelemetry Prometheus DoS — CVSS 7.5",
      "cve": "GHSA-q7rr-3cgh-j5r3",
      "module": "platform/orchestrator",
      "fix": "npm update @opentelemetry/auto-instrumentations-node@>=0.77.0"
    },
    {
      "id": "DEP-005",
      "severity": "P2",
      "team": "TheGuardians",
      "trigger": "injection",
      "title": "form-data CRLF header injection — CVSS 7.5",
      "cve": "GHSA-hmw2-7cc7-3qxx",
      "module": "Source/Frontend, portal/Frontend",
      "fix": "npm update form-data@>=4.0.6"
    }
  ],
  "findings": [
    {
      "id": "QO-001", "severity": "P1", "team": "TheFixer",
      "category": "architecture-violation",
      "title": "Traceability enforcer blind to portal/ — gate can be gamed",
      "file": "tools/traceability-enforcer.py:70",
      "fix": "Add portal to source_dirs or read from inspector.config.yml",
      "status": "NEW"
    },
    {
      "id": "QO-002", "severity": "P1", "team": "TheFixer",
      "category": "spec-drift",
      "title": "GET /api/search not implemented — 5 tests failing, DependencyPicker broken",
      "file": "Source/Backend/src/app.ts",
      "spec": "FR-dependency-search",
      "fix": "Create routes/search.ts, register at /api/search",
      "status": "NEW"
    },
    {
      "id": "QO-003", "severity": "P2", "team": "TheFixer",
      "category": "spec-drift",
      "title": "dependencyCheckDuration histogram missing from metrics.ts",
      "file": "Source/Backend/src/metrics.ts",
      "spec": "FR-dependency-metrics",
      "fix": "Add Histogram for dependency_check_duration_seconds",
      "status": "NEW"
    },
    {
      "id": "QO-004", "severity": "P2", "team": "TheFixer",
      "category": "architecture-violation",
      "title": "Route handlers bypass service layer — 3 files import store directly",
      "files": ["Source/Backend/src/routes/workItems.ts", "Source/Backend/src/routes/intake.ts", "Source/Backend/src/routes/workflow.ts"],
      "fix": "Create services/workItemService.ts wrapping store CRUD",
      "status": "NEW"
    },
    {
      "id": "QO-005", "severity": "P2", "team": "TheFixer",
      "category": "doc-stale",
      "title": "Duplicate frontend test files — root-level copies are stale",
      "files": ["Source/Frontend/tests/WorkItemDetailPage.test.tsx", "Source/Frontend/tests/WorkItemListPage.test.tsx"],
      "fix": "Delete root-level copies; tests/pages/ versions are canonical",
      "status": "NEW"
    },
    {
      "id": "QO-006", "severity": "P3", "team": "TheFixer",
      "category": "pattern-violation",
      "title": "eslint-disable-next-line react-hooks/exhaustive-deps without justification",
      "files": ["Source/Frontend/src/components/DependencyPicker.tsx:82", "Source/Frontend/src/hooks/useWorkItems.ts:63"],
      "fix": "Add inline justification comment",
      "status": "NEW"
    },
    {
      "id": "QO-007", "severity": "P3", "team": "TheFixer",
      "category": "spec-drift",
      "title": "FR-TMP-001..010 (tiered merge pipeline) — 0% coverage, no plan",
      "file": "Specifications/tiered-merge-pipeline.md",
      "fix": "Create Plans/tiered-merge-pipeline/ or add status: planned header",
      "status": "NEW"
    },
    {
      "id": "QO-008", "severity": "P4", "team": "TheFixer",
      "category": "spec-drift",
      "title": "FR-dependency-seed scope mismatch — BUG-XXXX IDs in Source/ plan",
      "file": "Plans/dependency-linking/requirements.md",
      "fix": "Clarify portal vs Source scope; move or adapt requirement",
      "status": "NEW"
    },
    {
      "id": "DEP-004", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "Vite server.fs.deny bypass via Windows alternate paths",
      "cve": "GHSA-fx2h-pf6j-xcff",
      "modules": ["Source/Frontend", "portal/Frontend"],
      "fix": "npm update vite@>=8.0.16",
      "status": "NEW"
    },
    {
      "id": "DEP-006", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "@grpc/grpc-js server crash on malformed requests",
      "cves": ["GHSA-5375-pq7m-f5r2", "GHSA-99f4-grh7-6pcq"],
      "module": "platform/orchestrator",
      "fix": "npm update @grpc/grpc-js@>=1.14.4",
      "status": "NEW"
    },
    {
      "id": "DEP-007", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "ws WebSocket memory exhaustion DoS",
      "cve": "GHSA-96hv-2xvq-fx4p",
      "modules": ["Source/Frontend", "portal/Frontend"],
      "fix": "npm update ws@>=8.21.0",
      "status": "NEW"
    },
    {
      "id": "DEP-008", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "path-to-regexp ReDoS via multiple route parameters",
      "cve": "GHSA-37ch-88jc-xwx2",
      "module": "platform/orchestrator",
      "fix": "npm update path-to-regexp@>=0.1.13",
      "status": "NEW"
    },
    {
      "id": "DEP-009", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "picomatch ReDoS + method injection in glob matching",
      "cves": ["GHSA-c2c7-rcm5-vvqj", "GHSA-3v7f-55p6-f55p"],
      "module": "portal/Frontend",
      "fix": "npm update picomatch@>=2.3.2 and >=4.0.4",
      "status": "NEW"
    },
    {
      "id": "DEP-010", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "@opentelemetry auto-instrumentation cascade — 10+ dependent CVEs",
      "cve": "GHSA-q7rr-3cgh-j5r3 (cascade)",
      "module": "platform/orchestrator",
      "fix": "npm update @opentelemetry/auto-instrumentations-node@>=0.77.0",
      "status": "NEW"
    },
    {
      "id": "DEP-011", "severity": "P2", "team": "TheFixer",
      "category": "CVE",
      "title": "react-router-dom open redirect via protocol-relative URLs",
      "cve": "GHSA-2j2x-hqr9-3h42",
      "modules": ["Source/Frontend", "portal/Frontend"],
      "fix": "npm update react-router-dom@>=6.30.4",
      "status": "NEW"
    },
    {
      "id": "DEP-012", "severity": "P3", "team": "TheFixer",
      "category": "CVE",
      "title": "uuid buffer overflow in v3/v5/v6 with custom buffer",
      "cve": "GHSA-w5hq-g745-h8pq",
      "module": "Source/Backend",
      "fix": "npm update uuid@>=9.0.1",
      "status": "NEW"
    },
    {
      "id": "DEP-013", "severity": "P3", "team": "TheFixer",
      "category": "CVE",
      "title": "jest/babel ecosystem ~12 moderate CVEs (js-yaml DoS, etc.)",
      "module": "Source/Backend",
      "fix": "npm update jest@latest (major version jump — plan carefully)",
      "status": "NEW"
    },
    {
      "id": "DEP-014", "severity": "P3", "team": "TheFixer",
      "category": "CVE",
      "title": "PostCSS XSS when user-controlled CSS is processed",
      "cve": "GHSA-qx2v-qp2m-jg93",
      "modules": ["Source/Frontend", "portal/Frontend"],
      "fix": "npm update postcss@>=8.5.10",
      "status": "NEW"
    }
  ]
}
```

---

*Report generated by TheInspector team-leader · Audit ID: run-20260618-070843 · 2026-06-18*
*HTML report: `Teams/TheInspector/findings/audit-2026-06-18-D.html`*
*Full dependency audit: `Teams/TheInspector/findings/dependency-audit-2026-06-18.md`*
