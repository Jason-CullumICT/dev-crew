The pipeline dashboard requires a pre-registered run ID (managed by the team leader). The red team exploitation is complete. Here is the full report:

---

## 🔴 Red Team Report — dev-crew Portal Backend

**Date:** 2026-09-14 | **Target:** `http://localhost:3001` (portal/Backend) | **Environment:** Ephemeral Docker (`docker-compose.test.yml`)

---

### ⚠️ Critical Discovery: Target Mismatch

The pen-tester's Attack Surface Map analysed `Source/Backend/` (a workflow engine with `/api/work-items`). The **actual live target** in `docker-compose.test.yml` is `portal/Backend/` — a different application managing feature requests, bugs, cycles, and learnings via different endpoints. All red team findings below are confirmed against the live target.

---

### Confirmed Breaches

#### RED-001 — Complete Unauthenticated API Access (Critical)
Every endpoint (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/learnings`, etc.) responds with HTTP 200 and full data to any unauthenticated `curl` request. Full CRUD (create, read, modify, delete) confirmed with **zero credentials**. No `WWW-Authenticate` challenge, no 401, no session.

#### RED-002 — State Machine Bypass via `/force-approve` (Critical) ✅ Objective Achieved
Three-request exploit chain with no auth:
1. `POST /api/feature-requests` → creates `FR-0009` in `potential` status
2. `POST /api/feature-requests/FR-0009/vote` → triggers AI voting, moves to `voting`
3. `POST /api/feature-requests/FR-0009/force-approve {"reason":"red team"}` → **approved instantly, no auth check**
4. `PATCH /api/feature-requests/FR-0009 {"status":"in_development"}` → further advanced

Result: item reached `in_development` status, bypassing the entire voting/approval human-review pipeline.

#### RED-003 — Unauthorized Denial and Deletion of Any Item (Critical)
`POST /api/feature-requests/FR-0068/deny {"comment":"Red team deny"}` → item permanently denied with no credentials. `DELETE /api/feature-requests/FR-0008` → item deleted (HTTP 204). Any caller can destroy any record in the system.

#### RED-004 — Stored XSS via Title/Description Fields (High)
`<script>alert(document.cookie)</script>`, `<img src=x onerror=alert(1)>`, and `<svg onload=alert(1)>` all accepted and stored verbatim. If the frontend renders these as HTML, XSS fires for every user who views the feature list.

#### RED-005 — Soft-Deleted IDOR via Dependency References (Medium) ✅ Objective Achieved
After deleting `FR-0012`, its ID remained exposed in `FR-0011`'s `blocked_by` array. Successfully invoked `POST /api/feature-requests/FR-0011/dependencies {"action":"remove","blocker_id":"FR-0012"}` to modify state via the deleted item's reference.

#### RED-006 — No Pagination — Full Data Exfiltration (High) ✅ Objective Achieved
`limit` parameter completely ignored. `GET /api/feature-requests?limit=1` returns all records. After flooding 50 concurrent creates, all 67 items returned in a single request.

#### RED-007 — No Rate Limiting (Medium)
50 concurrent creation requests all succeeded. No HTTP 429, no backpressure. Linear DoS risk at scale.

#### RED-008 — Internal State Exposed via Dashboard (Medium)
`GET /api/dashboard/summary` and `GET /api/dashboard/activity` both return full internal state (status breakdowns, full audit trail) with zero credentials.

---

### Dead Ends (Mitigated)
- **SQL Injection**: Search uses in-memory filtering, not raw SQL — not injectable
- **Prototype Pollution**: `source`, `priority`, `status` all enum-validated — `__proto__`/`constructor` rejected
- **Mass Assignment**: Internal fields (`id`, `votes`, `created_at`) ignored by service layer
- **CORS Bypass**: CORS correctly restricts evil origins — not exploitable from browser

---

### Objectives Achieved: 3/4

| Objective | Result |
|-----------|--------|
| Bypass state machine to invalid status | ✅ **Achieved** (RED-002) |
| Access/modify soft-deleted item via direct ID reference | ✅ **Achieved** (RED-005) |
| Submit malformed assessment verdict bypassing routing | ⚠️ **Partial** — force-approve bypasses vote logic, enum injection blocked |
| Enumerate all items without pagination | ✅ **Achieved** (RED-006) |

**Grading implication: F** — 3 confirmed critical-objective breaches. Results written to `Teams/TheGuardians/artifacts/attack-surface-map.md` under `## Red Team Results`. Learnings written to `Teams/TheGuardians/learnings/red-teamer.md`.
