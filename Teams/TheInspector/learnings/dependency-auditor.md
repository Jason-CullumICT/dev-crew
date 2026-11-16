# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-11-16

### Critical Findings Summary
- **6 Critical CVEs** identified across dev-crew components
- **Most critical:** proxy-addr (CVSS 9.1 - IP spoofing), tinypool (RCE in CI), protobufjs (code injection)
- **Total vulnerabilities:** 54 (6 critical, 15 high, 14 medium, 9 low)
- **Supply chain surface:** 790 transitive dependencies (high risk breadth)

### Key Packages Under Watch
- **proxy-addr** (via Express): IPv4-mapped IPv6 spoofing bug in both Backend and Orchestrator. Fix: update Express → >=4.20.0
- **vite** (direct in Frontend): Path traversal in .map handling. Fix: npm install vite@^5.5.0+
- **tinypool** (via Vitest in Frontend): Prototype pollution RCE in test workers. Fix: npm install tinypool@>=4.1.0
- **handlebars** (transitive in Backend): Template injection via AST tampering. Likelihood low (build tool context only).
- **@grpc/grpc-js** (Orchestrator): Multiple DoS and crash CVEs from malformed requests. Fix: update to >=1.14.5

### Ecosystem Assessment
- **Widely-maintained:** Express, React, Vite, Jest all have active maintainers and regular security updates
- **Build toolchain risk:** Babel, browserslist, source-map-js all have known CVEs in build pipeline
- **gRPC ecosystem:** High-risk dependency chain with multiple known vulns in @grpc/grpc-js and protobufjs
- **E2E testing:** Cleanest component (only 4 transitive deps via Playwright)

### License Compliance
✅ **PASS** — No GPL/AGPL detected. Primary dependencies use MIT, Apache 2.0, or ISC (permissive).

### Audit Tools Available
- `npm audit --json`: Full CVE scanning with severity/CVSS info
- `npm outdated --json`: Major version lag detection
- `npm ls --depth=0`: Direct dependency inspection
- Manual license check: Reading package.json license fields (no license-checker tool installed)

### Remediation Priority
1. **Week 1 (Critical):** Vite path traversal + proxy-addr IP spoofing + tinypool RCE
2. **Week 2-3 (High):** Remaining CVEs via npm update chains
3. **Month 2 (Medium):** Major version upgrades (Express v4→v5, React 18→19, uuid 9→14)
4. **Ongoing:** Generate orchestrator lock file to enable reproducible audits

### Known Gaps
- No npm lockfile for `platform/orchestrator/` — non-deterministic transitive versions
- No automated CI scanning configured yet
- No dependency pinning strategy for devDependencies
- No npm provenance/signing in use

### Next Actions
- Create GitHub issues for each P1/P2 finding
- Route P1 findings to TheGuardians for exploit validation
- Implement CI gate: `npm audit --audit-level=high` should fail build
- Monthly audit cadence (next: 2026-12-16)
