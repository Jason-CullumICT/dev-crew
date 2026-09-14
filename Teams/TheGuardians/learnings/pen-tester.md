# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-09-14

### Architecture Observations
- **No authentication layer exists** — this is the root finding. All other vulnerabilities are direct consequences.
- The backend is a pure Express app (`Source/Backend/src/app.ts`) with no auth middleware registered at any level. All routes are public.
- Data store is **in-memory** (a `Map<string, WorkItem>`) — no SQL, no NoSQL, so classic injection (SQLi) is not applicable. The store is process-local and ephemeral.
- **All workflow state transitions are enforced in route handlers and service functions**, not in middleware. This means the enforcement is bypassable by calling endpoints out of the intended sequence (though the routes themselves do check current status).

### High-Value Attack Patterns Unique to This Codebase

1. **Fast-Track Override (PEN-003):** `POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` jumps any backlog item directly to `approved`. This is the fastest state-machine bypass.

2. **Soft-Delete DoS on Dispatch (PEN-007):** Soft-deleting a blocker item while it is in a non-resolved status permanently blocks dependent items. `computeHasUnresolvedBlockers` treats `findById() === undefined` (soft-deleted) as "still blocking." Recovery requires `PATCH /api/work-items/{blocked}/` with `{"blockedBy":[]}` to bulk-clear the stale dependency links.

3. **Intake Enum Injection (PEN-006):** `POST /api/intake/zendesk` and `/automated` accept arbitrary `type` and `priority` strings without enum validation. The main CRUD endpoint validates enums; the intake webhooks do not. This creates items with invalid field values.

4. **Dashboard as Recon Tool (PEN-011):** `GET /api/dashboard/queue` returns all items across all statuses in a single unauthenticated call — far more efficient than paginating through `GET /api/work-items`. Best starting point for ID enumeration.

5. **Cascade Reject DoS (PEN-012):** Star-topology dependency graph (one hub blocking N approved items) + single reject on hub = N synchronous auto-dispatches. No depth or breadth limit.

### IDOR-Prone Routes
All routes taking `:id` are IDOR-prone because there is no ownership model and no authentication. The most impactful are:
- `POST /api/work-items/:id/approve` — no auth, can approve any item
- `POST /api/work-items/:id/dispatch` — no auth, can dispatch any approved item to any valid team
- `DELETE /api/work-items/:id` — no auth, can soft-delete any item (then use PEN-007)

### Logic Flaw Hotspots
- `Source/Backend/src/services/dependency.ts` — `computeHasUnresolvedBlockers` does not distinguish between "blocker not found (soft-deleted)" and "blocker exists but unresolved." Both return `true`.
- `Source/Backend/src/services/assessment.ts` — `assessAsWorkDefiner` uses a `switch(item.type)` with no `default` case. Invalid type values silently produce an empty `suggestedChanges` array.
- `Source/Backend/src/routes/workflow.ts` — `onItemResolved` is called from the reject endpoint but NOT from the approve or complete endpoints (would need to verify via dispatch flow). Check if there are unintended cascade paths.

### Not Applicable
- SQL injection: in-memory Map store, no database queries.
- SAST secret-scanning: no credentials found in source (delegated to static-analyzer).
- XSS in backend: backend returns JSON only; XSS risk is frontend rendering concern.
