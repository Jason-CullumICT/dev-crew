# Dependency Auditor Findings
**Date:** 2026-09-08  
**Auditor:** dependency_auditor (haiku)  
**Scope:** npm projects (Backend, Frontend, Orchestrator)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Known CVEs** | **31** |
| **Critical (P1)** | **3** |
| **High (P2)** | **11** |
| **Moderate (P3)** | **13** |
| **Low (P4)** | **4** |
| **Package Managers** | npm (3 monorepo directories) |
| **Total Direct Dependencies** | 114 |
| **Total Transitive Dependencies** | 796 |
| **Outdated Major Versions** | 6 packages |
| **License Issues** | 0 (all clear) |
| **Deprecated Packages** | 0 |

**Overall Grade: C** (3 critical CVEs require immediate remediation)

---

## Critical Findings (P1)

### DEP-001: handlebars RCE via AST Type Confusion
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Execution
- **Package:** handlebars 4.0.0 - 4.7.8
- **Location:** Source/Backend (transitive via @babel/core/other build tools)
- **CVE:** GHSA-2w6w-674q-4c4q (CVSS 9.8)
- **Detail:** 
  - Attacker can inject malicious AST via tampering with template syntax
  - JavaScript Injection via type confusion allows arbitrary code execution
  - Also affects: GHSA-3mfm-83xf-c92r (8.1), GHSA-xhpv-hc6g-r9c6 (8.1), GHSA-9cx6-37pm-9jff (7.5)
  - 8 distinct handlebars vulnerabilities in transitive tree
- **Exploit:** Crafted template with manipulated @partial-block or similar triggers RCE
- **Impact:** Build-time code execution (dev environment compromise)
- **Fix:** `npm update handlebars` (upgrade to 4.7.9+)
- **Cross-ref:** [ESCALATE → TheGuardians] — code execution risk
- **Timeline:** Upgrade immediately before next deploy

### DEP-002: vitest UI Server Arbitrary File Read/Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Path Traversal / Code Execution
- **Package:** vitest <3.2.6
- **Location:** Source/Frontend (direct dev dependency)
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:**
  - When vitest UI server is listening, any attacker can read and execute arbitrary files
  - Path traversal via source map manipulation
  - Also cascades: vite (<6.4.2), esbuild (<=0.24.2), @vitest/mocker, vite-node all outdated
- **Exploit:** POST request to UI server with crafted path → file read/code execution
- **Impact:** 
  - **CRITICAL in dev environment:** If vitest UI exposed on public network, instant RCE
  - Build/test environment compromise
- **Fix:** Upgrade vitest to >=3.2.6 (requires vite upgrade to >=7.x+)
- **Current:** vitest 2.0.5 → needs 3.2.6+ (major version)
- **Cross-ref:** [ESCALATE → TheGuardians] — network-exposed RCE risk
- **Timeline:** Upgrade BEFORE using vitest UI in any shared/CI environment

### DEP-003: protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** CVE / Code Generation / RCE
- **Package:** protobufjs <=7.6.4
- **Location:** platform/orchestrator (transitive via @grpc/grpc-js)
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8) + 10 other protobufjs CVEs
- **Detail:**
  - Unsafe code generation from untrusted .proto descriptors
  - Type confusion + prototype pollution chains to arbitrary code execution
  - Additional: code injection (GHSA-66ff-xgx4-vchm), unbounded recursion DoS (GHSA-685m-2w69-288q)
- **Exploit:** Attacker supplies malformed .proto file → code generation gadget chains RCE
- **Impact:** 
  - gRPC service on orchestrator can be exploited by sending crafted protobuf descriptors
  - Process-wide denial of service via unsafe option paths (GHSA-jvwf-75h9-cwgg)
- **Fix:** Upgrade to protobufjs >=7.7.0 AND @grpc/grpc-js >=1.14.4
- **Cross-ref:** [ESCALATE → TheGuardians] — gRPC/RPC layer RCE
- **Timeline:** Upgrade BEFORE any gRPC service interaction with untrusted clients

