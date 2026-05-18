# TheGuardians Security & Compliance Report
**Grade: F** | **Date:** 2026-05-18 | **Run:** `run-20260518-072258`

> ⛔ **CONFIRMED BREACH — Operator decision required before any merge or deployment.**
> All 4 red-team objectives were achieved. Grade F is automatic per the grading rubric.

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Grade** | **F** |
| Critical Findings | 3 (all confirmed live exploits) |
| High Findings | 8 (4 confirmed, 4 theoretical) |
| Medium Findings | 11 (3 confirmed, 8 theoretical) |
| Low Findings | 2 (all theoretical) |
| **Total Findings** | **24** |
| Confirmed Breaches | 9 |
| Theoretical Findings | 15 |
| Compliance Pass Rate | 28% (5/18 controls) |
| Red Team Objectives | 4 / 4 achieved |

**Risk Statement:** The application has zero authentication or authorization on every API endpoint, enabling any anonymous caller to bypass the entire state machine, inject arbitrary data into the workflow, enumerate the full dataset, and cause permanent denial-of-service conditions. This application **must not be exposed to any non-isolated network** in its current state.

**Top 3 Risks:**
1. **No Authentication (Critical, Confirmed)** — Every endpoint is reachable by any anonymous HTTP client. Root cause of all other exploits.
2. **State Machine Bypass via Fast-Track Override (Critical, Confirmed)** — Any caller can promote any work item directly from `backlog` to `approved` in one unauthenticated request, bypassing the entire assessment pod.
3. **Intake Webhook Enum Injection (Critical, Confirmed)** — Zendesk and automated intake endpoints accept arbitrary strings for `type`/`priority` with no enum validation or HMAC signature verification, corrupting routing logic and Prometheus telemetry.

---

## Grading

Per `security.config.yml` grading rubric:
- **Grade F** (automatic) — confirmed red-team breach of a critical objective.
- The red team achieved **all 4 objectives** against a live ephemeral environment.
- Even without confirmed breaches, the metrics would yield Grade D or worse: 3 Critical, 8 High, compliance pass rate 28% (threshold for D: ≤ 2 Critical; none of the higher grades were reachable).

---

## Consolidated Findings

### 🔴 CRITICAL — 3 Findings (All Confirmed)

---

#### MERGED-001: Full API Requires Zero Authentication
**IDs:** PEN-001 · RED-001 · COMP-001  
**Severity:** Critical | **Status:** Confirmed (Live Exploit)  
**Specialists:** pen-tester, red-teamer, compliance-auditor  
**File:** `Source/Backend/src/app.ts` (all routes)  
**CWE:** CWE-306 | **Controls:** SOC2 CC6.1, CC6.2; OWASP-ASVS V2.1.1, V4.2.1

`app.ts` mounts all routers with no authentication middleware. No JWT checks, no session guards, no API key validation, no RBAC anywhere in the codebase. Red team confirmed: `POST /api/work-items` with no `Authorization` header → HTTP 201; `GET /metrics` → HTTP 200. Every endpoint is accessible to any anonymous client.

**Remediation:** Add JWT or API-key authentication middleware in `app.ts` applied before all route groups. Use `express-jwt` or `passport-jwt`. Protect `/metrics` with a bearer token or separate internal port.

---

#### MERGED-002: Fast-Track Override Bypasses Entire State Machine
**IDs:** PEN-002 · RED-002  
**Severity:** Critical | **Status:** Confirmed (Live Exploit)  
**Specialists:** pen-tester, red-teamer  
**File:** `Source/Backend/src/routes/workflow.ts:39-64`, `Source/Backend/src/services/router.ts:66-88`  
**CWE:** CWE-284

`POST /api/work-items/:id/route` accepts `overrideRoute: "fast-track"` with no role check. The code in `router.ts:66-88` returns `targetStatus = WorkItemStatus.Approved` unconditionally.

**Live Exploit Chain (RED-002):**
```
POST /api/work-items               → {id: "8d570e8f...", status: "backlog"} (feature type)
POST /api/work-items/{id}/route    {"overrideRoute":"fast-track"}
                                   → status: "approved" (skips proposed/reviewing/assessment)
POST /api/work-items/{id}/dispatch → status: "in-progress", assignedTeam: "TheATeam"
# Feature-type item reached in-progress in 3 unauthenticated requests
```

**Remediation:** Remove `overrideRoute` from the public API, or gate it behind a server-side role check (`role: "admin"`) in route middleware before `classifyRoute()` is called.

---

