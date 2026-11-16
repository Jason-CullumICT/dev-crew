Here is the full compliance audit report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-11-16 | **Auditor:** compliance_auditor | **Model:** sonnet
**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)

---

## Executive Summary

The application is a workflow/work-item tracker with an Express.js backend and React frontend. It has **no authentication layer, no access control, no webhook security, and covers only 1 of 4 required audit event types**. The compliance posture is critically deficient. The estimated pass rate across all assessed controls is **~28% (5 of 18 controls pass)**. Under the configured grading rubric this falls to **Grade D** (2 critical findings, pass rate < 60%).

---

## Findings

### COMP-001: No Authentication Mechanism
- **Severity:** Critical
- **Framework/Control:** SOC2 CC6.2 · OWASP-ASVS 2.1.1 · OWASP-ASVS 2.2.1
- **File/Component:** `Source/Backend/src/app.ts` — all route files
- **Observation:** The Express application has zero authentication middleware. There is no login endpoint, no JWT/session validation, no API key check, and no identity propagation to route handlers. Every API endpoint — including state-transition actions (`/route`, `/approve`, `/reject`, `/dispatch`) — is completely open to anonymous callers. The CLAUDE.md documents credentials (`admin@example.com / admin123`) but no code implements authentication at all.
- **Remediation:**
  1. Add a JWT (or session) authentication middleware and register it globally before all `/api/*` routes in `app.ts`.
  2. Implement a `/api/auth/login` endpoint that validates credentials and issues a signed token.
  3. Propagate the authenticated identity (`userId`, `role`) into the request context for use in audit logs and access-control checks.
  4. Rotate the plaintext password shown in CLAUDE.md; never store credentials in documentation.

---

### COMP-002: No Access Control / Authorization
- **Severity:** Critical
- **Framework/Control:** SOC2 CC6.1 · SOC2 CC6.3 · OWASP-ASVS 4.1.1 · OWASP-ASVS 4.2.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`
- **Observation:** No role-based access control (RBAC) exists. Any caller (once COMP-001 is remediated, any authenticated caller) can approve, reject, dispatch, or delete any work item regardless of role or ownership. There is no principle of least privilege. The `AssessmentRecord` type has a `role` field but it describes assessor roles in the workflow — not caller permissions.
- **Remediation:**
  1. Define an authorization model: which roles (e.g., `submitter`, `reviewer`, `approver`, `admin`) can call which endpoints.
  2. Create an authorization middleware that reads the caller's role from the request context and denies (`403`) actions outside their permission set.
  3. Apply the middleware to state-transition endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) at minimum.

---

### COMP-003: Unauthenticated Webhook Endpoints
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS 11.1.4
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `/api/intake/zendesk` and `/api/intake/automated` accept arbitrary POST bodies from any source with no signature verification, no shared secret, and no IP allowlist. An attacker can flood the system with fabricated work items or exploit the create path.
- **Remediation:**
  1. For the Zendesk webhook: validate the `X-Zendesk-Webhook-Signature` HMAC header using a shared secret stored in an environment variable.
  2. For the automated intake endpoint: require an API key in the `Authorization` header (Bearer token or `X-API-Key`).
  3. Add IP allowlisting as a defence-in-depth layer where the source IP range is known.

---

### COMP-004: Required Audit Events Not Logged
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · SOC2 CC7.2
- **File/Component:** `Source/Backend/src/` — all route and service files
- **Observation:** The security config mandates four audit events: `login_attempt`, `permission_denied`, `state_transition`, and `data_export`. Analysis of all route and service files shows:

  | Required Event | Status | Evidence |
  |---|---|---|
  | `login_attempt` | ❌ MISSING | No login endpoint or log event exists |
  | `permission_denied` | ❌ MISSING | No access control → no 403 responses → no log |
  | `state_transition` | ✅ PARTIAL | `logger.info` on approve/reject/dispatch with `workItemId`; `changeHistory` records transitions, but no structured `event: "state_transition"` field |
  | `data_export` | ❌ MISSING | No data export feature; no log event defined |

- **Remediation:**
  1. After implementing auth (COMP-001), emit a structured `{ event: "login_attempt", success: bool, userId, ip }` log entry on every login.
  2. After implementing RBAC (COMP-002), emit `{ event: "permission_denied", userId, action, resource }` on every 403.
  3. Add a typed `event` field to state-transition log lines: `{ event: "state_transition", from, to, workItemId, actorId }`.
  4. If data export is implemented in future, mandate a `{ event: "data_export", userId, recordCount, filters }` log entry.

---

### COMP-005: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** SOC2 CC6.7 · OWASP-ASVS 9.1.1 · OWASP-ASVS 9.1.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The backend binds to plain HTTP (`app.listen(PORT, ...)`). There is no HTTPS redirect middleware, no HSTS header, and no TLS configuration. All data — including future auth tokens — travels in cleartext.
- **Remediation:**
  1. In production, terminate TLS at the load balancer or reverse proxy (nginx/Caddy) and set `X-Forwarded-Proto` checking.
  2. Add a middleware in `app.ts` that redirects `http://` requests to `https://` when `NODE_ENV === 'production'`.
  3. Add `helmet.hsts()` to inject `Strict-Transport-Security` headers.

