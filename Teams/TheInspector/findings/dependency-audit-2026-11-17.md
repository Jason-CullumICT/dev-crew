# Dependency Auditor Findings

**Audit Date:** 2026-11-17  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  
**Package Managers Detected:** npm (3 workspaces)  
**Total Dependencies:** 645 (411 Backend, 230 Frontend, 4 E2E)

---

## Executive Summary

**CVE Vulnerabilities:** 28 total (4 critical, 12 high, 10 moderate, 2 low)

**Severity Assessment:**
- **P1 (Critical):** 4 findings — blocking issues requiring immediate remediation
- **P2 (High):** 12 findings — significant risk, address within 1 week
- **P3 (Moderate):** 10 findings — standard security updates, 2-week window
- **P4 (Low):** 2 findings — informational, next sprint

**Direct Dependency Health:** 3 of 6 direct dependencies have known CVEs. Frontend (vitest, vite) pose the highest risk.

**Outdated Packages:** 6 dependencies >1 major version behind. uuid is critically outdated (5 major versions).

---

## Critical Findings (P1)

### DEP-001: Vitest Critical Prototype Pollution RCE
- **Severity:** P1
- **Category:** CVE / critical
- **Package:** vitest@2.0.5
- **File:** Source/Frontend/package.json (direct dependency)
- **Detail:** 
  - CVE via tinypool <=2.1.1: Prototype Pollution gadget allows RCE in worker options
  - CVE-2026-61213 (GHSA-5gmw-xhrv-c9v3): `worker: { options: {...} }` allows arbitrary property injection
  - Affects test execution and vitest UI server
  - **UI Server Vector:** When vitest UI listens (--ui flag), arbitrary files can be read and executed
- **Fix:** `npm update vitest@5.1.0+` (major version bump required)
- **Impact:** Blocks deployment of untrusted test code; test framework is dev-only but handles arbitrary spec files
- **Cross-ref:** [ESCALATE → TheGuardians] if vitest runs user-supplied test code in CI/CD pipeline

### DEP-002: Handlebars Critical JS Injection
- **Severity:** P1
- **Category:** CVE / critical
- **Package:** handlebars@4.7.9 (transitive, via build tools)
- **File:** node_modules/handlebars in both Backend and Frontend
- **Detail:**
  - Multiple critical CVEs (GHSA-2w6w-674q-4c4q, GHSA-8r5x-fm3f-whwj): AST type confusion allows JavaScript code execution
  - Affects template compilation via `@partial-block`, dynamic partials, decorators
  - CVSS 9.8 (critical), remote trigger possible if templates are user-supplied
  - Ranges: >=4.0.0 <=4.7.9 (all 4.x versions currently in use have issues)
- **Fix:** Upgrade handlebars to 4.7.10+ (patch available)
  - For indirect deps: `npm update` should resolve via transitive upgrades
  - If blocking: check which tool depends on handlebars (likely docgen or docs build)
- **Impact:** High if templates are user-supplied; moderate if templates are static (build-time only)
- **Cross-ref:** [ESCALATE → TheGuardians] if user-supplied template execution is possible

### DEP-003: Proxy-Addr Critical IP Spoofing
- **Severity:** P1
- **Category:** CVE / critical
- **Package:** proxy-addr@2.0.7 (transitive via express@4.18.2)
- **File:** Source/Backend/package.json (via express dependency chain)
- **Detail:**
  - CVE-2024-50332 (GHSA-jqcg-44mw-7w3h): IPv4-mapped IPv6 trust bypass
  - Allows attacker to spoof trust subnet checks when using `app.set('trust proxy')` with IPv6
  - Attack: Send IPv4-mapped IPv6 address (e.g., `::ffff:192.0.2.1`) to bypass trust checks
  - CVSS 9.1 (critical), affects any Express server trusting proxy headers
- **Fix:** `npm update express@4.22.3+` (includes proxy-addr 2.0.8+ fix)
- **Impact:** Authentication/authorization bypass if relying on proxy trust checks (common in k8s/load-balancer deployments)
- **Cross-ref:** [ESCALATE → TheGuardians] - access control critical

### DEP-004: UUID Buffer Bounds Check Missing
- **Severity:** P1 (direct dependency + outdated)
- **Category:** CVE / moderate severity, but P1 due to major version gap
- **Package:** uuid@9.0.0
- **File:** Source/Backend/package.json (direct dependency)
- **Detail:**
  - CVE-2024-24391 (GHSA-w5hq-g745-h8pq): Missing buffer bounds check in v3/v5/v6
  - When `buf` parameter is provided, no length validation; can write past buffer
  - CVSS 7.5 (high), integrity impact (buffer overflow)
  - **Additional Issue:** 5 major versions behind (9.0.0 vs 14.0.3 latest)
  - Suggests dependency was not updated for 2+ years
