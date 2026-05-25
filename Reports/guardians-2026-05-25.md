# TheGuardians Security & Compliance Report
**Date:** 2026-05-25  
**Grade: F**  
**Run ID:** run-20260525-073746  
**Scope:** dev-crew Source App (`Source/Backend/`, `Source/Frontend/`, `Source/Shared/`, `portal/Backend/`)

---

## Executive Summary

> **The application has no authentication, no authorization, and no input validation. An unauthenticated attacker can create, approve, deny, dispatch, and permanently destroy every record in the system with no credentials. All four red-team objectives were achieved in a live ephemeral environment. Grade: F.**

### Overall Grade: F — Automatic (Confirmed Breach of All Critical Objectives)

The grading rubric assigns Grade F for any confirmed red-team breach of a critical objective. The red-teamer achieved **all four** configured objectives in a live Docker environment:

| Objective | Status |
|---|---|
| Bypass work item state machine to reach an invalid status | ✅ Confirmed (RED-002, RED-006) |
| Access or modify a soft-deleted work item via direct ID reference | ✅ Confirmed (RED-004) |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ Confirmed (RED-003, RED-006) |
| Enumerate all work items without pagination limit enforcement | ✅ Confirmed (RED-007) |

**Confirmed breaches: 3 Critical, 5 High**  
**Compliance pass rate: 28% (5/18 controls — far below 60% minimum for Grade C)**

### Top 3 Risks

1. **Zero authentication** — Every endpoint is publicly accessible. Any attacker with network access to port 3001 can read, create, modify, approve, or permanently delete all records without a single credential. This single root cause enables 9 of the 11 confirmed red-team exploits.

2. **State machine and voting bypass** — A three-call unauthenticated chain (`POST /feature-requests` → `POST /force-approve` → done) puts any Feature Request into `approved` status skipping all AI voting, human review, and assessment gates. Vote retrigger farming allows looping until a desired AI outcome is manufactured.

3. **Permanent data destruction + dependency DoS** — Unauthenticated `DELETE` calls permanently destroy records with sequential ID reuse. Deleting a blocker item permanently strands all dependent items with no recovery path, confirmed live.

---

## Consolidated Findings

Findings are deduplicated across all four specialists. IDs from each specialist are cross-referenced. Where a PEN-ID was confirmed by a RED-ID, the finding is merged and marked **Confirmed (Live Exploit)**.

---

### Critical Severity

#### C-001 — Complete Unauthenticated API Access
- **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-001 · PEN-001 · COMP-001 · RED-001
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **Frameworks:** OWASP-ASVS V2.1.1, V2.2.1, V2.3.1 · SOC2 CC6.1, CC6.2
- **Description:** The Express application registers zero authentication middleware. Every route — including work item CRUD, workflow state transitions, intake webhooks, and the Prometheus metrics endpoint — is fully accessible to any unauthenticated HTTP client. Live confirmation: `GET /api/feature-requests` returns HTTP 200 with full dataset; `DELETE /api/feature-requests/FR-0059` returns HTTP 204 — no credentials required at any step.
- **Remediation:** Implement a global `requireAuth` middleware placed before all route mounts in `index.ts` / `app.ts`. Use JWT Bearer tokens with short expiry. The `admin@example.com / admin123` credential in CLAUDE.md must be migrated to a real identity scheme. This single fix neutralises C-001 through H-005 simultaneously.

#### C-002 — Force-Approve Bypasses Entire Voting Gate (State Machine Bypass)
- **Status:** Confirmed (Live Exploit)
- **Sources:** PEN-004 · PEN-005 · COMP-002 · RED-002
- **CWE:** CWE-285 (Improper Authorization)
- **Frameworks:** OWASP-ASVS V4.1.1, V4.2.1 · SOC2 CC6.3
- **Description:** `POST /api/feature-requests/:id/force-approve` (portal) / `POST /api/work-items/:id/route {"overrideRoute":"fast-track"}` (source app) transition any item directly to `approved` status, bypassing all AI voting rounds and human review. Live confirmation: FR with 2/3 DENY majority was force-approved via unauthenticated call; `human_approval_approved_at` set with zero legitimate approval process.
- **Remediation:** Gate `/force-approve` and `/route` override behind authenticated `HUMAN_REVIEWER` role (RBAC required — see H-008 recommendation). Log force-approve events to immutable audit trail. Consider requiring a minimum vote threshold even for manual overrides.

