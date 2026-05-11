# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-05-11

### Architecture Notes

- **No authentication or authorization exists anywhere.** The entire API surface is public. Every future scan should start by confirming this hasn't changed — look for auth middleware registered in `Source/Backend/src/app.ts` before `app.use('/api/...')`.
- **In-memory Map store** (`Source/Backend/src/store/workItemStore.ts`). No database. All state is ephemeral. `findById` returns the live Map reference (not a copy) — mutations to returned objects affect the stored state directly. This is an important data-flow property for tracing write paths.
- **TypeScript types are compile-time only.** There is zero runtime enum validation except in the main `POST /api/work-items` and `PATCH /api/work-items/:id` endpoints. Intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) accept arbitrary `type` and `priority` strings.

### High-Value Logic Flaws Unique to This Codebase

1. **`overrideRoute: "fast-track"` bypasses assessment pod.** `POST /api/work-items/:id/route` with body `{"overrideRoute":"fast-track"}` sets status to `Approved` directly. No auth check. This is the fastest path to a full workflow bypass.

2. **Cascade dispatch exploitable via dependency injection.** `onItemResolved()` in `dependency.ts` is called from the `/reject` endpoint but NOT from `assessWorkItem()`. Rejecting a blocker triggers auto-dispatch of dependents. An attacker can inject a dependency onto any `Approved` item (POST `/api/work-items/:id/dependencies`), create their own blocker, then immediately reject the blocker to cascade-dispatch the victim. This is the primary state machine abuse vector.

3. **`NeedsClarification` → `Rejected` inconsistency.** The assessment pod's `NeedsClarification` verdict silently maps to `Rejected` status (items without `complexity` field trigger this). Unlike `/reject`, `assessWorkItem` does NOT call `onItemResolved`, so the cascade is NOT triggered. However, the item's blocker status becomes `Rejected` (= resolved), silently unblocking dependents for manual dispatch.

4. **Soft-deleted items leak UUIDs via `isReady()`.** When a blocker is soft-deleted, `findById` returns `undefined`, and `isReady()` includes the orphaned `DependencyLink` (with full UUID and docId) in the `unresolvedBlockers` response. Also, a soft-deleted blocker permanently blocks the dependent's dispatch without any cleanup mechanism.

5. **Sequential docId (`WI-001`, `WI-002`) is predictable.** The counter resets on server restart. DocIds are exposed in all responses and logged.

### IDOR-Prone Routes

- `GET /api/work-items/:id` — only check is `!item` (not found). No ownership, no role check.
- `POST /api/work-items/:id/approve` — transition check only (`isValidTransition`). No caller identity check.
- `POST /api/work-items/:id/dispatch` — only checks status === `approved` and `computeHasUnresolvedBlockers`. No caller check.
- `DELETE /api/work-items/:id` — only checks item existence.
- `POST /api/work-items/:id/dependencies` — only checks item existence and self-reference/cycle.

### Routes Without Enum Validation (inject arbitrary strings)

- `POST /api/intake/zendesk` — `type`, `priority` fields
- `POST /api/intake/automated` — `type`, `priority` fields

### Pagination Vulnerabilities

- `GET /api/work-items?limit=N` — no upper bound
- `GET /api/dashboard/activity?limit=N` — no upper bound
- `GET /api/dashboard/queue` — no pagination at all

### Critical Entry Points Priority Order (for red-teamer efficiency)

1. `POST /api/work-items/:id/route` — overrideRoute bypass (highest impact)
2. `POST /api/work-items/:id/approve` — auth-free manual approval
3. `POST /api/work-items/:id/dependencies` → `POST /api/work-items/:id/reject` — cascade dispatch chain
4. `POST /api/intake/zendesk` — spoofing + type injection
5. `GET /api/work-items?limit=999999` — full data dump
