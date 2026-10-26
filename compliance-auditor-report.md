---

## Compliance Audit Report — dev-crew Source App

**Date:** 2026-10-26
**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)
**Scope:** `Source/Backend/` (Express API) · `Source/Frontend/` (Vite/React)
**Auditor:** Compliance Auditor Agent (TheGuardians)

---

## Findings

---

### COMP-001: No Authentication Layer — All API Endpoints Are Publicly Accessible

- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 §2.1 (Password Verification), §3.1 (Session Management), §4.1 (Access Control Design); SOC2-Type2 CC6.1, CC6.2
- **File/Component:** `Source/Backend/src/app.ts` — all route mounts; `Source/Backend/src/routes/`
- **Observation:** The Express application mounts every route (`/api/work-items`, `/api/dashboard`, `/api/intake`, `/metrics`) with no authentication middleware. No JWT validation, no session check, no API-key verification, and no identity assertion of any kind exists anywhere in the codebase. Any unauthenticated caller can create, update, delete, or approve work items. The `/metrics` endpoint (Prometheus) is also fully open, exposing operational telemetry to the public internet.
- **Remediation:**
  1. Add an authentication middleware (JWT bearer token or API key) as the first middleware in `app.ts`, applied to all `/api/*` routes.
  2. Protect `/metrics` behind IP allowlist or separate internal-only port.
  3. Return `401 Unauthorized` for unauthenticated requests before any business logic runs.

---

### COMP-002: No Authorization / Role-Based Access Control

- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 §4.1.1 (Deny-by-Default), §4.1.2 (Least-Privilege); SOC2-Type2 CC6.1, CC6.3
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`
- **Observation:** Once authentication is added, there is still no authorization layer. Any authenticated identity can perform any action — approving, rejecting, dispatching, or deleting work items — regardless of their role. The `approve`, `reject`, and `dispatch` endpoints are particularly sensitive: in a real workflow system these must be gated to privileged roles (e.g., manager, lead). The `PATCH` endpoint also accepts field updates without scoping to the caller's identity.
- **Remediation:**
  1. Introduce a role model (e.g., `viewer`, `contributor`, `manager`).
  2. Create an authorization middleware that validates the caller's role before each sensitive action.
  3. Log `permission_denied` events (satisfies COMP-004 and SOC2 CC7.1).

---

### COMP-003: No Security Headers (CORS Open, No Helmet, No HSTS, No CSP)

- **Severity:** High
- **Framework/Control:** OWASP-ASVS L2 §14.4.1 (HTTP Security Headers), §14.4.3 (Content-Security-Policy), §14.4.6 (CORS)
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The Express application has no `cors()`, no `helmet()`, no Content-Security-Policy header, no X-Frame-Options, no X-Content-Type-Options, and no Strict-Transport-Security header. Without a CORS policy, browsers will apply the same-origin policy, but the server itself will accept cross-origin preflight requests from any origin. The Vite frontend proxy config also targets plain `http://localhost:3001` with no TLS.
- **Remediation:**
  1. `npm install helmet cors` in `Source/Backend/`.
  2. In `app.ts`, add before any routes: `app.use(helmet()); app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }));`
  3. Configure HSTS in production: `helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } })`.

---

### COMP-004: Required Audit Events Missing (login_attempt, permission_denied, data_export)

- **Severity:** High
- **Framework/Control:** SOC2-Type2 CC7.1 (Monitoring of System Operations); OWASP-ASVS L2 §7.2.1, §7.2.2
- **File/Component:** `Source/Backend/src/routes/`, `Source/Backend/src/middleware/`
- **Observation:** `security.config.yml` requires four audit events: `login_attempt`, `permission_denied`, `state_transition`, and `data_export`. Analysis of all backend route and service files shows:
  - **`login_attempt`** — Not present. There is no login endpoint or auth flow.
  - **`permission_denied`** — Not present. There is no authorization layer, so no denials can be emitted.
  - **`data_export`** — Not present. No logging occurs when data is bulk-listed (`GET /api/work-items?limit=...`) or the dashboard endpoint is called with large ranges.
  - **`state_transition`** — *Partially* present. The `changeHistory` array records each field change, and `logger.info` records significant state changes (dispatch, approve, reject). However, these are not tagged with a canonical `event: "state_transition"` structured key, making them harder to query in a SIEM.
- **Remediation:**
  1. Implement `login_attempt` logging once an authentication system is added.
  2. Implement `permission_denied` logging in the authorization middleware.
  3. Add a `data_export` log event in `GET /api/work-items` and `GET /api/dashboard/activity` when the result set exceeds a threshold (e.g., > 100 records).
  4. Tag all state-transition log entries with `event: "state_transition"` for SIEM parseability.

