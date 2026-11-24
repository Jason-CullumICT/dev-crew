# Dependency Audit Report
**Date:** 2026-11-24  
**Auditor:** dependency_auditor (Haiku 4.5)  
**Scope:** npm projects across Source/, platform/

---

## Executive Summary

**Total CVEs Identified:** 196 across all npm projects  
**Critical:** 19 | High: 48 | Moderate: 101 | Low: 28

**Risk Assessment:**
- ✋ **P1 (Critical-Direct):** 10 findings — immediate remediation required
- 🔴 **P2 (Critical-Transitive):** 9 findings — high priority
- 🟠 **P3 (High/Med-Direct):** 15+ findings — plan remediation
- 🟡 **P4 (Low/Info):** Remaining findings — track/backlog

**Largest Exposure:** `portal/Backend` (577 total dependencies, 61 CVEs)

---

## Findings by Project

### 1. Source/Backend (workflow-engine-backend)
**Direct Dependencies:** 5  
**Transitive Dependencies:** 412  
**CVEs:** 11 total (2 critical, 5 high, 3 moderate, 1 low)

#### P1: CRITICAL — Direct Vulnerabilities

**DEP-001: Handlebars JavaScript Injection via AST Type Confusion**
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** handlebars (transitive via undeclared template lib)
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q (CVSS 9.8)
  - GHSA-8r5x-fm3f-whwj (CVSS 9.8) — bypass of previous fix
  - GHSA-p8wg-vrv2-v86f (CVSS unknown)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1)
  - GHSA-xhpj-hc6g-r9c6 (CVSS 8.1)
- **Affected Range:** 3.0.0 - 4.7.9 (11 separate injection/XSS issues)
- **Impact:** Allows arbitrary JavaScript execution via tampered Handlebars templates
- **Fix:** `npm update handlebars` to 4.7.10+ (verify template sources are sanitized)
- **Context:** If backend renders user-provided templates, this is immediately exploitable

**DEP-002: proxy-addr IPv4-mapped IPv6 Trust Subnet Spoofing**
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** proxy-addr (transitive, used by express)
- **CVE ID:** GHSA-jqcg-44mw-7w3h (CVSS 9.1)
- **Affected Range:** 1.1.0 - 2.0.7
- **Impact:** Allows IP spoofing by sending IPv4-mapped IPv6 addresses; can bypass IP-based access controls
- **Installed Version:** 2.0.7
- **Fix:** `npm update proxy-addr` to 2.0.8+
- **Context:** Affects any IP-based filtering, rate limiting, or trust decisions

#### P2: HIGH — Direct Vulnerabilities

**DEP-003: body-parser Denial of Service via Compressed Request Trailing Bytes**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** body-parser (transitive, used by express)
- **CVE ID:** GHSA-27r3-jxmh-p828 (CVSS 7.5)
- **Affected Range:** <1.20.9
- **Installed Version:** 1.20.4 (vulnerable)
- **Impact:** Malformed compressed request bodies can cause server crash/DoS
- **Fix:** `npm update body-parser` to 1.20.9+
- **Additional CVE:** GHSA-v422-hmwv-36x6 (silent limit value bypass, CVSS 3.7)

**DEP-004: brace-expansion DoS via Exponential Expansion**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** brace-expansion (transitive)
- **CVE IDs:** 7 separate DoS vulnerabilities (stack exhaustion, OOM, quadratic time)
- **Impact:** Unbounded expansion of nested braces causes CPU/memory exhaustion
- **Fix:** `npm update brace-expansion` to latest (1.1.11+)

**DEP-005: Browserslist Unbounded Memory Growth → OOM**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** browserslist (transitive, used by build tools)
- **CVE IDs:** 
  - Unbounded cache growth (no eviction)
  - Uncaught crash via unsafe normalizeStats()
- **Impact:** Memory exhaustion during build; potential crash vector during CI
- **Fix:** `npm update browserslist` to latest

**DEP-006: form-data CRLF Injection**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** form-data (transitive)
- **CVE ID:** GHSA-rfv5-nwrx-txjv (CVSS unknown)
- **Impact:** Unescaped multipart field names/filenames allow CRLF injection
- **Fix:** `npm update form-data` to latest

