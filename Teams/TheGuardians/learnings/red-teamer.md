# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-06-08

### Critical Architecture Discovery
The pen-tester analyzed `Source/Backend/` (work-items API with `/api/work-items` routes), but **`docker-compose.test.yml` builds the `portal/` app** — a completely separate codebase with `/api/feature-requests` routes. Always verify which app is actually running before testing. Check `docker-compose.test.yml → context: portal` before assuming route structure from the pen-tester's findings.

### Live Endpoints (Portal App on port 3001)
- `GET/POST /api/feature-requests` — main resource, no auth
- `GET/POST /api/bugs` — bug tracker, no auth
- `POST /api/feature-requests/:id/vote` — triggers AI voting simulation
- `POST /api/feature-requests/:id/approve` — requires approve majority in votes
- `POST /api/feature-requests/:id/force-approve` — bypasses vote majority (human override, no role check)
- `POST /api/feature-requests/:id/deny` — denies FR (no role check)
- `POST /api/feature-requests/:id/dependencies` — add/remove blockers
- `GET /api/feature-requests/:id/ready` — readiness check (returns unresolved blockers)
- `GET /metrics` — unauthenticated Prometheus metrics (39 families)

### Successful Exploit Chains

#### Chain 1: Full Auth Bypass (RED-001)
All endpoints accessible without any auth token. Confirmed: create, vote, force-approve, deny, delete — all unauthenticated. This is the root precondition. Verify first with `curl -s http://localhost:3001/api/feature-requests`.

#### Chain 2: Phantom Blocker (RED-002)
`deleteFeatureRequest()` hard-deletes the FR row but does NOT cascade-delete dependencies. After deletion, `getBlockedBy()` LEFT JOIN returns `status=null` → `"unknown"` → not in RESOLVED_STATUSES → permanent block. Recovery requires manual dependency removal via `POST /api/feature-requests/:id/dependencies {"action":"remove","blocker_id":"..."}`.

#### Chain 3: Denied Blocker Cascade Failure (RED-003)
`'denied'` is NOT in `RESOLVED_STATUSES = ['completed','resolved','closed','duplicate','deprecated']`. `denyFeatureRequest()` does not call `onItemCompleted()`. Dependents stuck in `pending_dependencies` permanently. Only `deprecated`/`duplicate`/`completed`/`resolved`/`closed` cascade-unblock dependents. Denying a blocker is a dead end for dependents.

#### Chain 4: Stored XSS (RED-006)
`<script>alert(document.cookie)</script>` stored verbatim in title. `<img onerror=...>` and `<svg onload=...>` in description. No server-side sanitization at all. FR-0027 confirmed. Exploitable if frontend renders HTML without encoding.

### Dead Ends / Not Applicable
- `Source/Backend/` routes (`/api/work-items`, `/api/work-items/:id/route`, `/api/work-items/:id/assess`) — NOT available in docker-compose.test.yml. The portal app serves different routes.
- PEN-003 (`overrideRoute: fast-track`) — not applicable to portal app (different state machine).
- PEN-004 (Zendesk intake webhook) — not applicable to portal app (no intake routes).
- PEN-009/PEN-010 (routing state bypass) — not applicable to portal app.
- PEN-015 (race condition) — low priority, not tested.

### Dependency Service Behavior to Know
- `addDependency()` validates both items exist BEFORE adding the dep row.
- `removeDependency()` does NOT require the blocker to exist (safe to remove phantom deps).
- Cascade (`onItemCompleted`) only fires when `updateFeatureRequest()` reaches a RESOLVED_STATUS. `denyFeatureRequest()` and `deleteFeatureRequest()` do NOT trigger it.
- Status machine: `potential → voting → approved/pending_dependencies → in_development → completed`
- `DISPATCH_TRIGGER_STATUSES = ['approved', 'in_development']` — these trigger the gating check.