---

### COMP-005: No Rate Limiting — Enumeration and Brute-Force Risk

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 §11.1.4 (Anti-Automation); SOC2-Type2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (line 69–70), `Source/Backend/src/routes/dashboard.ts` (line 18)
- **Observation:** The `?limit` query parameter is accepted and parsed as-is with no upper bound: `parseInt(req.query.limit as string, 10)`. A caller can pass `?limit=999999` to receive the entire dataset in one request. No rate-limiting middleware exists anywhere. Combined with the absence of authentication, this enables trivial full data enumeration.
- **Remediation:**
  1. `npm install express-rate-limit` and apply to all API routes.
  2. Cap the `limit` parameter server-side: `const limit = Math.min(parseInt(...) || 20, 100)`.
  3. Add an integration test asserting that `?limit=99999` returns at most 100 records.

---

### COMP-006: No TLS / HTTPS Enforcement

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 §9.1.1 (TLS All Communications), §9.1.2 (Valid Certificates); SOC2-Type2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (listen on plain HTTP); `Source/Frontend/vite.config.ts` (proxy to `http://localhost:3001`)
- **Observation:** The backend server listens on HTTP only (no TLS certificates configured, no redirect from HTTP to HTTPS). The dev environment quick-reference in `CLAUDE.md` references `http://localhost:3001` and `http://localhost:5173`. While localhost may be acceptable during development, there is no production TLS enforcement path or reverse-proxy configuration documented.
- **Remediation:**
  1. Add a reverse proxy (nginx or Caddy) with TLS termination for production deployments.
  2. Add an HTTP-to-HTTPS redirect middleware for any non-localhost listener.
  3. Document the production TLS setup in `CLAUDE.md` or a deployment guide.

---

### COMP-007: Plaintext Admin Credentials in CLAUDE.md

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS L2 §2.10.1 (No Hardcoded Credentials); SOC2-Type2 CC6.2
- **File/Component:** `CLAUDE.md` (line 65)
- **Observation:** `CLAUDE.md` lists `admin@example.com / admin123` under the Dev Environment Quick Reference table. Although this is a documentation file and likely refers to a local development environment, storing credentials in a checked-in plaintext file violates the no-hardcoded-secrets architecture rule stated in the same file and creates risk if the repository is ever made public or the pattern migrates to a real environment.
- **Remediation:**
  1. Replace inline credentials with a reference to a `.env.example` file: `Login credentials | See \`.env.example\`` 
  2. Add `admin123` (or its hash) to the secret-scanning exclude list only after confirming it is dev-only.
  3. Add a pre-commit hook or CI check (e.g., `gitleaks`) to detect future credential leakage.

---

### COMP-008: No Hard-Delete / Data Erasure Mechanism (GDPR Art. 17 Readiness Risk)

- **Severity:** Low
- **Framework/Control:** GDPR Art. 17 (Right to Erasure); SOC2-Type2 CC8.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (`softDelete`), `Source/Backend/src/routes/workItems.ts` (`DELETE /:id`)
- **Observation:** The only delete mechanism is a soft-delete that sets `item.deleted = true` in memory. No hard-purge function or endpoint exists. The data is held in-memory and cleared on restart, which currently mitigates the risk. However, if a persistent database is added in the future (highly likely), without a hard-delete path, the application will be non-compliant with GDPR Art. 17 if it ever processes personal data.
- **Remediation:**
  1. For current scope: document in `Specifications/` that the soft-delete model is intentional and that a future persistence layer must include a hard-purge endpoint.
  2. When a database is introduced: implement `DELETE /api/work-items/:id/purge` (privileged role only) that physically removes the record and all associated history.

---

### COMP-009: No Input Validation Schema Library — Incomplete Injection Protection

- **Severity:** Low
- **Framework/Control:** OWASP-ASVS L2 §5.1.1 (HTTP Parameter Pollution), §5.1.3 (Structured Data Validation)
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** Validation is done manually field-by-field using `Object.values(Enum).includes()` checks. There is no schema validation library (Zod, Joi, Yup). The `intake` endpoints (`/api/intake/zendesk`, `/api/intake/automated`) accept arbitrary `body.type` and `body.priority` values that fall back to defaults rather than rejecting invalid inputs. No length limits are applied to `title` or `description` strings, which could allow oversized payloads.
- **Remediation:**
  1. Adopt a schema-validation library (Zod is idiomatic with TypeScript).
  2. Define schemas for all request bodies; reject requests failing validation with `400`.
  3. Add `express-json-size-limit` or set `express.json({ limit: '100kb' })` to prevent payload inflation.

