# Dependency Auditor Findings Report
**Date:** 2026-11-18  
**Audit Scope:** NPM packages across 6 npm projects  
**Overall Grade:** 🔴 **F** (12 critical, 70 high, 67 moderate vulnerabilities)

---

## Executive Summary

The dev-crew project has **152 known CVEs** across npm dependencies, with **12 critical** and **70 high-severity** vulnerabilities. The most dangerous issues affect:
- **Testing frameworks** (vitest, jest ecosystem) — critical file access vulnerabilities
- **Networking libraries** (ws, body-parser, proxy-addr) — DoS and authentication bypass risks
- **Serialization** (protobufjs) — arbitrary code execution
- **Build tools** (browserslist) — unbounded memory allocation (OOM)

**Immediate action required** on direct dependencies: `vitest`, `uuid`, `dockerode`, OpenTelemetry SDK packages.

---

## Vulnerability Summary by Directory

| Directory | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| Source/Backend | 2 | 41 | 3 | 1 | **47** |
| Source/Frontend | 2 | 7 | 7 | 1 | **17** |
| Source/E2E | 0 | 0 | 0 | 0 | **0** ✅ |
| platform/orchestrator | 2 | 3 | 4 | 0 | **9** |
| portal/Backend | 4 | 11 | 46 | 0 | **61** |
| portal/Frontend | 2 | 8 | 7 | 1 | **18** |
| **TOTAL** | **12** | **70** | **67** | **3** | **152** |

---

## Critical Findings (P1)

### DEP-001: vitest Arbitrary File Read / Execution
- **Severity:** 🔴 **P1 (Critical)**
- **Category:** CVE / Code Execution
- **Package:** `vitest@<=4.1.10`
- **Affected Files:** 
  - `Source/Frontend/package.json`
  - `portal/Frontend/package.json`
  - `portal/Backend/package.json` (dev dep)
- **CVSS Score:** 9.8 (Critical)
- **CVE ID:** GHSA-5xrq-8626-4rwp (CWE-22, CWE-862)
- **Description:** When Vitest UI server is listening, arbitrary files can be read and executed. An attacker with network access to the dev server can read sensitive files (source code, `.env` files, `node_modules`) and execute arbitrary JavaScript.
- **Affected Versions:** `<3.2.6` for one vulnerability, `<4.1.11` for path traversal
- **Fix:** `npm install vitest@5.1.1` (requires major version upgrade)
- **Impact:** 
  - **In production:** LOW (dev dependency only, not shipped)
  - **In development:** CRITICAL (attacker can read source code and env secrets)
- **Fix Timeline:** IMMEDIATE (do not run vitest UI server publicly)

### DEP-002: protobufjs Arbitrary Code Execution
- **Severity:** 🔴 **P1 (Critical)**
- **Category:** CVE / Code Execution
- **Package:** `protobufjs@>=7.0.0 <7.5.5` (and <=7.6.4 for another issue)
- **Affected Files:** 
  - `platform/orchestrator/package.json`
- **CVSS Score:** 9.8 (Critical)
- **CVE ID:** GHSA-hprx-6r5c-rxvv / GHSA-6797-xf7q-9fcf (CWE-94)
- **Description:** protobufjs allows arbitrary code execution through deserialization when handling untrusted protobuf messages. An attacker sending malformed protobuf data can execute code on the server.
- **Affected Versions:** `>=7.0.0 <7.5.5` and `>=7.6.0 <7.6.4`
- **Fix:** Upgrade to `protobufjs@>=7.5.5 or >=7.6.4`
- **Impact:** 
  - **If gRPC endpoints are exposed:** CRITICAL
  - **Internal only:** MODERATE (but still dangerous)

### DEP-003: proxy-addr IPv4-mapped IPv6 IP Spoofing
- **Severity:** 🔴 **P1 (Critical)**
- **Category:** CVE / Authentication Bypass
- **Package:** `proxy-addr@>=1.1.0 <2.0.8`
- **Affected Files:** 
  - `platform/orchestrator/package.json` (via express)
- **CVSS Score:** 9.1 (Critical)
- **CVE ID:** GHSA-jqcg-44mw-7w3h (CWE-290, CWE-348, CWE-697)
- **Description:** proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 addresses in trust subnets. An attacker can spoof their IP to bypass proxy trust rules, potentially accessing restricted APIs.
- **Example:** `::ffff:127.0.0.1` spoofs as `127.0.0.1` to bypass IP-based access control
- **Affected Versions:** `>=1.1.0 <2.0.8`
- **Fix:** `npm install proxy-addr@2.0.8+` (or upgrade express)
- **Impact:** 
  - **If behind a proxy with IP-based ACLs:** CRITICAL
  - **Direct internet exposure:** MODERATE (less relevant)

