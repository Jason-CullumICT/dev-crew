# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-06-08

### Tools Available
- **gitleaks**: NOT INSTALLED — must fall back to LLM pattern scan for secrets
- **semgrep**: NOT INSTALLED — must fall back to LLM pattern scan for CWEs

### Codebase Profile
- **Stack**: TypeScript, Express 4 (Backend), React/Vite (Frontend), prom-client, uuid
- **No DB**: Data lives in an in-memory `Map<string, WorkItem>` — no SQL injection surface
- **No auth**: Zero authentication/authorization throughout (confirmed design gap, not misconfig)
- **No crypto**: No cryptographic operations in first-party code — no weak-hash risk
- **No eval/exec**: No dynamic code execution patterns found

### Confirmed Real Issues (Not False Positives)
- All `/api/*` routes are unauthenticated — confirmed by reading `app.ts` (only `errorHandler` middleware)
- Intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) skip enum validation for `type`/`priority`
- `workflow.ts` catch blocks surface raw exception messages to clients in 500 responses
- All three Dockerfiles (`Dockerfile.orchestrator`, `Dockerfile.worker`, `portal/Dockerfile`) have no `USER` directive → run as root
- `platform/docker-compose.yml` mounts Docker socket AND host credentials file

### Known Non-Issues / False Positive Patterns
- `RESOLVED_STATUSES` including `Rejected` is intentional design (rejected items should unblock dependents)
- `docId` sequential counter (`WI-001`) — enumerable but not used as an access-control key; UUID is the lookup key
- `VITE_PORTAL_URL` in iframe — set at build time, not user-controlled at runtime
- `req.params.id` fed into `items.get(id)` — Map key lookup, not SQL/NoSQL injection surface

### Files to Always Prioritize
- `Source/Backend/src/app.ts` — middleware chain (auth gaps immediately visible)
- `Source/Backend/src/routes/intake.ts` — webhook endpoints with no auth/sig verification
- `Source/Backend/src/routes/workflow.ts` — catch blocks leaking exception messages
- `platform/docker-compose.yml` — Docker socket and credential mounts
- `platform/Dockerfile.*`, `portal/Dockerfile` — root user check

### Feature Gap Noted
- `/api/search` endpoint called by frontend (`client.ts` line 101) but NOT implemented in backend — dead frontend code or missing feature
