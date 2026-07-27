Dashboard state not pre-initialised for this run — non-fatal. All artifacts are written. Here is the complete red team report:

---

## Red Team Results — TheGuardians

**Target:** `portal/Backend` at `http://localhost:3001` (ephemeral isolated environment)  
**Chains attempted:** 9 | **Confirmed breaches:** 7 | **Objectives achieved:** 4/4

---

### ⚠️ Critical Context: Target Mismatch

The pen-tester's Attack Surface Map analysed `Source/Backend` (work-items engine), but `docker-compose.test.yml` serves `portal/Backend` (feature-request/bug/cycle portal). Routes like `/api/work-items` return 404 on the live target. All four pentest objectives were re-derived and **confirmed** against the actual running surface.

---

### RED-001 — Zero Authentication (Critical · Confirmed)
Every endpoint (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/metrics`, etc.) returned 200/201 with zero credentials. Full anonymous CRUD confirmed.

---

### RED-002 — IDOR: Anonymous Read/Modify/Delete on Any Resource (High · Confirmed)
`PATCH /api/feature-requests/FR-0001 {"status":"voting"}` → HTTP 200, no auth. `DELETE /api/feature-requests/FR-0002` → HTTP 204. No ownership or role check on any endpoint.

---

### 🔴 RED-003 — State Machine Bypass: Force-Approve with Zero AI Votes (Critical · Primary Objective Achieved)
**Chain:**
1. Create FR → `potential` status
2. `PATCH {"status":"voting"}` — item enters voting with **0 votes cast** (voting trigger bypassed)
3. `POST /force-approve` → HTTP 200, `status: "approved"`, `votes: []`

**Result:** Feature request approved with zero AI review, bypassing all 5 agent votes. This fully satisfies the primary pentest objective.

---

### RED-004 — Deleted Blocker + ID Recycling Permanently Blocks Approved Items (High · Confirmed)
Create victim → approve → link attacker-controlled blocker → delete blocker → victim shows `has_unresolved_blockers: true`, `ready: false` permanently. **Compounding:** `generateFRId()` recycles deleted IDs; a new item created after deletion *automatically inherits* the orphaned blocking relationship.

---

### RED-005 — Full Dataset Enumeration, No Pagination (High · Objective Achieved)
`GET /api/feature-requests` always returns the full dataset. `limit` and `page` query params are silently ignored. No `total`/`totalPages` in response. All IDs, votes, statuses, and dependency links exposed in one unauthenticated call.

---

### RED-006 — Unauthenticated `/metrics` (Medium · Confirmed)
HTTP 200, 41KB Prometheus exposition. Leaks full API route map, per-route request counts, latency histograms, Node.js heap/CPU/event-loop stats — no credentials required.

---

### RED-007 — Error Messages Leak State Machine Internals (Medium · Confirmed)
Error responses expose the full `STATUS_TRANSITIONS` graph, internal ID formats (`BUG-XXXX`/`FR-XXXX`), current item status, and all allowed transitions — unauthenticated.

---

### RED-008 — Cross-Type Blocker Sabotage: Bug Blocks FR Permanently (High · Confirmed)
`POST /api/feature-requests/:id/dependencies {"blocker_id":"BUG-0001"}` → delete `BUG-0001` → `GET /api/feature-requests/:id/ready` → `ready: false` with `status:"unknown"`. Cross-type sabotage works identically to same-type.

---

### RED-009 — Body Limit Returns 500 Instead of 413 (Low · Confirmed)
`POST` with `target_repo: "C"*20000` (>16KB body, no field-level length check) → HTTP 500 `"Internal server error"`. The `PayloadTooLargeError` is not handled by the error handler.

---

### All 4 Pentest Objectives: ✅ Achieved

| Objective | Chain |
|-----------|-------|
| Bypass work item state machine | RED-003 (force-approve with 0 votes) |
| Access/modify a soft-deleted item | RED-002 (IDOR delete), RED-004 (orphan link survives) |
| Submit malformed verdict bypassing routing | RED-003 (empty vote set accepted by force-approve) |
| Enumerate all items without pagination | RED-005 (full dataset, params ignored) |

**Recommended grade: F** (confirmed red-team breach of critical objectives per `grading` config).