#### C-003 — Unauthenticated Hard Delete with Sequential ID Reuse
- **Status:** Confirmed (Live Exploit)
- **Sources:** RED-005
- **CWE:** CWE-285 (Improper Authorization) · CWE-330 (Insufficient Randomness for ID)
- **Description:** `DELETE` endpoints permanently destroy records with no authentication and no confirmation gate. Sequential IDs (`FR-0059`) are reused after deletion — attacker-created records replace deleted ones, hijacking stale references in dependent records and change history. Live confirmation: `DELETE /api/feature-requests/FR-0059` → HTTP 204 → `GET /api/feature-requests/FR-0059` → 404; new create reused the ID.
- **Remediation:** Implement authentication (prerequisite). Add soft-delete (`deleted_at` timestamp) as the default; reserve hard delete for privileged admin role. Require `?confirm=true` or a two-step confirmation for permanent deletion. Consider UUIDs for all externally visible IDs (docIds should not be sequential).

---

### High Severity

#### H-001 — Unbounded Pagination — Full Dataset Dump
- **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-003 · PEN-003 · COMP-007 · RED-007
- **CWE:** CWE-20 / CWE-770
- **Description:** `?limit=999999`, `?limit=0`, and omitting the `limit` parameter all return the entire dataset. Live confirmation: 55 FRs returned in a single unauthenticated request including full vote records and dependency links.
- **Remediation:** Enforce `const limit = Math.min(parsed, 100)` in all list routes. Default to 20. Return HTTP 400 if requested limit exceeds maximum. Apply to `/api/feature-requests`, `/api/bugs`, `/api/work-items`, `/api/dashboard/activity`, and `/api/search`.

#### H-002 — Vote Retrigger Farming (Assessment Bypass via Unlimited Re-Roll)
- **Status:** Confirmed (Live Exploit)
- **Sources:** RED-003
- **CWE:** CWE-799 (Improper Control of Interaction Frequency)
- **Description:** `POST /api/feature-requests/:id/retrigger` re-runs AI voting with no authentication, no rate limit, and no cap on retrigger count. Round 1: DENY majority (2-3). Round 2: APPROVE majority (3-2). Round 3: unanimous APPROVE (5-0). Attacker loops until desired outcome is manufactured, then immediately calls `/approve`.
- **Remediation:** Require authentication for retrigger. Rate-limit to max 1 retrigger per FR per hour. Record full vote history across all rounds (not just latest) to detect manipulation. Consider deterministic vote seeding per FR ID to prevent re-roll abuse.

#### H-003 — Dependency DoS — Deleted Blocker Permanently Locks Dependent
- **Status:** Confirmed (Live Exploit)
- **Sources:** PEN-008 · RED-004
- **CWE:** CWE-672 (Operation After Resource Expiration)
- **Description:** `computeHasUnresolvedBlockers()` treats a missing (soft/hard deleted) blocker ID as an unresolved blocker — permanently preventing any dependent item from being dispatched. No recovery path exists. Live confirmation: blocker FR-0005 deleted → FR-0006 permanently stuck in `pending_dependencies` with `unresolved_blockers: [{item_id: "FR-0005", status: "unknown"}]`. Deleted item's ID leaked via readiness endpoint.
- **Remediation:** On blocker deletion, cascade-update all `depends_on` / `blockedBy` records to remove the stale link, or set deleted items to a `resolved` sentinel status before deletion. Add an admin endpoint to clear stale dependency references. Fix `computeHasUnresolvedBlockers()` to treat `undefined` (not found) as resolved.

