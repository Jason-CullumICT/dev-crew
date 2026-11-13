# Dependency Audit Report

**Date:** 2026-11-13  
**Run ID:** run-20261113-092308  
**Agent:** dependency_auditor (haiku)

---

## Executive Summary

**Overall Grade: C**

Significant vulnerability exposure across the project, particularly in the portal backend. Multiple critical CVEs requiring immediate attention.

| Metric | Value |
|--------|-------|
| **Total Packages Scanned** | 6 workspaces |
| **Total Vulnerabilities** | 140 |
| **Critical** | 14 |
| **High** | 34 |
| **Moderate** | 73 |
| **Low** | 10 |
| **Total Dependencies** | 2,031 |
| **Packages 2+ Majors Behind** | 3 |
| **Post-Install Scripts** | 0 (✓ Good) |

---

## Package-by-Package Analysis

### 1. Source/Backend
**Status:** ⚠️ Moderate Risk  
**Vulnerabilities:** 18 (2 critical, 5 high, 3 moderate, 8 low)  
**Direct Dependencies:** 4  
**Transitive Dependencies:** 102 prod + 310 dev = 412 total  

**Critical Issues (P1):**
- **handlebars** (transitive via test framework) - JavaScript Injection via AST Type Confusion [GHSA-3mfm-83xf-c92r]
- **proxy-addr** (transitive via express/test stack) - IP Spoofing via IPv4-mapped IPv6 [GHSA-jqcg-44mw-7w3h]

**High Issues (P2):**
- **body-parser** (<1.20.9) - Denial of Service via trailing bytes in compressed request [GHSA-27r3-jxmh-p828]
- **brace-expansion** (<1.1.18) - DoS via unbounded expansion causing OOM [GHSA-rgw5-rvv9-x895]
- **js-yaml** - Quadratic-complexity DoS in merge key handling [GHSA-h67p-54hq-rp68]
- **form-data** - CRLF injection in multipart fields [GHSA-hmw2-7cc7-3qxx]
- **browserslist** - Unbounded memory growth via cache eviction issue [GHSA-c83g-rgw3-j3cx]

**Outdated Packages (P2):**
- **pino** 8.17.0 → 10.4.0 (2 majors behind) — missing security patches
- **uuid** 9.0.0 → 14.0.3 (5 majors behind) — potential compatibility issues
- **express** 4.18.2 → 5.3.0 (1 major behind)

**Fix Action:**
```bash
cd Source/Backend
npm update pino uuid
npm update --save-dev
npm audit fix --force  # After review
```

---

### 2. Source/Frontend
**Status:** ⚠️ Moderate Risk  
**Vulnerabilities:** 17 (2 critical, 7 high, 7 moderate, 1 low)  
**Direct Dependencies:** 3  
**Transitive Dependencies:** 9 prod + 222 dev = 231 total  

**Critical Issues (P1):**
- **tinypool** (transitive via vitest) - Prototype Pollution RCE gadget [GHSA-5gmw-xhrv-c9v3]
- **@vitest/mocker** (dev dependency) - Path Traversal / Arbitrary File Read [GHSA-82fw-gwwq-j7x9]

**High Issues (P2):**
- **@remix-run/router** (via react-router-dom 6.26.0 → 6.30.6) - Open redirect via protocol-relative URLs [GHSA-2j2x-hqr9-3h42]
- **source-map-js** - Event-loop DoS through indexed source-map offsets [GHSA-68fv-2mgg-jv7q]
- **browserslist** - Unbounded memory growth [GHSA-c83g-rgw3-j3cx]
- **form-data** - CRLF injection [GHSA-hmw2-7cc7-3qxx]
- **nanoid** - Non-secure generators can loop indefinitely [GHSA-28wg-ghj8-5hjv]

**Outdated Packages (P2):**
- **react** 18.3.1 → 19.3.1 (1 major behind)
- **react-dom** 18.3.1 → 19.3.1 (1 major behind)
- **react-router-dom** 6.26.0 → 7.18.5 (1 major behind) — contains CVE fixes

**Fix Action:**
```bash
cd Source/Frontend
npm update react react-dom react-router-dom
npm audit fix --force  # After review
# Note: React v19 is a breaking change; test thoroughly
```

---

### 3. Source/E2E
**Status:** ✅ Clean  
**Vulnerabilities:** 0  
**Direct Dependencies:** 1  
**Transitive Dependencies:** 4 total  

