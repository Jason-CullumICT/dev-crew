# TheInspector — System Health Audit Report

**Audit ID:** `run-20260805-052732`  
**Date:** 2026-08-05  
**Project:** dev-crew Source App (Express REST API + React SPA)  
**Branch:** main  
**Scope:** Full codebase (first audit — no baseline)

---

## 🔴 Overall Grade: D

> **Grade D** — 5 P1 findings (threshold: max 2 for grade C).  
> **Do not deploy** until P1 security escalations are reviewed by TheGuardians.

| Metric | Value |
|--------|-------|
| P1 Critical | **5** |
| P2 High | **14** |
| P3 Medium | **30** |
| P4 Low | **0** |
| Fixed (vs prior) | 0 (first audit) |
| Spec coverage (Plans scope) | **100%** ✅ |
| Spec coverage (Specifications/) | **Unmeasured** — enforcer blind spot |
| Specialists run | quality-oracle, dependency-auditor (static) |
| Specialists skipped | performance-profiler, chaos-monkey (services offline) |

---

## ⚠ Security Escalation → TheGuardians

The following findings match security escalation triggers (`injection`, `auth bypass`) and **must be routed to TheGuardians** before any release:

| ID | Finding | CVSS | Trigger |
|----|---------|------|---------|
| DEP-001 | Handlebars.js RCE via template injection | **9.8** | injection |
| DEP-002 | Vitest arbitrary file read/execution via UI server | **9.8** | auth bypass |
| DEP-003 | UUID buffer overflow (memory corruption) | 7.5 | injection |
| DEP-004 | Portal/Backend — 54 CVEs (2 critical, 9 high) | — | injection |
| DEP-009 | React-Router-DOM open redirect / XSS | 6.9 | injection |

---

## Executive Summary (Top 5 Operator Findings)

1. **Do not deploy.** Two CVSS 9.8 vulnerabilities exist in production and build-time dependencies (Handlebars.js RCE, Vitest arbitrary execution). TheGuardians must review before any release.
2. **DependencyPicker search is silently broken in production.** `GET /api/search` is never mounted in `app.ts` — every search request returns 404. The frontend swallows it silently; users see an empty picker with no error.
3. **The spec coverage gate passes on a narrow target.** The enforcer scores 100% but only against 29 IDs in `Plans/`. The 79+ FRs in `Specifications/` are completely outside enforcer scope — true coverage is unmeasured.
4. **Portal/Backend is the highest-risk component.** 54 CVEs (2 critical, 9 high) across 578 transitive dependencies. Infrastructure compromise = full system compromise.
5. **State machine contract is silently broken.** `pending_dependencies` is documented in the API contract and `api-contracts.md` but absent from `WorkItemStatus` enum. Any consumer branching on that status value will never match.

---

## Specialist Findings

### Quality Oracle (Static)

| ID | Severity | Category | Title | File |
|----|----------|----------|-------|------|
| QO-001 | **P1** | spec-drift | `GET /api/search` not mounted in `app.ts` | `Source/Backend/src/app.ts` |
| QO-002 | P2 | spec-drift | `pending_dependencies` absent from `WorkItemStatus` enum | `Source/Shared/types/workflow.ts` |
| QO-003 | P2 | spec-drift | `dependencyCheckDuration` histogram missing from metrics | `Source/Backend/src/metrics.ts` |
| QO-004 | P2 | arch-violation | Traceability enforcer does not scan `Specifications/` | `tools/traceability-enforcer.py:57` |
| QO-005 | P3 | pattern-violation | `eslint-disable` exhaustive-deps in 2 files (stale closure risk) | `useWorkItems.ts:63`, `DependencyPicker.tsx:82` |
| QO-006 | P3 | pattern-violation | Silent JSON parse error swallow in `api/client.ts` | `Source/Frontend/src/api/client.ts:26` |
| QO-007 | P3 | hygiene | `DebugPortalPage.tsx` uses non-FR Verifies comment | `Source/Frontend/src/pages/DebugPortalPage.tsx:1` |
| QO-008 | P3 | doc-stale | `workflow-engine.md` defines no FR IDs | `Specifications/workflow-engine.md` |

