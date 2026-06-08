Ephemeral environment torn down cleanly. Here is the complete red-team report:

---

## 🔴 Red Team Report — TheGuardians

**Date:** 2026-06-08  
**Target:** `docker-compose.test.yml` → portal app on `http://localhost:3001`  
**Chains Attempted:** 8 | **Confirmed Breaches:** 7 | **Objectives Achieved:** 4/4

---

### ⚠️ Architecture Discrepancy (Critical Pre-Finding)
The pen-tester analyzed `Source/Backend/` (work-items API) but `docker-compose.test.yml` builds the **`portal/`** app — a separate codebase. All red-team results below are against the actual running service.

---

### RED-001 — Complete Authentication Bypass · **Critical · CONFIRMED**
Every endpoint — `POST /api/feature-requests`, `POST /:id/force-approve`, `POST /:id/deny`, `POST /:id/vote`, `DELETE /:id`, `GET /api/bugs` — is accessible with zero credentials. Write access (HTTP 201/200) was confirmed for all state-changing operations anonymously.

### RED-002 — Phantom Blocker Permanent Block · **High · CONFIRMED**
`deleteFeatureRequest()` hard-deletes the row but leaves the `dependencies` table row intact. After deletion the LEFT JOIN returns `status='unknown'` (not in `RESOLVED_STATUSES`), locking the dependent FR-0024 in `pending_dependencies` forever. No automatic cleanup exists.  
**Objective achieved:** "Access or modify a soft-deleted work item via direct ID reference"

### RED-003 — `denied` Not in `RESOLVED_STATUSES` — Cascade Failure · **High · CONFIRMED**
Denying a blocker (`POST /:id/deny`) does **not** call `onItemCompleted()`, and `'denied'` is absent from `RESOLVED_STATUSES`. FR-0026 remained in `pending_dependencies` after its blocker FR-0025 was denied. The advance attempt returned `"Invalid status transition: pending_dependencies → in_development"`.  
**Objective achieved:** "Submit a malformed assessment verdict that bypasses routing logic"

### RED-004 — Unauthenticated Prometheus Metrics · **Medium · CONFIRMED**
`GET /metrics` → HTTP 200 with 39 metric families including `ai_voting_invocations_total`, `feature_request_transitions_total`, `dispatch_gating_events_total`, full process/heap/CPU metrics.

### RED-005 — No Pagination Enforcement · **Medium · CONFIRMED**
`?limit=1` returned all 23 items. The SQL query has no `LIMIT` clause. Full internal state (votes, dependencies, approval comments) exposed in one unauthenticated call.  
**Objective achieved:** "Enumerate all work items without pagination limit enforcement"

### RED-006 — Stored XSS · **High · CONFIRMED** *(new — not in pen-tester map)*
`<script>alert(document.cookie)</script>` and `<svg onload=fetch(...)>` stored verbatim (FR-0027). No server-side sanitization. Exploitable in any frontend rendering without HTML escaping.

### RED-007 — CORS: Server Processes All Cross-Origin Mutations · **Medium · CONFIRMED**
Server committed `force-approve` from `Origin: http://evil-attacker.com` (state=`approved`). No CSRF protection. Browser blocks the response read, but the server-side mutation already occurred.

### RED-008 — No Rate Limiting · **Medium · CONFIRMED**
20 concurrent POSTs → 20×HTTP 201, zero 429s. Jaccard duplicate-detection runs `O(n)` per creation, making bulk insertion a CPU exhaustion vector.

---

### All 4 Config Objectives: ✅ Achieved

| Objective | Chain | Status |
|---|---|---|
| Bypass state machine to reach invalid status | RED-001 (force-approve, no role check) | ✅ |
| Access/modify soft-deleted item via direct ID | RED-002 (phantom blocker via hard-delete) | ✅ |
| Submit malformed verdict bypassing routing | RED-003 ('denied' ≠ resolved, cascade dead) | ✅ |
| Enumerate all items without pagination | RED-005 (limit param silently ignored) | ✅ |

Results appended to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
