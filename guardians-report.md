# TheGuardians Security & Compliance Report

**Date:** 2026-09-14  
**Application:** dev-crew Source App  
**Grade: 🔴 F — Automatic (Confirmed Red-Team Breach of Critical Objectives)**  
**Run produced by:** static-analyzer · compliance-auditor · pen-tester · red-teamer

---

## Executive Summary

The dev-crew Source App / portal backend has **zero authentication, zero authorization, and zero rate limiting** on every API endpoint. This is not a misconfiguration — it is a complete absence of any access control at any layer. Any unauthenticated HTTP caller can enumerate, create, modify, approve, force-approve, deny, reject, delete, and dispatch any resource in the system.

The red-team confirmed three out of four pentest objectives as live, exploitable breaches in less than three HTTP requests each. The compliance pass rate is **23% (3/13 controls)**, far below every grade threshold.

**Grade: F** — automatic under the grading rubric because confirmed red-team breaches of critical objectives were demonstrated.

### Top 3 Risks

| # | Risk | Status | Impact |
|---|------|--------|--------|
| 1 | **No Authentication or Authorization** — any caller has full admin access | ✅ Confirmed Exploited | Total system compromise |
| 2 | **State Machine Bypass** — `force-approve` reachable with zero credentials | ✅ Confirmed Exploited | Entire governance pipeline bypassed |
| 3 | **Stored XSS + Full Data Exfiltration** — payloads stored, pagination ignored | ✅ Confirmed Exploited | Data theft + persistent XSS in every browser |

---

## Grading

| Criterion | Threshold | Actual | Result |
|-----------|-----------|--------|--------|
| Confirmed red-team breach of a critical objective | 0 allowed | 3 breaches | ❌ **F** (automatic) |
| Critical findings | ≤ 2 for D | 2 Confirmed | — |
| High findings | ≤ 6 for B | 7 | — |
| Compliance pass rate | ≥ 75% for B | **23%** | — |

**Final Grade: F**

---

## Red Team Summary

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — gate confirmed  
**Target:** `http://localhost:3001` (portal/Backend)  
**Scope mismatch note:** Pen-tester mapped `Source/Backend/`; live container runs `portal/Backend/`. Both share the same root vulnerability (zero auth). All RED findings confirmed against the live target.

| Objective | Result |
|-----------|--------|
| Bypass work item state machine to reach an invalid status | ✅ **Achieved** — RED-002: `potential→voting→approved→in_development` in 3 unauthenticated requests |
| Access or modify a soft-deleted work item via direct ID reference | ✅ **Achieved** — RED-005: soft-deleted ID leaked through dependency array; state modified post-deletion |
| Submit a malformed assessment verdict bypassing routing logic | ⚠️ **Partial** — `force-approve` bypasses voting entirely (RED-002); enum injection blocked on main routes |
| Enumerate all work items without pagination limit enforcement | ✅ **Achieved** — RED-006: `limit` parameter ignored; all records always returned in one response |

**Objectives achieved: 3/4 | Confirmed critical breaches: 3**

### Dead Ends (Mitigated Controls)

| Attack | Outcome |
|--------|---------|
| SQL Injection | Not applicable — in-memory store |
| Prototype Pollution | `__proto__`/`constructor` rejected by enum validation on main routes |
| Mass Assignment | Internal fields (`id`, `votes`, `created_at`) ignored by service layer |
| CORS bypass from browser | CORS correctly restricts cross-origin from evil domains |

---

## Consolidated Findings

> Deduplication: where a PEN-ID was confirmed by a RED-ID, findings are merged into a single entry. Where SAST and compliance findings map to the same root cause, they are merged. Unconfirmed findings are marked **Theoretical**.

---

### 🔴 CRITICAL — Confirmed (Live Exploit)

---

#### CRIT-001 — Complete Absence of Authentication and Authorization

**Sources:** SAST-001 · PEN-001 · PEN-002 · COMP-001 · COMP-002 · RED-001 · RED-003  
**Status:** Confirmed (Live Exploit)  
**CWE:** CWE-306 · CWE-862  
**Framework violations:** OWASP-ASVS V2.1 (Authentication) · OWASP-ASVS V4.1 (Access Control) · SOC2 CC6.1 · CC6.2 · CC6.3

