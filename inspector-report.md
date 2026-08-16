# TheInspector — System Health Audit Report

| | |
|---|---|
| **Date** | 2026-08-16 |
| **Branch** | `audit/inspector-2026-08-16-082e1e` |
| **Grade** | 🟠 **D** |
| **Run ID** | `run-20260816-031457` |
| **Scope** | Full codebase — static analysis (services offline) |
| **Specialists** | quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⏭ · chaos-monkey ⏭ |
| **HTML Report** | `Teams/TheInspector/findings/audit-2026-08-16-D.html` |
| **Bug Backlog** | `Teams/TheInspector/findings/bug-backlog-2026-08-16.json` |

---

## § 1 — Grade Rationale

| Threshold | Requirement | Actual | Result |
|-----------|------------|--------|--------|
| Grade A | P1 ≤ 0, P2 ≤ 3, coverage ≥ 80% | P1 = **4**, P2 = 19, coverage = 96% | ✗ |
| Grade B | P1 ≤ 0, P2 ≤ 8, coverage ≥ 60% | P1 = **4** | ✗ |
| Grade C | P1 ≤ 2, P2 ≤ 15, coverage ≥ 40% | P1 = **4** | ✗ |
| **Grade D** | P1 ≤ 999 | P1 = 4 | ✓ |

**Grade D** — driven entirely by 4 critical CVEs from the dependency audit. Code quality alone (quality-oracle) would rate **B** (0 P1, 6 P2, 96% effective spec coverage). Dependency posture pulls the overall grade to D.

---

## § 2 — Scorecards

| Specialist | Mode | P1 | P2 | P3 | P4 | Escalations |
|-----------|------|-----|-----|-----|-----|-------------|
| quality-oracle | static | 0 | 6 | 6 | 0 | 1 → TheGuardians |
| dependency-auditor | static | 4 | 13 | 29 | 4 | 8 → TheGuardians |
| performance-profiler | skipped (backend offline) | — | — | — | — | — |
| chaos-monkey | skipped (all services offline) | — | — | — | — | — |
| **TOTAL** | | **4** | **19** | **35** | **4** | **9** |

---

## § 3 — Executive Summary (Top 5)

1. **🔴 Four critical CVEs with code/file execution risk — block deployment.** `vitest` (CVSS 9.8), `protobufjs` (CVSS 8.9), `handlebars` (CVSS 8.2), and OpenTelemetry Prometheus exporter (CVSS 7.5) are all unpatched across the 6 scanned projects. Three allow remote code or file execution; one crashes the monitoring process. All four are escalated to TheGuardians.

2. **🟠 Dependency posture is poor across 5 of 6 projects.** 50 CVEs total (4 critical, 13 high, 29 moderate, 4 low) across 1,378 transitive packages. Only `Source/E2E` is clean. Five packages are one or more major versions behind.

3. **🟠 DependencyPicker search is broken in production.** `GET /api/search` has a full test contract (`search.test.ts`) but is never registered in `app.ts`. Every typeahead call returns 404. This is `FR-dependency-search` — intentionally deferred but causing user-visible breakage.

4. **🟡 Three route files bypass the service layer — architecture rule violated.** `workItems.ts`, `intake.ts`, and `workflow.ts` call `store.*` directly. Business logic in the service tier (change tracking, cascade dependency checks) is silently skipped for all basic CRUD.

5. **🟡 Stale 74-FR spec pollutes `Specifications/` directory.** `dev-workflow-platform.md` describes a different product with 0% implementation. Every inspector run nominally reports 28% coverage instead of 96%, misleading all future agents.

---

## § 4 — Scope & Environment

- **Audit mode:** Full codebase, static only (backend and frontend services offline)
- **Projects scanned:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend
- **Total dependencies:** 1,378 (427 direct, 951 transitive)
- **node_modules:** ⚠️ NOT installed — test suites could not be executed (see QO-012)
- **Data caveat:** CVEs are `npm audit` static results; exploit confirmation requires TheGuardians dynamic assessment. No latency or chaos data (services offline).

---

## § 5 — Trend

**First audit — no baseline.** All 62 findings are `NEW`. The next run will diff against this report.

---

## § 6 — Specialist Reports

