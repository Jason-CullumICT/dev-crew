# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-08-03

### Application Domain Context
- This is a **workflow management engine** (work items, state machines, dispatch). It is **not a user-management or authentication system**.
- The `compliance.sensitive_fields` list (`email`, `password`, `token`, `secret`, `api_key`) are **entirely absent from the domain model** (`WorkItem`). There are no user accounts, credentials, or PII fields in the data model.
- The practical risk is therefore about **infrastructure security** (who can call the API, how API activity is logged) rather than **data encryption** (no sensitive data to encrypt at rest).

### Controls That Consistently FAIL

1. **Authentication (CC6.1, CC6.2, ASVS V4.1.1)** — No auth layer exists. This is the most fundamental gap. All routes are publicly accessible with no credentials.
2. **Authorization / RBAC (CC6.3, ASVS V4.1.3)** — No roles, no least-privilege model.
3. **Required Audit Events (CC7.1, ASVS V7.1.1)** — `login_attempt`, `permission_denied`, `data_export` are absent. `state_transition` is partially covered by operational logs but lacks an explicit `event_type` field.
4. **TLS Enforcement (ASVS V9.1.1)** — App listens on plain HTTP; no TLS at application layer.
5. **Security Headers / CORS (ASVS V14.4.1)** — No helmet, no CORS middleware in backend.
6. **Durable Audit Trail (CC7.1, ISO A.12.4.1)** — In-memory store only; all history lost on restart.

### Controls That PASS

1. **CC8.1 — Change management** — `WorkItem.changeHistory` is a well-implemented append-only log tracking every field mutation with timestamp, agent, and reason. This is genuinely strong.
2. **ASVS V7.1.2 — No sensitive data in logs** — Logger only emits domain fields (IDs, statuses); no PII ever logged.
3. **ASVS V8.1.1 — PII minimization** — Domain model contains no sensitive fields.

### Framework Mapping Notes

- **GDPR/ISO 27001 are NOT in `security.config.yml`** but the team-leader/user may request them explicitly. Cover them when asked; map to the standard article numbers.
- **SOC2 CC8.1** maps to "change management controls" — in this codebase, that means `WorkItem.changeHistory`. It passes because the implementation is solid.
- **ASVS V2.1.1** (password hashing) is N/A for this domain — no user accounts. Mark it explicitly N/A to avoid false negatives.
- **ASVS sessions (V3.x)** — All fail/N/A because there is no auth layer at all. Bundle them under COMP-01 rather than filing separate findings per session control.

### Architectural Non-Issues for This Domain

- **Encryption at rest for sensitive fields**: N/A — the listed sensitive fields don't exist in `WorkItem`. If this domain ever adds user accounts or stores credentials, this changes immediately.
- **Password reset / account lockout**: N/A — no user accounts.
- **File upload security**: N/A — no file handling.

### Patterns to Watch for in Future Runs

- If a `User`, `Account`, or `Session` model is ever added, immediately check for bcrypt/argon2 password hashing and JWT secret rotation.
- The intake webhook (`/api/intake/zendesk`, `/api/intake/automated`) is a high-risk surface: it accepts arbitrary data with no auth. Always check for HMAC signature verification here.
- The `/metrics` endpoint is always unauthenticated in this codebase — flag it every run until fixed.
- Pagination `limit` has no max cap in both `/api/work-items` and `/api/dashboard/activity` — flag consistently.
- The `trackFieldChange` logger call in `changeHistory.ts` logs raw `oldValue`/`newValue` — safe now but watch if sensitive fields are ever added.
