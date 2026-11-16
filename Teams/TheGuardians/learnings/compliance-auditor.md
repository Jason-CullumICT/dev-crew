# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-11-16 — Initial Audit

### Application Domain
- This app is a **workflow/work-item tracker** (not a user-facing SaaS with PII).
- Sensitive fields (`email`, `password`, `token`, `secret`, `api_key` from config) do **NOT** appear in the application data model at all — `WorkItem` entities contain no PII.
- Encryption-at-rest for those fields is N/A for the current data model; flag this for future review if a user/auth layer is ever added.
- All data is **in-memory only** (no database). Persistence is not implemented.

### Consistently Failing Controls
1. **Authentication is entirely absent.** The Express app has zero auth middleware. Every endpoint is publicly accessible. This is the top remediation priority.
2. **Access control is entirely absent.** No RBAC, no ownership checks, no middleware. Every caller can approve, reject, or dispatch any work item.
3. **Webhook endpoints are unauthenticated.** `/api/intake/zendesk` and `/api/intake/automated` accept payloads from anyone with no signature verification.
4. **Security HTTP headers are missing.** No `helmet` middleware. No CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
5. **CORS is unconfigured.** Express default: no `Access-Control-Allow-Origin` header on actual API responses, but also no explicit deny — requests from any origin reach all endpoints.
6. **Rate limiting is absent.** All endpoints, especially intake webhooks, can be called without restriction.
7. **Audit events `login_attempt`, `permission_denied`, and `data_export` are never emitted.** Only `state_transition` is partially covered via `changeHistory` + `logger.info`.
8. **No pagination maximum cap.** `limit` query param accepted as-is from caller.
9. **No TLS enforcement.** The app listens on plain HTTP; no redirect to HTTPS.

### Controls That Pass
- No hardcoded secrets — uses `process.env.PORT`; `.env.example` pattern in platform.
- Generic error response body — `errorHandler` returns `{ error: 'Internal server error' }` with no stack trace.
- State transitions are logged — `logger.info` with `workItemId` + `docId` on approve/reject/dispatch/route.
- Structured JSON logging — `utils/logger.ts` emits NDJSON to stdout.
- Prometheus metrics — well-scoped domain counters; `/metrics` endpoint present.
- Input validation — enum fields (type, priority, source, complexity) are validated against allow-lists.

### Framework Mapping Notes
- **SOC2 CC8.1** (Change Management) — not applicable at the application-code level; it refers to organizational change management processes, not code-level controls. Mark as N/A.
- **OWASP-ASVS L2** requires authentication (V2), session management (V3), and access control (V4) as prerequisites; without auth, essentially all V2/V3/V4 controls fail by extension.
- Because the app has no user model at all, GDPR Art. 17 (Right to Erasure) has limited applicability; `softDelete` on work items is noted, but there is no user data to erase.
