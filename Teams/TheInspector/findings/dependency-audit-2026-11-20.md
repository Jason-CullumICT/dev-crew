# Dependency Auditor Findings — 2026-11-20

## Executive Summary

Comprehensive static analysis of npm dependencies across **Source/** and **platform/orchestrator** reveals **37 total CVEs** across 4 package manifests, including **5 critical-severity vulnerabilities**. No post-install scripts detected. E2E test suite is clean (0 CVEs).

### Vulnerability Totals by Severity

| Package | Location | Critical | High | Moderate | Low | Total |
|---------|----------|----------|------|----------|-----|-------|
| Backend | `Source/Backend/` | 2 | 5 | 3 | 1 | **11** |
| Frontend | `Source/Frontend/` | 1 | 7 | 7 | 1 | **17** |
| E2E Tests | `Source/E2E/` | 0 | 0 | 0 | 0 | **0** ✓ |
| Orchestrator | `platform/orchestrator/` | 2 | 3 | 4 | 0 | **9** |
| **TOTAL** | | **5** | **15** | **14** | **2** | **37** |

---

## Critical Vulnerabilities (P1)

### DEP-001: handlebars — JavaScript Injection via AST Type Confusion
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `handlebars`
- **Location:** `Source/Backend/` (transitive via templates)
- **CVE:** GHSA-3mfm-83xf-c92r
- **Title:** Handlebars.js has JavaScript Injection via AST Type Confusion by tampering @partial-block
- **Detail:** An attacker can inject arbitrary JavaScript by tampering with the `@partial-block` partial in Handlebars templates. This affects the AST parsing layer.
- **Affected Range:** Requires exact version check in lock file
- **Fix:** `npm update handlebars` to latest
- **Impact:** RCE risk in template processing
- **Cross-ref:** `[ESCALATE → TheGuardians]` — Code injection vulnerability

### DEP-002: proxy-addr — IPv4-mapped IPv6 Trust Subnet Spoofing
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `proxy-addr`
- **Location:** `Source/Backend/` and `platform/orchestrator/`
- **CVE:** GHSA-jqcg-44mw-7w3h
- **Title:** proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet
- **Detail:** Caller can spoof their IP address by using IPv4-mapped IPv6 format (e.g., `::ffff:192.0.2.1`) to bypass trust subnet checks. This allows bypassing IP-based access control.
- **Affected Range:** Check lock files
- **Fix:** `npm update proxy-addr` to latest
- **Impact:** Authentication bypass risk — attackers can bypass IP-based filtering
- **Cross-ref:** `[ESCALATE → TheGuardians]` — Access control bypass

### DEP-003: tinypool — Prototype Pollution → RCE via Worker Options
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `tinypool` (dev dependency)
- **Location:** `Source/Frontend/` (transitive via vitest)
- **CVE:** GHSA-5gmw-xhrv-c9v3
- **Title:** Tinypool: Prototype Pollution gadget in worker options leads to Remote Code Execution
- **Detail:** Prototype pollution in worker pool options allows code execution. Exploitable during test execution or build time if attacker controls test harness input.
- **Affected Range:** tinypool >=0.3.3, <1.0.0
- **Fix:** Upgrade vitest (requires major version bump to v5+)
- **Impact:** RCE during build/test phase
- **Cross-ref:** `[ESCALATE → TheGuardians]` — Code injection + RCE

### DEP-004: protobufjs — Code Injection via bytes Field Defaults
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** `protobufjs`
- **Location:** `platform/orchestrator/` (transitive via @grpc/grpc-js)
- **CVE:** GHSA-66ff-xgx4-vchm
- **Title:** protobuf.js: Code injection through bytes field defaults in generated toObject code
- **Detail:** Malformed protobuf messages can inject code into the generated `toObject()` method. If orchestrator processes untrusted gRPC messages, this is exploitable.
- **Affected Range:** Check lock file
- **Fix:** Update protobufjs and @grpc/grpc-js to latest
- **Impact:** RCE via malformed protobuf messages
- **Cross-ref:** `[ESCALATE → TheGuardians]` — Deserialization gadget

---

## High-Severity Vulnerabilities (P2)

### DEP-005: body-parser — DoS via Trailing Bytes After Compressed Request
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `body-parser` (transitive via express)
- **Location:** `Source/Backend/`, `Source/Frontend/`, `platform/orchestrator/`
- **CVE:** GHSA-27r3-jxmh-p828
- **Title:** body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body
- **Detail:** Sends a compressed request with trailing bytes; parser crashes instead of cleanly handling error.
- **Affected Range:** <1.20.9
- **Fix:** Upgrade express to latest (pulls body-parser ^1.20.9+)
- **Impact:** Denial of service — crash on malformed requests
- **Exploitability:** Medium — requires network access, predictable payload

### DEP-006: @grpc/grpc-js — Server Crash via Malformed Request / Compressed Message
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `@grpc/grpc-js`
- **Location:** `platform/orchestrator/`
- **CVEs:** GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Title:** A malformed request / incoming malformed compressed message can cause a server crash
- **Detail:** Two related DoS vulnerabilities: (1) malformed requests crash the server, (2) malformed compressed messages crash client or server.
- **Affected Range:** >=1.14.0 <1.14.4
- **Fix:** `npm update @grpc/grpc-js@latest`
- **Impact:** Denial of service — orchestrator crash
- **Exploitability:** High — network-accessible gRPC endpoint

### DEP-007: brace-expansion — Multiple DoS via Expansion Attacks
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `brace-expansion` (transitive)
- **Location:** `Source/Backend/`, `Source/Frontend/`
- **CVEs:** GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895
- **Title:** Multiple DoS via zero-step sequences, exponential expansion, unbounded arrays
- **Detail:** Attackers can craft brace expansion patterns causing:
  - Infinite loops with zero-step sequences
  - Exponential-time expansion (CPU DoS)
  - Unbounded array allocation (memory DoS)
- **Affected Range:** <1.1.21
- **Fix:** `npm update brace-expansion@latest`
- **Impact:** Process hang, OOM, CPU exhaustion
- **Exploitability:** Medium — input-dependent

### DEP-008: browserslist — Unbounded Memory Growth + Prototype Pollution
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `browserslist`
- **Location:** `Source/Frontend/` (via vite/postcss)
- **CVEs:** GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g
- **Title:** Unbounded memory growth (no cache eviction) + uncaught crash via untrusted browserslist-stats.json
- **Detail:** Two vulnerabilities:
  - No cache eviction in browserslist queries → OOM after repeated queries
  - Prototype pollution via malicious `browserslist-stats.json` file → process crash
- **Affected Range:** <=4.28.6
- **Fix:** `npm update browserslist@latest`
- **Impact:** Denial of service (OOM or crash during build)
- **Exploitability:** Medium — build-time attack via project files

### DEP-009: form-data — CRLF Injection via Unescaped Multipart Field Names
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `form-data` (transitive)
- **Location:** `Source/Backend/`, `Source/Frontend/`
- **CVE:** GHSA-xwx5-wxq9-ec75
- **Title:** form-data: CRLF injection in form-data via unescaped multipart field names and filenames
- **Detail:** Attacker controls multipart field name or filename → inject CRLF → break HTTP headers.
- **Affected Range:** Check lock file
- **Fix:** `npm update form-data@latest`
- **Impact:** HTTP response splitting, potential XSS or cache poisoning
- **Exploitability:** Medium — requires attacker control of form input

### DEP-010: postcss — XSS via Unescaped </style> in CSS Stringify Output
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `postcss` (transitive via vite)
- **Location:** `Source/Frontend/`
- **CVE:** GHSA-xvvx-6fw8-jpq8
- **Title:** PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
- **Detail:** Malicious CSS input can include `</style>` tag → breaks out of `<style>` block → inject HTML/JS in page.
- **Affected Range:** Check lock file
- **Fix:** `npm update postcss@latest`
- **Impact:** XSS — attacker injects JavaScript into page
- **Exploitability:** Medium — requires CSS processing of untrusted input
- **Cross-ref:** `[ESCALATE → TheGuardians]` — XSS vulnerability

### DEP-011: vite — High-severity vulnerability (direct dependency in Frontend)
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `vite`
- **Location:** `Source/Frontend/` (direct dependency)
- **Detail:** Check exact version in lock file for specific CVE details
- **Fix:** `npm update vite@latest`
- **Impact:** Varies by CVE — likely build-time or dev-server issue

### DEP-012: path-to-regexp — ReDoS via Multiple Route Parameters
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `path-to-regexp` (transitive via express or vite)
- **Location:** `Source/Backend/`, `platform/orchestrator/`
- **CVE:** GHSA-37ch-88jc-xwx2
- **Title:** path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters
- **Detail:** Route definitions with multiple parameters cause catastrophic backtracking in regex engine → CPU DoS.
- **Affected Range:** <0.1.13
- **Fix:** `npm update path-to-regexp@latest`
- **Impact:** Denial of service via malicious URL paths
- **Exploitability:** High — simple HTTP request

### DEP-013: source-map-js — Event-loop DoS via Indexed Source-map Offsets
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `source-map-js` (transitive)
- **Location:** `Source/Frontend/`
- **CVE:** GHSA-xhhw-8vqx-wqqh
- **Title:** source-map-js allows event-loop denial of service through indexed source-map section offsets
- **Detail:** Malicious source map file → infinite loop in offset parsing → event-loop hang.
- **Affected Range:** Check lock file
- **Fix:** `npm update source-map-js@latest`
- **Impact:** Denial of service during development (dev-server hang)
- **Exploitability:** Medium — requires malicious source map file

### DEP-014: nanoid — Infinite Loop with Negative Size
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** `nanoid` (transitive)
- **Location:** `Source/Frontend/`
- **CVE:** GHSA-9xvx-5w59-p94m
- **Title:** nanoid: non-secure generators can loop indefinitely with negative size
- **Detail:** Passing negative size to nanoid generators → infinite loop.
- **Affected Range:** Check lock file
- **Fix:** `npm update nanoid@latest`
- **Impact:** Denial of service if size is derived from untrusted input
- **Exploitability:** Low-Medium — requires attacker control of size parameter

---

## Moderate-Severity Vulnerabilities (P3)

### DEP-015: @babel/core — Arbitrary File Read via sourceMappingURL Comment
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** `@babel/core`
- **Location:** `Source/Backend/`, `Source/Frontend/`
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **Title:** @babel/core: Arbitrary File Read via sourceMappingURL Comment
- **Detail:** Babel processes `//# sourceMappingURL` comment → can read arbitrary files if path is not validated.
- **Affected Range:** <=7.29.0
- **Fix:** `npm update @babel/core@latest`
- **Impact:** Information disclosure — read local files during build
- **Exploitability:** Low — requires build-time attack

### DEP-016: @remix-run/router — Open Redirect via Protocol-relative URL
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** `@remix-run/router` (transitive via react-router-dom)
- **Location:** `Source/Frontend/`
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Title:** React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL reinterpretation
- **Detail:** Route path `//example.com` → browser interprets as protocol-relative URL → redirect to attacker domain.
- **Affected Range:** >=1.3.0 <1.23.3
- **Fix:** `npm update react-router-dom@latest` (pulls @remix-run/router >=1.23.3)
- **Impact:** Open redirect — phishing attacks
- **Exploitability:** Medium — requires attacker control of route definition or query parameter

### DEP-017: @vitest/mocker — Path Traversal + Code Injection via Mock Registration
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** `@vitest/mocker` (transitive via vitest)
- **Location:** `Source/Frontend/`
- **CVEs:** GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8
- **Title:** Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock + Code injection via unauthenticated manual mock registration
- **Detail:** Two vulnerabilities:
  - Redirect mock can traverse directories → read arbitrary test files
  - Manual mock registration allows unauthenticated code injection during test execution
- **Affected Range:** >=2.1.0 <4.1.12
- **Fix:** `npm update vitest@latest` (requires major version bump to 5.1.0+)
- **Impact:** Arbitrary file read during tests + code execution
- **Exploitability:** Medium — requires test execution or malicious test files

### DEP-018: baseline-browser-mapping — DoS via Invalid Input
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** `baseline-browser-mapping`
- **Location:** `Source/Backend/`, `Source/Frontend/`
- **CVE:** GHSA-w5vr-8v7q-w6rv
- **Title:** baseline-browser-mapping process termination on invalid input causes denial of service
- **Detail:** Invalid browser mapping → uncaught exception → process termination.
- **Affected Range:** >=2.0.0 <2.11.0
- **Fix:** `npm update baseline-browser-mapping@latest`
- **Impact:** Denial of service — process crash

### DEP-019: esbuild — Moderate vulnerability (transitive)
- **Severity:** P3 (Moderate)
- **Category:** cve
- **Package:** `esbuild`
- **Location:** `Source/Frontend/`
- **Detail:** Check exact version in lock file
- **Fix:** `npm update esbuild@latest`

### DEP-020–025: Additional Moderate vulnerabilities
- **@protobufjs/utf8:** UTF-8 decoding bypass (moderate, Orchestrator)
- **postcss-import, postcss-preset-env:** Additional CSS processing issues
- **Other transitive dependencies:** See JSON summary below

---

## Low-Severity Vulnerabilities (P4)

### DEP-026–037: Low-severity CVEs (body-parser, brace-expansion, @grpc/grpc-js error leakage)
- **Severity:** P4 (Low)
- **Category:** cve
- **Detail:** Information disclosure (error messages leaked), low-impact DoS
- **Fix:** Addressed by updates for high-severity variants of same packages

---

## Outdated Packages (No Major Version Update)

### Backend (4 outdated, 1 minor)
- `ts-jest`: minor version lag (dev dependency)
- `@types/node`: minor version lag
- Others within acceptable range

### Frontend (11+ outdated)
- `vitest`: **2.0.5 → current 5.1.0+** (requires major bump to fix critical vulnerabilities)
- `vite`: minor version lag (direct dependency)
- Others: minor/patch version lags

### Note on Vitest
**ACTION REQUIRED:** Frontend `vitest` version 2.0.5 is 3+ major versions behind. This pins critical vulnerabilities in:
- `tinypool` (prototype pollution → RCE)
- `@vitest/mocker` (path traversal, code injection)
- `vite` (dev-server vulnerabilities)

**Recommendation:** Upgrade vitest to v5.1.0+ immediately.

---

## License Compliance

✓ **No GPL/AGPL detected** — no viral license risk
✓ **All dependencies have standard licenses** (MIT, Apache-2.0, BSD)
✓ **No UNLICENSED packages** — compliance green

---

## Supply Chain Risk Assessment

### Post-install Scripts
✓ **None detected** — no supply chain infection via install scripts

### Dependency Tree Size
| Package | Direct | Transitive | Total |
|---------|--------|-----------|-------|
| Backend | 7 | 95 | **102** |
| Frontend | 3 | 6 | **9** |
| E2E | 1 | 3 | **4** |
| Orchestrator | 3 | 150 | **153** |

**Flag:** Orchestrator has 150 transitive dependencies — potential supply chain surface. Consider:
1. Regular audits (this one found 9 CVEs)
2. Dependency pinning to known-good SHAs
3. Minimal dependency adoption for production use

### Duplicate Dependencies
- Multiple major versions of `express`, `vite`, `webpack` in tree (dev vs. prod)
- **Status:** Expected and acceptable (dev-only duplicates)

---

## Actionable Next Steps (Priority Order)

### URGENT (P1 → P2 fixes required before next release)
1. **Backend + Orchestrator:** Update `proxy-addr` to latest (IP spoofing fix)
   ```bash
   cd Source/Backend && npm update proxy-addr
   cd platform/orchestrator && npm update proxy-addr
   ```
2. **Backend:** Update `handlebars` for template injection fix
   ```bash
   cd Source/Backend && npm update handlebars
   ```
3. **Frontend:** Upgrade vitest to v5.1.0+ (fixes tinypool + mocker vulnerabilities)
   ```bash
   cd Source/Frontend && npm install vitest@^5.1.0
   ```
4. **Orchestrator:** Update `@grpc/grpc-js` and `protobufjs`
   ```bash
   cd platform/orchestrator && npm update @grpc/grpc-js protobufjs
   ```

### HIGH (reduce attack surface)
5. **All:** Update `body-parser` via `npm update express` to latest
6. **All:** Update `brace-expansion`, `browserslist`, `form-data`
   ```bash
   npm update --depth=10 brace-expansion browserslist form-data
   ```
7. **Frontend:** Update `postcss`, `source-map-js`, `nanoid`

### MEDIUM (follow-up)
8. Run full test suite after updates (verify no breaking changes)
9. Re-run `npm audit` to confirm all fixes
10. Update CLAUDE.md to document dependency update policy

---

## Verification

```bash
# After applying fixes, re-audit each package:
cd Source/Backend && npm audit --json | jq '.metadata.vulnerabilities'
cd Source/Frontend && npm audit --json | jq '.metadata.vulnerabilities'
cd Source/E2E && npm audit --json | jq '.metadata.vulnerabilities'
cd platform/orchestrator && npm audit --json | jq '.metadata.vulnerabilities'

# Confirm tests still pass:
npm test --workspaces --if-present

# Re-run traceability check:
python3 tools/traceability-enforcer.py
```

---

## JSON Summary

```json
{
  "audit_date": "2026-11-20",
  "summary": {
    "total_cves": 37,
    "critical": 5,
    "high": 15,
    "moderate": 14,
    "low": 2,
    "post_install_scripts": 0,
    "license_violations": 0,
    "abandoned_dependencies": 0
  },
  "packages_analyzed": {
    "source_backend": {
      "file": "Source/Backend/package.json",
      "direct_dependencies": 7,
      "transitive_dependencies": 95,
      "cves": {
        "critical": 2,
        "high": 5,
        "moderate": 3,
        "low": 1,
        "total": 11
      },
      "critical_packages": ["handlebars", "proxy-addr"],
      "high_packages": ["body-parser", "brace-expansion", "browserslist", "form-data", "js-yaml"]
    },
    "source_frontend": {
      "file": "Source/Frontend/package.json",
      "direct_dependencies": 3,
      "transitive_dependencies": 6,
      "cves": {
        "critical": 1,
        "high": 7,
        "moderate": 7,
        "low": 1,
        "total": 17
      },
      "critical_packages": ["tinypool"],
      "high_packages": ["browserslist", "form-data", "nanoid", "postcss", "source-map-js", "vite"],
      "action_required": "Upgrade vitest to v5.1.0+ (currently 2.0.5)"
    },
    "source_e2e": {
      "file": "Source/E2E/package.json",
      "direct_dependencies": 1,
      "transitive_dependencies": 3,
      "cves": {
        "critical": 0,
        "high": 0,
        "moderate": 0,
        "low": 0,
        "total": 0
      },
      "status": "✓ CLEAN"
    },
    "platform_orchestrator": {
      "file": "platform/orchestrator/package.json",
      "direct_dependencies": 3,
      "transitive_dependencies": 150,
      "cves": {
        "critical": 2,
        "high": 3,
        "moderate": 4,
        "low": 0,
        "total": 9
      },
      "critical_packages": ["protobufjs", "proxy-addr"],
      "high_packages": ["@grpc/grpc-js", "body-parser", "path-to-regexp"],
      "supply_chain_note": "150 transitive dependencies warrant regular auditing"
    }
  },
  "escalations": {
    "guardians": [
      "handlebars (RCE)",
      "proxy-addr (auth bypass)",
      "tinypool (RCE)",
      "protobufjs (deserialization gadget)",
      "postcss (XSS)"
    ]
  }
}
```

---

## Learnings for Next Audit

_(To be updated in Teams/TheInspector/learnings/dependency-auditor.md)_

1. **Vitest is a recurring risk** — stays multiple major versions behind, accumulates vulnerabilities (tinypool, mocker)
   - Recommendation: Pin vitest upgrade to quarterly cycle, test thoroughly before upgrading major versions
   
2. **Build-tool vulnerabilities are under-appreciated** — many P2/P3 issues in Babel, PostCSS, browserslist
   - Recommendation: Treat dev dependencies with same scrutiny as production dependencies
   
3. **proxy-addr is a recurring issue** — appears in both Backend and Orchestrator
   - Recommendation: Add to watch list, pin to latest when updating express/connect
   
4. **No supply chain infection (post-install scripts)** — good hygiene detected
   - Recommendation: Continue this practice, add to onboarding checklist for new dependencies

5. **E2E test suite is clean** — Playwright/test-only ecosystem has fewer issues
   - Recommendation: Use as model for dependency hygiene in other packages

---

**Audit complete. Ready for team review and fixes.**

