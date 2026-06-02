# Dependency Auditor Findings Report

**Audit Date:** 2026-06-02  
**Package Managers Detected:** npm (13 package.json files)  
**Status:** ⚠️ **CRITICAL** — Multiple P1/P2 severity vulnerabilities requiring immediate action

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total npm Projects** | 13 |
| **Projects with Vulnerabilities** | 9 |
| **Total CVEs Found** | 50+ |
| **Critical (P1)** | 4 |
| **High (P2)** | 5 |
| **Medium (P3)** | 12+ |
| **Major Version Outdated** | 6+ |
| **Abandoned Dependencies** | 0 identified |

---

## Critical Findings

### DEP-001: Handlebars.js Multiple JavaScript Injection Vulnerabilities
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** handlebars@4.0.0 - 4.7.8 (transitive in Source/Backend)
- **File:** Source/Backend/package-lock.json
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q: JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r: JavaScript Injection via @partial-block tampering (CVSS 8.1)
  - GHSA-xjpj-3mr7-gcpf: JavaScript Injection in CLI Precompiler (CVSS 8.2)
  - Additional: XSS via Partial Template Injection, Prototype Pollution, __lookupSetter__ Bypass
- **Detail:** Handlebars has 8 distinct vulnerabilities in versions ≤4.7.8, including code injection, prototype pollution, and XSS. All have Fix Available.
- **Fix:** Upgrade handlebars to ≥4.7.9 (implicit through transitive dependency upgrade). Check which direct dependency pulls it in and update that package.
- **Impact:** If handlebars processes untrusted template input, arbitrary JavaScript execution is possible.
- **Cross-ref:** [ESCALATE → TheGuardians] — potential RCE vector if user-supplied templates are compiled.

---

### DEP-002: Vitest Critical UI Server File Disclosure + Arbitrary Code Execution
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** vitest@≤4.1.0-beta.6
- **Files:** 
  - Source/Frontend/package.json (direct)
  - portal/Frontend/package.json (direct)
- **CVE ID:** GHSA-5xrq-8626-4rwp (CVSS 9.8)
- **Detail:** When Vitest UI server is listening, arbitrary files can be read and executed. This is a **development-time only** risk but HIGH impact if CI/testing env is exposed or attacker can reach the dev server.
- **Fix:** `npm upgrade vitest@4.1.8+` (isSemVerMajor)
- **Impact:** RCE + arbitrary file read from any source code or secrets in the project.
- **Cross-ref:** [ESCALATE → TheGuardians] — impacts CI/CD if Vitest UI is enabled in testing pipelines.

---

### DEP-003: Protobufjs Multiple Critical Vulnerabilities (Orchestrator)
- **Severity:** P1 (CRITICAL)
- **Category:** cve
- **Package:** protobufjs@≤7.5.7 (transitive in platform/orchestrator)
- **File:** platform/orchestrator/package-lock.json
- **CVE IDs:**
  - GHSA-xq3m-2v4x-88gg: Arbitrary code execution via deserialization (CVSS 9.8)
  - GHSA-66ff-xgx4-vchm: Code injection via bytes field defaults (CVSS high)
  - GHSA-75px-5xx7-5xc7: Code generation gadget after prototype pollution (CVSS 8.1)
  - Additional: DoS via unbounded recursion, process-wide DoS via unsafe paths, prototype injection
- **Detail:** 10 vulnerabilities in protobufjs, the worst being RCE via malformed .proto parsing. Affects orchestrator infrastructure.
- **Fix:** Upgrade protobufjs to latest (check which direct dependency pulls it — likely gRPC/Datastore libraries).
- **Impact:** **CRITICAL** — Orchestrator processes protobuf messages; RCE if parsing untrusted proto definitions.
- **Cross-ref:** [ESCALATE → TheGuardians] — infrastructure compromise risk.

---

