# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-11-09

### Tools Available
- gitleaks: **UNAVAILABLE** — not installed in this environment. Must use LLM pattern scan for secrets.
- semgrep: **UNAVAILABLE** — not installed in this environment. Must use LLM pattern scan.

### Key Codebase Facts
- **Tech stack**: Node.js + Express (TypeScript) backend, React + Vite frontend, in-memory store (no database).
- **No authentication at all** — this is by design for a local dev orchestrator, but must be flagged as a finding for any external deployment.
- **No CORS/helmet/security headers** — backend has bare Express with no security middleware.
- **Source dirs**: `Source/Backend/src/`, `Source/Frontend/src/`, `Source/Shared/types/`
- **Test dirs**: `Source/Backend/tests/`, `Source/Frontend/tests/` — safe to skip for SAST (no production code path).
- **Auto-generated / safe to skip**: `package-lock.json` files in all workspaces.

### Confirmed Real Issues (not false positives)
- `Source/Backend/src/routes/intake.ts` — intake routes do NOT validate `type`/`priority` enums against whitelist (the main `/api/work-items` POST does validate, so inconsistency is real).
- `Source/Backend/src/routes/workflow.ts` — `err.message` from service layer returned directly to HTTP clients in every catch block.
- `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe with no `sandbox` attribute.
- `portal/Dockerfile` — no `USER` directive, runs as root.

### Known False Positive Patterns
- `Source/Backend/src/store/workItemStore.ts`: `findById` returns `undefined` for deleted items — intentional soft-delete logic, not a security bypass.
- Error messages that include work item IDs in 404 responses are intentional per the API design (IDs are UUIDs, not sequential, so enumeration resistance is structural).

### Files to Prioritise in Future Runs
1. `Source/Backend/src/app.ts` — entry point, auth/middleware added here
2. `Source/Backend/src/routes/intake.ts` — externally-reachable webhook, highest injection risk
3. `Source/Backend/src/routes/workflow.ts` — state machine transitions, error message exposure
4. `portal/Dockerfile` — container security baseline