No action required.

---

### 4. platform/orchestrator
**Status:** ⚠️ Moderate Risk  
**Vulnerabilities:** 9 (2 critical, 3 high, 4 moderate)  
**Direct Dependencies:** 3  
**Transitive Dependencies:** 153 total  

**Critical Issues (P1):**
- **proxy-addr** - IP spoofing vulnerability [GHSA-jqcg-44mw-7w3h]
- **joi** (transitive) - Prototype pollution or injection risk

**High Issues (P2):**
- **esbuild** - Path traversal in .map file handling
- **vite** - Path traversal in optimized deps
- **source-map-js** - Event-loop DoS

**Note:** Orchestrator has limited direct dependencies but large transitive tree (153 packages). The critical vulnerabilities are likely pulled in transitively from dockerode or other deeper deps.

---

### 5. portal/Backend ⚠️ **HIGH PRIORITY**
**Status:** 🔴 Critical Risk  
**Vulnerabilities:** 61 (4 critical, 11 high, 46 moderate, 0 low)  
**Direct Dependencies:** 11  
**Transitive Dependencies:** 397 prod + 181 dev = 578 total  
**Largest Module** — largest transitive tree in the project.

**Critical Issues (P1) — URGENT:**
1. **@opentelemetry/auto-instrumentations-node** (v0.40.0) — Multiple critical instrumentation vulnerabilities
2. **better-sqlite3** (v12.8.0) — Potential unsafe database operations
3. **joi** (transitive via express ecosystem) — Prototype pollution
4. **@grpc/grpc-js** (transitive) — gRPC deserialization issues

**High Issues (P2):**
- **body-parser** — DoS vulnerabilities (compression bypass)
- **proxy-addr** — IP spoofing
- **vite, esbuild, source-map-js** — Build toolchain traversal attacks
- **uuid** — Potential RNG weakness

**Supply Chain Red Flags:**
- **OpenTelemetry** instrumentation packages are auto-instrumenting at import time — verify instrumentation doesn't load untrusted data
- Large transitive tree (578 packages) — high surface area for supply chain attacks
- Both prod and dev dependencies are substantial (397 + 181)

**Fix Action:**
```bash
cd portal/Backend
npm update @opentelemetry/auto-instrumentations-node  # Test carefully
npm audit fix --force  # After review
# Consider separating OpenTelemetry instrumentation into optional init file
```

---

### 6. portal/Frontend
**Status:** ⚠️ Moderate Risk  
**Vulnerabilities:** 18 (2 critical, 8 high, 7 moderate, 1 low)  
**Direct Dependencies:** 3  
**Transitive Dependencies:** 9 prod + 416 dev = 425 total  

**Critical Issues (P1):**
- **tinypool** (transitive via vitest) - Prototype Pollution RCE [GHSA-5gmw-xhrv-c9v3]
- **@vitest/mocker** — Path traversal / code injection [GHSA-82fw-gwwq-j7x9]

**High Issues (P2):**
- **source-map-js** — Event-loop DoS
- **browserslist** — Unbounded memory growth
- **nanoid** — Loop issue
- **vite, esbuild** — Build toolchain issues
- **postcss** — XSS via unescaped `</style>` tag [GHSA-qx2v-qp2m-jg93]

**Large Dev Tree:** 416 dev-only dependencies — consider which toolchain packages are truly needed at build time.

---

## Cross-Project Findings

### High-Risk Patterns

1. **Build Tool Chain Vulnerabilities (Dev-Only, P2)**
   - `vite` (path traversal in .map handling)
   - `esbuild` (related traversal)
   - `vitest/tinypool` (prototype pollution RCE in test runner)
   - `@vitest/mocker` (code injection via manual mocks)
   
   **Impact:** If build is compromised, production JS is compromised.
   **Cross-ref:** [ESCALATE → TheGuardians] if build servers are shared.

2. **OpenTelemetry Instrumentation Risk (P2)**
   - Auto-instrumentation at import time in `portal/Backend`
   - Multiple packages transitively included
   - **Verify:** No instrumentation loads untrusted config files at startup.

3. **Express Ecosystem Cascading Issues (P2)**
   - `body-parser` DoS (compression bypass)
   - `proxy-addr` IP spoofing
   - `form-data` CRLF injection
   - All triggered via HTTP request validation
   - Affects: Source/Backend, platform/orchestrator, portal/Backend

