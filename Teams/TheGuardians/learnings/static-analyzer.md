# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-10-19 (Sonnet 4.6, full-scope)

### Tool Availability
- **gitleaks**: NOT installed — fall back to LLM pattern scan
- **semgrep**: NOT installed — fall back to LLM pattern scan

### Codebase Patterns
- **No authentication middleware anywhere** — the entire API is unauthenticated. This is the single most important finding in every run until fixed.
- **No CORS, helmet, or security-headers middleware** in `Source/Backend/src/app.ts` — check this file first on every run.
- **Intake routes (`Source/Backend/src/routes/intake.ts`)** accept arbitrary `type` and `priority` values from external callers without enum validation — confirmed false-positive-free.
- **`express.json()` has no size limit** in `app.ts:13` — confirmed, not a false positive.
- **Pagination `limit` has no maximum cap** — `Source/Backend/src/store/workItemStore.ts:35` and `Source/Backend/src/routes/workItems.ts:70`.
- **`/metrics` route is public** — at `app.ts:34`, no auth guard. Low severity but informational.
- **Error messages from service layer are sent to clients verbatim** in `workflow.ts` catch blocks — confirmed pattern.
- **DebugPortalPage iframe** (`Source/Frontend/src/pages/DebugPortalPage.tsx`) has no `sandbox` attribute.
- **No hardcoded secrets** found in first-party source code (`Source/`). `platform/.env.example` has empty `GITHUB_TOKEN=` which is safe (placeholder only).

### Known Safe Patterns
- `generateDocId()` uses a sequential counter (`WI-001`) — this is a human-readable label, not a security identifier. Primary IDs use `uuidv4()`. Not a vulnerability.
- `Math.random()` is **not used** in this codebase for security-sensitive purposes. IDs use `uuid`.
- No `eval()`, `exec()`, `execSync()`, `child_process`, `dangerouslySetInnerHTML` found anywhere in `Source/`.
- No hardcoded database URIs, API keys, or credentials in `Source/`.

### Files to Prioritise on Every Run
1. `Source/Backend/src/app.ts` — middleware config, CORS, headers
2. `Source/Backend/src/routes/intake.ts` — webhook auth
3. `Source/Backend/src/routes/workflow.ts` — auth, error leakage
4. `Source/Backend/src/routes/workItems.ts` — pagination limits
5. `Source/Frontend/src/pages/DebugPortalPage.tsx` — iframe sandbox
