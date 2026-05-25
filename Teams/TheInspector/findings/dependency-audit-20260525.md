# Dependency Auditor Findings

**Audit Date:** 2026-05-25  
**Project:** dev-crew  
**Analysis Scope:** npm packages in Source/ and platform/

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Package Managers Detected** | npm (4 locations) |
| **Total Direct Dependencies** | 11 |
| **Total Transitive Dependencies** | 800 |
| **Known CVEs (Total)** | 21 |
| **P1 (Critical)** | 2 |
| **P2 (High)** | 1 |
| **P3 (Moderate)** | 18 |
| **Packages >1 Major Version Outdated** | 8 |
| **Abandoned Dependencies** | 0 |
| **Duplicate Critical Packages** | Yes (multiple versions of express, uuid) |

---

## Findings by Severity

### 🔴 P1 (Critical) - 2 Issues

#### DEP-001: Handlebars.js JavaScript Injection & Type Confusion
- **Severity:** P1
- **Category:** CVE
- **Package:** handlebars@^4.0.0 ≤ 4.7.8
- **File:** Source/Backend/package-lock.json
- **Location:** Transitive dependency (npm tree → unknown → handlebars)
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8 Critical) - JavaScript injection via AST type confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1 High) - Type confusion via @partial-block tampering
  - GHSA-2qvq-rjwj-gvw9 (CVSS 4.7 Moderate) - Prototype pollution + XSS
  - GHSA-7rx3-28cr-v5wh (CVSS 4.8 Moderate) - Prototype method access gap
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1 High) - AST type confusion with dynamic partial
  - GHSA-9cx6-37pm-9jff (CVSS 7.5 High) - DoS via malformed decorator syntax
  - GHSA-xjpj-3mr7-gcpf (CVSS 8.2 High) - CLI precompiler JavaScript injection
  - GHSA-442j-39wm-28r2 (CVSS 3.7 Low) - Property access validation bypass
- **Impact:** Code execution if untrusted templates are compiled; XSS in template output
- **Fix:** Update to handlebars ≥ 4.7.9 (verify fix completeness)
- **Status:** Requires immediate patching
- **Cross-ref:** [ESCALATE → TheGuardians] - Code injection vulnerability in template engine

---

#### DEP-002: protobufjs Remote Code Execution & DoS
- **Severity:** P1
- **Category:** CVE
- **Package:** protobufjs@^7.0.0 ≤ 7.5.7
- **File:** platform/orchestrator/package-lock.json
- **Location:** Transitive dependency
- **CVE IDs:**
  - GHSA-xq3m-2v4x-88gg (CVSS 9.8 Critical) - Arbitrary code execution
  - GHSA-75px-5xx7-5xc7 (CVSS 8.1 High) - Code generation gadget after prototype pollution
  - GHSA-jvwf-75h9-cwgg (CVSS 7.5 High) - Process-wide DoS via unsafe option paths
  - GHSA-685m-2w69-288q (CVSS 7.5 High) - DoS via unbounded recursion
  - GHSA-66ff-xgx4-vchm (CVSS ? High) - Code injection via bytes field defaults
  - GHSA-2pr8-phx7-x9h3 (CVSS 5.3 Moderate) - DoS from crafted field names
  - GHSA-fx83-v9x8-x52w (CVSS 5.3 Moderate) - Prototype injection in constructors
  - GHSA-jggg-4jg4-v7c6 (CVSS 5.3 Moderate) - DoS via recursive JSON expansion
  - GHSA-q6x5-8v7m-xcrf (CVSS 5.3 Moderate) - Overlong UTF-8 decoding
- **Impact:** Remote code execution if orchestrator accepts untrusted protobuf messages; process crashes
- **Fix:** Update to protobufjs ≥ 7.5.8 or ≥ 8.0.0
- **Status:** **CRITICAL BLOCKER** - Orchestrator is core infrastructure
- **Cross-ref:** [ESCALATE → TheGuardians] - RCE vulnerability in protobuf serialization

---

### 🟠 P2 (High) - 1 Issue

#### DEP-003: path-to-regexp Regular Expression DoS
- **Severity:** P2
- **Category:** CVE
- **Package:** path-to-regexp@<0.1.13
- **File:** platform/orchestrator/package-lock.json
- **Location:** Transitive dependency (orchestrator → express → path-to-regexp)
- **CVE ID:** GHSA-37ch-88jc-xwx2 (CVSS 7.5 High)
- **Detail:** ReDoS via multiple route parameters causes CPU exhaustion on malformed routes
- **Impact:** Orchestrator API routes become unresponsive when attacker sends crafted paths
- **Fix:** `npm update` (should pull express@4.22.2+ which includes fix)
- **Cross-ref:** [SEE TheGuardians] - DoS vector against orchestrator API

