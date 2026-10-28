# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Learnings

### Audit Results (2026-10-28)

**Environment:** npm workspaces across dev-crew project
- 6 active npm workspaces (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)
- 388 direct dependencies, ~590 transitive
- **Total Vulnerabilities:** 53 (8 critical, 21 high, 19 moderate, 5 low)

**Critical Packages to Watch:**
1. **handlebars** - Multiple injection/RCE CVEs in v4.x - ESCALATE TO GUARDIANS
2. **proxy-addr** - IP spoofing auth bypass - CRITICAL for Express apps
3. **protobufjs** - RCE via deserialization - blocks platform/orchestrator
4. **vitest** - Arbitrary file read via UI server - build-time RCE
5. **tinypool** - Prototype pollution to RCE - worker thread compromise

**High-Risk Patterns:**
- **DoS via parser vulnerabilities:** brace-expansion, browserslist, js-yaml, qs, ws
- **Path traversal in build tools:** postcss, vite, @babel/core
- **Open redirects in routing:** @remix-run/router, react-router
- **Memory exhaustion:** browserslist (unbounded cache), ws (fragment processing)

**Available Tools in This Environment:**
- `npm audit --json` ✅ (works, v8+ format)
- `npm outdated --json` ✅ (available)
- `npm list` ✅ (available for license checking via package.json)
- `npx license-checker` ❓ (not pre-installed; would need install)

**Audit Recommendations:**
1. Run monthly (attack surface is large with 590 transitive deps)
2. Prioritize critical/high fixes within 1 week
3. Coordinate major version upgrades (Jest 25→30, Vitest 4→5, React-Router 6→7)
4. Test suite MUST pass after each update (breaking changes likely)
5. Escalate injection/auth-bypass CVEs to TheGuardians team immediately

**Notes on Each Workspace:**
- **Source/Backend:** 18 vulns - highest risk due to server-side injection (handlebars)
- **Source/Frontend:** 17 vulns - vitest/tinypool RCE + routing redirects
- **Source/E2E:** 0 vulns - clean (minimal deps)
- **platform/orchestrator:** 9 vulns - protobufjs RCE is critical blocker
- **portal/Backend:** ~8 vulns - similar to orchestrator
- **portal/Frontend:** ~6 vulns - lowest risk

**License Compliance:** Not audited in this run (would need `npm license-checker` setup)

### Future Audit Checklist
- [ ] Run npm audit --json on all workspaces
- [ ] Check for post-install scripts (supply chain risk)
- [ ] Verify no hardcoded secrets in node_modules (spot check)
- [ ] Detect abandoned packages (no updates >2 years)
- [ ] Check duplicate package versions (resolve conflicts)
- [ ] License compliance check (GPL/AGPL detection)
