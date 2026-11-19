# Dependency Auditor Findings — 2026-11-19

## Executive Summary

**Audit Scope:** Source/Backend, Source/Frontend, platform/orchestrator (critical infrastructure)
**Package Managers Detected:** npm (3 projects analyzed)
**Total Direct Dependencies:** 20 (Backend: 4, Frontend: 3, Orchestrator: 3 direct; note orchestrator has 153 prod transitive)
**Total Transitive Dependencies:** 530+ (Backend: 102 prod + 310 dev, Frontend: 9 prod + 222 dev, Orchestrator: 153 prod)
**Known CVEs Found:** 37 total (6 critical, 15 high, 14 moderate, 2 low)

**CRITICAL ALERT:** The orchestrator (critical infrastructure) has 2 CRITICAL vulnerabilities including code injection in protobufjs, plus 3 HIGH severity CVEs in gRPC and other core dependencies. Immediate action required.

---

## Vulnerability Summary by Project

### Source/Backend
- **Direct Dependencies:** 4 (express, pino, prom-client, uuid)
- **Total Dependencies:** 411 (102 prod, 310 dev, 2 optional)
- **CVEs:** 11 (2 critical, 5 high, 3 moderate, 1 low)
- **Status:** ⚠️ HIGH PRIORITY — multiple high-severity DoS vulnerabilities in transitive deps

### Source/Frontend
- **Direct Dependencies:** 3 (react, react-dom, react-router-dom)
- **Total Dependencies:** 230 (9 prod, 222 dev, 50 optional, 8 peer)
- **CVEs:** 17 (2 critical, 7 high, 7 moderate, 1 low)
- **Status:** ⚠️ HIGH PRIORITY — high DoS/file-disclosure vulnerabilities in build toolchain

### platform/orchestrator
- **Direct Dependencies:** 3 (dockerode, express, multer)
- **Total Dependencies:** 155 (all 153 production — no dev dependencies!)
- **CVEs:** 9 (2 critical, 3 high, 4 moderate)
- **Status:** 🔴 **CRITICAL — This is infrastructure code with critical vulnerabilities. Immediate remediation required.**

---

## Detailed Findings

### CRITICAL VULNERABILITIES (P1)

#### DEP-001: protobufjs — Code Injection via bytes field defaults
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs
- **Location:** platform/orchestrator (transitive via gRPC)
- **CVE:** GHSA-66ff-xgx4-vchm (source 1118641)
- **Detail:** 
  - Code injection through bytes field defaults in generated toObject code
  - Affects protobufjs ≤7.5.5
  - CWE-94 (Improper Control of Generation of Code)
  - Exploitable via crafted protobuf messages
- **Impact:** Arbitrary code execution in orchestrator — this is the agent pipeline infrastructure
- **Fix:** Update protobufjs to ≥7.5.6
- **Command:** `cd platform/orchestrator && npm update protobufjs`
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection in critical infrastructure

#### DEP-002: @grpc/grpc-js — Server Crash & Authentication Bypass
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** @grpc/grpc-js
- **Location:** platform/orchestrator (transitive)
- **CVEs:** 
  - GHSA-5375-pq7m-f5r2: Malformed request causes server crash (CVSS 7.5)
  - GHSA-99f4-grh7-6pcq: Malformed compressed message causes crash (CVSS 7.5)
  - GHSA-m9gg-hp2v-232j: getAuthContext returns unauthorized certificates as authorized (CVSS 7.4, CWE-295)
  - GHSA-f596-whhp-79r4: Error messages leaked to client
- **Detail:**
  - Affects @grpc/grpc-js 1.14.0–1.14.4
  - Multiple denial-of-service and authentication bypass vectors
  - Orchestrator uses gRPC for agent communication
- **Impact:** Orchestrator can be crashed by malformed requests; authentication can be bypassed
- **Fix:** Update @grpc/grpc-js to ≥1.14.5
- **Cross-ref:** [ESCALATE → TheGuardians] — Availability + authentication bypass in infrastructure

---

### HIGH PRIORITY VULNERABILITIES (P2)

#### DEP-003: body-parser — Denial of Service via trailing bytes
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** body-parser
- **Location:** Source/Backend (transitive via express), platform/orchestrator (transitive)
- **CVE:** GHSA-27r3-jxmh-p828 (source 1243073)
- **Detail:**
  - Vulnerable to DoS when compressed request body has trailing bytes
  - Affects body-parser <1.20.9
  - CVSS 7.5 (network-accessible, no auth required)
  - CWE-248: Uncaught Exception
