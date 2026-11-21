# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### High-Risk Dependencies (Watch List)
- **handlebars**: 11 CVEs including CVSS 9.8 JS injection. Used transitively; check if direct dependency can be eliminated.
- **proxy-addr**: CVSS 9.1 IP spoofing via IPv4-mapped IPv6. Critical for Express `trust proxy` logic.
- **vitest**: CVSS 9.8 UI server RCE when dev mode is active. Major version upgrades required.
- **protobufjs**: CVSS 9.8+ arbitrary code execution. High-risk if parsing untrusted `.proto` files or gRPC messages.
- **vite**: Multiple path traversal issues (CVSS 7.5+). Dev-time risk on Windows due to UNC path handling.

### Recurring Vulnerability Patterns
- **DoS via Expansion/Recursion**: brace-expansion, browserslist, js-yaml, nanoid all have unbounded expansion/iteration patterns
  - Mitigation: Input validation on user-supplied patterns
- **Path Traversal in Dev Tools**: esbuild, vite, postcss all have sourceMappingURL issues
  - Mitigation: Disable source maps in production; validate file paths
- **Prototype Pollution Gadgets**: handlebars, protobufjs, tinypool can be chained to RCE
  - Mitigation: Keep these packages current; monitor prototype pollution patches

### Audit Tools Confirmed Available
- `npm audit --json` ✅ Works; outputs full CVE details
- `npm outdated --json` ✅ Works; identifies major version gaps
- `npx license-checker` ✅ Available for license compliance
- `npm list --json` ✅ Works; can parse dep tree

### Dependency Complexity Baseline (2026-11-21)
- **Backend**: 102-200 total deps (medium complexity)
- **Frontend**: 200+ deps including Vite toolchain (high complexity due to dev-time tools)
- **Orchestrator**: 153+ deps (medium; mostly gRPC + Docker)
- **Total Supply Chain Risk**: Medium (350-500+ transitive deps across all modules)

### Major Version Upgrade Notes
- **React 18 → 19**: Requires testing of hooks/suspense behavior; not urgent for security
- **Express 4.18 → 4.22**: Safe minor bump; v5 is pre-release (defer)
- **React Router 6 → 7**: Multiple open-redirect fixes; test navigation flows thoroughly
- **Vitest 2.x → 5.1.1**: Requires major version bump to fix RCE; breaking changes expected
- **uuid 9.x → 11.x**: Major bump; check API compatibility in backend (likely safe)

### CVE Findings from This Run
- **37 total CVEs** across 3 modules: 4 critical, 13 high, 15 moderate, 5 low
- **DEP-001 (handlebars)**: 11 related CVEs; consider alternative if transitive only
- **DEP-002 (proxy-addr)**: Critical for IP validation; must update before production
- **DEP-003 (vitest)**: Dev-time only but CRITICAL; vitest UI should not be exposed
- **DEP-004 (protobufjs)**: 11 CVEs; audit gRPC usage patterns
- **Lock file baselines**: Backend 5353 lines, Frontend 5777 lines (reference for future audits)

### Recommended Remediation Schedule
1. **This Week (P1/P2)**: Update proxy-addr, body-parser, vitest, browserslist, uuid, vite
2. **Next Sprint (P3)**: Major version upgrades for React/Router/Express
3. **Pre-Production**: Run npm audit in CI/CD; consider npm dedupe to reduce surface area

### No Issues Found
- ✅ No deprecated packages in direct dependencies
- ✅ No unknown/unlicensed direct dependencies
- ✅ No dangerous post-install scripts detected
- ✅ All lock files committed and stable
