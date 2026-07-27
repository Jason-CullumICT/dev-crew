# TheGuardians — Security & Compliance Report

**Date:** 2026-07-27  
**Grade: F** (automatic — confirmed red-team breach of all 4 critical pentest objectives)  
**Run ID:** run-20260727-065003

---

## Executive Summary

The dev-crew Source App (portal/Backend + Source/Backend) is in **pre-production security posture**. The application ships with zero authentication, zero authorization, and zero compliance controls. Every API endpoint — including state-transition, deletion, force-approval, and operational metrics — is fully accessible to any unauthenticated caller on the network.

The red-teamer confirmed all four objectives from `security.config.yml` against the live `portal/Backend` service:

1. **Bypass work item state machine** — force-approved a feature request with zero AI votes (RED-003)
2. **Access/modify a soft-deleted item** — IDOR delete on any resource (RED-002); orphaned blocker link survives deletion (RED-004)
3. **Submit malformed verdict bypassing routing** — force-approve accepted an empty vote set, bypassing all 5 AI review agents (RED-003)
4. **Enumerate all items without pagination** — full dataset returned on every unauthenticated GET (RED-005)

**Final Grade: F.** Per `security.config.yml` grading, any confirmed red-team breach of a critical objective is an automatic F.

> **Scope note:** The pen-tester performed white-box analysis of `Source/Backend` (work-items engine). The red-teamer's live target was `portal/Backend` (feature-request/bug/cycle portal) served by `docker-compose.test.yml`. Equivalent vulnerability classes were confirmed on both surfaces; all four pentest objectives were re-derived and confirmed against the live service.

---

## Top 3 Risks

| # | Risk | Impact |
|---|------|--------|
| 1 | **Zero authentication** — any unauthenticated caller has full CRUD + state-transition on all resources | Complete data breach and operational sabotage |
| 2 | **State machine bypass** — `POST /force-approve` accepts a 0-vote approval, bypassing all AI agent reviews | Unreviewed work dispatched without quality or security checks |
| 3 | **Deleted-blocker sabotage + ID recycling** — deleting a blocker permanently blocks a victim item; ID recycling causes new items to inherit orphaned dependency links | Approved work items permanently un-dispatchable; cascading DoS on pipeline items |

---

## Consolidated Findings

> Findings are deduplicated across all four specialists. Where a PEN-ID was confirmed by a RED-ID, the records are merged.
> **Status:** Confirmed (Live Exploit) = RED-team execution confirmed | Theoretical = static/white-box only

### Critical

#### F-001 — Zero Authentication & Authorization on All Endpoints
- **Severity:** Critical | **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-001, PEN-001, COMP-001, COMP-002, RED-001
- **Description:** The Express application registers zero authentication or authorization middleware. Every API endpoint — resource CRUD, all state transitions (route, assess, approve, force-approve, reject, dispatch), dashboard data, Prometheus metrics, and intake webhooks — is fully accessible to any unauthenticated caller. The red-teamer confirmed HTTP 200/201 on all nine route groups with zero credentials. There is no user model, credential store, session layer, API key validation, JWT/bearer-token check, role check, or ownership boundary anywhere in the source tree.
- **Live Evidence:** `curl -X POST http://localhost:3001/api/feature-requests -d '{"title":"Attacker","description":"No auth"}' => HTTP 201` — no challenge issued.
- **Remediation:**
  1. Add an authentication middleware (JWT bearer via `express-jwt` + JWKS, or API-key guard) as the **first** `app.use()` call before all route registrations.
  2. Add an identity context (`req.user`) propagated to all services.
  3. Define roles (`operator`, `reviewer`, `admin`) and add route-level authorization middleware guarding sensitive endpoints (approve, reject, force-approve, dispatch, delete).
  4. Exempt only `/health`.

