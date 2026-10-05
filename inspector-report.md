# TheInspector Health Audit — 2026-10-05

> **Grade: C** | Branch: `audit/inspector-2026-10-05-8694fc` | Run: `run-20261005-085538`
> Specialists: quality-oracle (static), dependency-auditor (static) — performance-profiler & chaos-monkey skipped (services offline)

---

## §1 — Header

| Item | Value |
|------|-------|
| **Grade** | 🟡 **C** |
| Branch | `audit/inspector-2026-10-05-8694fc` |
| Date | 2026-10-05 |
| Scope | Full codebase — static analysis (services offline) |
| Run ID | `run-20261005-085538` |
| Escalation | ⚠ **[ESCALATE → TheGuardians]** — DEP-001 RCE CVSS 9.8 |

---

## §2 — Scorecards

| Metric | Value |
|--------|-------|
| 🔴 P1 Critical | **2** |
| 🟠 P2 High | **7** |
| 🟡 P3 Medium | **9** |
| 🟢 P4 Low | **2** |
| Total findings | **20** |
| Spec coverage (Specifications/) | **76%** (22/92 FRs untraced) |
| Spec coverage (Plans/) | **100%** ✅ |
| Specialists run (static) | 2 |
| Dynamic specialists | 0 (services offline) |
| FIXED since last audit | 0 (first audit — no baseline) |
| Escalations | 1 (DEP-001 → TheGuardians) |

---

## §3 — Executive Summary

Five things an operator needs to know:

1. **🔴 RCE in the build orchestrator (DEP-001)** — `platform/orchestrator` depends on `@grpc/grpc-js` which pulls `protobufjs ≤7.6.4`. Crafted `.proto` files execute arbitrary JavaScript during deserialization. CVSS 9.8. The orchestrator has Docker access — compromise equals full pipeline control. **Escalated to TheGuardians.** Single fix: `cd platform/orchestrator && npm update @grpc/grpc-js`.

2. **🔴 Source/ has no canonical Specification (QO-001)** — `Source/` implements FR-WF-001..013, traced only to a Plan file (`Plans/self-judging-workflow/requirements.md`), never to `Specifications/`. The traceability enforcer passes because it only reads Plans. Per CLAUDE.md, Specifications are the source of truth — this gap silently breaks the spec-first guarantee for every `Source/` PR.

3. **🟠 Orchestrator needs 3 npm updates to clear 6 CVEs (DEP-002, DEP-003, DEP-009, DEP-012)** — `npm update express @grpc/grpc-js` fixes path-to-regexp ReDoS, all gRPC crash vectors, QS DoS chain, and body-parser limit bypass in a single command.

4. **🟠 Route handlers bypass the service layer in 3 files (QO-002)** — `workItems.ts`, `workflow.ts`, and `intake.ts` import `workItemStore` directly, violating CLAUDE.md's architecture rule. Business logic cannot be unit-tested in isolation.

5. **🟡 The CI traceability gate has a blind spot (QO-007)** — The enforcer audits Plans only. A requirement could be silently removed from `Specifications/` with no CI failure. Extending the enforcer closes both QO-001 and QO-007 with one code change.

---

## §4 — Scope & Environment

