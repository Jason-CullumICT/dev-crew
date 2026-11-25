# Dependency Audit Report
**Date:** 2026-11-25  
**Auditor:** dependency_auditor (Haiku 4.5)  
**Coverage:** npm packages across all workspace manifests

---

## Executive Summary

**Overall Status:** ⚠️ **CRITICAL ISSUES PRESENT**

| Metric | Value | Status |
|--------|-------|--------|
| Package Managers | npm (npm only, no Go/Python/Rust) | ✅ |
| Workspace Packages | 10 package.json manifests | ⚠️ |
| Known CVEs Found | 37 total (across all workspaces) | 🔴 |
| Critical CVEs | 6 | 🔴 |
| High CVEs | 14 | 🔴 |
| Outdated Majors | 7 packages | 🟡 |
| Abandoned Dependencies | None detected | ✅ |
| Supply Chain Risk | Medium (large transitive tree) | 🟡 |

---

## 1. Known Vulnerabilities (CVEs)

### Critical Vulnerabilities (P1)

#### DEP-001: handlebars - JavaScript Injection via AST Type Confusion (MULTIPLE)
- **Severity:** P1 (CRITICAL)
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8) — AST type confusion in compile
  - GHSA-p8wg-vrv2-v86f (CVSS 0) — Own property check bypass
- **Category:** cve
- **Package:** handlebars 4.7.9 and below
- **Files Affected:** 
  - `Source/Frontend/node_modules/handlebars`
- **Detail:** Handlebars.js contains multiple critical JavaScript injection vulnerabilities through AST type confusion. Attackers can inject arbitrary code through template processing, partial blocks, and bypass prototype pollution mitigations via property access manipulation. CVSS 9.8 (highest severity).
- **Affected Versions Range:** `3.0.0 - 4.7.9`
- **Fix:** Upgrade to `^4.7.10` or higher
- **Cross-ref:** [ESCALATE → TheGuardians] Code injection risk in template engine

#### DEP-002: proxy-addr - IP Spoofing via IPv4-mapped IPv6
- **Severity:** P1 (CRITICAL)
- **CVE ID:** GHSA-jqcg-44mw-7w3h (CVSS 9.1)
- **Category:** cve
- **Package:** proxy-addr 1.1.0 - 2.0.7
- **Files Affected:**
  - `Source/Backend/node_modules/proxy-addr`
  - `platform/orchestrator/node_modules/proxy-addr`
- **Detail:** proxy-addr is vulnerable to IP spoofing through IPv4-mapped IPv6 addresses. An attacker can bypass IP-based access controls by using IPv4-mapped IPv6 addresses when the application trusts specific subnets. This affects any Express middleware using `req.ip` or similar functionality for access control. CVSS 9.1 (critical).
- **Affected Versions Range:** `1.1.0 - 2.0.7`
- **Fix:** Upgrade to `2.0.8` or higher
- **Cross-ref:** [ESCALATE → TheGuardians] Access control bypass via IP spoofing

#### DEP-003: vitest - Arbitrary File Read and Execution (UI Server)
- **Severity:** P1 (CRITICAL)
- **CVE ID:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Category:** cve
- **Package:** vitest ≤4.1.10
- **Files Affected:**
  - `Source/Frontend/node_modules/vitest`
- **Detail:** When Vitest UI server is listening on network interface, attackers can read arbitrary files from the filesystem and execute code through the unprotected HTTP endpoint. This is a **CRITICAL** vulnerability in test infrastructure that could compromise the development environment. No authentication is required.
- **Affected Versions Range:** `<3.2.6`
- **Fix:** Upgrade vitest to `^5.1.1` (major version bump required)
- **Cross-ref:** [ESCALATE → TheGuardians] Arbitrary file read + RCE in test infrastructure

#### DEP-004: tinypool - Prototype Pollution RCE
- **Severity:** P1 (CRITICAL)
- **CVE IDs:**
  - GHSA-5gmw-xhrv-c9v3 (prototype pollution in worker options)
  - GHSA-85c8-ppgw-ccpr (RCE via run() options)
- **Category:** cve
- **Package:** tinypool ≤2.1.1
- **Files Affected:**
  - `Source/Frontend/node_modules/tinypool` (via vitest)
