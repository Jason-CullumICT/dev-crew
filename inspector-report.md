# TheInspector Health Report — 2026-06-28

## Grade: D 🟠

**Run:** `run-20260628-063513` · **Branch:** `audit/inspector-2026-06-28-d0e657`  
**Specialists:** quality-oracle (static), dependency-auditor (static)  
**Skipped:** performance-profiler, chaos-monkey (services offline)

---

## Scorecard

| Metric | Value |
|--------|-------|
| **Overall Grade** | **D** |
| P1 Findings | 4 |
| P2 Findings | 11 |
| P3 Findings | 5 |
| P4 Findings | 1 |
| Security Escalations → TheGuardians | 3 |
| Spec Coverage (Source/) | 79% (22/28 compliant) |
| Fixed Since Prior Audit | 0 (first audit) |

**Grade rationale:** 4 P1 findings exceeds Grade C threshold (max_p1=2). Grade D applies per `inspector.config.yml`.

---

## ⚠ Security Escalation → TheGuardians

Three exploitable CVEs must be reviewed by TheGuardians before the next deployment:

| ID | Finding | CVSS | Trigger |
|----|---------|------|---------|
| DEP-001 | protobufjs — RCE via crafted protobuf messages | 9.8 | RCE, zero-precondition |
| DEP-002 | Vitest UI — arbitrary `.env` file read | 8.1 | Sensitive data exposed |
| DEP-003 | Handlebars.js — JavaScript injection via template | 9.6 | Injection |

```
⚠  ESCALATION → TheGuardians
   Finding : 3 exploitable CVEs — protobufjs RCE (CVSS 9.8), Vitest arbitrary file read (CVSS 8.1), Handlebars.js JS injection (CVSS 9.6)
   Branch  : audit/inspector-2026-06-28-d0e657
   When    : before next release, or wait for the scheduled security run

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see report)
```

---

## Executive Summary

1. **Three exploitable security vulnerabilities (P1) block deployment.** `protobufjs` (RCE, CVSS 9.8), `Handlebars.js` (injection, CVSS 9.6), and `Vitest` (arbitrary file read, CVSS 8.1) are present. Escalated to TheGuardians.

2. **`GET /api/search` returns 404 in production (P1).** The `DependencyPicker` typeahead is broken. A complete test suite exists — only the route registration in `app.ts` is missing.

3. **`pending_dependencies` workflow status is a ghost (2 P2s).** Referenced in spec, absent from `WorkItemStatus` enum. `BlockedBadge` has no amber state; dispatch-gating returns 400 instead of a status transition. One coordinated PR fixes both.

4. **@opentelemetry suite is 6+ major versions behind (1 P1 + 3 P2).** Upgrading `@opentelemetry/auto-instrumentations-node → 0.77.0+` resolves all four in a single PR.

5. **Traceability enforcer covers only one plan (P2).** This is how the missing search route slipped through undetected. Two-line CI fix closes the blind spot.

---

## P1 Findings

| ID | Title | Source | Fix |
|----|-------|--------|-----|
| DEP-001 | protobufjs RCE (CVSS 9.8) | dependency-auditor | Upgrade @opentelemetry/auto-instrumentations-node → 0.77.0+ |
| DEP-002 | Vitest arbitrary file read (CVSS 8.1) | dependency-auditor | Upgrade vitest → 2.3.0+ (frontend), 1.7.0+ (backend) |
| DEP-003 | Handlebars.js JS injection (CVSS 9.6) | dependency-auditor | Upgrade ts-jest → 27.0.3+ |
| QO-001 | GET /api/search not registered in app.ts | quality-oracle | Create + register search route (test suite ready) |

---

## P2 Findings (11 total)

| ID | Title | Source | Route |
|----|-------|--------|-------|
| QO-002 | dependencyCheckDuration Histogram missing | quality-oracle | TheFixer |
| QO-003 | BlockedBadge missing pending_dependencies state | quality-oracle | TheFixer |
| QO-004 | dispatch-gating returns 400 not status transition | quality-oracle | TheFixer |
| QO-005 | Traceability enforcer targets one plan only | quality-oracle | solo-session |
| QO-008 | portal/ missing api-types + seed.ts | quality-oracle | TheFixer |
| DEP-004 | OpenTelemetry Prometheus DoS | dependency-auditor | TheFixer |
| DEP-005 | OpenTelemetry memory exhaustion | dependency-auditor | TheFixer |
| DEP-006 | form-data CRLF injection | dependency-auditor | TheFixer |
| DEP-007 | React Router open redirect | dependency-auditor | TheFixer |
| DEP-008 | Vite path traversal / fs.deny bypass | dependency-auditor | TheFixer |
| DEP-009 | gRPC server crash on malformed requests | dependency-auditor | TheFixer |

---

## Cross-Reference Map

| Root Cause | Findings | Single Fix | Savings |
|-----------|---------|-----------|--------|
| `pending_dependencies` absent from WorkItemStatus | QO-003, QO-004 | Add enum value + update dispatch + extend badge | 2 P2 in 1 PR |
| @opentelemetry suite outdated | DEP-001, DEP-004, DEP-005, DEP-009 | Upgrade auto-instrumentations-node → 0.77.0+ | 1 P1 + 3 P2 in 1 upgrade |
| Enforcer scopes to one plan | QO-001, QO-005 | Run enforcer per plan in CI | 1 P1 + 1 P2 fixed |
| Vitest vulnerable across all workspaces | DEP-002 | Upgrade vitest in 3 workspaces | 1 P1 across 3 locations |

---

## Recommendations

### Block Deployment
1. Patch DEP-001/004/005/009: upgrade `@opentelemetry/auto-instrumentations-node → 0.77.0+`
2. Patch DEP-002: upgrade `vitest → 2.3.0+` / `1.7.0+`
3. Patch DEP-003: upgrade `ts-jest → 27.0.3+`
4. Fix QO-001: register `GET /api/search` in `app.ts`

### This Sprint
5. QO-003 + QO-004: add `pending_dependencies` status (one coordinated PR)
6. QO-005: fix traceability enforcer CI gates
7. DEP-006/007/008: upgrade form-data, react-router-dom, vite

### Next Sprint
8. QO-002: add dependencyCheckDuration Histogram
9. QO-008: TheFixer — portal/ types + seed.ts
10. Add `npm audit --audit-level=high` CI gate

---

## Deliverables

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-06-28-D.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-06-28.json` | JSON bug backlog (TheFixer input) |
| `Teams/TheInspector/findings/dependency-audit-2026-06-28.md` | Full dependency audit detail |
| `Teams/TheInspector/findings/audit-2026-06-28-C.md` | Quality oracle findings detail |
| `inspector-report.md` | This summary |

---

_TheInspector · run-20260628-063513 · 2026-06-28_