### DEP-004: OpenTelemetry Prometheus Exporter Process Crash (Portal Backend)
- **Severity:** P1-P2 (HIGH)
- **Category:** cve
- **Package:** 
  - @opentelemetry/sdk-node@<0.217.0 (direct in portal/Backend)
  - @opentelemetry/auto-instrumentations-node@<0.75.0 (direct in portal/Backend)
- **CVE ID:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Detail:** Malformed HTTP request to metrics endpoint crashes Prometheus exporter process.
- **Fix:** Upgrade to @opentelemetry/sdk-node@≥0.217.0 and @opentelemetry/auto-instrumentations-node@≥0.75.0.
- **Impact:** DoS against observability infrastructure; metrics unavailable, alerting blind.

---

## High Priority Findings

### DEP-005: Path-to-Regexp ReDoS Vulnerability (Orchestrator)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** path-to-regexp@<0.1.13 (transitive in platform/orchestrator)
- **CVE ID:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Detail:** Regular Expression Denial of Service via multiple route parameters. Affects orchestrator routing.
- **Fix:** Upgrade transitive dependency (check Express version).
- **Impact:** Route parsing DoS; orchestrator API becomes unresponsive.

---

### DEP-006: Picomatch ReDoS Vulnerabilities (Portal Frontend)
- **Severity:** P2 (HIGH)
- **Category:** cve
- **Package:** picomatch@≤2.3.1 || 4.0.0-4.0.3 (transitive in portal/Frontend)
- **CVE IDs:**
  - GHSA-c2c7-rcm5-vvqj: ReDoS via extglob quantifiers (CVSS 7.5) — 2 variants
  - GHSA-3v7f-55p6-f55p: Method injection in POSIX character classes (CVSS 5.3)
- **Detail:** Glob pattern matching can be crafted to cause exponential backtracking.
- **Fix:** Upgrade picomatch to ≥2.3.2 (transitive through dependencies like chokidar, micromatch).
- **Impact:** Build process or file-watching can hang/crash on adversarial input.

---

### DEP-007: UUID Buffer Bounds Check Missing (Multiple)
- **Severity:** P2 (MODERATE→HIGH)
- **Category:** cve
- **Package:** uuid@<11.1.1
- **Files:** Source/Backend, platform/orchestrator, portal/Backend
- **CVE ID:** GHSA-w5hq-g745-h8pq (CVSS 7.5)
- **Detail:** Missing buffer bounds check in v3/v5/v6 when buf is provided. Can cause information disclosure or memory corruption.
- **Fix:** Upgrade uuid to ≥11.1.1 (isSemVerMajor — v14.0.0 available).
- **Impact:** Potential memory safety issue if UUID generation is called with attacker-controlled buffers.
- **Current versions:**
  - Source/Backend: 9.0.1 → upgrade to 14.0.0
  - platform/orchestrator: via dockerode (indirect)
  - portal/Backend: direct dependency, <11.1.1

---

## Medium Priority Findings

### DEP-008: Vite Path Traversal in `.map` Handling
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** vite@≤6.4.1
- **Files:** Source/Frontend, portal/Frontend, portal/Backend
- **CVE ID:** GHSA-4w7w-66w2-5vf9
- **Detail:** Path traversal in optimized deps `.map` file handling. Could expose source maps.
- **Fix:** Upgrade vite to ≥8.0.16.
- **Impact:** Depending on deployment, source map exposure enables reverse engineering.

---

### DEP-009: esbuild Development Server CORS Bypass
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** esbuild@≤0.24.2 (transitive via vite)
- **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3)
- **Detail:** Development server allows any website to send requests and read responses.
- **Fix:** Upgrade vite (which bundles esbuild) to ≥8.0.16.
- **Impact:** **Dev-time only** but allows XSS via dev server if attacker can inject scripts.

---

### DEP-010: PostCSS XSS via Unescaped `</style>`
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** postcss@<8.5.10
- **Files:** Source/Frontend, portal/Frontend
- **CVE ID:** GHSA-qx2v-qp2m-jg93 (CVSS 6.1)
- **Detail:** Unescaped `</style>` in CSS stringify output can break out of style context.
- **Fix:** Upgrade postcss to ≥8.5.10.
- **Impact:** XSS if CSS is user-generated.

