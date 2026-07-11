# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

**Last Updated:** 2026-07-11

---

## CVE Watch List (Recurring Threats)

### Critical Threats
1. **handlebars@<=4.7.8** — 8+ distinct JavaScript Injection vulns (CVSS 9.8 critical)
   - Found in: transitive deps (jest, test chain)
   - Action: Upgrade to >=4.7.9 ASAP
   - Next occurrence: Likely on jest/build tool updates

2. **form-data@4.0.0-4.0.5** — CRLF injection (CVSS 7.5)
   - Found in: transitive deps (body-parser → express)
   - Action: Upgrade to >=4.0.6
   - Next occurrence: With Express updates

3. **uuid@<11.1.1** — Buffer overflow in v3/v5/v6 (CVSS 7.5)
   - Found in: Source/Backend direct dep
   - Current: 9.0.0
   - Action: Update to 11.x or patch to 9.0.1
   - Next occurrence: Recurring until v11.x adopted

4. **vite@<=5.4.0** — Dev server CORS/SOP bypass + HMR issues
   - Found in: Source/Frontend, portal/Frontend
   - Action: Keep updated to latest 5.x or 6.x
   - Next occurrence: Continuous (dev server is attack surface)

### Medium Threats (DoS)
5. **brace-expansion@<1.1.13** — ReDoS via glob patterns (CVSS 6.5)
6. **js-yaml@<3.15.0** — YAML merge key DoS (CVSS 5.3)
7. **express (via qs)** — qs.stringify crash on null/undefined (CVSS 5.3)

---

## License Compliance Status

### Current Findings (2026-07-11)
- **Allowed Licenses:** MIT, BSD-2/3-Clause, Apache-2.0, ISC (all main deps comply)
- **Forbidden Licenses:** GPL-2.0, GPL-3.0, AGPL-3.0 (none found in direct deps)
- **Status:** ✅ No GPL/AGPL risk detected in direct dependencies

### Audit Coverage
- **Tool Used:** npm audit (license field parsing)
- **Coverage:** Direct dependencies only; transitive audit incomplete
- **Recommendation:** Install `license-checker` for complete transitive scan
  ```bash
  npm install -g license-checker
  license-checker --json --onlyAllow "MIT,Apache-2.0,BSD,ISC"
  ```

---

## Module Risk Profile (2026-07-11 Snapshot)

| Module | Status | Critical | High | CVEs | Notes |
|--------|--------|----------|------|------|-------|
| **E2E** | ✅ CLEAN | 0 | 0 | 0 | Best practice example |
| **Backend** | 🔴 P1 | 1 | 1 | 9 | Handlebars via jest |
| **Frontend** | 🔴 P1 | 1 | 3 | 11 | React Router + vite vulns |
| **orchestrator** | 🔴 P1 | 1 | 2 | 9 | Similar to Backend |
| **portal/Frontend** | 🔴 P1 | 1 | 4 | 11 | Same as main Frontend |
| **portal/Backend** | 🔴 ALERT | 2 | 6 | 54 | ⚠️ INVESTIGATE: unusually high |

### Alert: portal/Backend
- 54 CVEs (2x main Backend) suggests:
  - May contain scaffolding/demo code
  - May have older test framework versions
  - Action: Determine if actively maintained; consider pruning

---

## Audit Tools Available in Environment

### ✅ Installed & Working
- `npm audit` — Fast CVE scanning per module
- `npm outdated` — Version drift detection
- Basic git/bash tools for analysis

### ❌ Not Installed
- `license-checker` — Would enable automated license audits
- `govulncheck` — Not needed (no Go detected)
- `pip-audit` — Not needed (no Python detected)
- `snyk` — Alternative CVE scanner (not installed)

### Installation Checklist for Next Run
```bash
# Optional but recommended
npm install -g license-checker
npm install -g npm-check-licenses

# Verify available
npm audit --version
npm outdated --version
```

---

## Prior CVE Resolution Status

### Open Issues (2026-07-11 Audit)
| CVE | Package | Fix | Priority | Status |
|-----|---------|-----|----------|--------|
| GHSA-2w6w-674q-4c4q | handlebars | >=4.7.9 | P0 (Critical) | 🔴 OPEN |
| GHSA-hmw2-7cc7-3qxx | form-data | >=4.0.6 | P1 (High) | 🔴 OPEN |
| GHSA-w5hq-g745-h8pq | uuid | >=9.0.1 or 11.x | P1 (High) | 🔴 OPEN |
| GHSA-2j2x-hqr9-3h42 | react-router-dom | >=6.30.4 | P1 (High) | 🔴 OPEN |
| GHSA-67mh-4wv8-2f99 | esbuild/vite | >=5.4.1 | P2 (Dev-only) | 🔴 OPEN |
| GHSA-f886-m6hf-6m8v | brace-expansion | >=1.1.13 | P2 (Medium) | 🔴 OPEN |
| GHSA-h67p-54hq-rp68 | js-yaml | >=3.15.0 | P2 (Medium) | 🔴 OPEN |
| GHSA-qx2v-qp2m-jg93 | postcss | >=8.5.10 | P2 (Medium) | 🔴 OPEN |

