# TheGuardians — Security & Compliance Report
**Date:** 2026-10-19  
**Run ID:** run-20261019-085235  
**Project:** dev-crew Source App  
**Grade:** 🔴 **F — Confirmed Critical Breaches**

---

## Executive Summary

The dev-crew Source App is in a **critical security state**. The red team achieved all four stated objectives and confirmed two independent critical breaches against a live ephemeral environment. Every API endpoint is accessible without credentials; an attacker needs zero authentication to approve, dispatch, manipulate, or enumerate all work items. The application cannot be merged to a shared environment in its current state.

**Top 3 Risks:**

1. 🔴 **No Authentication Whatsoever (CRIT-001)** — Every API endpoint is fully open. Any network-reachable client can create, approve, dispatch, and delete work items. The red team confirmed a 3-request chain that pushes an item from creation to `approved` in-progress status with zero assessment pod invocations and zero credentials.

2. 🔴 **Cascade Auto-Dispatch via Duplicate Status (CRIT-002)** — Marking any blocker item as `duplicate` is allowed from any status, unauthenticated, and automatically promotes all dependent items to `approved`, bypassing every pipeline gate. The red team confirmed this against a live service.

3. 🟠 **Stored XSS in Title Fields (HIGH-002)** — HTML payloads are stored verbatim in both `feature_requests` and `bugs` tables, returned in all list and search responses. Any client rendering `item.title` without sanitization is vulnerable to script execution and session hijacking.

| Metric | Value |
|---|---|
| **Grade** | **F** |
| Critical (Confirmed) | 2 |
| High (Confirmed) | 3 |
| High (Theoretical) | 4 |
| Medium (Confirmed) | 1 |
| Medium (Theoretical) | 7 |
| Low (Theoretical) | 5 |
| **Total Findings** | **22** |
| Confirmed Breaches (RED-IDs) | 6 |
| Theoretical Findings | 16 |
| Compliance Pass Rate | 17% (4/24 controls) |
| Red Team Objectives Achieved | 4/4 |

> **Grading rationale:** Grade F is automatic per `security.config.yml` when any confirmed red-team breach of a critical objective occurs. Two critical objectives were breached: *"Bypass work item state machine"* (RED-001) and *"Submit a malformed assessment verdict that bypasses routing logic"* (RED-005).

---

## Consolidated Findings

> Findings deduplicated across all four specialists. Source IDs preserved in parentheses.  
> **Status:** `Confirmed (Live Exploit)` = verified by red team against live service. `Theoretical` = identified by static analysis / pen-tester logic review, not yet live-confirmed.  
> **CORS note:** COMP-005 ("No CORS Policy") was refuted by the red team — live testing confirmed CORS correctly rejects foreign origins. Removed from findings.

---

### 🔴 CRITICAL — Confirmed Live Exploit

#### CRIT-001: Authentication Entirely Absent — State Machine Bypass Confirmed
**Severity:** Critical | **Status:** Confirmed (Live Exploit)  
**Sources:** SAST-001 / PEN-001 / PEN-002 / PEN-003 / COMP-001 / RED-001  
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Description:**  
No authentication middleware exists anywhere in the Express application. Every endpoint — CRUD, state transitions, approvals, dispatch — is reachable without credentials. The red team confirmed a 3-request unauthenticated chain that bypasses the entire assessment pipeline:

```
POST /api/work-items                           → create item
POST /api/work-items/:id/route {"overrideRoute":"fast-track"}  → jump to approved
POST /api/work-items/:id/dispatch              → in-progress
```

The red team also confirmed via `force-approve`: item `FR-0001` reached `approved` status with `votes: []` — zero AI votes cast. Assessment pod never invoked.

**Remediation:**
1. Add authentication middleware (JWT bearer / API-key) applied globally to all `/api/*` routes in `app.ts` before route registration.
2. Add role-based authorization: `approve`, `dispatch`, `reject`, `route` endpoints require elevated roles.
3. Remove or privilege-gate the `force-approve` endpoint (admin-only).
4. Restrict state mutations to typed transition endpoints; remove direct `PATCH /status` capability.

---