**Positives:** All 29 enforcer-scoped FRs fully traced · No `console.log` in production · No hardcoded secrets · No empty catch blocks in backend · All backend catch blocks log with full context.

### Dependency Auditor (Static)

| ID | Severity | Package | CVE / CVSS | Route |
|----|----------|---------|-----------|-------|
| DEP-001 | **P1** `[ESCALATE → TheGuardians]` | handlebars ≤4.7.8 | 5 CVEs · CVSS 9.8 | TheGuardians |
| DEP-002 | **P1** `[ESCALATE → TheGuardians]` | vitest ≤3.2.5 | GHSA-5xrq-8626-4rwp · CVSS 9.8 | TheGuardians |
| DEP-003 | **P1** `[ESCALATE → TheGuardians]` | uuid 9.0.0 | GHSA-w5hq-g745-h8pq · CVSS 7.5 | TheGuardians |
| DEP-004 | **P1** `[ESCALATE → TheGuardians]` | portal/Backend (54 CVEs) | 2 critical · 9 high · 43 medium | TheGuardians |
| DEP-005 | P2 | brace-expansion | GHSA-3jxr-9vmj-r5cp · CVSS 6.5 | TheFixer |
| DEP-008 | P2 | esbuild | GHSA-67mh-4wv8-2f99 · CVSS 6.8 | TheFixer |
| DEP-009 | P2 `[ESCALATE → TheGuardians]` | react-router-dom 6.26.0 | 2 CVEs · CVSS 6.9 | TheGuardians |
| DEP-010 | P2 | ws 8.0.0–8.20.1 | GHSA-96hv-2xvq-fx4p · CVSS 7.5 | TheFixer |
| DEP-HIGH×7 | P2 | portal/Backend + transitive | 7 additional high CVEs | TheFixer |
| DEP-MED×24 | P3 | All projects | 24 medium CVEs | TheFixer |
| DEP-LOW×2 | P3 | All projects | 2 low CVEs | TheFixer |

**Source/E2E is clean** — zero CVEs ✅

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix |
|-----------|----------|-----------|
| Dependency hygiene (no update cadence) | DEP-001 through DEP-010 + 7 more | Adopt Dependabot/Renovate; `npm audit fix`; block CI on critical/high |
| Spec-implementation gap | QO-001, QO-002, QO-003 | Dedicated spec-gap sprint to wire missing route, enum value, and metric |
| Traceability tooling scope | QO-004, QO-007, QO-008 | Extend enforcer to `Specifications/`; backfill FR IDs in `workflow-engine.md` |
| Silent error suppression | QO-005, QO-006 | Fix underlying hooks deps; replace silent catch with documented pattern |

---

## Recommendations

### 🚫 Block Deployment
- Escalate DEP-001, DEP-002, DEP-003, DEP-004, DEP-009 to TheGuardians. Do not release until reviewed.
- Fix QO-001: mount `GET /api/search` in `app.ts` — feature silently broken in production.

### 🔧 This Sprint
- `npm audit fix --audit-level=critical` across all 5 projects.
- Update: `uuid → 14.x`, `handlebars → latest`, `vitest → latest`, `react-router-dom → 7`.
- Fix QO-002: add `PendingDependencies` to `WorkItemStatus` enum (or amend `api-contracts.md`).
- Fix QO-003: add `dependency_check_duration_seconds` Histogram to `metrics.ts`.

### 📅 Next Sprint
- Fix QO-004: extend traceability enforcer to scan `Specifications/`.
- Migrate `express 4 → 5` in Source/Backend.
- Remediate DEP-005, DEP-008, DEP-010 via `npm audit fix`.
- Fix QO-005 (exhaustive-deps) and QO-006 (silent catch).

### 📋 Backlog
- QO-007: assign formal FR ID to `DebugPortalPage.tsx` or remove file.
- QO-008: backfill `FR-WF-XXX` IDs into `Specifications/workflow-engine.md`.
- Adopt Dependabot for automated dependency PRs.
- Plan React v19 and pino v10 migrations.
- Run performance-profiler and chaos-monkey in live environment to establish baselines.

---

## Trend

