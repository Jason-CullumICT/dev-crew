# Dependency Auditor Findings — 2026-08-25

## Executive Summary

**Overall Health Grade:** C

### Package Managers Detected
- npm (Node.js)

### Dependency Statistics

| Package | Direct Deps | Transitive Deps | Total Deps | CVEs | Grade |
|---------|------------|-----------------|-----------|------|-------|
| **Source/Backend** | 102 | 309 | 411 | 9 (1 critical) | C |
| **Source/Frontend** | 9 | 221 | 230 | 13 (1 critical) | D |
| **Source/E2E** | 4 | 0 | 4 | 0 | A |
| **platform/orchestrator** | 153 | 2 | 155 | 9 (1 critical) | C |

### Global Vulnerability Summary
- **Critical**: 3 findings (handlebars, vitest, protobufjs)
- **High**: 10 findings
- **Moderate**: 16 findings
- **Low**: 2 findings
- **Total CVEs**: 31 unique vulnerabilities (many with overlapping root causes)
- **Outdated Major Versions**: 8 packages >1 major version behind
- **Supply Chain Risk**: 941 total transitive dependencies across all packages

---

## Critical Findings (P1)

### DEP-001: Handlebars.js Multiple Critical RCE Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** handlebars@4.7.8
- **File:** Source/Backend/package.json (indirect dependency)
- **CVEs:** GHSA-2w6w-674q-4c4q (CVSS 9.8), GHSA-3mfm-83xf-c92r (CVSS 8.1), GHSA-xjpj-3mr7-gcpf (CVSS 8.2)
- **Detail:**
  - **GHSA-2w6w-674q-4c4q**: JavaScript injection via AST type confusion — allows attacker to execute arbitrary JavaScript (CVSS 9.8, CWE-94/843)
  - **GHSA-3mfm-83xf-c92r**: JavaScript injection via AST type confusion by tampering with @partial-block (CVSS 8.1)
  - **GHSA-xjpj-3mr7-gcpf**: JavaScript injection in CLI precompiler via unescaped names and options (CVSS 8.2, local/CLI)
  - Also: Prototype pollution (GHSA-2qvq-rjwj-gvw9), DoS via malformed decorators (GHSA-9cx6-37pm-9jff)
  - Affects range: >=4.0.0 <=4.7.8
- **Impact:** Remote code execution if handlebars templates are processed from untrusted sources
- **Fix:** `npm update handlebars` to >=4.7.9 (or latest 4.x)
- **Cross-ref:** [ESCALATE → TheGuardians] — If handlebars is used for email templates, user-supplied content, or plugin systems, this is exploitable
- **Tracking:** https://github.com/advisories/GHSA-2w6w-674q-4c4q

### DEP-002: Vitest Arbitrary File Read & Code Execution (Development-only)
- **Severity:** P1 (CRITICAL, dev-only)
- **Category:** CVE
- **Package:** vitest@3.2.5
- **File:** Source/Frontend/package.json (direct dev dependency)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** When Vitest UI server is listening, arbitrary files can be read and executed via path traversal. Allows remote code execution if the Vitest UI is exposed on a network interface.
- **Affected Range:** <3.2.6
- **Impact:** RCE during testing/development if UI server is accessible
- **Fix:** `npm update vitest` to >=3.2.6 then upgrade to @latest (4.1.11+)
- **Note:** This is a **dev-only** dependency but represents high supply chain risk during development. **Should NOT be exposed in CI/CD pipelines.**
- **Tracking:** https://github.com/advisories/GHSA-5xrq-8626-4rwp

### DEP-003: Protobufjs Multiple Critical & High RCE Vulnerabilities
- **Severity:** P1 (CRITICAL + High)
- **Category:** CVE
- **Package:** protobufjs@7.6.4
- **File:** platform/orchestrator/package.json (indirect via @grpc/grpc-js)
- **Primary CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8, arbitrary code execution)
- **Detail:**
  - **GHSA-xq3m-2v4x-88gg** (CRITICAL): Arbitrary code execution via unsafe code generation — crafted `.proto` files can inject arbitrary code into generated parsers
  - **GHSA-75px-5xx7-5xc7** (HIGH): Code generation gadget after prototype pollution
  - **GHSA-wcpc-wj8m-hjx6** (HIGH): DoS via unbounded Any expansion during JSON conversion
  - **GHSA-jvwf-75h9-cwgg** (HIGH): Process-wide DoS through unsafe option paths
  - Plus 7 additional CVEs (prototype injection, UTF-8 decoding, DoS via recursion, infinite loops)
  - Affects range: <=7.6.4
