# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-07-14

### Critical Findings

1. **Handlebars.js (4.0.0-4.7.8)** — 8 distinct CVEs in Backend
   - CVSS range: 3.2-9.8 (GHSA-2w6w-674q-4c4q is critical at 9.8)
   - Root cause: Template AST type confusion + prototype pollution
   - Status: Fixable via `npm audit fix` → 4.7.9+
   - Watch: Confirm templates are not user-controlled; if dynamic, escalate to TheGuardians immediately

2. **Vite (<=6.4.2)** — High-severity dev-time origin bypass in Frontend
   - CVSS 5.3 (development only, but affects HMR & module loading)
   - Fix requires major bump to vite@7.x or 8.x (breaking change)
   - Effort: High (vitest, vite-node, @vitest/mocker all downstream)
   - Status: Blockers on vite@5.x; prioritize for next release

3. **form-data (4.0.0-4.0.5)** — CRLF injection in both Backend & Frontend
   - CVSS 7.5 (header injection risk)
   - Fix: Upgrade to 4.0.6+
   - Impact: Any form submission route is affected

4. **ws (8.0.0-8.20.1)** — Frontend WebSocket DoS + info disclosure
   - Two CVEs: uninitialized memory leak + memory exhaustion
   - Fix: Upgrade to 8.20.2+

### Package Maintenance Watch List

- **express** (4.18.2): 4 minor versions behind wanted (4.22.2); monitor for patches
- **pino** (8.17.0): 4 minor behind wanted (8.21.0); major 10.3.1 available but requires testing
- **react-router-dom** (6.26.0): Missing open-redirect patch; upgrade to 6.30.4+ recommended
- **uuid** (9.0.0): Buffer bounds fix in v3/v5/v6 requires major bump to 14.0.1

### License Compliance

- ✅ **No GPL/AGPL detected** in any dependency chain
- ✅ **All dependencies are permissive** (MIT, Apache 2.0, ISC)
- 🟡 **Internal packages unmarked:** workflow-engine-backend and workflow-frontend are UNLICENSED
  - **Recommendation:** Set to MIT or Apache-2.0 explicitly in package.json

### Supply Chain Health

- **Post-install scripts:** None detected (low risk)
- **Package adoption:** All packages are high-adoption, low abandonment risk
- **Dependency count:** 
  - Backend: ~25-30 transitive (healthy)
  - Frontend: ~120-150 transitive (large but normal for React ecosystem)
  - Total: ~200+ unique packages across manifests

### Audit Tool Notes

- **Environment:** npm tools available and functional
- **npm audit:** Works correctly on all manifests
- **npm outdated:** Works correctly but shows "MISSING" versions (likely local vs package.json mismatch)
- **license-checker:** Available and functional
- **govulncheck:** Not needed (no Go modules)

### Next Audit Focus

1. **Post-vite upgrade:** Re-run audit to confirm esbuild, vitest, vite-node issues resolve
2. **Handlebars usage audit:** Review backend code for dynamic template evaluation
3. **React 19 readiness:** Monitor for breaking changes; no immediate urgency
4. **Lock file staleness:** Consider `npm audit fix --force` on safe packages after Q2 testing
