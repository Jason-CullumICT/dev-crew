# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-26

### Key Findings

1. **Portal/Backend is the highest-risk workspace** (4 critical + 61 total vulnerabilities)
   - OpenTelemetry ecosystem has 25 known issues (auto-instrumentations-node, protobufjs)
   - Recommend versioning audit before upgrading

2. **Body-parser DoS (GHSA-27r3-jxmh-p828)** is exploitable in all Node services
   - Affects Source/Backend directly via express middleware stack
   - Fix: Requires express or middleware dependency bump (body-parser itself may be locked)

3. **Brace-expansion has multiple DoS vectors** across build tooling
   - 6+ different CVEs, including CVSS 7.5 issues
   - Primarily affects build-time; low runtime risk unless directly exposed

4. **Browserslist cache exhaustion** present in both Backend and Frontend
   - CVSS 7.5, likely affects build tools and dev server
   - Easy fix: `npm update browserslist`

5. **No GPL/AGPL licenses detected** in primary Source/ packages (good)
   - Dev dependencies appear to use permissive licenses
   - Full license audit not run (license-checker not in environment)

### Supply Chain Observations

- **No post-install scripts** detected in core dependencies (good security posture)
- **Monorepo dedupe is working** — no duplicate major versions found
- **Transitive dependency explosion** — 641 total deps for only 111 direct (5.8x ratio)
  - Backend: 411 transitive (4x ratio) — largest attack surface
  - Frontend: 230 transitive (25x ratio) — mostly from build tools (vite, vitest)

### Watch List

- `handlebars` — 11 vulnerabilities (well-maintained, low risk)
- `brace-expansion` — 6+ DoS CVEs (lower-maintenance, higher risk)
- `baseline-browser-mapping` — Moderate CVE, potentially abandoned
- OpenTelemetry ecosystem — High concentration of CVEs (21+ issues across packages)

### Recommendations for Next Audit

1. Install license-checker and run full license compliance audit
2. Establish automated dependency scanning in CI/CD (Renovate, Dependabot)
3. Create a Go/Python dependency audit if those package managers are used
4. Monitor portal/Backend OpenTelemetry upgrades quarterly
5. Coordinate with TheGuardians on PostCSS path traversal risk (if untrusted CSS inputs)

### Tools Available in Environment

- ✅ npm audit (v10+)
- ✅ npm outdated
- ❌ license-checker (not installed)
- ❌ govulncheck (Go)
- ❌ pip-audit (Python)

### Technical Notes

- npm audit exit codes: 0 (no vulns) or 1 (vulns found) — used for scripting
- Audit reports include CVSS scores, CWE classifications, and affected version ranges
- Monorepo structure allows individual workspace audits via `cd <workspace> && npm audit`
- Package-lock.json files contain full transitive dependency tree with pinned versions
