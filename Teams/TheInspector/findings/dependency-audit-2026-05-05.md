# Dependency Audit Report
**Generated:** 2026-05-05  
**Agent:** Dependency Auditor  
**Status:** ⚠️ P1 Issues Detected

---

## Executive Summary

**Grade: C** – Two critical vulnerabilities in production code paths require immediate remediation.

| Metric | Value |
|--------|-------|
| **Projects Audited** | 6 (dev-crew core) |
| **Direct Dependencies** | 40 packages |
| **Transitive Dependencies** | 1,807 packages |
| **Total CVEs Found** | 28 |
| **CRITICAL** | 2 |
| **HIGH** | 4 |
| **MODERATE** | 18 |
| **LOW/INFO** | 4 |

---

## Vulnerability Summary by Project

### ✅ **Source/E2E** — CLEAN
- **Status:** No vulnerabilities
- **Direct Deps:** 1 (@playwright/test)
- **Transitive Deps:** 5
- **Note:** E2E tests only; lower risk profile

### ⚠️ **Source/Backend** — 1 CRITICAL
- **Status:** 3 total vulnerabilities
- **Critical:** 1 (handlebars)
- **Moderate:** 2 (brace-expansion)
- **Direct Deps:** 5
- **Transitive Deps:** 412

#### DEP-001: Handlebars.js JavaScript Injection (CRITICAL)
- **Severity:** P1
- **Category:** CVE (CWE-94, CWE-843)
- **Package:** `handlebars` (4.0.0 - 4.7.8)
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r (CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1)
- **Details:** Multiple JavaScript injection vulnerabilities via AST type confusion. Attacker can execute arbitrary code through template tampering.
- **Impact:** RCE (Remote Code Execution) via malicious template inputs
- **Root Cause:** `handlebars` is a transitive dependency (via jest/other test tooling)
- **Fix:** 
  - Upgrade jest, ts-jest, and test dependencies to latest versions (they should no longer require handlebars)
  - `npm update jest ts-jest @types/jest`
  - Verify handlebars is no longer in node_modules
- **Cross-ref:** [ESCALATE → TheGuardians] — Exploitable if untrusted templates are compiled

---

### ⚠️ **Source/Frontend** — 6 MODERATE
- **Status:** All moderate; no critical/high
- **Direct Deps:** 8
- **Transitive Deps:** 231

#### DEP-002: Vite Path Traversal (MODERATE)
- **Severity:** P3
- **Category:** CVE (CWE-22)
- **Package:** `vite` (^5.4.0)
- **CVE:** GHSA-4w7w-66w2-5vf9
- **Details:** Path traversal in optimized deps `.map` handling. Affects development servers only.
- **Fix:** `npm update vite` (upgrade to 5.4.1+)
- **Impact:** Dev-time only; no production risk

#### DEP-003: PostCSS XSS (MODERATE)
- **Severity:** P3
- **Category:** CVE (CWE-79)
- **Package:** `postcss` (<8.5.10)
- **CVE:** GHSA-qx2v-qp2m-jg93
- **Details:** Unescaped `</style>` in CSS stringify output can lead to XSS
- **Fix:** `npm update postcss` (upgrade to 8.5.10+)

#### DEP-004: esbuild CORS Bypass (MODERATE)
- **Severity:** P3
- **Category:** CVE (CWE-346)
- **Package:** `esbuild` (<=0.24.2)
- **CVE:** GHSA-67mh-4wv8-2f99
- **Details:** Development server allows cross-origin requests to bypass CORS
- **Fix:** `npm update vite` (which bundles esbuild; upgrade to 5.4.1+)

#### DEP-005: brace-expansion DoS (MODERATE)
- **Severity:** P3
- **Category:** CVE (CWE-400)
- **Package:** `brace-expansion` (<1.1.13)
- **CVE:** GHSA-f886-m6hf-6m8v
- **Details:** Zero-step sequences cause infinite loops and memory exhaustion
- **Fix:** `npm update` (should be transitive via jest/ts-jest)
- **Note:** Unlikely to be exploited in practice

---

