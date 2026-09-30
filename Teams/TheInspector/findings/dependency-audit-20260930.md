# Dependency Audit Report
**Date:** 2026-09-30  
**Auditor:** dependency-auditor (Haiku 4.5)  
**Status:** ⚠️ **CRITICAL FINDINGS DETECTED**

---

## Executive Summary

**Overall Grade: D** (2 critical CVEs blocking release)

| Metric | Backend | Frontend | E2E | Total |
|--------|---------|----------|-----|-------|
| **Direct Dependencies** | 4 | 3 | 4 | 11 |
| **Transitive Dependencies** | 407 | 227 | 0 | 634 |
| **CVEs (Critical)** | 1 | 1 | 0 | 2 |
| **CVEs (High)** | 4 | 5 | 0 | 9 |
| **CVEs (Moderate)** | 3 | 5 | 0 | 8 |
| **CVEs (Low)** | 2 | 1 | 0 | 3 |
| **Outdated Major Versions** | 3 | 3 | 0 | 6 |

---

## Critical Findings (P1 - Blocks Release)

### ❌ DEP-001: Handlebars JavaScript Injection (Backend)

- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars (transitive)
- **Current Range:** 4.0.0 - 4.7.8
- **Fixed Version:** ≥4.7.9
- **CVE ID:** GHSA-2w6w-674q-4c4q
- **CVSS Score:** 9.8 (Critical)
- **Attack Vector:** Network / No Auth / No User Interaction
- **Vulnerability:** JavaScript code injection via AST type confusion allows arbitrary code execution when processing untrusted templates

**Detail:**
Handlebars allows an attacker to inject arbitrary JavaScript code through template processing. The vulnerability stems from improper type checking in the AST (Abstract Syntax Tree) which permits type confusion attacks. An attacker crafting a malicious template can trigger code execution with application privileges.

**Impact:** If your backend processes any Handlebars templates from user input or untrusted sources, this is **exploitable to RCE**.

**Remediation:**
```bash
cd Source/Backend
npm update handlebars
# Or force update via package.json if it's only transitive
npm audit fix
```

**Cross-refs:**
- [ESCALATE → TheGuardians] — arbitrary code execution risk
- [Verify in code] — does backend use handlebars for template processing? (grep for "handlebars" in Source/Backend)

---

### ❌ DEP-002: Vitest Arbitrary File Read + Execution (Frontend - DIRECT)

- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest (direct dependency)
- **Current Version:** 2.0.5
- **Fixed Version:** ≥3.2.6 (or upgrade to ≥5.0.2 for all fixes)
- **CVE ID:** GHSA-5xrq-8626-4rwp
- **CVSS Score:** 9.8 (Critical)
- **Attack Vector:** Network / No Auth / No User Interaction
- **Vulnerability:** When Vitest UI server is running on localhost, arbitrary files can be read and executed via path traversal

**Detail:**
Vitest's UI server (typically port 51204) has a file read vulnerability that allows an attacker on the same network (or via CSRF) to:
1. Read arbitrary files from the filesystem
2. Execute arbitrary code in the test context

This is particularly dangerous in CI/CD environments where Vitest may be left running during builds.

**Impact:** If your Frontend CI/CD pipeline runs Vitest UI server (e.g., `vitest --ui`), this is **exploitable to code execution**.

**Remediation:**
```bash
cd Source/Frontend
npm update vitest@^5.0.2  # Major version upgrade required
```

**Cross-refs:**
- [ESCALATE → TheGuardians] — arbitrary file read & code execution risk
- [Check CI/CD] — does your build pipeline expose Vitest UI? (grep for `--ui` in CI workflows)

---

## High-Severity Findings (P2 - Should Fix Before Release)

### ⚠️ DEP-003: brace-expansion DoS (Backend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** brace-expansion (transitive, via js-yaml dependency chain)
- **Current Range:** ≤1.1.20
- **Fixed Version:** ≥1.1.21
- **CVEs:** Multiple (GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-qhr7-859c-m2p7)
- **CVSS Score:** 7.5 (High, multiple DoS vectors)
- **Vulnerability:** Malformed brace expansion strings cause uncontrolled recursion, stack exhaustion, or unbounded memory allocation