### Validation Plan (Before Next Audit)
- [ ] Run `npm audit fix --force` in each module
- [ ] Re-run `npm audit --json` and validate critical count → 0
- [ ] Run full test suite: `npm test --workspaces --if-present`
- [ ] Verify no breaking changes introduced
- [ ] Commit changes with CVE reference

---

## Dependency Tree Health Metrics

### Size Assessment
- **Source/Backend:** ~250 transitive deps for 5 direct (50:1 ratio) — acceptable for Node.js
- **Source/Frontend:** ~200 transitive deps for 3 direct (67:1 ratio) — expected for React build
- **Source/E2E:** 4 transitive deps for 1 direct (4:1 ratio) — **excellent** (model this)

### Bloat Sources
- `jest` adds 100+ transitive deps (ts-jest, babel, webpack plugins, handlebars)
- `vite` adds 80+ transitive deps (esbuild, postcss, rollup)
- `react` (dev) adds 50+ transitive deps (react-dom, testing-library, vitest)

### Optimization Opportunity
- Move jest to devDependencies (if not already) to avoid prod deployment
- Consider pnpm workspace to share node_modules across modules

---

## Known Safe Practices in dev-crew

✅ **Confirmed:**
- No post-install scripts in any package.json
- No hardcoded secrets in dependency configs
- Lock files present and committed (reproducible installs)
- No deprecated packages in direct deps
- All major packages have active maintainers (100k+ weekly downloads)

⚠️ **At Risk:**
- Transitive dependency bloat (esp. portal/Backend)
- Dev server exposure in CI/CD (vite/esbuild attacks on localhost)
- Test framework dependencies in main packages (jest pulls in handlebars)

---

## Cross-Team Escalations Needed

### [ESCALATE → TheGuardians] (Security Team)

1. **Handlebars RCE** — Code review needed:
   - Are any templates dynamically constructed?
   - Could user JSON payloads ever reach template compilation?
   - Recommendation: Even static templates are at risk; update ASAP

2. **form-data CRLF** — File upload review needed:
   - If file uploads accepted from untrusted sources, verify boundaries
   - Check if form-data is used in any upstream proxy logic
   - Recommendation: Update to >=4.0.6 + validate filenames

3. **React Router Open Redirect** — Navigation review needed:
   - Grep for useNavigate, <Navigate>, redirect patterns
   - Ensure no user input flows to route parameters without validation
   - Recommendation: Whitelist allowed redirect origins

4. **uuid Buffer Overflow** — Code review needed:
   - Verify no reuse of output buffers across UUID calls
   - Recommendation: Update to 11.x or at least 9.0.1

### [CROSS-REF: red-teamer]
- Test ReDoS payloads in glob patterns (brace-expansion)
- Attempt open redirect on all `/redirect?to=` style endpoints
- Fuzz YAML parsing with deeply nested aliases (js-yaml)

---

## Recommendations for Next Audit (2026-07-25)

### High Priority
1. Apply `npm audit fix` to all modules and validate no breaking changes
2. Investigate **portal/Backend** 54 CVEs — is it active or legacy?
3. Manually patch handlebars first (most critical, most vulns)
4. Run full test suite after each update

### Medium Priority
5. Install license-checker for automated license scanning
6. Baseline transitive dependency counts (set targets to avoid bloat)
7. Consider moving all test deps to devDependencies only

### Nice-to-Have
8. Evaluate monorepo tooling (lerna/pnpm) for shared node_modules
9. Set up pre-commit hook: `npm audit --audit-level=high`
10. Add dependency update automation (Dependabot or Renovate)

---

## Notes for Team Discussion

- **E2E is a model:** Only 4 transitive deps, 0 CVEs — use as baseline for other modules
- **portal/Backend is an outlier:** 54 CVEs compared to 9–11 in others — needs investigation
- **Handlebars is the blocker:** Its 8 vulns appear due to transitive pull via test frameworks; update immediately and re-scan
- **License audit is incomplete:** Need license-checker for full compliance; current check based on npm audit only

---

**Next Review Date:** 2026-07-25 (2 weeks)  
**Reviewed by:** Dependency Auditor (haiku)  
**Questions?** Escalate to TheInspector team lead
