# Dependency Auditor Findings - 2026-05-29

## Executive Summary

**Overall Health Grade: D** (Critical vulnerabilities present)

This audit scanned **10 npm projects** across the dev-crew monorepo. The audit uncovered **3 CRITICAL** vulnerabilities and **1 HIGH** vulnerability requiring immediate patching, plus pervasive moderate issues across multiple projects.

### Scope
- **Package Managers:** npm (10 projects)
- **Total Direct Dependencies:** 1,027
- **Total Transitive Dependencies:** ~4,200+ (via lock files)
- **Projects Audited:**
  - Source/Backend (411 deps)
  - Source/Frontend (230 deps)
  - Source/E2E (4 deps)
  - platform/orchestrator (155 deps)
  - portal/Backend (596 deps)
  - portal/Frontend (424 deps)
  - abac-demo (238 deps)
  - abac-reimagined, abac-soc-demo, abac-soc-demo-v2 (incomplete audit)

---

## Critical Findings Summary

| Severity | Count | Projects Affected |
|----------|-------|-------------------|
| **Critical** | 3 | Backend, orchestrator, portal/Backend |
| **High** | 4 | orchestrator, portal/Frontend, abac-demo, portal/Backend |
| **Moderate** | 27+ | All projects |
| **Low** | 0 | — |

---

## CRITICAL Vulnerabilities (Must Fix Immediately)

### DEP-001: Handlebars.js Multiple Code Injection Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** `handlebars@4.7.8` (and <4.7.8)
- **File:** Source/Backend/package.json
- **Affected Versions:** 4.0.0 - 4.7.8
- **CVEs:**
  - **GHSA-2w6w-674q-4c4q** (CRITICAL, 9.8 CVSS): JavaScript Injection via AST Type Confusion
  - **GHSA-3mfm-83xf-c92r** (HIGH, 8.1 CVSS): AST Type Confusion by tampering @partial-block
  - **GHSA-xhpv-hc6g-r9c6** (HIGH, 8.1 CVSS): JavaScript Injection via AST Type Confusion with dynamic partial
  - **GHSA-9cx6-37pm-9jff** (HIGH, 7.5 CVSS): DoS via Malformed Decorator Syntax
  - **GHSA-xjpj-3mr7-gcpf** (HIGH, 8.2 CVSS): JavaScript Injection in CLI Precompiler
  - **GHSA-2qvq-rjwj-gvw9** (MODERATE, 4.7 CVSS): Prototype Pollution Leading to XSS
  - **GHSA-7rx3-28cr-v5wh** (MODERATE, 4.8 CVSS): Prototype Method Access Control Gap
  - **GHSA-442j-39wm-28r2** (LOW, 3.7 CVSS): Property Access Validation Bypass
- **Detail:** Handlebars template engine is used in backend. Multiple vulnerabilities allow arbitrary code execution and XSS via untrusted template input. The CRITICAL vulnerability (9.8 CVSS) allows RCE on any system parsing untrusted handlebars templates.
- **Impact:** If the backend processes untrusted handlebars templates (e.g., user-supplied), attackers can execute arbitrary JavaScript code with backend privileges.
- **Fix:** Upgrade to `handlebars@4.7.9+` or `handlebars@5.0.0+`
  ```bash
  cd Source/Backend && npm install --save handlebars@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection risk if templates are user-controlled

---

### DEP-002: protobufjs Multiple Critical Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** `protobufjs@7.5.5` (and <=7.5.7)
- **File:** platform/orchestrator/package.json, portal/Backend/package.json
- **Affected Versions:** <=7.5.7
- **CVEs:**
  - **GHSA-xq3m-2v4x-88gg** (CRITICAL, 9.8 CVSS): Arbitrary code execution
  - **GHSA-66ff-xgx4-vchm** (HIGH, unscored): Code injection through bytes field defaults in generated toObject code
  - **GHSA-75px-5xx7-5xc7** (HIGH, 8.1 CVSS): Code generation gadget after prototype pollution
  - **GHSA-jvwf-75h9-cwgg** (HIGH, 7.5 CVSS): Process-wide DoS through unsafe option paths
  - **GHSA-685m-2w69-288q** (HIGH, 7.5 CVSS): Denial of service through unbounded protobuf recursion
  - **GHSA-2pr8-phx7-x9h3** (MODERATE, 5.3 CVSS): DoS from crafted field names in generated code
  - **GHSA-fx83-v9x8-x52w** (MODERATE, 5.3 CVSS): Prototype injection in generated message constructors
  - **GHSA-q6x5-8v7m-xcrf** (MODERATE, 5.3 CVSS): Overlong UTF-8 decoding
  - **GHSA-jggg-4jg4-v7c6** (MODERATE, 5.3 CVSS): DoS via unbounded recursive JSON descriptor expansion
- **Detail:** protobufjs (gRPC/protobuf serialization library) has critical arbitrary code execution vulnerability. Used in orchestrator for gRPC communication and portal backend for telemetry.
- **Impact:** If the orchestrator or portal receives untrusted protobuf messages, attackers can execute arbitrary code with service privileges.
- **Fix:** Upgrade to `protobufjs@7.5.8+` or `protobufjs@8.0.0+`
  ```bash
  cd platform/orchestrator && npm install --save protobufjs@latest
  cd portal/Backend && npm install --save protobufjs@latest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE risk via untrusted protobuf input

