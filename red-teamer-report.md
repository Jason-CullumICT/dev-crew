---

## 🔴 Red Team Final Report

**Environment:** Ephemeral Docker (`docker-compose.test.yml`) — now torn down  
**Target:** `portal/Backend` on `localhost:3001`  
**Chains Attempted:** 9 | **Confirmed Breaches:** 5 | **Objectives Achieved:** 3/4

---

### ⚠️ Target Correction
The pen-tester mapped `Source/Backend/` (work-items state machine) but `docker-compose.test.yml` runs `portal/Backend/` (feature-request/bug portal). All chains were **adapted to the actual live service** — vulnerabilities are structurally identical to those mapped.

---

### Objectives

| # | Objective | Result |
|---|-----------|--------|
| 1 | Bypass work item state machine | ✅ **ACHIEVED** |
| 2 | Access soft-deleted item via ID reference | ✅ **ACHIEVED** |
| 3 | Submit malformed assessment verdict | ⚠️ **PARTIAL** — vote body ignored; force-approve achieves same effect |
| 4 | Enumerate all items without pagination limit | ✅ **ACHIEVED** |

---

### Confirmed Breaches (Severity Order)

#### 🔴 RED-001 — Complete Authentication Absence (Critical)
Every endpoint (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.) is fully public. Anonymous callers can CREATE, READ, UPDATE, and DELETE any resource. All other chains depend on this.

#### 🔴 RED-002 — Unauthenticated Force-Approve Bypasses Human Review (Critical)
Chain: `POST /` (create) → `PATCH {"status":"voting"}` → `POST /:id/force-approve` — item reaches `approved` with **zero votes and zero human review** in 3 anonymous requests. `votes: []` in response is the smoking gun.

#### 🔴 RED-003 — Dependency Gating Bypass via `PATCH blocked_by:[]` (High)
An item blocked by an unresolved dependency and force-approved to `pending_dependencies` can have its blockers silently cleared via `PATCH {"blocked_by":[]}`, then transitioned to `approved` — the dependency never resolved.

#### 🔴 RED-004 — Soft-Deleted Item ID Leaks in Dependency Responses (Medium)
After `FR-0005` is soft-deleted, `GET /api/feature-requests/FR-0006` still returns `blocked_by: [{"item_id":"FR-0005","status":"unknown"}]` — confirming the deleted item existed and leaking its ID. `has_unresolved_blockers: true` persists forever.

#### 🔴 RED-005 — Unbounded Pagination Dumps Full Dataset (High)
`GET /api/feature-requests?limit=999999` returned all 79 items in one unauthenticated call. `page=-1` and `limit=abc` both bypass normal pagination silently.

**Supporting findings:** unauthenticated `/metrics` (operational intelligence), internal URL in orchestrator error, error-message-based ID enumeration, no rate limiting (50 POSTs in 373ms).

---

**Results appended to:** `Teams/TheGuardians/artifacts/attack-surface-map.md` → `## Red Team Results`  
**Learnings written to:** `Teams/TheGuardians/learnings/red-teamer.md`