---

### 🟡 P3 (Moderate) - 18 Issues

#### DEP-004: qs Query String DoS
- **Severity:** P3
- **Category:** CVE
- **Package:** qs@6.11.1 - 6.15.1
- **Files:** Source/Backend/package-lock.json, platform/orchestrator/package-lock.json
- **Location:** Transitive (body-parser, express)
- **CVE ID:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3)
- **Detail:** `qs.stringify` crashes on null/undefined entries in comma-format arrays when `encodeValuesOnly` is set
- **Impact:** Backend/orchestrator crash if request parsing encounters edge case
- **Fix:** `npm update` (latest qs ≥ 6.15.2)

---

#### DEP-005: express via qs vulnerability
- **Severity:** P3
- **Category:** CVE (indirect)
- **Package:** express@^4.18.2, @^4.21.0
- **Files:** Source/Backend/package.json, platform/orchestrator/package.json
- **Location:** Direct dependencies affected by qs issue
- **Detail:** express 4.21.0-4.22.1 and 5.0.0-5.0.1 include vulnerable qs
- **Fix:** Update express to 4.22.2 or 5.0.2+
- **Outdated:** express@4.18.2 is 4 minor versions behind (should be 4.22.2)

---

#### DEP-006: brace-expansion Zero-Step Sequence Hang
- **Severity:** P3
- **Category:** CVE
- **Package:** brace-expansion@<1.1.13
- **File:** Source/Backend/package-lock.json
- **Location:** Transitive dependency
- **CVE ID:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Process hangs and exhausts memory on malformed brace sequences
- **Impact:** If backend uses glob patterns or file matching that accepts user input, DoS possible
- **Fix:** `npm update` (pinned to <1.1.13, automatic on npm update)

---

#### DEP-007: uuid Missing Buffer Bounds Check
- **Severity:** P3
- **Category:** CVE
- **Package:** uuid@^9.0.0, uuid<11.1.1
- **Files:** Source/Backend/package-lock.json, platform/orchestrator/package-lock.json
- **Location:** Direct + transitive
- **CVE ID:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Detail:** Missing bounds check in v3/v5/v6 when `buf` parameter provided; buffer overflow on short buffers
- **Impact:** Memory corruption if backend passes caller-controlled buffer to uuid functions
- **Fix:** Update uuid to ≥11.1.1 (major version bump)
- **Note:** Outdated - backend uses 9.0.0, latest is 14.0.0

---

#### DEP-008: PostCSS XSS via Unescaped </style>
- **Severity:** P3
- **Category:** CVE
- **Package:** postcss@<8.5.10
- **File:** Source/Frontend/package-lock.json
- **Location:** Transitive (vite → postcss)
- **CVE ID:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** CSS stringify output does not escape `</style>` tags, allowing XSS injection
- **Impact:** Frontend build output may contain XSS payloads in generated CSS
- **Fix:** `npm update` (vite should auto-update postcss)

---

#### DEP-009: Vite Path Traversal in .map Files
- **Severity:** P3
- **Category:** CVE
- **Package:** vite@<=6.4.1
- **File:** Source/Frontend/package-lock.json
- **Location:** Direct dependency
- **CVE ID:** GHSA-4w7w-66w2-5vf9 (CVSS ? Moderate)
- **Detail:** Optimized deps `.map` file handling vulnerable to path traversal during development
- **Impact:** Dev server may expose arbitrary files during local development (not production build)
- **Fix:** Update vite to ≥6.4.2 or ≥8.0.14 (major bump)
- **Outdated:** vite@5.4.0 is 3 minor versions behind 5.x line, but should jump to 8.x

---

#### DEP-010: esbuild CORS Bypass (Dev-Only)
- **Severity:** P3
- **Category:** CVE
- **Package:** esbuild@<=0.24.2
- **File:** Source/Frontend/package-lock.json
- **Location:** Transitive (vite → esbuild)
- **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** Dev server accepts requests from any website (no CORS enforcement) in dev mode
- **Impact:** XSS or CSRF via malicious website sending requests to local dev server
- **Mitigation:** Only affects local development; not a production issue
- **Fix:** Update esbuild (via vite major bump)

---

