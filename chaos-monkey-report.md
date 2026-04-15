Both services healthy post-injection. Here is the full findings summary:

---

## Chaos Monkey Findings — 2026-04-15

### Mode: Dynamic + Static
**Faults injected:** 35 | **Invariants checked:** 18 | **Services healthy at close:** ✅ backend:3001, ✅ frontend:5173

---

### P1 — Critical (3)

| ID | Finding |
|---|---|
| **CHAOS-001** | **SSRF via orchestrator proxy path traversal** — `GET /api/orchestrator/../../health` → live 200 response from backend's own `/health`. Any internal route reachable. `[ESCALATE → TheGuardians]` |
| **CHAOS-002** | **No timeout on orchestrator `fetch()`** — a hanging orchestrator holds Express handler slots indefinitely; cascades to connection pool exhaustion. No `AbortController` anywhere in the proxy code. |
| **CHAOS-003** | **No SIGTERM/SIGINT handlers** — both backends die hard on container stop. `closeDb()` exists but is never called; WAL not flushed, in-flight requests dropped. |

---

### P2 — High (8)

| ID | Finding |
|---|---|
| CHAOS-004 | No `uncaughtException`/`unhandledRejection` handlers — any out-of-Express throw silently kills the process |
| CHAOS-005 | `GET /api/dashboard` returns 404 HTML — route declared in source but not serving (possible startup import error swallowed) |
| CHAOS-006 | Invalid JSON body → HTTP 500 instead of 400 (error handler misses `SyntaxError` from body-parser) |
| CHAOS-007 | Pagination not validated — `?limit=99999`, `?page=-1`, `?limit=abc` all dump full dataset (DoS vector) |
| CHAOS-008 | `pump().catch(() => res.end())` — SSE stream errors silently swallowed, no logging |
| CHAOS-009 | `updateFeatureRequest`/`updateBug` read-then-write not in a transaction — concurrent requests can double-apply state transitions |
| CHAOS-010 | No `busy_timeout` pragma on SQLite — `SQLITE_BUSY` thrown immediately under any write contention → 500 |
| CHAOS-011 | Dashboard activity: 6 unbounded `SELECT *` queries merged in memory — O(n·tables) heap growth per request |

---

### P3 — Medium (9)

CHAOS-012 through CHAOS-020: no body size limit on Source/Backend, oversized payload → 500 not 413, no try/catch in intake webhook handlers, no enum validation in intake routes, CORS advertises unimplemented methods (`PATCH`/`DELETE`), method-not-allowed returns 404 HTML not 405 JSON, `closeDb()` dead code in production, no rate limiting on any endpoint (especially orchestrator proxy), stored XSS — raw HTML/JS accepted and stored verbatim.

---

### P4 — Low (3)

CHAOS-021 through CHAOS-023: `updateWorkItem` store has no field whitelist (future bypass risk), `parseInt` NaN not explicitly guarded in dashboard route, list endpoints have no database-level pagination.

---

### Tests That Passed ✅
- Concurrent creation (5 parallel) — no race, sequential IDs
- Plain path traversal in URL (`/../../etc/passwd`) — Express router safely 404s
- URL-encoded path traversal in ID field — treated as literal string
- Soft-delete correctly blocks all workflow transitions
- PATCH `/api/work-items/:id` correctly excludes `status` from allowed fields

---

**Report written to:** `Teams/TheInspector/findings/chaos-monkey-2026-04-15.md`  
**Learnings updated:** `Teams/TheInspector/learnings/chaos-monkey.md`
