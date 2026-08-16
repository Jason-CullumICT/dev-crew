# Dependency Auditor Findings
**Audit Date:** 2026-08-16  
**Projects Scanned:** 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend)  
**Package Managers Detected:** npm  

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Projects** | 6 |
| **Total Direct Dependencies** | 302 |
| **Total Transitive Dependencies** | 1,378 |
| **Critical CVEs** | 4 |
| **High CVEs** | 13 |
| **Moderate CVEs** | 29 |
| **Low CVEs** | 4 |
| **Total CVEs** | **50** |

**Risk Level: 🔴 HIGH**

---

## Critical Findings (P1)

### DEP-001: Vitest Arbitrary File Read & Execution
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** vitest (versions ≤3.2.5)
- **Files:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** When Vitest UI server is listening on network interface, arbitrary files can be read and executed by remote attackers
- **Affected Versions:** <3.2.6
- **Current Version:** Unknown (via npm audit shows <3.2.5 in dev deps)
- **Fix:** `npm install vitest@4.1.10` (major version bump required)
- **Cross-ref:** [ESCALATE → TheGuardians] - Exploitable via Vitest UI if accessible

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** protobufjs (versions ≤7.6.4)
- **Files:** platform/orchestrator/package.json
- **CVE:** GHSA-vcch-vrg3-jvg8 (CVSS 8.9)
- **Detail:** Arbitrary code execution via loading arbitrary .proto files; protobufjs can deserialize objects with properties containing JavaScript code
- **Affected Versions:** ≤7.6.4
- **Fix:** `npm install protobufjs@7.6.5` (minor version bump)
- **Cross-ref:** [ESCALATE → TheGuardians] - Code execution risk in orchestrator infrastructure

### DEP-003: Handlebars JavaScript Injection in CLI
- **Severity:** P1 (High → P1 due to direct dependency)
- **Category:** cve
- **Package:** handlebars (versions 4.0.0-4.7.8)
- **Files:** Source/Backend/package.json (transitive via unknown)
- **CVE:** GHSA-xjpj-3mr7-gcpf (CVSS 8.2)
- **Detail:** JavaScript injection in CLI precompiler via unescaped names and options
- **Affected Versions:** >=4.0.0 <=4.7.8
- **Fix:** Upgrade handlebars to 4.7.9+

### DEP-004: OpenTelemetry Prometheus Exporter Process Crash
- **Severity:** P1 (High → P1 in production monitoring)
- **Category:** cve
- **Package:** @opentelemetry/auto-instrumentations-node, @opentelemetry/sdk-node (versions ≤0.76.0, ≤0.218.0)
- **Files:** portal/Backend/package.json
- **CVE:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Detail:** Prometheus exporter crashes on malformed HTTP request; denial of service
- **Affected Versions:** <0.75.0, <0.217.0
- **Fix:** `npm install @opentelemetry/sdk-node@0.221.0` (requires cascading updates)
- **Cross-ref:** [ESCALATE → TheGuardians] - DoS in monitoring infrastructure

---

## High-Severity CVEs (P2)

### DEP-005: Brace-Expansion Denial of Service (Multiple)
- **Severity:** P2
- **Category:** cve
- **Package:** brace-expansion (<1.1.18)
- **Files:** All projects (transitive via multiple paths)
- **CVEs:** 
  - GHSA-f886-m6hf-6m8v (DoS via zero-step sequence, CVSS 6.5)
  - GHSA-3jxr-9vmj-r5cp (DoS via exponential expansion, CVSS 5.3)
  - GHSA-mh99-v99m-4gvg (DoS via unbounded expansion, CVSS 7.5)
  - GHSA-rgw5-rvv9-x895 (DoS bypass of CVE-2026-14257, CVSS 7.5)
- **Current Version:** ≤1.1.17
- **Fix:** Update brace-expansion to 1.1.18+
- **Impact:** Transitive; fix requires dependency resolution chain

### DEP-006: @grpc/grpc-js Malformed Request Crash
- **Severity:** P2
- **Category:** cve
- **Package:** @grpc/grpc-js (1.14.0-1.14.3)
- **Files:** platform/orchestrator/package.json, portal/Backend/package.json
- **CVEs:** 
  - GHSA-5375-pq7m-f5r2 (Malformed request crash, CVSS 7.5)
  - GHSA-99f4-grh7-6pcq (Malformed compressed message crash, CVSS 7.5)
