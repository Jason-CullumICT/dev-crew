# TheGuardians — Security & Compliance Report

**Date:** 2026-09-07 | **Run ID:** run-20260907-081952 | **Grade: F**

---

## ⛔ AUTOMATIC FAIL — Confirmed Red Team Breaches

The red team achieved **all 4 pentest objectives** with **9 confirmed live exploits**, including 2 Critical breaches. This application must not be deployed to any shared or production environment. Operator decision is required before any merge.

---

## Summary

| Metric | Value |
|--------|-------|
| **Grade** | **F** (Automatic — confirmed critical breach) |
| Critical | 2 (both Confirmed Live) |
| High | 13 (4 Confirmed Live, 9 Theoretical) |
| Medium | 6 (1 Confirmed Live, 5 Theoretical) |
| Low | 4 |
| **Total Findings** | **25** |
| Confirmed Live Exploits | 7 |
| Theoretical Findings | 18 |
| Red Team Objectives Achieved | 4/4 |
| Confirmed Breaches | 9 |
| Compliance Pass Rate | ~18% (3/22 controls) |

---

## Grading Rationale

Per `security.config.yml` grading rubric:

| Threshold | Requirement | Actual | Met? |
|-----------|-------------|--------|------|
| Grade F (automatic) | Any confirmed red-team breach of a critical objective | 4/4 objectives breached, 2 Critical confirmed | ✅ Triggers F |
| Grade D | ≤ 2 Critical | 2 Critical | Would qualify if not for red-team confirmation |
| Compliance min for C | ≥ 60% pass rate | 18% | ❌ |

**Grade: F** — automatic trigger. Red team confirmed live breaches of all four critical pentest objectives.

---

## Critical Findings (Confirmed Live)

### MERGED-001: Complete Authentication Absence
**Source:** SAST-001 · PEN-001 · COMP-01 · RED-001  
**Severity:** Critical | **Status:** Confirmed (Live Exploit)

Zero authentication middleware exists anywhere in the application. Every endpoint — including approve, reject, dispatch, hard-delete — is reachable by any unauthenticated HTTP caller.

**Red Team Evidence:** `BUG-0001` created, triaged, resolved, and hard-deleted anonymously. `FR-0001` created and approved with no credentials. Every critical_entry_point accepted requests and returned 200/201.

**Remediation:** Add mandatory auth middleware (JWT or API-key) before all route mounts in `Source/Backend/src/app.ts` and `portal/Backend/src/index.ts`. Define role model (viewer, operator, admin).

---

### MERGED-002: State Machine Bypass — Zero-Vote Approval
**Source:** PEN-002 · PEN-003 · RED-002 · RED-009  
**Severity:** Critical | **Status:** Confirmed (Live Exploit)

`PATCH /api/feature-requests/:id` allows direct status escalation to `approved` with `votes:[]` and `human_approval_approved_at:null`. The vote majority check only exists in the dedicated `/approve` endpoint — not in the PATCH handler. Additionally, `POST /api/feature-requests/:id/deny` denies items without any AI voting round.

**Red Team Evidence:** `FR-0002` confirmed in `approved` state with zero votes. `FR-0011` confirmed `denied` without any vote or assessment.

**Remediation:** Remove `approved` and `denied` from the PATCH-accessible transition map. These states must only be reachable through `/approve`, `/force-approve`, `/deny` endpoints with authentication and role enforcement.

---

## High Findings — Confirmed Live (4)

| ID | Title | Constituent IDs |
|----|-------|-----------------|
| MERGED-003 | IDOR — Cross-User Content Modification & Permanent Deletion | PEN-004, RED-003 |
| RED-004 | Bug Lifecycle State Machine Fully Traversable Without Auth | RED-004 |
| MERGED-005 | Pagination Bypass — Full Dataset in 1 Request | SAST-003, PEN-005, RED-006 |
| RED-008 | Stored XSS — Script Payloads Persisted Verbatim | RED-008 |

**Key evidence:**
- `FR-0003` overwritten by anonymous "Bob" session; `BUG-0001` permanently hard-deleted
- `BUG-0001` walked from `reported` → `resolved` anonymously in 4 requests
- `GET /api/search?q=` returned all 14 items (FRs + Bugs); `?limit=1` was silently ignored
- `<script>alert(1)</script>` stored verbatim in `FR-0010.title`

---

## High Findings — Theoretical (9)

| ID | Title | CWE | Source IDs |
|----|-------|-----|-----------|
| RED-007 | Unauthenticated Orchestrator Proxy — SSRF | CWE-918 | RED-007 |
| PEN-007 | Cascade Auto-Dispatch on Blocker Rejection — Logic Flaw | CWE-840 | PEN-007 |
| MERGED-009 | Unauthenticated Webhook Intake — No HMAC, No Enum Guards | CWE-20 | SAST-002, PEN-008, COMP-06 |
| SAST-008 | Docker Socket Mounted in Orchestrator *(platform/ scope)* | CWE-269 | SAST-008 |
| COMP-02 | No TLS / All Traffic Plaintext | CWE-319 | COMP-02 |
| COMP-03 | No CORS Policy | CWE-942 | COMP-03 |
| COMP-07 | Required Audit Events Not Emitted (SOC2 CC7.1 violation) | — | COMP-07 |
| COMP-11 | No Session Management, Token Expiry, or MFA | — | COMP-11 |
| COMP-10 | No RBAC — No Principle of Least Privilege | — | COMP-10 |

