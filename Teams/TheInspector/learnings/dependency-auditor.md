# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-04-17

### Critical Findings (Watch List)

1. **handlebars** (Source/Backend)
   - Multiple template injection CVEs (8 CVEs across 4.0.0–4.7.8)
   - Max severity: 9.8 (AST Type Confusion → RCE)
   - Status: **CRITICAL** — requires immediate upgrade to 4.7.9+
   - Action: Code review of all template handling post-fix
   - Affected: Transitive (likely via build/template tools in dev chain)

2. **protobufjs** (platform/orchestrator, portal/Backend)
   - Arbitrary code execution via deserialization
   - CVE GHSA-xq3m-2v4x-88gg, CWE-94
   - Status: **CRITICAL** — affects production in orchestrator
   - Action: Identify parent package, upgrade to >=7.5.5
   - Supply chain: Transitive via gRPC or protocol buffer tools

3. **path-to-regexp** (platform/orchestrator, portal/Backend)
   - Regular expression DoS via route parameters
   - CVE GHSA-37ch-88jc-xwx2, CVSS 7.5
   - Status: **HIGH** — likely transitive via express
   - Action: Upgrade express or routing middleware

### Outdated Packages (Next Sprint)

**Backend (Source/Backend)** — 1 major version behind:
- express: 4.18.2 → 5.2.1 (likely contains security patches)
- pino: 8.17.0 → 10.3.1 (2 major, test carefully)
- uuid: 9.0.0 → 13.0.0 (4 major, but likely safe)

**Frontend (Source/Frontend)** — 1 major version behind:
- react: 18.3.1 → 19.2.5 (recommended by React team)
- react-dom: 18.3.1 → 19.2.5 (paired)
- react-router-dom: 6.26.0 → 7.14.1 (breaking changes)

**Orchestrator (platform/orchestrator)**:
- express: 4.21.0 → 5.2.1 (recent version, less urgent)
- dockerode: 4.0.4 → 4.0.10 (patch, minor)
- multer: 1.4.5-lts.1 → 2.1.1 (low risk)

### Development/Test Dependencies (Moderate Risk)

**vite + vitest ecosystem** (affects Frontend, portal/Frontend):
- vite: 5.4.0 (affected by path traversal in <=6.4.1) → upgrade to latest
- vitest: 2.0.5 (has moderate CVEs in deps) → requires major upgrade to 4.1.4
- esbuild: Transitive, has CORS bypass in dev server (<=0.24.2)
- picomatch: Moderate CVE in portal/Frontend (build tool)
- Status: **Development-only impact**, but recommended for upgrade

### Environment & Audit Tools

- **Package Manager:** npm (6 workspaces)
- **Audit Tool:** `npm audit --json` (works across all workspaces)
- **Outdated Check:** `npm outdated --json` (parsed for version deltas)
- **License Tool:** `npx license-checker --json` (optional if needed)
- **Tools Available:** npm built-in, no Go/Python/Rust detected

### License Compliance Status

✅ **COMPLIANT**
- No GPL/AGPL detected
- All direct dependencies use permissive licenses (MIT, ISC, Apache 2.0)
- No license flags raised

### Dependency Distribution (Health Metrics)

- Total direct dependencies: ~578 (backend-heavy)
- Total transitive: ~2,150+
- Largest workspace: portal/Backend (578 deps)
- Smallest workspace: Source/E2E (5 deps)
- Duplicate packages: None detected (good separation between workspaces)

### Recommendations for Process

1. **Monthly Audit Cadence:** Run dependency audits monthly, flag P1/P2 immediately
2. **Automated Alerts:** Enable GitHub/npm notifications for new CVEs in direct dependencies
3. **Lock File Management:** Consider consolidating workspaces if managing 6+ becomes difficult
4. **Test Coverage:** Always run full test suite after major version upgrades (especially express, react)
5. **Staging Env:** Test orchestrator protobufjs fix in staging before production deployment

### Cross-Team Escalations

- **TheGuardians:** Handlebars template injection (code review) + protobufjs RCE (network risk)
- **TheFixer:** Dependency update PRs once security review completes

### Next Audit Scheduled

_To be filled after team decides on monthly cadence_
