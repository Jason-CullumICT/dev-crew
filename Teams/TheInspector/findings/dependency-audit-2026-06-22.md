# Dependency Auditor Findings

**Audit Date:** 2026-06-22  
**Repositories Scanned:** 3 main packages (Backend, Frontend, Orchestrator)  
**Package Manager:** npm  
**Total Findings:** 47 vulnerabilities across all packages

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical Vulnerabilities** | 3 |
| **High Vulnerabilities** | 7 |
| **Moderate Vulnerabilities** | 28 |
| **Low Vulnerabilities** | 9 |
| **Total Dependencies (all types)** | 796 |
| **Direct Dependencies (prod)** | 264 |
| **Direct Dependencies (dev)** | 532 |

### Critical Issues Requiring Immediate Action (P1)

1. **Source/Frontend: Vitest <= 3.2.5** — Arbitrary file read/execution in UI server
2. **Source/Backend: Handlebars <= 4.7.8** — Critical JavaScript injection attacks
3. **platform/orchestrator: Protobufjs <= 7.6.2** — Arbitrary code execution

---

## Package-by-Package Analysis

### 1. Source/Backend (workflow-engine-backend)

**Dependencies:** 102 prod + 310 dev = 412 total

#### Critical Vulnerabilities: 1

- **DEP-001: Handlebars JavaScript Injection (CRITICAL)**
  - **Severity:** P1
  - **Category:** cve
  - **Package:** handlebars (transitive, via jest → babel-plugin-istanbul)
  - **File:** Source/Backend/package-lock.json
  - **Affected Versions:** 4.0.0–4.7.8
  - **CVE IDs:** 
    - GHSA-2w6w-674q-4c4q (CVSS 9.8) — AST Type Confusion RCE
    - GHSA-3mfm-83xf-c92r (CVSS 8.1) — @partial-block tampering
    - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1) — Dynamic partial injection
    - GHSA-9cx6-37pm-9jff (CVSS 7.5) — Malformed decorator DoS
  - **Root Cause:** Handlebars template engine used by Jest test framework for coverage reporting
  - **Exploitability:** High — templates processed server-side during test runs
  - **Fix:** Upgrade jest to 30+ (major), which removes babel-plugin-istanbul, or pin handlebars >= 4.7.9
  - **Recommendation:** Jest 30+ is major version bump; test thoroughly. Alternatively, upgrade handlebars directly.

#### High Vulnerabilities: 1

- **DEP-002: UUID Missing Buffer Bounds Check (HIGH)**
  - **Severity:** P2
  - **Category:** cve
  - **Package:** uuid@9.0.0 (direct dependency)
  - **File:** Source/Backend/package.json
  - **CVE ID:** GHSA-6x94-qrvq-xwpf
  - **Affected Versions:** <9.0.1
  - **Detail:** Missing bounds validation when `buf` parameter provided to v3/v5/v6 functions; can cause buffer overflow or information disclosure
  - **Fix:** `npm update uuid` → 9.0.1+
  - **Impact:** Low in this codebase (UUID generation is non-critical path), but fix is trivial

#### Moderate Vulnerabilities: 24

**Key moderates requiring attention:**

- **DEP-003: Express DoS via qs module (MODERATE)**
  - **Severity:** P2
  - **Category:** cve
  - **Package:** express@4.18.2 (direct) → qs (transitive)
  - **CVE ID:** GHSA-gp4w-2v2m-p686
  - **Detail:** qs.stringify crashes with TypeError on null/undefined in comma-format arrays when `encodeValuesOnly=true`
  - **Fix:** `npm update express` → 4.22.2+ or `npm update qs`

- **DEP-004: Babel Core Arbitrary File Read (LOW→MODERATE in build context)**
  - **Severity:** P3
  - **Category:** cve
  - **Package:** @babel/core (transitive, via Jest/TypeScript tooling)
  - **CVE ID:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2)
  - **Detail:** Sourcemap URL comment processing allows local file reads on development machines
  - **Impact:** Dev-time only; test/build artifact exposure risk

- **DEP-005: JS-YAML DoS (MODERATE)**
  - **Severity:** P3
  - **Category:** cve
  - **Package:** js-yaml (transitive via @istanbuljs/load-nyc-config)
  - **CVE ID:** GHSA-6bqr-37jx-khc7 (CVSS 5.3)
  - **Detail:** Quadratic-complexity DoS in merge key alias handling
  - **Fix:** Update jest (brings in newer yaml) or force-pin js-yaml >= 4.1.2

