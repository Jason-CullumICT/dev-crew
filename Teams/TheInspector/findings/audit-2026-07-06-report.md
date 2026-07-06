# Dependency Auditor Findings

## Executive Summary

**Audit Date:** 2026-07-06  
**Primary Packages Scanned:** Source/Backend, Source/Frontend, Source/E2E  
**Secondary Packages:** platform/orchestrator, portal/Backend, portal/Frontend, ABAC demos  

### Critical Findings Summary

| Package | Type | Critical | High | Moderate | Low | Total |
|---------|------|----------|------|----------|-----|-------|
| Backend | npm | 1 | 1 | 6 | 1 | 9 |
| Frontend | npm | 1 | 3 | 6 | 1 | 11 |
| E2E | npm | 0 | 0 | 0 | 0 | 0 |

---

## Detailed Findings

### Source/Backend: 9 Vulnerabilities (1 CRITICAL, 1 HIGH, 6 MODERATE, 1 LOW)

#### DEP-001: Handlebars.js JavaScript Injection - Multiple CVEs
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars
- **Current Version:** >=4.0.0 <=4.7.8
- **File:** Source/Backend/package-lock.json
- **Detail:** Handlebars.js has multiple CRITICAL and HIGH vulnerabilities affecting versions ≤4.7.8:
  - **GHSA-2w6w-674q-4c4q** (CRITICAL, CVSS 9.8): JavaScript Injection via AST Type Confusion
  - **GHSA-3mfm-83xf-c92r** (HIGH, CVSS 8.1): JavaScript Injection via AST Type Confusion by tampering @partial-block
  - **GHSA-xhpv-hc6g-r9c6** (HIGH, CVSS 8.1): JavaScript Injection when passing object as dynamic partial
  - **GHSA-9cx6-37pm-9jff** (HIGH, CVSS 7.5): DoS via Malformed Decorator Syntax
  - **GHSA-xjpj-3mr7-gcpf** (HIGH, CVSS 8.2): JavaScript Injection in CLI Precompiler
  - All vulnerabilities allow arbitrary code execution in template compilation pipeline
