# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-05-11 (run-20260511-060605)

### Critical Findings
1. **handlebars@4.7.8** in Source/Backend (transitive via jest)
   - CVE: GHSA-2w6w-674q-4c4q (JavaScript Injection via AST Type Confusion)
   - CVSS: 9.8 (Critical)
   - Status: **REQUIRES IMMEDIATE FIX**
   - Fix: Update to >=4.7.9

2. **protobufjs@7.5.4** in platform/orchestrator and portal/Backend
   - CVE: GHSA-xq3m-2v4x-88gg (Arbitrary Code Execution)
   - Status: **REQUIRES IMMEDIATE FIX**
   - Fix: Update to >=7.5.5
   - Impact: High criticality (orchestrator is infrastructure)

3. **path-to-regexp** in platform/orchestrator
   - CVE: GHSA-37ch-88jc-xwx2 (ReDoS via route parameters)
   - Status: **HIGH PRIORITY**
   - Fix: Update to >=0.1.13

### Observations
- **No post-install scripts detected** → Supply chain risk from installation is LOW
- **No GPL/AGPL licenses detected** → License compliance appears clean (needs formal audit)
- **Large transitive surface:** ~1,600+ total dependencies across 6 projects
- **Largest project:** portal/Backend (577 deps) — recommend dependency optimization review
- **Dev dependencies dominate:** Most vulnerable packages are dev-time tools (vite, vitest, esbuild)

### Outdated Packages
- **uuid:** 9.0.0 → 14.0.0 (5 majors behind) — consider update
- **pino:** 8.x → 10.3.1 (2 majors behind) — update recommended
- **express:** 4.x → 5.x (1 major) — plan migration
- **React:** 18.x → 19.x (1 major) — monitor adoption

### Audit Tool Status
- ✅ npm audit: Available and functional
- ❌ license-checker: Not installed (recommend: `npm install -g license-checker`)
- ❌ govulncheck: Not detected (Go projects not in scope)
- ❌ pip-audit: Not detected (Python projects not in scope)

### Recommendations for Next Audit
1. Install license-checker globally for comprehensive license compliance
2. Monitor protobufjs and handlebars for subsequent patch releases
3. Establish automated Dependabot/Renovate PRs for patch updates
4. Consider dependency optimization in portal/Backend (577 deps is high)
5. Track handlebars for post-4.7.9 releases (security update track record)

### Watch List (Recurring Issues)
- **handlebars:** Multiple CVEs in same version; track closely
- **build tool chain (vite, vitest, esbuild):** Frequent updates; consider pinning to known-good versions
- **protobufjs:** Critical severity; subscribe to release notifications

## Audit Metrics Summary
| Metric | Value |
|--------|-------|
| Total Projects | 6 npm |
| Critical CVEs | 3 |
| High CVEs | 3 |
| Moderate CVEs | 17 |
| Outdated Packages | 8 |
| Overall Risk | **C Grade** |

## Cross-Team Findings
- **[ESCALATE → TheGuardians]** Handlebars RCE and protobufjs RCE are exploitable code execution risks
- **[CROSS-REF: red-teamer]** Path-to-regexp ReDoS can be weaponized for DoS attacks
- **[CROSS-REF: performance-profiler]** Build tool vulnerabilities don't affect runtime performance but impact CI reliability
