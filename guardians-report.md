# TheGuardians — Security & Compliance Report

**Date:** 2026-06-15 · **Run:** run-20260615-094519 · **Grade: F**

> Full HTML report: `Teams/TheGuardians/findings/security-report-2026-06-15-F.html`  
> Machine-readable backlog: `Teams/TheGuardians/findings/security-backlog-2026-06-15.json`

---

## Grade: F — Automatic

**Trigger:** Confirmed red-team breach of all 4 critical objectives.

Per `security.config.yml` grading rules: any confirmed red-team breach of a critical objective = automatic Grade F.

| Metric | Result |
|--------|--------|
| Critical findings | **2** (both confirmed live exploits) |
| High findings | **11** (4 confirmed, 7 theoretical) |
| Medium findings | **9** (3 confirmed/partial, 6 theoretical) |
| Low findings | **4** (all theoretical) |
| Red-team objectives achieved | **4 / 4** |
| Confirmed breaches | **7** (RED-001 through RED-007) |
| Compliance pass rate | **9% (1/17 controls)** |

---

## Root Cause (Single Fix Eliminates Most Findings)

> **There is no authentication middleware anywhere in the application.**

All 15+ API endpoints — including approve, reject, dispatch, force-approve, delete — respond to unauthenticated HTTP requests. The red-team confirmed: created, modified, deleted, approved, and dispatched work items using zero credentials.

**Single highest-leverage fix:** Implement JWT authentication middleware on all `/api/*` routes. This eliminates the root cause of CRIT-1, CRIT-2, HIGH-1 through HIGH-3, HIGH-5, MED-1, and MED-2.

---

## Confirmed Live Exploits (Red-Team Verified)

### 🔴 CRIT-1 — Complete Absence of Authentication
_PEN-001 + RED-001 + SAST-001 + COMP-001_

Every endpoint responds to unauthenticated requests. Confirmed with working exploit.

```
curl -X POST http://localhost:3001/api/feature-requests \
  -d '{"title":"Injected"}' → HTTP 201
```

**Fix:** `express-jwt` middleware before all `/api/*` routes; reject 401 on missing/invalid token.

---

### 🔴 CRIT-2 — State Machine Bypass via Unauthenticated Force-Approve
_PEN-002 + RED-002_

`POST /force-approve` promotes items to `approved` with zero votes, no credentials. Overrides explicit AI deny-majority.

```
POST /api/feature-requests/FR-0020/force-approve (no token)
→ HTTP 200, {"status":"approved","votes":[]}
```

**Fix:** Admin-level token required for `/force-approve`. Runtime enum validation for `overrideRoute`.

---

### 🟠 HIGH-1 — Orphaned Dependency Exposes Deleted Item ID
_PEN-003 + RED-003_

Deleting a blocker leaves its ID in surviving dependents' `blocked_by[]`, permanently gating their approval. Confirmed: FR-0013 deleted → FR-0014 response still contains `{"item_id":"FR-0013","status":"unknown"}`.

**Fix:** Cascade-delete `dependency_links` on item deletion.

---

### 🟠 HIGH-2 — Full Dataset Enumeration (No Pagination)
_PEN-005 + RED-004_

`?limit=1` returns all items. Pagination parameter is entirely ignored in the portal backend. Confirmed: full 12+ item dataset returned in single unauthenticated request.

**Fix:** Server-side `LIMIT/OFFSET` in SQLite queries; cap at 100; validate `limit` is a positive integer.

---

### 🟠 HIGH-3 — Unauthenticated Metrics Leaks Internal URLs
_PEN-009 + RED-005_

`GET /metrics` returns 572 lines of Prometheus data. Error response also leaks orchestrator internal address.

```
{"error":"Orchestrator unreachable at http://localhost:8080"}
```

**Fix:** Restrict `/metrics` to localhost. Generic error messages to clients.

---

### 🟠 HIGH-5 — No RBAC on Privileged Operations
_COMP-002 + RED-001_

Once authentication is added, no role separation exists. Any authenticated user can approve, dispatch, delete. Fails SOC2 CC6.3, CC8.1.

**Fix:** Implement `viewer` / `operator` / `admin` roles via JWT claims after auth is in place.

---

### 🟡 MED-1 — CORS: Any Origin Accepted (Source/Backend)
_PEN-010 + RED-006_

Portal backend has CORS; Source/Backend has none. Either way, direct API clients bypass CORS entirely. Confirmed: item created from untrusted origin via curl.

**Fix:** Authentication is the real fix. Add `cors()` allowlist as secondary defense.

---

### 🟡 MED-2 — Cascade Auto-Dispatch via Unauthenticated Completion
_PEN-013 + RED-007_

Completing a blocker unauthenticated triggers `onItemCompleted()`, auto-advancing approved dependents without any authorized actor. Confirmed: FR-0019 advanced to `approved` solely by attacker completing FR-0018.

**Fix:** Require authentication. Log triggering actor in cascade transitions.

---

## Theoretical Findings (Not Red-Team Confirmed)

