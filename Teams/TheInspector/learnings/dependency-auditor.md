# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-15

### Critical CVEs Found (Watch List)

1. **Handlebars.js** (4.0.0-4.7.8)
   - Multiple JS injection vulnerabilities (CVSS 8.1-9.8)
   - Location: Transitive dependency in Source/Backend
   - Status: Requires identification of root dependency and upgrade
   - Action: npm audit fix or identify & remove if not needed

2. **Vitest** (<=3.2.5)
   - Arbitrary file read/code execution via UI server (CVSS 9.8)
   - Location: Source/Frontend/node_modules/vitest
   - Current Version: ~3.0.x, Minimum Safe: >=3.2.6
   - Action: Immediate upgrade required
   - Fix Command: `cd Source/Frontend && npm install vitest@^3.2.6`

3. **Protobufjs** (<=7.5.5)
   - Arbitrary code execution (CVSS 9.8) + 7 additional high CVEs
   - Location: platform/orchestrator (transitive via @grpc/grpc-js)
   - Severity: CRITICAL (affects orchestrator infrastructure)
   - Action: `npm audit fix` will upgrade @grpc/grpc-js
   - Note: Orchestrator is the pipeline backbone; compromise = full system compromise

4. **Form-data** (4.0.0-4.0.5)
   - CRLF injection via unescaped multipart field names (CVSS 7.5)
   - Affects: Source/Backend, Source/Frontend (transitive)
   - Fix: npm audit fix

5. **@grpc/grpc-js** (1.14.0-1.14.3)
   - Server crash via malformed requests (CVSS 7.5)
   - Affects: platform/orchestrator
   - Fix: npm audit fix

6. **path-to-regexp** (<0.1.13)
   - ReDoS via multiple route parameters (CVSS 7.5)
   - Affects: platform/orchestrator
   - Fix: npm audit fix

### Outdated Major Versions

| Package | Current | Latest | Risk | Notes |
|---------|---------|--------|------|-------|
| express | 4.18 | 4.22 (current) / 5.2.1 (major) | Medium | Minor version gap; 5.x requires testing |
| pino | 8.17 | 10.3.1 | High | 2 major versions behind; structured logging critical |
| uuid | 9.0 | 14.0.1 | **High** | 5 minor versions behind; directly vulnerable (CVE buffer overflow) |
| react | 18.3 | 19.2 | Low | 1 major version; safe upgrade but test thoroughly |
| react-router-dom | 6.26 | 6.30 / 7.18 | Medium | Has open redirect CVE in current version; upgrade to >=6.30.4 |
| vite | 5.4 | 8.1 | Medium | Has path traversal CVEs; upgrade to >=6.4.3 |
| vitest | 2.0 / 3.0 | varies | **High** | Has RCE CVE; must upgrade |

### Supply Chain Risk Observations

- **platform/orchestrator**: 577 transitive dependencies (highest risk surface)
  - Pulls in gRPC, protobufjs, express, dockerode
  - Status: CRITICAL need to audit and lock down

- **portal/Backend**: 397 prod + 181 dev dependencies
  - High-value target for supply-chain attacks
  - Status: Monitor closely

- **Version drift across monorepo**:
  - Demo projects (abac-*) use React 19.2.4 and react-router-dom 7.13.2 (latest)
  - Source/* projects use React 18.3.1 and react-router-dom 6.26-6.30 (older)
  - Recommendation: Align version pins or document rationale for divergence

### Tools & Environment Discoveries

- **npm audit --json** works well and provides full CVE data
- **npm outdated --json** provides version gap information
- No Go modules, Python requirements, Rust Cargo.toml, or Java pom.xml detected
- License-checker not installed; read package.json `license` field manually instead
- All packages use standard OSS licenses (MIT, Apache-2.0, ISC, BSD) — no GPL/AGPL compliance issues

### Audit Process Improvements

1. **Focus on direct dependencies first** — transitive dependencies are numerous and harder to fix without breaking API contracts
2. **Check npm audit fix output** — some fixes require manual version pinning or monorepo-wide coordination
3. **Test major version upgrades separately** — uuid, express, pino require careful testing; can't be lumped into single commit
4. **Document version pins in package.json comments** — helps future maintainers understand why a specific version is locked

### Escalations to TheGuardians

All three P1 (CRITICAL) findings have been escalated:
- **Protobufjs RCE** — Infrastructure compromise risk
- **Vitest RCE** — Build/test pipeline compromise
- **Handlebars Code Injection** — Template rendering vulnerability

TheGuardians should review attack surface and validate that no untrusted input reaches these code paths.

### Next Audit Run

- Recommend running `npm audit` in CI/CD pipeline as part of test gate
- Consider `npm outdated` check for deprecation warnings
- Track CVE resolution time to measure remediation velocity
- Monitor npm security advisories for new discoveries in watched packages

---

## Learnings from Previous Runs

_(none — this is the first audit run)_
