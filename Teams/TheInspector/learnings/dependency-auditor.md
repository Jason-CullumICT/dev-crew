# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-11-24

### Critical Packages Under Watch

| Package | Issue | Why It Matters | Fix Strategy |
|---------|-------|----------------|--------------|
| **handlebars** | 11× JavaScript injection via AST confusion | Backend can execute arbitrary JS if templates are user-provided | Upgrade to 4.7.10+; audit template sources |
| **protobufjs** | 12× RCE vectors (code injection, prototype pollution, unbounded recursion) | Orchestrator gRPC deserialization is compromised | Upgrade ASAP; regression test gRPC communication |
| **@grpc/grpc-js** | Server crash + TLS certificate validation bypass (critical!) | Inter-agent communication trust is broken in v1.14.0–1.14.5 | Upgrade to 1.14.5+; verify TLS trust post-upgrade |
| **proxy-addr** | IPv4-mapped IPv6 spoofing (CVSS 9.1) | IP-based access controls can be bypassed in all Express services | Upgrade to 2.0.8+ in Backend, Orchestrator, Portal |
| **body-parser** | DoS via trailing bytes in compressed requests (CVSS 7.5) | Service can crash on crafted request bodies | Upgrade to 1.20.9+ across all projects |
| **tinypool** | Prototype pollution → RCE in test infrastructure | vitest/Frontend tests can be exploited if attacker controls test inputs | Upgrade to 2.5.0+ in Frontend, portal/Frontend |
| **brace-expansion** | 7× DoS vectors (stack exhaustion, OOM, quadratic time) | Build-time DoS during CI/CD | Upgrade to latest |
| **browserslist** | Unbounded memory growth → OOM | Build tools can exhaust memory during CSS/browser compatibility checks | Upgrade to latest |

### Outdated Major Versions

| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| pino (logging) | 8.17.0 | 10.4.0 | **2 major** | Missing security fixes in logger infrastructure |
| uuid | 9.0.1 | 14.0.3 | **5 major** | May miss CSPRNG improvements |
| express | 4.22.1 | 5.3.0 | 1 major | Test v5 compatibility; likely non-breaking |
| react | 18.3.1 | 19.3.1 | 1 major | Automatic batching & hydration changes; test UI |
| react-router-dom | 6.30.6 | 7.18.6 | 1 major | Fixes DEP-015 open redirect; test routing |

### Highest Risk Projects

1. **portal/Backend** (577 total deps, 61 CVEs)
   - Significantly larger dependency footprint than other services
   - Should be audited for:
     - Unused/unnecessary dependencies (consider treeshaking)
     - Whether portal can be downscoped or moved to separate codebase
   - Recommendation: Next deep-dive audit

2. **platform/orchestrator** (gRPC infrastructure)
   - CRITICAL: protobufjs + @grpc/grpc-js combo has RCE + TLS trust issues
   - Highest impact if compromised (affects all agents)
   - Prioritize P1 fixes here

3. **Source/Backend** (handlebars, proxy-addr)
   - handlebars: audit if templates are user-provided or hardcoded
   - proxy-addr: affects any IP-based security decisions

### Environment & Tools

- **npm audit:** Works well; native Node.js tool for CVE scanning
- **npm outdated:** Works; shows version gaps
- **npm ls / package-lock.json:** Use for transitive dependency analysis
- **license-checker:** Not tested in this audit; recommend adding to CI pipeline
- **Govulncheck / pip-audit:** No Go or Python projects detected in main codebase

### Best Practices Established

1. **Focus on critical + direct dependencies first** — P1/P2 findings are more urgent than transitive
2. **TLS/cryptography packages get highest priority** (proxy-addr, @grpc/grpc-js)
3. **Build-tool vulnerabilities can be managed in dev cycle** (vitest, postcss, esbuild not production)
4. **Outdated major versions require compatibility testing** before bulk updates
5. **Handlebars/template engines** warrant special scrutiny — depends heavily on template source (user vs. hardcoded)

### Cross-Team Routing

- **Security concerns** (RCE, TLS bypass, injection) → TheGuardians
- **Routine updates** (bug fixes, feature updates) → TheFixer
- **Major version migrations** (pino 8→10, express 4→5) → TheFixer + testing coordination

## Learnings Template for Future Runs

For each audit run, capture:
- [ ] New critical CVEs discovered
- [ ] Packages that repeatedly appear across audits (watch list)
- [ ] Success stories (packages that were updated and caused no regressions)
- [ ] Failed updates (packages where newer versions broke compatibility)
- [ ] Cross-team decisions made (e.g., "we decided NOT to upgrade react yet because...")

