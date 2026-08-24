# TheGuardians — Security & Compliance Report

**Date:** 2026-08-24 | **Run:** run-20260824-041143 | **Grade: F**

---

## ⛔ Executive Summary

**Grade: F — Confirmed Red-Team Breach of All 4 Critical Objectives**

The red-teamer achieved every configured pentest objective via unauthenticated HTTP calls against a live environment. An anonymous attacker can create a feature request, bypass the approval state machine, and inject an active development cycle pipeline in **four HTTP requests with zero credentials**. The application has no authentication layer, no input sanitization, no TLS enforcement, and fails every SOC2/OWASP-ASVS/ISO27001 compliance control audited.

> **This service must not be exposed on any network until authentication and the Critical findings below are remediated.**

| Metric | Value |
|--------|-------|
| Grade | **F** |
| Critical findings | **3** (all Confirmed Live Exploit) |
| High findings | **9** (4 Confirmed, 5 Theoretical) |
| Medium findings | **10** (1 Confirmed, 9 Theoretical) |
| Low findings | **4** (all Theoretical) |
| Confirmed live breaches | **7** |
| Theoretical findings | **19** |
| Compliance full-pass rate | **0% (0/24 controls)** |
| Compliance partial rate | **33% (8/24 controls)** |
| Red team objectives achieved | **4/4** |

**Top 3 Risks:**
1. **Complete authentication absence** — Every endpoint accepts unauthenticated calls. Confirmed full CRUD without credentials.
2. **State machine & pipeline takeover** — Anonymous attacker can bypass voting/approval and inject a live development pipeline cycle in 4 HTTP calls.
3. **Stored XSS + full data enumeration** — Script payloads stored verbatim; all data retrievable in one request via `?limit=9999999`.

---

## Grading Rationale

Per `security.config.yml` grading rubric:

- **F** = Any confirmed red-team breach of a critical objective → **AUTO-TRIGGERED**
- All 4 configured pentest objectives were confirmed breached.
- Even without Grade F trigger: 3 Critical findings + 0% compliance pass rate disqualifies Grade A through D.

---

## Consolidated Findings

### 🔴 Critical — Confirmed Live Exploit

#### CRIT-001: No Authentication on Any Endpoint — Full Anonymous CRUD
- **Merged from:** SAST-001 · PEN-001 · RED-001 · COMP-001
- **Specialists:** static-analyzer, pen-tester, red-teamer, compliance-auditor
- **CWE:** CWE-306 | **File:** `Source/Backend/src/app.ts`
- **Description:** The Express application registers no authentication middleware. Every endpoint — create, read, update, delete, approve, reject, dispatch, and all workflow transitions — is callable by any unauthenticated caller. The red-teamer confirmed full CRUD without credentials against the live environment.
- **Remediation:**
  1. Add JWT authentication middleware (`express-jwt`) before all `/api/*` routes.
  2. Implement RBAC — distinguish read consumers from write/dispatch/approve operators.
  3. Add HMAC signature validation (`X-Hub-Signature-256`) to all intake endpoints.
  4. Protect `/metrics` with IP allowlist or HTTP Basic auth.

#### CRIT-002: State Machine Bypass via Unauthenticated Force-Approve
- **Merged from:** PEN-003 · RED-003 · PEN-002
- **Specialists:** pen-tester, red-teamer
- **CWE:** CWE-306 | **File:** `portal/Backend/`
- **Description:** `POST /api/feature-requests/:id/force-approve` requires no authentication, no minimum vote count, and performs no state-machine pre-condition checks. A work item at any status can be instantly moved to Approved with zero votes. The `overrideRoute: "fast-track"` parameter additionally bypasses the assessment pod in Source/Backend.
- **Exploit:**
  ```
  POST /api/feature-requests/:id/force-approve   (no auth, no body required)
  → HTTP 200: item status = "approved" with 0 votes
  ```
- **Remediation:** Require admin RBAC on force-approve. Validate state pre-conditions. Enforce minimum vote threshold. Gate and validate `overrideRoute` against a strict enum behind admin privilege.