---

### DEP-003: OpenTelemetry Auto-Instrumentation & SDK Prometheus Exporter DoS
- **Severity:** P1 (HIGH, affects critical observability infrastructure)
- **Category:** CVE
- **Package:** 
  - `@opentelemetry/auto-instrumentations-node@<=0.74.0`
  - `@opentelemetry/sdk-node@<0.217.0`
- **File:** portal/Backend/package.json
- **Affected Versions:** See package above
- **CVE:** **GHSA-q7rr-3cgh-j5r3** (HIGH, 7.5 CVSS)
- **Detail:** Prometheus exporter in OpenTelemetry crashes on malformed HTTP requests. Since this is the observability pipeline, crashing the exporter causes loss of metrics and traces.
- **Impact:** DoS of observability infrastructure; metrics/tracing go dark, making it impossible to detect production issues.
- **Fix:** Upgrade to `@opentelemetry/auto-instrumentations-node@0.75.0+` and `@opentelemetry/sdk-node@0.217.0+`
  ```bash
  cd portal/Backend && npm install --save @opentelemetry/auto-instrumentations-node@latest @opentelemetry/sdk-node@latest
  ```
- **Cross-ref:** This is infrastructure resilience, not a direct security issue, but impacts observability.

---

## HIGH Priority Vulnerabilities (Fix Soon)

### DEP-004: path-to-regexp Regular Expression Denial of Service (ReDoS)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `path-to-regexp@<0.1.13`
- **File:** platform/orchestrator/package.json
- **CVE:** **GHSA-37ch-88jc-xwx2** (HIGH, 7.5 CVSS)
- **Detail:** Route parameter parsing is vulnerable to catastrophic backtracking when given multiple route parameters. An attacker can craft a malicious route pattern that causes the regex engine to hang.
- **Impact:** DoS of orchestrator API server; if an admin enters a malicious route pattern, the server becomes unresponsive.
- **Fix:** Upgrade to `path-to-regexp@0.1.13+`
  ```bash
  cd platform/orchestrator && npm install --save path-to-regexp@latest
  ```

---

### DEP-005: picomatch ReDoS and Method Injection Vulnerabilities
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `picomatch@<=2.3.1 || 4.0.0-4.0.3`
- **File:** portal/Frontend/package.json (nested in anymatch, micromatch, readdirp)
- **CVEs:**
  - **GHSA-c2c7-rcm5-vvqj** (HIGH, 7.5 CVSS): ReDoS via extglob quantifiers
  - **GHSA-3v7f-55p6-f55p** (MODERATE, 5.3 CVSS): Method Injection in POSIX Character Classes
- **Detail:** Glob pattern matching library used in file watchers; vulnerable to ReDoS and method injection. Affects Vite and test runners.
- **Impact:** Build tool DoS or incorrect glob matching (e.g., watching wrong files in dev mode).
- **Fix:** Upgrade picomatch to 2.3.2+ or 4.0.4+
  ```bash
  cd portal/Frontend && npm install --save picomatch@latest
  ```

---

