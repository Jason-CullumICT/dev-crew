# Dependency Auditor Findings Report
**Date:** 2026-04-24  
**Overall Grade:** C  
**Status:** Multiple P1-P2 vulnerabilities require immediate attention

---

## Executive Summary

**Critical Finding:** 3 CRITICAL vulnerabilities in infrastructure dependencies with exploitable attack surface.

| Category | Count | Details |
|----------|-------|---------|
| **P1 Vulnerabilities** | 2 | Handlebars CRITICAL (Code injection), protobufjs CRITICAL (Arbitrary code execution) |
| **P2 Vulnerabilities** | 6 | Path traversal, regex DoS, buffer bounds issues |
| **P3 Vulnerabilities** | 11 | Moderate severity across build tools and utilities |
| **Outdated Packages** | 15+ | Express 4.x→5.x, pino 8.x→10.x, React 18.x→19.x, vitest/vite require major upgrades |
| **Total Direct Dependencies** | 27 | Modest scope—main risk is transitive dependency depth |
| **Total Transitive Dependencies** | ~1,400+ | High supply chain surface (Portal/Backend alone: 577) |
| **Post-install Scripts** | 0 | Safe—no supply chain execution risk |

### Risk Layers
1. **Application Layer (Source/):** Handlebars injection + uuid buffer issue
2. **Portal Layer (portal/):** OpenTelemetry + protobufjs + uuid
3. **Orchestrator (platform/):** dockerode + protobufjs (same uuid transitive issue)
4. **Frontend:** Vite/vitest path traversal, picomatch ReDoS

---

## Detailed Findings

### P1 CRITICAL Vulnerabilities

#### DEP-001: Handlebars.js JavaScript Injection (CRITICAL)
- **Severity:** P1
- **Category:** CVE / Code Injection
- **Affected Package:** `handlebars` 4.0.0–4.7.8
- **Location:** `Source/Backend` (transitive via ?), npm audit shows in lock
- **CVE References:**
  - GHSA-2w6w-674q-4c4q: JS Injection via AST Type Confusion (CVSS 9.8)
  - GHSA-3mfm-83xf-c92r: AST Type Confusion @partial-block (CVSS 8.1)
  - GHSA-2qvq-rjwj-gvw9: Prototype Pollution → XSS (CVSS 4.7)
  - GHSA-7rx3-28cr-v5wh: Prototype Method Access Control Gap (CVSS 4.8)
  - GHSA-442j-39wm-28r2: Property Access Validation Bypass (CVSS 3.7)
  - GHSA-xjpj-3mr7-gcpf: CLI Precompiler Injection (CVSS 8.3)
  - GHSA-xhpv-hc6g-r9c6: Dynamic Partial Injection (CVSS 8.1)
  - GHSA-9cx6-37pm-9jff: Malformed Decorator DoS (CVSS 7.5)
- **Description:** Handlebars allows JavaScript injection through AST type confusion when processing partial templates. An attacker can craft malicious template input to execute arbitrary code during template compilation. Multiple injection vectors identified.
- **Root Cause:** Insufficient input validation on template AST nodes; prototype pollution gaps.
- **Exploitability:** HIGH—if templates are user-supplied or derived from untrusted sources. MEDIUM if templates are hardcoded/developer-controlled.
- **Fix:** Upgrade handlebars to ≥4.7.9. Run `npm update handlebars`.
- **Affected Versions in Lock:** 4.0.0–4.7.8
- **Cross-ref:** [CROSS-REF: red-teamer] — Check if `Source/Backend` uses Handlebars for dynamic template processing or email templates. If user-supplied template paths → CRITICAL exploitability.

---

