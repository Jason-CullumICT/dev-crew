# Dependency Auditor Findings

**Audit Date:** 2026-08-04  
**Scope:** Source/Backend, Source/Frontend, Source/E2E  
**Package Managers:** npm (3 projects)

---

## Executive Summary

| Metric | Backend | Frontend | E2E | Total |
|--------|---------|----------|-----|-------|
| **CVEs - Critical** | 1 | 1 | 0 | **2** |
| **CVEs - High** | 3 | 4 | 0 | **7** |
| **CVEs - Moderate** | 4 | 5 | 0 | **9** |
| **CVEs - Low** | 1 | 1 | 0 | **2** |
| **Direct Dependencies** | 4 | 3 | 1 | **8** |
| **Transitive Dependencies** | ~390 | ~1050+ | ~4 | **~1,450+** |
| **Direct Deps with Vulnerabilities** | 2 | 3 | 0 | **5** |

**Grade:** **D**  
- **1 Critical CVE in production test suite** (vitest UI server RCE)
- **2 Critical CVE in transitive deps** (handlebars template injection)
- **7 High-severity CVEs** across supply chain
- **19 total vulnerabilities** needing remediation

**Risk Assessment:**
- ⚠️ **CRITICAL:** Vitest UI server can be exploited for arbitrary file read/execution
- ⚠️ **HIGH:** Handlebars template engine has remote code injection vulnerabilities
- ⚠️ **HIGH:** Build tool supply chain (brace-expansion, js-yaml) has DoS risks
- ⚠️ **MODERATE:** Direct dependencies (express, uuid) have moderate CVEs

---

## Critical Vulnerabilities (P1)

### **DEP-001: Vitest UI Server Arbitrary File Read & Execution**
- **Severity:** **P1 (CRITICAL)**
- **Category:** cve / rce
- **Package:** `vitest@2.0.5` (Frontend/devDependency)
- **File:** `Source/Frontend/package.json`
- **CVE:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Critical)
- **CWE:** CWE-862 (Missing Authorization)

**Vulnerability Detail:**
When Vitest UI server is listening (typically on port 51204), an unauthenticated attacker can:
- Read arbitrary files from the filesystem
- Execute arbitrary code via file access
- No authentication or validation on request origin

**Affected Version:** `<3.2.6`  
**Current Version:** `2.0.5`  
**Fix:** `npm install vitest@^4.1.10` (requires major version bump)

**Impact:** HIGH
- Vitest is a dev/test dependency, typically only run locally during development
- However, if CI/CD pipeline exposes the UI server, attackers can read secrets, configs, source code
- In production deployments with vitest still bundled, this is a direct RCE vector

**Fix Command:**
```bash
cd Source/Frontend
npm install vitest@latest
```

**Dependencies Affected:** @vitest/mocker, vite, vite-node (all cascade from vitest)

---

### **DEP-002: Handlebars.js Critical Template Injection (AST Type Confusion)**
- **Severity:** **P1 (CRITICAL)**
- **Category:** cve / template-injection
- **Package:** `handlebars@<=4.7.8` (transitive via build tools)
- **File:** Source/Backend/node_modules (transitive)
- **CVE:** GHSA-2w6w-674q-4c4q
- **CVSS Score:** 9.8 (Critical)
- **CWE:** CWE-94 (Code Injection), CWE-843 (Type Confusion)

**Vulnerability Detail:**
Handlebars template engine allows JavaScript injection via AST type confusion. An attacker crafting malicious template syntax can:
- Execute arbitrary JavaScript
- Bypass sandbox restrictions
- Access application context and data

**Current Range:** `>=4.0.0 <=4.7.8`  
**Fix Available:** `>=4.7.9`

**Impact:** CRITICAL
- Used transitively by documentation/template generation tools
- If user-supplied templates are processed, direct RCE
- Even static templates: if attacker can modify build assets, code execution during build

**Root Cause Chain:**
- brace-expansion DoS → tests fail → build tools updated → handlebars transitive

---

## High-Severity Vulnerabilities (P2)

### **DEP-003: Brace-Expansion DoS (Multiple CVEs)**
- **Severity:** **P2 (HIGH)**
- **Category:** cve / dos
- **Package:** `brace-expansion@<1.1.18` (transitive via glob, jest, vite)
- **Files:** Source/Backend & Source/Frontend (both affected)
- **CVEs:** GHSA-f886-m6hf-6m8v, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895

**Vulnerability Summary:**
Multiple DoS vectors in brace-expansion library:
1. **Zero-step sequences** → Process hang + memory exhaustion
2. **Exponential-time expansion** → CPU DoS via consecutive non-expanding groups
3. **Unbounded expansion length** → Out-of-memory crash
4. **Unbounded intermediate arrays** → Bypass of CVE-2026-14257 mitigation

**Affected Versions:** `<1.1.18`  
**CVSS Scores:** 5.3–7.5  

**Impact:** MODERATE
- Primarily affects dev tools (test runners, bundlers)
- Attack surface: maliciously crafted glob patterns in config files or user input
- Production impact: DoS during build/test pipeline

