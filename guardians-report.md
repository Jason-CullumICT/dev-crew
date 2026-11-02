# TheGuardians — Security & Compliance Report

**Date:** 2026-11-02  **Run:** run-20261102-105717  
**Grade: F** — Automatic. Confirmed red-team breach of 3 critical pentest objectives.

---

## Executive Summary

| Metric | Result |
|---|---|
| **Grade** | **F** (automatic — confirmed breach of critical objectives) |
| Critical findings | 3 |
| High findings | 6 |
| Medium findings | 7 |
| Low findings | 4 |
| Confirmed live breaches (RED-ID) | 5 |
| Theoretical findings | 15 |
| Compliance pass rate | ~29% (0 full passes, 5 partial, 9 failing out of 14 controls) |
| Red team objectives achieved | 3 / 4 |

**Risk statement:** The dev-crew Source App has **no identity layer whatsoever**. Every API endpoint — including privileged state-mutation operations (approve, reject, dispatch, force-approve) — is fully accessible to any unauthenticated caller. The red-teamer confirmed 5 live exploits with zero credentials, breaching 3 of 4 named pentest objectives against an ephemeral Docker environment. The application is not safe to operate in any environment accessible to untrusted callers.

**One positive:** The soft-delete mechanism correctly blocks access to deleted items (Objective 2 not achieved). The logging infrastructure (structured JSON, Prometheus metrics), input validation on CRUD routes, and parameterized query usage are well-built foundations to build on.

---

## Top 3 Risks

1. **CRIT-001 — Complete absence of authentication & authorization** *(Confirmed Live)* — Every endpoint is publicly writable. Any caller can approve, reject, dispatch, or delete any work item. Prerequisite for 9 other findings.

2. **CRIT-002 — State machine bypass** *(Confirmed Live)* — `POST /api/feature-requests/:id/force-approve` approves any item with zero votes in 3 unauthenticated requests. `POST /api/cycles/:id/complete` instantly completes a development cycle with zero tickets, auto-creating Feature + Learning records as if real work was done.

3. **CRIT-003 — Full unauthenticated data exfiltration** *(Confirmed Live)* — All 31 work items returned in a single unauthenticated GET with no pagination cap. Dashboard summary and a 531-line Prometheus operational dump also extracted with zero credentials.

---

## Consolidated Findings

### 🔴 Critical (Confirmed Live Exploit)

| ID | Title | Sources |
|---|---|---|
| CRIT-001 | Complete Absence of Authentication & Authorization | SAST-001, PEN-001, COMP-001, COMP-002, RED-001, RED-005 |
| CRIT-002 | State Machine Bypass — Force-Approve & Cycle Early Completion | SAST-002, PEN-004, PEN-005, RED-001, RED-002 |
| CRIT-003 | Full Unauthenticated Data Exfiltration — No Pagination Cap | PEN-002, PEN-012, RED-003 |

### 🟠 High

| ID | Title | Status | Sources |
|---|---|---|---|
| HIGH-001 | No Rate Limiting — Confirmed Unlimited Flood | Confirmed (Live) | SAST-006, PEN-009, COMP-010, RED-004 |
| HIGH-002 | No TLS / HTTPS Enforcement | Theoretical | COMP-003 |
| HIGH-003 | Missing HTTP Security Headers (No Helmet.js) | Theoretical | COMP-004 |
| HIGH-004 | Intake Webhooks — No Auth, No HMAC, Unvalidated Enums | Theoretical | SAST-003, SAST-005, PEN-003 |
| HIGH-005 | SOC2 Audit Events Absent — login_attempt & permission_denied | Theoretical | COMP-006, COMP-007 |
| HIGH-006 | Prometheus /metrics Publicly Accessible — Confirmed Dumped | Confirmed (Live) | SAST-008, PEN-008, COMP-011, RED-003 |

### 🟡 Medium (Theoretical)

| ID | Title | Sources |
|---|---|---|
| MED-001 | Internal Error Messages Returned Verbatim to Clients | SAST-004 |
| MED-002 | No Explicit JSON Body Size Limit | SAST-007 |
| MED-003 | Data Export Events Not Audit Logged | COMP-008 |
| MED-004 | State Transition Events Lack Structured `event:` Field | COMP-009 |
| MED-005 | No Session Management Policy Defined | COMP-012 |
| MED-006 | Assessment Re-Entry Allows Unbounded Record Accumulation | PEN-010 |
| MED-007 | Assessment Pod is Fully Deterministic — Crafted Items Guarantee Approval | PEN-011 |

### 🔵 Low (Theoretical)

| ID | Title | Sources |
|---|---|---|
| LOW-001 | CORS Not Explicitly Configured (Limited Risk — Browser-Level CORS Works) | PEN-013, COMP-005 |
| LOW-002 | No Hard-Delete / Right to Be Forgotten Gap | COMP-013 |
| LOW-003 | No Persistent Storage — Data Durability Gap (SOC2 CC8.1) | COMP-014 |
| LOW-004 | Sensitive Field Encryption Policy Not Pre-Documented | COMP-015 |

### ✅ False Positives / Confirmed Safe

