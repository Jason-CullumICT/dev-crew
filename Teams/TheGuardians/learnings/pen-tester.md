# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-06-15

### Architecture Patterns to Watch

**No authentication anywhere** — This codebase has zero authentication infrastructure. Every run should immediately flag the full endpoint surface as unauthenticated. The absence is total (no middleware, no decorators, no guards). Always verify cold.

**In-memory store with mutable Map references** — `store/workItemStore.ts` stores items in a `Map<string, WorkItem>`. `findById()` returns the live object reference, not a copy. Any service that mutates `item.changeHistory.push(...)` or `item.blockedBy` directly mutates the store object without going through `updateWorkItem`. This is a systematic race condition pattern whenever multiple concurrent requests touch the same item.

**Soft-delete filter is only in `findById`** — `items.get(id)` in the raw Map returns deleted items. Only `findById` applies the `deleted` guard. Any code that accesses the Map directly (or stores IDs as references in DependencyLink objects) will retain stale references to deleted items. The `blockedBy` / `blocks` arrays on surviving items hold `DependencyLink` objects containing IDs of potentially-deleted items.

### IDOR-Prone Routes

- `GET /api/work-items/:id` — no ownership check; any ID works
- `PATCH /api/work-items/:id` — no ownership check; modifies any item
- `DELETE /api/work-items/:id` — no ownership check; deletes any item
- `POST /api/work-items/:id/route`, `/assess`, `/approve`, `/reject`, `/dispatch` — no auth/ownership; all workflow actions are globally executable

### Logic Flaw Hotspots

**Fast-track override** (`services/router.ts:classifyRoute`): The `if (overrideRoute)` check is the first thing executed and bypasses all business logic heuristics. Any truthy value bypasses normal routing. `"fast-track"` → status jumps to `approved`. **The most critical single exploit chain in this codebase.**

**Soft-deleted blocker = permanent dispatch block** (`services/dependency.ts:computeHasUnresolvedBlockers`): When `findById` returns `undefined` for a soft-deleted blocker, the code treats the absence as "unresolved" (`!blocker === true`). Deleting a blocker creates a permanent dispatch gate on dependents with no recovery path except manually removing the stale `blockedBy` link. Red team can exploit this to permanently block legitimate dispatch operations.

**Intake enum injection** (`routes/intake.ts`): Only `POST /api/work-items` validates `type`/`priority` against enums. The intake routes (`/zendesk`, `/automated`) use `body.type || WorkItemType.Bug` with no validation — arbitrary strings pass through to the store.

**Error message oracle** (`routes/workflow.ts` catch blocks): All workflow route try/catch blocks use `res.status(500).json({ error: message })` where `message` is the raw `Error.message`. This creates an existence oracle: sending requests to non-existent IDs can reveal whether the item was ever known vs. never created.

**Cascade dispatch via reject** (`services/dependency.ts:onItemResolved` called from reject route): Rejecting any item triggers auto-dispatch of its approved dependents. This is the only way to dispatch an item without calling `/dispatch` directly, and it's accessible to any unauthenticated caller.

### Attack Patterns Unique to This Codebase

1. **Fast-track pipeline skip**: `POST /create` → `POST /:id/route {"overrideRoute":"fast-track"}` → `POST /:id/dispatch` — full pipeline in 3 unauthenticated calls
2. **Permanent dispatch lock via soft-delete**: Create dependency chain → delete blocker → dependent is permanently gated
3. **Bulk data dump**: `GET /api/work-items?limit=9999999` (no pagination cap) OR `GET /api/dashboard/queue` (returns all items ungated)
4. **Intake pollution**: `POST /api/intake/zendesk` with `type:"INVALID"` injects bad enum values into store
5. **Cascade dispatch abuse**: Reject a blocker → auto-dispatches approved dependents without calling `/dispatch`

### Sequential docId as Information Oracle

`generateDocId()` in `utils/id.ts` uses a module-level counter. Any item response reveals the approximate total item count via `docId: "WI-NNN"`. Combine with unlimited `limit` for full enumeration.

### Non-Findings (Ruled Out)

- `status` field cannot be set via `PATCH /:id` — `allowedFields` array correctly excludes it
- Stack traces not leaked to clients — `errorHandler` middleware returns generic 500; the per-route catch blocks leak `message` only (not `stack`)
- `Routing` status is never persisted to the store — it's a transient history-only state; `VALID_STATUS_TRANSITIONS[routing→approved]` is effectively dead code