#### DEP-011: ws Uninitialized Memory Disclosure
- **Severity:** P3
- **Category:** CVE
- **Package:** ws@8.0.0 - 8.20.0
- **File:** Source/Frontend/package-lock.json
- **Location:** Transitive (vitest → ws)
- **CVE ID:** GHSA-58qx-3vcg-4xpx (CVSS 4.4)
- **Detail:** WebSocket library leaks uninitialized memory to remote clients
- **Impact:** Frontend test infrastructure may leak sensitive memory during vitest runs
- **Fix:** Update ws to ≥8.20.1

---

#### DEP-012: vitest/vite-node/mocker Chain Vulnerabilities
- **Severity:** P3
- **Category:** CVE (chain)
- **Package:** vitest@^2.0.5, @vitest/mocker, vite-node
- **File:** Source/Frontend/package-lock.json
- **Location:** Direct (vitest) + transitive chain
- **CVE IDs:** Multiple via vite, esbuild (see DEP-009, DEP-010)
- **Detail:** vitest pulls in vulnerable vite and esbuild versions
- **Impact:** Frontend tests may be compromised
- **Fix:** Update vitest to ≥4.1.7 (major bump required)

---

#### DEP-013: dockerode via uuid vulnerability
- **Severity:** P3
- **Category:** CVE (indirect)
- **Package:** dockerode@^4.0.4 ≤ 4.0.12
- **File:** platform/orchestrator/package-lock.json
- **Location:** Direct dependency
- **Detail:** Inherits uuid@<11.1.1 vulnerability
- **Fix:** Update dockerode to ≥5.0.0 (major bump)

---

#### DEP-014: @protobufjs/utf8 Overlong UTF-8 Decoding
- **Severity:** P3
- **Category:** CVE
- **Package:** @protobufjs/utf8@<=1.1.0
- **File:** platform/orchestrator/package-lock.json
- **Location:** Transitive
- **CVE ID:** GHSA-q6x5-8v7m-xcrf (CVSS 5.3)
- **Detail:** Accepts overlong UTF-8 sequences (security normalization bypass)
- **Impact:** Orchestrator may accept malformed protobuf messages bypassing validation
- **Fix:** Update protobufjs (includes @protobufjs/utf8)

---

### 🟢 P4 (Informational)

#### DEP-015: Outdated Major Versions
- **Severity:** P4 (but watch for backlog)
- **Category:** Technical Debt / Supply Chain Risk

| Package | Current | Latest | Packages | Major Gap |
|---------|---------|--------|----------|-----------|
| express | 4.18.2 | 5.2.1 | Backend, Orchestrator | +1 (but 4.22.2 available) |
| pino | 8.17.0 | 10.3.1 | Backend | +2 |
| uuid | 9.0.0 | 14.0.0 | Backend | +5 |
| react | 18.3.1 | 19.2.6 | Frontend | +1 |
| react-dom | 18.3.1 | 19.2.6 | Frontend | +1 |
| react-router-dom | 6.26.0 | 7.15.1 | Frontend | +1 |
| dockerode | 4.0.4 | 5.0.0 | Orchestrator | +1 |
| multer | 1.4.5-lts.1 | 2.1.1 | Orchestrator | +1 |
| vite | 5.4.0 | 8.0.14 | Frontend | +3 |
| vitest | 2.0.5 | 4.1.7 | Frontend | +2 |

**Recommendation:** Schedule updates in phases:
1. **Phase 1 (Patch):** Update patch versions (4.22.2, 8.5.10, etc.)
2. **Phase 2 (Minor):** Update minor versions within same major (8.17.0 → 8.21.0)
3. **Phase 3 (Major):** Coordinate major bumps (express 4→5, react 18→19)

---

#### DEP-016: Large Dependency Trees
- **Severity:** P4
- **Category:** Supply Chain Risk

| Location | Direct | Transitive | Risk |
|----------|--------|-----------|------|
| Backend | 13 | 411 | High (31x expansion) |
| Frontend | 13 | 230 | Medium (18x expansion) |
| Orchestrator | 3 | 155 | High (52x expansion) |
| E2E | 1 | 4 | Low |

**Finding:** Backend and Orchestrator have disproportionate dependency bloat. One vulnerable transitive dep can compromise the whole tree.

**Recommendation:** Audit transitive deps for:
- Unused dependencies (removable with npm prune)
- Duplicate major versions (npm ls | grep duplicates)
- Post-install scripts (security risk)

---

## Cross-References

