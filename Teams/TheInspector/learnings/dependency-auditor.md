# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit History

### Run 2026-08-02 — dev-crew Source App

**Grade: D** | Critical: 3 | High: 9 | Medium: 10 | Low: 9 | Total CVEs: 31

Key findings:
- Vitest UI server RCE (CVSS 9.8) — dev-time attack surface
- Handlebars code injection (CVSS 8.1) — if using templates
- Protobufjs RCE (CVSS 9.1) — orchestrator dependency
- Express + qs DoS chain affecting 3 modules
- Vite path traversal vulnerabilities (requires major upgrade to 8.x)
- Major version lag: express 3 versions behind, uuid 5 versions behind

## Learnings

### Watch List (Recurring CVE Sources)
1. **handlebars** — 4+ CVEs in 4.x series (AST injection, DoS, decorator parsing). Consider:
   - Upgrade to 4.8+ immediately
   - Long-term: evaluate template-less alternatives (JSX, Twig)
   
2. **protobufjs** — 7+ CVEs including critical RCE. Affects:
   - platform/orchestrator (direct protobuf usage)
   - @grpc/grpc-js (transitive)
   - Recommendation: upgrade to 7.7+ and use gRPC reflection over schema injection
   
3. **vite / esbuild** — Regular path traversal and CORS issues in dev tools. Root cause: file system access for dev server. Mitigations:
   - Keep updated to latest vite (8.2+) weekly
   - Don't run dev server on shared/untrusted networks
   - Use .env files for secrets, not in source maps

4. **express + qs** — Query string parsing DoS. The qs vulnerability is downstream; express maintains qs pinning. Must track express releases closely. Current: 4.18.2 (vulnerable). Need: >=4.22.2

### Tools & Techniques Verified
✅ **npm audit --json** — Works reliably across all npm projects. Exit code 1 when vulns found (expected).

✅ **npm outdated --all** — Shows current/wanted/latest. Note: "MISSING" means node_modules not installed; run `npm install` first.

❌ **npm list --depth=0** — Returns empty if no root package.json dependencies. Must cd into module dirs.

❌ **npx license-checker** — Not yet attempted; recommend for next run.

### Discovery: Dependency Count
- Backend: 412 packages (4 direct prod + 9 dev)
- Frontend: 231 packages (3 direct prod + 7 dev)  
- Orchestrator: 155 packages (3 direct prod + 0 dev)
- **Total: 834 packages**

Supply chain risk scale: 834 is acceptable (under 1000 threshold) but significant. Each dev-dep adds to build system attack surface.

### Audit Cadence Recommendation
- **Weekly**: Run `npm audit` pre-merge as CI gate (fail on critical/high)
- **Bi-weekly**: Full audit report (like this one)
- **Monthly**: `npm outdated` review + license compliance
- **Per-release**: Major version upgrade testing (vite 5→8, react 18→19, etc.)

### Cross-Team Liaison
- **TheGuardians**: Escalate RCE/injection findings (vitest, handlebars, protobufjs)
- **TheFixer**: After patching, coordinate major version upgrade testing (vite, vitest, react-router)
- **Performance Profiler**: Post-upgrade performance regression check (esp. vite 5→8)

### Known False Positives / Acceptable Risk
- vitest CVEs are **dev-only** (not in production build); acceptable risk but should be patched
- esbuild CORS issue is **dev server only**; mitigation: don't expose dev server to internet
- Babel file-read is **build-time only**; low risk unless processing attacker-controlled source

### Next Audit Focus Areas
1. Post-install script scan (currently none detected; good)
2. Single-maintainer risk for top 20 packages
3. License audit (GPL/AGPL check)
4. Duplicate major versions (check node_modules for parallel express/react installs)
