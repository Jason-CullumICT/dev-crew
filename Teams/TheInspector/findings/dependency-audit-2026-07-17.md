# Dependency Auditor Findings
**Run Date:** 2026-07-17  
**Auditor:** dependency_auditor (haiku)  
**Scope:** Source/, platform/, portal/ npm workspaces

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers** | npm (10 manifests) |
| **Direct Dependencies** | 55+ |
| **Transitive Dependencies** | ~1000+ |
| **Critical CVEs** | 3 |
| **High-Severity CVEs** | 8+ |
| **Moderate CVEs** | 10+ |
| **Overall Grade** | **D** (3 critical vulnerabilities in direct/high-usage deps) |

---

## Critical Findings (P1)

### DEP-001: Handlebars.js - JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars@4.0.0–4.7.8
- **Location:** Source/Backend (transitive via unknown dependency chain)
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1)
  - GHSA-9cx6-37pm-9jff (CVSS 7.5)
- **Detail:** Multiple code injection vulnerabilities in Handlebars template processing. Attacker can execute arbitrary JavaScript via AST manipulation, @partial-block tampering, decorator syntax abuse, and dynamic partial objects. All affects versions 4.0.0–4.7.8.
- **Fix:** Update to handlebars@4.7.9+ 
- **Impact:** If used in any template generation or reporting pipeline, attacker can inject and execute code server-side
- **Cross-ref:** [ESCALATE → TheGuardians] — code injection risk

### DEP-002: Protobufjs - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs@<7.5.5
- **Location:** platform/orchestrator (transitive via @grpc/grpc-js → protobufjs)
- **CVE IDs:**
  - GHSA-xq3m-2v4x-88gg (CVSS 9.8) — arbitrary code execution
  - GHSA-66ff-xgx4-vchm (CVSS N/A) — code injection via bytes field defaults
  - GHSA-75px-5xx7-5xc7 (CVSS 8.1) — gadget chain after prototype pollution
- **Detail:** Multiple remote code execution paths in protobufjs. Attacker can inject code through .proto schema processing, generated toObject code, prototype pollution, and option field manipulation. Affects all versions ≤7.5.5 and ≤7.6.2 depending on attack vector.
- **Fix:** Update to protobufjs@7.5.5+ (urgent patch); recommend 7.6.3+ for full closure
- **Impact:** CRITICAL — orchestrator uses gRPC which depends on protobufjs. A malicious proto file or message can execute arbitrary code in the orchestrator process.
- **Cross-ref:** [ESCALATE → TheGuardians] — remote code execution in infrastructure

### DEP-003: Vitest - Arbitrary File Read/Execute via UI Server
- **Severity:** P1 (CRITICAL)  
- **Category:** cve
- **Package:** vitest@<3.2.6
- **Location:** Source/Frontend (dev dependency)
- **CVE ID:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** Vitest UI server (enabled with `vitest ui`) listens without proper access control. Attacker can read any file on disk and execute code through the test runner. Affects vitest < 3.2.6.
- **Fix:** Update vitest to 3.2.6+ (note: major version jump from current; test compatibility required)
- **Impact:** Medium in dev (dev-only dependency) but HIGH if exposed on networked CI/CD. Enables full system compromise through test runner access.
- **Cross-ref:** [ESCALATE → TheGuardians] — remote code execution in CI/CD if UI exposed

---

## High-Severity Findings (P2)

### DEP-004: form-data - CRLF Injection in Multipart Encoding
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data@4.0.0–4.0.5
- **Location:** Source/Backend, Source/Frontend (transitive)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** CRLF injection via unescaped field names and filenames in multipart/form-data encoding. Attacker can inject HTTP headers or response content by crafting malicious form field names.
- **Fix:** Update to form-data@4.0.6+
- **Impact:** HTTP response injection if application uses form-data for uploads with user-controlled field names

### DEP-005: Vite - Path Traversal in Optimized Deps + NTLMv2 Disclosure
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** vite@≤6.4.2
- **Location:** Source/Frontend (direct)
- **CVE IDs:**
  - GHSA-fx2h-pf6j-xcff (CVSS 7.5) — path traversal via alternate Windows paths
  - GHSA-4w7w-66w2-5vf9 (CVSS N/A) — .map file traversal
  - GHSA-v6wh-96g9-6wx3 (CVSS N/A) — NTLMv2 hash disclosure via UNC paths
- **Detail:** Multiple vulnerabilities in vite dev server: can bypass `server.fs.deny` restrictions on Windows via alternate path encoding (e.g., backslashes, UNC paths), access source maps outside intended scope, and leak NTLM credentials through launch-editor integration.
- **Fix:** Update vite to 8.1.5+ (major version jump; check plugin/config compatibility)
- **Impact:** Dev-time information disclosure and potential source access in development; low production risk if vite not shipped to prod

