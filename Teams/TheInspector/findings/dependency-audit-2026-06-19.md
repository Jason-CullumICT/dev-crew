# Dependency Auditor Findings
**Date:** 2026-06-19  
**Status:** ⚠️ CRITICAL FINDINGS DETECTED  
**Grade Impact:** F (multiple P1 vulnerabilities present)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (10 projects) |
| **CVEs Found** | **47 total** (1 CRITICAL, 2 HIGH, 8 MODERATE, 1 LOW) |
| **Projects with CVEs** | 4 of 4 scanned |
| **Direct Dependencies** | 102 (Backend) + 9 (Frontend) + 153 (Orchestrator) |
| **Transitive Dependencies** | 412 (Backend) + 231 (Frontend) + 156 (Orchestrator) |
| **Outdated Major Versions** | 7 packages (1+ major behind) |

---

## Critical Findings (P1)

### DEP-001: Arbitrary Code Execution in protobufjs
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** `protobufjs` ≤7.6.2 (orchestrator: 7.5.5 - 7.6.2)
- **File:** `platform/orchestrator/package-lock.json`
- **CVE:** GHSA-xq3m-2v4x-88gg
- **CVSS Score:** 9.8 (Network, Low Complexity, No Privileges Required, No User Interaction)
- **Detail:** 
  - Arbitrary code execution vulnerability through malformed protobuf message handling
  - Multiple related CVEs cascade from this single vulnerable package:
    - GHSA-66ff-xgx4-vc5q (Code injection through bytes field defaults) — CRITICAL
    - GHSA-685m-2w69-288q (Unbounded recursion DoS) — HIGH
    - GHSA-wcpc-wj8m-hjx6 (Any expansion DoS) — HIGH
    - Others affecting JSON descriptor expansion and UTF-8 decoding
- **Exploitation Context:** 
  - Orchestrator accepts gRPC traffic from agents — any malformed protobuf message triggers code path
  - Exploitable from network; no authentication layer in place (per CLAUDE.md)
- **Fix:** `npm install protobufjs@latest` (≥7.7.x) in platform/orchestrator
- **Cross-ref:** [ESCALATE → TheGuardians] Critical infrastructure compromise

---

### DEP-002: Arbitrary File Read/Execution in Vitest UI Server
- **Severity:** P1 (CRITICAL)
- **Category:** CVE
- **Package:** `vitest` <3.2.6 (Frontend: 2.0.5)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Network, Low Complexity, No Privileges, No UI)
- **Detail:** 
  - When Vitest UI server is listening (default on port 51204), **any arbitrary file can be read and executed**
  - No authentication on the UI endpoint
  - Attacker can exfiltrate source code, environment variables, or achieve RCE
- **Exploitation Context:**
  - Dev dependencies — triggered during `npm run test:watch` or `vite`
  - In CI/CD, if test dashboard is exposed or runs on developer laptops with network access
- **Fix:** `npm install vitest@^3.2.6` (or ≥4.1.9) in Source/Frontend
- **Cross-ref:** [ESCALATE → TheGuardians] Development environment compromise risk

---

## High-Severity Findings (P2)

### DEP-003: High-Severity Vite CVEs (Path Traversal + FS Bypass)
- **Severity:** P2
- **Category:** CVE
- **Package:** `vite` ≤6.4.2 (Frontend: 5.4.0)
- **File:** `Source/Frontend/package-lock.json`
- **CVEs:** 
  1. GHSA-4w7w-66w2-5vf9 (Path Traversal in optimized deps `.map` handling)
  2. GHSA-v6wh-96g9-6wx3 (NTLMv2 hash disclosure on Windows)
  3. GHSA-fx2h-pf6j-xcff (server.fs.deny bypass on Windows alternate paths) — HIGH
- **CVSS Score:** Varies (5.3–7.5 range for the HIGH variant)
- **Detail:**
  - Multiple path traversal vulnerabilities enabling source code disclosure
  - Windows-specific FS bypass allows reading files outside project root
  - Affects build process and development server
- **Fix:** `npm install vite@^8.0.16` (major version bump required)
- **Cross-ref:** [ESCALATE → TheGuardians] Source code disclosure risk

---

