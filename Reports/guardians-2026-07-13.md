# TheGuardians — Security & Compliance Report
**Date:** 2026-07-13 | **Run:** `run-20260713-064217` | **Grade: F**

---

## ⛔ Grade F — Automatic: Confirmed Live Breach of Critical Objectives

Two high-value red team objectives were fully achieved against a live application instance. Nine of ten exploit chains were confirmed. **Do not merge. Operator decision required.**

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 Critical (Confirmed Live) | 2 |
| 🟠 High | 4 (3 confirmed, 1 theoretical) |
| 🟡 Medium | 6 (5 confirmed/partial, 1 theoretical) |
| 🟢 Low | 2 (1 confirmed, 1 theoretical) |
| **Total Findings** | **14** |
| Confirmed Breaches (RED-IDs) | 9 of 10 chains |
| Compliance Pass Rate | **23%** (3 pass · 4 partial · 16 fail of 23 controls) |

---

## Grade Rationale

| Criterion | Result |
|-----------|--------|
| Critical findings | 2 (both confirmed live) |
| High findings | 4 |
| Compliance pass rate | 23% |
| Red-team objective breaches | 3 of 4 (+ 1 partial) |
| **Automatic F trigger** | Confirmed breach of critical objectives (RED-001 + RED-005) |

The grading rubric specifies automatic **F** for any confirmed red-team breach of a critical objective. RED-001 ("state machine bypass — full workflow takeover") and RED-005 ("webhook spoofing + enum injection") both meet this threshold.

---

## Consolidated Findings

### 🔴 CRITICAL — Confirmed Live Exploit

#### CRIT-001: Full Workflow Takeover — Zero Auth + State Machine Bypass
**Source IDs:** SAST-01 · PEN-001 · PEN-003 · RED-001 · RED-010
**OWASP:** A01, A07 | **CWE:** CWE-306, CWE-862
**Objective Breached:** "Bypass work item state machine to reach an invalid status"

The Express application has zero authentication middleware. All 18 endpoints are publicly accessible. The `/route` endpoint passes `overrideRoute` to `routeWorkItem()` without privilege check or enum validation — any truthy string skips the 4-role assessment pod, promoting items directly to `approved`.

**Confirmed Evidence (RED-001):** WI-001 traversed `backlog → approved → in-progress` via 3 unauthenticated HTTP calls. `assessments=[]` proves no pod ran. Arbitrary string route field corruption also confirmed (RED-010).

**Remediation:**
1. Add JWT bearer verification middleware globally in `app.ts` before any route registration
2. Validate `overrideRoute` against `WorkItemRoute` enum — reject non-enum values with HTTP 422
3. Add RBAC: only `pod_lead` role may supply `overrideRoute`
4. Emit structured audit event for every `overrideRoute` usage

---

#### CRIT-002: Webhook Spoofing + Enum Injection via Unauthenticated Intake Endpoints
**Source IDs:** SAST-02 · SAST-03 · PEN-002 · RED-005
**OWASP:** A07, A08 | **CWE:** CWE-306, CWE-345, CWE-20
**Objective Breached:** "Submit a malformed assessment verdict that bypasses routing logic"

`POST /api/intake/zendesk` and `/api/intake/automated` perform no HMAC-SHA256 signature verification and do not validate `type`/`priority` enum fields before persisting.

**Confirmed Evidence (RED-005):** WI-012 created with `type="malicious_type"`, `priority="ultra-critical"`. WI-013 with `type="PWNED"`. Both surfaced in dashboard and created unbounded Prometheus label cardinality.

**Remediation:**
1. Verify `X-Zendesk-Webhook-Signature` header via HMAC-SHA256 before processing — reject with HTTP 401 on failure
2. Validate `type`/`priority` against enum values in both intake routes (mirror pattern from `workItems.ts:29-40`)

---

### 🟠 HIGH

#### HIGH-001: Mass Data Enumeration + Bulk IDOR Delete *(Confirmed)*
**Source IDs:** SAST-09 · PEN-004 · PEN-006 · RED-002

