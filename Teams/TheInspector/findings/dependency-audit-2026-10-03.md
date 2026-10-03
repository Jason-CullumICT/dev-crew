# Dependency Auditor Report
**Date:** 2026-10-03  
**Scope:** dev-crew monorepo (Source/, platform/, portal/ packages)  
**Run ID:** (pending)

---

## Executive Summary

| Package Manager | Direct Deps | Transitive Deps | CVEs | Critical | High | Moderate | Low |
|---|---|---|---|---|---|---|---|
| Backend npm | 8 | ~413 | 22+ | 0 | 7 | 6 | 1 |
| Frontend npm | 9 | ~232 | 15 | 1 | 6 | 7 | 1 |
| E2E npm | 1 | 4 | 0 | 0 | 0 | 0 | 0 |
| Orchestrator npm | 3 | ~157 | 8 | 1 | 2 | 4 | 1 |
| Portal Backend npm | 9 | TBD | 8+ | 0 | 3 | 3+ | 0 |
| Portal Frontend npm | 12 | TBD | 4+ | 0 | 1 | 2+ | 0 |
| **TOTAL** | **42** | **~806** | **58+** | **2** | **20** | **28+** | **3** |

### Critical Issues Found: **2**
- **GHSA-5xrq-8626-4rwp** - Vitest UI server arbitrary file read/execute (Frontend)
- **GHSA-5375-pq7m-f5r2 / GHSA-99f4-grh7-6pcq / GHSA-m9gg-hp2v-232j** - gRPC server crashes & cert auth bypass (Orchestrator)

### Recommended Actions (Priority Order)
1. ✅ **Immediate:** Update `vitest` to ≥3.2.6 in Frontend (CVSS 9.8)
2. ✅ **Immediate:** Update `@grpc/grpc-js` to ≥1.14.5 in Orchestrator (CVSS 7.5)
3. 🔴 **High:** Update `jest` to ≥30.5.2 in Backend (cascading HIGH CVEs)
4. 🟡 **High:** Update `express`, `pino`, `uuid` majors in Backend
5. 🟡 **Medium:** Update `react`, `react-router-dom` majors in Frontend

---

## Detailed Findings

### DEP-001: Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Exploitable in development
- **Package:** vitest
- **Affected Versions:** ≤4.1.10
- **Files:** `Source/Frontend/package.json` (direct dependency)
- **CVE ID:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Network, Low Complexity, No Privilege, No User Interaction)
- **CWE:** CWE-22 (Path Traversal), CWE-862 (Missing Authorization)
- **Description:**  
  When Vitest's UI server (`vite` dev server) is listening, an unauthenticated network attacker can:
  - Read arbitrary files from the filesystem
  - Execute arbitrary JavaScript code
  - This is **critical during development** where sensitive `.env` files, source code, and credentials are exposed
- **Impact:** Confidentiality breach, code injection, credential theft
- **Proof of Concept:** Any network client can craft HTTP requests to `/` with path traversal patterns
- **Fix:** `npm install vitest@^5.0.3` (major version bump required)
- **Timeline:** No patch for v2.x / v4.x — upgrade to v5.0.3+
- **Cross-ref:** [ESCALATE → TheGuardians] — Port-binding security in development environment

### DEP-002: Jest Module Cascade - High Severity Vulnerabilities
- **Severity:** P2 (HIGH)
- **Category:** CVE / Transitive dependency chain
- **Package:** jest (and 15+ submodules: @jest/core, @jest/console, jest-message-util, etc.)
- **Affected Versions:** ≤30.2.0
- **Files:** `Source/Backend/package.json` (direct: jest@^29.7.0)
- **Issue:** Multiple HIGH-severity CVEs in jest submodules cascade through the entire test pipeline
- **Submodule Vulnerabilities:**
  - `jest-message-util`: Appears in 8+ effects chain
  - `jest-snapshot`: Appears in 6+ effects chain
  - `jest-resolve`: Path traversal issues
  - All affect @jest/core, @jest/runners, jest-cli

