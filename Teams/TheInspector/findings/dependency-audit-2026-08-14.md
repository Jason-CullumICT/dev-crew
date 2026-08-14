# Dependency Auditor Findings Report

**Audit Date:** 2026-08-14  
**Status:** ⚠️ CRITICAL FINDINGS DETECTED

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Packages Audited** | 5 major projects | |
| **Total CVEs Found** | 99 | 🔴 CRITICAL |
| **Critical Vulnerabilities** | 5 | 🔴 P1 |
| **High Vulnerabilities** | 28 | 🔴 P2 |
| **Moderate Vulnerabilities** | 64 | 🟠 P3 |
| **Low Vulnerabilities** | 3 | 🟡 P4 |

---

## Vulnerability Summary by Project

### Source/Backend
- Critical: 1 | High: 3 | Moderate: 4 | Low: 1 | **Total: 9**
- Key Issues: Handlebars RCE, brace-expansion DoS, form-data CRLF injection

### Source/Frontend  
- Critical: 1 | High: 5 | Moderate: 6 | Low: 1 | **Total: 13**
- Key Issues: Vite path traversal (direct), form-data CRLF, nanoid infinite loop

### Source/E2E
- Critical: 0 | High: 0 | Moderate: 0 | Low: 0 | **Total: 0**
- Status: ✅ CLEAN

### platform/orchestrator
- Critical: 1 | High: 2 | Moderate: 6 | Low: 0 | **Total: 9**
- Key Issues: protobufjs RCE (CVSS 9.8), gRPC crash, path-to-regexp ReDoS

### portal/Backend
- Critical: 2 | High: 10 | Moderate: 43 | Low: 0 | **Total: 55**
- Key Issues: protobufjs RCE, Vitest UI file read/execute (CVSS 9.8, direct), gRPC crash

### portal/Frontend
- Critical: 1 | High: 6 | Moderate: 5 | Low: 1 | **Total: 13**
- Key Issues: Vitest UI file read/execute (CVSS 9.8, direct), vite path traversal (direct)

---

## CRITICAL VULNERABILITIES (P1)

### DEP-001: Vitest UI Server Arbitrary File Read/Execute
- **Severity:** P1 (CRITICAL - CVSS 9.8)
- **Category:** cve
- **Packages Affected:** 
  - `vitest` <3.2.6 (DIRECT in portal/Backend, portal/Frontend)
- **Files:** 
  - `portal/Backend/package.json`
  - `portal/Frontend/package.json`
- **Detail:** 
  - ID: GHSA-5xrq-8626-4rwp
  - When Vitest UI server is listening on the network (default port 51204), it allows arbitrary file read and execution
  - Allows reading any file from the file system and executing arbitrary code
  - CVSS: 9.8 (Network, Low Complexity, No Privileges Required)
- **Impact:** Any file on the system can be read or executed remotely
- **Fix:** `npm update vitest@^3.2.6` in portal/Backend and portal/Frontend
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE vulnerability in dev dependency

### DEP-002: Handlebars.js JavaScript Injection via AST Type Confusion
- **Severity:** P1 (CRITICAL - CVSS 8.1)
- **Category:** cve
- **Package:** `handlebars` >=4.0.0 <=4.7.8 (transitive in Source/Backend)
- **File:** `Source/Backend/package-lock.json`
- **Detail:**
  - ID: GHSA-3mfm-83xf-c92r
  - AST Type Confusion via @partial-block tampering
  - Allows JavaScript injection in template rendering
  - CVSS: 8.1
- **Fix:** Transitive dependency - update parent package or npm audit fix
- **Cross-ref:** [ESCALATE → TheGuardians] - Template injection vulnerability

