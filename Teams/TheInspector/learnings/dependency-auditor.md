# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## 2026-10-07 First Audit Run

### Critical Vulnerability Patterns

1. **Protobufjs Ecosystem Risk (CRITICAL)**
   - Used transitively by @grpc/grpc-js and @opentelemetry packages
   - Multiple chained vulnerabilities: RCE → prototype pollution → DoS
   - Affects platform/orchestrator (gRPC) and portal/Backend (observability)
   - **Action:** Monitor all protobufjs-dependent packages monthly

2. **Template Injection Chain in Handlebars (CRITICAL)**
   - 8 distinct JavaScript injection vectors in <=4.7.8
   - Found in Source/Backend transitive dependencies
   - Exploitable if user-controlled template compilation occurs
   - **Action:** Audit for handlebars.compile() on untrusted input

3. **Glob/Pattern Library DoS (HIGH)**
   - brace-expansion: 7 CVEs (DoS via unbounded recursion/expansion)
   - braces: Stack exhaustion via nested patterns
   - Affects build-time (glob patterns in jest, ts-jest, postcss)
   - **Action:** Keep glob ecosystem updated; fuzz test patterns

4. **gRPC Server Instability (HIGH)**
   - @grpc/grpc-js <1.14.5 crashes on malformed messages
   - TLS certificate validation bypass in some configs
   - **Action:** Require >=1.14.5 in all gRPC consumers

### Package Age Issues

- **React:** 18.3.1 → 19.3.0 (1 major version) — plan upgrade for next quarter
- **UUID:** 9.0.0 → 14.0.2 (5 major versions) — urgently out of date
- **Pino:** 8.17.0 → 10.4.0 (2 major versions) — logging improvements available
- **OpenTelemetry:** 0.40.3 → 0.81.0+ (40+ patch versions) — significant lag in portal/Backend
- **@types/node:** 20.11.0 → 22+ (2+ versions) — IDE completions incomplete

### Dependency Tree Insights

- **portal/Backend:** 578 transitive packages (highest risk surface)
  - Contains 61 vulnerabilities (4 critical, 12 high)
  - Primary risk drivers: OpenTelemetry, gRPC, Express
  - Recommendation: Schedule quarterly deep-dive of top 50 packages

- **Source/Backend:** 412 packages, 42 vulnerabilities
  - Major risk: handlebars chain via jest dependencies
  - Moderate risk: js-yaml via ts-jest

- **Source/Frontend:** 231 packages, 17 vulnerabilities (lowest risk)

### Tools Available

- ✓ `npm audit --json` — comprehensive CVE scanning
- ✓ `npm outdated --json` — version tracking
- ✓ `npm ls --all` — dependency tree inspection
- ✗ `license-checker` — not installed (recommend CI integration)
- ✗ `govulncheck` — no Go modules detected
- ✗ `pip-audit` — no Python dependencies detected

### Audit Methodology

1. Run `npm audit --json` on each workspace → extract vulnerabilities
2. Cross-reference with npm registry for version metadata
3. Categorize by CVSS score and direct/transitive impact
4. Map to source code paths where practical
5. Recommend fixes with estimated timeline

### Policy Recommendations

1. **CI/CD Integration:**
   ```bash
   npm audit --audit-level=moderate  # Catch P2+ vulnerabilities
   ```

2. **Monthly Audit Schedule:**
   - Run full audit on 1st of each month
   - Prioritize critical/high CVEs discovered in the past 30 days

3. **Dependency Maintenance:**
   - Limit transitive dependencies in portal/Backend
   - Require security review for >1 major version updates
   - Track React 19 migration path actively

4. **Escalation Triggers:**
   - Any CRITICAL CVE with CVSS ≥9.0 → escalate to TheGuardians immediately
   - RCE/auth bypass → notify security team within 24h
   - Moderate CVEs affecting >100 packages → assess for supply chain risk

### Known Limitations

- License scanning requires `license-checker` installation (recommend: CI tool)
- No analysis of first-party code for vulnerability exploitation (belongs to TheGuardians)
- Abandoned package detection relies on GitHub commit history (manual lookup required)
- CVSS scores and CVE IDs are npm registry data; not independently verified

### Next Audit Focus Areas

1. Monitor protobufjs and gRPC security advisories (high-touch area)
2. Evaluate React 19 migration feasibility
3. Audit portal/Backend for unnecessary transitive dependencies
4. Implement license-checker in CI/CD
5. Assess if nanoid is used for security purposes (DEP-009)