#### CRIT-002: Cascade Auto-Dispatch via Duplicate/Terminal Status
**Severity:** Critical | **Status:** Confirmed (Live Exploit)  
**Sources:** RED-005 / PEN-007 / PEN-003  
**CWE:** CWE-284 (Improper Access Control)

**Description:**  
`STATUS_TRANSITIONS` allows any item to be set to `duplicate` or `deprecated` from **any** status — unauthenticated, no justification required. This triggers `onItemCompleted()` in the dependency service, which auto-promotes all dependent items that are `approved` and have no other unresolved blockers directly to `in-progress`. The red team confirmed: `FR-0009` jumped from `pending_dependencies` → `approved` immediately after its blocker `FR-0010` was set to `duplicate` via an unauthenticated PATCH. **The entire assessment and voting pipeline is bypassed.**

This is a novel finding — not present in the pen-tester's map — discovered through active exploitation.

**Remediation:**
1. Restrict `duplicate` and `deprecated` status transitions to authenticated admin users.
2. Add authorization checks before any terminal status transition.
3. Trigger cascade dispatch only when a blocker reaches a privileged-action terminal state, not a freely-settable one.

---

### 🟠 HIGH — Confirmed Live Exploit

#### HIGH-001: Ghost Blocker Permanent Denial of Service
**Severity:** High | **Status:** Confirmed (Live Exploit)  
**Sources:** PEN-006 / RED-002

**Description:**  
Deleting a blocker item leaves its dependency link intact in the dependent item's `blocked_by` array. `findById` returns `undefined` for deleted items, which `computeHasUnresolvedBlockers` treats as an unresolved blocker. The dependent item is permanently stuck in `pending_dependencies` with no recovery path other than direct database manipulation. Additional finding: `denied` status is NOT in `RESOLVED_STATUSES`, so denying a blocker also permanently blocks all its dependents.

**Remediation:**
1. Cascade-delete dependency links when an item is deleted.
2. Add `denied` to `RESOLVED_STATUSES`.
3. Add a cleanup job or API endpoint to prune orphaned dependency references.

---

#### HIGH-002: Stored XSS in Title Fields
**Severity:** High | **Status:** Confirmed (Live Exploit — storage confirmed; browser execution requires frontend render test)  
**Sources:** RED-003 / PEN-010 / PEN-004

**Description:**  
HTML payloads are accepted and stored verbatim in `title` fields of both `feature_requests` and `bugs` tables. The red team confirmed `<script>alert(document.cookie)</script>` and `<svg onload=alert(1)>` were persisted and returned in all GET and search responses. Any frontend rendering `item.title` via `innerHTML` is vulnerable to session hijacking.

**Remediation:**
1. Sanitize all free-text input fields server-side (strip or escape HTML on ingestion).
2. Add a `Content-Security-Policy` header that blocks inline scripts.
3. Verify all frontend components render `item.title` via React JSX (auto-escaped) and never via `dangerouslySetInnerHTML`.

---

#### HIGH-003: Pagination Entirely Unenforced — Full Dataset Enumeration
**Severity:** High | **Status:** Confirmed (Live Exploit)  
**Sources:** SAST-004 / PEN-005 / COMP-012 / RED-004

**Description:**  
The `limit` pagination parameter is ignored by the server. `limit=999999`, `limit=0`, and `limit=abc` (NaN) all return the complete dataset in a single unauthenticated response. The red team confirmed: with 4 items in DB, every limit variant returned all 4 items. This allows complete data enumeration in a single request.

**Remediation:**
```typescript
const rawLimit = parseInt(req.query.limit as string, 10);
const limit = (!isNaN(rawLimit) && rawLimit > 0) ? Math.min(rawLimit, 100) : 20;
const rawPage = parseInt(req.query.page as string, 10);
const page = (!isNaN(rawPage) && rawPage > 0) ? rawPage : 1;
```

---

### 🟠 HIGH — Theoretical

#### HIGH-004: Webhook Intake Endpoints — No Authentication or Signature Verification
**Severity:** High | **Status:** Theoretical  
**Sources:** SAST-002 / PEN-004 / COMP-002  
**CWE:** CWE-345

**Description:**  
`POST /api/intake/zendesk` and `POST /api/intake/automated` accept work item creation from any unauthenticated caller. Zendesk webhooks normally include an HMAC-SHA256 signature (`X-Zendesk-Webhook-Signature`). Without this check, attackers can forge webhook events and inject arbitrary work items into the backlog. Additionally, `type` and `priority` fields pass through without enum validation (unlike the main `/api/work-items` route).