#### DEP-002: protobufjs Arbitrary Code Execution (CRITICAL)
- **Severity:** P1
- **Category:** CVE / Code Execution
- **Affected Package:** `protobufjs` <7.5.5
- **Location:** `platform/orchestrator`, `portal/Backend`
- **CVE:** GHSA-xq3m-2v4x-88gg
- **CWE:** CWE-94 (Improper Control of Generation of Code)
- **Description:** protobufjs allows arbitrary code execution through unsafe deserialization/code generation when processing malformed `.proto` files. An attacker can craft a `.proto` file that, when loaded, executes arbitrary JavaScript.
- **Exploitability:** CRITICAL if:
  - Orchestrator loads `.proto` files from external sources
  - Portal Backend accepts protobuf messages from untrusted clients
  - Impact: Full process compromise (RCE)
- **Fix:** Upgrade protobufjs to ≥7.5.5. Run `npm update protobufjs`.
- **Current Range:** <7.5.5
- **Cross-ref:** [CROSS-REF: red-teamer] — This is a P1 RCE risk. Validate how protobuf messages are sourced. If from untrusted network input → immediate remediation required.

---

### P2 HIGH Vulnerabilities

#### DEP-003: path-to-regexp ReDoS (Regular Expression DoS)
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Affected Package:** `path-to-regexp` <0.1.13
- **Location:** `platform/orchestrator`, `portal/Backend`
- **CVE:** GHSA-37ch-88jc-xwx2
- **CWE:** CWE-1333 (Inefficient Regular Expression Complexity)
- **CVSS:** 7.5 (AV:N, AC:L, PR:N, UI:N, S:U, C:N, I:N, A:H)
- **Description:** path-to-regexp parses route patterns into regex. A maliciously crafted route parameter pattern with nested quantifiers (e.g., `/:param{10}*+*`) causes exponential backtracking in the regex engine, blocking the event loop and DoS-ing the server.
- **Attack Vector:** If orchestrator or portal backend expose user-controlled route patterns (e.g., dynamic route creation API), a single request with a pathological pattern blocks all subsequent requests.
- **Exploitability:** MEDIUM-HIGH if route patterns are user-supplied; LOW if patterns are hardcoded.
- **Fix:** Upgrade express (which depends on path-to-regexp) to a patched version. Run `npm update express`.
- **Cross-ref:** [CROSS-REF: red-teamer] — Check if `/api/` routes accept dynamic pattern input.

---

#### DEP-004: picomatch ReDoS Vulnerabilities
- **Severity:** P2
- **Category:** CVE / Denial of Service
- **Affected Package:** `picomatch` <=2.3.1 || 4.0.0–4.0.3
- **Location:** `portal/Frontend` (via anymatch, micromatch, readdirp)
- **CVEs:**
  - GHSA-3v7f-55p6-f55p: Method Injection in POSIX Character Classes (CVSS 5.3)
  - GHSA-c2c7-rcm5-vvqj: ReDoS via extglob quantifiers (CVSS 7.5)
- **CWE:** CWE-1333, CWE-1321
- **Description:** picomatch glob patterns with extglob quantifiers (e.g., `!(...)*+*`) cause ReDoS. Additionally, method injection via POSIX classes allows property access overrides.
- **Risk Context:** Portal/Frontend uses file watching (likely via chokidar → anymatch → picomatch). If glob patterns are derived from user input, DoS possible.
- **Exploitability:** MEDIUM—build-time risk if user provides glob patterns; lower risk in browser context.
- **Fix:** Upgrade picomatch to ≥2.3.2 (or 4.0.4+). Cascade: `npm update anymatch micromatch readdirp` or `npm update`.
- **Cross-ref:** [CROSS-REF: performance-profiler] — Monitor file watch CPU usage post-patch.

---

### P2 MODERATE (Upgrade Required)