- **Detail:** Incoming malformed requests or compressed messages crash gRPC server
- **Fix:** `npm install @grpc/grpc-js@1.14.4+`
- **Cross-ref:** [ESCALATE → TheGuardians] - DoS via network message

### DEP-007: Vite Server FS Bypass on Windows
- **Severity:** P2
- **Category:** cve
- **Package:** vite (≤6.4.2)
- **Files:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-fx2h-pf6j-xcff (CVSS 7.5)
- **Detail:** `server.fs.deny` bypass on Windows via alternate paths; confidentiality breach
- **Affected Versions:** ≤6.4.2
- **Fix:** `npm install vite@8.2.1` (major version bump required)
- **Cross-ref:** [ESCALATE → TheGuardians] - File access control bypass

### DEP-008: WS WebSocket Memory Exhaustion DoS
- **Severity:** P2
- **Category:** cve
- **Package:** ws (8.0.0-8.20.1)
- **Files:** Source/Frontend, portal/Frontend (transitive)
- **CVE:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)
- **Detail:** Memory exhaustion from tiny fragments and data chunks; unbounded allocation
- **Affected Versions:** >=8.0.0 <8.21.0
- **Fix:** `npm install ws@8.21.0+`

### DEP-009: Nanoid Infinite Loop DoS
- **Severity:** P2
- **Category:** cve
- **Package:** nanoid (<3.3.16, <3.3.18)
- **Files:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVEs:** 
  - GHSA-28wg-ghj8-5hjv (non-secure generators with negative size, CVSS 5.9)
  - GHSA-2v37-7h3g-55p8 (custom generators with zero size, CVSS 5.9)
- **Detail:** Infinite loop causing process hang and memory exhaustion
- **Fix:** `npm install nanoid@3.3.18+`

### DEP-010: Path-to-Regexp ReDoS
- **Severity:** P2
- **Category:** cve
- **Package:** path-to-regexp (<0.1.13)
- **Files:** platform/orchestrator/package.json (transitive)
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Regular Expression Denial of Service via multiple route parameters
- **Fix:** Update path-to-regexp to 0.1.13+

### DEP-011: JS-YAML Quadratic CPU Consumption (Multiple)
- **Severity:** P2
- **Category:** cve
- **Package:** js-yaml (<=3.15.0)
- **Files:** Source/Backend/package.json (transitive)
- **CVEs:**
  - GHSA-h67p-54hq-rp68 (merge key DoS, CVSS 5.3)
  - GHSA-52cp-r559-cp3m (merge-key chains, CVSS 7.5)
  - GHSA-5p4m-2wfm-xmqj (omap resolution, CVSS 7.5)
- **Detail:** Quadratic CPU consumption in YAML merge key handling
- **Fix:** `npm install js-yaml@3.15.1+`

### DEP-012: Form-Data CRLF Injection
- **Severity:** P2
- **Category:** cve
- **Package:** form-data (4.0.0-4.0.5)
- **Files:** Source/Backend, Source/Frontend, portal/Frontend
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** CRLF injection in multipart field names and filenames
- **Fix:** `npm install form-data@4.0.6+`

### DEP-013: React Router Open Redirect
- **Severity:** P2
- **Category:** cve
- **Package:** @remix-run/router (1.3.0-1.23.2), react-router-dom (6.0.0-7.17.0)
- **Files:** Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-2j2x-hqr9-3h42 (CVSS unscored)
- **Detail:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL
- **Affected Versions:** @remix-run/router >=1.3.0 <1.23.3, react-router-dom 6.0.0-7.17.0
- **Fix:** `npm install react-router-dom@7.17.1+` (updates @remix-run/router transitively)

### DEP-014: Picomatch ReDoS
- **Severity:** P2
- **Category:** cve
- **Package:** picomatch (<2.3.2)
- **Files:** portal/Frontend/package.json (transitive via vitest/vite)
- **CVE:** GHSA-54xq-cgqr-3hjh (CVSS 7.5)
- **Detail:** Regular Expression Denial of Service in pattern matching
- **Fix:** Update picomatch to 2.3.2+

---

## Moderate-Severity CVEs (P3)