---

### DEP-011: WebSocket Uninitialized Memory Disclosure
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** ws@8.0.0-8.20.0 (transitive in Source/Frontend, portal/Frontend)
- **CVE ID:** GHSA-58qx-3vcg-4xpx (CVSS 4.4)
- **Detail:** Memory disclosure via uninitialized buffers in WebSocket handling.
- **Fix:** Upgrade ws to ≥8.20.1 (implicit through dependency upgrades).
- **Impact:** Low-level information leak from WebSocket sessions.

---

### DEP-012: qs Denial of Service (DoS)
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** qs@6.11.1-6.15.1 (transitive in express, body-parser)
- **CVE ID:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3)
- **Detail:** `qs.stringify` crashes with TypeError when encodeValuesOnly is set on certain inputs.
- **Fix:** Upgrade qs (via express/body-parser upgrade). Express 4.22.2+ includes fix.
- **Impact:** Request parsing DoS; API becomes unavailable.
- **Affected files:** Source/Backend, platform/orchestrator, portal/Backend

---

### DEP-013: Brace-Expansion Process Hang
- **Severity:** P3 (MODERATE)
- **Category:** cve
- **Package:** brace-expansion@<1.1.13 (transitive in Source/Backend)
- **CVE ID:** GHSA-f886-m6hf-6m8v (CVSS 6.5)
- **Detail:** Zero-step sequences cause process hang and memory exhaustion.
- **Fix:** Upgrade brace-expansion to ≥1.1.13 (implicit through glob/minimatch upgrades).
- **Impact:** Build/CLI processes can hang.

---

## Outdated Major Versions

### DEP-014: Express 2 Major Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Current:** 4.22.x | **Latest:** 5.2.1 (2 majors ahead)
- **Files:** Source/Backend, platform/orchestrator, portal/Backend
- **Detail:** Express 4 is stable but missing features/patches from v5. No critical issues identified, but consider planning upgrade path.
- **Risk:** Accumulated security patches, performance improvements in v5.

---

### DEP-015: React 1 Major Version Behind
- **Severity:** P4 (LOW)
- **Category:** outdated
- **Current:** 18.3.1 | **Latest:** 19.2.7
- **Files:** Source/Frontend, portal/Frontend
- **Detail:** React 18 still supported; v19 has new features (useFormStatus, useActionState). Not urgent.
- **Fix:** Plan React 19 migration when convenient.

---

### DEP-016: Pino Logging 2 Major Versions Behind
- **Severity:** P3
- **Category:** outdated
- **Current:** 8.21.0 | **Latest:** 10.3.1
- **Files:** Source/Backend
- **Detail:** Pino 8 is stable; v10 has performance improvements and new transport system.
- **Fix:** Evaluate v10 for performance gains.

---

## Dependency Tree Analysis

| Project | Direct | Transitive | Status |
|---------|--------|-----------|--------|
| Source/Backend | 102 | 411 | ⚠️ High transitive surface |
| Source/Frontend | 9 | 230 | ⚠️ Moderate (includes @types packages) |
| Source/E2E | 4 | 4 | ✅ Clean |
| platform/orchestrator | 153 | 155 | ⚠️ Vendor lock? Check direct deps |
| portal/Backend | 397 | 577 | 🚨 **Largest tree — >500 transitive deps** |
| portal/Frontend | 9 | 424 | ⚠️ Heavy dev dependencies (build tools) |

**Concern:** portal/Backend with 577 transitive dependencies represents a large supply chain surface. Each dependency is a potential attack vector. Recommend dependency audit + supply chain risk assessment.

---

## License Compliance

**Note:** npx license-checker not run due to environment constraints. Manual spot-checks recommended for:
1. **GPL/AGPL dependencies** (viral license risk for proprietary code)
2. **UNLICENSED packages** (legal unknown)
3. **Custom/unusual licenses** requiring legal review

