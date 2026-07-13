# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-07-13

### Environment Discovery

- `docker-compose.test.yml` builds and runs the **portal** application (not Source/Backend). The portal has completely different routes (`/api/feature-requests`, `/api/bugs`, `/api/cycles`, etc.) from the Source/Backend work-items workflow app.
- To test Source/Backend: install deps (`npm install` in `Source/Backend/`), then also install `ts-node` and `tsconfig-paths`, then start with:
  ```bash
  cd Source/Backend
  npm install ts-node tsconfig-paths --save-dev
  PORT=3002 ./node_modules/.bin/ts-node --transpile-only --project tsconfig.json -r tsconfig-paths/register src/app.ts
  ```
- Source/Backend requires the `@shared/*` path alias resolved by `tsconfig-paths`. Without `-r tsconfig-paths/register` the server fails to start with "Cannot find module '@shared/types/workflow'".
- Source/Backend has no database — it uses an in-memory store. All data is ephemeral within a process run.

### Confirmed Live Exploits (all unauthenticated)

#### Chain 1: Full State Machine Takeover (Critical)
- **3 requests**: POST /api/work-items → POST /api/work-items/:id/route `{"overrideRoute":"fast-track"}` → POST /api/work-items/:id/dispatch `{"team":"TheATeam"}`
- Result: backlog → approved → in-progress, `assessments=[]` (pod never ran)
- `overrideRoute` is not validated — any truthy string is accepted and stored in `item.route`

#### Chain 2: Mass Enumeration + Bulk Delete (High)
- `GET /api/work-items?limit=999999` → returns ALL items (no cap enforced), confirmed `data.length == total`
- `DELETE /api/work-items/:id` → HTTP 204 for every item, no auth
- Deletion is confirmed permanent in session (GET returns 404)

#### Chain 3: Cascade Dispatch via Blocker Rejection (High)
- Reject a blocker item → `cascade-dispatcher` agent auto-dispatches all Approved dependents
- `DISPATCH_TRIGGER_STATUSES` includes `Rejected` — rejected blockers trigger downstream dispatch
- Dependents assigned to team by `assignTeam()` with no human override

#### Chain 4: Permanent Freeze via Soft-Delete Blocker (High)
- DELETE a blocker → blocker returns 404 — but dependency link survives
- `computeHasUnresolvedBlockers()` treats `findById()→undefined` as "unresolved" → dispatch permanently blocked
- `GET /api/work-items/:id/ready` still shows dead dependency link in `unresolvedBlockers`

#### PEN-002: Webhook Enum Injection (Critical)
- POST /api/intake/zendesk with no `X-Zendesk-Webhook-Signature` → HTTP 201
- `type="malicious_type"`, `priority="ultra-critical"` accepted and stored
- Dashboard summary reflects injected priority strings in `priorityCounts`
- Prometheus: unbounded label cardinality from injected type values

#### PEN-011: NeedsClarification → Rejected (Medium)
- Feature item without `complexity` field → route → assess → always rejected
- Assessment pod runs all 4 agents; domain-expert and pod-lead both return `needs-clarification`
- `assessments[].agent` is populated with role names in the actual objects (parsing error in test script — use `.get('agent')` directly from JSON)

### Partial Findings

- **PEN-005 (NaN pagination)**: 
  - `?page=abc` → backend gracefully defaults to page=1 (NOT exploitable for empty results on work-items)
  - `?limit=-1` → `slice(0, -1)` returns N-1 items (silently drops last record)
  - `?limit=0` → returns all items (pagination entirely bypassed)
  - `dashboard/activity?page=NaN_inject` → returns empty `{"data":[]}`

### Dead Ends

- Accessing soft-deleted items via direct ID: GET /api/work-items/:deleted_id → 404 (correctly hidden). The store filters out deleted items in `findById`. No bypass found for reading soft-deleted items by UUID.

### Infrastructure Notes

- Source/Backend started on port 3002 (portal occupies 3001)
- Source/Backend server process must be killed manually after testing (`kill %1` from bash)
- `grep` not available in the bash sandbox — use `python3 -c` for header parsing
- `curl -si` output can be parsed with `python3 -c "import sys; lines=sys.stdin.readlines(); ..."`

### Attack Surface Quick Reference (Source/Backend)

| Endpoint | Auth | Notes |
|----------|------|-------|
| POST /api/work-items | ❌ | Creates items with arbitrary type/priority |
| GET /api/work-items?limit=N | ❌ | No cap on N — full dump |
| DELETE /api/work-items/:id | ❌ | Soft-delete any item |
| POST /api/work-items/:id/route | ❌ | overrideRoute accepts arbitrary strings |
| POST /api/work-items/:id/dispatch | ❌ | Dispatch any approved item to any team |
| POST /api/work-items/:id/reject | ❌ | Triggers cascade on dependents |
| POST /api/intake/zendesk | ❌ | No HMAC sig check, enum injection |
| POST /api/intake/automated | ❌ | Same as above |
| GET /metrics | ❌ | Full Prometheus dump, X-Powered-By: Express |
| GET /api/search | ❌ | 404 — route not registered |