`GET /api/work-items?limit=999999` returns all items in one response. `DELETE /api/work-items/:id` requires no auth. Confirmed: 6/7 items deleted, full audit trail (35 records) exfiltrated.

**Fix:** `Math.min(limit, 100)` cap in `workItems.ts` and `dashboard.ts`; require authentication on DELETE.

#### HIGH-002: Cascade Auto-Dispatch via Blocker Rejection *(Confirmed)*
**Source IDs:** PEN-007 · RED-003

`DISPATCH_TRIGGER_STATUSES` includes `Rejected` — rejecting a blocker auto-dispatches its `Approved` dependents without human action. Confirmed live.

**Fix:** Remove `Rejected` from `DISPATCH_TRIGGER_STATUSES`; add `requires_reapproval` flag on dependents.

#### HIGH-003: Permanent Dispatch Freeze via Soft-Deleted Blocker *(Confirmed)*
**Source IDs:** PEN-008 · RED-004

`computeHasUnresolvedBlockers()` treats `findById()→undefined` as unresolved. Soft-deleting a blocker permanently freezes all dependents. Confirmed live.

**Fix:** `dependency.ts:64` — treat `undefined` (not found / soft-deleted) as resolved; auto-remove dead dependency links.

#### HIGH-004: Internal Error Messages Leaked to HTTP Clients *(Theoretical)*
**Source IDs:** SAST-04

All seven workflow action endpoints send raw `err.message` to clients on 500s — exposes internal store state and dependency graph details. (7 catch blocks in `workflow.ts`.)

**Fix:** Return generic `"Internal server error"` to clients; log full details server-side only.

---

### 🟡 MEDIUM

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| MED-001 | NaN/Invalid Pagination Parameters | Confirmed Partial | Clamp and validate: `isNaN(n) \|\| n<1 ? default : Math.min(n,100)` |
| MED-002 | Prometheus /metrics Exposed Without Auth | Confirmed | IP allowlist or bearer token; `app.disable('x-powered-by')` |
| MED-003 | NeedsClarification Verdict → Rejected | Confirmed | Add `WorkItemStatus.NeedsClarification`; fix `runAssessmentPod()` ternary |
| MED-004 | No CORS Policy | Confirmed | `npm install cors`; restrict to `http://localhost:5173` |
| MED-005 | Missing HTTP Security Headers | Confirmed | `npm install helmet`; `app.use(helmet())` first middleware |
| MED-006 | No Rate Limiting | Theoretical | `express-rate-limit`: 60 req/min global, 10 req/min on `/api/intake` |

---

### 🟢 LOW

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| LOW-001 | Missing `/api/search` + Express Disclosure | Confirmed | Implement route; add JSON 404 handler; `app.disable('x-powered-by')` |
| LOW-002 | No Input Length Caps | Theoretical | `title.length > 500 → 400`, `description.length > 10000 → 400` |

---

## Compliance Matrix Summary

**Frameworks:** OWASP-ASVS L2 (authentication · access-control · data-protection) + SOC2-Type2 (CC6.1–CC8.1)
**Pass Rate: 23%** — 3 pass · 4 partial · 16 fail of 23 controls

