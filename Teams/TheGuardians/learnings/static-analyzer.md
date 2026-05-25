# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-05-25

### Tool Availability
- **gitleaks**: NOT INSTALLED (exit 127) — fall back to LLM pattern scan for secrets
- **semgrep**: NOT INSTALLED — fall back to LLM pattern scan for CWEs

### Confirmed Real Issues (not false positives)
- `Source/Backend/src/app.ts` — No auth middleware at all. Entire API is open. This is the highest-priority finding.
- `Source/Backend/src/routes/intake.ts` — `body.type` and `body.priority` passed without enum validation, only `||` fallback to default. Unvalidated values stored in data and pollute Prometheus labels.
- All three Dockerfiles — No `USER` directive; containers run as root.
- Pagination routes — no maximum `limit` cap. NaN from bad input silently returns empty data (not a crash but a silent failure).
- No HTTP security headers (no helmet equivalent).
- CI `inputs.focus` free-text field directly interpolated into shell printf args in run-guardians.yml.

### False Positive Patterns to Avoid
- `package-lock.json` integrity hashes (sha512) are NOT cryptographic misuse — skip these
- `js-tokens` grep hits on "token" in package-lock are NOT credential findings
- `err.stack` logged server-side in errorHandler is correct; it is NOT returned to clients
- The `GITHUB_TOKEN` in `.github/workflows/dispatch.yml` uses `secrets.GITHUB_TOKEN` (auto-provisioned, not hardcoded) — not a finding

### Files to Prioritise in Future Runs
1. `Source/Backend/src/app.ts` — central auth/middleware point
2. `Source/Backend/src/routes/intake.ts` — unauthenticated external webhook
3. `Source/Backend/src/routes/workItems.ts` — pagination and update field validation
4. All `Dockerfile*` — privilege and secrets-in-env checks
5. `.github/workflows/*.yml` — CI injection and `--dangerously-skip-permissions` scope

### Auto-Generated / Safe to Skip
- `Source/Backend/package-lock.json` — dependency lockfile, no first-party code
- `Source/Frontend/package-lock.json` — dependency lockfile, no first-party code
