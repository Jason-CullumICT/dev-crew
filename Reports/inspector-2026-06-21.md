# TheInspector Audit Report

**Grade: D** | **Date:** 2026-06-21 | **Run ID:** `run-20260621-070741`
**Branch:** `audit/inspector-2026-06-21-c82703` | **Scope:** Full codebase (first audit)
**HTML Report:** `Teams/TheInspector/findings/audit-2026-06-21-D.html`
**Bug Backlog:** `Teams/TheInspector/findings/bug-backlog-2026-06-21.json`

---

## Grade Rationale

| Threshold | Requirement | Actual | Result |
|-----------|------------|--------|--------|
| Grade A | Max 0 P1, max 3 P2, min 80% coverage | 4 P1, 11 P2 | FAIL |
| Grade B | Max 0 P1, max 8 P2, min 60% coverage | 4 P1, 11 P2 | FAIL |
| Grade C | Max 2 P1, max 15 P2, min 40% coverage | **4 P1** | FAIL |
| Grade D | Any P1 unresolved | 4 P1 present | **→ D** |

4 unresolved P1 findings place the project at **Grade D**. All four must be resolved before deployment proceeds.

---

## Scorecard

| Severity | Count | Specialists |
|----------|-------|-------------|
| **P1 Critical** | **4** | quality-oracle: 1 · dependency-auditor: 3 |
| **P2 High** | **11** | quality-oracle: 5 · dependency-auditor: 6 |
| **P3 Moderate** | **17** | quality-oracle: 3 · dependency-auditor: 14 |
| **P4 Low** | **1** | dependency-auditor: 1 |
| **Escalations → TheGuardians** | **4** | DEP-001, DEP-002, DEP-003, DEP-004 |
| **Total CVEs** | **40** | Across 1,807 transitive deps in 6 workspaces |
| **Source/ FR Coverage** | **87.5%** | FR-WF: 100% · FR-dependency: 87.5% |
| **FR-TMP Coverage** | **0%** | Tiered merge pipeline spec — unimplemented |
| **Performance Profiler** | NOT RUN | Backend service unavailable |
| **Chaos Monkey** | NOT RUN | Services unavailable |
| **Fixed Findings** | 0 | First audit — no baseline |

---

## P1 Findings — Block Deployment

### [ESCALATE → TheGuardians] DEP-001 — Vitest UI Server RCE
- **CVE:** GHSA-5xrq-8626-4rwp · CVSS 9.8
- **Package:** `vitest@2.0.5` — `Source/Frontend/package.json`
- **Risk:** Zero-precondition RCE. Any attacker on dev network reads and executes arbitrary files via the Vitest UI server.
- **Fix:** `npm update vitest` to ≥3.2.6 in Source/Frontend
- **Route:** TheGuardians (security assessment first)

### [ESCALATE → TheGuardians] DEP-002 — Protobufjs Arbitrary Code Execution
- **CVE:** GHSA-xq3m-2v4x-88gg · CVSS 9.8
- **Package:** `protobufjs@7.5.5` (transitive via `@opentelemetry/auto-instrumentations-node@0.40.0`) — `portal/Backend`
- **Risk:** Production RCE. Malformed protobuf message triggers code injection via property pollution.
- **Fix:** `npm update @opentelemetry/auto-instrumentations-node` to ≥0.77.0 in portal/Backend
- **Cross-ref:** Same fix closes DEP-003, DEP-007, DEP-009, DEP-013, DEP-022 (6 findings total)
- **Route:** TheGuardians (security assessment first)

### [ESCALATE → TheGuardians] DEP-003 — OpenTelemetry DoS (Process Crash)
- **CVE:** GHSA-q7rr-3cgh-j5r3 · CVSS 7.5
- **Package:** `@opentelemetry/sdk-node@0.47.0` — `portal/Backend`
- **Risk:** Zero-precondition DoS. One malformed HTTP request to `/metrics` crashes the entire portal/Backend process.
- **Fix:** Same OpenTelemetry upgrade as DEP-002
- **Route:** TheGuardians (security assessment first)

### QO-001 — Missing `/api/search` Route (Broken Feature)
- **File:** `Source/Backend/src/app.ts`
- **Risk:** `GET /api/search` is never registered in Express. DependencyPicker typeahead is silently broken in production. 5 search tests fail permanently.
- **Fix:** Implement search handler (filter store by title/description, exclude soft-deleted, return `{data: T[]}`). Register `app.use('/api/search', searchRouter)` in `app.ts`.
- **Route:** TheFixer

---

## P2 Findings — This Sprint

