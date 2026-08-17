# TheGuardians Security & Compliance Report
**Date:** 2026-08-17 | **Run ID:** run-20260817-040932 | **Grade: F**

---

## ⛔ Grade: F — Confirmed Breach of Critical Security Objectives

The application has **no authentication layer**. The red-team confirmed breaches of all 4 pentest objectives in a live ephemeral environment. Two critical-objective breaches trigger an automatic **Grade F** per `security.config.yml`.

---

## Summary

| Metric | Result |
|--------|--------|
| **Grade** | **F** (automatic — confirmed critical breach) |
| Critical findings | 2 |
| High findings | 9 (3 confirmed + 6 theoretical) |
| Medium findings | 7 (2 confirmed + 5 theoretical) |
| Low findings | 4 |
| **Confirmed breaches** | **7** |
| Theoretical findings | 15 |
| Compliance pass rate | **22%** (2 pass · 3 partial · 13 fail / 18 controls) |
| Red-team objectives | **4 of 4 achieved** |

---

## Top 3 Risks

1. **C-001 — Zero Authentication** *(Confirmed)* — Every API endpoint is publicly writable with no credentials. Unauthenticated CRUD, approve, reject, and dispatch operations all succeed. Root cause of most other findings. `SAST-01 · COMP-001 · PEN-001 · RED-001`

2. **C-002 — State Machine Bypass** *(Confirmed)* — Any caller can set `overrideRoute: "fast-track"` to bypass the assessment pod and approve any work item in 3 unauthenticated HTTP requests. `SAST-09 · PEN-003 · RED-002`

3. **H-001 — Full Data Enumeration** *(Confirmed)* — Pagination parameters are ignored in the live app; `GET /api/bugs?limit=1` returns the entire dataset. `SAST-05 · COMP-011 · PEN-002 · RED-003`

---

## Consolidated Findings

### 🔴 Critical — Confirmed Live Exploit (2)

| ID | Title | Sources |
|----|-------|---------|
| **C-001** | Complete Absence of Authentication & Authorization | SAST-01, COMP-001, PEN-001, RED-001 |
| **C-002** | State Machine Bypass — Unauthorized Approval Without Review | SAST-09, PEN-003, RED-002 |

### 🟠 High — Confirmed Live Exploit (3)

| ID | Title | Sources |
|----|-------|---------|
| **H-001** | Full Dataset Enumeration — Pagination Bypass | SAST-05, COMP-011, PEN-002, RED-003 |
| **H-002** | Cascade Auto-Promotion — Unauthorized State Transition | PEN-006, RED-004 |
| **H-003** | Ghost Dependency DoS — Soft-Deleted Blocker Freeze | PEN-005, RED-005 |

### 🟠 High — Theoretical (6)

| ID | Title | Sources |
|----|-------|---------|
| **H-004** | Internal Error Messages Leaked to Clients | SAST-02, COMP-009 |
| **H-005** | Intake Webhook — No HMAC Signature Verification | SAST-03, COMP-008 |
| **H-006** | No TLS / HTTPS Enforcement | COMP-002 |
| **H-007** | Missing HTTP Security Headers (No Helmet) | SAST-06, COMP-003 |
| **H-008** | Required Audit Events Missing | COMP-004 |
| **H-009** | No Session Management | COMP-005 |

### 🟡 Medium — Confirmed (2)

| ID | Title | Sources |
|----|-------|---------|
| **M-001** | Unauthenticated Prometheus /metrics Endpoint | SAST-04, COMP-006, PEN-008, RED-006 |
| **M-002** | No Rate Limiting on Any Endpoint | SAST-07, COMP-007, PEN-012, RED-008 |

### 🟡 Medium — Theoretical (5)

| ID | Title | Sources |
|----|-------|---------|
| **M-003** | NeedsClarification Verdict Silently Maps to Rejected | PEN-007 |
| **M-004** | No Request Body Size Limits | PEN-009 |
| **M-005** | Intake Webhooks Accept Unvalidated Enum Fields | PEN-004 |
| **M-006** | Audit Log Actor Identity Anonymous | COMP-010 |
| **M-007** | No CORS Policy Configured | COMP-012, PEN-011 |

### 🟢 Low (4)

| ID | Title | Sources |
|----|-------|---------|
| **L-001** | parseInt NaN Guard Missing | SAST-08 |
| **L-002** | Missing /api/search Route | PEN-010 |
| **L-003** | GDPR Soft-Delete Documentation | COMP-013 |
| **L-004** | No Request Correlation ID in Logs | COMP-014 |

---

## Compliance Matrix (22% Pass Rate)