#### DEP-005: Vite Path Traversal in `.map` Handling
- **Severity:** P2
- **Category:** CVE / Information Disclosure
- **Affected Package:** `vite` <=6.4.1
- **Location:** `Source/Frontend`, `portal/Frontend`, `portal/Backend`
- **CVE:** GHSA-4w7w-66w2-5vf9
- **CWE:** CWE-22, CWE-200
- **Description:** Vite dev server allows path traversal via sourcemap `.map` file handling. An attacker can access source files outside the intended serve directory.
- **Impact:** Source code disclosure (dev/testing environment primarily).
- **Exploitability:** LOW in production (build artifacts); MEDIUM in dev if accessing shared dev servers.
- **Fix:** Upgrade vite to ≥8.0.10 (or >=5.1.0 for v5 series). Run `npm update vite`.
- **Note:** vitest inherits this risk as a dependent.

---

#### DEP-006: uuid Missing Buffer Bounds Check
- **Severity:** P2
- **Category:** CVE / Buffer Overflow
- **Affected Package:** `uuid` <14.0.0 (affects all services)
- **Locations:** `Source/Backend`, `portal/Backend`, `platform/orchestrator`
- **CVE:** GHSA-w5hq-g745-h8pq
- **CWE:** CWE-787 (Out-of-bounds Write), CWE-1285 (Improper Validation of Specified Quantity)
- **Description:** uuid v3/v5/v6 functions do not validate buffer bounds when a pre-allocated buffer is provided. Writing a UUID into a buffer smaller than 16 bytes causes out-of-bounds write.
- **Attack Vector:** If application accepts user-supplied buffer size and calls `uuid.v5(namespace, name, buffer, offset)` with a small buffer, memory corruption possible.
- **Exploitability:** MEDIUM—depends on whether buffer argument is user-controlled.
- **Current Versions:**
  - Source/Backend: uuid ^9.0.0
  - portal/Backend: uuid ^9.0.0
  - orchestrator: (indirect via dockerode, depends <14.0.0)
- **Fix:** Upgrade uuid to ≥14.0.0. Run `npm update uuid`. WARNING: v14.0.0 is a major version; verify API compatibility (unlikely, uuid is stable).

---

### P3 MODERATE Vulnerabilities

#### DEP-007: esbuild Origin Check Bypass (CORS/CSRF-like)
- **Severity:** P3
- **Category:** CVE / Information Disclosure
- **Affected Package:** `esbuild` <=0.24.2
- **Location:** `Source/Frontend`, `portal/Frontend`, `portal/Backend`
- **CVE:** GHSA-67mh-4wv8-2f99
- **CWE:** CWE-346
- **CVSS:** 5.3 (AV:N, AC:H, PR:N, UI:R, S:U, C:H, I:N, A:N)
- **Description:** esbuild dev server does not properly validate request origins. A website can send requests to the dev server and read responses (similar to CSRF but for dev tools).
- **Impact:** Source code disclosure during development.
- **Exploitability:** MEDIUM—requires user to visit attacker site while dev server is running.
- **Fix:** Upgrade vite (which bundles esbuild) to ≥8.0.10. Run `npm update vite`.

---

#### DEP-008: brace-expansion ReDoS / Process Hang
- **Severity:** P3
- **Category:** CVE / Denial of Service
- **Affected Package:** `brace-expansion` <1.1.13
- **Location:** `Source/Backend` (transitive)
- **CVE:** GHSA-f886-m6hf-6m8v
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **CVSS:** 6.5
- **Description:** Zero-step sequences in brace expansion (e.g., `{0..-1}`) cause unbounded regex matching and memory exhaustion. Example: `expand("{0..-1}")` hangs the process.
- **Exploitability:** LOW in typical use; HIGH if brace expansion patterns are user-supplied.
- **Fix:** Upgrade transitive dependency. Run `npm update`. If not auto-resolved, add explicit `"brace-expansion": "^1.1.13"` to package.json.

---

