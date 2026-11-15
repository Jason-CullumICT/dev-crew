# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## First Audit Run — 2026-11-15

### Critical Packages to Track

**Watch List (CVE Prone):**
- `handlebars@<=4.7.9` — Multiple RCE vulnerabilities (DO NOT USE without immediate patch)
- `proxy-addr` — IPv4-mapped IPv6 spoofing (update with express)
- `tinypool` — Prototype pollution RCE (indirect via vitest)
- `vitest` — Arbitrary file read when UI server exposed
- `vite` — Path traversal in dev server
- `react-router-dom` — Open redirect → XSS chain
- `browserslist` — Unbounded memory + prototype pollution
- `body-parser` — DoS via trailing bytes
- `brace-expansion` — Multiple quadratic DoS
- `js-yaml` — Merge key DoS attacks
- `ws` — Memory exhaustion from fragments

### Audit Tools Available

✅ npm audit (works across all npm packages)  
✅ npm outdated (with JSON parsing)  
❌ pip-audit (no Python projects found)  
❌ govulncheck (no Go projects found)  

### Dependency Metrics

- **Total npm manifests:** 10
- **Largest:** Source/Backend (412 deps), Source/Frontend (230 deps)
- **Smallest:** Source/E2E (4 deps, 0 vulns)
- **Safest:** demo projects (abac-*) + E2E

### Remediation Decisions

- **Handlebars:** Block usage in production; verify no Handlebars-compiled templates in build
- **React Router:** Plan major version upgrade to v7.18.0+ in next sprint
- **Vitest:** If UI not exposed in production, medium priority; still upgrade for security patching
- **Package Lock Frequency:** Update weekly (npm audit run in CI)

### Related Team Findings

- **TheGuardians:** Escalated handlebars RCE, proxy-addr spoofing, vitest file read
- **TheFixer:** Will handle npm update commits after testing in feature branches

### License Compliance Decision

- All packages use permissive licenses (MIT/Apache/BSD/ISC)
- No GPL/AGPL detected; team may freely use any of these dependencies
- No UNLICENSED packages found (all clear)

