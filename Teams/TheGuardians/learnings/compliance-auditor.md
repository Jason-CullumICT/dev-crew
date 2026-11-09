# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-11-09

### Frameworks in Scope
- **OWASP-ASVS Level 2** — focus: authentication, access-control, data-protection  
- **SOC2 Type 2** — controls: CC6.1, CC6.2, CC6.3, CC7.1, CC8.1  
- **GDPR** and **ISO 27001** were also requested in the team-leader prompt (despite not being listed in `security.config.yml`). Treat both as supplemental in every future run.

### Architecture Facts (stable — reuse in future runs)
- **Backend:** Express.js, TypeScript, in-memory `Map` store (no SQL DB, no ORM → no SQL injection risk, no database encryption concern)
- **Frontend:** React + Vite — uses standard JSX (implicit XSS escaping), no `dangerouslySetInnerHTML`
- **No authentication layer of any kind exists** — this is the root cause of ~6 downstream failures
- **No persistent storage** — data is in-memory; "encryption at rest" is architecturally moot until a DB is added
- **Sensitive fields** (`email`, `password`, `token`, `secret`, `api_key`) do NOT currently appear in the data model; flag if any are introduced

### Controls This Project Consistently Fails (as of first run)
1. **Authentication** (OWASP V2, SOC2 CC6.1/CC6.2) — zero auth layer
2. **Authorisation / RBAC** (OWASP V4, SOC2 CC6.3) — zero access control
3. **Security HTTP Headers** (OWASP V14.4) — no `helmet`
4. **CORS Policy** (OWASP V14.5.3) — no `cors` package
5. **TLS** (OWASP V9.1) — plain HTTP, no HTTPS enforcement
6. **Rate Limiting** (OWASP V11.1) — no limit middleware
7. **Audit Events** (SOC2 CC7.1) — `login_attempt`, `permission_denied`, `data_export` are entirely absent; `state_transition` is partially logged but not in a queryable audit-event format

### Controls That Passed (stable — will likely pass in future runs too)
- Structured JSON logging via `utils/logger.ts` ✅
- Prometheus metrics for domain operations ✅
- State machine transition enforcement (`VALID_STATUS_TRANSITIONS`) ✅
- Field-level change history (`ChangeHistoryEntry[]`) ✅
- Enum input validation on routes ✅
- Soft delete with change history ✅
- Generic error response from global `errorHandler` (no stack traces to clients) ✅

### Framework Mapping Notes
- SOC2 CC8.1 is partially satisfied by `ChangeHistoryEntry` on work items — do not mark as full fail; call it "partial"
- SOC2 CC7.1 partial pass: some ad-hoc `logger.info` calls cover state transitions; score as partial not full fail
- ISO 27001 A.14.2 (security in dev process): `CLAUDE.md` enforces architecture rules and no-hardcoded-secrets policy — counts as a process control even without a SAST pipeline

### Ambiguous Mappings Resolved
- OWASP-ASVS V6.2.1 (encryption at rest): mapped as "N/A currently" because no sensitive fields exist in the model — do not score as FAIL until PII is introduced
- OWASP-ASVS V5.2.1 (sanitisation): scored as PARTIAL because enum validation exists but free-text sanitisation is absent

### Pass Rate Summary (2026-11-09 baseline)
- OWASP-ASVS L2: 2/14 = **14%**
- SOC2 Type 2: 0 full pass, 2 partial / 5 = **~20%**
- Overall compliance score: **~29%** (4 definitive passes / 14 audited controls)
