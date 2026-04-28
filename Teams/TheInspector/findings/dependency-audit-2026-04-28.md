# Dependency Audit Report
**Date:** 2026-04-28  
**Specialist:** dependency_auditor  
**Run ID:** (pending pipeline assignment)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Projects Audited** | 6 (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend) |
| **Total Critical CVEs** | 2 |
| **Total High CVEs** | 3 |
| **Total Moderate CVEs** | 12+ |
| **Outdated Major Versions** | 5 |
| **Overall Grade** | **D** — Multiple critical vulnerabilities in direct and transitive dependencies |

---

## 🚨 Critical Vulnerabilities (P1)

### DEP-001: Handlebars.js JavaScript Injection (AST Type Confusion)
- **Severity:** P1 (Critical)
- **Category:** CVE — Remote Code Execution
- **Affected Projects:** Source/Backend
- **Package:** handlebars@4.0.0-4.7.8
- **Files:** 
  - `Source/Backend/package-lock.json` (411 transitive dependencies)
  - `platform/orchestrator/package-lock.json` (via google-api-client)
  - `portal/Backend/package-lock.json` (via google-api-client)
- **CVE Details:**
  - **GHSA-2w6w-674q-4c4q** — JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - **GHSA-3mfm-83xf-c92r** — JavaScript Injection via @partial-block tampering (CVSS 8.1)
  - **GHSA-xjpj-3mr7-gcpf** — JavaScript Injection in CLI Precompiler (CVSS 8.3)
  - **GHSA-2qvq-rjwj-gvw9** — Prototype Pollution Leading to XSS (CVSS 4.7)
  - **GHSA-7rx3-28cr-v5wh** — Prototype Method Access Control Gap (CVSS 4.8)
  - **GHSA-442j-39wm-28r2** — Property Access Validation Bypass (CVSS 3.7)

**Root Cause:** Transitive dependency via email/PDF generation libraries. Handlebars is used for template compilation and is vulnerable to arbitrary code execution through AST manipulation.

**Impact:** If handlebars processes untrusted template input (e.g., user-provided work item templates, email templates), an attacker can inject arbitrary JavaScript that executes in the Node.js process with full application privileges.

**Fix:** 
```bash
cd Source/Backend && npm update handlebars@>=4.7.9
cd platform/orchestrator && npm update  # Major version bump on dependent
cd portal/Backend && npm update  # Major version bump on dependent
```

**[CROSS-REF: red-teamer]** — Handlebars injection exploitable if user-controlled templates flow through Backend email/PDF pipelines.

---