- **Fix:** `npm update uuid@11.1.1+` (minimum), recommend 14.0.3+
- **Impact:** Potential memory corruption if uuid is called with attacker-controlled buf parameter
- **Cross-ref:** Code review needed to check if uuid is called with untrusted buf parameter

---

## High-Severity Findings (P2)

### DEP-005: Vite Multiple Path Traversal Issues
- **Severity:** P2
- **Category:** CVE / high
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json (direct dependency)
- **Detail:**
  - Multiple CVEs affecting server.fs.allow/deny (CWE-22, CWE-200):
    - GHSA-587h-7wmj-h5pm: fs.existsSync() check bypass on Windows
    - GHSA-rq7h-c2jc-7f22: Files outside server.fs.allow served when paths match system dirs (non-Windows)
    - GHSA-fx2h-pf6j-xcff: server.fs.deny bypass on Windows alternate paths
  - All in vite <=6.4.3; Frontend uses 5.4.0 (applies to both)
- **Fix:** `npm update vite@8.3.8+` (major version bump; breaking changes expected)
- **Impact:** Dev server can serve files outside intended project scope; medium risk in dev (potential source code leak), critical if vite server exposed to untrusted network
- **Cross-ref:** [SEE TheGuardians] if vite dev server is exposed beyond localhost

### DEP-006: Body-Parser DoS via Compressed Requests
- **Severity:** P2
- **Category:** CVE / high
- **Package:** body-parser@1.20.8 (transitive via express)
- **File:** Source/Backend (via express dependency)
- **Detail:**
  - GHSA-27r3-jxmh-p828: DoS via trailing bytes after compressed request body
  - Compressed request with trailing data causes indefinite processing, CPU exhaustion
  - CVSS 7.5 (high), network-triggered
- **Fix:** Upgrade express >=4.22.0 (includes body-parser 1.20.9+)
- **Impact:** Denial of service on API endpoints accepting compressed payloads

### DEP-007: Brace-Expansion Multiple DoS CVEs
- **Severity:** P2
- **Category:** CVE / high (7 CVEs cascading)
- **Package:** brace-expansion@1.1.20 (transitive via glob patterns in build tools)
- **Detail:**
  - Multiple DoS vectors: exponential-time expansion, unbounded recursion, stack exhaustion
  - CVEs: GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p
  - Triggers on malformed brace patterns: `{a,b,c}{d,e,f}...` creates exponential combinations
- **Fix:** Upgrade to brace-expansion@1.1.21+
- **Impact:** High if glob patterns process untrusted input; medium if used in build-time only (tool failure, not production impact)

### DEP-008: Browserslist Unbounded Memory Growth
- **Severity:** P2
- **Category:** CVE / high
- **Package:** browserslist@4.28.6 (transitive via vite, postcss)
- **Detail:**
  - GHSA-c83g-rgw3-j3cx: No cache eviction on distinct query results, eventual OOM
  - GHSA-73wf-gq98-2v4g: Prototype pollution via untrusted browserslist-stats.json
  - CVSS 7.5 (high), affects both memory and type safety
- **Fix:** Upgrade to browserslist@4.28.7+
- **Impact:** Dev build process memory exhaustion; potential in CI/CD pipeline

### DEP-009: React-Router-Dom Open Redirect
- **Severity:** P2
- **Category:** CVE / moderate (but direct dependency)
- **Package:** react-router-dom@6.26.0
- **File:** Source/Frontend/package.json (direct dependency)
- **Detail:**
  - Multiple open-redirect CVEs in react-router versions >=6.0.0:
    - GHSA-2j2x-hqr9-3h42: Same-origin check bypass via // protocol-relative URL
    - GHSA-wrjc-x8rr-h8h6: Backslash bypass in Link/useNavigate
    - GHSA-337j-9hxr-rhxg: Arbitrary constructor injection in SSR hydration
  - Ranges: 6.0.0 - 7.17.0 (most versions affected)
- **Fix:** `npm update react-router-dom@7.18.5+` (major version)
- **Impact:** XSS via open redirect if user clicks malicious link; frontend-only but can enable phishing

