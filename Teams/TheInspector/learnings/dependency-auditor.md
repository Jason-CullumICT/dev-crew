# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Current Audit Status (2026-08-17)

**Grade: D** (Critical vulnerabilities + high dependency complexity)

### Critical Packages Under Watch

1. **handlebars** — 6+ CVEs (JS injection, code execution)
   - Used in Source/Backend
   - Requires immediate upgrade to 4.7.9+
   - Consider alternative templating (mustache, ejs, nunjucks)

2. **vitest** — Arbitrary file read when UI server runs (CVSS 9.8)
   - Direct dep in portal/Frontend
   - Transitive in Source/Frontend
   - Upgrade to 3.2.6+ or 4.1.10+
   - **CRITICAL:** Audit CI jobs for `vitest --ui` usage

3. **protobufjs** — Arbitrary code execution
   - In portal/Backend (via grpc likely)
   - Patch immediately upon availability
   - Review gRPC message handling

### Recurring Issue: Large Transitive Dependency Trees

- **portal/Backend**: 577 total (397 prod) — largest surface
- **portal/Frontend**: 424 total (9 prod) — mostly dev tools
- Recommendation: Implement Dependabot or Snyk for continuous monitoring

### Tools Used

- `npm audit --json` — works reliably; exit code 1 on vulns (expected)
- `npm outdated` — requires installed node_modules (not available here)
- `npm list` — shows unmet dependencies; consider running `npm ci` in pipelines

### Audit Coverage

All 6 npm projects scanned:
- Source/Backend, Source/Frontend, Source/E2E ✅
- platform/orchestrator ✅
- portal/Backend, portal/Frontend ✅

Skipped: Demo projects (abac-*) are non-production references.

### Escalations to TheGuardians

1. **handlebars SSTI** — code execution in template compilation
2. **vitest RFI** — arbitrary file read with no auth
3. **protobufjs RCE** — message deserialization exploit
4. **form-data CRLF** — HTTP header injection
5. **postcss XSS** — unescaped CSS output
6. **nanoid predictability** — if used for tokens (VERIFY)

### Next Steps

- [ ] Update handlebars to 4.7.9+ in Source/Backend
- [ ] Update vitest to 4.1.10+ in frontend projects
- [ ] Run `npm audit fix --workspaces` and test
- [ ] Implement CI gate: reject PRs with critical CVEs
- [ ] Plan React 19 migration (pino also 2 majors behind)

### Historical CVE Watch List

- **handlebars**: Chronically vulnerable; 6+ CVEs in 4.x line. High maintenance burden.
- **vitest**: Young project with growing surface; UI server security was overlooked in initial releases.
- **brace-expansion**: Known DoS vector; ensure version is locked.

---

## Session Notes

Run ID: run-20260817-030823  
Database: 2,159+ total dependencies across 6 projects  
Critical findings: 4 (handlebars, vitest, protobufjs, implied)  
High findings: 28+  
Moderate findings: 64+  
License compliance: ✅ PASS  
Abandoned packages: None (handlebars has poor maintenance posture)
