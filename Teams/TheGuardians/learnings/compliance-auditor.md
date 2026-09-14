# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-09-14 — Initial Audit (OWASP-ASVS L2 + SOC2-Type2)

### Consistent Failures (Controls This Project Always Fails)

1. **Authentication is entirely absent** — The backend (Express, `Source/Backend/src/app.ts`) registers ZERO authentication middleware. Every endpoint including sensitive workflow actions (approve, reject, dispatch) is open to anonymous access. This is a structural gap, not a config oversight. Until an auth layer (JWT/session) is added, all auth-related controls (ASVS V2, SOC2 CC6.1, CC6.2) will fail automatically.

2. **Authorization / RBAC is entirely absent** — No role checks anywhere in route handlers or services. Consistent failure across ASVS V4, SOC2 CC6.3.

3. **Security middleware stack missing** — No `helmet`, no `cors`, no `express-rate-limit` in `package.json` or `app.ts`. Every security-header and rate-limit control fails by default.

4. **Required audit events never logged** — The four events mandated in `security.config.yml` (`login_attempt`, `permission_denied`, `state_transition`, `data_export`) have no corresponding log calls. `state_transition` is partially captured as operational info logs but is not a typed audit event. The logger has no audit severity level.

5. **In-memory-only store** — `Source/Backend/src/store/workItemStore.ts` keeps all data in a `Map`. There is no database layer, no encryption at rest, and no durable deletion (soft-delete sets a flag in memory). Data-retention and right-to-erasure controls are structurally unachievable until persistence is added.

### Controls That Are Non-Issues For This Domain

- **Sensitive field encryption (email, password, token, api_key)** — The current `WorkItem` data model (`Source/Shared/types/workflow.ts`) contains NO fields matching `compliance.sensitive_fields`. The domain entities are workflow items (title, description, status, priority). Unless future features add user profiles or credentials, field-level encryption is not currently required. The Zendesk intake webhook deserves a watch: if it starts accepting user contact data those fields will need masking.

### Framework Mapping Notes

- SOC2 CC8.1 (Change Management) maps well to the `changeHistory` array on `WorkItem` — that control is partially satisfied.
- SOC2 CC7.1 (Monitoring) maps to structured logging + Prometheus metrics — logging infrastructure is sound, but the audit-event content is the gap, not the plumbing.
- OWASP ASVS V9 (Communication Security) cannot be verified statically from JS source — TLS termination may live in a reverse proxy (nginx/Caddy). Flag as "unverifiable" rather than "failed" until infrastructure config is reviewed.
- The `/metrics` Prometheus endpoint is unauthenticated — this is a SOC2 CC6.1 concern (exposes system internals) but low-severity for internal infra if network-segmented.