#### F-002 — State Machine Bypass via Force-Approve (Zero AI Votes)
- **Severity:** Critical | **Status:** Confirmed (Live Exploit) — **PRIMARY PENTEST OBJECTIVE ACHIEVED**
- **Sources:** PEN-003, PEN-006, RED-003
- **Description:** `POST /api/feature-requests/:id/force-approve` accepts any caller (no auth required) and approves an item regardless of vote count. An item can be moved from `potential -> voting -> approved` with zero AI agent votes, bypassing all five review agents (TechFeasibilityAgent, ResourceCostAgent, UserImpactAgent, BusinessValueAgent, SecurityReviewAgent). Additionally, `POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` in Source/Backend skips the assessment pod entirely. Both paths constitute a full state machine bypass satisfying the primary pentest objective.
- **Live Evidence:** `POST /force-approve` on FR-0002 => `{status:"approved", votes:[], human_approval_approved_at:"2026-07-27T06:43:19.743Z"}`.
- **Remediation:**
  1. Require authentication + elevated role (`admin`) on `force-approve` and all manual-override endpoints.
  2. Enforce a minimum vote count before `force-approve` is callable.
  3. For Source/Backend `overrideRoute: "fast-track"`: restrict to authorized roles; add audit logging of the override decision.
  4. All approve/reject actions must produce an audit log entry (see F-010).

---

### High

#### F-003 — IDOR on All Resource Endpoints
- **Severity:** High | **Status:** Confirmed (Live Exploit)
- **Sources:** PEN-004, RED-002
- **Description:** Every endpoint accepting a resource ID fetches the record using only the ID with no ownership or role check. Any caller that knows or enumerates an ID can read, modify, or delete any item regardless of who created it.
- **Live Evidence:** `PATCH /api/feature-requests/FR-0001 {"status":"voting"} => HTTP 200`; `DELETE /api/feature-requests/FR-0002 => HTTP 204` — no credential, no ownership validation.
- **Remediation:** After adding authentication (F-001), add resource-level ownership validation: only the creator or an authorized role may modify/delete a resource.

#### F-004 — Deleted Blocker Permanently Blocks Victim + ID Recycling Inherits Orphan Links
- **Severity:** High | **Status:** Confirmed (Live Exploit)
- **Sources:** PEN-007, RED-004, RED-008
- **Description:** When a blocking item is deleted, `computeHasUnresolvedBlockers()` / `isReady()` treats `findById => undefined` (deleted item) as "unresolved" rather than "resolved." The victim's `blockedBy` list retains the stale link, permanently setting `has_unresolved_blockers: true` and `ready: false`. **Compounding:** `generateFRId()` / `generateBugId()` recycle deleted IDs by scanning the current max; a new item created after deletion automatically inherits the orphaned blocking relationship. Cross-type blocking (Bug -> Feature Request) is equally exploitable.
- **Live Evidence:** Victim FR-0004 shows `ready: false` after blocker FR-0005 is deleted; newly-created FR-0005 inherits `blocks: [FR-0004]` with no explicit link.
- **Remediation:**
  1. On item deletion, cascade-delete or nullify all dependency links referencing that item.
  2. In `isReady()`, treat a missing/deleted blocker as resolved (it no longer blocks).
  3. Replace sequential-ID generation with UUIDs to eliminate recycling.

#### F-005 — Full Dataset Enumeration — Pagination Not Enforced
- **Severity:** High | **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-007, PEN-005, RED-005
- **Description:** The portal/Backend list endpoints return the full dataset in every response regardless of query parameters (`limit`, `page` are silently ignored). Source/Backend parses `limit` via `parseInt` with no NaN guard and no maximum cap. Both surfaces satisfy the pentest objective "Enumerate all work items without pagination limit enforcement."
- **Live Evidence:** `GET /api/feature-requests` returns all 9 items unconditionally; `limit=999999` and `page=1&limit=1` both ignored.
- **Remediation:**
  1. Implement server-side pagination: enforce a maximum page size (e.g., 100), require a `page` parameter, return `{data, page, limit, total, totalPages}`.
  2. In Source/Backend: add `isNaN` guard and `Math.min(limit, 100)` cap on all `parseInt(req.query.limit)` calls.

#### F-006 — Intake Webhooks — No HMAC Verification + Unvalidated Enum Fields
- **Severity:** High | **Status:** Theoretical
- **Sources:** SAST-004, PEN-002, COMP-008
- **Description:** Both `/api/intake/zendesk` and `/api/intake/automated` accept any POST body with no HMAC signature verification, no API key, and no origin allowlist. `body.type` and `body.priority` are stored without enum validation, enabling injection of arbitrary strings into stored records and into Prometheus metric labels (cardinality bomb).
- **Remediation:**
  1. Verify Zendesk HMAC-SHA256 signature via `X-Zendesk-Webhook-Signature` header using a shared secret in an environment variable.
  2. Require `Authorization: Bearer <token>` for the automated endpoint.
  3. Validate `body.type` and `body.priority` against `Object.values(WorkItemType/Priority)`.

