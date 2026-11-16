# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-11-16

### Architecture Patterns
- **No auth layer exists anywhere.** The Express app (`app.ts`) applies only `express.json()` and a debug logger. Every endpoint is completely anonymous. All findings are amplified by this root cause.
- **In-memory store only.** No database — `workItemStore.ts` uses a `Map<string, WorkItem>`. No SQL injection surface. IDOR is irrelevant for data isolation (no multi-tenancy). Attack surface is entirely state-machine manipulation and business logic.
- **Soft-delete is `findById`-filtered.** `findById` returns `undefined` for deleted items; all route handlers use `findById`. Direct IDOR to soft-deleted items via the route layer is NOT possible. However, soft-deleted items still appear in internal collections (`items.get(id)`) used by dependency functions — leading to PEN-007.

### High-Value Attack Patterns Unique to This Codebase
1. **`overrideRoute: "fast-track"` is the fastest state machine bypass.** One POST to `/route` skips the entire assessment pod.
2. **The cascade auto-dispatch in `onItemResolved` is a force-multiplier.** It fires on rejection (not just completion). Combine with unauthenticated approve + dependency injection for a full anonymous dispatch chain.
3. **Pagination `limit` has no cap.** `?limit=999999` returns everything. This is confirmed from code — no `Math.min` or guard applied.
4. **Intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) have no auth and no enum validation for `type`/`priority`.** Main CRUD endpoint validates these; intake does not. These are separate code paths.
5. **`docId` counter (`WI-001`, `WI-002`, ...) is sequential and persistent.** Leaks total item creation volume and soft-delete count.

### IDOR Notes
- Routes use internal UUIDs as `:id` — these are v4 UUIDs from the `uuid` package. Not guessable.
- `docId` values (`WI-NNN`) are enumerable but not used as the lookup key in any route — only UUID `:id` is used for `findById`. So `docId` is informational only.

### Dependency Service Quirks
- `computeHasUnresolvedBlockers` treats a soft-deleted blocker as unresolved (returns `true`). This is a permanent DoS vector.
- `removeDependency` gracefully handles a missing/deleted blocker — it skips the reverse-link cleanup. So removing a dependency from a blocked item when the blocker is deleted will succeed and clear the blockage.

### Assessment Service Notes
- When an item is in `reviewing` status and `/assess` is called again, a spurious `reviewing → reviewing` change history entry is added. The assessment runs fine but the audit log is polluted.
- Assessment pod verdict mapping: `NeedsClarification` from domain expert maps to `Rejected` in pod lead logic (line 118: `if (rejections > 0)` only checks `Reject` verdicts; `NeedsClarification` falls into `else if (clarifications.length > 0)` → `targetStatus = Rejected`). This means a domain expert's "needs clarification" produces a full rejection in the final status.

### Files That Warrant Close Watch in Future Runs
- `services/dependency.ts` — complex state management, cascade logic, cycle detection
- `routes/workflow.ts` — all state transition endpoints, `overrideRoute` handling
- `routes/intake.ts` — no-auth webhook receivers, missing enum validation
- `store/workItemStore.ts` — `updateWorkItem` takes `Partial<WorkItem>` with no field restrictions — callers could theoretically update any field including `id` or `docId`
