# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-10-19

### Architecture Pattern
- **Tech stack:** Express (TypeScript), React + Vite frontend, in-memory Map store (no DB/ORM), Prometheus metrics
- **No persistence layer** — store is `let items: Map<string, WorkItem>` in process memory; resets on restart
- **No auth layer** — zero middleware for authentication or authorization across all routes
- **State machine** lives in `Source/Shared/types/workflow.ts` (`VALID_STATUS_TRANSITIONS` dict)

### High-Value Attack Surfaces

#### 1. Fast-Track Route Override (PEN-003)
`POST /api/work-items/:id/route` body `{"overrideRoute":"fast-track"}` bypasses assessment for ANY item.
- Handler: `Source/Backend/src/routes/workflow.ts:57`
- Service: `Source/Backend/src/services/router.ts:66-88`
- No authorization check on `overrideRoute`

#### 2. Direct Approve Override (PEN-002)
`POST /api/work-items/:id/approve` — valid for items in `routing`, `proposed`, or `reviewing`. Assessment pod never called.
- Handler: `Source/Backend/src/routes/workflow.ts:94-142`
- Transition table in `Source/Shared/types/workflow.ts:215-224` — `Proposed → Approved` is valid

#### 3. Soft-Delete Blocker DoS (PEN-006)
Soft-deleting a blocker item leaves its dependency links in the blocked item's `blockedBy` array. `findById` returns `undefined` for soft-deleted items, which `computeHasUnresolvedBlockers` treats as "unresolved", permanently blocking dispatch.
- `Source/Backend/src/services/dependency.ts:64-75`
- `Source/Backend/src/store/workItemStore.ts:23-27` — `softDelete` does NOT cascade to remove reverse dependency links

#### 4. Intake Endpoints — No Auth, No Enum Validation (PEN-004)
`/api/intake/zendesk` and `/api/intake/automated` accept arbitrary `type`/`priority` strings; no enum guards.
- `Source/Backend/src/routes/intake.ts:22-23, 46-47`

#### 5. No Pagination Maximum (PEN-005)
`?limit=999999` returns ALL items. `findAll` applies no cap.
- `Source/Backend/src/store/workItemStore.ts:30-63`

### Logic Flow Hotspots

| Operation | File | Line | Risk |
|---|---|---|---|
| Route override acceptance | `routes/workflow.ts` | 57 | High — unauthenticated bypass |
| Manual approve | `routes/workflow.ts` | 106 | High — skips assessment pod |
| Cascade auto-dispatch | `services/dependency.ts` | 267 | Medium — rejection triggers dispatch |
| Soft-delete with dead links | `store/workItemStore.ts` | 78-88 | Medium — no cascade cleanup |
| Intake type field | `routes/intake.ts` | 22 | Medium — invalid enum stored |

### IDOR-Prone Routes
- All `/:id` routes accept any UUID — no ownership check, no role check
- IDs are generated with `generateId()` (see `Source/Backend/src/utils/id.ts`) — investigate for sequential vs UUID pattern in next run
- `docId` is sequential (`WI-001`, `WI-002`, ...) — enumerable for targeted lookup

### Important Notes for Next Run
- Check `Source/Backend/src/utils/id.ts` for ID generation algorithm — if sequential, direct ID enumeration is trivial
- Check whether `docId` (sequential `WI-NNN`) is exposed in any route for lookup — currently only `id` (UUID) is used for `findById`
- The `GET /search` route is referenced in the frontend API client (`Source/Frontend/src/api/client.ts:101`) but NOT registered in `app.ts` — always returns 404; could be a planted endpoint that appears in future versions
- `/metrics` endpoint leaks team names `TheATeam`/`TheFixer` and verdict distributions
