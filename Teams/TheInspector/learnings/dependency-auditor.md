# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: October 8, 2026

### Summary
- **Total CVEs Found:** 79 (12 critical, 67 high, moderate/low in transitive)
- **Direct Dependency Vulnerabilities:** 16 packages with critical/high findings
- **Overall Risk:** Medium - Most critical issues are in dev/test dependencies
- **Critical Production Issue:** protobufjs arbitrary code execution in platform/orchestrator

### Key Findings
1. **Frontend Toolchain Vulnerability Pattern:** vite, vitest, postcss all have path traversal issues
   - Recommend quarterly frontend-specific audit
   - These tools process untrusted input (CSS, test files) during build
   - Developer environment risk is HIGH

2. **Testing Framework Risk:** Jest ecosystem has 33 vulnerabilities (mostly transitive)
   - Isolated to dev environment (doesn't affect production)
   - Major version upgrade (jest 29 → 30) recommended
   - Test suite must be re-run after upgrade

3. **Infrastructure Critical:** protobufjs in orchestrator
   - CVSS 9.8 - Arbitrary code execution
   - Must be patched before next deployment
   - Part of gRPC communication layer

4. **License Compliance:** All green
   - No GPL/AGPL viral licenses
   - 2 unknown licenses (acceptable)
   - Continue monitoring at next audit

### Dependency Tree Characteristics
- **Total transitive dependencies:** 1,797 across 5 workspaces
- **Largest workspaces:** portal/Backend (578 total deps), Source/Backend (412)
- **Supply chain surface:** Medium risk - quarterly audits adequate
- **No abandoned packages detected** ✓

### High-Recurrence Packages to Watch
1. **vite** (2 workspaces) - Multiple CVEs, frontend-focused toolchain
2. **vitest** (3 workspaces) - Dev environment attack surface
3. **postcss** (2 workspaces) - Part of CSS processing pipeline
4. **jest** (Source/Backend) - 33 transitive vulnerabilities, major version behind

### Audit Tools Available
- ✓ npm audit (built-in, works for all workspaces)
- ✓ npm outdated (works reliably)
- ✓ npx license-checker (works for license compliance)
- npm ls (for dependency tree analysis)

### Recommended Audit Cadence
- **Monthly:** Run npm audit in CI/CD (catch new CVEs early)
- **Quarterly:** Deep audit of frontend toolchain (vite, vitest, postcss ecosystem)
- **Quarterly:** Infrastructure audit (orchestrator, gRPC, telemetry)
- **Annually:** License compliance + deprecated package check

### Future Improvements
1. Implement Dependabot for automated PR generation
2. Add CVE severity gating in CI (fail on critical)
3. Create dependency upgrade runbooks (especially for major version bumps)
4. Document post-install verification steps for each major upgrade
5. Create alert rules for production vs dev dependency issues (different SLAs)

### Patterns & Heuristics
- **Path Traversal in Build Tools:** vite, vitest, postcss all have CWE-22 issues
  - Pattern: Tools that read/write files during build are high-risk attack surface
  - Mitigation: Keep build tools updated, run builds in sandboxed environments
  
- **DoS via Memory/Recursion:** browserslist (memory), braces (ReDoS)
  - Pattern: Tools that process patterns/queries can be DoS'd with malicious input
  - Mitigation: Input validation, rate limiting for CI/CD builds

- **Dev-Only Critical Issues:** vitest UI server, Jest ecosystem
  - Pattern: Testing frameworks are critical during dev but low production risk
  - Mitigation: Separate SLA for dev vs prod dependencies

### Next Audit Date
**November 8, 2026** (1 month from last audit)
