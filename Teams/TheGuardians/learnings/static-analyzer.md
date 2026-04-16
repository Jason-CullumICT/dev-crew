# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-04-15

### Tool Availability
- **gitleaks**: UNAVAILABLE — not installed in this environment. Fall back to LLM pattern scan.
- **semgrep**: UNAVAILABLE — not installed in this environment. Fall back to LLM pattern scan.

### Codebase Notes
- Tech stack: Node.js + Express (Backend), React + Vite (Frontend), TypeScript throughout.
- Backend uses **in-memory store** (`workItemStore.ts`) — no database, no SQL injection surface.
- No XML, YAML, or unsafe deserializer usage found anywhere in `Source/`.
- No hardcoded secrets in first-party source code (secrets properly use `process.env` or GitHub Actions `${{ secrets.* }}`).
- No `eval()`, `execSync()`, `child_process`, or dynamic code execution found.
- No `dangerouslySetInnerHTML` or raw HTML injection in React components.

### High-Signal Patterns for This Codebase
- `err.message` leakage: all workflow route catch blocks surface raw `err.message` to clients. This is a real finding, not a false positive.
- `parseInt(req.query.X)` without a max cap: real unbounded pagination DoS surface.
- Zero authentication middleware in `src/app.ts`: real critical finding.
- Intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`): no webhook secret/HMAC validation, no enum validation on `type`/`priority` fields from webhook body.

### Known Safe Patterns (Not False Positives)
- `--dangerously-skip-permissions` in CI workflows: intentional orchestrator design, not a first-party code vulnerability.
- `process.stdout.write()` in `utils/logger.ts`: intentional structured logging, not a sink.
- `iframe` in `DebugPortalPage.tsx`: dev-only tool, low risk but missing `sandbox` attribute.
- `Math.random()` equivalent not found — UUID uses `uuid` library (v4 = cryptographically random).

### Files to Always Prioritise
1. `Source/Backend/src/app.ts` — auth middleware (or lack thereof)
2. `Source/Backend/src/routes/workflow.ts` — error message leakage
3. `Source/Backend/src/routes/intake.ts` — webhook security
4. `Source/Backend/src/routes/workItems.ts` / `dashboard.ts` — pagination limits
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox
