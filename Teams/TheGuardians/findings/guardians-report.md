# TheGuardians — Security & Compliance Report
**Date:** 2026-06-01 · **Run:** run-20260601-085628 · **Grade: F**

---

## Executive Summary

> **Grade F — Automatic.** All four red-team critical objectives were achieved via confirmed live exploits.

The dev-crew application has **zero authentication or authorisation** across every API endpoint. An unauthenticated attacker can create a feature request, override all AI quality-gate votes, and inject attacker-controlled CI/CD dispatch records in **four HTTP calls with no credentials**. Stored XSS payloads were confirmed server-side. The compliance pass rate is **14 %** (2/15 controls).

| Metric | Value |
|---|---|
| Grade | **F** |
| Critical findings | 4 |
| High findings | 3 |
| Medium findings | 10 |
| Low findings | 4 |
| Confirmed breaches | 7 |
| Theoretical findings | 14 |
| Compliance pass rate | 14 % (2/15) |
| Red-team objectives achieved | 4 / 4 |

### Top 3 Risks

1. **Complete authentication absence** — every endpoint open to any anonymous caller; full data access and pipeline manipulation with no credentials.
2. **Force-approve bypass + dispatch injection** — AI voting overridden and attacker-controlled CI/CD dispatch records stored in a single unauthenticated session.
3. **Stored XSS** — HTML/script payloads stored verbatim; execution confirmed on browser render if not escaped.

---

## Process Finding: Scope Mismatch ⚠

The pen-tester analysed `Source/Backend/` (work-items state machine) while the test environment (`docker-compose.test.yml`) runs `portal/Backend/` (feature-requests, bugs, cycles, pipeline-runs). All 13 PEN-IDs reference routes that return **HTTP 404** in the live environment. The red-teamer correctly pivoted and found equivalent (and more severe) vulnerabilities in the portal application. **This must be resolved before the next run** — align pen-tester scope with the live target.

---

## Consolidated Findings

### Critical (4 — all Confirmed Live Exploits)

| ID | Title | Sources | OWASP |
|----|-------|---------|-------|
| C-001 | No Authentication on Any Endpoint | PEN-001, RED-001, COMP-001 | A07 |
| C-002 | No Authorization/RBAC — Any Caller Can Perform Any Action | PEN-002, RED-005, COMP-002 | A01 |
| C-003 | Assessment / State-Machine Gate Bypass via Force-Approve | PEN-004, PEN-005, RED-002 | A01 |
| C-004 | Unauthenticated Supply-Chain Injection via Team Dispatch | PEN-003, RED-003 | A08 |

#### C-001: No Authentication on Any Endpoint
Zero authentication middleware in either `Source/Backend/src/app.ts` or `portal/Backend/`. All 8+ portal route families confirmed returning HTTP 200/201 with no Authorization header. Root prerequisite for all other critical findings.

**Remediation:** Mount JWT bearer-token middleware globally in `app.ts` before all route handlers. Exclude only `/health` and `/ready`.

---

#### C-002: No Authorization / RBAC
No RBAC or ABAC layer. The red-teamer modified and permanently deleted resource FR-0014 without credentials (IDOR confirmed). Privileged operations (approve, reject, dispatch) require no elevated permission.

**Remediation:** Define roles (viewer / operator / admin). Implement authorisation middleware. Add resource ownership checks on all PATCH/DELETE. Emit `permission_denied` audit events on every 403.

---

#### C-003: Assessment / State-Machine Gate Bypass via Force-Approve
`POST /api/feature-requests/:id/force-approve` overrides all AI voting results unconditionally. Red-teamer confirmed: 4-DENY / 1-approve vote → `/force-approve` → `status: "approved"`, all four deny votes discarded. In `Source/Backend/`, equivalent bypass is `overrideRoute: "fast-track"` on the `/route` endpoint.

**Remediation:** Guard `/force-approve` behind admin role. Log `force_approve` audit event. Gate `overrideRoute` in Source/Backend behind admin check.

---

#### C-004: Unauthenticated Supply-Chain Injection via Team Dispatch
`POST /api/team-dispatches` stores attacker-controlled `actions_url`, `workflow`, and `repo` with no validation. Red-teamer stored `actions_url: "http://attacker.com/red-team-payload"` and `workflow: "malicious-deploy.yml"` — confirmed HTTP 201. If orchestrator auto-triggers stored `actions_url`, this is confirmed SSRF / CI-pipeline hijack.

**Remediation:** Require auth + admin role. Validate `actions_url` against GitHub Actions domain allowlist. Validate `repo` against configured allowed repositories.

---