### ⚠️ **platform/orchestrator** — 1 CRITICAL + 1 HIGH
- **Status:** 4 total vulnerabilities
- **Critical:** 1 (protobufjs)
- **High:** 1 (path-to-regexp)
- **Direct Deps:** 3 (dockerode, express, multer)
- **Transitive Deps:** 156

#### DEP-006: protobufjs Arbitrary Code Execution (CRITICAL)
- **Severity:** P1
- **Category:** CVE (CWE-94)
- **Package:** `protobufjs` (<7.5.5)
- **CVE:** GHSA-xq3m-2v4x-88gg (CVSS 9.8)
- **Details:** RCE via malformed protobuf messages. Attacker can execute arbitrary code.
- **Root Cause:** `protobufjs` is a transitive dependency (via OpenTelemetry tracing libraries)
- **Impact:** RCE if orchestrator processes untrusted protobuf messages
- **Fix:**
  - Upgrade OpenTelemetry packages to latest versions:
    - `npm update @opentelemetry/exporter-trace-otlp-http @opentelemetry/sdk-node`
  - Or use `npm audit fix --force` as last resort
- **Cross-ref:** [ESCALATE → TheGuardians] — **P1: RCE in orchestrator infrastructure**

#### DEP-007: path-to-regexp ReDoS (HIGH)
- **Severity:** P2
- **Category:** CVE (CWE-1333 — ReDoS)
- **Package:** `path-to-regexp` (<0.1.13)
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Details:** Regular expression denial of service via multiple route parameters. Attacker sends crafted URLs to hang the server.
- **Impact:** DoS (Denial of Service) on routing
- **Fix:** 
  - `npm update express` (should pull in patched path-to-regexp)
  - Verify: `npm ls path-to-regexp` shows version >= 0.1.13
- **Cross-ref:** [CROSS-REF: red-teamer] — Exploitable DoS vector

#### DEP-008: dockerode Transitive UUID (MODERATE)
- **Severity:** P3
- **Category:** CVE (CWE-787, CWE-1285)
- **Package:** `dockerode` (4.0.3–4.0.12)
- **CVE:** GHSA-w5hq-g745-h8pq
- **Details:** UUID buffer bounds check missing; can cause out-of-bounds write
- **Fix:** `npm update dockerode` (upgrade to 4.0.13+ or 5.0.0+)

---

### ⚠️ **portal/Backend** — 1 CRITICAL + 1 HIGH
- **Status:** 9 total vulnerabilities
- **Critical:** 1 (protobufjs — same as orchestrator)
- **High:** 1 (path-to-regexp — same as orchestrator)
- **Direct Deps:** 10
- **Transitive Deps:** 578 (largest dependency tree)

#### DEP-006 (repeated): protobufjs RCE
- Same as platform/orchestrator above
- Also via OpenTelemetry: `@opentelemetry/auto-instrumentations-node`
- **Action:** Apply same fix

#### DEP-007 (repeated): path-to-regexp ReDoS
- Same as platform/orchestrator above
- Via express transitive

#### DEP-009: gaxios UUID (MODERATE)
- **Severity:** P3
- **Category:** CVE (transitive via uuid)
- **Package:** `gaxios` (6.4.0–6.7.1)
- **Fix:** `npm update gaxios`

#### DEP-010: uuid Buffer Check (MODERATE)
- **Severity:** P3
- **Category:** CVE (CWE-787)
- **Package:** `uuid` (<14.0.0)
- **CVE:** GHSA-w5hq-g745-h8pq
- **Details:** Missing buffer bounds check in v3/v5/v6
- **Fix:** `npm update uuid` (upgrade to 14.0.0+)

---

### ⚠️ **portal/Frontend** — 1 HIGH
- **Status:** 6 total vulnerabilities
- **Critical:** 0
- **High:** 1 (picomatch)
- **Direct Deps:** 13
- **Transitive Deps:** 425