- **Impact:** Remote code execution if untrusted `.proto` files are loaded, or if malformed protobuf messages are processed
- **Fix:** `npm update protobufjs` to >=7.7.0 OR update @grpc/grpc-js to >=1.14.4+ which has a fixed protobufjs
- **Cross-ref:** [ESCALATE → TheGuardians] — Protobuf parsing is a critical entry point for the orchestrator
- **Tracking:** https://github.com/advisories/GHSA-xq3m-2v4x-88gg

---

## High-Severity Findings (P2)

### DEP-004: Brace-expansion DoS (>1 CVE)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** brace-expansion@1.1.17
- **File:** Source/Backend/package.json (indirect, via npm internals/glob patterns)
- **CVEs:**
  - **GHSA-3jxr-9vmj-r5cp** (CVSS 5.3): DoS via exponential-time expansion of consecutive non-expanding {} groups
  - **GHSA-mh99-v99m-4gvg** (CVSS 7.5): DoS via unbounded expansion length causing out-of-memory crash
  - **GHSA-rgw5-rvv9-x895** (CVSS 7.5): DoS via unbounded intermediate arrays, bypassing CVE-2026-14257 mitigation
- **Detail:** Malicious glob patterns can cause unbounded memory exhaustion or infinite loops
- **Affected Range:** <1.1.18
- **Impact:** Denial of service if the backend processes user-supplied glob patterns
- **Fix:** `npm update brace-expansion` to >=1.1.18
- **Tracking:** https://github.com/advisories/GHSA-mh99-v99m-4gvg

### DEP-005: JS-YAML Quadratic CPU DoS (>1 CVE)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** js-yaml@3.15.0
- **File:** Source/Backend/package.json (indirect)
- **CVEs:**
  - **GHSA-52cp-r559-cp3m** (CVSS 7.5): YAML merge-key chains force quadratic CPU consumption
  - **GHSA-5p4m-2wfm-xmqj** (CVSS 7.5): Quadratic CPU in !!omap resolution
  - **GHSA-h67p-54hq-rp68** (CVSS 5.3): Quadratic complexity DoS in merge key handling
- **Detail:** Crafted YAML files with repeated aliases or merge keys cause CPU exhaustion
- **Affected Range:** <3.15.1
- **Impact:** DoS if backend parses untrusted YAML configuration
- **Fix:** `npm update js-yaml` to >=3.15.1
- **Tracking:** https://github.com/advisories/GHSA-52cp-r559-cp3m

### DEP-006: Form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** form-data@4.0.5
- **File:** Source/Backend/package.json, Source/Frontend/package.json (indirect)
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** CRLF injection in multipart form data via unescaped field names and filenames — can tamper with HTTP headers and inject smuggling attacks
- **Affected Range:** >=4.0.0 <4.0.6
- **Impact:** Request smuggling if multipart uploads contain attacker-controlled filenames
- **Fix:** `npm update form-data` to >=4.0.6
- **Tracking:** https://github.com/advisories/GHSA-hmw2-7cc7-3qxx

### DEP-007: Vite `server.fs.deny` Bypass on Windows
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** vite@6.4.2
- **File:** Source/Frontend/package.json (direct dev dependency)
- **CVE:** GHSA-fx2h-pf6j-xcff (CVSS 7.5)
- **Detail:** Development server can be bypassed to read arbitrary files via Windows alternate paths (e.g., `CON`, `PRN` device names)
- **Affected Range:** <=6.4.2
- **Impact:** Arbitrary file read from dev machine during development (medium risk in CI, high risk on Windows devs)
- **Fix:** `npm update vite` to >=8.0.0 (requires major version bump due to other deps)
- **Tracking:** https://github.com/advisories/GHSA-fx2h-pf6j-xcff

### DEP-008: PostCSS Arbitrary File Read via sourceMappingURL (>1 CVE)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** postcss@8.5.22
- **File:** Source/Frontend/package.json (indirect)
- **CVEs:**
  - **GHSA-6g55-p6wh-862q** (CVSS 7.5): Arbitrary .map file read via attacker-controlled sourceMappingURL
  - **GHSA-r28c-9q8g-f849** (CVSS 7.5): Path traversal in source map auto-loading
- **Detail:** Malicious CSS comments with crafted sourceMappingURL can read arbitrary files from the build system
- **Affected Range:** <=8.5.22 (with incomplete fixes at 8.5.11 and 8.5.17)
- **Impact:** Information disclosure during CSS processing (dev/build-time)
- **Fix:** `npm update postcss` to >=8.5.23
- **Tracking:** https://github.com/advisories/GHSA-6g55-p6wh-862q

### DEP-009: nanoid Infinite Loop DoS (>1 CVE)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** nanoid@3.3.17
- **File:** Source/Frontend/package.json (indirect)
- **CVEs:**
  - **GHSA-28wg-ghj8-5hjv** (CVSS 5.9): Non-secure generators can loop indefinitely with negative size
  - **GHSA-2v37-7h3g-55p8** (CVSS 5.9): Custom generators loop indefinitely when size is zero
- **Detail:** Invalid input to ID generation functions causes infinite loops/DoS
- **Affected Range:** <3.3.18
- **Impact:** DoS if nanoid is called with attacker-controlled size parameters
- **Fix:** `npm update nanoid` to >=3.3.18
- **Tracking:** https://github.com/advisories/GHSA-28wg-ghj8-5hjv

### DEP-010: WebSocket (ws) Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** ws@8.20.1
- **File:** Source/Frontend/package.json (indirect)
- **CVE:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)
- **Detail:** Memory exhaustion DoS from tiny fragments and data chunks — attacker can crash the server with fragmented WebSocket messages
- **Affected Range:** >=8.0.0 <8.21.0
- **Impact:** DoS if your application accepts WebSocket connections
- **Fix:** `npm update ws` to >=8.21.0
- **Tracking:** https://github.com/advisories/GHSA-96hv-2xvq-fx4p

### DEP-011: gRPC Malformed Request Crash
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** @grpc/grpc-js@1.14.3
- **File:** platform/orchestrator/package.json (indirect)
- **CVEs:**
  - **GHSA-5375-pq7m-f5r2** (CVSS 7.5): Malformed request causes server crash
  - **GHSA-99f4-grh7-6pcq** (CVSS 7.5): Incoming malformed compressed message causes client/server crash
- **Detail:** Unvalidated input in gRPC message processing allows remote crash
- **Affected Range:** >=1.14.0 <1.14.4
- **Impact:** DoS of the orchestrator service
- **Fix:** `npm update @grpc/grpc-js` to >=1.14.4
- **Tracking:** https://github.com/advisories/GHSA-5375-pq7m-f5r2

### DEP-012: React Router Open Redirect (>1 CVE)
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** react-router-dom@6.30.4 / @remix-run/router@1.23.2
- **File:** Source/Frontend/package.json
- **CVEs:**
  - **GHSA-2j2x-hqr9-3h42** (via @remix-run/router): Same-origin redirect with path starting `//` causes protocol-relative URL open redirect
  - **GHSA-wrjc-x8rr-h8h6**: Open redirect via backslash in `<Link>` and `useNavigate`
  - **GHSA-jjmj-jmhj-qwj2**: Open redirect leading to XSS (in 6.30.2-6.30.4)
- **Affected Range:** react-router-dom 6.0.0-7.17.0 / @remix-run/router >=1.3.0 <1.23.3
- **Impact:** Phishing attacks if app uses user-supplied redirects via URL parameters
- **Fix:** `npm update react-router-dom` to >=7.18.0 (requires React Router 7.x upgrade) OR patch to react-router-dom@6.30.5+
- **Tracking:** https://github.com/advisories/GHSA-2j2x-hqr9-3h42

### DEP-013: path-to-regexp ReDoS
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** path-to-regexp@0.1.12
- **File:** platform/orchestrator/package.json (indirect, via express)
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Regular expression denial of service via route patterns with multiple parameters — attackers can craft URLs to consume unbounded CPU
- **Affected Range:** <0.1.13
- **Impact:** DoS of orchestrator API endpoints
- **Fix:** Update express (which bundles a newer path-to-regexp)
- **Tracking:** https://github.com/advisories/GHSA-37ch-88jc-xwx2

