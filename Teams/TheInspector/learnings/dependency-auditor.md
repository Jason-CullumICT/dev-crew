# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Run: 2026-11-23

**Critical Findings:**
- **Handlebars** (Backend): 11 CVEs including RCE via AST type confusion (CVSS 9.8)
  - Used as transitive dependency through dev/build tools
  - Multiple bypasses of previous fixes (CVE-2026-33937 → CVE-2026-34507)
  - Watch list: Handlebars is known for high CVE churn; monitor closely
  
- **proxy-addr** (Backend): IPv4-mapped IPv6 spoofing (critical)
  - Express middleware for client IP parsing
  - Affects any IP-based access control, rate limiting, or attribution
  - Root cause: Transitive from Express; upgrade Express or pin proxy-addr directly
  
- **Vitest + @vitest/mocker** (Frontend): Code injection in test harness
  - Test environment can be escaped via unauthenticated mock registration
  - Affects both developer workstations and CI/CD pipelines
  - Fix: Upgrade to Vitest 5.1.1+ (may have breaking changes)

**Package Outdatedness:**
- **React Router 6.x**: Multiple known open redirect vulnerabilities
  - Migration to 7.x required; check for breaking changes
  - Affects: Link component, useNavigate hook
  
- **Pino 8→10**: 2 major versions behind; likely has critical logging fixes
  - Recommend upgrade priority in Backend
  
- **Express 4→5**: 1 major version gap; check compatibility before upgrade
  - Security updates more frequent in 4.22+

**Supply Chain Size:**
- Backend: 411 transitive (high complexity)
- Frontend: 230 transitive (medium complexity)
- Recommendation: Flag >500 transitive as supply chain risk in future audits

**Automated Check Status:**
- npm audit: ✅ Available and working (exit code 1 when vulns found)
- npm outdated: ✅ Available
- license-checker: ⚠️ Not pre-installed; manual installation needed
- govulncheck: N/A (no Go modules detected)

**Notable Patterns:**
1. **Shared transitive deps**: browserslist, form-data, @babel/core appear in both Backend & Frontend
2. **Build tool vulnerabilities**: handlebars, vitest, esbuild all in devDependencies but affect prod security
3. **No post-install scripts**: Low supply chain risk on this dimension
4. **Caret ranges used**: Package.json uses ^version (allow minor/patch auto-updates) — increases exposure to new CVEs

**Team Coordination:**
- Backend team needs to handle Express ecosystem fixes (body-parser, proxy-addr, qs)
- Frontend team needs to handle React Router migration planning
- Both teams need Babel/browserslist updates (coordinate timing)

**Future Improvements:**
- Set up GitHub Dependabot alerts if not already active
- Implement automated dependency audits in CI/CD
- Schedule quarterly reviews of top 50 transitive dependencies
- Create a "vendored critical deps" policy for packages with high CVE churn (handlebars, brace-expansion)
