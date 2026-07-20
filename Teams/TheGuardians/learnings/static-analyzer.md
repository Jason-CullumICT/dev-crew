# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-07-20

### Tool Availability
- `gitleaks`: NOT INSTALLED — fall back to LLM pattern scan for secrets
- `semgrep`: NOT INSTALLED — fall back to LLM pattern scan for SAST
- Both tools produce empty output via `not available` path; skip the wait

### Codebase Notes
- **No authentication anywhere** — this is the defining characteristic of this codebase. Every single API endpoint is unauthenticated. Not a false positive; confirmed architectural gap.
- **No security headers middleware** (no helmet, no cors package) — confirmed by reading `app.ts` in full.
- **In-memory store only** — no SQL, no ORM, no database queries. SQL injection and NoSQL injection are not applicable. Skip those scan patterns.
- **No `eval`, `Function()`, `child_process`, `innerHTML`, `dangerouslySetInnerHTML`** — confirmed by grep. Dynamic code execution / XSS sink patterns are NOT present.
- **No hardcoded secrets** — `.env.example` has `GITHUB_TOKEN=` (empty). No tokens, passwords, or keys in source files.
- **`Math.random()` not used for tokens** — not present in source. Only `uuid/v4` is used for IDs, which is cryptographically appropriate.
- **Sequential DocIDs** (`WI-001`, `WI-002`) are by design for human readability. Primary IDs use UUIDv4. Low-severity enumeration risk only.

### Reliable Signal Patterns
- `res.status(500).json({ error: message })` in catch blocks → CWE-209 (confirmed real pattern in `workflow.ts`)
- Missing `app.use(helmet())` in `app.ts` → missing security headers (always check app entrypoint first)
- Missing auth middleware before route registration → CWE-306
- Intake routes using `body.type || default` without enum validation → CWE-20

### Files to Prioritise
1. `Source/Backend/src/app.ts` — middleware chain is the fastest scan for auth/headers/CORS
2. `Source/Backend/src/routes/intake.ts` — external-facing webhooks, check for signature verification
3. `Source/Backend/src/routes/workItems.ts` — pagination limit cap, enum cast validation
4. `portal/Dockerfile` — USER directive check

### False Positives to Skip
- `parseInt(..., 10)` in pagination parsing — not injection; radix is always specified
- `executeAction` in `WorkItemDetailPage.tsx` — this is a React callback pattern, not `eval`
- `buildChangeEntry` logging `oldValue`/`newValue` — fields are non-sensitive work item metadata