---

## Moderate-Severity Findings (P3)

### DEP-014: uuid Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** uuid@9.0.1
- **File:** Source/Backend/package.json (direct), platform/orchestrator/package.json (indirect via dockerode)
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Detail:** Missing buffer bounds check in v3/v5/v6 when `buf` is provided — can cause buffer overrun
- **Affected Range:** <11.1.1 (current: 9.0.1 in Backend)
- **Impact:** Potential memory corruption if UUID generation is exposed to untrusted input
- **Fix:** `npm update uuid` to >=11.1.1 (requires major version bump from 9.x to 11.x)
- **Note:** Backend is 5 major versions behind (9.0.1 vs. latest 14.0.2) — also a P3 outdated concern
- **Tracking:** https://github.com/advisories/GHSA-w5hq-g745-h8pq

### DEP-015: Express / qs DoS via Null Entries
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** express@4.22.1, qs@6.15.1
- **File:** Source/Backend/package.json, platform/orchestrator/package.json
- **CVE:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3)
- **Detail:** `qs.stringify` crashes with TypeError on null/undefined entries in comma-format arrays when `encodeValuesOnly` is set
- **Affected Range:** qs >=6.11.1 <=6.15.1
- **Impact:** DoS if request body contains malformed query string arrays
- **Fix:** `npm update express` (which pulls qs >=6.15.2)
- **Tracking:** https://github.com/advisories/GHSA-q8mj-m7cp-5q26

### DEP-016: body-parser DoS via Invalid Limit
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** body-parser@1.20.5
- **File:** Source/Backend/package.json, platform/orchestrator/package.json (indirect via express)
- **CVE:** GHSA-v422-hmwv-36x6 (CVSS 3.7)
- **Detail:** Invalid `limit` value silently disables size enforcement — can lead to unbounded request processing
- **Affected Range:** <1.20.6
- **Impact:** DoS if body-parser misconfiguration or invalid limit bypasses size checks
- **Fix:** `npm update express` or directly `npm install body-parser@>=1.20.6`
- **Tracking:** https://github.com/advisories/GHSA-v422-hmwv-36x6

### DEP-017: PostCSS XSS via Unescaped </style>
- **Severity:** P3 (MODERATE, low impact)
- **Category:** CVE
- **Package:** postcss@8.5.22
- **File:** Source/Frontend/package.json (indirect)
- **CVE:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** XSS via unescaped `</style>` in CSS stringify output — affects server-side CSS-in-JS rendering
- **Affected Range:** <8.5.10
- **Impact:** XSS if generated CSS is embedded in HTML without proper escaping
- **Fix:** `npm update postcss` to >=8.5.23
- **Tracking:** https://github.com/advisories/GHSA-qx2v-qp2m-jg93

### DEP-018: @babel/core Arbitrary File Read
- **Severity:** P3 (LOW, local-only)
- **Category:** CVE
- **Package:** @babel/core@7.29.0
- **File:** Source/Backend/package.json, Source/Frontend/package.json (indirect)
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Detail:** Arbitrary file read via sourceMappingURL comment — local build-time risk
- **Affected Range:** <=7.29.0
- **Impact:** Dev/build-time information disclosure
- **Fix:** `npm update @babel/core` to >=7.30.0
- **Tracking:** https://github.com/advisories/GHSA-4x5r-pxfx-6jf8

### DEP-019: esbuild & Vite Path Traversal
- **Severity:** P3 (MODERATE, dev-only)
- **Category:** CVE
- **Package:** esbuild@0.24.2, vite@6.4.2
- **File:** Source/Frontend/package.json (indirect)
- **CVEs:**
  - **GHSA-67mh-4wv8-2f99** (esbuild, CVSS 5.3): Development server CORS bypass — any website can send requests to dev server
  - **GHSA-4w7w-66w2-5vf9** (vite, CVSS not scored): Path traversal in optimized deps `.map` handling
- **Affected Range:** esbuild <=0.24.2
- **Impact:** Dev-time security issue (info disclosure from dev server)
- **Fix:** Upgrade vite to >=8.0.0
- **Tracking:** https://github.com/advisories/GHSA-67mh-4wv8-2f99

