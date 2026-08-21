# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-21

### Key Findings

**Critical Issues (4 total):**
- handlebars (Backend): RCE via AST type confusion (CVSS 9.8)
- vitest (Frontend): Multiple bundler vulnerabilities (direct devDependency)
- vite (Frontend): Dev server escape vulnerabilities
- protobufjs (Orchestrator): RCE/Prototype pollution (12 CVEs, CVSS 9.8)

**High Issues (9 total):**
- brace-expansion, form-data, js-yaml, nanoid, postcss, ws, @grpc/grpc-js, path-to-regexp

**Escalations:**
- TheGuardians: DEP-001, DEP-002, DEP-003, DEP-004 (code injection/RCE severity)

### Audit Tools & Environment

- ✅ npm audit: Works for all npm packages
- ✅ npm outdated: Used to detect outdated versions
- ✅ npm ls: Used for dependency tree inspection
- ✅ npx license-checker: Available for license compliance checks
- No Go modules, Python, Rust, or Java dependencies detected

### Dependency Management Patterns

1. **Backend (Source/Backend):** Minimal dependencies (4 direct)
   - express, pino, uuid, prom-client
   - Clean, focused on core features
   
2. **Frontend (Source/Frontend):** React ecosystem with devtools
   - react, react-dom, react-router-dom (direct)
   - vite, vitest, typescript as devDependencies
   - Highest transitive count (~200+) — build tools introduce supply chain risk
   
3. **Orchestrator (platform/orchestrator):** Infrastructure dependencies
   - dockerode, express, multer
   - Pulls in gRPC ecosystem — protobufjs RCE critical issue
   
4. **E2E (Source/E2E):** Test-only, minimal
   - @playwright/test only — clean, no vulnerabilities

### Recommendations for Future Audits

1. **Monitor these packages:**
   - handlebars (ongoing RCE risk)
   - protobufjs (multiple CVEs, consider migration)
   - vite ecosystem (rapid updates, frequent vulnerabilities)
   - vitest (test framework, less production-critical but still important)

2. **Transitive Dependency Risk:**
   - Frontend build tools (vite, vitest) are high-risk vectors
   - Consider webpack/esbuild directly vs. vite wrapper
   - Lock down build tool versions after testing

3. **License Compliance:**
   - Currently passing (no GPL/AGPL)
   - Watch for license changes on major version upgrades
   - Especially: React 19, Express 5.0, vitest 4+

4. **Update Strategy:**
   - P1 critical: Update immediately, test thoroughly
   - P2 high: Plan updates for sprint, test before merging
   - P3 medium: Plan for next sprint, batch with other updates
   - P4 low: Monitor, plan major version upgrades separately

### Known Issues Not Yet Fixed

1. **protobufjs in Orchestrator:** Requires either:
   - Major upgrade of @grpc/grpc-js (may require API changes)
   - Migration away from gRPC entirely
   - Isolation/sandboxing of orchestrator if keeping current version

2. **vitest in Frontend:** v2.0.5 has transitive vulnerabilities
   - Major version jump to v4+ required
   - Test thoroughly, may have breaking changes

3. **vite in Frontend:** Multiple transitive vulns
   - Already at v5, latest is v8+
   - Requires React/TypeScript compatibility testing

### Audit Scope Notes

- Focused on main application modules (Source/*, platform/*)
- Excluded demo projects (abac-*, which have their own audit needs)
- Excluded portal modules (can be audited separately)
- All are npm workspaces, so bulk updates possible with `npm update --workspaces`
