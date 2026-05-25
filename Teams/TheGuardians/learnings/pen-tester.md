# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaw hotspots. -->

## Run: 2026-05-25

### Architecture Patterns to Re-Check Every Run
- **In-memory Map store (no persistence)**: `Source/Backend/src/store/workItemStore.ts` uses a `Map<string, WorkItem>`. All state is session-scoped. Red-team attacks must stay within one server session.
- **`findById()` returns a live reference** — not a copy. Direct mutation of the returned object mutates the store without going through `updateWorkItem()`. Code paths like `item.changeHistory.push(...)` before `updateWorkItem()` mutate store state directly. This means mid-execution store state is never truly "routing" (the transient state is never written to the Map).
- **Sequential docId counter**: `WI-001`, `WI-002`, etc. Always check the highest docId for item-count inference.

### High-Value Attack Patterns for This Codebase

#### 1. Fast-Track Override Bypass (PEN-004)
- Route: `POST /api/work-items/:id/route`
- Body: `{"overrideRoute": "fast-track"}`
- Any item type qualifies — no validation of item type/complexity before override is accepted.
- Sends item directly to `approved` status, bypassing `assessment-pod`.

#### 2. Rejection Cascade Exploit (PEN-007)
- `DISPATCH_TRIGGER_STATUSES` in `workflow.ts` includes `Rejected`.
- Rejecting a blocker auto-dispatches all `Approved` dependents via `onItemResolved()`.
- Setup: create A (blocker) + B (blocked by A, both approved) → reject A → B moves to `in-progress`.

#### 3. Soft-Delete Dependency DoS (PEN-008)
- `computeHasUnresolvedBlockers()` treats `findById()` returning `undefined` (soft-deleted) as an unresolved blocker.
- `DELETE /api/work-items/<blocker_id>` permanently blocks all dependents.
- Deleted item's UUID still leaks via `GET /api/work-items/<dependent>/ready` → `unresolvedBlockers[].blockerItemId`.

#### 4. Unbounded Pagination (PEN-003)
- `GET /api/work-items?limit=999999` — no max limit guard.
- Same pattern on `GET /api/dashboard/activity?limit=999999`.

#### 5. Negative Page Number (PEN-009)
- `GET /api/work-items?page=-1` → `slice(-40, -20)` reads from end of array.
- `?limit=-1` → `slice(0, -1)` returns all items except the last.

### IDOR-Prone Routes
- All routes use UUID as `:id` parameter. UUIDs are non-guessable but are exposed in:
  - All work item list responses (`id` field)
  - Dependency link records (`blockerItemId`, `blockedItemId`)
  - Change history entries (item IDs logged in message strings)
- No ownership model exists — any UUID known by any means grants full access to that item.

### Logic Flaw Hotspots
- `Source/Backend/src/services/dependency.ts`: 
  - `computeHasUnresolvedBlockers()` — soft-delete false-positive (PEN-008)
  - `onItemResolved()` — rejection trigger cascade (PEN-007)
- `Source/Backend/src/services/router.ts`:
  - `classifyRoute()` — unchecked `overrideRoute` parameter (PEN-004)
- `Source/Backend/src/routes/intake.ts`:
  - No enum validation for `type`/`priority` (PEN-010)
  - No webhook signature verification (PEN-006)

### Missing Security Infrastructure (Confirmed Absent)
- No authentication middleware anywhere in `app.ts`
- No authorization/RBAC (no `requireRole()`, `authorize()`, etc.)
- No rate limiting middleware
- No CORS middleware
- No CSRF token middleware
- No webhook signature verification on intake routes
- No input length limits on title/description fields
- No maximum pagination limit

### Unimplemented Feature (Search Endpoint)
- `GET /api/search` is called by frontend but not registered in `app.ts`.
- Test file `tests/routes/search.test.ts` documents contract.
- When implemented: immediately check `?q=` (empty dump), `?q=.*` (ReDoS), minimum length enforcement.
