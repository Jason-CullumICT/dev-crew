# TheGuardians Security Report — 2026-04-27

**Run:** `run-20260427-062406`  
**Grade:** `F` — Automatic fail: confirmed red-team breach of a critical pentest objective  
**Target:** dev-crew Source App  
**Specialists:** static-analyzer · pen-tester · red-teamer · compliance-auditor

---

## Executive Summary

The dev-crew Source App has **zero authentication** across all API endpoints. The red-teamer achieved a confirmed live bypass of the work-item state machine — approving a work item with zero votes, zero AI assessment, and zero authorization in three unauthenticated HTTP calls. A second confirmed Critical finding: an unauthenticated orchestrator proxy at `/api/orchestrator/*` enables SSRF against internal infrastructure.

With a compliance pass rate of **~15 %** (4 PASS / 4 PARTIAL / 19 FAIL) and 3 confirmed Critical breaches, this application **must not be exposed to any untrusted network** until authentication is implemented.

| Metric | Value |
|---|---|
| Grade | **F** |
| Critical | **3** (all confirmed live exploit) |
| High | **8** (3 confirmed, 5 theoretical) |
| Medium | **6** (all theoretical) |
| Low | **3** (all theoretical) |
| Confirmed Breaches | **3** |
| Compliance Pass Rate | **~15 %** |
| Red-Team Objectives Achieved | **2 of 4** (+ 1 partial, 1 new finding) |

### Top 3 Risks

1. **Zero Authentication (C-001)** — Every endpoint — create, approve, dispatch, delete — accessible to any unauthenticated HTTP client. Root cause of all Critical findings.
2. **State Machine Bypass Confirmed (C-002)** — Red-teamer approved a work item with 0 votes in 3 HTTP calls. Critical pentest objective achieved.
3. **Orchestrator SSRF Proxy (C-003)** — `/api/orchestrator/*` forwards unauthenticated requests to internal infrastructure; internal URL leaked in error responses.

---

## Consolidated Findings

Findings are deduplicated across all four specialists. PEN-IDs confirmed by RED-IDs are merged and marked **Confirmed (Live Exploit)**.

### Critical — 3 findings (all confirmed)

| ID | Title | Status | Source IDs |
|---|---|---|---|
| **C-001** | Zero Authentication — All API Endpoints Exposed | Confirmed (Live Exploit) | SAST-001, PEN-001, COMP-001, RED-001 |
| **C-002** | State Machine Bypass via Force-Approve | Confirmed — Critical Objective ACHIEVED | PEN-002, PEN-003, RED-002 |
| **C-003** | Unauthenticated Orchestrator Proxy (SSRF) | Confirmed (Live Exploit) | RED-008 (new finding) |

#### C-001 — Zero Authentication
- **CWE:** CWE-306, CWE-862
- **File:** `Source/Backend/src/app.ts:11-44`
- **Detail:** No JWT, session, or API key check anywhere in the middleware chain. Red-teamer created items, modified state, and read all data with unauthenticated `curl`. All 9 API routers + `/metrics` return HTTP 200 to anonymous callers.
- **Remediation:** `app.use(authMiddleware)` before all route registrations. Add RBAC for state-mutating endpoints. This is the **prerequisite** for every other fix.

#### C-002 — State Machine Bypass (Force-Approve)
- **CWE:** CWE-284, CWE-862
- **Exploit Chain (all unauthenticated):**
  1. `POST /api/feature-requests` → item created in `potential` state, 0 votes
  2. `PATCH /api/feature-requests/FR-0003 {"status":"voting"}` → skips AI vote simulation entirely
  3. `POST /api/feature-requests/FR-0003/force-approve` → status `approved`, votes array empty
- **Confirmed:** FR-0003 persisted as `approved` with empty `votes[]`. Entire four-role assessment pod bypassed.
- **Remediation:** (1) Implement auth (C-001). (2) Gate `force-approve` behind admin role + completed assessment prerequisite. (3) Server-side state guard checks prerequisites regardless of HTTP path used.

#### C-003 — Unauthenticated Orchestrator Proxy (SSRF)
- **CWE:** CWE-918, CWE-200
- **Detail:** `/api/orchestrator/*` proxies all requests to internal service. Error response leaks: `"Orchestrator unreachable at http://localhost:8080"`. New finding from red-teamer; verify presence in `Source/Backend/`.
- **Remediation:** Add auth gate before proxy route. Strip internal URL from errors. Allowlist permitted proxy paths.

