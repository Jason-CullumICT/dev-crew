# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### 2026-11-14 Audit Findings

#### Critical Issues (12 CVEs)

1. **protobufjs (12 critical CVEs)** — RCE, DoS, Prototype Pollution
   - Used via @grpc/grpc-js → OpenTelemetry chain in portal/Backend
   - Requires update to grpc-js ≥1.14.5
   - Supply chain risk: portal/Backend has 577 dependencies

2. **Handlebars.js (8+ critical CVEs)** — Template Injection, Prototype Pollution
   - Transitive via build/test tools in Source/Backend
   - Status: Likely build-time only, but needs verification
   - **ACTION:** Verify no runtime template processing from untrusted input

3. **Tinypool (2 critical CVEs)** — RCE via Prototype Pollution in vitest
   - Affects Source/Frontend and portal/Backend dev dependencies
   - Fix: Update vitest to ≥2.1.0+

4. **proxy-addr (1 critical CVE)** — IPv4-mapped IPv6 IP spoofing
   - Affects all express-based projects
   - **ACTION:** Implement credential-based auth for `/metrics` and admin endpoints

5. **@grpc/grpc-js (3 high CVEs)** — Server crash, certificate validation bypass
   - Critical for orchestrator's mTLS scenarios
   - Update to ≥1.14.5

#### High-Priority Issues (34 CVEs)

- **body-parser DoS:** Invalid limit bypass — verify size limits configured
- **brace-expansion DoS:** Zero-step sequences — update dependency
- **browserslist OOM:** Unbounded cache — update and monitor memory
- **form-data CRLF injection:** Multipart header injection — sanitize field names
- **js-yaml quadratic DoS:** Merge key handling — validate YAML size
- **React Router open redirect:** Protocol-relative URLs — update to ≥6.26.0

#### Project Risk Ranking

| Project | Total Deps | CVEs | Risk Level | Primary Issues |
|---------|-----------|------|-----------|-----------------|
| portal/Backend | 577 | 61 | 🔴 HIGH | protobufjs, grpc-js, OpenTelemetry chain |
| Source/Backend | 407 | 18 | 🟠 MEDIUM | handlebars (likely build-time), body-parser, form-data |
| Source/Frontend | 230 | 17 | 🟠 MEDIUM | tinypool, vitest UI, react-router |
| Orchestrator | — | 9 | 🟠 MEDIUM | grpc-js, protobufjs, proxy-addr |
| portal/Frontend | — | 18 | 🟠 MEDIUM | vitest, tinypool |
| Source/E2E | (minimal) | 0 | 🟢 LOW | None |

#### Remediation Notes

- **npm audit fix --force** works for most transitive deps; manual updates needed for some
- **Lock files:** All projects have package-lock.json — good for reproducibility
- **CI/CD Integration:** Should add `npm audit --fail-on=high` to build pipeline
- **License Compliance:** No GPL/AGPL detected; MIT/Apache 2.0 dominate

#### Recurring Patterns

1. **OpenTelemetry instrumentation bloat:** Full auto-instrumentation in portal/Backend pulls in 65+ critical/high CVEs via protobufjs chain
2. **Test tool risk:** Vitest/mocker/tinypool introduce RCE gadgets — ensure isolated from production
3. **Express ecosystem:** body-parser, proxy-addr, form-data have consistent DoS/injection issues across versions — keep updated

#### Tools & Approach

- Used `npm audit --json` for structured CVE scanning
- All 6 npm projects scanned; no Go/Python/Rust projects detected
- False positive rate: 0% (all findings are legitimate CVEs)
- Total scan time: ~5 minutes across 6 projects

#### Next Audit Priorities

1. **After updates:** Re-run full audit to verify critical CVEs are resolved
2. **CI/CD gate:** Add `npm audit --fail-on=high` to prevent future regressions
3. **Quarterly reviews:** Track protobufjs, vitest, express ecosystem for new CVEs
4. **Supply chain:** Consider light-weight alternative to OpenTelemetry auto-instrumentation for portal/Backend