- **Fix:** Upgrade handlebars to ≥4.7.9 (or ≥5.0.0 if available)
  ```bash
  npm update handlebars
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — Code execution risk, exploitable if templates are user-controlled
- **Note:** This is a **transitive dependency**, likely pulled in by a build tool or logger. Identify which direct dependency brings it in.

#### DEP-002: form-data CRLF Injection
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data
- **Current Version:** 4.0.0-4.0.5
- **File:** Source/Backend/package-lock.json
- **CVE:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5)
- **Detail:** CRLF injection in form-data via unescaped multipart field names and filenames (CWE-93). Allows header injection in multipart requests.
- **Fix:**
  ```bash
  npm update form-data
  ```
- **Cross-ref:** [CROSS-REF: red-teamer] — Exploitable in file upload scenarios if form names aren't sanitized upstream

#### DEP-003: express < 4.21.1 via qs DoS
- **Severity:** P2 (MODERATE → DIRECT)
- **Category:** cve
- **Package:** express
- **Current Version:** 4.18.2
- **File:** Source/Backend/package.json
- **Detail:** Express 4.21.0-4.22.1 vulnerable via transitive qs dependency (query string DoS)
- **Fix:**
  ```bash
  npm update express
  ```
- **Note:** Current version appears unaffected by the specific qs range, but upgrade recommended for latest fixes.

#### DEP-004: brace-expansion Process Hang
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** brace-expansion
- **CVE:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Zero-step sequence causes process hang and memory exhaustion (CWE-400). Affects versions <1.1.13
- **Fix:**
  ```bash
  npm update brace-expansion
  ```

#### DEP-005: @babel/core Arbitrary File Read
- **Severity:** P4 (LOW)
- **Category:** cve
- **Package:** @babel/core
- **CVE:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
- **Detail:** Arbitrary File Read via sourceMappingURL Comment (CWE-22/200). Transitive, lower impact.
- **Fix:**
  ```bash
  npm update @babel/core
  ```

---

### Source/Frontend: 11 Vulnerabilities (1 CRITICAL, 3 HIGH, 6 MODERATE, 1 LOW)

#### DEP-006: Vitest UI Server RCE (CRITICAL)
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest
- **Current Version:** <3.2.6
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** When Vitest UI server is listening, arbitrary files can be read and executed (CWE-862). Full remote code execution.
- **Affected Range:** <3.2.6
- **Fix:**
  ```bash
  npm update vitest
  ```
- **Cross-ref:** [ESCALATE → TheGuardians] — RCE vulnerability. **MUST be patched before any test runs in dev/CI.**
- **Note:** This affects development builds; ensure CI/production use safe vitest versions.

#### DEP-007: Vite server.fs.deny Bypass (HIGH)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** vite
- **Current Version:** ≤6.4.2
- **File:** Source/Frontend/package-lock.json
- **CVE:** GHSA-fx2h-pf6j-xcff (CVSS unset, HIGH severity)
- **Detail:** `server.fs.deny` bypass on Windows alternate paths — allows reading files outside configured deny list
- **Fix:**
  ```bash
  npm update vite
  ```

#### DEP-008: WebSocket Memory Exhaustion (HIGH)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** ws
- **Current Version:** 8.0.0-8.20.x (for first vulnerability)
- **File:** Source/Frontend/package-lock.json
- **CVEs:** 
  - **GHSA-96hv-2xvq-fx4p** (CVSS 7.5): Memory exhaustion DoS from tiny fragments and data chunks (<8.21.0)
  - **GHSA-58qx-3vcg-4xpx** (CVSS 4.4): Uninitialized memory disclosure (8.0.0-8.20.1)
- **Fix:**
  ```bash
  npm update ws
  ```

#### DEP-009: form-data CRLF (same as DEP-002)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data
- **Current Version:** 4.0.0-4.0.5
- **Note:** Also present in Frontend dependencies
- **Fix:**
  ```bash
  npm update form-data
  ```

#### DEP-010: Vite Path Traversal in Deps (MODERATE)
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** vite
- **CVE:** GHSA-4w7w-66w2-5vf9
- **Detail:** Path Traversal in Optimized Deps `.map` Handling (CWE-22/200)
- **Fix:**
  ```bash
  npm update vite
  ```

#### DEP-011: react-router-dom Multiple CVEs (MODERATE)
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** react-router-dom
- **Current Version:** 6.26.0
- **Detail:** Check for known vulnerabilities in 6.x branch
- **Recommended:** Upgrade to 6.30.4+ (available)
- **Fix:**
  ```bash
  npm update react-router-dom
  ```

#### DEP-012: @vitest/mocker (CRITICAL dependency of vitest)
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** @vitest/mocker
- **Detail:** Transitive dependency of vitest; shared RCE vulnerability
- **Fix:** Will be resolved by updating vitest

#### DEP-013: postcss, esbuild, vite-node
- **Severity:** P3-P4 (MODERATE to LOW)
- **Category:** cve
- **Detail:** Various moderate/low vulnerabilities in build toolchain
- **Fix:**
  ```bash
  npm update postcss esbuild vite-node
  ```

---

### Source/E2E: 0 Vulnerabilities ✓
No known CVEs. Clean audit.

---

## Outdated Dependencies Analysis

### Backend Outdated Packages

| Package | Current | Latest | Wanted | Status |
|---------|---------|--------|--------|--------|
| express | 4.18.2 | 5.2.1 | 4.20.x+ | MAJOR upgrade available |
| pino | 8.17.0 | 10.3.1 | 8.20.x+ | MAJOR upgrade available |
| prom-client | 15.1.0 | 15.1.3 | 15.1.3 | PATCH upgrade available |
| uuid | 9.0.0 | 14.0.1 | 9.0.1+ | MAJOR upgrade available |

**Action:** The `^` pins allow minor/patch updates. Some packages have newer majors available (express 5.x, pino 10.x, uuid 14.x). Evaluate migration cost before upgrading majors.

### Frontend Outdated Packages

| Package | Current | Latest | Wanted | Status |
|---------|---------|--------|--------|--------|
| react | 18.3.1 | 19.2.7 | 18.3.1 | OK, major 19 available |
| react-dom | 18.3.1 | 19.2.7 | 18.3.1 | OK, major 19 available |
| react-router-dom | 6.26.0 | 7.18.1 | 6.30.4 | PATCH upgrade + MAJOR 7 available |

**Action:** React 19 is a major version; test compatibility before upgrading. Router 6.30.4 should be safe.

---

## Dependency Tree Analysis

| Metric | Backend | Frontend | E2E |
|--------|---------|----------|-----|
| Direct Dependencies | 13 | 13 | 0 |
| Transitive Dependencies | ~200 (est.) | ~300 (est.) | N/A |
| Largest Packages | jest, webpack, vite | vite, vitest, esbuild | N/A |
| Duplicate Major Versions | None detected | None detected | N/A |
| Supply Chain Risk Score | MODERATE | MODERATE-HIGH | N/A |

**Note:** Frontend has a larger transitive footprint due to build tools (vite, vitest, React ecosystem). Monitor for duplicate package versions in lockfiles.

---

## License Compliance Check

✓ **No GPL/AGPL violations detected**  
✓ **All direct dependencies have explicit SPDX licenses**  
✓ **No UNLICENSED packages in primary scope**

**Packages Reviewed:**
- Backend: MIT (express, uuid, pino, prom-client)
- Frontend: MIT (react, react-dom, react-router-dom, vite)
- DevDeps: MIT, Apache-2.0, ISC (typescript, jest, vitest)

---

## Supply Chain Risk Flags

### High-Risk Patterns Detected

1. **Vitest UI Server Exposure (DEV ONLY)**
   - Flag: ⚠️ UI server has RCE vulnerability in dev mode
   - Mitigation: Upgrade vitest, disable UI server in CI/production
   - Action: CRITICAL — patch immediately

2. **Build Tool Vulnerabilities**
   - Vite and vitest both have HIGH/CRITICAL vulns
   - Impact: Build pipeline integrity at risk
   - Mitigation: Upgrade both to latest stable

3. **Handlebars Transitive Dependency**
   - Flag: Identify which direct dependency pulls handlebars
   - Action: Check if handlebars is actually needed; consider removing
   
4. **Node Modules Size**
   - Frontend: ~500+ transitive (estimated)
   - Backend: ~200+ transitive (estimated)
   - Risk: Larger attack surface
   - Mitigation: Audit using `npm audit --audit-level=moderate` regularly

---

## Severity Breakdown

### P1 (CRITICAL) — Requires Immediate Action
- **DEP-001:** Handlebars RCE (multiple CVEs)
- **DEP-006:** Vitest UI Server RCE

### P2 (HIGH) — Address Within 1 Sprint
- **DEP-002:** form-data CRLF injection
- **DEP-007:** Vite path traversal
- **DEP-008:** WebSocket memory exhaustion
- **DEP-009:** form-data (Frontend duplicate)

### P3 (MODERATE) — Address Within 2 Sprints
- **DEP-004:** brace-expansion hang
- **DEP-010:** Vite deps map traversal
- **DEP-011:** react-router-dom outdated
- **DEP-012:** @vitest/mocker (with vitest)
- **DEP-013:** postcss, esbuild, vite-node

### P4 (LOW) — Monitor & Update on Release
- **DEP-005:** @babel/core file read

---

## Recommended Action Plan

### Phase 1 (IMMEDIATE)
```bash
# Frontend — Fix CRITICAL Vitest RCE
cd Source/Frontend
npm update vitest @vitest/mocker

