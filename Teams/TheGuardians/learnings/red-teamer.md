# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-06-01 — portal/Backend active exploitation

### Critical Discovery: Scope Mismatch
- **The pen-tester analyzes `Source/Backend/`** — work-items, state machine, intake webhooks
- **The test environment (`docker-compose.test.yml`) runs `portal/Backend/`** — feature requests, bugs, cycles, pipeline runs, learnings, team-dispatches
- `Source/Backend/` routes return HTTP 404 in the test environment; portal routes are live
- Always verify the live app routes before trusting the pen-tester's attack surface map
- Probe: `curl http://localhost:3001/api/feature-requests` (portal) vs `/api/work-items` (Source — 404)

### Confirmed Live Endpoints (portal/Backend on port 3001)
| Route | Method | Auth Required | Notes |
|-------|--------|---------------|-------|
| `/api/feature-requests` | GET, POST | ❌ None | Returns all items, no pagination |
| `/api/feature-requests/:id` | GET, PATCH, DELETE | ❌ None | Hard-delete, no ownership check |
| `/api/feature-requests/:id/vote` | POST | ❌ None | Triggers AI vote panel (5 agents) |
| `/api/feature-requests/:id/approve` | POST | ❌ None | Requires majority approve votes |
| `/api/feature-requests/:id/force-approve` | POST | ❌ None | **BYPASSES vote threshold entirely** |
| `/api/bugs` | GET, POST | ❌ None | No pagination |
| `/api/cycles` | GET, POST | ❌ None | State machine exists |
| `/api/team-dispatches` | GET, POST | ❌ None | actions_url stored verbatim — SSRF risk |
| `/api/pipeline-runs` | GET | ❌ None | Exposes agent identities |
| `/api/learnings` | GET, POST | ❌ None | Requires cycle_id for POST |
| `/api/search` | GET | ❌ None | In-memory filter, no SQL — no SQLi |
| `/metrics` | GET | ❌ None | Exposes full route map, use for recon |
| `/health` | GET | ❌ None | Returns `{"status":"ok"}` |

### Successful Exploit Chains
1. **Force-Approve bypass**: `POST /vote` → `POST /force-approve` → approved despite 4/5 deny votes. Zero auth.
2. **Team dispatch injection**: `POST /api/team-dispatches` with attacker-controlled `actions_url`, `workflow`, `repo`.
3. **Stored XSS**: POST feature request with `<script>` in title — stored verbatim, returned in GET.
4. **Full pipeline takeover**: Create FR → trigger vote → force-approve → inject dispatch in 4 unauthenticated calls.
5. **Metrics recon**: `GET /metrics` reveals all route paths including hidden ones like `/:id/force-approve`.

### Dead Ends / Confirmed Not Exploitable
- **SQL injection via `/api/search`**: Search uses in-memory filtering (`title.includes(q)`), not SQL interpolation. No SQLi surface.
- **Vote stuffing**: Cannot trigger vote twice — state machine checks `potential` status.
- **Soft-delete bypass**: Feature requests are hard-deleted (`DELETE FROM feature_requests`). No soft-delete, so no re-access-by-ID exploit.
- **SSRF via `actions_url`**: URL is stored but not automatically fetched. Risk is deferred (if system ever auto-triggers).

### Key Patterns for Future Runs
- **Always check for `force-*` variants** of restricted endpoints — these often skip business logic checks
- **`/metrics` reveals undocumented routes** — mine the `route=` labels in Prometheus output before probing
- **No auth + no ownership = IDOR** — any GET/PATCH/DELETE on `:id` endpoints is cross-user by default
- **Check `actions_url`, `webhook_url`, `callback_url` fields** — these are stored externally-controlled URLs
- **Seeding items first makes enumeration tests meaningful** — create 10+ items before testing pagination

### Vulnerabilities Confirmed in portal/Backend (not in pen-tester's Source/Backend map)
| ID | Finding | Severity |
|----|---------|---------|
| RED-001 | Zero auth across all portal endpoints | Critical |
| RED-002 | `/force-approve` bypasses AI vote majority check | Critical |
| RED-003 | Team dispatch injection with attacker-controlled `actions_url` | Critical |
| RED-004 | Unbounded enumeration — no pagination on list endpoints | Medium |
| RED-005 | IDOR — no ownership check on PATCH/DELETE | High |
| RED-006 | Stored XSS via unescaped title/description fields | High |
| RED-007 | Prometheus metrics expose route map (recon enabler) | Low |
| RED-008 | Pipeline runs expose internal agent identities | Medium |
| RED-009 | 4-step unauthenticated full business logic takeover | Critical |