---

### COMP-006: Missing HTTP Security Headers (No helmet)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 14.4.1 · OWASP-ASVS 14.4.2 · OWASP-ASVS 14.4.3
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** The `helmet` package is not installed or used. The following headers are absent from all responses: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- **Remediation:**
  1. `npm install helmet` in the backend.
  2. Add `app.use(helmet())` as the first middleware in `app.ts`.
  3. Configure a restrictive CSP: `defaultSrc: ["'self'"]`.

---

### COMP-007: No CORS Policy
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 14.5.1 · OWASP-ASVS 14.5.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is registered. The `cors` package does not appear in `package.json`. Express without `cors` middleware does not emit `Access-Control-Allow-Origin` headers, so browsers enforce the same-origin policy — but API-to-API calls are unrestricted. Once HTTPS and auth are added, an open CORS posture would allow any authenticated browser session to be used cross-origin.
- **Remediation:**
  1. `npm install cors @types/cors`.
  2. Add `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }))` before route registration.
  3. Restrict `origin` to known frontend origins; never use `origin: '*'` with credentialed requests.

---

### COMP-008: No Rate Limiting
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 4.4.2 · SOC2 CC6.6
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** No rate-limiting middleware (`express-rate-limit` or similar) is present on any endpoint. The intake webhook endpoints are particularly exposed: they create work items on each request and can be used for resource exhaustion or data poisoning.
- **Remediation:**
  1. `npm install express-rate-limit`.
  2. Apply a global limiter (e.g., 200 req/min per IP) in `app.ts`.
  3. Apply a tighter limiter to intake webhook routes (e.g., 10 req/min per authenticated source).

---

### COMP-009: No MFA Support
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 2.8.1 · SOC2 CC6.2
- **File/Component:** Architecture — no auth layer exists
- **Observation:** OWASP-ASVS Level 2 requires MFA for high-value actions. As no authentication layer exists at all, MFA is by definition absent. This is a secondary finding that follows from COMP-001.
- **Remediation:** After implementing core authentication, add TOTP-based MFA using `speakeasy` or `otplib`; enforce it for state-transition actions (approve, reject, dispatch).

---