---

## Medium Findings (6)

| ID | Title | Status | Source IDs |
|----|-------|--------|-----------|
| MERGED-016 | Unauthenticated /metrics — 39 families exposed | **Confirmed Live** | SAST-004, PEN-010, COMP-08, RED-005 |
| MERGED-017 | No helmet / CSP / HSTS / X-Frame-Options | Theoretical | SAST-005, COMP-04 |
| SAST-009 | Host credentials mounted in container *(platform/)* | Theoretical | SAST-009 |
| MERGED-019 | No rate limiting — DoS via intake spam | Theoretical | PEN-009, COMP-05 |
| PEN-006 | Soft-deleted blocker permanently blocks dispatch | Theoretical | PEN-006 |
| COMP-12 | No data retention / hard-deletion policy | Theoretical | COMP-12 |

---

## Low Findings (4)

| ID | Title |
|----|-------|
| SAST-006 | Unvalidated `overrideRoute` enum stored as-is |
| MERGED-023 | Internal error messages echoed to HTTP clients |
| PEN-011 | Missing `/api/search` route (future injection risk) |
| PEN-012 | Pagination NaN/negative params fail silently |

---

## Compliance Matrix Summary

**Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1)  
**Pass rate: ~18%** (3 pass, 1 partial, 18 fail out of 22 controls)

| Status | Controls |
|--------|----------|
| ✅ PASS | V5.1.1 (input validation), V7.4.1 (client error messages), CC8.1 (change mgmt) |
| ⚠️ PARTIAL | V7.2.1 (audit logging — changeHistory exists but is not an audit log) |
| ❌ FAIL | V2.1.1, V2.4.1, V3.1.1, V3.3.1, V4.1.1, V4.1.2, V4.1.3, V4.2.1, V4.3.3, V8.3.4, V9.1.1, V13.2.6, V14.4.1, V14.5.1, CC6.1, CC6.2, CC6.3, CC7.1 |

---

## Red Team Summary

**Target:** http://localhost:3001 (portal backend — ephemeral Docker via `docker-compose.test.yml`)  
**Scope note:** Pen-tester analyzed `Source/Backend/`; running container is `portal/Backend/`. All vulnerability *classes* confirmed valid — identical architectural patterns in both codebases.

| Objective | Status | Finding |
|-----------|--------|---------|
| Bypass state machine to reach invalid status | ✅ Achieved | RED-002: FR-0002 approved with zero votes via PATCH |
| Access/modify soft-deleted item via direct ID | ✅ Achieved | RED-003: FR-0003 overwritten; BUG-0001 hard-deleted |
| Submit malformed verdict bypassing routing logic | ✅ Achieved | RED-009: FR-0011 denied without any vote |
| Enumerate all items without pagination enforcement | ✅ Achieved | RED-006: GET /api/search?q= returns all 14 items |

---

## Priority Remediation Roadmap

| Priority | Action | Effort |
|----------|--------|--------|
| **P1** | MERGED-001 — Add authentication middleware (both backends) | High |
| **P1** | MERGED-002 — Block status=approved/denied in PATCH handler | Low |
| **P1** | MERGED-003 — Ownership checks on all :id routes | Medium |
| **P1** | RED-004 — Role check for bug lifecycle endpoints | Low |
| **P1** | MERGED-005 — Enforce MAX_LIMIT; reject empty search q | Low |
| **P1** — | RED-008 — Sanitize text inputs server-side | Low |
| **P1** | RED-007 — Auth middleware on /api/orchestrator proxy | Low |
| **P2** | PEN-007 — Remove Rejected from DISPATCH_TRIGGER_STATUSES | Low |
| **P2** | MERGED-009 — HMAC webhook validation + enum guards | Low |
| **P2** | COMP-02 — TLS at reverse proxy, HSTS | Low |
| **P2** | COMP-07 — Audit event logger (state_transition, login) | Medium |
| **P2** | COMP-10 + COMP-11 — RBAC + session expiry | Medium |
| **P3** | COMP-03, MERGED-017, MERGED-016, MERGED-019, SAST-009 | Low |
| **P4** | SAST-008 — Docker socket proxy *(solo session)* | Medium |

---

## Phase 2: Red Team Gate Assessment

- **Ephemeral environment gate:** ✅ Passed — target was ephemeral Docker via `docker-compose.test.yml`
- **Attack surface map gate:** ✅ Passed — `Teams/TheGuardians/artifacts/attack-surface-map.md` contained 12 PEN-ID findings
- **Phase 2 executed:** Yes — red-teamer completed all objectives

---

## Output Artifacts

| Artifact | Path |
|----------|------|
| Full HTML Report | `Teams/TheGuardians/findings/security-report-2026-09-07-F.html` |
| Security Backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-09-07.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |
| This Report | `guardians-report.md` |

---

*Generated by TheGuardians · team_leader (sonnet) · Run ID: run-20260907-081952*