#### CRIT-003: Unauthenticated Pipeline Injection — Full Takeover in 4 HTTP Calls
- **Source:** RED-007
- **Specialists:** red-teamer
- **CWE:** CWE-306 | **File:** `portal/Backend/`
- **Description:** `POST /api/cycles` requires no authentication and immediately triggers a live development pipeline run. Combined with CRIT-001 and CRIT-002, an anonymous attacker can take a feature request from creation to active pipeline execution in 4 unauthenticated HTTP calls:
  ```
  1. POST /api/feature-requests          → Create FR (no auth)
  2. PATCH /api/feature-requests/:id     → Move to "voting" (no auth)
  3. POST /api/feature-requests/:id/force-approve  → Approve with 0 votes (no auth)
  4. POST /api/cycles                    → Inject dev cycle → live pipeline triggered (no auth)
  ```
- **Remediation:** Require auth + admin authorization on `POST /api/cycles`. Validate referenced work item is in a legitimate approved state. Add allowlist of approvable items.

---

### 🟠 High — Confirmed Live Exploit

#### HIGH-001: No Pagination Ceiling — Full Dataset Enumeration in One Request
- **Merged from:** SAST-003 · PEN-004 · RED-004
- `GET /api/work-items?limit=9999999` and `GET /api/bugs?limit=-1` return entire datasets. Confirmed live.
- **Remediation:** `const safeLimit = Math.min(parseInt(req.query.limit) || 20, 100)` in all list handlers.

#### HIGH-002: Soft-Delete IDOR — Deleted UUID Leaks, Victim Permanently Blocked
- **Merged from:** PEN-007 · RED-005
- Soft-deleted item UUIDs appear in dependent items' `blocked_by[]` arrays; victim item permanently blocked from dispatch. Confirmed live.
- **Remediation:** Clean all `blocked_by` references on soft-delete. Add hard-delete (`purgeWorkItem`) operation.

#### HIGH-003: Stored XSS — Script Payloads Stored Verbatim
- **Source:** RED-006 · COMP-010 · SAST-009
- `<script>alert(1)</script>` and `<img onerror=alert(1)>` in title/description stored verbatim. Confirmed live.
- **Remediation:** Sanitize HTML at write time (`isomorphic-dompurify`). Add CSP via Helmet.

#### HIGH-004: Unauthenticated /metrics — Internal Telemetry Exposed
- **Merged from:** SAST-004 · PEN-011 · RED-002 · COMP-007
- Full Prometheus data (item counts, route labels, process stats) exposed without auth. Confirmed live.
- **Remediation:** Restrict to Prometheus scraper IP allowlist or add HTTP Basic auth.

---

### 🟠 High — Theoretical (Not Confirmed by Red Team)

#### HIGH-005: Webhook Intake Lacks HMAC Signature Verification
- **Source:** SAST-002 · PEN-006 | **CWE:** CWE-345 | `Source/Backend/src/routes/intake.ts`
- Any party can inject arbitrary work items or forge webhook payloads.
- **Remediation:** Verify `X-Hub-Signature-256` HMAC-SHA256 against env-var secrets before processing.

#### HIGH-006: Assessment Pod Bypassed via overrideRoute Parameter
- **Source:** PEN-002 · PEN-008 | `Source/Backend/src/routes/workItems.ts`
- `overrideRoute: "fast-track"` skips assessment entirely. No RBAC check. Any string accepted.
- **Remediation:** Validate against strict enum. Require admin privilege. Reject unknown values with HTTP 400.

#### HIGH-007: Intake Routes Accept Unvalidated Enum Values
- **Source:** PEN-005 | `Source/Backend/src/routes/intake.ts`
- `type` and `priority` fields accept arbitrary strings, can corrupt the routing state machine.
- **Remediation:** Zod/Joi schema validation on all intake payloads. HTTP 422 on invalid enum.

#### HIGH-008: No TLS/HTTPS Enforcement
- **Source:** COMP-002 | **CWE:** CWE-319
- Backend on plain HTTP. No TLS termination, no HSTS. Violates GDPR Art. 32(1)(a), OWASP-ASVS V9.1.1.
- **Remediation:** TLS at reverse proxy (nginx/Caddy). HSTS via Helmet. HTTP→HTTPS redirect.

#### HIGH-009: Missing Required Audit Log Events (SOC2 CC7.1)
- **Source:** COMP-005 | **CWE:** CWE-778 | `Source/Backend/src/utils/logger.ts`
- `login_attempt`, `permission_denied`, `state_transition`, `data_export` events not emitted. No immutable audit trail.
- **Remediation:** Create `auditLogger` with structured event fields. Emit from auth middleware and all workflow handlers.

