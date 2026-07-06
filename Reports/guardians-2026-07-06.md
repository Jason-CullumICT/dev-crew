# TheGuardians — Security & Compliance Report

**Date:** 2026-07-06 | **Grade:** F | **Run:** run-20260706-073451  
**App:** dev-crew Source App (Backend + Frontend) | **Frameworks:** OWASP-ASVS L2 · SOC2-Type2

---

## ⛔ Grade: F — Confirmed Breach of Critical Objectives

> **Operator decision required before any merge.**  
> The red-team confirmed 9 live exploits against an ephemeral environment. Two critical objectives were fully achieved, triggering an automatic F.

---

## Executive Summary

The dev-crew Source App has a **catastrophic authentication and authorization gap**: every API endpoint is publicly accessible with zero identity verification. Any anonymous HTTP caller can read, create, modify, approve, reject, dispatch, and delete work items. A red-team engagement confirmed this is not theoretical — all exploit chains ran without a single credential or token.

**Root cause:** `app.ts` mounts every route with no authentication middleware. This single finding is the universal enabler for all 9 confirmed exploits.

---

## Score Card

| Metric | Value |
|--------|-------|
| Critical | **2** (both confirmed) |
| High | **8** (5 confirmed · 3 theoretical) |
| Medium | **5** (1 confirmed · 4 theoretical) |
| Low | **4** (1 confirmed · 3 theoretical) |
| **Total findings (post-dedup)** | **19** |
| Confirmed breaches (RED-ID) | **9** |
| Theoretical findings | **10** |
| Compliance pass rate | **13%** (2 of 15 controls) |
| Red-team objectives achieved | **2 of 4** (1 partial) |

---

## Grading

| Threshold | Requirement | Result |
|-----------|-------------|--------|
| F (auto) | Any confirmed breach of a critical objective | **TRIGGERED** — RED-002 (state machine bypass) + RED-004 (full enumeration) |
| D | ≤ 2 Critical | 2 Critical (met, but F overrides) |
| C | ≤ 1 Critical, ≤ 12 High, ≥ 60% compliance | 2 Critical, 13% compliance (fails) |
| B | 0 Critical, ≤ 6 High, ≥ 75% compliance | 2 Critical (fails) |
| A | 0 Critical, ≤ 2 High, ≥ 90% compliance | 2 Critical (fails) |

---

## Consolidated Findings

> Findings are deduplicated across all four specialists. Source IDs map back to individual reports.

### Critical (2)

#### SEC-001 — Complete Absence of Authentication & Authorization
**Status:** Confirmed (Live Exploit) | **Sources:** SAST-001, COMP-001, PEN-001, RED-001  
**File:** `Source/Backend/src/app.ts:11-44` | **CWE:** 306, 862 | **SOC2:** CC6.1, CC6.2

Every API endpoint is accessible by any anonymous HTTP caller. No JWT, session, API-key, or IP-restriction exists at any layer. RED-001 confirmed: zero-header `GET /api/work-items` → HTTP 200; zero-header `POST /api/work-items` → HTTP 201. This is the universal root cause for all 9 confirmed exploits.

**Remediation (Priority 1):** Add authentication middleware (JWT bearer or API-key) before all `/api/*` routes in `app.ts`.

---

