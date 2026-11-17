# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### CVE Patterns & Watch List

#### High-Recurrence Vulnerabilities
- **brace-expansion**: Persistent DoS pattern across 7+ CVEs (CWE-400, CWE-407, CWE-674, CWE-770). Root cause: exponential-time/recursive expansion algorithms. Watch all versions <1.1.21; prefer pinning to 1.1.21+.
- **handlebars**: Critical JS injection via AST type confusion (CWE-94, CWE-843). Pattern spans versions 3.0.0-4.7.9. Root cause: untrusted AST construction in partial templates and decorator handling. All versions <=4.7.9 have CVEs.
- **js-yaml**: Quadratic CPU consumption in merge-key chains (CWE-400, CWE-407). Watch versions <3.15.2. Configuration option `maxTotalMergeKeys` does not fully mitigate.

#### Supply Chain Red Flags
- **vitest + tinypool**: Critical RCE via prototype pollution. Vitest <=4.1.10 vulnerable; fix requires major version bump to 5.1.0+.
- **vite**: Accumulating path traversal issues across minor versions. Recommend 8.3.8+ (major version bump from 5.x/6.x).
- **uuid**: Severely outdated in Backend (9.0.0 vs latest 14.0.3). Buffer overflow CVE requires immediate major version bump.

### Audit Tool Status
- **npm audit**: Available and working correctly on all Source/ directories
- **npm outdated**: Working; shows all direct dependencies and version gaps
- **license-checker**: Installed; can be run with `npx license-checker --json`

### Project-Specific Observations
- **Backend**: 102 production dependencies, 310 dev dependencies. Total 411 (411 unique).
  - uuid is a direct production dependency with CVE (MODERATE, buffer bounds).
  - handlebars appears transitively via build tools (not directly used).
  - Recommend audit frequency: weekly due to 2 critical transitive CVEs.

- **Frontend**: 9 production dependencies, 222 dev dependencies. Total 230.
  - Direct vulns: vite (HIGH), vitest (CRITICAL), react-router-dom (MODERATE).
  - Vitest UI server should be disabled in production; listening UI is a critical file-read vector.
  - Recommend audit frequency: weekly; vitest is test framework (dev-only but high-risk).

- **E2E**: 4 production dependencies, 0 CVEs. Low risk.

### License Compliance Decisions
- Backend marked UNLICENSED (private project). No GPL/AGPL detected in dependency tree. Status: OK.
- Frontend licenses not yet scanned; recommend running `npx license-checker --json` to establish baseline.

### Remediation Priorities
1. **P1 (Immediate)**: 
   - Upgrade uuid: 9.0.0 → 11.1.1+ (removes buffer overflow)
   - Upgrade vitest: 2.0.5 → 5.1.0+ (removes tinypool RCE)
   - Upgrade vite: 5.4.0 → 8.3.8+ (removes path traversal issues)

2. **P2 (This week)**:
   - Upgrade express: 4.18.2 → 4.22.3 (patch-level security fixes)
   - Upgrade react-router-dom: 6.26.0 → 7.18.5+ (removes open-redirect issues)

3. **P3 (Next sprint)**:
   - Evaluate pino upgrade path: 8.17.0 → 10.4.0 (breaking changes likely)
   - Evaluate react upgrade: 18.3.1 → 19.3.1 (not security-critical yet)
