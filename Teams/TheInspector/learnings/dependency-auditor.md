# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-30

### Critical CVEs Found
1. **handlebars@4.7.8** — 8 CVEs including JavaScript Injection (CVSS 9.8). Affects Source/Backend.
2. **vitest@2.0.5** — Arbitrary file read/execution via UI server (CVSS 9.8). Affects Source/Frontend & portal/Frontend.
3. **protobufjs@<=7.6.4** — RCE in protobuf handling (CVSS 8.1). Transitive in platform/orchestrator via gRPC deps.
4. **@opentelemetry/auto-instrumentations-node** — Prometheus exporter & gRPC crashes. Direct in portal/Backend.

### High-Priority Packages (Watch List)
- `handlebars` — Frequent AST injection CVEs. Check for template version bumps monthly.
- `vitest` — UI server is attack surface. Must be ≥3.2.6 for dev environments.
- `vite` — Path traversal and Windows bypass vulnerabilities. Update frequently.
- `react-router-dom` — Open redirect CVEs. Monitor for v7.x releases.
- `form-data` — CRLF injection in multipart encoder. Affects all workspaces via transitive deps.

### Dependency Tree Analysis
- **Portal/Backend**: 577 total deps (397 prod + 181 dev + 75 optional) — HIGH SURFACE AREA
- **Portal/Frontend**: 424 total deps (9 prod + 416 dev + 49 optional) — Mostly dev-time (vitest, vite, MSW)
- **Source/Backend**: ~50 total deps (lean, express-based)
- **Source/Frontend**: ~150 total deps (React + Vite + Testing)
- **platform/orchestrator**: 155 total deps (Docker API + Express)

### Version Gaps Across Workspaces
| Package | Backend | Portal/Backend | Frontend | Status |
|---------|---------|----------------|----------|--------|
| express | 4.18.2 | 4.18.2 | — | Inconsistent (need 4.22.2+) |
| vitest | — | 1.2.2 | 2.0.5 | Portal version is older, also vulnerable |
| vite | — | 5.2.0 | 5.4.0 | Need ≥5.4.0 globally |
| uuid | 9.0.0 | 9.0.0 | — | Need ≥9.0.1 |
| OpenTelemetry | — | 0.40.0 (auto-inst), 0.47.0 (SDK) | — | 174+ versions behind latest |

### Remediation Checklist
- [ ] Handlebars: Update to ≥4.7.9 in Source/Backend
- [ ] Vitest: Update to ≥3.2.6 in Source/Frontend and portal/Frontend
- [ ] OpenTelemetry: Audit and plan upgrade in portal/Backend (major footprint)
- [ ] Express: Align versions across all workspaces (target 4.22.2)
- [ ] Form-data: Run `npm audit fix` across all workspaces
- [ ] Setup: Enable `npm audit` in GitHub Actions (fail on CRITICAL/HIGH)

### Audit Tools Available
- `npm audit --json` — Works in all workspaces, includes CVSS scores and fix availability
- `npm outdated --json` — Lists packages >1 major version behind
- `npx license-checker --json` — (Optional) Generate license compliance report

### Notes for Next Audit
- Run audit weekly; escalate P1 findings within 24 hours
- After fixes, verify with `npm test` in all workspaces
- Check if CI/CD has npm audit integrated (recommend: fail PRs on CRITICAL)
- Portal/Backend OpenTelemetry upgrade is complex (gRPC, protobuf cascade); coordinate with backend team