---

### 🟡 Medium

| ID | Title | Status | Source IDs |
|----|-------|--------|-----------|
| MED-001 | Empty search query dumps full dataset across all entity types | Confirmed | RED-008 |
| MED-002 | NeedsClarification silently collapses to Rejected — unauthorized cascade dispatch | Theoretical | PEN-009 |
| MED-003 | In-memory store returns live references — race condition on changeHistory | Theoretical | PEN-010 |
| MED-004 | Arbitrary string accepted as overrideRoute without enum guard | Theoretical | PEN-008 |
| MED-005 | Missing HTTP security headers — no Helmet.js (no CSP, X-Frame-Options) | Theoretical | SAST-005, COMP-003 |
| MED-006 | `<iframe>` missing sandbox attribute in DebugPortalPage | Theoretical | SAST-006 |
| MED-007 | No rate limiting on any endpoint — intake flood / DoS possible | Theoretical | SAST-007, COMP-006 |
| MED-008 | No CORS policy — any origin can make cross-site requests | Theoretical | COMP-004 |
| MED-009 | No hard-delete / purge — GDPR Art. 17 Right to Erasure unimplementable | Theoretical | COMP-008 |
| MED-010 | No server-side input sanitization on free-text fields | Theoretical | COMP-010, SAST-009 |

---

### 🔵 Low

| ID | Title | Source IDs |
|----|-------|-----------|
| LOW-001 | Raw err.message in HTTP 500 responses / stack traces in logs | SAST-008, COMP-009 |
| LOW-002 | No max-length validation on free-text fields | SAST-009 |
| LOW-003 | No request correlation / trace IDs — incident reconstruction impossible | COMP-011 |
| LOW-004 | pino listed in package.json but unused — unnecessary supply-chain surface | COMP-012 |

---

## Compliance Matrix

| Control | Framework | Description | Status | Finding |
|---------|-----------|-------------|--------|---------|
| CC6.1 | SOC2-Type2 | Logical access controls & authentication | ❌ FAIL | CRIT-001, HIGH-008 |
| CC6.2 | SOC2-Type2 | Access provisioning & user identity | ❌ FAIL | CRIT-001 |
| CC6.3 | SOC2-Type2 | Role-based access restrictions | ❌ FAIL | CRIT-001 |
| CC7.1 | SOC2-Type2 | System monitoring & audit logging | ⚠️ PARTIAL | HIGH-009, LOW-003 |
| CC8.1 | SOC2-Type2 | Change management controls | ⚠️ PARTIAL | changeHistory present; no code-change audit |
| ASVS V2.1 | OWASP-ASVS L2 | Authentication architecture | ❌ FAIL | CRIT-001 |
| ASVS V3.1 | OWASP-ASVS L2 | Session management fundamentals | ❌ FAIL | CRIT-001 |
| ASVS V4.1 | OWASP-ASVS L2 | General access control design | ❌ FAIL | CRIT-001 |
| ASVS V5.2 | OWASP-ASVS L2 | Input sanitization | ⚠️ PARTIAL | MED-010, HIGH-003 |
| ASVS V5.3 | OWASP-ASVS L2 | Output encoding | ⚠️ PARTIAL | MED-010 (JSX auto-escapes) |
| ASVS V7.1 | OWASP-ASVS L2 | Log content | ⚠️ PARTIAL | LOW-003 |
| ASVS V7.2 | OWASP-ASVS L2 | Log processing (audit events) | ❌ FAIL | HIGH-009 |
| ASVS V7.4 | OWASP-ASVS L2 | Error handling | ⚠️ PARTIAL | LOW-001 |
| ASVS V9.1 | OWASP-ASVS L2 | Client communication (TLS) | ❌ FAIL | HIGH-008 |
| ASVS V13.2 | OWASP-ASVS L2 | RESTful web service security | ⚠️ PARTIAL | MED-007 |
| ASVS V14.2 | OWASP-ASVS L2 | Dependency hygiene | ⚠️ PARTIAL | LOW-004 |
| ASVS V14.3 | OWASP-ASVS L2 | Unintended security disclosure | ❌ FAIL | HIGH-004 |
| ASVS V14.4 | OWASP-ASVS L2 | HTTP security headers | ❌ FAIL | MED-005, MED-008 |
| GDPR Art. 17 | GDPR | Right to erasure | ❌ FAIL | MED-009 |
| GDPR Art. 32 | GDPR | Security of processing (encryption) | ❌ FAIL | HIGH-008 |
| ISO27001 A.9 | ISO27001 | Access control | ❌ FAIL | CRIT-001 |
| ISO27001 A.10 | ISO27001 | Cryptography | ❌ FAIL | HIGH-008 |
| ISO27001 A.12.4 | ISO27001 | Logging and monitoring | ⚠️ PARTIAL | HIGH-009, HIGH-004 |
| ISO27001 A.14.1 | ISO27001 | Security in development | ❌ FAIL | MED-005 |

