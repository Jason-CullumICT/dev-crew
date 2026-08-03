# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-08-03

**Overall Grade:** D (2 critical, 9 high, 8 moderate CVEs)

### Critical Watch List

1. **protobufjs** (platform/orchestrator)
   - **Status:** Vulnerable (7.6.4 has 10 CVEs including arbitrary code execution)
   - **Root cause:** Used indirectly via @grpc/grpc-js for gRPC communication
   - **Remediation:** Upgrade to 7.7.0+ immediately
   - **Future:** Monitor quarterly; protobufjs has high CVE churn

2. **handlebars** (Source/Backend, transitive)
   - **Status:** Vulnerable (4.7.8 allows JavaScript injection via AST confusion)
   - **Root cause:** Transitive dependency via build tools
   - **Remediation:** Upgrade to 4.7.9+ via npm audit fix
   - **Impact:** If templates are user-supplied, this is production-critical

3. **vitest** (Source/Frontend, direct dev dependency)
   - **Status:** Vulnerable (3.2.5 allows arbitrary file read when UI server running)
   - **Root cause:** Dev server security bypass
   - **Remediation:** Upgrade to 3.2.6+ or 4.1.10+ immediately
   - **Impact:** Development environment safety; affects CI/CD if vitest UI is exposed

### Environment & Tools

**Available Audit Tools:**
- ✅ npm audit --json (primary method; provides CVE details, affected ranges, fixes)
- ✅ npm outdated --json (identifies major version drift)
- ✅ npx license-checker --json (validates licenses)
- ❌ govulncheck (no Go modules detected)
- ❌ pip-audit (no Python dependencies detected)

**Lock Files Detected:**
- Source/Backend/package-lock.json (411 transitive deps)
- Source/Frontend/package-lock.json (230 transitive deps)
- Source/E2E/package-lock.json (4 deps, clean)
- platform/orchestrator/package-lock.json (155 transitive deps)

**Postinstall Scripts:** None detected across workspaces. ✅

### Findings Aggregated

**By severity:**
- Critical (P1): 2 (handlebars, protobufjs, vitest)
- High (P2): 9 (brace-expansion, form-data, js-yaml, path-to-regexp, postcss, vite, ws, @grpc/grpc-js, esbuild)
- Moderate (P3): 8

**By workspace:**
- Backend: 9 CVEs (critical: handlebars)
- Frontend: 11 CVEs (critical: vitest; high: vite, postcss, react-router-dom)
- Orchestrator: 9 CVEs (critical: protobufjs via gRPC)
- E2E: 0 CVEs (clean)

**Supply chain risks:**
- No GPL/AGPL licenses detected ✅
- No deprecated packages ✅
- No postinstall scripts ✅
- Protobufjs high CVE churn ⚠️

### Remediation Strategy

**Phase 1 (immediate):**
1. `npm update vitest` in Frontend → 3.2.6+
2. `npm update protobufjs @grpc/grpc-js` in Orchestrator → latest
3. `npm audit fix` in Backend (catches handlebars + 8 others)

**Phase 2 (this sprint):**
4. `npm audit fix` in Frontend (vite, postcss, form-data, react-router-dom, ws, etc.)
5. `npm audit fix` in Orchestrator (remaining moderate CVEs)
6. Full test pass after each update

**Phase 3 (next sprint):**
7. Major version upgrades: express 5.x, react-router-dom 7.x, dockerode 5.x
8. Coordinate with backend/frontend teams; test in staging

### License Decisions

_No policy decisions made yet. Current licenses are all permissive (MIT, Apache 2.0)._

### Prior CVE History

_None recorded — first audit run._

---

## Checklist for Next Audit (30 days)

- [ ] Verify all Phase 1 upgrades completed
- [ ] Re-run npm audit in all workspaces
- [ ] Confirm zero new HIGH/CRITICAL CVEs
- [ ] Plan major version upgrades if any released
- [ ] Update this file with findings