| Item | Value |
|------|-------|
| Audit scope | Full codebase: Source/, portal/, platform/orchestrator, Specifications/, Plans/ |
| quality-oracle | ✅ Static — 3 min |
| dependency-auditor | ✅ Static (npm audit) — 5 min |
| performance-profiler | ⏭ Skipped — backend offline (http://localhost:3001) |
| chaos-monkey | ⏭ Skipped — all services required |
| npm projects scanned | 7 (296 direct deps, 600+ transitive) |
| Spec documents | Specifications/dev-workflow-platform.md (92 FRs), Plans/self-judging-workflow/requirements.md (13 FRs) |
| Data caveats | No runtime performance data. No fault-injection results. CVEs current as of 2026-10-05. |

---

## §5 — Trend

**First audit — no baseline.** All findings classified NEW. Grade for comparison at next audit: **C**.

Next audit scheduled: **2026-11-05**

---

## §6 — Specialist Reports

| Specialist | Mode | Verdict | P1 | P2 | P3 | P4 | Duration |
|------------|------|---------|----|----|----|----|----------|
| quality-oracle | Static | ⚠ FAIL | 1 | 3 | 3 | 0 | ~3 min |
| dependency-auditor | Static (npm audit) | ⛔ CRITICAL FAIL | 1 | 4 | 6 | 2 | ~5 min |
| performance-profiler | Skipped | — | — | — | — | — | — |
| chaos-monkey | Skipped | — | — | — | — | — | — |

---

## §7 — Re-Verification Summary

First audit — no prior findings to re-verify.

| Status | Count |
|--------|-------|
| 🆕 NEW | 20 |
| ✅ FIXED | 0 |
| ⚠ STILL OPEN | 0 |
| 📉 REGRESSED | 0 |

---

## §8 — Cross-Reference Map

| Root Cause | Affected Findings | Single Fix | Fix Impact |
|------------|-------------------|------------|------------|
| Traceability tooling blind spot — enforcer only reads Plans | `QO-001` · `QO-007` | Extend `traceability-enforcer.py --specs` + promote plan specs to Specifications/ | Closes 2 findings. Restores CI gate to spec-level truth. |
| `platform/orchestrator @grpc/grpc-js ≤1.14.4` — unpatched gRPC chain | `DEP-001` · `DEP-003` | `cd platform/orchestrator && npm update @grpc/grpc-js` | Closes 2 findings. Eliminates RCE and all gRPC crash CVEs. |
| `platform/orchestrator express ≤4.18.2` — outdated express chain | `DEP-002` · `DEP-009` · `DEP-012` | `cd platform/orchestrator && npm update express` | Closes 3 findings. Fixes ReDoS, QS DoS (×3), body-parser limit bypass. |
| `Source/Backend` has no service layer abstraction | `QO-002` | Create `workItemsService.ts`; refactor 3 route files | Closes QO-002. Enables isolated unit testing of business logic. |

---

## §9 — P1 Findings

### ⚠ ESCALATION → TheGuardians

**DEP-001** triggers the `injection` escalation rule in `inspector.config.yml`.

```
⚠  ESCALATION → TheGuardians
   Finding : protobufjs ≤7.6.4 arbitrary code execution (CVSS 9.8) in platform/orchestrator via @grpc/grpc-js
   Branch  : audit/inspector-2026-10-05-8694fc
   When    : before next release, or wait for the scheduled security run

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see §13 and bug-backlog-2026-10-05.json)
```

---

### DEP-001 — protobufjs Arbitrary Code Execution `[ESCALATE → TheGuardians]`

- **Severity:** P1 / CVSS 9.8 / CRITICAL
- **CVE:** GHSA-xq3m-2v4x-88gg
- **File:** `platform/orchestrator/package.json` (transitive: @grpc/grpc-js → protobufjs ≤7.6.4)
- **Exploit scenario:** Attacker supplies a crafted `.proto` schema to the orchestrator's gRPC message pipeline. During deserialization, protobufjs evaluates attacker-controlled JavaScript. The orchestrator runs with Docker API access — full pipeline compromise, arbitrary container execution, supply-chain injection.
- **Impact:** Remote code execution in orchestrator process. Every CI build is a potential attack surface.
- **Fix:** `cd platform/orchestrator && npm update @grpc/grpc-js` (pulls protobufjs ≥7.6.5)
- **Route to:** TheGuardians (security review required before fix merge)
- **Cross-ref:** `[CROSS-REF: DEP-003]` — same gRPC library; single update fixes both

---

### QO-001 — Source/ has no canonical Specification

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/` (entire directory — missing coverage for Source/ system)
- **Exploit scenario:** Developer modifies `Plans/self-judging-workflow/requirements.md` to add or remove an FR. The CI enforcer still passes. Over time, Source/ accumulates unreviewed business logic with no specification anchor and no failing gate to signal the drift.
- **Impact:** The project's "spec-first" guarantee is broken for the Source/ application. The CLAUDE.md rule ("Specifications are source of truth") is structurally unenforceable for Source/.
- **Fix:** Promote `Plans/self-judging-workflow/requirements.md` → `Specifications/workflow-engine-spec.md`. Update `tools/traceability-enforcer.py` to scan `Specifications/`.
- **Route to:** TheFixer
- **Cross-ref:** `[CROSS-REF: QO-007]` — same root cause (enforcer blind spot); same fix closes both

---

## §10 — Risk Matrix

```
                 Zero-precondition  Authenticated    Privileged       Admin          Physical
                 (any network user) (any valid user) (specific perms)
P1 Critical    │ DEP-001 (RCE)     │ DEP-003 (gRPC) │               │               │
               │ DEP-002 (ReDoS)   │                │               │               │
P2 High        │ DEP-005 (OOM)     │ QO-002 (arch)  │ QO-003        │               │
               │                   │ DEP-004 (Jest)  │ QO-004 (dup)  │               │
P3 Medium      │ DEP-006 (redirect)│ QO-001 (spec)  │ QO-007        │ DEP-008       │
               │ DEP-009 (QS DoS)  │ DEP-010 (build)│ DEP-007 (dev) │ QO-005        │
P4 Low         │                   │                │               │ DEP-011       │
               │                   │                │               │ DEP-012       │
```

**Exploitability scale:** Zero-precondition = any network user (no auth). Authenticated = valid credentials. Privileged = specific permissions. Admin = superuser. Physical = hardware access.

---

## §11 — Spec Coverage

| Namespace | Source | FR Count | Traced | Coverage |
|-----------|--------|----------|--------|----------|
| FR-001–FR-069 + FR-dependency-* | `Specifications/dev-workflow-platform.md` | 92 | portal/ (70), Source/ (17) | **76%** (22 untraced) |
| FR-WF-001–FR-WF-013 | `Plans/self-judging-workflow/requirements.md` | 13 | Source/ (13) | **100%** ✅ |

**Top 10 uncovered requirements (Specifications/ namespace):**

| FR ID | Description | Status |
|-------|-------------|--------|
| `FR-dependency-seed` | Idempotent seed data for dependency graph | Unimplemented (QO-005) |
| FR-050 – FR-069 (subset) | Portal features partially traced; 22 FRs total missing from any `// Verifies:` comment | Untraced |

> Note: The 22 untraced FRs are all in the portal/ domain. The enforcer gap (QO-007) means this count can silently grow without CI failure.

---

## §12 — Latency Baselines

Performance profiler skipped — backend service offline. No latency measurements collected.

**Budget reference** (from `inspector.config.yml`) for next profiler run:

| Endpoint | p95 budget | p99 budget | Measured | Status |
|----------|------------|------------|----------|--------|
| `GET /api/work-items` | 100 ms | 500 ms | — | Not measured |
| `GET /api/dashboard` | 150 ms | 500 ms | — | Not measured |
| All others | 200 ms | 500 ms | — | Not measured |

Static analysis flag: unbounded Map iteration on `GET /api/work-items` (no slice/limit). Review in next profiler run.

---

## §13 — P2 Findings

| ID | Category | Title | File | Status |
|----|----------|-------|------|--------|
| QO-002 | architecture | Route handlers bypass service layer — direct store calls in 3 files | `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts` | 🆕 NEW |
| QO-003 | spec-drift | `teamDispatches.ts` — unspecified feature, zero traceability | `portal/Backend/src/routes/teamDispatches.ts` | 🆕 NEW |
| QO-004 | test-coverage | Duplicate frontend test files in root and `tests/pages/` | `Source/Frontend/tests/` | 🆕 NEW |
| DEP-002 | CVE / ReDoS | path-to-regexp ReDoS CVSS 7.5 — orchestrator DoS via crafted URL | `platform/orchestrator/package.json` | 🆕 NEW |
| DEP-003 | CVE / DoS + TLS | @grpc/grpc-js crashes + cert bypass (3 CVEs, CVSS 7.5) | `platform/orchestrator/package.json` | 🆕 NEW |
| DEP-004 | CVE / dev-deps | Jest 29.x: 10+ HIGH CVEs in Backend CI environment | `Source/Backend/package.json` | 🆕 NEW |
| DEP-005 | CVE / OOM | Browserslist OOM — frontend build memory leak CVSS 7.5 | `Source/Frontend/package.json` | 🆕 NEW |

---

## §14 — Fixed Findings

First audit — no prior findings. Nothing to mark fixed.

---

## §15 — Recommendations

### 🚫 Block Deployment

- **DEP-001** — `cd platform/orchestrator && npm update @grpc/grpc-js` then escalate to TheGuardians for security review. RCE CVSS 9.8. Do not merge or deploy orchestrator changes until cleared.
- **DEP-002 + DEP-003 + DEP-009 + DEP-012** — `cd platform/orchestrator && npm update express @grpc/grpc-js`. Clears ReDoS, gRPC crashes, QS DoS, body-parser bypass. Single command, run before any orchestrator deployment.

### 🏃 This Sprint

- **QO-001 + QO-007** — Promote `Plans/self-judging-workflow/requirements.md` to `Specifications/workflow-engine-spec.md`. Extend enforcer to scan `Specifications/`. Restores spec-first guarantee.
- **QO-002** — Create `Source/Backend/src/services/workItemsService.ts`. Refactor 3 route files to call services only. Thin HTTP adapters: parse → call service → serialize.
- **DEP-004** — `cd Source/Backend && npm update jest` (→ ≥30.5.2). Clears 10+ HIGH CVEs from CI.
- **DEP-005** — `cd Source/Frontend && npm update browserslist`. Prevents build OOM.
- **QO-004** — Delete `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` (root-level duplicates). Keep `tests/pages/` versions.

### 📅 Next Sprint

- **QO-003** — Add `teamDispatch` as formal FR in `Specifications/dev-workflow-platform.md`. Add Verifies comments to `teamDispatches.ts`.
- **DEP-006** — `cd Source/Frontend && npm update react-router-dom` (→ @remix-run/router ≥1.23.3). Fixes open redirect.
- **DEP-007** — `cd Source/Frontend && npm update vitest` (→ ≥5.0.3). Fixes dev environment path traversal.
- **DEP-008 + DEP-010** — `npm update uuid baseline-browser-mapping` in frontend and orchestrator.
- **QO-006** — Audit two `eslint-disable react-hooks/exhaustive-deps` suppressions in `useWorkItems.ts:63` and `DependencyPicker.tsx:82`. Fix root cause or document reasoning.

### 📋 Backlog

- **QO-005** — Implement `FR-dependency-seed` in `portal/Backend` or mark deferred in spec with rationale.
- **DEP-011 + DEP-012** — `npm update @babel/core` (≥7.30.0) and body-parser (via express). Low severity.
- **Major version upgrades** — React 18→19, Express 4→5, Pino 8→10, Dockerode 4→5. Plan as separate PRs.
- **CI/CD gate** — Add `npm audit --production` to pre-merge checks for Source/Backend, Source/Frontend, platform/orchestrator.
- **Dynamic audit** — Re-run performance-profiler and chaos-monkey when services are live. Collect latency baselines and fault-injection results.

---

## §16 — P3/P4 Summary

| ID | Sev | Category | Title | File | Status |
|----|-----|----------|-------|------|--------|
| QO-005 | P3 | spec-drift | FR-dependency-seed unimplemented | `Specifications/dev-workflow-platform.md:475` | 🆕 NEW |
| QO-006 | P3 | pattern-violation | eslint-disable suppressing hook exhaustive-deps (×2) | `useWorkItems.ts:63`, `DependencyPicker.tsx:82` | 🆕 NEW |
| QO-007 | P3 | spec-drift | Traceability enforcer blind to Specifications/ | `tools/traceability-enforcer.py` | 🆕 NEW |
| DEP-006 | P3 | CVE / redirect | React Router open redirect (GHSA-2j2x-hqr9-3h42) | `Source/Frontend/package.json` | 🆕 NEW |
| DEP-007 | P3 | CVE / path traversal | @vitest/mocker arbitrary file read CVSS 5.9 (dev only) | `Source/Frontend/package.json` | 🆕 NEW |
| DEP-008 | P3 | CVE / buffer | UUID buffer bounds check missing (GHSA-w5hq-g745-h8pq) | `platform/orchestrator`, `Source/Frontend` | 🆕 NEW |
| DEP-009 | P3 | CVE / DoS ×3 | QS DoS (3 CVEs) via express transitive | `platform/orchestrator/package.json` | 🆕 NEW |
| DEP-010 | P3 | CVE / DoS | baseline-browser-mapping invalid input terminates build | `Source/Frontend/package.json` | 🆕 NEW |
| DEP-011 | P3 | CVE chain | Dockerode transitive UUID risk (major version behind) | `platform/orchestrator/package.json` | 🆕 NEW |
| DEP-012 | P4 | CVE / local | @babel/core arbitrary file read CVSS 3.2 (local only) | Backend, Frontend | 🆕 NEW |
| DEP-013 | P4 | CVE / DoS | body-parser invalid limit disables size enforcement | `platform/orchestrator/package.json` | 🆕 NEW |

---

## JSON Bug Backlog

> Full machine-readable backlog: `Teams/TheInspector/findings/bug-backlog-2026-10-05.json`
> Full HTML report: `Teams/TheInspector/findings/audit-2026-10-05-C.html`

```json
{
  "audit_date": "2026-10-05",
  "grade": "C",
  "summary": {
    "p1_total": 2,
    "p2_total": 7,
    "p3_total": 9,
    "p4_total": 2,
    "total_findings": 20,
    "fixed_count": 0,
    "spec_coverage_pct": 76
  },
  "escalations": [
    {
      "id": "DEP-001",
      "severity": "P1",
      "title": "protobufjs Arbitrary Code Execution via @grpc/grpc-js (CVSS 9.8)",
      "escalate_to": "TheGuardians",
      "trigger": "injection",
      "file": "platform/orchestrator/package.json",
      "fix": "cd platform/orchestrator && npm update @grpc/grpc-js"
    }
  ],
  "backlog": [
    { "id": "QO-001", "severity": "P1", "title": "Source/ has no canonical Specification", "route_to": "TheFixer" },
    { "id": "QO-002", "severity": "P2", "title": "Route handlers bypass service layer", "route_to": "TheFixer" },
    { "id": "QO-003", "severity": "P2", "title": "teamDispatches.ts unspecified and untraced", "route_to": "TheFixer" },
    { "id": "QO-004", "severity": "P2", "title": "Duplicate frontend test files", "route_to": "TheFixer" },
    { "id": "DEP-002", "severity": "P2", "title": "Path-to-Regexp ReDoS CVSS 7.5", "route_to": "TheFixer" },
    { "id": "DEP-003", "severity": "P2", "title": "@grpc/grpc-js crashes + cert bypass (3 CVEs)", "route_to": "TheFixer" },
    { "id": "DEP-004", "severity": "P2", "title": "Jest 29.x 10+ HIGH CVEs in Backend CI", "route_to": "TheFixer" },
    { "id": "DEP-005", "severity": "P2", "title": "Browserslist OOM CVSS 7.5", "route_to": "TheFixer" },
    { "id": "QO-005", "severity": "P3", "title": "FR-dependency-seed unimplemented", "route_to": "TheFixer" },
    { "id": "QO-006", "severity": "P3", "title": "eslint-disable suppressing hook exhaustive-deps ×2", "route_to": "TheFixer" },
    { "id": "QO-007", "severity": "P3", "title": "Traceability enforcer blind to Specifications/", "route_to": "TheFixer" },
    { "id": "DEP-006", "severity": "P3", "title": "React Router open redirect", "route_to": "TheFixer" },
    { "id": "DEP-007", "severity": "P3", "title": "@vitest/mocker path traversal CVSS 5.9", "route_to": "TheFixer" },
    { "id": "DEP-008", "severity": "P3", "title": "UUID buffer bounds check missing", "route_to": "TheFixer" },
    { "id": "DEP-009", "severity": "P3", "title": "QS DoS × 3 CVEs", "route_to": "TheFixer" },
    { "id": "DEP-010", "severity": "P3", "title": "baseline-browser-mapping DoS", "route_to": "TheFixer" },
    { "id": "DEP-011", "severity": "P3", "title": "Dockerode transitive UUID risk", "route_to": "TheFixer" },
    { "id": "DEP-012", "severity": "P4", "title": "@babel/core arbitrary file read CVSS 3.2", "route_to": "TheFixer" },
    { "id": "DEP-013", "severity": "P4", "title": "body-parser invalid limit DoS", "route_to": "TheFixer" }
  ]
}
```

---

*TheInspector · run-20261005-085538 · 2026-10-05 · Grade C*
*Specialists: quality-oracle, dependency-auditor · Next audit: 2026-11-05*
