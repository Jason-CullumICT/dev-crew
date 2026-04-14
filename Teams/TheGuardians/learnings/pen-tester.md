# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaw hotspots. -->

## Run: 2026-04-14

### Architecture Pattern: Zero-Auth In-Memory API
- This codebase has **no authentication or authorization middleware** at all. Every route is fully public. This is the single root cause enabling all other findings. Any future run should verify auth was added first before proceeding to secondary findings.
- The store is an in-memory `Map` — no persistence, no database, no SQL/NoSQL injection surface. Injection focus should shift to enum/type corruption and state machine manipulation.

### High-Value Attack Patterns for This Codebase

**1. Fast-Track Route Override (PEN-003)**
- `POST /api/work-items/:id/route` with body `{"overrideRoute":"fast-track"}` is the fastest path to assessment bypass. Single call takes an item from `backlog` to `approved` with zero assessment.
- The `overrideRoute` field is stored verbatim without enum validation — arbitrary strings can corrupt the `route` field.

**2. Intake Endpoint Enum Injection (PEN-004)**
- `/api/intake/zendesk` and `/api/intake/automated` skip enum validation for `type` and `priority`. These are the ONLY endpoints where non-enum string values can be injected into a WorkItem. The main `POST /api/work-items` correctly validates.

**3. Ghost Blocker DoS via Soft-Delete (PEN-008)**
- Soft-deleting a blocker item creates an unresolvable dependency ghost. `computeHasUnresolvedBlockers` treats `findById() === undefined` as "unresolved", permanently blocking dispatch of dependent items. This is a targeted DoS pattern unique to this app.

**4. Cascade Dispatch Abuse via Reject (PEN-007)**
- Rejecting a blocker triggers `onItemResolved()` which auto-dispatches dependents in `Approved` status. Combining "add dependency then reject blocker" is an alternative fast-path to dispatch bypass that doesn't require directly calling `/dispatch`.

**5. Unlimited Pagination (PEN-005)**
- No max-limit guard on `limit` parameter in `/api/work-items` or `/api/dashboard/activity`. `limit=999999` dumps the full dataset.

### IDOR-Prone Routes
- `GET /api/work-items/:id` — UUID required, no auth, but sequential `docId` (WI-001, WI-002...) in responses aids enumeration. Combine: observe any docId → infer UUID via `/api/work-items?page=1&limit=999999` dump.
- `POST /api/work-items/:id/dependencies` — soft-deleted item UUIDs exposed in dependency graph of live items. This is the main IDOR surface for deleted item access.

### State Machine Topology (for transition testing)
```
backlog → routing → proposed → reviewing → approved → in-progress → completed
                 ↘ (fast-track/override) ↗              ↘ failed → backlog
                                    ↘ rejected → backlog
```
- `routing → approved` is a valid transition (VALID_STATUS_TRANSITIONS), enabling PEN-002 approve-from-routing bypass.
- `proposed → approved` also valid — assessment pod is optional if you call `/approve` directly.

### Logic Flaw Hotspots
- `services/dependency.ts:computeHasUnresolvedBlockers()` — ghost blocker logic (PEN-008)
- `services/router.ts:classifyRoute()` — unvalidated overrideRoute (PEN-009)
- `routes/workflow.ts: onItemResolved()` call after reject — cascade dispatch (PEN-007)
- `routes/intake.ts` — no enum validation vs `routes/workItems.ts` which does validate (PEN-004)

### Non-Issues (Ruled Out)
- No SQL/NoSQL injection surface (in-memory Map store only)
- No template injection, command injection, or deserialization vectors found
- Error handler middleware correctly sanitizes unhandled errors — only route-level caught errors leak messages (PEN-014)
- `parseInt` NaN handling is safe due to `|| default` fallback in `findAll()`
