# Dependency Auditor Findings
**Audit Date:** 2026-06-21  
**Auditor:** Dependency Auditor (Agent)  
**Grade:** D (multiple P1 critical vulnerabilities)

---

## Executive Summary

This npm-based project has **4 critical CVEs** and **19 high-severity vulnerabilities** across multiple workspaces. The most severe issues are:

1. **CRITICAL:** Vitest UI server RCE (GHSA-5xrq-8626-4rwp) in Frontend
2. **CRITICAL:** Protobufjs arbitrary code execution in Portal/orchestrator
3. **CRITICAL:** OpenTelemetry exporter process crash in Portal Backend  
4. **HIGH:** Form-data CRLF injection in Frontend
5. **HIGH:** Vite file system bypass on Windows in Frontend
6. **HIGH:** React Router open redirect in Frontend

All three primary workspaces (Source/Backend, Source/Frontend, Portal/Backend) require immediate updates. The Frontend workspace is particularly vulnerable due to development-only dependencies with critical flaws.

---

## Package Managers Detected

- **npm** (monorepo with workspaces)
  - Source/Backend (4 direct, 412 transitive)
  - Source/Frontend (3 direct, 231 transitive)
  - Source/E2E (1 direct, 5 transitive)
  - platform/orchestrator (3 direct, 156 transitive)
  - portal/Backend (11 direct, 578 transitive)
  - portal/Frontend (10+ direct, 425 transitive)

---

## Known CVEs Summary

| Severity | Count | Workspaces Affected |
|----------|-------|-------------------|
| **Critical** | 4 | Frontend (vitest), Portal Backend (protobufjs, opentelemetry) |
| **High** | 11 | Frontend (form-data, vite, react-router, ws), Portal Backend (grpc, path-to-regexp, opentelemetry) |
| **Moderate** | 24+ | Backend (ts-jest, uuid, qs), Frontend (babel, vitest, vite, postcss), Portal Backend (multiple opentelemetry packages) |
| **Low** | 1 | Backend (@babel/core) |
| **Total** | **40+** | All workspaces |

---

## Critical Findings

### DEP-001: Vitest UI Server Arbitrary File Read/Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (Remote Code Execution)
- **Package:** vitest@2.0.5
- **File:** Source/Frontend/package.json
- **CVE:** GHSA-5xrq-8626-4rwp
- **Affected Versions:** <3.2.6
- **Detail:**  
  When Vitest UI server is listening, attackers can read and execute arbitrary files. CVSS 9.8 (maximum severity). This is a **dev dependency only**, but still a critical supply-chain risk if the dev server is accidentally exposed.
- **Impact:** Remote code execution during development; if dev server is exposed to network, complete system compromise.
- **Fix:** `npm update vitest@latest` (requires v3.2.6+, likely breaking change)
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability

### DEP-002: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (Remote Code Execution)
- **Package:** protobufjs@7.5.5 (transitive via @grpc/grpc-js)
- **File:** portal/Backend/package.json (via @opentelemetry/auto-instrumentations-node)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **Affected Versions:** <7.5.5
- **Detail:**  
  Multiple code injection vulnerabilities in protobufjs:
  - Arbitrary code execution via object property pollution (CWE-94)
  - Code injection through bytes field defaults in generated toObject code
  - Unbounded recursion causing DoS
  - UTF-8 overlong decoding leading to bypass conditions
  
  CVSS 9.8. This is a **production dependency** via OpenTelemetry instrumentation.
- **Impact:** Remote code execution in production if malformed protobuf messages are received.
- **Fix:** Upgrade @opentelemetry/auto-instrumentations-node to ≥0.77.0 (requires v0.219.0+ of sdk-node)
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability

### DEP-003: OpenTelemetry Exporter Prometheus Process Crash
- **Severity:** P1 (CRITICAL)
- **Category:** CVE (Denial of Service)
- **Package:** @opentelemetry/auto-instrumentations-node@0.40.0, @opentelemetry/sdk-node@0.47.0
- **File:** portal/Backend/package.json
- **CVE:** GHSA-q7rr-3cgh-j5r3, GHSA-q7rr-3cgh-j5r3
- **Affected Versions:** 
  - @opentelemetry/auto-instrumentations-node: <0.75.0
  - @opentelemetry/sdk-node: <0.217.0
