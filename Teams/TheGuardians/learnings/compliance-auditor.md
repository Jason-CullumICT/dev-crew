# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this codebase consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-05-18 — Initial Audit

### Frameworks In Scope
- OWASP-ASVS Level 2 (focus: authentication, access-control, data-protection)
- SOC2-Type2: CC6.1, CC6.2, CC6.3, CC7.1, CC8.1

### Architecture Notes (Relevant to Compliance)
- **Backend**: Express/TypeScript, in-memory store (Map), no database, no persistence layer.
  - Because storage is in-memory only, "encryption at rest" controls (V6.x) are largely not applicable until a persistence layer is added. Flag this when a DB migration lands.
- **No authentication system whatsoever** — not even a placeholder. This is by far the largest compliance gap.
- **No sensitive fields in current schema** — the `WorkItem` entity has no `email`, `password`, `token`, `secret`, or `api_key` fields. The `sensitive_fields` list in `security.config.yml` doesn't map to any current entity fields. Revisit when user management is introduced.
- **Change history is present** (CC8.1 partial credit) but is entity-embedded, not a standalone audit log stream.

### Controls This Project Consistently Fails
1. **CC6.1 / V4.2.1 — Authentication & Access Control**: The single largest gap. No auth middleware, no session, no JWT. Every endpoint is anonymous. This must be the first remediation.
2. **CC7.1 / V7.2.2 — Audit Events**: `login_attempt`, `permission_denied`, `data_export` are entirely absent. `state_transition` is partially captured in change history but not emitted as a structured audit event.
3. **V14.4.1 — Security Headers**: `helmet` is not in `package.json`. Easy win — one `npm install` + one line in `app.ts`.
4. **V14.4.6 — CORS**: No `cors` middleware. Easy win.
5. **V2.2.1 — Rate Limiting**: No `express-rate-limit`. Easy win.

### Controls That Are Architectural Non-Issues (for This Domain)
- **V6.2.x (encryption at rest)**: In-memory store; no disk persistence. Not applicable until a database is introduced.
- **V6.3.x (random values)**: UUIDs via `uuid` library for IDs. Acceptable.
- **V2.1.1 (password complexity)**: Not applicable until a user auth system is built.
- **V13.1.x (generic web service security)**: Backend is a JSON API, not a web app serving HTML. CSP and X-Frame-Options matter less here; focus on JWT and auth instead.

### Framework Mapping Ambiguities Resolved
- **GDPR Art. 17** is not listed in `security.config.yml frameworks` but is architecturally relevant because work items can contain user-supplied text (potential PII). Added as COMP-011 with Medium severity. If the team wants to formally include GDPR, it should be added to `security.config.yml compliance.frameworks`.
- **SOC2 CC8.1** maps to both webhook integrity (COMP-013) and change-management audit trail (partially passed via `changeHistory`). Treat as partial until webhook HMAC verification is added.

### Remediation Priority Order (Top 5)
1. **COMP-001** — Add authentication (JWT/bearer token) — unblocks CC6.1, CC6.2, V4.2.1
2. **COMP-002** — Add RBAC — satisfies CC6.3, V4.1.1
3. **COMP-006** — Implement `audit.ts` for structured audit events — satisfies CC7.1, V7.2.2
4. **COMP-003 / COMP-004 / COMP-005** — Add `helmet`, `cors`, `express-rate-limit` (1-day effort, three easy wins)
5. **COMP-013** — Add webhook HMAC signature verification — satisfies CC8.1 fully
