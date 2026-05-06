# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-06

### Critical Vulnerabilities Found
1. **Handlebars RCE** (CVSS 9.8) — JavaScript Injection via AST Type Confusion
   - Location: Source/Backend (transitive via jest/ts-jest)
   - Status: UNFIXED — Requires jest/ts-jest upgrade or direct handlebars patch
   - Watch List: Monitor jest/ts-jest releases for handlebars>=4.7.9 bundles

2. **Protobufjs RCE** (CVSS 9.8) — Arbitrary code execution in deserialization
   - Locations: 
     - platform/orchestrator (transitive via dockerode → gRPC)
     - portal/Backend (transitive via @opentelemetry)
   - Status: UNFIXED — Requires major version bumps
   - Note: CRITICAL RISK in infrastructure; verify protobuf message validation

3. **path-to-regexp ReDoS** (CVSS 7.5) — Regex Denial of Service
   - Locations: platform/orchestrator, portal/Backend (via express)
   - Status: UNFIXED — Transitive; fix via express update
   - Exploit: Craft URLs with many route parameters to cause CPU exhaustion

4. **Picomatch ReDoS** (CVSS 7.5) — Regex Denial of Service
   - Location: portal/Frontend (via tailwindcss/vite file watchers)
   - Status: UNFIXED — Fix via picomatch@>=2.3.2
   - Exploit: Malformed glob patterns during file watching

### Severe Outdatedness Issues
- **OpenTelemetry stack** in portal/Backend is 4+ major versions behind
  - 0.47.0 → latest 0.216.0 (a gap of 169 minor versions!)
  - This is a significant maintenance debt and security risk
  - Decision: Plan dedicated upgrade task for next sprint

### Package Manager Insights
- **npm is dominant** — All modules use npm with lock files
- **No Go, Python, or Rust modules** detected in primary codebase
- **Demo directories** (abac-demo, etc.) are separate projects — not audited

### Module Risk Stratification
| Module | Total Deps | Critical | High | Status |
|--------|-----------|----------|------|--------|
| Source/Backend | 412 | 1 | 0 | VULNERABLE |
| Source/Frontend | 231 | 0 | 0 | CLEAN |
| Source/E2E | 4 | 0 | 0 | CLEAN |
| platform/orchestrator | 156 | 1 | 1 | VULNERABLE (INFRASTRUCTURE) |
| portal/Backend | 578 | 1 | 1 | VULNERABLE (OUTDATED TRACING) |
| portal/Frontend | 425 | 0 | 2 | VULNERABLE |

### Recommendations for Future Audits
1. **Frequency:** Run weekly; escalate any new critical CVEs immediately
2. **Automation:** Consider adding `npm audit` to pre-commit hooks
3. **Major Version Bumps:** Require separate testing sprints (esp. orchestrator)
4. **License Check:** All dependencies are permissive-licensed; no GPL/AGPL detected
5. **Supply Chain:** 1,802 transitive dependencies is moderately high; monitor for any new protobufjs/handlebars-like suppliers

### Audit Tool Availability
- ✓ npm audit (used for CVE scanning)
- ✓ npm outdated (used for version analysis)
- ✓ npm ls (used for dependency tree visualization)
- ✗ license-checker (not pre-installed; manual review used instead)
- ✗ govulncheck (no Go modules found)
- ✗ pip-audit (no Python modules found)

### Watch List (Recurring Issues)
- **Handlebars:** Monitor jest/ts-jest for patched releases
- **Protobufjs:** Monitor dockerode and @opentelemetry for fixes
- **Vite/esbuild:** Build chain CVEs are frequent; plan quarterly reviews