- **Impact:** Attacker can crash request handler via crafted multipart/gzip payloads
- **Fix:** Update express to ≥4.19.0 (which includes body-parser ≥1.20.9) or update body-parser directly
- **Commands:** 
  - Backend: `cd Source/Backend && npm update express`
  - Orchestrator: `cd platform/orchestrator && npm update express`
- **Cross-ref:** [CROSS-REF: red-teamer] — Exploitable DoS in request handling layer

#### DEP-004: path-to-regexp — Regular Expression Denial of Service
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** path-to-regexp
- **Location:** platform/orchestrator (transitive via express)
- **CVE:** GHSA-37ch-88jc-xwx2 (source 1115527)
- **Detail:**
  - ReDoS vulnerability via multiple route parameters
  - Affects path-to-regexp <0.1.13
  - CVSS 7.5
  - CWE-1333 (Inefficient Regular Expression Complexity)
- **Impact:** Attacker can crash orchestrator by crafting URLs with complex parameter patterns
- **Fix:** Update express to ≥4.19.1 or path-to-regexp to ≥0.1.13
- **Cross-ref:** [CROSS-REF: red-teamer] — ReDoS in URL routing

#### DEP-005: @remix-run/router — Open Redirect via protocol-relative URL
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** @remix-run/router
- **Location:** Source/Frontend (transitive via react-router-dom)
- **CVE:** GHSA-2j2x-hqr9-3h42 (source 1136293)
- **Detail:**
  - Same-origin redirect with path starting `//` causes open redirect
  - Affects @remix-run/router 1.3.0–1.23.2
  - CWE-601 (URL Redirection to Untrusted Site)
  - Protocol-relative URLs reinterpreted by browser
- **Impact:** Frontend can be used to redirect users to attacker-controlled sites
- **Fix:** Update react-router-dom to ≥6.30.3 (or latest stable)
- **Command:** `cd Source/Frontend && npm update react-router-dom`
- **Cross-ref:** [ESCALATE → TheGuardians] — Client-side redirect vulnerability

#### DEP-006: Backend pino is 2 major versions behind
- **Severity:** P2
- **Category:** outdated
- **Package:** pino
- **Location:** Source/Backend
- **Detail:**
  - Current: 8.17.0 | Wanted: 8.21.0 | Latest: 10.4.0
  - **2 major versions behind** indicates likely missing security patches
  - Pino is the structured logging layer — security-critical
- **Impact:** Potential logging bypass, unpatched vulnerabilities in logger
- **Fix:** Update pino to 10.x (latest stable)
- **Command:** `cd Source/Backend && npm update pino`
- **Cross-ref:** [CROSS-REF: performance-profiler] — Logging layer may have performance issues in older versions

---

### MEDIUM PRIORITY VULNERABILITIES (P3)

#### DEP-007: browserslist — Unbounded Memory Growth (OOM DoS)
- **Severity:** P3 (MEDIUM)
- **Category:** cve
- **Package:** browserslist
- **Location:** Source/Frontend (transitive via build tools)
- **CVEs:** 
  - GHSA-c83g-rgw3-j3cx: Unbounded memory growth, no cache eviction (CVSS 7.5)
  - GHSA-73wf-gq98-2v4g: Prototype write via untrusted browserslist-stats.json (CVSS 7.5)
- **Detail:**
  - Affects browserslist ≤4.28.6
  - Each distinct query result cached without eviction limit
  - Can lead to process OOM/crash
- **Impact:** Frontend build tooling can be DoSed; dev environment stability
- **Fix:** Update browserslist to ≥4.28.7
- **Command:** `cd Source/Frontend && npm update browserslist`

#### DEP-008: form-data — CRLF Injection in multipart field names
- **Severity:** P3 (MEDIUM)
- **Category:** cve
- **Package:** form-data
- **Location:** Source/Frontend (transitive)
- **CVE:** GHSA-hmw2-7cc7-3qxx (source 1120743)
- **Detail:**
  - Unescaped multipart field names/filenames allow CRLF injection
  - Affects form-data 4.0.0–4.0.5
  - CVSS 7.5 (CWE-93)
- **Impact:** Attacker can inject headers in multipart requests
- **Fix:** Update form-data to ≥4.0.6
- **Command:** `cd Source/Frontend && npm update form-data`