#### F-007 — No CORS Policy
- **Severity:** High | **Status:** Theoretical
- **Sources:** SAST-002, COMP-005
- **Description:** No CORS middleware is configured. Any webpage on any origin can make cross-origin requests to the API from a browser. Security boundary is entirely browser-enforced (bypassed trivially by non-browser clients).
- **Remediation:** Install `cors` package; apply `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }))`. Configure `ALLOWED_ORIGINS` per environment.

#### F-008 — No HTTP Security Headers
- **Severity:** High | **Status:** Theoretical
- **Sources:** SAST-003, COMP-006
- **Description:** No security headers are set: CSP (XSS escalation), X-Frame-Options (clickjacking), HSTS (protocol downgrade), X-Content-Type-Options (MIME sniffing), Referrer-Policy (URL leakage). No `helmet()` import anywhere in the source tree.
- **Remediation:** Add `import helmet from 'helmet'; app.use(helmet());` as the first middleware in `app.ts`. Tune CSP to match actual frontend sources.

#### F-009 — No Rate Limiting on Any Endpoint
- **Severity:** High | **Status:** Theoretical
- **Sources:** SAST-010, COMP-007
- **Description:** No rate-limiting middleware exists. All state-mutation endpoints and intake webhooks can be called at unlimited frequency, enabling resource exhaustion and operational abuse.
- **Remediation:** Add `express-rate-limit` globally (e.g., 100 req/min per IP) with stricter limits on state-mutation and intake endpoints.

#### F-010 — Required Audit Events Not Emitted
- **Severity:** High | **Status:** Theoretical
- **Sources:** COMP-003
- **Description:** `security.config.yml` mandates four audit event types: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. None are emitted. Domain-object `changeHistory` is not a security audit log. No structured `event_type` field exists in any log call.
- **Remediation:**
  1. Add an `auditLog()` helper emitting `{event_type, actor, target_id, timestamp, outcome}`.
  2. Emit `state_transition` from every route that changes resource status.
  3. Emit `permission_denied` from authorization middleware on every 403.
  4. Emit `login_attempt` (success/failure) from the auth layer.

#### F-011 — No TLS / HTTPS Enforcement
- **Severity:** High | **Status:** Theoretical
- **Sources:** COMP-004
- **Description:** Server binds to plain HTTP (`app.listen(PORT)`). No TLS configuration, no HTTPS server, no HTTP->HTTPS redirect. All data transits in cleartext.
- **Remediation:** Terminate TLS at the reverse-proxy/load-balancer (nginx/ALB); add HSTS header; document that `http://localhost:3001` is dev-only.

#### F-012 — In-Memory Store — No Persistence / Encryption at Rest
- **Severity:** High | **Status:** Theoretical
- **Sources:** COMP-010
- **Description:** All data lives in a process-local JavaScript `Map`. On restart, all data is lost. No database, no disk persistence, no encryption at rest.
- **Remediation:** Replace in-memory store with PostgreSQL (or equivalent); enable database-level encryption at rest; encrypt backups.

---

### Medium

#### F-013 — Prometheus `/metrics` Unauthenticated
- **Severity:** Medium | **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-006, PEN-010, COMP-009, RED-006
- **Description:** `GET /metrics` returns 41KB Prometheus exposition with no credentials: full API route map, per-route request counts, latency histograms, Node.js heap/CPU/event-loop stats, and (via F-006) attacker-injectable counter labels.
- **Remediation:** Guard with a `Bearer` token (`METRICS_TOKEN` env var) or bind to a private port not exposed externally.

#### F-014 — Error Messages Leak Internal State Machine Details
- **Severity:** Medium | **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-005, PEN-011, RED-007
- **Description:** Error responses expose the full `STATUS_TRANSITIONS` graph, internal ID formats (`BUG-XXXX`/`FR-XXXX`), current item status, all allowed transitions, and raw exception messages from the service layer. Seven `catch` blocks in `workflow.ts` return raw `err.message` to clients, bypassing the correct generic handler in `errorHandler.ts`.
- **Remediation:** Return `{error: "Internal server error"}` from all route-level catch blocks. Log full message server-side. Reserve detailed transition errors for authenticated admin callers only.

