# TheGuardians Security Report
**Grade: F** | **Date:** 2026-07-20 | **Run ID:** run-20260720-063859

---

## ⛔ Automatic Grade F

The red-team confirmed a live breach of a critical config objective:
**RED-001** achieved full pipeline traversal (`potential → completed`) in **4 unauthenticated HTTP calls** with zero votes cast and no AI review. Per `security.config.yml`, any confirmed red-team breach of a critical objective is an automatic F.

**Operator decision required before any merge or deployment.**

---

## Summary Metrics

| Metric | Value |
|---|---|
| **Grade** | **F** |
| Critical findings | 1 |
| High findings | 5 |
| Medium findings | 8 |
| Low findings | 4 |
| Total findings | 18 |
| Confirmed live breaches | 6 |
| Theoretical findings | 12 |
| Compliance pass rate | **22%** (4/19 controls pass) |
| Red-team objectives achieved | 3 of 4 (1 partial) |

---

## Top 3 Risks

1. **F-001 — Complete Authentication Absence** (Critical, Confirmed): Zero authentication middleware. Every endpoint freely accessible. Full pipeline bypass in 4 HTTP calls (RED-001).
2. **F-004 — Cascade Bypass of Approval Voting** (High, Confirmed): Raw SQL UPDATE in dependency cascade bypasses all approval guards — items reach `approved` with zero votes (RED-006).
3. **F-003 — Stored XSS Across All Free-Text Fields** (High, Confirmed): HTML/script payloads stored verbatim and returned in all API responses (RED-003).

---

## Confirmed Breaches

| RED-ID | Severity | Description | Merged Into |
|--------|----------|-------------|-------------|
| RED-001 | **Critical** | Full pipeline traversal via unauthenticated force-approve + fast-track override | F-001 |
| RED-002 | High | Dependency deadlock: soft-deleted blocker permanently blocks dependent dispatch | F-002 |
| RED-003 | High | Stored XSS confirmed across /api/feature-requests and /api/bugs | F-003 |
| RED-006 | High | Cascade auto-dispatch bypasses approval voting via raw SQL UPDATE | F-004 |
| RED-004 | Medium | Full dataset returned regardless of `limit`/`page` parameters | F-007 |
| RED-005 | Medium | Prometheus metrics + Express technology fingerprinting — no auth | F-008 |

---

## All Consolidated Findings

| ID | Severity | Status | Title | Source |
|----|----------|--------|-------|--------|
| F-001 | **Critical** | Confirmed | Complete Authentication & Authorization Absence + State Machine Bypass | PEN-001, PEN-002, SAST-01, COMP-001, RED-001 |
| F-002 | High | Confirmed | Dependency Deadlock via Soft-Delete of Blocker | PEN-003, RED-002 |
| F-003 | High | Confirmed | Stored XSS via Unsanitized Free-Text Fields | PEN-005, RED-003 |
| F-004 | High | Confirmed | Cascade Auto-Dispatch Bypasses Approval Voting | PEN-009, RED-006 |
| F-005 | High | Theoretical | Missing HTTP Security Headers and CORS Policy | SAST-02, COMP-002, COMP-003 |
| F-006 | High | Theoretical | Intake Webhooks Accept Unsigned/Unauthenticated Requests | SAST-03, COMP-011, PEN-004 |
| F-007 | Medium | Confirmed | Unbounded Pagination Enables Full Data Enumeration + DoS | SAST-04, PEN-006, RED-004 |
| F-008 | Medium | Confirmed | Prometheus /metrics Exposed Without Auth + Tech Fingerprinting | SAST-08, COMP-005, PEN-007, RED-005 |
| F-009 | Medium | Theoretical | No Rate Limiting on Any Endpoint | SAST-07, COMP-004 |
| F-010 | Medium | Theoretical | Raw Error Messages Returned to Clients in 500 Responses | SAST-06 |
| F-011 | Medium | Theoretical | Race Condition on Repeated Assessment Allows State Bloat | PEN-008 |
| F-012 | Medium | Theoretical | Missing Required Audit Events for SOC2 Compliance | COMP-007 through COMP-010 |
| F-013 | Medium | Theoretical | No TLS/HTTPS Enforcement | COMP-006 |
| F-014 | Medium | Theoretical | In-Memory Store — No Persistence / No GDPR Hard-Erasure | COMP-013 |
| F-015 | Low | Theoretical | No Session Management Infrastructure | COMP-014 |
| F-016 | Low | Theoretical | Unvalidated Query Filter Params Cast to Enum Types | SAST-09 |
| F-017 | Low | Theoretical | Docker Container Runs as Root | SAST-10 |
| F-018 | Low | Theoretical | Sequential Predictable Document IDs Enable Enumeration | SAST-11, PEN-011 |
| F-019 | Low | Theoretical | Frontend References Non-Existent /api/search Endpoint | PEN-010 |

