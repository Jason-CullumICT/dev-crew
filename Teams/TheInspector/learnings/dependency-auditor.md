# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-22

### Critical Vulnerabilities Identified
- **Handlebars.js (4.0.0-4.7.8):** JavaScript Injection via AST type confusion (9.8 CVSS). Multiple attack vectors: template injection, prototype pollution, AST tampering. Requires upgrade to ≥4.7.9.
- **Vitest (<3.2.6):** Arbitrary file read + code execution when UI server is running (9.8 CVSS). Affects Frontend workspace directly. Requires upgrade to ≥3.2.6.
- **Protobufjs (<7.5.5):** Arbitrary code execution via unsafe .proto parsing and prototype pollution (9.8 CVSS). Affects Orchestrator via gRPC dependencies. Requires upgrade to ≥7.5.5.

### High-Severity Patterns
- **form-data (4.0.0-4.0.5):** CRLF injection in multipart headers — affects all workspaces. Common transitive dependency.
- **js-yaml / brace-expansion DoS:** Quadratic complexity in YAML merge keys and pattern expansion. Present in Backend.
- **React Router open redirect:** GHSA-2j2x-hqr9-3h42 affects Frontend (version 6.26.0).

### Workspace-Specific Risks
- **Backend (411 deps):** Largest tree. Handlebars critical CVE + js-yaml DoS + brace-expansion DoS. Transitive dependencies include protobufjs (indirectly).
- **Frontend (230 deps):** Vitest direct critical CVE + React Router open redirect + Vite/esbuild vulnerabilities. Dev-heavy tree.
- **Orchestrator (155 deps):** Smallest tree (prod-only). Protobufjs critical CVE + Express/Multer outdated.

### Outdated Major Versions (Watch List)
- **pino (8.17.0):** 2 major versions behind (latest 10.3.1). Likely contains security patches. Priority: HIGH.
- **vite (5.4.0):** 3 major versions behind (latest 8+). Multiple known vulnerabilities. Priority: CRITICAL (tied to Vitest CVE).
- **vitest (2.0.5):** 2 major versions behind (latest 4.1.10). Critical CVE in current version. Priority: CRITICAL.
- **react (18.3.1):** 1 major behind (latest 19.2.8). Not critical but worth upgrading.
- **dockerode (4.0.4):** 1 major behind (latest 5.0.1). Breaking API changes likely.

### Supply Chain Assessment
- Total transitive dependencies: **842** (Backend: 410, Frontend: 280, Orchestrator: 152)
- **Dependency tree risk:** VERY HIGH for Backend/Frontend (>300 transitive each)
- **Post-install scripts:** None detected (good security posture)
- **License issues:** No GPL/AGPL detected in initial scan

### Audit Tool Findings
- **npm audit** works reliably across all workspaces
- **npm outdated** shows missing current versions (local path dependencies)
- **npm audit --json** outputs complete CVE details for programmatic processing
- License-checker not available in environment; manual review needed

### Breaking Changes Expected
- **Vitest 2→4:** Major breaking changes in config/API (needs testing)
- **Vite 5→8:** Build config likely needs updates
- **React Router 6→7:** Some API changes but generally backward-compatible
- **Dockerode 4→5:** API breaking changes; Orchestrator code needs review
- **Multer 1.4→2.2:** Express middleware API may have changed

### Recurring Patterns
1. **Tooling dependencies are most vulnerable:** Vitest, Vite, Handlebars (in build/test chain)
2. **Transitive vulnerabilities compound:** A single direct dependency (vitest) pulls in vulnerable vite, esbuild, @vitest/mocker
3. **DoS vulnerabilities in parsers:** js-yaml, brace-expansion, path-to-regexp all have polynomial/exponential complexity issues
4. **Major version lag is common:** npm ecosystem evolves fast; 2-3 major version gaps are typical across a monorepo

### Recommended Practices
1. **Monthly npm audit runs** as part of CI/CD
2. **Dependabot or Snyk integration** for continuous monitoring (not currently enabled)
3. **Pre-commit hook:** `npm audit --audit-level=moderate` to block commits with medium+ CVEs
4. **Breaking change testing:** Major version upgrades require full regression testing
5. **Documentation:** Track which workspace depends on which critical package (build dependency vs. runtime)

### Next Audit Priorities
- [ ] Track if Handlebars is used in Backend source code (grep for `require('handlebars')` or `import handlebars`)
- [ ] Verify if Protobufjs is actively used in Orchestrator or if it's a legacy dependency
- [ ] Check if Vitest UI is ever exposed to non-localhost in development or CI
- [ ] Assess API compatibility for major version upgrades (Vitest 2→4, Vite 5→8)
- [ ] Evaluate license-checker tool availability or alternative license compliance solutions

### Known False Positives
- (none yet)

### Known Acceptable Risks
- Development-only CVEs in Vitest/Vite are acceptable if UI is never exposed to network
- Transitive dependency vulnerability in test framework is lower priority than runtime dependencies

---

## Audit Methodology

### CVE Detection
1. Run `npm audit --json` in each workspace
2. Parse output for vulnerability severity and CVSS scores
3. Cross-reference isDirect flag to identify transitive vs. direct vulnerabilities
4. Filter by workspace for reporting

### Outdated Detection
1. Run `npm outdated` in each workspace
2. Identify major version gaps (>1 major version behind)
3. Assess risk based on changelog and CVE history

### License Scanning
- Tool: `npx license-checker --json` (when available)
- Manual inspection of `package.json` license fields if tool unavailable
- Flag GPL/AGPL for legal review

### Escalation Criteria
- **TheGuardians:** Any CVE with CVSS ≥8.0 or RCE/code injection risk
- **TheFixer:** Medium-severity bugs, outdated dependencies, breaking changes
- **Self-resolve:** Low-severity DoS, informational CVEs, license compliance

---

_Last updated: 2026-07-22_
