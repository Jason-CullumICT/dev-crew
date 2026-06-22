# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-06-22

### Architecture Fingerprint
- **Stack:** Express 4.18, TypeScript, in-memory Map store (no database), prom-client, pino, uuid
- **No authentication layer exists** — not a misconfiguration, just missing. No JWT/session library in package.json.
- **No CORS library** — `cors` npm package not installed.
- **No rate-limiting library** — `express-rate-limit` not installed.
- **Single-threaded Node.js** — no actual race conditions on synchronous store ops (Map reads/writes are synchronous). Race condition attacks are not viable against the in-memory store.

### IDOR-Prone Routes (All Routes Are IDOR by Default)
Every route uses `req.params.id` directly with `store.findById()`. Since there is no auth, any UUID discovered by enumeration grants full access. The UUID format is v4 (random), making brute force impractical, but any ID leaked through:
- `GET /api/dashboard/queue` — exposes ALL item IDs grouped by status
- `GET /api/work-items?limit=999999` — dumps all IDs
- `GET /api/dashboard/activity` — exposes item IDs in change history entries

### State Machine Logic Map
```
backlog → (POST /route) → routing → proposed  [full-review]
                                  → approved   [fast-track OR overrideRoute:"fast-track"]
proposed → (POST /assess) → reviewing → approved | rejected
proposed → (POST /approve) → approved           [manual, no auth]
reviewing → (POST /approve) → approved          [manual, no auth]
approved → (POST /dispatch) → in-progress
in-progress → (implicit) → completed | failed
rejected → (no endpoint) → backlog              [defined in VALID_STATUS_TRANSITIONS but no route handler]
failed → (no endpoint) → backlog                [defined but no route handler]
```
Key bypass: `overrideRoute: "fast-track"` on POST /route skips the entire middle of the state machine.

### Soft-Delete Behavior
- `findById()` returns `undefined` for deleted items (correct filtering)
- `updateWorkItem()` respects soft-delete (correct)
- **BUT** `computeHasUnresolvedBlockers()` treats `!blocker` (undefined = soft-deleted) as "unresolved" — this is the Dependency DoS (PEN-006)
- Deleted items remain in the raw `items` Map forever; there is no hard-delete mechanism

### Assessment Pod — Deterministic Outcomes
The assessment pod is entirely deterministic (no ML, no human input). A work item will always be APPROVED if:
- `title.trim().length >= 5` AND
- `description.trim().length >= 20` AND
- `complexity` is set (any valid value) AND
- `priority` is set (always true since required on creation)

An attacker who controls item creation can guarantee approval by meeting these thresholds.

### Cascade Dispatch Trigger Conditions
`onItemResolved()` is triggered ONLY on explicit Reject (`POST /reject`). Completion (`completed` status) has no route handler currently — no way to transition to `completed` via API. So cascade currently only fires on rejection, not completion.

### Unimplemented Endpoints (Future Attack Surface)
- `GET /api/search?q=` — referenced in frontend, not wired in app.ts. Tests exist and will fail.
- No `POST /api/work-items/:id/complete` or `POST /api/work-items/:id/fail` endpoints exist.
- `/api/work-items/:id/transition` mentioned in security config but maps to individual action routes (not a single generic transition endpoint).

### Intake Enum Validation Gap
`workItems.ts` POST validates all enums explicitly (lines 29–42).
`intake.ts` POST does NOT validate `type` or `priority` — raw strings from body.

### Change History Audit Trail
All changes use hardcoded `agent` values: `"user"`, `"system"`, `"router-service"`, `"assessment-pod"`, `"dispatcher"`, `"cascade-dispatcher"`, `"manual-override"`. No actual caller identity is ever captured. This is by design (no auth) but means post-incident forensics are impossible.
