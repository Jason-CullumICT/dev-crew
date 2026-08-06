# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-08-06

#### Critical Findings
1. **Vitest @3.2.5 CVE-2024-5xrq-8626-4rwp** — UI server arbitrary file read/execution
   - Found in: Source/Frontend (dev dependency chain)
   - Fix: Upgrade to vitest@^4.1.10 (major version bump)
   - Risk: If UI server exposed on network, code execution possible
   - Status: Requires immediate fix

2. **@stdlib numeric code injection** — transitive via vitest chain
   - Fix: Same as Vitest upgrade
   - Status: Resolved by Vitest major version upgrade

#### High-Priority Patterns
- **Brace-expansion DoS vulnerabilities** (4 distinct CVEs)
  - Pattern: Dependency used by glob, minimatch, and other path-matching libs
  - Fix: npm update transitive dependencies
  - Watch list: Check quarterly for new brace-expansion CVEs

- **Form-data CRLF injection** (affects Express file handling)
  - Pattern: Both Backend and Frontend have old form-data
  - Fix: npm install form-data@^4.0.6 in all workspaces
  - Applies to: Any multipart upload endpoints

- **Handlebars (4.x) injection vulnerabilities** (4 CVEs)
  - Pattern: Template engine with code injection risks
  - Watch: If handlebars is unused, recommend removal
  - Status: Likely transitive from testing/build tools

- **js-yaml DoS** (quadratic complexity on merge keys)
  - Pattern: YAML parsing vulnerability
  - Watch: Only critical if user-supplied YAML is parsed

#### Moderate Findings
- **@babel/core file read via sourceMappingURL** — LOW severity
  - Status: Present in both Frontend and Backend chains
  - Fix: Regular @babel/core updates

- **uuid buffer bounds overflow** — direct Backend dependency
  - Current: ^9.0.1, Latest: ^14.0.1
  - Risk: Buffer overflow in UUID generation (CWE-787)
  - Fix: Requires major version upgrade and testing

- **postcss XSS + information disclosure** (2 CVEs)
  - Pattern: CSS preprocessor with source map handling
  - Risk: sourceMappingURL disclosure (CWE-22)
  - Fix: postcss@^8.5.10

- **vite path traversal** (3 distinct CVEs)
  - Current: ~5.4.0, Latest: 8.2.0 (major bump)
  - Issues:
    - fs.deny bypass on Windows (CVSS 7.5)
    - Path traversal in .map handling (CVSS moderate)
    - NTLMv2 hash disclosure on Windows (CVSS moderate)
  - Watch: Major version upgrades are risky; test thoroughly

- **@remix-run/router open redirect** (via react-router)
  - Pattern: Protocol-relative URL parsing (CWE-601)
  - Fix: react-router-dom@^7.0.0

#### Outdated Dependencies (Non-CVE)
- React: 18.3.1 → 19.2.8 (1 major behind)
- react-router-dom: 6.30.4 → 7.18.2 (1 major behind)
- express: 4.22.2 → 5.2.1 (1 major behind, still supported)
- pino: 8.21.0 → 10.3.1 (2 majors behind)

#### Workspace Health
- **Backend:** 9 CVEs (1 critical, 3 high) — prioritize Phase 2
- **Frontend:** 12 CVEs (1 critical, 4 high) — prioritize Phase 2
- **E2E:** 0 CVEs (clean)

#### Audit Tools Available
- ✅ npm audit (v10+, JSON output)
- ✅ npm outdated (JSON output)
- ❌ license-checker (install from npm)
- ❌ govulncheck (Go only, not in this project)
- ❌ pip-audit (Python only, not in this project)

#### License Compliance
- All direct dependencies: permissive (MIT, Apache-2.0, ISC)
- No GPL/AGPL viral license risk
- Both workspaces marked UNLICENSED (private projects)

#### CI/CD Recommendations
1. Add `npm audit --audit-level=moderate` to CI gate (fail on moderate+)
2. Run `npm outdated` quarterly for deprecation tracking
3. Vitest UI server: disable in CI or bind to localhost only
4. Lock files: ensure `npm ci` used in CI, not `npm install`
5. Major version upgrades: batch and test together (not one-per-commit)

#### Recurring Watch List
- **brace-expansion**: Multi-CVE DoS vector (check quarterly)
- **handlebars**: High injection risk (remove if unused)
- **js-yaml**: DoS via malformed YAML (alert if user upload feature added)
- **vitest**: Had critical vuln @3.2.5 (upgrade/test after each release)
- **vite**: Large attack surface in dev server (test fs.deny restrictions)
- **form-data**: Multipart injection (check quarterly)
- **postcss**: Source map disclosure (separate CSS from user input)

#### Next Audit Recommended
**Date:** 2026-09-06 (30 days)
**Priority:** After Phase 1 & Phase 2 fixes applied
**Focus:** Verify no new HIGH/CRITICAL CVEs introduced by upgrades