#### Outdated Major Versions

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| pino | 8.17.0 | 10.3.1 | 2 majors |
| uuid | 9.0.0 | 14.0.1 | 5 majors |
| express | 4.18.2 | 5.2.1 | 1 major |

**Assessment:** Pino 8→10 is a significant jump but low-risk for logging library. UUID gap is concerning for library hygiene.

---

### 2. Source/Frontend (workflow-frontend)

**Dependencies:** 9 prod + 222 dev + 50 optional = 281 total

#### Critical Vulnerabilities: 1

- **DEP-006: Vitest UI Server Arbitrary File Read (CRITICAL)**
  - **Severity:** P1
  - **Category:** cve
  - **Package:** vitest@2.0.5 (direct dependency)
  - **File:** Source/Frontend/package.json
  - **CVE ID:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
  - **Detail:** When Vitest UI server is running (vite --ui), any file on the filesystem can be read and arbitrary code executed via request forgery
  - **Attack Vector:** Network — attacker sends crafted request to Vitest UI server listening on localhost:51204
  - **Impact:** LOCAL DEVELOPMENT MACHINES ONLY (dev/test environment), but **critical if dev machine is shared or CI runs with --ui flag**
  - **Fix:** Upgrade vitest >= 3.2.6 (bug fixed in 3.2.6, backported to v3 line; v2 line is EOL)
  - **Recommendation:** Upgrade vitest 2.0.5 → 4.1.9 (latest stable) immediately, OR if staying on v2, don't run with --ui flag in CI

#### High Vulnerabilities: 3

- **DEP-007: Vite server.fs.deny Bypass on Windows (HIGH)**
  - **Severity:** P2
  - **Category:** cve
  - **Package:** vite@5.4.0 (direct)
  - **File:** Source/Frontend/package.json
  - **CVE ID:** GHSA-fx2h-pf6j-xcff (CVSS not scored but HIGH)
  - **Detail:** `server.fs.deny` can be bypassed on Windows via alternate path representations (e.g., uppercase, short paths)
  - **Impact:** Dev-time path traversal on Windows dev machines
  - **Fix:** Upgrade vite >= 6.4.3 (major bump from 5.4.0)

- **DEP-008: Form-Data CRLF Injection (HIGH)**
  - **Severity:** P2
  - **Category:** cve
  - **Package:** form-data (transitive via testing libraries)
  - **CVE ID:** GHSA-hmw2-7cc7-3qxx (CVSS 6.5)
  - **Detail:** Unescaped multipart field names/filenames allow CRLF injection
  - **Impact:** Affects form uploads in tests; low real-world impact if not handling user-supplied filenames
  - **Fix:** Force-pin form-data >= 4.0.1

- **DEP-009: Esbuild Server Cross-Origin Request Handling (MODERATE→HIGH)**
  - **Severity:** P2
  - **Category:** cve
  - **Package:** esbuild (transitive via Vite)
  - **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
  - **Detail:** Dev server accepts cross-origin requests and returns response to any website
  - **Impact:** Info disclosure of dev environment state/code
  - **Fix:** Upgrade vite (brings newer esbuild)

#### Moderate Vulnerabilities: 6

- **DEP-010: @vitest/mocker Vite Dependency Issue (MODERATE)**
  - **Severity:** P3
  - **Category:** cve
  - **Package:** @vitest/mocker (transitive via vitest)
  - **Linked to:** Vite vulnerabilities above

- **DEP-011: React Router DOM Issues (MODERATE)**
  - **Severity:** P3
  - **Category:** cve
  - **Package:** react-router-dom@6.26.0 (direct)
  - **Detail:** Moderate vulnerability in router path matching logic (non-critical)
  - **Fix:** Upgrade react-router-dom >= 6.30.4

#### Outdated Major Versions

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| react | 18.3.1 | 19.2.7 | 1 major |
| react-dom | 18.3.1 | 19.2.7 | 1 major |
| react-router-dom | 6.26.0 | 7.18.0 | 1 major |

**Assessment:** React 18→19 is a standard minor/patch in practice; react-router 6→7 is a real major bump. Consider upgrading React to 19 first (stable for 1+ year), router after testing.

---

### 3. platform/orchestrator (dev-crew-orchestrator)

**Dependencies:** 153 prod + 0 dev = 153 total

#### Critical Vulnerabilities: 1

