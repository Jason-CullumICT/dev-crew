# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Critical Findings Summary (2026-06-15)

### High-Risk CVEs Identified

1. **Handlebars RCE (CRITICAL)** — JavaScript injection via AST type confusion
   - Affects: Source/Backend, portal/Backend (transitive)
   - CVSS: 9.8
   - Fix: `npm audit fix` to upgrade to >=4.7.9

2. **esbuild Supply Chain (CRITICAL)** — Missing binary integrity verification
   - Affects: All Frontend packages (via Vite)
   - CVSS: 8.1
   - Impact: CI/CD build pipeline compromise possible
   - Fix: Upgrade Vite to >=8.0.16

3. **vitest Critical** — Cascading from vite/esbuild
   - Fix: Upgrade to ^4.1.9

4. **express Outdated** — 4.x has multiple CVEs (qs, body-parser)
   - Current: 4.18.2 | Latest: 5.2.1
   - Plan upgrade path for Source/Backend and platform/orchestrator

### Packages to Watch (Recurring CVEs)

- **qs** — Query string parsing vulnerabilities (moderate)
- **body-parser** — Transitive via express (moderate)
- **brace-expansion** — DoS via zero-step sequences (moderate)
- **postcss** — XSS in CSS stringify (moderate)

### Audit Tools Available

- `npm audit --json` — Primary tool, available in all npm workspaces
- `npm outdated --json` — Check for major version updates
- No license-checker available; manual review of package.json licenses

### Environment Configuration

- All 6 workspaces use npm exclusively
- No Go/Python/Rust dependencies detected
- ~1,400 total transitive dependencies across all workspaces
- No post-install scripts in primary manifests (good supply chain posture)

### Recommendations for Team

1. **CI/CD Integration:** Add `npm audit` gate (fail on critical/high)
2. **Dependabot/Renovate:** Automate CVE notifications
3. **Major Version Pins:** Pin express@5.x, vite@^8.0.16 in package-lock.json
4. **Escalations:** Handlebars, esbuild, vitest issues escalated to TheGuardians for security assessment

### Next Audit: 2026-06-22 (weekly check-in post-remediation)