#### F-015 — No Hard Deletion / Right to Erasure (GDPR Art. 17)
- **Severity:** Medium | **Status:** Theoretical
- **Sources:** COMP-012
- **Description:** Only soft-delete exists. No mechanism to permanently erase a work item and its change history, which may contain user-supplied PII in free-text fields.
- **Remediation:** Add `purgeWorkItem()` function; expose `DELETE /api/work-items/:id/purge` restricted to admin; document DSAR process.

#### F-016 — Re-assessment Idempotency Flaw
- **Severity:** Medium | **Status:** Theoretical
- **Sources:** PEN-008
- **Description:** `assessWorkItem()` permits re-assessment of items already in `reviewing` status, appending unbounded duplicate `reviewing -> reviewing` change entries and assessment records.
- **Remediation:** Guard the assess route: reject re-assessment if item is already in `reviewing` status; return HTTP 409 Conflict.

#### F-017 — Missing Input Length Validation Enables Memory Bloat
- **Severity:** Medium | **Status:** Theoretical
- **Sources:** PEN-012
- **Description:** `title` and `description` fields have no maximum length enforcement. Megabyte-length strings are stored and returned in every list response, enabling memory exhaustion.
- **Remediation:** Add `MAX_TITLE_LEN = 200` and `MAX_DESC_LEN = 10000` guards on all POST/PATCH routes.

#### F-018 — Circular Dependency Guard Frontend-Only (1-hop)
- **Severity:** Medium | **Status:** Theoretical
- **Sources:** PEN-009
- **Description:** The frontend `DependencyPicker` guards only direct (1-hop) cycles; transitive cycles of depth >= 2 are backend-only. Backend BFS is correct in theory but must be verified against stale `blocks` arrays after concurrent removals.
- **Remediation:** Add backend integration tests covering transitive cycles (depth 3+). Remove the frontend-only cycle guard and rely solely on server-side BFS validation.

---

### Low

#### F-019 — Body Parser Returns 500 Instead of 413 on Oversized Payloads
- **Severity:** Low | **Status:** Confirmed (Live Exploit)
- **Sources:** RED-009
- **Description:** A POST body exceeding 16KB that bypasses field-level length checks returns HTTP 500 instead of 413 because `PayloadTooLargeError` is not handled by the error handler.
- **Remediation:** In `errorHandler.ts`, detect `err.type === 'entity.too.large'` and return HTTP 413.

#### F-020 — Debug Portal `<iframe>` Missing `sandbox` Attribute
- **Severity:** Low | **Status:** Theoretical
- **Sources:** SAST-009, PEN-014
- **Description:** The iframe embedding the debug portal runs with full browser privileges. If `VITE_PORTAL_URL` is misconfigured, the embedded page could exfiltrate session data.
- **Remediation:** Add `sandbox="allow-scripts allow-same-origin"` to the iframe element.

#### F-021 — Query Filter Parameters Cast Without Runtime Enum Validation
- **Severity:** Low | **Status:** Theoretical
- **Sources:** SAST-008
- **Description:** TypeScript `as WorkItemStatus` casts are compile-time only; invalid `?status=INJECTED` values are silently accepted and passed to `store.findAll()`.
- **Remediation:** Validate each filter value against `Object.values(Enum)` and return HTTP 400 for invalid values.

#### F-022 — Sequential `docId` Reveals Historical Item Count
- **Severity:** Low | **Status:** Theoretical
- **Sources:** PEN-013
- **Description:** Monotonically incrementing `WI-NNN` / `FR-XXXX` IDs reveal the total number of items ever created (including deleted).
- **Remediation:** Use UUIDs for public IDs (also fixes F-004 ID-recycling root cause).

#### F-023 — No Data Retention Policy Enforcement
- **Severity:** Low | **Status:** Theoretical
- **Sources:** COMP-013
- **Description:** Data accumulates indefinitely; violates GDPR Art. 5(1)(e) storage-limitation principle once a persistence layer is added.
- **Remediation:** Define `DATA_RETENTION_DAYS` env var; implement a scheduled cleanup job.