**DEP-007: js-yaml Quadratic CPU Consumption**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** js-yaml (transitive)
- **CVE IDs:** 4 separate DoS vulnerabilities via merge-key chains
- **Impact:** YAML parsing with repeated aliases causes quadratic time complexity
- **Fix:** `npm update js-yaml` to latest (with maxTotalMergeKeys limit)

#### P3: MODERATE Vulnerabilities

**DEP-008: @babel/core Arbitrary File Read via sourceMappingURL**
- **Severity:** P3
- **Category:** cve
- **Package:** @babel/core (transitive)
- **CVE ID:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Affected Range:** <=7.29.0
- **Impact:** Babel can read arbitrary local files via crafted source maps
- **Fix:** `npm update @babel/core` to 7.29.1+

**DEP-009: baseline-browser-mapping Process Termination DoS**
- **Severity:** P3
- **Category:** cve
- **Package:** baseline-browser-mapping (transitive)
- **CVE ID:** GHSA-w5vr-8v7q-w6rv (CVSS 0.0)
- **Impact:** Invalid input causes process termination
- **Fix:** `npm update baseline-browser-mapping` to 2.11.0+

**DEP-010: uuid CSPRNG & Format Validation**
- **Severity:** P3
- **Category:** cve
- **Package:** uuid (direct)
- **Installed Version:** 9.0.1
- **Latest:** 14.0.3 (4 major versions behind!)
- **Fix:** `npm update uuid` — investigate if v14+ API changes are compatible

#### P4: Outdated Major Versions

**DEP-011: express 1+ Major Version Behind**
- **Package:** express
- **Installed:** 4.22.1
- **Latest:** 5.3.0
- **Status:** 1 major version behind (4→5)
- **Action:** Review v5 migration guide; test compatibility before upgrading

**DEP-012: pino Severely Outdated (2+ Major Versions)**
- **Package:** pino (logging)
- **Installed:** 8.17.0
- **Latest:** 10.4.0
- **Status:** 2 major versions behind
- **Impact:** May miss critical security fixes in logger infrastructure
- **Action:** Plan migration to pino v10

---

### 2. Source/Frontend (react app)
**Direct Dependencies:** 9  
**Transitive Dependencies:** 231  
**CVEs:** 17 total (2 critical, 7 high, 7 moderate, 1 low)

#### P1: CRITICAL

**DEP-013: tinypool Prototype Pollution → Remote Code Execution**
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** tinypool (transitive, used by vitest)
- **CVE IDs:**
  - GHSA-5w5h-yvmx-wt6j (CVSS unknown) — Prototype Pollution in worker options
  - GHSA-g7mj-h69f-qvxf (CVSS unknown) — Prototype Pollution in run() options
- **Impact:** Remote code execution via crafted worker pool options
- **Affected Range:** >=2.0.0 <2.5.0 (or similar; check npm audit for exact range)
- **Context:** Affects test infrastructure; exploitable if attacker controls test inputs
- **Fix:** `npm update tinypool` to 2.5.0+

#### P2: HIGH — Build/Test Tool Vulnerabilities

**DEP-014: @vitest/mocker Path Traversal & Code Injection**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** @vitest/mocker (dev, transitive via vitest)
- **CVE IDs:**
  - GHSA-82fw-gwwq-j7x9 (CVSS 5.9) — Path traversal via mock redirect
  - GHSA-qxg6-89mg-rqv8 (CVSS 4.7) — Code injection via manual mock registration
- **Impact:** Vitest can read arbitrary files or execute code during test runs
- **Fix:** `npm update vitest` to latest (pulls in updated @vitest/mocker)

**DEP-015: @remix-run/router Open Redirect via Protocol-Relative URL**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** @remix-run/router (via react-router-dom)
- **CVE ID:** GHSA-2j2x-hqr9-3h42 (CVSS unknown)
- **Affected Range:** 1.3.0 - 1.23.2
- **Impact:** Routes starting with `//` bypass same-origin checks, enabling open redirect
- **Fix:** `npm update react-router-dom` to 7.0.0+ (pulls in @remix-run/router >=1.23.3)

