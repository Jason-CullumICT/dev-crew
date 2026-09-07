# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-09-07

### Architecture Observations
- **Zero auth layer** — this is the dominant finding. Every downstream vulnerability (IDOR, state bypass, data exfiltration) is trivially exploitable because there is no middleware gate. When auth is eventually added, re-run full analysis.
- **In-memory Map store** (`workItemStore.ts`) — all data is ephemeral. Red team must complete all exploit chains in a single server session. Store resets on restart. No persistence means no injection of persistent payloads.
- **`findById` soft-delete filter** — soft-deleted items are filtered at `findById` but NOT in the raw `items.get(id)` path used by `updateWorkItem` and `softDelete`. The dependency service uses `findById`, creating the soft-deleted-blocker-as-unresolved-blocker DoS (PEN-006).

### IDOR-Prone Routes (All routes are IDOR-prone due to no auth, but these are highest value)
- `POST /api/work-items/:id/approve` — promotes any item, zero auth
- `POST /api/work-items/:id/dispatch` — dispatches any item to a team, zero auth
- `DELETE /api/work-items/:id` — soft-deletes any item, zero auth
- `POST /api/work-items/:id/dependencies` — can add/remove dependency links on any item

### State Machine Logic Flaw Hotspots
- **`overrideRoute` param in `/route` endpoint** — this is the primary fast-path to bypass the assessment pod. `classifyRoute()` in `services/router.ts` short-circuits on `overrideRoute` before any validation.
- **`DISPATCH_TRIGGER_STATUSES` includes `Rejected`** — rejection cascades dispatch to dependent items. Business intent is unclear; red team should verify if this is a spec defect or intentional tolerance.
- **`VALID_STATUS_TRANSITIONS` allows `routing → approved`** — the `routing` transient state can transition directly to `approved`, meaning if an attacker can hold an item in `routing` and call approve, they jump the state machine.

### Intake Webhook Attack Surface
- Both `/api/intake/zendesk` and `/api/intake/automated` lack HMAC validation.
- Only `title` and `description` are required; `type` and `priority` fall back to defaults but are NOT enum-validated when provided — unlike the main work-item creation endpoint.
- These endpoints are the easiest path to injecting items with controlled metadata (type, priority).

### Pagination / Query Parameter Notes
- No `limit` cap anywhere — `limit=2147483647` dumps all records.
- `parseInt` used throughout without bounds checking — `NaN`, negative, and zero values all silently misbehave.
- Dashboard activity endpoint (`/api/dashboard/activity`) also has no limit cap — exposes all change history.

### Frontend XSS Assessment
- React renders all user-controlled fields (`title`, `description`, `notes`, `reason`, `changeHistory` entries) via JSX text nodes — no `dangerouslySetInnerHTML` found anywhere. XSS via stored content is NOT exploitable via the React frontend.
- The `HistoryEntry` component calls `String(entry.oldValue)` and `String(entry.newValue)` — converts arbitrary values to string safely within JSX.

### Missing Routes
- `/api/search` is referenced in the frontend API client (`client.ts:101`) but not mounted in `app.ts`. The DependencyPicker typeahead silently fails (404) in production.
- `/api/work-items/:id/transition` appears in `security.config.yml` critical entry points but is NOT implemented — individual action endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) serve as the transition layer.
- `/api/work-items/:id/assessment` (with "ment") is NOT implemented; only `/assess` exists.