#### F-024 — Logger Lacks Sensitive-Field Redaction
- **Severity:** Low | **Status:** Theoretical
- **Sources:** COMP-014
- **Description:** Custom hand-rolled logger does not redact sensitive fields. `pino` (with `fast-redact`) is a declared dependency but unused. Once auth is added, tokens and emails will enter log context.
- **Remediation:** Switch to `pino` with `redact: ['req.headers.authorization', 'body.password', 'body.token']`.

---

## Findings Summary

| Severity | Confirmed (Live) | Theoretical | Total |
|----------|-----------------|-------------|-------|
| Critical | 2 | 0 | 2 |
| High | 3 | 7 | 10 |
| Medium | 2 | 4 | 6 |
| Low | 1 | 5 | 6 |
| **Total** | **8** | **16** | **24** |

---

## Compliance Matrix

| Control ID | Framework | Control Name | Status | Finding |
|-----------|-----------|--------------|--------|---------|
| ASVS 2.1.1 | OWASP-ASVS L2 | Authentication mechanism present | FAIL | F-001 |
| ASVS 2.2.1 | OWASP-ASVS L2 | Credential validation controls | FAIL | F-001 |
| ASVS 2.10.1 | OWASP-ASVS L2 | Webhook/service credential verification | FAIL | F-006 |
| ASVS 4.1.1 | OWASP-ASVS L2 | Server-side access enforcement | FAIL | F-001 |
| ASVS 4.1.3 | OWASP-ASVS L2 | Principle of least privilege | FAIL | F-001 |
| ASVS 4.2.1 | OWASP-ASVS L2 | Rate limiting / anti-automation | FAIL | F-009 |
| ASVS 6.1.1 | OWASP-ASVS L2 | Sensitive data identified & encrypted at rest | FAIL | F-012 |
| ASVS 7.1.1 | OWASP-ASVS L2 | No sensitive data in logs | PASS | None (no PII in current schema) |
| ASVS 7.1.2 | OWASP-ASVS L2 | Log sanitization / redaction | PARTIAL | F-024 |
| ASVS 7.2.1 | OWASP-ASVS L2 | Security events logged | FAIL | F-010 |
| ASVS 9.1.1 | OWASP-ASVS L2 | TLS enforced for all connections | FAIL | F-011 |
| ASVS 14.4.1-6 | OWASP-ASVS L2 | Security response headers | FAIL | F-008 |
| ASVS 14.5.3 | OWASP-ASVS L2 | CORS policy enforced | FAIL | F-007 |
| CC6.1 | SOC2-Type2 | Logical access controls | FAIL | F-001, F-011, F-013 |
| CC6.2 | SOC2-Type2 | Access provisioning process | FAIL | F-001 |
| CC6.3 | SOC2-Type2 | Access removal process | FAIL | F-001 |
| CC7.1 | SOC2-Type2 | Security event detection & logging | FAIL | F-010 |
| CC8.1 | SOC2-Type2 | Change management controls | PARTIAL | changeHistory exists but domain-level only |
| GDPR Art. 17 | GDPR | Right to erasure | FAIL | F-015 |
| GDPR Art. 5(1)(e) | GDPR | Storage limitation | FAIL | F-023 |
| GDPR Art. 25 | GDPR | Privacy by design | FAIL | F-001, F-012 |
| GDPR Art. 32 | GDPR | Appropriate technical security measures | FAIL | F-001, F-011 |
| ISO27001 A.9.4.1 | ISO 27001 | Access control to systems and applications | FAIL | F-001, F-013 |
| ISO27001 A.9.4.2 | ISO 27001 | Secure log-on procedures | FAIL | F-001 |
| ISO27001 A.10.1.1 | ISO 27001 | Policy on use of cryptographic controls | FAIL | F-012 |
| ISO27001 A.12.1.3 | ISO 27001 | Capacity management / DoS protection | FAIL | F-009 |
| ISO27001 A.12.4.1 | ISO 27001 | Event logging | FAIL | F-010 |
| ISO27001 A.14.1.2 | ISO 27001 | Securing application services over public networks | FAIL | F-011, F-007 |

**Compliance Summary: 1 Pass, 2 Partial, 25 Fail / 28 controls assessed => ~4% pass rate**

---

## Red Team Summary

| Metric | Value |
|--------|-------|
| Target | `portal/Backend` at `http://localhost:3001` (ephemeral isolated environment) |
| Exploit chains attempted | 9 |
| Confirmed breaches | 7 |
| Pentest objectives achieved | 4 / 4 (100%) |
| Critical objectives breached | 2 (RED-001, RED-003) |