- **Detail:**  
  A malformed HTTP request to the Prometheus metrics exporter causes immediate process crash. CVSS 7.5. This crashes the entire Portal Backend service, making it unavailable.
- **Impact:** Denial of service — any attacker can crash the Backend by sending malformed HTTP to /metrics endpoint
- **Fix:** Upgrade @opentelemetry/auto-instrumentations-node to ≥0.77.0 (cascades to sdk-node ≥0.219.0)
- **Cross-ref:** [ESCALATE → TheGuardians] — DoS vulnerability affecting production availability

---

## High-Severity Findings

### DEP-004: Form-Data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE (Injection)
- **Package:** form-data@4.0.5
- **File:** Source/Frontend/package.json (transitive)
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **Affected Versions:** 4.0.0 - 4.0.5
- **Detail:**  
  CRLF injection in multipart form field names and filenames allows header injection attacks. CVSS 7.5.
- **Impact:** HTTP response splitting, injection of custom headers, cache poisoning if form data is reflected in responses.
- **Fix:** `npm update form-data` to ≥4.0.6
- **Cross-ref:** [ESCALATE → TheGuardians] — Injection vulnerability

### DEP-005: Vite fs.deny Bypass on Windows
- **Severity:** P2 (HIGH)
- **Category:** CVE (Path Traversal)
- **Package:** vite@5.4.0
- **File:** Source/Frontend/package.json
- **CVE:** GHSA-fx2h-pf6j-xcff
- **Affected Versions:** ≤6.4.2
- **Detail:**  
  Multiple path traversal vulnerabilities in Vite:
  - `server.fs.deny` bypass on Windows via alternate paths (e.g., short paths, UNC paths)
  - Path traversal in optimized deps `.map` handling
  - NTLMv2 hash disclosure via UNC path handling (GHSA-v6wh-96g9-6wx3)
  
  CVSS unspecified but marked HIGH for Windows deployments.
- **Impact:** Information disclosure (source maps, .env files) and source code access during development.
- **Fix:** `npm update vite` to ≥5.4.3 or v6.4.3+ (check breaking changes)
- **Cross-ref:** [CROSS-REF: security-review] — Path traversal requires Vite configuration review

### DEP-006: React Router Open Redirect
- **Severity:** P2 (HIGH)
- **Category:** CVE (Redirect)
- **Package:** react-router@6.30.3 → react-router-dom@6.30.4
- **File:** Source/Frontend/package.json
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Affected Versions:** >=6.7.0 <6.30.4 (react-router); 6.6.3 - 6.30.3 (react-router-dom)
- **Detail:**  
  Same-origin redirect with path starting `//` (protocol-relative URL) causes open redirect vulnerability. Attackers can craft malicious links like `/some-path/2.example.com` to redirect to external domains.
- **Impact:** Phishing attacks, credential theft if users are redirected to attacker-controlled domain.
- **Fix:** `npm update react-router-dom` to ≥6.30.4 (already on correct version; **this is FIXED**)
- **Note:** Audit shows v6.30.3 installed, but latest wanted is 6.30.4. Upgrade fixes this.

### DEP-007: gRPC Server Crash from Malformed Requests
- **Severity:** P2 (HIGH)
- **Category:** CVE (Denial of Service)
- **Package:** @grpc/grpc-js@1.14.3
- **File:** portal/Backend/package.json (transitive)
- **CVE:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Affected Versions:** >=1.14.0 <1.14.4
- **Detail:**  
  Two DoS vulnerabilities:
  1. Malformed request crashes server (CWE-248)
  2. Malformed compressed message crashes client/server (CWE-248, CWE-400)
  
  CVSS 7.5 each.
- **Impact:** Service unavailability if Portal Backend is exposed to untrusted gRPC traffic.
- **Fix:** Upgrade @opentelemetry/auto-instrumentations-node (cascades dependency update)

