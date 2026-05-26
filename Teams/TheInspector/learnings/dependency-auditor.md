# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-26

### Critical Vulnerabilities Discovered
1. **Handlebars (P1)** - Transitive in Source/Backend
   - Multiple JavaScript injection CVEs affecting 4.0.0-4.7.8
   - Appears as transitive dependency; root direct dependency not identified yet
   - Recommendation: Run `npm ls handlebars` to trace root
   - Status: Fixable via `npm audit fix`

2. **Protobufjs (P1)** - Transitive in portal/Backend and platform/orchestrator
   - Arbitrary code execution + 8 other CVEs
   - Likely via @opentelemetry or gaxios packages
   - Recommendation: Update @opentelemetry/auto-instrumentations-node and @opentelemetry/sdk-node
   - Status: Fixable via dependency update

### High Priority CVEs (P2)
- **path-to-regexp ReDoS**: Fix via express upgrade
- **picomatch ReDoS**: Fix via vitest/vite update
- **@opentelemetry packages**: Prometheus DoS - update to 0.76+ and 0.218+

### Package Management Observations
- **npm projects only** (no Python, Go, Rust found)
- **Consistent use of package-lock.json** across all projects
- **High transitive dependency counts:**
  - portal/Backend has 577 dependencies (397 prod, 181 dev)
  - Source/Backend has 411 dependencies (102 prod, 310 dev)
  - Risk: Each dependency is a potential attack surface

### Outdated Packages Requiring Updates
1. express: 2 major versions behind (4.18 → 4.22+)
2. pino: 2 major versions behind (8.17 → 10.3)
3. react: 1 major version behind (18.3 → 19.2)
4. react-router-dom: 1+ major versions behind
5. uuid: 5 major versions behind (9.0 → 14.0) **+ CVE**

### Tools & Commands
- **npm audit**: Works in all projects, outputs JSON cleanly
- **npm outdated**: Shows wanted vs latest versions
- **npm ls {package}**: Useful to trace transitive dependencies
- **npx license-checker --json**: Not available in environment; need to install for license audit

### Audit Scope
- Projects scanned: 5 npm packages
  - Source/Backend (npm audit + outdated)
  - Source/Frontend (npm audit + outdated)
  - Source/E2E (npm audit)
  - portal/Backend (npm audit)
  - portal/Frontend (npm audit)
- Not scanned: abac-* projects (appear to be external/demo projects)

### Recommendations Going Forward
1. **Weekly runs**: Schedule `npm audit` to catch new vulnerabilities
2. **Dependency updates strategy**:
   - Test critical fixes within 24 hours
   - Test P2 fixes within 1 week
   - Batch P3/outdated updates quarterly
3. **CI/CD integration**: Add `npm audit --audit-level=moderate` to pre-commit or CI
4. **Automated updates**: Consider Dependabot or Renovate for automatic PRs
5. **License compliance**: Run full license audit once per release cycle

### Known Issues to Monitor
- Handlebars appears silently; `npm ls handlebars` should reveal what pulls it in
- protobufjs is critical dependency of OpenTelemetry; any gRPC usage depends on this
- express and uuid are widely used; updates must be tested thoroughly

### Next Steps for TheInspector Team
1. Create tickets for each P1/P2 finding
2. Assign to TheFixer team for remediation
3. Schedule follow-up audit in 1 week post-fixes
4. Document license compliance decisions

