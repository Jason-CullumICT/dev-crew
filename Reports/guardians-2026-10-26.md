# TheGuardians Security Report — Synthesis
**Date:** 2026-10-26 · **Run:** `run-20261026-085407` · **Grade: F**

---

## ⛔ Verdict: FAIL — Confirmed Red-Team Breach of All 4 Critical Objectives

The red-teamer achieved **4/4 pentest objectives** via live exploit chains against an ephemeral Docker container. Two critical-severity breaches were confirmed in production-equivalent conditions. **All merges to main must be blocked until CRIT-001 and CRIT-002 are resolved and re-audited.**

---

## Summary

| Severity | Count | Confirmed (Live) | Theoretical |
|----------|-------|-----------------|-------------|
| 🔴 Critical | 2 | 2 | 0 |
| 🟠 High | 6 | 3 | 3 |
| 🟡 Medium | 6 | 2 | 4 |
| 🟢 Low | 5 | 0 | 5 |
| **Total** | **19** | **7** | **12** |

| Metric | Value |
|--------|-------|
| Compliance pass rate (full pass only) | **9.5%** (2/21 controls) |
| Red-team objectives achieved | **4/4** |
| Grade | **F** (automatic — confirmed breach) |

---

## Top 3 Risks

### 1. CRIT-001 — Entire API Completely Unauthenticated & Unauthorized
**Status: Confirmed (Live Exploit)** · Sources: SAST-001, COMP-001, COMP-002, PEN-001, RED-001

Every API endpoint (`/api/work-items`, `/api/dashboard`, `/api/intake`, `/metrics`, all workflow actions) is accessible by any unauthenticated HTTP client. No JWT, no session, no API key, no RBAC anywhere in the codebase. The red-teamer executed all subsequent exploit chains without a single authorization header.

**Remediation (P1-BLOCK):** Add JWT bearer token middleware globally before all `/api/*` routes. Introduce `viewer`/`contributor`/`manager` role model with RBAC middleware on sensitive actions.

---

### 2. CRIT-002 — State Machine Bypass via Force-Approve with Zero Votes
**Status: Confirmed (Live Exploit)** · Sources: PEN-002, RED-002

A `critical`-priority feature request targeting `main` was approved with **zero agent votes** and no authorization check via the `/force-approve` endpoint. The `overrideRoute: "fast-track"` parameter in Source/Backend achieves the same bypass. Reproduced twice (FR-0001, FR-0029).

```
POST /api/feature-requests/FR-0001/force-approve  → 200
{ "status": "approved", "votes": [], "human_approval_approved_at": "2026-10-26T08:48:54Z" }
```

**Remediation (P1-BLOCK):** Gate force-approve/overrideRoute behind authenticated `manager` role. Require audit log entry with user identity and reason.

---

### 3. HIGH-001 — Cross-User Dependency Injection → Ghost Blocker DoS
**Status: Confirmed (Live Exploit)** · Sources: PEN-003, RED-003

Any caller can inject a blocker dependency onto any work item they don't own. Deleting the blocker creates an orphaned dependency row (no FK CASCADE), permanently blocking the victim's item with a `status: "unknown"` ghost blocker that appears unresolvable through normal UI.

**Remediation (P2):** Add `ON DELETE CASCADE` FK on `dependencies.blocker_item_id`. Enforce ownership checks on dependency mutations.

---

## All Findings — Quick Reference

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| CRIT-001 | Entire API Unauthenticated & Unauthorized | Critical | Confirmed |
| CRIT-002 | State Machine Bypass — Force-Approve Zero Votes | Critical | Confirmed |
| HIGH-001 | Cross-User Dependency Injection → Ghost Blocker DoS | High | Confirmed |
| HIGH-002 | Pagination `limit` Entirely Ignored — Full Data Dump | High | Confirmed |
| HIGH-003 | Unauthenticated Prometheus `/metrics` Exposure | High | Confirmed |
| HIGH-004 | Unauthenticated Webhook Intake — No HMAC Signature | High | Theoretical |
| HIGH-005 | No HTTP Security Headers (Helmet, CORS, CSP, HSTS) | High | Theoretical |
| HIGH-006 | Required Audit Events Missing (login, permission, export) | High | Theoretical |
| MED-001 | No Rate Limiting on Any Endpoint | Medium | Confirmed |
| MED-002 | Body Size Overflow Returns 500 Instead of 413 | Medium | Confirmed |
| MED-003 | Cascade Auto-Dispatch via Blocker Rejection | Medium | Theoretical |
| MED-004 | Unvalidated Enum Inputs in Intake Routes | Medium | Theoretical |
| MED-005 | No TLS / HTTPS Enforcement | Medium | Theoretical |
| MED-006 | No Schema Validation Library | Medium | Theoretical |
| LOW-001 | Raw Internal Error Messages Returned to Clients | Low | Theoretical |
| LOW-002 | Plaintext Admin Credentials in CLAUDE.md | Low | Theoretical |
| LOW-003 | No Hard-Delete / GDPR Art. 17 Readiness Risk | Low | Theoretical |
| LOW-004 | Missing `/api/search` Route | Low | Theoretical |
| LOW-005 | Debug Portal iframe Missing `sandbox` Attribute | Low | Theoretical |