| Finding | Result |
|---|---|
| PEN-007 (input length DoS) | Limits enforced — title ≤ 200, description ≤ 10,000 chars |
| Objective 2 (soft-delete access) | `findById()` correctly excludes deleted items. Store is secure. |
| SQL injection in title | Parameterized queries prevent injection. Safe. |
| CORS browser blocking | `evil.example.com` correctly blocked. No `Access-Control-Allow-Origin` returned. |
| Bug state machine transitions | Allowed-transition map enforced correctly. |

---

## Compliance Matrix

| Control | Framework | Status | Findings |
|---|---|---|---|
| CC6.1 | SOC2 Type 2 | ❌ FAIL | CRIT-001, HIGH-002, LOW-001, HIGH-006 |
| CC6.2 | SOC2 Type 2 | ❌ FAIL | CRIT-001, HIGH-005 |
| CC6.3 | SOC2 Type 2 | ❌ FAIL | CRIT-001, HIGH-005 |
| CC7.1 | SOC2 Type 2 | ⚠️ PARTIAL | HIGH-005, MED-003, MED-004 |
| CC8.1 | SOC2 Type 2 | ⚠️ PARTIAL | LOW-003 |
| V2 Authentication | OWASP-ASVS L2 | ❌ FAIL | CRIT-001 |
| V3 Session Mgmt | OWASP-ASVS L2 | ❌ FAIL | MED-005 |
| V4 Access Control | OWASP-ASVS L2 | ❌ FAIL | CRIT-001 |
| V5 Validation | OWASP-ASVS L2 | ⚠️ PARTIAL | HIGH-004, CRIT-002 (CRUD route validation passes ✓) |
| V7 Error/Logging | OWASP-ASVS L2 | ⚠️ PARTIAL | MED-001, MED-003, MED-004 (structured logging infra ✓) |
| V8 Data Protection | OWASP-ASVS L2 | ⚠️ PARTIAL | LOW-002, LOW-004 (no PII in current model ✓) |
| V9 Communications | OWASP-ASVS L2 | ❌ FAIL | HIGH-002 |
| V13 API Security | OWASP-ASVS L2 | ❌ FAIL | CRIT-001, LOW-001, HIGH-001 |
| V14 Configuration | OWASP-ASVS L2 | ❌ FAIL | HIGH-003 |

**Pass rate: ~29%** (5 partial of 14 total; 9 failing)

---

## Red Team Summary

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — `localhost:3001`

| Objective | Result |
|---|---|
| Bypass work item state machine | ✅ BREACHED — RED-001 (force-approve, 0 votes), RED-002 (cycle early completion) |
| Access/modify soft-deleted work item | 🛡 NOT ACHIEVED — `findById()` correctly excludes deleted items |
| Submit malformed assessment verdict | ✅ BREACHED (analog) — RED-005 (anonymous force-deny with no auth) |
| Enumerate all work items without pagination limit | ✅ BREACHED — RED-003 (all 31 items + dashboard + 531-line /metrics dump) |

**Confirmed live exploits:** RED-001 (force-approve), RED-002 (cycle early completion), RED-003 (full data exfiltration), RED-004 (unlimited flood), RED-005 (unauthenticated deny).

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Why |
|---|---|---|---|
| 🔴 P1 | CRIT-001 — Authentication & RBAC | High | Prerequisite for 9 findings; unlocks CC6.1–CC6.3, V2, V4, V13 |
| 🔴 P1 | CRIT-002 — State machine guards | Low | Auth guard + enum validation + vote threshold + cycle phase check |
| 🔴 P1 | HIGH-003 — Helmet.js | Very Low | One-liner; fixes V14; CSP, HSTS, X-Frame-Options |
| 🔴 P1 | HIGH-006 — Restrict /metrics | Very Low | Bind to internal port or add scrape token; independent of auth |
| 🔴 P1 | HIGH-001 — Rate limiting | Low | express-rate-limit; ~30 min install |
| 🟠 P2 | HIGH-002 — TLS enforcement | Medium | Infrastructure + app config; V9, CC6.1 |
| 🟠 P2 | HIGH-004 — Webhook HMAC + enum validation | Low | HMAC verify + enum guard |
| 🟠 P2 | CRIT-003 — Pagination cap + data restrictions | Low | Cap limit to 100; restrict activity detail |
| 🟠 P2 | MED-004 — `event:` field in state transition logs | Very Low | Add key to existing log calls; SIEM query gap fix |
| 🟡 P3 | HIGH-005 — Login/permission audit events | Medium | After auth; CC7.1, V7.2.1 |
| 🟡 P3 | MED-003 — Data export logging | Low | logger.info in GET handlers |
| 🟡 P3 | MED-001, MED-002 — Error message & body limit | Very Low | 2 one-liners |
| 🟢 P4 | MED-005 — Session policy | Medium | Define in spec; implement with auth |
| 🟢 P4 | LOW-002, LOW-003, LOW-004 | Varies | Hard-delete, persistent storage, field masking spec |

---

## Artifacts

| File | Description |
|---|---|
| `Teams/TheGuardians/findings/security-report-2026-11-02-F.html` | Full HTML report with all findings and remediation details |
| `Teams/TheGuardians/findings/security-backlog-2026-11-02.json` | Machine-readable backlog for TheFixer integration |
| `Teams/TheGuardians/artifacts/attack-surface-map.md` | Attack surface map with Red Team Results (written by pen-tester and red-teamer) |

---

_Posted by TheGuardians · run-20261102-105717 · 2026-11-02_
