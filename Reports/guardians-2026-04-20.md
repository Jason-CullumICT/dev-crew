# TheGuardians Security & Compliance Report
**Date:** 2026-04-20 | **Run:** run-20260420-060358 | **Grade: F**

---

## ⛔ Grade: F — Automatic

Three red-team objectives were confirmed as live exploits against the running application. The state machine was bypassed, bugs were silently closed, and the AI voting pipeline was hijacked — all without any credentials. This codebase **must not be merged or deployed** until authentication and authorization are fully implemented.

---

## Summary

| Category | Count |
|---|---|
| **Critical (Confirmed Live Exploit)** | 3 |
| **High** | 8 (1 confirmed partial, 7 theoretical) |
| **Medium** | 12 (3 confirmed, 9 theoretical) |
| **Low** | 2 (theoretical) |
| **Compliance Pass Rate** | 22% |
| **Red Team Objectives Achieved** | 3/4 (75%) + 1 partial |
| **Confirmed Breaches** | 5 (3 critical, 1 high partial, 2 medium) |

---

## Top 3 Risks

1. **Zero authentication on every API endpoint** — any anonymous caller has full read-write control over the entire application. Root cause of all Critical findings.
2. **Status field directly writable via PATCH** — the state machine is bypassed entirely; confirmed live by moving a feature request `potential → completed` in 4 unauthenticated HTTP requests.
3. **Unvalidated `actions_url` in team dispatches** — attacker-controlled URLs (including AWS metadata endpoint `169.254.169.254`) are stored and will be fetched when dispatches are processed.

---

## Scope Note (PROC-001 — Coverage Gap)

> **Important:** The pen-tester statically analyzed `Source/Backend/` (workflow engine, routes: `/api/work-items`), but the test environment (`docker-compose.test.yml`) runs `portal/Backend/` (routes: `/api/feature-requests`, `/api/bugs`, etc.). Red-team exploitation was performed against the actual running service. Both services share identical vulnerability classes. A live audit of `Source/Backend/` against a running instance remains outstanding.

---

## Confirmed Red-Team Breaches

### RED-001 — Anonymous AI Voting Pipeline Takeover (Critical)
- **Objective:** Achieved
- An anonymous POST to `/api/feature-requests` + `/api/feature-requests/:id/vote` triggered the full 5-agent AI voting pipeline with no credentials. Status transitioned `potential → voting` with 5 fabricated AI votes recorded.
- **Finding ID:** F-003

### RED-002 — State Machine Bypass via Unauthenticated Sequential PATCH (Critical)
- **Objective:** "Bypass work item state machine" — **ACHIEVED** (grade trigger)
- `PATCH /api/feature-requests/:id {"status":"completed"}` cycled a feature request from `potential → voting → approved → in_development → completed` in 4 requests. No voting, no human approval, no review.
- **Finding ID:** F-002

### RED-003 — Bug Lifecycle Silently Closed Without Auth (Critical)
- **Objective:** Achieved
- A critical-severity bug was moved `reported → triaged → in_development → resolved → closed` in 4 unauthenticated PATCH requests. No triage review, no developer assignment, no fix verification.
- **Finding ID:** F-002 (same vector, bug entity)

### RED-004 — Unbounded Pagination / Full Data Dump (Medium)
- **Objective:** "Enumerate all work items without pagination limit" — **ACHIEVED**
- `GET /api/bugs?limit=999999999` returned all records in a single response. No server-side cap exists.
- **Finding ID:** F-012

### RED-005 — SSRF via Unvalidated `actions_url` (High — Partial)
- AWS metadata URL (`http://169.254.169.254/latest/meta-data/`) and internal API URL stored. Callback not triggered in test window.
- **Finding ID:** F-004

### RED-006 — Malformed Vote Triggers AI Pipeline (Medium — Partial)
- Vote payload with `"vote":"INVALID_VERDICT_XYZ"` returned HTTP 200 and fired the full 5-agent pipeline unconditionally.
- **Finding ID:** F-013

---

## All Findings

### Critical — Confirmed (Live Exploit)

| ID | Title | Merged From | Priority |
|---|---|---|---|
| F-001 | Authentication Completely Absent — Anonymous Full Control | SAST-001, PEN-001, PEN-002, COMP-001, RED-001/002/003 | **P1 Blocker** |
| F-002 | State Machine Bypass via Unauthenticated PATCH | PEN-003 analog, RED-002, RED-003 | **P1 Blocker** |
| F-003 | Anonymous AI Voting Pipeline Takeover | RED-001 | **P1 Blocker** |

### High

| ID | Title | Status | Source | Priority |
|---|---|---|---|---|
| F-004 | SSRF via Unvalidated `actions_url` | Confirmed (Partial) | RED-005 | P1 |
| F-005 | IDOR — No Ownership Checks on Any `:id` Endpoint | Theoretical | PEN-005 | P2 |
| F-006 | Unauthenticated Webhook Injection (Zendesk + Automated) | Theoretical | SAST-002, PEN-004, COMP-007 | P2 |
| F-007 | Unauthenticated Manual Assessment / Approval Override | Theoretical | PEN-006 | P2 |
| F-008 | Cascade Auto-Dispatch Hijack via Unauthenticated Rejection | Theoretical | PEN-008 | P2 |
| F-009 | Dependency Gate Bypass via `PATCH blockedBy: []` | Theoretical | PEN-009 | P2 |
| F-010 | No TLS / HTTPS Enforcement | Theoretical | COMP-008 | P1 |
| F-011 | All 4 Required Audit-Log Events Missing | Theoretical | COMP-005 | P3 |

