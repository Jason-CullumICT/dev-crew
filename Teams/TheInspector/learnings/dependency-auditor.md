# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Critical Watch List (Recurring CVEs)
- **Handlebars.js** — Multiple CVEs related to AST type confusion and prototype pollution. Track versions ≤4.7.9.
- **proxy-addr** — IP spoofing vulnerability via IPv4-mapped IPv6. Keep ≥2.0.8.
- **Vitest** — RCE via UI server and prototype pollution in transitive tinypool. Keep ≥5.0.5.
- **brace-expansion** — Multiple DoS CVEs. Maintain ≥1.1.21.

### High-Risk Dependency Chains
1. **Jest ecosystem (Backend)**: 35 packages cascading from a single dependency
   - jest→@jest/*→babel-jest→ts-jest creates complex upgrade paths
   - Handlebars pulled in via jest dependencies (transitive)
   - Recommendation: Pin jest versions and batch-test major upgrades

2. **Vitest ecosystem (Frontend)**: Critical vulnerabilities in test infrastructure
   - tinypool RCE via worker threads
   - @vitest/mocker path traversal
   - vite CORS bypass in dev server
   - Action: Disable Vitest UI in CI, upgrade to ≥5.0.5

3. **Build tools (Both)**: PostCSS, Browserslist, nanoid, source-map-js
   - Information disclosure via source maps
   - Memory DoS in build pipelines
   - Action: Automate build-tool updates via Dependabot

### License Findings
- **Status**: No GPL/AGPL packages in direct dependencies (low risk)
- **All major packages**: MIT, ISC, Apache-2.0
- **Recommendation**: Run quarterly license-checker audit to detect new GPL dependencies

### Tools & Techniques
- **npm audit --json**: Reliable for npm projects; integrate into CI/CD
- **Dependency Distribution**: Backend heavy on Jest (35%), Frontend on Vitest (40%)
- **E2E suite**: Clean dependency profile (0 vulns) — good example for best practices

### Supply Chain Risk Profile
- **Backend**: Moderate (large Jest tree + Handlebars transitive)
- **Frontend**: Moderate-High (test infrastructure RCEs)
- **E2E**: Low (minimal dependencies)
- **Mitigation**: Automate updates, enforce major version testing, audit transitive deps quarterly

### Grading Rationale (Grade: C)
- 4 critical CVEs with known exploits (RCE, access control bypass, secrets exposure)
- 40 high-severity CVEs (information disclosure, DoS, open redirect)
- Mitigating factors: No in-production security breaches observed; dev-only tools dominate critical issues
- Improvement path: Aggressive patching → B (6 months), sustained automation → A (12 months)

### Next Audit Checklist
- [ ] Verify Handlebars ≥4.7.10 is installed and lock files updated
- [ ] Confirm proxy-addr ≥2.0.8 in express chain
- [ ] Validate Vitest ≥5.0.5 and vitest --ui disabled in CI
- [ ] Check Jest updated to ≥30.5.2
- [ ] Confirm react-router-dom ≥7.18.0
- [ ] Review E2E dependencies (target: maintain 0 vulns)
