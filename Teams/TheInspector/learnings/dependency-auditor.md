# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-10-20

#### Critical Dependencies with Known CVE Clusters
- **protobufjs** — PERSISTENT RISK: 12+ CVEs across <=7.6.x versions
  - Latest vulnerable versions: <=7.6.4
  - Recommend: Upgrade to latest + monitor quarterly
  - CWE-94 (code injection) appears in 3+ separate CVEs
  
- **express & proxy-addr** — TRUST BOUNDARY ISSUES
  - proxy-addr IPv4-mapped IPv6 spoofing (CVSS 9.1) is critical for apps using X-Forwarded-For
  - Affects: Source/Backend, platform/orchestrator
  - Pattern: High-severity in middleware/networking packages
  
- **jest ecosystem** — TRANSITIVE VULNERABILITY CLUSTERS
  - Jest 29.x and 30.2.0 have cascading HIGH vulnerabilities across @jest/* packages
  - Root causes: jest-message-util, jest-haste-map, micromatch
  - Recommendation: Always update jest to latest patch version

- **vitest/vite** — RECENT EMERGENT RISKS (2024-2025)
  - @vitest/mocker path traversal (GHSA-82fw-gwwq-j7x9) — RCE/file disclosure
  - tinypool prototype pollution gadget (GHSA-5gmw-xhrv-c9v3) — RCE
  - Pattern: Build-time vulnerabilities increasingly impactful
  - Status: Monitor closely for new releases

#### Audit Tools Available
- ✅ `npm audit --json` — Works across all Node/npm projects
- ❌ `license-checker` — Not installed in environment
- ❌ `govulncheck` — No Go modules in codebase
- ❌ `pip-audit` — No Python packages in codebase

#### Previous Decisions
- (none yet — add as policy is established)

#### Known False Positives / Non-Issues
- Multiple @types/* transitive via jest/vitest — type packages only, low risk
- brace-expansion DoS via glob patterns — mitigated if glob doesn't process untrusted input

#### Recommendations for Next Audit
1. Establish "pin express version" policy across all packages (currently 4.18.2 vs 4.21.0 drift)
2. Run `npm audit fix` as pre-commit gate
3. Subscribe to GHSA advisories for: protobufjs, express, jest, vitest
4. Quarterly review of transitive dependency tree (currently ~480 deps across all packages)