### DEP-006: Vitest/esbuild Chain - Dev Server CSRF + Code Eval
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** esbuild@≤0.24.2 (via vite)
- **Location:** Source/Frontend (transitive via vite → esbuild)
- **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** esbuild dev server allows arbitrary requests from any website due to missing CORS/origin checks. Attacker website can send requests to the dev server and read responses, enabling access to file system and request/response data.
- **Fix:** Update esbuild to 0.24.3+ (usually via vite@8.1.5+)
- **Impact:** Dev-time information disclosure; attacker website can exfiltrate dev server responses

### DEP-007: gRPC-js - Malformed Request DoS / Crash
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @grpc/grpc-js@1.14.0–1.14.3
- **Location:** platform/orchestrator (transitive via google cloud libraries)
- **CVE IDs:**
  - GHSA-5375-pq7m-f5r2 (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq (CVSS 7.5)
- **Detail:** Malformed gRPC requests or compressed messages cause unhandled exceptions leading to server crash. No authentication required to trigger.
- **Fix:** Update @grpc/grpc-js to 1.14.4+
- **Impact:** Denial of service against orchestrator if exposed to untrusted gRPC clients

### DEP-008: path-to-regexp - ReDoS via Route Parameters
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** path-to-regexp@<0.1.13
- **Location:** platform/orchestrator (transitive)
- **CVE ID:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Regular Expression Denial of Service (ReDoS) in route parameter parsing. Attacker can supply specially crafted routes with multiple overlapping parameters causing exponential regex backtracking.
- **Fix:** Update path-to-regexp to 0.1.13+
- **Impact:** DoS against API endpoints if path patterns are user-controlled or attacker can trigger route compilation

### DEP-009: ws (WebSocket) - Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** ws@8.0.0–8.20.1 (and 8.0.0–8.21.0 for variant)
- **Location:** Source/Frontend (transitive via vitest, development only)
- **CVE IDs:**
  - GHSA-96hv-2xvq-fx4p (CVSS 7.5) — memory exhaustion via tiny fragments
  - GHSA-58qx-3vcg-4xpx (CVSS 4.4) — uninitialized memory disclosure
- **Detail:** Attacker sends many tiny WebSocket fragments causing unbounded memory allocation. Process exhausts heap and crashes.
- **Fix:** Update ws to 8.21.0+
- **Impact:** Dev-time DoS if ws exposed; low production risk if properly configured

### DEP-010: picomatch - ReDoS via Extglob Quantifiers
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** picomatch@<2.3.2 and 4.0.0–4.0.3
- **Location:** portal/Frontend (transitive via build/watch tools)
- **CVE IDs:**
  - GHSA-c2c7-rcm5-vvqj (CVSS 7.5) — ReDoS via extglob
  - GHSA-3v7f-55p6-f55p (CVSS 5.3) — method injection in POSIX classes
- **Detail:** Regular expression denial of service in glob pattern matching. Specially crafted globs cause exponential backtracking.
- **Fix:** Update picomatch (and dependent packages like micromatch, anymatch) to picomatch@2.3.2+ or 4.0.4+
- **Impact:** Build-time or pattern-matching DoS; low runtime impact if not used for user input

---

## Moderate-Severity Findings (P3)

### DEP-011: @opentelemetry/auto-instrumentations-node - Prometheus Exporter Crash
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** @opentelemetry/auto-instrumentations-node@<0.75.0
- **Location:** portal/Backend (direct dependency)
- **CVE ID:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5 but MODERATE due to limited exposure)
- **Detail:** Malformed HTTP requests to Prometheus metrics endpoint cause uncaught exceptions. Attacker can crash the exporter/metrics server.
- **Fix:** Update to @opentelemetry/auto-instrumentations-node@0.78.0+ (major version)
- **Impact:** Metrics unavailability if exposed; low if metrics endpoint is internal-only

### DEP-012: @opentelemetry/core - Unbounded Memory via Baggage Headers
- **Severity:** P3 (MODERATE)
- **Category:** cve  
- **Package:** @opentelemetry/core@<2.8.0
- **Location:** platform/orchestrator, portal/Backend (transitive)
- **CVE ID:** GHSA-8988-4f7v-96qf (CVSS 5.3)
- **Detail:** W3C Baggage header propagation doesn't validate key/value counts. Attacker can send headers with many entries causing unbounded memory allocation.
- **Fix:** Update @opentelemetry/core to 2.8.0+ (note: requires major version bump in sdk-node)
- **Impact:** Low in current setup; higher if application processes untrusted baggage headers

