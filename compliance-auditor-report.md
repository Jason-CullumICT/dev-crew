The dashboard script needs a registered pipeline run ID (this is a standalone invocation). The findings are the primary deliverable — here is the full compliance audit.

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-07-27 | **Auditor:** compliance_auditor | **Frameworks:** OWASP-ASVS L2 · SOC2-Type2 · GDPR · ISO 27001

---

## Executive Summary

The application is a **workflow-engine REST API** (Express/TypeScript) + React SPA with an **in-memory data store and zero authentication controls**. Static analysis of the full `Source/` tree reveals the security posture is pre-baseline: no authentication middleware, no HTTPS enforcement, no CORS policy, no security headers, no rate limiting, and none of the four required audit events are emitted to a security log. All 18 framework-specific controls fail, yielding a **~6 % compliance pass rate** and a **Grade D** by the configured grading rubric.

---

## Findings

---

### COMP-001: No Authentication Mechanism
- **Severity:** Critical
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS 2.1.1 / 2.2.1 · ISO27001 A.9.4.2 · GDPR Art. 32
- **File/Component:** `Source/Backend/src/app.ts` (all routes)
- **Observation:** Every API endpoint — work items, workflow transitions, intake webhooks, dashboard, metrics — is mounted with no authentication middleware whatsoever. There is no user model, no credential store, no session layer, no API key validation, and no JWT/bearer-token check anywhere in the `Source/` tree. Any unauthenticated caller on the network can read all work items, trigger state transitions, inject data via intake webhooks, and read Prometheus metrics.
- **Remediation:**
  1. Introduce an authentication middleware (e.g., JWT bearer token verified via `express-jwt` + JWKS, or a simple API-key middleware for internal tooling).
  2. Mount it globally before any route: `app.use(authMiddleware)`.
  3. Add an identity context (`req.user`) propagated to all services for audit logging.
  4. Exempt only `/health` and (once secured separately) `/metrics`.

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** Critical
- **Framework/Control:** SOC2 CC6.2 · CC6.3 · OWASP-ASVS 4.1.1 / 4.1.3 · ISO27001 A.9.4.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts`
- **Observation:** No authorization checks exist anywhere. Once authentication is added (COMP-001), there is still no RBAC or permission layer: any authenticated caller can perform every operation, including manual approve/reject overrides, dispatch to teams, and deleting work items. The principle of least privilege is not implemented.
- **Remediation:**
  1. Define roles (e.g., `operator`, `reviewer`, `admin`).
  2. Add route-level authorization middleware: `requireRole('reviewer')` guarding `/approve`, `/reject`, `/dispatch`.
  3. Log authorization decisions (needed for COMP-003).

---

### COMP-003: Required Audit Events Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · ISO27001 A.12.4.1 · OWASP-ASVS 7.2.1
- **File/Component:** `Source/Backend/src/utils/logger.ts` · all route files
- **Observation:** `security.config.yml` mandates four audit events: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. None are present:
  - **`login_attempt`** — No auth layer means no login; when auth is added, login events must be logged.
  - **`permission_denied`** — No authorization layer; no rejection events ever fire.
  - **`state_transition`** — Work-item status changes are tracked inside `WorkItem.changeHistory` (a domain object), but this is embedded data, not a centralized security audit log emitting structured `state_transition` events. The operational logger only emits `Work item approved / rejected / dispatched` with no structured `event_type` field.
  - **`data_export`** — No export endpoint exists; if a bulk-export feature is ever added, it must be audited.
- **Remediation:**
  1. Add an `auditLog()` helper that emits a structured JSON event with fields: `event_type`, `actor`, `target_id`, `timestamp`, `outcome`.
  2. Emit `state_transition` from every route that changes `WorkItem.status`.
  3. Emit `permission_denied` from the authorization middleware on every 403.
  4. Emit `login_attempt` (success/failure) from the auth layer.

---

### COMP-004: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 9.1.1 · SOC2 CC6.1 · ISO27001 A.14.1.2
- **File/Component:** `Source/Backend/src/app.ts` (line 46–51)
- **Observation:** The Express server binds to plain HTTP (`app.listen(PORT)`). There is no TLS configuration, no HTTPS server, and no HTTP→HTTPS redirect. All data including work-item content transits in cleartext. The Vite dev proxy (`vite.config.ts` line 13–15) also targets `http://localhost:3001`.
- **Remediation:**
  1. For production: terminate TLS at the reverse-proxy/load-balancer (nginx/ALB) and redirect HTTP→HTTPS.
  2. Add `Strict-Transport-Security` header (see COMP-006).
  3. Document in `CLAUDE.md` that `http://localhost:3001` is dev-only; production must be HTTPS.

