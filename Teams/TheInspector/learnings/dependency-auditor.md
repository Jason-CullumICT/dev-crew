# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Findings Summary (2026-10-17)

### Critical Issues Discovered
- **Tinypool RCE (GHSA-5gmw-xhrv-c9v3):** Frontend vitest 2.1.9 affected; requires upgrade to 5.0.5 (3 major versions)
- **Handlebars.js Injection (3 gadgets):** Transitive via Jest; blocking backend tests
- **proxy-addr IPv4 Spoofing (GHSA-jqcg-44mw-7w3h):** Critical auth bypass if behind proxy

### Major Version Gaps Requiring Attention
- TypeScript 5.9.3 → 7.0.2 (2 major versions; both backend & frontend)
- Vitest 2.1.9 → 5.0.5 (3 major versions; frontend only)
- Vite 5.4.21 → 8.3.4 (3 major versions; frontend only)
- Jest 29.7.0 → 30.5.2 (1 major version; backend only)
- React 18.3.1 → 19.3.1 (1 major version; frontend only)
- Pino 8.21.0 → 10.4.0 (2 major versions; backend only)

### Remediation Notes
- **Backend:** 42 total CVEs; 2 critical (Handlebars, proxy-addr); needs jest→30.5.2 and express→5.3.0
- **Frontend:** 17 total CVEs; 2 critical (Tinypool RCE); needs vitest→5.0.5 and vite→8.3.4
- **E2E:** Clean (0 CVEs); @playwright/test only minor update available
- **License:** All projects ISC or MIT; no GPL/AGPL issues

### Key Findings
1. **Test framework ecosystem blocker:** Jest and Vitest both need major version upgrades; affects all CI/CD pipelines
2. **Development server at risk:** Vite dev server (localhost:5173) vulnerable to CSRF/SSRF when processing untrusted input
3. **Production risk:** proxy-addr IPv4 spoofing is critical if deployed behind cloud proxy/load balancer
4. **Supply chain scale:** ~600+ transitive dependencies; each upgrade carries risk of new breaking changes

### Audit Tools Verified
- ✅ `npm audit --json` works for all projects (after `npm install`)
- ✅ `npm outdated` provides version comparison
- ✅ Manual grep of `npm audit` output for severity filtering
- ⚠️  No license-checker installed; used node require() fallback to verify licenses

### Watch List (Recurring CVEs)
- `jest` ecosystem: Historically has many transitive vulnerabilities (Handlebars, babel, micromatch)
- `vite` ecosystem: Dev server vulnerabilities common (esbuild, postcss)
- `braces` package: Multiple DoS variants; keep eye on glob-related modules

### Next Audit Checklist
- [ ] Re-run `npm audit` after fixes applied to verify all P1/P2 resolved
- [ ] Check for new breaking changes in major version upgrades
- [ ] Monitor @babel/core, postcss, nanoid for repeated issues
- [ ] Verify TypeScript 7.0 compatibility with existing types
- [ ] Confirm Jest 30.5.2 test API compatibility (async/await, matchers)

---

## Learnings by Specialist Role
_(Share cross-team findings below to avoid duplicate work)_

### For TheGuardians (Security Team)
- proxy-addr IPv4 spoofing is **CRITICAL** if backend deployed behind proxy
- Tinypool RCE affects dev/test environments; could compromise CI/CD
- Handlebars.js injection affects test framework; monitor for template-based attacks
- Recommend: Sandboxed dev environment if developers work on untrusted repos

### For TheFixer (Maintenance Team)
- Jest ecosystem requires coordinated update (jest 30.5.2 fixes Handlebars + 14 @jest/* packages)
- Frontend Vite upgrade (5.4.21 → 8.3.4) is **3 major versions**; likely breaking changes in plugin API
- TypeScript upgrade (5.9.3 → 7.0.2) affects both backend and frontend; plan as single epic
- Estimate: 20 hours full remediation (backend + frontend)

### For Performance Profiler
- Vitest 5.0.5 may have performance improvements; benchmark after upgrade
- Vite 8.3.4 has faster HMR; measure build times post-upgrade

---

## Audit Configuration Notes
- Project uses npm only; no Go modules, Python, or Rust detected
- No post-install scripts in direct dependencies (good practice)
- All projects are ISC or MIT licensed (permissive, no copyleft)
- Inspector config at Teams/TheInspector/inspector.config.yml provides baseline security context