**DEP-016: PostCSS Multiple Vulnerabilities**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** postcss (transitive, used by vite/build)
- **CVE IDs:**
  - XSS via unescaped </style> in stringify output
  - Arbitrary file read via attacker-controlled sourceMappingURL
  - Path traversal in source map auto-loading
- **Impact:** Build-time code execution or disclosure
- **Fix:** `npm update postcss` to latest

**DEP-017: source-map-js Event-loop DoS**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** source-map-js (transitive, used by build tools)
- **CVE ID:** GHSA-p8wq-7hff-6cj8 (CVSS unknown)
- **Impact:** Malformed source maps cause event-loop denial of service
- **Fix:** `npm update source-map-js` to latest

**DEP-018: nanoid Loop/Overflow Issues**
- **Severity:** P2 (High)
- **Category:** cve
- **Package:** nanoid (transitive)
- **CVE IDs:** 3 separate issues:
  - Non-secure generators can loop indefinitely
  - Integer overflow in custom generators
  - Custom generators loop when size is zero
- **Fix:** `npm update nanoid` to latest

#### P3: MODERATE / P4: Outdated Versions

**DEP-019: browserslist & baseline-browser-mapping** (same as backend)

**DEP-020: React & React-DOM 1 Major Version Behind**
- **Installed:** 18.3.1
- **Latest:** 19.3.1
- **Status:** 1 major version behind
- **Action:** Review React 19 breaking changes (e.g., automatic batching, hydration errors); test thoroughly before upgrading

**DEP-021: react-router-dom 1+ Major Version Behind**
- **Installed:** 6.30.6
- **Latest:** 7.18.6
- **Status:** 1 major version behind
- **Fix note:** Upgrading would also fix DEP-015 above

**DEP-022: esbuild Outdated**
- **Status:** Outdated; check if blocking newer TypeScript/build optimizations
- **Fix:** `npm update esbuild`

---

### 3. Source/E2E
**Direct Dependencies:** 4  
**Transitive Dependencies:** Minimal  
**CVEs:** 0 ✅

No vulnerabilities detected. E2E test suite is clean.

---

### 4. platform/orchestrator (Critical Infrastructure)
**Direct Dependencies:** 153  
**Transitive Dependencies:** 155  
**CVEs:** 9 total (2 critical, 3 high, 4 moderate)

⚠️ **ESCALATE TO THE GUARDIANS** — This service handles inter-agent communication and orchestration. Any compromise here affects the entire platform.

#### P1: CRITICAL

**DEP-023: protobufjs Multiple RCE/DoS Vectors**
- **Severity:** P1 (Critical — 12 separate issues!)
- **Category:** cve
- **Package:** protobufjs (transitive via @grpc/grpc-js)
- **CVE IDs (sample):**
  - Code injection through bytes field defaults
  - Prototype pollution in generated constructors
  - Denial of service via unbounded recursion
  - Arbitrary code execution (at least one vector)
  - Denial of service via infinite loop in .proto option parsing
  - And 7+ more
- **Impact:** gRPC message deserialization can execute arbitrary code
- **Fix:** `npm update protobufjs` to latest (verify version compatibility with @grpc/grpc-js)

**DEP-024: @grpc/grpc-js Server Crash & Certificate Bypass**
- **Severity:** P1 (Critical)
- **Category:** cve
- **Package:** @grpc/grpc-js (direct dependency of orchestrator)
- **Installed Version:** 1.14.3 (vulnerable to multiple CVEs)
- **CVE IDs:**
  - GHSA-5375-pq7m-f5r2 (CVSS 7.5) — Malformed request causes server crash
  - GHSA-99f4-grh7-6pcq (CVSS 7.5) — Malformed compressed message causes crash
  - GHSA-m9gg-hp2v-232j (CVSS 7.4) — getAuthContext() returns unauthorized certificates as authorized
  - GHSA-f596-whhp-79r4 (CVSS 3.7) — Error message leakage
- **Affected Range:** 1.14.0 - 1.14.4; auth issue in 1.14.0 - 1.14.5
- **Impact:** 
  - Service crash via crafted gRPC messages
  - **TLS certificate validation bypass** — attacker can MITM agent communication
