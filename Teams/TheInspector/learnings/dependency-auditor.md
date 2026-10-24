# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run 2026-10-24: Health Audit

#### Critical CVEs Identified (P1 — Immediate Action Required)
1. **proxy-addr (GHSA-jqcg-44mw-7w3h)** — IP spoofing via IPv4-mapped IPv6 trust subnet
   - Impacts: Source/Backend, platform/orchestrator
   - CVSS: 9.0 (Critical)
   - Watch list: This package is widely used for IP-based ACLs. Monitor closely.

2. **handlebars (GHSA-3mfm-83xf-c92r)** — JavaScript injection via AST type confusion
   - Impacts: Source/Backend
   - CVSS: 8.3 (High, elevated to Critical for RCE)
   - Watch list: Template injection vectors. Audit all template usage.

3. **tinypool (GHSA-5gmw-xhrv-c9v3)** — Prototype pollution → RCE via worker options
   - Impacts: Source/Frontend
   - CVSS: 9.3 (Critical)
   - Watch list: Check all worker initialization paths.

4. **protobufjs (multiple)** — Arbitrary code execution via malformed messages
   - Impacts: platform/orchestrator
   - CVSS: 9.8 (Critical)
   - Watch list: Deserialize only trusted data; add input validation.

#### Recurring Vulnerabilities (Pattern Recognition)
- **DoS via unbounded operations** (5 instances): browserslist, nanoid, source-map-js, js-yaml, brace-expansion
  - Pattern: Operations without resource limits or cycles without exit conditions
  - Mitigation: Use timeouts, bounded input, memory limits in relevant contexts

- **File read / path traversal** (3 instances): @babel/core, vite, @vitest/mocker
  - Pattern: Source map and file handling without sufficient path validation
  - Mitigation: Audit file I/O; use sandboxing for untrusted input processing

- **High-severity DoS** (7 instances): body-parser, @grpc/grpc-js, path-to-regexp, browserslist, nanoid, source-map-js, brace-expansion
  - Root cause: Missing input validation or resource exhaustion protections
  - Action: Prioritize all DoS vulns in this release cycle

#### Version Gap Analysis
- **Major version gaps > 2**: uuid (9 → 14, gap of 5), pino (8 → 10, gap of 2)
  - Risk: Likely missing security patches accumulated across majors
  - Action: Treat 2+ major version gaps as P2 (not P3)

- **Major version gaps = 1**: express, react, react-dom, react-router-dom
  - Risk: Moderate; still receiving maintenance updates
  - Action: Plan upgrades in next feature release (breaking changes)

#### License Findings
- **UNLICENSED local packages** (workflow-engine-backend@1.0.0): Normal for internal workspaces
  - Decision: This is intentional; no action needed (document in project README)
  - Note: No GPL/AGPL violations detected

#### Supply Chain Observations
- **Dependency explosion**: 3000+ transitive dependencies across 12 npm workspaces
  - Prod vs. dev: 264 prod, 532 dev, = 796 direct + 2200+ transitive
  - Risk level: Medium (large attack surface, but npm lock files provide reproducibility)
  - Recommendation: Consider dependency audit in CI/CD pipeline

- **Version fragmentation**: Multiple major versions of express, react, router across workspaces
  - Risk: Inconsistent behavior, patches applied unevenly
  - Action: Use npm workspaces `overrides` field to pin critical deps

#### Tools & Methods
- **Tool availability**: npm audit ✅, npm outdated ✅, license-checker ✅
- **Fallback strategy**: All three tools worked; no need for manual CVE database lookups
- **Timing**: Full scan (12 workspaces) completed in <30 seconds

#### Next Audit Recommendations
1. Run audits in CI/CD on every PR (not just scheduled releases)
2. Set up automated alerts for new CVEs via GitHub Dependabot
3. Prioritize P1/P2 updates before release
4. Track uuid/pino upgrades as post-release activities (lower risk, but significant changes)
5. Document "known safe" versions of frequently-audited packages (avoid re-discovering the same vulns)
