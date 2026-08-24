# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-08-24

### Architecture Patterns Unique to This Codebase

- **In-memory Map store with direct object references** — `store.findById()` returns the live Map value, not a clone. Every workflow route mutates `item.changeHistory` in-place before calling `updateWorkItem`. This is a structural race condition under concurrent requests — no locking exists.

- **Zero-auth Express app** — No authentication middleware anywhere. All routes are fully open. Do not waste time looking for auth bypass — there is none to bypass.

- **`NeedsClarification` verdict silently collapses to `Rejected`** — In `assessment.ts:runAssessmentPod`, the only positive branch is `Approve`; all other verdicts (including `NeedsClarification`) set `targetStatus = Rejected`. Items without `complexity` set will be automatically rejected, triggering `onItemResolved` cascade. This is exploitable for unauthorized cascade dispatch.

- **Intake routes skip enum validation** — `POST /api/intake/zendesk` and `/automated` pass `body.type` and `body.priority` directly to store without validating against WorkItemType/WorkItemPriority enums. The main `/api/work-items` POST route validates; intake routes do not.

- **`overrideRoute` is unchecked** — Any string sent as `overrideRoute` in the route action is stored as `item.route` without enum validation. Only the `=== "fast-track"` comparison gates fast-track behavior.

- **Soft-deleted blocker creates permanent dispatch block** — When a blocker item is soft-deleted, `computeHasUnresolvedBlockers` treats the missing item as unresolved (`!blocker → true`), permanently blocking dependent items from dispatch. The dependent's `/ready` response leaks the deleted item's UUID.

### IDOR-Prone Routes

- `GET /api/work-items/:id/ready` — leaks deleted item UUIDs via `unresolvedBlockers[].blockerItemId`
- `POST /api/work-items/:id/dependencies` — the error message format reveals whether an ID exists or is "not found"

### Logic Flaw Hotspots

- `services/assessment.ts:161-173` — NeedsClarification → Rejected collapse
- `services/router.ts:66-88` — overrideRoute with no enum guard
- `routes/workflow.ts:113-127` — direct `item.changeHistory.push()` on live reference before updateWorkItem
- `routes/workItems.ts:60-75` — no max limit cap on pagination

### Critical Entry Points (High Exploitation Confidence)

1. `POST /api/work-items/:id/route` with `{ "overrideRoute": "fast-track" }` — direct path to Approved without assessment
2. `GET /api/work-items?limit=9999999` — full data enumeration
3. `POST /api/intake/zendesk` — unauthenticated item injection with invalid enum fields
4. `POST /api/work-items/:id/assess` on item with no complexity — triggers NeedsClarification cascade
