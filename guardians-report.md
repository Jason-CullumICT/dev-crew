# TheGuardians Security Report — 2026-11-23

## ⛔ Grade: F

**Automatic Grade F — Confirmed Live Breach of Critical Objectives.**

The red-teamer confirmed two critical objectives from `pentest.objectives`:
1. Full unauthenticated workflow takeover (state machine bypass, human-approval impersonation via `POST /force-approve`)
2. Complete unauthenticated data enumeration with arbitrary permanent deletion

The root cause is a single architectural gap: **the entire API has zero authentication or authorization middleware.** This cascades into failures across every compliance framework evaluated. The application is not safe to operate in any shared or production environment in its current state.

---

## Summary Counts

| Severity | Count | Confirmed Live | Theoretical |
|----------|-------|----------------|-------------|
| Critical | 2 | 2 | 0 |
| High | 7 | 2 | 5 |
| Medium | 9 | 2 | 7 |
| Low | 3 | 0 | 3 |
| **Total** | **21** | **6** | **15** |

**Compliance Pass Rate: ~19%** (3 partials of 16 controls)
**Red Team Objectives Achieved: 4 / 4**
**Confirmed Critical Breaches: 2** (RED-001, RED-002)

---

## Top 3 Risks

1. **CRIT-01 — Full Workflow Takeover (Confirmed)**: Any anonymous caller can create, escalate, and force-approve work items in 3 HTTP calls, impersonating a human administrator. Zero credentials required.
2. **CRIT-02 — Full Data Exfiltration & Arbitrary Deletion (Confirmed)**: Entire backlog readable by anonymous callers. Permanent deletion of any item requires no authentication. Complete audit trail accessible to anyone.
3. **HIGH-03 — Webhook Injection (Theoretical)**: Intake webhooks have no HMAC signature verification. Any actor can forge Zendesk webhook payloads to inject arbitrary work items.

---

## Consolidated Findings

### Critical — Confirmed Live Exploit

#### CRIT-01: Complete API Authentication Absence — Full Workflow Takeover Confirmed
- **Source IDs:** SAST-01 · PEN-001 · PEN-002 · COMP-001 · COMP-002 · RED-001
- **Specialists:** static-analyzer · pen-tester · compliance-auditor · red-teamer
- **Impact:** Unauthenticated 3-step chain confirmed live: create item → escalate status → `POST /force-approve` → `status: "approved"`, `human_approval_approved_at` stamped. `overrideRoute: "fast-track"` additionally bypasses the entire Assessment Pod.
- **Remediation:**
  1. Add JWT Bearer token validation middleware globally before all `/api/*` routes in `app.ts`
  2. Add role-based authorization guards on state-mutating endpoints (`/approve`, `/reject`, `/dispatch`, `/route`)
  3. Return `401 Unauthorized` for all unauthenticated requests and emit `login_attempt` audit events

#### CRIT-02: Unauthenticated Full Data Enumeration and Arbitrary Deletion Confirmed
- **Source IDs:** PEN-003 · RED-002
- **Specialists:** pen-tester · red-teamer
- **Impact:** `GET /api/feature-requests` and `/api/bugs` return full backlogs; `GET /api/dashboard/activity` returns complete state-change audit trail; `DELETE /api/feature-requests/:id` → HTTP 204 (permanent deletion). All zero credentials.
- **Remediation:**
  1. Apply authentication middleware to all endpoints (prerequisite: CRIT-01)
  2. Clamp pagination: `const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100)`
  3. Require appropriate role/permission to call DELETE and list endpoints

---

### High — Confirmed Live Exploit

#### HIGH-01: Soft-Deleted Blocker Creates Permanent Dependency DoS
- **Source IDs:** PEN-007 · RED-003
- **Impact:** Deleting FR-0002 left FR-0003 with `has_unresolved_blockers: true` persisting indefinitely. Item is permanently stuck until dependency manually removed.
- **Remediation:** Cascade-remove deleted blockers from dependent `blocked_by` arrays; add a stale-reference reaper job.

#### HIGH-02: Unvalidated `source_system` Field Stores Injection Payloads
- **Source IDs:** RED-004
- **Impact:** `source_system: "INJECT; DROP TABLE bugs;--"` stored verbatim, returned on GET. Opens stored XSS / log injection vectors.
- **Remediation:** Validate `source_system` against an allowlist; HTML-encode all user-supplied strings before rendering.

---

### High — Theoretical