#### SEC-002 — Fast-Track Override Bypasses State Machine (Objective Achieved)
**Status:** Confirmed (Live Exploit) | **Sources:** SAST-002, PEN-002, RED-002  
**File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66-75` | **CWE:** 862, 20

`POST /api/work-items/:id/route` accepts `overrideRoute:"fast-track"` with no privilege gate. RED-002 confirmed: 3 unauthenticated HTTP calls moved item WI-002 from `backlog` to `in-progress` with `assessments:[]`. Red-team objective **ACHIEVED**: *"Bypass work item state machine to reach an invalid status."*

**Remediation (Priority 2):** Remove `overrideRoute` from the public API. Gate any internal fast-track behind an admin role.

---

### High (8)

#### SEC-003 — Direct /approve Bypasses Assessment Pod
**Status:** Confirmed | **Sources:** PEN-003, RED-003 | **CWE:** 862

`POST /api/work-items/:id/approve` moves Proposed to Approved with empty `assessments[]`, no assessment-pod entries in changeHistory. Agent shows as `"manual-override"`.

**Remediation (Priority 3):** Require `assessments.length >= 4` before allowing approval.

---

#### SEC-004 — Unlimited Pagination — Full Dataset Enumeration (Objective Achieved)
**Status:** Confirmed | **Sources:** SAST-005, PEN-004, RED-004 | **CWE:** 20, 770

`?limit=9999999` returns all items in one response (`data.length == total`). `limit=-1` returns N-1 items. Red-team objective **ACHIEVED**: *"Enumerate all work items without pagination limit enforcement."*

**Remediation (Priority 4):** `const limit = Math.min(Math.max(1, parseInt(raw) || 20), 100);` Return 400 for non-positive values.

---

#### SEC-005 — Cascade Auto-Dispatch Hijack via Reject
**Status:** Confirmed | **Sources:** PEN-006, RED-006 | **CWE:** 862

`POST /reject` triggers `onItemResolved()` which auto-dispatches all Approved dependents to `in-progress` without going through `/dispatch`. Prometheus confirmed: `dispatch_gating_events_total{event="cascade_dispatched"} 2`.

**Remediation (Priority 6):** Remove auto-dispatch from `onItemResolved`. It must only remove blocker links.

---

#### SEC-006 — Intake Webhooks — No Auth, No Signature, Enum Injection
**Status:** Confirmed | **Sources:** SAST-003, SAST-004, COMP-005, PEN-005, RED-007 | **CWE:** 290, 346, 20 | **SOC2:** CC8.1

No HMAC check on Zendesk or automated intake. Items created with `type:"MALICIOUS_VALUE"` stored verbatim (HTTP 201). Prometheus confirmed: `workflow_items_created_total{source="zendesk",type="MALICIOUS_VALUE"} 1`.

**Remediation (Priority 7):** HMAC-SHA256 signature check via `ZENDESK_WEBHOOK_SECRET`. Add enum validation matching `workItems.ts`. Add API-key or IP allowlist to `/api/intake/*`.

---

#### SEC-007 — Ghost Blocker Permanent DoS via Soft-Delete
**Status:** Confirmed (Partial) | **Sources:** PEN-007, RED-005 | **CWE:** 841

`computeHasUnresolvedBlockers` treats `findById` returning `undefined` (soft-deleted) as unresolved. Dependent becomes permanently undispatchable. Error body exposes deleted item's UUID. Can be weaponized offensively.

**Remediation (Priority 5):** Treat `findById → undefined` as "blocker resolved." Cascade-remove dependency links on soft-delete.

---

#### SEC-008 — Missing HTTP Security Headers (No helmet)
**Status:** Theoretical | **Sources:** SAST-007, COMP-004 | **CWE:** 16, 1021 | **ASVS:** V14.4.1–V14.4.6

No `helmet`. Absent: CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy. `X-Powered-By: Express` still sent. Single fix unlocks 6 ASVS controls in ~5 minutes.

**Remediation (Priority 8):** `npm install helmet` + `app.use(helmet())` as first middleware.

---

#### SEC-009 — No Role-Based Access Control (RBAC)
**Status:** Theoretical | **Sources:** COMP-002 | **CWE:** 862 | **SOC2:** CC6.3 | **ASVS:** V4.1.1–V4.1.3

Once auth is added (SEC-001), there is still no RBAC layer. Any authenticated caller can approve/reject/dispatch/delete. `trackUpdates` hardcodes `'user'`, losing actor identity.

**Remediation (Priority 10):** Define roles. Apply route-level role guards. Emit `permission_denied` audit events.

---

#### SEC-010 — Required Compliance Audit Events Absent
**Status:** Theoretical | **Sources:** COMP-003 | **CWE:** 778 | **SOC2:** CC7.1 | **ASVS:** V7.1.2

All 4 `required_audit_events` are missing: `login_attempt`, `permission_denied`, `state_transition`, `data_export`.

**Remediation (Priority 11):** Create `auditLogger` module with structured events. Wire `state_transition` into all workflow state changes. Ship to immutable sink.

---

### Medium (5)

| ID | Title | Status | Sources | Priority |
|----|-------|--------|---------|----------|
| SEC-011 | Prometheus /metrics unauthenticated — full op-intel confirmed exposed | Confirmed | SAST-006, COMP-006, PEN-008, RED-008 | 9 |
| SEC-012 | No rate limiting — flooding + memory exhaustion risk | Theoretical | SAST-008, COMP-007, PEN-009 | 12 |
| SEC-013 | No CORS allowlist policy | Theoretical | COMP-008 | 13 |
| SEC-014 | TLS/HTTPS not enforced at application layer | Theoretical | COMP-010 | 14 |
| SEC-015 | No encryption-at-rest plan for future persistence layer | Theoretical | COMP-011 | 17 |

---

### Low (4)

| ID | Title | Status | Sources | Priority |
|----|-------|--------|---------|----------|
| SEC-016 | Internal error messages exposed to HTTP clients (confirmed) | Confirmed | SAST-009, COMP-009, PEN-010, RED-009 | 15 |
| SEC-017 | DebugPortalPage iframe lacks sandbox attribute | Theoretical | SAST-010 | 16 |
| SEC-018 | No GDPR hard-delete / right to erasure endpoint | Theoretical | COMP-012 | 18 |
| SEC-019 | Stack traces logged at ERROR level — filesystem path leakage | Theoretical | COMP-013 | 19 |

---

## Compliance Matrix

| Control | Framework | Status | Finding |
|---------|-----------|--------|---------|
| V4.1.1 | OWASP-ASVS L2 | FAIL | SEC-001, SEC-009 |
| V4.1.2 | OWASP-ASVS L2 | FAIL | SEC-009 |
| V4.1.3 | OWASP-ASVS L2 | FAIL | SEC-009 |
| V2.1.x | OWASP-ASVS L2 | FAIL | SEC-001 |
| V3.7.1 | OWASP-ASVS L2 | FAIL | SEC-001 |
| V7.1.2 | OWASP-ASVS L2 | FAIL | SEC-010 |
| V7.4.1 | OWASP-ASVS L2 | PASS | Global errorHandler returns generic 500 |
| V8.3.4 | OWASP-ASVS L2 | FAIL | SEC-006 |
| V9.1.1 | OWASP-ASVS L2 | FAIL | SEC-014 |
| V6.2.1 | OWASP-ASVS L2 | N/A¹ | SEC-015 |
| V14.4.1 | OWASP-ASVS L2 | FAIL | SEC-008 |
| V14.4.2 | OWASP-ASVS L2 | PASS | Express json() sets Content-Type automatically |
| V14.5.3 | OWASP-ASVS L2 | FAIL | SEC-013 |
| V4.2.1 | OWASP-ASVS L2 | FAIL | SEC-012 |
| CC6.1 | SOC2-Type2 | FAIL | SEC-001, SEC-011 |
| CC6.2 | SOC2-Type2 | FAIL | SEC-001 |
| CC6.3 | SOC2-Type2 | FAIL | SEC-009 |
| CC7.1 | SOC2-Type2 | PARTIAL | Prometheus metrics pass; security event logs absent (SEC-010) |
| CC8.1 | SOC2-Type2 | PARTIAL | changeHistory pass; webhook integrity absent (SEC-006) |

**Summary: 2 PASS · 2 PARTIAL · 11 FAIL · 1 N/A → 13% pass rate**

> ¹ N/A today (in-memory store, no disk) but must be addressed before any persistence layer is added.

---

## Red Team Summary

**Environment:** Ephemeral (docker-compose.test.yml + local tsx, port 3002)  
**All chains executed without authentication headers.**

| Objective | Result | Chain |
|-----------|--------|-------|
| Bypass work item state machine | **ACHIEVED** | RED-002: backlog to in-progress, 3 calls, 0 assessments |
| Enumerate all work items without pagination enforcement | **ACHIEVED** | RED-004: `limit=9999999` dumps full store |
| Submit malformed assessment verdict bypassing routing | Not achieved via `/assess` (pod ignores body) | RED-003 achieves equivalent via `/approve` |
| Access/modify soft-deleted item via direct ID | Partial — 404 on direct access | RED-005: ghost blocker DoS exploits orphaned link |

| Metric | Value |
|--------|-------|
| Chains attempted | 6 |
| Confirmed breaches | 9 |
| Objectives achieved | 2 of 4 (1 partial) |
| Authentication required for any exploit | No |

---

## Priority Remediation Path

| Priority | Action | Unlocks |
|----------|--------|---------|
| 1 | Add authentication middleware (JWT/API-key) before all `/api/*` routes | Root fix — all other mitigations moot without this |
| 2 | Remove `overrideRoute` from the public API | Closes state machine bypass objective |
| 3 | Gate `/approve` behind `assessments.length >= 4` | Closes assessment pod bypass |
| 4 | Cap pagination at MAX_PAGE_SIZE = 100 | Closes enumeration objective |
| 5 | Fix `computeHasUnresolvedBlockers` — treat soft-deleted blocker as resolved | Closes ghost blocker DoS |
| 6 | Remove auto-dispatch from `onItemResolved` | Closes cascade hijack |
| 7 | Add HMAC signature verification + enum validation to intake webhooks | Closes intake injection; CC8.1 |
| 8 | `app.use(helmet())` — ~5 minute fix | Unlocks 6 ASVS L2 controls |
| 9 | Protect `/metrics` with IP allowlist or bearer token | Closes recon enablement |
| 10 | Implement RBAC middleware (requires priority 1 first) | CC6.3, V4.1.x |
| 11 | Create dedicated `auditLogger` + wire `state_transition` events | CC7.1, V7.1.2 |
| 12 | Add `express-rate-limit` (100 req/min global) | V4.2.1 |
| 13 | Add `cors()` with explicit allowlist | V14.5.3 |
| 14 | Document TLS boundary; set `VITE_API_BASE_URL` to `https://` in production | V9.1.1 |
| 15 | Standardize catch blocks to return generic 500 messages | Closes error disclosure |
| 16 | Add `sandbox` to DebugPortalPage iframe | CWE-693 |
| 17 | Plan encryption-at-rest before persistence layer | V6.2.1 prerequisite |
| 18 | Implement `POST /api/work-items/:id/purge` (admin only) | GDPR Art. 17 |
| 19 | Restrict `err.stack` to DEBUG log level | V7.1.2 |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Full HTML Report | `Teams/TheGuardians/findings/security-report-2026-07-06-F.html` |
| Security Backlog (JSON) | `Teams/TheGuardians/findings/security-backlog-2026-07-06.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |
| This Report | `guardians-report.md` |

---

*TheGuardians · run-20260706-073451 · 2026-07-06*  
*Specialists: static-analyzer · pen-tester · red-teamer · compliance-auditor · team-leader (synthesis)*