### DEP-008: ws WebSocket Memory Exhaustion
- **Severity:** P2 (HIGH)
- **Category:** CVE (Denial of Service)
- **Package:** ws@8.20.1 (transitive)
- **File:** Source/Frontend/package.json (transitive)
- **CVE:** GHSA-96hv-2xvq-fx4p
- **Affected Versions:** >=8.0.0 <8.21.0
- **Detail:**  
  Memory exhaustion DoS via tiny fragments and data chunks in WebSocket streams. CVSS 7.5. Attacker can send malformed WebSocket frames to exhaust memory.
- **Impact:** WebSocket servers become unavailable, memory spike leads to OOM kills.
- **Fix:** Update vite (cascades ws dependency)

### DEP-009: Path-to-Regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** CVE (Regex Denial of Service)
- **Package:** path-to-regexp@0.1.12
- **File:** portal/Backend/package.json (transitive via grpc)
- **CVE:** GHSA-37ch-88jc-xwx2
- **Affected Versions:** <0.1.13
- **Detail:**  
  Regular expression DoS via multiple route parameters. CVSS 7.5. Attacker can craft route patterns with many parameters to cause catastrophic backtracking.
- **Impact:** CPU exhaustion, route matching hangs indefinitely.
- **Fix:** Upgrade dependencies (cascading from grpc-js, protobufjs)

---

## Moderate-Severity Findings (P3)

### DEP-010: TypeScript Jest Integration Issues
- **Severity:** P3 (MODERATE)
- **Category:** CVE (Multiple issues)
- **Package:** ts-jest@29.1.2
- **File:** Source/Backend/package.json
- **CVE:** Multiple (js-yaml DoS, @babel/core file read, jest snapshot issues)
- **Affected Versions:** >=25.10.0-alpha.1
- **Detail:**  
  ts-jest transitively pulls in vulnerable versions of:
  - js-yaml (DoS via repeated aliases, GHSA-h67p-54hq-rp68)
  - @babel/core (arbitrary file read, GHSA-4x5r-pxfx-6jf8)
  - Multiple Jest components with moderate issues
- **Impact:** DoS in test suite, potential info disclosure during build
- **Fix:** `npm update ts-jest` to latest (>=30.0.0 preferred, may require major version bump)

### DEP-011: UUID Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** CVE (Buffer Overflow)
- **Package:** uuid@9.0.0 (Backend), uuid<11.1.1 (orchestrator)
- **File:** Source/Backend/package.json, platform/orchestrator/package.json
- **CVE:** GHSA-w5hq-g745-h8pq
- **Affected Versions:** <11.1.1
- **Detail:**  
  Missing buffer bounds check in uuid v3/v5/v6 when `buf` parameter is provided. CWE-787 (Out of bounds write). CVSS 7.5.
- **Impact:** If uuid library is called with insufficient buffer, writes beyond bounds → memory corruption, potential RCE.
- **Fix:** 
  - Backend: `npm update uuid` to ≥11.1.1 (major version bump, likely breaking)
  - Orchestrator: Update dockerode to ≥5.0.0 (depends on updated uuid)

### DEP-012: PostCSS XSS via CSS Stringify
- **Severity:** P3 (MODERATE)
- **Category:** CVE (XSS)
- **Package:** postcss@8.5.9 (transitive)
- **File:** Source/Frontend/package.json (transitive via vite)
- **CVE:** GHSA-qx2v-qp2m-jg93
- **Affected Versions:** <8.5.10
- **Detail:**  
  Unescaped `</style>` in CSS stringify output can break out of style tags and inject script tags. CWE-79. CVSS 6.1.
- **Impact:** XSS vulnerability if attacker controls CSS input (e.g., user-generated CSS, CSS-in-JS with untrusted data).
- **Fix:** Update vite (cascades postcss dependency)