#### H-004 — Deny Feature Request Without Voting (Skip Entire Review)
- **Status:** Confirmed (Live Exploit)
- **Sources:** RED-006 · PEN-005
- **CWE:** CWE-285 (Improper Authorization)
- **Description:** `POST /api/feature-requests/:id/deny` transitions a FR directly from `potential` → `denied` without going through the `voting` phase. No authentication, no audit record of who issued the denial. Live confirmation: FR-0060 created and immediately denied with `{"comment":"Attacker denies without any voting"}`.
- **Remediation:** Restrict `/deny` to authenticated `HUMAN_REVIEWER` role. Enforce that denial from `potential` requires an explicit override flag and generates an audit event. Consider requiring at least one AI vote round before human denial is permitted.

#### H-005 — Stored XSS + Unvalidated Enum Input (No Input Sanitization)
- **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-002 · PEN-010 · RED-009
- **CWE:** CWE-79 (XSS) · CWE-20 (Improper Input Validation)
- **Description:** Title and description fields store raw HTML including `<script>`, `<img onerror>`, and `<svg/onload>` payloads verbatim. Intake endpoints accept arbitrary string values for `type` and `priority` fields (no enum validation), poisoning the Prometheus label cardinality. Live confirmation: `<script>alert("XSS")</script>` stored and returned raw in API response.
- **Remediation:** Apply server-side HTML sanitization (e.g., `DOMPurify` node build or `sanitize-html`) on all user-controlled text fields before persistence. Apply same enum validation used in `workItems.ts` to both intake routes. Frontend must render user content as text content, not `innerHTML`.

#### H-006 — Unauthenticated Intake Webhooks — No HMAC Signature Verification
- **Status:** Theoretical (pen-tester; analogous live behavior confirmed via RED-001)
- **Sources:** PEN-006 · COMP-004
- **CWE:** CWE-306 (Missing Authentication) · CWE-345 (Insufficient Verification of Data Authenticity)
- **Description:** Zendesk and automated intake endpoints accept arbitrary JSON payloads without HMAC signature verification (`X-Zendesk-Webhook-Signature-256`). Any caller can forge Zendesk events or flood the work item queue. The pen-tester analyzed `Source/Backend/intake.ts`; the live red-team environment (`portal/Backend/`) confirmed all endpoints unauthenticated.
- **Remediation:** For `/api/intake/zendesk`: verify `X-Zendesk-Webhook-Signature-256` using a pre-shared secret in environment variable. For `/api/intake/automated`: require a bearer token. Both should enforce rate limits (5 req/min).

#### H-007 — Rejection Cascade Auto-Dispatches Dependents (Business Logic Flaw)
- **Status:** Theoretical
- **Sources:** PEN-007
- **CWE:** CWE-840 (Business Logic Error)
- **Description:** `DISPATCH_TRIGGER_STATUSES` includes `Rejected`, so rejecting a blocker item automatically dispatches all approved dependents to `in-progress` — even though their prerequisite was not successfully completed. An attacker can force items into production by manipulating a shared blocker.
- **Remediation:** Remove `Rejected` from `DISPATCH_TRIGGER_STATUSES`. Rejected blockers should move dependents to a `blocked` or `pending-review` state, not dispatch them. Separate `RESOLVED_STATUSES` (for dependency resolution) from `DISPATCH_TRIGGER_STATUSES` (for cascade dispatch).

#### H-008 — Missing Required Audit Log Events
- **Status:** Theoretical (structural absence confirmed by compliance-auditor)
- **Sources:** COMP-003
- **CWE:** CWE-778 (Insufficient Logging)
- **Frameworks:** OWASP-ASVS V7.3.1 · SOC2 CC7.1
- **Description:** Three of four required audit events (`login_attempt`, `permission_denied`, `data_export`) are completely absent. `state_transition` is partially captured in `changeHistory` but lacks actor identity, source IP, and correlation ID — making it inadmissible as SOC2 audit evidence.
- **Remediation:** Implement an `auditLog()` helper emitting structured entries with `event`, `actor`, `resource`, `sourceIp`, `traceId`, `outcome`. Emit from all workflow route handlers. Once auth exists, emit `login_attempt` and `permission_denied`.