---

## Compliance Matrix Summary

| Status | Count | Rate |
|--------|-------|------|
| ✅ PASS | 2 | 9.5% |
| ⚠️ PARTIAL | 4 | 19.0% |
| ❌ FAIL | 15 | 71.4% |

**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)

Key failures: authentication (ASVS 2.1.x, 3.1.x, 4.1.x), authorization (ASVS 4.1.1, 4.1.2), audit logging (ASVS 7.2.1), TLS (ASVS 9.1.1), rate limiting (ASVS 11.1.4), security headers (ASVS 14.4.x), SOC2 CC6.1–CC6.3.

---

## Red Team Summary

| | |
|--|--|
| Environment | Ephemeral Docker container (`docker-compose.test.yml`) — destroyed post-run |
| Target | `http://localhost:3001` (portal/Backend) |
| Objectives Attempted | 4 |
| Objectives Achieved | **4** (100%) |
| Grade trigger | Automatic F |

| Objective | Result | Chain |
|-----------|--------|-------|
| Bypass state machine to reach invalid status | ✅ ACHIEVED | RED-002: force-approve → approved with 0 votes |
| Access/modify soft-deleted item via direct ID | ✅ ACHIEVED | RED-003: ghost blocker after hard-delete |
| Malformed verdict bypasses routing logic | ✅ ACHIEVED | RED-002: same chain, no role check |
| Enumerate all items without pagination limit | ✅ ACHIEVED | RED-004: `?limit=1` returns all 29 items |

---

## Grading

| Rubric | Threshold | Actual |
|--------|-----------|--------|
| Critical findings | 0 for any passing grade | **2 confirmed** |
| High findings | ≤ 12 for Grade C | **6** |
| Compliance pass rate | ≥ 60% for Grade C | **9.5%** |
| Red-team breach | Any confirmed → F | **4/4 objectives breached** |

**Final Grade: F** — Automatic. Operator decision required before any merge.

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort |
|----------|---------|--------|
| **P1 — BLOCK** | CRIT-001 — Add JWT auth + RBAC middleware | Medium |
| **P1 — BLOCK** | CRIT-002 — Gate force-approve behind manager role | Low |
| P2 | HIGH-001 — FK CASCADE + ownership check on dependencies | Low |
| P2 | HIGH-002 — Enforce pagination limit cap (max 100) | Low |
| P2 | HIGH-003 — Restrict /metrics to internal network | Low |
| P2 | HIGH-005 — Install helmet() + cors() middleware | Low |
| P2 | HIGH-004 — HMAC signature verification for intake webhooks | Medium |
| P3 | MED-001 — Add express-rate-limit globally | Low |
| P3 | MED-002 — Catch PayloadTooLargeError → 413 | Low |
| P3 | MED-004 — Validate enums in intake routes | Low |
| P3 | HIGH-006 — Add required audit events | Medium |
| P3 | MED-005 — Document + enforce TLS in production | Medium |
| P4 | LOW-001, LOW-002, MED-006, LOW-003, LOW-004, LOW-005 | Low-Medium |

---

## Output Artifacts

| Artifact | Path |
|---------|------|
| Full HTML Report | `Teams/TheGuardians/findings/security-report-2026-10-26-F.html` |
| Machine-Readable Backlog | `Teams/TheGuardians/findings/security-backlog-2026-10-26.json` |
| Attack Surface Map | `Teams/TheGuardians/artifacts/attack-surface-map.md` |

---

## Phase 2 Status

**Phase 2: Completed** — Ephemeral environment gate passed (Docker Compose stack, destroyed post-run). Attack surface map contained PEN-001 through PEN-011. Red-teamer executed all 4 objective chains successfully.

> Phase 2 result: Automatic Grade F. Operator decision required before TheFixer is invoked. Fix CRIT-001 and CRIT-002 first; re-audit before routing remaining findings to TheFixer backlog.