#### HIGH-03: Intake Webhook Authentication and Input Validation Bypass
- **Source IDs:** SAST-02 · PEN-004 · COMP-005
- **Impact:** Both `/api/intake/zendesk` and `/api/intake/automated` accept arbitrary POST requests with no HMAC-SHA256 signature verification. Forged payloads can inject arbitrary work items. `type`/`priority` fields are not validated against allowed enum values.
- **Remediation:** Validate `X-Zendesk-Webhook-Signature` via HMAC-SHA256; require bearer token for `/automated`; validate enum fields strictly.

#### HIGH-04: Manual Approve on `routing` Status Bypasses Assessment Pod
- **Source IDs:** PEN-005
- **Impact:** Any caller can approve a `routing`-status item, bypassing Assessment Pod classification entirely.
- **Remediation:** Restrict `/approve` to items in `assessment_in_progress` or `pending_approval` status only. Add role guard.

#### HIGH-05: Rejecting a Blocker Triggers Cascade Auto-Dispatch of Dependents
- **Source IDs:** PEN-006
- **Impact:** Rejecting a blocker automatically dispatches all dependent items, potentially before they are ready for dispatch.
- **Remediation:** Move dependents to `needs_review` on blocker rejection. Require explicit confirmation before cascading state changes.

#### HIGH-06: Required Audit Events Entirely Absent from Logging Layer
- **Source IDs:** COMP-003
- **Impact:** `login_attempt`, `permission_denied`, and `data_export` audit events never emitted. `state_transition` lacks structured `event` field, making it unfilterable. Fails SOC2 CC7.1.
- **Remediation:** Add `auditLog()` helper with `event`, `actorId`, `resource`, `resourceId`, `outcome`, `timestamp`. Emit all four event types.

#### HIGH-07: Missing HTTP Security Headers and CORS Policy
- **Source IDs:** SAST-04 · COMP-004
- **Impact:** No `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`. No CORS policy — backend accepts requests from any origin. `helmet` and `cors` absent from `package.json`.
- **Remediation:** `npm install helmet cors`. `app.use(helmet())` and `app.use(cors({ origin: process.env.ALLOWED_ORIGINS }))` early in `app.ts`.

---

### Medium — Confirmed Live Exploit

#### MED-01: Unauthenticated /metrics Leaks Full Operational Intelligence
- **Source IDs:** SAST-07 · PEN-010 · COMP-006 · RED-005
- **Impact:** `GET /metrics` confirmed: returns route map, request counts, state transition counters, `ai_voting_invocations_total`, and full Node.js runtime internals. Zero credentials.
- **Remediation:** Gate `/metrics` with IP allowlisting or bearer token; or move to a separate internal port.

#### MED-02: Cross-Entity Dependency Injection
- **Source IDs:** RED-006
- **Impact:** Bugs can block feature requests with no semantic validation. Cross-type dependency pollution confirmed live.
- **Remediation:** Validate compatible entity types on dependency endpoints. Reject unsupported cross-type dependencies.

---

### Medium — Theoretical

| ID | Title | Source IDs |
|----|-------|-----------|
| MED-03 | Internal Error Messages Returned to HTTP Clients | SAST-03 |
| MED-04 | Unbounded Pagination `limit` — DoS Vector | SAST-05 |
| MED-05 | No Rate Limiting on Any Endpoint | SAST-06 · COMP-007 |
| MED-06 | NaN/Zero Pagination Parameters Cause Data-Masking | PEN-008 |
| MED-07 | `NeedsClarification` Assessment Verdict Silently Collapses | PEN-009 |
| MED-08 | Soft-Delete Does Not Satisfy GDPR Right to Erasure (Art. 17) | COMP-008 |
| MED-09 | No TLS/HTTPS Enforcement at Application Layer | COMP-009 |

---

### Low

| ID | Title | Source IDs |
|----|-------|-----------|
| LOW-01 | No Max-Length Enforcement on title/description Fields | PEN-011 |
| LOW-02 | `<iframe>` Without `sandbox` Attribute in DebugPortalPage | SAST-08 |
| LOW-03 | Change History Actor Hardcoded as 'user'/'manual-override' | COMP-010 |

---

## Compliance Matrix

