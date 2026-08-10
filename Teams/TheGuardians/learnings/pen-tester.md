# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-08-10

### Architecture Notes
- Backend is a pure Express 4.x + TypeScript app, **in-memory store only** (no database).
- No auth layer exists anywhere — all endpoints are fully unauthenticated. Auth bypass is not required.
- All IDs are UUIDs (v4); not sequential, so brute-force enumeration is not viable. Items are enumerated via the list endpoint.
- The "Routing" status is a **transient ghost state** — it appears in changeHistory but is never persisted to the store. Items cannot be caught in `Routing` status from the API.

### Highest-Impact Vectors (codified)
1. **Fast-Track Override** (`POST /api/work-items/:id/route` with `{"overrideRoute": "fast-track"}`): Moves any backlog item directly to Approved, bypassing all four assessment pod roles. Critical — no auth, no role check.
2. **Cascade-on-Reject** (`POST /api/work-items/:id/reject`): Calls `onItemResolved()` which auto-dispatches any `Approved` dependent. Create a trivial blocker, add it as dependency, reject it → forces dispatch of controlled target.
3. **Intake Enum Injection** (`POST /api/intake/zendesk` or `/automated`): No enum validation on `type`/`priority`. Main `/api/work-items` endpoint validates; intake endpoints do not. Injected values persist in the store.
4. **Unlimited Pagination** (`GET /api/work-items?limit=999999`): No upper bound; full dataset dump.

### IDOR-Prone Routes
- All `/:id` routes are IDOR-prone; UUIDs are returned in all responses. Collect IDs from list endpoint, then address any item directly.
- Soft-deleted item IDs leak via `GET /api/work-items/:id/ready` → `unresolvedBlockers[].blockerItemId` for items whose blocker was soft-deleted.

### Logic Flaw Hotspots
- `dependency.ts:computeHasUnresolvedBlockers()` — treats soft-deleted blockers as unresolved (ghost dependency). Soft-deleting a blocker permanently blocks its dependents.
- `router.ts:classifyRoute()` — no validation on `overrideRoute` enum values. Arbitrary strings stored as `route` field if not equal to `"fast-track"`.
- `assessment.ts:runAssessmentPod()` — deterministic algorithm: ensure title ≥5 chars, description ≥20 chars, complexity and priority are set → guaranteed Approve verdict from pod. No human input involved.

### Attack Pattern: Force Any Item to `in-progress` Without Assessment
```
1. POST /api/work-items  →  get {id}
2. POST /api/work-items/{id}/route  {"overrideRoute":"fast-track"}  →  status=approved
3. POST /api/work-items/{id}/dispatch  {"team":"TheATeam"}  →  status=in-progress
Total steps: 3, Auth required: 0
```

### Attack Pattern: Ghost Dependency DoS
```
1. POST /api/work-items  →  {blocker_id}
2. POST /api/work-items/{target_id}/dependencies  {"action":"add","blockerId":"{blocker_id}"}
3. DELETE /api/work-items/{blocker_id}
4. POST /api/work-items/{target_id}/dispatch  →  400: unresolved blockers (permanent)
Remediation requires: direct store access (no API path)
```

### Missing Endpoint
- `GET /api/search?q=...` is called by `Source/Frontend/src/api/client.ts:searchItems()` but does not exist in the backend. Returns 404. No exploit currently; monitor for implementation.
