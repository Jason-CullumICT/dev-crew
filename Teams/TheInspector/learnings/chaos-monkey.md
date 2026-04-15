# Chaos Monkey Learnings

_Persistent learnings for the chaos monkey agent. Updated after each audit run._

---

## Run: 2026-04-15

### Architecture Discovery
- Port 3001 is the **portal backend** (`portal/Backend/src/index.ts`), NOT `Source/Backend/src/app.ts`. The workflow app (Source/Backend) is not running. Verify this every run — the active service determines which routes are testable.
- The portal backend uses **SQLite via better-sqlite3** (synchronous, single connection, WAL mode). The Source/Backend uses an **in-memory Map store**. Very different fault profiles.
- Both backends are started via `tsx src/index.ts` (transpile-on-the-fly, no compiled JS). No build step needed to run.

### Mode Selection
- Both services healthy → **Dynamic Mode** (plus supplementary static analysis on unrunning Source/Backend).
- Dynamic tests are essential here — static analysis alone would have missed the live SSRF (CHAOS-001) and the /api/dashboard 404 (CHAOS-005, route declared in source but not serving).

### What Passed
- **Path traversal via plain URL segments** (`/api/feature-requests/../../../etc/passwd`): Express router resolves and 404s safely. No file system access.
- **URL-encoded path traversal in ID field** (`%2e%2e%2f`): decoded string treated as literal ID, returns JSON 404. Safe.
- **Concurrent item creation** (5 parallel POSTs): SQLite handles correctly, no duplicate IDs, sequential docIds assigned correctly.
- **Soft-delete prevents transition** (Source/Backend): `findById` returns undefined for deleted items; all workflow endpoints correctly 404.
- **PATCH whitelist** (Source/Backend): `status` is excluded from `allowedFields`, preventing direct status bypass via PATCH.

### What Failed (Key Patterns)

**SSRF via proxy path concatenation** — Orchestrator proxy appended `req.url` directly to the base URL: `fetch(orchestratorUrl + req.url)`. `../../health` resolves upstream. Fix: use `new URL(path, orchestratorUrl).toString()` and validate no `..` segments. This class of bug is easy to miss in code review.

**No timeout on outbound fetch()** — A hanging orchestrator will hold Express handlers indefinitely. Always check `AbortController` on every `fetch()` in a server-side proxy. Node 18+ `fetch` has no default timeout.

**SIGTERM absence** — Neither backend registers signal handlers. Became the pattern for containerised Express apps. Look for `process.on('SIGTERM')` as a mandatory checklist item; its absence is always a finding.

**JSON parse error → 500** — Express emits a `SyntaxError` with `status: 400` for malformed JSON. The error handler must check `err instanceof SyntaxError && 'body' in err` to return 400. Failing that, it falls through to the generic 500 handler.

**Pagination bypass** — `?limit=99999`, `?page=-1`, `?limit=abc` all silently dumped the full dataset. Every list endpoint needs `Math.max` / `Math.min` clamps and NaN guards before pagination math.

**SQLite busy_timeout = 0** — Default of 0ms means SQLITE_BUSY is thrown immediately on any lock contention. Setting `busy_timeout = 5000` makes concurrent writes queue briefly rather than failing.

**Read-then-write without transaction** — `updateFeatureRequest` and `updateBug` read status, validate transition, then write — three separate operations. Under concurrent requests, both pass the guard. Wrap in `db.transaction()`. Note: `retriggerFeatureRequest` and `voteOnFeatureRequest` DO use transactions correctly — use those as the reference pattern.

### MCP Tools Available
- No custom MCP tools were available for this run (no DB or process management tools registered in CLAUDE.md). All dynamic tests were performed via `curl` via Bash tool. Process information gathered via `ps aux`.

### Fault Scenarios from Config

| Scenario | Type | Result |
|---|---|---|
| Backend restart | process-kill | NOT TESTED (no MCP process management; service is running in foreground bash) |
| Concurrent state transitions | static-analysis | PARTIAL — static analysis reveals no transaction guard; runtime concurrent creation PASSED |
| Malformed request body | static-analysis | TESTED LIVE — invalid JSON → 500 (FAIL), missing fields → 400 (PASS), oversized → 500 (FAIL) |

**Backend restart note:** The process can be killed with `kill <PID>` but there's no supervisor (no pm2, no systemd, no Docker restart policy visible). Killing it would leave the service down with no auto-recovery. Skip process-kill unless MCP tools confirm a restart mechanism is in place.

### Recovery Time (n/a this run)
Process-kill test was not performed due to no auto-restart mechanism confirmed.

### Robust Patterns Observed
- `featureRequestService.createFeatureRequest` validates enum values explicitly and enforces title/description length limits — good pattern.
- `voteOnFeatureRequest` and `retriggerFeatureRequest` correctly use `db.transaction()` — use as reference for fixing `updateFeatureRequest`.
- CORS `allowedOrigins` is configurable via `ALLOWED_ORIGINS` env var, not hardcoded.

### Fragile Patterns to Watch
- Any `fetch()` in server-side code without `AbortController`.
- `pump().catch(() => ...)` with no error argument — always a silent swallow.
- `app.use(express.json())` without an explicit `limit` option.
- `Object.assign(item, updates)` in a store with no field whitelist — future bypass risk.
- `parseInt(rawParam, 10)` without `isNaN` guard feeding arithmetic operations.

### Recommendations for Next Run
1. Confirm whether a process supervisor (pm2, Docker restart policy) is now in place before attempting process-kill scenarios.
2. Re-verify CHAOS-001 (SSRF) after fix is deployed — confirm `../../` no longer resolves.
3. Re-verify CHAOS-005 (/api/dashboard 404) — check if startup import error was root cause.
4. Test the `better-sqlite3` busy_timeout fix by running concurrent PATCH requests against the same item.
5. If MCP database tools become available, use them to directly inject duplicate/conflicting states for richer state machine testing.