| ID | Severity | Title |
|----|----------|-------|
| HIGH-4 | High | Docker socket mounted → full host escape |
| HIGH-6 | High | Intake webhooks: no HMAC + unvalidated enum injection |
| HIGH-7 | High | No TLS enforcement (HTTP only, no HSTS) |
| HIGH-8 | High | No session management (no token expiry/revocation) |
| HIGH-9 | High | Audit events missing — no actor identity in logs |
| HIGH-10 | High | Re-assessment race condition corrupts change history |
| HIGH-11 | High | Malformed `overrideRoute` persisted as invalid enum |
| MED-3 | Medium | No HTTP security headers (CSP, X-Frame-Options) |
| MED-4 | Medium | No rate limiting on any endpoint |
| MED-5 | Medium | Raw error messages expose internal state |
| MED-6 | Medium | Worker/portal containers run as root |
| MED-7 | Medium | Dashboard endpoints expose full dataset unauthenticated |
| MED-8 | Medium | No dependency array size limit → quadratic DoS |
| MED-9 | Medium | Vite dev server bound to 0.0.0.0 in Docker |
| LOW-1 | Low | No right-to-erasure path (GDPR Art. 17) |
| LOW-2 | Low | NaN/zero pagination causes undefined behavior |
| LOW-3 | Low | Sequential `docId` enables item count enumeration |
| LOW-4 | Low | Portal `<iframe>` missing `sandbox` attribute |

---

## Compliance Matrix Summary

**Pass rate: 9% (1/17 controls)**

| Framework | Area | Status |
|-----------|------|--------|
| OWASP-ASVS L2 | V2.x Authentication | ❌ FAIL |
| OWASP-ASVS L2 | V3.3.1 Session timeout | ❌ FAIL |
| OWASP-ASVS L2 | V4.1.x RBAC | ❌ FAIL |
| OWASP-ASVS L2 | V5.x Input validation | ❌ FAIL |
| OWASP-ASVS L2 | **V6.2.1 Cryptographic IDs (UUID v4)** | ✅ **PASS** |
| OWASP-ASVS L2 | V7.2.1 Audit logging | ❌ FAIL |
| OWASP-ASVS L2 | V9.x TLS | ❌ FAIL |
| OWASP-ASVS L2 | V11.x State machine integrity | ❌ FAIL |
| OWASP-ASVS L2 | V13.x API security headers | ❌ FAIL |
| SOC2 Type 2 | CC6.1 Authentication controls | ❌ FAIL |
| SOC2 Type 2 | CC6.2 Credential management | ❌ FAIL |
| SOC2 Type 2 | CC6.3 Role authorization | ❌ FAIL |
| SOC2 Type 2 | CC7.1 Security event monitoring | ❌ FAIL |
| SOC2 Type 2 | CC8.1 Change management auth | ❌ FAIL |
| SOC2 Type 2 | CC6.1 Encryption in transit | ❌ FAIL |
| SOC2 Type 2 | CC6.1 Rate limiting | ❌ FAIL |
| SOC2 Type 2 | CC6.3 Webhook HMAC auth | ❌ FAIL |

---

## Red Team Summary

**Environment:** Ephemeral — `docker-compose.test.yml` running `portal/Backend` on port 3001.  
**Objectives achieved: 4 / 4** — all confirmed as live exploits.

> ⚠️ **Environment note:** Pen-tester analysed `Source/Backend/` but test container runs `portal/Backend/` (different routes). Equivalent vulnerabilities confirmed in both. Root cause is identical: absent authentication middleware.

| Objective | Status | Evidence |
|-----------|--------|---------|
| Bypass state machine | ✅ **ACHIEVED** | RED-002: force-approve with 0 votes → `approved` |
| Access soft-deleted item | ✅ **ACHIEVED** | RED-003: FR-0013 ID exposed in FR-0014 `blocked_by[]` |
| Submit malformed verdict | ✅ **ACHIEVED** | RED-002: force-approve overrides explicit AI deny |
| Enumerate all items | ✅ **ACHIEVED** | RED-004: no pagination at all |

**Not exploitable:** SQL injection (parameterised ✓), invalid status strings via PATCH (validated ✓), illegal state transitions via PATCH (enforced ✓).

---

## Remediation Priority Order

1. **[P1 — Immediate]** Implement JWT authentication middleware on all `/api/*` routes (eliminates root cause of 9 findings)
2. **[P1 — Immediate]** Gate `/force-approve` behind admin role; add runtime `overrideRoute` enum validation
3. **[P1 — Immediate]** Cascade-delete dependency links on item deletion
4. **[P1 — Immediate]** Implement server-side pagination with `LIMIT/OFFSET` and a 100-item cap
5. **[P1 — Immediate]** Restrict `/metrics` to localhost; remove internal URLs from error responses
6. **[P2 — Before prod]** Implement RBAC (viewer / operator / admin roles)
7. **[P2 — Before prod]** Add structured audit logging with actor identity for all 4 required event types
8. **[P2 — Before prod]** Configure TLS termination; add HSTS via `helmet()`
9. **[P2 — Before prod]** Add HMAC validation to intake webhook routes
10. **[P2 — Before prod]** Remove Docker socket mount from orchestrator container
11. **[P3 — Planned]** Session management (JWT TTL + revocation), rate limiting, security headers, non-root containers

---

_Generated by TheGuardians — team_leader synthesis · run-20260615-094519_