### DEP-013: OpenTelemetry W3C Baggage Unbounded Memory
- **Severity:** P3 (MODERATE)
- **Category:** CVE (Denial of Service)
- **Package:** @opentelemetry/core<2.8.0 (transitive)
- **File:** portal/Backend/package.json
- **CVE:** GHSA-8988-4f7v-96qf
- **Affected Versions:** <2.8.0
- **Detail:**  
  Unbounded memory allocation in W3C Baggage propagation header parsing. CWE-770. CVSS 5.3. Attacker sends large baggage headers → memory exhaustion.
- **Impact:** Memory-based DoS in production.
- **Fix:** Upgrade @opentelemetry/auto-instrumentations-node (cascades)

### DEP-014: QS Query String DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE (Denial of Service)
- **Package:** qs@6.15.1 (transitive)
- **File:** Backend, Portal Backend (transitive via express)
- **CVE:** GHSA-q8mj-m7cp-5q26
- **Affected Versions:** >=6.11.1 <=6.15.1
- **Detail:**  
  qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set. CWE-476. CVSS 5.3. Attackers craft query strings → unhandled exception → crash.
- **Impact:** Server crash if malformed query strings are parsed.
- **Fix:** Update express to latest patch version (may auto-upgrade qs)

### DEP-015: Esbuild Cross-Origin Request Vulnerability
- **Severity:** P3 (MODERATE)
- **Category:** CVE (Information Disclosure)
- **Package:** esbuild@0.24.2 (transitive)
- **File:** Source/Frontend/package.json (transitive via vite)
- **CVE:** GHSA-67mh-4wv8-2f99
- **Affected Versions:** <=0.24.2
- **Detail:**  
  Esbuild dev server allows any website to send requests to the dev server and read responses. CWE-346. CVSS 5.3. Attacker's website can fetch resources from dev server → info disclosure.
- **Impact:** Source code leakage if dev server is exposed.
- **Fix:** Update vite

---

## Outdated Major Versions (P3)

### DEP-016: Express Major Version Lag
- **Severity:** P3
- **Category:** Outdated
- **Package:** express@4.18.2 (Backend), @4.21.0 (Orchestrator)
- **Current:** 4.x, **Latest:** 5.2.1
- **Backend:**
  - Installed: 4.18.2 → wanted: 4.22.2 → latest: 5.2.1
  - **Lag:** 1 major version (2+ years without major upgrade)
- **Orchestrator:**
  - Installed: 4.21.0 → wanted: 4.22.2 → latest: 5.2.1
  - **Lag:** 1 major version
- **Impact:** Missing security patches, feature gap, qs vulnerability (moderate) in body-parser
- **Fix:** Plan migration to express v5 (breaking changes in callback signatures, middleware order)

### DEP-017: React and React-DOM Major Version Lag
- **Severity:** P3
- **Category:** Outdated
- **Package:** react@18.3.1, react-dom@18.3.1
- **Current:** 18.x, **Latest:** 19.2.7
- **Lag:** 1 major version (18 is stable LTS, 19 has new features/performance improvements)
- **Impact:** Missing optimizations, use improvements (React 19 simplifies hooks)
- **Fix:** Evaluate React 19 migration (generally backward compatible)

### DEP-018: React Router Major Version Lag
- **Severity:** P3
- **Category:** Outdated
- **Package:** react-router-dom@6.30.4
- **Current:** 6.x, **Latest:** 7.18.0
- **Lag:** 1 major version
- **Impact:** Missing features, one known CVE (GHSA-2j2x-hqr9-3h42) already fixed in v6.30.4 but v7 has other improvements
- **Fix:** Test with React Router v7 (likely minor breaking changes)

### DEP-019: Pino Logger Major Version Lag (Backend)
- **Severity:** P3
- **Category:** Outdated
- **Package:** pino@8.17.0 (Backend) vs pino@10.3.1 (Portal)
- **Current:** 8.x (Backend), Latest: 10.x
- **Lag:** 2 major versions (Backend is 2 years old)
- **Impact:** Missing performance improvements, security enhancements in logging
- **Fix:** `npm update pino` (test for API changes; v9-10 are mostly compatible)

