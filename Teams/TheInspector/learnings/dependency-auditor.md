# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-09-02

### Key Findings

1. **Critical Vulnerability: protobufjs RCE**
   - Found in portal/Backend via `@opentelemetry/auto-instrumentations-node@0.40.0`
   - CVE-2024-6249 (CVSS 9.8) — arbitrary code execution
   - Root cause: old OpenTelemetry packages pin vulnerable protobufjs <7.5.5
   - Requires major version upgrade of @opentelemetry stack (0.40 → 0.80+)
   - **Action:** This is P0 if backend handles untrusted gRPC messages

2. **High-Risk Packages (Multiple Projects)**
   - **brace-expansion:** 4 DoS CVEs via glob patterns, affects build tools
   - **browserslist:** 2 memory/crash CVEs, affects vite/babel
   - **path-to-regexp:** ReDoS via route parameters, affects express routing
   - **form-data:** CRLF injection in multipart fields
   - **nanoid:** Infinite loop DoS in generators
   - **@grpc/grpc-js:** 2 crash CVEs from malformed messages

3. **OpenTelemetry Stack Volatility**
   - High version churn: 0.40 → 0.80 → 0.222+
   - Major API rewrites between versions
   - Heavy transitive dependencies (40+ packages)
   - portal/Backend dependency tree is 180+ packages (largest)
   - **Recommendation:** Review whether all instrumentation modules are needed; consider selective instrumentation

4. **Outdated Major Versions**
   - portal/Backend: Multiple OpenTelemetry packages 2+ majors behind
   - Source/Frontend: React/React-Router 1 major behind
   - uuid: 5 majors behind across multiple projects (but API-compatible)
   - **Note:** uuid upgrade is safe (no code changes needed)

5. **Clean Findings**
   - No postinstall scripts detected (good)
   - No GPL/AGPL licenses (MIT, ISC, Apache 2.0 only)
   - Source/E2E has minimal dependencies (clean)

### Watch List for Next Audit

- **OpenTelemetry ecosystem:** Schedule review after next upstream release cycle
- **brace-expansion:** High recurrence of CVEs; monitor for alternatives
- **browserslist:** Part of build pipeline; critical for CI/CD stability
- **React 19 migration:** Breaking changes expected; plan upgrade carefully

### Audit Tools Available

- **npm audit:** Works on all Node projects
- **npm outdated:** Identifies outdated major versions
- Lock file analysis: Can count transitive deps, identify duplicates
- Manual package.json review: For license checking

### Recommendations for Future Audits

1. Add real-time monitoring (Dependabot, Snyk) to catch CVEs immediately
2. Lock file analysis: Detect duplicate major versions of same package
3. Supply chain: Check npm package author activity, download trends
4. License automation: Run `license-checker` as part of CI/CD pipeline
5. Separate production vs dev dependency audits (dev CVEs are lower priority)

### Critical Escalations Made

- **DEP-001 (protobufjs RCE)** → TheGuardians (needs confirmation on gRPC usage)
- **DEP-004 (path-to-regexp ReDoS)** → TheGuardians (needs red-team validation)

---

## Template for Future Audits

When running the next audit, use this checklist:

- [ ] Run `npm audit --json` on all package.json locations
- [ ] Run `npm outdated --json` on projects with major outdated packages
- [ ] Count packages in lock files as proxy for transitive deps
- [ ] Check for postinstall scripts: `grep -r "postinstall" */package.json`
- [ ] Check for GPL/AGPL licenses: `grep -r "GPL\|AGPL" node_modules/*/package.json`
- [ ] Look for abandoned packages (no updates >2 years, deprecated flags)
- [ ] Identify supply chain risks (single maintainers, low downloads)
- [ ] Compare against previous audit to track remediation progress
