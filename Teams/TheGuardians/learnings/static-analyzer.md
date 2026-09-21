# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-09-21 (full scope)

### Tool Availability
- **gitleaks**: NOT INSTALLED — LLM scan used for secret detection
- **semgrep**: NOT INSTALLED — LLM scan used for pattern analysis
- No postinstall scripts in either Backend or Frontend package.json (supply-chain safe)

### Key Architectural Observations
- The Source/Backend is a **zero-authentication Express API** — all endpoints are fully open. This is the single highest-impact structural finding. Every SAST run should flag this first.
- In-memory store (no database) — no SQL injection surface, but also no persistence security to audit
- The intake routes (`/api/intake/zendesk`, `/api/intake/automated`) deliberately skip the enum validation that the main `POST /api/work-items` applies to `type` and `priority`

### False Positive Notes
- `executeAction` in `WorkItemDetailPage.tsx` — NOT `eval`-style dynamic execution; it's a React callback wrapper. Safe to skip in pattern scans.
- `Math.random()` not present in source (no weak PRNG finding needed)
- No hardcoded secrets found anywhere in Source/ — `platform/.env.example` has `GITHUB_TOKEN=` (empty placeholder, not a real secret)
- GitHub Actions workflows correctly use `${{ secrets.ANTHROPIC_API_KEY }}` — no CI credential leakage

### Files to Prioritise Each Run
1. `Source/Backend/src/app.ts` — auth middleware, CORS, security headers
2. `Source/Backend/src/routes/intake.ts` — webhook auth, input validation
3. `Source/Backend/src/routes/workflow.ts` — error message leakage in catch blocks
4. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox attribute
5. `Source/Backend/src/routes/workItems.ts` — pagination limit validation