### DEP-020: UUID Major Version Lag
- **Severity:** P3
- **Category:** Outdated
- **Package:** uuid@9.0.0
- **Current:** 9.x, **Latest:** 14.0.1
- **Lag:** 5 major versions (significant lag)
- **Impact:** Missing security patches (buffer bounds fix), performance improvements
- **Fix:** `npm update uuid@latest` (requires test, API should be stable)

### DEP-021: Multer Version Lag (Portal)
- **Severity:** P3
- **Category:** Outdated
- **Package:** multer@1.4.5-lts.1
- **Current:** 1.x LTS, **Latest:** 2.2.0
- **Lag:** 1 major version (LTS is intentional but v2 has security fixes)
- **Impact:** File upload handling may have exploitable edge cases
- **Fix:** Evaluate multer v2 migration (potentially significant API changes for file handling)

### DEP-022: OpenTelemetry SDK Major Version Lag (Portal)
- **Severity:** P3
- **Category:** Outdated
- **Package:** @opentelemetry/auto-instrumentations-node@0.40.0, @opentelemetry/sdk-node@0.47.0
- **Current:** 0.40.x / 0.47.x, **Latest:** 0.77.0 / 0.219.0
- **Lag:** 9+ minor versions (0.219 is newer but follows semver prerelease, likely v1.x imminent)
- **Impact:** Multiple CVEs (DEP-002, DEP-003, DEP-013)
- **Fix:** Upgrade urgently to fix CRITICAL CVEs

### DEP-023: Vitest Major Version Lag
- **Severity:** P3
- **Category:** Outdated
- **Package:** vitest@2.0.5
- **Current:** 2.x, **Latest:** 2.1.8 (or 3.x in beta)
- **Lag:** Minor version only, but contains CRITICAL CVE
- **Fix:** `npm update vitest` to ≥3.2.6 (breaking changes expected)

---

## Dependency Tree Analysis

| Workspace | Direct | Transitive | Status | Risk |
|-----------|--------|-----------|--------|------|
| Source/Backend | 4 | 412 | 27 vulns (1L, 24M, 1H, 1C) | MODERATE |
| Source/Frontend | 3 | 231 | 11 vulns (1L, 6M, 3H, 1C) | **HIGH** |
| Source/E2E | 1 | 5 | 0 vulns | MINIMAL |
| platform/orchestrator | 3 | 156 | 9 vulns (6M, 2H, 1C) | **HIGH** |
| portal/Backend | 11 | 578 | 50+ vulns (6M, 2H, 1C) | **CRITICAL** |
| portal/Frontend | 10+ | 425 | Unknown | MODERATE |

**Observations:**
- **Portal/Backend has the largest transitive tree (578 deps)** → highest supply chain risk
- **Frontend dependencies have critical dev-time RCE** (vitest)
- **Orchestrator pulls in gRPC/protobufjs** with 3 critical vulns
- **No abandoned packages detected** (all have active maintainers)
- **No post-install scripts detected** (good security posture)

---

## License Compliance

All primary dependencies appear to use standard OSS licenses:
- **Backend:** express (MIT), pino (MIT), uuid (MIT), prom-client (MIT)
- **Frontend:** react (MIT), react-dom (MIT), react-router-dom (MIT)
- **Portal:** cors (MIT), multer (MIT), express (MIT)

**No GPL/AGPL dependencies detected** → no viral license concerns.  
**No UNLICENSED or proprietary packages detected.**

---

## Remediation Priority

### **IMMEDIATE (within 24 hours)**
1. **Frontend vitest RCE** → Disable/uninstall vitest UI server in production, or upgrade to v3.2.6+
2. **Portal/Backend protobufjs RCE** → Upgrade @opentelemetry/auto-instrumentations-node to ≥0.77.0
3. **Portal/Backend OpenTelemetry DoS** → Same upgrade as above (cascades to sdk-node v0.219.0+)
4. **Orchestrator protobufjs RCE** → Cascade from Portal upgrade