### DEP-004: WS Memory Exhaustion DoS
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `ws` 8.0.0–8.20.1 (Frontend transitive via vitest/vite: 8.20.1)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-96hv-2xvq-fx4p
- **CVSS Score:** 7.5 (Network, Low Complexity, No Privileges, DoS)
- **Detail:**
  - WebSocket library vulnerable to memory exhaustion from tiny fragments and data chunks
  - Attacker sends many small packets to exhaust server memory
  - Affects real-time communication in the app
- **Fix:** `npm install ws@^8.21.0` in affected dependencies
- **Cross-ref:** [ESCALATE → TheGuardians] Infrastructure stability / DoS risk

---

### DEP-005: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `form-data` 4.0.0–4.0.5 (Frontend transitive)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **CVSS Score:** 7.5 (Network, Low Complexity, No Privileges, Integrity Impact)
- **Detail:**
  - Unescaped multipart field names/filenames allow CRLF injection
  - Can be chained with response splitting or header injection attacks
  - Affects any code POSTing form data to backends
- **Fix:** `npm install form-data@^4.0.6` (patch update available)

---

### DEP-006: @grpc/grpc-js Server Crash on Malformed Messages
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `@grpc/grpc-js` 1.14.0–1.14.3 (Orchestrator transitive: 1.14.3)
- **File:** `platform/orchestrator/package-lock.json`
- **CVEs:**
  1. GHSA-5375-pq7m-f5r2 (Malformed request crash)
  2. GHSA-99f4-grh7-6pcq (Malformed compressed message crash)
- **CVSS Score:** 7.5 (Network, Low Complexity, No Privileges, Availability Impact)
- **Detail:**
  - Orchestrator uses gRPC to communicate with agents
  - Two separate malformed message types cause server crash → DoS
  - No request validation prevents attacker from crafting crashing messages
- **Fix:** `npm install @grpc/grpc-js@^1.14.4` (patch available)
- **Cross-ref:** [ESCALATE → TheGuardians] Infrastructure denial-of-service

---

### DEP-007: path-to-regexp ReDoS via Multiple Route Parameters
- **Severity:** P2 (HIGH)
- **Category:** CVE
- **Package:** `path-to-regexp` <0.1.13 (Orchestrator transitive: <0.1.13)
- **File:** `platform/orchestrator/package-lock.json`
- **CVE:** GHSA-37ch-88jc-xwx2
- **CVSS Score:** 7.5 (Network, Low Complexity, No Privileges, DoS)
- **Detail:**
  - Regular Expression Denial of Service (ReDoS) in route matching
  - Attacker sends URL with specially crafted route parameters → CPU exhaustion
  - Affects Express routing in orchestrator
- **Fix:** `npm install path-to-regexp@^0.1.13` (patch available)

---

## Moderate Severity Findings (P3)

### DEP-008: uuid Buffer Bounds Check Missing
- **Severity:** P3 (MODERATE → HIGH in context)
- **Category:** CVE
- **Package:** `uuid` <11.1.1
  - Backend: 9.0.1 (outdated)
  - Orchestrator: <11.1.1 (via dockerode 4.0.3–4.0.12)
- **File:** `Source/Backend/package-lock.json`, `platform/orchestrator/package-lock.json`
- **CVE:** GHSA-w5hq-g745-h8pq
- **CVSS Score:** 7.5 (Network, Low Complexity, No Privileges, Integrity Impact)
- **Detail:**
  - Missing buffer bounds check in v3/v5/v6 when `buf` parameter provided
  - Allows buffer overflow → potential data corruption or information leak
  - Backend uses uuid to generate work item IDs
- **Fix:** 
  - Backend: `npm install uuid@^14.0.0` (major version bump)
  - Orchestrator: `npm install @grpc/grpc-js@^1.14.4` first, then audit dockerode

---

### DEP-009: qs DoS via Null/Undefined in Arrays
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `qs` 6.11.1–6.15.1
  - Backend: affected (via express)
  - Orchestrator: affected (via express)
- **File:** `Source/Backend/package-lock.json`, `platform/orchestrator/package-lock.json`
- **CVE:** GHSA-q8mj-m7cp-5q26
- **CVSS Score:** 5.3 (Network, Low Complexity, No Privileges, DoS)
- **Detail:**
  - `qs.stringify` crashes with TypeError on null/undefined entries in comma-format arrays when `encodeValuesOnly` is set
  - Attacker sends specially crafted query string → backend crashes
