# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Latest Audit (2026-07-16)

**Summary:** dev-crew has 94 CVEs across 6 workspaces. 6 critical, 16 high severity. Focus areas: protobufjs RCE, handlebars JS injection, vitest file disclosure.

### Critical Packages to Watch
1. **protobufjs** — Multiple RCE + DoS CVEs (GHSA-xq3m-2v4x-88gg). Used in platform/orchestrator, portal/Backend. Needs immediate update.
2. **handlebars** — 7+ JavaScript injection + XSS CVEs (CVSS 9.8). Transitive in Source/* workspaces. Update to 4.7.9+.
3. **vitest** — Arbitrary file read/execution when UI server running (GHSA-5xrq-8626-4rwp). Used in portal/*, Source/Frontend. Disable UI in CI/CD.
4. **form-data** — CRLF injection in multipart headers (GHSA-hmw2-7cc7-3qxx, CVSS 7.5). Transitive in all workspaces.
5. **react-router-dom** — Open redirect via protocol-relative URLs (GHSA-2j2x-hqr9-3h42). Current: 6.26.0 (vulnerable). Fix: 6.30.4+.

### Dependency Hotspots
- **portal/Backend:** 577 total dependencies (397 prod) — supply chain risk. 54 total CVEs. Audit for unused deps.
- **Source/Backend:** 411 total deps, 9 CVEs. express (4.18.2) is 1 major behind, may have unpatched security fixes.
- **platform/orchestrator:** 155 deps, 1 critical (protobufjs). Uses gRPC; @grpc/grpc-js has high-severity CVEs.

### Maintenance Debt
- **uuid:** 9.0.0 is 5 major versions behind (14.0.1). Likely missing security patches.
- **pino:** 8.17.0 is 2 major versions behind (10.3.1).
- **vite:** 5.4.0 is 2 major versions behind (8.1.4). Transitive esbuild vulnerability.

### Environment Notes
- npm audit works well on all 6 workspaces. Tools: npm audit --json, npm outdated --json
- No Python, Go, or Rust package managers detected in Source/ directories
- E2E workspace is clean (0 CVEs)

### Recommendations
1. Add `npm audit --audit-level=moderate` to CI/CD; fail builds on critical/high
2. Use Dependabot for automated updates
3. Quarterly dependency audits, especially portal/Backend
4. Establish SLA: critical CVEs fixed within 24h, high within 1 week
5. Implement npm-check-updates to identify outdated packages

### Escalation Checklist
When reporting to TheGuardians:
- [ ] Mention protobufjs RCE (exploitable if untrusted data)
- [ ] Flag handlebars JS injection risk (check if app uses Handlebars templates)
- [ ] Note vitest disclosure in dev environments (CI/CD risk)
- [ ] Confirm CRLF injection risk in form-data (HTTP header manipulation)
- [ ] Check react-router open redirect exposure

### Tools Available
- `npm audit --json` — outputs full vulnerability data with CVE URLs
- `npm outdated --json` — lists version gaps
- `npm ls --depth=0` — direct dependencies only
- No license-checker installed; manual check via `package.json` license fields if needed
