# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run: 2026-07-13

### Critical Findings
1. **Handlebars RCE** (CVSS 9.8) — transitive via @babel/core
   - AST type confusion allows arbitrary JavaScript execution
   - Affects all projects due to @babel/core in build chain
   - Fix: `npm update @babel/core` → pulls handlebars >=4.7.9
   - Watch: Ensure no user-controlled templates are compiled

2. **Vitest UI RCE** (CVSS 9.8) — direct dependency in dev tools
   - Unprotected dev server allows file read + code execution
   - Only affects dev environment, but CI/CD risk if `--ui` is used
   - Fix: Update vitest to >=3.2.6
   - Watch: Never expose vitest UI port to network

### High-Risk CVEs
- **form-data CRLF injection** — multipart upload header injection
- **@opentelemetry DoS** — Prometheus metrics endpoint crash on malformed request
- **ws memory exhaustion** — WebSocket fragment-bombing attack
- **react-router open redirect** — protocol-relative URL misinterpretation
- **vite dev server CORS bypass** — xss on any site can read dev server

### Tech Debt
- **@opentelemetry packages are 150+ versions behind** — 0.47.0 → 0.220.0
  - Major version migrations with breaking changes
  - Plan quarterly upgrade cycles
  - Current version has 6 high-severity CVEs
  
- **UUID v9.0.0 has buffer bounds bug** — update to >=11.1.1
  
- **Express 4.18.x is 3 versions behind latest** (5.2.1)
  - Patch level is current but major upgrades needed for long-term support
  
- **Pino 8.17.0 (Source/Backend) is 2 major versions behind** (10.3.1)

### Audit Patterns
- npm audit JSON output is reliable; prefer it over manual checks
- Transitive deps dominate vulnerability surface (~650 of 877 total)
- All projects use MIT-licensed dependencies (no GPL risk)
- No abandoned packages detected
- Form-data, handlebars, vitest are high-velocity vulnerability sources

### License Compliance
✅ All primary dependencies are MIT, Apache 2.0, or other permissive licenses
✅ No GPL/AGPL detected
✅ No UNLICENSED packages in direct dependencies

### Recommendations for Next Audit
1. Run `npm audit --audit-level=moderate` before each release
2. Create automation to update dev dependency CVEs weekly
3. Establish @opentelemetry upgrade schedule (quarterly minimum)
4. Monitor UUID library; never use <11.1.1
5. Validate form-data usage in all file upload handlers
