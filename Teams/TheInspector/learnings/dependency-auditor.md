# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit 2026-05-21

#### Critical Findings
1. **Handlebars RCE via ts-jest (Backend)**
   - `ts-jest@29.1.2` → `handlebars@4.7.8` (transitive)
   - 1 critical CVE (CVSS 9.8), 3 additional high-severity CVEs
   - This is a build-time dependency, not runtime, but still exploitable
   - **Watch list:** Check ts-jest releases for handlebars-free versions
   - **Fix approach:** May require major version upgrade or alternative testing framework

#### Major Version Gaps
- **React 18 → 19:** Stable release now available; not urgent but plan migration
- **Vite 5 → 8:** Path traversal fix available; major jump requires testing
- **Pino 8 → 10:** 2-version gap; check breaking changes
- **UUID 9 → 14:** 5-version gap but low risk (utility library)

#### Supply Chain Observations
- **npm ecosystem scale:** 650+ transitive dependencies across 3 projects
  - Frontend: 230 (heavy dev tooling)
  - Backend: 411 (Jest + ts-jest ecosystem)
  - E2E: minimal (just Playwright)
- **Trust concentration:** Jest/Vitest/Vite are bottlenecks (high velocity, many dependents)
- **No abandoned packages detected** in initial scan

#### License Compliance
- All 10 direct dependencies are MIT or Apache-2.0
- No GPL/AGPL conflicts
- No UNLICENSED packages
- **Status:** PASS

#### Audit Tools Available
- `npm audit --json` — works reliably
- `npm outdated --json` — shows major/minor gaps
- `npm ls --depth=0` — lists direct deps (when node_modules exists)
- Lock files can be parsed directly for offline analysis

#### Recommendations for Next Audits
1. Set up pre-commit hook: `npm audit` in CI before merging
2. Use GitHub Dependabot or Snyk for continuous monitoring
3. Monthly CVE review cadence (30 days)
4. Prioritize fixes in this order: P1 (RCE) → P2 (outdated majors) → P3 (advisories)

#### Previous CVE Status
- None known prior to this audit (first run)