| Framework | Control | Description | Status | Notes |
|-----------|---------|-------------|--------|-------|
| SOC2 Type2 | CC6.1 | Logical access controls | ❌ FAIL | Zero auth on all endpoints |
| SOC2 Type2 | CC6.2 | User authentication management | ❌ FAIL | No login/user system |
| SOC2 Type2 | CC6.3 | Role-based access restrictions | ❌ FAIL | No RBAC |
| SOC2 Type2 | CC7.1 | Detection / audit logging | ⚠️ PARTIAL | Logger exists; 3/4 required audit events absent |
| SOC2 Type2 | CC8.1 | Change management | ⚠️ PARTIAL | changeHistory present; actors hardcoded |
| OWASP-ASVS L2 | V2 (Auth) | Authentication controls | ❌ FAIL | No auth system at all |
| OWASP-ASVS L2 | V4 (Access Control) | Access control enforcement | ❌ FAIL | No access control checks |
| OWASP-ASVS L2 | V7 (Error/Logging) | Error handling & logging | ⚠️ PARTIAL | Structured logs present; audit events missing; raw errors returned |
| OWASP-ASVS L2 | V9 (Communications) | TLS/HTTPS | ❌ FAIL | HTTP only; no security headers |
| OWASP-ASVS L2 | V11 (Business Logic) | Rate limiting / brute-force | ❌ FAIL | No rate limiting |
| OWASP-ASVS L2 | V14 (Config) | Security HTTP headers | ❌ FAIL | No helmet/CORS |
| GDPR | Art. 17 | Right to Erasure | ❌ FAIL | Soft-delete retains all data |
| ISO27001 | A.9.1 | Access control policy | ❌ FAIL | No access control defined |
| ISO27001 | A.12.4 | Audit logging | ⚠️ PARTIAL | Infrastructure exists; events incomplete |
| ISO27001 | A.14.1 | Security in app development | ❌ FAIL | No TLS; no security headers |
| ISO27001 | A.18.1 | Data retention | ❌ FAIL | No retention policy |

**Controls Passed (full): 0 | Controls Partial: 3 | Controls Failed: 13**
**Compliance Pass Rate: ~19%** (3 partials × 0.5 = 1.5 / 16 total)

---

## Red Team Summary

| Metric | Result |
|--------|--------|
| Target | `http://localhost:3001` (dev-crew-portal-1) |
| Exploit Chains Attempted | 12 |
| Total Confirmed Exploits | 6 |
| Confirmed Critical Breaches | **2** (RED-001, RED-002) |
| Objectives Attempted | 4 |
| **Objectives Achieved** | **4 / 4** |

### Objectives

| # | Objective | Status | Finding |
|---|-----------|--------|---------|
| 1 | Bypass work item state machine to reach an invalid status | ✅ ACHIEVED | RED-001 — CRITICAL |
| 2 | Access or modify a soft-deleted work item via direct ID reference | ✅ ACHIEVED | RED-003 — HIGH |
| 3 | Submit a malformed assessment verdict that bypasses routing logic | ✅ ACHIEVED | RED-004 — HIGH |
| 4 | Enumerate all work items without pagination limit enforcement | ✅ ACHIEVED | RED-002 — CRITICAL |

---

## Grading Rationale

| Criterion | Threshold | Actual | Result |
|-----------|-----------|--------|--------|
| Confirmed red-team breach of critical objective | Any = F | 2 breaches | **F (automatic)** |
| Critical findings | 0 for A/B, ≤1 for C, ≤2 for D | 2 | — |
| High findings | ≤2 for A, ≤6 for B, ≤12 for C | 7 | — |
| Compliance pass rate | ≥90% A, ≥75% B, ≥60% C | 19% | — |

**Final Grade: F** — Per `security.config.yml`: "F: reserved for confirmed red-team breach of a critical objective (automatic)." Two critical objectives were confirmed breached.

---

## Priority Remediation Order

1. 🔴 **CRIT-01** — Implement authentication (blocks all auth-dependent issues)
2. 🔴 **CRIT-01** — Implement RBAC (blocks CC6.3, V4; prerequisite for CRIT-01 fix)
3. 🔴 **HIGH-06** — Implement structured audit events (`login_attempt`, `permission_denied`, `state_transition`, `data_export`)
4. 🔴 **HIGH-07** — Add `helmet` + CORS (security headers, HSTS)
5. 🔴 **HIGH-03** — Add HMAC verification to intake webhooks
6. 🟠 **HIGH-01** — Fix soft-deleted blocker dependency cascade
7. 🟠 **HIGH-02** — Validate `source_system` against allowlist
8. 🟠 **HIGH-04** — Restrict `/approve` to valid statuses only
9. 🟠 **HIGH-05** — Fix cascade auto-dispatch on blocker rejection
10. 🟡 **MED-01** — Gate `/metrics` endpoint
11. 🟡 **MED-04 / MED-05** — Add pagination clamping and rate limiting
12. 🟡 **MED-08** — Implement GDPR-compliant hard delete / data erasure
13. 🟡 **MED-09** — Enforce TLS at infrastructure level
14. 🟢 **LOW-03** — Wire actor identity into change history once auth exists

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-11-23-F.html` |
| Security Backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-11-23.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

> ⛔ **Confirmed breach — operator decision required before any merge or deployment.**
> Route all theoretical findings → TheFixer backlog. See `Teams/TheFixer/team-leader.md`.

_Posted by TheGuardians · 2026-11-23_
