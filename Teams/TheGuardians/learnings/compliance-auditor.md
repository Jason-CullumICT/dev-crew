# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-05-11 — Initial Audit (OWASP-ASVS L2, SOC2-Type2)

### Architecture Context
- This is a **workflow engine** (dev-crew Source App): work item intake, routing, assessment, dispatch
- **No user-facing authentication system** has been implemented. The application is a backend API with no auth layer whatsoever.
- **In-memory data store only** (JavaScript Map) — no database, no persistence, no encryption at rest
- Sensitive fields defined in security.config.yml (`email`, `password`, `token`, `secret`, `api_key`) do NOT exist in the current data model — the app deals with WorkItems, not users. This is a structural architecture gap, not a field-level encryption gap.

### Consistent Failures (across this codebase)
1. **Authentication absent entirely** — every OWASP-ASVS V2/V3/V4 control and SOC2 CC6.1/CC6.2 fail because no auth layer exists
2. **Required audit events missing** — `login_attempt`, `permission_denied`, `data_export` cannot be logged without auth; `state_transition` is partially captured in `changeHistory` but lacks authenticated actor identity
3. **No HTTP security headers** — no helmet or equivalent middleware; consistent across all route files
4. **Pagination limit is unbounded** — `?limit=N` accepts any N with no max cap (OWASP ASVS V4 data volume control)
5. **Webhook endpoints unauthenticated** — `/api/intake/zendesk` and `/api/intake/automated` accept any request without signature validation

### Controls That Are Architectural Non-Issues Here
- **Encryption of sensitive fields** (email, password, token, secret, api_key) — these fields do not exist in the WorkItem domain model. If/when a user system is introduced, this must be revisited.
- **GDPR Right to be Forgotten** — no user PII currently. WorkItems contain only workflow metadata. This will need revisiting if user data is added.
- **MFA** — not applicable until authentication is implemented at all.

### Framework Mapping Notes
- SOC2 CC8.1 (Change Management): The WorkItem `changeHistory` array provides application-level change tracking, but this is not a system-level change management control in the SOC2 sense. Mark as PARTIAL.
- SOC2 CC7.1 (Threat Monitoring): Operational logging exists (structured JSON via prom-client + logger), and Prometheus metrics exist. No SIEM/alerting integration observed. Mark as PARTIAL.
- OWASP-ASVS V7 (Error Handling/Logging): Stack traces are logged internally (not sent to client) — this is acceptable per ASVS L2. Client receives only `"Internal server error"`. Mark as PASS for client-facing, but logs need actor identity.

### Ambiguous Framework Mappings
- `state_transition` audit event: The `changeHistory` array inside WorkItem objects captures state transitions but is stored in-memory and lacks authenticated actor identity. This is a PARTIAL pass for the event type but fails on the tamper-evidence and identity requirements.
