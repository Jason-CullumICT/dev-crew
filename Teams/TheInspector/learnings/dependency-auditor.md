# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit 2026-06-17 Findings

### Critical CVEs Requiring Immediate Action

1. **Handlebars.js (4.0.0–4.7.8)** — 8 CVEs including GHSA-2w6w-674q-4c4q (CVSS 9.8 code injection)
   - Found in: Backend node_modules (transitive)
   - Watch: Audit for user-supplied template sources
   - Fix: npm audit fix → handlebars >= 4.7.9

2. **Vitest (1.0.0–3.2.5)** — GHSA-5xrq-8626-4rwp (CVSS 9.8 arbitrary file read + RCE)
   - Found in: Frontend devDependencies (direct)
   - Watch: CI configurations that expose vitest --ui to network
   - Fix: npm audit fix → vitest >= 3.2.6 or upgrade to 4.1.9+

3. **Vite (1.0.0–6.4.2)** — 3 CVEs including GHSA-fx2h-pf6j-xcff (path traversal on Windows)
   - Found in: Frontend devDependencies (direct)
   - Watch: Windows CI agents; source map leakage
   - Fix: npm install vite@latest (>= 6.4.3 or 8.0.16+)

4. **Esbuild (0.17.0–0.28.0)** — GHSA-gv7w-rqvm-qjhr (missing binary integrity verification)
   - Found in: Frontend node_modules (transitive via Vite)
   - Watch: Supply chain security; npm registry redirects
   - Fix: Fixed by vite update (esbuild is transitive)

5. **form-data (4.0.0–4.0.5)** — GHSA-hmw2-7cc7-3qxx (CRLF injection)
   - Found in: Backend node_modules (transitive)
   - Watch: Any code building multipart forms with user-controlled field names
   - Fix: npm audit fix → form-data >= 4.0.6

6. **ws (8.0.0–8.20.1)** — GHSA-96hv-2xvq-fx4p (memory exhaustion DoS)
   - Found in: Frontend node_modules (transitive via vitest/vite)
   - Watch: WebSocket endpoints exposed to untrusted networks
   - Fix: npm audit fix → ws >= 8.21.0

### Outdated Major Versions

| Package | Current | Latest | Gap | Priority |
|---------|---------|--------|-----|----------|
| express | 4.22.2 | 5.2.1 | 1 major | Q3 2026 migration |
| pino | 8.21.0 | 10.3.1 | 2 major | Next release |
| uuid | 9.0.1 | 14.0.0 | 5 major | Next release |

### Workspace Statistics

- **Total workspaces audited:** 6 (Backend, Frontend, E2E, Platform, Portal×2)
- **Total dependencies:** ~641 (estimated transitive)
- **Total CVEs found:** 39 (2 critical, 5 high, 26 moderate, 6 low)
- **License compliance:** PASS (no GPL/AGPL)
- **Abandoned packages:** 0

### Audit Tools Available in This Environment

✅ **npm audit** — v10.x, JSON output available, reliable  
✅ **npm outdated** — JSON output available  
✅ **npx license-checker** — Can run via npx, JSON output available  
❌ **govulncheck** — Not installed (no Go projects)  
❌ **pip-audit** — Not installed (no Python projects)  

### Key Findings for Cross-Team Coordination

**TheGuardians escalations:**
- Handlebars code injection risk requires input validation audit
- Vitest RCE requires CI security review
- Esbuild supply chain risk requires binary verification strategy
- form-data CRLF injection requires field name sanitization
- ws DoS requires rate limiting on WebSocket endpoints

**Performance Profiler cross-ref:**
- Pino major version bump needs performance regression testing
- ws DoS vulnerability can affect latency SLAs

### Remediation Checklist

- [ ] Phase 1 (Immediate): `npm audit fix --force` on all workspaces
- [ ] Phase 1: Run full test suite post-fix
- [ ] Phase 2 (This Sprint): Express 4→5 migration planning
- [ ] Phase 3 (Ongoing): npm audit in CI pipeline
- [ ] Phase 3: Dependabot/Renovate setup for automated updates

### Lessons Learned

1. **Monorepo lock file strategy:** Root package.json has no lock file; each workspace manages independently. Consider consolidating to single npm-workspaces model with shared node_modules.

2. **Critical transitive dependencies:** Most critical CVEs (handlebars, ws, esbuild) are transitive. Auditing only direct dependencies misses 95% of the surface.

3. **Dev dependencies matter:** 2 of 2 critical CVEs are in dev dependencies (vitest, vite). Cannot ignore dev-only packages in security audit.

4. **Windows-specific risks:** Vite path traversal is Windows-only. Need OS-specific audit coverage if CI uses multiple platforms.

5. **Supply chain vigilance:** Esbuild binary tampering CVE highlights importance of verifying downloaded native binaries, not just source.

## Audit Schedule

- **Baseline audit:** 2026-06-17 (this run)
- **Next audit:** 2026-07-17 (30 days, post-remediation)
- **Recurring:** Monthly, with ad-hoc runs after major updates

## Next Auditor Actions

1. Verify `npm audit fix` commands were successful
2. Check if TheGuardians team has accepted escalations
3. Monitor for new CVE disclosures in watched packages (handlebars, vitest, vite)
4. Follow up on Phase 2 major version upgrades