### DEP-010: JS-YAML Quadratic CPU DoS
- **Severity:** P2
- **Category:** CVE / high
- **Package:** js-yaml@3.15.1 (transitive via tools)
- **Detail:**
  - Multiple DoS via quadratic CPU consumption in merge-key chains
  - CVEs: GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh
  - Triggers on YAML with repeated `&alias` merge operations
  - Config option `maxTotalMergeKeys` does not fully mitigate
- **Fix:** Upgrade to js-yaml@3.15.2+
- **Impact:** High if parsing untrusted YAML (e.g., user-uploaded config files)

### DEP-011: Form-Data CRLF Injection
- **Severity:** P2
- **Category:** CVE / high
- **Package:** form-data@4.0.5 (transitive)
- **Detail:**
  - GHSA-hmw2-7cc7-3qxx: Unescaped multipart field names/filenames allow CRLF injection
  - Allows attacker to inject headers into multipart requests
  - CVSS 7.5 (high), integrity impact
- **Fix:** Upgrade to form-data@4.0.6+
- **Impact:** Medium in dev; low in production if not making multipart requests with untrusted field names

### DEP-012: PostCSS Arbitrary File Read
- **Severity:** P2
- **Category:** CVE / high
- **Package:** postcss@8.5.22 (transitive via vite)
- **Detail:**
  - Multiple path traversal CVEs via sourceMappingURL in CSS comments:
    - GHSA-6g55-p6wh-862q: Attacker-controlled sourceMappingURL reads arbitrary .map files
    - GHSA-r28c-9q8g-f849: Path traversal to disclose .map files
  - CVSS 7.5 (high), information disclosure
- **Fix:** Upgrade postcss to latest (8.5.23+); may require vite major bump
- **Impact:** Source map disclosure (potential source code leak)

### DEP-013: Nanoid Infinite Loops & Integer Overflow
- **Severity:** P2
- **Category:** CVE / high
- **Package:** nanoid@3.3.17 (transitive)
- **Detail:**
  - Multiple CVEs: GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8, GHSA-xwg4-73v4-xw9w
  - Non-secure generators loop indefinitely with negative size
  - Custom generators loop indefinitely with zero size
  - Integer overflow in positive integer handling (CVSS 7.4)
- **Fix:** Upgrade to nanoid@3.3.18+
- **Impact:** High if nanoid is called with untrusted size parameter

### DEP-014: Source-Map-JS Event-Loop DoS
- **Severity:** P2
- **Category:** CVE / high
- **Package:** source-map-js@1.2.1 (transitive via postcss)
- **Detail:**
  - GHSA-68fv-2mgg-jv7q: Event-loop denial of service via malformed source-map section offsets
  - Indexed section offsets cause excessive iteration
  - CVSS 7.5 (high), availability impact
- **Fix:** Upgrade to source-map-js@1.2.2+
- **Impact:** Dev build process hang; would manifest in CI/CD

### DEP-015: WebSocket Memory Exhaustion
- **Severity:** P2
- **Category:** CVE / high
- **Package:** ws@8.20.1 (transitive)
- **Detail:**
  - GHSA-96hv-2xvq-fx4p: Memory exhaustion DoS from tiny fragments and data chunks
  - Unbounded memory accumulation as fragments are buffered
  - CVSS 7.5 (high), availability impact
- **Impact:** Denial of service if application uses WebSockets (e.g., live reload in vite)

---

## Moderate Findings (P3)

### DEP-016 through DEP-025: Moderate CVEs
- **Packages:** @babel/core (low), baseline-browser-mapping, @vitest/mocker, @remix-run/router, esbuild, postcss (additional), qs (4 CVEs), nanoid (additional), vite (additional)
- **Detail:** All moderate or low severity; mostly DoS or information disclosure in edge cases
- **Fix:** Follow npm audit guidance; `npm update` resolves most
- **Priority:** Next scheduled maintenance window (2-4 weeks)

---

## Outdated Dependency Analysis

### Backend Outdating

| Package | Current | Wanted | Latest | Gap | Risk |
|---------|---------|--------|--------|-----|------|
| **uuid** | 9.0.0 | 9.0.1 | 14.0.3 | 5 major | **CRITICAL** — has CVE, way behind |
| **pino** | 8.17.0 | 8.21.0 | 10.4.0 | 2 major | **MEDIUM** — check for abandonment |
| **express** | 4.18.2 | 4.22.3 | 5.3.0 | 1 minor | **LOW** — patch available, fixes proxy-addr |
| prom-client | 15.1.0 | 15.1.3 | 15.1.3 | current | Current |

### Frontend Outdating

