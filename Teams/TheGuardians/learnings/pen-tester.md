# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-08-17

### Architecture Observations

- **Zero auth layer.** `app.ts` mounts no auth middleware. This is a root cause, not just a misconfiguration. All workflow state changes, data reads, and webhooks are accessible to any caller.
- **In-memory store** (`workItemStore.ts`): all data lives in a `Map<string, WorkItem>`. No persistence. Process restart loses all data. Attack surface is limited to the single process lifetime.
- **Dual ID scheme:** items have both a UUID `id` (random, not guessable) and a sequential `docId` (`WI-001`, `WI-002`, ...). The `id` is used in all API routes — sequential IDs are display-only. Brute-force ID enumeration is not practical via UUIDs.

### IDOR-Prone Routes

- **All routes are IDOR-vulnerable** due to zero auth. The theoretical IDOR severity is elevated only by PEN-001.
- `GET /api/work-items/:id` — returns full item including change history and assessments.
- `POST /api/work-items/:id/approve` and `/reject` — no ownership check.
- `POST /api/work-items/:id/dependencies` — any caller can link any two items bidirectionally.

### Logic Flaw Hotspots

1. **`classifyRoute()` in `router.ts`** — `overrideRoute` parameter is completely unchecked. Any value from `WorkItemRoute` enum bypasses classification logic. Fast-track directly sets `targetStatus = Approved`.

2. **`computeHasUnresolvedBlockers()` in `dependency.ts`** — treats soft-deleted blockers as "unresolved" because `findById` returns `undefined` for deleted items. Soft-delete does not cascade to dependency links. Permanent dispatch block DoS is achievable.

3. **`runAssessmentPod()` / `assessWorkItem()` in `assessment.ts`** — `NeedsClarification` verdict maps to `Rejected` status (not a holding state). Items without `complexity` always get NeedsClarification from domain-expert, therefore always get hard-rejected on first assessment.

4. **`onItemResolved()` in `dependency.ts`** — cascade dispatch fires synchronously on reject. Rejecting a blocker auto-dispatches all Approved dependents with no authorization step.

5. **Intake routes in `intake.ts`** — `type` and `priority` from webhook body are not enum-validated. Arbitrary string injection into the domain model is possible.

### Attack Patterns Unique to This Codebase

- **Fast-track override attack**: `POST /:id/route` with `{"overrideRoute": "fast-track"}` is the primary state machine bypass.
- **Cascade dispatch pivot**: Set up dependency, approve dependent, reject blocker → triggers auto-dispatch with no human review.
- **Blocker-freeze DoS**: Add dependency on target, soft-delete the blocker → target stuck in Approved forever (without removing the dependency link).
- **Intake injection**: `/api/intake/zendesk` and `/api/intake/automated` accept `type`/`priority` without enum validation — regular `POST /api/work-items` does validate.

### Checked & Safe

- PATCH `/api/work-items/:id` — correctly filters to `allowedFields = ['title', 'description', 'type', 'priority', 'complexity']`. `status`, `changeHistory`, `assessments`, `deleted` cannot be injected via PATCH.
- Cycle detection in `dependency.ts` — BFS implementation is correct. Self-reference and circular dependencies are properly blocked.
- Soft-delete IDOR — `updateWorkItem` in the store correctly checks `item.deleted`; route handlers use `findById` which returns `undefined` for deleted items. No direct soft-delete bypass via public API.
- Assessment double-validation — both the route handler and `assessWorkItem()` service validate status pre-condition. No single point of bypass.

### Key Files for Future Runs

| File | Why it matters |
|------|---------------|
| `Source/Backend/src/app.ts` | Auth middleware would be added here |
| `Source/Backend/src/routes/workflow.ts` | All state transitions + dependency endpoints |
| `Source/Backend/src/services/dependency.ts` | Cascade dispatch logic, blocker resolution |
| `Source/Backend/src/services/assessment.ts` | NeedsClarification→Rejected mapping |
| `Source/Backend/src/routes/intake.ts` | Unvalidated intake webhook fields |
| `Source/Backend/src/store/workItemStore.ts` | findById vs items.get() difference matters for deleted-item handling |
