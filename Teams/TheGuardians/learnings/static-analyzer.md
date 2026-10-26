# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-10-26

### Tool Availability
- `gitleaks`: **NOT installed** — fall back to LLM pattern scan for secrets
- `semgrep`: installed but produced no output (silent exit, likely no findings or config issue) — treat as unavailable, use LLM scan

### Confirmed False Positives
- `Source/Backend/src/utils/id.ts` — `docIdCounter` is a sequential integer, NOT a secret or random ID. It generates `WI-001` style display IDs, not UUIDs. True UUID generation uses `uuid.v4()`. Do not flag as weak randomness.
- Grep hits on `description` and `describe` in test files are all test code, not secrets or dangerous patterns.
- `executeAction` in `WorkItemDetailPage.tsx` is a React callback wrapper, not `eval`/`exec`. Do not flag.

### Key Patterns For This Codebase
- **No auth middleware anywhere** — this is the #1 structural gap. Every route in `Source/Backend/src/app.ts` is unauthenticated.
- **Intake routes skip enum validation** (`Source/Backend/src/routes/intake.ts`) while the main CRUD route (`workItems.ts`) validates correctly — always check intake endpoints for validation gaps.
- **Raw error messages returned to clients** in `workflow.ts` catch blocks — the global `errorHandler.ts` is safe (returns "Internal server error") but per-route catch blocks propagate `err.message` directly.
- **Pagination limit has no upper bound** — check `findAll()` in workItemStore and route handlers.
- **No helmet, no CORS config, no rate limiting** in `app.ts` — security middleware is entirely absent.
- **iframe in DebugPortalPage.tsx** lacks `sandbox` attribute — only relevant for debug tooling, lower risk.

### Files to Prioritise in Future Runs
1. `Source/Backend/src/app.ts` — middleware configuration
2. `Source/Backend/src/routes/intake.ts` — unauthenticated webhook receiver
3. `Source/Backend/src/routes/workflow.ts` — error message leakage in catch blocks
4. `Source/Backend/src/routes/workItems.ts` — pagination limit enforcement
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox
