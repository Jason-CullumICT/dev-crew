# Dependency Auditor Findings — 2026-11-15

## Executive Summary

**Project:** dev-crew  
**Audited:** Nov 15, 2026  
**Package Managers:** npm (10 manifests)  
**Scope:** Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend, and demo projects  

### Vulnerability Triage

| Severity | Count | Status |
|----------|-------|--------|
| **Critical (P1)** | 4 | 🔴 IMMEDIATE ACTION REQUIRED |
| **High (P2)** | 12+ | 🟠 Should fix in next sprint |
| **Moderate (P3)** | 15+ | 🟡 Plan updates in backlog |
| **Low (P4)** | 9+ | 🟢 Monitor, fix when practical |

**Total CVEs across all packages:** 40+ unique packages with known vulnerabilities

---

## Critical Findings (P1)

### DEP-001: Handlebars — Multiple RCE via JavaScript Injection
- **Severity:** P1 (CRITICAL)
- **Category:** cve / supply-chain
- **Package:** handlebars@3.0.0-4.7.9
- **File:** Source/Backend/node_modules, Source/Frontend/node_modules
- **CVEs:**
  - **GHSA-2w6w-674q-4c4q** — JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - **GHSA-8r5x-fm3f-whwj** — JavaScript Injection via AST Type Confusion in compile (CVSS 9.8)
  - **GHSA-p8wg-vrv2-v86f** — JavaScript Injection via Own Property Check Bypass (CRITICAL)
  - GHSA-3mfm-83xf-c92r — JavaScript Injection via @partial-block (CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 — JavaScript Injection via dynamic partial (CVSS 8.1)
  - GHSA-xjpj-3mr7-gcpf — JavaScript Injection in CLI Precompiler (CVSS 8.2)
  - GHSA-9cx6-37pm-9jff — Denial of Service via Malformed Decorator (CVSS 7.5)
  - Plus prototype pollution and access control bypasses

**Detail:** Handlebars 3.0.0 through 4.7.9 contains multiple critical vulnerabilities allowing arbitrary code execution through AST type confusion, prototype pollution, and property access bypass. An attacker can inject malicious templates to execute arbitrary JavaScript.

**Exploitability:** HIGH — remote, no authentication required, templates may be user-controlled in certain architectures.

**Fix:** 
```bash
# Backend
cd Source/Backend && npm update handlebars

# Frontend (as transitive via unspecified path)
cd Source/Frontend && npm audit fix
```

**Expected:** Upgrade to handlebars@4.7.10+ or migrate away if not directly needed.

**Cross-ref:** [ESCALATE → TheGuardians] — If handlebars processes user-supplied input or configuration, this is an RCE vector requiring security review.

---

### DEP-002: proxy-addr — IPv4-mapped IPv6 IP Spoofing
- **Severity:** P1 (CRITICAL)
- **Category:** cve / authentication-bypass
- **Package:** proxy-addr@1.1.0-2.0.7
- **File:** Source/Backend/node_modules
- **CVE:** GHSA-jqcg-44mw-7w3h
- **CVSS:** 9.1 (High Impact on Confidentiality & Integrity)

**Detail:** proxy-addr (Express middleware for trusted proxy detection) fails to properly validate IPv4-mapped IPv6 addresses (e.g., `::ffff:192.0.2.1`). An attacker can spoof their IP address by sending requests with crafted IPv6-mapped IPv4 addresses, bypassing access controls that rely on `req.ip` or `req.ips`.

**Exploitability:** HIGH — Remote, no authentication required. If your app uses `req.ip` for access control, rate limiting, or geofencing, you are vulnerable.

**Fix:**
```bash
cd Source/Backend && npm update proxy-addr@2.0.8+
```

**Cross-ref:** [ESCALATE → TheGuardians] — Check if Express app uses `req.ip` for security decisions. If yes, audit those routes immediately.

---

### DEP-003: Tinypool — Prototype Pollution → RCE
- **Severity:** P1 (CRITICAL)
- **Category:** cve / rce
- **Package:** tinypool@<=2.1.1
- **File:** Source/Frontend/node_modules (indirect via vitest)
- **CVEs:**
  - GHSA-5gmw-xhrv-c9v3 — Prototype Pollution in worker options → RCE (CVSS not rated, P0)
  - GHSA-85c8-ppgw-ccpr — Prototype Pollution in run() options → RCE

**Detail:** Tinypool worker pool library fails to sanitize worker options, allowing prototype pollution attacks that lead to arbitrary code execution in worker threads.

**Fix:**
```bash
cd Source/Frontend && npm update vitest  # Vitest depends on tinypool; update to vitest@5.1.0+
```

---

### DEP-004: Vitest — Arbitrary File Read/Execution via UI Server
- **Severity:** P1 (CRITICAL)
- **Category:** cve / lfi / rce
- **Package:** vitest@<=4.1.10
- **File:** Source/Frontend/node_modules
- **CVE:** GHSA-5xrq-8626-4rwp
- **CVSS:** 9.8

**Detail:** When Vitest UI server is running on a network interface, arbitrary files can be read and executed on the filesystem. An attacker can exploit path traversal in the UI endpoint to access sensitive files or execute code.

**Exploitability:** HIGH if vitest UI is exposed (even on localhost in a shared environment).

**Fix:**
```bash
cd Source/Frontend && npm update vitest@3.2.6+  # Major upgrade, may require code changes
```

**Note:** This is a **test-time** vulnerability. If vitest UI is only run locally in development, risk is lower. Still, upgrade to prevent accidental exposure.

---

## High-Severity Findings (P2)

### DEP-005: body-parser — DoS via Trailing Bytes in Compressed Requests
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** body-parser@<=1.20.8
- **File:** Source/Backend/node_modules
- **CVE:** GHSA-27r3-jxmh-p828 (CVSS 7.5)

**Detail:** body-parser fails to properly handle trailing bytes after compressed request bodies, causing the parser to hang or crash. Attacker sends a crafted POST with extra bytes after gzip/deflate boundary.

**Fix:** `npm update body-parser@1.20.9+` in Source/Backend

---

### DEP-006: brace-expansion — Multiple DoS via Pathological Input
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** brace-expansion@<=1.1.20
- **File:** Source/Backend/node_modules (transitive)
- **CVEs:** 7 separate DoS vulnerabilities (CVSS 5.3–7.5)

**Detail:** brace-expansion (glob pattern library) has multiple quadratic/exponential-time expansion vulnerabilities, stack exhaustion via recursion, and unbounded array creation. Pathological input like `{a{b,c}}` or deeply nested braces can crash processes or exhaust memory.

**Fix:** `npm audit fix` should upgrade brace-expansion@1.1.21+

---

### DEP-007: browserslist — Unbounded Memory Growth & Prototype Pollution
- **Severity:** P2 (HIGH)
- **Category:** cve / dos / prototype-pollution
- **Package:** browserslist@<=4.28.6
- **File:** Source/Backend/node_modules, Source/Frontend/node_modules
- **CVEs:**
  - GHSA-c83g-rgw3-j3cx — Unbounded cache, eventual OOM (CVSS 7.5)
  - GHSA-73wf-gq98-2v4g — Prototype write via untrusted stats JSON (CVSS 7.5)

**Detail:** browserslist caches query results without eviction, leading to OOM under sustained distinct queries. Additionally, reading attacker-controlled `browserslist-stats.json` can write to prototype, causing unexpected behavior.

**Fix:** `npm update browserslist@4.28.7+` in both Backend and Frontend

---

### DEP-008: form-data — CRLF Injection in Multipart Fields
- **Severity:** P2 (HIGH)
- **Category:** cve / injection
- **Package:** form-data@4.0.0-4.0.5
- **File:** Source/Backend/node_modules, Source/Frontend/node_modules
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)

