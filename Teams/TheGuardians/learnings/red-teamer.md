# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-11-16

### Environment Mismatch — Critical Discovery
- **The pen-tester analyzes `Source/Backend`; the test environment runs `portal/Backend`.** These are different applications. `docker-compose.test.yml` starts the `portal` service (a dev-crew management portal with feature-requests, bugs, cycles). The workflow engine in `Source/Backend` is NOT deployed in the test container. Always verify which code is actually running before attempting exploits.
- Confirm with: `ps aux | grep tsx` → shows process running from `/app/Backend` (which is the portal, not Source/Backend)
- Probe routes: `/api/feature-requests` will 200 if portal; `/api/work-items` will 404

### Successful Exploit Chains
1. **State Machine Bypass (Critical):** `PATCH /api/feature-requests/:id {"status":"voting"}` then `PATCH {"status":"approved"}` — achieves `approved` with zero votes, no auth required. The PATCH endpoint allows direct status writes using valid status enum values, bypassing all workflow guards.
2. **Force-Approve Chain:** PATCH item to `voting` status first, then `POST /force-approve` — circumvents AI voting phase entirely with no credentials.
3. **Full Enumeration:** `GET /api/feature-requests` with no params returns entire dataset — no pagination at all in portal.

### Dead Ends / Already-Fixed Issues
- **Soft-delete access (PEN-007 analog):** Portal uses hard-delete, not soft-delete. Deleted items return 404. Orphaned dependencies are created but are recoverable via the remove dependency endpoint. Not exploitable for permanent DoS.
- **SQL injection via title/description:** Portal uses parameterized queries (better-sqlite3 `prepare().run()`). SQL injection not viable. The 500 error on `\"` double-quote was JSON parse error, not SQL injection.
- **Arbitrary status injection:** `PATCH {"status":"pwned"}` rejected with 400 Invalid status. Status enum is validated. Only attack is using VALID statuses out of order (which IS exploitable — see #1 above).
- **State regression from approved:** Cannot PATCH `approved → potential`. Once approved, the downgrade path is blocked.

### Endpoints That Responded to Probing
| Endpoint | Methods | Notes |
|---|---|---|
| `/api/feature-requests` | GET, POST | Lists all, creates. No auth, no pagination. |
| `/api/feature-requests/:id` | GET, PATCH, DELETE | Full CRUD. No auth. PATCH allows status bypass. |
| `/api/feature-requests/:id/vote` | POST | Triggers internal AI vote simulator. Item must be in `potential`. |
| `/api/feature-requests/:id/approve` | POST | Requires `voting` status AND majority votes. |
| `/api/feature-requests/:id/force-approve` | POST | Requires `voting` status. No auth check. |
| `/api/feature-requests/:id/retrigger` | POST | Requires `voting` status. Clears and re-runs votes. |
| `/api/feature-requests/:id/deny` | POST | Requires `comment` body field. |
| `/api/feature-requests/:id/dependencies` | POST | `{"action":"add"/"remove","blocker_id":"FR-XXXX"}`. Works on deleted blockers. |
| `/api/feature-requests/:id/ready` | GET | Returns `{ready, unresolved_blockers}`. |
| `/api/bugs` | GET, POST | No auth. |
| `/api/dashboard/summary` | GET | Exposes counts by status/severity. No auth. |
| `/api/dashboard/activity` | GET | Full activity log. No auth. |
| `/metrics` | GET | Prometheus metrics with HTTP route labels. Reveals all probed paths. |
| `/health` | GET | Returns `{status:"ok"}`. |

### Key Vulnerability Patterns in Portal App
1. No authentication/authorization middleware anywhere
2. PATCH endpoint accepts `status` field — allows state machine bypass with valid enum values in wrong order
3. No pagination — all endpoints return complete datasets
4. Prometheus metrics exposed with labeled route data
5. Hard-delete with no cascade leaves orphaned dependency references