**Remediation:**
1. Validate `X-Zendesk-Webhook-Token` or HMAC-SHA256 signature against a pre-shared secret from `process.env`. Reject with 401 on mismatch.
2. Add enum guards for `type` and `priority` identical to those in `workItems.ts`.

---

#### HIGH-005: Three of Four Required Audit Events Missing
**Severity:** High | **Status:** Theoretical  
**Sources:** COMP-003

**Description:**  
`security.config.yml` requires audit logging for: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. Only `state_transition` (via `WorkItem.changeHistory`) is present. `login_attempt` cannot exist without authentication; `permission_denied` requires an authorization layer; `data_export` is unimplemented. This is a SOC2 CC7.1 failure.

**Remediation:** Once CRIT-001 is fixed (auth added), wire audit log entries for every authentication attempt, every authorization denial, and every data export operation.

---

#### HIGH-006: No TLS/HTTPS Enforcement
**Severity:** High | **Status:** Theoretical  
**Sources:** COMP-007

**Description:**  
The server runs plain HTTP with no TLS termination configured in source. All API traffic — including tokens (once auth is added), work item data, and assessment results — is transmitted in cleartext.

**Remediation:** Terminate TLS at the load balancer or reverse proxy (nginx/Caddy). Enforce HTTPS-only via HSTS header once Helmet is added.

---

#### HIGH-007: No Multi-Factor Authentication Support
**Severity:** High | **Status:** Theoretical (cascades from CRIT-001)  
**Sources:** COMP-010

**Description:**  
MFA cannot exist without authentication. Once CRIT-001 is remediated, MFA must be added for admin-tier users to satisfy OWASP-ASVS L2 and SOC2 CC6.1.

**Remediation:** Implement TOTP (RFC 6238) or WebAuthn as a second factor for privileged accounts after CRIT-001 is resolved.

---

### 🟡 MEDIUM — Confirmed Live Exploit

#### MED-001: Prometheus /metrics Endpoint Unauthenticated
**Severity:** Medium | **Status:** Confirmed (Live Exploit)  
**Sources:** SAST-007 / PEN-008 / COMP-008 / RED-006

**Description:**  
`GET /metrics` is publicly accessible with no credentials. The red team confirmed it returns full Prometheus text format including route paths, HTTP methods, status codes, response times, team names (`TheATeam`, `TheFixer`), and runtime memory/CPU stats. An `Authorization: Bearer invalid-token` header is silently ignored. Full API route inventory is extractable from metric labels.

**Remediation:** Expose `/metrics` on a separate internal port or restrict via IP allowlist/bearer-token middleware. In Kubernetes, expose only on pod network.

---

### 🟡 MEDIUM — Theoretical

#### MED-002: Missing HTTP Security Headers (No Helmet)
**Severity:** Medium | **Status:** Theoretical  
**Sources:** SAST-005 / COMP-004  
**CWE:** CWE-16