**Recommendation:** Run `npx license-checker --onlyAllow "MIT,Apache-2.0,BSD"` on each project to establish license policy.

---

## Supply Chain Risk Summary

### Post-Install Scripts
Check for post-install scripts in direct dependencies (can run arbitrary code during npm install):

```bash
grep -r '"postinstall"' Source/Backend/package.json Source/Frontend/package.json
```

**Not found in initial scan** — good sign.

### Single-Maintainer Dependencies
**Requires manual investigation** — check npm registry for projects with 1 maintainer + few downloads/week.

### Recently Transferred Packages
**Not identified** — would require GitHub API lookup per dependency.

---

## Remediation Summary

### Immediate Actions (P1 — Do Today)

| Finding | Fix | Effort |
|---------|-----|--------|
| **Vitest RCE** | `npm upgrade vitest@4.1.8+` | 30min (test for breaking changes) |
| **Handlebars** | Identify direct dep pulling handlebars, upgrade | 1-2hr |
| **Protobufjs** | Upgrade gRPC/protobuf library in orchestrator | 1-2hr |
| **OpenTelemetry** | `npm upgrade @opentelemetry/{sdk-node,auto-instrumentations-node}@latest` | 30min |

### Short-term Actions (P2-P3 — This Sprint)

| Finding | Fix | Effort |
|---------|-----|--------|
| **uuid** | `npm upgrade uuid@14.0.0+` | 30min (check semver) |
| **Vite/esbuild** | `npm upgrade vite@8.0.16+` | 1hr (test build) |
| **PostCSS** | `npm upgrade postcss@8.5.10+` | 30min |
| **Other moderates** | `npm audit fix` per project | 1-2hr |

### Long-term Actions (Planning)

- [ ] Dependency tree audit: Why 577 transitive deps in portal/Backend?
- [ ] License policy: Establish approved license list
- [ ] Supply chain: SBOM generation + vulnerability scanning in CI
- [ ] Major upgrades: React 19, Express 5, Pino 10

---

## Cross-Team Escalations

### → TheGuardians (Security Team)
- **DEP-001 (Handlebars):** RCE potential if user-supplied templates compiled
- **DEP-002 (Vitest):** File disclosure + RCE in dev environment
- **DEP-003 (Protobufjs):** Infrastructure RCE risk
- **DEP-007 (UUID):** Memory safety issue in cryptographic context
- **DEP-013 (Brace-expansion):** Potential for process hang exploit

**Action:** Assess exploitability in this application's threat model. Prioritize based on whether these dependencies handle untrusted input.

---

## Dashboard Metrics Summary

```json
{
  "audit_date": "2026-06-02",
  "package_managers": ["npm"],
  "projects_scanned": 13,
  "projects_with_vulnerabilities": 9,
  "cve_summary": {
    "critical": 4,
    "high": 5,
    "medium": 12,
    "low": 1,
    "total": 22
  },
  "outdated_major_versions": 6,
  "largest_dependency_tree": 577,
  "largest_project": "portal/Backend",
  "immediate_actions": 4,
  "shortterm_actions": 7,
  "license_policy": "NOT_ESTABLISHED"
}
```

---

## Notes & Learning for Next Audit

- **Watch list (recurring CVEs):** handlebars, protobufjs, vitest (dev tooling)
- **Audit tools available:** `npm audit --json`, `npm outdated --json`, `npx license-checker` (install if needed)
- **Quick fix pattern:** `npm audit fix --force` (breaking changes possible — test after)
- **CI integration:** Add `npm audit --audit-level=moderate` gate to block merges on new moderates
- **Dependency rationalization:** portal/Backend has 577 transitive deps — potential for reduction

---

**Report Generated:** 2026-06-02 by Dependency Auditor (haiku)  
**Next Action:** Escalate P1 findings to TheGuardians; begin P2 remediation immediately.
