# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-13

### Critical Vulnerabilities Discovered
- **Handlebars.js** (>=4.0.0 <=4.7.8): JavaScript injection via AST type confusion (CVSS 9.8)
- **Protobufjs** (<=7.5.5): Arbitrary code execution via descriptor loading (CVSS 9.8) — affects orchestrator/portal
- **Vitest** (<3.2.6): File read/code execution when UI enabled (CVSS 9.8) — affects dev tooling

### Key Observations
1. **portal/Backend has the highest risk** — 18 vulnerabilities including 2 critical, 577 transitive dependencies
2. **Source/E2E is clean** — 0 vulnerabilities (likely minimal dependencies)
3. **Template injection vector** — handlebars must be checked for user-supplied input processing
4. **gRPC surface area** — platform/orchestrator and portal/Backend use grpc-js with known DoS vulnerabilities

### Recommendations for Future Audits
1. Implement automated dependency scanning in CI/CD to catch new CVEs early
2. Flag packages with >2 years of inactivity for replacement evaluation
3. Monitor protobufjs and vitest releases closely — both have history of security issues
4. Consider package.json constraints to prevent accidental major version upgrades

### Tools Available in Environment
- ✅ npm audit (built-in)
- ✅ npm outdated (built-in)
- ❌ npm-check-updates (not installed — use `npm outdated` instead)
- ❌ snyk (not installed — static audit only)
- ❌ license-checker (not installed — manual review required)

### Watch List (Recurring Issues)
- **handlebars** — Multiple AST/prototype pollution CVEs in 4.x line. Consider templating alternatives.
- **protobufjs** — 10+ CVEs found in this audit. Evaluate protobuf-es or native protobuf support.
- **vitest** — Security audit feature (UI server) is dangerous. Disable in CI/CD configs.

### Licenses: All Clear
No GPL/AGPL violations detected. All major dependencies use MIT, Apache-2.0, or ISC licenses.

## Escalations to TheGuardians
- DEP-001: Handlebars template injection
- DEP-002: Protobufjs deserialization RCE  
- DEP-003: Vitest dev tool exposure

---

_Next audit recommended: After critical patches applied (estimated 1-2 weeks)_