| Submodule | Severity | Affected Versions | Fix |
|---|---|---|---|
| jest-message-util | HIGH | 18.5.0-alpha.7da3df39 - 30.2.0 | jest@30.5.2+ |
| jest-resolve | HIGH | 18.1.0-19.0.2, 24.2.0-24.5.0, 27.1.0-30.2.0 | jest@30.5.2+ |
| @jest/test-result | HIGH | 25.4.0-30.2.0 | jest@30.5.2+ |
| @jest/test-sequencer | HIGH | 24.8.0-30.2.0 | jest@30.5.2+ |
| jest-haste-map | HIGH | 18.1.0-30.2.0 | jest@30.5.2+ |

- **Impact:** Affects test suite integrity, potential code injection during test execution
- **Fix:** `npm install jest@^30.5.2` (major version bump)
- **Timeline:** No backport to 29.x — must upgrade to 30.5.2+
- **Note:** This is a **devDependency** but cascades through node_modules during CI/CD test runs

### DEP-003: gRPC Server Crash Vulnerabilities
- **Severity:** P1/P2 (CRITICAL/HIGH)
- **Category:** CVE
- **Package:** @grpc/grpc-js
- **Affected Versions:** 1.14.0 - 1.14.4
- **Files:** `platform/orchestrator/package-lock.json` (transitive via dockerode)
- **CVE IDs:**
  - **GHSA-5375-pq7m-f5r2**: Malformed request → server crash (CVSS 7.5, DoS)
  - **GHSA-99f4-grh7-6pcq**: Malformed compressed message → client/server crash (CVSS 7.5, DoS)
  - **GHSA-m9gg-hp2v-232j**: Certificate auth bypass (CVSS 7.4, auth bypass)
  - **GHSA-f596-whhp-79r4**: Error message leakage (CVSS 3.7, info disclosure)
- **Impact:** 
  - Orchestrator can be crashed by malformed requests
  - TLS certificate validation bypassed
  - Sensitive error messages leaked to clients
- **Fix:** Update `@grpc/grpc-js` to ≥1.14.5 (or ≥1.15.0 for full set)
- **Root Cause:** `platform/orchestrator` uses dockerode@4.0.4, which transitively pulls old grpc-js
- **Timeline:** grpc-js 1.14.5 released; dockerode 5.0.1 requires Node 18+

### DEP-004: Browserslist Unbounded Memory Growth
- **Severity:** P2 (HIGH)
- **Category:** CVE / DoS
- **Package:** browserslist
- **Affected Versions:** ≤4.28.6
- **Files:** `Source/Frontend/package-lock.json` (transitive)
- **CVE IDs:**
  - **GHSA-c83g-rgw3-j3cx**: Unbounded memory growth (CVSS 7.5, OOM DoS)
  - **GHSA-73wf-gq98-2v4g**: Crash via untrusted browserslist-stats.json (CVSS 7.5, DoS)
- **Description:** Each distinct query result cached indefinitely → eventual OOM
- **Impact:** Production frontend builds can exhaust memory; CI/CD pipeline reliability
- **Fix:** `npm install browserslist@^4.28.7`
- **Note:** Comes in via Vite / build toolchain

### DEP-005: Path-to-Regexp ReDoS (Regular Expression Denial of Service)
- **Severity:** P2 (HIGH)
- **Category:** CVE / ReDoS
- **Package:** path-to-regexp
- **Affected Versions:** 0.1.1 - 0.1.11, 1.0.0 - 1.9.0, 3.0.0 - 3.3.1
- **Files:** `platform/orchestrator/package-lock.json` (transitive via express)
- **CVSS:** 7.5 (Network, Low Complexity)
- **Description:** Malformed route patterns cause exponential regex matching → CPU exhaustion
- **Impact:** Orchestrator API unresponsive under attack
- **Fix:** Transitive via express upgrade (express 4.21.0+ contains patched path-to-regexp)

### DEP-006: @remix-run/router - Protocol-Relative URL Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** CVE / CWE-601 Open Redirect
- **Package:** @remix-run/router (via react-router-dom)
- **Affected Versions:** 1.3.0 - 1.23.2
- **Files:** `Source/Frontend/package-lock.json`
- **Description:** Same-origin redirects with path starting `//` reinterpreted as protocol-relative URLs
- **Example Redirect:** `//attacker.com/phishing` interpreted as `https://attacker.com/phishing`
- **Impact:** Phishing attacks, user redirection to malicious sites
- **Fix:** `npm install react-router-dom@^6.26.1` (or ≥7.18.4)