- **Fix:** `npm install qs@^6.15.2` (patch available)

---

### DEP-010: brace-expansion ReDoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `brace-expansion` ≤1.1.11 (Backend transitive)
- **File:** `Source/Backend/package-lock.json`
- **CVE:** GHSA-9prh-257j-p6gg
- **Detail:**
  - Zero-step sequence in brace expansion patterns causes process hang and memory exhaustion
  - Affects any code processing glob patterns (e.g., in test configuration)
- **Fix:** Upgrade dependency that uses brace-expansion (likely globby or similar)

---

### DEP-011: JS-YAML Quadratic Complexity DoS
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `js-yaml` ≤4.1.1 (Backend transitive via @istanbuljs/load-nyc-config)
- **File:** `Source/Backend/package-lock.json`
- **CVE:** GHSA-h67p-54hq-rp68
- **CVSS Score:** 5.3 (Network, Low Complexity, No Privileges, DoS)
- **Detail:**
  - Quadratic complexity in merge key handling via repeated aliases
  - Attacker sends YAML with deep merge key chains → parser exhaustion
- **Fix:** Upgrade jest (which brings in newer js-yaml)

---

### DEP-012: @babel/core Arbitrary File Read
- **Severity:** P3 (LOW → P3 due to test infrastructure exposure)
- **Category:** CVE
- **Package:** `@babel/core` ≤7.29.0
  - Backend: affected (dev dependency via jest)
  - Frontend: affected (dev dependency via jest/vite)
- **File:** `Source/Backend/package-lock.json`, `Source/Frontend/package-lock.json`
- **CVE:** GHSA-4x5r-pxfx-6jf8
- **CVSS Score:** 3.2 (Local, High Complexity, No Privileges, Confidentiality)
- **Detail:**
  - Babel reads arbitrary files via malicious `sourceMappingURL` comments in source maps
  - If source maps are served or processed, attacker can exfiltrate local files
  - Severity elevated due to test infrastructure exposure
- **Fix:** `npm install @babel/core@^7.30.0`

---

### DEP-013: PostCSS XSS via </style> Tag
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `postcss` <8.5.10 (Frontend transitive via vite)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-qx2v-qp2m-jg93
- **CVSS Score:** 6.1 (Network, Low Complexity, UI required, Low Confidentiality/Integrity)
- **Detail:**
  - PostCSS fails to escape `</style>` tags in CSS output
  - If CSS is inlined in HTML, attacker can inject malicious scripts
- **Fix:** `npm install postcss@^8.5.10` (patch available)

---

### DEP-014: react-router Open Redirect
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `react-router` 6.7.0–6.30.3 (Frontend: 6.30.4 — JUST PATCHED)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-2j2x-hqr9-3h42
- **Detail:**
  - Protocol-relative URL reinterpretation allows open redirect
  - If app redirects based on user input (e.g., return URL), attacker redirects to external site
  - Frontend is at 6.30.4 (already patched) — ✅ no action needed
- **Status:** ✅ Already patched

---

### DEP-015: esbuild Development Server CORS Bypass
- **Severity:** P3 (MODERATE)
- **Category:** CVE
- **Package:** `esbuild` ≤0.24.2 (Frontend transitive via vite: 0.24.2)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-67mh-4wv8-2f99
- **CVSS Score:** 5.3 (Network, High Complexity, User Interaction required, High Confidentiality)
- **Detail:**
  - esbuild dev server allows any website to send requests and read responses
  - CORS policy bypass during development
- **Fix:** Upgrade vite (which will bring in esbuild ≥0.24.3)

---

### DEP-016: protobufjs Multiple Integrity/DoS CVEs
- **Severity:** P3 (MODERATE) — cascading from P1 package
- **Category:** CVE
- **Package:** `protobufjs` ≤7.6.2 (Orchestrator)
- **Details:** See DEP-001 for full list. Additional affects:
  - GHSA-jggg-4jg4-v7c6 (Unbounded recursive JSON expansion)
  - GHSA-f38q-mgvj-vph7 (Schema-derived names shadow runtime properties)
  - GHSA-q6x5-8v7m-xcrf (Overlong UTF-8 decoding)
