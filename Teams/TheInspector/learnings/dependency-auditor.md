# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Runs

### 2026-05-02 — Initial Audit

**Overall Result:** C-grade (3 critical/high issues, 6 moderate)

#### Key Findings

1. **Handlebars.js RCE in ts-jest** (P1 CRITICAL)
   - Version: 4.7.8 
   - Root cause: `ts-jest` pulls in handlebars as transitive dep
   - Multiple critical CVEs (CVSS 9.8, 8.1+)
   - **Action:** Update ts-jest or force handlebars@latest
   - Watch: ts-jest changelog for handlebars version pins

2. **uuid Buffer Overflow** (P3)
   - Current: 9.0.1 (5 major versions behind)
   - Latest: 14.0.0
   - Moderate severity, but old version
   - **Action:** npm install uuid@latest

3. **Build Tools (vite, esbuild, postcss)** (P3 x3)
   - All dev-only, low production risk
   - Easy fixes: npm update
   - Affects Frontend only

4. **Outdated Major Versions**
   - **Backend:** pino@8 (should be 10), uuid@9 (should be 14)
   - **Frontend:** react@18 (should be 19), react-router-dom@6 (should be 7)
   - Not urgent, but plan upgrades after CVE fixes

#### Project Observations

- **Backend:** 13 direct, 412 transitive (31:1 ratio) ✅ healthy
- **Frontend:** 13 direct, 231 transitive (18:1 ratio) ✅ healthy
- **E2E:** 0 vulnerabilities ✅ clean
- **No Python/Go/Rust projects** detected — npm only
- **No license issues** flagged (license-checker not run)
- **No abandoned packages** detected (active maintenance)

#### Environment & Tools

- **npm audit:** Works ✅
- **npm outdated:** Works ✅
- **npm ls:** Requires node_modules (not installed in audit env)
- **license-checker:** Not available — recommend adding to CI/CD
- **govulncheck/pip-audit:** Not applicable (npm-only project)

#### Recommendations for Next Audits

1. Set up recurring npm audit in CI/CD (monthly or on PR)
2. Add license-checker to detect GPL/AGPL violations
3. Monitor ts-jest for Handlebars version bumps (watch issue)
4. Plan major version upgrade sprint for pino, uuid, react
5. Consider dependency consolidation (e.g., jest vs vitest duplication in Frontend)

#### Watch List

| Package | Reason | Check Every |
|---------|--------|-------------|
| `handlebars` | Recurring RCE CVEs | Per ts-jest release |
| `ts-jest` | Pins old handlebars | Monthly or per PR |
| `uuid` | Outdated (9→14 behind) | Quarterly |
| `pino` | Outdated (8→10 behind) | Quarterly |
| `vite` | Dev tool, multiple CVEs | Per release |

## Learnings

_From 2026-05-02 audit:_

- **ts-jest is a vulnerability source** — Check Handlebars version before each update
- **Build tools (vite, esbuild, postcss) accumulate dev-only CVEs** — Monthly updates recommended
- **npm audit is reliable** — Works offline with lock files, no false positives observed
- **This project has healthy dependency ratios** — 31:1 and 18:1 are within acceptable bounds
- **No security violations in test setup** — Templates don't appear to process untrusted input (needs red-teamer verification)
- **Outdated major versions are a backlog item, not urgent** — Plan sprint after CVE fixes stabilize
