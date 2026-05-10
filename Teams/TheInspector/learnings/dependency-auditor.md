# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-10

### Critical Findings

1. **Handlebars RCE Vulnerability Chain (ts-jest → handlebars)**
   - Package: `handlebars@4.7.8` (8 CVEs, 1 critical)
   - Entry Point: Backend's `ts-jest@29.1.2` (dev dependency for test transformation)
   - Status: **Transitive but CRITICAL** — Located in dev dependency chain, not production code, but code execution is possible if test templates are compromised
   - **Watch List:** Mark ts-jest + handlebars as high-priority for future audits
   - Mitigation: (a) Update ts-jest immediately, (b) Consider replacing with @swc/jest to eliminate handlebars entirely

2. **Vite/Vitest Dev Dependency CVE Load (Frontend)**
   - 6 moderate vulnerabilities in frontend dev dependencies
   - Cause: vite → esbuild, postcss, vitest → @vitest/mocker chain
   - Impact: Development-only (not production), but could leak source code via .map traversal
   - Pattern: Dev tools often have higher CVE churn due to rapid iteration

3. **Brace-Expansion DoS in Backend**
   - Low-risk transitive dependency
   - Only problematic if Backend ever exposes glob patterns to users
   - Auto-fixed by `npm audit fix`

### Tool Inventory

✅ **Available in Environment:**
- npm audit (built-in, JSON output supported)
- npm outdated (built-in)
- npm list (built-in)

❌ **Not Pre-installed:**
- license-checker (would need to install)
- snyk (npm package, requires API key)
- govulncheck (Go CLI, not applicable here)
- pip-audit (Python CLI, no Python projects detected)

### Package Ecosystem Notes

- **No Go, Python, or Rust** detected in dev-crew Source/ directory
- **Only npm projects** (3 scanned: Backend, Frontend, E2E)
- **Postinstall Scripts:** None detected (excellent supply chain hygiene)
- **Abandoned Packages:** None identified; all major dependencies actively maintained
- **License Compliance:** MIT/Apache-2.0 dominant; no GPL/AGPL issues

### Audit Procedures

1. **CVE Detection:** Run `npm audit --json` in each package root
2. **Dependency Tree:** Parse `package-lock.json` for transitive counts
3. **Outdated Check:** `npm outdated --json` (optional if versions look recent)
4. **Postinstall Risk:** Grep lock files for `"scripts": {"postinstall"...}`
5. **License Check:** Review package.json license fields or install license-checker

### Metrics from This Run

| Project | Direct Deps | Transitive | Vulnerabilities | Grade |
|---------|-------------|-----------|-----------------|-------|
| Backend | 4 | 411 | 2 (1 critical) | B |
| Frontend | 13 | 230 | 6 (all moderate) | B |
| E2E | 1 | ? | 0 | A |

**Overall Grade: B** (due to critical handlebars CVE in Backend)

### Recommendations for Future Audits

1. **Automate CVE checks in CI/CD:**
   - Add `npm audit` to pull request checks
   - Fail builds on critical CVEs
   - Set threshold: 0 critical, ≤2 high allowed

2. **Dependency Updates:**
   - Set up Dependabot or similar for automated PRs
   - Review patch updates weekly
   - Review minor/major updates monthly

3. **License Compliance:**
   - Install `license-checker` in next iteration
   - Enforce non-GPL policy
   - Document license exceptions in LICENSES.md

4. **Architecture Changes:**
   - Replace ts-jest with @swc/jest (eliminates handlebars entirely)
   - Evaluate vite major version upgrade path for frontend
   - Keep React and Express versions in sync with security releases

### Known Good Versions (as of 2026-05)

- `typescript@5.3.3+` — Safe
- `express@4.18.2+` — Safe
- `react@18.3.1+` — Safe
- `vite@5.4.0` — Has CVE; upgrade to 8.x or latest 5.x patch
- `vitest@2.0.5` — Has CVE; upgrade to 4.1.5+
- `ts-jest@29.1.3+` — Patched version (from 29.1.2)
- `handlebars@4.7.9+` — Patched version (from 4.7.8)

### Next Audit: 2026-08-10 (Quarterly)