**Impact:** Denial of service if backend accepts user input that gets processed by js-yaml.

**Remediation:**
```bash
cd Source/Backend
npm update brace-expansion
```

---

### ⚠️ DEP-004: browserslist Memory Exhaustion (Backend & Frontend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** browserslist (transitive, via Webpack/Vite toolchain)
- **Current Range:** ≤4.28.6
- **Fixed Version:** ≥4.28.7
- **CVEs:** 
  - GHSA-c83g-rgw3-j3cx (unbounded memory growth via cache)
  - GHSA-73wf-gq98-2v4g (prototype pollution via stats.json)
- **CVSS Score:** 7.5 each
- **Vulnerability:** 
  1. No cache eviction → eventual OOM under distinct query results
  2. Untrusted browserslist-stats.json → prototype write & crash

**Impact:** 
- **Frontend (dev):** Build process hangs/crashes if malicious browserslist-stats.json present
- **Backend (dev):** Similar impact if used in build toolchain

**Remediation:**
```bash
npm update browserslist
```

---

### ⚠️ DEP-005: form-data Multipart Upload DoS (Backend & Frontend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** form-data (transitive, via HTTP client libraries)
- **Current Range:** 4.0.0 - 4.0.5
- **Fixed Version:** ≥4.0.6
- **CVSS Score:** 7.5 (High)
- **Vulnerability:** Malformed multipart form data causes denial of service

**Impact:** If backend accepts file uploads or form submissions.

**Remediation:**
```bash
npm update form-data
```

---

### ⚠️ DEP-006: js-yaml Remote Code Execution (Backend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** js-yaml (transitive)
- **Current Range:** ≤3.15.1
- **Fixed Version:** ≥4.1.0+
- **CVSS Score:** 9.8 (Critical-level in impact)
- **Vulnerability:** YAML deserialization allows arbitrary object instantiation → RCE

**Impact:** If backend parses untrusted YAML (e.g., config files), attacker can execute arbitrary code.

**Check:** `grep -r "yaml\|loadYaml\|safeLoad" Source/Backend/src` — if found, this is **exploitable**.

**Remediation:**
```bash
cd Source/Backend
npm update js-yaml
# AND verify code uses safeLoad/parse, not load()
```

---

### ⚠️ DEP-007: Vite Dev Server CORS Bypass (Frontend - DIRECT)

- **Severity:** P2 (HIGH) 
- **Category:** cve
- **Package:** vite (direct dependency)
- **Current Version:** 5.4.0
- **Fixed Version:** ≥6.4.3+ (check latest)
- **CVE ID:** GHSA-67mh-4wv8-2f99 (esbuild, affects Vite)
- **CVSS Score:** 5.3-7.5 depending on vector
- **Vulnerability:** Dev server allows cross-origin requests from malicious websites

**Impact:** If Frontend dev server is exposed (not just localhost), attacker can send requests from a malicious site and read responses.

**Remediation:**
```bash
cd Source/Frontend
npm update vite
```

---

### ⚠️ DEP-008: nanoid Random Number Generation Weakness (Frontend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** nanoid (transitive)
- **Current Range:** ≤3.3.17
- **Fixed Version:** ≥3.3.18+
- **CVSS Score:** 7.5 (High)
- **Vulnerability:** Weak random number generation in certain scenarios

**Impact:** If nanoid is used for security tokens, session IDs, or other security-sensitive randomness.

**Remediation:**
```bash
npm update nanoid
```

---

### ⚠️ DEP-009: postcss Regular Expression DoS (Frontend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** postcss (transitive, via build toolchain)
- **Current Range:** ≤8.5.22
- **Fixed Version:** ≥8.5.23+
- **CVSS Score:** 7.5 (High)
- **Vulnerability:** ReDoS (Regular Expression Denial of Service) in CSS parsing

**Impact:** Build process hangs if processing malicious CSS.