### quality-oracle (static)
- **Verdict:** B (effective) / D if graded on nominal coverage (misleading — see QO-001)
- **Spec coverage:** 96% effective (27/28 requirements; `FR-dependency-search` intentionally deferred)
- **Findings:** 0 P1 · 6 P2 · 6 P3
- **Escalations:** 1 → TheGuardians (QO-005: unbounded pagination)

### dependency-auditor (static)
- **Verdict:** 🔴 HIGH RISK
- **Total CVEs:** 50 (4 critical, 13 high, 29 moderate, 4 low) across 1,378 packages
- **Findings:** 4 P1 · 13 P2 · 29 P3 · 4 P4
- **Escalations:** 8 → TheGuardians
- **Only clean project:** Source/E2E (0 CVEs)

### performance-profiler (skipped)
Backend service offline at `http://localhost:3001`. Latency budgets are configured (p95 ≤ 200ms default, ≤ 100ms for `/api/work-items`) but no baseline was captured.

### chaos-monkey (skipped)
All services offline. Two static-analysis scenarios (`concurrent state transitions`, `malformed request body`) could run offline in the next audit cycle.

---

## § 7 — Re-Verification Summary

| Status | Count | Note |
|--------|-------|------|
| NEW | 62 | First audit |
| FIXED | 0 | No prior baseline |
| STILL OPEN | 0 | No prior baseline |
| REGRESSED | 0 | No prior baseline |

---

## § 8 — Cross-Reference Map

| Root Cause | Affected Findings | Single Fix | Impact |
|-----------|-------------------|-----------|--------|
| Missing service layer (routes → store direct) | QO-003, QO-004 | Create `workItemService.ts`, migrate calls, register `/api/search` | Closes 2 P2s in one PR |
| vitest pinned below security threshold | DEP-001 ×2 (Source/Frontend + portal/Frontend) | `npm install vitest@4.1.10` in both directories | Closes both instances of CVSS 9.8 |
| OpenTelemetry ecosystem version lag (portal/Backend) | DEP-004 + several high CVEs | Coordinated OTel upgrade (`@opentelemetry/sdk-node@0.221.0` + peers) | Resolves DoS + cascading high CVEs |
| Inspector config traceability regex wrong | QO-002 → all future audit false alarms | Update `inspector.config.yml` pattern to `FR-[A-Z0-9][A-Z0-9-]*` | Prevents permanent false-zero reports |

---

## § 9 — P1 Findings (Expanded)

### [ESCALATE → TheGuardians] DEP-001 — vitest Arbitrary File Read & Execution
- **Severity:** P1 · CVSS 9.8
- **CVE:** GHSA-5xrq-8626-4rwp
- **Files:** `Source/Frontend/package.json`, `portal/Frontend/package.json`
- **Detail:** vitest UI server (≤3.2.5) allows remote attackers to read and execute arbitrary files when accessible on a network interface. Zero-precondition exploitation.
- **Exploit:** Attacker on LAN opens `http://host:51204/__vitest__/` → reads `.env`, private keys, or injects code into test runner.
- **Impact:** Full server compromise, credential theft, supply chain contamination.
- **Fix:** `npm install vitest@4.1.10` in both affected directories.

---

### [ESCALATE → TheGuardians] DEP-002 — protobufjs Arbitrary Code Execution
- **Severity:** P1 · CVSS 8.9
- **CVE:** GHSA-vcch-vrg3-jvg8
- **Files:** `platform/orchestrator/package.json`
- **Detail:** protobufjs ≤7.6.4 executes JavaScript function bodies embedded in deserialized .proto object properties.
- **Exploit:** Attacker supplies crafted .proto to any proto-parsing endpoint → RCE on orchestrator host.
- **Impact:** Full orchestrator compromise, pipeline takeover, lateral movement to all managed services.
- **Fix:** `npm install protobufjs@7.6.5` in `platform/orchestrator/`.

---

### [ESCALATE → TheGuardians] DEP-003 — handlebars JavaScript Injection
- **Severity:** P1 · CVSS 8.2
- **CVE:** GHSA-xjpj-3mr7-gcpf
- **Files:** `Source/Backend/package.json` (transitive)
- **Detail:** handlebars 4.0.0–4.7.8 CLI precompiler does not escape template names and option values.
- **Exploit:** User-controlled input passed to `handlebars precompile` → JavaScript injection at build time.
- **Impact:** Build-time code injection; supply chain risk.
- **Fix:** `npm why handlebars` in `Source/Backend/` to identify parent; upgrade or override to ≥4.7.9.

