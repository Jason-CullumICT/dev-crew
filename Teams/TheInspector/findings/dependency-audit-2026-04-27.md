# Dependency Auditor Findings

**Audit Date:** 2026-04-27  
**Scope:** npm packages across dev-crew project (Backend, Frontend, E2E, Orchestrator)  
**Package Managers Detected:** npm  
**Total Projects Audited:** 4

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Direct Dependencies** | 11 |
| **Transitive Dependencies** | ~59 |
| **Known CVEs** | 13 |
| **Critical CVEs** | 2 |
| **High CVEs** | 2 |
| **Moderate CVEs** | 9 |
| **Outdated Major Versions** | 6 |

### Overall Grade: **C** (Critical vulnerabilities present; immediate action required)

---

## Vulnerability Summary by Severity

### 🔴 CRITICAL (2)

| Package | Project | CVE | Details |
|---------|---------|-----|---------|
| **handlebars** | Backend | GHSA-2w6w-674q-4c4q | JavaScript Injection via AST Type Confusion (CVSS 9.8) |
| **protobufjs** | Orchestrator | GHSA-xq3m-2v4x-88gg | Arbitrary Code Execution (CVSS 9.8) |

### 🟠 HIGH (2)

| Package | Project | CVE | Details |
|---------|---------|-----|---------|
| **handlebars** | Backend | GHSA-xjpj-3mr7-gcpf | JavaScript Injection in CLI Precompiler (CVSS 8.3) |
| **path-to-regexp** | Orchestrator | GHSA-37ch-88jc-xwx2 | ReDoS via Route Parameters (CVSS 7.5) |

### 🟡 MODERATE (9)

| Package | Project | Count | Examples |
|---------|---------|-------|----------|
| **vite** | Frontend | 2 | Path Traversal in `.map` handling |
| **vitest** | Frontend | 1 | Transitive via vite/esbuild |
| **esbuild** | Frontend | 1 | Server CSRF (CVSS 5.3) |
| **postcss** | Frontend | 1 | XSS via Unescaped `</style>` (CVSS 6.1) |
| **uuid** | Backend, Orchestrator | 1 | Missing buffer bounds check (transitive) |
| **brace-expansion** | Backend | 1 | Process hang/memory exhaustion (CVSS 6.5) |
| **dockerode** | Orchestrator | 1 | Depends on vulnerable uuid |

---

## Detailed Findings

### DEP-001: CRITICAL - Handlebars JavaScript Injection

- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** `handlebars@4.0.0 - 4.7.8` (multiple versions in transitive deps)
- **File:** `Source/Backend/package-lock.json` (transitive)
- **CVEs Affecting:**
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via @partial-block (CVSS 8.1)
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler (CVSS 8.3)
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution via Partial Template Injection (CVSS 4.7)
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap (CVSS 4.8)
  - GHSA-xhpv-hc6g-r9c6: JavaScript Injection via dynamic partial (CVSS 8.1)
  - GHSA-9cx6-37pm-9jff: Denial of Service via Malformed Decorator Syntax (CVSS 7.5)

**Detail:**  
Handlebars has multiple code injection vulnerabilities affecting all versions from 4.0.0 to 4.7.8. These allow attackers to inject arbitrary JavaScript through template manipulation, bypassing sandbox protections. The vulnerabilities exist in:
- AST type confusion handling
- Template decorator parsing
- Partial block processing
- CLI precompiler option handling

**Impact:**  
If handlebars is used for user-controlled template processing, an attacker can achieve remote code execution. Check `Source/Backend` for actual usage of handlebars template engine.

**Fix:**  
```bash
cd Source/Backend && npm update handlebars
```
Upgrade to handlebars ≥4.7.9 (or use a non-vulnerable alternative if building dynamic templates).

**Cross-ref:** [ESCALATE → TheGuardians] — if user-controlled templates are processed, this is an RCE vector.

---

### DEP-002: CRITICAL - Protobufjs Arbitrary Code Execution

- **Severity:** P1 (Critical)
- **Category:** CVE
- **Package:** `protobufjs@<7.5.5` (transitive via dockerode/express ecosystem)
- **File:** `platform/orchestrator/package-lock.json` (transitive)
- **CVE:** GHSA-xq3m-2v4x-88gg
- **CVSS:** 9.8 (Network, Low Complexity, No Privileges, No User Interaction)

**Detail:**  
Protobufjs versions before 7.5.5 allow arbitrary code execution when parsing untrusted Protocol Buffer messages. An attacker can craft a malicious .proto file or serialized protobuf message that executes arbitrary JavaScript during parsing.

