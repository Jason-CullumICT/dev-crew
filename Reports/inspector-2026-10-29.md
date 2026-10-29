# TheInspector Audit — 2026-10-29

## Overall Grade: **D** 🟠

> **Reason:** 6 P1 findings (exceeds Grade C threshold of max_p1=2). Immediate action required before next deployment.

---

## Scoring Summary

| Metric | Value | Grade Threshold |
|--------|-------|-----------------|
| **P1 findings** | **6** | C=2, B=0, A=0 |
| **P2 findings** | **13** | C≤15, B≤8, A≤3 |
| **Spec coverage (effective)** | **62%** | C≥40%, B≥60%, A≥80% |
| **P3 findings** | 70 | — |
| **P4 findings** | 23 | — |

---

## 🚨 ESCALATION → TheGuardians (5 Critical CVEs)

**Action required immediately — before next release.**

| ID | Package | Vuln | CVSS | Scope |
|----|---------|------|------|-------|
| DEP-C001 | proxy-addr | IP spoofing via IPv4-mapped IPv6 (GHSA-jqcg-44mw-7w3h) | 7.5 | All backends |
| DEP-C002 | tinypool | Prototype pollution → RCE (GHSA-5gmw-xhrv-c9v3) | **9.8** | Frontend, Portal |
| DEP-C003 | vitest | Arbitrary file read/execute in dev UI | 8.1 | Portal (dev) |
| DEP-C004 | protobufjs | Arbitrary code execution via malformed .proto | 9.8 | Portal, Orchestrator |
| DEP-C005 | handlebars | SSTI via AST type confusion (GHSA-3mfm-83xf-c92r) | 7.2 | Source/Backend |

**→ Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).**

---

## Specialist Results

| Specialist | Mode | Grade | P1 | P2 | P3 | P4 |
|-----------|------|-------|----|----|----|----|
| quality-oracle | Static | C | 1 | 4 | 3 | 0 |
| dependency-auditor | Static | **CRITICAL** | 5 | 9 | 67 | 23 |
| performance-profiler | Skipped (services offline) | — | — | — | — | — |
| chaos-monkey | Skipped (services offline) | — | — | — | — | — |

---

## P1 Findings

### QO-001 — WorkItemStatus enum missing `pending_dependencies` [→ TheFixer]
- **File:** `Source/Shared/types/workflow.ts:5`
- **Impact:** Approving a blocked work item silently succeeds; dispatch then returns HTTP 400. Dependency workflow is broken.
- **Fix:** Add `PendingDependencies = 'pending_dependencies'` to enum; add approve→pendingDependencies guard in `workflow.ts`; cascade in `dependency.ts`.

### DEP-C001 — proxy-addr IP Spoofing [→ TheGuardians]
- All Express backends: `npm update proxy-addr` to v2.1.2+.

### DEP-C002 — tinypool RCE CVSS 9.8 [→ TheGuardians]
- Source/Frontend, portal packages: `npm update tinypool` to v1.1.0+.

### DEP-C003 — vitest file read/execute in dev server [→ TheGuardians]
- portal packages: `npm update vitest`; disable `--ui` in CI.

### DEP-C004 — protobufjs arbitrary code execution [→ TheGuardians]
- portal/Backend, platform/orchestrator: `npm update protobufjs`.

### DEP-C005 — handlebars SSTI [→ TheGuardians]
- Source/Backend: `npm update handlebars` to v4.7.9+.

---

## Key P2 Findings

| ID | Title | Route |
|----|-------|-------|
| QO-002 | `dependencyCheckDuration` histogram missing from metrics.ts | TheFixer |
| QO-003 | BlockedBadge missing amber state for pending_dependencies | TheFixer (after QO-001) |
| QO-004 | tiered-merge-pipeline.md — 10 FRs orphaned, no plan | TheFixer |
| QO-005 | Traceability enforcer only scans most-recent plan | TheFixer |
| DEP-H009 | Vite path traversal — DIRECT dep — **URGENT** | TheFixer |
| DEP-H001-H008 | 8 high-severity CVEs (DoS, XSS, CRLF injection) | TheFixer |

---

## Cross-Reference Map

| Root Cause | Findings Affected | Single Fix |
|------------|------------------|-----------|
| Missing `pending_dependencies` WorkItemStatus | QO-001, QO-003 | Add enum value + approve handler guard |
| Observability gap (no histogram, no OTel) | QO-002, QO-007 | One backend instrumentation PR |
| No automated dep update policy or SCA | DEP-C001–C005, DEP-H001–H009, DEP-M001 | Enable Dependabot + `npm audit` CI gate |
| Traceability enforcer scans single plan | QO-005, QO-004 | Update CLAUDE.md gate + add plan entry |

---

## Recommendations

### 🚫 Block Deployment
1. Escalate DEP-C001–C005 to TheGuardians before next release
2. Fix QO-001 (broken dependency approval workflow)
3. Update proxy-addr everywhere (IP spoofing bypass)
4. Update tinypool (CVSS 9.8 RCE)

### 🏃 This Sprint
5. Update vite to ^5.5.0+ — direct dependency path traversal (DEP-H009)
6. Update handlebars, protobufjs, vitest to patched versions
7. Add `dependencyCheckDuration` histogram to metrics.ts (QO-002)
8. Fix BlockedBadge amber state (QO-003, after QO-001)
9. Update CLAUDE.md traceability gate to cover both plans (QO-005)

### 📅 Next Sprint
10. Add OpenTelemetry to Source/Backend (QO-007)
11. Create Plans/tiered-merge-pipeline/ or mark spec Deferred (QO-004)
12. Delete duplicate test files (QO-006)
13. Add `npm audit --audit-level=high` to CI pipeline

### 📋 Backlog
14. Add rationale to eslint-disable comments (QO-008)
15. Enable Dependabot for automated dep updates (30-day max lag policy)
16. Resolve 67 moderate + 23 low CVEs in batch update pass
17. Re-run audit with services online for dynamic profiling + chaos testing

---

## Deliverables

| Artifact | Path |
|---------|------|
| Full HTML report (16 sections) | `Teams/TheInspector/findings/audit-2026-10-29-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-10-29.json` |
| This summary | `inspector-report.md` |

---

## Escalation Notice

```
⚠  ESCALATION → TheGuardians
   Finding : 5 critical CVEs (proxy-addr IP spoofing, tinypool RCE CVSS 9.8,
             vitest file read/execute, protobufjs RCE, handlebars SSTI)
   Branch  : audit/inspector-2026-10-29-84f012
   When    : before next release

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see report)
```

_Generated by TheInspector · 2026-10-29 · First audit (no prior baseline)_