| Control | Framework | Status | Finding |
|---------|-----------|--------|---------|
| CC6.1 | SOC2-Type2 | ❌ FAIL | C-001, M-001 |
| CC6.2 | SOC2-Type2 | ❌ FAIL | C-001, H-005 |
| CC6.3 | SOC2-Type2 | ❌ FAIL | C-001 |
| CC7.1 | SOC2-Type2 | ⚠️ PARTIAL | H-008, M-006, L-004 |
| CC8.1 | SOC2-Type2 | ⚠️ PARTIAL | M-006 |
| ASVS V2.1 | OWASP-ASVS L2 | ❌ FAIL | C-001 |
| ASVS V2.8 | OWASP-ASVS L2 | ❌ FAIL | C-001 |
| ASVS V3.1–V3.3 | OWASP-ASVS L2 | ❌ FAIL | H-009 |
| ASVS V4.1 | OWASP-ASVS L2 | ❌ FAIL | C-001, M-001 |
| ASVS V4.2.2 | OWASP-ASVS L2 | ❌ FAIL | M-002 |
| ASVS V5.1.4 | OWASP-ASVS L2 | ❌ FAIL | H-001 |
| ASVS V7.1 | OWASP-ASVS L2 | ⚠️ PARTIAL | H-008, L-004 |
| **ASVS V7.2** | OWASP-ASVS L2 | **✅ PASS** | — |
| **ASVS V7.3** | OWASP-ASVS L2 | **✅ PASS** | — |
| ASVS V7.4 | OWASP-ASVS L2 | ❌ FAIL | H-004 |
| ASVS V9.1 | OWASP-ASVS L2 | ❌ FAIL | H-006 |
| ASVS V14.4 | OWASP-ASVS L2 | ❌ FAIL | H-007 |
| ASVS V14.5 | OWASP-ASVS L2 | ❌ FAIL | M-007 |

**Passing controls:** Structured logging (no console.log) · No sensitive data in logs.

---

## Red Team Summary

**Environment:** `docker-compose.test.yml` (ephemeral, isolated)  
**Note:** Pen-tester analyzed `Source/Backend/`; red-team ran against `portal/Backend/`. 10 of 12 PEN findings carry over; 2 mitigated in portal (enum validation, CORS).

| RED ID | Finding | Severity | Verdict |
|--------|---------|----------|---------|
| RED-001 | Zero authentication | Critical | ✅ Confirmed → C-001 |
| RED-002 | State machine bypass (0-vote force-approve) | Critical | ✅ Confirmed → C-002 |
| RED-003 | Full dataset enumeration | High | ✅ Confirmed → H-001 |
| RED-004 | Cascade auto-promotion | High | ✅ Confirmed → H-002 |
| RED-005 | Ghost dependency freeze | High | ✅ Confirmed → H-003 |
| RED-006 | Unauthenticated /metrics | Medium | ✅ Confirmed → M-001 |
| RED-007 | Body size returns 500 not 413 | Low | ✅ Confirmed → M-004 |
| RED-008 | No rate limiting | Low | ✅ Confirmed → M-002 |

**Pentest Objectives:** 4 of 4 achieved (state machine bypass, soft-delete DoS, verdict bypass, full enumeration).

---

## Grading

| Grade | Criteria | This Run |
|-------|----------|----------|
| A | 0 Critical, ≤2 High, ≥90% compliance | ✗ |
| B | 0 Critical, ≤6 High, ≥75% compliance | ✗ |
| C | ≤1 Critical, ≤12 High, ≥60% compliance | ✗ |
| D | ≤2 Critical | ✗ (confirmed breach) |
| **F** | **Any confirmed red-team breach of critical objective** | **✅ APPLIES — 2 confirmed** |

---

## Remediation Priority

| Priority | Findings | Action |
|----------|----------|--------|
| **P1 — IMMEDIATE** | C-001, C-002 | Add auth middleware + gate overrideRoute. No deployment until resolved. |
| **P2 — HIGH** | H-001, H-002, H-003, H-007, M-001, M-002 | Enforce pagination cap, fix cascade/ghost-delete, add helmet (1 line), restrict /metrics, add rate limiting. |
| **P3 — MEDIUM** | H-004–H-009, M-003–M-005, M-007 | Error containment, TLS, audit events, session design, body size limits, CORS. Several depend on P1 completion. |
| **P4 — LOW** | M-006, L-001–L-004 | Auth actor in logs, NaN guard, missing route, GDPR docs, correlation IDs. |

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-08-17-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-08-17.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

> ⛔ **Grade F — Operator decision required before any merge or deployment.**  
> Confirmed breaches cannot be auto-remediated by TheFixer — they require explicit operator sign-off and architectural review.

*Posted by TheGuardians · team-leader · run-20260817-040932*
