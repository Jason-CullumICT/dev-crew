# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-01

### Key Findings
- **Total CVEs discovered:** 30+ across 6 npm workspaces
- **Critical vulnerabilities:** 3 (handlebars, vitest, protobufjs) — all in transitive deps or dev tooling
- **High-severity CVEs:** 8 (form-data, vite, react-router, @grpc, path-to-regexp, ws)
- **Outdated major versions:** 6 packages (express, pino, uuid, react, react-dom, react-router-dom)

### Packages with Recurring CVEs (Watch List)
1. **Handlebars** (handlebars@<=4.7.8): 6 CVEs including critical XSS/RCE via AST manipulation
   - Root: Used transitively by @babel/core in build pipeline
   - Monitoring: Any babel upgrade must include handlebars audit
   
2. **Protobufjs** (<=7.6.2): 11+ CVEs including arbitrary code execution
   - Root: Dependency of @grpc/grpc-js used in platform/orchestrator
   - Monitoring: Any gRPC upgrade must force protobufjs@7.6.3+
   
3. **Vitest** (<=3.2.5): Critical UI server RCE via unauthed file access
   - Root: Direct dev dependency in Source/Frontend
   - Monitoring: Never expose vitest UI server on production/shared infrastructure; disable --ui in CI
   
4. **Vite** (<=6.4.2): Multiple path traversal/CORS bypass issues
   - Root: Direct dev dependency in Frontend/Portal
   - Monitoring: Windows-based CI runners need careful server.fs.deny configuration

### License Decisions
- **Status**: Audit deferred — no license-checker tool available in environment
- **Known safe patterns**: Majority are MIT/Apache 2.0 (express, react, pino, etc.)
- **Action**: Run `npx license-checker --json` in next audit if GPL packages appear

### Audit Tools Available
- ✅ `npm audit --json` — works reliably across all workspaces
- ✅ `npm outdated --json` — shows wanted + latest versions
- ✅ Manual lock file inspection — package-lock.json present in Backend only
- ❌ `license-checker` — not pre-installed; requires install
- ❌ `npm ls --depth=0` — can use for dependency tree analysis

### Critical Issues Not Addressed
- **Lock files**: Frontend, E2E, Orchestrator, Portal services missing committed lock files
  - Impact: Builds non-deterministic; audit findings not reproducible
  - Action: Should commit package-lock.json to all workspaces in next sprint
  
- **Vitest UI exposure**: Current config may expose vitest UI on shared dev server
  - Verify: Check portal/orchestrator for `--ui` flag usage
  
- **Protobufjs in orchestrator**: Block on upgrading gRPC until protobufjs@7.6.3+ confirmed working
  - Test: Verify gRPC message marshaling after upgrade (no silent data corruption)

### Cross-Team Escalations Made
1. **→ TheGuardians**: 
   - Handlebars (if user-supplied template processing exists)
   - Vitest UI (if exposed to network)
   - Protobufjs (RCE risk in orchestrator)
   
2. **→ TheFixer** (if applicable):
   - Outdated major versions (React 18→19, Express 4→5) for regression testing

### Recommendations for Next Audit
1. **Automate lock file checks**: Fail CI if package-lock.json not up-to-date
2. **Periodic CVE sweeps**: Run `npm audit` in CI post-install (npm 10+ has built-in integration)
3. **Test Vitest config**: Disable `--ui` in CI; add env check to prevent accidental exposure
4. **Protobufjs pinning**: Document version requirement in platform/orchestrator/README
5. **Dependency count**: Consider audit policy: fail on >N transitive deps per workspace (Backend at 411 is high)