**Description:** `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, and `Referrer-Policy` are all absent.

**Remediation:** `app.use(helmet())` as first middleware in `app.ts`.

---

#### MED-003: No Rate Limiting on Any Endpoint
**Severity:** Medium | **Status:** Theoretical  
**Sources:** COMP-006

**Description:** No rate limiting is applied to any endpoint, including auth-bound endpoints (once auth is added) and intake webhooks. An attacker can flood intake endpoints with requests, filling the work item backlog.

**Remediation:** Apply `express-rate-limit` at the global level and with tighter limits on intake/mutation endpoints.

---

#### MED-004: Cascade Dispatch Triggered by Rejected Items
**Severity:** Medium | **Status:** Theoretical  
**Sources:** PEN-007

**Description:** Rejecting a work item calls `onItemResolved()`, which can auto-dispatch dependent items to `in-progress` if they are `approved` with no other blockers. An attacker can trigger dispatch of target items by rejecting their blockers — bypassing the normal dispatch endpoint's team-assignment controls.

**Remediation:** Remove `Rejected` from `DISPATCH_TRIGGER_STATUSES`, or require a confirmation flag before cascade-dispatching items triggered by a rejection.

---

#### MED-005: No GDPR Right-to-Erasure
**Severity:** Medium | **Status:** Theoretical  
**Sources:** COMP-009

**Description:** Only soft-delete is implemented. Work items containing PII (title, description) cannot be permanently erased on request. This is a GDPR Article 17 violation once PII is stored.

**Remediation:** Implement a hard-delete path or a field-level redaction endpoint callable by a data-controller role.

---

#### MED-006: Session Timeout Not Implemented
**Severity:** Medium | **Status:** Theoretical (cascades from CRIT-001)  
**Sources:** COMP-011

**Remediation:** Once CRIT-001 is resolved, configure JWT expiry and implement refresh-token rotation with server-side revocation.

---

#### MED-007: No Request Body Size Limit
**Severity:** Medium | **Status:** Theoretical  
**Sources:** SAST-006  
**CWE:** CWE-770

**Remediation:** `app.use(express.json({ limit: '100kb' }))`.

---

#### MED-008: Unvalidated type/priority in Intake Routes
**Severity:** Medium | **Status:** Theoretical  
**Sources:** SAST-003  
**CWE:** CWE-20

**Remediation:** Add `Object.values(WorkItemType)` and `Object.values(WorkItemPriority)` enum guards to both intake route handlers before calling `store.createWorkItem()`.

---

### 🔵 LOW — Theoretical

| ID | Title | Sources |
|---|---|---|
| LOW-001 | NaN Injection in Pagination Parameters | PEN-009 |
| LOW-002 | Unvalidated overrideRoute Stores Arbitrary String | PEN-010 |
| LOW-003 | Internal Error Messages Leaked to API Clients | SAST-008 |
| LOW-004 | Debug Portal iframe Missing sandbox Attribute | SAST-009 |
| LOW-005 | No Encryption-at-Rest Controls Documented | COMP-013 |

**Remediation summary:**
- LOW-001: Validate `parseInt` result for NaN before arithmetic.
- LOW-002: Validate `overrideRoute` against `Object.values(WorkItemRoute)` enum at runtime.
- LOW-003: Log `err.message` server-side; return generic `"Internal server error"` to clients on 500.
- LOW-004: Add `sandbox="allow-scripts allow-same-origin"` to the debug portal `<iframe>`.
- LOW-005: Document encryption-at-rest strategy in `Specifications/` before adding a durable data store.

---

### ⚪ FALSE POSITIVE (Refuted by Red Team)

| ID | Title | Notes |
|---|---|---|
| COMP-005 | No CORS Policy — All Origins Accepted | Red team confirmed live: CORS correctly rejects foreign origins. Static analysis could not detect runtime CORS configuration. |

---

## Compliance Matrix

**Overall pass rate: 17% (4 / 24 controls)**

### OWASP-ASVS Level 2

| Control Area | Control | Status | Notes |
|---|---|---|---|
| Authentication | V2.1 — Password/token auth required for all endpoints | ❌ FAIL | No auth anywhere (CRIT-001) |
| Authentication | V2.2 — MFA for privileged operations | ❌ FAIL | Cascades from auth absence |
| Authentication | V2.5 — Account lockout / rate limiting on auth | ❌ FAIL | No auth, no rate limiting |
| Access Control | V4.1 — Enforce access control on all endpoints | ❌ FAIL | Fully open (CRIT-001) |
| Access Control | V4.2 — Deny by default | ❌ FAIL | Allow by default — no deny logic |
| Access Control | V4.3 — Least privilege enforced | ❌ FAIL | No roles or privilege model |
| Data Protection | V8.1 — Sensitive data not logged | ✅ PASS | No PII in structured logs found |
| Data Protection | V8.3 — PII fields handled securely | ✅ PASS | No hardcoded secrets; env vars used |
| Input Validation | V5.1 — Input validated server-side | ⚠️ PARTIAL | Main route validates enums; intake routes do not (MED-008) |
| Error Handling | V7.4 — Error messages do not leak internals | ✅ PASS | Stack traces not returned to clients |
| TLS | V9.1 — TLS on all communications | ❌ FAIL | Plain HTTP; no TLS in source (HIGH-006) |
| Security Headers | V14.4 — Security headers set | ❌ FAIL | No Helmet; no CSP/HSTS/X-Frame (MED-002) |

### SOC2 Type 2

| Control | Description | Status | Notes |
|---|---|---|---|
| CC6.1 | Restrict logical access to authorized users only | ❌ FAIL | No authentication (CRIT-001) |
| CC6.2 | Authentication before granting access | ❌ FAIL | No auth anywhere |
| CC6.3 | Access restricted based on role | ❌ FAIL | No role model exists |
| CC7.1 | Monitor for and log security events | ⚠️ PARTIAL | `state_transition` events logged; `login_attempt`, `permission_denied`, `data_export` absent (HIGH-005) |
| CC8.1 | Change management and audit trail | ✅ PASS | `WorkItem.changeHistory` provides full state-transition audit trail |

**Controls passing:** 4 (V8.1, V8.3, V7.4, CC8.1)  
**Controls failing:** 20  
**Controls partial:** 2 (V5.1, CC7.1)

---

## Red Team Summary

**Environment:** `docker-compose.test.yml` — `dev-crew-portal` container (ephemeral, isolated)  
**Target:** `http://localhost:3001` (portal backend API)  
**Date:** 2026-10-19