### High (3 findings)

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| H-001 | Stored XSS via Unescaped User-Controlled Fields | Confirmed | RED-006 |
| H-002 | Missing Required Audit Log Events (SOC2 CC7.1) | Theoretical | COMP-003 |
| H-003 | No TLS / HTTPS Enforcement | Theoretical | COMP-004 |

**H-001:** `<script>alert(document.cookie)</script>` and cookie-stealing `<img onerror>` payload stored verbatim in feature request title/description. Confirmed execution risk on frontend render.  
**Remediation:** Sanitize string inputs server-side on ingest with `sanitize-html`. Add CSP header as backstop.

**H-002:** `login_attempt`, `permission_denied`, `data_export` events entirely absent; `state_transition` only partially captured.  
**Remediation:** Create `auditLog()` wrapper. Emit `state_transition` on every status change. Wire remaining events once auth is added.

**H-003:** Backend listens on plain HTTP. Credentials will travel in plaintext once auth is added.  
**Remediation:** TLS termination at reverse proxy (nginx/Caddy). Add Helmet HSTS header.

---

### Medium (10 findings)

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| M-001 | Unbounded Pagination — Full Dataset Enumeration | Confirmed | PEN-006, RED-004 |
| M-002 | Pipeline Runs Expose Internal Agent Identities | Confirmed | RED-008 |
| M-003 | Cascade Auto-Dispatch on Blocker Rejection | Theoretical | PEN-007 |
| M-004 | Soft-Deleted Blocker Permanently Blocks Dependents | Theoretical | PEN-008 |
| M-005 | O(N²) DoS via Chained Dependency Flooding | Theoretical | PEN-009 |
| M-006 | Missing Security HTTP Headers | Theoretical | COMP-005 |
| M-007 | No Rate Limiting on Any Endpoint | Theoretical | COMP-006 |
| M-008 | No Hard-Delete / Right-to-Erasure (GDPR Art. 17) | Theoretical | COMP-009 |
| M-009 | No CORS Policy Configured | Theoretical | COMP-010 |
| M-010 | /api/search Endpoint Missing from Backend | Theoretical | PEN-010 |

---

### Low (4 findings)

| ID | Title | Status | Sources |
|----|-------|--------|---------|
| L-001 | Prometheus /metrics Publicly Accessible | Confirmed | PEN-011, RED-007, COMP-008 |
| L-002 | Internal Error Messages Forwarded to Client (CWE-209) | Theoretical | PEN-012, SAST-001 |
| L-003 | NaN / Negative Pagination — Silent Wrong Results | Theoretical | PEN-013 |
| L-004 | Sensitive Fields Not Yet in Data Model (Pre-emptive) | Informational | COMP-011 |

**L-001 note:** Prometheus metrics were used by the red-teamer to discover the undocumented `/force-approve` endpoint — this reconnaissance directly enabled C-003.

---

## Compliance Matrix

**Overall: 2 PASS / 1 PARTIAL / 12 FAIL = 14 % pass rate**

| Control | Framework | Description | Status | Finding |
|---------|-----------|-------------|--------|---------|
| V2.1 | OWASP-ASVS L2 | Authentication — verify users can authenticate | ❌ FAIL | C-001 |
| V2.2 | OWASP-ASVS L2 | General authenticator requirements | ❌ FAIL | C-001 |
| V4.1 | OWASP-ASVS L2 | Access Control — General RBAC | ❌ FAIL | C-002 |
| V4.2 | OWASP-ASVS L2 | Operation-level access control | ❌ FAIL | C-002 |
| V7.4 | OWASP-ASVS L2 | Error handling — no stack trace to client | ✅ PASS | — |
| V9.1 | OWASP-ASVS L2 | Communications security — TLS | ❌ FAIL | H-003 |
| V13.1 | OWASP-ASVS L2 | API rate limiting | ❌ FAIL | M-007 |
| V13.2 | OWASP-ASVS L2 | RESTful services — input validation | ⚠ PARTIAL | C-004 |
| V14.4 | OWASP-ASVS L2 | HTTP Security Headers | ❌ FAIL | M-006 |
| V14.5 | OWASP-ASVS L2 | CORS policy configured | ❌ FAIL | M-009 |
| CC6.1 | SOC2-Type2 | Logical access controls — auth before access | ❌ FAIL | C-001, H-003 |
| CC6.2 | SOC2-Type2 | Access provisioning — verified before granting | ❌ FAIL | C-004 |
| CC6.3 | SOC2-Type2 | Authorised access to systems | ❌ FAIL | C-002 |
| CC7.1 | SOC2-Type2 | Detection/monitoring of security events | ❌ FAIL | H-002 |
| CC8.1 | SOC2-Type2 | Change management — changes tracked | ✅ PASS | WorkItem `changeHistory[]` |

---

## Red Team Summary