#### DEP-009: postcss — Arbitrary file read via sourceMappingURL
- **Severity:** P3 (MEDIUM)
- **Category:** cve
- **Package:** postcss
- **Location:** Source/Frontend (transitive via build)
- **CVEs:**
  - GHSA-6g55-p6wh-862q: Arbitrary file read via sourceMappingURL (CVSS 7.5)
  - GHSA-r28c-9q8g-f849: Path traversal in source map auto-loading (CVSS 7.5)
- **Detail:**
  - Affects postcss ≤8.5.11 and ≤8.5.22 (incomplete fix)
  - Attacker can read .map files and local files via CSS comments
- **Impact:** Information disclosure from frontend build artifacts
- **Fix:** Update postcss to ≥8.5.24 (after the last incomplete fix)
- **Command:** `cd Source/Frontend && npm update postcss`
- **Cross-ref:** [CROSS-REF: red-teamer] — File disclosure in build tooling

#### DEP-010: nanoid — Infinite loops & Integer overflow
- **Severity:** P3 (MEDIUM)
- **Category:** cve
- **Package:** nanoid
- **Location:** Source/Frontend (transitive)
- **CVEs:**
  - GHSA-28wg-ghj8-5hjv: Non-secure generators loop indefinitely with negative size (CVSS 5.9)
  - GHSA-2v37-7h3g-55p8: Custom generators loop indefinitely when size=0 (CVSS 5.9)
  - GHSA-xwg4-73v4-xw9w: Integer overflow/wraparound (CVSS 7.4, CWE-190)
- **Detail:**
  - Affects nanoid ≤3.3.17
  - Multiple infinite loop vectors; integer overflow can lead to ID collisions
- **Impact:** Potential ID collision attacks, process hangs
- **Fix:** Update nanoid to ≥3.3.18
- **Command:** `cd Source/Frontend && npm update nanoid`

#### DEP-011: Backend uuid is 5 major versions behind
- **Severity:** P3
- **Category:** outdated
- **Package:** uuid
- **Location:** Source/Backend
- **Detail:**
  - Current: 9.0.0 | Wanted: 9.0.1 | Latest: 14.0.3
  - **5 major versions behind** (from 9.x to 14.x) indicates long-unpatched state
  - UUID generation is security-critical (used for work item IDs)
- **Impact:** Unpatched security issues; likely performance regressions
- **Fix:** Update uuid to 14.x
- **Command:** `cd Source/Backend && npm update uuid`
- **Cross-ref:** [CROSS-REF: performance-profiler] — ID generation may have performance issues

#### DEP-012: brace-expansion — Multiple DoS via exponential expansion
- **Severity:** P3 (MEDIUM)
- **Category:** cve
- **Package:** brace-expansion
- **Location:** Source/Backend (transitive)
- **CVEs:** 
  - GHSA-f886-m6hf-6m8v: Zero-step sequence hangs process (CVSS 6.5)
  - GHSA-3jxr-9vmj-r5cp: Exponential-time expansion of `{}` groups (CVSS 5.3)
  - GHSA-mh99-v99m-4gvg: Unbounded expansion causes OOM (CVSS 7.5)
  - GHSA-rgw5-rvv9-x895: Unbounded intermediate arrays bypass CVE-2026-14257 (CVSS 7.5)
  - GHSA-qhr7-859c-m2p7: Uncontrolled recursion on nested braces (CVSS 7.5)
- **Detail:**
  - Affects brace-expansion <1.1.21 (multiple fixes required)
  - Used indirectly via glob patterns in backend build tools
- **Impact:** Potential build failures or process hangs during development
- **Fix:** Update brace-expansion to ≥1.1.21
- **Note:** May require updating glob/minimatch dependencies

#### DEP-013: React ecosystem outdated (1+ major version behind)
- **Severity:** P3
- **Category:** outdated
- **Package:** react, react-dom, react-router-dom
- **Location:** Source/Frontend
- **Detail:**
  - react: 18.3.1 → 19.3.1 (1 major behind)
  - react-dom: 18.3.1 → 19.3.1 (1 major behind)
  - react-router-dom: 6.26.0 → 7.18.6 (1 major behind)
  - Plus: react-router-dom already has CVE (GHSA-2j2x-hqr9-3h42)
- **Impact:** Missing security patches and performance improvements
- **Fix:** Plan major version upgrade cycle
- **Commands:**
  ```bash
  cd Source/Frontend
  npm install react@19 react-dom@19 react-router-dom@7
  ```

#### DEP-014: Orchestrator dependencies outdated
- **Severity:** P3
- **Category:** outdated
- **Package:** dockerode, express, multer
- **Location:** platform/orchestrator
- **Detail:**
  - dockerode: 4.0.4 → 5.0.1 (1 major behind)
  - express: 4.21.0 → 5.3.0 (1 major behind)
  - multer: 1.4.5-lts.1 → 2.5.0 (1 major behind)