---

### COMP-005: No CORS Policy
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 14.5.3 · ISO27001 A.14.2.5
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is mounted. Express's default behaviour allows all cross-origin requests. Any webpage on any origin can call the API from a browser, bypassing the same-origin policy.
- **Remediation:**
  1. Install `cors` package.
  2. Apply `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }))`.
  3. Configure `ALLOWED_ORIGINS` per environment in `.env`.

---

### COMP-006: Security Response Headers Absent
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 14.4.1–14.4.6 · ISO27001 A.14.2.5
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security headers are set on any response: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Strict-Transport-Security` are all absent. Grep across all source confirms zero `helmet` import and zero manual header assignment.
- **Remediation:**
  1. Install `helmet`.
  2. Apply `app.use(helmet())` before any route in `app.ts`.
  3. Configure CSP explicitly once the frontend origin is known.

---

### COMP-007: No Rate Limiting on Any Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 4.2.1 · ISO27001 A.12.1.3
- **File/Component:** `Source/Backend/src/app.ts` · `Source/Backend/src/routes/intake.ts`
- **Observation:** No rate-limiting middleware exists. The intake webhook endpoints (`/api/intake/zendesk`, `/api/intake/automated`) can be spammed to flood the in-memory store. The list endpoint accepts an unbounded `limit` query parameter (e.g., `?limit=999999`) allowing full data enumeration in a single request — matching one of the red-team objectives in `security.config.yml`.
- **Remediation:**
  1. Install `express-rate-limit`.
  2. Apply a global limiter (e.g., 100 req/min per IP) and a stricter limiter on intake endpoints.
  3. Cap the `limit` query parameter to a maximum (e.g., 100) in `workItems.ts` lines 68–72.

---

### COMP-008: Intake Webhooks Have No Authentication/HMAC Verification
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 2.10.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts` (lines 11–54)
- **Observation:** Both `/api/intake/zendesk` and `/api/intake/automated` accept any POST body with no signature validation, no API key check, and no origin allowlist. Zendesk's standard webhook delivery signs payloads with HMAC-SHA256 via an `X-Zendesk-Webhook-Signature` header; this is never verified. An attacker can forge Zendesk events or flood the automated intake channel.
- **Remediation:**
  1. Implement HMAC-SHA256 signature verification for the Zendesk endpoint using a shared secret stored in an environment variable.
  2. Require an `Authorization: Bearer <token>` header for the automated endpoint with a rotating API key.

---

### COMP-009: Prometheus `/metrics` Endpoint Is Publicly Accessible
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · ISO27001 A.9.4.1
- **File/Component:** `Source/Backend/src/app.ts` (lines 34–37)
- **Observation:** The `/metrics` endpoint is unauthenticated and returns full Prometheus metrics including counter labels (team names, workflow route values, assessed/dispatched totals). This leaks operational topology to unauthenticated callers.
- **Remediation:**
  1. Guard `/metrics` with a separate middleware that requires a `Bearer` token set in `METRICS_TOKEN` env var, or bind the metrics server to a private port not exposed externally.
  2. Alternatively, configure scraping at the reverse-proxy level and firewall the endpoint from public access.

---

### COMP-010: In-Memory Store — No Persistence, No Encryption at Rest
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 6.1.1 / 6.2.7 · SOC2 CC6.1 · ISO27001 A.10.1.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (line 12)
- **Observation:** All data lives in `let items: Map<string, WorkItem>` — a process-local JavaScript Map. On server restart, all data is lost. There is no database, no disk persistence, and no encryption at rest. If the application were extended to store sensitive content in `description` fields, that data has no protection layer. The `sensitive_fields` specified in `security.config.yml` (email, password, token, secret, api_key) do not appear in the current schema, but the unprotected store remains a structural compliance gap.
- **Remediation:**
  1. Replace the in-memory store with a persisted database (PostgreSQL recommended).
  2. Enable database-level encryption at rest (e.g., AWS RDS encryption, or Transparent Data Encryption).
  3. Ensure backups are also encrypted.

