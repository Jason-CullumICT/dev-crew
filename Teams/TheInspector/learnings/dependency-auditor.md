# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Audit Run: 2026-11-10

### Critical Findings (P1)
1. **proxy-addr IPv4-mapped IPv6 spoofing (GHSA-jqcg-44mw-7w3h)** — affects 3+ packages
   - Impact: IP-based access control bypass
   - Fix: Bump to proxy-addr ^2.1.0
   - Status: Cross-ref'd to TheGuardians for auth review

2. **handlebars AST injection (GHSA-3mfm-83xf-c92r)** — Source/Backend
   - Impact: RCE if backend renders user-controlled templates
   - Fix: Update handlebars

3. **protobufjs code injection (GHSA-66ff-xgx4-vchm)** — platform/orchestrator
   - Impact: Code execution via malicious proto messages
   - Fix: Update protobufjs

4. **tinypool prototype pollution (GHSA-5gmw-xhrv-c9v3)** — Source/Frontend (vitest)
   - Impact: Test runner RCE via worker config
   - Fix: Update vitest

### Deprecated Packages Watch List
- **multer@1.4.5** (platform/orchestrator) — Use v2.x only going forward
- **supertest@6.3.3** (Source/Backend) — Outdated; v7.1.3+ required
- **glob** (transitive) — Old, unsupported; update build chain
- **async@1.0.6** (transitive) — Memory leak; use modern async/await or p-map

### Dependency Tree Insights
- **Largest attack surface:** portal/Backend (577 deps) — 397 prod dependencies
- **Main app:** Source/Backend + Frontend = 693 transitive deps (relatively lean)
- **No suspicious post-install scripts** detected
- **No GPL/AGPL violations** in main dependencies

### Tools & Environment
- **Environment:** npm (no Go modules, no Python requirements.txt, no Cargo.toml)
- **npm audit** works correctly across all packages
- **npm outdated** requires node_modules present (not available in fresh checkout)
- **Recommended:** Add `npm audit --audit-level=high` to CI/CD

### License Compliance
- ✅ MIT, Apache-2.0, ISC, BSD dominate
- ✅ No proprietary/GPL licensing issues
- Recommendation: Automate with `license-checker` npm package

### Next Steps for Team
1. Run `npm audit fix --audit-level=critical` immediately in Source/Backend, Frontend, orchestrator
2. Migrate platform/orchestrator from multer 1.x to 2.x
3. Escalate proxy-addr, handlebars, protobufjs findings to TheGuardians
4. Add `npm audit` to pre-commit hooks and CI/CD pipeline
5. Schedule monthly `npm outdated` reviews

---

## Prior Runs
_(none — first audit)_