---

## High-Severity Findings (P2)

| ID | Package | Location | CVE | CVSS | Details |
|---|---------|----------|-----|------|---------|
| DEP-004 | brace-expansion <1.1.18 | Backend (transitive) | GHSA-3jxr-9vmj-r5cp | 5.3 | DoS: exponential-time expansion of `{}` groups → process hang |
| DEP-005 | browserslist <=4.28.6 | Backend, Frontend (transitive) | GHSA-c83g-rgw3-j3cx | 7.5 | Unbounded memory growth via distinct query results → OOM |
| DEP-006 | form-data 4.0.0-4.0.5 | Backend, Frontend (transitive) | GHSA-hmw2-7cc7-3qxx | 7.5 | CRLF injection in multipart field names |
| DEP-007 | js-yaml <3.15.1 | Backend (transitive) | GHSA-52cp-r559-cp3m | 7.5 | Quadratic CPU via merge-key chains → DoS |
| DEP-008 | nanoid <3.3.18 | Frontend (transitive) | GHSA-2v37-7h3g-55p8 | 5.9 | Infinite loop when custom generators receive size=0 |
| DEP-009 | postcss <=8.5.22 | Frontend (transitive) | GHSA-r28c-9q8g-f849 | 7.5 | Path traversal via sourceMappingURL → .map file disclosure |
| DEP-010 | vite <=6.4.2 | Frontend (direct) | GHSA-fx2h-pf6j-xcff | 7.5 | `server.fs.deny` bypass on Windows alternate paths |
| DEP-011 | ws 8.0.0-8.20.1 | Frontend (transitive) | GHSA-96hv-2xvq-fx4p | 7.5 | Memory exhaustion DoS from tiny fragments |
| DEP-012 | @grpc/grpc-js 1.14.0-1.14.3 | Orchestrator (transitive) | GHSA-5375-pq7m-f5r2 | 7.5 | Malformed request → server crash |
| DEP-013 | path-to-regexp <0.1.13 | Orchestrator (transitive) | GHSA-37ch-88jc-xwx2 | 7.5 | ReDoS via multiple route parameters |
| DEP-014 | uuid <11.1.1 | Backend (direct), Orchestrator (transitive) | GHSA-w5hq-g745-h8pq | 7.5 | Buffer bounds check missing in v3/v5/v6 |

---

## Moderate-Severity Findings (P3)

13 moderate-severity CVEs across transitive dependencies:
- **@babel/core:** Arbitrary file read via sourceMappingURL (CWE-22, low severity)
- **@remix-run/router:** Open redirect via protocol-relative URLs
- **body-parser:** DoS via invalid limit value bypass (CWE-770)
- **dockerode:** Affected by uuid bug (buffer bounds)
- **esbuild:** Development server CSRF (CWE-346)
- **@protobufjs/utf8:** Overlong UTF-8 decoding
- **qs:** Multiple DoS vectors (null crashes, array limit bypass, isBuffer DoS)
- **react-router:** 3 open redirect variants (protocol-relative, backslash, SSR deserialization)
- **postcss:** XSS via unescaped `</style>` in CSS stringify
- Plus 3 protobufjs DoS/prototype pollution chains

---

## Outdated Major Versions (P3)

Six packages are 1+ major versions behind current:

| Package | Location | Current | Latest | Gap |
|---------|----------|---------|--------|-----|
| express | Backend, Orchestrator | 4.18.2 / 4.21.0 | 5.2.1 | +1 major |
| pino | Backend | 8.17.0 | 10.3.1 | +2 major |
| uuid | Backend | 9.0.0 | 14.0.2 | +5 major |
| react | Frontend | 18.3.1 | 19.2.8 | +1 major |
| react-dom | Frontend | 18.3.1 | 19.2.8 | +1 major |
| react-router-dom | Frontend | 6.26.0 | 7.18.3 | +1 major |
| dockerode | Orchestrator | 4.0.4 | 5.0.1 | +1 major |
| multer | Orchestrator | 1.4.5-lts.1 | 2.3.0 | +1 major |