---

## High-Severity Findings (P2)

### DEP-004: Jest Ecosystem Cascading Vulnerabilities
- **Severity:** 🔴 **P2 (High)**
- **Category:** CVE / Package Quality
- **Package:** `jest@^29.7.0` → 41 high-severity transitive vulnerabilities
- **Affected Files:** 
  - `Source/Backend/package.json` (dev dependency)
- **Root Cause:** `jest-util`, `jest-message-util`, `micromatch` contain critical bugs
- **Details:**
  - `jest-util` vulnerability cascades to 20+ Jest sub-packages
  - `micromatch` ReDoS (Regular Expression Denial of Service)
  - `jest-snapshot` has object prototype pollution risk
- **Fix Strategy:**
  1. Upgrade jest to `30.5.2+` (major version bump required)
  2. Run `npm install jest@30.5.2 && npm audit fix`
  3. Test with `npm test` to ensure compatibility
- **Impact:** Test framework compromised; malicious test files could escape sandbox

### DEP-005: browserslist Unbounded Memory Growth
- **Severity:** 🔴 **P2 (High)**
- **Category:** CVE / Denial of Service
- **Package:** `browserslist@<=4.28.6`
- **Affected Files:** 
  - `Source/Frontend/package.json` (via vite, typescript)
  - `portal/Frontend/package.json`
- **CVSS Score:** 7.5 (High)
- **CVE ID:** GHSA-c83g-rgw3-j3cx / GHSA-73wf-gq98-2v4g (CWE-770, CWE-1321)
- **Description:** 
  1. No cache eviction → unbounded memory growth on distinct queries → OOM crash
  2. Prototype pollution via untrusted `.browserslistrc` / `browserslist-stats.json`
- **Triggered By:** Build tool running with large browser query sets
- **Fix:** `npm install browserslist@4.28.7+`
- **Impact:** Build process crashes (CI/CD disruption), information disclosure

### DEP-006: ws (WebSocket) Memory Exhaustion DoS
- **Severity:** 🔴 **P2 (High)**
- **Category:** CVE / Denial of Service
- **Package:** `ws@>=8.0.0 <8.21.0`
- **Affected Files:** 
  - `Source/Frontend/package.json` (transitive via vite HMR)
  - `portal/Frontend/package.json`
  - `portal/Backend/package.json`
- **CVSS Score:** 7.5 (High)
- **CVE ID:** GHSA-96hv-2xvq-fx4p / GHSA-58qx-3vcg-4xpx (CWE-400, CWE-770)
- **Description:** 
  1. Memory exhaustion from tiny fragments and data chunks → server crash
  2. Uninitialized memory disclosure (CWE-908)
- **Triggered By:** Malicious WebSocket client sending fragmented messages
- **Fix:** `npm install ws@8.21.0+`
- **Impact:** Server crash, memory leak, potential secret exposure

### DEP-007: body-parser Compression Bypass DoS
- **Severity:** 🔴 **P2 (High)**
- **Category:** CVE / Denial of Service
- **Package:** `body-parser@<=1.20.8`
- **Affected Files:** 
  - `platform/orchestrator/package.json` (via express)
  - `portal/Backend/package.json`
- **CVSS Score:** 7.5 (High)
- **CVE ID:** GHSA-27r3-jxmh-p828 (CWE-248)
- **Description:** Denial of Service via trailing bytes after a compressed request body. Compressed requests with junk data bypass size enforcement.
- **Affected Versions:** `<1.20.9`
- **Fix:** `npm install body-parser@1.20.9+` (usually auto-fixed via express)
- **Impact:** Unbounded payload sizes → memory exhaustion → server crash

### DEP-008: @remix-run/router Open Redirect
- **Severity:** 🟡 **P2 (Moderate→High in context)**
- **Category:** CVE / Open Redirect
- **Package:** `@remix-run/router@>=1.3.0 <1.23.3`
- **Affected Files:** 
  - `Source/Frontend/package.json` (via react-router-dom)
  - `portal/Frontend/package.json`
- **CVSS Score:** 0 (not disclosed, but CWE-601 = open redirect)
- **CVE ID:** GHSA-2j2x-hqr9-3h42
- **Description:** Same-origin redirect with path starting `//` causes open redirect via protocol-relative URL reinterpretation. Example: redirect to `//attacker.com` becomes `https://attacker.com` from HTTPS origin.
- **Fix:** `npm install react-router-dom@6.26.1+`
- **Impact:** Session fixation, credential theft via crafted redirect