| ID | Title | File | Route |
|----|-------|------|-------|
| QO-002 | Route handlers bypass service layer | `routes/workItems.ts`, `intake.ts`, `workflow.ts` | TheFixer |
| QO-003 | `dependencyCheckDuration` histogram missing | `Source/Backend/src/metrics.ts` | TheFixer |
| QO-004 | Traceability enforcer critically narrow scope | `tools/traceability-enforcer.py` | TheFixer |
| QO-005 | FR-TMP-001–010: 0% implementation | `Specifications/tiered-merge-pipeline.md` | TheFixer |
| QO-006 | Duplicate frontend test files | `Source/Frontend/tests/WorkItem*.test.tsx` | TheFixer |
| DEP-004 | Form-Data CRLF Injection (GHSA-hmw2-7cc7-3qxx) | `form-data@4.0.5` | **[ESCALATE → TheGuardians]** |
| DEP-005 | Vite fs.deny Bypass (GHSA-fx2h-pf6j-xcff) | `vite@5.4.0` | TheFixer |
| DEP-006 | React Router Open Redirect (GHSA-2j2x-hqr9-3h42) | `react-router-dom@6.30.3` | TheFixer |
| DEP-007 | gRPC Server Crash from Malformed Requests | `@grpc/grpc-js@1.14.3` (portal/Backend) | TheFixer (cascades from DEP-002 fix) |
| DEP-008 | ws WebSocket Memory Exhaustion | `ws@8.20.1` (Source/Frontend) | TheFixer (cascades from DEP-005 fix) |
| DEP-009 | Path-to-Regexp ReDoS | `path-to-regexp@0.1.12` (portal/Backend) | TheFixer (cascades from DEP-002 fix) |

---

## Security Escalations

The following findings are flagged `[ESCALATE → TheGuardians]` per `inspector.config.yml` security triggers (injection, RCE, DoS on public endpoint):

1. **DEP-001** — Vitest UI RCE (supply-chain risk, dev network exposure)
2. **DEP-002** — Protobufjs RCE (production code execution)
3. **DEP-003** — OpenTelemetry DoS (zero-precondition /metrics crash)
4. **DEP-004** — Form-Data CRLF Injection (injection trigger)

---

⚠️ ESCALATION → TheGuardians
   Finding : 3 critical CVEs (RCE + DoS) in portal/Backend + Source/Frontend — GHSA-5xrq-8626-4rwp, GHSA-xq3m-2v4x-88gg, GHSA-q7rr-3cgh-j5r3
   Branch  : audit/inspector-2026-06-21-c82703
   When    : before next release; security assessment required before patching

   To trigger TheGuardians:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security P1 (QO-001) and all P2/P3 → TheFixer backlog (see bug-backlog-2026-06-21.json)

---

## Cross-Reference Map

Four root causes span multiple findings — fixing the root cause closes all child findings simultaneously:

| Root Cause | Findings | Single Fix | Impact |
|-----------|----------|-----------|--------|
| OpenTelemetry ecosystem outdated (0.40→0.77) | DEP-002, DEP-003, DEP-007, DEP-009, DEP-013, DEP-022 | `npm update @opentelemetry/auto-instrumentations-node@0.77.0` in portal/Backend | **2 P1 + 2 P2 + 2 P3 = 6 findings** |
| Vite/build toolchain outdated (5.4.0→5.4.3+) | DEP-005, DEP-008, DEP-012, DEP-015 | `npm update vite` in Source/Frontend | **2 P2 + 2 P3 = 4 findings** |
| Traceability enforcer scope too narrow | QO-004, QO-009 | Add `portal/` to `source_dirs`; add `--all-plans` flag in `traceability-enforcer.py` | **1 P2 + 1 P3 = 2 findings** |
| Missing observability implementation | QO-003, QO-007 | Add OTel SDK + histogram to `Source/Backend/src/app.ts` + `metrics.ts` | **1 P2 + 1 P3 = 2 findings** |

---

## Trend

First audit — no baseline. All 33 findings are NEW. Grade comparison will be available on the next run.

---

## Specialist Modes

| Specialist | Mode | Verdict | Notes |
|-----------|------|---------|-------|
| quality-oracle | Static | Grade C | Enforcer PASSED (narrow scope — misleading) |
| dependency-auditor | Static | Grade D | 40 CVEs; 4 critical |
| performance-profiler | NOT RUN | — | Backend unavailable |
| chaos-monkey | NOT RUN | — | Services unavailable |

---

## Recommendations Summary

**Block deployment:**
1. Route DEP-001/002/003 to TheGuardians; apply OTel upgrade after sign-off
2. Implement QO-001 (`/api/search` route)

**This sprint:**
- Update vitest (DEP-001), vite (DEP-005 cascade), form-data (DEP-004), react-router-dom (DEP-006)
- Extract `workItemService.ts` (QO-002)
- Add OTel SDK + histogram (QO-003 + QO-007)

**Next sprint:**
- Fix traceability enforcer scope (QO-004 + QO-009)
- Decide on FR-TMP spec: implement or formally defer (QO-005)
- Update ts-jest, uuid, express patch (DEP-010, DEP-011, DEP-014)
- Delete duplicate test files (QO-006)

**Backlog (before next major release):**
- Plan Express v5, React v19, React Router v7, Pino v10, Multer v2 migrations
- Add `npm audit` to CI/CD pipeline
- Re-run audit with live services (performance + chaos testing pending)
