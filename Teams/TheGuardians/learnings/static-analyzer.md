# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-05-04

### Tools Available
- **gitleaks**: NOT installed in this environment — use LLM pattern scan for secrets
- **semgrep**: NOT installed in this environment — use LLM pattern scan for SAST

### Codebase Profile
- Tech: TypeScript/Node.js backend (Express 4), React/Vite frontend
- Storage: In-memory Map (no DB) — no SQL injection surface
- Auth: **None at all** — the single biggest pattern to check on every run
- Source dirs: `Source/Backend/src/`, `Source/Frontend/src/`, `Source/Shared/types/`

### Files to Prioritise (highest yield)
1. `Source/Backend/src/app.ts` — middleware stack (auth, CORS, headers)
2. `Source/Backend/src/routes/workflow.ts` — business logic overrides (overrideRoute bypass)
3. `Source/Backend/src/routes/intake.ts` — unauthenticated webhook + missing enum validation
4. `Source/Backend/src/routes/workItems.ts` — pagination limit cap
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — unsandboxed iframe

### Known False Positives
- `changeHistory` entries with `oldValue`/`newValue` as `unknown` are by design — not a deserialization risk
- `GITHUB_TOKEN=` empty in `.env.example` is correct convention (not a leak)
- `docIdCounter` global mutable singleton is not a thread-safety issue (single-threaded Node.js)

### Confirmed Real Patterns
- No `helmet`, no `cors`, no `express-rate-limit` in `package.json` — absence of these is a reliable HIGH signal
- `intake.ts` skips enum validation that `workItems.ts` correctly performs — always check intake separately
- `overrideRoute` parameter accepted without authorization — workflow bypass vector
- `parseInt(req.query.X)` without `isNaN` guard and without max-cap — present in both workItems and dashboard routes