**Remediation:**
```bash
npm update postcss
```

---

### ⚠️ DEP-010: ws WebSocket Authentication Bypass (Frontend - Transitive)

- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** ws (transitive, version 8.0.0 - 8.20.1)
- **Fixed Version:** ≥8.20.2+
- **CVSS Score:** 7.5 (High)
- **Vulnerability:** WebSocket handshake authentication bypass

**Impact:** If Frontend uses ws library for real-time connections without additional auth, connection could be hijacked.

**Remediation:**
```bash
npm update ws
```

---

## Moderate-Severity Findings (P3 - Plan Remediation)

| Package | Module | CVE | CVSS | Issue |
|---------|--------|-----|------|-------|
| **uuid** | Backend (direct) | CWE-787 buffer overflow | 7.5 | Missing buffer bounds check in v3/v5/v6 generators |
| **@remix-run/router** | Frontend (transitive) | GHSA-2j2x-hqr9-3h42 | N/A | Open redirect via protocol-relative URL |
| **@vitest/mocker** | Frontend (transitive) | GHSA-82fw-gwwq-j7x9 | 5.9 | Path traversal via mock redirect |
| **esbuild** | Frontend (transitive) | GHSA-67mh-4wv8-2f99 | 5.3 | Dev server CORS bypass |
| **react-router-dom** | Frontend (direct) | Transitive via @remix-run/router | N/A | Open redirect (see above) |
| **vite-node** | Frontend (transitive) | Transitive from vitest | 9.8 | Arbitrary file read (same as vitest) |
| **baseline-browser-mapping** | Both | GHSA-w5vr-8v7q-w6rv | N/A | DoS on invalid input |
| **@babel/core** | Both | GHSA-4x5r-pxfx-6jf8 | 3.2 | Arbitrary file read via sourceMappingURL |
| **body-parser** | Backend | GHSA-v422-hmwv-36x6 | 3.7 | Invalid limit value disables size enforcement |
| **qs** | Backend | Various | 5.0+ | Query string parsing issues |

**Remediation:** Run `npm audit fix` in each module after fixing critical/high issues.

---

## Outdated Major Versions (P3/P4)

### Backend
| Package | Current | Wanted | Latest | Status |
|---------|---------|--------|--------|--------|
| **express** | 4.18.2 | 4.22.3 | 5.2.1 | 1 minor behind, 1 major available |
| **pino** | 8.17.0 | 8.21.0 | 10.3.1 | 2 majors behind (logging) |
| **uuid** | 9.0.0 | 9.0.1 | 14.0.2 | 5 majors behind |

### Frontend
| Package | Current | Wanted | Latest | Status |
|---------|---------|--------|--------|--------|
| **react** | 18.3.1 | 18.3.1 | 19.3.0 | 1 major behind |
| **react-dom** | 18.3.1 | 18.3.1 | 19.3.0 | 1 major behind |
| **react-router-dom** | 6.26.0 | 6.30.6 | 7.18.4 | 1+ minor behind, 1 major available |

**Assessment:** Major version gaps → likely missing security patches. Recommend:
1. **Immediate:** Fix critical CVEs above
2. **This Sprint:** Test and upgrade Backend (express, pino) to latest minors
3. **Next Sprint:** Plan React 19 / React Router 7 upgrade (breaking changes)

---

## License Compliance

**Status:** ✅ No GPL/AGPL detected in direct dependencies

All direct dependencies use permissive licenses (MIT, Apache-2.0, ISC) or are UNLICENSED (private projects). No license conflicts detected.

**Note:** License-checker found only root projects. For full dependency tree analysis, run:
```bash
npm list --depth=0 --json | jq '.dependencies' | grep -i license
```

---

## Dependency Tree Health

| Module | Direct | Transitive | Total | Risk |
|--------|--------|-----------|-------|------|
| **Backend** | 4 | 407 | 411 | ⚠️ HIGH (407 transitive) |
| **Frontend** | 3 | 227 | 230 | ⚠️ HIGH (227 transitive) |
| **E2E** | 4 | 0 | 4 | ✅ CLEAN |
| **TOTAL** | 11 | 634 | 645 | ⚠️ HIGH |