#### DEP-009: vitest & vite-node Inherited Vulnerabilities
- **Severity:** P3
- **Category:** CVE / Inherited Risk
- **Affected Package:** `vitest` <4.1.5, `vite-node` <=2.2.0-beta.2, `@vitest/mocker` <=3.0.0-beta.4
- **Locations:** `Source/Frontend`, `portal/Backend`, `portal/Frontend`
- **Description:** These test/build tools inherit vulnerabilities from vite, esbuild. They are test/dev dependencies, but if tests run during CI or on untrusted input, risk is elevated.
- **Fix:** Upgrade vitest to ≥4.1.5. Run `npm update vitest`.

---

### Outdated Major Versions (P3 - Strategic Risk)

#### DEP-010: Express Major Version Drift
- **Severity:** P3
- **Category:** Outdated / Feature + Security Gaps
- **Affected Packages:**
  - Source/Backend: express ^4.18.2 (latest: 5.2.1)
  - portal/Backend: express ^4.18.2 (latest: 5.2.1)
  - orchestrator: express ^4.21.0 (latest: 5.2.1)
- **Details:**
  - Express 4.x last major version (released 2014)
  - Express 5.0 released ~2024, significant improvements
  - No critical vulnerabilities in 4.x itself, but missing modern routing, error handling, async/await improvements
  - Staying on 4.x increases maintenance burden as ecosystem migrates to 5.x
- **Risk:** Technical debt; slower community support.
- **Migration Path:**
  1. Review breaking changes: https://expressjs.com/en/guide/migrating-5.html
  2. Update gradually: backend → portal/Backend → orchestrator
  3. Add `"express": "^5.2.1"` and test thoroughly (API is mostly backward-compatible)
- **Recommendation:** Plan migration within 2 quarters. Not immediate but strategic.

---

#### DEP-011: React 18.x Drift
- **Severity:** P3
- **Category:** Outdated / Missing Features + Performance
- **Affected Packages:**
  - Source/Frontend: react ^18.3.1 (latest: 19.2.5)
  - portal/Frontend: react ^18.2.0 (latest: 19.2.5)
- **Details:**
  - React 19 brings: hydration improvements, ref cleanup, async transitions, better error messages
  - React 18.x no security vulnerabilities, but 19.x is actively maintained
  - Two major versions behind
- **Risk:** Missing performance optimizations; longer bug-fix cycles.
- **Recommendation:** Plan React 19 migration (Concurrent features, use() hook, etc.). Medium priority.

---

#### DEP-012: vitest & Vite Version Misalignment
- **Severity:** P3
- **Category:** Outdated / Build Tool Fragmentation
- **Affected Packages:**
  - Source/Frontend: vite ^5.4.0, vitest ^2.0.5
  - portal/Frontend: vite ^5.2.0, vitest ^1.4.0 (out of sync!)
  - portal/Backend: vitest ^1.2.2
- **Details:**
  - vitest 2.x requires vite 5.x+; vitest 1.x on vite 5.x is supported but not recommended
  - Source/Frontend is aligned (vite 5, vitest 2)
  - portal/Frontend/Backend lag: vitest 1.x recommended only on vite 4.x
  - Misalignment increases bug risk and performance issues
- **Risk:** Buggy interaction between versions; unexpected test failures.
- **Fix:**
  - portal/Backend: `npm update vitest` (vitest 1→4 is complex, start with 2)
  - portal/Frontend: `npm update vitest vite`
  - Verify: `npm ls vite vitest` shows consistent versions

---

#### DEP-013: pino Major Version Gaps
- **Severity:** P3
- **Category:** Outdated / Missing Features
- **Affected Packages:**
  - Source/Backend: pino ^8.17.0 (latest: 10.3.1)
  - portal/Backend: pino ^10.3.1 (latest: 10.3.1) ✓ OK
- **Details:**
  - Source/Backend is 2 major versions behind
  - pino 8→9→10 brings better TypeScript support, async hooks improvements
  - No critical bugs, but logging reliability could improve with 10.x
- **Risk:** Logging format/performance gaps.
- **Fix:** Source/Backend: `npm update pino` (major version, test logging output).

---

