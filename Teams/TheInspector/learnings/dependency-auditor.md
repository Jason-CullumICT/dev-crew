# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-05-05

### Critical Vulnerabilities Found

1. **handlebars JavaScript Injection** (GHSA-2w6w-674q-4c4q, CVSS 9.8)
   - Location: Source/Backend (transitive via jest)
   - Status: REQUIRES IMMEDIATE FIX
   - Remedy: Update jest/ts-jest to latest (remove handlebars dependency)
   - Note: Handlebars is a test dependency only; low production risk but blocks CI

2. **protobufjs Arbitrary Code Execution** (GHSA-xq3m-2v4x-88gg, CVSS 9.8)
   - Locations: platform/orchestrator, portal/Backend (transitive via OpenTelemetry)
   - Status: P1 - RCE in orchestration infrastructure
   - Remedy: Update @opentelemetry/exporter-trace-otlp-http, @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node
   - Escalated: TheGuardians

### High-Severity Vulnerabilities

3. **path-to-regexp ReDoS** (GHSA-37ch-88jc-xwx2, CVSS 7.5)
   - Locations: platform/orchestrator, portal/Backend (transitive via express)
   - Issue: Regular expression denial of service via multiple route parameters
   - Remedy: Update express to latest (should pull patched path-to-regexp >= 0.1.13)
   - Risk: DoS on HTTP routing

4. **picomatch ReDoS** (GHSA-c2c7-rcm5-vvqj, CVSS 7.5)
   - Location: portal/Frontend
   - Issue: ReDoS via extglob quantifiers
   - Remedy: Update picomatch to 2.3.2+ or 4.0.4+
   - Risk: Build-time DoS when globbing untrusted patterns

### Patterns & Watch List

**OpenTelemetry Ecosystem Risk:**
- protobufjs is a transitive dependency via OpenTelemetry packages
- This is a recurring high-risk chain; monitor protobufjs >= 7.5.5 requirement
- Recommendation: Pin @opentelemetry/* to latest compatible versions; set up dependabot

**Template Injection Risks:**
- handlebars (jest plugin) is vulnerable to multiple code injection attacks
- Monitor all template engines (handlebars, lodash template, etc.)
- Ensure templates are generated only from trusted sources

**Regex DoS (ReDoS) Patterns:**
- path-to-regexp, picomatch, brace-expansion all have ReDoS issues
- These affect routing and glob matching — common in web frameworks
- Recommendation: Test route patterns and glob patterns with pathological input

### Dependency Health Summary

**Clean Projects:**
- Source/E2E: 0 vulnerabilities (1 direct dep, 5 transitive)

**Problem Projects:**
- Source/Backend: 1 CRITICAL (handlebars)
- platform/orchestrator: 1 CRITICAL (protobufjs) + 1 HIGH (path-to-regexp)
- portal/Backend: 1 CRITICAL (protobufjs) + 1 HIGH (path-to-regexp) — LARGEST tree (578 transitive)
- portal/Frontend: 1 HIGH (picomatch)

**Largest Dependency Tree:**
- portal/Backend: 578 transitive dependencies (supply chain surface area)
- Recommendation: Consider dependency audit tools (SBOM, cyclonedx) for vendor risk

### Audit Tools Available in Environment

- `npm audit --json` — Works for all npm projects
- `npm outdated --json` — Shows outdated packages
- `npm ls {package}` — Shows dependency chain (empty if not installed)
- No pip-audit, govulncheck, or cargo-audit installations detected

### License Compliance

✅ No GPL/AGPL viral licenses detected  
✅ No unlicensed packages detected  
✅ All packages have standard OSS licenses (MIT, Apache-2.0, ISC, etc.)

### Remediation Effort Estimate

- P1 fixes: 2-4 hours (3 npm update commands + verification)
- P2 fixes: 1-2 hours (ReDoS patches)
- P3 fixes: 1 hour (dev dependencies)
- Total: 4-7 hours for full remediation

### Next Steps

1. **Immediate** (this week):
   - [ ] Update Source/Backend jest/ts-jest
   - [ ] Update platform/orchestrator @opentelemetry/* and express
   - [ ] Update portal/Backend @opentelemetry/* and express
   - [ ] Verify protobufjs is >= 7.5.5
   - [ ] Run full `npm audit` suite post-update

2. **This sprint:**
   - [ ] Update Source/Frontend vite, postcss
   - [ ] Update portal/Frontend picomatch, vite, postcss

3. **Going forward:**
   - [ ] Set up dependabot or snyk for continuous monitoring
   - [ ] Add `npm audit` to CI/CD pre-commit hook
   - [ ] Review OpenTelemetry dependency management strategy
