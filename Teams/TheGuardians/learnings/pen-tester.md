# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-06-01

### Architecture Fingerprint
- **Stack:** Express 4 / TypeScript / in-memory Map store / no database / no external HTTP calls
- **No authentication layer exists** — this is the dominant finding every run until fixed
- **State machine enforced via VALID_STATUS_TRANSITIONS** — cannot PUT arbitrary status; must use workflow endpoints
- **IDs:** UUID (internal `id`), sequential `WI-NNN` (`docId`). Both returned on creation. DocId is predictable.

### Attack Surfaces Unique to This Codebase

1. **Fast-track override is the primary state machine bypass path**  
   `POST /api/work-items/:id/route` with `{"overrideRoute": "fast-track"}` → directly to `approved`.  
   No auth guard. No access control on `overrideRoute`.

2. **Intake endpoints have no HMAC/secret validation AND no enum validation**  
   `/api/intake/zendesk` and `/api/intake/automated` accept unvalidated `type` and `priority` from body.  
   Compare to `/api/work-items` POST which validates both. This is an asymmetry to recheck every run.

3. **Cascade dispatch is triggered by REJECTION, not just completion**  
   `DISPATCH_TRIGGER_STATUSES = [Completed, Rejected]` — rejecting a blocker dispatches dependents.  
   This is a business logic flaw: rejected → dependent dispatched is semantically wrong.

4. **Soft-delete does NOT clean up dependency links**  
   After `DELETE /api/work-items/<blockerId>`, dependent items remain permanently blocked.  
   `computeHasUnresolvedBlockers` returns `true` when `findById` returns undefined (deleted).

5. **No maximum `limit` on pagination**  
   `?limit=999999` returns all items. No cap exists in `findAll` or the route handler.

6. **`/api/search` referenced in frontend client but NOT implemented in backend**  
   `DependencyPicker` typeahead is broken. Flag for future: if implemented naively with `new RegExp(q)`, ReDoS risk.

7. **The `security.config.yml` lists `/api/work-items/:id/transition`** — this route does not exist.  
   Actual transition routes: `/route`, `/assess`, `/approve`, `/reject`, `/dispatch`.

### IDOR-Prone Routes
- All `/:id` routes accept UUIDs with no ownership check. Any caller with a UUID can act on any item.
- DocId pattern `WI-NNN` is predictable — can enumerate by incrementing N.
- `GET /api/work-items/:id` leaks full item including `changeHistory`, `assessments`, `blockedBy`, `blocks`.

### Logic Flaw Hotspots
- `assessWorkItem`: `NeedsClarification` verdict → `Rejected` status (silent mapping, may confuse business intent)
- `assessWorkItem`: If item is already in `reviewing`, first change entry records `reviewing → reviewing`
- `onItemResolved`: called on rejection, auto-dispatches approved dependents — semantically wrong
- `approve` endpoint: `routing → approved` is a valid transition, but `routing` is meant to be transient-only

### Metrics to Count for Pipeline Report
- PEN-001, PEN-002: Critical (2 critical)
- PEN-003, PEN-004, PEN-005: High (3 high)
- PEN-006, PEN-007, PEN-008, PEN-009, PEN-010: Medium (5 medium)
- PEN-011, PEN-012, PEN-013: Low (3 low)
- Total: 13 findings