### DEP-009: @grpc/grpc-js Certificate Validation Bypass
- **Severity:** 🔴 **P2 (High)**
- **Category:** CVE / Authentication / Cryptography
- **Package:** `@grpc/grpc-js@>=1.14.0 <1.14.5`
- **Affected Files:** 
  - `platform/orchestrator/package.json`
  - `portal/Backend/package.json`
- **CVSS Score:** 7.4 (High)
- **CVE ID:** GHSA-m9gg-hp2v-232j / GHSA-5375-pq7m-f5r2 / GHSA-99f4-grh7-6pcq (CWE-295, CWE-248, CWE-400)
- **Description:** 
  1. getAuthContext returns unauthorized certificates as authorized
  2. Malformed request crash server (CWE-248)
  3. Compressed message crash (CWE-400)
- **Fix:** Upgrade `@grpc/grpc-js` to `1.14.5+`
- **Impact:** mTLS trust chain bypass, server DoS

---

## Moderate-Severity Findings (P3)

### DEP-010: OpenTelemetry Unbounded Memory Growth
- **Severity:** 🟡 **P3 (Moderate)**
- **Category:** CVE / Denial of Service
- **Package:** `@opentelemetry/core` / `@opentelemetry/api`
- **Affected Files:** 
  - `portal/Backend/package.json` (46 moderate OpenTelemetry vulnerabilities)
  - `platform/orchestrator/package.json`
- **Issue:** W3C Baggage propagation allows unbounded memory allocation
- **Impact:** Tracing infrastructure DoS

### DEP-011: vite File Access Control Bypass
- **Severity:** 🟡 **P3 (Moderate)**
- **Category:** CVE / Information Disclosure
- **Package:** `vite@<=6.4.3`
- **Affected Files:** 
  - `Source/Frontend/package.json` (dev dependency)
  - `portal/Frontend/package.json`
- **Multiple Issues:**
  - CWE-22: Path traversal in custom middleware
  - CWE-284: Files outside `server.fs.allow` served when paths match
  - Windows alternate path bypass
- **Impact:** Dev server can leak source code / `node_modules`

---

## Outdated Packages (P3)

### Major Version Falls Behind

**Source/Backend:**
- `typescript@^5.3.3` → available `6.x` (1 major behind)
- `jest@^29.7.0` → available `30.x` (1 major behind, with security fixes)

**Source/Frontend:**
- `typescript@^5.5.4` → available `6.x` (1 major behind)
- `vite@^5.4.0` → available `6+` (1 major behind, with security fixes)
- `vitest@^2.0.5` → available `5.x` (required for security)
- `react@^18.3.1` → available `19.x` (1 major behind)

**portal/Backend:**
- Multiple OpenTelemetry packages 1-2 versions behind stable
- Node SDK packages need updates

---

## License Compliance Review

✅ **No GPL/AGPL violations detected.**

All detected packages use compliant licenses:
- MIT (majority)
- Apache 2.0 (OpenTelemetry ecosystem)
- ISC (some utilities)
- BSD (esbuild, browserslist)

No proprietary or restricted licenses found.

---

## Dependency Tree Analysis

| Project | Direct Deps | Transitive Deps | Notes |
|---------|-------------|-----------------|-------|
| Source/Backend | 10 | ~90 | Jest ecosystem expansion |
| Source/Frontend | 7 | ~230 | Build tool chain (vite, testing) |
| Source/E2E | 1 | ~4 | Minimal surface ✅ |
| platform/orchestrator | 7 | ~155 | gRPC + OpenTelemetry |
| portal/Backend | 9 | High | OpenTelemetry auto-instrumentation bloat |
| portal/Frontend | 9 | ~430 | React + build tools |

**Supply Chain Risk:** 430+ transitive deps in portal/Frontend = high attack surface

---

## Supply Chain Risks

### Critical Risks

1. **Post-install scripts in dependencies** → potential for supply chain attacks
   - vite, esbuild, node-gyp have build scripts
   - npm `postinstall` hook execution during `npm install`

2. **Single-maintainer packages** (potential abandonment)
   - `uuid` (widely used, low risk)
   - `pino` (logging, medium-risk if unmaintained)

3. **Deprecated/Archived packages** → NO deprecated packages detected ✅

4. **High download variance** → Some dependencies have <100 weekly downloads
   - Risk: abandoned or niche packages could lag on security patches

---

