# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Run 2026-10-11

#### Critical Vulnerabilities Identified
1. **Handlebars.js (10 CVEs, CVSS 9.8)** - Via jest ecosystem
   - Root cause: Old jest version (29.7.0) pulls in ancient handlebars
   - Fix: Upgrade jest to >=30.5.2 (major bump required)
   - Watch for: handlebars used in build/template context

2. **Vitest (2 CVEs, direct dependency in Frontend)**
   - vitest@2.0.5 has UI server RCE (GHSA-5xrq-8626-4rwp)
   - Affects: Source/Frontend
   - Fix: Upgrade to >=5.0.3 (major bump)
   
3. **Tinypool (2 CVEs, via vitest)**
   - Prototype pollution → RCE
   - Upgraded via vitest upgrade

4. **proxy-addr (1 CVE, via express)**
   - IPv6 spoofing bypass for IP-based access control
   - Via: body-parser → express
   - Fix: Upgrade to >=2.0.8

#### Recurring Patterns
- **Test framework debt:** Jest (29.7.0) is 1+ major versions behind; pulling in ancient transitive deps
- **Frontend heavy on devDeps:** 96% of dependencies are devDependencies — consider splitting test fixtures
- **Backend has wider prod dependency:** 102 prod deps vs Frontend's 9 — more supply chain risk

#### Audit Tools Available
- `npm audit --json` ✓ Works
- `npm outdated --json` ✓ Works
- `license-checker` ✗ Not installed (would need `npm i -g license-checker`)

#### Projects Scanned
| Project | Status | Key Finding |
|---------|--------|------------|
| Source/Backend | 🔴 42 vulns (2 crit) | Jest ecosystem RCE (handlebars) |
| Source/Frontend | 🔴 17 vulns (2 crit) | Vitest direct dep RCE |
| Source/E2E | ✅ Clean | Only 4 deps, minimal risk |
| platform/orchestrator | 🟠 9 vulns (2 crit) | Mixed tooling issues |

#### Escalations Needed
- All 8 critical vulnerabilities → [ESCALATE → TheGuardians]
  - RCE risks (handlebars, vitest, tinypool)
  - Authentication bypass (proxy-addr)
  - Path traversal (@vitest/mocker)
  - DoS (browserslist)

#### Next Audit Actions
1. Re-scan after jest and vitest upgrades
2. Set up Dependabot or Renovate for continuous monitoring
3. Implement pre-commit hook: `npm audit --audit-level=moderate` (fail on medium+)
4. Consider lockfile pinning strategy to prevent transitive upgrades from breaking things
