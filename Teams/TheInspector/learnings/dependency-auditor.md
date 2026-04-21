# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings from 2026-04-21 Audit

### Critical Findings (Watch List)

1. **protobufjs (platform/orchestrator)** — CRITICAL RCE
   - Vulnerability: GHSA-xq3m-2v4x-88gg (Arbitrary code execution)
   - Affected range: <7.5.5
   - Status: MUST FIX (solo-session required — platform/ infrastructure)
   - Notes: This is in the orchestrator that runs the entire build pipeline. Compromise here affects all generated artifacts.

2. **Handlebars (Source/Backend)** — Multiple JavaScript injection CVEs
   - Vulnerabilities: GHSA-2w6w-674q-4c4q (CVSS 9.8 — critical), GHSA-3mfm-83xf-c92r, GHSA-xjpj-3mr7-gcpf, etc.
   - Affected range: 4.0.0 - 4.7.8
   - Status: MUST FIX — likely used by template compilation in workflow engine
   - Investigation needed: Verify if handlebars processes user-defined templates. If so, this is directly exploitable.

3. **path-to-regexp (platform/orchestrator)** — ReDoS
   - Vulnerability: GHSA-37ch-88jc-xwx2 (CVSS 7.5)
   - Affected range: <0.1.13
   - Status: MUST FIX (solo-session required — platform/ infrastructure)
   - Notes: DoS attack on API routing. Attacker can hang orchestrator with crafted route parameters.

### High-Value Audit Findings

- **Frontend dev tools** (vite, vitest, esbuild): Multiple moderate vulnerabilities, but dev-time only (no production impact)
  - Recommendation: Update vitest to 4.1.4+, which pulls in fixed vite (8.0.9+)
  - Effort: 2-4 hours (major version bump, requires testing)
  
- **Supply chain risk**: 799 total dependencies across all modules
  - Ratio: 61:1 (transitive to direct) — typical for Node.js but significant surface
  - Recommendation: Add license-checker and dependency age scanning to CI/CD

### Outdated Packages to Monitor

1. **express** (4.18.2 → 4.22.1) — Available patch update, consider for security patches
2. **pino** (8.17.0 → 10.3.1) — Major version bump, evaluate performance impact before upgrading
3. **React** (18.3.1 → 19.2.5) — Major version bump, plan migration for future sprint
4. **vitest** (2.0.5 → 4.1.4) — Required to fix dev-time vulnerabilities (high priority)

### License Compliance Status

✓ **PASS** — All direct dependencies use permissive licenses (MIT, ISC, Apache 2.0)
- No GPL/AGPL detected
- Transitive dependencies not checked (recommend adding license-checker to CI/CD)

### Audit Tools Available in Environment

- `npm audit --json` ✓ Working
- `npm outdated --json` ✓ Working
- `npm list` — Limited use (modules not installed, relies on lock file)
- license-checker — Not yet installed, should add to CI/CD pipeline
- govulncheck (Go) — Not tested, no Go modules in project
- pip-audit (Python) — Not tested, no Python modules in project

### Process Improvements for Next Audit

1. **Establish remediation SLA:**
   - Critical (P1): Fix within 24-48 hours
   - High (P2): Fix within 1 week
   - Moderate (P3): Plan within sprint
   
2. **Add CI/CD gate:**
   - Run `npm audit` before build
   - Fail on critical/high in direct dependencies
   - Warning on moderate (can proceed with approval)

3. **Dependency age monitoring:**
   - Flag packages with no updates in 6+ months
   - Monitor for abandoned projects

4. **Track platform/ infrastructure separately:**
   - DEP-001 and DEP-003 require solo session fixes (cannot be automated by pipeline agents)
   - Consider creating a "platform-maintenance" task in backlog

## Previous Audit History

_(none yet — this is the first audit)_

## Next Steps

1. **Immediate (24h):** Create solo-session task for platform/orchestrator fixes (protobufjs, path-to-regexp)
2. **This sprint:** Fix handlebars in Source/Backend, update vitest in Source/Frontend
3. **Next sprint:** Plan React upgrade (18→19) and pino upgrade (8→10)
4. **Ongoing:** Integrate npm audit and license-checker into CI/CD pipeline
