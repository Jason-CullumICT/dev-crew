# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-07-27

### Tools Available
- `gitleaks`: **NOT INSTALLED** — fall back to LLM pattern scan for secrets
- `semgrep`: **NOT INSTALLED** — fall back to LLM pattern scan for SAST patterns

### Confirmed False Positives
- None yet.

### High-Priority Files (always scan first)
- `Source/Backend/src/app.ts` — central middleware config; CORS, headers, auth all live here
- `Source/Backend/src/routes/workflow.ts` — all error paths pass `err.message` to client (CWE-209 pattern, confirmed)
- `Source/Backend/src/routes/intake.ts` — unauthenticated webhook intake (no signature validation)

### Confirmed Real Patterns
- **No authentication anywhere**: The entire backend API has zero auth middleware — confirmed by reading `app.ts` end-to-end. CWE-306. High.
- **No CORS**: No `cors` package imported or manual CORS headers set. CWE-942. High.
- **No helmet / security headers**: No `helmet` import, no CSP/HSTS/X-Frame-Options. CWE-16. High.
- **Error message disclosure**: All `catch` blocks in `workflow.ts` pass raw `err.message` to the HTTP 500 response body. Pattern: `res.status(500).json({ error: message })`. CWE-209. Medium.
- **Unbounded pagination**: `parseInt(req.query.limit)` with no `isNaN` guard and no max-cap. Routes: `workItems.ts:70`, `dashboard.ts:18`. CWE-20. Medium.
- **Intake enum bypass**: `/api/intake/zendesk` and `/api/intake/automated` accept `body.type` and `body.priority` without enum validation. CWE-20. Medium.
- **iframe no sandbox**: `DebugPortalPage.tsx` embeds an iframe with no `sandbox` attribute. CWE-1021. Low.

### Auto-Generated / Safe to Skip
- `Source/Backend/tests/` — test fixtures; no prod secrets expected
- `Source/Frontend/tests/` — test mocks; not shipped

### Notes
- No hardcoded secrets found in first-party source (good).
- No `eval`, `Function()`, or `innerHTML` usage found.
- No weak crypto (MD5/SHA1/DES) usage found.
- A `/api/search` endpoint is called by the frontend client (`api/client.ts:101`) but has no corresponding backend route file — this is a missing implementation bug, not a security issue. Flag to the pen-tester for 404 behavior.