## Remediation Plan

### Phase 1: Immediate (This Week)
**Action: Fix P1 Critical Issues**

```bash
# Source/Frontend - Fix vitest
cd Source/Frontend
npm install vitest@5.1.1

# platform/orchestrator - Fix protobufjs & proxy-addr
cd platform/orchestrator
npm audit fix --force  # Major version bumps allowed

# portal/Backend - Fix vitest
cd portal/Backend
npm install vitest@5.1.1
```

**Verification:**
```bash
npm audit --audit-level=critical  # Must return 0 critical
```

### Phase 2: Short-term (Next 2 weeks)
**Action: Fix P2 High Issues**

```bash
# Source/Backend - Upgrade jest
cd Source/Backend
npm install jest@30.5.2

# Source/Frontend - Upgrade react-router
cd Source/Frontend
npm install react-router-dom@latest

# All projects - Fix browserslist
npm install browserslist@4.28.7+

# All projects - Fix ws
npm install ws@8.21.0+
```

### Phase 3: Medium-term (Next 4 weeks)
**Action: Upgrade major versions**

```bash
# Frontend - React, TypeScript, build tools
cd Source/Frontend
npm install react@19 typescript@6
npm install vite@6

# Backend - jest ecosystem, TypeScript
cd Source/Backend
npm install typescript@6
```

### Phase 4: Long-term (Next quarter)
**Action: Dependency governance**

1. **Enable Dependabot/Renovate** for automated PR updates
2. **Set npm audit policy:**
   ```json
   // package.json
   {
     "engines": {"node": ">=20.0.0"},
     "overrides": {
       "jest": ">=30.0.0",
       "vitest": ">=5.1.0"
     }
   }
   ```
3. **Add pre-commit hook:**
   ```bash
   npm audit --audit-level=moderate  # Fail CI if moderate+ issues
   ```
4. **Quarterly audit runs** via scheduled GitHub Actions

---

## Cross-References

- [ESCALATE → TheGuardians] 
  - DEP-001 (vitest RCE) affects dev environment secrets access
  - DEP-002 (protobufjs RCE) if gRPC endpoints exposed
  - DEP-003 (proxy-addr bypass) authentication layer weakness
  - [SEE TheGuardians static-analyzer] for hardcoded secrets in env files

- [Cross-ref: performance-profiler]
  - Browserslist OOM risk → build performance regression
  - OpenTelemetry unbounded memory → production memory leaks

---

## Verification Checklist

Before marking complete, run:

```bash
npm audit --audit-level=critical  # All 6 directories
# → Expected: 0 critical vulnerabilities

npm test                            # All test suites
# → Expected: all pass (no breakage from upgrades)

npm run build                       # All projects
# → Expected: success, no memory errors
```

---

## Findings JSON Summary

```json
{
  "audit_date": "2026-11-18",
  "total_cves": 152,
  "severity_breakdown": {
    "critical": 12,
    "high": 70,
    "moderate": 67,
    "low": 3
  },
  "critical_packages": [
    {
      "name": "vitest",
      "version_vulnerable": "<=4.1.10",
      "cve": "GHSA-5xrq-8626-4rwp",
      "fix": "5.1.1",
      "affected_dirs": ["Source/Frontend", "portal/Frontend", "portal/Backend"]
    },
    {
      "name": "protobufjs",
      "version_vulnerable": "<7.5.5, >=7.6.0 <7.6.4",
      "cve": "GHSA-hprx-6r5c-rxvv",
      "fix": "7.6.4+",
      "affected_dirs": ["platform/orchestrator"]
    },
    {
      "name": "proxy-addr",
      "version_vulnerable": ">=1.1.0 <2.0.8",
      "cve": "GHSA-jqcg-44mw-7w3h",
      "fix": "2.0.8+",
      "affected_dirs": ["platform/orchestrator"]
    }
  ],
  "recommendation": "F - Fail (12 P1 critical + 70 high vulns). Immediate action required.",
  "timeline": "Phase 1 (immediate) + Phase 2 (2 weeks) + Phase 3 (4 weeks)"
}
```

---

## Audit Methodology

1. **npm audit --json** run on all 6 directories
2. Cross-referenced CVE IDs with GHSA advisories
3. Severity classification: P1 (exploitable direct deps) → P2 (high/transitive) → P3 (moderate/outdated)
4. License compliance via package.json inspection
5. Supply chain risk assessment via download stats & maintainer analysis

---

**Report Generated:** 2026-11-18 by Dependency Auditor  
**Next Audit:** 2026-11-25 (after remediation)