---

### High — 8 findings

| ID | Title | Status | Source IDs |
|---|---|---|---|
| H-001 | Missing HTTP Security Headers + No CORS Policy | Theoretical | SAST-002, PEN-012, COMP-005/006 |
| H-002 | Unauthenticated Prometheus Metrics Endpoint | **Confirmed** | SAST-004, PEN-008, RED-006 |
| H-003 | Unbounded Pagination — Full Dataset Enumeration | **Confirmed** | SAST-006, PEN-005, RED-005 |
| H-004 | Soft-Delete Dependency DoS | **Partial Confirm** | PEN-006, RED-003 |
| H-005 | Unauthenticated Intake Webhooks / No HMAC | Theoretical | SAST-003, PEN-004, COMP-004 |
| H-006 | Zero Authorization / RBAC | Theoretical | COMP-002 |
| H-007 | Required Audit Events Missing | Theoretical | COMP-003 |
| H-008 | No Rate Limiting on Any Endpoint | Theoretical | SAST-007, PEN-007, COMP-008 |

**H-001:** No CSP, X-Frame-Options, HSTS, nosniff, or CORS policy. → `app.use(helmet()); app.use(cors({ origin: FRONTEND_URL }))`

**H-002:** Red-teamer confirmed `/metrics` returns Prometheus output (routes, heap, CPU, AI invocations) unauthenticated. → Internal-only or Bearer token gate.

**H-003:** All 22 items returned in one unauthenticated call. `?limit=999999` silently ignored. Achieves pentest objective: *"Enumerate all work items without pagination limit enforcement."* → `Math.min(parseInt(limit) || 20, 100)`

**H-004:** Deleting a dependency blocker permanently blocks dependent item readiness (`{ ready: false, unresolved: [{status:"unknown"}] }`). Root: no `ON DELETE CASCADE`. → Add cascade or treat orphaned dependencies as resolved.

**H-005:** Intake endpoints accept arbitrary POST with no HMAC-SHA256 signature check. `type`/`priority` fields bypass enum validation. → Verify `X-Zendesk-Webhook-Signature`; add enum guards matching main POST handler.

**H-006:** No roles, no permissions. Every future authenticated user would have full access to all operations. → RBAC with read-only / operator / admin roles, enforced at service layer.

**H-007:** `login_attempt`, `permission_denied`, `data_export` events never logged. No actor identity in any log entry. SOC2 CC7.1 failure. → After auth: inject actor ID + log all three event types.

**H-008:** No `express-rate-limit`. Assessment and cycle-detection endpoints are unbounded. → `app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))`

---

### Medium — 6 findings (all theoretical)

| ID | Title | Source IDs |
|---|---|---|
| M-001 | Error Message Disclosure in 500 Responses | SAST-005, PEN-014 |
| M-002 | Invalid Enum Values Accepted via Intake | SAST-003 (part), PEN-009 |
| M-003 | Stored XSS via Unescaped Text Fields | PEN-010 |
| M-004 | Docker Container Runs as Root | SAST-009 |
| M-005 | CI `--dangerously-skip-permissions` in All Workflows | SAST-010 |
| M-006 | Unvalidated `page`/`limit` Params — NaN Edge Cases | PEN-011 |

---

### Low — 3 findings (all theoretical)

| ID | Title | Source IDs |
|---|---|---|
| L-001 | Predictable Sequential DocIDs — Resource Enumeration | SAST-008, PEN-015 |
| L-002 | Debug Portal iframe Source via Env Var | SAST-011 |
| L-003 | No Input Length Validation (Source/Backend) | PEN-016 |

---

## Compliance Matrix Summary

**Overall: ~15 % pass rate** (4 PASS / 4 PARTIAL / 19 FAIL across 27 controls)  
Minimum threshold for Grade C is 60 %. Root cause of nearly all failures: complete absence of authentication and authorization.