**Environment:** Ephemeral — `docker-compose.test.yml` → `portal/Backend/` (port 3001)  
**Chains Attempted:** 9 · **Objectives Achieved: 4 / 4** · **Confirmed Breaches: 7**

### Objectives — All Achieved

| Objective | Result | Evidence |
|-----------|--------|----------|
| Bypass work item state machine to reach an invalid status | ✅ Achieved | RED-002: `/force-approve` overrides 4-DENY vote outcome |
| Access or modify a soft-deleted work item via direct ID reference | ✅ Achieved | RED-005: IDOR — PATCH/DELETE any resource without ownership check |
| Submit a malformed assessment verdict that bypasses routing logic | ✅ Achieved | RED-003: `/team-dispatches` stores attacker-controlled `actions_url` |
| Enumerate all work items without pagination limit enforcement | ✅ Achieved | RED-004: All items returned unconditionally, `?limit=1` ignored |

### Confirmed Breaches

| ID | Severity | Finding |
|----|----------|---------|
| RED-001 | Critical | Zero auth across all portal endpoints |
| RED-002 | Critical | Force-approve bypasses AI vote majority check |
| RED-003 | Critical | Team dispatch injection with attacker-controlled actions_url |
| RED-004 | Medium | Unbounded enumeration — no pagination on list endpoints |
| RED-005 | High | IDOR — no ownership check on PATCH/DELETE |
| RED-006 | High | Stored XSS via unescaped title/description |
| RED-007 | Low | Prometheus metrics expose full route map (recon enabler) |
| RED-008 | Medium | Pipeline runs expose internal agent identities |
| RED-009 | Critical | 4-step unauthenticated full business logic takeover chain |

### Dead Ends (Not Exploitable)

- SQL injection via `/api/search` — uses in-memory `.includes()`, not SQL
- Vote stuffing — state machine prevents triggering vote twice
- Soft-delete re-access by ID — feature_requests uses hard delete
- SSRF via `actions_url` — URL stored but not auto-fetched (deferred risk)

---

## Grading Rationale

| Criteria | Value | Threshold | Result |
|----------|-------|-----------|--------|
| Confirmed red-team breach of critical objective | 4 / 4 objectives | Any = F | **F (automatic)** |
| Critical findings | 4 | ≤1 for C, ≤2 for D | Fails all grades |
| Compliance pass rate | 14 % | ≥60 % for C | Fails all grades |

**Grade: F** — automatic due to confirmed live breach of all four critical objectives.

---

## Prioritised Remediation Roadmap

| Priority | ID | Finding | Effort | Unblocks |
|----------|----|---------|---------|----|
| P1 🔴 | C-001 | Add authentication (JWT bearer middleware in app.ts) | High | All other access control findings |
| P1 🔴 | C-002 | Add RBAC + ownership checks | Medium (post-auth) | C-003, C-004, IDOR |
| P1 🔴 | C-003 | Guard force-approve behind admin role | Low | State-machine integrity |
| P1 🔴 | C-004 | Validate dispatch actions_url + add auth | Medium | Supply-chain risk |
| P2 🟠 | H-001 | Sanitize user-controlled string fields server-side | Low | XSS |
| P2 🟠 | H-002 | Implement auditLog() wrapper + emit required events | Medium | SOC2 CC7.1 |
| P2 🟠 | H-003 | TLS termination at infra layer + HSTS header | Low (infra) | Data in transit |
| P3 🟡 | M-006 | Install helmet (security headers) | Very Low | Quick win |
| P3 🟡 | M-007 | Add express-rate-limit | Low | DoS protection |
| P3 🟡 | M-001 | Cap pagination limit (MAX_LIMIT = 100) | Very Low | Enumeration |
| P3 🟡 | M-003 | Remove Rejected from DISPATCH_TRIGGER_STATUSES | Low | Business logic |
| P3 🟡 | M-004 | Clean dependency links on soft-delete | Low | Stuck-state |
| P4 🟢 | L-001 | Restrict /metrics to Prometheus scraper IP | Low | Recon reduction |
| P4 🟢 | L-002 | Standardise error handler (no err.message to client) | Very Low | Info leakage |
| P4 🟢 | M-009 | Configure CORS allowlist | Very Low | Explicit security boundary |

---

## Output Artifacts

| Artifact | Path |
|----------|------|
| HTML Report | `Teams/TheGuardians/findings/security-report-2026-06-01-F.html` |
| JSON Backlog | `Teams/TheGuardians/findings/security-backlog-2026-06-01.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |
| Compliance Audit | `Teams/TheGuardians/findings/compliance-audit-2026-06-01.md` |

---

*Generated by TheGuardians · Team Leader (team_leader) · run-20260601-085628 · 2026-06-01*  
*Specialists: static-analyzer · pen-tester · red-teamer · compliance-auditor*