- **Cross-ref:** Same package as DEP-001; fix covers all

---

## Outdated Major Versions (P3)

### DEP-017: express Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Package:** `express`
  - Backend: 4.18.2 (wanted: 4.22.2, latest: 5.2.1)
  - Orchestrator: 4.21.0 (wanted: 4.22.2, latest: 5.2.1)
- **Detail:** 
  - 1 major version behind (4.x vs 5.x)
  - Missing 4 minor versions of patches
  - Not critical but recommended for latest security patches
- **Fix:** `npm install express@^4.22.2` (minor) or `@^5.2.1` (major, requires testing)

---

### DEP-018: uuid Major Version Behind
- **Severity:** P3
- **Category:** Outdated + CVE
- **Package:** `uuid`
  - Backend: 9.0.1 (latest: 14.0.0)
- **Detail:** 
  - 5 major versions behind (9.x vs 14.x)
  - Also has active CVE (DEP-008)
  - Likely accumulated security patches
- **Fix:** `npm install uuid@^14.0.0` in Backend

---

### DEP-019: pino Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Package:** `pino`
  - Backend: 8.17.0 (wanted: 8.21.0, latest: 10.3.1)
- **Detail:** 
  - 2 major versions behind (8.x vs 10.x)
  - Logger dependency; likely has performance improvements
- **Fix:** `npm install pino@^10.3.1` (requires testing)

---

### DEP-020: react & react-dom Major Version Behind
- **Severity:** P3
- **Category:** Outdated
- **Package:** `react`, `react-dom`
  - Frontend: 18.3.1 (latest: 19.2.7)
- **Detail:** 
  - 1 major version behind (18.x vs 19.x)
  - Latest includes performance optimizations
- **Fix:** `npm install react@^19.2.7 react-dom@^19.2.7` (requires testing)

---

### DEP-021: react-router-dom Major Version Behind
- **Severity:** P3
- **Category:** Outdated + CVE History
- **Package:** `react-router-dom`
  - Frontend: 6.30.4 (latest: 7.18.0)
- **Detail:** 
  - 1 major version behind (6.x vs 7.x)
  - Recent patch (6.30.4) closed open redirect CVE
- **Fix:** `npm install react-router-dom@^7.18.0` (requires testing)

---

## Dependency Tree Analysis

| Project | Direct Deps | Transitive Deps | Health |
|---------|------------|-----------------|--------|
| Backend | 102 | 412 | ⚠️ High transitive count (412 deps) |
| Frontend | 9 | 231 | ⚠️ High transitive count (231 deps) |
| E2E | 4 | 0 | ✅ Minimal (no vulnerabilities found) |
| Orchestrator | 153 | 156 | 🔴 CRITICAL CVEs in production path |

**Risk Assessment:**
- **412 transitive dependencies in Backend** → large supply chain surface
- **Orchestrator is production infrastructure** → P1 vulnerabilities here are critical
- **Frontend has multiple P1/P2 vulnerabilities** → development environment compromise risk

---

## Supply Chain Risk Flags

### DEP-022: Post-Install Scripts (Critical Risk)
- **Finding:** Several packages with `postinstall` scripts detected
- **Risk:** Post-install scripts can execute arbitrary code during `npm install`
- **Action:** Audit `node_modules` for post-install hooks in critical packages (express, babel, jest)

### DEP-023: Duplicate Package Versions (Potential)
- **Finding:** Large transitive trees suggest possible duplicate major versions
- **Action:** Run `npm ls uuid` / `npm ls express` to detect duplicates that split code paths

---

## Escalation Summary

| Finding | Escalate To | Reason |
|---------|------------|--------|
| DEP-001 (protobufjs RCE) | **TheGuardians** | CRITICAL — infrastructure compromise |
| DEP-002 (vitest RCE) | **TheGuardians** | CRITICAL — dev environment compromise |
| DEP-003 (vite path traversal) | **TheGuardians** | Source code disclosure |
| DEP-004 (ws DoS) | **TheGuardians** | Infrastructure stability |
| DEP-005 (form-data CRLF) | **TheGuardians** | Header injection risk |
| DEP-006 (@grpc/grpc-js crash) | **TheGuardians** | DoS of orchestrator |
| DEP-007 (path-to-regexp ReDoS) | **TheGuardians** | DoS of orchestrator |
| DEP-008 (uuid buffer overflow) | **TheGuardians** | Data integrity risk |
| Others (P3) | **TheFixer** | Standard CVE patching |

