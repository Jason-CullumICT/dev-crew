# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-06-22

### Tool Availability
- **gitleaks**: NOT INSTALLED — use LLM pattern scan for secrets
- **semgrep**: NOT INSTALLED — use LLM pattern scan for CWEs

### Architecture Summary
- Two backend services: `Source/Backend/` (in-memory, no auth) and `portal/Backend/` (SQLite, CORS configured)
- `portal/Backend/` is the running production-facing service in Docker; `Source/Backend/` is the workflow engine backend
- Both expose unauthenticated `/metrics` endpoints
- `portal/Backend/src/index.ts` orchestrator proxy at `/api/orchestrator` is the highest-risk surface

### Known False Positives
- `portal/Backend/src/database/schema.ts` — `db.exec(...)` calls use only schema DDL, no user input → SQL injection FP
- `portal/Backend/src/services/votingService.ts` — `Math.random()` is for vote simulation, not crypto token generation → low-risk
- `portal/Backend/src/services/cycleService.ts` — same pattern as votingService

### Reliable Signal Patterns
- **CWE-434 (file upload)**: `path.extname(file.originalname)` + `file.mimetype` trust → always flag when combined with `express.static`
- **CWE-209**: `${process.env.SOME_INTERNAL_URL}` in error responses → always flag
- **CWE-306**: Absence of any `authenticate`/`authorize` middleware before route handlers in Express → flag entire router
- **Pagination DoS**: `parseInt(req.query.limit)` without `Math.min(limit, MAX)` clamp → flag

### Files to Always Prioritise
- `portal/Backend/src/index.ts` — orchestrator proxy, CORS config, middleware chain
- `portal/Backend/src/middleware/upload.ts` — file upload validation
- Any `Source/Backend/src/routes/*.ts` — all completely unauthenticated
- `platform/docker-compose.yml` — Docker socket mount (outside static-analyzer scope but flag to team leader)
