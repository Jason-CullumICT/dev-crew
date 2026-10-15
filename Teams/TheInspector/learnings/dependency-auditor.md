# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-15

### Summary
- **Total Findings:** 11 dependencies with security issues (59 CVEs total)
- **Critical Vulnerabilities:** 4 (vitest, tinypool, proxy-addr, handlebars)
- **High Vulnerabilities:** 40 (mostly Jest ecosystem cascade)
- **Projects Scanned:** Source/Backend, Source/Frontend, Source/E2E

### Key Discoveries

#### Watch List — Recurring CVE Issues
1. **Jest Ecosystem (v29)** - Heavy CVE load in internal packages
   - Root cause: jest-message-util, micromatch transitive deps
   - Fix: Major upgrade to v30.5.2+ required
   - Affects: 20+ Jest-related packages in cascade
   
2. **Vitest Testing Framework** - Direct critical vulnerabilities
   - Depends on tinypool with prototype pollution (RCE)
   - Depends on @vitest/mocker with path traversal (info disclosure)
   - Fix: Upgrade to v5.0.4+
   - Action: Priority update for Frontend

3. **React Router v6** - Open redirect CVE
   - Affects protocol-relative URL handling
   - Fix: Upgrade to v7.18.4+
   - Action: May require routing code changes

4. **Proxy-Addr** - Trust-proxy bypass (CVSS 9.1)
   - Affects Express auth/proxy configurations
   - Indirect dependency via Express ecosystem
   - Action: Audit trust-proxy configuration in application

#### License Compliance Status
✅ **All packages compliant** - No GPL/AGPL/proprietary licenses detected
- Majority: MIT
- Also: Apache 2.0, ISC, BSD-3-Clause
- No unlicensed or unknown licenses

#### Audit Tools Available
- **npm audit --json** - Works even without node_modules (reads package-lock.json)
- **npm outdated --json** - Lists packages >1 major version behind
- **npx license-checker --json** - License compliance (no GPL detected)
- Fallback: Manual package.json inspection when tools unavailable

#### Dependency Tree Insights
- Source/Backend: 12 direct deps, ~15 transitive (relatively clean)
- Source/Frontend: 11 direct deps, ~15 transitive (relatively clean)
- Source/E2E: 4 direct deps, 0 vulnerabilities (minimal scope)
- No duplicate versions or conflicts across projects

#### Next Audit Priorities
1. Monitor vitest release cycle (currently on v2.0.5, needs v5.0.4+)
2. Watch Jest major version transitions (v30+ required for security)
3. Validate React Router v6→v7 migration doesn't break routing
4. Audit Express proxy configuration against GHSA-jqcg-44mw-7w3h

#### Remediation Status by Component
| Component | Action | Status | Impact |
|-----------|--------|--------|--------|
| Vitest | Upgrade to 5.0.4+ | PENDING | Fixes 2 Critical RCE |
| Jest | Upgrade to 30.5.2+ | PENDING | Fixes 33 High CVEs |
| React Router | Upgrade to 7.18.4+ | PENDING | Fixes open redirect + outdated |
| Express Proxy | Audit config + upgrade | PENDING | Mitigates CVSS 9.1 bypass |

## Learnings

_(discoveries recorded above in Audit Run: 2026-10-15)_
