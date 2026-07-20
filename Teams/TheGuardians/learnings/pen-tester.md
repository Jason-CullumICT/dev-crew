# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-07-20

### Architecture Notes
- **Zero-auth surface**: The entire Express backend (port 3001) has NO authentication middleware anywhere. All 11 routes and 5 sub-routes are fully unauthenticated. Future runs should confirm this hasn't changed before proceeding to deeper analysis.
- **In-memory store**: All data lives in a `Map<string, WorkItem>` in `workItemStore.ts`. The store is ephemeral — a server restart clears all state and resets the `docId` counter.
- **ID scheme**: Work items have two IDs — a UUID (`id`) used for API references and a sequential human-readable `docId` (`WI-001`, `WI-002`...) used for display. The UUID is the authoritative key; the docId is cosmetic.

### IDOR-Prone Routes
- `GET/PATCH/DELETE /api/work-items/:id` — no ownership check. Any caller who knows (or guesses) a UUID can read, modify, or delete any item.
- `POST /api/work-items/:id/approve|reject|dispatch|route|assess` — same UUID guessing enables full workflow manipulation.
- UUIDs are generated via `uuid v4` (random), making enumeration harder — but with zero auth, any ID obtained from list endpoints is immediately exploitable.

### Business Logic Hotspots
1. **`overrideRoute` fast-track bypass** (`workflow.ts:57`, `router.ts:66`): The most impactful single-parameter exploit. Sending `{"overrideRoute": "fast-track"}` on any `backlog` item bypasses the entire assessment pod.
2. **Soft-delete + dependency deadlock** (`dependency.ts:64-75`, `store/workItemStore.ts:23-26`): `findById` returns `undefined` for deleted items; `computeHasUnresolvedBlockers` treats `undefined` blocker as "unresolved." Permanently blocks any dependent item from dispatch.
3. **Intake enum bypass** (`intake.ts:19-25`): Truthy-or-default pattern (`body.type || WorkItemType.Bug`) accepts any non-empty string as a valid type. Standard `/api/work-items` POST does proper enum validation — intake is the gap.
4. **Cascade dispatch via rejection** (`dependency.ts:251-315`, `onItemResolved`): Rejecting an item triggers `onItemResolved` which auto-dispatches dependent approved items directly via `store.updateWorkItem`, bypassing route handler checks.

### State Machine Map
```
backlog → routing → proposed → reviewing → approved → in-progress → completed
                ↘           ↘           ↓                         → failed → backlog
                  approved    rejected → backlog
```
- `overrideRoute: fast-track` collapses `backlog → routing → approved` in one call.
- `approve` endpoint allows `routing → approved` (direct skip of assessment).
- Cascade dispatch handles `approved → in-progress` outside normal route handler.

### Attack Surface Quick Reference
| Endpoint | Auth? | Notable Risk |
|----------|-------|-------------|
| `POST /api/work-items` | None | Stored XSS in title/description |
| `GET /api/work-items` | None | Unbounded limit param, full dump |
| `PATCH /api/work-items/:id` | None | blockedBy bulk replace, allowlist enforced |
| `DELETE /api/work-items/:id` | None | Soft-delete deadlocks dependents |
| `POST /:id/route` | None | overrideRoute=fast-track is critical bypass |
| `POST /:id/assess` | None | Re-entrant on `reviewing` status |
| `POST /:id/approve` | None | No role check at all |
| `POST /:id/dispatch` | None | team override, gating logic bypassable |
| `POST /api/intake/zendesk` | None | No enum validation, no HMAC |
| `POST /api/intake/automated` | None | Same as zendesk |
| `GET /api/dashboard/*` | None | Full operational data exposed |
| `GET /metrics` | None | Prometheus data, version info |
| `GET /api/search` | N/A | Route does not exist; frontend dead code |

### What to Check First on Future Runs
1. Confirm authentication has been added — look for `app.use(authMiddleware)` before route mounts in `app.ts`.
2. Check if `overrideRoute` has been removed or gated behind a role check.
3. Check `computeHasUnresolvedBlockers` — see if soft-deleted items are handled as resolved.
4. Check intake endpoints for added enum validation.
5. Check `GET /api/work-items` for a maximum `limit` cap.