#### DEP-011: picomatch ReDoS (HIGH)
- **Severity:** P2
- **Category:** CVE (CWE-1333 — ReDoS)
- **Package:** `picomatch` (<2.3.2 or >=4.0.0 <4.0.4)
- **CVE IDs:**
  - GHSA-c2c7-rcm5-vvqj (CVSS 7.5) — ReDoS via extglob quantifiers
  - GHSA-3v7f-55p6-f55p (CVSS 5.3) — Method injection
- **Impact:** Glob matching DoS (UI build time, if globbing untrusted patterns)
- **Fix:** `npm update picomatch` (upgrade to 2.3.2+ or 4.0.4+)

#### DEP-012: esbuild CORS (MODERATE, same as Frontend)
- **Severity:** P3
- **Category:** CVE (CWE-346)
- **Fix:** `npm update vite`

#### DEP-013: PostCSS XSS (MODERATE, same as Frontend)
- **Severity:** P3
- **Category:** CVE (CWE-79)
- **Fix:** `npm update postcss`

---

## Outdated Packages Analysis

No packages are >1 major version behind current. All dependencies are within 1–2 patch versions of latest.

**Summary:**
- ✅ Source/Backend: 4 outdated (minor versions)
- ✅ Source/Frontend: 3 outdated (minor versions)
- ✅ platform/orchestrator: 0 outdated
- ✅ portal/Backend: 11 outdated (minor versions)
- ✅ portal/Frontend: 3 outdated (minor versions)

**Assessment:** Outdated status is P4 (informational). All outdated packages have patch-level updates available; no abandoned or multi-version-behind packages detected.

---

## License Compliance

| Project | Issue |
|---------|-------|
| All | ✅ No GPL/AGPL dependencies detected |
| All | ✅ No unlicensed packages detected |

**Assessment:** P0 — No license compliance risk.

---

## Abandoned Dependencies

| Package | Last Update | Status |
|---------|-------------|--------|
| All core deps | Active (2024–2026) | ✅ Maintained |
| @playwright/test | 2026-04 | ✅ Active |
| uuid | 2024-10 | ✅ Active |
| pino | 2025-12 | ✅ Active |
| express | 2024-11 | ✅ Active |

**Assessment:** P0 — No abandoned dependencies.

---

## Dependency Tree Size

| Project | Direct | Transitive | Risk |
|---------|--------|-----------|------|
| Source/Backend | 5 | 412 | P4 (low; test-only deps) |
| Source/Frontend | 8 | 231 | P4 |
| Source/E2E | 1 | 5 | P0 |
| platform/orchestrator | 3 | 156 | P3 (small, but critical infra) |
| portal/Backend | 10 | 578 | **P3** (largest; 578 transitive) |
| portal/Frontend | 13 | 425 | P3 |

**Assessment:** 
- portal/Backend at 578 transitive deps is elevated (supply chain surface)
- No duplicate major versions detected (✅ good dependency resolution)

---

## Supply Chain Risks

### Post-Install Scripts
✅ **None detected** — No security risk from arbitrary script execution

### Unpopular Dependencies
✅ **All core dependencies have >1K weekly downloads** — No low-download risk

### Single Maintainer Risk
✅ **All major dependencies are multi-maintainer projects** — No abandoned-maintainer risk

### Recent Transfers
✅ **No recent ownership transfers detected**

---

## Priority Remediation Plan

### 🔴 P1: CRITICAL (Deploy ASAP)

1. **protobufjs RCE** (orchestrator + portal/Backend)
   - Affects: platform/orchestrator, portal/Backend
   - Action: Update OpenTelemetry packages
   - Time: < 1 hour
   - Risk if delayed: RCE in orchestrator

2. **handlebars JavaScript Injection** (Source/Backend)
   - Affects: Source/Backend (test dependencies)
   - Action: Update jest/ts-jest
   - Time: < 30 min
   - Risk if delayed: RCE in test CI pipeline (low prod risk, but blocks CI)

### 🟠 P2: HIGH (Deploy this sprint)

3. **path-to-regexp ReDoS** (orchestrator + portal/Backend)
   - Affects: HTTP routing
   - Action: Update express
   - Time: < 30 min
   - Risk if delayed: DoS vulnerability

4. **picomatch ReDoS** (portal/Frontend)
   - Affects: Build process
   - Action: Update picomatch
   - Time: < 30 min
   - Risk if delayed: Build-time DoS