#### H-009 — No TLS/HTTPS Enforcement
- **Status:** Theoretical
- **Sources:** COMP-005
- **CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)
- **Frameworks:** OWASP-ASVS V9.1.1, V9.1.2
- **Description:** The application listens on plain HTTP with no TLS termination, no HTTPS redirect, and no HSTS header. Any future credential tokens would be transmitted in cleartext.
- **Remediation:** Configure TLS termination at the reverse proxy (nginx/Caddy). Add `app.use(helmet())` with HSTS. Add `X-Forwarded-Proto` enforcement for connections through a proxy.

---

### Medium Severity

#### M-001 — Unauthenticated Prometheus Metrics Disclosure
- **Status:** Confirmed (Live Exploit)
- **Sources:** SAST-006 · PEN-014 · COMP-010 · RED-010
- **CWE:** CWE-200 (Exposure of Sensitive Information)
- **Description:** `GET /metrics` returns 78 metric lines including `feature_request_status_transitions_total`, AI voting invocation counts, heap size, GC stats, and event loop lag — to any unauthenticated caller. Technology fingerprint and operational patterns fully exposed.
- **Remediation:** Restrict `/metrics` to internal network via reverse proxy allow-list, or require a static Bearer token. Never expose runtime internals to unauthenticated clients.

#### M-002 — Search Empty Query Returns Full Dataset
- **Status:** Confirmed (Live Exploit)
- **Sources:** PEN-012 · RED-008
- **CWE:** CWE-20 (Improper Input Validation)
- **Description:** `GET /api/search?q=` and `GET /api/search` (no query param) both return 20 items (paginated data dump). Minimum query length is not enforced. Combined with no auth, the entire dataset is walkable via empty-query pagination.
- **Remediation:** Return HTTP 400 for missing or empty `q`. Enforce minimum query length of 2 characters. Apply authentication. Test `?q=.*` for ReDoS when search uses regex.

#### M-003 — CI/CD Workflow `inputs.focus` Shell Injection Risk
- **Status:** Theoretical
- **Sources:** SAST-007
- **CWE:** CWE-78 (OS Command Injection)
- **Description:** The `inputs.focus` `workflow_dispatch` parameter is a free-text field injected into YAML before shell execution in `run-guardians.yml` and peer workflow files. Combined with `--dangerously-skip-permissions` on subsequent Claude Code invocations, a crafted value could alter the prompt file and instruct Claude to perform unintended operations in the runner environment.
- **Remediation:** Validate `inputs.focus` against an explicit allowlist before use. Use `${{ github.event.inputs.focus }}` with a sanitize step. Tighten `--allowedTools` on Claude Code invocations.

#### M-004 — Docker Containers Run as Root
- **Status:** Theoretical
- **Sources:** SAST-005
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **Description:** All three Dockerfiles (`portal/Dockerfile`, `platform/Dockerfile.orchestrator`, `platform/Dockerfile.worker`) lack `USER` directives. The worker container runs Claude Code with `--dangerously-skip-permissions` and mounts the Docker socket — a root-level compromise of the worker gives host Docker daemon access.
- **Remediation:** Add non-root user to each Dockerfile: `RUN groupadd -r appuser && useradd -r -g appuser appuser && USER appuser`.

#### M-005 — Missing HTTP Security Headers + No CORS Policy
- **Status:** Theoretical
- **Sources:** SAST-004 · COMP-008 · COMP-009
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **Frameworks:** OWASP-ASVS V14.4.1, V14.4.7
- **Description:** No `helmet` middleware configured — missing CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy. No CORS middleware — any web page can make cross-origin requests to the API; any future cookie auth would be CSRF-exploitable.
- **Remediation:** `npm install helmet cors` and apply before all routes: `app.use(helmet()); app.use(cors({ origin: ['http://localhost:5173'], credentials: true }))`.

#### M-006 — Negative Page Parameter Reads Unexpected Data Positions
- **Status:** Theoretical
- **Sources:** PEN-009
- **CWE:** CWE-20 (Improper Input Validation)
- **Description:** Negative `page` values produce negative offsets passed to `Array.slice()`, returning data from unexpected positions in the store. `?page=-1` → `slice(-40, -20)` returns items near end of list. `?limit=-1` returns all items except the last.
- **Remediation:** Validate `page >= 1` and `limit >= 1` at the route layer; return HTTP 400 otherwise.