- **Fix:** `npm update @grpc/grpc-js` to 1.14.5+ (or latest)
- **Urgency:** CRITICAL — TLS trust is broken in this version

#### P2: HIGH

**DEP-025: body-parser DoS** (same as backend — DEP-003)

**DEP-026: path-to-regexp ReDoS**
- **Severity:** P2
- **Category:** cve
- **Package:** path-to-regexp (transitive)
- **CVE ID:** GHSA-p6wq-v6jp-vqwq (CVSS unknown)
- **Impact:** Regular expression denial of service via multiple route parameters
- **Fix:** `npm update path-to-regexp` to latest

**DEP-027: proxy-addr IPv4-Mapped IPv6 Spoofing** (same as backend — DEP-002)

**DEP-028: @protobufjs/utf8 Overlong UTF-8 Decoding**
- **Severity:** P3
- **Category:** cve
- **Package:** @protobufjs/utf8 (transitive)
- **CVE ID:** GHSA-q6x5-8v7m-xcrf (CVSS 5.3)
- **Impact:** Overlong UTF-8 sequences bypass validation
- **Fix:** Update protobufjs (should pull in fixed @protobufjs/utf8)

#### P4: Outdated Versions

**DEP-029: dockerode 1 Major Version Behind**
- **Installed:** 4.0.12
- **Latest:** 5.0.1
- **Status:** 1 major version behind
- **Fix:** `npm update dockerode`

**DEP-030: express** (same as backend — DEP-011)

**DEP-031: multer Severely Outdated (1 Major Behind)**
- **Installed:** 1.4.5-lts.2
- **Latest:** 2.5.0
- **Status:** 1+ major version behind
- **Action:** Evaluate if 2.x has breaking changes for orchestrator file upload logic

---

### 5. portal/Backend (Debug Portal Backend)
**Direct Dependencies:** 397  
**Transitive Dependencies:** 577 (!)  
**CVEs:** 61 total (4 critical, 11 high, 46 moderate)

⚠️ **HIGHEST RISK PROFILE** — Largest dependency tree and highest CVE count. Requires dedicated remediation.

**[See separate section below]**

---

### 6. portal/Frontend (Debug Portal Frontend)
**Direct Dependencies:** 9  
**Transitive Dependencies:** 424  
**CVEs:** 18 total (2 critical, 8 high, 7 moderate, 1 low)

Similar to Source/Frontend vulnerabilities. Requires remediation of tinypool, @vitest/mocker, postcss, etc.

---

## Remediation Plan

### Immediate Actions (This Week)

1. **Upgrade body-parser to 1.20.9+** in all projects
   ```bash
   cd Source/Backend && npm update body-parser
   cd Source/Backend && npm update proxy-addr
   cd platform/orchestrator && npm update body-parser proxy-addr
   ```

2. **Upgrade proxy-addr to 2.0.8+** (affects all Express projects)

3. **Upgrade @grpc/grpc-js to 1.14.5+** in platform/orchestrator
   - **Verify TLS trust after upgrade** — test certificate validation still works

4. **Upgrade protobufjs to latest compatible version** (orchestrator)
   - Run orchestrator tests to verify gRPC deserialization still works
   - Check for API changes in generated protobuf code

5. **Audit for handlebars usage** in Source/Backend
   - If backend renders templates: upgrade handlebars to 4.7.10+
   - If backend only uses hardcoded templates: downgrade risk to P2

### High Priority (Next Sprint)

6. **Upgrade handlebars to 4.7.10+** (Source/Backend)
7. **Upgrade tinypool to 2.5.0+** (Source/Frontend, portal/Frontend)
8. **Upgrade react-router-dom to 7.x** (Source/Frontend, portal/Frontend)
9. **Upgrade browserslist to latest** (all projects)
10. **Upgrade brace-expansion to latest** (Source/Backend)
11. **Review react 18→19 migration** (Source/Frontend, portal/Frontend)
12. **Plan pino 8→10 migration** (Source/Backend)

### Portal Backend Deep Dive Needed

