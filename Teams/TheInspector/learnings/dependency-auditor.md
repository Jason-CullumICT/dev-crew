# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-07-21

### Critical Findings
1. **Vitest RCE (P1)** — GHSA-5xrq-8626-4rwp — When Vitest UI server is listening, arbitrary files can be read and executed. Update to vitest@^3.2.6+
2. **Handlebars Code Injection (P1)** — Multiple CVEs (GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r) — JavaScript injection via AST type confusion. Transitive dependency; requires chain analysis to fix.

### High-Priority CVEs Identified
- UUID buffer overflow (DEP-004) — CWE-787, requires v11.1.1+
- Vite path traversal (DEP-003) — Windows FS bypass, requires major version update
- React Router open redirect (DEP-006) — CWE-601, phishing vector
- Form-data CRLF injection (DEP-005) — Header injection vulnerability
- JS-YAML DoS (DEP-007) — Quadratic complexity on merge keys
- WebSocket memory exhaustion (DEP-008) — Fragment-based DoS

### Supply Chain Metrics
- **Backend:** 411 total dependencies (102 prod, 310 dev)
- **Frontend:** 230 total dependencies (9 prod, 222 dev)
- **Project Total:** 641 transitive dependencies
- **Risk Surface:** 641 potential compromise vectors
- **Postinstall Scripts:** CLEAN (no malicious scripts found)

### Audit Tools & Environment
- ✅ `npm audit --json` works reliably for CVE data
- ✅ `npm outdated --json` works for version tracking
- ✅ `npm ls` available but slow for large trees
- ❌ npm doesn't provide: maintainer counts, download stats, community metrics, direct fix suggestions for transitive deps
- **Recommendation:** Install `license-checker` globally for future audits

### Recurring Vulnerabilities (Watch List)
1. **Handlebars** — Multiple critical CVEs; consider alternative template engines
2. **Vite** — Platform-specific issues; plan major version updates carefully
3. **Vitest** — Recent RCE; critical for test environment security
4. **UUID** — Buffer management issues; requires frequent updates

### License Compliance
- Not yet audited (npm license-checker not installed)
- Direct dependencies appear to be MIT/Apache 2.0
- Next audit should run: `npx license-checker --json 2>/dev/null`

### Remediation Status (P1/P2 CVEs)
**Status:** NOT_STARTED
**Target:** All fixes should be applied within 48 hours
**Estimated Effort:** 8-12 hours (5 P1/P2 fixes + testing + regression verification)

### Recommended Updates (Priority Order)
1. `vitest@^3.2.6` — Fixes RCE
2. `uuid@^11.1.1` — Fixes buffer overflow
3. `react-router-dom@^6.30.4` — Fixes open redirect
4. `vite@latest` (8.x) — Fixes path traversal
5. Identify & update handlebars root dependency

### False Positives / Low Risk
- Express/qs DoS (DEP-009) — Only affects versions 4.21.0-4.22.1; current 4.18.2 not affected
- Body-parser limit bypass — Low impact if limits set explicitly in middleware

### Team Coordination
- **Escalation needed:** TheGuardians (6 security findings)
- **Quality tickets:** TheFixer (6 outdated version findings)
- **License review:** Needed for compliance verification

### Next Audit Schedule
- **Immediate:** After P1/P2 fixes (verify all updates applied correctly)
- **Regular:** Every 30 days (or per-sprint)
- **Trigger:** On new dependency additions, security advisories

### Project-Specific Notes
- dev-crew is AI-first development platform with agent orchestration
- Backend: Node.js/Express, minimal prod deps (intentional design)
- Frontend: React + Vite (modern stack)
- No Python/Go dependencies detected
- No hardcoded secrets found in package.json scripts
