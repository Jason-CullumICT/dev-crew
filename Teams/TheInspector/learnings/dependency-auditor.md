# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-11-18

### Critical Packages Under Watch

**Vitest RCE (GHSA-5xrq-8626-4rwp)**
- Affects: Source/Frontend, portal/Frontend, portal/Backend
- Issue: Arbitrary file read/execution when UI server listening (CVSS 9.8)
- Fix: Upgrade to 5.1.1+ (major version)
- Status: **BLOCKER** for security review

**Protobufjs RCE (GHSA-hprx-6r5c-rxvv)**
- Affects: platform/orchestrator (gRPC usage)
- Issue: Code execution via malformed protobuf messages (CVSS 9.8)
- Fix: Upgrade to 7.6.4+ or >=7.5.5
- Status: **CRITICAL** if gRPC endpoints externally exposed

**proxy-addr IP Spoofing (GHSA-jqcg-44mw-7w3h)**
- Affects: platform/orchestrator (via express)
- Issue: IPv4-mapped IPv6 address bypass of trust rules (CVSS 9.1)
- Fix: Upgrade proxy-addr to 2.0.8+
- Status: **CRITICAL** in proxy/load-balancer scenarios

### Jest Ecosystem Cascading Issues
- Root cause: jest-util + jest-message-util + micromatch vulnerabilities
- Impact: 41 high-severity transitive deps in Source/Backend
- Fix: Upgrade jest to 30.5.2+ (major version bump)
- Note: Requires testing to ensure no breaking changes

### High-Risk Dependencies
- **browserslist**: Unbounded memory growth (OOM risk)
- **ws**: Memory exhaustion DoS via WebSocket fragmentation
- **body-parser**: Compression bypass DoS
- **@grpc/grpc-js**: mTLS certificate validation bypass
- **OpenTelemetry SDK**: Baggage propagation unbounded memory (46 moderate vulns in portal/Backend)

### License Compliance
✅ No GPL/AGPL violations  
✅ All dependencies use compliant licenses (MIT, Apache 2.0, ISC, BSD)

### Supply Chain Risk Assessment
- Highest risk: portal/Frontend (430+ transitive dependencies)
- Lowest risk: Source/E2E (0 vulnerabilities, 4 transitive deps)
- Post-install scripts detected in: vite, esbuild, node-gyp (acceptable, standard tooling)
- No single-maintainer critical packages identified

### Audit Tools Available
```bash
npm audit --json              # Primary tool, all projects have lock files
npm outdated --json           # For version tracking
npm ls {package}              # Dependency tree inspection
```

### Remediation Strategy
1. **Phase 1 (IMMEDIATE):** Fix 3 critical direct dependencies (vitest, protobufjs, proxy-addr)
2. **Phase 2 (2 weeks):** Fix P2 high severity (jest, browserslist, ws, body-parser)
3. **Phase 3 (4 weeks):** Major version upgrades (React 19, TypeScript 6, Vite 6)
4. **Phase 4 (quarterly):** Establish governance (Dependabot, pre-commit hooks, audit policy)

### Pre-commit Hook Recommendation
```bash
# Add to .husky/pre-commit
npm audit --audit-level=moderate  # Fail CI on moderate+ issues
```

### Next Audit Actions
- Monitor vitest/jest ecosystem for 5.x/30.x release stability
- Track OpenTelemetry SDK for bundling improvements (reduce 46 moderate vulns)
- Validate proxy-addr upgrade doesn't affect express compatibility
- Test portal/Frontend React 19 upgrade compatibility

## Learnings

_(Add discoveries here after each run)_
