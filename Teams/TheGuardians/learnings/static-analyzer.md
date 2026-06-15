# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-06-15

### Tool Availability
- **gitleaks:** NOT installed in this environment — always fall back to LLM scan for secrets.
- **semgrep:** NOT installed in this environment — always fall back to LLM scan for SAST patterns.
- **npm:** Available. `node -e "require('./Source/Backend/package.json').scripts"` works for postinstall checks.

### Confirmed Real Issues (not false positives)
- **SAST-001 (CWE-306):** Zero authentication anywhere — entire API is open. Real issue, not an architecture placeholder.
- **SAST-005 (CWE-20):** `parseInt()` with no NaN guard or upper-bound cap on `limit` in workItems.ts:69-70 and dashboard.ts:17-18. Confirmed pattern — same shape appears in both route files.
- **SAST-006 (CWE-20):** Intake routes (`intake.ts`) explicitly do NOT validate `body.type` and `body.priority` against their enums, while the main `workItems.ts` POST does. This is a real inconsistency, not intentional.
- **SAST-007 (CWE-200):** `/metrics` endpoint is fully open — Prometheus default metrics plus custom counters all exposed without auth.

### Known Non-Issues / False-Positive Patterns
- **`eval` / `exec` / `child_process`:** None present in Source/ — grep confirmed. Do not re-flag.
- **Hardcoded secrets:** Confirmed none. `.env.example` has `GITHUB_TOKEN=` (empty, correct). No API keys, DB URIs, or credentials in any source file.
- **Crypto:** The codebase uses `uuid` v4 (cryptographically secure) for ID generation. Not a crypto weakness.
- **SQL injection:** No database — data is fully in-memory (`Map<string, WorkItem>`). SQL injection patterns are irrelevant.
- **XSS in React:** React JSX auto-escapes all string interpolations. Flags on `{item.title}` etc. are false positives — they are not `dangerouslySetInnerHTML`.

### Files to Prioritise on Next Run
1. `Source/Backend/src/routes/intake.ts` — missing enum validation is a recurring pattern risk
2. `Source/Backend/src/routes/workItems.ts` + `dashboard.ts` — pagination parameter handling
3. `Source/Backend/src/app.ts` — middleware configuration (auth, headers, CORS, rate limiting)
4. `Source/Backend/src/routes/workflow.ts` — catch block error message leakage pattern
5. `portal/Dockerfile` — check if USER directive was added (SAST-008 remediation)

### Architecture Notes
- **In-memory store:** All data lives in a `Map<string, WorkItem>` — no persistence, no SQL, no NoSQL. Injection patterns for DB technologies are N/A.
- **No auth layer:** As of 2026-06-15, there is zero authentication. Any new endpoints must be scanned for the same CWE-306 pattern.
- **platform/ is off-limits for modification** but can and should be scanned. SAST-002 (docker.sock) and SAST-008 (root containers) apply to platform/ and portal/Dockerfile.
- **Vite proxy:** Frontend uses a Vite dev proxy (`/api` → `http://localhost:3001`). CORS absence in the backend is masked in dev but real in production.
- **Prometheus /metrics:** At `Source/Backend/src/app.ts:34-37` — no auth guard. Flag this pattern in any future routes added that expose internal state.