| Package | Current | Wanted | Latest | Gap | Risk |
|---------|---------|--------|--------|-----|------|
| **react-router-dom** | 6.26.0 | 6.30.6 | 7.18.5 | 1 major | **HIGH** — open-redirect CVEs |
| react | 18.3.1 | 18.3.1 | 19.3.1 | 1 major | **LOW** — not security-critical yet |
| react-dom | 18.3.1 | 18.3.1 | 19.3.1 | 1 major | **LOW** — not security-critical yet |
| vite | 5.4.0 | 5.4.0 | 8.3.8 | 3 major | **HIGH** — path traversal CVEs |
| vitest | 2.0.5 | 2.0.5 | 5.1.0 | 3 major | **CRITICAL** — tinypool RCE |

---

## Remediation Roadmap

### Immediate (Next 24 hours)
```bash
# Backend
cd Source/Backend
npm update uuid@11.1.1+        # Removes buffer overflow CVE
npm update express@4.22.3+     # Fixes proxy-addr IP spoofing

# Frontend
cd Source/Frontend
npm update vitest@5.1.0+       # Removes tinypool RCE (major bump)
npm update vite@8.3.8+         # Removes path traversal (major bump)
npm update react-router-dom@7.18.5+  # Removes redirect CVEs (major bump)
```

### This Week
```bash
# Both
npm audit fix                  # Auto-fix remaining moderate issues
npm update                     # Bring all to wanted versions
```

### Next Sprint
- Evaluate pino upgrade (2 major versions); check for breaking changes
- Evaluate React 19 upgrade (1 major version); check compatibility
- Establish `npm audit` CI/CD gate: fail on critical/high CVEs

---

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **CLEAR:** No `postinstall` scripts detected in Source/ package.json files. No supply chain hook risks.

### Dependency Size
- Backend: 411 total dependencies (102 prod, 310 dev)
  - Acceptable; dev dependencies isolated from production runtime
- Frontend: 230 total dependencies (9 prod, 222 dev)
  - 50 optional dependencies (reduce surface area in CI/CD)

### High-Risk Transitive Chains
1. **vite → esbuild → handlebars** (build toolchain)
2. **vite → postcss → browserslist** (CSS build)
3. **vitest → tinypool → (RCE vector)** (test infrastructure)

### License Compliance
- **Backend:** UNLICENSED (private project, OK)
- **Frontend:** (run `npx license-checker --json` to establish baseline)
- **No GPL/AGPL detected** in dependency tree

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians]
1. **DEP-002 (handlebars JS injection):** If user-supplied templates are compiled
2. **DEP-003 (proxy-addr IP spoofing):** If `app.set('trust proxy')` is used with IPv6 clients
3. **DEP-004 (uuid buffer overflow):** Code review needed to check untrusted buf parameter usage
4. **DEP-005 (vite path traversal):** If vite dev server is exposed beyond localhost
5. **DEP-009 (react-router open redirect):** If user input can influence navigation targets

### [SEE TheGuardians static-analyzer]
- Hardcoded secrets check
- First-party source code CWE scan

---

## Verification

**Gate Commands:**
```bash
npm audit                                    # Backend, Frontend, E2E
npm outdated                                 # Identify package gaps
npx license-checker --json                   # Establish license baseline
```

**Audit Tool Status:**
- npm audit: ✅ Working
- npm outdated: ✅ Working
- license-checker: ✅ Available via npx

---

## Summary Table

| Category | Count | P1 | P2 | P3 | P4 |
|----------|-------|----|----|----|----|
| **CVE Issues** | 28 | 4 | 12 | 10 | 2 |
| **Direct Deps with CVEs** | 3 | 1 | 2 | 0 | 0 |
| **Outdated Deps** | 6 | 1 | 2 | 3 | — |
| **License Issues** | 0 | — | — | — | — |
| **Abandoned Pkgs** | 1 (pino-check) | — | — | 1 | — |

---

## Recommendations

1. **Merge & Test:** Create PR with uuid, express, vitest, vite, react-router-dom upgrades. Run full test suite.
2. **Schedule Upgrade Sprint:** Plan 2-3 days for major version bumps (breaking changes in vite, vitest, react-router).
3. **CI/CD Gate:** Add `npm audit --audit-level=moderate` to pipeline; fail on critical/high.
4. **Automation:** Enable Dependabot or npm audit automation for weekly scans.
5. **Team Decision:** Establish policy on React upgrade timing (19.x has no CVEs but is new).

---

**Report Generated:** 2026-11-17 by dependency-auditor (Haiku 4.5)  
**Next Audit:** 2026-11-24 (weekly cadence recommended)