### DEP-020: @protobufjs/utf8 Overlong UTF-8 Decoding
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** @protobufjs/utf8@1.1.0
- **File:** platform/orchestrator/package.json (indirect via protobufjs)
- **CVE:** GHSA-q6x5-8v7m-xcrf (CVSS 5.3)
- **Detail:** Overlong UTF-8 decoding — can decode malformed UTF-8 sequences that should be rejected
- **Affected Range:** <=1.1.0
- **Impact:** Potential data integrity issue if malformed UTF-8 bypasses validation
- **Fix:** Update protobufjs to >=7.7.0
- **Tracking:** https://github.com/advisories/GHSA-q6x5-8v7m-xcrf

### DEP-021: dockerode Major Version Behind
- **Severity:** P3 (MODERATE)
- **Category:** Outdated
- **Package:** dockerode@4.0.12
- **File:** platform/orchestrator/package.json (direct)
- **Current:** 4.0.12
- **Latest:** 5.0.1 (1 major version behind)
- **Impact:** Missing security patches and bug fixes for Docker API interactions
- **Fix:** `npm update dockerode` to >=5.0.1 (requires testing due to major version bump)
- **Note:** No specific CVEs in 4.x, but uuid vulnerability indirectly affects this package

---

## Additional Issues (P3-P4)

### DEP-022: Outdated Major Versions Across Codebase
- **Severity:** P3 (MODERATE)
- **Category:** Outdated dependencies
- **Packages:**
  
| Package | Current | Wanted | Latest | Major Gap | Risk |
|---------|---------|--------|--------|-----------|------|
| Source/Backend: pino | 8.21.0 | 8.21.0 | 10.3.1 | 2 major | Likely missing security patches |
| Source/Backend: uuid | 9.0.1 | 9.0.1 | 14.0.2 | 5 major | CVE-GHSA-w5hq-g745-h8pq in <11.1.1 |
| Source/Frontend: react | 18.3.1 | 18.3.1 | 19.2.8 | 1 major | Missing performance improvements |
| Source/Frontend: react-dom | 18.3.1 | 18.3.1 | 19.2.8 | 1 major | Same as react |
| Source/Frontend: react-router-dom | 6.30.6 | 6.30.6 | 7.18.2 | 1 major | Multiple CVEs in 6.x (see DEP-012) |
| platform/orchestrator: express | 4.22.1 | 4.22.2 | 5.2.1 | 1 major | Minimal — v4 is stable LTS |
| platform/orchestrator: multer | 1.4.5-lts.2 | 1.4.5-lts.2 | 2.2.0 | 1 major | Should consider upgrade |

- **Recommendation:** Prioritize React Router DOM upgrade (has active CVEs) and uuid update (bounds check fix)
- **Fix:** Create upgrade plan per feature team with testing gates

### DEP-023: Large Transitive Dependency Tree
- **Severity:** P4 (INFORMATIONAL)
- **Category:** Supply chain risk
- **Finding:**
  - **Backend:** 411 total (102 direct, 309 transitive) = 75% transitive ratio
  - **Frontend:** 230 total (9 direct, 221 transitive) = 96% transitive ratio ⚠️ High risk
  - **Orchestrator:** 155 total (153 direct, 2 transitive) = 1% transitive ratio ✅ Low risk
  - **E2E:** 4 total (4 direct, 0 transitive) = 0% transitive ratio ✅ Clean
- **Impact:** Large dependency trees increase attack surface (more code in supply chain)
- **Recommendation:**
  - Frontend should audit why 96% are transitive — likely due to React ecosystem
  - Consider dependency consolidation or tree-shaking

### DEP-024: License Compliance Check (Not Run)
- **Severity:** P4 (INFO)
- **Category:** License compliance
- **Finding:** `license-checker` tool not installed; manual license review recommended
- **Action:** Run `npm install -g license-checker && license-checker --json > license-report.json` for each package
- **Watch for:** GPL/AGPL licenses in non-GPL projects (viral risk)

---

## Recommended Immediate Actions (Next Sprint)