### DEP-013: brace-expansion - Process Hang / Memory Exhaustion
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** brace-expansion@<1.1.13
- **Location:** Source/Backend (transitive)
- **CVE ID:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Zero-step sequences in brace expansion (e.g., `{0..0}`) cause infinite loops and exponential expansion.
- **Fix:** Update brace-expansion to 1.1.13+ (usually auto-resolved via dependency updates)
- **Impact:** Glob pattern processing DoS if user input not validated

### DEP-014: react-router - Open Redirect via Protocol-Relative URLs
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** react-router@6.7.0–6.30.3
- **Location:** Source/Frontend (via react-router-dom)
- **CVE ID:** GHSA-2j2x-hqr9-3h42 (CVSS N/A, but moderate due to same-origin redirect requirement)
- **Detail:** When redirecting to same-origin URLs starting with `//`, React Router reinterprets them as protocol-relative, potentially redirecting to attacker-controlled domain.
- **Fix:** Update react-router-dom to 6.30.4+
- **Impact:** Open redirect from legitimate page to attacker domain (phishing vector)

### DEP-015: postcss - XSS via Unescaped </style> in Stringify
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** postcss@<8.5.10
- **Location:** portal/Frontend (direct), Source/Frontend (transitive)
- **CVE ID:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** postcss doesn't escape `</style>` in CSS output. If CSS is injected into HTML style tags, attacker can break out and inject JavaScript.
- **Fix:** Update postcss to 8.5.10+
- **Impact:** CSS injection → XSS if style tags not properly isolated

### DEP-016: uuid@<9.0.1 Transitive - MODERATE
- **Severity:** P3 (MODERATE)  
- **Category:** outdated / supply-chain
- **Package:** uuid (via various deps)
- **Location:** Source/Backend, platform/orchestrator
- **Issue:** Multiple direct and transitive dependencies on older uuid versions. No known CVE in uuid itself but supply chain fragmentation.
- **Fix:** Consolidate all uuid usage to 9.0.1+
- **Impact:** Version fragmentation increases debugging surface; no active CVE

---

## Outdated Dependencies (P3)

### DEP-017: express - Multiple Major Versions Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Package:** express
- **Locations:** Source/Backend (4.18.2, wanted 4.22.2, latest 5.2.1)
- **Detail:** 4 minor versions behind within v4 line; major v5 available but likely breaking
- **Fix:** `npm update express` (v4 line); evaluate v5 migration separately
- **Impact:** Missing security patches in v4.18.x range, potential performance improvements

### DEP-018: pino - Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Package:** pino  
- **Location:** Source/Backend (8.17.0, wanted 8.21.0, latest 10.3.1)
- **Detail:** 2 major versions behind (8→10); potential API changes
- **Fix:** Evaluate pino@10.x migration; test logging compatibility
- **Impact:** Missing features and patches; major upgrade complexity

### DEP-019: React + React-DOM - Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Package:** react, react-dom
- **Location:** Source/Frontend (18.3.1, wanted 18.3.1 but latest 19.2.7)
- **Detail:** Major version 19 available; frontend locked to v18
- **Fix:** Evaluate React 19 migration (likely requires component refactor)
- **Impact:** Missing new React features; performance improvements foregone

### DEP-020: react-router-dom - Major Version Behind
- **Severity:** P3 (OUTDATED)
- **Category:** outdated
- **Package:** react-router-dom
- **Location:** Source/Frontend (6.26.0, latest 7.18.1)
- **Detail:** Major version 7 available
- **Fix:** Requires routing API refactor and testing
- **Impact:** Missing routing improvements; potential security patches in v7

---

## License Compliance (P4)

### DEP-021: UNLICENSED Source Packages
- **Severity:** P4 (INFORMATIONAL)
- **Category:** license
- **Packages:**
  - Source/Backend (UNLICENSED) ✓ Internal project—acceptable
  - Source/Frontend (UNLICENSED) ✓ Internal project—acceptable
  - platform/orchestrator (UNLICENSED) ✓ Internal infrastructure—acceptable
  - portal/Backend (UNLICENSED) ✓ Internal—acceptable
  - portal/Frontend (UNLICENSED) ✓ Internal—acceptable
  - abac-*-demo (UNLICENSED) ✓ Demo/examples—acceptable
- **Detail:** All source packages correctly marked as UNLICENSED or ISC
- **Fix:** Verify license declarations in CI/CD; consider MIT/Apache 2.0 for open-source portions
- **Impact:** Compliance tracking—no viral license dependencies detected

