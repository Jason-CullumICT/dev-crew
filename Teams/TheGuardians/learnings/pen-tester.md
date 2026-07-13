# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-07-13

### Codebase Profile
- **Stack:** Express.js (TypeScript) backend, React frontend, in-memory Map store (no database)
- **Auth:** NONE — the application has zero authentication or authorization at any layer
- **State Machine:** 9-status workflow (backlog → routing → proposed/approved → reviewing → approved → in-progress → completed/failed/rejected)
- **Data IDs:** UUID (internal) + sequential docId WI-001, WI-002... (displayed, predictable)

### Critical Attack Patterns Unique to This Codebase

#### 1. The `overrideRoute` Fast-Track Bypass
- **File:** `Source/Backend/src/routes/workflow.ts:57`, `Source/Backend/src/services/router.ts:66`
- **Pattern:** `POST /api/work-items/:id/route` with body `{"overrideRoute":"fast-track"}` — skips the 4-role assessment pod and lands in `approved` status directly.
- **No privilege required** — the overrideRoute parameter is accepted from any caller.

#### 2. Intake Webhook Injection (No Signature)
- **Files:** `Source/Backend/src/routes/intake.ts:11,33`
- **Pattern:** `POST /api/intake/zendesk` and `/api/intake/automated` — no `X-Zendesk-Webhook-Signature` validation. Enum fields (`type`, `priority`) are not validated against enum values before being stored.
- **Consequence:** Invalid type/priority strings can be stored and corrupt Prometheus label cardinality.

#### 3. Pagination Limit Bypass
- **File:** `Source/Backend/src/routes/workItems.ts:68-71`
- **Pattern:** `GET /api/work-items?limit=999999` — no cap on limit; returns ALL work items in one request.
- **NaN injection:** `?page=abc` or `?limit=0` returns empty results even when data exists.

#### 4. Cascade Auto-Dispatch via Rejection (Business Logic)
- **File:** `Source/Backend/src/services/dependency.ts:251` called from `workflow.ts:192`
- **Pattern:** Rejecting a blocker item triggers `onItemResolved()` which auto-dispatches dependent Approved items. `DISPATCH_TRIGGER_STATUSES` includes `Rejected` — so a rejected (bad) blocker still unblocks dependents.

#### 5. Soft-Delete Blocker Trap
- **File:** `Source/Backend/src/services/dependency.ts:64-75`
- **Pattern:** If a blocker item is soft-deleted, `findById` returns `undefined`, and `computeHasUnresolvedBlockers` treats undefined as "unresolved" → dependent item is permanently blocked from dispatch.

#### 6. NeedsClarification → Rejected Mapping Bug
- **File:** `Source/Backend/src/services/assessment.ts:162-167`
- **Pattern:** Only `Approve` verdict maps to `Approved` status; all other verdicts (including `NeedsClarification`) map to `Rejected`. Items without `complexity` field will always be rejected by the assessment pod.

### IDOR-Prone Routes
- `DELETE /api/work-items/:id` — soft-deletes any item, no ownership check
- `POST /api/work-items/:id/approve` — approves any item in proposable status
- `POST /api/work-items/:id/reject` — rejects any item in rejectable status
- `POST /api/work-items/:id/dispatch` — dispatches any approved item to any team
- `POST /api/work-items/:id/dependencies` — adds/removes dependencies on any item

### Logic Flaw Hotspots
- `services/router.ts:classifyRoute()` — overrideRoute accepted without validation or privilege
- `services/dependency.ts:computeHasUnresolvedBlockers()` — soft-deleted items treated as unresolved
- `services/assessment.ts:runAssessmentPod()` — NeedsClarification verdict silently becomes Rejected
- `services/dependency.ts:onItemResolved()` — Rejected blockers trigger dependent dispatch

### Missing Backend Routes
- `/api/search` — referenced by frontend `client.ts:101`, not implemented in backend. Will return Express 404 HTML, revealing framework.

### Metrics Exposure
- `GET /metrics` — Prometheus endpoint at root level, no auth, exposes full operational telemetry.