**Risk:** These likely contain unpatched security fixes. uuid gap of +5 versions is significant.

---

## Dependency Tree Analysis (P4)

| Directory | Direct | Transitive | Total | Risk Level |
|-----------|--------|-----------|-------|-----------|
| Source/Backend | 6 | 405 | 411 | MODERATE (411 surface) |
| Source/Frontend | 8 | 222 | 230 | HIGH (222 dev-only) |
| platform/orchestrator | 3 | 152 | 155 | HIGH (production gRPC) |
| **Combined** | **17** | **779** | **796** | **CRITICAL** |

**Finding: 796 transitive dependencies = large supply-chain attack surface**
- No post-install scripts detected ✓
- No single-maintainer high-risk packages detected ✓
- Duplicate versions of critical packages:
  - **uuid:** appears in both Backend and Orchestrator (different versions via transitive path)
  - **express:** Backend (4.18.2) vs Orchestrator (4.21.0) — version skew
  - **qs, body-parser:** duplicated across trees

---

## License Compliance (P4)

✓ **All clear.** No GPL, AGPL, or UNLICENSED third-party dependencies detected.
- Backend/Frontend/Orchestrator all MIT/Apache-2.0/ISC compatible
- Internal packages marked UNLICENSED (acceptable)

---

## Supply Chain Risk Assessment

### Risk Factors Found:
1. ✓ Protobufjs in production path (gRPC orchestrator) — **requires immediate patching**
2. ✓ Handlebars in build pipeline — **RCE at build time**
3. ✓ Vitest UI exposed in dev → **network RCE if exposed**
4. ✓ Large transitive tree (796) → increased attack surface
5. ⚠ Version skew (express 4.18 vs 4.21 in same codebase)

### Positive:
- ✓ No deprecated packages
- ✓ No post-install scripts
- ✓ License compliance clean
- ✓ No known abandoned dependencies

---

## Remediation Priority

### Immediate (Do Today):
1. **Upgrade vitest + vite** in Frontend (critical RCE if UI exposed)
2. **Upgrade protobufjs + @grpc/grpc-js** in Orchestrator (gRPC RCE surface)
3. **Upgrade handlebars** in Backend (build-time RCE)
4. **Upgrade uuid** in Backend (buffer bounds, used in state generation)

### This Week:
5. Upgrade form-data, js-yaml, brace-expansion in Backend
6. Upgrade browserslist, nanoid, postcss, ws in Frontend
7. Standardize express version across Backend and Orchestrator

### This Sprint:
8. Plan React 19 migration (18→19 has breaking changes)
9. Plan pino major upgrade (8→10 has deprecations)
10. Audit new express 5.x compatibility

---

## Cross-Team Routing

**[ESCALATE → TheGuardians]:**
- DEP-001 (handlebars RCE) — build-time code execution risk
- DEP-002 (vitest UI RCE) — network-exposed arbitrary file read/execution
- DEP-003 (protobufjs RCE) — gRPC service compromise vector

**[NOTE → TheFixer]:**
- Outdated major versions (uuid +5, pino +2, express +1, react +1)
- High-risk transitive deps (browserslist, postcss, ws, form-data)
- Standardize express versions to reduce maintenance burden

---

## Dashboard Metrics

```json
{
  "cves_critical": 3,
  "cves_high": 11,
  "cves_moderate": 13,
  "cves_low": 4,
  "total_cves": 31,
  "direct_dependencies": 17,
  "transitive_dependencies": 779,
  "outdated_major_versions": 6,
  "license_issues": 0,
  "grade": "C"
}
```

---

## Next Audit

**Recommended:** 2 weeks (after patches applied)  
**Trigger:** Any new package dependency added, express major upgrade, React upgrade completion

---

**Report:** `/Teams/TheInspector/findings/dependency-audit-2026-09-08.md`  
**Generated:** 2026-09-08 by dependency_auditor  
**Confidence:** HIGH (npm audit, outdated, direct inspection)