### P1 — Must Fix
1. **Handlebars (DEP-001):** Identify where handlebars is used in Backend
   - If used for email templates or doc generation: **CRITICAL** — upgrade immediately
   - If unused: remove dependency
   - Update to: `npm install --save handlebars@>=4.7.9`

2. **Vitest (DEP-002):** Dev-only risk but upgrade required
   - Disable Vitest UI in CI/CD (never expose on network)
   - Update to: `npm install --save-dev vitest@>=3.2.6` then `npm update vitest` to latest
   - **Note:** This is a major version bump requirement (3.x → 4.x)

3. **Protobufjs (DEP-003):** Orchestrator service critical
   - Update to: `npm install --save protobufjs@>=7.7.0`
   - Or update @grpc/grpc-js which may pull a fixed version
   - Test gRPC message parsing thoroughly

### P2 — Fix This Sprint
1. **Brace-expansion:** `npm update brace-expansion` (DEP-004)
2. **JS-YAML:** `npm update js-yaml` (DEP-005)
3. **Form-data:** `npm update form-data` (DEP-006)
4. **Vite/esbuild:** Major version upgrade path (DEP-007)
5. **PostCSS:** `npm update postcss` (DEP-008)
6. **nanoid:** `npm update nanoid` (DEP-009)
7. **ws:** `npm update ws` (DEP-010)
8. **gRPC:** `npm update @grpc/grpc-js` (DEP-011)
9. **React Router:** Plan upgrade to 7.x (DEP-012, DEP-022)

### P3 — Plan for Next Iteration
1. **uuid:** Upgrade Backend from 9.0.1 to >=11.1.1 (requires testing)
2. **Express:** Can safely update to 4.22.2+ (patch-level, no breaking changes)
3. **Pino (Backend):** Evaluate upgrade from 8.x to 10.x (logging dependency)
4. **Multer (Orchestrator):** Consider upgrade to 2.x (file upload handling)

---

## Known Limitations

- **License checker:** Not run — requires `npm install -g license-checker`
- **Abandoned dependencies:** Not checked — would require GitHub API scanning or registry lookups
- **Supply chain scanning:** No package provenance/signing verification
- **Dev vs. Prod separation:** Some dev-only CVEs (vitest, vite) have lower deployment risk but same development risk

---

## JSON Summary

```json
{
  "audit_date": "2026-08-25",
  "audit_tool": "npm audit",
  "packages_scanned": 4,
  "total_direct_dependencies": 268,
  "total_transitive_dependencies": 673,
  "vulnerabilities": {
    "critical": 3,
    "high": 10,
    "moderate": 16,
    "low": 2,
    "total": 31
  },
  "by_package": {
    "Source/Backend": {
      "direct": 102,
      "transitive": 309,
      "vulns": {"critical": 1, "high": 3, "moderate": 4, "low": 1},
      "grade": "C"
    },
    "Source/Frontend": {
      "direct": 9,
      "transitive": 221,
      "vulns": {"critical": 1, "high": 5, "moderate": 6, "low": 1},
      "grade": "D"
    },
    "Source/E2E": {
      "direct": 4,
      "transitive": 0,
      "vulns": {"critical": 0, "high": 0, "moderate": 0, "low": 0},
      "grade": "A"
    },
    "platform/orchestrator": {
      "direct": 153,
      "transitive": 2,
      "vulns": {"critical": 1, "high": 2, "moderate": 6, "low": 0},
      "grade": "C"
    }
  },
  "outdated_major_versions": 8,
  "p1_findings": 3,
  "p2_findings": 10,
  "p3_findings": 7,
  "p4_findings": 2,
  "recommendation": "Address P1 findings (handlebars, vitest, protobufjs) immediately. Create sprint to fix P2 high-severity CVEs. Plan major version upgrades for React, React Router, and uuid."
}
```

---

## Cross-References

- [ESCALATE → TheGuardians] DEP-001 (Handlebars RCE), DEP-003 (Protobufjs RCE)
- [SEE Outdated Manager] DEP-022 for version update plan
- [SEE Performance Profiler] Outdated pino (8.x vs 10.x) may have performance fixes

---

**Audit Report:** Generated by Dependency Auditor (Haiku model)  
**Next Audit:** Schedule weekly or when major dependency changes  
**Maintenance:** Update `Teams/TheInspector/learnings/dependency-auditor.md` with findings