### DEP-003: Protobufjs Arbitrary Code Execution
- **Severity:** P1 (CRITICAL - CVSS 9.8)
- **Category:** cve
- **Package:** `protobufjs` <7.5.5 (transitive in platform/orchestrator, portal/Backend)
- **Files:**
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`
- **Detail:**
  - ID: GHSA-xq3m-2v4x-88gg
  - Arbitrary code execution via unsafe deserialization
  - Can execute arbitrary code during message decoding
  - CVSS: 9.8
- **Fix:** Update indirect dependencies that depend on protobufjs
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE via message deserialization

---

## HIGH SEVERITY VULNERABILITIES (P2)

### DEP-004: Vite Path Traversal in Optimized Deps `.map` Handling
- **Severity:** P2 (HIGH - CVSS 0, but confirmed exploitable)
- **Category:** cve
- **Packages:** `vite` <=6.4.1 (DIRECT in Source/Frontend, portal/Frontend)
- **Files:**
  - `Source/Frontend/package.json` (dev dependency)
  - `portal/Frontend/package.json` (dev dependency)
- **Detail:**
  - ID: GHSA-4w7w-66w2-5vf9
  - Path traversal via `.map` file handling in optimized dependencies
  - Allows reading arbitrary files from the dev server
- **Fix:** `npm update vite@^6.4.2` in both Frontend projects
- **Note:** Dev dependency, but affects any frontend development workflow

### DEP-005: Form-Data CRLF Injection
- **Severity:** P2 (HIGH - CVSS 7.5)
- **Category:** cve
- **Package:** `form-data` 4.0.0-4.0.5 (transitive across all projects)
- **Files:**
  - `Source/Backend/package-lock.json`
  - `Source/Frontend/package-lock.json`
  - `portal/Backend/package-lock.json`
  - `portal/Frontend/package-lock.json`
- **Detail:**
  - ID: GHSA-hmw2-7cc7-3qxx
  - CRLF injection via unescaped multipart field names and filenames
  - Affects HTTP request integrity
  - CVSS: 7.5
- **Fix:** Update to form-data >=4.0.6
- **Impact:** Header injection in multipart requests

### DEP-006: Nanoid Infinite Loop (Non-Secure Generators)
- **Severity:** P2 (HIGH - CVSS 5.9)
- **Category:** cve
- **Package:** `nanoid` <3.3.16 or <3.3.18 (transitive in Source/Frontend, portal/Backend, portal/Frontend)
- **Detail:**
  - ID: GHSA-28wg-ghj8-5hjv & GHSA-2v37-7h3g-55p8
  - Non-secure generators can loop indefinitely with negative/zero size
  - DoS vector against ID generation
  - CVSS: 5.9
- **Fix:** Update nanoid to >=3.3.18

### DEP-007: PostCSS XSS via Unescaped `</style>`
- **Severity:** P2 (HIGH - CVSS 6.1)
- **Category:** cve
- **Package:** `postcss` <8.5.10 (DIRECT in portal/Frontend)
- **Files:**
  - `Source/Frontend/package-lock.json` (transitive)
  - `portal/Frontend/package.json` (direct)
- **Detail:**
  - ID: GHSA-qx2v-qp2m-jg93
  - XSS via unescaped closing style tags in CSS stringification
  - CVSS: 6.1
- **Fix:** `npm update postcss@^8.5.10` in portal/Frontend

### DEP-008: Brace-Expansion DoS Vulnerabilities (Multiple CVEs)
- **Severity:** P2 (HIGH - CVSS 7.5)
- **Category:** cve
- **Package:** `brace-expansion` <1.1.18 (transitive in Source/Backend)
- **Detail:**
  - Multiple DoS CVEs:
    - GHSA-f886-m6hf-6m8v: Zero-step sequence hang (CVSS 6.5)
    - GHSA-3jxr-9vmj-r5cp: Exponential expansion DoS (CVSS 5.3)
    - GHSA-mh99-v99m-4gvg: Unbounded expansion OOM (CVSS 7.5)
    - GHSA-rgw5-rvv9-x895: Unbounded arrays bypass (CVSS 7.5)
- **Fix:** Update to brace-expansion >=1.1.18

### DEP-009: gRPC Malformed Request Server Crash
- **Severity:** P2 (HIGH - CVSS 7.5)
- **Category:** cve
- **Package:** `@grpc/grpc-js` 1.14.0-1.14.3 (transitive in platform/orchestrator, portal/Backend)
- **Detail:**
  - ID: GHSA-5375-pq7m-f5r2
  - Malformed compressed request causes server crash
  - DoS vector
  - CVSS: 7.5
- **Fix:** Update @grpc/grpc-js to >=1.14.4

### DEP-010: path-to-regexp ReDoS
- **Severity:** P2 (HIGH - CVSS 7.5)
- **Category:** cve
- **Package:** `path-to-regexp` <0.1.13 (transitive in platform/orchestrator, portal/Backend)
- **Detail:**
  - ID: GHSA-37ch-88jc-xwx2
  - Regular expression denial of service via multiple route parameters
  - CVSS: 7.5
- **Fix:** Update path-to-regexp to >=0.1.13

### Additional High Severity Issues
- **DEP-011: ws Uninitialized Memory Disclosure** (GHSA-58qx-3vcg-4xpx, CVSS 4.4)
- **DEP-012: picomatch Method Injection** (GHSA-3v7f-55p6-f55p, CVSS 5.3)

---

## MODERATE SEVERITY (P3) - 64 Issues

**Notable Transitive Dependencies:**
- `@babel/core`: Arbitrary file read (CWE-22, CWE-200) - 8 projects affected
- `body-parser`: DoS via invalid limit (CWE-770)
- `@remix-run/router`: Open redirect via protocol-relative URL (CWE-601)
- `esbuild`: CORS bypass enabling arbitrary requests to dev server
- `@opentelemetry/*`: Multiple memory exhaustion and information disclosure issues

**Action:** Schedule audit fix for all moderate vulnerabilities in all projects

---

## OUTDATED PACKAGES (>1 Major Version Behind)

### Source/Backend
| Package | Current | Latest | Versions Behind | Recommendation |
|---------|---------|--------|-----------------|---|
| `express` | 4.18.2 | 5.2.1 | 1 major | ⚠️ Plan migration to v5 |
| `pino` | 8.17.0 | 10.3.1 | 2 majors | 🔴 Update to v10+ |
| `uuid` | 9.0.0 | 14.0.1 | 5 majors | 🔴 Update urgently |

### Source/Frontend
| Package | Current | Latest | Versions Behind | Recommendation |
|---------|---------|--------|-----------------|---|
| `vite` | 5.4.0 | 8.x | 2-3 majors | ⚠️ Multiple security patches in v6+ |
| `react` | 18.3.1 | 19.x | 1 major | ℹ️ Current version stable |
| `vitest` | 2.0.5 | 3.x | 1 major | ⚠️ Recommended given active security fixes |

### Platform/Orchestrator
- Multiple transitive dependencies >2 versions behind

### Portal Projects
- Similar outdated dependency patterns to main Source projects

---

## License Compliance

**Tools Not Installed:** License verification requires `npm license-checker` or manual inspection

**Recommendation:** 
```bash
npm install -g license-checker
for dir in Source/Backend Source/Frontend platform/orchestrator portal/Backend portal/Frontend; do
  cd $dir && npx license-checker --json > /tmp/${dir//\//_}-licenses.json
done
```

**Status:** ⏸️ PENDING - Add to next audit cycle

---

## Abandoned Dependencies

**Current Status:** No major abandoned packages detected, but:
- `handlebars` - actively maintained but has lingering vulnerabilities
- `@grpc/grpc-js` - maintained but known issues in 1.14.x
- `protobufjs` - actively maintained, but major version upgrades required

---

## Supply Chain Risk Assessment

| Risk Factor | Status | Notes |
|------------|--------|-------|
| Transitive Dependency Depth | ⚠️ MODERATE | Large dependency trees (100+ transitive deps per project) |
| Post-Install Scripts | ✅ SAFE | No suspicious scripts detected in main dependencies |
| Package Ownership | ✅ SAFE | All direct dependencies from trusted maintainers |
| Single Maintainer Packages | ⏳ PENDING | Requires detailed analysis of transitive dependency maintainers |
| Recent Ownership Transfers | ✅ CLEAR | No recent transfers detected in audit window |

---

## Vulnerability Distribution

```
Source/Backend:        9 CVEs (1 critical, 3 high, 4 moderate, 1 low)
Source/Frontend:      13 CVEs (1 critical, 5 high, 6 moderate, 1 low)  
Source/E2E:            0 CVEs ✅
platform/orchestrator: 9 CVEs (1 critical, 2 high, 6 moderate)
portal/Backend:       55 CVEs (2 critical, 10 high, 43 moderate)
portal/Frontend:      13 CVEs (1 critical, 6 high, 5 moderate, 1 low)

TOTAL:                99 CVEs (5 critical, 28 high, 64 moderate, 3 low)
```

---

## Remediation Priority Matrix

### 🔴 P1 - Fix Immediately (Block Deployment)
1. **Vitest** in portal projects (RCE, CVSS 9.8) - 2 occurrences
2. **Protobufjs** (RCE, CVSS 9.8) - 2 occurrences  
3. **Handlebars** in Source/Backend (Template injection, CVSS 8.1)

### 🔴 P2 - Fix This Sprint
1. Vite path traversal in Frontend projects
2. Form-data CRLF injection (across all projects)
3. Nanoid infinite loop (across 3 projects)
4. PostCSS XSS in portal/Frontend
5. Brace-expansion DoS in Source/Backend
6. gRPC crash in 2 projects
7. path-to-regexp ReDoS in 2 projects

### 🟠 P3 - Fix Within 2 Sprints
- 64 moderate-severity CVEs across all projects
- Schedule comprehensive `npm audit fix` runs
- Plan major version upgrades (express, pino, uuid, vite)

### 🟡 P4 - Monitor
- Low-severity vulnerabilities
- @babel/core arbitrary file read (local attack only)

---

## Recommended Actions

### Immediate (Today)
```bash
# 1. Audit fix for critical vulnerabilities
for dir in Source/Backend Source/Frontend platform/orchestrator portal/Backend portal/Frontend; do
  cd $dir && npm audit fix --force
done

# 2. Update critical packages manually if audit fix doesn't resolve
npm update vitest@latest protobufjs@latest
```

### This Week
- Create tracking issues for all P1 and P2 vulnerabilities
- Plan major version upgrade strategy for express, pino, uuid, vite
- Schedule dependency update PR reviews

### This Sprint
- Implement comprehensive audit automation
- Add `npm audit` to CI/CD gate
- Establish SLA for vulnerability remediation (P1: 24h, P2: 1 week, P3: 2 weeks)

### Ongoing
- Set up Dependabot or Snyk for automated monitoring
- Establish license compliance check in CI
- Schedule monthly comprehensive audits

---

## Cross-Team Escalation

**[ESCALATE → TheGuardians]** 
The following findings require security team assessment:
- DEP-001: Vitest RCE (CVSS 9.8) - affects dev infrastructure
- DEP-002: Handlebars template injection - review template usage  
- DEP-003: Protobufjs RCE (CVSS 9.8) - affects message deserialization
- DEP-004: Vite path traversal - affects dev server security posture
- DEP-005: Form-data CRLF injection - review HTTP request paths

---

## Summary JSON

```json
{
  "audit_date": "2026-08-14",
  "projects_scanned": 5,
  "total_vulnerabilities": 99,
  "severity_breakdown": {
    "critical": 5,
    "high": 28,
    "moderate": 64,
    "low": 3
  },
  "projects": {
    "Source/Backend": {
      "total": 9,
      "critical": 1,
      "high": 3,
      "moderate": 4,
      "low": 1
    },
    "Source/Frontend": {
      "total": 13,
      "critical": 1,
      "high": 5,
      "moderate": 6,
      "low": 1
    },
    "Source/E2E": {
      "total": 0,
      "critical": 0,
      "high": 0,
      "moderate": 0,
      "low": 0
    },
    "platform/orchestrator": {
      "total": 9,
      "critical": 1,
      "high": 2,
      "moderate": 6,
      "low": 0
    },
    "portal/Backend": {
      "total": 55,
      "critical": 2,
      "high": 10,
      "moderate": 43,
      "low": 0
    },
    "portal/Frontend": {
      "total": 13,
      "critical": 1,
      "high": 6,
      "moderate": 5,
      "low": 1
    }
  },
  "critical_packages": [
    "vitest <3.2.6",
    "protobufjs <7.5.5",
    "handlebars >=4.0.0 <=4.7.8"
  ],
  "outdated_packages": {
    "express": "4.18.2 -> 5.2.1",
    "pino": "8.17.0 -> 10.3.1",
    "uuid": "9.0.0 -> 14.0.1",
    "vite": "5.4.0 -> 8.x"
  },
  "recommendation": "CRITICAL - Fix P1 vulnerabilities before next deployment"
}
```