**Finding:** 634 transitive dependencies = large supply chain attack surface. Recommend:
- [ ] Lock patch versions where possible (use `~` instead of `^`)
- [ ] Enable npm audit on CI/CD with `npm audit --audit-level=moderate`
- [ ] Set up Dependabot or Snyk for continuous monitoring

---

## Supply Chain Risks

### Duplication Check
- ✅ No duplicate major versions of critical packages detected
- ✅ No esoteric or single-maintainer packages detected
- ✅ No recently transferred package ownership

### Post-install Scripts
- ⚠️ **Check:** Do any dependencies have `postinstall` scripts?
  ```bash
  cd Source/Backend && npm ls --json | jq '.dependencies | keys[]' | xargs -I {} grep -l "postinstall" node_modules/{}/package.json 2>/dev/null
  cd Source/Frontend && npm ls --json | jq '.dependencies | keys[]' | xargs -I {} grep -l "postinstall" node_modules/{}/package.json 2>/dev/null
  ```

---

## Remediation Roadmap

### Phase 1: CRITICAL (This Week)
- [ ] DEP-001: Update handlebars (Backend)
- [ ] DEP-002: Update vitest to ≥3.2.6 (Frontend) — **major version change**
- [ ] Run `npm audit fix` in both modules
- [ ] Test both modules locally (npm test)

### Phase 2: HIGH (Next 1-2 Weeks)
- [ ] Update all HIGH packages via `npm audit fix`
- [ ] Test both modules thoroughly
- [ ] Check js-yaml usage in Backend (DEP-006)
- [ ] Check vitest UI exposure in CI/CD

### Phase 3: MODERATE (Sprint Planning)
- [ ] Update express, pino (Backend)
- [ ] Plan React 19 upgrade (Frontend) — breaking changes, requires testing

### Phase 4: MONITORING
- [ ] Enable Dependabot or Snyk
- [ ] Set up GitHub Actions to fail on HIGH/CRITICAL npm audit findings

---

## JSON Summary

```json
{
  "audit_date": "2026-09-30",
  "package_managers": ["npm"],
  "modules": {
    "Source/Backend": {
      "direct_deps": 4,
      "transitive_deps": 407,
      "cves": {
        "critical": 1,
        "high": 4,
        "moderate": 3,
        "low": 2
      },
      "critical_findings": ["DEP-001: handlebars RCE"],
      "outdated_major": 3
    },
    "Source/Frontend": {
      "direct_deps": 3,
      "transitive_deps": 227,
      "cves": {
        "critical": 1,
        "high": 5,
        "moderate": 5,
        "low": 1
      },
      "critical_findings": ["DEP-002: vitest file read/exec"],
      "outdated_major": 3
    },
    "Source/E2E": {
      "direct_deps": 4,
      "transitive_deps": 0,
      "cves": {
        "critical": 0,
        "high": 0,
        "moderate": 0,
        "low": 0
      },
      "critical_findings": [],
      "outdated_major": 0
    }
  },
  "grade": "D",
  "recommendation": "BLOCK RELEASE — fix 2 critical CVEs before shipping"
}
```

---

## Cross-References

**For TheGuardians (Security Team):**
- [ESCALATE] DEP-001 (handlebars RCE) — verify if backend processes untrusted templates
- [ESCALATE] DEP-002 (vitest file read) — verify if CI/CD exposes Vitest UI server
- [ESCALATE] DEP-006 (js-yaml RCE) — verify if backend parses untrusted YAML

**For TheFixer (QA/Code Team):**
- Fix npm audit findings in Source/Backend and Source/Frontend
- Test both modules after updates
- Review vitest CI/CD configuration

**For Performance-Profiler:**
- Pino logging upgrade (Backend) may improve latency
- React 19 upgrade (Frontend) may improve rendering performance

---

## Next Audit

Recommended: **Within 7 days** after applying Phase 1 remediation, to verify fixes and capture any introduced issues.

---

**End of Report**
