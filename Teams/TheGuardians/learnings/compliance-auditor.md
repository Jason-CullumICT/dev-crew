# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-04-15 — Initial Full Audit

### Application Domain
This is a **work-item workflow engine** (not a user-facing SaaS with accounts). The data model (`WorkItem`) contains NO PII fields — no email, password, token, secret, or api_key appear in the schema. The `sensitive_fields` list in security.config.yml is therefore currently N/A for encryption-at-rest checks. However, this could change rapidly if user attribution is added, so the controls should remain in scope as a forward-looking gate.

### Controls This Project Consistently Fails
- **Authentication (ASVS 2.x, 4.1.1, CC6.1/6.2/6.3):** The application has zero authentication. This is the single largest gap. It affects every other control category because without authn, there can be no authz, no audit identity, and no permission_denied events.
- **TLS (ASVS 9.1.1):** Nginx runs HTTP-only. Straightforward fix — add a TLS block and redirect.
- **Security Headers (ASVS 14.4.x):** No Helmet. One line of middleware fixes this entire category.
- **Audit Events (CC7.1):** `login_attempt` and `permission_denied` are structurally absent because there is no auth system. `data_export` is absent because bulk list endpoints are not logged. `state_transition` is partially logged via ad-hoc `msg` strings — needs a structured `event_type` field.
- **Rate Limiting (ASVS 4.2.2):** No `express-rate-limit`. Pagination has no max cap.

### Controls That Are Architectural Non-Issues For This Domain
- **Password storage (ASVS 2.4.x):** No user accounts, no passwords to store.
- **MFA (ASVS 2.8.x):** No user authentication system at all — MFA is blocked on COMP-001.
- **Sensitive data in logs (ASVS 7.1.1):** The data model has no PII, so no sensitive fields appear in log output. PASS.
- **Business logic integrity (ASVS 11.1.x):** The state machine is well-implemented with `VALID_STATUS_TRANSITIONS` enforced. PASS.

### Framework Mapping Notes
- SOC2 CC8.1 is a stretch control for this app — it maps most naturally to the state machine enforcement and changeHistory audit trail, which both exist. The control partially passes despite no formal change-approval workflow.
- GDPR Art. 17 is not in the config frameworks but was flagged because soft-delete-only violates the spirit of the control if PII is ever stored.
- The intake webhook endpoints (`/api/intake/zendesk`) are a persistent HMAC-gap risk — they are designed to receive external system events but have no signature verification.

### Scoring Baseline (for future runs to track regression/improvement)
- OWASP-ASVS L2: 2/19 controls pass (10.5%)
- SOC2: 0 full pass, 2 partial, 3 fail
- Total findings: 12 (3 High, 6 Medium, 3 Low)
