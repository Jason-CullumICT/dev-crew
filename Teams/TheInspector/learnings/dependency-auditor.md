# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-20

### Critical Packages & Known Issues (Watch List)

**Handlebars.js (Template Engine)**
- CRITICAL: JavaScript injection via AST type confusion (CVSS 9.8)
- Affected: All versions 4.0.0-4.7.8
- CVE: GHSA-2w6w-674q-4c4q
- Status: Appears as transitive dependency in Source/Backend and Source/Frontend (via dev dependencies)
- Action: Deep npm update required with `--depth=999` flag
- Risk: RCE in any system that compiles user-supplied templates

**Vitest (Test Framework)**
- CRITICAL: Arbitrary file read/execution via UI server (CVSS 9.8)
- Affected: Multiple versions (check per project)
- CVE: GHSA-5xrq-8626-4rwp
- Status: Dev dependency in platform/orchestrator, portal/Backend, portal/Frontend
- Action: Update and NEVER expose Vitest UI server in production
- Risk: Complete system compromise if dev server runs in prod

**Pino (Logging Library)**
- WARNING: 2 major versions behind (8.17.0 → 10.3.1)
- Status: Source/Backend critical infrastructure dependency
- Action: Schedule major version upgrade (requires testing)
- Risk: Missing security patches in logging layer

### Vulnerability Landscape (2026-08-20)

- **Total CVEs found:** 99 across 6 npm projects
- **Critical:** 6 (Handlebars ×2 projects, Vitest ×3 projects, +1 other in portal/Backend)
- **High:** 26 (form-data CRLF, brace-expansion DoS, router open redirect, esbuild CORS bypass, nanoid infinite loop)
- **Moderate:** 64 (build tool chain issues, transitive dependencies)
- **Low:** 3

### Projects Status

| Project | Vulnerabilities | Critical | Status |
|---------|-----------------|----------|--------|
| Source/Backend | 9 | 1 (Handlebars) | Moderate Risk |
| Source/Frontend | 13 | 1 (Handlebars) | Moderate Risk |
| Source/E2E | 0 | 0 | ✅ CLEAN |
| platform/orchestrator | 9 | 1 (Vitest) | High Risk |
| portal/Backend | 55 | 2 (Vitest + other) | **CRITICAL RISK** |
| portal/Frontend | 13 | 1 (Vitest) | High Risk |

### Outdated Major Versions (P3 Issues)

**Backend Stack:**
- pino: 8.x → 10.x (2 major versions, likely patches)
- express: 4.18.x → 5.x (1 major version available)
- uuid: 9.x → 14.x (5 major versions)

**Frontend Stack:**
- react: 18.x → 19.x (1 major version)
- react-dom: 18.x → 19.x (sync with React)
- react-router-dom: 6.26.x → 7.18.x (1 major, includes security fix)

### Supply Chain Observations

✅ **Positive Findings:**
- No post-install scripts found (good security practice)
- No GPL/AGPL license conflicts
- No completely abandoned packages
- No suspicious dependency transfers

⚠️ **Items to Monitor:**
- Handlebars has history of template injection bugs (pattern of vulnerability)
- Vitest dev server exposure is architectural risk
- React ecosystem has tight coupling (18→19 migration must be coordinated)
- Portal projects have 4-5x more dependencies than Source (larger attack surface)

### Audit Tools Available

- `npm audit --json` - Works reliably across all projects
- `npm outdated --json` - Works reliably for version gap detection  
- `npx license-checker --json` - Limited output, but available
- `npm ls <package>` - Can trace dependency chains
- No Go, Python, or Rust package managers detected in project

### Remediation Strategy Notes

1. **Handlebars:** Must use `--depth=999` flag to update transitive dependency in devDependencies
2. **Vitest:** Check for local `vitest --ui` usage in developers' scripts; disable in CI/production
3. **Portal Complexity:** 55 vulnerabilities suggest portal may have different package set than Source - consider separate maintenance plan
4. **Test Framework Upgrade:** Vitest update should be coordinated to avoid test infrastructure breakage

### For Next Audit (2026-09-20)

- [ ] Verify Handlebars update resolved all 6 related CVEs
- [ ] Verify Vitest update to all 3 projects + UI server disabled in prod
- [ ] Check if major version upgrades (React, pino, express) have been executed
- [ ] Audit portal/Backend specifically (highest risk: 55 vulnerabilities)
- [ ] Check for any new vulnerabilities in monitoring
- [ ] Verify no post-install scripts were added

## Key Metrics Tracked

| Metric | Baseline (2026-08-20) | Target | Notes |
|--------|----------------------|--------|-------|
| Critical CVEs | 6 | 0 | Immediate fix required |
| High CVEs | 26 | <5 | Address in this sprint |
| Outdated Major Versions | 11 | <3 | Phase into quarterly updates |
| Projects with 0 Vulns | 1/6 | 6/6 | Long-term goal |
| Clean Audit Rate | 17% | 100% | Target next quarter |
