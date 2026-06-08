# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-06-08

### Application Profile
- **Stack:** Express.js (TypeScript) backend, React (Vite) frontend, in-memory Map store (no DB)
- **Domain:** Internal workflow orchestration engine (work-item routing, assessment, dispatch)
- **Data model:** WorkItem entity — NO PII fields (no email, password, token, secret, api_key in the WorkItem schema)
- **Authentication:** NONE — this is the single largest compliance gap

### Controls This Project Consistently Fails
1. **Authentication / CC6.1 / ASVS V2.1** — No auth layer at all. All 15+ endpoints are open. This is the root cause of ~7 downstream control failures (CC6.2, CC6.3, ASVS V4.x, login_attempt/permission_denied audit events).
2. **HTTP Security Headers / ASVS V14.4.x** — `helmet` is not installed. All 5 header controls fail.
3. **TLS / ASVS V9.1.x** — HTTP-only; no HTTPS enforcement anywhere.
4. **Required audit events** — `login_attempt` and `permission_denied` are structurally impossible without auth. `data_export` is never emitted. Only `state_transition` is partially covered.
5. **Rate limiting / ASVS V2.2.1** — No `express-rate-limit` or similar. Pagination has no upper cap.
6. **Webhook signature verification** — `/api/intake/zendesk` ignores Zendesk HMAC signatures.

### Controls That Are Architectural Non-Issues for This Domain
- **Sensitive field encryption at rest (ASVS V8.1.1):** The WorkItem model stores NO PII (no email, password, token, secret, api_key). This control passes by absence. If an `assignee` or `reporter` field with email is ever added, this will immediately flip to FAIL.
- **Password hashing (ASVS V2.4.x):** N/A — no password management in the Source app (orchestrator credentials live in `platform/`, outside audit scope).
- **GDPR Art. 32 encryption:** Low concern given no PII, but note the soft-delete-only design is still a GDPR Art. 17 gap.

### Framework Mapping Ambiguities Resolved
- **SOC2 CC8.1** maps to both backup/recovery AND change management. The WorkItem `changeHistory` array satisfies the change-tracking sub-requirement but not backup/recovery. Treat as PARTIAL.
- **OWASP-ASVS `state_transition` audit event:** The config requires a structured `event_type: state_transition` log field. Current `logger.info({ msg: 'Work item dispatched', … })` entries do satisfy the spirit but not the letter. Mark PARTIAL, not PASS.
- **CC7.1** covers security monitoring, not just operational monitoring. Prometheus counters are operational. CC7.1 is PARTIAL until a security SIEM or alerting pipeline is wired.

### Prioritised Remediation Order (for team backlog)
1. **P1 — Auth middleware** (unblocks CC6.1, CC6.2, CC6.3, and audit event gaps simultaneously)
2. **P1 — `helmet` middleware** (single line, fixes 5 header controls)
3. **P2 — Structured audit events** (add `event_type` field to logger; emit login/deny/export events)
4. **P2 — Rate limiting** + pagination cap
5. **P2 — Webhook HMAC verification** for `/api/intake/zendesk`
6. **P3 — TLS** (reverse proxy / load balancer config, not Express)
7. **P3 — Hard delete endpoint** (GDPR Art. 17 preparedness)
8. **P4 — Persistent store** (SOC2 CC8.1 backup requirement)
