# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Runs

### Run 1: 2026-10-23 (dev-crew project)

**Projects Audited:** 6 npm-based projects (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)

**Key Findings:**

#### Critical CVEs Identified
1. **proxy-addr (CVSS 9.1):** IPv4-mapped IPv6 spoofing → authorization bypass
   - Transitive via express in Source/Backend
   - Requires express >=5.0.0 to fix (major breaking change)
   - Affects IP-based access control
   
2. **Handlebars (CVSS 9.8):** AST type confusion → RCE
   - Transitive in Source/Backend
   - Malformed `@partial-block` can inject arbitrary code
   - Update to >4.7.8 is low-breaking-change fix

3. **vitest (CVSS 9.8):** File read + code injection
   - Direct in Source/Frontend, portal/Frontend
   - Affects dev/CI environments when `vitest --ui` runs
   - Requires vitest >=5.0.0 (major bump)

4. **vite (CVSS 8.5-9.0):** Path traversal in dev server
   - Dev-only, but impacts security during development
   - Requires vite >=8.3.5 (major bump)

5. **jest ecosystem (HIGH):** 33+ vulnerabilities cascading through test suite
   - Affects all three projects using jest
   - jest-message-util, jest-haste-map, braces (via micromatch) have code injection/DoS
   - Requires jest >=30.5.2 (major bump from 30.2.0)

#### Outdated Packages
- **pino:** 2 major versions behind (8.x → 10.x) — security patches likely
- **uuid:** 5 major versions behind (9.x → 14.x) AND has CVE (buffer overflow)
- **express:** 1 major behind (4.x → 5.x)
- **jest:** Locked at 30.2.0, need to jump to 30.5.2+ (patch that fixes 30+ vulns)

#### Dependency Tree Health
| Project | Size | Risk |
|---------|------|------|
| Source/E2E | 4 deps | **CLEAN** (0 vulns) |
| platform/orchestrator | 155 deps | Moderate |
| Source/Backend | 411 deps | HIGH (40 vulns) |
| Source/Frontend | 230 deps | CRITICAL (17 vulns, 96% dev deps) |
| portal/Backend | 577 deps | CRITICAL (61 vulns) |
| portal/Frontend | 424 deps | CRITICAL (23 vulns, 98% dev deps) |

**Total:** 1,791 dependencies, 150 vulnerabilities

#### Recommended Upgrade Path
1. **Immediate (P1 Critical):**
   - Fix proxy-addr (requires express 5.x migration)
   - Update handlebars
   - Update vitest to >=5.0.0
   - Update vite to >=8.3.5
   
2. **Short-term (P2 High):**
   - jest ecosystem to >=30.5.2 (requires testing)
   - uuid to >=11.1.1 (major bump, test thoroughly)
   - qs to >=6.16.0
   - ws to >=8.21.0
   - js-yaml to >=3.15.2

3. **Medium-term (P3):**
   - pino to 10.x
   - express 4.x → 5.x migration (plan + test)

#### Audit Method Notes
- `npm audit --json` provides rich CVSS/CWE/severity data — primary tool
- `npm outdated --json` shows version gaps — use for major-version detection
- Manual grep for license fields when license-checker unavailable
- **Gotcha:** Some vulnerabilities require major version bumps; test before committing

#### Environment Notes
- Platform: Linux (Azure), Bash
- Tool availability: npm, Python 3.12, grep, ripgrep
- All projects use npm (no Go, Python, Rust, Java detected)

#### Tools Available
✅ `npm audit --json` — provides full CVE data  
✅ `npm outdated --json` — version gaps  
✅ `npm ls --json` — dependency tree  
✅ `npx license-checker --json` — license compliance  
❌ `govulncheck` — not applicable (no Go projects)  
❌ `pip-audit` — not applicable (no Python projects)  

#### Lessons for Next Audit
1. **Jest ecosystem is high-maintenance:** Multiple HIGH/CRITICAL issues, watch closely on next major release
2. **Frontend dev tools (vitest, vite) are new/evolving:** Frequent vulnerabilities; check monthly
3. **Portal projects have higher risk:** portal/Backend (577 deps, 61 vulns) and portal/Frontend (424 deps, 23 vulns) — consider separate upgrade timeline from Source/
4. **Breaking changes ahead:** express 5.x, jest 30.5.2+, vitest 5.x, vite 8.3.5+ all have potential breaking changes — schedule upgrades with testing
5. **Source/E2E is a model:** 4 deps, 0 vulns — consider as a reference for minimal dependency design

## Watch List

### High-Risk Packages (Recurring CVEs)
- **jest ecosystem:** Monitor for 31.x release; test framework changes frequently
- **vitest:** New tool, rapid iteration; check npm audit monthly
- **vite:** Active development; path traversal/XSS issues are evolving
- **proxy-addr:** Part of express ecosystem; watch for 2.0.8+ versions

### Packages with Known Technical Debt
- **handlebars:** History of template injection issues; review all usage
- **qs:** Multiple DoS issues; consider alternatives (URLSearchParams) if feasible
- **js-yaml:** ReDoS risk; be cautious with untrusted YAML input

### Packages Planning Major Releases
- **express:** 5.0.0 is a breaking change; plan migration 6+ months out
- **pino:** 10.x has perf improvements; schedule at convenience

## Decision Log

### Escalations Made
- **DEP-001, DEP-002, DEP-003, DEP-004, DEP-012 → TheGuardians** (access control, RCE, file read, buffer overflow)
- **Remaining 145 vulnerabilities → TheFixer** (standard bug fixes, dependency updates)

### License Decisions
- No GPL/AGPL dependencies — project can remain proprietary
- All direct production dependencies have MIT/Apache/BSD/ISC licenses (compatible)

### Upgrade Priority
1. **Critical Path:** Source/Backend → portal/Backend (production systems)
2. **Dev Tools:** Source/Frontend, portal/Frontend (test infrastructure)
3. **Non-Blocking:** platform/orchestrator (can wait for maintenance window)