First audit — no baseline. All 49 findings classified **NEW**.  
Run next audit after remediation sprint to establish trend.

---

## Report Artifacts

| File | Description |
|------|-------------|
| [`Teams/TheInspector/findings/audit-2026-08-05-D.html`](Teams/TheInspector/findings/audit-2026-08-05-D.html) | Full interactive HTML report (16 sections, risk matrix, charts) |
| [`Teams/TheInspector/findings/bug-backlog-2026-08-05.json`](Teams/TheInspector/findings/bug-backlog-2026-08-05.json) | Machine-readable bug backlog with escalations array |
| [`Teams/TheInspector/findings/dependency-audit-2026-08-05.md`](Teams/TheInspector/findings/dependency-audit-2026-08-05.md) | Full dependency audit with all CVE details |
| [`Teams/TheInspector/findings/dependency-audit-2026-08-05.json`](Teams/TheInspector/findings/dependency-audit-2026-08-05.json) | Dependency audit machine-readable data |

---

## JSON Bug Backlog

```json
{
  "audit_id": "run-20260805-052732",
  "audit_date": "2026-08-05",
  "overall_grade": "D",
  "p1_total": 5,
  "p2_total": 14,
  "p3_total": 30,
  "escalations": [
    { "id": "DEP-001", "severity": "P1", "trigger": "injection",   "route_to": "TheGuardians", "cvss": 9.8, "package": "handlebars" },
    { "id": "DEP-002", "severity": "P1", "trigger": "auth bypass", "route_to": "TheGuardians", "cvss": 9.8, "package": "vitest" },
    { "id": "DEP-003", "severity": "P1", "trigger": "injection",   "route_to": "TheGuardians", "cvss": 7.5, "package": "uuid" },
    { "id": "DEP-004", "severity": "P1", "trigger": "injection",   "route_to": "TheGuardians", "note": "portal/Backend 54 CVEs" },
    { "id": "DEP-009", "severity": "P2", "trigger": "injection",   "route_to": "TheGuardians", "cvss": 6.9, "package": "react-router-dom" }
  ],
  "backlog": [
    { "id": "QO-001",       "severity": "P1", "title": "GET /api/search not mounted in app.ts",              "route_to": "TheFixer" },
    { "id": "QO-002",       "severity": "P2", "title": "pending_dependencies absent from WorkItemStatus",    "route_to": "TheFixer" },
    { "id": "QO-003",       "severity": "P2", "title": "dependencyCheckDuration histogram missing",          "route_to": "TheFixer" },
    { "id": "QO-004",       "severity": "P2", "title": "Enforcer does not scan Specifications/",             "route_to": "TheFixer" },
    { "id": "DEP-005",      "severity": "P2", "title": "brace-expansion DoS (CVSS 6.5)",                    "route_to": "TheFixer" },
    { "id": "DEP-008",      "severity": "P2", "title": "esbuild CORS bypass (CVSS 6.8)",                    "route_to": "TheFixer" },
    { "id": "DEP-010",      "severity": "P2", "title": "ws memory exhaustion DoS (CVSS 7.5)",               "route_to": "TheFixer" },
    { "id": "DEP-HIGH×7",   "severity": "P2", "title": "7 additional high CVEs (portal/Backend)",           "route_to": "TheFixer" },
    { "id": "QO-005",       "severity": "P3", "title": "eslint-disable exhaustive-deps (2 files)",          "route_to": "TheFixer" },
    { "id": "QO-006",       "severity": "P3", "title": "Silent JSON parse catch in api/client.ts",          "route_to": "TheFixer" },
    { "id": "QO-007",       "severity": "P3", "title": "DebugPortalPage non-FR Verifies comment",           "route_to": "TheFixer" },
    { "id": "QO-008",       "severity": "P3", "title": "workflow-engine.md has no FR IDs",                  "route_to": "TheFixer" },
    { "id": "DEP-MED×24",   "severity": "P3", "title": "24 medium CVEs across all projects",               "route_to": "TheFixer" },
    { "id": "DEP-LOW×2",    "severity": "P3", "title": "2 low CVEs across projects",                        "route_to": "TheFixer" }
  ]
}
```