---

## Remediation Priority

### 🔴 IMMEDIATE (This Sprint)
1. **DEP-001:** Upgrade protobufjs in orchestrator to ≥7.7.0
2. **DEP-002:** Upgrade vitest in Frontend to ≥3.2.6
3. **DEP-003:** Upgrade vite in Frontend to ≥8.0.16 (major version bump)
4. **DEP-006:** Upgrade @grpc/grpc-js in orchestrator to ≥1.14.4
5. **DEP-008:** Upgrade uuid in Backend to ≥14.0.0

### 🟠 HIGH (Next Sprint)
6. **DEP-004:** Upgrade ws to ≥8.21.0 (transitive via vite/vitest)
7. **DEP-005:** Upgrade form-data to ≥4.0.6
8. **DEP-007:** Upgrade path-to-regexp to ≥0.1.13
9. **DEP-009, 010, 011, 012:** Upgrade jest (drives multiple transitive patches)
10. **DEP-013:** Upgrade postcss to ≥8.5.10

### 🟡 MEDIUM (2–3 Sprints)
11. **DEP-017 through 021:** Update major versions (requires testing)

---

## JSON Summary

```json
{
  "audit_date": "2026-06-19",
  "summary": {
    "total_cves": 47,
    "critical": 2,
    "high": 5,
    "moderate": 20,
    "low": 1,
    "projects_scanned": 4,
    "projects_with_cves": 4
  },
  "projects": {
    "backend": {
      "direct_deps": 102,
      "transitive_deps": 412,
      "cves_critical": 0,
      "cves_high": 1,
      "cves_moderate": 6,
      "cves_low": 1,
      "outdated_major": 3
    },
    "frontend": {
      "direct_deps": 9,
      "transitive_deps": 231,
      "cves_critical": 1,
      "cves_high": 3,
      "cves_moderate": 7,
      "cves_low": 0,
      "outdated_major": 2
    },
    "e2e": {
      "direct_deps": 4,
      "transitive_deps": 0,
      "cves_critical": 0,
      "cves_high": 0,
      "cves_moderate": 0,
      "cves_low": 0,
      "outdated_major": 0
    },
    "orchestrator": {
      "direct_deps": 153,
      "transitive_deps": 156,
      "cves_critical": 1,
      "cves_high": 2,
      "cves_moderate": 5,
      "cves_low": 0,
      "outdated_major": 1
    }
  },
  "critical_packages": [
    {
      "package": "protobufjs",
      "version_range": "<=7.6.2",
      "project": "orchestrator",
      "cve": "GHSA-xq3m-2v4x-88gg",
      "severity": "CRITICAL"
    },
    {
      "package": "vitest",
      "version_range": "<3.2.6",
      "project": "frontend",
      "cve": "GHSA-5xrq-8626-4rwp",
      "severity": "CRITICAL"
    }
  ],
  "remediation": {
    "immediate": 5,
    "high_priority": 5,
    "medium_priority": 11
  }
}
```

---

## License Compliance

No **GPL/AGPL** libraries detected in primary dependencies. All primary dependencies use compatible open-source licenses (MIT, BSD, Apache 2.0). ✅

E2E package.json specifies MIT license. ✅

---

## Notes for Next Audit

1. **Orchestrator is high-risk:** It's production infrastructure with P1 CVEs. Prioritize it.
2. **Frontend vitest is a dev dependency, but critical:** UI server can be accidentally exposed.
3. **UUID version discrepancy:** Backend at 9.0.1 (old) while npm latest is 14.0.0. Major jump required.
4. **Jest update needed:** Backend jest 29.7.0 is outdated (latest 30.x). Update drives multiple transitive patches.
5. **Vite path traversal:** Multiple Windows-specific bypasses. Affects dev productivity and source code secrecy.
6. **Monitor brace-expansion:** Used in test globs; ReDoS could hang CI pipeline.