#### MERGED-003: Intake Webhook Enum Injection & No Signature Verification
**IDs:** PEN-003 · RED-003 · COMP-013  
**Severity:** Critical | **Status:** Confirmed (Live Exploit)  
**Specialists:** pen-tester, red-teamer, compliance-auditor  
**File:** `Source/Backend/src/routes/intake.ts:11-55`  
**CWE:** CWE-20, CWE-345 | **Controls:** SOC2 CC8.1; OWASP-ASVS V13.2.6

Both intake endpoints lack HMAC signature verification and pass `type`/`priority` fields directly to `store.createWorkItem()` without enum validation. Red team confirmed: `type: "ADMIN_OVERRIDE"` persisted, injected values appeared as Prometheus metric labels (`workflow_items_created_total{source="zendesk",type="ADMIN_OVERRIDE"} 1`).

**Remediation:** Apply `Object.values(WorkItemType).includes(body.type)` enum validation to both intake endpoints. Add HMAC-SHA256 signature verification using `process.env.ZENDESK_WEBHOOK_SECRET`. Reject unsigned requests with 401.

---

### 🟠 HIGH — 8 Findings (4 Confirmed, 4 Theoretical)

---

#### MERGED-004: Cascade Dispatch via Unauthenticated Blocker Rejection *(Confirmed)*
**IDs:** PEN-004 · RED-004  
**File:** `Source/Backend/src/routes/workflow.ts:144-208`, `src/services/dependency.ts:251-315`

When a blocker item is rejected, `onItemResolved()` automatically dispatches dependent items in `Approved` status. Because all endpoints are unauthenticated, an attacker can: create blocker B, create target A depending on B, fast-track A to approved, route B to proposed, reject B → A auto-dispatches to a team with no human authorization.

**Remediation:** `onItemResolved()` should require explicit re-approval or emit a high-severity audit event. The reject endpoint must be protected by authentication (see MERGED-001).

---

#### MERGED-005: Unbounded Pagination — Full Dataset Enumeration *(Confirmed)*
**IDs:** PEN-005 · RED-006 · COMP-007  
**File:** `Source/Backend/src/routes/workItems.ts:68-75`, `routes/dashboard.ts:17-18`

`GET /api/work-items?limit=999999999` returned all 19 items in one response. `limit=-1` returns all-except-last via JavaScript `slice(0,-1)`. Same flaw in `GET /api/dashboard/activity` (66 entries returned). Red team achieved the pagination enumeration objective in a single unauthenticated request.

**Remediation:** `const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);` in both routes.

---

#### MERGED-006: Soft-Deleted Blocker Causes Permanent Dispatch DoS *(Confirmed)*
**IDs:** PEN-006 · RED-005  
**File:** `Source/Backend/src/services/dependency.ts:64-75`, `store/workItemStore.ts:23-26`

`findById()` returns `undefined` for soft-deleted items. `computeHasUnresolvedBlockers()` treats `undefined` as unresolved. Dependency links are not cleaned up on deletion. Red team confirmed WI-013 permanently returns HTTP 400 on `POST /dispatch` after WI-014 was soft-deleted — no automated resolution.

**Remediation:** On soft-delete, cascade-remove stale dependency links. Alternatively, treat `findById() === undefined` as resolved in `computeHasUnresolvedBlockers()`.

---

#### MERGED-007: Prometheus /metrics Unauthenticated Information Disclosure *(Confirmed)*
**IDs:** PEN-007 · RED-009 · COMP-009  
**File:** `Source/Backend/src/app.ts:34-37`, `src/metrics.ts`

`GET /metrics` requires no auth and exposes workflow throughput counters, Node.js runtime metrics (heap, CPU, GC), and — after RED-003 — injected enum label values confirming successful injection. Red team confirmed full Prometheus text format returned with zero credentials.

**Remediation:** Bind `/metrics` to an internal-only port (e.g., 9090) on `127.0.0.1`, or add a static bearer-token check via environment variable.

---

#### MERGED-008: No Role-Based Access Control (RBAC) *(Theoretical)*
**IDs:** COMP-002 | **Controls:** SOC2 CC6.3; OWASP-ASVS V4.1.1, V4.2.1

Even after authentication is added, there are zero role or permission checks. Any authenticated user would be able to perform every action including sensitive transitions (`/approve`, `/reject`, `/dispatch`).

**Remediation:** Define roles (`operator`, `reviewer`, `admin`) in JWT claims. Add `authorize(role)` middleware to each route group. Apply least-privilege.

---

#### MERGED-009: No HTTP Security Headers — Missing Helmet *(Theoretical)*
**IDs:** COMP-003 | **Controls:** OWASP-ASVS V14.4.1, V14.4.2, V14.4.3