| Control | Framework | Status |
|---------|-----------|--------|
| V2.1 Authentication exists | OWASP-ASVS L2 | FAIL |
| V3.1 Session management | OWASP-ASVS L2 | FAIL |
| V3.3 Session timeout | OWASP-ASVS L2 | FAIL |
| V4.1.1 Access control on all routes | OWASP-ASVS L2 | FAIL |
| V4.1.2 Server-side enforcement | OWASP-ASVS L2 | FAIL |
| V4.1.3 Least privilege | OWASP-ASVS L2 | FAIL |
| V5.1.3 Input validation | OWASP-ASVS L2 | PARTIAL |
| V6.3.1 No hardcoded secrets | OWASP-ASVS L2 | PASS |
| V7.1.1 Structured logging | OWASP-ASVS L2 | PASS |
| V7.2.1 Required events logged | OWASP-ASVS L2 | PARTIAL |
| V7.4.1 No sensitive data in logs | OWASP-ASVS L2 | PASS |
| V8.1.1 Data protected at rest | OWASP-ASVS L2 | FAIL |
| V9.1.1 Webhook signature verification | OWASP-ASVS L2 | FAIL |
| V14.4.1 HTTP security headers | OWASP-ASVS L2 | FAIL |
| V14.4.5 CORS policy | OWASP-ASVS L2 | FAIL |
| V14.5.1 Rate limiting | OWASP-ASVS L2 | FAIL |
| V14.6.1 No internal errors to clients | OWASP-ASVS L2 | PARTIAL |
| CC6.1 Logical access / auth | SOC2-Type2 | FAIL |
| CC6.2 Access provisioning | SOC2-Type2 | FAIL |
| CC6.3 Role-based access control | SOC2-Type2 | FAIL |
| CC7.1 Monitoring | SOC2-Type2 | PARTIAL |
| CC7.2 Audit logging | SOC2-Type2 | FAIL |
| CC8.1 Change management | SOC2-Type2 | PARTIAL |

**Root causes driving most failures:**
1. No authentication — cascades into CC6.1, CC6.2, V2.1, V4.x, V3.3
2. No security headers — `npm install helmet cors` + 2 lines in `app.ts` resolves V14.4, V14.5, CORS gap
3. Audit event gap — `login_attempt`, `permission_denied`, `data_export` cannot exist without auth/authz

---

## Red Team Summary

| Metric | Value |
|--------|-------|
| Environment | Ephemeral — Source/Backend on :3002 |
| Chains attempted | 10 |
| Chains confirmed | 9 |
| Objectives achieved | 3 of 4 (+ 1 partial) |
| Critical breaches | 2 (RED-001, RED-005) |
| Automatic Grade F | Yes |

| Objective | Result |
|-----------|--------|
| Bypass work item state machine | Achieved — RED-001 |
| Enumerate all items without pagination limit | Achieved — RED-002 |
| Submit malformed assessment verdict | Achieved — RED-005 |
| Access/modify soft-deleted item via direct ID | Partial — RED-004 |

---

## Remediation Priority

| # | Fix | Closes | Effort |
|---|-----|--------|--------|
| 1 | JWT middleware globally in `app.ts` | CRIT-001, HIGH-001–003 vectors | 1–2 days |
| 2 | HMAC webhook verification + enum validation in intake routes | CRIT-002 | < 1 day |
| 3 | Remove `Rejected` from dispatch triggers; fix `undefined` blocker handling | HIGH-002, HIGH-003 | < 1 day |
| 4 | `npm install helmet cors`; `app.disable('x-powered-by')` | MED-004, MED-005, LOW-001 | < 2 hours |
| 5 | Pagination cap `Math.min(limit,100)` + NaN guards | HIGH-001 pagination, MED-001 | < 1 hour |
| 6 | Restrict `/metrics` to internal network | MED-002 | < 2 hours |
| 7 | Sanitize 500 messages in `workflow.ts` catch blocks | HIGH-004 | < 1 hour |
| 8 | Add `WorkItemStatus.NeedsClarification`; fix `runAssessmentPod()` | MED-003 | 1 day |
| 9 | `express-rate-limit` global + intake-specific limits | MED-006 | < 2 hours |
| 10 | Input length caps; implement `/api/search`; JSON 404 handler | LOW-001, LOW-002 | < 2 hours |

---

## Output Artifacts

| File | Description |
|------|-------------|
| `Teams/TheGuardians/findings/security-report-2026-07-13-F.html` | Full HTML report with compliance matrix and all finding details |
| `Teams/TheGuardians/findings/security-backlog-2026-07-13.json` | Machine-readable finding backlog for TheFixer |
| `Teams/TheGuardians/artifacts/attack-surface-map.md` | Pen-tester attack surface map with red team results appended |

---

*Posted by TheGuardians · `run-20260713-064217` · 2026-07-13*
*Specialists: static-analyzer · pen-tester · red-teamer · compliance-auditor*
