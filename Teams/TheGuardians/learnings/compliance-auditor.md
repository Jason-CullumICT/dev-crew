# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-04-27

### Codebase Profile
- Express/TypeScript backend, React/Vite frontend, in-memory store (no database layer)
- Workflow engine domain: work items, state transitions, assessment pods
- No authentication, no authorization, no session management — the entire API is unauthenticated

### Controls This Project Consistently Fails
1. **Authentication (OWASP V2, V4, SOC2 CC6.1/CC6.2/CC6.3)** — Zero auth anywhere. This is the root cause of most failures. All auth-dependent controls cascade-fail from this single gap.
2. **Audit Logging (SOC2 CC7.1, OWASP V7.2)** — Required events `login_attempt`, `permission_denied`, `data_export` are architecturally absent. Only `state_transition` is partially covered by operational info-level logs (but without actor identity). Structured logging infra exists (`utils/logger.ts`), just needs a dedicated `audit()` function.
3. **HTTP Security Headers (OWASP V14.4)** — No Helmet. No CORS. These are missing from `app.ts`. Simple fix: `npm install helmet cors` + two middleware lines.
4. **Rate Limiting (OWASP V4.2.2)** — No `express-rate-limit`. Trivial to add.
5. **Webhook Source Verification (OWASP V4.3)** — `/api/intake/zendesk` and `/api/intake/automated` lack HMAC signature validation.

### Controls That Reliably Pass
1. **No hardcoded credentials** — project enforces env vars via `.env` pattern per CLAUDE.md
2. **Data minimization** — the `WorkItem` model contains zero PII fields; none of the `sensitive_fields` (email, password, token, secret, api_key) appear in the data model
3. **Generic error responses** — `errorHandler.ts` returns `{ error: 'Internal server error' }` without stack traces
4. **Input validation** — routes validate enums (type, priority, source, complexity) and required fields

### Architectural Non-Issues for This Domain
- **Encryption at rest** — the in-memory store has no persistence layer. If a DB is added later, encryption at rest must be revisited. For the current build it is N/A.
- **MFA** — no user-facing login system exists at all. MFA cannot be assessed until authentication is added.
- **GDPR data subject access** — the WorkItem entity has no PII, so DSARs have minimal scope currently.

### Framework Mapping Notes
- SOC2 CC6.x controls all collapse into the single auth gap; fixing COMP-001 and COMP-002 unblocks most of CC6.
- OWASP ASVS L2 V7.x (logging) is partially addressed — the structured logger is good, but the audit events config in `security.config.yml` defines events that require auth to exist first.
- ISO 27001 A.9.4 maps cleanly to the same auth gap.
- GDPR Art. 17 is the only unique GDPR finding — the soft-delete-only pattern means hard erasure is not possible.

### Recommended First Fix (highest ROI)
Add authentication middleware first (COMP-001). This single change unlocks meaningful progress on CC6.1, CC6.2, CC6.3, V4.1.1, V4.1.2, V4.1.3, and enables the audit events (COMP-003) to carry actor identity. The project's logging infrastructure is already solid — it just needs the actor context injected.

### Pagination Cap
`GET /api/work-items?limit=N` — no maximum cap enforced. Fix is one line:
```typescript
const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string, 10) : 20, 100);
```
