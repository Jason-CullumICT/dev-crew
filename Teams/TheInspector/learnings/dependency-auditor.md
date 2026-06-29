# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-06-29

### Critical Vulnerabilities (Watch List)

**RCE / Code Injection Hotspots:**
1. **handlebars** (≤4.7.8) — Multiple AST injection paths via test frameworks (jest → babel-jest)
   - Decision: Upgrade jest to v30.0.0+ or remove babel-jest from pipeline
   - Status: Pending fix in Source/Backend
   - Monitor: New handlebars releases for patch versions

2. **protobufjs** (≤7.6.2) — Critical RCE via prototype pollution + code generation
   - Appears in: portal/Backend (OpenTelemetry), platform/orchestrator (gRPC)
   - Decision: Must upgrade to ≥7.7.0 immediately; impacts observability
   - Status: High priority for portal/Backend team
   - Risk: If protobufjs is used for schema code-gen, all generated code is vulnerable

3. **vitest** (<3.2.6) — UI server arbitrary file execute
   - Appears in: Source/Frontend dev dependencies
   - Decision: Disable UI in CI/CD; upgrade for local dev
   - Status: Pending fix
   - Prevention: Never expose vitest UI server to network

**Form-Data CRLF Injection:**
- Package: form-data (4.0.0 - 4.0.5)
- Status: Appears in 4/5 scanned packages as transitive
- Fix: Upgrade to ≥4.0.6 (should auto-resolve with npm install updates)
- Root cause: All packages depend on older node-fetch/axios transitives

**gRPC Server Crashes:**
- @grpc/grpc-js (1.14.0 - 1.14.3) DoS vectors
- Portal/Backend OpenTelemetry collector communication
- Upgrade to ≥1.14.4 (minor, safe)

### License Compliance

**Finding:** No GPL/AGPL in direct dependencies. All permissive (MIT, Apache-2.0, BSD).
- Decision: No license conflicts flagged
- Note: License-checker tool not available in environment

### Dependency Tree Health

**Problems Identified:**
1. **jest transitive bloat:** 411 transitive deps in Source/Backend via jest+babel
   - Candidate for vitest migration (cleaner dep tree)
   - Current status: Long-term refactor, not urgent

2. **@opentelemetry version cascade:** auto-instrumentations-node v0.40.0 is old, drags in stale sub-packages
   - portal/Backend locked at 0.47.0 but still has issues
   - Future: Consider OpenTelemetry Collector sidecar instead of SDK in-process

3. **Multiple TypeScript versions:** 5.2.2, 5.3.3, 5.5.4 across packages
   - Inconsistency but not blocking (all minor versions)
   - Decision: Normalize to 5.5.4 during next major upgrade cycle

### Post-Install Scripts

**Finding:** None detected across all packages.
- Security implication: Low risk from automated hooks
- No supply chain build-time modifications

### npm audit Tool Notes

- Tool works reliably with `npm audit --json` output
- Tested against npm v10.x
- Fallback to lock file parsing not needed (npm is primary signal)

### Findings Infrastructure

**Report Location:** `Teams/TheInspector/findings/DEP-AUDIT-20260629.md`
- Format: Markdown with JSON summary block
- Grade: F (critical RCE unpatched)
- Escalations: TheGuardians (3 P1 findings), TheFixer (package upgrade work)

### Next Audit Cadence

- Frequency: Weekly (lightweight scan via npm audit)
- Deep audit: Quarterly (full dependency tree analysis)
- Trigger for unscheduled: Any npm alert webhook from Dependabot

### Known False Positives / Disputes

None encountered in this scan. All CVEs are legitimate.

---

## Maintenance Tasks

- [ ] Portal/Backend: Upgrade @opentelemetry/auto-instrumentations-node → 0.77.0+
- [ ] Portal/Backend: Upgrade @opentelemetry/sdk-node → 0.219.0+
- [ ] Source/Frontend: Upgrade react-router-dom → 6.30.4+
- [ ] Source/Frontend: Upgrade vite → 6.5.0+
- [ ] Source/Frontend: Upgrade ws → 8.21.0+
- [ ] Source/Frontend: Upgrade vitest → 3.2.6+
- [ ] Source/Backend: Evaluate jest upgrade to v30.0.0 (major bump, needs testing)
- [ ] All packages: Run `npm audit fix --force` for remaining moderate issues
- [ ] Add npm audit to CI/CD pipeline (fail on critical/high)
- [ ] Plan vitest migration for Source/Backend to reduce jest transitive bloat