# Backend — Identify & patch handlebars
npm update handlebars
# OR if not needed, remove dependency
npm uninstall handlebars  # (if safe)
```

### Phase 2 (This Sprint)
```bash
# Both — Fix HIGH form-data & vite issues
cd Source/Backend && npm update form-data express
cd Source/Frontend && npm update form-data vite ws
```

### Phase 3 (Next Sprint)
```bash
# Evaluate major version upgrades
cd Source/Backend && npm update  # controlled major upgrades for express, pino, uuid
cd Source/Frontend && npm update react-router-dom  # patch, then test react 19 compatibility
```

### Phase 4 (Ongoing)
```bash
# Set up recurring audits
npm audit --audit-level=moderate  # CI gate
npm outdated                       # Weekly review
```

---

## Cross-References

| Finding | Team | Action |
|---------|------|--------|
| DEP-001 (Handlebars RCE) | TheGuardians | Security impact assessment; check if templates are user-controlled |
| DEP-006 (Vitest RCE) | TheGuardians | Impact on CI/test infrastructure; ensure production is unaffected |
| DEP-002, DEP-009 (form-data CRLF) | red-teamer | File upload attack surface; test header injection mitigations |
| DEP-007, DEP-010 (Vite path traversal) | red-teamer | Dev server security; test access control |

---

## JSON Summary

```json
{
  "audit_date": "2026-07-06",
  "packages_scanned": {
    "primary": ["Source/Backend", "Source/Frontend", "Source/E2E"],
    "secondary": ["platform/orchestrator", "portal/Backend", "portal/Frontend"]
  },
  "vulnerabilities": {
    "total": 20,
    "critical": 2,
    "high": 4,
    "moderate": 12,
    "low": 2
  },
  "by_package": {
    "backend": { "critical": 1, "high": 1, "moderate": 6, "low": 1 },
    "frontend": { "critical": 1, "high": 3, "moderate": 6, "low": 1 },
    "e2e": { "critical": 0, "high": 0, "moderate": 0, "low": 0 }
  },
  "cves": {
    "critical": [
      "GHSA-2w6w-674q-4c4q (handlebars)",
      "GHSA-5xrq-8626-4rwp (vitest)"
    ],
    "high": [
      "GHSA-hmw2-7cc7-3qxx (form-data)",
      "GHSA-fx2h-pf6j-xcff (vite)",
      "GHSA-96hv-2xvq-fx4p (ws)",
      "GHSA-3mfm-83xf-c92r (handlebars)"
    ]
  },
  "licenses": {
    "compliant": true,
    "gpl_agpl_found": false,
    "unlicensed_count": 0
  },
  "recommendations": {
    "immediate": ["vitest", "handlebars"],
    "this_sprint": ["form-data", "vite", "ws"],
    "next_sprint": ["express", "pino", "uuid", "react-router-dom"]
  }
}
```

---

**Report Prepared By:** Dependency Auditor (Agent)  
**Next Review:** 2026-07-13 (weekly)  
**Escalation Points:** TheGuardians (RCE findings)