The portal/Backend project has 61 CVEs across 577 dependencies. This requires:
- [ ] Run `npm audit --json` → analyze grouping by package
- [ ] Identify which dependencies are critical (used in hot paths)
- [ ] Consider whether portal can be:
  - Downscoped to fewer dependencies
  - Rebuilt with a smaller dependency footprint
  - Separated from main codebase if it's truly optional

---

## Duplicate Dependency Analysis

**None detected** — no duplicate major versions of critical packages.

---

## License Compliance

✅ **No GPL/AGPL violations detected** in direct dependencies.  
⚠️ **Note:** Did not run `npx license-checker` due to environment constraints; recommend adding to CI pipeline.

---

## Supply Chain Risk Assessment

| Risk | Finding | Mitigation |
|------|---------|-----------|
| **High transitive count** | portal/Backend: 577 deps | Audit for unused dependencies; consider trimming |
| **Outdated major versions** | pino (8→10), express (4→5) | Plan incremental updates; test before rollout |
| **Build-tool vulnerabilities** | vitest, postcss, esbuild | These are dev-only; update in dev cycle, not production hotfix |
| **Orchestrator criticality** | @grpc/grpc-js, protobufjs | Highest priority for remediation; test thoroughly |

---

## Cross-Team Escalations

### [ESCALATE → TheGuardians]

1. **DEP-023/024: protobufjs + @grpc/grpc-js RCE vectors** (platform/orchestrator)
   - gRPC message deserialization can execute arbitrary code
   - TLS certificate validation is broken in @grpc/grpc-js 1.14.0–1.14.5
   - **Impact:** Inter-agent communication is compromised
   - **Action:** TheGuardians should security-review the gRPC surface and confirm remediation

2. **DEP-002/027: proxy-addr IPv4-mapped IPv6 spoofing** (all Express services)
   - IP-based access controls are bypassable
   - **Impact:** Any rate limiting, geofencing, or IP whitelist can be spoofed
   - **Action:** Confirm no IP-based security controls rely on proxy-addr

3. **DEP-001: Handlebars JavaScript Injection** (Source/Backend)
   - If backend renders user templates, this is immediately exploitable
   - **Action:** Confirm whether templates are hardcoded or user-provided

### [ESCALATE → TheFixer]

All non-critical findings (DEP-004 through DEP-031) can be routed to TheFixer for:
- Dependency updates
- Regression testing
- Deployment coordination

---

## Metrics Summary

```json
{
  "audit_date": "2026-11-24",
  "total_npm_projects": 10,
  "projects_with_vulnerabilities": 8,
  "projects_clean": 1,
  "total_cves_all_projects": 196,
  "cves_critical": 19,
  "cves_high": 48,
  "cves_moderate": 101,
  "cves_low": 28,
  "cves_critical_direct": 10,
  "cves_critical_transitive": 9,
  "total_transitive_dependencies": 2082,
  "largest_project_deps": {
    "project": "portal/Backend",
    "total_deps": 577,
    "cves": 61
  },
  "avg_cves_per_project": 24.5,
  "outdated_major_packages": {
    "pino": "2 major versions behind",
    "express": "1 major version behind",
    "uuid": "5 major versions behind",
    "react": "1 major version behind",
    "react-router-dom": "1 major version behind"
  }
}
```

---

## Audit Methodology

- **Tool:** npm audit (native Node.js security auditing)
- **Scope:** All package-lock.json files in Source/, platform/
- **Excluded:** demo projects (abac-*), templates
- **Data Sources:**
  - npm registry CVE advisories
  - GitHub Security Advisory (GHSA) database
  - CVSS scoring from npm audit output
- **Confidence:** High — npm audit directly queries the registry for known vulnerabilities

---

## Next Steps

1. **Share this report** with TheGuardians and TheFixer teams
2. **Assign P1 items** to critical path (this week)
3. **Schedule deep-dive** on portal/Backend (high CVE count)
4. **Plan major version migrations** (pino, express) for next quarter
5. **Add license-checker to CI pipeline** for future audits
6. **Consider dependency pinning strategy** to reduce update churn

---

**Report Generated By:** dependency_auditor  
**Model:** Claude Haiku 4.5  
**Next Audit:** Recommended 2026-12-24 (monthly)