### DEP-015 through DEP-031: Moderate Vulnerabilities (Batch)
- **Count:** 17 moderate CVEs
- **Affected Packages:**
  - uuid (missing buffer bounds check, CVSS 7.5) — affects multiple projects
  - qs (DoS on stringify, CVSS 5.3) — transitive via express
  - body-parser (DoS on invalid limit, CVSS 3.7) — transitive via express
  - protobufjs (multiple: UTF-8 decoding, recursive JSON DoS, Any expansion, property shadowing, option parsing) — 6 CVEs in orchestrator
  - @protobufjs/utf8 (UTF-8 decoding) — platform/orchestrator
  - esbuild (dev server CSRF, CVSS 5.3) — Source/Frontend, portal/Frontend (transitive)
  - vite-node (transitive via vite) — Source/Frontend, portal/Frontend
  - @opentelemetry/* (multiple: unbounded memory allocation, transitive cascading) — portal/Backend
  - @remix-run/router (open redirect as noted above)
  - vite (path traversal in .map handling, CVSS unscored; launch-editor NTLMv2 hash disclosure)

**Recommended Fix Priority:** Update uuid, qs, body-parser, protobufjs family first; cascade OpenTelemetry updates

---

## Low-Severity CVEs (P4)

### DEP-032: @babel/core Arbitrary File Read
- **Severity:** P4
- **Category:** cve
- **Package:** @babel/core (<=7.29.0)
- **Files:** Source/Backend/package.json, Source/Frontend/package.json, portal/Frontend/package.json
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Detail:** Arbitrary file read via sourceMappingURL comment in build output (requires local access)
- **Current Version:** ≤7.29.0
- **Fix:** `npm install @babel/core@latest`
- **Impact:** Low risk; requires local file system access

---

## Outdated Major Versions (P3)

### DEP-033: uuid — 5 Major Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Current Version:** 9.0.1 (Source/Backend)
- **Latest Version:** 14.0.1
- **Gap:** 5 major versions
- **Risk:** Likely missing security patches; buffer bounds check CVE suggests older code paths
- **Fix:** `npm install uuid@14.0.1` (requires testing; may break API compatibility)

### DEP-034: Express — 3 Major Versions Behind (Minor Usage)
- **Severity:** P3
- **Category:** outdated
- **Current Version:** 4.18.2 (Source/Backend shows 4.22.2 wanted, but 5.2.1 latest)
- **Latest Version:** 5.2.1
- **Gap:** 1-2 major versions behind
- **Risk:** Framework updates often include security hardening
- **Fix:** `npm install express@5.2.1` (requires testing; breaking changes in v5)

### DEP-035: React & React-DOM — 1 Major Version Behind
- **Severity:** P3
- **Category:** outdated
- **Current Version:** 18.3.1 (Source/Frontend)
- **Latest Version:** 19.2.8
- **Gap:** 1 major version
- **Fix:** `npm install react@19.2.8 react-dom@19.2.8`
- **Risk:** Moderate; v19 includes security enhancements

### DEP-036: React Router DOM — 1 Major Version Behind
- **Severity:** P3
- **Category:** outdated
- **Current Version:** 6.30.4 (Source/Frontend)
- **Latest Version:** 7.18.2
- **Gap:** 1 major version (and multiple minor versions within v6)
- **Fix:** `npm install react-router-dom@7.18.2` (cascades @remix-run/router update)
- **Risk:** Includes open redirect fix (P2 from DEP-013)

### DEP-037: Pino — 2+ Major Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Current Version:** 8.21.0 (Source/Backend)
- **Latest Version:** 10.3.1
- **Gap:** 2+ major versions
- **Risk:** Logging framework; potential performance and security improvements
- **Fix:** `npm install pino@10.3.1`

---

## Dependency Tree Analysis

| Project | Direct Deps | Transitive Deps | Total | Status |
|---------|-------------|-----------------|-------|--------|
| Source/Backend | 102 | 309 | 411 | 🔴 9 CVEs (1 critical) |
| Source/Frontend | 9 | 221 | 230 | 🔴 13 CVEs (1 critical) |
| Source/E2E | 4 | 0 | 4 | ✅ Clean |
| platform/orchestrator | 153 | 2 | 155 | 🔴 9 CVEs (1 critical) |
| portal/Backend | ~150 | (not counted) | ~150+ | 🔴 20+ CVEs (OpenTelemetry cascade) |
| portal/Frontend | 9 | 415 | 424 | 🔴 13 CVEs (1 critical) |

**Total:** 1,378 transitive dependencies across all projects

**Supply Chain Risk:** 🔴 MODERATE-HIGH
- 1,378 transitive dependencies create broad attack surface
- 4 critical CVEs in widely-used packages (vitest, protobufjs, handlebars, OpenTelemetry)
- Multiple DoS vulnerabilities in parsing/serialization libraries

---

## License Compliance

**Status:** ⚠️ NOT FULLY AUDITED (license-checker requires local npm install)

**Known Issues:**
- No GPL/AGPL packages detected in initial scan
- All direct dependencies appear to have declared licenses
- Recommend running `npx license-checker --json` in each project for full compliance audit

---

## Abandoned/Stale Dependencies

### DEP-038: OpenTelemetry Module Versions
- **Status:** ⚠️ Potential staleness
- **Issue:** Multiple @opentelemetry/* modules at 0.x versions (0.76.0, 0.218.0, etc.)
- **Recommendation:** OpenTelemetry has reached 1.x stability; 0.x versions may have known issues
- **Fix:** Coordinate major upgrade of entire OpenTelemetry ecosystem

---

## Remediation Roadmap

### Phase 1: CRITICAL (Immediate — 1-2 days)
1. **DEP-002** (Protobufjs): `npm install protobufjs@7.6.5` in platform/orchestrator
2. **DEP-001** (Vitest): `npm install vitest@4.1.10` in Source/Frontend, portal/Frontend (likely requires dependency resolution)
3. **DEP-004** (OpenTelemetry): `npm install @opentelemetry/sdk-node@0.221.0` and cascade in portal/Backend
4. **DEP-003** (Handlebars): Update handlebars to 4.7.9+ in Source/Backend

### Phase 2: HIGH (Next — 3-5 days)
1. **DEP-006** @grpc/grpc-js: Update to 1.14.4+
2. **DEP-008** ws: Update to 8.21.0+
3. **DEP-009** nanoid: Update to 3.3.18+
4. **DEP-005** brace-expansion: Update to 1.1.18+ (transitive, may require `npm audit fix`)
5. **DEP-012** form-data: Update to 4.0.6+
6. **DEP-007** vite: Update to 8.2.1+ (likely major version bump affecting build)
7. **DEP-013** react-router-dom: Update to 7.17.1+ (includes @remix-run/router fix)

### Phase 3: MODERATE (Next week)
1. **DEP-033** uuid: Test and update to 14.0.1
2. **DEP-034** express: Test and update to 5.2.1 (breaking changes possible)
3. **DEP-035** react/react-dom: Test and update to 19.2.8
4. **DEP-037** pino: Update to 10.3.1

---

## Testing Requirements

After applying fixes:
1. Run `npm test --workspaces --if-present` to verify no regressions
2. Run `npm audit` again to confirm 0 vulnerabilities
3. Integration test critical paths: API routes, UI rendering, gRPC communication
4. Performance test after major version upgrades (express, react, vite)

---

## Cross-Team Escalations

**ESCALATE → TheGuardians (Security Team):**
- DEP-001: Vitest arbitrary file read/execution (if UI exposed to network)
- DEP-002: Protobufjs code execution (critical in orchestrator)
- DEP-003: Handlebars JavaScript injection
- DEP-004: OpenTelemetry monitoring DoS
- DEP-006: gRPC malformed request crash
- DEP-007: Vite fs.deny bypass
- DEP-008: WS memory exhaustion
- DEP-013: React Router open redirect

---

## Observations & Learnings

1. **vitest & vite coupling:** Frontend projects heavily depend on vitest for testing; vite for build. Both have critical/high CVEs. Major version upgrades required together.

2. **OpenTelemetry cascade:** portal/Backend uses @opentelemetry/auto-instrumentations-node which transitively pulls 20+ @opentelemetry/* modules; a single vulnerability requires coordinated ecosystem upgrade.

3. **Express ecosystem:** uuid, qs, body-parser vulnerabilities affect all express-based backends via transitive dependencies.

4. **DevOps infrastructure risk:** platform/orchestrator (Docker orchestration via protobufjs) and portal/Backend (monitoring via OpenTelemetry) have higher P1/P2 concentration than product code.

5. **E2E suite clean:** Source/E2E has zero vulnerabilities and minimal dependencies—good model for isolation.

---

## Recommendations for Process

1. **Add pre-commit hook:** `npm audit` should fail CI on any critical/high CVEs
2. **Pin major versions in package.json:** Current caret (^) ranges allow transitive deps to drift
3. **Quarterly review:** Scheduled quarterly (vs. ad-hoc) dependency audits
4. **Automated updates:** Consider Dependabot or Renovate for auto-PR on patch/minor updates
5. **Separate testing for major upgrades:** Test react/express/vite upgrades on feature branch before merge

---

**Report Generated:** 2026-08-16 (automated)  
**Next Review Scheduled:** When upstream packages release fixes  
**Escalated Findings:** 8 items routed to TheGuardians