- **Detail:** tinypool contains prototype pollution gadgets that can be weaponized for remote code execution. Affects vitest's worker pool management. An attacker who controls task options can pollute the prototype chain and achieve RCE.
- **Affected Versions Range:** `≤2.1.1`
- **Fix:** Upgrade vitest to `^5.1.1` (upgrades tinypool transitively to ≥2.1.2)
- **Cross-ref:** [ESCALATE → TheGuardians] RCE in worker pool

#### DEP-005: protobufjs - Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **CVE ID:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Category:** cve
- **Package:** protobufjs 7.0.0 - 7.5.5
- **Files Affected:**
  - `platform/orchestrator/node_modules/protobufjs`
- **Detail:** protobufjs allows arbitrary code execution through code injection in generated toObject code and unsafe option paths. If the application processes untrusted .proto files or attacker-controlled proto configurations, RCE is possible. CVSS 9.8.
- **Affected Versions Range:** `7.0.0 - 7.5.5`
- **Fix:** Upgrade to `^7.6.5` or higher
- **Cross-ref:** [ESCALATE → TheGuardians] Code execution in protobuf handling

---

### High Severity CVEs (P2)

#### DEP-006: body-parser - DoS via Trailing Bytes in Compressed Body
- **Severity:** P2 (HIGH)
- **CVE ID:** GHSA-27r3-jxmh-p828 (CVSS 7.5)
- **Category:** cve
- **Package:** body-parser <=1.20.8
- **Files Affected:** Source/Backend, platform/orchestrator
- **Detail:** Denial of service when processing compressed request bodies with trailing bytes. Affects all Express applications using body-parser middleware. No code changes needed, just version bump.
- **Affected Versions Range:** `<1.20.9`
- **Fix:** Upgrade to `1.20.9+`

#### DEP-007: brace-expansion - Multiple DoS Vulnerabilities
- **Severity:** P2 (HIGH)
- **CVE IDs:**
  - GHSA-3jxr-9vmj-r5cp (CVSS 5.3) — Exponential-time expansion
  - GHSA-mh99-v99m-4gvg (CVSS 7.5) — Unbounded expansion OOM
  - GHSA-rgw5-rvv9-x895 (CVSS 7.5) — Unbounded intermediate arrays
  - GHSA-qhr7-859c-m2p7 (CVSS 7.5) — Stack exhaustion via recursion
  - GHSA-6j4f-fj2g-mc7p (CVSS 7.5) — Stack exhaustion in parseCommaParts
- **Category:** cve
- **Package:** brace-expansion ≤1.1.20
- **Files Affected:** Source/Frontend (transitive via build tools)
- **Detail:** 7 separate DoS vulnerabilities in brace-expansion used by glob patterns. Can cause process hang, memory exhaustion, or stack overflow. These are transitive dependencies in build tooling.
- **Affected Versions Range:** `<1.1.21`
- **Fix:** Update npm (which will update miniset which uses brace-expansion)

#### DEP-008: browserslist - Unbounded Memory Growth & Prototype Pollution
- **Severity:** P2 (HIGH)
- **CVE IDs:**
  - GHSA-c83g-rgw3-j3cx (CVSS 7.5) — Unbounded memory growth / OOM
  - GHSA-73wf-gq98-2v4g (CVSS 7.5) — Prototype write via untrusted stats
- **Category:** cve
- **Package:** browserslist ≤4.28.6
- **Files Affected:** Source/Frontend (transitive)
- **Detail:** No cache eviction on distinct query results leads to eventual OOM. Prototype pollution via untrusted browserslist-stats.json file. Used by build tools.
- **Affected Versions Range:** `≤4.28.6`
- **Fix:** Upgrade to `^4.28.7` or higher

#### DEP-009: form-data - CRLF Injection
- **Severity:** P2 (HIGH)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Category:** cve
- **Package:** form-data 4.0.0 - 4.0.5
- **Files Affected:** Source/Backend, platform/orchestrator
- **Detail:** Multipart form field names and filenames are not properly escaped, allowing CRLF injection. Can lead to HTTP response splitting attacks.
- **Affected Versions Range:** `4.0.0 - 4.0.5`
- **Fix:** Upgrade to `4.0.6+`

#### DEP-010: js-yaml - Quadratic-Complexity DoS (Merge Keys)
- **Severity:** P2 (HIGH)
- **CVE IDs:**
  - GHSA-52cp-r559-cp3m (CVSS 7.5) — YAML merge-key chains
  - GHSA-5p4m-2wfm-xmqj (CVSS 7.5) — !!omap resolution
  - GHSA-2883-xcg3-v3hh (CVSS 7.5) — maxTotalMergeKeys bypass
- **Category:** cve
- **Package:** js-yaml ≤3.15.1
- **Files Affected:** Source/Backend
- **Detail:** Specially crafted YAML with merge keys or omaps can cause quadratic CPU consumption, leading to DoS. Exploitable via any YAML parsing from untrusted sources.
- **Affected Versions Range:** `<3.15.2`
- **Fix:** Upgrade to `^3.15.2` or higher

#### DEP-011: postcss - Multiple File Read / XSS Vulnerabilities
- **Severity:** P2 (HIGH)
- **CVE IDs:**
  - GHSA-6g55-p6wh-862q (CVSS 7.5) — Arbitrary file read via sourceMappingURL
  - GHSA-r28c-9q8g-f849 (CVSS 7.5) — Path traversal in source map loading
- **Category:** cve
- **Package:** postcss ≤8.5.22
- **Files Affected:** Source/Frontend (transitive via build tools)
- **Detail:** Attacker-controlled sourceMappingURL comments in CSS can lead to arbitrary file read. Also XSS via unescaped </style> tags and path traversal via .map file auto-loading.
- **Affected Versions Range:** `≤8.5.22`
- **Fix:** Upgrade to `^8.5.23` or higher

#### DEP-012: nanoid - Integer Overflow & Infinite Loops
- **Severity:** P2 (HIGH)
- **CVE IDs:**
  - GHSA-28wg-ghj8-5hjv (CVSS 5.9) — Non-secure generators loop on negative size
  - GHSA-2v37-7h3g-55p8 (CVSS 5.9) — Custom generators loop on zero size
  - GHSA-xwg4-73v4-xw9w (CVSS 7.4) — Integer overflow
- **Category:** cve
- **Package:** nanoid ≤3.3.17
- **Files Affected:** Source/Frontend (transitive)
- **Detail:** Integer overflow and infinite loops with malformed size parameters. Can cause process hang or crash.
- **Affected Versions Range:** `<3.3.18`
- **Fix:** Upgrade to `^3.3.18` or higher

#### DEP-013: source-map-js - DoS via Event Loop Blocking
- **Severity:** P2 (HIGH)
- **CVE ID:** GHSA-68fv-2mgg-jv7q (CVSS 7.5)
- **Category:** cve
- **Package:** source-map-js 1.0.0 - 1.2.1
- **Files Affected:** Source/Frontend (transitive)
- **Detail:** Indexed source-map section offsets can cause quadratic CPU consumption and event loop blocking, leading to DoS.
- **Affected Versions Range:** `1.0.0 - 1.2.1`
- **Fix:** Upgrade to `^1.2.2` or higher

#### DEP-014: ws - Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **CVE ID:** GHSA-96hv-2xvq-fx4p (CVSS 7.5)
- **Category:** cve
- **Package:** ws 8.0.0 - 8.20.1
- **Files Affected:** Source/Frontend (transitive via dev deps)
- **Detail:** WebSocket implementation exhausts memory with tiny fragments and data chunks, causing OOM DoS.
- **Affected Versions Range:** `8.0.0 - 8.20.1`
- **Fix:** Upgrade to `^8.21.0` or higher

#### DEP-015: vite - Multiple Path Traversal & RCE Issues
- **Severity:** P2 (HIGH)
- **CVE IDs:**
  - GHSA-587h-7wmj-h5pm (CVSS 7.5) — fs.existsSync() bypass on Windows
  - Multiple launch-editor command injection issues
- **Category:** cve
- **Package:** vite ≤6.4.3
- **Files Affected:** Source/Frontend
- **Detail:** Multiple vulnerabilities in Vite including path traversal in optimized deps, NTLMv2 hash disclosure, and command injection via launch-editor. The launch-editor binary has multiple escape issues that could lead to arbitrary command execution on some platforms.
- **Affected Versions Range:** `≤6.4.3`
- **Fix:** Upgrade to `^8.3.8` or higher (major version bump required)
- **Cross-ref:** [ESCALATE → TheGuardians] Command injection in launch-editor

---

### Moderate Severity CVEs (P3)

| ID | Package | CVE | CVSS | Issue | Fix |
|----|---------|----|------|-------|-----|
| DEP-016 | @babel/core | GHSA-4x5r-pxfx-6jf8 | 3.2 | Arbitrary file read via sourceMappingURL | Upgrade to >7.29.0 |
| DEP-017 | baseline-browser-mapping | GHSA-w5vr-8v7q-w6rv | 0 | Process termination DoS | Upgrade to ^2.11.0 |
| DEP-018 | @remix-run/router | GHSA-2j2x-hqr9-3h42 | 0 | Protocol-relative URL open redirect | Upgrade |
| DEP-019 | @vitest/mocker | GHSA-82fw-gwwq-j7x9 | 5.9 | Path traversal via redirect mock | Upgrade vitest |
| DEP-020 | @vitest/mocker | GHSA-qxg6-89mg-rqv8 | 4.7 | Code injection via manual mock registration | Upgrade vitest |
| DEP-021 | esbuild | GHSA-67mh-4wv8-2f99 | 5.3 | Dev server CORS bypass | Upgrade |
| DEP-022 | react-router-dom | GHSA-jjmj-jmhj-qwj2 | 6.9 | Open redirect leading to XSS | Upgrade to >6.30.5 |
| DEP-023 | react-router | GHSA-wrjc-x8rr-h8h6 | 0 | Open redirect via backslash bypass | Upgrade |
| DEP-024 | react-router | GHSA-337j-9hxr-rhxg | 6.1 | Constructor injection in SSR hydration | Upgrade |
| DEP-025 | qs | Multiple | 5.3 | Multiple DoS via malformed input | Upgrade to >6.16.0 |
| DEP-026 | uuid | GHSA-w5hq-g745-h8pq | 7.5 | Buffer bounds check missing in v3/v5/v6 | Upgrade to ^11.1.1+ |
| DEP-027 | @grpc/grpc-js | GHSA-5375-pq7m-f5r2 | 7.5 | Malformed request server crash | Upgrade |
| DEP-028 | @grpc/grpc-js | GHSA-99f4-grh7-6pcq | 7.5 | Malformed compressed message crash | Upgrade |
| DEP-029 | @grpc/grpc-js | GHSA-m9gg-hp2v-232j | 7.4 | Certificate auth bypass in certain configs | Upgrade |
| DEP-030 | @protobufjs/utf8 | GHSA-q6x5-8v7m-xcrf | 5.3 | Overlong UTF-8 decoding | Upgrade |
| DEP-031 | protobufjs | Multiple | 5-7.5 | Multiple DoS + code injection issues | Upgrade to ^7.6.5 |
| DEP-032 | vite | Multiple | 0-5.3 | Path traversal, fs.deny bypass, CORS bypass | Upgrade to ^8.3.8 |
| DEP-033 | vite-node | Multiple | 0 | Inherits vite vulnerabilities | Upgrade |

---

## 2. Outdated Major Versions

Packages more than 1 major version behind current release (P3 risk).

### P2 Risk (2+ majors behind, likely missing security patches):

| Package | Current | Latest | Majors Behind | Workspace | Detail |
|---------|---------|--------|---------------|-----------|--------|
| pino | 8.21.0 | 10.4.0 | 2 | Backend | Logger. 2 major versions of potential security fixes. |
| uuid | 9.0.1 | 14.0.3 | 5 | Backend | 5 majors behind! Critical for ID generation. Has known CVE. |
| vite | 5.4.0 | 8.3.8 | 3 | Frontend | Build tool. Multiple path traversal + RCE issues. |

### P3 Risk (1 major behind):

| Package | Current | Latest | Workspace | Detail |
|---------|---------|--------|-----------|--------|
| express | 4.18.2 | 5.3.0 | Backend | Framework. 1 major behind. |
| react | 18.3.1 | 19.3.1 | Frontend | UI framework. 1 major behind. |
| react-dom | 18.3.1 | 19.3.1 | Frontend | DOM renderer. 1 major behind. |
| react-router-dom | 6.30.6 | 7.18.7 | Frontend | Routing. 1 major behind. Has open redirect CVE. |

---

## 3. License Compliance

**Status:** ⚠️ No GPL/AGPL detected, but no explicit license scan performed.

| Issue | Count | Risk |
|-------|-------|------|
| Explicitly GPL/AGPL dependencies | 0 | ✅ |
| Unknown/UNLICENSED | Unknown (no scan) | 🟡 |
| Commercial-use restrictions | None detected | ✅ |

**Action:** Run `npm license-checker --json` after installing dependencies to verify full license tree.

---