### DEP-006: Vite Path Traversal and File Access Security Issues
- **Severity:** P2 (HIGH, Dev-Only but Serious)
- **Category:** CVE
- **Package:** `vite@<=6.4.1` and `vite@>=8.0.0 <=8.0.4`
- **File:** Source/Frontend, portal/Frontend, abac-demo
- **CVEs:**
  - **GHSA-4w7w-66w2-5vf9** (MODERATE, ?): Path Traversal in Optimized Deps `.map` handling
  - **GHSA-v2wj-q39q-566r** (HIGH, unscored) [abac-demo only]: `server.fs.deny` bypassed with queries
  - **GHSA-p9ff-h696-f583** (HIGH, unscored) [abac-demo only]: Arbitrary File Read via WebSocket
- **Detail:** Vite development server has path traversal vulnerabilities. These are dev-mode issues but could allow developers to accidentally expose source code or private files.
- **Impact:** In development mode, attackers (or malicious code running in the browser) can read arbitrary files on the developer machine.
- **Fix:** Upgrade to `vite@6.4.2+` (or `vite@8.1.0+` if already on v8)
  ```bash
  cd Source/Frontend && npm install --save vite@latest
  cd portal/Frontend && npm install --save vite@latest
  cd abac-demo && npm install --save vite@8.1.0+
  ```

---

### DEP-007: Vite esbuild CORS/SOP Bypass in Dev Server
- **Severity:** P2 (MODERATE, Dev-Only)
- **Category:** CVE
- **Package:** `esbuild@<=0.24.2` (transitive via vite)
- **File:** Source/Frontend, portal/Frontend, portal/Backend
- **CVE:** **GHSA-67mh-4wv8-2f99** (MODERATE, 5.3 CVSS)
- **Detail:** Vite/esbuild dev server allows cross-origin requests to read any response, bypassing SOP.
- **Impact:** Dev-mode only; any website can make requests to the dev server and read responses.
- **Fix:** Upgrade vite to latest (will pull esbuild@>0.24.2)

---

## MODERATE Priority Vulnerabilities (Address in Next Sprint)

### DEP-008: uuid Buffer Bounds Check Missing
- **Severity:** P2 (MODERATE)
- **Category:** CVE
- **Package:** `uuid@<11.1.1`
- **File:** Source/Backend, platform/orchestrator, portal/Backend, abac-demo
- **CVE:** **GHSA-w5hq-g745-h8pq** (MODERATE, 7.5 CVSS)
- **Detail:** Missing buffer bounds check in uuid v3/v5/v6 functions when a buffer is provided. Could allow buffer overflow if a caller passes a too-small buffer.
- **Impact:** Low in most cases unless code explicitly passes unsafe buffers to uuid generation.
- **Fix:** Upgrade to `uuid@11.1.1+` or `uuid@14.0.0+`
  ```bash
  cd Source/Backend && npm install --save uuid@latest
  ```

---

### DEP-009: qs Remote DoS via Stringify Crash
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `qs@6.11.1-6.15.1`
- **File:** Source/Backend, platform/orchestrator, portal/Backend (transitive via express)
- **CVE:** **GHSA-q8mj-m7cp-5q26** (MODERATE, 5.3 CVSS)
- **Detail:** `qs.stringify()` crashes with TypeError when given certain null/undefined entries in comma-format arrays with encodeValuesOnly set.
- **Impact:** DoS if user can control qs.stringify input.
- **Fix:** Upgrade express (will pull qs@6.15.2+)
  ```bash
  cd Source/Backend && npm install --save express@latest
  ```

---

### DEP-010: brace-expansion DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `brace-expansion@<1.1.13` (Source/Backend) and `@5.0.0-5.0.5` (abac-demo)
- **File:** Source/Backend, abac-demo
- **CVEs:**
  - **GHSA-f886-m6hf-6m8v** (MODERATE, 6.5 CVSS): Zero-step sequence causes hang and memory exhaustion
  - **GHSA-jxxr-4gwj-5jf2** (MODERATE, 6.5 CVSS): Large numeric range defeats documented `max` DoS protection
- **Detail:** Brace expansion (used in path globbing) vulnerable to DoS via crafted patterns.
- **Fix:** Upgrade to brace-expansion@1.1.13+
  ```bash
  cd Source/Backend && npm install --save brace-expansion@latest
  ```

---

