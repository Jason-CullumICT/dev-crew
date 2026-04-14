# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-04-14

### Tool Availability
- **gitleaks**: NOT installed in this environment. Fall back to LLM pattern scan for secrets.
- **semgrep**: NOT installed in this environment. Fall back to LLM pattern scan for SAST patterns.
- Both tools should be flagged as `[TOOL UNAVAILABLE]` at scan start — do not halt.

### Codebase Characteristics
- **Stack:** Express.js (TypeScript) backend, React + Vite frontend, in-memory store (no DB).
- **Auth:** Zero authentication middleware anywhere in Source/Backend — this is a persistent architectural gap, not a one-off miss.
- **No secrets in Source/**: No hardcoded API keys, passwords, or tokens found in Source/ directories. CLAUDE.md's `admin@example.com / admin123` is a dev-env note in docs, not in source code.
- **No eval/exec patterns**: No dynamic code execution patterns present.
- **No SQL/NoSQL queries**: Pure in-memory Map store — no injection surface for DB queries.
- **React XSS**: No `dangerouslySetInnerHTML` used anywhere. React's default JSX escaping applies.
- **Error handler is safe**: `errorHandler.ts` logs stack internally but sends only `{ error: 'Internal server error' }` to clients — NOT a false positive.
- **Log fields (oldValue/newValue)**: Structured logger emits to stdout only. Not a client-facing leak.

### Known False Positive Patterns
- The `body.type || WorkItemType.Bug` pattern in intake routes looks like missing validation but is actually an intended default. **However**, truthy-but-invalid enum strings bypass the default and get stored — this is a **real finding** (SAST-006).
- `parseInt(req.query.page)` without NaN-check: returns NaN which propagates to `slice()` as 0 — edge case but not exploitable for injection. Real risk is resource exhaustion via large `limit`.

### Priority Files to Always Scan
1. `Source/Backend/src/app.ts` — auth middleware (or absence thereof)
2. `Source/Backend/src/routes/intake.ts` — unauthenticated webhook intake
3. `platform/docker-compose.yml` — docker socket mount, root containers
4. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox

### Reliable Signal Patterns for This Repo
- Absence of `import.*helmet` or `import.*cors` in app.ts → missing security headers (consistent finding)
- Absence of `USER` in Dockerfiles → running as root
- `/var/run/docker.sock` in compose volumes → host escape vector
- `body.type || default` without enum validation → CWE-20 in intake routes
