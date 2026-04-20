# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-04-20

### Architecture Pattern (Codebase-Specific)
- **In-memory store only** (`Source/Backend/src/store/workItemStore.ts`): No SQL/NoSQL. No injection risk. All data is a `Map<string, WorkItem>`. Data resets on server restart. Focus is on logic flaws, not DB injection.
- **No authentication at all**: The entire API is completely anonymous. Every endpoint is open. Do not spend time searching for auth bypass — there is no auth to bypass.
- **No RBAC at all**: All role checks (router-service, manual-override, dispatcher) are labels in `changeHistory` only — they are never enforced at the API layer.

### High-Value Attack Vectors (Unique to This Codebase)
1. **`POST /:id/route {"overrideRoute":"fast-track"}`** — The single most powerful business logic bypass. Any backlog item → Approved in one call. No role check. Documented as PEN-003.
2. **`PATCH /:id {"blockedBy":[]}`** — Silently clears all dependency gates on any item, enabling immediate dispatch of blocked-approved items. Documented as PEN-009.
3. **`onItemResolved()` cascade** — Triggered by rejection only (not approval). Rejecting a `Proposed` blocker that has multiple `Approved` dependents triggers mass auto-dispatch. Documented as PEN-008.
4. **Soft-delete + stale blockedBy** — Deleting a blocker item leaves stale `DependencyLink` entries in the dependent's `blockedBy` array. `computeHasUnresolvedBlockers()` treats `findById() === undefined` as "unresolved", permanently blocking dispatch. Documented as PEN-013.

### State Machine Notes
- `VALID_STATUS_TRANSITIONS` is strictly enforced in workflow route handlers.
- Terminal states: `Completed → []` (no exits), `Rejected → Backlog`, `Failed → Backlog`.
- `Routing` is a transient state — items pass through it atomically in `routeWorkItem()` and should never be stuck there in normal operation.
- `onItemResolved` only fires for `DISPATCH_TRIGGER_STATUSES = [Completed, Rejected]` — not for Failed.
- Assessment pod (`assessWorkItem`) is deterministic: same item always gets same verdict. No random/AI component.

### IDOR-Prone Routes (All Routes)
All `:id` routes are IDOR-vulnerable — no ownership check exists anywhere.
Priority targets for red-team: `/approve`, `/reject`, `/dispatch`, `/dependencies`, PATCH, DELETE.

### Filter Injection Reminder
Query params `?status`, `?type`, `?priority`, `?source` are cast to enum types without validation on the route (only `as WorkItemStatus` cast in TypeScript, no runtime enum check). The store's `findAll` does direct string equality comparison. No injection risk due to in-memory Map, but passing unknown status values results in empty filter (no items match), leaking that the enum value is invalid by returning all items (since the filter branch is skipped when the value doesn't match any real item).

### Intake Webhooks
`POST /api/intake/zendesk` and `POST /api/intake/automated` — no HMAC, no shared secret, no rate limiting. The `type` and `priority` fields from these endpoints use `|| default` fallback — invalid enum values silently fall to defaults (Bug/Issue, Medium). No error returned for invalid type/priority in intake routes (unlike the main `POST /api/work-items` which does explicit enum validation).

### Frontend
- No auth tokens anywhere in the frontend — all API calls use `Content-Type: application/json` only.
- Client-side status guards (button visibility based on item status) are all bypassable via direct API calls.
- `DependencyPicker` calls `GET /search?q=...` — this endpoint does NOT exist in the backend (no search route registered). This will return a 404. Do not spend time on XSS via search query.
- `DebugPortalPage` embeds `iframe src={VITE_PORTAL_URL}` — build-time open redirect, low priority.
