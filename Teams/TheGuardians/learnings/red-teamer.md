# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-07-27

### Critical Context: Target Mismatch

**The pen-tester analyses `Source/Backend` (work-items engine) but `docker-compose.test.yml` runs `portal/Backend` (feature-request/bug/cycle portal).** Always probe the actual running surface first — `curl /health`, read `docker-compose.test.yml`, inspect the running process (`ps aux | grep node`) and its source (`portal/Backend/src/index.ts`).

- Pen-tester routes (`/api/work-items`) → 404 in live target
- Live target routes: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/learnings`, `/api/features`, `/api/pipeline-runs`, `/api/search`, `/api/team-dispatches`
- **All 4 pentest objectives still achievable** by re-mapping vulnerability classes to the actual surface

---

### Successful Exploit Chains

#### Chain: State Machine Bypass (Primary Objective — always attempt first)
```bash
# Step 1: create FR
FR_ID=$(curl -s -X POST http://localhost:3001/api/feature-requests \
  -H "Content-Type: application/json" \
  -d '{"title":"...","description":"...","source":"manual","priority":"critical"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Step 2: PATCH to voting with zero votes (bypasses voting trigger)
curl -s -X PATCH "http://localhost:3001/api/feature-requests/$FR_ID" \
  -H "Content-Type: application/json" -d '{"status":"voting"}'

# Step 3: force-approve (approved with 0 AI votes — objective achieved)
curl -s -X POST "http://localhost:3001/api/feature-requests/$FR_ID/force-approve"
```
**Result:** `status=approved`, `votes=[]` — 0 AI agents ran.

#### Chain: Blocker Sabotage + ID Recycling
```bash
# Create victim (approved), create blocker, link them, delete blocker
# Victim gets `has_unresolved_blockers: true`, `ready: false`
# KEY: After deletion, `generateFRId()` recycles the deleted ID
# New item with recycled ID inherits the old blocking relationship automatically
```
**Result:** Victim permanently un-dispatchable. New innocuous item auto-inherits blocking role.

#### Chain: Cross-Type Blocker Sabotage
- Create a bug (`BUG-XXXX`), add as blocker to a feature request
- Delete the bug
- Feature request shows `ready: false`, `status: "unknown"` for deleted bug
- Works identically to same-type sabotage — no cross-type protection

---

### Endpoints That Responded to Probing

| Endpoint | Notes |
|----------|-------|
| `POST /api/feature-requests/:id/force-approve` | Requires `voting` status — PATCH first to bypass vote trigger |
| `PATCH /api/feature-requests/:id` | Enforces valid status transitions BUT allows `potential→voting` with no votes |
| `POST /api/feature-requests/:id/dependencies` | No auth, accepts cross-type (BUG-XXXX or FR-XXXX) |
| `DELETE /api/feature-requests/:id` | Hard delete (not soft delete) — ID recycled by `generateFRId` |
| `GET /api/feature-requests` | Always returns full dataset — no pagination, params ignored |
| `GET /metrics` | Unauthenticated, 41KB exposition including all route patterns |
| `POST /api/feature-requests/:id/retrigger` | Requires voting status; clears old votes atomically (does not accumulate) |

---

### Dead Ends / Non-Issues

- **SQL injection via query params**: All queries use parameterized `?` placeholders — not exploitable
- **Status jumps via PATCH**: Enforced by `STATUS_TRANSITIONS` map — invalid transitions return 400 with details
- **Vote flooding via retrigger**: Retrigger deletes old votes in a transaction before inserting new ones — does not accumulate duplicate votes
- **Input length limits**: `title ≤ 200`, `description ≤ 10000` — enforced. But `target_repo` has no length limit and can cause 500 on >16KB bodies
- **Jaccard duplicate detection**: Functional but not a security issue — just UX

---

### Architecture Insights

- `generateFRId()` uses `SELECT id FROM feature_requests ORDER BY id DESC LIMIT 1` — ID is recycled after hard deletes
- Dependency links stored in a separate `dependencies` table — NOT cascade-deleted when blocker is hard-deleted
- `DependencyService.isReady()` treats `undefined` / missing items as `status: "unknown"` → unresolved (should treat as resolved)
- `forceApproveFeatureRequest()` only checks `status === 'voting'`, not vote count — vote count of 0 is accepted
- The app uses SQLite (better-sqlite3) — all queries are parameterized
- `express.json({ limit: '16kb' })` — PayloadTooLargeError not caught by errorHandler, returns 500 instead of 413