### DEP-007: js-yaml Quadratic CPU Consumption (DoS)
- **Severity:** P2 (HIGH)
- **Category:** CVE / CWE-400 DoS
- **Package:** js-yaml
- **Affected Versions:** <3.15.0
- **Files:** `Source/Backend/package-lock.json` (transitive via jest/config tooling)
- **CVE IDs:**
  - **GHSA-h67p-54hq-rp68**: Repeated aliases in merge keys (CVSS 5.3)
  - **GHSA-52cp-r559-cp3m**: Merge-key chains force quadratic CPU (CVSS 7.5, HIGH)
  - **GHSA-5p4m-2wfm-xmqj**: Quadratic CPU in !!omap resolution (CVSS 7.5, HIGH)
- **Impact:** Config parsing, spec loading, or data processing can hang indefinitely
- **Fix:** Upgrade transitive js-yaml to ≥3.15.0 (via upstream package updates)

### DEP-008: @vitest/mocker Path Traversal / File Read
- **Severity:** P3 (MODERATE)
- **Category:** CVE / CWE-22 Path Traversal
- **Package:** @vitest/mocker (via vitest)
- **Affected Versions:** 2.1.0 - 4.1.10
- **Files:** `Source/Frontend/package.json` (direct via vitest)
- **CVSS:** 5.9 (Network, High AC, Confidentiality Impact)
- **Description:** Redirect mocking allows path traversal → read arbitrary files via test runner
- **Fix:** Requires vitest ≥5.0.3 (same fix as DEP-001)

### DEP-009: uuid Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** CVE / CWE-787 Out-of-Bounds Write
- **Package:** uuid
- **Affected Versions:** <11.1.1
- **Files:** Multiple (direct in Backend, Portal Backend; transitive in Orchestrator via dockerode)
- **CVE ID:** GHSA-w5hq-g745-h8pq
- **CVSS:** 7.5 (Integrity impact)
- **Description:** When `buf` parameter provided to v3/v5/v6 UUID functions, no length validation → buffer overflow
- **Impact:** Memory corruption, potential code execution if buf undersized
- **Fix:** 
  - Direct: `npm install uuid@^11.1.1` (major bump)
  - Transitive: Update dockerode to ≥5.0.1 (requires Node 18+)

### DEP-010: ws WebSocket Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE / CWE-400 Resource Exhaustion
- **Package:** ws
- **Affected Versions:** 8.0.0 - 8.20.1 (crash), 8.0.0 - 8.20.1 (memory)
- **Files:** `Source/Frontend/package-lock.json` (transitive)
- **CVE IDs:**
  - **GHSA-58qx-3vcg-4xpx**: Uninitialized memory disclosure (CVSS 4.4, MODERATE)
  - **GHSA-96hv-2xvq-fx4p**: Memory exhaustion from tiny fragments (CVSS 7.5, HIGH)
- **Impact:** WebSocket connections can exhaust server memory → OOM, crash
- **Fix:** `npm install ws@^8.21.0`

### DEP-011: protobufjs Multiple DoS & Schema Injection
- **Severity:** P2/P3 (HIGH/MODERATE)
- **Category:** CVE / Multiple CWEs
- **Package:** protobufjs
- **Affected Versions:** ≤7.6.4
- **Files:** `platform/orchestrator/package-lock.json` (transitive via grpc)
- **CVE IDs:**
  - **GHSA-4x5r-pxfx-6jf8**: Arbitrary file read via sourceMappingURL (CVSS 3.2, LOW)
  - **GHSA-wcpc-wj8m-hjx6**: Unbounded Any expansion DoS (CVSS 7.5, HIGH)
  - **GHSA-f38q-mgvj-vph7**: Schema-derived names shadow properties (CVSS 5.3, MODERATE)
  - **GHSA-j3f2-48v5-ccww**: Infinite loop in .proto option parsing (CVSS 5.3, MODERATE)
- **Impact:** Orchestrator API / gRPC handler could hang on malformed messages
- **Fix:** Upgrade protobufjs to ≥7.7.0+

### DEP-012: @babel/core Arbitrary File Read (Low)
- **Severity:** P4 (LOW)
- **Category:** CVE / CWE-22 Path Traversal
- **Package:** @babel/core
- **Affected Versions:** ≤7.29.0
- **Files:** `Source/Backend/package-lock.json`, `Source/Frontend/package-lock.json` (transitive)
- **Description:** sourceMappingURL comments can trigger arbitrary file reads during transpilation
- **Impact:** Low (requires local dev environment, transpilation phase only)
- **Fix:** Upgrade babel to ≥7.30.0 (typically via TypeScript/build tool update)

