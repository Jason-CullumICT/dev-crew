# TheInspector — Health Report Summary

**Audit ID:** `inspector-2026-07-08`
**Date:** 2026-07-08
**Branch:** `audit/inspector-2026-07-08-af2a95`
**Overall Grade:** **D**
**Specialists:** quality-oracle (static), dependency-auditor (static) | performance-profiler & chaos-monkey skipped (services offline)

---

## Grade: D

| Threshold | Requirement | Actual | Pass? |
|-----------|-------------|--------|-------|
| Grade A | max_p1: 0, max_p2: 3, min_coverage: 80% | P1: 3, P2: 8, Coverage: 100% | ❌ |
| Grade B | max_p1: 0, max_p2: 8, min_coverage: 60% | P1: 3 | ❌ (has P1s) |
| Grade C | max_p1: 2, max_p2: 15, min_coverage: 40% | P1: 3 | ❌ (3 > 2) |
| **Grade D** | Anything worse | **3 P1s** | ✅ |

---

## Scorecards

| Metric | Value |
|--------|-------|
| **P1 Critical** | 3 (all → TheGuardians) |
| **P2 High** | 8 (→ TheFixer) |
| **P3 Medium** | 9 (→ TheFixer) |
| **P4 Low** | 1 (→ TheFixer) |
| **Escalations → TheGuardians** | 3 |
| **Spec coverage (enforcer scope)** | 100% (13/13 FR-WF-*) |
| **Enforcer blind spots** | 11 FR-dependency-* untracked |
| **Fixed since prior audit** | N/A (first audit) |

---

## ⚠ ESCALATION → TheGuardians

Three P1 findings trigger the "injection" security escalation rule. **Patch within 24 hours.**

| ID | Finding | CVSS | Projects | Fix |
|----|---------|------|----------|-----|
| DEP-001 | Handlebars JavaScript injection (8 CVEs) | 9.8 | Source/Backend, Source/Frontend | `npm install handlebars@^4.7.9` |
| DEP-002 | protobufjs RCE & prototype pollution (11 CVEs) | 9.8 | portal/Backend, platform/orchestrator | `npm install protobufjs@^7.7.0` |
| DEP-003 | Vitest UI arbitrary file read/execute | 9.8 | Source/Frontend, portal/Backend, portal/Frontend | `npm install vitest@^3.2.6 --save-dev` |

To trigger TheGuardians: Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

---

## P2 Findings → TheFixer

| ID | Source | Title | Category |
|----|--------|-------|----------|
| QO-001 | quality-oracle | Direct store access from route handlers (workItems, workflow, intake) | architecture-violation |
| QO-002 | quality-oracle | GET /api/search not wired — FR-dependency-search unimplemented | spec-drift |
| QO-003 | quality-oracle | Missing dependencyCheckDuration histogram metric | spec-drift |
| QO-004 | quality-oracle | Traceability enforcer blind to 11 FR-dependency-* requirements | spec-drift |
| DEP-004 | dependency-auditor | form-data CRLF Injection (CVSS 7.5) — 3 projects | dependency-vulnerability |
| DEP-005 | dependency-auditor | Vite server.fs.deny path traversal bypass | dependency-vulnerability |
| DEP-006 | dependency-auditor | @grpc/grpc-js DoS via malformed compressed messages | dependency-vulnerability |
| DEP-007 | dependency-auditor | OpenTelemetry stack 173 majors behind, 46 moderate CVEs (portal/Backend) | dependency-vulnerability |

---

## P3/P4 Findings → TheFixer

| ID | Title |
|----|-------|
| QO-005 | Dual logger abstraction with incompatible calling conventions |
| QO-006 | Duplicate frontend test files at two directory locations |
| QO-007 | OpenTelemetry tracing absent from Source/Backend (CLAUDE.md mandate) |
| QO-008 | eslint-disable suppressions without justification (DependencyPicker, useWorkItems) |
| DEP-008 | 69 moderate CVEs across 5 npm projects |
| DEP-009 | 3 low-severity CVEs |

---

## Cross-Reference Map (Key Root Causes)

| Root Cause | Affected Findings | Single Fix |
|------------|-------------------|-----------|
| No CI dependency scanning | DEP-001–009 | Add `npm audit --audit-level=high` to CI gate |
| requirements.md incomplete | QO-002, QO-004 | Add 11 FR-dependency-* to requirements.md |
| Service layer bypass | QO-001 (3 routes) | Extract workItemService.ts |
| OTel coordination gap | QO-007, DEP-007 | Add OTel to Source/Backend; upgrade portal/Backend stack |

---

## Report Artifacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-07-08-D.html` | Full HTML report with all 16 mandatory sections |
| `Teams/TheInspector/findings/bug-backlog-2026-07-08.json` | Structured bug backlog (escalations array + p1/p2/p3/p4 finding arrays) |
| `Teams/TheInspector/findings/dependency-audit.md` | Full dependency audit detail (from dependency-auditor) |
| `Teams/TheInspector/findings/dependency-audit-summary.json` | Dependency audit machine-readable summary |

---

## Prior Audit Comparison

**First audit — no baseline.** All 21 findings are NEW. Next audit (recommended: 2026-07-22) will show FIXED / STILL OPEN / REGRESSED / NEW deltas.