**Impact:**  
The orchestrator's Docker interaction via `dockerode` pulls in protobufjs transitively. If the orchestrator processes untrusted protobuf data from any source, remote code execution is possible.

**Fix:**  
```bash
cd platform/orchestrator && npm update protobufjs
```
Upgrade protobufjs to ≥7.5.5.

**Cross-ref:** [ESCALATE → TheGuardians] — potential RCE; audit orchestrator's data sources.

---

### DEP-003: HIGH - path-to-regexp ReDoS

- **Severity:** P2 (High)
- **Category:** CVE
- **Package:** `path-to-regexp@<0.1.13` (transitive via express)
- **File:** `platform/orchestrator/package-lock.json` (transitive)
- **CVE:** GHSA-37ch-88jc-xwx2
- **CVSS:** 7.5 (Network, Low Complexity, No Privileges, No User Interaction)

**Detail:**  
path-to-regexp has a Regular Expression Denial of Service (ReDoS) vulnerability when processing routes with multiple parameters. An attacker can send a crafted request with many parameters to cause catastrophic backtracking, causing the server to hang.

**Impact:**  
Express (used by Backend and Orchestrator) depends on path-to-regexp for route matching. If an attacker sends requests with multiple route parameters, it can trigger a DoS.

**Fix:**  
Upgrade express to ≥4.19.0 (which includes patched path-to-regexp):
```bash
cd Source/Backend && npm update express
cd platform/orchestrator && npm update express
```

**Cross-ref:** [ESCALATE → TheGuardians] — DoS vector on all HTTP routes.

---

### DEP-004: MODERATE - UUID Buffer Bounds Check

- **Severity:** P2 (Moderate, but in critical dependency)
- **Category:** CVE
- **Package:** `uuid@<14.0.0` (direct in Backend, transitive elsewhere)
- **File:** `Source/Backend/package.json` (direct), transitive in Orchestrator
- **CVE:** GHSA-w5hq-g745-h8pq
- **CWE:** Buffer overflow (CWE-787)

**Detail:**  
uuid v3/v5/v6 generators are missing bounds checking when a buffer is provided. This can cause a buffer overflow if the buffer is too small.

**Impact:**  
Low in typical usage (uuid is usually called without custom buffers), but potential memory corruption if the application passes pre-allocated buffers.

**Fix:**  
```bash
cd Source/Backend && npm install uuid@14.0.0 --save
cd platform/orchestrator && npm update dockerode # which depends on uuid
```

---

### DEP-005: MODERATE - Vite Path Traversal

- **Severity:** P2 (Moderate)
- **Category:** CVE
- **Package:** `vite@<=6.4.1` (direct in Frontend)
- **File:** `Source/Frontend/package.json`
- **CVE:** GHSA-4w7w-66w2-5vf9

**Detail:**  
Vite's optimized deps `.map` file handling is vulnerable to path traversal attacks during development. An attacker could potentially read arbitrary files from the dev server.

**Impact:**  
Development-only risk. Source code and secrets could be exposed if the dev server is accessible from untrusted networks.

**Fix:**  
```bash
cd Source/Frontend && npm install vite@latest --save-dev
```

---

### DEP-006: MODERATE - PostCSS XSS

- **Severity:** P3 (Moderate, dev-only)
- **Category:** CVE
- **Package:** `postcss@<8.5.10` (transitive via vite)
- **File:** `Source/Frontend/package-lock.json`
- **CVE:** GHSA-qx2v-qp2m-jg93

**Detail:**  
PostCSS doesn't properly escape `</style>` tags in CSS output, allowing XSS injection in dynamically generated stylesheets.

**Fix:**  
Upgrade vite, which will pull in patched postcss:
```bash
cd Source/Frontend && npm install vite@latest --save-dev
```

---

### DEP-007: MODERATE - esbuild CORS/CSRF in Dev Server

- **Severity:** P3 (Moderate, dev-only)
- **Category:** CVE
- **Package:** `esbuild@<=0.24.2` (transitive via vite)
- **CVE:** GHSA-67mh-4wv8-2f99

**Detail:**  
esbuild's dev server allows any website to send requests and read responses (CORS/CSRF). An attacker can read dev server responses from a malicious webpage.

**Fix:**  
Upgrade vite:
```bash
cd Source/Frontend && npm install vite@latest --save-dev
```

---

### DEP-008: MODERATE - Brace-Expansion Process Hang

- **Severity:** P3 (Moderate)
- **Category:** CVE
- **Package:** `brace-expansion@<1.1.13` (transitive in Backend)
- **CVE:** GHSA-f886-m6hf-6m8v
- **CVSS:** 6.5