No `helmet` or security-header middleware in `package.json` or `app.ts`. No `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, or `Content-Security-Policy` headers.

**Remediation:** `npm install helmet`; `app.use(helmet())` as the first middleware in `app.ts`. One line, immediate win.

---

#### MERGED-010: No Rate Limiting on Any Endpoint *(Theoretical)*
**IDs:** COMP-005 | **Controls:** OWASP-ASVS V2.2.1, SOC2 CC6.1

Unlimited requests per second accepted on all endpoints, enabling DoS via write amplification and credential-stuffing once auth is added.

**Remediation:** `npm install express-rate-limit`; global limiter (100 req/min per IP); stricter limiter on intake routes (10 req/min per IP).

---

#### MERGED-011: Missing Required Audit Log Events *(Theoretical)*
**IDs:** COMP-006 | **Controls:** SOC2 CC7.1, OWASP-ASVS V7.2.2

Of four required audit events: `login_attempt` (absent), `permission_denied` (absent), `state_transition` (partial — changeHistory only), `data_export` (absent).

**Remediation:** Create `audit.ts` module emitting structured JSON lines with `event`, `actorId`, `resourceId`, `outcome`, `timestamp`. Call from every state-transition, list endpoint, auth handler, and access-denied path.

---

### 🟡 MEDIUM — 11 Findings (3 Confirmed, 8 Theoretical)

| ID | Title | Status |
|----|-------|--------|
| MERGED-012 (PEN-008, RED-007) | Assessment Pod Hard-Rejects Items Needing Clarification | Confirmed |
| MERGED-013 (PEN-012, RED-008) | Stored Unsanitized Payloads in Audit Change History | Confirmed |
| MERGED-014 (PEN-009, RED-010) | Body Parser Returns 500 Instead of 413 on Oversized Payload | Confirmed |
| MERGED-015 (PEN-010, COMP-004) | No CORS Policy Configured | Theoretical |
| MERGED-016 (COMP-010) | No TLS / HTTPS Enforcement | Theoretical |
| MERGED-017 (COMP-011) | No Hard-Delete / GDPR Right to Erasure | Theoretical |
| MERGED-018 (PEN-011) | Sequential Predictable DocIDs — Enumeration Oracle | Theoretical |
| SAST-001 | Dockerfile Runs as Root (portal/Dockerfile) | Theoretical |
| SAST-002 | Vite Dev Server Binds to 0.0.0.0 in Docker | Theoretical |
| SAST-003 | iframe Missing sandbox Attribute (DebugPortalPage) | Theoretical |
| SAST-004 | Raw Exception Messages Returned to Clients in Workflow Routes | Theoretical |

---

### ⚪ LOW — 2 Findings (All Theoretical)

| ID | Title | Status |
|----|-------|--------|
| MERGED-019 (COMP-012) | Stack Traces Logged at Server Level (Production Risk) | Theoretical |
| MERGED-020 (PEN-013) | Unimplemented /api/search — Future Attack Surface | Theoretical |

---

## Compliance Matrix

### SOC2-Type2

| Control | Description | Status | Finding(s) |
|---------|-------------|--------|------------|
| CC6.1 | Restrict logical access to authorized users | ❌ FAIL | COMP-001, COMP-005 |
| CC6.2 | System credentials issued and managed securely | ❌ FAIL | COMP-001 |
| CC6.3 | Role-based access; permissions removed when no longer needed | ❌ FAIL | COMP-002 |
| CC7.1 | Detect and monitor threats; monitoring and alerting | ⚠️ PARTIAL | COMP-006, COMP-009 |
| CC8.1 | Changes authorised and managed | ⚠️ PARTIAL | COMP-013 |

### OWASP-ASVS L2

| Control | Description | Status | Finding(s) |
|---------|-------------|--------|------------|
| V2.1.1 | Passwords ≥ 12 chars enforced | ❌ N/A | COMP-001 |
| V2.2.1 | Anti-automation / rate limiting | ❌ FAIL | COMP-005 |
| V2.2.2 | Sessions invalidated after logout | ❌ N/A | COMP-001 |
| V4.1.1 | Least privilege applied to all roles | ❌ FAIL | COMP-002 |
| V4.2.1 | Access control enforced server-side | ❌ FAIL | COMP-002 |
| V5.1.3 | Input length validation | ❌ FAIL | COMP-007, COMP-008 |
| V6.2.1 | No custom cryptographic algorithms | ✅ PASS | — |
| V7.1.1 | No passwords/credentials in logs | ✅ PASS | — |
| V7.1.2 | No sensitive PII in logs at excessive level | ✅ PASS | — |
| V7.2.2 | Authentication events logged | ❌ FAIL | COMP-006 |
| V9.1.1 | TLS used for all client connections | ❌ FAIL | COMP-010 |
| V13.2.6 | Origin verification / CSRF protection | ❌ FAIL | COMP-013 |
| V14.4.1 | HTTP security headers present | ❌ FAIL | COMP-003 |
| V14.4.6 | CORS policy restricted to allowed origins | ❌ FAIL | COMP-004 |
| V14.5.3 | HTTP methods restricted per resource | ✅ PASS | — |

**Overall:** 5 Pass · 2 Partial · 11 Fail · **28% pass rate**

---

## Red Team Summary

**Environment:** Ephemeral (Source/Backend started on port 3002 via `tsx`)  
**Objectives:** 4 / 4 achieved

| Objective | Exploit Chain | Result |
|-----------|---------------|--------|
| Bypass work item state machine to reach an invalid status | RED-002: fast-track override `backlog → approved → in-progress` | ✅ ACHIEVED |
| Access or modify a soft-deleted work item via direct ID reference | RED-005: DELETE blocker → victim permanently blocked from dispatch | ✅ ACHIEVED |
| Submit a malformed assessment verdict that bypasses routing logic | RED-003: enum injection via intake · RED-007: NeedsClarification → Rejected | ✅ ACHIEVED |
| Enumerate all work items without pagination limit enforcement | RED-006: `?limit=999999999` → all 19 items in one response | ✅ ACHIEVED |

| Metric | Value |
|--------|-------|
| Exploit chains attempted | 10 |
| Confirmed breaches | 9 |
| New findings (beyond pen-tester scope) | 1 (RED-010: 500 vs 413) |
| Attempted — no breach | 1 (PEN-013: /api/search not yet implemented) |

---

## Positive Observations

The following controls are correctly implemented and should be preserved in remediation:

1. **Structured JSON logging** — `utils/logger.ts` uses `pino`; `console.log` absent from all production code.
2. **Per-operation changeHistory tracking** — every state transition records agent, timestamp, old/new values, reason.
3. **Prometheus domain metrics** — creation, routing, assessment, and dispatch operations are metered.
4. **No hardcoded secrets** — no credentials, API keys, or tokens anywhere in `Source/`.
5. **Soft-delete preserving audit trail** — work items are not physically destroyed on delete.
6. **Error handler response hygiene** — central `errorHandler.ts` never sends stack traces or raw `err.message` to clients.
7. **Enum validation on main creation endpoint** — `POST /api/work-items` validates `type`, `priority`, `source`, `complexity` against allowlists.
8. **HTTP method restriction** — router defines specific verbs per endpoint (V14.5.3 ✅).

---

## Remediation Priority Order

| Priority | Finding | Effort | Controls Unblocked |
|----------|---------|--------|-------------------|
| P1 | MERGED-001: Add Authentication (JWT) | Medium | CC6.1, CC6.2, V2.1.1, V4.2.1 |
| P2 | MERGED-002: Remove/gate overrideRoute | Low | State machine integrity |
| P3 | MERGED-003: Intake enum validation + HMAC | Low | CC8.1, V13.2.6 |
| P4 | MERGED-008: Add RBAC | Medium | CC6.3, V4.1.1 |
| P5 | MERGED-009 / MERGED-010 / MERGED-015: Helmet + Rate-limit + CORS | Low (1 day) | V14.4.1, V2.2.1, V14.4.6 |
| P6 | MERGED-011: Implement audit.ts | Medium | CC7.1, V7.2.2 |
| P7 | MERGED-005: Fix pagination bounds | Low | V5.1.3 |
| P8 | MERGED-007: Protect /metrics | Low | CC7.1 |
| P9 | MERGED-006: Fix stale blocker links | Low | Reliability |
| P10 | MERGED-004: Gate cascade dispatch | Medium | Access control |

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-05-18-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-05-18.json` |
| This Report | `Teams/TheGuardians/findings/guardians-report.md` |
| Attack Surface Map + Red Team Results | `Teams/TheGuardians/artifacts/attack-surface-map.md` |
| Compliance Audit Detail | `Teams/TheGuardians/findings/compliance-audit-2026-05-18.md` |

---

*TheGuardians · Run `run-20260518-072258` · 2026-05-18*  
*Specialists: static-analyzer · compliance-auditor · pen-tester · red-teamer · team-leader (synthesis)*
