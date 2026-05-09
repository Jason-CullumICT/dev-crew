# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-09

### Critical Findings - Watch List

1. **Handlebars.js (ts-jest → handlebars transitive)**
   - **Status:** CRITICAL - RCE via JavaScript injection
   - **CVE:** GHSA-2w6w-674q-4c4q (CVSS 9.8)
   - **Root cause:** ts-jest depends on handlebars for template processing
   - **Fix applied:** Update ts-jest to latest version (brings handlebars >= 4.7.9)
   - **Recurrence risk:** HIGH - ts-jest releases frequently. Recommend monitoring for automated updates.

2. **brace-expansion (jest → brace-expansion transitive)**
   - **Status:** HIGH - DoS via zero-step sequences
   - **CVE:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
   - **Impact:** Test runner hangs if processing glob patterns with {1..0} syntax
   - **Dependency pattern:** jest → glob → brace-expansion
   - **Recurrence risk:** MEDIUM - Brace-expansion rarely updated; main vector is glob updates

### Medium Findings - Dev-Only CVEs

3. **Vite/Vitest/esbuild/postcss (Frontend)**
   - **Status:** MODERATE - Path traversal, CORS bypass, XSS in dev tools
   - **Pattern:** Frontend dev tools lag behind latest (vite 5.4 vs 8.0+)
   - **Impact:** Dev-only, not shipped to production
   - **Effort to fix:** High (2-4h, major version bumps, may break build)
   - **Recommendation:** Schedule for next maintenance window with regression testing

### Outdated Dependencies - No CVE But Quality Risk

4. **React 18 → 19 migration lag**
   - **Versions:** react@18.3.1, should be 19.2.6+
   - **Gap:** 1 major version behind
   - **Benefits:** Compiler optimizations, concurrent features
   - **Risk:** Potential hook API changes in dependencies
   - **Timeline:** Consider for Q2 2026

5. **Express 4 → 5 migration lag**
   - **Versions:** express@4.22.1, should be 5.2.1+
   - **Gap:** 1 major version behind
   - **Benefits:** Better async/await handling
   - **Risk:** Middleware compatibility
   - **Timeline:** Consider for Q2 2026

### Project-Specific Metrics

**Backend (Source/Backend):**
- Direct deps: 8 (express, pino, uuid, prom-client + 4 @types)
- Transitive: ~411 (jest accounts for ~150)
- Largest footprint: jest → babel → many transitive
- Vulnerability density: 2 critical/high per 400 deps (moderate)

**Frontend (Source/Frontend):**
- Direct deps: 13 (react, vite, vitest, testing-library)
- Transitive: ~230
- Largest footprint: vite → esbuild → postcss chain
- Vulnerability density: 6 moderate per 230 deps (slightly high)

**E2E (Source/E2E):**
- Direct deps: 4 (minimal, lowest risk)
- Transitive: ~4
- No vulnerabilities detected

### Tools & Environment

- **npm audit:** Works well, JSON output reliable
- **npm outdated:** Useful for tracking version lag, JSON output clean
- **Available tools:** npm audit, npm outdated, npm ls
- **Missing tools:** license-checker (not installed, recommend adding to dev dependencies)
- **Lock file format:** package-lock.json v2 (npm 8+), supports semver resolution
- **Node version assumed:** v18+ (based on recent packages)

### License Compliance Observations

- All visible direct dependencies use permissive licenses (MIT, Apache 2.0)
- No GPL/AGPL detected in explicit dependencies
- Transitive dependencies need formal audit via license-checker
- **Recommendation:** Add `npm install --save-dev license-checker` to project setup

### Recurring Patterns to Monitor

1. **Test framework churn:** Jest, ts-jest, babel ecosystem pulls in many transitive deps
   - Mitigation: Consider consolidating test tools or pinning versions longer
2. **Build tool instability:** Vite/esbuild chain has frequent updates
   - Mitigation: Separate dev/prod build processes, lock prod deps tighter
3. **Transitive vs. direct:** Most CVEs are transitive (hidden in lock files)
   - Mitigation: Educate team on npm ls output, automate audits in CI/CD

### Recommended Monitoring Strategy

1. **Automated npm audit on every install** (add to CI/CD pre-commit)
2. **Weekly scans** for new CVEs against current lock files
3. **Quarterly major version reviews** (React, Express, Vite)
4. **Monthly deprecation checks** (npm ls | grep deprecated)

### Cross-Team Escalations

- **TheGuardians (Security):** DEP-001 handlebars if code path compiles user templates
- **TheFixer:** DEP-004, DEP-005 version upgrades require code changes
- **Red-teamer:** Verify if any code path uses dynamic handlebars template compilation

---

## Learnings Summary

✅ **What worked:**
- npm audit provides complete CVE coverage
- Lock file analysis catches transitive vulnerabilities
- JSON output enables automation

⚠️ **What's missing:**
- license-checker not installed (need for compliance audits)
- No SCA (Software Composition Analysis) tool for supply chain risk scoring
- No automated CI/CD integration yet

📋 **Next Actions:**
1. Install license-checker and run comprehensive license audit
2. Integrate npm audit into pre-commit hook
3. Set up automated weekly CVE scans via scheduled agent
4. Create a "patch Tuesday" automation for critical updates