---

### COMP-011: Pagination `limit` Parameter Uncapped
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 4.2.1 · OWASP Top 10 A01
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (lines 68–72)
- **Observation:** The `limit` query parameter is parsed as an integer with no upper bound: `parseInt(req.query.limit as string, 10)`. A caller passing `?limit=1000000` retrieves the entire store in one response — matching the red-team objective "Enumerate all work items without pagination limit enforcement."
- **Remediation:**
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string, 10) : 20, MAX_LIMIT);
  ```

---

### COMP-012: No Hard Deletion / Right to Be Forgotten
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 · ISO27001 A.11.2.7
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (lines 78–89)
- **Observation:** The only deletion mechanism is soft-delete (`item.deleted = true`). Deleted items remain in memory (and would remain in a future database). There is no hard-delete or purge endpoint, and no mechanism to permanently erase a work item and its associated change history — which may contain user-supplied PII in free-text fields.
- **Remediation:**
  1. Add a `purgeWorkItem(id)` function that removes the item entirely.
  2. Expose a `DELETE /api/work-items/:id/purge` endpoint restricted to admin role.
  3. Document a data subject access request (DSAR) process.

---

### COMP-013: No Data Retention Policy Enforcement
- **Severity:** Low
- **Framework/Control:** GDPR Art. 5(1)(e) · ISO27001 A.11.2.7
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** Data accumulates indefinitely with no retention limit or scheduled purge. Completed and rejected work items are never automatically removed. With a future persistence layer, this violates GDPR's storage-limitation principle.
- **Remediation:**
  1. Define a retention period per environment (e.g., `DATA_RETENTION_DAYS=365` in `.env`).
  2. Implement a scheduled cleanup job that hard-deletes records older than the threshold.

---

### COMP-014: Custom Logger Lacks Sensitive-Field Redaction; `pino` Unused
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS 7.1.2 · SOC2 CC7.1
- **File/Component:** `Source/Backend/src/utils/logger.ts` · `Source/Backend/package.json`
- **Observation:** `pino` (which ships with `fast-redact` for sensitive-field masking) is listed as a runtime dependency but is never imported — `utils/logger.ts` is a hand-rolled emitter. The current log payloads contain no PII, but if authentication is added (COMP-001), user identity fields will enter log context. Without redaction configured, tokens or emails could be inadvertently logged.
- **Remediation:**
  1. Switch to `pino` with a `redact` config: `pino({ redact: ['req.headers.authorization', 'body.password', 'body.token'] })`.
  2. Remove the custom logger or wrap pino with the existing `normalize()` adapter.

---

## Compliance Matrix

| Control ID | Framework | Control Name | Status | Finding |
|---|---|---|---|---|
| ASVS 2.1.1 | OWASP-ASVS L2 | Authentication mechanism present | ❌ FAIL | COMP-001 |
| ASVS 2.2.1 | OWASP-ASVS L2 | Credential validation controls | ❌ FAIL | COMP-001 |
| ASVS 2.10.1 | OWASP-ASVS L2 | Webhook / service credential verification | ❌ FAIL | COMP-008 |
| ASVS 4.1.1 | OWASP-ASVS L2 | Server-side access enforcement | ❌ FAIL | COMP-002 |
| ASVS 4.1.3 | OWASP-ASVS L2 | Principle of least privilege | ❌ FAIL | COMP-002 |
| ASVS 4.2.1 | OWASP-ASVS L2 | Rate limiting / anti-automation | ❌ FAIL | COMP-007, COMP-011 |
| ASVS 6.1.1 | OWASP-ASVS L2 | Sensitive data identified & encrypted at rest | ❌ FAIL | COMP-010 |
| ASVS 7.1.1 | OWASP-ASVS L2 | No sensitive data in logs | ✅ PASS | None (no PII in current schema) |
| ASVS 7.1.2 | OWASP-ASVS L2 | Log sanitization / redaction | ⚠️ PARTIAL | COMP-014 |
| ASVS 7.2.1 | OWASP-ASVS L2 | Security events logged | ❌ FAIL | COMP-003 |
| ASVS 9.1.1 | OWASP-ASVS L2 | TLS enforced for all connections | ❌ FAIL | COMP-004 |
| ASVS 14.4.1–6 | OWASP-ASVS L2 | Security response headers | ❌ FAIL | COMP-006 |
| ASVS 14.5.3 | OWASP-ASVS L2 | CORS policy enforced | ❌ FAIL | COMP-005 |
| CC6.1 | SOC2-Type2 | Logical access controls | ❌ FAIL | COMP-001, COMP-004, COMP-009 |
| CC6.2 | SOC2-Type2 | Access provisioning process | ❌ FAIL | COMP-002 |
| CC6.3 | SOC2-Type2 | Access removal process | ❌ FAIL | COMP-002 |
| CC7.1 | SOC2-Type2 | Security event detection & logging | ❌ FAIL | COMP-003 |
| CC8.1 | SOC2-Type2 | Change management controls | ⚠️ PARTIAL | WorkItem changeHistory exists but is domain-level, not security change-management |
| GDPR Art. 17 | GDPR | Right to erasure (RTBF) | ❌ FAIL | COMP-012 |
| GDPR Art. 5(1)(e) | GDPR | Storage limitation | ❌ FAIL | COMP-013 |
| GDPR Art. 25 | GDPR | Privacy by design | ❌ FAIL | COMP-001, COMP-002, COMP-010 |
| GDPR Art. 32 | GDPR | Appropriate technical security measures | ❌ FAIL | COMP-001, COMP-004 |
| ISO27001 A.9.4.1 | ISO 27001 | Access control to systems and applications | ❌ FAIL | COMP-002, COMP-009 |
| ISO27001 A.9.4.2 | ISO 27001 | Secure log-on procedures | ❌ FAIL | COMP-001 |
| ISO27001 A.10.1.1 | ISO 27001 | Policy on use of cryptographic controls | ❌ FAIL | COMP-010 |
| ISO27001 A.12.1.3 | ISO 27001 | Capacity management / DoS protection | ❌ FAIL | COMP-007 |
| ISO27001 A.12.4.1 | ISO 27001 | Event logging | ❌ FAIL | COMP-003 |
| ISO27001 A.14.1.2 | ISO 27001 | Securing application services over public networks | ❌ FAIL | COMP-004, COMP-005 |

**Summary:** 1 Pass · 2 Partial · 25 Fail → **~4 % pass rate**

---

## Security Grade

| Metric | Value | Threshold |
|---|---|---|
| Critical findings | 2 (COMP-001, COMP-002) | Grade D allows ≤ 2 |
| High findings | 6 (COMP-003–005, COMP-007–008, COMP-010) | Grade D no high limit |
| Compliance pass rate | ~4 % | Grade A ≥ 90 % |

**Assigned Grade: D**

The score reflects a system that is pre-baseline for production compliance. No individual exploit was confirmed via dynamic testing (that is the red-teamer's role), but the absence of any authentication layer means all red-team objectives in `security.config.yml` — state-machine bypass, soft-delete circumvention, verdict forgery, unbounded enumeration — are achievable by any unauthenticated network caller without any exploitation technique.

---

## Remediation Priority Order

| Priority | Finding | Effort |
|---|---|---|
| P1 | COMP-001 — Add authentication middleware | Medium |
| P1 | COMP-002 — Add RBAC authorization layer | Medium |
| P1 | COMP-003 — Emit required audit events | Low |
| P2 | COMP-004 — Enforce HTTPS at proxy/infra | Low |
| P2 | COMP-005 — Add CORS policy | Low |
| P2 | COMP-007 — Add rate limiting + cap pagination | Low |
| P2 | COMP-008 — Verify Zendesk HMAC + automated API key | Low |
| P3 | COMP-006 — Add Helmet security headers | Low |
| P3 | COMP-009 — Restrict `/metrics` endpoint | Low |
| P3 | COMP-010 — Migrate to persistent encrypted store | High |
| P3 | COMP-011 — Cap pagination limit parameter | Low |
| P4 | COMP-012 — Add hard-delete / RTBF endpoint | Low |
| P4 | COMP-013 — Implement data retention job | Medium |
| P4 | COMP-014 — Switch to pino with redaction | Low |