---

## Compliance Matrix (Summary)

**Pass rate: 22% — 4 PASS / 1 PARTIAL / 14 FAIL**

| Status | Controls |
|--------|---------|
| PASS | V6.4 (secret management), V7.2 (no PII in logs), V7.4 (generic 500 responses), CC8.1 (change management/git traceability) |
| PARTIAL | V5.1 (input validation — main route validated; intake routes not) |
| FAIL | V2.1, V3.1, V3.3, V4.1, V4.2, V7.1, V9.1, V14.4, V14.5, CC6.1, CC6.2, CC6.3, CC7.1 |

Root cause: the entire authentication/RBAC layer is absent. This single gap cascades into failures across ~70% of required compliance controls.

---

## Grading Rationale

| Criterion | Threshold | Actual | Result |
|-----------|-----------|--------|--------|
| Confirmed red-team breach of critical objective | 0 | 1 (RED-001) | **Automatic F** |
| Critical findings | 0 for A/B, <= 1 for C, <= 2 for D | 1 | Would be D absent red-team |
| High findings | <= 6 for B, <= 12 for C | 5 | Would pass B threshold |
| Compliance pass rate | >= 60% for C | 22% | Fails C threshold |

**Grade: F** — automatic due to RED-001 confirmed breach of a critical config objective.

---

## Remediation Priority

| Priority | Finding(s) | Effort | Impact |
|----------|-----------|--------|--------|
| **P1** | F-001 — JWT auth + RBAC | 3–5 days | Unblocks ~70% of failing compliance controls |
| **P1** | F-004 — Fix cascade raw SQL to service call | 0.5 days | Closes second confirmed bypass path |
| **P1** | F-003 — Server-side XSS sanitization | 1 day | Eliminates stored XSS vector |
| **P2** | F-005 — helmet + CORS | 0.5 days | High compliance coverage for minimal effort |
| **P2** | F-002 — Fix blocker delete deadlock | 1 day | Eliminates permanent non-dispatchable state |
| **P2** | F-006 — Intake HMAC + enum validation | 1 day | Closes forged webhook injection |
| **P3** | F-007, F-008, F-009 | 1 day | Pagination cap, metrics auth, rate limiting |
| **P3** | F-012, F-013 | 2–4 days | Audit events, TLS enforcement |
| **P4** | F-010 through F-019 | Backlog | Defense-in-depth hardening |

---

## Red Team Dead Ends (Do Not Retry)

- **SQL Injection** — Parameterized queries block all attempts.
- **Mass Assignment** — Service layer ignores injected `status`/`id`/`votes` fields.
- **Deny After Approve** — State machine correctly blocks `approved -> denied` (HTTP 409).
- **Concurrent Vote Race** — First `/vote` call wins; subsequent concurrent calls fail.
- **IDOR on Deleted Items** — Hard delete confirmed; deleted items return 404.

---

## Full Report Artifacts

| Artifact | Path |
|----------|------|
| Security Report (HTML) | `Teams/TheGuardians/findings/security-report-2026-07-20-F.html` |
| Security Backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-07-20.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

*TheGuardians · run-20260720-063859 · 2026-07-20*
*Specialists: static-analyzer · compliance-auditor · pen-tester · red-teamer*
