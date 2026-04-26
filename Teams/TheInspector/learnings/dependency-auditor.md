# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-04-26

### Critical Findings (Watch List)

**Handlebars** - 8 vulnerabilities (1 critical, multiple high)
- Last seen: Source/Backend
- Pattern: Template engines are high-risk for RCE if processing user input
- Recommendation: Monitor closely; immediate updates required

**protobufjs** - Arbitrary code execution (CVSS 9.8)
- Last seen: platform/orchestrator, portal/Backend (via OpenTelemetry transitive)
- Pattern: Dependency on Google protobuf libraries; always update immediately
- Recommendation: Make this a blocker in CI; no merges with this CVE

### Recurring Version Gaps

**OpenTelemetry SDK** - Largest version gap (0.168 versions behind)
- Last seen: portal/Backend (@opentelemetry/exporter-trace-otlp-http, @opentelemetry/sdk-node at v0.47.0 vs v0.215.0)
- Pattern: OpenTelemetry releases frequently; 6+ months behind indicates lack of maintenance cycle
- Recommendation: Establish quarterly review cadence for observability packages; coordinate with infrastructure team

**Express Ecosystem** - Express 4.x approaching EOL
- Last seen: Across Source/Backend, portal/Backend, platform/orchestrator
- Pattern: Node.js server framework with long release cycles; breaking changes in v5
- Recommendation: Plan migration timeline; consider 2-3 month window for testing

**React** - 1 major version behind (18 vs 19)
- Last seen: Source/Frontend, portal/Frontend (both at 18.3.1 vs 19.2.5)
- Pattern: React majors ship breaking changes; requires full test suite re-validation
- Recommendation: Plan migration for next release cycle; not blocking

### Common Vulnerability Patterns

1. **ReDoS (Regular Expression Denial of Service)**
   - Affected: path-to-regexp, picomatch
   - Impact: High in server/build tools; lower in libraries
   - Prevention: Always review new regex-based packages; use safe parsing libraries

2. **Development Environment Vulnerabilities**
   - Affected: vite, esbuild, vitest chain
   - Pattern: Dev tools often have CORS, path traversal issues that only matter in dev
   - Recommendation: Mark dev-only issues as lower priority unless exploitable in CI/CD

3. **Template/Serialization Engines**
   - Affected: handlebars, postcss (XSS)
   - Pattern: Any package processing untrusted input (templates, CSS, protobuf) is high-risk
   - Recommendation: Critical monitoring; immediate update policy

### Audit Tool Availability

✓ npm audit --json works well; reliable parser
✓ npm outdated --json works for version gaps
✗ npm license-checker not installed; fallback to manual inspection of package.json

### Supply Chain Observations

**Positive Findings:**
- ✓ No post-install scripts detected (low risk for typosquatting/supply chain attacks)
- ✓ All projects use package-lock.json (reproducible builds)

**Concerns:**
- portal/Backend has 397 direct dependencies (unusually high; investigate consolidation)
- Large transitive trees (1800+ total) increase attack surface; recommend quarterly review

### License Compliance

- 4 projects missing license declarations (Source/Backend, Frontend, portal/Backend, Frontend)
- E2E only project with declared license (ISC)
- No GPL/AGPL dependencies detected (positive)
- Recommendation: Add license fields for consistency; document license policy if multi-licensed

### Next Audit Recommendations

1. **Run monthly** - npm ecosystem moves fast; CVEs appear frequently
2. **Automate** - Use Dependabot or Renovate for automated PR creation on patches
3. **Prioritize by location** - Critical infrastructure (orchestrator, portal/Backend) gets weekly spot-checks
4. **Track remediation** - Update findings with "fixed" status after updates; measure time-to-fix
5. **Coordinate with red-teamer** - Flag exploitable CVEs for live exploitation testing

### Packages Requiring Special Attention

| Package | Reason | Cadence |
|---------|--------|---------|
| handlebars | 8 CVEs, 1 critical | Weekly |
| protobufjs | RCE, CVSS 9.8 | Weekly |
| uuid | In multiple projects; buffer issue | Monthly |
| @opentelemetry/* | 6+ months behind; critical infra | Quarterly review + monthly spot-check |
| react, express | Major version decisions | Quarterly planning |
| vite, vitest | Dev tools; frequent patches | As-needed on dev activity |
