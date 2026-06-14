# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit: 2026-06-14

### Critical Findings (Watch List)

1. **protobufjs ≤7.5.5 — CRITICAL RCE**
   - Multiple code execution vectors (CWE-94, CWE-1321)
   - Found in: platform/orchestrator (via @grpc/grpc-js)
   - Risk Level: EXTREME in infrastructure contexts
   - Policy: Must keep ≥7.5.6; audit monthly
   - Requires immediate patching before any production use

2. **handlebars ≥4.0.0 ≤4.7.8 — CRITICAL Injection**
   - Found in: Source/Backend npm audit output (needs verification if actually installed)
   - 8+ CVEs related to AST confusion, prototype pollution, XSS
   - Policy: If installed, upgrade to ≥4.7.9 immediately. Consider removing if unused.

3. **esbuild 0.17.0-0.28.0 — Build-time RCE**
   - Missing binary integrity checks
   - Exploitable via NPM_CONFIG_REGISTRY environment variable
   - Found in: Source/Frontend (via vite)
   - Policy: Always use `npm ci` with locked lockfile in CI; never `npm install`

### Version Upgrade Status

| Package | Current | Latest | Priority | Blocker |
|---------|---------|--------|----------|---------|
| protobufjs | 7.5.5 | 7.6.0+ | IMMEDIATE | Yes (orchestrator) |
| handlebars | 4.7.8 | 4.7.9+ | IMMEDIATE | Yes (if installed) |
| express | 4.18.2 / 4.21.0 | 5.2.1 | URGENT | No (cves in 4.21.0-4.22.1 range) |
| vite | 5.4.0 | 8.0.16+ | URGENT | No (esbuild + path traversal) |
| react-router-dom | 6.26.0 | 7.17.0 | URGENT | No (open redirect) |
| pino | 8.17.0 | 10.3.1 | HIGH | No |
| react | 18.3.1 | 19.2.7 | HIGH | No |
| @grpc/grpc-js | 1.14.0-1.14.3 | 1.14.4+ | URGENT | Yes (orchestrator) |

### Policy Decisions Made

1. **Post-Install Scripts:** ✅ None detected in package.json. Current posture: allow (but monitor).
2. **License Compliance:** ✅ All direct deps are MIT/Apache-2.0. No GPL/AGPL risk.
3. **Monorepo Duplication:** Acceptable — Frontend uses typescript 5.5.4, Backend 5.3.3 (minor version skew).
4. **npm audit in CI:** Recommended to add as gate (currently no evidence of CI enforcement).

### Supply Chain Hardening

- **Registry Lock:** Recommend adding to all .npmrc files: `registry=https://registry.npmjs.org/`
- **ci vs install:** Enforce `npm ci` in CI/CD, `npm install` only in local dev
- **lockfile strategy:** Keep package-lock.json in git, reviewed on PR
- **Caching:** Safe to cache ~/.npm but clear between major version bumps

### Tools Available

- ✅ `npm audit` — npm v7+ built-in
- ✅ `npm outdated` — npm v2.3+
- ✅ `npm ls --depth=0` — list direct dependencies
- ❌ `license-checker` — not installed (used manual inspection)
- ❌ `govulncheck` — Go tool, not applicable (no Go modules in Source/)
- ❌ `pip-audit` — Python tool, not applicable (no Python in Source/)

### Audit Environment Context

- **OS:** Linux (GitHub Actions runner)
- **npm version:** Recent (supports --json)
- **Architecture:** Multi-workspace monorepo (Source/, platform/, portal/, etc.)
- **Critical infrastructure:** platform/orchestrator (Docker orchestration)
- **CI/CD integration:** Not visible; recommend gating builds on `npm audit`

### Escalations to TheGuardians

1. **protobufjs RCE in orchestrator:** Check Docker container execution context, privilege level, network exposure
2. **handlebars (conditional):** If confirmed installed in Source/Backend, assess code injection blast radius
3. **esbuild supply chain:** Audit npm registry security & CI/CD artifact integrity

### Next Audit Checklist

- [ ] Verify handlebars is NOT reachable from express → body-parser chain
- [ ] Confirm orchestrator protobufjs upgraded to 7.5.6+
- [ ] Add `npm audit` to CI/CD pipeline as blocking gate
- [ ] Run audit again post-fix: target 0 critical, ≤5 moderate
- [ ] Document npm registry lock in all .npmrc files
- [ ] Test major version upgrades (express 5, react 19) in feature branches

---

## Learnings

_(Records from previous audits would go here)_

**Initial State:** First audit completed. All discoveries documented above.
