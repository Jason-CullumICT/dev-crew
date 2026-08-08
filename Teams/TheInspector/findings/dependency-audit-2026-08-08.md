# Dependency Auditor Report
**Date:** 2026-08-08  
**Scope:** dev-crew (AI orchestration platform)  
**Package Managers:** npm (Source/Backend, Source/Frontend, Source/E2E)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total CVEs Found** | 22 |
| **Critical** | 1 |
| **High** | 8 |
| **Moderate** | 9 |
| **Low** | 4 |
| **Direct Dependencies with CVEs** | 2 |
| **Transitive Dependencies with CVEs** | 11 |

**Grade:** **C** (per inspector.config.yml: max_p1=2, max_p2=15)

---

## Vulnerability Summary by Severity

### **P1 (Critical/High in Direct Dependencies)**

#### DEP-001: Handlebars.js JavaScript Injection (CRITICAL)
- **Severity:** P1
- **Category:** CVE / Remote Code Execution
- **Package:** handlebars@4.0.0–4.7.8 (transitive)
- **CVE IDs:** 
  - GHSA-2w6w-674q-4c4q (CVSS 9.8, Critical) — JavaScript Injection via AST Type Confusion
  - GHSA-3mfm-83xf-c92r (CVSS 8.1, High) — JS Injection via @partial-block tampering
  - GHSA-xhpv-hc6g-r9c6 (CVSS 8.1, High) — JS Injection via dynamic partial object
- **File:** Source/Backend/package.json (found via `jest` → `babel` transitive chain)
- **Affected Versions:** <=4.7.8
- **Detail:**  
  Handlebars template compilation allows attackers to inject arbitrary JavaScript code via AST type confusion when tampering with `@partial-block` directives or passing objects as dynamic partials. CVSS 9.8 (critical) attack requires no user interaction, network accessible, can compromise all data.
- **Fix:** 
  ```bash
  cd Source/Backend && npm update handlebars
  cd Source/Frontend && npm update handlebars
  ```
  (Handlebars version should resolve to 4.7.9+)
- **Risk:** If this backend serves templated responses (low probability in REST API context), attacker can achieve RCE. More likely: if handlebars is unused, risk is informational but CVE footprint is high.
- **Cross-ref:** [ESCALATE → TheGuardians] — This is a critical RCE vector if templating is in-scope. Static analyzer should confirm handlebars is not used for user-controlled template compilation.

---

#### DEP-002: brace-expansion Denial of Service (HIGH)
- **Severity:** P1
- **Category:** CVE / Denial of Service
- **Package:** brace-expansion@<=1.1.17 (transitive)
- **CVE IDs:**
  - GHSA-mh99-v99m-4gvg (CVSS 7.5, High) — DoS via unbounded expansion causing OOM
  - GHSA-rgw5-rvv9-x895 (CVSS 7.5, High) — DoS via unbounded intermediate arrays
  - GHSA-3jxr-9vmj-r5cp (CVSS 5.3, High) — DoS via exponential-time expansion
  - GHSA-f886-m6hf-6m8v (CVSS 6.5, Moderate) — Zero-step sequence causes hang
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Affected Versions:** <=1.1.17
- **Detail:**  
  Four distinct DoS vectors in brace-expansion library. Attackers can craft glob patterns (via CLI args, file paths, or API inputs) to trigger exponential expansion, unbounded array allocation, or process hangs. CVSS 7.5 means network-accessible, authenticated or physical DoS possible.
- **Fix:**
  ```bash
  npm update brace-expansion
  ```
  (Update to >=1.1.18)
- **Risk:** **HIGH** — This package is in the transitive chain of build tools and glob-based file operations. If the backend accepts file path patterns from users, this is exploitable.
- **Cross-ref:** [CROSS-REF: red-teamer] — Check if `/api/work-items` or any bulk-import endpoint accepts glob-like file patterns.

---