**Detail:** form-data does not escape field names/filenames in multipart boundaries, allowing CRLF injection to manipulate headers or content.

**Fix:** `npm update form-data@4.0.6+`

---

### DEP-009: js-yaml — Quadratic Complexity DoS via Merge Keys
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** js-yaml@<=3.15.1
- **File:** Source/Backend/node_modules (transitive)
- **CVEs:** 4 quadratic/unbounded CPU DoS (CVSS 5.3–7.5)

**Detail:** YAML merge key chains (`<<:`) and omap resolution can force quadratic CPU time. Attacker sends YAML with deeply nested merges or repeated aliases.

**Fix:** `npm update js-yaml@3.15.2+`

---

### DEP-010: @grpc/grpc-js — Server Crashes & Certificate Auth Bypass
- **Severity:** P2 (HIGH)
- **Category:** cve / dos / auth-bypass
- **Package:** @grpc/grpc-js@1.14.0-1.14.4
- **File:** portal/Backend/node_modules
- **CVEs:**
  - GHSA-5375-pq7m-f5r2 — Malformed request crash (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq — Compressed message crash (CVSS 7.5)
  - GHSA-m9gg-hp2v-232j — Certificate auth bypass (CVSS 7.4)

**Detail:** gRPC server crashes on certain malformed/compressed requests. Additionally, getAuthContext in certain configs returns unauthorized certificates as authorized.

**Fix:** `npm update @grpc/grpc-js@1.14.5+` in portal/Backend

---

### DEP-011: nanoid — Infinite Loops & Integer Overflow
- **Severity:** P2 (HIGH)
- **Category:** cve / dos / undefined-behavior
- **Package:** nanoid@<=3.3.17
- **File:** Source/Frontend/node_modules (transitive)
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv — Non-secure generators loop indefinitely (CVSS 5.9)
  - GHSA-2v37-7h3g-55p8 — Custom generators with zero size (CVSS 5.9)
  - GHSA-xwg4-73v4-xw9w — Integer overflow (CVSS 7.4)

**Detail:** nanoid generator functions can infinite-loop or overflow on certain inputs, causing DoS or unpredictable ID generation.

**Fix:** `npm update nanoid@3.3.18+`

---

### DEP-012: postcss — Arbitrary File Read via sourceMappingURL
- **Severity:** P2 (HIGH)
- **Category:** cve / lfi / information-disclosure
- **Package:** postcss@<=8.5.22
- **File:** Source/Frontend/node_modules (transitive)
- **CVEs:**
  - GHSA-6g55-p6wh-862q — Arbitrary .map file read (CVSS 7.5)
  - GHSA-r28c-9q8g-f849 — Path traversal in source map auto-loading (CVSS 7.5)
  - GHSA-qx2v-qp2m-jg93 — XSS via unescaped </style> (CVSS moderate)

**Detail:** PostCSS automatically reads source map files referenced in CSS `/*# sourceMappingURL=... */` comments without validating the path, allowing read-outside-intended-directory or .map file disclosure.

**Fix:** `npm update postcss@8.5.23+`

---

### DEP-013: source-map-js — Event-Loop DoS
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** source-map-js@1.0.0-1.2.1
- **File:** Source/Frontend/node_modules (transitive)
- **CVE:** GHSA-68fv-2mgg-jv7q (CVSS 7.5)

**Detail:** Indexed source-map section offsets can be crafted to cause quadratic parsing time, blocking the event loop.

**Fix:** `npm update source-map-js@1.2.2+`

---

### DEP-014: ws — Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** cve / dos
- **Package:** ws@8.0.0-8.20.1 (or 8.0.0-8.21.0)
- **File:** Source/Frontend/node_modules (transitive)
- **CVEs:**
  - GHSA-96hv-2xvq-fx4p — Memory exhaustion from fragments/chunks (CVSS 7.5)

**Detail:** WebSocket server can be flooded with tiny fragments/data chunks, exhausting memory.

**Fix:** `npm update ws@8.21.0+`

---

### DEP-015: react-router-dom — Open Redirect → XSS
- **Severity:** P2 (HIGH)
- **Category:** cve / xss / open-redirect
- **Package:** react-router-dom@6.30.2-6.30.5, and other versions
- **File:** Source/Frontend/node_modules
- **CVEs:**
  - GHSA-jjmj-jmhj-qwj2 — Open redirect leading to XSS (CVSS 6.9)
  - GHSA-2j2x-hqr9-3h42 — Protocol-relative URL reinterpretation (CVSS moderate)
  - GHSA-wrjc-x8rr-h8h6 — Backslash bypass (CVSS moderate)
  - GHSA-337j-9hxr-rhxg — Constructor injection via SSR hydration (CVSS 6.1)

**Detail:** React Router fails to validate redirect destinations, allowing open redirects that can chain to XSS, and constructor injection in SSR scenarios.

**Fix:** `npm update react-router-dom@7.18.0+`

---

## Moderate-Severity Findings (P3)

### DEP-016: @vitest/mocker — Path Traversal & Code Injection
- **Severity:** P3 (MODERATE → P2 if vitest is exposed)
- **Category:** cve / lfi / code-injection
- **Package:** @vitest/mocker@<=4.1.11
- **File:** Source/Frontend/node_modules
- **CVEs:**
  - GHSA-82fw-gwwq-j7x9 — Path traversal via redirect mock (CVSS 5.9)
  - GHSA-qxg6-89mg-rqv8 — Code injection via manual mock registration (CVSS 4.7)

**Detail:** Vitest mocker can be exploited via path traversal in redirects or unauthenticated manual mock registration.

**Fix:** `npm update vitest@4.1.12+` (or upgrade to vitest@5.1.0)

---

### DEP-017: vite — Multiple Path Traversal & Command Injection
- **Severity:** P3 (MODERATE) + **P2 if dev server is exposed**
- **Category:** cve / lfi / command-injection
- **Package:** vite@<=6.4.3
- **File:** Source/Frontend/node_modules
- **CVEs:** 8 separate issues (path traversal, NTLMv2 hash disclosure, command injection in launch-editor)

**Detail:** Vite dev server has multiple issues with `.map` file handling, Windows path traversal, and editor launch argument escaping.

**Fix:** `npm update vite@6.4.4+` or `npm update vite@8.3.8+` (major version)

---

### DEP-018: @remix-run/router — Protocol-Relative URL Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** cve / open-redirect
- **Package:** @remix-run/router@1.3.0-1.23.2
- **File:** Source/Frontend/node_modules
- **CVE:** GHSA-2j2x-hqr9-3h42

**Detail:** React Router's redirect validation fails for URLs starting with `//`, allowing protocol-relative open redirects.

**Fix:** `npm update react-router-dom@6.30.4+` (updates @remix-run/router)

---

### DEP-019: uuid — Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** cve / buffer-overflow / memory-safety
- **Package:** uuid@<11.1.1
- **File:** Source/Backend/node_modules
- **CVE:** GHSA-w5hq-g745-h8h6 (CVSS 7.5)

**Detail:** uuid v3/v5/v6 functions lack bounds checking when a buffer is provided, allowing out-of-bounds write.

**Fix:** `npm update uuid@11.1.1+`

**Note:** Backend declares `uuid@^9.0.0`; check actual installed version in lock file.

---

### DEP-020: qs — Multiple DoS & Array Bypass
- **Severity:** P3 (MODERATE)
- **Category:** cve / dos / bypass
- **Package:** qs@2.2.5-6.16.0
- **File:** Source/Backend/node_modules
- **CVEs:** 4 DoS + array-limit bypass (CVSS 3.7–5.3)

**Detail:** Query string parser crashes or hangs on certain malformed input; array limit can be bypassed.

**Fix:** `npm audit fix` (update qs@6.16.1+)

---

### DEP-021: esbuild — CORS Bypass in Dev Server
- **Severity:** P3 (MODERATE)
- **Category:** cve / cors-bypass / information-disclosure
- **Package:** esbuild@<=0.24.2
- **File:** Source/Frontend/node_modules (via vite)
- **CVE:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)