---

### [ESCALATE → TheGuardians] DEP-004 — OpenTelemetry Prometheus Exporter DoS
- **Severity:** P1 · CVSS 7.5
- **CVE:** GHSA-q7rr-3cgh-j5r3
- **Files:** `portal/Backend/package.json`
- **Detail:** `@opentelemetry/sdk-node` ≤0.218.0 crashes the Node.js process on malformed HTTP to the `/metrics` endpoint.
- **Exploit:** Attacker sends malformed HTTP to `/metrics` → process crash → monitoring goes dark → subsequent attacks are unobservable.
- **Impact:** Monitoring blind spot; persistent DoS if restart is slow.
- **Fix:** `npm install @opentelemetry/sdk-node@0.221.0` with cascading OTel peer updates in `portal/Backend/`.

---

## § 10 — Risk Matrix

```
                 Zero-precondition       Authenticated       Privileged         Admin
P1 (Critical)   DEP-001 (vitest)        DEP-003 (HBS)
                DEP-002 (protobufjs)
                DEP-004 (OTel DoS)

P2 (High)       QO-005 (pagination)     DEP-006 (gRPC)      QO-004 (routes)    QO-001, QO-002
                DEP-005, DEP-009,       DEP-007, DEP-008                       QO-003, QO-012
                DEP-013 (network)       DEP-010, DEP-011

P3 (Moderate)   DEP moderate ×29        QO-008              QO-006, 007, 009   QO-010, QO-011

P4 (Low)        DEP low ×4
```

---

## § 11 — Spec Coverage

| Spec | FRs | Covered | % |
|------|-----|---------|---|
| workflow-engine.md (FR-WF-001–013) | 13 | 13 | **100%** |
| dependency-linking requirements (FR-dependency-*) | 15 | 14 | **93%** (search deferred) |
| **Effective total** | **28** | **27** | **96%** |

**Uncovered (1):** `FR-dependency-search` — typeahead search for DependencyPicker; test contract exists, route intentionally not wired yet.

> ⚠️ Nominal coverage = 28% — misleading due to stale `dev-workflow-platform.md` in `Specifications/`. See QO-001.

---

## § 12 — Latency Baselines

No data — backend service offline. Budgets configured:

| Endpoint | p95 Budget | p99 Budget |
|----------|-----------|-----------|
| `/api/work-items` | 100ms | — |
| `/api/dashboard` | 150ms | — |
| All other | 200ms | 500ms |

---

## § 13 — P2 Findings

| ID | Category | Title | Source | Status |
|----|---------|-------|--------|--------|
| QO-001 | spec-drift | Stale `dev-workflow-platform.md` in `Specifications/` | quality-oracle | NEW |
| QO-002 | arch-violation | Inspector config traceability pattern wrong (`FR-\d+` → never matches) | quality-oracle | NEW |
| QO-003 | untested | `GET /api/search` unimplemented — DependencyPicker broken | quality-oracle | NEW |
| QO-004 | arch-violation | Routes call store directly — service layer bypassed (3 files) | quality-oracle | NEW |
| QO-005 | arch-violation | Unbounded pagination `?limit=999999` — full exfiltration `[→ TheGuardians]` | quality-oracle | NEW |
| QO-012 | pattern-violation | `node_modules` not installed — verification gates cannot run | quality-oracle | NEW |
| DEP-005 | CVE · GHSA-brg9-6gb3-3h2j | brace-expansion DoS (all projects) | dependency-auditor | NEW |
| DEP-006 | CVE | `@grpc/grpc-js` HTTP/2 memory exhaustion `[→ TheGuardians]` | dependency-auditor | NEW |
| DEP-007 | CVE | `form-data` prototype pollution `[→ TheGuardians]` | dependency-auditor | NEW |
| DEP-008 | CVE | `nanoid` predictable ID generation `[→ TheGuardians]` | dependency-auditor | NEW |
| DEP-009 | CVE | `ws` WebSocket DoS | dependency-auditor | NEW |
| DEP-010 | CVE | `vite` Server-Side Request Forgery | dependency-auditor | NEW |
| DEP-011 | CVE | `react-router-dom` XSS via unvalidated redirect | dependency-auditor | NEW |
| DEP-012 | CVE | `pino` path traversal in log destinations | dependency-auditor | NEW |
| DEP-013 | CVE | `nth-check` ReDoS `[→ TheGuardians]` | dependency-auditor | NEW |
| DEP-014–017 | CVE | 4 additional high CVEs (see `dependency-audit-2026-08-16.md`) | dependency-auditor | NEW |
| DEP-018 | outdated-major | `uuid` 5 major versions behind (9.0.1 → 14.0.1) | dependency-auditor | NEW |
| DEP-019 | outdated-major | `express` 1 major version behind (4.22.2 → 5.2.1) | dependency-auditor | NEW |