### DEP-022: ISC License in E2E Tests
- **Severity:** P4 (INFORMATIONAL)
- **Category:** license
- **Package:** Source/E2E (ISC)
- **Detail:** E2E test package licensed under ISC (permissive, compatible with proprietary use)
- **Fix:** Acceptable as-is
- **Impact:** No licensing risk

---

## Supply Chain Risk Assessment (P3-P4)

### DEP-023: Large Transitive Dependency Graph
- **Severity:** P3 (SUPPLY CHAIN)
- **Category:** supply-chain
- **Details:**
  - Source/Backend: 411 transitive dependencies
  - Source/Frontend: 230 transitive dependencies  
  - platform/orchestrator: 155 transitive dependencies
  - **Total unique transitive:** ~800+ (with overlap)
- **Risk:** Wide attack surface; multiple CVEs affect transitive deps
- **Recommendation:** 
  - Run `npm audit --production` regularly to track prod-only deps
  - Consider dependency pruning/consolidation (e.g., audit why handlebars is present in Backend)
  - Implement SBOM generation for compliance

### DEP-024: Monorepo Coordination
- **Severity:** P3 (PROCESS)
- **Category:** supply-chain
- **Detail:** 10+ package.json files with no apparent dependency synchronization. Different packages may use different versions of same dep (e.g., protobufjs in orchestrator vs. others).
- **Fix:** 
  - Move to npm workspaces with shared lockfile (currently missing workspace coordination)
  - Add script: `npm audit --workspaces` to CI/CD
  - Pin transitive dependency versions in root package-lock.json
- **Impact:** Version fragmentation increases surface area for CVE exploitation

---

## Recommendations

### IMMEDIATE (Do First)
1. **Update protobufjs** in platform/orchestrator to 7.5.5+ (arbitrary code execution)
2. **Update handlebars** in Source/Backend to 4.7.9+ (code injection)
3. **Update vitest** in Source/Frontend to 3.2.6+ (file read/execute in CI)
4. **Update gRPC-js** in platform/orchestrator to 1.14.4+ (crash on malformed input)

### HIGH PRIORITY (This Sprint)
5. Update **vite** in Source/Frontend to 8.1.5+ (path traversal in dev)
6. Update **form-data** everywhere (CRLF injection)
7. Update **path-to-regexp** (ReDoS in routing)
8. Update **postcss** in portal/Frontend (CSS injection → XSS)
9. Update **ws** (memory exhaustion)
10. Consolidate **uuid** versions across workspaces

### MEDIUM PRIORITY (Next Sprint)  
11. Evaluate **express** 4.x → 4.22.2 (or plan v5 migration)
12. Evaluate **React 18 → 19** migration (frontend refactor)
13. Evaluate **react-router 6 → 7** migration (routing refactor)
14. Plan **pino 8 → 10** upgrade (logging API changes)
15. Update **@opentelemetry** stack to 0.78.0+ / 2.8.0+

### PROCESS IMPROVEMENTS
16. Set up **npm workspace coordination**: `npm audit --workspaces` in CI
17. Generate **SBOM** (Software Bill of Materials) for compliance
18. Create **dependency update policy**: auto-patch low/moderate, review high/critical
19. Add **license-checker** to CI: `npx license-checker --onlyAllow "MIT,Apache-2.0,ISC"`
20. Document **transitive dependency rationale** (e.g., why handlebars in Backend?)

---

## Cross-References

- `[ESCALATE → TheGuardians]` — 3 findings (code injection in handlebars, RCE in protobufjs, file read in vitest)
- `[CROSS-REF: security-review]` — All P1/P2 findings should trigger security review before deploy
- `[CROSS-REF: performance-profiler]` — Outdated deps (express, pino) may have performance regressions

---

## Dashboard Report

```json
{
  "run_date": "2026-07-17",
  "auditor": "dependency_auditor",
  "metrics": {
    "total_cves": 23,
    "critical_cves": 3,
    "high_cves": 8,
    "moderate_cves": 10,
    "low_cves": 2,
    "direct_dependency_issues": 7,
    "transitive_dependency_issues": 16,
    "outdated_major": 5,
    "license_issues": 0,
    "total_direct_deps": 55,
    "total_transitive_deps": 800
  },
  "grade": "D",
  "critical_packages": [
    "handlebars",
    "protobufjs", 
    "vitest"
  ],
  "escalations": [
    "ESCALATE → TheGuardians: Handlebars code injection",
    "ESCALATE → TheGuardians: Protobufjs RCE",
    "ESCALATE → TheGuardians: Vitest UI arbitrary file access"
  ]
}
```