**Detail:** Any website can send requests to the esbuild dev server and read responses, bypassing CORS.

**Fix:** Update vite@6.4.3+

---

### DEP-022: @babel/core — Arbitrary File Read via sourceMappingURL
- **Severity:** P3 (MODERATE)
- **Category:** cve / lfi
- **Package:** @babel/core@<=7.29.0
- **File:** Source/Backend/node_modules, Source/Frontend/node_modules
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)

**Detail:** Babel can read arbitrary files if a comment contains a sourceMappingURL pointing to an attacker-controlled file.

**Fix:** `npm update @babel/core@7.29.1+`

---

## Dependency Tree Analysis

### Transitive Dependencies & Supply Chain Risk

| Package | Direct Deps | Total Deps | Severity | Risk Level |
|---------|-------------|-----------|----------|-----------|
| Source/Backend | 4 | 412 | 2 Critical, 5 High | 🔴 HIGH |
| Source/Frontend | 3 | 230 | 2 Critical, 7 High | 🔴 HIGH |
| Source/E2E | 4 | 4 | None | 🟢 SAFE |
| portal/Backend | 15+ | 200+ | 3+ High | 🟠 MEDIUM |
| portal/Frontend | ~5 | 200+ | Similar to Source/Frontend | 🟠 MEDIUM |