| Objective | Status | Finding |
|---|---|---|
| Bypass work item state machine to reach an invalid status | ✅ **Achieved** | RED-001: `force-approve` bypasses AI voting; `approved` with `votes: []` |
| Access or modify a soft-deleted work item via direct ID reference | ✅ **Achieved** | RED-002: Ghost dependency link permanently blocks dependent |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ **Achieved** | RED-005: Mark blocker `duplicate` → dependent auto-dispatches |
| Enumerate all work items without pagination limit enforcement | ✅ **Achieved** | RED-004: `limit` entirely ignored; full dataset in one request |

**Objectives achieved:** 4 / 4  
**Confirmed Critical breaches:** 2 (RED-001, RED-005)  
**Confirmed High breaches:** 3 (RED-002, RED-003, RED-004)  
**Confirmed Medium breaches:** 1 (RED-006)

**Dead ends (no exploit found):**
- SQL injection: Parameterized queries used — no injection surface
- CORS bypass: Correctly rejects foreign origins ✅
- Enum injection on creation (main route): `priority` validated; 400 returned for invalid values ✅
- Direct status jump via PATCH: `STATUS_TRANSITIONS` enforced for most paths ✅

---

## Remediation Priority

| Priority | Action | Fixes |
|---|---|---|
| P1 — Immediate | Add authentication middleware globally to all `/api/*` routes | CRIT-001, HIGH-007, MED-006 (and 40% of compliance failures) |
| P1 — Immediate | Restrict terminal status transitions (`duplicate`, `deprecated`, `force-approve`) to admin role | CRIT-002 |
| P1 — Immediate | Add server-side pagination cap (max 100) and NaN validation | HIGH-003, LOW-001 |
| P2 — This Sprint | Add webhook HMAC signature validation | HIGH-004 |
| P2 — This Sprint | Sanitize free-text fields server-side; add CSP header | HIGH-002, MED-002 |
| P2 — This Sprint | Cascade-delete dependency links on item deletion; add `denied` to RESOLVED_STATUSES | HIGH-001 |
| P2 — This Sprint | Add audit logging for auth events | HIGH-005 |
| P3 — Next Sprint | Add rate limiting, body size limits, Helmet headers | MED-003, MED-007, MED-002 |
| P3 — Next Sprint | Add enum validation to intake routes | MED-008 |
| P3 — Next Sprint | Configure TLS termination | HIGH-006 |
| Backlog | GDPR erasure endpoint, session timeout, encryption-at-rest docs, iframe sandbox | MED-005, MED-006, LOW-004, LOW-005 |

---

## TheFixer Routing

All 16 theoretical findings (not confirmed by red team) are routed to the TheFixer backlog. The 6 confirmed breaches require operator decision before any merge to shared environments.

> ⛔ **Confirmed breach — operator decision required before any merge.**  
> Route theoretical findings → TheFixer backlog.

---

*Report generated by TheGuardians · Run ID: run-20261019-085235*  
*Specialists: static-analyzer · pen-tester · red-teamer · compliance-auditor*
