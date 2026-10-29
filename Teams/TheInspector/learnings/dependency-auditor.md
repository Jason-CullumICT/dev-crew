# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-10-29

### Critical Findings
- **8 critical CVEs** identified across npm packages (proxy-addr, tinypool, handlebars, vitest, protobufjs)
- **124 total known vulnerabilities** (12 critical, 34 high, 67 moderate, 23 low)
- **Largest risk area:** portal/Backend with 61 CVEs and 578 transitive dependencies
- **Most urgent fix:** Vite path traversal (DIRECT dependency) and proxy-addr IP spoofing (affects all backends)

### Vulnerable Packages (Watch List)
1. **proxy-addr** (critical) - IP spoofing via IPv4-mapped IPv6. Affects:
   - Source/Backend, Source/Frontend, platform/orchestrator, portal/Backend
   - Fix: Update to v2.1.2+

2. **handlebars** (critical) - JavaScript injection via AST type confusion. Affects:
   - Source/Backend (indirect via jest-config)
   - Fix: Update to v4.7.9+
   - Risk: SSTI if backend renders templates with untrusted input

3. **tinypool** (critical) - Prototype pollution → RCE via worker options. Affects:
   - Source/Frontend, portal/Backend, portal/Frontend
   - Fix: Update via vitest dependency
   - Risk: RCE if workers initialized with untrusted input

4. **vitest** (critical) - File read/execute when UI server active. Affects:
   - portal/Backend, portal/Frontend (dev-only)
   - Risk: Source code disclosure, RCE in dev environments

5. **protobufjs** (critical) - Arbitrary code execution. Affects:
   - portal/Backend, platform/orchestrator
   - Risk: RCE if parsing untrusted .proto definitions

6. **vite** (high/direct) - Path traversal in optimized deps. Affects:
   - Source/Frontend (DIRECT dependency via @vitejs/plugin-react)
   - Fix: Update to ^5.5.0+ immediately
   - Risk: Arbitrary file read via dev server

### Dependency Tree Observations
- Backend: 412 packages (4 prod, 9 dev)
- Frontend: 231 packages (3 prod, 10 dev)
- Orchestrator: 156 packages (3 prod, 0 dev)
- Portal Backend: 578 packages (11 prod, 11 dev) ← HIGH RISK
- Portal Frontend: 425 packages (3 prod, 14 dev)
- Total: ~1,800+ transitive dependencies

**Risk factor:** Portal packages are 40%+ larger. Consider: do they need all those dependencies? Review for over-dependency.

### Audit Tool Status
- **npm audit:** Available and working on all directories
- **Node version:** 10.x (npm v10.x)
- **Fallback strategy:** npm audit works, no need for external tools (npx, retire.js, etc.)

### License Audit Results
✅ No GPL/AGPL packages detected (safe for proprietary project)
⚠️ Internal packages show null licenses in lock files (expected, not a risk)

### Recommendations
1. **P0 (Immediate):** Update vite, proxy-addr, tinypool, protobufjs
2. **P1 (This sprint):** Update handlebars, vitest, and all high-severity packages
3. **P2 (Next sprint):** 
   - Audit post-install scripts (`jq '.packages[].scripts.postinstall' package-lock.json`)
   - Review npm ls for duplicate major versions
   - Implement SCA tool in CI
4. **P3 (Ongoing):** Set up Dependabot/Renovate, establish 30-day max patch lag policy

### Cross-Team Escalations
🚨 All 8 critical CVEs need TheGuardians security review:
- Confirm no SSTI risk in templates (handlebars)
- Confirm no untrusted protobuf parsing (protobufjs)
- Confirm no IP-based access control relied upon (proxy-addr)
- Verify test suites not exposed in production (vitest)

### Next Audit Checklist
- [ ] Run post-install script audit: `jq '.packages[].scripts.postinstall' package-lock.json | grep -v null`
- [ ] Check for duplicate major versions: `npm ls | grep deduped`
- [ ] Verify no deprecated packages: `npm audit --production`
- [ ] Check download stats for newly added top-level dependencies
- [ ] Document which critical CVEs have been fixed/patched
- [ ] Update CI to use `npm ci --frozen-lockfile` to prevent transitive attacks