| Framework | Control | Status | Gap |
|---|---|---|---|
| OWASP-ASVS V2 | Authentication required on all endpoints | FAIL | C-001 |
| OWASP-ASVS V4 | Authorization enforced on every resource | FAIL | H-006 |
| OWASP-ASVS V8 | PII encrypted / masked | PARTIAL | No PII in domain model |
| SOC2 CC6.1 | Logical access restricted to authorized individuals | FAIL | C-001 |
| SOC2 CC6.2 | Credential management | FAIL | C-001 — no credentials system |
| SOC2 CC6.3 | Least privilege | FAIL | H-006 — no RBAC |
| SOC2 CC7.1 | Audit logging with actor identity | FAIL | H-007 |
| SOC2 CC8.1 | Change logging | PARTIAL | state_transition logged; no actor |
| OWASP A01 | Broken Access Control | FAIL | C-001, H-006 |
| OWASP A02 | Cryptographic Failures | PARTIAL | No HSTS (H-001) |
| OWASP A03 | Injection | PARTIAL | SQL mitigated (confirmed); XSS unmitigated (M-003) |
| OWASP A07 | Identification and Auth Failures | FAIL | C-001 |
| OWASP A08 | Data Integrity (webhook signatures) | FAIL | H-005 |
| Security Headers | CSP, HSTS, X-Frame-Options, nosniff | FAIL | H-001 |
| Rate Limiting | DoS prevention | FAIL | H-008 |
| GDPR Art. 32 | Technical measures for personal data | FAIL | C-001 |
| No Hardcoded Credentials | Secret hygiene | **PASS** | Clean — no secrets found |
| Data Minimization | No unnecessary PII in domain | **PASS** | WorkItem model has no PII |
| Generic Error Responses (global handler) | Info disclosure | **PASS** | Global errorHandler correct |
| Enum Validation (main routes) | Input validation | **PASS** | Main POST validates; intake routes do not (M-002) |

---

## Red Team Summary

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — `portal/Backend/` on SQLite/port 3001  
**Date:** 2026-04-27 · **Exploit chains attempted:** 8

> **Target Mismatch Note:** Pen-tester analyzed `Source/Backend/` (in-memory store, `/api/work-items/*` routes). Red-teamer targeted `portal/Backend/` (SQLite, `/api/feature-requests/*` routes). Both backends exhibit identical structural vulnerabilities. Operators must verify C-003 (orchestrator proxy) exists in `Source/Backend/`.

| Objective | Result | Finding |
|---|---|---|
| Bypass work item state machine to reach an invalid status | **ACHIEVED** | RED-002 → C-002 |
| Access or modify a soft-deleted work item via direct ID | **PARTIAL** | RED-003 → H-004 |
| Submit a malformed assessment verdict bypassing routing | Not confirmed | — |
| Enumerate all work items without pagination limit | **ACHIEVED** | RED-005 → H-003 |
| (new) Unauthenticated orchestrator proxy (SSRF) | **CONFIRMED** | RED-008 → C-003 |

**Mitigations confirmed working:**
- SQL injection — parameterized queries, not exploitable
- Input length — `portal/Backend/` enforces title ≤ 200, description ≤ 10,000
- Invalid state jumps — transition validator blocks `potential → completed`
- Bug close without resolve — `/close` enforces `resolved` prerequisite

---

## Grading

| Grade | Threshold | This Run |
|---|---|---|
| A | 0 Critical, ≤2 High, ≥90% compliance | ✗ |
| B | 0 Critical, ≤6 High, ≥75% compliance | ✗ |
| C | ≤1 Critical, ≤12 High, ≥60% compliance | ✗ |
| D | ≤2 Critical | ✗ |
| **F** | Any confirmed red-team breach of a critical objective | **✓ — C-002 (RED-002)** |

**Final Grade: F**

---

## Remediation Priority Order

1. **C-001 — Add Authentication** ← prerequisite for everything else
2. **C-002 — Fix State Machine Bypass** — gate `force-approve` + server-side prerequisite validation
3. **C-003 — Gate Orchestrator Proxy** — add auth, strip error details, allowlist paths
4. **H-001 — `helmet` + CORS** — one-liner fix
5. **H-002 — Restrict `/metrics`** — internal-only or token gate
6. **H-003 — Cap pagination limit** — `Math.min(parseInt(limit)||20, 100)`
7. **H-005 — HMAC webhook verification**
8. **H-006 — Implement RBAC** (after auth)
9. **H-007 — Audit event logging** (after auth)
10. **H-008 — Rate limiting** — `express-rate-limit`

---

## Artifacts

| Artifact | Path |
|---|---|
| Full HTML Report | `Teams/TheGuardians/findings/security-report-2026-04-27-F.html` |
| Security Backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-04-27.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

*Generated by TheGuardians · Run `run-20260427-062406` · 2026-04-27*  
*Specialists: static-analyzer · pen-tester · red-teamer · compliance-auditor*