#### M-007 — No Rate Limiting on Any Endpoint
- **Status:** Theoretical (confirmed no throttling during RED-003 retrigger farming)
- **Sources:** PEN-011 · SAST-008 · COMP-006
- **CWE:** CWE-770 (Allocation of Resources Without Limits)
- **Frameworks:** OWASP-ASVS V2.2.1
- **Description:** No `express-rate-limit` middleware. All endpoints can be called at unlimited frequency, enabling intake floods, state machine exhaustion, and vote retrigger farming (RED-003 confirmed no throttling).
- **Remediation:** Add `express-rate-limit` with tiered limits: 100 req/min general, 20 req/min workflow mutations, 5 req/min intake webhooks, 1/hr for retrigger.

#### M-008 — No GDPR Right to Erasure (Hard Delete Path Missing)
- **Status:** Theoretical
- **Sources:** COMP-012
- **CWE:** N/A (regulatory gap)
- **Frameworks:** GDPR Art. 17
- **Description:** `DELETE /api/work-items/:id` performs soft delete only (sets `deleted: true`). No hard delete or purge path exists. When a database is added, soft-deleted records containing PII in `title`/`description` will persist indefinitely.
- **Remediation:** Implement `purgeWorkItem()` with `DELETE /api/work-items/:id?permanent=true` requiring elevated authorization. Document data retention policy with purge schedule.

---

### Low Severity

#### L-001 — Internal Orchestrator URL Disclosed in Error Response
- **Status:** Confirmed (Live Exploit)
- **Sources:** RED-011 (new finding — not in pen-tester map)
- **CWE:** CWE-209 (Information Exposure Through Error Message)
- **Description:** `GET /api/orchestrator/test` returns HTTP 502 with body `{"error":"Orchestrator unreachable at http://localhost:8080"}`, disclosing internal network topology to unauthenticated callers.
- **Remediation:** Return generic `{"error":"Service temporarily unavailable"}`. Log actual internal URL server-side only.

#### L-002 — Predictable Sequential DocIDs Enable Work Item Enumeration
- **Status:** Theoretical (ID reuse confirmed via RED-005)
- **Sources:** PEN-013 · RED-005
- **CWE:** CWE-330 (Insufficient Randomness)
- **Description:** Sequential `WI-NNN` / `FR-NNNN` docIds reveal total system usage, activity rates, and enable cross-referencing of soft-deleted item IDs from dependency records.
- **Remediation:** Use UUIDs or cryptographically random ID segments for externally visible IDs. If human-readable IDs are required for UX, make them non-sequential.

#### L-003 — No CORS / No CSRF Protection
- **Status:** Theoretical
- **Sources:** PEN-015 · PEN-016
- **CWE:** CWE-352 (CSRF) · CWE-942 (Overly Permissive CORS)
- **Description:** No explicit CORS policy and no CSRF token mechanism. Currently not directly exploitable (no auth = no session to hijack), but any cookie-based auth addition without these controls would be immediately exploitable from any web origin.
- **Remediation:** See M-005 for CORS. Add `csurf` or `SameSite=Strict` cookie policy once session auth is introduced.

#### L-004 — Raw Exception Messages Forwarded to Clients
- **Status:** Theoretical
- **Sources:** COMP-011
- **CWE:** CWE-209 (Information Exposure Through Error Message)
- **Frameworks:** OWASP-ASVS V7.4.1
- **Description:** Individual route `catch` blocks forward `err.message` directly to clients. If internal services throw with implementation details, those reach the HTTP response. (Global `errorHandler` correctly returns generic messages — this is a per-route inconsistency.)
- **Remediation:** Standardize all route catches to return generic user-facing messages. Only propagate pre-approved `UserError` subclasses to clients. Log full error details server-side.