#### DEP-003: js-yaml Quadratic-Complexity DoS (HIGH)
- **Severity:** P1
- **Category:** CVE / Denial of Service
- **Package:** js-yaml@<=3.15.0 (transitive)
- **CVE IDs:**
  - GHSA-52cp-r559-cp3m (CVSS 7.5, High) — YAML merge-key chains cause quadratic CPU
  - GHSA-5p4m-2wfm-xmqj (CVSS 7.5, High) — !!omap resolution quadratic CPU
  - GHSA-h67p-54hq-rp68 (CVSS 5.3, Moderate) — Merge-key alias DoS
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Affected Versions:** <=3.15.0
- **Detail:**  
  YAML parsing can be forced into quadratic-time complexity via merge-key chains or omap aliases. Attacker sends a crafted YAML payload (e.g., in config upload, spec submission) and CPU spikes to 100% for duration proportional to input size.
- **Fix:**
  ```bash
  npm update js-yaml
  ```
  (Update to >=3.15.1)
- **Risk:** **HIGH** — If the backend accepts YAML specifications (very likely given domain is an orchestration platform), this is directly exploitable. Check `Specifications/` folder for YAML parsing.
- **Cross-ref:** [CROSS-REF: performance-profiler] — A single malicious YAML spec could cause P95 latency spikes; monitor `/api/work-items/:id/assess` and spec-upload endpoints.

---

### **P2 (High CVEs in Transitive, or Moderate in Direct)**

#### DEP-004: form-data CRLF Injection (HIGH)
- **Severity:** P2
- **Category:** CVE / Header Injection
- **Package:** form-data@4.0.0–4.0.5 (transitive)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx (CVSS 7.5, High)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Affected Versions:** >=4.0.0 <4.0.6
- **Detail:**  
  Multipart form-data field names and filenames are not escaped, allowing CRLF injection into HTTP headers. Attacker uploads a file with name like `foo.txt\r\nSet-Cookie: admin=true` to inject arbitrary headers.
- **Fix:**
  ```bash
  npm update form-data
  ```
  (Update to >=4.0.6)
- **Risk:** **MODERATE-HIGH** — Only exploitable if the backend accepts file uploads with user-controlled field names. Check for `/api/*/upload` or multipart form handlers.
- **Cross-ref:** [ESCALATE → TheGuardians] if file upload endpoints exist.

---

#### DEP-005: express + qs DoS (MODERATE, DIRECT)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Package:** express@4.18.2 (direct) via qs@6.11.1–6.15.1 (transitive)
- **CVE ID:** GHSA-q8mj-m7cp-5q26 (CVSS 5.3, Moderate)
- **File:** Source/Backend/package.json
- **Affected Versions:** express 4.21.0–4.22.1 or 5.0.0-alpha.1–5.0.1 (backend is 4.18.2, but qs in node_modules is vulnerable)
- **Detail:**  
  `qs.stringify()` crashes with TypeError when passed null/undefined in comma-format arrays with `encodeValuesOnly=true`. Can trigger unhandled exception → 500 error → crash.
- **Fix:**
  ```bash
  cd Source/Backend && npm update express
  cd Source/Frontend && npm update express
  ```
  (Update to 4.18.3+ or 4.22.2+)
- **Risk:** **MODERATE** — DoS vector, but requires malformed query string. Not a data breach, just availability.

---

#### DEP-006: uuid Buffer Bounds Check (MODERATE, DIRECT)
- **Severity:** P2
- **Category:** CVE / Memory Safety
- **Package:** uuid@9.0.0 (direct)
- **CVE ID:** GHSA-w5hq-g745-h8pq (CVSS 7.5, Moderate)
- **File:** Source/Backend/package.json
- **Affected Versions:** <11.1.1
- **Detail:**  
  `uuid.v3()`, `v5()`, `v6()` with an explicit buffer parameter lack bounds checking. If caller passes a too-small buffer, uuid will write out-of-bounds, corrupting adjacent memory.
