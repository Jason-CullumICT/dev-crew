# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-03

### Critical Patterns Discovered

1. **Handlebars JavaScript Injection Cluster**
   - Multiple related CVEs (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, etc.) affecting 4.0.0 - 4.7.8
   - CVSS 9.8 RCE vulnerability with network attack vector
   - Root cause: AST type confusion allows arbitrary code injection
   - **Action:** Add handlebars to watch list; monitor for usage in template rendering

2. **Vitest Development Tooling Risk**
   - Direct dependency in portal/Backend and portal/Frontend
   - GHSA-5xrq-8626-4rwp (CVSS 9.8): Arbitrary file read/execution when UI server enabled
   - **Recommendation:** Disable vitest UI in CI/production; update to >=3.2.6 or >=4.1.11
   - **Action:** Audit whether vitest UI is enabled in production build pipelines

3. **Build Tool Concentration Vulnerability**
   - Heavy reliance on vite, vitest, babel, esbuild creates vulnerability cascade
   - Any CVE in build tools affects entire platform (49 transitive vulnerabilities from build chain)
   - **Recommendation:** Pin build tool versions; implement dependency update monitoring
   - **Action:** Create separate lock file for build tools; test updates before deploying

4. **protobufjs Serialization Risk**
   - Platform uses gRPC (protobufjs) for inter-service communication
   - RCE vulnerability via malformed protobuf messages
   - **Action:** Add message validation layer; consider using compiled protobuf codegen

### Supply Chain Risk Indicators

- **Total CVEs across all workspaces:** 54 (5 critical, 31 high)
- **Transitive vulnerabilities:** ~850+ packages in dependency tree
- **Workspaces at risk:** 5 of 6 (only E2E clean)
- **License compliance:** All permissive (no GPL/AGPL blocking)
- **Abandoned dependencies:** None detected (all actively maintained)

### Audit Tools Available

- ✅ npm audit (json mode works well for parsing)
- ❌ govulncheck (Go not used in project)
- ❌ pip-audit (Python not used in project)
- ❌ license-checker (can be installed if needed, or manual check via package.json)

### License Decisions

- No GPL/AGPL dependencies in primary stack
- All major dependencies use MIT, Apache-2.0, or BSD
- No license compliance blockers identified

### Recommendations for Next Audit

1. Create dependency update policy: patch updates within 24h, minor updates within 1 week, major updates within 1 month
2. Add npm audit to CI/CD gate (fail if critical/high CVEs present)
3. Subscribe to security advisories for key packages (handlebars, vitest, vite, protobufjs)
4. Implement dependency version pinning for build tools only; allow patch updates for app deps
5. Audit vitest UI usage in CI/CD pipelines (potential RCE vector)

### Prior CVE Findings

_(First audit run — no prior findings to track yet)_