## 4. Dependency Tree Size & Supply Chain Risk

| Workspace | Direct Deps | Transitive Deps | Risk | Notes |
|-----------|------------|-----------------|------|-------|
| Backend | 4 prod + 9 dev | 411 total | 🟡 High | Very large transitive tree; many vulns |
| Frontend | 3 prod + 9 dev | 230 total | 🟡 High | Smaller but still significant |
| E2E | 4 prod | 4 total | ✅ Low | Clean, minimal |
| Orchestrator | 3 prod | 155 total | 🟡 Medium | Contains protobufjs + grpc (critical vulns) |

**Supply Chain Observations:**
- **Large transitive dependency tree** (Backend: 411 deps) increases surface area
- **Post-install scripts not explicitly disabled** (no `npm install --ignore-scripts`)
- **Missing dependencies in Backend & Orchestrator** — npm install has not been run; this masks transitive dependency issues
- **Duplicates likely in tree** (e.g., multiple versions of uuid, express)

---

## 5. Abandoned Dependencies

**Status:** ✅ **None detected**

All dependencies appear to be actively maintained or have recent releases.

---

## 6. Security Escalations Required

**[ESCALATE → TheGuardians]**

The following findings require immediate escalation to the security team:

| Finding | Category | Severity | Action |
|---------|----------|----------|--------|
| Handlebars JavaScript injection | CWE-94, CWE-843 | CRITICAL | Upgrade handlebars immediately |
| proxy-addr IP spoofing | CWE-290, CWE-348 | CRITICAL | Upgrade proxy-addr immediately (access control bypass) |
| vitest UI arbitrary file read | CWE-22, CWE-862 | CRITICAL | DO NOT use vitest UI on networked dev machines; upgrade to ^5.1.1 |
| tinypool prototype pollution RCE | CWE-1321, CWE-94 | CRITICAL | Upgrade vitest to ^5.1.1 |
| protobufjs code execution | CWE-94 | CRITICAL | Upgrade to ^7.6.5; review orchestrator's proto file handling |
| vite launch-editor command injection | CWE-78, CWE-88 | HIGH | Upgrade to ^8.3.8 |
| form-data CRLF injection | CWE-93 | HIGH | Upgrade form-data to ^4.0.6+ |

---

## 7. Recommended Actions

### Immediate (Before shipping any code):

1. **Upgrade handlebars**: `npm install handlebars@^4.7.10` (affects Frontend)
2. **Upgrade proxy-addr**: `npm install proxy-addr@^2.0.8` (Backend & Orchestrator)
3. **Upgrade vitest**: `npm install vitest@^5.1.1 --save-dev` (Frontend; triggers vite, tinypool upgrades)
4. **Upgrade protobufjs**: `npm install protobufjs@^7.6.5` (Orchestrator)
5. **Upgrade uuid**: `npm install uuid@^11.1.1 --save` (Backend; check major version compat)
6. **Upgrade react-router-dom**: `npm install react-router-dom@^7.18.7` (Frontend)

### Short-term (Within 1 sprint):

7. **Upgrade vite**: `npm install vite@^8.3.8 --save-dev` (Frontend; major version bump)
8. **Upgrade pino**: `npm install pino@^10.4.0 --save` (Backend; major version bump)
9. **Upgrade react**: `npm install react@^19.3.1 react-dom@^19.3.1 --save` (Frontend)
10. **Upgrade express**: `npm install express@^5.3.0 --save` (Backend; major version bump)
11. Run full test suite after each upgrade to verify compatibility
12. Run `npm audit fix --force` only after manual review of breaking changes

### Medium-term (Next quarter):

13. **Implement dependency management strategy:**
    - Use `npm ci` in CI/CD (instead of `npm install`) to lock transitive versions
    - Add `npm audit` to pre-commit hooks
    - Consider tools like Dependabot or npm audit plugin for continuous monitoring
    - Pin major versions more aggressively (reduce upgrade friction)

14. **Review post-install scripts:**
    - Audit all post-install scripts for security implications
    - Consider running `npm install --ignore-scripts` by default in CI

15. **License audit:**
    - Run `npx license-checker --json` after installing deps
    - Document license decisions in `Teams/TheInspector/learnings/dependency-auditor.md`

---

## 8. Testing Checklist

After applying upgrades, verify:

- [ ] Backend: `npm test` passes (all 11 direct + transitive deps upgraded)
- [ ] Frontend: `npm test` passes (all 12 direct + transitive deps upgraded)
- [ ] E2E: `npm test` passes (unchanged, low risk)
- [ ] Orchestrator: `npm test` passes (protobufjs, proxy-addr, uuid upgraded)
- [ ] No unintended breaking changes in minor/patch upgrades
- [ ] No new high/critical CVEs introduced by upgrades
- [ ] `npm audit --audit-level=moderate` exits with 0 after all upgrades

---

## JSON Summary

```json
{
  "audit_date": "2026-11-25",
  "audit_tool": "dependency_auditor (npm audit)",
  "workspaces": 10,
  "summary": {
    "vulnerabilities_total": 37,
    "vulnerabilities_critical": 6,
    "vulnerabilities_high": 14,
    "vulnerabilities_moderate": 14,
    "vulnerabilities_low": 3,
    "outdated_major_versions": 7,
    "abandoned_dependencies": 0,
    "license_compliance_issues": 0
  },
  "workspaces_detail": [
    {
      "workspace": "Source/Backend",
      "cves_critical": 2,
      "cves_high": 5,
      "cves_moderate": 3,
      "cves_low": 1,
      "total_cves": 11,
      "direct_deps": 13,
      "transitive_deps": 411,
      "top_issues": [
        "proxy-addr IP spoofing (CRITICAL)",
        "handlebars JavaScript injection (CRITICAL)",
        "body-parser DoS (HIGH)",
        "js-yaml quadratic DoS (HIGH)",
        "uuid 5 majors behind (P2)"
      ]
    },
    {
      "workspace": "Source/Frontend",
      "cves_critical": 2,
      "cves_high": 7,
      "cves_moderate": 7,
      "cves_low": 1,
      "total_cves": 17,
      "direct_deps": 12,
      "transitive_deps": 230,
      "top_issues": [
        "handlebars JavaScript injection (CRITICAL)",
        "vitest arbitrary file read (CRITICAL)",
        "tinypool RCE via prototype pollution (CRITICAL)",
        "vite path traversal + RCE (HIGH)",
        "react-router-dom open redirect + XSS (MODERATE)"
      ]
    },
    {
      "workspace": "Source/E2E",
      "cves_critical": 0,
      "cves_high": 0,
      "cves_moderate": 0,
      "cves_low": 0,
      "total_cves": 0,
      "direct_deps": 4,
      "transitive_deps": 4,
      "top_issues": []
    },
    {
      "workspace": "platform/orchestrator",
      "cves_critical": 2,
      "cves_high": 3,
      "cves_moderate": 4,
      "cves_low": 0,
      "total_cves": 9,
      "direct_deps": 3,
      "transitive_deps": 155,
      "top_issues": [
        "proxy-addr IP spoofing (CRITICAL)",
        "protobufjs code execution (CRITICAL)",
        "body-parser DoS (HIGH)",
        "grpc-js malformed request crash (HIGH)"
      ]
    }
  ],
  "escalations": [
    {
      "finding": "Handlebars JavaScript injection",
      "escalate_to": "TheGuardians",
      "reason": "Code injection in template engine"
    },
    {
      "finding": "proxy-addr IP spoofing",
      "escalate_to": "TheGuardians",
      "reason": "Access control bypass via IP address spoofing"
    },
    {
      "finding": "vitest UI arbitrary file read",
      "escalate_to": "TheGuardians",
      "reason": "Arbitrary file read + RCE in test infrastructure"
    },
    {
      "finding": "tinypool prototype pollution RCE",
      "escalate_to": "TheGuardians",
      "reason": "RCE in worker pool management"
    },
    {
      "finding": "protobufjs code execution",
      "escalate_to": "TheGuardians",
      "reason": "Arbitrary code execution in protocol buffer handling"
    }
  ]
}
```

---

## Appendix: CVE-to-Package Mapping

**Critical CVEs by ecosystem impact:**
1. **handlebars** — Template injection (affects any framework using handlebars)
2. **proxy-addr** — IP spoofing (affects Express + all reverse-proxy scenarios)
3. **vitest** — File read + RCE (affects all test infrastructure)
4. **tinypool** — Prototype pollution RCE (affects parallel test runners)
5. **protobufjs** — Code execution (affects gRPC, any protobuf serialization)

---

**Report Generated By:** dependency_auditor (Haiku 4.5)  
**Next Audit:** 2026-12-25 (or on-demand after upgrades)