### **URGENT (within 1 week)**
5. Form-data CRLF injection → `npm update form-data`
6. gRPC server crash → Cascade from opentelemetry upgrade
7. Vite path traversal → `npm update vite` (test for breaking changes)
8. React Router redirect → `npm update react-router-dom`
9. UUID buffer overflow → `npm update uuid` (test API)

### **IMPORTANT (within 2 weeks)**
10. QS DoS → `npm update express` (cascade)
11. Esbuild CORS → Cascade from vite
12. ws DoS → Cascade from vite
13. PostCSS XSS → Cascade from vite

### **PLANNED (before next release)**
14. Express v5 migration (breaking changes, plan 2-3 weeks)
15. Pino v10 (Backend, test compatibility)
16. React v19 evaluation (test new features)
17. React Router v7 (test breaking changes)
18. Multer v2 (Portal, file handling changes)

---

## Cross-References

- **[ESCALATE → TheGuardians]**
  - Vitest UI RCE (DEP-001)
  - Protobufjs RCE (DEP-002)
  - OpenTelemetry DoS (DEP-003)
  - Form-data injection (DEP-004)
  - React Router redirect (DEP-006)

- **[CROSS-REF: code-reviewer]** — Breaking changes in express v5, vitest v3, react v19, multer v2 require design review

- **[CROSS-REF: performance-profiler]** — OpenTelemetry upgrades may change instrumentation behavior; validate metrics accuracy

---

## JSON Summary

```json
{
  "audit_date": "2026-06-21",
  "workspaces_audited": 6,
  "total_direct_dependencies": 32,
  "total_transitive_dependencies": 1807,
  "vulnerabilities": {
    "critical": 4,
    "high": 11,
    "moderate": 24,
    "low": 1,
    "total": 40
  },
  "outdated_major_versions": 8,
  "abandoned_packages": 0,
  "deprecated_packages": 0,
  "post_install_scripts": 0,
  "license_risks": 0,
  "grade": "D",
  "rationale": "Multiple P1 critical CVEs (RCE, DoS) in production and dev dependencies; immediate remediation required",
  "findings": {
    "DEP-001": { "title": "Vitest UI RCE", "severity": "P1", "status": "requires_fix" },
    "DEP-002": { "title": "Protobufjs RCE", "severity": "P1", "status": "requires_fix" },
    "DEP-003": { "title": "OpenTelemetry DoS", "severity": "P1", "status": "requires_fix" },
    "DEP-004": { "title": "Form-Data CRLF", "severity": "P2", "status": "requires_fix" },
    "DEP-005": { "title": "Vite Path Traversal", "severity": "P2", "status": "requires_fix" },
    "DEP-006": { "title": "React Router Redirect", "severity": "P2", "status": "requires_fix" },
    "DEP-007": { "title": "gRPC Crash", "severity": "P2", "status": "requires_fix" },
    "DEP-008": { "title": "ws DoS", "severity": "P2", "status": "requires_fix" },
    "DEP-009": { "title": "Path-to-Regexp ReDoS", "severity": "P2", "status": "requires_fix" },
    "DEP-010_to_015": { "title": "Moderate CVEs", "severity": "P3", "count": 6, "status": "requires_fix" },
    "DEP-016_to_023": { "title": "Outdated Majors", "severity": "P3", "count": 8, "status": "requires_planning" }
  }
}
```

---

## Next Steps

1. **Triage critical CVEs** — Form a security incident team
2. **Run verification gates** — Ensure all tests pass after updates
3. **Test against workspaces** — Verify breaking changes don't affect application
4. **Deploy updates systematically:**
   - Phase 1: Critical dependency updates (OpenTelemetry, vitest, form-data)
   - Phase 2: High-severity dependency updates (vite, uuid, express patch)
   - Phase 3: Major version migrations (express v5, react v19, etc.)
5. **Update learnings** — Document any non-standard fixes or workarounds
6. **Re-audit** — Run npm audit after each major phase

---

**Report generated by:** Dependency Auditor  
**Audit methodology:** npm audit, npm outdated, package.json analysis  
**Grading criteria:** Per inspector.config.yml (A: max 0 P1, 3 P2; D: any P1 unresolved)