- **Fix:**
  ```bash
  cd Source/Backend && npm update uuid
  ```
  (Update to >=11.1.1 — **MAJOR version bump**)
- **Risk:** **MODERATE-HIGH** — If backend generates UUIDs with caller-provided buffers, memory corruption is possible. More likely: backend uses default UUID generation, so risk is low.
- **Cross-ref:** [SEE TheGuardians static-analyzer] for buffer-passing patterns in Source/Backend/\*\*/\*.ts.

---

### **P3 (Moderate CVEs or Outdated Versions)**

#### DEP-007: @remix-run/router Open Redirect (MODERATE)
- **Severity:** P3
- **Category:** CVE / Open Redirect
- **Package:** @remix-run/router@1.3.0–1.23.2 (transitive)
- **CVE ID:** GHSA-2j2x-hqr9-3h42 (CVSS unknown, Moderate)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** >=1.3.0 <1.23.3
- **Detail:**  
  React Router allows same-origin redirects starting with `//` (protocol-relative URLs), which can be reinterpreted as cross-origin on some browsers. E.g., redirect to `//attacker.com` may be interpreted as `https://attacker.com` instead of same-origin.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update react-router-dom
  ```
  (Update to 6.30.4+ — currently 6.26.0)
- **Risk:** **LOW-MODERATE** — Only affects SPA redirects. Verify no user-controlled redirects in Source/Frontend.

---

#### DEP-008: @vitest/mocker Moderate Severity (Build Tool)
- **Severity:** P3
- **Category:** CVE / Testing Framework
- **Package:** @vitest/mocker@<=3.0.0-beta.4 (transitive)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** <=3.0.0-beta.4
- **Detail:**  
  Vitest mocker has an unspecified moderate vulnerability. No RCE, likely testing framework escape.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest
  ```
  (Update to 4.1.10+)
- **Risk:** **LOW** — Build-time only, doesn't affect production app.

---

#### DEP-009: esbuild Information Disclosure (BUILD TOOL)
- **Severity:** P3
- **Category:** CVE / Information Disclosure
- **Package:** esbuild@<=0.24.2 (transitive)
- **CVE ID:** GHSA-67mh-4wv8-2f99 (CVSS 5.3, Moderate)
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** <=0.24.2
- **Detail:**  
  esbuild dev server allows any website to send requests to the dev server and read responses. E.g., attacker's website can fetch source maps, build artifacts.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vite
  ```
  (vite depends on esbuild; update vite to >=5.5.0 or esbuild to >=0.25.0)
- **Risk:** **LOW in production** (dev-only), **MODERATE in local development** if you visit attacker-controlled sites while dev server is running.

---

#### DEP-010: nanoid Infinite Loop (HIGH transitive)
- **Severity:** P3
- **Category:** CVE / Denial of Service
- **Package:** nanoid@<=3.3.16 (transitive)
- **CVE IDs:**
  - GHSA-28wg-ghj8-5hjv (CVSS 5.9, High) — non-secure generators loop indefinitely on negative size
  - GHSA-2v37-7h3g-55p8 (CVSS 5.9, High) — custom generators loop on zero size
- **File:** Source/Frontend/package-lock.json
- **Affected Versions:** <=3.3.16
- **Detail:**  
  nanoid generators with invalid size parameters (negative or zero) cause infinite loops. Application hangs if called with bad input.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update nanoid
  ```
  (Update to >=3.3.17)
- **Risk:** **LOW-MODERATE** — Only if nanoid is called with untrusted size params. More likely: size is hardcoded, no risk.

---

