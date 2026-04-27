# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-04-27

### Tools Installed
- `gitleaks`: **NOT available** in this environment — fall back to LLM scan.
- `semgrep`: **NOT available** — fall back to LLM scan.

### Confirmed False Positives (none yet)
- None established. First run.

### High-Signal Patterns for this Codebase
- **All API endpoints are unauthenticated** — no auth middleware exists. Every finding related to missing auth is real, not FP.
- **`workflow.ts` error handlers always leak `err.message` to HTTP 500 responses** — pattern `res.status(500).json({ error: message })` appears 6+ times; all real.
- **Intake routes (`intake.ts`) skip enum validation for `type` and `priority`** — confirmed real gap vs. `workItems.ts` which validates these.
- **`portal/Dockerfile` has no `USER` directive** — confirmed container runs as root.
- **No security headers anywhere** — confirmed `app.ts` has no helmet or equivalent.

### Files Always to Check
- `Source/Backend/src/app.ts` — middleware chain: auth and headers gaps live here
- `Source/Backend/src/routes/workflow.ts` — error message disclosure
- `Source/Backend/src/routes/intake.ts` — webhook auth and validation gaps
- `portal/Dockerfile` — root user finding
- `.github/workflows/*.yml` — `--dangerously-skip-permissions` pattern

### Known Auto-Generated Files Safe to Skip
- `Source/Backend/package-lock.json` — lockfile, no secrets expected (confirmed)
- `Source/Frontend/package-lock.json` — lockfile, no secrets expected (confirmed)