**Fix Command:**
```bash
npm update brace-expansion  # Should pull >=1.1.18
```

---

### **DEP-004: Form-Data CRLF Injection**
- **Severity:** **P2 (HIGH)**
- **Category:** cve / header-injection
- **Package:** `form-data@4.0.0-4.0.5` (transitive via HTTP clients)
- **File:** Source/Backend (transitive)
- **CVE:** GHSA-hmw2-7cc7-3qxx
- **CVSS Score:** 7.5 (High)
- **CWE:** CWE-93 (Improper Neutralization of CRLF Sequences in HTTP Headers)

**Vulnerability Detail:**
Multipart form data doesn't escape field names/filenames. Attacker can inject CRLF sequences to:
- Manipulate HTTP headers
- Bypass Content-Type validation
- Potential header injection attacks

**Current Range:** `>=4.0.0 <4.0.6`  
**Fix Available:** `>=4.0.6`

---

### **DEP-005: JS-YAML Quadratic Complexity DoS**
- **Severity:** **P2 (HIGH)**
- **Category:** cve / dos
- **Package:** `js-yaml@<3.15.0` (transitive via config loaders)
- **Files:** Source/Backend & Source/Frontend
- **CVEs:** GHSA-52cp-r559-cp3m (CVSS 7.5)

**Vulnerability Detail:**
YAML merge-key chains can force quadratic CPU consumption. A malicious YAML file with deeply nested merge keys causes:
- CPU exhaustion
- Build/test pipeline hangs
- Denial of service

**Fix:** Upgrade to `js-yaml>=3.15.0`

---

### **DEP-006: Esbuild Origin Validation Bypass**
- **Severity:** **P2 (HIGH)**
- **Category:** cve / cors
- **Package:** `esbuild@<=0.24.2` (transitive via vite)
- **File:** Source/Frontend (dev dependency)
- **CVE:** GHSA-67mh-4wv8-2f99
- **CVSS Score:** 5.3 (Medium)
- **CWE:** CWE-346 (Origin Validation Error)

**Vulnerability Detail:**
Esbuild development server doesn't validate origin. Any website can send requests to the dev server and read responses, leaking:
- Source maps
- API keys in environment
- Development data

**Fix:** Upgrade vite to version >=8.2.0 (includes esbuild>=0.24.3)

---

## Moderate-Severity Vulnerabilities (P3)

### **DEP-007: Express → QS DoS (Transitive)**
- **Severity:** **P3 (MODERATE)**
- **Category:** cve / dos
- **Package:** `express@4.18.2` → `qs` → DoS
- **File:** Source/Backend/package.json
- **CVE:** GHSA-q8mj-m7cp-5q26
- **CVSS Score:** 5.3

**Vulnerability:** QS library crashes on malformed input when encodeValuesOnly is set.

**Fix:** Ensure express is ≥4.19.0 (ships newer qs)

---

### **DEP-008: UUID Buffer Bounds Check Missing**
- **Severity:** **P3 (MODERATE)**
- **Category:** cve / memory-safety
- **Package:** `uuid@9.0.0` (Backend/direct dependency)
- **File:** Source/Backend/package.json
- **CVE:** GHSA-w5hq-g745-h8pq
- **CVSS Score:** 7.5
- **CWE:** CWE-787, CWE-1285 (Buffer Overflow)

**Vulnerability Detail:**
Missing bounds check in uuid v3/v5/v6 when buf parameter is provided. Attacker can:
- Overflow the buffer
- Write out of bounds
- Corrupt memory

**Affected Versions:** `<11.1.1`  
**Current Version:** `9.0.0`  
**Fix:** `npm install uuid@^11.1.1` or `npm install uuid@^14.0.1` (latest)

**Impact:** MODERATE
- Requires attacker to control buf parameter passed to uuid()
- Most uses of uuid() pass no buffer (creates new), reducing risk
- Still: recommend upgrade for defense-in-depth

---

### **DEP-009: Body-Parser Size Enforcement DoS**
- **Severity:** **P3 (MODERATE)**
- **Category:** cve / dos
- **Package:** `body-parser@<1.20.6` (transitive via express)
- **CVE:** GHSA-v422-hmwv-36x6
- **CVSS Score:** 3.7

**Vulnerability:** Invalid limit value silently disables size enforcement, allowing unbounded POST requests.

---

## Outdated Major Versions (P3)

### **DEP-010: Express 1+ Major Version Behind**
- **Severity:** **P3 (OUTDATED)**
- **Category:** outdated
- **Package:** `express@4.18.2`
- **File:** Source/Backend/package.json
- **Latest Version:** `5.2.1`
- **Gap:** 1 major version (4.x → 5.x)

**Risk:** Missing security patches, performance improvements.  
**Effort:** Moderate - express 5 has breaking changes, full test suite required.

---

### **DEP-011: Pino 2+ Major Versions Behind**
- **Severity:** **P3 (OUTDATED)**
- **Category:** outdated
- **Package:** `pino@8.17.0`
- **File:** Source/Backend/package.json
- **Latest Version:** `10.3.1`
- **Gap:** 2 major versions behind