**Observation:** Backend and Frontend have large transitive dependency trees (400+ packages each), creating significant supply-chain surface area. Most critical findings are transitive (not direct dependencies).

---

## Outdated Package Versions

### Major Version Gaps

| Package | Current | Latest | Gap | Action |
|---------|---------|--------|-----|--------|
| jest | ^29.7.0 | 30.0.0+ | 1+ major | P3 — Backlog |
| typescript | ^5.3.3 | 5.7.0+ | Minor | P4 — Consider next release |
| vitest | ^2.0.5 | 5.1.0+ | 3+ major | 🔴 **CRITICAL** (see DEP-004) |
| vite | ^5.4.0 | 6.4.3+/8.3.8+ | 1–3 major | 🔴 **CRITICAL** (see DEP-017) |
| react-router-dom | ^6.26.0 | 7.18.0+ | 1+ major | 🟠 **HIGH** (open redirect) |

---

## License Compliance

All npm packages use standard open-source licenses (MIT, Apache 2.0, BSD, ISC). No GPL/AGPL licenses detected in direct dependencies. No UNLICENSED packages found.

**Verdict:** ✅ License compliance is acceptable.

---

## Abandoned or High-Risk Dependencies

### Monitoring List

- **jest@29.7.0** — Still maintained, but consider upgrading to 30.x in next sprint
- **typescript@5.3.3** — Well-maintained
- **handlebars** — **DO NOT USE** — Multiple critical RCEs; consider removing or migrating

