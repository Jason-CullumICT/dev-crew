# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Findings Summary (2026-09-05)

**Total CVEs:** 33 (3 critical, 14 high, 12 moderate, 4 low)  
**Projects Audited:** 4 npm projects (Backend, Frontend, E2E, Orchestrator)

### High-Risk Packages (Watch List)

#### Critical Priority
1. **protobufjs** - Multiple critical vulnerabilities in orchestrator via @grpc/grpc-js
   - Arbitrary code execution, prototype pollution, unbounded recursion DoS
   - Action: Update @grpc/grpc-js to >=1.14.4, protobufjs to latest

2. **vitest@2.0.5** (Frontend) - UI server arbitrary file read (CVSS 9.8)
   - Action: Upgrade to >=3.2.6 or 5.0.0; disable UI server in production/CI

3. **handlebars** (Backend transitive) - JavaScript injection via AST type confusion
   - Action: Update to >=4.7.9 or remove if unused

#### High Priority (P2)
- **vite** - Multiple path traversal vulnerabilities (update to >=8.2.2)
- **uuid@9.0.0** - Buffer overflow in v3/v5/v6 functions (update to >=11.1.1)
- **react-router-dom@6.26.0** - Open redirect vulnerabilities (update to >=7.18.3)
- **js-yaml** - Quadratic CPU in merge key chains (update to >=3.15.1)
- **brace-expansion** - DoS via unbounded pattern expansion (update transitive dep)

### Recurring Findings

1. **Transitive Dependency Bloat**
   - Backend: 411 total (102 direct, 309 transitive) — HIGH surface
   - Frontend: 230 total (9 direct, 221 transitive) — HIGH surface
   - Recommendation: Consolidate build tool dependencies, use npm dedupe

2. **Build Tool Dependencies**
   - Many CVEs are transitive via build tools (babel, vite, postcss, webpack)
   - These don't ship to production but affect build security
   - Audit build-only deps separately from runtime deps

3. **License Compliance**
   - ✅ PASS: No GPL/AGPL licenses detected
   - ✅ PASS: All permissive licenses (MIT, Apache, BSD, ISC)
   - No legal risk identified

4. **Supply Chain Safety**
   - ✅ PASS: No post-install scripts found in node_modules
   - ✅ PASS: No obvious abandoned packages (all major deps actively maintained)
   - Risk: High transitive depth means more potential compromise vectors

### Version Update Strategy

#### Immediate (Critical Path)
1. protobufjs/grpc-js updates
2. vitest upgrade in Frontend dev
3. handlebars removal or update

#### Short-term (1-2 sprints)
1. Major version upgrades: uuid, vite, react-router-dom
2. Minor version updates: express, pino, js-yaml
3. Integration testing required for React 18→19

#### Tools & Commands

```bash
# Run comprehensive audit (all projects)
npm audit --workspaces --all

# Update direct deps only
npm install --save-exact <package>@<version>

# Check what would break in major version
npm view <package> versions --json | jq '.[-5:]'

# Deduplicate (reduce transitive count)
npm dedupe

# Force resolution of conflicts
npm ci --force
```

### Audit Environment Notes

- **npm version used:** (as available in environment)
- **audit database:** GitHub Security Advisory (GHSA) + NVD
- **timestamp:** 2026-09-05
- **scope:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator

### Known False Positives / Disputed CVEs

1. **GHSA-2j2x-hqr9-3h42** (@remix-run/router) - Open redirect via `//` paths
   - Severity: Disputed (listed as CVE but CVSS 0)
   - Context: Only matters if app redirects to untrusted URLs
   - Mitigation: Validate redirect targets in application code

2. **react-router-dom CSS-in-JS issues** - Some paths may not apply
   - These are SSR-specific; dev-crew uses client-side React
   - Still recommend update for general security posture

### Recommendations for CI/CD

1. **Add `npm audit` to pre-commit or CI:**
   ```bash
   npm audit --production --audit-level=high
   ```
   - Fails build if high/critical found in prod dependencies

2. **Monthly audits:**
   - Run full audit (prod + dev) monthly
   - Update this learnings file with new watch-list items

3. **Dependency updates policy:**
   - Critical/High: Within 24 hours
   - Moderate: Within 1 week
   - Low: Within 1 month or next feature release

4. **Test coverage for updates:**
   - Run full test suite after any dependency update
   - E2E tests required for major version upgrades
