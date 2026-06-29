# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-06-29 — Initial Full Analysis

### Architecture Fingerprint
- **Backend:** Express.js, TypeScript, in-memory `Map` store (no DB — no SQL/NoSQL injection surface)
- **Auth:** **NONE** — zero authentication middleware anywhere. Every endpoint is public.
- **ID scheme:** UUID for `id` (store key), sequential `WI-001...` for `docId` (display). API lookups always by UUID.
- **State store:** Module-level `let items: Map<string, WorkItem>` in `workItemStore.ts`. Resets on restart.
- **Body parsing:** `express.json()` with no explicit size limit (defaults to 100kb).

### IDOR-Prone Routes
- `GET /api/work-items/:id` — direct by UUID, no auth. Returns full item including `assessments[]`, `changeHistory[]`.
- `POST /api/work-items/:id/approve` — no auth, approves any item in `proposed`/`reviewing`/`routing` status.
- `POST /api/work-items/:id/route` — no auth, accepts `overrideRoute` to fast-track any item.
- `DELETE /api/work-items/:id` — no auth, soft-deletes any item.
- `POST /api/work-items/:id/dependencies` — no auth, can link/unlink any item pair.

### State Machine Attack Patterns
1. **Fast-Track Override (Critical):** `POST /:id/route` with `{"overrideRoute":"fast-track"}` → `approved` in one call.
2. **Manual Approve Override (Critical):** `POST /:id/approve` with `{}` — reason optional, bypasses assessment.
3. **NeedsClarification → Rejected (Logic Flaw):** Assessment verdict `needs-clarification` maps to `rejected` status in `assessment.ts:162-170`. Items needing clarification are hard-rejected, not held for review.

### Unique Logic Flaw: Soft-Delete + Dependency Permanent Block
- If a blocker item is soft-deleted **after** a dependency link is established, `computeHasUnresolvedBlockers()` returns `true` (treats missing item as unresolved).
- The blocked item cannot be dispatched. The dependency can be removed via `POST /:id/dependencies` action=remove (only requires the blocked item to exist), which clears the block.
- Exploit: Add dependency, delete blocker → blocked item appears permanently frozen.

### Intake Webhook Vectors
- `POST /api/intake/zendesk` and `/api/intake/automated` — no auth, no HMAC. Full type/priority injection.
- Both endpoints skip enum validation on `type` and `priority` (unlike the main `POST /api/work-items`).

### Pagination Attack Surface
- `GET /api/work-items?limit=999999` — no upper bound, returns all items.
- `GET /api/dashboard/activity?limit=999999` — same.
- `?limit=-1` → `slice(0, -1)` → all items except last.

### Information Disclosure
- `/metrics` endpoint: fully unauthenticated Prometheus data.
- `/api/dashboard/queue`: full WorkItem objects including assessments and changeHistory.
- Error messages from `catch` blocks returned directly to clients (internal service error details).
- Sequential docId (`WI-001`, `WI-002`...) reveals total items created including soft-deleted.

### changeHistory Mutation Bug (Audit Integrity)
- Workflow handlers mutate `item.changeHistory` by direct push on the live store reference BEFORE `updateWorkItem()` confirms success.
- If `updateWorkItem()` fails, changeHistory is permanently mutated but status is not updated → corrupted audit trail.

### No-Op Findings (Scoped Out)
- No SQL/NoSQL injection — in-memory Map store only.
- No XSS — pure JSON API, no HTML rendering on backend.
- No command injection — no shell calls.
- No unsafe deserialization — standard `express.json()`.