- **Impact:** Unpatched infrastructure; express already has CVEs
- **Priority:** Update immediately alongside CVE fixes
- **Commands:**
  ```bash
  cd platform/orchestrator
  npm update express  # fixes body-parser, path-to-regexp
  npm update dockerode
  npm update multer
  ```

---

## Recommended Remediation Plan

### IMMEDIATE (This Sprint)
1. **Orchestrator critical vulnerabilities:**
   - Update @grpc/grpc-js to ≥1.14.5
   - Update protobufjs to ≥7.5.6
   - Update express to ≥4.22.0 (fixes body-parser, path-to-regexp)
   - Run full test suite on orchestrator after updates

2. **Backend critical/high issues:**
   - Update express to ≥4.22.0
   - Update pino to 10.x
   - Update uuid to 14.x
   - Run test suite: `cd Source/Backend && npm test`

3. **Frontend critical/high issues:**
   - Update react-router-dom to latest 6.x (fixes GHSA-2j2x-hqr9-3h42)
   - Update express to ≥4.22.0
   - Update postcss to ≥8.5.24
   - Run tests: `cd Source/Frontend && npm test`

### SHORT TERM (Next Sprint)
4. Update other high-CVE packages:
   - browserslist ≥4.28.7
   - form-data ≥4.0.6
   - nanoid ≥3.3.18
   - Verify no breaking changes in Frontend

5. Plan React major version upgrade (18→19)
   - Create upgrade plan with testing strategy
   - Schedule testing window

### ONGOING
- Monitor npm audit output weekly
- Update license-checker configuration
- Document any GPL/AGPL license decisions

---

## Dependency Tree Analysis

### Backend (411 total dependencies)
- **Concern:** 102 production dependencies is reasonable, but 310 dev dependencies suggests heavy test/build infrastructure
- **Risk Surface:** Moderate (dev deps are lower risk but still part of CI)

### Frontend (230 total dependencies)
- **Concern:** React ecosystem adds 220+ transitive deps; build tools (vite, vitest) pull in 100+ deps each
- **Risk Surface:** High (build toolchain has many CVEs)
- **Recommendation:** Consider dependency audit tooling in CI/CD

### Orchestrator (155 total dependencies)
- **Concern:** ALL 153 dependencies are production — no dev/test separation
- **Risk Surface:** CRITICAL (infrastructure with no test infrastructure isolation)
- **Recommendation:** This needs immediate security hardening; consider containerized isolation

---

## License Compliance

✅ **No GPL/AGPL viral license violations detected.**
- Backend: UNLICENSED (private project, OK)
- Frontend: UNLICENSED (private project, OK)
- Orchestrator: UNKNOWN — recommend reviewing `package.json` metadata

✅ **No suspicious post-install scripts detected** across all projects.

---

## Supply Chain Risk Assessment

| Metric | Backend | Frontend | Orchestrator |
|--------|---------|----------|--------------|
| Prod dependencies | 102 | 9 | 153 |
| Transitive depth | 10+ | 15+ | 10+ |
| Post-install scripts | None | None | None |
| Single-maintainer packages | None detected | None detected | None detected |
| Deprecated packages | None | None | None |
| Total CVEs | 11 | 17 | 9 |

**Risk Rating:** 🟡 MEDIUM (high CVE count, but no abandonment signs)

---

## Traceability & Next Steps

**Dashboard Reporting:** Results will be posted to pipeline state via `tools/pipeline-update.sh`

**Follow-up Actions:**
- [ ] Escalate orchestrator CRITICAL findings to TheGuardians (security team)
- [ ] Create tickets for all P2/P3 fixes
- [ ] Schedule testing window for major version upgrades (React, pino, uuid)
- [ ] Update CI/CD to include `npm audit` gate with blocking thresholds
- [ ] Document license compliance decisions for any GPL dependencies (if added)

---

## Audit Metadata

| Field | Value |
|-------|-------|
| Auditor | dependency-auditor |
| Scan Date | 2026-11-19 |
| npm audit version | npm 10.x |
| Packages Scanned | 20 direct, 530+ transitive |
| CVEs Detected | 37 (6 critical, 15 high, 14 moderate, 2 low) |
| Blockers | 2 (protobufjs, grpc-js code injection/crash in infrastructure) |
| Assessment | 🔴 CRITICAL — Infrastructure has code injection risk |