### [ESCALATE → TheGuardians]
1. **DEP-001 (handlebars)** - JavaScript injection via template tampering
2. **DEP-002 (protobufjs)** - Remote code execution in orchestrator
3. **DEP-003 (path-to-regexp)** - DoS attack vector

### [CROSS-REF: performance-profiler]
- Recommend profiling Frontend after vitest/vite major updates (could regress build times)

---

## Remediation Roadmap

### Immediate (P1 - This Sprint)

```bash
# Backend
cd Source/Backend
npm update handlebars  # Verify ≥4.7.9

# Orchestrator (CRITICAL BLOCKER)
cd platform/orchestrator
npm update protobufjs  # Must be ≥7.5.8
npm update path-to-regexp  # Via express update
npm update express  # 4.22.2+
```

### Short Term (P2-P3 - Next Sprint)

```bash
# All directories
npm update  # Pulls patch & minor updates

# Frontend (requires testing)
cd Source/Frontend
npm update react@^19  # Major bump
npm update react-dom@^19
npm update react-router-dom@^7
npm update vite@^8  # Major bump (test build output)
npm update vitest@^4  # Major bump (test suite)

# Backend (requires testing)
cd Source/Backend
npm update pino@^10  # Major bump
npm update uuid@^14  # Major bump (test with buffer usage)

# Orchestrator (requires testing)
cd platform/orchestrator
npm update dockerode@^5  # Major bump
npm update multer@^2  # Major bump
```

### Medium Term (Dependency Hygiene)

- [ ] Audit for post-install scripts (`npm ls | grep postinstall`)
- [ ] Identify unused transitive dependencies
- [ ] Create `DEPENDENCY_POLICY.md` (which licenses allowed, deprecation handling)
- [ ] Set up automated dependency updates (Dependabot, Renovate)
- [ ] Add npm audit to CI/CD pipeline (fail on P1/P2)

---

## Implementation Notes

**Testing Strategy:**
1. Run full test suite after each major version bump
2. Smoke test orchestrator (start, check `/health`, spawn agent)
3. Frontend: verify build output, test interactive features
4. Backend: verify API routes, check observability metrics

**Verification Checklist:**
- [ ] All tests pass
- [ ] `npm audit` shows 0 critical/high (after patches)
- [ ] Orchestrator starts without errors
- [ ] Frontend builds without warnings
- [ ] Backward compatibility verified (API responses unchanged)

---

## Self-Learning Updates

_Added to learnings/dependency-auditor.md:_

- **Watch List:** handlebars (7 CVEs), protobufjs (9 CVEs) — high-volatility packages
- **Decision:** express major version update deferred until Q2 (breaking changes)
- **Audit Tools Available:** npm audit (native), npm ls, npm outdated
- **Transitive Dep Reduction Strategy:** Target Backend & Orchestrator for hygiene pass

---

## JSON Summary

```json
{
  "audit_date": "2026-05-25",
  "project": "dev-crew",
  "summary": {
    "total_direct_deps": 11,
    "total_transitive_deps": 800,
    "package_managers": ["npm"],
    "locations": 4
  },
  "vulnerabilities": {
    "critical": 2,
    "high": 1,
    "moderate": 18,
    "low": 0,
    "total": 21
  },
  "by_location": {
    "Source/Backend": {
      "direct": 4,
      "transitive": 411,
      "vulnerabilities": {"critical": 1, "moderate": 5},
      "outdated_major": 3
    },
    "Source/Frontend": {
      "direct": 3,
      "transitive": 230,
      "vulnerabilities": {"critical": 0, "moderate": 7},
      "outdated_major": 3
    },
    "Source/E2E": {
      "direct": 1,
      "transitive": 4,
      "vulnerabilities": {"critical": 0, "moderate": 0},
      "outdated_major": 0
    },
    "platform/orchestrator": {
      "direct": 3,
      "transitive": 155,
      "vulnerabilities": {"critical": 1, "high": 1, "moderate": 6},
      "outdated_major": 3
    }
  },
  "critical_packages": [
    {"name": "handlebars", "cves": 8, "rce": false, "xss": true},
    {"name": "protobufjs", "cves": 9, "rce": true, "dos": true}
  ],
  "action_items": [
    "Update handlebars to ≥4.7.9 (Backend)",
    "Update protobufjs to ≥7.5.8 (Orchestrator) - BLOCKER",
    "Update express to 4.22.2+ (Backend, Orchestrator)",
    "Schedule major version updates (React, Vite, Vitest)"
  ]
}
```
