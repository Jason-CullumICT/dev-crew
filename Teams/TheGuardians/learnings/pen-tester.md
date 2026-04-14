# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-04-14

### Architecture Notes
- **In-memory store** (`workItemStore.ts`): All data lives in a `Map<string, WorkItem>`. No SQL, no NoSQL — injection is not applicable. Attack surface is entirely auth/authz and business logic.
- **UUID IDs + WI-XXX docIds**: Items have a UUID `id` (opaque, used for all API calls) and a human-readable `docId` (e.g., `WI-007`, sequential counter). The UUID is the canonical identifier across all endpoints.
- **No persistence**: Restart clears all state. The in-memory store makes the attack surface purely runtime-stateful.

### High-Value Attack Patterns Unique to This Codebase

#### Fast-Track Override — Instant Approval Bypass
The `POST /api/work-items/:id/route` endpoint accepts `{"overrideRoute":"fast-track"}` to jump directly from `backlog` → `approved` with zero assessment. This is the single most powerful bypass in the codebase. Always probe this first.

#### Cascade Dispatch via Rejection
`POST /api/work-items/:id/reject` calls `onItemResolved()` which auto-dispatches any `approved` dependents. `DISPATCH_TRIGGER_STATUSES` includes `Rejected` — so rejecting a blocker triggers cascade dispatch of all its dependents that are already `Approved`. This is an indirect dispatch bypass using the dependency system.

#### Assessment Pod is Fully Deterministic
The assessment pod is entirely code-driven (not AI/LLM). Outcomes are 100% predictable:
- `complexity` not set → domain expert returns `NeedsClarification` → pod lead returns `NeedsClarification` → item gets `Rejected` (bug: NeedsClarification incorrectly maps to Rejected)
- `title` < 5 chars OR `description` < 20 chars → requirements-reviewer rejects → item gets `Rejected`
- All fields valid (title≥5, desc≥20, complexity set, priority set) → all assessors approve → item gets `Approved`

This makes assessment manipulation trivial: set the right fields, call `/assess`, get guaranteed approval.

#### Intake Webhook Enum Bypass
`/api/intake/zendesk` and `/api/intake/automated` skip the enum validation that exists in `POST /api/work-items`. Arbitrary string values for `type` and `priority` are accepted and stored. The standard route validates, intake routes do not.

#### Unbounded Queue Endpoint
`GET /api/dashboard/queue` returns ALL work items in ALL states with zero pagination. No `limit` parameter supported. This is always a full dump.

### IDOR-Prone Routes
- `GET /api/work-items/:id` — No ownership check; any UUID returns the item
- `PATCH /api/work-items/:id` — No ownership check; any client can update any item
- `DELETE /api/work-items/:id` — No ownership check; any client can soft-delete any item
- All workflow endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) — no ownership or role check

### Logic Flaw Hotspots
1. **`assessment.ts:162–168`** — `NeedsClarification` maps to `Rejected` (else branch catches all non-Approve verdicts)
2. **`dependency.ts:251–315`** — `onItemResolved()` only called from `/reject` route, NOT from `/dispatch` when item completes. Completion never triggers cascade — only rejection does.
3. **`workItemStore.ts:67`** — `updateWorkItem` uses `Object.assign(item, updates)` — all `Partial<WorkItem>` fields are overridable if passed through. Route handlers must filter inputs before calling this.
4. **`router.ts:66–75`** — `overrideRoute` accepted from any caller with no privilege check

### No Authentication — Scope of Impact
The entire API has zero auth middleware. This is not a misconfiguration — there is simply no auth code anywhere. Every finding is reachable without credentials. The red teamer should not waste time trying to bypass auth that doesn't exist; focus on business logic exploitation.

### Soft Delete Pattern
`findById()` returns `undefined` for deleted items, protecting against direct access. However:
- Dependency links on other items still contain the deleted item's UUID and docId
- These are exposed in dispatch gating error responses (`unresolvedBlockers` array)
- `removeDependency` works even when the blocker is soft-deleted (only requires the blocked item to exist)

### State Machine Summary (for exploitation reference)
```
backlog → [route] → routing → proposed  (full-review path)
backlog → [route, overrideRoute:fast-track] → approved  (BYPASS!)
proposed → [assess] → reviewing → approved|rejected
reviewing → [approve] → approved
approved → [dispatch] → in-progress
in-progress → completed|failed
rejected → backlog
failed → backlog
```
