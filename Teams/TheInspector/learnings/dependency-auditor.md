# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-09-04

### Critical Findings (P1)
- **protobufjs RCE (GHSA-xq3m-2v4x-88gg):** In platform/orchestrator via @grpc/grpc-js. Multiple code injection vectors. CVSS 9.8. Requires immediate upgrade to >=7.5.5.
- **handlebars JavaScript Injection (GHSA-3mfm-83xf-c92r):** In Source/Backend (transitive). Type confusion in template processing. Requires upgrade to latest.
- **Frontend Critical CVE:** 1 critical CVE in Source/Frontend package-lock.json. Audit timed out - requires manual investigation.

### High-Severity Patterns (P2)
- **Build Tool DoS Vulnerabilities:** brace-expansion and browserslist have multiple DoS CVEs affecting Frontend builds. These are indirect deps via vite/webpack stack.
- **gRPC Crash Vulns:** @grpc/grpc-js >=1.14.0 <1.14.4 can be crashed via malformed requests. Orchestrator affected.
- **React Router Open Redirect:** @remix-run/router in react-router-dom has CWE-601 (open redirect). Affects all Frontend projects.

### Transitive Dependency Surface Area
- **Highest Risk:** Source/Backend (412 transitive, 12x multiplier on 13 direct)
- **Source/Frontend:** 231 transitive (77x multiplier on 3 direct) - high build toolchain complexity
- **Lowest Risk:** Source/E2E (5 transitive, only 2 direct) - good practice to follow
- **Orchestrator:** 156 transitive (52x multiplier on 3 direct)

### Audit Challenges
- `npm audit` commands timeout frequently on large projects (>150 transitive deps)
- Full audit of portal/Backend and portal/Frontend timed out - retry with longer timeout needed
- jq parsing of vulnerabilities can be slow with large audit outputs

### Recommended Audit Tools
- ✅ `npm audit --json` works well for <150 transitive dependencies
- ⚠️ For larger audits, consider `npm audit --dry-run` or parsing lock files directly
- 📊 Recommended: Run audits in CI/CD pipeline for consistent timeout management
- 🔄 Transitive dep counting: `jq '.packages | keys | length'` on package-lock.json is reliable

### Licensing Status
- ✅ All direct dependencies use permissive licenses (MIT, Apache 2.0, ISC, BSD)
- ✅ No GPL/AGPL viral licensing issues
- ✅ No unknown/UNLICENSED packages found

### Packages to Watch
1. **protobufjs**: Multiple code injection CVEs, always upgrade promptly
2. **brace-expansion**: Recurring DoS issues, keep updated
3. **browserslist**: Memory leak vulnerability, upgrade regularly
4. **uuid**: Buffer handling issues, upgrade to >=11.1.1
5. **qs**: Multiple parsing DoS vectors, keep updated

### Outdated Packages (Not Critical)
- React: 18.3.1 → 19.2.8 (1 major behind, ~15 months old)
- React-Router: 6.26.0-6.22.0 → 7.18.3 (1 major behind, 3-7 months old)
- Note: React 19 upgrade should be planned for next sprint, requires thorough testing

### Next Audit Focus
- ⏳ Complete audit of portal/Backend and portal/Frontend
- 🔍 Identify root cause of Frontend critical CVE (timed out during extraction)
- 📋 Verify handlebars usage in Source/Backend and options for removal
- 🔄 Plan staged React 18→19 migration
- ✅ Set up continuous dependency scanning in CI/CD
