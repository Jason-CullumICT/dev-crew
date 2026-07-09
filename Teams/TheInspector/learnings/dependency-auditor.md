# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-09

### Key Findings

**Critical Vulnerabilities Identified:**
1. **Vitest UI Server (CVE-5xrq-8626-4rwp)** — Arbitrary file read/execute when UI is listening (CVSS 9.8)
   - Current: vitest@2.0.5
   - Fix: Upgrade to ^3.2.6 or 4.x
   - Root cause: Version is well behind stable release
   
2. **Handlebars.js (Multiple CVEs)** — JavaScript injection via AST type confusion (CVSS 9.8)
   - Affected versions: >=4.0.0 <=4.7.8
   - Root dependency unclear; appears to be transitive from test/build tool chain
   - Requires investigation into npm_modules tree to identify direct parent

**High-Severity Vulnerabilities:**
- form-data CRLF injection (CVE-GHSA-hmw2-7cc7-3qxx)
- Vite path traversal & fs.deny bypass (Windows)
- react-router open redirect (6.7.0-6.30.3)
- ws memory exhaustion DoS

**Outdated Packages (>1 Major Version):**
- Backend: pino (2 versions behind), uuid (5 versions behind), express (1 version behind, breaking changes)
- Frontend: react/react-dom (1 version available), react-router-dom (1 version available + has CVE)

### Environment Characteristics

- **Project Type:** JavaScript/TypeScript (npm)
- **Dependency Scale:** ~400 transitive dependencies (large surface area, typical for Node.js)
- **Supply Chain Risk:** Medium
  - ✓ No post-install scripts detected
  - ✓ Lock files present (package-lock.json)
  - ⚠️ Large transitive count suggests potential unnecessary dependencies
  - ⚠️ Handlebars in chain with unclear origin

### Audit Tool Availability

- ✓ npm audit (works, JSON output)
- ✓ npm outdated (works, JSON output)
- ✓ npm ls (works, JSON output)
- npm license-checker not present, but package.json license fields are readable

### Remediation Strategy

**Immediate (This Week):**
- Vitest: Update to ^3.2.6+ (critical)
- form-data: Update to ^4.0.6+ (high)
- Handlebars: Investigate + patch via npm audit fix

**Short-term (This Sprint):**
- Vite: Update to ^6.4.3+ (high)
- react-router-dom: Update to ^6.30.4+ (CVE)

**Medium-term (Next Sprint):**
- Plan pino upgrade (8→10, major version bump)
- Plan express upgrade (4→5 or stay in 4.22.x, major breaking changes)

### Prior Decision Log

_(none yet)_

### Watch List (Recurring Issues)

**High-velocity dependencies (frequent updates):**
- Vitest (had critical UI vulnerability in recent releases)
- Vite (multiple path traversal + fs bypass issues)
- Handlebars (multiple injection vectors; if in use, needs constant monitoring)

**Policy Recommendations:**
1. Enable `npm audit` in CI/CD pipeline (fail on moderate+)
2. Quarterly security patch updates
3. Annual major version upgrades (planned, not reactive)
4. Investigate and document root causes for all transitive vulnerabilities
5. Consider dependency auditing tool (e.g., Snyk, WhiteSource) for continuous monitoring