### Objectives

| Objective | Result | Chain |
|-----------|--------|-------|
| Bypass work item state machine to reach invalid status | ACHIEVED | RED-003: force-approve with 0 AI votes |
| Access or modify a soft-deleted work item via direct ID reference | ACHIEVED | RED-002 (IDOR delete) + RED-004 (orphan link) |
| Submit malformed assessment verdict bypassing routing logic | ACHIEVED | RED-003: empty vote set accepted by force-approve |
| Enumerate all work items without pagination limit enforcement | ACHIEVED | RED-005: full dataset, pagination params ignored |

### Scope Delta Note

The pen-tester's attack surface map analyzed `Source/Backend` (work-items engine with `/api/work-items` routes). The live `docker-compose.test.yml` service runs `portal/Backend` (feature-request/bug/cycle portal with `/api/feature-requests`, `/api/bugs`, `/api/cycles` routes). Routes like `/api/work-items` return 404 on the live target. The red-teamer re-derived all four pentest objectives against the actual running surface and confirmed them. The vulnerability classes are identical across both backends.

**Future runs:** Ensure `security.config.yml pentest.targets` reflects the actual docker-compose service (portal/Backend) or that Source/Backend is explicitly the live target.

---

## Grading

| Metric | Actual | Threshold |
|--------|--------|-----------|
| Critical confirmed breaches | 2 | F = any confirmed breach of critical objective |
| High findings total | 10 | — |
| Compliance pass rate | ~4% | A requires >= 90% |
| Red-team objectives achieved | 4/4 | — |

**Grade: F** — Automatic per `security.config.yml`: RED-003 confirmed a live breach of the primary critical objective ("Bypass work item state machine"). All four objectives were achieved. This application must not be deployed to any shared or production environment in its current state.

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| P1 (Block) | F-001 — Add authentication middleware | Medium |
| P1 (Block) | F-002 — Gate force-approve to authenticated admin + vote check | Low |
| P1 (Block) | F-003 — Add resource ownership checks after auth | Low |
| P1 (Block) | F-004 — Cascade-delete dependency links; replace sequential IDs with UUIDs | Medium |
| P1 (Block) | F-005 — Enforce server-side pagination with max page size | Low |
| P2 | F-006 — Verify Zendesk HMAC + automated API key | Low |
| P2 | F-007 — Add CORS policy | Low |
| P2 | F-008 — Add Helmet security headers | Low |
| P2 | F-009 — Add rate limiting + cap pagination | Low |
| P2 | F-010 — Emit required audit events | Low |
| P2 | F-011 — Enforce HTTPS at proxy/infra | Low |
| P3 | F-012 — Migrate to persistent encrypted store | High |
| P3 | F-013 — Restrict /metrics endpoint | Low |
| P3 | F-014 — Return generic error messages from all catch blocks | Low |
| P3 | F-015 — Add hard-delete / RTBF endpoint | Low |
| P3 | F-016 — Guard re-assessment with HTTP 409 | Low |
| P3 | F-017 — Add input length validation | Low |
| P3 | F-018 — Add backend transitive cycle tests | Low |
| P4 | F-019 — Handle 413 in errorHandler | Low |
| P4 | F-020 — Add iframe sandbox attribute | Low |
| P4 | F-021 — Validate query filter enums at runtime | Low |
| P4 | F-022 — Use UUIDs for resource IDs | Medium |
| P4 | F-023 — Implement data retention job | Medium |
| P4 | F-024 — Switch to pino with redaction | Low |

---

## Notable Non-Findings (Positives)

- **No hardcoded secrets** found in any first-party source file. Environment variables used correctly.
- **No dangerous code execution** (`eval`, `Function()`, `child_process`, `innerHTML`) in any source file.
- **No weak cryptography** (MD5/SHA1/DES/`Math.random()` for tokens) detected.
- **Error handler is correctly designed** in `errorHandler.ts` (generic message, internal logging) — the gap is route-level catches that bypass it (F-014).
- **Prometheus metrics middleware is correctly integrated** — the only issue is the lack of an auth guard (F-013).

---

_Report generated by TheGuardians Team Leader · Run ID: run-20260727-065003_