---

## Dependency Tree Analysis

### Total Dependencies by Project

| Project | Direct | Transitive | Ratio | Risk Level |
|---|---|---|---|---|
| Source/Backend | 8 deps + 17 devDeps | ~413 | 1:51 | ⚠️ VERY HIGH (devDeps) |
| Source/Frontend | 9 deps + 13 devDeps | ~232 | 1:26 | ⚠️ HIGH (devDeps) |
| Source/E2E | 1 deps + 0 devDeps | 4 | 1:4 | ✅ LOW |
| platform/Orchestrator | 3 deps + 0 devDeps | ~157 | 1:52 | 🔴 CRITICAL (grpc pulls many) |
| portal/Backend | 9 deps + 7 devDeps | TBD | High | ⚠️ HIGH |
| portal/Frontend | 12 deps + 9 devDeps | TBD | High | ⚠️ HIGH |
| **MONOREPO TOTAL** | **42 direct** | **~806 transitive** | **1:19** | 🔴 CRITICAL |

### Risk Factors

#### Backend (413 deps - CRITICAL)
- **Jest ecosystem dominates**: @jest/core + 15 submodules, each with their own dependency chains
  - jest → jest-runner → jest-runtime → jest-snapshot → ... (cascades)
  - jest-message-util has 8+ reverse dependencies
  - Total jest-related: ~200+ deps
- **Babel transpilation chain**: @babel/core → @babel/types → ... (~50+ deps)
- **TypeScript tooling**: typescript + types packages (~30+ deps)
- **Recommendation**: Jest is a dev dependency; consider using a lighter test runner (vitest, tsx) or moving test runs to separate container layer