### COMP-010: No Pagination Maximum Limit Enforcement
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS 4.1.3 · SOC2 CC6.6
- **File/Component:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`, `Source/Backend/src/store/workItemStore.ts:35`
- **Observation:** The `limit` query parameter is accepted from the caller as-is with no maximum cap. A caller can pass `limit=1000000` to retrieve the entire dataset in one request, bypassing pagination and enabling bulk data enumeration.
- **Remediation:**
  ```typescript
  const MAX_LIMIT = 100;
  const limit = Math.min(
    req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    MAX_LIMIT
  );
  ```
  Apply this pattern in `workItems.ts` and `dashboard.ts`.

---

### COMP-011: Sensitive Field Encryption Coverage — Architectural Gap
- **Severity:** Low
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS 8.1.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (in-memory)
- **Observation:** The security config specifies sensitive fields (`email`, `password`, `token`, `secret`, `api_key`) that must be encrypted at rest. These fields **do not currently exist** in the `WorkItem` data model — the app is a workflow tracker with no PII. Data is in-memory only (no persistence layer). This is not an active vulnerability but represents an **architectural gap**: if a user model, authentication tokens, or external API credentials are added in future without a data classification review, those fields may be stored without encryption.
- **Remediation:** When a persistence layer (database) is introduced, mandate a data classification gate: any field matching the sensitive field list must use column-level encryption (`pgcrypto`, application-layer encryption, or a secrets manager). Document this requirement in the architecture rules.

---

## Compliance Matrix

| Control ID | Framework | Description | Status |
|---|---|---|---|
| CC6.1 | SOC2-Type2 | Logical access security: authentication & authorisation enforced | ❌ FAIL |
| CC6.2 | SOC2-Type2 | Identification & authentication of users | ❌ FAIL |
| CC6.3 | SOC2-Type2 | Role-based access control / least privilege | ❌ FAIL |
| CC7.1 | SOC2-Type2 | Anomaly detection; required audit events present | ❌ FAIL |
| CC8.1 | SOC2-Type2 | Change management processes | ⬜ N/A (org-level control) |
| ASVS 2.1.1 | OWASP-ASVS L2 | Passwords not stored in recoverable format | ⬜ N/A (no password store) |
| ASVS 2.2.1 | OWASP-ASVS L2 | Anti-automation controls on login | ❌ FAIL (no login) |
| ASVS 2.8.1 | OWASP-ASVS L2 | MFA supported for high-privilege actions | ❌ FAIL |
| ASVS 3.3.1 | OWASP-ASVS L2 | Session timeout / logout invalidation | ❌ FAIL (no sessions) |
| ASVS 4.1.1 | OWASP-ASVS L2 | Access control enforced server-side | ❌ FAIL |
| ASVS 4.1.3 | OWASP-ASVS L2 | Pagination limits enforced | ❌ FAIL |
| ASVS 4.4.2 | OWASP-ASVS L2 | Rate limiting on exposed endpoints | ❌ FAIL |
| ASVS 5.1.1 | OWASP-ASVS L2 | Input validated against allow-list | ✅ PASS |
| ASVS 7.1.1 | OWASP-ASVS L2 | No sensitive data in logs | ✅ PASS |
| ASVS 7.4.1 | OWASP-ASVS L2 | Error messages do not leak internals | ✅ PASS |
| ASVS 8.1.1 | OWASP-ASVS L2 | Sensitive data encrypted at rest | ⬜ N/A (no PII fields; in-memory) |
| ASVS 9.1.1 | OWASP-ASVS L2 | TLS enforced for all connections | ❌ FAIL |
| ASVS 11.1.4 | OWASP-ASVS L2 | Webhook payloads verified via HMAC | ❌ FAIL |
| ASVS 14.4.1 | OWASP-ASVS L2 | Security headers present (helmet) | ❌ FAIL |
| ASVS 14.5.1 | OWASP-ASVS L2 | CORS policy configured | ❌ FAIL |
| Secret Mgmt | Architecture | No hardcoded credentials | ✅ PASS |
| Structured Log | Architecture | Structured JSON logging implemented | ✅ PASS |

**Controls assessed:** 20 (excluding 3 N/A)
**Pass:** 5 | **Fail:** 12 | **N/A:** 3
**Compliance pass rate: ~29%**

---

## Grade: **D**

| Metric | Threshold | Actual | Result |
|---|---|---|---|
| Critical findings | ≤ 2 for D | 2 (COMP-001, COMP-002) | Borderline D |
| High findings | — | 3 | — |
| Compliance pass rate | ≥ 60% for C | 29% | Below C |

The application does not meet Grade C (`max_critical=1, min_compliance_pass_rate=60`). It sits at **Grade D**. If red-team testing confirms any of the critical findings as exploitable breaches, the grade would escalate to **F**.

---

## Priority Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | COMP-001: Add JWT authentication | High | Unblocks CC6.2, V2.x, V3.x |
| P1 | COMP-002: Add RBAC middleware | Medium | Unblocks CC6.1, CC6.3, V4.x |
| P2 | COMP-003: Webhook HMAC signatures | Low | Closes CC6.1 for intake |
| P2 | COMP-004: Structured audit events | Low | Closes CC7.1 |
| P2 | COMP-005: TLS/HTTPS enforcement | Medium | Closes ASVS 9.1.1 |
| P3 | COMP-006: Add helmet | Low | Closes ASVS 14.4.x |
| P3 | COMP-007: Configure CORS | Low | Closes ASVS 14.5.x |
| P3 | COMP-008: Add rate limiting | Low | Closes ASVS 4.4.2 |
| P3 | COMP-009: MFA | Medium | Closes ASVS 2.8.1 |
| P4 | COMP-010: Max pagination limit | Very Low | Closes ASVS 4.1.3 |
| P4 | COMP-011: Data classification gate | Low | Closes ASVS 8.1.1 for future |

---

*Report generated by compliance_auditor agent. Static analysis only — dynamic behaviour to be verified by the red-teamer once an ephemeral environment is available.*