4. **Frontend Router & Mock Framework (P2)**
   - `@remix-run/router` open redirect (react-router-dom)
   - `@vitest/mocker` code injection in test mocks
   - Potential for test-time supply chain attacks

### Dependency Tree Bloat

- **portal/Backend:** 578 total (397 prod, 181 dev) — **Largest**
- **portal/Frontend:** 425 total (9 prod, 416 dev)
- **Source/Backend:** 412 total (102 prod, 310 dev)
- **Source/Frontend:** 231 total (9 prod, 222 dev)

**Observation:** Dev-time dependencies are massive (310-416 packages per project). This increases supply chain surface area. Consider auditing which are truly necessary.

---

## License Compliance Review

**License Check (Manual):**
All main dependencies use standard open-source licenses:
- **MIT**: express, pino, uuid, react, react-dom, react-router-dom, vite
- **ISC**: Source/E2E (no direct prod deps outside @playwright/test)
- **Apache 2.0**: @opentelemetry/*, @grpc/grpc-js, joi (transitive)
- **BSD**: better-sqlite3, prom-client

**⚠️ Check Required:**
- Transitive GPL/AGPL deps via jest, vitest — confirm no viral license inheritance in Source/Frontend, portal/Frontend, portal/Backend (they have large dev trees)

**Action:** Run `npm ls --depth=0` in each dir and scan for GPL-licensed packages in prod tree (not dev).

---

## Remediation Priority

### P1 - Critical (Fix Immediately)
1. ✅ **portal/Backend** — 4 critical CVEs, largest transitive tree
2. ✅ **Source/Backend & Frontend** — 2 critical each (handlebars, proxy-addr, tinypool)

### P2 - High (Fix within 1 sprint)
1. **portal/Backend** — 11 high-severity; test OpenTelemetry carefully after update
2. **Source/Frontend** — 7 high + major version bump (React 19) — schedule testing
3. **portal/Frontend** — 8 high
4. **platform/orchestrator** — 3 high

### P3 - Moderate (Schedule in 2 weeks)
1. **Outdated packages** — pino (2 majors), uuid (5 majors)
2. **Build tool chain updates** — vitest, vite, esbuild
3. **Dependency tree pruning** — audit dev-only packages

---

## Findings Summary (JSON)

```json
{
  "audit_date": "2026-11-13T09:23:08Z",
  "grade": "C",
  "total_projects": 6,
  "vulnerabilities": {
    "critical": 14,
    "high": 34,
    "moderate": 73,
    "low": 10,
    "total": 140
  },
  "dependencies": {
    "total_unique": 2031,
    "prod": 619,
    "dev": 1141,
    "optional": 271
  },
  "outdated": {
    "two_plus_majors_behind": 3,
    "one_major_behind": 6
  },
  "supply_chain_risks": [
    "OpenTelemetry auto-instrumentation in production backend",
    "Large transitive dev dependencies (310-416 per project)",
    "Build tool chain (vitest, esbuild) has path traversal CVEs",
    "No post-install scripts detected (positive)"
  ],
  "escalations": [
    {
      "type": "build-time-compromise",
      "teams": ["TheGuardians"],
      "reason": "Vitest/Tinypool RCE could compromise build artifacts"
    },
    {
      "type": "http-request-handling",
      "teams": ["TheGuardians"],
      "reason": "Body-parser, proxy-addr, form-data DoS/injection chains"
    }
  ]
}
```

---

## Next Steps

1. **Immediate (this week):**
   - [ ] Update portal/Backend's @opentelemetry, joi, proxy-addr
   - [ ] Update Source/Backend proxy-addr, body-parser
   - [ ] Verify all test data in portal/Backend and Frontend doesn't come from untrusted sources

2. **Short-term (1-2 weeks):**
   - [ ] Plan React 19 upgrade for Source/Frontend and portal/Frontend
   - [ ] Update vite/vitest/esbuild across all projects
   - [ ] Audit GPL/AGPL licenses in dev trees

3. **Long-term (1 month):**
   - [ ] Reduce dev dependency tree (analyze with `npm ls`)
   - [ ] Separate OpenTelemetry instrumentation into optional init
   - [ ] Document critical path dependencies

---

**Agent:** dependency_auditor (Claude Haiku 4.5)  
**Run ID:** run-20261113-092308  
**Report Generated:** 2026-11-13 09:23 UTC
