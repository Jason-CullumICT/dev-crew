# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-06-01

### Tool Availability
- `gitleaks`: NOT INSTALLED — fall back to LLM pattern scan
- `semgrep`: NOT INSTALLED — fall back to LLM pattern scan

### Codebase Profile
- Backend: Express + TypeScript, in-memory store (no database), prom-client, uuid
- Frontend: React + TypeScript + Vite, react-router-dom
- No authentication layer exists anywhere (intentional? by design for internal tool)
- No hardcoded secrets found in Source/ — env vars used correctly via `process.env.PORT`
- `platform/.env.example` has `GITHUB_TOKEN=` (empty, safe) — not in Source/ scope
- No third-party DB, no SQL, no shell exec, no eval patterns

### Reliable Signal Patterns in This Codebase
- Error message leakage: `res.status(500).json({ error: message })` where `message = err.message` is real (CWE-209)
- No pagination limit cap: `parseInt(req.query.limit)` with no `Math.min(limit, MAX)` guard is real (CWE-400)
- Intake webhook endpoints have no auth or signature verification — confirmed real (CWE-306)
- `/metrics` endpoint has no auth — confirmed real (CWE-200)
- `express.json()` has no `limit` option — confirmed real, default is 100kb which may be acceptable

### Known False Positive Patterns
- `executeAction` in WorkItemDetailPage.tsx — this is a React callback wrapper, NOT dynamic code execution
- `cycle_detection_events_total` metric help text matching "cycle" — not a security issue

### Files to Prioritise on Future Runs
- `Source/Backend/src/routes/intake.ts` — webhook auth is highest risk
- `Source/Backend/src/app.ts` — missing security middleware (helmet, cors, rate-limit)
- `Source/Backend/src/routes/workflow.ts` — error message leakage in catch blocks
- `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox attribute