Every API endpoint — CRUD, workflow transitions, approval, denial, dispatch, intake, and dashboard — accepts anonymous HTTP requests with no token, session, API key, or identity check of any kind. The red team confirmed with HTTP 200 responses across all seven primary endpoint families (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/team-dispatches`). Full CRUD verified with zero credentials: create (201), read (200), modify (200), delete (204).

Additionally, any caller can destroy any record: `POST /api/feature-requests/FR-0068/deny` and `DELETE /api/feature-requests/FR-0008` both executed successfully with no authorization.

**Files:** `Source/Backend/src/app.ts` lines 22–31 · `portal/Backend/src/index.ts`  
**Exploit:** `curl http://localhost:3001/api/feature-requests` → HTTP 200, full dataset, no credentials  
**Remediation:**
1. Add JWT authentication middleware globally in `app.ts` before all `/api/*` routes
2. Implement role-based access control (viewer / operator / admin) for mutation endpoints
3. Derive actor identity from authenticated token — never from request body
4. Protect `/metrics` endpoint with bearer token or internal-network restriction

---

#### CRIT-002 — State Machine Bypass via Unauthenticated Force-Approve

**Sources:** PEN-003 · PEN-004 · RED-002  
**Status:** Confirmed (Live Exploit) — ✅ Objective Achieved  
**CWE:** CWE-284 · CWE-285  
**Framework violations:** OWASP-ASVS V4.1 · SOC2 CC6.3

`POST /api/feature-requests/:id/force-approve` requires no authentication and no admin role. The red team executed a three-request exploit chain: (1) create item → `potential`, (2) trigger voting → `voting`, (3) force-approve → `approved` with `human_approval_approved_at` timestamp set as if legitimately approved, (4) advance to `in_development` via PATCH. The entire voting and human-review pipeline was bypassed in under five HTTP requests with no credentials. The governance control that prevents items from reaching development without human review is completely non-functional.

**Files:** `Source/Backend/src/routes/workflow.ts` lines 39–64 · `portal/Backend/` approve/force-approve handlers  
**Exploit:** `POST /api/feature-requests/FR-0009/force-approve {"reason":"red team"}` → HTTP 200, `"status":"approved"`  
**Remediation:**
1. All approval endpoints (`/approve`, `/force-approve`, `/deny`) must require authenticated admin role
2. The `force-approve` endpoint should be rate-limited (max 5/min per operator) and require written justification logged as an audit event
3. Implement state machine enforcement at the service layer — states must only advance through validated transitions by verified actors

---

### 🟠 HIGH — Confirmed (Live Exploit)

---

#### HIGH-001 — Full Data Exfiltration via Unbounded Pagination

**Sources:** SAST-005 · PEN-009 · RED-006  
**Status:** Confirmed (Live Exploit) — ✅ Objective Achieved  
**CWE:** CWE-770  
**Framework violations:** OWASP-ASVS V13.1 · SOC2 CC6.1

The `limit` query parameter is completely ignored by `listFeatureRequests()`. The red team confirmed that `GET /api/feature-requests?limit=1` and `GET /api/feature-requests?limit=999999` both return the full dataset (67 items after flood test). No pagination metadata (`total`, `page`, `limit`, `totalPages`) is returned. Any unauthenticated caller can exfiltrate the entire dataset in a single HTTP request.

**Files:** `Source/Backend/src/routes/workItems.ts` line 70 · `portal/Backend/` list handlers  
**Exploit:** `curl "http://localhost:3001/api/feature-requests?limit=1"` → returns all 67 records  
**Remediation:**
1. Implement server-side pagination at the service layer with a hard maximum of 100 items per page
2. Return `{data, total, page, limit, totalPages}` structure
3. Return HTTP 400 for non-numeric or out-of-range `limit`/`page` values

---

#### HIGH-002 — Stored XSS via Unvalidated Title and Description Fields

**Sources:** RED-004 (new — not in SAST or PEN reports)  
**Status:** Confirmed (Live Exploit)  
**CWE:** CWE-79  
**Framework violations:** OWASP-ASVS V5.3 · SOC2 CC6.1

The red team stored three XSS payloads verbatim via `POST /api/feature-requests`: `<script>alert(document.cookie)</script>`, `<img src=x onerror=alert(1)>`, and `<svg onload=alert(1)>`. All three returned HTTP 201 and are available via `GET /api/feature-requests`. If the frontend renders `title` or `description` as HTML (via `innerHTML` or `dangerouslySetInnerHTML`), the payloads fire in every user's browser that loads the feature-requests page.

**Files:** `portal/Backend/` create handlers · `Source/Frontend/` feature-request rendering  
**Remediation:**
1. Apply server-side HTML sanitization (e.g., `sanitize-html`, DOMPurify) before storing any free-text field
2. Ensure React components render user content as text (default JSX behavior) — never use `dangerouslySetInnerHTML` for user-supplied data
3. Add `Content-Security-Policy: default-src 'self'; script-src 'self'` via Helmet to block inline script execution

---

### 🟠 HIGH — Theoretical

---

#### HIGH-003 — Webhook Intake Lacks HMAC/Signature Verification

**Sources:** SAST-002 · PEN-005  
**Status:** Theoretical  
**CWE:** CWE-346 · CWE-290

`POST /api/intake/zendesk` and `POST /api/intake/automated` accept any POST with a `title` and `description` body. No `X-Zendesk-Webhook-Signature` HMAC-SHA256 verification, no API key header, no IP allowlist. An attacker can impersonate Zendesk and inject arbitrary items into the workflow queue, indistinguishable from legitimate tickets.

**Remediation:** Verify `X-Zendesk-Webhook-Signature` using HMAC-SHA256 against `process.env.ZENDESK_WEBHOOK_SECRET`. Require a bearer token for `/automated`. Store the secret in environment variables, never in source.

---

#### HIGH-004 — Unvalidated Enum Inputs in Intake Webhook

**Sources:** SAST-003 · PEN-006  
**Status:** Theoretical (enum injection blocked on main routes per red team)  
**CWE:** CWE-20

The intake routes use `body.type || WorkItemType.Bug` without enum validation. Any non-empty truthy string (e.g., `"EXPLOIT"`, `"__proto__"`) passes through and is stored verbatim. The main `/api/work-items` POST validates enums correctly; intake routes do not. This inconsistency allows data integrity violations and may corrupt assessment routing logic.

**Remediation:** Apply `Object.values(WorkItemType).includes(body.type)` guard in all intake routes, matching the validation pattern in `workItems.ts` lines 29–42. Reject with HTTP 400 on invalid values.

---

#### HIGH-005 — Soft-Delete Creates Permanent Dispatch Denial-of-Service

**Sources:** PEN-007  
**Status:** Theoretical  
**CWE:** CWE-400

When a blocker item is soft-deleted, `findById()` returns `undefined` for it. `computeHasUnresolvedBlockers()` treats `undefined` as an unresolved blocker, permanently blocking dispatch of any dependent item with no recovery path. An attacker (or accidental soft-delete) can permanently freeze any work item's dispatch by deleting its blocker.

**Remediation:** When soft-deleting an item, cascade-remove its ID from all `blockedBy`/`blocks` arrays of related items. Or implement a hard-delete path. Alternatively, treat `undefined` (missing blocker) as a resolved blocker rather than unresolved.

---

#### HIGH-006 — All Four Required Audit Events Missing (Compliance)

**Sources:** COMP-003  
**Status:** Compliance Gap  
**Framework violations:** SOC2 CC7.1 · OWASP-ASVS V7.2

None of the four mandated audit events (`login_attempt`, `permission_denied`, `state_transition`, `data_export`) are emitted as structured, typed log entries. `login_attempt` and `permission_denied` have no implementation because no auth layer exists. `state_transition` changes are logged as operational `info` but not as filterable audit entries. `data_export` is never emitted. SOC2 CC7.1 requires these for incident investigation.

**Remediation:**
1. Add an `audit` severity level to `utils/logger.ts` with `"type":"audit_event"` tagging
2. Emit `{ event: "state_transition", workItemId, from, to, actor }` on every status change
3. Once authentication exists, emit `login_attempt` (success/failure) and `permission_denied` events
4. Add a `data_export` event for list endpoints returning > N records

---

#### HIGH-007 — No Data Encryption at Rest (Compliance)

**Sources:** COMP-007  
**Status:** Compliance Gap  
**Framework violations:** OWASP-ASVS V8.3 · SOC2 CC6.1

All application data is stored in a JavaScript `Map` with no persistence, no database, and no encryption at rest. Data is lost on process restart. The Zendesk intake endpoint can store arbitrary `body.description` content that may include PII. No field-level encryption or masking exists.

**Remediation:** Migrate to a persistent database (PostgreSQL or SQLite) with encrypted storage volumes. Document which data types may be stored until migration is complete.

---

### 🟡 MEDIUM — Confirmed (Live Exploit)

---

#### MED-001 — Soft-Deleted Item ID Leakage via Dependency References (IDOR)

**Sources:** PEN-008 · RED-005  
**Status:** Confirmed (Live Exploit) — ✅ Objective Achieved  
**CWE:** CWE-284 · CWE-639

After soft-deleting `FR-0012`, its ID remained in `FR-0011`'s `blocked_by` array (`"item_id":"FR-0012","title":"Unknown","status":"unknown"`). The red team used the leaked ID to invoke `POST /api/feature-requests/FR-0011/dependencies {"action":"remove","blocker_id":"FR-0012"}` — successfully modifying state via a soft-deleted item's reference. `has_unresolved_blockers: true` also persists, creating dispatch denial.

**Remediation:** On soft-delete, cascade-remove the deleted item's ID from all dependency arrays of related items. Filter soft-deleted IDs from dependency response payloads.

---

#### MED-002 — No Rate Limiting — Request Flood Confirmed

**Sources:** SAST-009 · PEN-014 · COMP-006 · RED-007  
**Status:** Confirmed (Live Exploit)  
**CWE:** CWE-799  
**Framework violations:** OWASP-ASVS V13.1 · SOC2 CC6.1

50 concurrent POST requests all succeeded with no HTTP 429. Database grew from 17 to 67 records in a single burst. No rate-limiting middleware detected in `portal/Backend/src/index.ts`. Linear DoS risk at scale.

**Remediation:** Add `express-rate-limit` globally (100 req/min per IP for GETs, 20 req/min for POSTs). Apply tighter limits to `/approve`, `/force-approve`, `/deny`, `/vote` (5 req/min). Add IP allowlisting for webhook intake endpoints.

---

#### MED-003 — Unauthenticated Dashboard Exposes Full Internal State

**Sources:** PEN-011 · RED-008  
**Status:** Confirmed (Live Exploit)  
**CWE:** CWE-200 · CWE-306

`GET /api/dashboard/summary` and `GET /api/dashboard/activity` both return HTTP 200 with zero credentials. Activity feed exposes full audit log: 14 recent events, entity IDs, descriptions, timestamps, agent names, and all state transitions — providing a reconnaissance map to attackers.

**Remediation:** Require at minimum a read-only authenticated session for all dashboard endpoints. The activity feed especially must be restricted to authenticated operators.

---

### 🟡 MEDIUM — Theoretical

---

#### MED-004 — Internal Error Messages Leaked to HTTP Clients

**Sources:** SAST-006 · COMP-009  
**Status:** Theoretical  
**CWE:** CWE-209 · OWASP-ASVS V7.4

All six workflow action handlers (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`, `/dependencies`) return raw `Error.message` in HTTP 500 responses. The existing `errorHandler` middleware sanitizes correctly, but these in-handler catches bypass it.

**Remediation:** Log the full error internally; return `{"error":"Internal server error"}` for all 500s. Map known errors (not-found, invalid-state) to appropriate 4xx responses.

---

#### MED-005 — Missing HTTP Security Headers (No Helmet)

**Sources:** SAST-007 · COMP-004  
**Status:** Theoretical  
**CWE:** CWE-16 · OWASP A05:2021  
**Framework violations:** OWASP-ASVS V14.4 · SOC2 CC6.1

`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers are all absent. Without CSP, the stored XSS payloads (HIGH-002) have no browser-level mitigation.

**Remediation:** `npm install helmet` and `app.use(helmet())` as the first middleware. Tune CSP for the application's actual asset origins. This is a one-line fix.

---

#### MED-006 — iframe Debug Portal Missing sandbox Attribute

**Sources:** SAST-008  
**Status:** Theoretical  
**CWE:** CWE-1021

`DebugPortalPage.tsx` embeds a URL from `VITE_PORTAL_URL` with no `sandbox` attribute and no `frame-src` CSP. If the portal URL is redirected to an attacker-controlled page (via open redirect or env misconfiguration), it can operate within the parent app's DOM.

**Remediation:** Add `sandbox="allow-scripts allow-same-origin"` and a CSP `frame-src` directive restricted to the expected portal origin.

---

#### MED-007 — Unauthenticated Prometheus /metrics Endpoint

**Sources:** SAST-004 · COMP-010  
**Status:** Theoretical  
**CWE:** CWE-200  
**Framework violations:** SOC2 CC6.1

The `/metrics` endpoint is publicly accessible with no authentication, exposing internal operational telemetry including workflow throughput, team assignment patterns, dispatch rates, and Node.js runtime internals.

**Remediation:** Add a bearer-token check middleware keyed by `METRICS_TOKEN` env var, or bind metrics to a separate internal-only port.

---

#### MED-008 — Cascade Dispatch DoS via Deep Dependency Chain

**Sources:** PEN-012  
**Status:** Theoretical  
**CWE:** CWE-400

`onItemResolved()` synchronously auto-dispatches all N items blocked by a resolved/rejected item, with no depth or breadth limit. A star-topology graph with 100+ dependents causes N synchronous store updates per single reject request.

**Remediation:** Move cascade dispatch to an async queue. Add a maximum cascade breadth limit (e.g., 50) per resolution event.

---

#### MED-009 — Negative Page Number Causes Unexpected Slice Behavior

**Sources:** PEN-010  
**Status:** Theoretical  
**CWE:** CWE-20

`page=-1` produces `offset = -40`, causing `Array.prototype.slice(-40, -20)` to return elements from positions `length-40` to `length-20` — a different dataset than page 1.

**Remediation:** Enforce `Math.max(1, page)` before computing offset. Return HTTP 400 for non-positive page values.

---

#### MED-010 — Soft Delete Does Not Satisfy Right-to-Erasure (GDPR)

**Sources:** COMP-008  
**Status:** Compliance Gap  
**Framework violations:** OWASP-ASVS V8.3 · GDPR Art. 17

`softDelete` sets `item.deleted = true` but the record remains in memory. There is no hard-delete, no anonymization, and no data retention TTL. PII in `description` fields is never purged.

**Remediation:** Implement a hard-delete path that physically removes or anonymizes records. Add a data retention schedule (e.g., purge completed/rejected items older than 90 days). Document the erasure policy in the specifications.

---

### 🟢 LOW — Theoretical

---

#### LOW-001 — No Formal CORS Policy (Partially Mitigated in Live Test)

**Sources:** PEN-015 · COMP-005  
**Status:** Theoretical / Partially Mitigated  
**Note:** Red team confirmed CORS correctly restricts cross-origin requests from evil domains during live testing — contradicting the compliance finding. The risk is lower than classified by static analysis alone, but a formal CORS policy should still be documented and enforced.

**Remediation:** Add `cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') })` before route registration. Set `ALLOWED_ORIGINS` in `.env`.

---

#### LOW-002 — Route Override Stores Arbitrary String in item.route

**Sources:** PEN-013  
**Status:** Theoretical  
**CWE:** CWE-20

Unrecognized `overrideRoute` strings are stored verbatim in `item.route`. Prototype-pollution strings (`__proto__`, `constructor`) were tested by pen-tester; impact depends on `Object.assign` behavior.

**Remediation:** Validate `overrideRoute` against the `WorkItemRoute` enum before storing. Reject unknown values with HTTP 400.

---

## Compliance Matrix

| Control ID | Framework | Topic | Status | Finding(s) |
|---|---|---|---|---|
| ASVS V2.1 | OWASP-ASVS L2 | Authentication | ❌ FAIL | CRIT-001 |
| ASVS V4.1 | OWASP-ASVS L2 | Access Control | ❌ FAIL | CRIT-001, CRIT-002 |
| ASVS V5.3 | OWASP-ASVS L2 | Output Encoding / XSS | ❌ FAIL | HIGH-002 |
| ASVS V7.2 | OWASP-ASVS L2 | Audit Logging | ❌ FAIL | HIGH-006 |
| ASVS V7.4 | OWASP-ASVS L2 | Error Handling | ⚠️ PARTIAL | MED-004 |
| ASVS V8.3 | OWASP-ASVS L2 | Data Protection | ❌ FAIL | HIGH-007, MED-010 |
| ASVS V9.1 | OWASP-ASVS L2 | TLS / Communication | ⚠️ UNVERIFIABLE | TLS may be at reverse proxy |
| ASVS V13.1 | OWASP-ASVS L2 | API Security / Rate Limiting | ❌ FAIL | MED-002 |
| ASVS V14.4 | OWASP-ASVS L2 | Security Headers | ❌ FAIL | MED-005 |
| ASVS V14.5 | OWASP-ASVS L2 | CORS Policy | ⚠️ PARTIAL | LOW-001 |
| SOC2 CC6.1 | SOC2-Type2 | Logical Access Controls | ❌ FAIL | CRIT-001, MED-002, MED-005, MED-007 |
| SOC2 CC6.2 | SOC2-Type2 | Authentication Mechanisms | ❌ FAIL | CRIT-001 |
| SOC2 CC6.3 | SOC2-Type2 | Authorization / Least Privilege | ❌ FAIL | CRIT-001, CRIT-002 |
| SOC2 CC7.1 | SOC2-Type2 | Monitoring & Audit Logging | ❌ FAIL | HIGH-006 |
| SOC2 CC8.1 | SOC2-Type2 | Change Management | ✅ PARTIAL | `changeHistory` array tracks mutations; no actor enforcement |

**Pass rate: 23% (3/15 controls pass or partially pass)**  
**Grade threshold for D: ≥ 60% — not met. Grade: F (already F due to confirmed breach)**

---

## Priority Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | CRIT-001 — Add JWT authentication globally | High | Blocks all unauthorized access |
| P1 | CRIT-002 — Add admin role check to approve/force-approve/deny | Medium | Restores governance pipeline integrity |
| P1 | HIGH-002 — Sanitize input fields server-side; add CSP via Helmet | Low | Eliminates stored XSS |
| P1 | MED-005 — Install Helmet (`app.use(helmet())`) | Very Low | One-line fix; adds all security headers |
| P2 | HIGH-001 — Implement server-side pagination with hard limit | Medium | Prevents full data exfiltration |
| P2 | MED-002 — Add express-rate-limit globally | Low | Prevents DoS and enumeration |
| P2 | HIGH-006 — Emit structured audit events | Low | Directly satisfies SOC2 CC7.1 |
| P2 | HIGH-003 — Add HMAC verification to webhook intake | Medium | Prevents fake Zendesk injection |
| P3 | MED-001 — Cascade-remove soft-deleted IDs from dependency arrays | Low | Fixes IDOR + dispatch DoS |
| P3 | HIGH-004 — Validate enums in intake routes | Low | Matches validation already in workItems.ts |
| P3 | MED-004 — Return generic 500 messages; log internally | Low | Prevents info leakage |
| P3 | MED-007 — Add bearer-token guard to /metrics | Very Low | One-line fix |
| P4 | HIGH-005 — Fix soft-delete blocker logic | Medium | Eliminates permanent dispatch DoS |
| P4 | HIGH-007 — Migrate to persistent encrypted database | High | Required for SOC2 CC6.1 at-rest |
| P4 | MED-010 — Implement hard-delete/erasure | Medium | Required for GDPR Art. 17 |

---

## Finding Index

| ID | Title | Severity | Status | Sources |
|---|---|---|---|---|
| CRIT-001 | Complete Absence of Authentication and Authorization | Critical | Confirmed | SAST-001, PEN-001/002, COMP-001/002, RED-001/003 |
| CRIT-002 | State Machine Bypass via Unauthenticated Force-Approve | Critical | Confirmed | PEN-003/004, RED-002 |
| HIGH-001 | Full Data Exfiltration via Unbounded Pagination | High | Confirmed | SAST-005, PEN-009, RED-006 |
| HIGH-002 | Stored XSS via Unvalidated Input Fields | High | Confirmed | RED-004 |
| HIGH-003 | Webhook Intake Lacks HMAC Verification | High | Theoretical | SAST-002, PEN-005 |
| HIGH-004 | Unvalidated Enum Inputs in Intake Webhook | High | Theoretical | SAST-003, PEN-006 |
| HIGH-005 | Soft-Delete Creates Permanent Dispatch DoS | High | Theoretical | PEN-007 |
| HIGH-006 | All Required Audit Events Missing | High | Compliance Gap | COMP-003 |
| HIGH-007 | No Data Encryption at Rest | High | Compliance Gap | COMP-007 |
| MED-001 | Soft-Deleted Item IDOR via Dependency References | Medium | Confirmed | PEN-008, RED-005 |
| MED-002 | No Rate Limiting — Request Flood Confirmed | Medium | Confirmed | SAST-009, PEN-014, COMP-006, RED-007 |
| MED-003 | Unauthenticated Dashboard Exposes Internal State | Medium | Confirmed | PEN-011, RED-008 |
| MED-004 | Internal Error Messages Leaked to Clients | Medium | Theoretical | SAST-006, COMP-009 |
| MED-005 | Missing HTTP Security Headers | Medium | Theoretical | SAST-007, COMP-004 |
| MED-006 | iframe Missing sandbox Attribute | Medium | Theoretical | SAST-008 |
| MED-007 | Unauthenticated Prometheus /metrics | Medium | Theoretical | SAST-004, COMP-010 |
| MED-008 | Cascade Dispatch DoS via Deep Dependency Chain | Medium | Theoretical | PEN-012 |
| MED-009 | Negative Page Number Unexpected Slice Behavior | Medium | Theoretical | PEN-010 |
| MED-010 | Soft Delete Does Not Satisfy Right-to-Erasure | Medium | Compliance Gap | COMP-008 |
| LOW-001 | No Formal CORS Policy (Partially Mitigated) | Low | Theoretical | PEN-015, COMP-005 |
| LOW-002 | Route Override Stores Arbitrary String | Low | Theoretical | PEN-013 |

**Totals:** Critical: 2 | High: 7 | Medium: 10 | Low: 2  
**Confirmed:** 7 findings | **Theoretical:** 11 findings | **Compliance Gaps:** 3 findings

---

## Scope / Caveats

- **Target mismatch:** The pen-tester statically analysed `Source/Backend/` (workflow engine). The live Docker target runs `portal/Backend/` (feature portal). Both share the same root vulnerability (zero auth), so all confirmed RED findings apply. SAST findings reference `Source/Backend/` file paths; the same patterns are present in `portal/Backend/`.
- **No secrets found:** `gitleaks` and LLM scan found no hardcoded credentials, API keys, or tokens.
- **No dangerous APIs:** No `eval`, `exec`, shell injection patterns, or insecure crypto found.
- **CORS:** Red team found browser-level CORS working correctly despite no explicit middleware — possible framework default or proxy configuration. Static analysis finding remains as Low.

---

*Generated by TheGuardians — 2026-09-14*  
*Specialists: static-analyzer · compliance-auditor · pen-tester · red-teamer*
