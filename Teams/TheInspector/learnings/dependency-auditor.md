# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-05-08

#### CVE Findings Summary
- **Total CVEs found:** 8 (1 critical, 6 moderate, 1 low)
- **Critical CVE:** Handlebars.js (dev-time only, via ts-jest)
  - Multiple JavaScript injection vulnerabilities (CVSS 9.8)
  - Requires ts-jest >= 30.0.0 (handlebars >= 4.7.9)
  - Dev-time risk only (not in production code)

#### Outdated Packages (Major Versions Behind)
- **Backend:** express (3 versions), pino (2 versions), uuid (5 versions)
- **Frontend:** react, react-dom, react-router-dom (all 1 major version)
- **Build tools:** vite (2 versions), vitest (2 versions) — both have CVEs

#### Package Manager Status
- **npm:** Detected and working on all 9 projects (Backend, Frontend, E2E, portal, platform)
- **License check:** No GPL/AGPL dependencies detected — all permissive licenses
- **Supply chain:** No post-install scripts found; transitive dependencies at 641 across projects

#### Recommendations for Future Audits
1. **Handlebars:** Watch ts-jest upstream for patch releases; consider upgrading to >= 30.0.0 immediately
2. **Build tools:** Vite/Vitest are behind by 2 major versions; requires testing after upgrade
3. **Frontend React:** Major version bump requires JSX runtime migration and component testing
4. **Backend Express:** Requires application testing for async/await error handling changes

#### Known Watch List
- **ts-jest → handlebars:** Dev dependency chain with recurring critical CVEs
- **vite → build chain:** Multiple transitive vulnerabilities through esbuild, postcss
- **React 19:** Breaking changes in JSX, requires component-level testing

#### Tools Available
- ✅ npm audit (working)
- ✅ npm outdated (working)
- ⚠️ npm license-checker (available but shows single-count output)
- ❌ govulncheck (Go) — no Go projects found
- ❌ pip-audit (Python) — no Python projects found

#### Escalations to TheGuardians
- Handlebars critical CVEs are dev-time only, but if templates are ever used in production rendering, escalate to security team immediately