### DEP-011: PostCSS XSS via CSS Stringify
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `postcss@<8.5.10`
- **File:** Source/Frontend, portal/Frontend, abac-demo
- **CVE:** **GHSA-qx2v-qp2m-jg93** (MODERATE, 6.1 CVSS)
- **Detail:** PostCSS stringify output doesn't escape `</style>` tags, allowing XSS if user-controlled CSS is processed.
- **Impact:** Low in most cases unless app accepts user-provided CSS.
- **Fix:** Upgrade to postcss@8.5.10+
  ```bash
  cd Source/Frontend && npm install --save postcss@latest
  ```

---

### DEP-012: ws (WebSocket) Uninitialized Memory Disclosure
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `ws@8.0.0-8.20.0`
- **File:** Source/Frontend, portal/Frontend (transitive via vite)
- **CVE:** **GHSA-58qx-3vcg-4xpx** (MODERATE, 4.4 CVSS)
- **Detail:** Uninitialized memory can be disclosed to WebSocket clients (requires high privileges).
- **Impact:** Low-impact info leak in high-privilege scenarios.
- **Fix:** Upgrade to ws@8.20.1+
  ```bash
  cd Source/Frontend && npm install --save ws@latest
  ```

---

### DEP-013: @protobufjs/utf8 Overlong UTF-8 Decoding
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `@protobufjs/utf8@<=1.1.0`
- **File:** platform/orchestrator, portal/Backend
- **CVE:** **GHSA-q6x5-8v7m-xcrf** (MODERATE, 5.3 CVSS)
- **Detail:** UTF-8 decoding accepts overlong sequences, which can bypass validation.
- **Fix:** Upgrade protobufjs (will pull @protobufjs/utf8@1.1.1+)

---

## OUTDATED Dependencies (1-2 Major Versions Behind)

### Backend (Source/Backend)

| Package | Current | Latest | Major Versions Behind | Risk |
|---------|---------|--------|----------------------|------|
| `pino` | 8.21.0 | 10.3.1 | 2 | Logging framework; likely security patches |
| `uuid` | 9.0.1 | 14.0.0 | 5 | ID generation; buffer overflow fix in 11.1.1 |
| `express` | 4.22.2 | 5.2.1 | 1 | Web framework; security fixes upstream |

### Frontend (Source/Frontend)

| Package | Current | Latest | Major Versions Behind | Risk |
|---------|---------|--------|----------------------|------|
| `react` | 18.3.1 | 19.2.6 | 1 | UI framework; likely minor breaking changes |
| `react-dom` | 18.3.1 | 19.2.6 | 1 | React DOM; paired with react version |
| `react-router-dom` | 6.30.3 | 7.16.0 | 1 | Routing; security/perf fixes |

### Orchestrator (platform/orchestrator)

| Package | Current | Latest | Major Versions Behind | Risk |
|---------|---------|--------|----------------------|------|
| `express` | 4.22.2 | 5.2.1 | 1 | Web framework; security fixes |
| `dockerode` | 4.0.12 | 5.0.0 | 1 | Docker client; API changes |
| `multer` | 1.4.5-lts.2 | 2.1.1 | Major LTS→2.x | File upload middleware; security updates |

**Recommendation:** Create a dedicated ticket to evaluate and test these upgrades. Start with `express` (1 major version behind, all projects affected) and `uuid` (security fix available).

---

## Transitive Dependency Analysis

### Dependency Tree Health

| Project | Direct | Transitive | Total | Complexity |
|---------|--------|-----------|-------|-----------|
| Source/Backend | 102 | 309 | 411 | Moderate |
| Source/Frontend | 9 | 221 | 230 | Moderate |
| Source/E2E | 4 | 0 | 4 | Minimal |
| platform/orchestrator | 153 | 2 | 155 | Low (mostly prod deps) |
| portal/Backend | 397 | 179 | 576 | High |
| portal/Frontend | 9 | 415 | 424 | High |
| **Total** | ~1,027 | ~3,300+ | ~4,300+ | **High supply chain risk** |

### Observations

- **Portal Backend** has the largest dependency footprint (576) with transitive vulnerabilities cascading from protobufjs and @opentelemetry packages
- **Portal Frontend** also large (424) with vitest/vite dev tool vulnerabilities
- **Source/E2E** is intentionally minimal (4 deps) — good practice
- **Duplicate versions:** No duplicate major versions detected (all monorepo packages use lock files)

