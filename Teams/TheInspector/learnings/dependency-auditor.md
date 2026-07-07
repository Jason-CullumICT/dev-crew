# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-07

### Overall Risk Assessment
- **Risk Level**: HIGH
- **Total Vulnerabilities**: 94 (6 CRITICAL, 16 HIGH, 69 MODERATE, 3 LOW)
- **Outdated Packages**: 25 (12 with major version gaps)
- **Manifests Scanned**: 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)

### Critical Findings (P1) — Immediate Action Required

1. **Vitest** (CVSS 9.8) — Arbitrary file read/execution when UI server listening
   - **Affected**: Source/Frontend, portal/Backend (dev/test dependencies)
   - **Fix**: `npm update vitest to >=3.2.6`
   - **Timeline**: 15 minutes

2. **Handlebars** (7 CVEs, CVSS 8.1-9.8) — JavaScript injection, code execution
   - **Affected**: Source/Backend (transitive via unknown direct dep)
   - **Issue**: Transitive dependency injection attack surface
   - **Action**: Trace direct dependency requiring handlebars and update

3. **Protobufjs** (11 CVEs, CVSS 5.3-9.8) — Remote code execution
   - **Affected**: platform/orchestrator, portal/Backend (transitive via @grpc/grpc-js)
   - **Fix**: `npm update @grpc/grpc-js to >=1.15.0`
   - **Timeline**: 30 minutes

### High Priority Findings (P2) — Update Within 1 Week

1. **Vite** (multiple CVEs) — Path traversal, fs.deny bypass on Windows
   - Current: 5.4.0 | Latest: 8.1.3 (3 major versions behind)
   - **Affected**: Source/Frontend, portal/Frontend
   
2. **@opentelemetry/auto-instrumentations-node** (CVSS 7.5) — Prometheus DoS crash
   - Current: 0.40.3 | Latest: 0.78.0
   - **Fix**: Update to >=0.75.0 minimum

3. **UUID** (CVSS 7.5) — CVE in current version + 5 major versions behind
   - Current: 9.0.1 | Latest: 14.0.1
   - **Affected**: Source/Backend, platform/orchestrator (DIRECT)

### Outdated Major Versions (P3) — Plan Updates

- **React/React-DOM**: 18 → 19 (breaking changes expected)
- **React-Router-DOM**: 6 → 7 (breaking changes expected)
- **Express**: 4 → 5 (breaking changes expected)
- **Dockerode**: 4 → 5 (breaking changes expected)
- **Multer**: 1 → 2 (breaking changes expected)
- **Pino**: 8 → 10 (breaking changes expected)

### Manifests Summary

| Manifest | Direct Deps | Status | Top Finding |
|----------|------------|--------|-------------|
| Source/Backend | 18 | 🔴 CRITICAL | Handlebars (transitive), uuid CVE |
| Source/Frontend | 12 | 🟡 HIGH | Vitest, vite path traversal |
| Source/E2E | 5 | ✅ CLEAN | No vulnerabilities |
| platform/orchestrator | 16 | 🔴 CRITICAL | Protobufjs (transitive via gRPC) |
| portal/Backend | 18 | 🔴 CRITICAL | OpenTelemetry DoS, Vitest |
| portal/Frontend | 10 | 🟡 HIGH | Vite path traversal |

### Tools Availability & Commands Used

- ✅ `npm audit --json` — works across all manifests
- ✅ `npm outdated --json` — returns comprehensive version data
- ⚠️ `license-checker` — not installed in most manifests
- ⚠️ `npm ls {package}` — used to trace transitive dependencies

### License Compliance

- Most manifests use MIT/Apache-2.0/ISC (commercial-friendly)
- Some dependencies have GPL/AGPL transitive dependencies
- **Recommendation**: Run `npx license-checker --json` before release to validate licensing chains

### Supply Chain Observations

1. **Transitive Dependency Risks**: Many critical CVEs are in transitive dependencies (handlebars, protobufjs)
   - Root cause: gRPC ecosystem (protobufjs) and templating libraries (handlebars)
   - **Action**: Implement stricter transitive dependency scanning in CI

2. **Post-Install Scripts**: No post-install script risks detected

3. **Abandoned Packages**: None detected in critical path

4. **Single Maintainer Risk**: Not checked in this audit — future audits should scan npm registry metadata

### Recommendations for Next Audit

1. **CI Integration**: Add `npm audit --audit-level=moderate` to pre-commit hooks
2. **Automated Updates**: Consider GitHub Dependabot or Renovate for patch/minor updates
3. **Lock File Strategy**: Commit package-lock.json, require npm ci in CI/CD
4. **Transitive Dep Tracking**: Map direct → transitive dependency chains for easier debugging
5. **License Compliance Tool**: Install and run `license-checker` as part of release workflow

### Remediation Timeline

- **Phase 1 (Today)**: Update vitest, vite, @opentelemetry/auto-instrumentations-node, uuid → eliminates 6 CRITICAL + 3 HIGH
- **Phase 2 (This week)**: Update React ecosystem, express, pino → test breaking changes
- **Phase 3 (Sprint)**: Evaluate dockerode, multer, other major version upgrades → plan migration approach

## Learnings

- **Watch List**: Vitest, Handlebars, Protobufjs, Vite, @opentelemetry/* — these recur frequently
- **gRPC Ecosystem**: Protobufjs transitive vulnerabilities are a recurring issue — consider security review of @grpc/grpc-js versions
- **React Ecosystem**: Major version jumps (React 18→19, Router 6→7) require careful integration testing
- **Development vs. Production Risk**: Vitest is dev-only; low runtime risk if not exposed in production
