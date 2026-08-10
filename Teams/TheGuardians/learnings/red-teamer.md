# Red Teamer — Learnings

<!-- Updated after each Guardian run. Record successful exploit chains, endpoints that responded to probing, objective patterns that worked, dead ends to skip. -->

## Run: 2026-08-10

### Critical Learnings

**Target Discrepancy:** The pen-tester analyzes `Source/Backend/` (work-items domain) but `docker-compose.test.yml` runs `portal/` (feature-requests/bugs/cycles domain) on port 3001. Always verify the running target's routes before attempting PEN-ID chains. Map PEN findings to the actual application domain.

**Quick Route Discovery:** `curl -s http://localhost:3001/api/dashboard/summary` and inspect field names — they reveal the domain model. Then probe: `/api/<domain-entity>` for each entity type mentioned.

### Successful Exploit Chains

1. **Force-approve bypass (Critical):** `POST /api/feature-requests` → `PATCH /:id {"status":"voting"}` → `POST /:id/force-approve` — item approved with 0 votes, no auth. Works on any FR.

2. **Arbitrary file upload + exfiltration (Critical):** `POST /api/feature-requests/:id/images -F "images=@/etc/passwd;type=image/jpeg;filename=exploit.jpg"` — server trusts client MIME type, not magic bytes. Uploaded files served publicly at `/uploads/<uuid>.jpg`.

3. **Ghost dependency DoS (High):** Create blocker → add as dependency of approved target → soft-delete blocker → target permanently stuck in `pending_dependencies`. Confirmed with FR-0004/FR-0005.

4. **Unauthenticated sabotage via /deny (High):** `POST /api/feature-requests/:id/deny` with any `comment` body — works on any `voting` status FR. Irreversible — `denied` is terminal. FR-0008 confirmed.

5. **Voting manipulation via retrigger (Medium):** `POST /api/feature-requests/:id/retrigger` resets all votes and re-runs AI voting. Can be called in a loop until desired majority. No auth required.

### Dead Ends / Non-Exploitable

- **Direct PATCH to skip status machine:** Status transitions are validated against a whitelist. `PATCH {"status":"approved"}` from `potential` returns 400 with allowed states.
- **Direct deny of approved FR:** `/deny` only works on `potential` or `voting` status — approved items cannot be denied via this endpoint.
- **SSRF via /api/orchestrator:** Proxy forwards to configured `ORCHESTRATOR_URL` (env var). No URL injection possible via path or body — URL is fixed server-side. Returns 502 when orchestrator is unreachable.
- **SQL injection in /api/search:** Search uses in-memory filter (no SQL). `/api/features?q=` uses parameterized queries + LIKE-escape. No injection surfaces found.
- **Bug severity escalation via triage:** `/api/bugs/:id/triage` ignores `severity` from request body — keeps original severity.
- **Circular dependency creation:** Detected and blocked by `DependencyService` BFS check.
- **Upload path traversal in filename:** Multer uses UUID for filename — attacker-supplied filename only stored as `original_name` metadata, not used for storage path.

### Endpoint Inventory (Confirmed Live)

```
GET  /health                                    → 200, no auth
GET  /metrics                                   → 200, no auth, Prometheus text
GET  /api/feature-requests                      → 200, no auth, full list
POST /api/feature-requests                      → 201, no auth, create
GET  /api/feature-requests/:id                  → 200/404
PATCH /api/feature-requests/:id                 → 200, no auth, state transitions
DELETE /api/feature-requests/:id                → 204, no auth, soft-delete
POST /api/feature-requests/:id/vote             → needs potential status
POST /api/feature-requests/:id/retrigger        → resets+reruns votes, no auth ⚠️
POST /api/feature-requests/:id/approve          → approve after votes, no auth ⚠️
POST /api/feature-requests/:id/force-approve    → bypasses voting entirely, no auth ⚠️
POST /api/feature-requests/:id/deny             → kills item, no auth ⚠️
POST /api/feature-requests/:id/images           → file upload, trusts client MIME ⚠️
GET  /api/feature-requests/:id/images           → lists uploads
DELETE /api/feature-requests/:id/images/:id     → delete image
POST /api/feature-requests/:id/dependencies     → add/remove blockers, no auth ⚠️
GET  /api/feature-requests/:id/ready            → readiness + ghost blocker leak ⚠️
GET  /api/bugs                                  → 200, no auth
POST /api/bugs                                  → 201, no auth
GET  /api/bugs/:id                              → 200/404
PATCH /api/bugs/:id                             → status transitions (no severity/status via body)
DELETE /api/bugs/:id                            → soft-delete
POST /api/bugs/:id/triage                       → triage (ignores severity override), no auth
POST /api/bugs/:id/resolve                      → resolve, no auth ⚠️
POST /api/bugs/:id/close                        → close, no auth ⚠️
POST /api/bugs/:id/reopen                       → reopen, no auth ⚠️
POST /api/bugs/:id/dependencies                 → dependency management
GET  /api/cycles                                → 200, no auth
GET  /api/dashboard/summary                     → aggregate stats, no auth
GET  /api/dashboard/activity?limit=N            → full history dump, no limit cap ⚠️
GET  /api/search?q=<term>                       → in-memory search, no auth
GET  /api/features                              → completed features
GET  /api/pipeline-runs                         → empty in test env
GET  /api/learnings                             → internal knowledge base
GET  /api/team-dispatches                       → team assignments
POST /api/orchestrator/*                        → proxy to localhost:8080 (502 in test)
GET  /uploads/:filename                         → publicly serves all uploaded files ⚠️
```

### Architecture Patterns Observed

- No global authentication middleware in `index.ts`
- State machines are enforced per entity (validated transitions in service layer)
- Soft-delete pattern: `findById` returns `undefined` for deleted items — ghost dependency trap
- File upload: `multer` with client-MIME fileFilter; UUID filenames prevent path traversal but not content injection
- SQLite database (better-sqlite3) with parameterized queries — no SQL injection surfaces found
- CORS configured to `localhost:5173` only — API-level control but not auth