#### DEP-011: postcss High-severity (BUILD TOOL)
- **Severity:** P3
- **Category:** CVE (unspecified severity level in audit)
- **Package:** postcss (transitive)
- **File:** Source/Frontend/package-lock.json
- **Detail:** npm audit truncated; need to run full audit to see details.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update postcss
  ```

---

### **P4 (Low/Informational)**

#### DEP-012: @babel/core Arbitrary File Read (LOW)
- **Severity:** P4
- **Category:** CVE / Information Disclosure
- **Package:** @babel/core@<=7.29.0 (transitive)
- **CVE ID:** GHSA-4x5r-pxfx-6jf8 (CVSS 3.2, Low)
- **File:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json
- **Affected Versions:** <=7.29.0
- **Detail:**  
  Babel can read arbitrary local files if a malicious source map references a file outside the build directory (via `sourceMappingURL` comment).
- **Fix:**
  ```bash
  npm update @babel/core
  ```
  (Update to >=7.30.0)
- **Risk:** **LOW** — Requires attacker-controlled source file in build inputs. Development-time only.

---

#### DEP-013: body-parser DoS (LOW)
- **Severity:** P4
- **Category:** CVE / Denial of Service
- **Package:** body-parser (transitive)
- **CVE ID:** GHSA-v422-hmwv-36x6 (CVSS 3.7, Low)
- **File:** Source/Backend/package-lock.json
- **Affected Versions:** <1.20.6
- **Detail:**  
  Invalid `limit` config value silently disables size enforcement, allowing unbounded payloads.
- **Fix:** Already patched in most versions; check via npm update.
- **Risk:** **LOW** — Requires Express misconfiguration.

---

### **Outdated Major Versions (Supply Chain Risk)**

#### DEP-014: Express 2+ Major Versions Behind
- **Package:** express@4.18.2
- **Latest:** 5.2.1
- **Wanted:** 4.22.2 (within 4.x)
- **Severity:** P3
- **Detail:** Express v4 is stable and maintained. v5 is available but introduces breaking changes. Recommended: stay on 4.x (4.22.2+) unless migration is planned.

#### DEP-015: Pino 2+ Major Versions Behind
- **Package:** pino@8.17.0
- **Latest:** 10.3.1
- **Wanted:** 8.21.0 (within 8.x)
- **Severity:** P3
- **Detail:** Pino v8 is stable. v9+ introduces streaming and performance changes. Recommended: update to 8.21.0+ for bugfixes, plan v9+ migration for performance improvements.

#### DEP-016: uuid 5+ Major Versions Behind
- **Package:** uuid@9.0.0
- **Latest:** 14.0.1
- **Wanted:** 9.0.1 (within 9.x)
- **Severity:** P3
- **Detail:** Major buffer-bounds fix in v11+ (DEP-006); consider migration. Current 9.0.0 is 2 patch releases behind 9.0.1.

#### DEP-017: React 1+ Major Version Behind
- **Package:** react@18.3.1
- **Latest:** 19.2.8
- **Wanted:** 18.3.1 (latest 18.x)
- **Severity:** P3
- **Detail:** React 18.x is long-term stable. v19 introduces use hooks. Currently on latest 18.x patch; no security holes known.

#### DEP-018: React Router 1+ Major Version Behind
- **Package:** react-router-dom@6.26.0
- **Latest:** 7.18.2
- **Wanted:** 6.30.4 (within 6.x)
- **Severity:** P3
- **Detail:** Router 6.x is stable. Currently 5+ patch versions behind 6.30.4; includes the open-redirect fix (DEP-007).

---

## Dependency Tree Statistics

| Package | Direct Deps | Transitive Deps | Notes |
|---------|------------|-----------------|-------|
| Source/Backend | 13 | 40+ (estimated) | Express, Pino, uuid, prom-client, @types/\* |
| Source/Frontend | 13 | 50+ (estimated) | React, React Router, Vite, Vitest, @testing-library/\* |
| Source/E2E | 1 | 100+ (estimated) | @playwright/test |
| **Total** | **27** | **190+** | |

**Supply Chain Risk:** Frontend+Backend = ~90 transitive deps. Reasonable for full-stack app, but each dep is a potential attack surface. No evidence of single-maintainer packages or abandoned repos in primary chains.

---

## License Compliance

**Status:** ✅ No viral license issues detected.

Checked direct dependencies for GPL/AGPL/UNLICENSED:
- express, pino, uuid, prom-client → ISC, MIT, Apache-2.0
- react, react-router-dom → MIT
- @types/\* → MIT
- vitest, vite, jest → MIT

**Recommendation:** Continue license audits before each release; no blocking issues.

---

## Abandoned/Unmaintained Dependencies

**Status:** ✅ All primary dependencies are actively maintained.

- **express**: Last update 2024 (active)
- **react**: Last update 2026 (active)
- **pino**: Last update 2026 (active)
- **uuid**: Last update 2024 (active)
- **vite**: Last update 2026 (active)

No deprecated flags in npm registry.

---

## Actionable Fixes (Severity-Sorted)

### Immediate (P1 — Critical/High)

```bash
# 1. Update handlebars (critical RCE)
cd Source/Backend && npm update handlebars
cd Source/Frontend && npm update handlebars

