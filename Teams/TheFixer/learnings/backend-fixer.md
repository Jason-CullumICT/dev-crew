# Backend Fixer Learnings

## 2026-04-14 — Search endpoint + special character safety

### Logger signature
`src/utils/logger.ts` uses `logger.info(msg: string, ctx?: Record<string, unknown>)` — NOT a Pino-style object as the first arg.
Using `logger.info({ msg, ... })` produces a TypeScript error (TS2345). Always pass the message string first.

### No node_modules on first run
The `Source/Backend/` directory has no `node_modules/` pre-installed in CI. Run `npm install` inside `Source/Backend/` before invoking Jest. Use `npm test` (the package.json script) rather than `npx jest` to avoid downloading the wrong Jest version.

### In-memory store uses String.includes() — no regex risk
The store uses a plain `Map<string, WorkItem>`. For search, `String.prototype.includes()` is inherently safe against regex/LIKE special characters (`%`, `_`, `[`, etc.). No escaping utility needed.

### Missing route = 404 not 500
When a route is not registered in `app.ts`, Express falls through to the error handler and returns 404 (or the error handler's default). The "500 on special chars" bug title was effectively "endpoint missing", which looked like a 500 from the frontend's perspective.

### Test URL-encoding
When testing special characters via supertest, percent-encode them in the query string: `%25` → `%`, `%5B` → `[`. Supertest does not auto-encode.

### Traceability comments
Every new test must include either `// Verifies: FR-XXX` or `// Fixes: FIX-XXX` — enforced by `tools/traceability-enforcer.py`.