#### L-005 — No Data Retention Policy / No Scheduled Purge
- **Status:** Theoretical
- **Sources:** COMP-013
- **Frameworks:** GDPR Art. 5(1)(e) · SOC2 CC6.5
- **Description:** Soft-deleted items accumulate in-memory with no expiry. When persistence is added, all work items — including any PII in descriptions — will be retained indefinitely.
- **Remediation:** Define retention policy (e.g., soft-deleted purged after 90 days, completed archived after 1 year). Implement a scheduled purge job.

---

## Compliance Matrix

| Control ID | Framework | Description | Status |
|---|---|---|---|
| V2.1.1 | OWASP-ASVS L2 | Authentication system present | ❌ FAIL |
| V2.2.1 | OWASP-ASVS L2 | Anti-automation / rate limiting | ❌ FAIL |
| V2.2.2 | OWASP-ASVS L2 | MFA supported | ❌ FAIL |
| V3.1.1 | OWASP-ASVS L2 | Session management | ❌ FAIL |
| V4.1.1 | OWASP-ASVS L2 | Access control enforced at all endpoints | ❌ FAIL |
| V4.1.3 | OWASP-ASVS L2 | Principle of least privilege | ❌ FAIL |
| V4.2.1 | OWASP-ASVS L2 | Per-resource/per-operation authorization | ❌ FAIL |
| V7.1.1 | OWASP-ASVS L2 | No credentials/secrets in logs | ✅ PASS |
| V7.3.1 | OWASP-ASVS L2 | Security events logged | ❌ FAIL |
| V7.4.1 | OWASP-ASVS L2 | Generic error responses to clients | ⚠️ PARTIAL |
| V8.1.1 | OWASP-ASVS L2 | Sensitive data not stored unnecessarily | ✅ PASS |
| V9.1.1 | OWASP-ASVS L2 | TLS enforced for all communications | ❌ FAIL |
| V14.4.1 | OWASP-ASVS L2 | HTTP security headers (Helmet/CSP/HSTS) | ❌ FAIL |
| V14.4.7 | OWASP-ASVS L2 | CORS policy configured | ❌ FAIL |
| CC6.1 | SOC2-Type2 | Logical access controls | ❌ FAIL |
| CC6.2 | SOC2-Type2 | Authentication before system access | ❌ FAIL |
| CC6.3 | SOC2-Type2 | Role-based access control | ❌ FAIL |
| CC7.1 | SOC2-Type2 | System monitoring and audit logging | ⚠️ PARTIAL |
| CC8.1 | SOC2-Type2 | Change management controls | ⚠️ PARTIAL |

**PASS: 2 · PARTIAL: 3 · FAIL: 14**  
**Compliance Pass Rate: 28%** (far below 60% minimum for Grade C)

---

## Red Team Summary

**Environment:** Ephemeral Docker container (`docker-compose.test.yml`) — `portal/Backend/` on `:3001`  
**Scope note:** Pen-tester analyzed `Source/Backend/` (work-item state machine domain); red-teamer ran against `portal/Backend/` (feature-request voting domain). Both codebases share identical architectural vulnerability patterns — all PEN findings have confirmed portal analogues.

### Objectives Attempted vs Achieved

| Objective | Attempted | Achieved |
|---|---|---|
| Bypass work item state machine to reach an invalid status | ✅ | ✅ (RED-002, RED-006) |
| Access or modify a soft-deleted work item via direct ID reference | ✅ | ✅ (RED-004) |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ | ✅ (RED-003, RED-006) |
| Enumerate all work items without pagination limit enforcement | ✅ | ✅ (RED-007) |

**Objectives achieved: 4 / 4**  
**Confirmed breaches: 3 Critical + 5 High + 2 Medium + 1 Low = 11 total**  
**Automatic Grade: F**

### Confirmed Breach Summary (RED-IDs)

| ID | Title | Severity |
|----|-------|----------|
| RED-001 | Complete Unauthenticated API Access | Critical |
| RED-002 | Force-Approve Bypasses Voting Gate | Critical |
| RED-003 | Vote Retrigger Farming — Unlimited Re-Roll | High |
| RED-004 | Dependency DoS — Deleted Blocker Permanently Locks Dependent | High |
| RED-005 | Hard Delete Any FR Without Auth — Data Destruction + ID Reuse | Critical |
| RED-006 | Deny FR Without Voting (Skip Review) | High |
| RED-007 | Unbounded List — Full Dataset Dump | High |
| RED-008 | Search Empty Query Returns Data | Medium |
| RED-009 | Stored XSS in Title/Description | High |
| RED-010 | Unauthenticated Prometheus Metrics | Medium |
| RED-011 | Internal Orchestrator URL Leaked in Error | Low |