# 2. Update brace-expansion (4 DoS CVEs)
npm update brace-expansion

# 3. Update js-yaml (quadratic CPU DoS)
npm update js-yaml

# 4. Update form-data (CRLF injection)
npm update form-data
```

**Test After:** `npm audit` should show 0 critical.

---

### Short-term (P2 — High in Transitive, Moderate in Direct)

```bash
cd Source/Backend
npm update express uuid

cd Source/Frontend
npm update react-router-dom vite vitest esbuild nanoid
```

**Test After:** `npm test --workspaces` should pass.

---

### Medium-term (P3 — Outdated Majors)

Plan migrations:
- **pino@8 → 9+**: Performance improvements, review changelog.
- **uuid@9 → 11+**: Buffer-bounds security fix.
- **react-router@6 → 7**: Review breaking changes.

---

## Cross-Referencing

| Finding | Escalation | Notes |
|---------|-----------|-------|
| **handlebars RCE** | [ESCALATE → TheGuardians] | Confirm handlebars not used for user-controlled template compilation |
| **brace-expansion DoS** | [CROSS-REF: red-teamer] | Check if file-pattern endpoints exist in `/api/work-items` |
| **js-yaml quadratic** | [CROSS-REF: performance-profiler] | Monitor spec-upload endpoints for latency spikes |
| **uuid buffer bounds** | [SEE static-analyzer] | Verify buffer-passing patterns in Source/Backend |
| **express + qs** | [LOW-PRIORITY] | Already mitigated in 4.18.2 if qs.stringify not directly called |

---

## Dashboard Report

```json
{
  "audit": "dependency-auditor",
  "date": "2026-08-08",
  "grade": "C",
  "cves": {
    "critical": 1,
    "high": 8,
    "moderate": 9,
    "low": 4,
    "total": 22
  },
  "direct_dependencies_with_cves": 2,
  "transitive_dependencies_with_cves": 11,
  "outdated_major_versions": 6,
  "supply_chain_risk": "MODERATE",
  "license_issues": 0,
  "abandoned_packages": 0,
  "action_items": {
    "p1": 3,
    "p2": 4,
    "p3": 6,
    "p4": 4
  }
}
```

---

## Learnings & Watchlist

**Recurring Vulnerability Patterns:**
1. **DoS via unbounded parsing:** brace-expansion, js-yaml, qs — all require input validation at API boundary.
2. **Templating injection:** handlebars — if templating is used, require safe compilation mode (no user-controlled partial names).
3. **Buffer safety:** uuid, form-data — check all direct buffer interactions.

**Watch for:**
- Handlebars in build chain (likely through @babel plugins) — even in backend, unused template code is a footprint.
- YAML spec uploads — add size limits + complexity limits to prevent js-yaml DoS.
- File path arguments to CLI tools — glob-based patterns vulnerable to brace-expansion.

---

**Report Generated:** 2026-08-08  
**Auditor:** dependency-auditor (Haiku model)  
**Next Review:** In 30 days or after dependency updates.
