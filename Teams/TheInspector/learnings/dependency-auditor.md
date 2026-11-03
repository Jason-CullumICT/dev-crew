# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## First Audit Run (2026-11-03)

### Key Findings
- **75 total vulnerabilities** across 6 npm projects
- **6 critical CVEs** requiring immediate action:
  - handlebars: Multiple JavaScript injection vectors (11 CVE variants)
  - proxy-addr: IPv4-mapped IPv6 spoofing (5 projects affected)
  - protobufjs: Arbitrary code execution in message generation
  - tinypool: Prototype pollution → RCE in worker pools
  
### Common Vulnerability Patterns
1. **Prototype Pollution Gadgets:** deepmerge, tinypool, traversal issues → RCE
2. **ReDoS (Regex DoS):** brace-expansion, minimatch, picomatch, js-yaml
3. **Transitive Dependencies:** Single vulnerable package affects 5+ projects
   - `proxy-addr` (via express) → in 5 projects
   - `body-parser` (via express) → in 3 projects
   - `form-data` → in 4 projects
4. **Build Tool Chain Risk:** jest, babel, vitest dependencies have interdependencies with old versions

### Transitive Dependency Watch List
- **proxy-addr:** Always upgrade in all express-based projects (critical auth bypass)
- **body-parser:** Express middleware, standard DoS vector
- **browserslist:** Used in every build tool, memory exhaustion risk
- **@babel/core:** Affects build-time security (file read via source map)
- **vitest → esbuild → @vitest/mocker:** Frontend dev server has multiple CSRF/injection vectors

### Version Gap Analysis
- **uuid:** 3 major versions behind (9 → 14) — security fix in 11.x
- **pino:** 2 major versions behind (8 → 10)
- **react, react-dom:** 1 major behind (18 → 19) — low risk, good to upgrade
- **express:** 1 major behind (4 → 5) — breaking API change across all projects
- **dockerode:** 1 major behind (4 → 5) — Docker API compatibility concern
- **multer:** 1 major behind (1 → 2) — file upload handling changes

### npm audit Tool Behavior
- `npm audit --json` outputs to stderr on error, requires 2>/dev/null redirect
- Exit code 1 even with fixable vulnerabilities
- `npm audit fix --force` required for major version breaks (jest, vitest, etc.)
- Dual npm workspaces need individual audits per directory

### Audit Execution Notes
- **Clean projects:** Source/E2E (0 vulnerabilities)
- **Highest risk:** Source/Backend (32 CVEs), Source/Frontend (17 CVEs)
- **Build infrastructure risk:** platform/orchestrator has protobufjs critical
- **Portal ecosystem:** Has OpenTelemetry version conflicts across multiple packages

### License Compliance Status
- No GPL/AGPL packages detected in sample projects ✓
- All dependencies use standard permissive licenses (MIT, Apache, BSD)
- No deprecated packages detected in direct dependencies

### Audit Scheduling
- Run `npm audit` weekly in CI/CD
- Cross-project vulnerabilities (proxy-addr, form-data) need coordinated fixes
- Major version upgrades (express 4→5, react 18→19) require separate PRs per project
- Vitest/Jest ecosystem upgrades are coupled—breaking change requires full test suite review

## Escalation Triggers

When to escalate to TheGuardians:
- ✓ Code execution CVEs (handlebars, protobufjs, tinypool)
- ✓ Auth bypass / IP spoofing (proxy-addr)
- ✓ Information disclosure (source-map-js, esbuild dev server)
- ✓ Request smuggling / CRLF injection (form-data)
- ✓ Dev server security (esbuild CSRF, vitest mocker injection)

## Next Audit Targets
- [ ] Check for deprecated npm packages in registry
- [ ] Analyze supply chain risk (single maintainers, recent ownership transfers)
- [ ] Check post-install scripts in all dependencies
- [ ] Validate license compliance with full dependency tree
- [ ] Set up automated SCA (Software Composition Analysis) in CI

## Known Tool Limitations
- `npm audit` doesn't check for abandoned packages (need github API)
- `npm outdated` doesn't identify license changes between versions
- Manual review needed for: deprecated flag, single maintainer risk, repo archived status