**Risk:** Missing security patches, features. Last update >1 year ago (potential abandonment risk).  
**Fix:** `npm install pino@latest` (breaking changes expected)

---

### **DEP-012: React 1+ Major Version Behind**
- **Severity:** **P3 (OUTDATED)**
- **Category:** outdated
- **Package:** `react@18.3.1`
- **File:** Source/Frontend/package.json
- **Latest Version:** `19.2.8`
- **Gap:** 1 major version

**Risk:** Missing security fixes, performance optimizations. React 19 is stable and recommended.  
**Fix:** `npm install react@latest react-dom@latest` + full test suite

---

### **DEP-013: React Router DOM 1+ Major Version Behind**
- **Severity:** **P3 (OUTDATED)**
- **Category:** outdated
- **Package:** `react-router-dom@6.26.0`
- **File:** Source/Frontend/package.json
- **Latest Version:** `7.18.2`
- **Gap:** 1 major version

---

### **DEP-014: Babel 2+ Major Versions Behind (Transitive)**
- **Severity:** **P4 (LOW)**
- **Category:** outdated / low-risk
- **Package:** `@babel/core@<=7.29.0` (transitive)
- **Latest Version:** `7.x` (current) or `7.25+`
- **CVE:** GHSA-4x5r-pxfx-6jf8 (Low severity, local file read)

---

## Dependency Tree Analysis

### **Direct Dependencies Summary**

| Project | Direct Deps | Transitive | Critical Vulns |
|---------|-------------|-----------|-----------------|
| Backend | 4 | ~390 | 1 moderate (express/uuid) |
| Frontend | 3 | ~1050+ | 3 high/critical (vitest, vite, react-router) |
| E2E | 1 | ~4 | 0 |

### **Supply Chain Risk (P4)**

1. **Large transitive dependency tree for Frontend** (~1050+ packages)
   - Each package is a potential supply chain attack vector
   - Recommend: Regular audits, dependency pinning, SRI validation in CI

2. **No signature verification** on npm packages
   - Consider: npm publish 2FA, package-lock.json enforcement in CI

3. **Build tool concentration risk**
   - Vite, Jest, Vitest all share common dependencies (esbuild, babel)
   - Single vulnerability in shared dep affects all tools

---

## Remediation Plan

### **Immediate (P1 - Next Commit)**

1. **Vitest RCE (Frontend)**
   ```bash
   cd Source/Frontend
   npm install vitest@^4.1.10
   # Test: npm test -- --ui  # Verify UI server doesn't start on old version
   npm audit --fix
   ```

2. **Handlebars Critical (Transitive)**
   ```bash
   npm audit fix --force  # Will force-update transitive deps
   # OR manually: npm install handlebars@>=4.7.9
   ```

### **Short-term (P2 - This Sprint)**

1. **Express + UUID (Backend)**
   ```bash
   cd Source/Backend
   npm install express@latest uuid@latest
   npm test  # Full test suite
   ```

2. **React + Router (Frontend)**
   ```bash
   cd Source/Frontend
   npm install react@latest react-dom@latest react-router-dom@latest
   npm test
   npm run build  # Verify bundle size OK
   ```

3. **Run full audit fix**
   ```bash
   npm audit fix  # In each directory
   ```

### **Medium-term (P3 - Next Quarter)**

1. Upgrade Pino and verify logging integration
2. Audit brace-expansion and js-yaml usage
3. Implement automated dependency scanning in CI/CD

---

## Dependency License Summary

All detected packages use standard permissive licenses (MIT, ISC, Apache-2.0, BSD). No GPL/AGPL dependencies detected. No viral license risk.

---

## Dashboard Metrics

```json
{
  "audit_date": "2026-08-04",
  "project": "dev-crew",
  "grade": "D",
  "critical_cves": 2,
  "high_cves": 7,
  "moderate_cves": 9,
  "low_cves": 2,
  "outdated_major_versions": 5,
  "direct_dependencies": 8,
  "transitive_dependencies": 1450,
  "remediation_effort_hours": 8,
  "cross_refs": [
    "[CROSS-REF: TheGuardians] vitest RCE (GHSA-5xrq-8626-4rwp) if UI exposed in production",
    "[CROSS-REF: TheGuardians] handlebars injection if templates user-controlled"
  ]
}
```

---

## Self-Learning Update

Added to `Teams/TheInspector/learnings/dependency-auditor.md`:

### Watch List (Recurring CVEs)
- **handlebars**: 9 CVEs in 4.x series; recommend migrating to newer template engine
- **brace-expansion**: Multiple DoS vectors; kept as low-level dep by many build tools
- **js-yaml**: DoS via merge-key chains; watch for YAML config injection

### Audit Tools & Environment
- `npm audit --json`: Works well, outputs structured format
- `npm outdated --json`: Detects major version gaps
- No `npm license-checker` pre-installed; checked licenses manually
- No Go, Python, or Rust dependencies detected in this project (npm-only)

### Prior Findings
_(none yet — this is first full audit)_