---

## Remediation Roadmap

### Phase 1 — CRITICAL (This Sprint)
1. **DEP-001: Handlebars** → Identify usage, upgrade or remove
2. **DEP-002: proxy-addr** → Upgrade express + dependencies
3. **DEP-003: Tinypool** → Upgrade vitest
4. **DEP-004: Vitest** → Upgrade to v3.2.6+ or v5.1.0+

### Phase 2 — HIGH (Next Sprint)
5. **DEP-005 to DEP-015** → Run `npm audit fix` and test thoroughly
6. React Router DOM → Upgrade to v7.18.0+
7. Verify no functionality breakage post-upgrade

### Phase 3 — MODERATE (Backlog)
8. **DEP-016 to DEP-022** → Roll into normal dependency maintenance
9. Consider upgrading to major versions: jest@30, vitest@5, vite@8

---

## Recommended Commands

### Immediate Fixes (Backend)
```bash
cd Source/Backend
npm audit fix --force  # Address P1/P2 issues
npm update express uuid pino ts-jest
npm test  # Verify no regressions
```

### Immediate Fixes (Frontend)
```bash
cd Source/Frontend
npm update vitest vite react-router-dom
npm test  # Verify no regressions
```

### For All Directories
```bash
for dir in Source/{Backend,Frontend,E2E} portal/{Backend,Frontend} platform/orchestrator; do
  (cd "$dir" && npm audit fix && npm test)
done
```

---

## Next Steps

1. **Report to TheGuardians** — Flag handlebars, proxy-addr, and vitest as potential RCE vectors
2. **Staging Test** — Apply fixes to feature branch, run full test suite
3. **Update CLAUDE.md** — Document resolved CVEs for team awareness
4. **Establish Audit Cadence** — Re-run `npm audit` weekly to catch new disclosures

---

## JSON Summary

```json
{
  "audit_date": "2026-11-15",
  "packages_audited": 10,
  "cve_summary": {
    "critical": 4,
    "high": 12,
    "moderate": 15,
    "low": 9,
    "total": 40
  },
  "by_directory": {
    "Source/Backend": {
      "dependencies": 412,
      "vulnerabilities": 18,
      "critical": 2,
      "high": 5,
      "fixable": "npm audit fix"
    },
    "Source/Frontend": {
      "dependencies": 230,
      "vulnerabilities": 17,
      "critical": 2,
      "high": 7,
      "fixable": "npm audit fix"
    },
    "Source/E2E": {
      "dependencies": 4,
      "vulnerabilities": 0,
      "critical": 0,
      "high": 0,
      "fixable": "none"
    }
  },
  "critical_findings": [
    "handlebars RCE",
    "proxy-addr IP spoofing",
    "tinypool prototype pollution RCE",
    "vitest arbitrary file read/RCE"
  ],
  "escalations": [
    "TheGuardians: handlebars RCE injection",
    "TheGuardians: proxy-addr auth bypass",
    "TheGuardians: vitest file read if exposed"
  ]
}
```

---

## Auditor Notes

- **Audit Method:** `npm audit --json` + manual severity classification
- **Transitive Vuln Focus:** Most issues are transitive (not direct deps), but critical
- **Test Tool Risk:** vitest/tinypool are test-time deps; still requires action due to severity
- **Post-Audit:** Update learnings file with resolved CVEs and team decisions on major version upgrades

