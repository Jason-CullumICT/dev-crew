# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-11-11

### High-Risk Packages (Watch List)

1. **Handlebars.js** — 11 critical CVEs detected
   - Multiple code injection vectors (CVSS: 9.8)
   - Affects Source/Backend (transitive)
   - Requires immediate update to 4.7.9+

2. **Vitest** — Direct dev dependency with critical file-read vulnerability
   - All projects using vitest: Source/Frontend, Portal/Backend, Portal/Frontend
   - Consider upgrading to latest stable immediately
   - Dev-only tool but affects CI/CD security posture

3. **Tinypool** — Prototype pollution → RCE (transitive from vitest)
   - Fix blocked on vitest update

4. **protobufjs** — 13 critical CVEs
   - Portal/Backend, Orchestrator affected
   - Code injection via `.proto` schema manipulation
   - Requires latest version

5. **Vite** — Path traversal vulnerabilities in dev server
   - Source/Frontend, Portal/Frontend affected
   - Windows environments at elevated risk
   - Update to 5.5.0+ or latest 4.x

6. **PostCSS** — Source map path traversal
   - Portal/Frontend affected
   - Update to 8.4.x+

### Architecture Patterns Observed

- **Portal/Backend** has highest dependency complexity (650+ transitive deps, 61 CVEs)
  - Consider breaking into smaller services
  - Implement stricter dependency management

- **Source/Backend** and **Source/Frontend** are relatively lean
  - Direct dependencies only (4-3 packages each)
  - But transitive chains still bring in 120-250 packages

- **No GPL/AGPL licenses detected** — codebase can remain proprietary
- **All licenses are permissive (MIT, Apache 2.0)**

### Audit Tools Available in Environment

- ✅ `npm audit --json` (standard npm, all projects)
- ✅ `npm outdated --json` (all projects)
- ❌ `license-checker` (not pre-installed; can be added via `npm install -g`)
- ❌ `govulncheck` (Go only, not applicable)
- ❌ `pip-audit` (Python only, not applicable)

### Policy Recommendations

1. **Development Dependency Isolation**
   - Vitest, Vite, PostCSS are dev-only; exclude from production builds
   - Use `--omit=dev` in production builds to reduce attack surface

2. **Supply Chain Security**
   - Implement `npm ci --ignore-scripts` for builds
   - Enable GitHub Dependabot for auto-PR generation
   - Quarterly deep audits for Portal/Backend (highest risk)

3. **Credential Management**
   - Mask `db.user` attribute in OpenTelemetry spans
   - Review trace retention policies (DBA usernames leaked)

4. **Handlebars Usage**
   - If still used: update immediately and re-audit
   - Consider replacing with safer templating (e.g., Nunjucks if trusted input only)

### Next Steps

- [ ] Create tickets for all P1 findings in bug tracker
- [ ] Schedule emergency update cycle for critical packages
- [ ] Review handlebars usage in Source/Backend rendering pipeline
- [ ] Update CLAUDE.md with npm audit policy
- [ ] Configure GitHub branch protection to require zero critical CVEs