### 🟡 P3: MODERATE (Deploy next sprint)

5. **PostCSS, esbuild, vite** (Frontend projects)
   - Action: `npm update` in Source/Frontend and portal/Frontend
   - Time: < 1 hour per project
   - Risk if delayed: Low (dev-time only for esbuild/vite; XSS for PostCSS)

---

## Recommended Actions

### Immediate (this week)
```bash
# Source/Backend
cd Source/Backend
npm audit fix  # Fixes handlebars, brace-expansion

# platform/orchestrator
cd platform/orchestrator
npm update @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
npm update express  # Fixes path-to-regexp

# portal/Backend
cd portal/Backend
npm update @opentelemetry/auto-instrumentations-node  # Fixes protobufjs
npm update express uuid gaxios  # Fixes remaining vulns
```

### This sprint
```bash
# Source/Frontend
cd Source/Frontend
npm update vite postcss esbuild

# portal/Frontend
cd portal/Frontend
npm update picomatch vite postcss esbuild
```

### Verify fixes
```bash
# Run audit in each project
for dir in Source/Backend Source/Frontend platform/orchestrator portal/Backend portal/Frontend; do
  echo "=== $dir ==="
  cd "$dir" && npm audit --json | jq '.metadata.vulnerabilities'
done
```

---

## Cross-Team Escalation

🚨 **[ESCALATE → TheGuardians]**

**Two critical vulnerabilities in security-sensitive code:**

1. **protobufjs RCE** in platform/orchestrator
   - Impact: Arbitrary code execution in agent orchestration infrastructure
   - Recommendation: Review OpenTelemetry message handling for untrusted input
   - Tracking: DEP-006

2. **handlebars JavaScript Injection** in Source/Backend (test CI)
   - Impact: Arbitrary code execution in CI pipeline
   - Recommendation: Verify test templates are generated only from trusted sources
   - Tracking: DEP-001

3. **path-to-regexp + picomatch ReDoS** (services + build)
   - Impact: Denial of service attacks
   - Recommendation: Rate limiting on routing; build timeouts on glob operations
   - Tracking: DEP-007, DEP-011

---

## Learnings & Future Watchlist

### Recurring Patterns
- **Template injection** (handlebars): Framework-specific; monitor all template libraries
- **ReDoS vulnerabilities** (path-to-regexp, picomatch, brace-expansion): Glob/routing patterns; test with pathological inputs
- **Transitive dependency bloat**: portal/Backend at 578 packages; consider dependency pruning

### Future Monitoring
- **OpenTelemetry ecosystem**: Protobufjs is a known risk in this dependency chain; prefer protobuf version >= 7.5.5
- **Vite/esbuild**: Monitor for development server security issues (CORS, path traversal)
- **PostCSS plugins**: Ensure CSS-in-JS solutions are up-to-date

---

## JSON Summary

```json
{
  "report_date": "2026-05-05",
  "grade": "C",
  "projects_audited": 6,
  "total_vulnerabilities": 28,
  "severity_breakdown": {
    "critical": 2,
    "high": 4,
    "moderate": 18,
    "low": 4
  },
  "critical_findings": [
    {
      "id": "DEP-001",
      "package": "handlebars",
      "severity": "CRITICAL",
      "cve": "GHSA-2w6w-674q-4c4q",
      "affected_project": "Source/Backend",
      "cvss": 9.8
    },
    {
      "id": "DEP-006",
      "package": "protobufjs",
      "severity": "CRITICAL",
      "cve": "GHSA-xq3m-2v4x-88gg",
      "affected_projects": ["platform/orchestrator", "portal/Backend"],
      "cvss": 9.8
    }
  ],
  "remediation_effort": "2-4 hours",
  "testing_required": "npm audit in each project + integration test of orchestrator",
  "escalation_required": true,
  "escalation_team": "TheGuardians"
}
```

---

**Report generated by:** Dependency Auditor (Haiku)  
**Next audit:** 2026-06-05 (monthly)  
**Status:** Awaiting remediation and verification
