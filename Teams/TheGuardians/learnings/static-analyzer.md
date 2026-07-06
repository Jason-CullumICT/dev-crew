# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-07-06

### Tools Available
- **gitleaks**: NOT installed — LLM pattern scan used for secrets.
- **semgrep**: NOT installed (exits 0 with no output, not actually scanning) — LLM scan used.

### False Positives / Known Safe
- `Source/Backend/src/utils/logger.ts` — `process.stdout.write` is deliberate structured logging, not info-leak.
- `Source/Backend/src/utils/id.ts` — `uuidv4()` is cryptographically-safe UUID generation (not `Math.random()`).
- `platform/.env.example` — `GITHUB_TOKEN=` intentionally blank template, not a hardcoded secret.

### Patterns That Reliably Signal Real Issues in This Codebase
- Any route handler that does NOT import an auth middleware → no authentication (all routes affected).
- `parseInt(req.query.X as string, 10)` without `isNaN` or max-value guard → unbounded pagination.
- Catch blocks containing `res.status(500).json({ error: message })` where `message = err.message` → leaks internal error strings.
- Intake routes (intake.ts) do NOT call `Object.values(WorkItemType).includes(body.type)` → unvalidated enum passthrough.

### Files to Always Prioritize
- `Source/Backend/src/app.ts` — middleware chain, check for auth, helmet, cors.
- `Source/Backend/src/routes/workflow.ts` — state machine, check for privileged operation auth and overrideRoute abuse.
- `Source/Backend/src/routes/intake.ts` — webhook receiver, check signature verification.
- `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe target, check sandbox attribute.

### Architecture Notes
- This is an internal agent orchestration platform; the "login credentials" in CLAUDE.md refer to the orchestrator dashboard (port 9800), NOT the app backend (port 3001). The backend at :3001 has zero authentication.
- Data store is fully in-memory (no database). No SQL injection surface. No deserialization attack surface (plain JSON).
- No dynamic code execution patterns (eval, Function(), child_process) anywhere in first-party source.