---

## Finding Totals

| Severity | Confirmed (Live Exploit) | Theoretical | Total |
|---|---|---|---|
| **Critical** | 3 | 0 | **3** |
| **High** | 5 | 4 | **9** |
| **Medium** | 2 | 6 | **8** |
| **Low** | 1 | 4 | **5** |
| **Total** | **11** | **14** | **25** |

---

## Grading Summary

| Criterion | Actual | Threshold (Grade A) | Result |
|---|---|---|---|
| Critical findings | 3 confirmed | 0 | ❌ |
| High findings | 9 total | ≤ 2 | ❌ |
| Compliance pass rate | 28% | ≥ 90% | ❌ |
| Red-team objectives achieved | 4/4 | 0 | **❌ Automatic F** |

**Final Grade: F**

---

## Priority Remediation Path

### Immediate (Unblocks All Other Fixes)
1. **Implement `requireAuth` middleware** (C-001) — A single middleware placed before all route mounts in `app.ts` / `index.ts` neutralises C-001, C-002, C-003, H-001 through H-007, M-001, M-002, and RED-001 through RED-009 simultaneously. This is the single highest-leverage fix in the entire backlog.

### Short-Term (Complete Within Sprint)
2. **Add RBAC** (C-002, H-004, H-005) — After auth, add role enforcement: `HUMAN_REVIEWER` for approve/deny/force-approve; `SERVICE_ACCOUNT` with create-only for intake webhooks.
3. **Implement audit logging** (H-008) — `auditLog()` helper with all 4 required events.
4. **Fix dependency deletion cascade** (H-003) — On blocker delete, remove or resolve stale dependency links.
5. **Remove `Rejected` from `DISPATCH_TRIGGER_STATUSES`** (H-007) — Low-risk code change with high business logic impact.
6. **Webhook HMAC verification** (H-006) — Verify `X-Zendesk-Webhook-Signature-256` before processing.

### Medium-Term
7. **Add `helmet` + CORS** (M-005) — One line each, eliminates entire header/CORS gap.
8. **Enforce pagination bounds** (H-001, M-006) — `Math.min(parsed, 100)` + `page >= 1` guards.
9. **Server-side HTML sanitization** (H-005) — Apply `sanitize-html` to title/description before persist.
10. **Rate limiting** (M-007) — `express-rate-limit` with tiered limits.
11. **TLS via proxy** (H-009) — Configure nginx/Caddy in front of the Express server.
12. **Enforce minimum search query length** (M-002) — Return 400 for `?q=` or `?q` missing.

### Backlog
13. **Add non-root Docker users** (M-004)
14. **Sanitize CI workflow inputs** (M-003)
15. **GDPR hard delete path** (M-008)
16. **Fix error message forwarding** (L-004)
17. **Data retention policy** (L-005)
18. **Generic error for internal URLs** (L-001)
19. **Non-sequential external IDs** (L-002)
20. **CSRF protection** (L-003) — Required once cookie-based auth is introduced

---

## Positive Findings (Confirmed Safe)

- **No hardcoded secrets** in first-party source code — all credentials reference environment variables or GitHub Actions secrets (SAST-009, verified by static-analyzer).
- **Error handler** (`errorHandler.ts`) correctly logs stack traces server-side and returns only `"Internal server error"` to the client — not exposed externally.
- **Sensitive data not stored unnecessarily** — no PII beyond what is required for work item tracking (OWASP-ASVS V8.1.1 PASS).
- **No credentials or secrets in logs** (OWASP-ASVS V7.1.1 PASS).

---

*Report generated by TheGuardians · Team Leader (Orchestrator) · Run ID: run-20260525-073746*  
*Specialists: static-analyzer · pen-tester · compliance-auditor · red-teamer*