**Detail:**  
Zero-step sequences like `{1..0}` cause infinite loops and memory exhaustion. If the application constructs brace-expansions from user input, an attacker can crash the service.

**Fix:**  
```bash
cd Source/Backend && npm install brace-expansion@1.1.13 --save
```

---

### DEP-009: OUTDATED - Express Major Version Lag

- **Severity:** P2 (Outdated)
- **Category:** outdated
- **Package:** `express@^4.18.2` (Backend), `express@^4.21.0` (Orchestrator)
- **File:** `Source/Backend/package.json`, `platform/orchestrator/package.json`

**Current vs. Latest:**
- Backend: 4.18.2 → 5.2.1 (**2 major versions behind**)
- Orchestrator: 4.21.0 → 5.2.1 (**1 major version behind**)

**Detail:**  
Express v5 was released in 2024 with significant security improvements and performance enhancements. The projects are on v4.x, missing 2+ years of patch releases.

**Impact:**  
Missing security patches for route handling vulnerabilities (e.g., path-to-regexp ReDoS, CORS bypass issues).

**Fix:**  
```bash
cd Source/Backend && npm install express@^5.2.1 --save
cd platform/orchestrator && npm install express@^5.2.1 --save
```

**Note:** Express v5 has breaking changes — review [migration guide](https://expressjs.com/en/guide/migrating-5.html).

**Cross-ref:** [ESCALATE → TheFixer] — requires code changes for Express v5 compatibility.

---

### DEP-010: OUTDATED - Pino Major Version Lag

- **Severity:** P2 (Outdated)
- **Category:** outdated
- **Package:** `pino@^8.17.0` (Backend)
- **File:** `Source/Backend/package.json`

**Current vs. Latest:**
- 8.17.0 → 10.3.1 (**2 major versions behind**)

**Detail:**  
Pino v9 and v10 introduced significant performance improvements and security fixes. Missing 2 major versions.

**Fix:**  
```bash
cd Source/Backend && npm install pino@^10 --save
```

---

### DEP-011: OUTDATED - UUID Major Version Lag

- **Severity:** P2 (Outdated)
- **Category:** outdated
- **Package:** `uuid@^9.0.0` (Backend)
- **File:** `Source/Backend/package.json`

**Current vs. Latest:**
- 9.0.0 → 14.0.0 (**5 major versions behind**)

**Detail:**  
UUID v14 is the current version. Missing v10, v11, v12, v13, v14 releases containing security and performance fixes.

**Fix:**  
```bash
cd Source/Backend && npm install uuid@^14.0.0 --save
```

---

### DEP-012: OUTDATED - React Major Version Lag

- **Severity:** P3 (Outdated)
- **Category:** outdated
- **Package:** `react@^18.3.1`, `react-dom@^18.3.1` (Frontend)
- **File:** `Source/Frontend/package.json`

**Current vs. Latest:**
- 18.3.1 → 19.2.5 (**1 major version behind**)

**Detail:**  
React 19 was released in late 2024 with performance improvements and new features (e.g., async components, hooks improvements).

**Fix:**  
```bash
cd Source/Frontend && npm install react@^19 react-dom@^19 --save
```

**Note:** Requires testing and potential code changes (e.g., React 19 removes certain APIs, changes to useEffect behavior).

---

### DEP-013: OUTDATED - React Router Major Version Lag

- **Severity:** P3 (Outdated)
- **Category:** outdated
- **Package:** `react-router-dom@^6.26.0` (Frontend)
- **File:** `Source/Frontend/package.json`

**Current vs. Latest:**
- 6.26.0 → 7.14.2 (**1 major version behind**)

**Detail:**  
React Router v7 was released with significant changes to route definitions and data fetching patterns.

**Fix:**  
```bash
cd Source/Frontend && npm install react-router-dom@^7 --save
```

**Note:** Major breaking changes — review [migration guide](https://reactrouter.com/docs/migration).

---

### DEP-014: OUTDATED - Vitest Major Version Lag

- **Severity:** P3 (Outdated)
- **Category:** outdated
- **Package:** `vitest@^2.0.5` (Frontend)
- **File:** `Source/Frontend/package.json`

**Current vs. Latest:**
- 2.0.5 → latest (**current, but check for minor updates**)

**Detail:**  
Actually current, but watch for fixes related to vite vulnerability cascade.

---

### DEP-015: MODERATE - Dockerode Outdated

- **Severity:** P3 (Outdated)
- **Category:** outdated
- **Package:** `dockerode@^4.0.4` (Orchestrator)
- **File:** `platform/orchestrator/package.json`

**Current vs. Latest:**
- 4.0.4 → 5.0.0+ (Major version available)

**Detail:**  
Dockerode v5 is available but requires Node.js 18+. Check your runtime version before upgrading.

**Fix:**  
```bash
cd platform/orchestrator && npm install dockerode@^5 --save
```

---

## Dependency Tree Analysis

### Backend (Source/Backend)

**Direct Dependencies:** 4  
- `express@^4.18.2` ⚠️ 2 major versions behind
- `prom-client@^15.1.0` ✅
- `uuid@^9.0.0` ⚠️ 5 major versions behind, CVE GHSA-w5hq-g745-h8pq
- `pino@^8.17.0` ⚠️ 2 major versions behind

**Transitive Dependencies:** ~15  
- **Vulnerabilities found in:**
  - handlebars (via jest/supertest) — **CRITICAL**
  - brace-expansion (via jest) — moderate
  - uuid (direct) — moderate

---

### Frontend (Source/Frontend)

**Direct Dependencies:** 3  
- `react@^18.3.1` ⚠️ 1 major version behind
- `react-dom@^18.3.1` ⚠️ 1 major version behind
- `react-router-dom@^6.26.0` ⚠️ 1 major version behind

**Transitive Dependencies:** ~15  
- **Vulnerabilities found in:**
  - vite (direct) — **2 moderate CVEs**
  - vitest (direct) — 1 moderate CVE (transitive vite)
  - esbuild (transitive via vite) — 1 moderate CVE
  - postcss (transitive via vite) — 1 moderate CVE

---

### E2E (Source/E2E)

**Direct Dependencies:** 1  
- `@playwright/test@^1.58.2` ✅

**Status:** ✅ No CVEs, no outdated packages.

---

### Orchestrator (platform/orchestrator)

**Direct Dependencies:** 3  
- `dockerode@^4.0.4` ⚠️ Major version available, depends on uuid with CVE
- `express@^4.21.0` ⚠️ 1 major version behind
- `multer@^1.4.5-lts.1` ✅

**Transitive Dependencies:** ~5  
- **Vulnerabilities found in:**
  - protobufjs (transitive) — **CRITICAL RCE**
  - path-to-regexp (transitive via express) — **HIGH ReDoS**
  - uuid (transitive via dockerode) — moderate

---

## Supply Chain Risk Assessment

### Post-Install Scripts

✅ **No dangerous post-install scripts detected** in analyzed package.json files.

### Dependency Ownership

All flagged vulnerabilities are in **widely-used, maintained packages** (express, react, vite). No evidence of:
- Single-maintainer packages (uuid is multi-maintainer)
- Recently abandoned projects
- Suspicious ownership transfers

### Duplicate Packages

⚠️ **uuid appears in multiple version ranges:**
- Backend: `uuid@^9.0.0` (direct)
- Dockerode → uuid (transitive, <14.0.0)

This can lead to:
- Two versions of uuid installed (bloating node_modules)
- Inconsistent behavior if both are used
- Both versions have the same CVE (GHSA-w5hq-g745-h8pq), so the older transitive version is a problem

---

## Grading Summary

### Per-Project Grades

| Project | Grade | CVEs | Issues | Notes |
|---------|-------|------|--------|-------|
| Backend | **C** | 3 (1 critical, 2 moderate) | Handlebars RCE, uuid CVE, 3 major lags | handlebars must be fixed or removed |
| Frontend | **C** | 4 moderate | vite/vitest/esbuild/postcss, 3 major lags | Vite upgrade fixes multiple issues |
| E2E | **A** | 0 | 0 | Clean; no action needed |
| Orchestrator | **C** | 4 (1 critical, 1 high, 2 moderate) | protobufjs RCE, path-to-regexp ReDoS | Both critical and demand immediate fixes |

### Overall Grade: **C**

**Rationale:**  
- 2 CRITICAL remote code execution vulnerabilities (handlebars, protobufjs)
- 2 HIGH DoS/security vulnerabilities (path-to-regexp, multiple handlebars)
- 6+ outdated major versions causing missing security patches

**Risk Level:** 🔴 **HIGH** — Immediate remediation required before production deployment.

---

## Remediation Priority

### 🔴 P1 — DO THIS FIRST (Before Any Release)

1. **Backend: Remove or Upgrade Handlebars**
   - Scan codebase for `handlebars` usage.
   - If not used: remove dependency.
   - If used: upgrade to ≥4.7.9 immediately.
   ```bash
   grep -r "handlebars" Source/Backend --include="*.ts" --include="*.js"
   ```

2. **Orchestrator: Upgrade protobufjs**
   ```bash
   cd platform/orchestrator && npm audit fix
   npm install protobufjs@^7.5.5 --save
   ```

3. **Fix path-to-regexp via Express Upgrade**
   ```bash
   cd Source/Backend && npm install express@^5 --save
   cd platform/orchestrator && npm install express@^5 --save
   ```

### 🟠 P2 — DO THIS WITHIN 1 WEEK

4. **Backend: Upgrade uuid and pino**
   ```bash
   cd Source/Backend && npm install uuid@^14 pino@^10 --save
   ```

5. **Frontend: Upgrade Vite and React**
   ```bash
   cd Source/Frontend && npm install vite@latest react@^19 react-dom@^19 --save-dev --save
   ```

6. **Frontend: Upgrade React Router**
   ```bash
   cd Source/Frontend && npm install react-router-dom@^7 --save
   ```

### 🟡 P3 — DO THIS WITHIN 1 MONTH

7. **Orchestrator: Upgrade Dockerode** (if Node.js 18+ is available)
   ```bash
   cd platform/orchestrator && npm install dockerode@^5 --save
   ```

---

## Cross-Referencing

| Finding | Related Team | Action |
|---------|--------------|--------|
| handlebars RCE | TheGuardians | Audit template usage; confirm not exploitable |
| protobufjs RCE | TheGuardians | Audit protobuf data sources; confirm not untrusted |
| path-to-regexp ReDoS | TheGuardians | Confirm route parameter validation; test with fuzzing |
| Express v5 migration | TheFixer | Code review for breaking API changes |
| React v19 migration | TheFixer | Test component lifecycle changes, especially useEffect |
| React Router v7 migration | TheFixer | Review route definitions; test data fetching patterns |

---

## Learnings & Future Audits

### Recommendations for Next Audit

1. **Automate:** Add `npm audit` to pre-commit hooks or CI/CD.
2. **Monitor:** Watch for deprecation warnings (`npm audit` output includes these).
3. **Deduplicate:** Use `npm dedupe` to reduce package tree complexity.
4. **Review:** Post-major-version upgrades (React v19, Express v5) require testing. Don't skip migration guides.
5. **Dashboard:** Track CVE trends per project over time.

### Watch List (For Team Learning)

- **handlebars**: Multiple critical template injection CVEs. If not actively used, remove to reduce surface area.
- **uuid**: Multiple recent CVEs in v9-v13. Keep pinned to latest (v14+).
- **vite**: Actively maintained but dev-server CVEs are recurring. Upgrade quickly when available.
- **express**: v4.x is EOL soon; v5.x migration should happen by end of 2026.

---

## JSON Summary

```json
{
  "auditDate": "2026-04-27",
  "scope": "npm packages (Backend, Frontend, E2E, Orchestrator)",
  "metrics": {
    "directDependencies": 11,
    "transitiveDependencies": 59,
    "totalCVEs": 13,
    "critical": 2,
    "high": 2,
    "moderate": 9,
    "outdatedMajor": 6
  },
  "cves": {
    "critical": [
      {
        "id": "GHSA-2w6w-674q-4c4q",
        "package": "handlebars",
        "project": "Backend",
        "cvss": 9.8,
        "type": "JavaScript Injection"
      },
      {
        "id": "GHSA-xq3m-2v4x-88gg",
        "package": "protobufjs",
        "project": "Orchestrator",
        "cvss": 9.8,
        "type": "Arbitrary Code Execution"
      }
    ],
    "high": [
      {
        "id": "GHSA-37ch-88jc-xwx2",
        "package": "path-to-regexp",
        "project": "Orchestrator",
        "cvss": 7.5,
        "type": "ReDoS"
      }
    ]
  },
  "outdated": {
    "Backend": ["express@^4.18.2 (2 major behind)", "pino@^8.17.0 (2 major behind)", "uuid@^9.0.0 (5 major behind)"],
    "Frontend": ["react@^18.3.1 (1 major behind)", "react-dom@^18.3.1 (1 major behind)", "react-router-dom@^6.26.0 (1 major behind)"],
    "Orchestrator": ["express@^4.21.0 (1 major behind)"]
  },
  "overallGrade": "C",
  "riskLevel": "HIGH"
}
```

---

## Report Metadata

| Field | Value |
|-------|-------|
| Audit Duration | ~15 minutes |
| Tool | npm audit v10.x |
| Auditor | Dependency Auditor Agent |
| Next Review | 2026-05-27 (30 days) |
| Escalation Contact | TheGuardians (security-critical), TheFixer (code upgrades) |