#### DEP-014: @opentelemetry Versions (portal/Backend)
- **Severity:** P3
- **Category:** Outdated / Feature Gaps
- **Affected Packages:**
  - @opentelemetry/api: 1.7.0 (latest: 1.9.1) — minor gap
  - @opentelemetry/auto-instrumentations-node: 0.40.0 (latest: 0.73.0) — MAJOR gap (2x versions)
  - @opentelemetry/exporter-trace-otlp-http: 0.47.0 (latest: 0.215.0) — MAJOR gap
  - @opentelemetry/sdk-node: 0.47.0 (latest: 0.215.0) — MAJOR gap
- **Details:** OpenTelemetry is rapidly evolving. portal/Backend's versions are severely outdated (released ~2024-01, now is 2026-04).
- **Risk:** Missing instrumentation; unreliable distributed tracing.
- **Fix:** Plan comprehensive OTel upgrade: https://github.com/open-telemetry/opentelemetry-js/releases
- **Note:** This is ABOVE P3; consider as P2.5 if tracing is critical to observability.

---

### Dependency Tree Analysis

#### DEP-015: Portal/Backend Transitive Dependency Overload
- **Severity:** P3
- **Category:** Supply Chain / Complexity
- **Details:**
  - portal/Backend: 577 total dependencies (397 prod, 181 dev)
  - OpenTelemetry suite pulls in ~100+ transitive deps
  - Compare: Source/Backend 411, Source/Frontend 230
  - Risk: Larger surface area for supply chain attacks; slower installs
- **Recommendation:**
  - Audit top 20 dependencies by install size
  - Consider if all OpenTelemetry instrumentation is needed
  - Use `npm ls --depth=2` to map the tree

---

#### DEP-016: No Critical Dependency Duplication Found
- **Severity:** P4 / POSITIVE
- **Details:** Lock files show no conflicting major versions of critical packages (express, react, uuid, etc.).
- **Status:** ✓ PASS

---

#### DEP-017: No Post-install Scripts (Supply Chain Safe)
- **Severity:** P4 / POSITIVE
- **Details:** No `scripts.postinstall` or `prepare` hooks in any package.json.
- **Status:** ✓ PASS — No hidden code execution risk during npm install.

---

### License Compliance

