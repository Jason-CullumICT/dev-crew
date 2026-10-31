# Dependency Auditor Learnings

_Persistent learnings for the dependency auditor agent. Updated after each audit run._

## Run 1: 2026-10-31 Initial Audit

### Critical Findings (P1)
**Handlebars** - Multiple JavaScript injection vectors (GHSA-2w6w-674q-4c4q, GHSA-8r5x-fm3f-whwj, GHSA-p8wg-vrv2-v86f)
- Located in transitive dependencies
- Affects template rendering security
- Fix: Update to handlebars >= 4.7.10

**proxy-addr** - IP spoofing via IPv4-mapped IPv6 trust subnet (GHSA-jqcg-44mw-7w3h)
- High impact: Can bypass trust subnet validation
- Fix: Update to proxy-addr >= 2.0.8

**tinypool** - Prototype pollution RCE gadgets (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr)
- Used by vitest for worker thread pooling
- Fix: Update vitest to >= 5.0.5

**vitest** - Arbitrary file read/execute via UI server (GHSA-5xrq-8626-4rwp)
- Critical when Vitest UI is running
- Fix: Update vitest to >= 3.2.6

### High Severity Denial of Service Issues (P2)
- **brace-expansion**: Multiple DoS vectors (exponential expansion, stack exhaustion, unbounded arrays)
- **js-yaml**: Quadratic CPU consumption via merge-key chains
- **browserslist**: Unbounded memory growth from cache exhaustion
- **nanoid**: Infinite loop with negative/zero sizes

### Outdated Major Versions (P2/P3)
- **pino**: 8.17.0 → 10.4.0 (2 major versions behind, likely missing 2+ years of patches)
- **uuid**: 9.0.0 → 14.0.3 (significantly outdated, 5 major versions behind)
- **React**: 18.3.1 → 19.3.1 (1 major version behind, known breaking changes)
- **React Router**: 6.30.6 → 7.18.5 (1 major version behind, open redirect vulnerability in current version)
- **vite**: 5.4.0 → 8.3.5 (multiple path traversal fixes needed)

### Dependency Inventory
- **Backend**: 4 direct prod deps, 8 direct dev deps → 411 transitive total
- **Frontend**: 3 direct prod deps, 10 direct dev deps → Similar transitive footprint
- **E2E**: Playwright suite, no vulnerabilities detected
- No post-install scripts detected (good security posture)
- Total transitive deps: ~411 per project (within acceptable range, <500 threshold)

### Recommended Immediate Actions
1. **P1**: Update Express/proxy-addr to latest
2. **P1**: Update vitest to >= 3.2.6 (fixes UI server vulnerability)
3. **P1**: Update handlebars to >= 4.7.10
4. **P2**: Update pino to 10.x (requires backend code compatibility check)
5. **P2**: Update vite to >= 8.3.5 (major version bump, test thoroughly)
6. **P3**: Update uuid to latest (low risk for simple UUIDs)

### License Findings
- No GPL/AGPL viral licenses detected
- All direct dependencies have declared licenses
- No license compliance blockers identified

### Watch List (Recurring Issues)
- **brace-expansion**: 7 separate CVEs, marked for monitoring
- **js-yaml**: 4 DoS CVEs, consider alternative or strict input validation
- **Vitest**: Multiple recent vulns, keep updated
- **PostCSS/Vite**: Path traversal issues in source map handling (industry-wide pattern)
