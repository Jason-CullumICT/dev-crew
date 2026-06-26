# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Runs

### 2026-06-26 Initial Audit

**Project:** dev-crew (workflow engine + portal)

**Key Discoveries:**

1. **Critical CVE in Vitest (Dev Tool)**
   - Vitest 2.0.5 has RCE vulnerability (GHSA-5xrq-8626-4rwp)
   - UI server exposes arbitrary file read/execution in dev mode
   - Affects all testing workflows; must upgrade to ≥3.2.6
   - Note: v3.2.6+ requires vite ≥8.1.0 (which has own fixes)

2. **Vite Path Traversal Series (Multiple CVEs)**
   - Current v5.4.0 is 3+ versions behind
   - v8.1.0+ fixes path traversal, Windows UNC bypass, .map handling
   - Major version jump; check vite migration guide for breaking changes
   - PostCSS XSS risk (DEP-008) also in frontend, fixed in postcss ≥8.5.10

3. **React & React Router Lag**
   - React 18.3.1 should be upgraded to 19.x (stable release available)
   - React Router DOM 6.26.0 → 6.30.4+ (fixes open redirect CVE)
   - React Router still at 6.30.3 after fix release (off-by-one lag)

4. **Express & Pino Versions**
   - Backend uses express 4.18.2 (4 releases behind current v4)
   - Pino 8.17.0 is 2 majors behind v10 (async improvements)
   - Both safe to bump in minor version (no breaking changes expected)

5. **No Post-Install Scripts**
   - Good: No packages with postinstall scripts detected
   - Reduces supply chain risk from automated code execution
   - Recommendation: Keep npm audit enabled to catch future regressions

## Watch List

Packages with recurring or multiple CVEs to monitor:

| Package | CVEs This Run | Action | Status |
|---------|-------------|--------|--------|
| vitest | 2 (CRITICAL) | Upgrade ≥3.2.6 | REQUIRED |
| vite | 4 (HIGH/MOD) | Upgrade ≥8.1.0 | REQUIRED |
| js-yaml | 1 (MOD) | Transitive fix via jest | WATCH |
| qs | 1 (MOD) | Transitive fix | WATCH |
| ws | 2 (HIGH/MOD) | Transitive fix | WATCH |
| uuid | 1 (HIGH) | Direct upgrade to ≥11.1.1 | REQUIRED |
| form-data | 1 (HIGH) | Direct upgrade to ≥4.0.6 | REQUIRED |

## Environment Notes

**Audit Tooling Available:**
- `npm audit --json` works for all workspaces
- `npm outdated --json` provides version gap analysis
- No python or Go modules detected (npm-only project)

**Workspace Structure:**
- Backend: 412 dependencies (104 prod, 308 dev)
- Frontend: 231 dependencies (9 prod, 222 dev)
- E2E: 4 dependencies (no vulnerabilities)

## Recommended Process

1. Run `npm audit --json` monthly to catch new CVEs
2. On any CVE ≥HIGH, run full audit before deployment
3. Before major version bumps (express v5, react v19, vite v8), schedule dedicated migration sprint
4. Keep `package-lock.json` committed; audit production builds against lock file
5. Consider Dependabot or Snyk integration for continuous scanning

## Historical Decisions

_(To be populated as team makes security/version decisions)_
