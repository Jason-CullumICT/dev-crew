# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-04

### Critical Findings (P1 - Immediate Action Required)

1. **Handlebars.js RCE Chain** (8 CVEs)
   - Package: handlebars@4.0.0-4.7.8
   - Affected: Source/Backend (direct dependency)
   - Issue: Multiple JavaScript injection vectors via AST confusion, prototype pollution
   - Status: Fix available (npm install handlebars@4.7.9+)
   - Watch: This is a commonly-used package; similar vulnerabilities may recur

2. **protobufjs Arbitrary Code Execution**
   - Package: protobufjs@<=7.6.4
   - Affected: portal/Backend, platform/orchestrator (via @opentelemetry chain)
   - Issue: RCE in protocol buffer deserialization
   - Status: Requires breaking change upgrade (major version)
   - Watch: OpenTelemetry ecosystem has multiple cascading vulns; monitor upstream

3. **vitest Testing Framework**
   - Packages: vitest + dependencies
   - Affected: Source/Frontend, portal/Backend, portal/Frontend
   - Issue: Multiple vulnerabilities in test framework
   - Status: Requires major version upgrade to 5.0.3+
   - Watch: Testing frameworks are dev-only but can impact CI/CD pipeline

### High-Priority Findings (P2 - Escalate to Security)

4. **gRPC-JS Server Crashes** (3 CVEs + 1 info leak)
   - Package: @grpc/grpc-js@1.14.0-1.14.4
   - Issue: Malformed requests crash server, cert validation bypass
   - CVSS Scores: 7.5, 7.5, 7.4 (High severity)
   - Watch: OpenTelemetry uses this transitively; patch before tracing enabled in prod

5. **Jest Ecosystem Cascading CVEs** (30+ affected packages)
   - Root Cause: braces + micromatch vulnerabilities
   - Issue: Stack exhaustion DoS via glob patterns
   - Fix: Requires jest@30.5.2+ (breaking change)
   - Note: Cascading vulns are common in npm; test carefully after major upgrades

6. **Browserslist Memory Exhaustion** (2 CVEs)
   - Issue: Unbounded cache growth (OOM), crash on malformed stats
   - Affects: Build processes in 3 packages
   - Watch: Browser compatibility tool used widely; likely in many projects

7. **form-data CRLF Injection** (HIGH)
   - Issue: Unescaped field names enable header injection
   - Affects: 3 packages (HTTP client requests)
   - Fix: form-data@4.0.6+

8. **js-yaml Quadratic DoS** (4 variants)
   - Issue: Merge key parsing has O(n²) complexity
   - Watch: YAML parsing is common in config files; check if backend parses untrusted YAML

### Supply Chain Observations

**High Dependency Complexity:**
- portal/Backend: 578 transitive dependencies (1:26 ratio) — CRITICAL risk surface
- Total project: 1,799 transitive dependencies
- Recommendation: Dependency audit + deduplication needed

**Outdated Major Versions:**
- React: 18.x → 19.x (1 major behind)
- Vite: 5.x → 8.x (2-3 majors behind)
- TypeScript: 5.x → 7.x (1-2 majors behind)
- vitest: 2.x → 5.x (2+ majors behind)
- Note: Large gaps indicate slower update cadence; may miss security patches

**No License Compliance Issues:**
- MIT-heavy (90%), Apache-2.0 (5%), ISC (3%)
- No GPL/AGPL detected
- Status: COMPLIANT ✓

**No Abandoned Packages:**
- All major dependencies actively maintained
- Status: OK ✓

### Tools & Techniques Used

- **npm audit --json**: Full CVE scanning
- **npm outdated --json**: Version gap detection
- **Package-lock.json analysis**: Dependency tree inspection
- Manual verification of critical CVEs via GHSA advisories

### Recommendations for Next Audit

1. **Automate in CI/CD** - npm audit should fail builds on P1/P2
2. **Separate dev/prod audits** - Use `npm audit --production` to focus on runtime risk
3. **Plan breaking changes** - jest, vitest, react upgrades need careful testing
4. **Monitor OpenTelemetry** - Track upstream releases; multiple cascading vulns detected
5. **Supply chain hardening**:
   - Consider Software Bill of Materials (SBOM) generation
   - Set up Dependabot or Renovate for automated PRs
   - Define approved dependency list + max transitive depth policy

### Known Packages to Watch

| Package | Known Issues | Recommendation |
|---------|--------------|-----------------|
| handlebars | RCE chain (8 CVEs) | Evaluate replacement (consider template-only engines) |
| jest | Cascading via braces | Plan v30.5.2+ upgrade with full test suite run |
| @opentelemetry/* | Multiple vulns + cascading | Track upstream; enable tracing carefully |
| js-yaml | Quadratic DoS | Consider safe-yaml alternative or limit to local config |
| postcss | XSS + path traversal | Upgrade to latest; review build config |

### Learnings

- **Cascading vulnerabilities are a pattern**: Vulnerabilities in low-level packages (braces, micromatch) propagate to 30+ dependent packages. Updating root cause packages requires major version bumps.
- **OpenTelemetry has high risk surface**: Auto-instrumentation brings in many transitive dependencies; tracing should be enabled selectively in production.
- **Breaking changes are frequent**: Many P1/P2 fixes require major version upgrades (jest, react, vitest). Team should plan breaking change testing cycles.
- **npm audit limitations**: JSON output sometimes missing specific CVE IDs; recommend cross-checking with GHSA advisories.

---

## Previous Learnings

_(none — first run completed 2026-10-04)_
