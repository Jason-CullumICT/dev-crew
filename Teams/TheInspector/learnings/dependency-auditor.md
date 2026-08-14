# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-14

### Summary
- **Projects Audited:** 5 major (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
- **Total CVEs:** 99 (5 critical, 28 high, 64 moderate, 3 low)
- **Status:** CRITICAL - Multiple RCE vulnerabilities detected

### Key Findings

#### Critical Issues (P1)
1. **Vitest RCE** (CVSS 9.8): UI server allows arbitrary file read/execution on default network port
   - **Affected:** portal/Backend, portal/Frontend (DIRECT dependencies)
   - **Action:** Update to vitest@^3.2.6 immediately
   - **Escalation:** TheGuardians (RCE in dev infrastructure)

2. **Protobufjs RCE** (CVSS 9.8): Arbitrary code execution via unsafe deserialization
   - **Affected:** platform/orchestrator, portal/Backend (transitive)
   - **Issue:** Multiple gRPC packages depend on old protobufjs versions
   - **Action:** Trace dependency chain and update all packages

3. **Handlebars Template Injection** (CVSS 8.1): AST type confusion allows JS injection
   - **Affected:** Source/Backend (transitive)
   - **Action:** Run npm audit fix to update parent packages

#### High Issues (P2) - 28 total
- **Vite Path Traversal** (CVSS 0, exploitable): Frontend dev server vulnerability
- **Form-Data CRLF Injection** (CVSS 7.5): Header injection in multipart requests (affects all projects)
- **Nanoid DoS** (CVSS 5.9): Infinite loop with negative size values (Frontend, Portal)
- **PostCSS XSS** (CVSS 6.1): CSS stringification vulnerability (portal/Frontend)
- **Brace-Expansion DoS** (CVSS 7.5): Multiple DoS vectors via string expansion

#### Outdated Packages (Planning Items)
- express: 4.18.2 → 5.2.1 (plan v5 migration)
- pino: 8.17.0 → 10.3.1 (2 major versions behind)
- uuid: 9.0.0 → 14.0.1 (5 major versions behind - urgent)
- vite: 5.4.0 → 6+ (security patches in v6)

### Environment Notes
- **npm audit:** Works on all projects with `--json` output
- **npm outdated:** Works but reports deps as UNMET (packages not installed)
- **npm license-checker:** Not installed - recommend installing for next audit cycle
- **No govulncheck/pip-audit needed:** Project is npm-only (no Go/Python packages detected)

### Remediation Status
- **P1 Requires:** Manual package.json edits + npm install (portal vitest, protobufjs chain)
- **P2 Requires:** Run `npm audit fix --force` in each project
- **P3 & Below:** Deferred to future sprint

### Next Audit
- Monthly comprehensive audit recommended
- Add to CI/CD gate: `npm audit --audit-level=moderate`
- Consider Dependabot for automated PRs
- Establish SLA: P1=24h, P2=1week, P3=2weeks

### Cross-Team References
- **TheGuardians**: Escalated 5 findings (vitest RCE, handlebars injection, protobufjs RCE, vite path traversal, form-data CRLF)
- **TheFixer**: Will handle npm update PRs once engineering prioritizes