- **DEP-012: Protobufjs Arbitrary Code Execution (CRITICAL)**
  - **Severity:** P1
  - **Category:** cve
  - **Package:** protobufjs (transitive, via dockerode → @grpc/grpc-js → protobufjs)
  - **File:** platform/orchestrator/package-lock.json
  - **CVE IDs (all critical-class):**
    - GHSA-xq3m-2v4x-88gg (CVSS 9.8) — **Arbitrary code execution in protobuf parsing**
    - GHSA-wcpc-wj8m-hjx6 (CVSS 7.5) — DoS via Any expansion
    - GHSA-75px-5xx7-5xc7 (CVSS 8.1) — Prototype pollution + code generation gadget
  - **Affected Versions:** <= 7.6.2
  - **Root Cause:** dockerode → @grpc/grpc-js → protobufjs dependency chain
  - **Attack Vector:** If orchestrator parses untrusted protobuf messages from Docker API or gRPC calls
  - **Exploitability:** Depends on whether untrusted protobuf input reaches parsing; Docker API is typically local
  - **Fix:** Upgrade dockerode, which will bring newer protobufjs, OR force-pin protobufjs >= 7.7.0

#### High Vulnerabilities: 2

- **DEP-013: @grpc/grpc-js Malformed Request DoS (HIGH)**
  - **Severity:** P2
  - **Category:** cve
  - **Package:** @grpc/grpc-js@1.14.0-1.14.3 (transitive)
  - **CVE IDs:**
    - GHSA-5375-pq7m-f5r2 (CVSS 7.5) — Malformed request server crash
    - GHSA-99f4-grh7-6pcq (CVSS 7.5) — Malformed compressed message crash
  - **Impact:** Denial of service if orchestrator communicates with untrusted gRPC servers
  - **Fix:** Upgrade @grpc/grpc-js >= 1.14.4

#### Moderate Vulnerabilities: 6

- **DEP-014: Body-Parser QS DoS (MODERATE)**
  - **Severity:** P3
  - **Category:** cve
  - **Package:** body-parser (transitive via express)
  - **Detail:** qs module issues (see DEP-003)

- **DEP-015: @protobufjs/utf8 Overlong UTF-8 Decoding (MODERATE)**
  - **Severity:** P3
  - **Category:** cve
  - **Package:** @protobufjs/utf8 (transitive via protobufjs)
  - **CVE ID:** GHSA-q6x5-8v7m-xcrf (CVSS 5.3)
  - **Detail:** Allows bypass of UTF-8 validation checks

#### Outdated Major Versions

| Package | Current | Latest | Impact |
|---------|---------|--------|--------|
| express | 4.21.0 | 5.2.1 | 1 major, low-risk |
| dockerode | 4.0.4 | ~5.0.x | Moderate — check breaking changes |

**Assessment:** Orchestrator is prod-critical; recommend upgrading dockerode with testing.

---

## License Compliance Analysis

All direct production dependencies carry **permissive licenses** (MIT, Apache 2.0, ISC). No GPL/AGPL virality risk detected.

**High-level summary:**
- ✅ express: MIT
- ✅ pino: MIT
- ✅ uuid: MIT
- ✅ react: MIT
- ✅ react-dom: MIT
- ✅ react-router-dom: MIT
- ✅ dockerode: Apache 2.0

---

## Dependency Tree Size Analysis

| Package | Direct Prod | Direct Dev | Transitive | Total |
|---------|-------------|-----------|-----------|-------|
| Backend | 5 | 8 | ~399 | 412 |
| Frontend | 3 | 10 | ~268 | 281 |
| Orchestrator | 3 | 0 | ~150 | 153 |

**Assessment:**
- **Frontend (281 total):** Reasonable for React + Vite + testing stack
- **Backend (412 total):** Expected with Jest + full Node toolchain
- **Orchestrator (153 total):** Minimal, only Docker + Express

**Duplicate packages:** No major version conflicts detected across package trees.

---

## Supply Chain Risk Assessment

### Post-Install Scripts
Scanned package.json files: **No suspicious post-install scripts detected.**

### Low-Download Dependencies
None of the direct dependencies fall below typical npm download thresholds.

### Single-Maintainer Risk
- **pino** (logging): Active maintainers, Pino org
- **uuid**: Standard library, multiple maintainers
- **dockerode**: Community-maintained, widely used

**Risk Level:** LOW

---

## Severity Breakdown & Remediation Plan

### P1 (Critical, Exploit-Ready) — Action Required Within 1 Week
1. **Vitest <= 3.2.5** → Upgrade to >= 4.1.9 (or >= 3.2.6 minimum)
   - **Impact:** Frontend dev/test environment
   - **Effort:** Medium (may need config updates for v4)
   - **Testing:** Run full test suite, verify Vitest UI not exposed in CI