**✅ Full passes: 0/24 (0%) | ⚠️ Partial: 8/24 (33%) | ❌ Failed: 16/24 (67%)**

---

## Red Team Summary

**Objectives achieved: 4/4. Confirmed breaches: 7.**

| Objective | Result | Finding |
|-----------|--------|---------|
| Bypass work item state machine | ✅ BREACHED | RED-003 → CRIT-002 |
| Access/modify soft-deleted work item via direct ID | ✅ BREACHED | RED-005 → HIGH-002 |
| Submit malformed verdict bypassing routing logic | ✅ BREACHED | RED-003 → CRIT-002 (force-approve bypasses assessment entirely) |
| Enumerate all work items without pagination enforcement | ✅ BREACHED | RED-004 → HIGH-001 |

**Full exploit chain confirmed:**
```
1. POST /api/feature-requests          → Create FR (no auth)
2. PATCH /api/feature-requests/:id     → Move to "voting" (no auth)
3. POST /api/feature-requests/:id/force-approve  → Approve 0 votes (no auth)
4. POST /api/cycles                    → Live pipeline triggered (no auth)
```

> **Environment note:** The red-teamer ran against `portal/Backend/` (served via `docker-compose.test.yml`), not `Source/Backend/` analyzed by the pen-tester. Both exhibit the same vulnerability class. Pen-tester findings against `Source/Backend/` are Theoretical pending a dedicated ephemeral run.

---

## Remediation Priority Roadmap

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **P1** | CRIT-001 — Add global JWT auth + RBAC | High | Closes all confirmed Critical/High chains |
| **P1** | CRIT-002 — Gate force-approve with admin RBAC + vote threshold | Low | Eliminates state machine bypass objective |
| **P1** | CRIT-003 — Require auth on POST /api/cycles | Low | Eliminates pipeline injection objective |
| **P1** | HIGH-008 — TLS enforcement at reverse proxy | Medium | GDPR Art. 32 compliance |
| **P2** | HIGH-001 — Cap pagination limit at 100 | Low | Eliminates enumeration objective |
| **P2** | HIGH-002 — Clean blocked_by refs on soft-delete | Medium | Eliminates IDOR objective |
| **P2** | HIGH-003 — Sanitize HTML in free-text at write time | Low | Eliminates stored XSS |
| **P2** | HIGH-004 — Restrict /metrics to scraper IP | Low | Closes reconnaissance vector |
| **P2** | HIGH-005 — HMAC signature on webhooks | Medium | Blocks fake webhook injection |
| **P2** | HIGH-009 — Implement required audit events | Medium | SOC2 CC7.1 compliance |
| **P3** | MED-005 — Add Helmet.js | Low | CSP, X-Frame-Options, XCTO (one line) |
| **P3** | MED-007 — Add express-rate-limit globally | Low | DoS / brute-force mitigation |
| **P3** | MED-008 — Configure CORS allowlist | Low | Prevents cross-origin credential abuse |
| **P3** | MED-009 — Add purgeWorkItem hard-delete | Medium | GDPR Art. 17 compliance |
| **P4** | LOW-001 — Guard stack traces behind NODE_ENV | Low | Reduces info leakage |
| **P4** | LOW-003 — Add correlation IDs to logger | Medium | Enables incident reconstruction |
| **P4** | LOW-004 — Replace hand-rolled logger with pino | Low | Supply-chain hygiene + PII redaction |

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-08-24-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-08-24.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |
| This Report | `guardians-report.md` |

---

*Generated by TheGuardians · run-20260824-041143 · 2026-08-24*  
*Specialists: static-analyzer · compliance-auditor · pen-tester · red-teamer*