---

## § 14 — Fixed Findings

None — first audit.

---

## § 15 — Recommendations

### 🚫 Block Deployment
- Escalate DEP-001, DEP-002, DEP-003, DEP-004 to TheGuardians immediately
- Patch `vitest@4.1.10` in Source/Frontend and portal/Frontend (CVSS 9.8)
- Patch `protobufjs@7.6.5` in platform/orchestrator (CVSS 8.9 — RCE)
- Locate and upgrade handlebars parent dep in Source/Backend (CVSS 8.2)
- Upgrade OTel in portal/Backend to `sdk-node@0.221.0` (DoS — monitoring blind spot)

### 🔥 This Sprint
- QO-005: add `MAX_LIMIT = 100` clamp in `workItemStore.findAll()` → escalate to TheGuardians
- Phase 2 CVE upgrades: `brace-expansion`, `ws`, `vite`, `react-router-dom`, `pino`
- TheGuardians to assess: `@grpc/grpc-js`, `form-data`, `nanoid`, `nth-check`
- QO-003: implement `GET /api/search?q=` and register in `app.ts`

### 📋 Next Sprint
- QO-004: create `workItemService.ts`, migrate store calls from route handlers
- QO-001: archive `Specifications/dev-workflow-platform.md` → `docs/archive/`
- QO-002: fix inspector config traceability pattern to `FR-[A-Z0-9][A-Z0-9-]*`
- QO-012: add `npm install` to CI bootstrap and agent startup scripts
- Plan uuid@14 and express@5 major version upgrades

### 📌 Backlog
- QO-008: stop swallowing JSON parse errors in `api/client.ts:26`
- QO-009: consolidate dual logger into one canonical export
- QO-007: add justification comments above `eslint-disable-next-line` suppressions
- QO-006: remove duplicate test files for WorkItemDetailPage and WorkItemListPage
- QO-010: add tests for Layout, PriorityBadge, StatusBadge, TypeBadge
- QO-011: add tests for errorHandler.ts and utils/id.ts
- 29 moderate CVEs — see `Teams/TheInspector/findings/dependency-audit-2026-08-16.md`

---

## § 16 — P3/P4 Summary

| ID | Severity | Title | Source |
|----|---------|-------|--------|
| QO-006 | P3 | Duplicate test files (WorkItemDetailPage, WorkItemListPage) | quality-oracle |
| QO-007 | P3 | `eslint-disable` without justification comment | quality-oracle |
| QO-008 | P3 | Silent error swallow in `api/client.ts` | quality-oracle |
| QO-009 | P3 | Two logger abstractions (`logger.ts` shim + `utils/logger.ts`) | quality-oracle |
| QO-010 | P3 | Layout, PriorityBadge, StatusBadge, TypeBadge missing tests | quality-oracle |
| QO-011 | P3 | `errorHandler.ts` and `utils/id.ts` missing unit tests | quality-oracle |
| DEP-020–038 | P3 | 29 moderate CVEs — see `dependency-audit-2026-08-16.md` | dependency-auditor |
| DEP-low-1–4 | P4 | 4 low-severity CVEs — see `dependency-audit-2026-08-16.md` | dependency-auditor |

---

## Escalation Log

