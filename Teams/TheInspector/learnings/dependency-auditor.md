# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run 1: 2026-11-12 — Initial Audit

### Key Findings

**Critical Issues:**
- **vitest** (Frontend, direct): CVSS 9.8 RCE via UI server file read. URGENT FIX.
- **proxy-addr** (Backend, Orchestrator, transitive): IP spoofing vulnerability (CVSS 9.1). Bypasses trust-based access control. Requires express update.
- **handlebars** (Backend/Frontend): Multiple RCE vectors (CVSS 9.8). Very high risk.
- **protobufjs** (Orchestrator, transitive): RCE via prototype pollution (CVSS 9.8).
- **Portal/Backend**: 61 total vulnerabilities (4 critical, 11 high, 46 moderate). Extremely risky.

**Supply Chain:**
- Source/Backend: 412 transitive deps (high attack surface)
- Source/Frontend: 231 transitive deps
- Portal/Backend: 578 transitive deps (VERY HIGH RISK)
- Source/E2E: Clean (0 vulnerabilities)

**Outdated Packages:**
- express: 4.22.3 → 5.3.0 (+1 major, security patches likely)
- pino: 8.21.0 → 10.4.0 (+2 major, critical logging package)
- uuid: 9.0.1 → 14.0.3 (+5 major)

### Tools Available

- **npm audit --json**: Works reliably across all packages
- **npm outdated --json**: Only returns 3-4 entries; need manual tracking
- **npm ls**: Doesn't work (dependencies not installed); use package-lock.json instead
- **npm license-checker**: Not installed; recommend installing or running with npx

### Recommendations for Next Audit

1. **Automate scanning**: Add npm audit step to CI/CD pipeline
2. **Track Portal/Backend separately**: 61 vulns indicates fundamental dependency bloat. Consider refactoring or isolating.
3. **License check**: Run `npm license-checker` in each package to audit for GPL/AGPL viral licenses
4. **Automation**: Create a script to run `npm audit` across all packages and aggregate results
5. **Policy**: Establish a "max vulnerabilities" threshold for each severity level

### Packages with Recurring Issues

_(To watch for in future audits)_
- **handlebars**: Very old (4.x), multiple RCE CVEs. Consider upgrading to 5.x, but requires template changes.
- **jest**: Has low CVEs but Framework seems outdated. vitest is a better modern replacement (once fixed).
- **protobufjs**: Many DoS and prototype pollution CVEs. If not critical, consider removing or pinning to safe versions.
- **@opentelemetry/***: Portal/Backend's OpenTelemetry dependencies are massive source of moderate vulns. Consider if necessary.

### Cross-Team Escalations Required

- **[TheGuardians]** proxy-addr IP spoofing affects trust-based access control  
- **[TheGuardians]** handlebars RCE if processing untrusted templates  
- **[TheGuardians]** protobufjs RCE if accepting external protobuf messages

### Audit Coverage Notes

- Scanned: 10 package.json files (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend, abac-demo, abac-soc-demo*, etc.)
- Method: npm audit --json + package-lock.json analysis
- Gaps: License compliance (npm license-checker not available), abandoned package detection (requires GitHub API), supply chain depth (only counted top level)

## Learnings

- **Portal/Backend** has 61 vulnerabilities. This is not part of the main Source application per CLAUDE.md, but represents a significant lateral movement risk.
- **npm audit doesn't count transitive deps consistently**. Use `Object.keys(package-lock.json.packages)` for accurate transitive dep counts.
- **Outdated package detection** requires manual comparison because `npm outdated` only works if node_modules is installed.
- **Direct vs transitive classification** from npm audit is accurate and reliable.
- **CVSS scores** are sometimes null in npm database; use severity labels as primary indicator.
