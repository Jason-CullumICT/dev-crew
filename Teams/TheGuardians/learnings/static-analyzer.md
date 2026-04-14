# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-04-14

### Tool Availability
- `gitleaks`: NOT installed — fall back to LLM pattern scan for secrets
- `semgrep`: NOT installed — fall back to LLM pattern scan for SAST patterns
- RUN_ID from environment: unavailable when invoked standalone (only set in GitHub Actions context)

### Confirmed False Positives / Not Findings
- `eval` keyword in `Source/Backend/src/metrics.ts` and test files — these are matches on the word "evaluation" in comments/variable names, not dynamic code execution. Safe to skip in future runs.
- `executeAction` in `Source/Frontend/src/pages/WorkItemDetailPage.tsx` — this is a React state helper, not dynamic code execution.
- The `platform/.env.example` file references a public GitHub repo URL — NOT a secret, just documentation.

### Real Patterns Confirmed in This Codebase
1. **No auth middleware whatsoever** — `Source/Backend/src/app.ts` has no auth layer. This is the most critical structural issue.
2. **Intake webhooks have no signature verification** — `Source/Backend/src/routes/intake.ts` accepts unauthenticated requests.
3. **Pagination `limit` param has no upper cap** — confirmed in `workItemStore.ts:35` and routes. No `MAX_LIMIT` enforcement.
4. **Workflow route catch blocks leak `err.message`** — pattern is consistent across all 5 action routes in `workflow.ts`.
5. **No helmet middleware** — confirmed by grepping `app.ts`; no CORS, helmet, or security headers.
6. **Docker runs as root** — `portal/Dockerfile` has no `USER` directive.
7. **iframe has no sandbox** — `Source/Frontend/src/pages/DebugPortalPage.tsx:9`.

### Files to Prioritize in Future Runs
1. `Source/Backend/src/app.ts` — top-level middleware config
2. `Source/Backend/src/routes/intake.ts` — webhook receivers, always check auth
3. `Source/Backend/src/routes/workflow.ts` — error handling patterns
4. `Source/Backend/src/routes/workItems.ts` — pagination and query param handling
5. `portal/Dockerfile` — container security
6. `.github/workflows/` — CI/CD secret handling
