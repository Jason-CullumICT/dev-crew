# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-11-02

#### Critical Vulnerabilities Discovered
1. **proxy-addr** (CVSS 9.1): IP spoofing via IPv4-mapped IPv6 in express middleware
   - Affects: Source/Backend
   - Direct dependency of express; commonly used in production
   - Fix: Update to >=2.0.8
   - Watch: Check every release for IP validation bypasses

2. **handlebars** (CVSS 9.8): JavaScript injection via AST type confusion
   - Affects: Source/Backend (transitive via jest/babel)
   - Multiple bypass attempts in 4.7.8 → 4.7.9 → 4.7.10
   - Status: Dev dependency (build-time); lower actual risk than runtime
   - Watch: Monitor for patch stability; consider upgrading jest major version

3. **tinypool** (CVSS 9.8): Prototype pollution → RCE in worker pool
   - Affects: Source/Frontend (transitive via vitest)
   - Embedded in vitest@<=2.1.1; vitest@5.0.5+ has fix
   - Status: Dev dependency (test-time); CI/CD risk if build system compromised
   - Watch: Evaluate vitest 5.x breaking changes

#### Dependency Tree Insights
- Backend: 412 transitive dependencies from 9 direct
  - High vulnerability density in jest/babel ecosystem
  - Express → body-parser → qs chain has multiple DoS issues
  - Proxy-addr is critical; cannot easily be removed (express middleware dependency)

- Frontend: 231 transitive dependencies from 8 direct
  - Vitest (test framework) brings in high-risk vite and tinypool
  - PostCSS has multiple path traversal CVEs (build-time risk, but information disclosure)
  - Nanoid (UUID generation) is low-risk but outdated

- E2E: Clean (5 transitive from 1 direct); @playwright/test is well-maintained

#### Environment & Tools
- npm audit --json is reliable and provides detailed CVSS scores
- npm outdated works but shows "MISSING" for uninstalled projects
  - Workaround: Parse package-lock.json directly or install before audit
- License-checker tool available but not used in this audit (would require node_modules)
- No Go, Python, Rust, or Java dependencies in this project

#### Severity Calibration
- P1 (Critical): CVSS >= 9.0, exploitable via network, affects auth/access control
- P2 (High): CVSS 7-8.9, can lead to data exposure or DoS
- P3 (Moderate): CVSS 4-6.9, requires specific conditions or is build-time only
- P4 (Low): CVSS <4, disputed, or low real-world impact

#### Automation Gaps
- No pre-commit hooks for `npm audit`
- No Dependabot or Renovate integration detected
- CI/CD pipeline does not appear to block on audit failures
- Recommendation: Add `npm audit --audit-level=moderate` to CI gates

#### Next Actions
1. Review with TheGuardians for proxy-addr IP spoofing risk (access control impact)
2. Plan tinypool upgrade for frontend (breaking vitest changes)
3. Schedule handlebars/jest major version evaluation
4. Implement `npm audit` in CI pipeline

---

### Summary Statistics
- **Total Projects Audited:** 3 (Backend, Frontend, E2E)
- **Total CVEs Found:** 49
- **Critical (P1):** 4
- **High (P2):** 12
- **Moderate (P3):** 27
- **Low (P4):** 6
- **Overall Grade:** F (exceeds thresholds)
- **Escalations to TheGuardians:** 5 findings
- **Escalations to TheFixer:** Remaining moderate/low CVEs + major version updates
