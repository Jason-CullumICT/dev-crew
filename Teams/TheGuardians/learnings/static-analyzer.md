# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-09-07

### CLI Tool Availability
- `gitleaks`: **NOT INSTALLED** — LLM pattern scan used instead
- `semgrep`: **NOT INSTALLED** — LLM pattern scan used instead
- `npm audit`: not run (no CVE scanning per scope rules)

### Files to Always Prioritise
- `Source/Backend/src/app.ts` — central middleware config (auth, CORS, headers)
- `Source/Backend/src/routes/intake.ts` — public webhook endpoints with weak validation
- `Source/Backend/src/routes/workItems.ts` — pagination limit cap missing
- `Source/Backend/src/routes/workflow.ts` — unvalidated overrideRoute parameter
- `platform/docker-compose.yml` — Docker socket mounting (HIGH risk, platform scope)

### Known Findings (not false positives)
- **No auth middleware**: Confirmed absence. No jwt/passport/session/cookie in any backend src file. All endpoints are fully public.
- **No rate limiting**: Confirmed. No rateLimit/throttle middleware anywhere.
- **No search route**: `Source/Frontend/src/api/client.ts` calls `/api/search` but no backend handler exists — `searchItems()` will 404.
- **Intake enum bypass**: `/api/intake/zendesk` and `/api/intake/automated` accept unvalidated `type`/`priority` values.
- **Pagination limit cap**: `parseInt(req.query.limit)` has no max cap in `workItems.ts` and `dashboard.ts`.

### False Positives / Intentional Patterns
- In-memory store (`workItemStore.ts`) is intentional design, not a security misconfiguration.
- `process.stdout.write` in logger is intentional (not a secret leak).
- `platform/.env.example` has no hardcoded secrets — all values are empty or defaults.
- `GITHUB_TOKEN=` in `.env.example` is an empty placeholder — not a secret.