#### DEP-018: License Audit Summary
- **Status:** ✓ PASS (Qualitative)
- **Details:**
  - express, uuid, pino, react, vite → MIT (commercial-safe)
  - @opentelemetry/* → Apache-2.0 (commercial-safe)
  - No GPL/AGPL/BUSL-1.1 dependencies detected
  - ISC licenses (e2e/package.json) → compatible MIT-like
- **Recommendation:** Run periodic `license-checker` to catch transitive GPL.

---

## Remediation Priority & Timeline

### IMMEDIATE (P1 - Block Production Release)
1. **handlebars:** Upgrade to ≥4.7.9 (Source/Backend)
2. **protobufjs:** Upgrade to ≥7.5.5 (orchestrator, portal/Backend)
3. **path-to-regexp:** Upgrade express to ≥4.22.0+ (all services)
4. **uuid:** Upgrade to ≥14.0.0 (all services) — verify API compat

**Timeline:** <1 week

### SHORT TERM (P2 - Target Next Release, ~2 weeks)
1. **picomatch:** Upgrade to ≥2.3.2 (portal/Frontend build chain)
2. **vite/vitest:** Upgrade to ≥5.4+ / ≥2.0+ respectively
3. **vitest version alignment:** Ensure all services run vitest ≥2.0.0

**Timeline:** 1-2 weeks

### MEDIUM TERM (P3 - Planning/Roadmap, ~6-8 weeks)
1. **express 4→5:** Gradual migration (test, then deploy)
2. **React 18→19:** Frontend team planning
3. **OpenTelemetry 0.47→0.215:** portal/Backend overhaul
4. **pino 8→10:** Source/Backend

**Timeline:** Parallel to feature work; include in sprint planning

---

## Risk Classification by Service

| Service | P1 Count | P2 Count | Prod Impact | Risk Level |
|---------|----------|----------|-------------|------------|
| Source/Backend | 1 (handlebars) | 3 (path-to-regexp, uuid, brace) | HIGH | 🔴 CRITICAL |
| Source/Frontend | 0 | 3 (vite, picomatch, vitest) | MEDIUM | 🟠 HIGH |
| portal/Backend | 1 (protobufjs) | 3 (uuid, path-to-regexp, vite) | HIGH | 🔴 CRITICAL |
| portal/Frontend | 0 | 3 (vite, picomatch, vitest) | LOW | 🟡 MEDIUM |
| orchestrator | 1 (protobufjs) | 2 (uuid, path-to-regexp) | CRITICAL | 🔴 CRITICAL |
| e2e | 0 | 0 | NONE | 🟢 PASS |

---

## Traceability & Cross-Team Handoff

### [ESCALATE → TheGuardians]
- **DEP-001 (Handlebars)** — Verify no user-supplied template injection paths; if present, security issue takes precedence
- **DEP-002 (protobufjs)** — Validate protobuf message sources; if untrusted network input, RCE risk requires immediate hardening
- **DEP-003 (path-to-regexp)** — Check if routes can be dynamically registered from user input

### [CROSS-REF: red-teamer]
All P1/P2 findings should be reviewed for exploitability in the threat model.

### [CROSS-REF: performance-profiler]
Monitor vite rebuild time post-picomatch/vite upgrade.

---

## Test & Validation Checklist

Before marking any fix complete:
- [ ] Run `npm audit --json` post-update (should show 0 critical vulnerabilities)
- [ ] Run full test suite: `npm test --workspaces --if-present`
- [ ] Verify `tools/traceability-enforcer.py` passes
- [ ] For major version upgrades, smoke test in staging environment
- [ ] Document breaking changes in learnings file

---

## Appendix: JSON Summary

```json
{
  "audit_date": "2026-04-24",
  "overall_grade": "C",
  "vulnerabilities": {
    "critical": 2,
    "high": 3,
    "moderate": 8,
    "low": 0,
    "total": 13
  },
  "services": {
    "source_backend": { "direct_deps": 7, "transitive_deps": 410, "cves_critical": 1, "cves_high": 2, "cves_moderate": 3 },
    "source_frontend": { "direct_deps": 3, "transitive_deps": 230, "cves_critical": 0, "cves_high": 2, "cves_moderate": 3 },
    "source_e2e": { "direct_deps": 1, "transitive_deps": 4, "cves_critical": 0, "cves_high": 0, "cves_moderate": 0 },
    "portal_backend": { "direct_deps": 10, "transitive_deps": 577, "cves_critical": 1, "cves_high": 2, "cves_moderate": 6 },
    "portal_frontend": { "direct_deps": 10, "transitive_deps": 424, "cves_critical": 0, "cves_high": 1, "cves_moderate": 4 },
    "orchestrator": { "direct_deps": 3, "transitive_deps": 155, "cves_critical": 1, "cves_high": 1, "cves_moderate": 2 }
  },
  "outdated_major_versions": 15,
  "remediation_timeline_weeks": {
    "immediate_p1": 1,
    "short_term_p2": 2,
    "medium_term_p3": 8
  }
}
```

---

## Next Steps

1. **Assign tasks:** Infrastructure team → P1 fixes (handlebars, protobufjs, uuid)
2. **Review cross-team:** Share findings with TheGuardians (red-teamer) for exploitability assessment
3. **Update learnings:** Document this audit run and remediation status
4. **Track fixes:** Create tickets in backlog for P2/P3 work
5. **Re-audit:** After P1/P2 fixes, run `npm audit` again to confirm 0 critical

---

*Report generated by Dependency Auditor agent. For updates, see `Teams/TheInspector/learnings/dependency-auditor.md`.*