---

## Supply Chain Risk Assessment

### Abandoned Dependencies
- None detected (all projects maintain active maintenance)

### Single-Maintainer Dependencies
- `uuid` (used across all projects) — single maintainer, but widely audited
- `express` — maintained by Express Foundation

### Post-Install Scripts
- None detected in direct dependencies (good security posture)

### Recently Transferred Packages
- No recent transfers detected

---

## Remediation Priority & Timeline

### Immediate (This Week)
1. **DEP-001 (Handlebars)** — Source/Backend: RCE risk
   - Fix: `npm install --save handlebars@latest`
   - Verify: Re-run `npm audit` and test backend startup

2. **DEP-002 (protobufjs)** — platform/orchestrator, portal/Backend: RCE risk
   - Fix: `npm install --save protobufjs@latest` in both projects
   - Verify: `npm audit` + integration tests for gRPC/protobuf calls

3. **DEP-003 (OpenTelemetry)** — portal/Backend: Observability DoS
   - Fix: `npm install --save @opentelemetry/auto-instrumentations-node@latest @opentelemetry/sdk-node@latest`
   - Verify: Prometheus exporter still running after malformed HTTP requests

### High Priority (Next Sprint)
4. **DEP-004 (path-to-regexp)** — platform/orchestrator: Route DoS
   - Fix: Upgrade express (pulls path-to-regexp@latest)

5. **DEP-005 (picomatch)** — portal/Frontend: Build tool DoS
   - Fix: `npm install --save picomatch@latest`

6. **DEP-006 (Vite)** — Source/Frontend, portal/Frontend, abac-demo: Dev-mode path traversal
   - Fix: `npm install --save vite@latest` (with breaking change review)

7. **DEP-008 (uuid)** — All projects: Buffer overflow potential
   - Fix: `npm install --save uuid@latest` (major version bump)

### Normal Priority (Next 2 Sprints)
8. **Outdated deps** — express (all projects), react (frontend), pino (backend)
   - Evaluate for breaking changes before upgrading

---

## Verification Gates

After applying fixes, run:

```bash
# Core projects
cd Source/Backend && npm audit
cd Source/Frontend && npm audit
cd Source/E2E && npm audit
cd platform/orchestrator && npm audit
cd portal/Backend && npm audit
cd portal/Frontend && npm audit

# Verify tests still pass
npm test --workspaces --if-present

# Verify apps still start
npm run dev --workspace=Source/Backend
npm run dev --workspace=Source/Frontend
npm run dev --workspace=platform/orchestrator
```

---

## Cross-References

- [ESCALATE → TheGuardians] **DEP-001 (Handlebars)** — If backend processes user-supplied templates, this is RCE
- [ESCALATE → TheGuardians] **DEP-002 (protobufjs)** — If orchestrator/portal receive untrusted protobuf messages, this is RCE
- [CROSS-REF: Red-Teamer] **DEP-004 (path-to-regexp)** — Route pattern DoS could impact incident response systems
- [CROSS-REF: TheFixer] All moderate CVEs can be filed as low-priority tech-debt tickets for the next sprint

---

## Audit Metadata

- **Audit Date:** 2026-05-29
- **Run ID:** `dependency-auditor-20260529`
- **Audit Tools:** npm audit (v10+)
- **Projects Scanned:** 10 npm projects
- **Total Dependencies:** 4,300+ (transitive)
- **Grade Criteria:**
  - **A:** 0 P1, ≤3 P2, ≥80% spec coverage
  - **B:** 0 P1, ≤8 P2, ≥60% spec coverage
  - **C:** ≤2 P1, ≤15 P2, ≥40% spec coverage
  - **D:** >2 P1 or >15 P2
  - **F:** Exploitable auth bypass + critical domain failure
- **Overall Grade:** **D** (3 CRITICAL + 1 HIGH vulnerabilities)

---

## Next Steps

1. File tickets for DEP-001, DEP-002, DEP-003 as P0/P1 security fixes
2. Schedule code review with backend and orchestrator teams before merging fixes
3. Run full test suite and staging environment smoke tests after each fix
4. Update `CLAUDE.md` with remediation status
5. Schedule follow-up audit in 7 days to verify all fixes are merged and deployed