```
[ESCALATE → TheGuardians]
┌──────────────────────────────────────────────────────────────────┐
│  9 findings routed to TheGuardians security team                 │
├────────┬────────────────────────────────────────┬────────────────┤
│ DEP-001│ vitest Arbitrary File Read & Exec       │ CVSS 9.8 — P1 │
│ DEP-002│ protobufjs Arbitrary Code Execution     │ CVSS 8.9 — P1 │
│ DEP-003│ handlebars JavaScript Injection         │ CVSS 8.2 — P1 │
│ DEP-004│ OTel Prometheus Exporter DoS            │ CVSS 7.5 — P1 │
│ DEP-006│ @grpc/grpc-js HTTP/2 Memory Exhaustion  │         — P2  │
│ DEP-007│ form-data Prototype Pollution           │         — P2  │
│ DEP-008│ nanoid Predictable IDs                  │         — P2  │
│ DEP-013│ nth-check ReDoS                         │         — P2  │
│ QO-005 │ Unbounded list exfiltration             │         — P2  │
└────────┴────────────────────────────────────────┴────────────────┘
```

---

## JSON Bug Backlog

```json
{
  "audit_date": "2026-08-16",
  "run_id": "run-20260816-031457",
  "branch": "audit/inspector-2026-08-16-082e1e",
  "grade": "D",
  "grade_reason": "4 P1 critical CVEs exceed C-grade threshold (max_p1=2)",
  "summary": {
    "p1_total": 4,
    "p2_total": 19,
    "p3_total": 35,
    "p4_total": 4,
    "total_findings": 62,
    "new": 62,
    "fixed": 0,
    "first_audit": true
  },
  "p1_findings": [
    { "id": "DEP-001", "title": "vitest Arbitrary File Read & Execution", "cvss": 9.8, "fix": "npm install vitest@4.1.10", "escalation": "TheGuardians" },
    { "id": "DEP-002", "title": "protobufjs Arbitrary Code Execution",    "cvss": 8.9, "fix": "npm install protobufjs@7.6.5", "escalation": "TheGuardians" },
    { "id": "DEP-003", "title": "handlebars JavaScript Injection",         "cvss": 8.2, "fix": "upgrade handlebars ≥4.7.9 (transitive)", "escalation": "TheGuardians" },
    { "id": "DEP-004", "title": "OTel Prometheus Exporter DoS",            "cvss": 7.5, "fix": "npm install @opentelemetry/sdk-node@0.221.0", "escalation": "TheGuardians" }
  ],
  "top_p2_findings": [
    { "id": "QO-003", "title": "GET /api/search unimplemented", "route_to": "TheFixer" },
    { "id": "QO-004", "title": "Routes bypass service layer",   "route_to": "TheFixer" },
    { "id": "QO-005", "title": "Unbounded pagination limit",    "route_to": "TheGuardians" },
    { "id": "QO-001", "title": "Stale spec in Specifications/", "route_to": "requirements-reviewer" },
    { "id": "QO-002", "title": "Inspector config regex wrong",  "route_to": "solo-session" },
    { "id": "QO-012", "title": "node_modules not installed",    "route_to": "solo-session/CI" }
  ],
  "escalations": [
    { "id": "DEP-001", "team": "TheGuardians", "reason": "Arbitrary file read & execution (CVSS 9.8)" },
    { "id": "DEP-002", "team": "TheGuardians", "reason": "Arbitrary code execution (CVSS 8.9)" },
    { "id": "DEP-003", "team": "TheGuardians", "reason": "JavaScript injection (CVSS 8.2)" },
    { "id": "DEP-004", "team": "TheGuardians", "reason": "Prometheus exporter DoS (CVSS 7.5)" },
    { "id": "DEP-006", "team": "TheGuardians", "reason": "@grpc/grpc-js HTTP/2 memory exhaustion" },
    { "id": "DEP-007", "team": "TheGuardians", "reason": "form-data prototype pollution" },
    { "id": "DEP-008", "team": "TheGuardians", "reason": "nanoid predictable IDs" },
    { "id": "DEP-013", "team": "TheGuardians", "reason": "nth-check ReDoS" },
    { "id": "QO-005", "team": "TheGuardians", "reason": "Unbounded list exfiltration threat scenario" }
  ],
  "full_backlog": "Teams/TheInspector/findings/bug-backlog-2026-08-16.json"
}
```

---

*TheInspector · Run `run-20260816-031457` · 2026-08-16*
