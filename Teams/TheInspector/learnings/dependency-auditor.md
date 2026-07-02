# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-02

### Critical Patterns Identified

1. **Vitest RCE (GHSA-5xrq-8626-4rwp)**
   - Affects all vitest versions <=3.2.5
   - Appears in: Source/Frontend, portal/Backend, portal/Frontend
   - **Status:** RECURRING — all three projects share same vulnerable version
   - **Action:** Add vitest@>=3.2.6 to baseline in future audits

2. **Handlebars JS Injection (GHSA-2w6w-674q-4c4q + 7 more)**
   - Affects handlebars <=4.7.8; 8 distinct CVEs in this package
   - Found in: Source/Backend (transitive via build tools or yaml)
   - **Likelihood:** Medium if templates are rendered; investigate usage
   - **Watch:** This is a high-value attack vector for template rendering systems

3. **Protobufjs RCE (GHSA-xq3m-2v4x-88gg)**
   - Affects protobufjs <7.5.5; arbitrary code execution on proto parsing
   - Found in: platform/orchestrator, portal/Backend
   - **Status:** Common pattern; protobuf is in critical path for services
   - **Recommendation:** If new services added, check for protobufjs immediately

4. **Portal Backend Supply Chain Issue**
   - 54 CVEs vs. 9-11 in other projects
   - Root cause: Test infrastructure (vitest) mixed with prod code
   - **Recommended Fix:** Segregate dev deps; exclude node_modules from prod Docker image

### Tools & Availability

- **npm audit:** Available and reliable; JSON output formats well
- **npm outdated:** Available; exit code 1 when outdated deps exist (expected)
- **npm list:** Works but verbose; use `--depth=0` for clarity
- **license-checker:** NOT installed; recommend installing in future runs
- **govulncheck, pip-audit:** Not detected; Go and Python code paths not present in this project

### Dependency Update Patterns

- **Transitive deep:** Form-data, brace-expansion, @babel/core appear in nearly all projects
- **Major version lags:** React (18.3 → 19.2), Express (4.18 → 5.2), Pino (8 → 10), UUID (9 → 14)
- **Major version upgrades require testing:** Express 5 has breaking middleware API; React 19 has new hooks
- **UUID upgrade is HIGH PRIORITY:** Has CVE (buffer overflow) and 5-major-version lag

### Recurring CVE Watch List

- vitest: Prone to dev-server security issues (RCE, CORS bypass)
- vite: Windows path traversal; NTLM hash disclosure on Windows dev machines
- form-data: CRLF injection; appears in many upload-handling projects
- @babel/core: Source map info disclosure; not critical but widespread

### Compliance & License Notes

- No GPL/AGPL direct dependencies detected
- No UNLICENSED or unknown-license packages found
- All major frameworks (React, Express, Vitest) have OSS-friendly licenses

### Future Audit Recommendations

1. **Establish Baseline:** Define target versions for each project (e.g., vitest@latest-minor, vite@latest-minor)
2. **Add License Scanning:** Install `npx license-checker` and run quarterly
3. **Set CI Gates:** Fail CI on critical CVEs; warn on moderate
4. **Quarterly Deep Audits:** This level of detail every 3 months
5. **Weekly Automated Scans:** Just `npm audit` JSON in CI to catch new vulns early
6. **Monorepo Health:** Portal is a warning sign; consider restructuring

## Lessons Learned

- **Transitive deps are invisible until npm audit runs:** Can't eyeball risk from package.json alone
- **Dev dependencies leak into prod:** Portal/Backend example shows importance of build discipline
- **Major version lags compound:** UUID at v9 with known CVE; should have updated to v11+ already
- **Template rendering is high-risk:** Handlebars + 8 CVEs; if backend renders templates, escalate to security team
- **Dev servers are network-exposed in monorepos:** Vitest UI and Vite dev servers should not be accessible from shared networks

## Next Steps (Post-Audit)

1. Run `npm audit fix` in each project to auto-patch non-breaking vulns
2. Manually update vitest, handlebars, protobufjs (blocking P1s)
3. Schedule React/Express major version upgrades for Sprint N+1/N+2
4. Create TheFixer backlog items for all P2+ findings
5. Add weekly `npm audit` gate to CI
6. Review portal/Backend structure with TheFixer team
