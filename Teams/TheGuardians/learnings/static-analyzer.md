# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always reliable signal real issues, files known to be auto-generated and safe to skip. -->

## Tools Available (last checked: 2026-11-16)
- gitleaks: **NOT INSTALLED** — always fall back to LLM pattern scan
- semgrep: **NOT INSTALLED** — always fall back to LLM pattern scan
- trivy: **NOT INSTALLED**
- bandit: **NOT INSTALLED**
- Node.js: available — can run `node -e "..."` for package.json inspection

## Codebase Patterns (run: 2026-11-16)

### Architecture Overview
- Express.js backend (TypeScript) — no database, in-memory store
- React/Vite frontend (TypeScript)
- No authentication layer exists anywhere in the codebase
- No security middleware (helmet, cors, rate-limiter) installed or configured

### Known False Positive Patterns
- `password`, `token`, `secret` hits in package-lock.json — package names only, not credentials
- Error messages in `workflow.ts` catch blocks that expose `err.message` on 500 errors — the dependency/self-ref checks are intentional user-facing messages (CWE-209 is a real finding for other catch blocks)
- Assessment feedback strings in `assessment.ts` lines 118/122 — internal logic, not user-facing leaks

### High-Signal Files for Future Runs (Always Prioritise)
1. `Source/Backend/src/app.ts` — entry point, check for new middleware
2. `Source/Backend/src/routes/intake.ts` — webhook endpoints, lack auth
3. `Source/Backend/src/routes/workItems.ts` — pagination validation, enum casting
4. `Source/Backend/src/routes/workflow.ts` — error message leakage, status transitions
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe src from env var

### Auto-Generated / Safe to Skip
- `Source/Backend/package-lock.json` — dependency lock, skip for secret scanning (many false positives from package names)
- `Source/Frontend/package-lock.json` — same

### Structural Gaps (Persistent Findings)
- No authentication middleware in `Source/Backend/src/app.ts` (CWE-306)
- No CORS configuration (CWE-942)
- No security headers / helmet (CWE-693)
- Intake webhooks lack webhook signature verification (CWE-345)
- Pagination `limit` parameter has no upper bound (CWE-400)