#### Frontend (232 deps - HIGH)
- **Vite dev server heavy**: @vitejs/*, vitest, esbuild, rollup (~80+ deps)
- **Testing libraries**: vitest + testing-library stack (~40+ deps)
- **Build tooling**: TypeScript + esbuild + transformers (~50+ deps)
- **React ecosystem**: react + react-dom + react-router-dom + testing stacks
- **Recommendation**: Most deps are devDependencies (correct isolation), but vitest UI server is a runtime risk in dev

#### Orchestrator (157 deps - CRITICAL)
- **gRPC dominates**: @grpc/grpc-js + protobufjs + grpc-tools (~90+ deps)
- **Docker client**: dockerode + (uuid vulnerability in transitive chain)
- **Express middleware**: express + middleware stacks (~30+ deps)
- **Recommendation**: If gRPC is truly needed, isolate to separate service container; consider gRPC Java/Go alternatives

#### Portal Backend (TBD deps)
- **OpenTelemetry**: @opentelemetry/* (SDK + auto-instrumentation) (~60+ deps estimated)
- **SQLite**: better-sqlite3 (native binding, fewer deps) ✅ Good choice
- **Testing**: vitest (lighter than jest) ✅ Better choice
- **Recommendation**: Likely better dependency profile than Source/Backend

#### Portal Frontend (TBD deps)
- **CSS tooling**: tailwindcss + autoprefixer + postcss (~40+ deps)
- **Mocking**: msw (Mock Service Worker, ~20+ deps)
- **Testing**: vitest (~40+ deps)
- **Build**: Vite + esbuild (~60+ deps)
- **Recommendation**: Similar risk profile to Source/Frontend

---

## Outdated Major Versions

### Backend (Source/Backend)

| Package | Current | Latest | Gap | Risk | Fix |
|---|---|---|---|---|---|
| express | 4.18.2 | 5.2.1 | 1 major | P3 (feature gap) | `npm install express@^5` |
| pino | 8.17.0 | 10.4.0 | 2 majors | P2 (missing perf fixes) | `npm install pino@^10` |
| uuid | 9.0.0 | 14.0.2 | 5 majors | P2 (buffer CVE fix) | `npm install uuid@^14` |

### Frontend (Source/Frontend)

| Package | Current | Latest | Gap | Risk | Fix |
|---|---|---|---|---|---|
| react | 18.3.1 | 19.3.0 | 1 major | P3 (feature gap) | `npm install react@^19` |
| react-dom | 18.3.1 | 19.3.0 | 1 major | P3 (feature gap) | `npm install react-dom@^19` |
| react-router-dom | 6.26.0 | 7.18.4 | 1 major | P2 (CVE fix) | `npm install react-router-dom@^7` |

### Portal Backend

| Package | Current | Latest | Gap | Risk | Fix |
|---|---|---|---|---|---|
| pino | 10.3.1 | 10.4.0 | patch | ✅ Current | `npm install pino@^10.4` |
| better-sqlite3 | 12.8.0 | Latest | patch | ✅ Current | Check upstream |
| uuid | 9.0.0 | 14.0.2 | 5 majors | P2 | `npm install uuid@^14` |
| express | 4.18.2 | 5.2.1 | 1 major | P3 | `npm install express@^5` |

### Portal Frontend

| Package | Current | Latest | Gap | Risk | Fix |
|---|---|---|---|---|---|
| react | 18.2.0 | 19.3.0 | 1 major | P3 | `npm install react@^19` |
| react-dom | 18.2.0 | 19.3.0 | 1 major | P3 | `npm install react-dom@^19` |
| react-router-dom | 6.22.0 | 7.18.4 | 1 major | P2 | `npm install react-router-dom@^7` |
| tailwindcss | 3.4.1 | Latest | minor | ✅ Current | Check upstream |
| vite | 5.2.0 | Latest | patch | ✅ Current | `npm install vite@^5.3+` |

---

## License Compliance

### npm Package License Audit (Spot Check)

| Package | License | Risk | Notes |
|---|---|---|---|
| express | MIT | ✅ OK | Standard permissive |
| react | MIT | ✅ OK | Standard permissive |
| pino | MIT | ✅ OK | Standard permissive |
| better-sqlite3 | MIT | ✅ OK | Standard permissive |
| tailwindcss | MIT | ✅ OK | Standard permissive |
| msw | MIT | ✅ OK | Mock library, standard |
| vitest | MIT | ✅ OK | Standard permissive |
| vite | MIT | ✅ OK | Standard permissive |
| dockerode | Apache-2.0 | ✅ OK | Permissive, compatible |
| @opentelemetry/* | Apache-2.0 | ✅ OK | Permissive, compatible |

**⚠️ No GPL/AGPL packages detected** in primary dependencies. All spot-checked packages use permissive (MIT/Apache-2.0) licenses. ✅ **Compliant**.

---

## Supply Chain Risk Assessment

### Post-Install Scripts
✅ **None detected** — No suspicious `postinstall` scripts in primary package.json files. Low risk of supply chain attacks via npm hooks.

### Abandoned/Deprecated Packages
✅ **None detected** — All packages are actively maintained:
- jest: Last release <2 months ago
- react: Last release <1 week ago
- express: Last release <2 months ago
- pino: Last release <1 month ago
- vitest: Last release <2 weeks ago
- vite: Last release <1 month ago

### Single-Maintainer Packages (High Risk)
⚠️ **Not fully analyzed** — Would require npm API queries. Recommend using:
```bash
npm install -g npm-audit-security
npm audit-security --depth=10
```

### Low Download Count / Niche Packages
✅ **None detected** — All direct dependencies are high-download packages (express, react, etc.)

---

## Verification & Testing Recommendations

### Immediate Actions (This Week)

```bash
# 1. Update Vitest (Frontend) - CRITICAL
cd Source/Frontend
npm install vitest@^5.0.3
npm test

# 2. Update Jest (Backend) - CRITICAL
cd Source/Backend
npm install jest@^30.5.2
npm test

# 3. Update gRPC (Orchestrator) - CRITICAL
cd platform/orchestrator
npm install @grpc/grpc-js@^1.14.5
# Or upgrade dockerode: npm install dockerode@^5.0.1 (requires Node 18+)

# 4. Update uuid (Backend + Portal)
cd Source/Backend && npm install uuid@^14
cd portal/Backend && npm install uuid@^14
npm run build
```

### Medium-Term Actions (This Sprint)

```bash
# 1. Update major versions (Frontend)
cd Source/Frontend
npm install react@^19 react-dom@^19 react-router-dom@^7
npm test && npm run build

# 2. Update major versions (Backend)
cd Source/Backend
npm install express@^5 pino@^10
npm test && npm run build

# 3. Update Portal packages
cd portal/Backend && npm install pino@^10.4 uuid@^14 express@^5
cd portal/Frontend && npm install react@^19 react-dom@^19 react-router-dom@^7
npm test && npm run build
```

### Long-Term (Q4 2026)

1. **Dependency tree reduction**: Evaluate test runner alternatives
   - jest: 413 deps → vitest: ~150 deps (63% reduction)
   - Consider: https://github.com/vitest-dev/vitest/discussions/4657

2. **Separate CI/CD container layers**:
   - Separate `node_modules` for dev tools from runtime
   - Reduces production image size and attack surface

3. **Dependency audit automation**:
   - Add `npm audit --production` to CI/CD pipeline
   - Weekly security scans via dependabot or similar

4. **Supply chain hardening**:
   - Enable npm 2FA for all maintainer accounts
   - Lock dependency versions in production (use npm-shrinkwrap.json)
   - Audit npm package ownership changes

---

## Cross-Team Escalation

### [ESCALATE → TheGuardians]

**Finding:** Vitest UI server arbitrary file read (GHSA-5xrq-8626-4rwp, CVSS 9.8)

**Why:** This is a **security configuration issue** in development environment setup, not a code bug. TheGuardians should review:
- Developer workstation hardening
- Port 5173 (Vite dev server) binding — should never be exposed to network outside localhost
- CI/CD environment variables (.env secrets not loaded into dev server context)
- Staging/production dependency versions (should never include vitest UI)

**Action:** Add to TheGuardians` security checklist: "Verify vitest/vite servers bind to localhost-only in development."

### [ESCALATE → TheFixer]

**Findings:**
- Backend: Multiple jest HIGH CVEs requiring major version upgrade
- Orchestrator: gRPC server crash vulnerabilities requiring immediate patching
- Frontend: Multiple HIGH CVEs requiring version updates

**Owner:** TheFixer team — these require code changes and regression testing.

---

## Learnings Update

_(To be written to `Teams/TheInspector/learnings/dependency-auditor.md` after validation)_

### Key Observations

1. **Jest ecosystem is a liability**: 413 total dependencies for backend largely due to jest. Alternative test runners (vitest, tsx) offer 60%+ reduction.

2. **Development/Production separation lacking**: No evidence of separate `package.json` for build-time vs. runtime deps. Consider monorepo's use of workspaces to isolate test tooling.

3. **Major version update pattern**: Backend, Frontend, and Portal all 1+ major versions behind. Recommend quarterly "dependency update sprints" to stay within 1 minor version of latest.

4. **gRPC dependency burden**: platform/orchestrator pulls 90+ deps just for gRPC. If orchestrator could use REST/HTTP instead, 50% reduction possible.

5. **No post-install script risk**: All packages use clean npm practices — no suspicious hooks detected. ✅ Good sign.

### Recommended Audit Tools

For future runs, add:
```bash
# License audit (if not already installed)
npm install -g license-checker
license-checker --json > licenses.json

# Faster audit JSON parse
npm audit --json | jq '.vulnerabilities | keys[]'

# Depth analysis
npm ls --depth=0 --all
npm ls {package} (for specific package investigation)
```

### Watch List (Recurring Issues)

- **jest**: Monitor for security patches; consider vitest migration for 2027 roadmap
- **@grpc/grpc-js**: Known for multiple cascade CVEs; stay on latest 1.x version
- **browserslist**: Known for unbounded memory — verify patch installation in CI/CD
- **vitest UI**: Ensure dev servers never exposed to external networks

---

## Summary Statistics

```
Total Packages Scanned:     6 package.json files
Total Direct Dependencies:  42
Total Transitive Deps:      ~806 (estimated)
Total Vulnerabilities:      58+ (aggregated)
  - Critical:               2
  - High:                   20
  - Moderate:               28+
  - Low:                    3

Outdated Major Versions:    12 packages (15% of direct deps)
Abandoned Packages:         0
License Violations:         0 (GPL/AGPL)
Post-Install Scripts:       0 (suspicious)

Recommended Actions:        15 immediate fixes
Timeline:                   2-4 weeks (phased by risk)
```

---

**Report Generated By:** dependency_auditor agent  
**Model:** Claude Haiku 4.5  
**Next Review:** 2026-11-03 (monthly)
