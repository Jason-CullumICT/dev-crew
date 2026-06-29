# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-06-29

### CLI Tool Availability
- **gitleaks**: NOT installed — fall back to LLM pattern scan for secrets
- **semgrep**: NOT installed — fall back to LLM pattern scan for SAST patterns

### Codebase Characteristics
- **Tech stack**: Node.js + Express (TypeScript) backend, React + Vite frontend, in-memory Map store (no DB)
- **Auth model**: NONE — the entire API is unauthenticated by design (internal dev tool)
- **No secrets in source code**: No hardcoded API keys, tokens, or passwords found in Source/. The only .env file is `platform/.env.example` which has empty secret values (GITHUB_TOKEN=, no actual secrets).

### Known False Positive Patterns
- `package-lock.json` lines match "token" keyword — these are npm lockfile entries for `js-tokens` package, NOT credentials. Skip package-lock.json in secret scans.
- The `logger.ts` logs `err.stack` server-side only (not returned to clients) — not a leakage finding.
- `parseInt` without NaN guard in pagination routes: NaN propagates to the store where `||` fallback handles it gracefully. Low-risk quirk, not a vulnerability.

### Files to Prioritise in Future Runs
- `Source/Backend/src/app.ts` — auth middleware or CORS additions will appear here first
- `Source/Backend/src/routes/intake.ts` — webhook authentication gaps
- `Source/Backend/src/middleware/` — new security middleware expected here

### Patterns That Reliably Signal Real Issues (this codebase)
- Any new `router.post/get/patch/delete` in `routes/` that doesn't check an auth header → SAST-001 recurrence
- Any new webhook endpoint without HMAC/signature verification → SAST-003 recurrence
- New `parseInt(req.query.X)` without `isNaN` guard and upper-bound cap → SAST-005 recurrence

### Files Safe to Skip
- `Source/Backend/tests/` and `Source/Frontend/tests/` — test fixtures, no production secrets
- `Source/*/package-lock.json` — auto-generated, no first-party secrets
- `Source/Shared/types/workflow.ts` — pure type definitions, no executable logic