### DEP-002: protobufjs — Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** CVE — Remote Code Execution
- **Affected Projects:** platform/orchestrator, portal/Backend
- **Package:** protobufjs@<7.5.5
- **Files:**
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`
- **CVE Details:**
  - **GHSA-xq3m-2v4x-88gg** — Arbitrary code execution via `.proto` parsing (CVSS 9.8)
  - Entry point: `protobufjs.load()` with untrusted `.proto` files

**Root Cause:** Transitive dependency via gRPC/Google Cloud client libraries. Protobufjs has an arbitrary code execution vulnerability in its `.proto` file parser.

**Impact:** If the orchestrator or portal backend loads `.proto` files from untrusted sources, or if an attacker can control the `.proto` file path, they can execute arbitrary JavaScript in the Node.js process.

**Fix:**
```bash
cd platform/orchestrator && npm update protobufjs@>=7.5.5
cd portal/Backend && npm update protobufjs@>=7.5.5
```

---

## 🔴 High-Severity CVEs (P2)

### DEP-003: path-to-regexp — Regular Expression Denial of Service (ReDoS)
- **Severity:** P2 (High)
- **Category:** CVE — Denial of Service
- **Affected Projects:** platform/orchestrator, portal/Backend
- **Package:** path-to-regexp@<0.1.13
- **Files:**
  - `platform/orchestrator/package-lock.json`
  - `portal/Backend/package-lock.json`
- **CVE Details:**
  - **GHSA-37ch-88jc-xwx2** — ReDoS via multiple route parameters (CVSS 7.5)
  - CWE-1333: Inefficient Regular Expression Complexity

**Root Cause:** Transitive dependency via Express routing. The regex engine can be exploited by crafting URLs with many path parameters.

**Impact:** An attacker can craft a malicious URL with many path parameters to cause regex evaluation to take exponential time, consuming CPU and causing a denial of service.

**Fix:**
```bash
cd platform/orchestrator && npm update path-to-regexp@>=0.1.13
cd portal/Backend && npm update path-to-regexp@>=0.1.13
```

**[CROSS-REF: red-teamer]** — ReDoS exploitable on `/api/work-items/:id` and similar routes if path-to-regexp is vulnerable.

---

### DEP-004: picomatch — ReDoS via Extglob Quantifiers (Portal Frontend)
- **Severity:** P2 (High) — affects build tools, not runtime
- **Category:** CVE — Regular Expression Denial of Service
- **Affected Projects:** portal/Frontend
- **Package:** picomatch@<=2.3.1 or 4.0.0-4.0.3
- **Files:** `portal/Frontend/package-lock.json`
- **CVE Details:**
  - **GHSA-c2c7-rcm5-vvqj** — ReDoS via extglob quantifiers (CVSS 7.5)
  - **GHSA-3v7f-55p6-f55p** — Method Injection in POSIX Character Classes (CVSS 5.3)

**Root Cause:** Transitive dependency via file watching/glob patterns in build system (chokidar/micromatch chain).

**Impact:** During development (`npm run dev`), a malicious or crafted file pattern could cause the build system to hang. In CI/CD, this could be exploited to cause timeouts.

**Fix:**
```bash
cd portal/Frontend && npm update picomatch@>=2.3.2 @4.0.4
```

---

## 🟠 Moderate CVEs (P3)

### DEP-005: Vite — Path Traversal in Optimized Deps
- **Severity:** P3 (Moderate)
- **Affected Projects:** Source/Frontend, portal/Frontend
- **Package:** vite@<5.2.0
- **CVE:** GHSA-4w7w-66w2-5vf9
- **Fix:** `npm update vite@>=5.2.0`

### DEP-006: esbuild — CORS-like Vulnerability in Dev Server
- **Severity:** P3 (Moderate) — dev environment only
- **Affected Projects:** Source/Frontend, portal/Backend, portal/Frontend
- **Package:** esbuild@<=0.24.2
- **CVE:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** Any website can make requests to dev server and read responses
- **Fix:** `npm update vite@>=5.3.0` or `esbuild@>=0.24.3`

### DEP-007: PostCSS — XSS via Unescaped </style>
- **Severity:** P3 (Moderate)
- **Affected Projects:** Source/Frontend, portal/Frontend
- **Package:** postcss@<8.5.10
- **CVE:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** Unescaped `</style>` in CSS stringify output can inject XSS
- **Fix:** `npm update postcss@>=8.5.10`

### DEP-008: brace-expansion — Process Hang & Memory Exhaustion
- **Severity:** P3 (Moderate)
- **Affected Projects:** Source/Backend
- **Package:** brace-expansion@<1.1.13
- **CVE:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Zero-step sequences cause process hang
- **Fix:** `npm update brace-expansion@>=1.1.13`

### DEP-009: uuid — Missing Buffer Bounds Check
- **Severity:** P3 (Moderate)
- **Affected Projects:** Source/Backend, platform/orchestrator, portal/Backend
- **Package:** uuid@<14.0.0
- **CVE:** GHSA-w5hq-g745-h8pq (CVSS 0 — disputed)
- **Detail:** Missing bounds check in v3/v5/v6 when `buf` provided
- **Fix:** `npm update uuid@>=14.0.0`

### DEP-010: dockerode — Moderate Issues (Transitive via uuid)
- **Severity:** P3 (Moderate)
- **Affected Projects:** platform/orchestrator
- **Package:** dockerode@4.0.3-4.0.12
- **Detail:** Vulnerability in transitive uuid dependency
- **Fix:** `npm update dockerode@>=5.0.0` (major version bump)

### DEP-011: @vitest/mocker — Transitive vite Dependency
- **Severity:** P3 (Moderate) — test environment
- **Affected Projects:** Source/Frontend
- **Detail:** Dependency issue with vitest/vite chain
- **Fix:** `npm update vitest@>=4.1.5`

### DEP-012: gaxios — Transitive uuid Dependency
- **Severity:** P3 (Moderate)
- **Affected Projects:** portal/Backend
- **Detail:** Inherited uuid vulnerability
- **Fix:** `npm update gaxios@latest`

---

## 📦 Outdated Major Versions (P3)

| Project | Package | Current | Latest | Major Versions Behind |
|---------|---------|---------|--------|----------------------|
| Source/Backend | express | 4.18.2 | 5.2.1 | 1 |
| Source/Backend | pino | 8.17.0 | 10.3.1 | 2 |
| Source/Backend | uuid | 9.0.0 | 14.0.0 | 5 |
| Source/Frontend | react | 18.3.1 | 19.2.5 | 1 |
| Source/Frontend | react-dom | 18.3.1 | 19.2.5 | 1 |
| Source/Frontend | react-router-dom | 6.26.0 | 7.14.2 | 1 |

**Assessment:** 
- **express@4 → 5**: Major breaking changes. API v5 requires code review. Current version (4.18.2) is stable; upgrade is optional but recommended for security.
- **pino@8 → 10**: Logging library. 2 major versions behind. May have logging format/performance improvements.
- **uuid@9 → 14**: 5 major versions behind due to buffer bounds check fixes.
- **React@18 → 19**: Compatible but should upgrade for performance improvements and new features.
- **react-router-dom@6 → 7**: Major routing changes. Recommend planning a separate upgrade task.

---

## 🏢 Dependency Tree Analysis

### Project Size Summary

| Project | Direct Deps | Transitive (est.) | Lock File Size |
|---------|------------|-------------------|-----------------|
| Source/Backend | 4 | 102 | 5,353 lines |
| Source/Frontend | 3 | ~200 | (queued) |
| Source/E2E | 4 | ~40 | (queued) |
| platform/orchestrator | 3 | ~80 | (queued) |
| portal/Backend | 10 | ~300 | (queued) |
| portal/Frontend | 5 | ~400 | (queued) |

**Supply Chain Risk:** 
- **Source/Backend:** 102 production dependencies is reasonable for an Express + Pino + UUID microservice
- **portal/Backend:** 300 transitive dependencies with OpenTelemetry, Google Cloud clients, SQLite — high but expected for telemetry stack
- **portal/Frontend:** ~400 transitive dependencies (Vite + React + testing libraries) — typical for modern SPA

---

## 📋 Dependency Ownership & License Compliance

### Direct Dependencies Check
- ✅ express@4.x — MIT (permissive)
- ✅ pino@8.x — MIT (permissive)
- ✅ uuid@9.x — MIT (permissive)
- ✅ react@18.x — MIT (permissive)
- ✅ react-router-dom@6.x — MIT (permissive)
- ✅ vite@5.x — MIT (permissive)
- ⚠️ better-sqlite3@12.x — MIT (compiled native module — requires build toolchain)
- ✅ @opentelemetry/* — Apache 2.0 (permissive)

**License Risk:** No GPL/AGPL dependencies detected. All direct dependencies use permissive licenses.

---

## 🔍 Abandoned Dependencies Check

**No abandoned dependencies detected.** All flagged packages are actively maintained:
- handlebars — Latest 4.7.9+ (weekly updates)
- protobufjs — Latest 7.5.5+ (active maintenance)
- path-to-regexp — Latest 0.1.13+ (active)
- picomatch — Latest 2.3.2 and 4.0.4+ (active)

---

## Remediation Plan

### Phase 1: Critical (T0 — Immediate)
1. **Source/Backend:** Update handlebars to 4.7.9+
2. **platform/orchestrator:** Update protobufjs to 7.5.5+ and path-to-regexp to 0.1.13+
3. **portal/Backend:** Update protobufjs and path-to-regexp

**Estimated effort:** 1-2 hours per project (testing included)  
**Risk:** Low (patch versions)

### Phase 2: High Priority (This sprint)
1. **portal/Frontend:** Update picomatch to 2.3.2+
2. **Source/Frontend:** Update vite to 5.2.0+
3. All projects: Update esbuild/vite chain

**Estimated effort:** 2-3 hours  
**Risk:** Low to moderate (some transitive updates may affect build)

### Phase 3: Medium Priority (Next sprint)
1. **All projects:** Upgrade uuid@14 (5 major versions behind)
2. **platform/orchestrator:** Upgrade dockerode@5.0.0+ (major bump)
3. **Source/Frontend:** Upgrade React to 19.x (test thoroughly)

**Estimated effort:** 4-5 hours  
**Risk:** Moderate (requires testing, especially React upgrade)

### Phase 4: Future Planning
- **Source/Backend:** Plan express@5 upgrade (requires code review for API changes)
- **Source/Backend:** Plan pino@10 upgrade (logging format review)
- **Source/Frontend:** Plan react-router-dom@7 upgrade (routing API changes)

---

## Cross-References & Escalations

| Specialist | Finding | Action |
|-----------|---------|--------|
| **red-teamer** | Handlebars injection (DEP-001) | Assess if user-controlled templates flow through email/PDF pipelines |
| **red-teamer** | path-to-regexp ReDoS (DEP-003) | Test `/api/work-items/:id*` route for ReDoS exploitation |
| **performance-profiler** | uuid@14 upgrade (DEP-009) | Check if newer uuid versions have performance impact on work item creation |
| **TheGuardians** | All critical CVEs | High-priority security review of orchestrator and portal infrastructure |

---

## Dashboard Metrics

```json
{
  "audit_date": "2026-04-28",
  "projects_audited": 6,
  "cves": {
    "critical": 2,
    "high": 3,
    "moderate": 12,
    "low": 0,
    "total": 17
  },
  "cve_details": {
    "critical": [
      "handlebars@4.0.0-4.7.8 (GHSA-2w6w-674q-4c4q)",
      "protobufjs@<7.5.5 (GHSA-xq3m-2v4x-88gg)"
    ],
    "high": [
      "path-to-regexp@<0.1.13 (GHSA-37ch-88jc-xwx2)",
      "picomatch@<=2.3.1 (GHSA-c2c7-rcm5-vvqj)"
    ]
  },
  "outdated_major_versions": 5,
  "projects_at_risk": [
    "Source/Backend (handlebars, brace-expansion)",
    "platform/orchestrator (protobufjs, path-to-regexp)",
    "portal/Backend (protobufjs, path-to-regexp)",
    "portal/Frontend (picomatch)"
  ],
  "license_compliance": "PASS",
  "grade": "D"
}
```

---

## Next Steps

1. **Approve remediation plan** — Prioritize Phase 1 & 2
2. **Assign to backend-coder & frontend-coder** — via TheFixer team
3. **Red-teamer review** — Assess exploitability of critical CVEs in this application
4. **Re-audit after updates** — Verify all CVEs resolved

---

**Generated by:** dependency_auditor  
**Status:** Ready for team review and remediation assignment
