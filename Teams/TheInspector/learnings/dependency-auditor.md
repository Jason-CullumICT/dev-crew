# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-06

### Critical Findings
- **4 CRITICAL vulnerabilities** across Backend and Frontend
- **59 total CVEs** (42 Backend, 17 Frontend, 0 E2E)
- Root cause: outdated jest (29.7.0) and vitest (2.0.5) versions

### Key CVEs to Watch
1. **proxy-addr@2.0.7** — IPv4-mapped IPv6 IP spoofing (GHSA-jqcg-44mw-7w3h) — affects express
2. **handlebars@4.7.8** — JS injection via AST type confusion (GHSA-2w6w-674q-4c4q) — in jest chain
3. **vitest@2.0.5** — Arbitrary file read in UI server (GHSA-5xrq-8626-4rwp)
4. **tinypool@2.1.1** — Prototype pollution RCE in worker options (GHSA-5gmw-xhrv-c9v3)

### Remediation Strategy
**Immediate Actions:**
- Backend: `npm update jest ts-jest ts-node @types/jest` → closes 33 HIGH + 2 CRITICAL
- Frontend: `npm update vitest vite` → vitest 5.0.3+ closes 2 CRITICAL + 7 HIGH
- Both: Verify handlebars updated to 4.7.9+ after jest/vitest updates

### Supply Chain Observations
- Backend has 411 total deps (398 transitive) — large attack surface
- Jest ecosystem accounts for ~70% of Backend HIGH vulns
- No abandoned packages detected; jest/vitest just aging out of LTS
- No GPL/AGPL licenses detected in audit

### Long-term Recommendations
1. Plan vitest+vite migration for Frontend (test framework modernization)
2. Upgrade jest to latest in Backend (currently 1+ major behind)
3. Add quarterly `npm audit` to CI/CD (currently missing)
4. Consider license-checker in pre-commit hook
5. Monitor jest/vitest release cycles for timely upgrades

### Tools & Environment
- npm audit works in all three workspaces (Backend, Frontend, E2E)
- npm list requires node_modules installed (n/a in audit mode)
- E2E package is clean (1 dev dep: @playwright/test)
