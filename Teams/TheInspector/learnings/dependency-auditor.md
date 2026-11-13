# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings (2026-11-13)

### Critical Vulnerabilities to Watch

1. **Handlebars** (transitive in Backend test framework)
   - JavaScript Injection via AST Type Confusion [GHSA-3mfm-83xf-c92r]
   - Affects: Source/Backend (via jest chain)
   - Status: Monitoring; jest major upgrade needed

2. **Proxy-Addr** (transitive via Express middleware)
   - IPv4-mapped IPv6 trust subnet IP spoofing [GHSA-jqcg-44mw-7w3h]
   - Affects: Source/Backend, platform/orchestrator, portal/Backend
   - Status: Fixed by express 4.22+; plan upgrade

3. **Tinypool** (transitive via vitest in test runner)
   - Prototype Pollution RCE gadget [GHSA-5gmw-xhrv-c9v3]
   - Affects: Source/Frontend, portal/Frontend (dev deps)
   - Status: Vitest upgrade to 2.0+ fixes; test-time only

4. **Body-Parser** Compression DoS (transitive via Express)
   - Trailing bytes bypass in compressed requests [GHSA-27r3-jxmh-p828]
   - Affects: Source/Backend (via express middleware)
   - Status: express 4.20.9+ required

5. **OpenTelemetry Auto-Instrumentation** (production backend)
   - Auto-instruments at import time; large transitive tree
   - Affects: portal/Backend (11 direct deps including OT)
   - Status: Verify no untrusted config loading; largest vuln module

### Supply Chain Red Flags

1. **Large Dev Trees**: Each project has 310-416 dev-only dependencies
   - Root cause: vitest, vite, jest, esbuild toolchains
   - Action: Document which are truly required vs. optional

2. **Build Tool Chain Vulnerabilities**: vite, esbuild, vitest/mocker
   - Path traversal in .map handling
   - Code injection in manual mocks
   - Action: Upstream releases lag; may require major version bumps

3. **Post-Install Scripts**: None detected (✓ Good security practice)
   - No npm-level code injection risk via install hooks

### Audit Tools Status

- **npm audit**: Works reliably; can be run offline with lock file
- **npm outdated**: Good for version checking; available without node_modules
- **npm list**: Requires node_modules; not used in this audit
- **license-checker**: Not installed; manual review of package.json licenses used
- **govulncheck**: Not used (no Go modules detected)
- **pip-audit**: Not used (no Python requirements detected)

### Project Structure

- **Source/Backend**: 4 direct, 412 total (102 prod, 310 dev)
- **Source/Frontend**: 3 direct, 231 total (9 prod, 222 dev)
- **Source/E2E**: 1 direct, 4 total — clean, no vulns
- **platform/orchestrator**: 3 direct, 155 total
- **portal/Backend**: 11 direct, 578 total — **largest, 4 critical CVEs**
- **portal/Frontend**: 3 direct, 425 total

### Grading Summary

**Grade C (Moderate Risk):** 140 total vulns (14 critical, 34 high)
- Below threshold for Grade B (max 8 P2s at that level)
- portal/Backend is the primary risk driver
- Build-time RCE (tinypool) affects test suite; verify isolation

### Next Audit: December 2026

- Check if portal/Backend CVEs patched
- Verify React 19 upgrade testing plan in place
- Audit dev dependency necessity (npm ls --depth=0)
- Confirm OpenTelemetry instrumentation config security
