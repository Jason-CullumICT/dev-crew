# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### First Audit Run (2026-11-27)

**Key Discoveries:**

1. **Critical CVE Patterns in npm Ecosystem**
   - proxy-addr: IP spoofing via IPv4-mapped IPv6 (CVSS 9.4) — affects Express middleware trust chains
   - protobufjs: RCE via bytes field deserialization — impacts gRPC communication layer
   - vitest mocker: Multiple RCE vectors in test framework — blocks CI/CD pipeline security
   - handlebars: AST type confusion injection — template engine vulnerability

2. **Transitive Dependency Risk**
   - Backend has 412 transitive dependencies (5353-line lock file) — high surface area
   - Frontend has 231 transitive dependencies but includes 2 CRITICAL CVEs in test tooling
   - E2E project is excellent model: 1 direct dep, 5 transitive, 0 CVEs
   - Orchestrator: 156 transitive deps but 2 CRITICAL in core (protobufjs, grpc-js)

3. **Build-Chain Vulnerabilities**
   - vite, vitest, postcss, source-map-js all have CVEs affecting build output
   - brace-expansion affects glob-based build patterns
   - browserslist causes OOM during CSS generation
   - These require CI/CD pipeline hardening, not just runtime fixes

4. **Obsolete Packages Identified**
   - uuid@9.0.0 is 5 major versions behind (14.0.3) — has CVE history
   - pino@8.17.0 is 2 versions behind (10.4.0) — logging layer outdated
   - express@4.18.2 (Backend) is 1 minor version behind latest 4.x LTS
   - vitest@2.0.5 should be audited for v4 migration (fixes mocker issues)

5. **Licensing Compliance**
   - No GPL/AGPL dependencies detected — good compliance posture
   - All major packages have clear license declarations
   - No "UNLICENSED" packages in direct dependencies

6. **Tools Available in This Environment**
   - npm audit: Yes, works for JSON output and severity classification
   - npm outdated: Yes, identifies version gaps
   - npm ls: Limited (errors on missing deps), but lock file parsing works
   - license-checker: Not tested, prefer jq parsing of lock files
   - govulncheck, pip-audit: Not available (Go/Python projects not found)

7. **Recommended Audit Workflow**
   - Run `npm audit --json` for complete CVE enumeration
   - Parse lock files with jq for direct vs. transitive analysis
   - Cross-reference against known CVE databases (GitHub Advisory)
   - Check for major version outdates (> 1 major behind = P3)
   - Document findings per severity tier (P1-P4)

8. **Watch List - Recurring Issues**
   - proxy-addr: Check on every audit (affects load balancer integrations)
   - brace-expansion: Regularly DoS'd; keep patched
   - browserslist: Common OOM vector; monitor for updates
   - vitest: Security-sensitive test framework; track releases closely
   - uuid: Consider pinning to latest major version (currently v14)

### Next Steps for Team
- Implement `npm audit --json` checks in CI pipeline (fail on critical/high)
- Add 2-week follow-up audit to verify fixes applied
- Document compatibility notes for major version upgrades (express v5, vitest v4, pino v10)
- Review Handlebars template input sources (DEP-002)
- Assess protobufjs usage in orchestrator (DEP-005)