---

## Compliance Matrix

| Control ID | Framework | Control Description | Status | Finding |
|---|---|---|---|---|
| ASVS 2.1.x | OWASP-ASVS L2 | Password / credential verification | ❌ FAIL | COMP-001 |
| ASVS 2.2.1 | OWASP-ASVS L2 | Multi-factor authentication supported | ❌ FAIL | COMP-001 |
| ASVS 2.10.1 | OWASP-ASVS L2 | No hardcoded credentials | ⚠️ PARTIAL | COMP-007 |
| ASVS 3.1.x | OWASP-ASVS L2 | Session management | ❌ FAIL | COMP-001 |
| ASVS 4.1.1 | OWASP-ASVS L2 | Deny by default access control | ❌ FAIL | COMP-002 |
| ASVS 4.1.2 | OWASP-ASVS L2 | Least privilege | ❌ FAIL | COMP-002 |
| ASVS 4.2.2 | OWASP-ASVS L2 | Pagination limit enforced | ❌ FAIL | COMP-005 |
| ASVS 5.1.x | OWASP-ASVS L2 | Input validation / schema enforcement | ⚠️ PARTIAL | COMP-009 |
| ASVS 7.1.x | OWASP-ASVS L2 | Structured logging, no sensitive data in logs | ✅ PASS | — |
| ASVS 7.2.1 | OWASP-ASVS L2 | Audit logs for security events | ❌ FAIL | COMP-004 |
| ASVS 7.4.1 | OWASP-ASVS L2 | Error messages don't expose internals | ✅ PASS | — |
| ASVS 9.1.1 | OWASP-ASVS L2 | TLS enforced for all communications | ❌ FAIL | COMP-006 |
| ASVS 11.1.4 | OWASP-ASVS L2 | Anti-automation / rate limiting | ❌ FAIL | COMP-005 |
| ASVS 14.4.1 | OWASP-ASVS L2 | HTTP security headers (Helmet) | ❌ FAIL | COMP-003 |
| ASVS 14.4.3 | OWASP-ASVS L2 | Content-Security-Policy | ❌ FAIL | COMP-003 |
| ASVS 14.4.6 | OWASP-ASVS L2 | CORS policy enforced | ❌ FAIL | COMP-003 |
| SOC2 CC6.1 | SOC2-Type2 | Logical access controls implemented | ❌ FAIL | COMP-001, COMP-003, COMP-005 |
| SOC2 CC6.2 | SOC2-Type2 | Identification and authentication | ❌ FAIL | COMP-001, COMP-007 |
| SOC2 CC6.3 | SOC2-Type2 | Role-based access controls | ❌ FAIL | COMP-002 |
| SOC2 CC7.1 | SOC2-Type2 | System monitoring and audit logging | ⚠️ PARTIAL | COMP-004 |
| SOC2 CC8.1 | SOC2-Type2 | Change management tracking | ⚠️ PARTIAL | COMP-008 |

**Summary:**
| | Count |
|---|---|
| ✅ PASS | 2 |
| ⚠️ PARTIAL | 4 |
| ❌ FAIL | 15 |
| **Pass rate (full pass only)** | **~9.5%** |
| **Pass rate (pass + partial)** | **~28.6%** |

**Grade: D** — Below the minimum compliance pass rate for Grade C (60%). Multiple critical controls (authentication, access control, HTTPS) are entirely absent.

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Unlocks |
|---|---|---|---|
| P1 | COMP-001 — Add JWT/API-key authentication middleware | Medium | All auth-dependent controls |
| P1 | COMP-002 — Add RBAC authorization middleware | Medium | CC6.3, ASVS 4.x |
| P1 | COMP-003 — Add `helmet()` + `cors()` | Low | ASVS 14.4.x |
| P2 | COMP-004 — Emit missing audit events | Low | CC7.1, ASVS 7.2 |
| P2 | COMP-005 — Add rate limiting + cap `?limit` | Low | ASVS 11.1, CC6.1 |
| P2 | COMP-006 — Document + enforce TLS in production | Medium | ASVS 9.1 |
| P3 | COMP-007 — Remove credentials from CLAUDE.md | Low | ASVS 2.10 |
| P3 | COMP-008 — Document hard-purge path for future persistence | Low | GDPR Art. 17 |
| P4 | COMP-009 — Adopt Zod schema validation | Medium | ASVS 5.1 |

> **Note on sensitive_fields scope:** The fields listed in `compliance.sensitive_fields` (email, password, token, secret, api_key) do **not** currently appear in the WorkItem data model. If a user-management module is added, encryption-at-rest (ASVS 8.2.x) and PII masking in logs must be implemented from day one.
