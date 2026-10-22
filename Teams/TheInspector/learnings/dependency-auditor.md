# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-22

### Key Findings

1. **Critical Auth Bypass Risk**: `proxy-addr` in express dependency chain (CVSS 9.1) — enables IPv4-mapped IPv6 spoofing. Affects Backend immediately.

2. **Build Tool Dominates Attack Surface**: 
   - Jest (Backend): 50+ transitive dependencies, multiple HIGH vulns
   - Vite (Frontend): 80+ transitive deps
   - Tailwind (Portal): 250+ transitive deps
   - Runtime deps are lean in comparison

3. **Repeated Pattern: braces + micromatch**:
   - Stack exhaustion ReDoS via deeply nested patterns
   - Affects Portal Frontend (tailwindcss) and potentially Backend (jest)
   - CVSS 7.5 (HIGH)

4. **Memory Leak in browserslist**: Unbounded cache growth → OOM on long-running processes (CVSS 7.5)

5. **React Router Open Redirect**: `@remix-run/router` protocol-relative URL vuln (GHSA-2j2x-hqr9-3h42)

6. **Major Version Gaps**:
   - pino: 2+ versions behind (v8 out of support)
   - express: 1 major version gap
   - React: 1 major version gap across projects
   - uuid: 5+ versions behind (low priority)

### Package Managers Detected

- **npm**: ✓ (10 projects found)
- **Go modules**: ✗
- **Python**: ✗
- **Rust**: ✗

### Audit Tools Status

- ✓ `npm audit --json` works (requires valid node_modules)
- ⚠️ `npm outdated --json` works (requires node_modules)
- ⚠️ `npm ls --json` works but needs installed deps
- ✗ `license-checker` not available (would require npm install in CI)
- ✗ npm registry audit endpoint currently experiencing 400 errors (retiring legacy endpoint)

### Transitive Dependency Analysis

| Project | Direct | Estimated Transitive | Risk Level |
|---------|--------|----------------------|------------|
| Backend | 4 | 150 | Medium (test tools) |
| Frontend | 3 | 200 | Medium (build tools) |
| E2E | 4 | 50 | LOW ✓ |
| Orchestrator | 3 | 50 | LOW ✓ |
| Portal Frontend | 3 | 250 | HIGH |

### CVE Severity Distribution

- **CRITICAL (1)**: proxy-addr (Backend)
- **HIGH (9)**: braces, browserslist, jest ecosystem, gRPC
- **MODERATE (6)**: qs, OpenTelemetry issues, React Router
- **LOW (3)**: Babel, gRPC info leakage, baseline-browser-mapping

### Learnings for Next Audit

1. **npm audit endpoint issues**: The bulk advisory endpoint is now preferred; legacy `/security/audits/quick` is retiring
2. **Install requirement**: Can't get reliable audit data without running `npm install` first; lock files alone are insufficient for full vulnerability scanning
3. **Transitive vulnerabilities**: Build-time dependencies (jest, vite, tailwindcss) have much larger transitive trees than runtime
4. **Post-install hooks**: No risky post-install scripts detected in any package.json
5. **Duplicate packages**: React 18.x across projects is consistent; no problematic duplicate major versions found
6. **License compliance**: All major packages are MIT or Apache-2.0; recommend adding license-checker to CI for full compliance automation

### Watch List (Recurring Issues)

- **braces + micromatch**: Pattern seen across multiple projects; needs monitoring for future vulns
- **jest ecosystem**: Large transitive tree; multiple vulns; consider upgrade strategy
- **pino v8 EOL**: Monitor deprecation timeline
- **Express ecosystem**: Multiple middleware vulns (proxy-addr, qs, body-parser); stay current

### Recommendations for Pipeline

1. Add `npm audit --audit-level=moderate` to CI before merge
2. Implement Dependabot or Snyk for continuous dependency scanning
3. Create separate PR for major version upgrades (breaking changes testing needed)
4. Auto-run license-checker in CI after npm install

## Learnings

_(discoveries added above per audit run)_
