# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run 2026-07-04

#### Critical CVE Chains Identified
1. **handlebars injection chain (P1):** jest → ts-jest → @babel → handlebars (4.0-4.7.8)
   - Fix: Upgrade jest to ^30.0.0 (includes patched handlebars)
   - Watch: ts-jest version compatibility when upgrading jest
   
2. **vitest UI RCE (P1):** vitest@2.0.5 exposes critical file read/execute vulnerability
   - Fix: Upgrade Frontend vitest to >=4.1.9 (major version jump)
   - Impact: Any vitest@2.x in production CI or dev server is critical risk
   - Action: Establish vitest@4+ as minimum requirement for all new projects

3. **protobufjs arbitrary code execution (P1):** Orchestrator → gRPC → protobufjs chain
   - Status: Requires audit of actual gRPC usage (unclear if protobufjs is loaded)
   - Fix: Upgrade to protobufjs@^8.0.0 or eliminate dependency
   - Watch: googleapis and @grpc packages for cascade of CVEs

#### Transitive Dependency Insights
- **Backend (412 packages):** Test tooling (jest/ts-jest/babel) pulls in handlebars; dev deps are major CVE surface
- **Frontend (231 packages):** Vite/vitest pull in esbuild/postcss/ws; watch build tool chain for vulnerabilities
- **Orchestrator (156 packages):** Lean prod footprint; gRPC chain is the main CVE vector
- **E2E (5 packages):** Only Playwright; very clean supply chain

#### Outdated Package Priorities
1. **uuid:** 5 major versions behind (9.x → 14.x); has recurring buffer-bounds CVEs; use LTS versions
2. **express:** 1 major behind; each minor in 4.x patches qs/path-to-regexp/body-parser DoS
3. **react/react-router-dom:** 1 major behind; track for open redirect + new features
4. **pino:** 2 majors behind; performance improvements in 8.21.0+ (upgrade to at least 8.21.0)

#### Audit Tools Availability
- ✅ npm audit: Works; JSON output reliable
- ✅ npm outdated: Works; JSON output reliable
- ⚠️ license-checker: Not installed by default; fallback to package.json parsing
- ✅ npm ls: Works; can trace transitive deps (slow on large trees)

#### CVE Assessment Framework
- **P1 (Critical):** CVSS 9.0+, RCE or full auth bypass in direct deps
- **P2 (High):** CVSS 7.0-8.9, code injection or DoS in direct deps OR critical in transitive
- **P3 (Moderate):** CVSS 4.0-6.9, information disclosure or low-impact DoS
- **P4 (Low):** CVSS <4.0, local-only or requires specific attack context

#### License Compliance
- ✅ No AGPL/GPL detected in this codebase (MIT/ISC/Apache-2.0 dominant)
- Action: Add explicit "license" field to Backend/Frontend package.json for clarity
- Track: Watch for new GPL-family deps in transitive chains (unlikely in npm ecosystem)

#### Supply Chain Risk Indicators
- ✅ No deprecated npm packages detected
- ✅ All major deps (express, react, pino, uuid) have active maintainers
- ⚠️ Handlebars (4.7.8) is old; monitor for fixes in jest/ts-jest upgrade path
- ⚠️ Protobufjs has ~12 CVEs; consider native gRPC impl or strict input validation

#### Next Audit Priorities
1. After Phase 1 remediation: Re-run npm audit to verify cves_critical = 0
2. Monitor Frontend vitest@4+ upgrade for breaking changes (Vitest core API may shift)
3. Check if Orchestrator actually uses protobufjs (indirect via @grpc chain); if not used, can remove
4. Establish upgrade cadence: React/Express annually, uuid/pino semi-annually
5. Track: New CVEs in form-data, qs, brace-expansion (tend to have patches quickly)
