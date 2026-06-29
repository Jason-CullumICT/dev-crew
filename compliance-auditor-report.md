The pipeline dashboard requires a pre-existing run context (it's invoked by the team leader in full pipeline mode). The audit is complete — here is the full report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-06-29 | **Auditor:** compliance_auditor | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1–CC8.1)

---

## Executive Summary

The application is a workflow-item tracking system with a Node.js/Express backend and React frontend. The codebase demonstrates good engineering practices in several areas — structured JSON logging, Prometheus metrics, input validation, and change-history tracking — but it has **systemic, architecture-level gaps** in authentication, authorisation, transport security, and audit logging that cause the majority of compliance controls to fail.

**Overall Pass Rate: ~22% (4 of 18 controls) → Grade D**

---

## Findings

### COMP-001: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1, CC6.2 · OWASP-ASVS 2.1.1, 2.2.1, 4.1.1, 4.1.2
- **File/Component:** `Source/Backend/src/app.ts` (all routes)
- **Observation:** The Express application registers all routes (`/api/work-items`, `/api/workflow`, `/api/dashboard`, `/api/intake`, `/metrics`) with no authentication middleware anywhere in the request chain. Any unauthenticated caller can create, update, approve, reject, or dispatch work items, query the full dashboard, and trigger intake webhooks. There is no JWT validation, no API-key check, no session, and no login endpoint.
- **Remediation:** Add an authentication middleware (e.g., `express-jwt`, Passport.js, or a custom API-key middleware) applied globally in `app.ts` before route registration. Exclude `/health` and optionally `/metrics` (behind internal firewall instead). Implement a login endpoint that issues short-lived JWTs. Document all public-facing routes explicitly.

---

### COMP-002: No Authorisation / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS 4.1.2, 4.1.3, 4.3.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`
- **Observation:** Even if authentication were added, there is no authorisation layer. There are no roles, no permission checks, and no least-privilege enforcement. Any authenticated user could perform any action (approve, reject, dispatch) on any work item. The CLAUDE.md documents an `admin@example.com / admin123` credential but no corresponding auth guard exists in the `Source/` code.
- **Remediation:** Define roles (e.g., `viewer`, `operator`, `admin`). Add a `requireRole(...)` middleware that checks the authenticated user's role before sensitive write endpoints (`/approve`, `/reject`, `/dispatch`). Apply per-route or per-router.

---

### COMP-003: Missing Required Audit Log Events
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1, CC8.1 · OWASP-ASVS 7.2.1, 7.2.2
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all service files
- **Observation:** `security.config.yml` requires four events in audit logs. Current status:
  | Required Event | Status | Notes |
  |---|---|---|
  | `login_attempt` | ❌ MISSING | No auth system; no login endpoint exists |
  | `permission_denied` | ❌ MISSING | No authz system; no 403 responses exist |
  | `state_transition` | ⚠️ PARTIAL | `logger.info` is called on status changes but without a structured `event_type` field; not a queryable audit record |
  | `data_export` | ❌ MISSING | No export feature exists; event never fired |

  The structured logger itself (`utils/logger.ts`) is well-built but emits only `{timestamp, level, message, context}` — there is no dedicated audit log stream or `event_type` discriminator.
- **Remediation:** Introduce a dedicated audit logger function: `auditLog(eventType: AuditEventType, actorId: string, resourceId: string, metadata: object)` that writes to a separate append-only stream. Emit `state_transition` from all service functions that change `WorkItem.status`. Once auth is added, emit `login_attempt` and `permission_denied` from their respective middleware.

---

### COMP-004: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 9.1.1, 9.1.2, 9.2.2 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (listen on HTTP), `Source/Frontend/vite.config.ts`
- **Observation:** The backend listens on plain HTTP (port 3001). The frontend dev proxy forwards to `http://localhost:3001`. There is no TLS configuration, no HTTPS redirect, and no HSTS (`Strict-Transport-Security`) header. All API traffic — including any future credentials or tokens — would traverse an unencrypted channel.
- **Remediation:** For production: terminate TLS at a reverse proxy (nginx/Caddy/load balancer) with a valid certificate; configure HSTS with `includeSubDomains; max-age=31536000`. For development: document that TLS is not required in local-only environments but must be enforced before any staging/production deployment. Add a middleware to redirect HTTP→HTTPS if the app receives plain-text requests.

---

### COMP-005: No Security Headers (Helmet Missing)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 14.4.1, 14.4.2, 14.5.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The Express application has no security-hardening middleware. The following headers are absent from all responses:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security`
  - `Access-Control-Allow-Origin` (CORS)

  Without CORS headers, all cross-origin requests are implicitly allowed (browsers default to same-origin restrictions, but pre-flight OPTIONS handling is undefined).
- **Remediation:** Add `helmet` as a dependency and apply it as the first middleware in `app.ts`: `app.use(helmet())`. Configure CORS explicitly via the `cors` package with an allowlist of trusted origins. Review and tune CSP directives once added.

---

### COMP-006: No Webhook Signature Verification
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS 10.3.1, 10.3.2
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** Both `/api/intake/zendesk` and `/api/intake/automated` accept `POST` requests with no HMAC or shared-secret signature verification. Any actor who discovers the URL can inject arbitrary work items into the system by crafting a POST request.
- **Remediation:** For the Zendesk integration: validate the `X-Zendesk-Webhook-Signature` header using HMAC-SHA256 against a shared secret stored in an environment variable. For the automated endpoint: require a `Bearer` token (API key) in the `Authorization` header. Reject requests that fail signature verification with `401 Unauthorized` and emit a `permission_denied` audit event.

---

### COMP-007: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 11.1.6, 4.4.2
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** `express.json()` is used without a body size limit (default is 100kb in Express 4.x but this is not explicitly configured or documented). No rate-limiting middleware (e.g., `express-rate-limit`) is present. The intake webhook endpoints and workflow transition endpoints are particularly at risk for abuse or DoS.
- **Remediation:** Add `express-rate-limit` and apply a global limiter (e.g., 100 req/15min per IP). Apply a stricter limit on intake endpoints (e.g., 10 req/min). Set an explicit body size limit: `express.json({ limit: '100kb' })`.

---

### COMP-008: Unprotected `/metrics` Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 4.1.2 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (lines 34–37)
- **Observation:** The Prometheus `/metrics` endpoint is publicly accessible with no authentication. It exposes internal counters (`workflow_items_created_total`, `workflow_items_dispatched_total`, `dispatch_gating_events_total`, etc.) that reveal business activity levels and queue depths. This endpoint should only be accessible to Prometheus scrape agents.
- **Remediation:** Restrict `/metrics` to internal network or require a scrape token. Options: (a) move it to a separate internal port using a second `http.Server` instance; (b) add an IP allowlist middleware; (c) require a static `Bearer` token via `Authorization` header checked before the metrics handler.

---

### COMP-009: In-Memory Store — No Persistence or Encryption at Rest
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS 8.2.1, 8.2.2
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All work-item data is stored in a JavaScript `Map` in process memory. On server restart, all data is lost. There is no database, no encrypted volume, and no backup mechanism. While the current domain model does not store the sensitive fields listed in `security.config.yml` (email, password, token, api_key), this architecture provides no foundation for adding persistent encrypted storage if the domain expands.
- **Remediation:** Migrate to a persistent store (SQLite for development, PostgreSQL for production). Apply field-level encryption for any future sensitive fields using a KMS-managed key. Ensure database credentials are injected via environment variables, not hardcoded.

---

### COMP-010: No Input Sanitisation Against Injection
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 5.2.1, 5.3.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** `title` and `description` fields from `POST /api/work-items` and both intake endpoints are stored and returned as-is without sanitisation. Enum validation is present and correct, but free-text fields accept any string payload. When/if these fields are rendered in HTML without escaping, they would be vulnerable to stored XSS. The frontend currently uses React (which escapes by default), but the backend should not assume the rendering layer.
- **Remediation:** Add server-side sanitisation for free-text fields using a library such as `dompurify` (for HTML) or enforce plain-text-only via a validation library like `zod` or `joi`. Set a maximum length on `title` and `description`.

---

### COMP-011: Soft-Delete Does Not Satisfy Hard-Deletion Requirements
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS 8.3.4 (data minimisation)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (`softDelete`)
- **Observation:** `DELETE /api/work-items/:id` performs a soft-delete (sets `item.deleted = true`). The item remains fully in memory and can be retrieved if the store is accessed directly. If this application were to ever store personal data, the soft-delete pattern alone would not satisfy a right-to-erasure request (GDPR Art. 17). Note: current domain model does not store PII.
- **Remediation:** Implement a `hardDelete(id)` method that removes the item from the Map entirely. For future compliance, provide an admin-only hard-delete endpoint. If soft-delete must be preserved for audit purposes, strip all personal fields and retain only a tombstone record.

---

### COMP-012: No Session Timeout Mechanism
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS 3.3.1, 3.3.2
- **File/Component:** N/A (no session management exists)
- **Observation:** As a consequence of the missing authentication system (COMP-001), there are no sessions to time out. When authentication is implemented, session expiry must be enforced: JWTs must have short `exp` claims (≤ 1 hour for user sessions), and refresh tokens must have absolute expiry.
- **Remediation:** When implementing auth (COMP-001), set JWT `exp` to ≤ 3600s. Issue refresh tokens with absolute expiry (≤ 30 days). Store a token revocation list (Redis-based blocklist or short JWT lifetime) to support immediate logout.

---

## Compliance Matrix

### SOC2-Type2 Controls

| Control | Description | Status | Findings |
|---|---|---|---|
| CC6.1 | Logical access controls and authentication | ❌ FAIL | COMP-001, COMP-004, COMP-008 |
| CC6.2 | Authentication credentials management | ❌ FAIL | COMP-001 |
| CC6.3 | Role-based access control | ❌ FAIL | COMP-002, COMP-006 |
| CC7.1 | Security monitoring and detection | ⚠️ PARTIAL | Prometheus metrics exist; security event monitoring absent (COMP-003) |
| CC8.1 | Change management / audit trail | ⚠️ PARTIAL | State transitions logged via `changeHistory`; 3 of 4 required audit events missing (COMP-003) |

**SOC2 Pass Rate: 0/5 full pass, 2/5 partial → 0% full compliance**

---

### OWASP ASVS Level 2 Controls

| Control | Area | Description | Status | Finding |
|---|---|---|---|---|
| 2.1.1 | Authentication | Password/credential minimum requirements | ❌ FAIL | COMP-001 — no auth system |
| 2.2.1 | Authentication | MFA support | ❌ FAIL | COMP-001 — no auth system |
| 2.7.1 | Authentication | Brute-force protection | ❌ FAIL | COMP-001, COMP-007 |
| 3.3.1 | Session | Session timeout (absolute) | ❌ FAIL | COMP-012 |
| 3.3.2 | Session | Session idle timeout | ❌ FAIL | COMP-012 |
| 4.1.1 | Access Control | Trusted enforcement point | ❌ FAIL | COMP-002 |
| 4.1.2 | Access Control | All routes access-controlled | ❌ FAIL | COMP-001, COMP-002 |
| 4.3.1 | Access Control | Admin functions protected | ❌ FAIL | COMP-002 |
| 5.2.1 | Validation | Input sanitisation | ❌ FAIL | COMP-010 |
| 7.1.1 | Logging | No credentials in logs | ✅ PASS | No PII/credentials in log output |
| 7.2.1 | Logging | Required security events logged | ❌ FAIL | COMP-003 — 3/4 required events missing |
| 8.1.1 | Data Protection | No sensitive data in logs | ✅ PASS | Sensitive fields not present in domain model |
| 8.2.1 | Data Protection | Sensitive data protected at rest | ⚠️ PARTIAL | No PII in current model; in-memory store is unencrypted (COMP-009) |
| 9.1.1 | Communications | TLS for all connections | ❌ FAIL | COMP-004 |
| 9.1.2 | Communications | TLS version requirements | ❌ FAIL | COMP-004 |
| 11.1.6 | DoS Protection | Rate limiting | ❌ FAIL | COMP-007 |
| 14.4.1 | HTTP Config | Security headers present | ❌ FAIL | COMP-005 |
| 14.4.2 | HTTP Config | CORS configured | ❌ FAIL | COMP-005 |

**OWASP ASVS Pass Rate: 2/18 full pass → 11%**

---

## Grading

Using the grading scale from `security.config.yml`:

| Metric | Value | Threshold |
|---|---|---|
| Critical findings | 0 | — |
| High findings | 5 (COMP-001–006) | Grade A: ≤2, B: ≤6 |
| Compliance pass rate | ~22% | Grade A: ≥90%, B: ≥75%, C: ≥60% |

**Overall Grade: D** — 5 High-severity findings exceeds B-grade, and 22% pass rate falls below C-grade minimum of 60%.

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 — Immediate | COMP-001 Add authentication | High | Unblocks CC6.1, CC6.2, all 2.x ASVS |
| P1 — Immediate | COMP-005 Add Helmet + CORS | Low | Fixes 3 ASVS controls with one `npm install` |
| P1 — Immediate | COMP-007 Add rate limiting | Low | Fixes ASVS 11.1.6 |
| P2 — Short-term | COMP-002 Add RBAC | Medium | Fixes CC6.3, ASVS 4.x |
| P2 — Short-term | COMP-003 Add audit log events | Medium | Fixes CC7.1, CC8.1, ASVS 7.2.1 |
| P2 — Short-term | COMP-006 Webhook HMAC verification | Low | Fixes CC6.3, ASVS 10.3 |
| P3 — Medium-term | COMP-004 TLS enforcement | Medium | Fixes all ASVS 9.x |
| P3 — Medium-term | COMP-008 Protect /metrics | Low | Fixes ASVS 4.1.2 |
| P3 — Medium-term | COMP-009 Persistent + encrypted store | High | Fixes CC6.1, ASVS 8.2 |
| P4 — Planned | COMP-010 Input sanitisation | Low | Fixes ASVS 5.2.1 |
| P4 — Planned | COMP-011 Hard delete | Low | Future-proofs for GDPR Art. 17 |
| P4 — Planned | COMP-012 Session timeouts | Low | Fixes ASVS 3.3.x (once auth exists) |