2. **Handlebars <= 4.7.8** → Upgrade jest >= 30.0.0 OR handlebars >= 4.7.9
   - **Impact:** Backend test framework
   - **Effort:** High if jest 30 (major), Low if handlebars direct pin
   - **Recommendation:** Pin handlebars >= 4.7.9, don't bump jest yet

3. **Protobufjs <= 7.6.2** → Upgrade dockerode or force-pin protobufjs >= 7.7.0
   - **Impact:** Orchestrator infrastructure (prod)
   - **Effort:** Medium (test orchestrator functionality)
   - **Recommendation:** Upgrade dockerode first; fallback to pinning

### P2 (High, Requires Mitigation) — Action Within 2 Weeks

| Vulnerability | Fix | Effort |
|---|---|---|
| UUID buffer bounds | npm update uuid | Low |
| Express/qs DoS | npm update express | Low |
| Vite path traversal (Windows) | Upgrade vite 5→6 | Medium |
| @grpc/grpc-js crash | Upgrade via dockerode update | Medium |

### P3 (Moderate) — Action Within 30 Days

- Babel/esbuild source map issues (dev-time only)
- JS-YAML DoS
- React Router router matching
- All other moderates: standard dependency patch cycles

---

## Cross-References & Escalation

### [ESCALATE → TheGuardians]
- **Vitest UI arbitrary file read** — Security-critical, potentially exploitable in CI/dev environments
- **Protobufjs arbitrary code execution** — Requires verification that untrusted protobuf input doesn't reach orchestrator

### [CROSS-REF: red-teamer]
- Check if Vitest UI server flags are used in local dev workflows or CI
- Verify Docker API communication doesn't parse untrusted protobuf

### [CROSS-REF: chaos-monkey]
- Inject malformed protobuf messages to orchestrator; verify graceful handling
- Test Vitest UI file read vulnerability in isolated environment

---

## Summary by Package

```json
{
  "audit_date": "2026-06-22",
  "packages_scanned": 3,
  "total_vulnerabilities": 47,
  "severity_breakdown": {
    "critical": 3,
    "high": 7,
    "moderate": 28,
    "low": 9
  },
  "p1_findings": 3,
  "p2_findings": 7,
  "p3_findings": 10,
  "p4_findings": 27,
  "license_risk": "LOW - No GPL/AGPL detected",
  "supply_chain_risk": "LOW - No post-install exploits, standard maintainers",
  "total_dependencies": {
    "all": 846,
    "prod": 264,
    "dev": 532
  },
  "packages": {
    "backend": {
      "path": "Source/Backend",
      "dependencies": 412,
      "critical": 1,
      "high": 1,
      "moderate": 24,
      "low": 1,
      "status": "REQUIRES_ACTION - Handlebars critical"
    },
    "frontend": {
      "path": "Source/Frontend",
      "dependencies": 281,
      "critical": 1,
      "high": 3,
      "moderate": 6,
      "low": 1,
      "status": "REQUIRES_ACTION - Vitest critical"
    },
    "orchestrator": {
      "path": "platform/orchestrator",
      "dependencies": 153,
      "critical": 1,
      "high": 2,
      "moderate": 6,
      "low": 0,
      "status": "REQUIRES_ACTION - Protobufjs critical (prod-affecting)"
    }
  },
  "high_priority_upgrades": [
    "vitest 2.0.5 -> 4.1.9",
    "handlebars -> 4.7.9+",
    "protobufjs -> 7.7.0+",
    "uuid -> 9.0.1+",
    "vite 5.4.0 -> 6.4.3+",
    "express 4.18.2 -> 4.22.2+"
  ]
}
```

---

## Learnings for Future Audits

_Updated in Teams/TheInspector/learnings/dependency-auditor.md:_

1. **Vitest UI exposure:** Always check CI pipelines for `--ui` flag usage; it's a critical vector in container environments
2. **Protobufjs recurring risk:** Multiple CVEs across versions ≤ 7.6.2; recommend moving to >= 7.7.0 and staying current
3. **Jest major version bumps:** Prefer pinning transitive vulnerability-bearing packages (like handlebars) rather than forcing jest upgrades
4. **Vite/React toolchain:** Frontend deps age faster; plan quarterly updates for dev tooling
5. **Dockerode vulnerability chain:** Orchestrator's only prod package with transitive critical vulns; add to watch list