### Medium

| ID | Title | Status | Source | Priority |
|---|---|---|---|---|
| F-012 | Unbounded Pagination / Full Data Enumeration | Confirmed | SAST-007, PEN-010, COMP-006, RED-004 | P2 |
| F-013 | Malformed Vote Payload Accepted — Pipeline Fires Unconditionally | Confirmed (Partial) | RED-006 | P2 |
| F-014 | No HTTP Security Headers (Helmet Missing) | Theoretical | SAST-004, COMP-002 | P1 |
| F-015 | No CORS Policy Configured | Theoretical | SAST-005, PEN-012, COMP-003 | P1 |
| F-016 | Prometheus Metrics Endpoint Unauthenticated | Confirmed | SAST-006, PEN-011, RED-004 | P2 |
| F-017 | No Rate Limiting on Any Endpoint | Theoretical | SAST-009, COMP-004 | P2 |
| F-018 | Stale Dependency -> Permanent Dispatch Block (DoS) | Theoretical | PEN-013 | P2 |
| F-019 | No GDPR Right to Erasure (Hard Delete Missing) | Theoretical | COMP-009 | P3 |
| F-020 | No Session Management or Timeout Policy | Theoretical | COMP-010 | P4 |
| F-021 | No Actor Identity in State-Transition Change History | Theoretical | COMP-011 | P3 |
| F-022 | Debug Portal iframe Missing `sandbox` Attribute | Theoretical | SAST-008, PEN-016 | P3 |
| F-023 | Internal Error Messages Leaked to API Clients | Theoretical | SAST-003, PEN-015 | P2 |

### Low

| ID | Title | Status | Source | Priority |
|---|---|---|---|---|
| F-024 | Invalid `overrideRoute` Corrupts Domain Data | Theoretical | PEN-014 | P4 |
| F-025 | Error Handler Logs Full Stack Traces in All Environments | Theoretical | COMP-012 | P4 |

### Process

| ID | Title | Priority |
|---|---|---|
| PROC-001 | Coverage Gap — Pen Tester Analyzed Wrong Service | Process |

---

## Compliance Matrix Summary

| Framework | Pass | Partial | Fail | N/A | Result |
|---|---|---|---|---|---|
| OWASP ASVS L2 | 2 | 2 | 15 | 2 | Not compliant |
| SOC2 Type 2 | 0 | 2 | 2 | 1 | Not compliant |
| ISO 27001 | 0 | 1 | 6 | 0 | Not compliant |
| GDPR | 0 | 0 | 3 | 0 | Not compliant |
| **Overall** | **22%** pass rate | | | | Fails all grade thresholds |

---

## Grading Rubric Applied

| Grade | Requirement | This Run |
|---|---|---|
| A | 0 Critical, <=2 High, >=90% compliance | FAIL: 3 Critical confirmed |
| B | 0 Critical, <=6 High, >=75% compliance | FAIL: 3 Critical confirmed |
| C | <=1 Critical, <=12 High, >=60% compliance | FAIL: 3 Critical confirmed, 22% compliance |
| D | <=2 Critical | FAIL: 3 Critical confirmed |
| **F** | **Any confirmed red-team breach of a critical objective** | PASS: RED-002 achieved "bypass state machine" |

**Grade: F** — Automatic. Operator decision required before any merge.

---

## Prioritised Remediation Roadmap

### P1 — Blockers (must fix before any deployment)

1. **F-001** — Implement JWT authentication + RBAC in `app.ts` *(Large effort; unblocks F-011, F-020, F-021)*
2. **F-002** — Remove `status` from PATCH-updatable fields *(Trivial — 1 line fix; directly addresses confirmed breach)*
3. **F-004** — Validate `actions_url` against allowlist *(Small — blocks live SSRF)*
4. **F-010** — Add TLS termination via reverse proxy *(Medium)*
5. **F-014** — Add `helmet()` middleware *(Trivial — `npm install helmet` + 1 line)*
6. **F-015** — Add CORS policy *(Trivial — `npm install cors` + 1 line)*

### P2 — High Impact, Short Effort

7. **F-006** — Zendesk webhook HMAC-SHA256 verification
8. **F-009** — Remove `blockedBy` from PATCH fields
9. **F-012** — Cap `?limit` parameter at 100
10. **F-013** — Validate `vote` field enum, return 400 on invalid
11. **F-016** — Restrict `/metrics` to internal network / bearer token
12. **F-017** — Add `express-rate-limit` globally + per sensitive endpoint
13. **F-018** — Fix stale-blocker logic in `computeHasUnresolvedBlockers()`
14. **F-023** — Return generic error messages in 500 responses

### P3 — Post-Auth Cleanup

15. **F-011** — Emit required audit-log events (login_attempt, permission_denied, state_transition, data_export)
16. **F-019** — Implement hard-delete / GDPR purge endpoint
17. **F-021** — Thread authenticated user identity into change history
18. **F-022** — Add `sandbox` attribute to debug portal iframe

### P4 — Best Practice

19. **F-020** — Define session management policy (JWT expiry, refresh rotation, logout)
20. **F-024** — Validate `overrideRoute` enum input
21. **F-025** — Omit stack traces from production logs

### Process

22. **PROC-001** — Update `security.config.yml` target mapping; run live scan on `Source/Backend/`

---

## Full Report Artifacts

| Artifact | Path |
|---|---|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-04-20-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-04-20.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

*Posted by TheGuardians team-leader (run-20260420-060358)*
*Specialists: static-analyzer, pen-tester, red-teamer, compliance-auditor*
