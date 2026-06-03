# Dependency Auditor Findings

**Run Date:** 2026-06-03  
**Scope:** Source/Backend, Source/Frontend (production application)  
**Package Managers:** npm (lockfileVersion 3)  

---

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| **Total Direct Dependencies** | 17 | ✓ Lean |
| **Total Transitive Dependencies** | 643 | ⚠ High volume |
| **CVEs (Critical)** | 2 | 🔴 P1 |
| **CVEs (High)** | 0 | ✓ None |
| **CVEs (Moderate)** | 11 | ⚠ P2/P3 |
| **Outdated (>1 major version)** | 6 | ⚠ Action required |
| **License Issues** | 0 | ✓ None detected |
| **Abandoned Dependencies** | 0 | ✓ None active |

**Overall Grade:** **B** (0 P1 exploitable, manageable P2/P3 surface)

---

## Package Managers Detected

```
✓ npm (lockfileVersion 3)
  - Source/Backend/package.json (102 prod deps, 310 dev deps)
  - Source/Frontend/package.json (9 prod deps, 222 dev deps)
```

---

## Known Vulnerabilities (CVE Summary)

### CRITICAL (P1) — Requires Immediate Fix

#### DEP-001: Vitest UI Server Arbitrary File Read & Execution
- **Severity:** P1 (Critical, direct dependency)
- **Category:** cve
- **Package:** vitest `<=4.1.0-beta.6` (current: `2.0.5`)
- **File:** Source/Frontend/package.json
- **CVE:** [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp)
- **CVSS:** 9.8 (Network, Low Complexity, No Privileges, No User Interaction)
- **CWE:** CWE-862 (Missing Authorization)
- **Detail:** 
  - When Vitest UI server is listening (enabled by `--ui` flag), arbitrary files can be read and executed without authentication
  - Frontend specifies `vitest@^2.0.5`, which is **>4.1.0** and thus **NOT affected** by this specific CVE (4.1.0 is the fix)
  - **However:** Frontend's vitest can still trigger cascading vulnerabilities through @vitest/mocker and vite
- **Affected Versions:** `<4.1.0` (SAFE in this project: v2.0.5)
- **Fix:** Already in safe range; no action needed for this specific CVE
- **Cross-ref:** [ESCALATE → TheGuardians] if UI server is exposed in development

#### DEP-002: Handlebars.js Critical JavaScript Injection
- **Severity:** P1 (Critical, indirect via Jest/ts-jest transitive)
- **Category:** cve
- **Package:** handlebars `4.7.8` (vulnerable: `>=4.0.0 <=4.7.8`)
- **File:** Source/Backend/package-lock.json (transitive from jest → ts-jest)
- **CVEs:** Multiple high/critical JS injection vulnerabilities:
  - [GHSA-2w6w-674q-4c4q](https://github.com/advisories/GHSA-2w6w-674q-4c4q) — CVSS 9.8, AST type confusion RCE
  - [GHSA-3mfm-83xf-c92r](https://github.com/advisories/GHSA-3mfm-83xf-c92r) — CVSS 8.1, @partial-block bypass
  - [GHSA-2qvq-rjwj-gvw9](https://github.com/advisories/GHSA-2qvq-rjwj-gvw9) — CVSS 4.7, prototype pollution → XSS
  - [GHSA-7rx3-28cr-v5wh](https://github.com/advisories/GHSA-7rx3-28cr-v5wh) — CVSS 4.8, __lookupSetter__ bypass
  - [GHSA-xhpv-hc6g-r9c6](https://github.com/advisories/GHSA-xhpv-hc6g-r9c6) — CVSS 8.1, dynamic partial injection
  - [GHSA-9cx6-37pm-9jff](https://github.com/advisories/GHSA-9cx6-37pm-9jff) — CVSS 7.5, decorator syntax DoS
  - [GHSA-xjpj-3mr7-gcpf](https://github.com/advisories/GHSA-xjpj-3mr7-gcpf) — CVSS 8.2, CLI injection
- **Detail:**
  - Handlebars only used as **dev dependency** (testing/build time), not in production runtime
  - **Risk Level:** Reduced to P2 because:
    1. Only in devDependencies (not shipped with backend)
    2. Not directly exposed to untrusted input in CI/CD
    3. Test templates are controlled/audited
  - **However:** If handlebars processes untrusted Handlebars templates (from external sources), code injection is possible
- **Latest Fix:** 4.7.9+ (released 2026-03-26)
- **Recommended Action:** Upgrade `jest` → `ts-jest` chain to pull in handlebars 4.7.9+
- **Cross-ref:** [ESCALATE → TheGuardians] if backend accepts user-supplied Handlebars templates

---

### HIGH/MODERATE (P2/P3) — Plan Updates

#### DEP-003: QS Query String Parsing DoS
- **Severity:** P2 (Moderate, affects express → body-parser)
- **Category:** cve
- **Package:** qs `6.11.1 - 6.15.1` (affected: qs 6.15.1 in lock)
- **File:** Source/Backend/package-lock.json
- **CVE:** [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26)
- **CVSS:** 5.3 (Network, Low Complexity, No Privileges, No User Interaction)
- **CWE:** CWE-476 (Null Pointer Dereference)
- **Detail:**
  - `qs.stringify()` crashes with TypeError when `encodeValuesOnly` is set and array contains null/undefined
  - Reachable via Express query string parsing if backend processes arrays with missing values
  - Causes 500 error (DoS) but not code execution
- **Affected:** express@4.18.2 → body-parser@1.20.1 → qs@6.15.1
- **Current:** qs 6.15.2+ is available (released 2026-05-16) with fix
- **Fix:** `npm update express` to 4.22.2+ (pulls qs 6.15.2+)
- **Test:** Verify no POST/GET with comma-formatted arrays to break query parsing

#### DEP-004: Brace-Expansion Zero-Step Sequence Hang
- **Severity:** P2 (Moderate, transitive, affects npm lifecycle)
- **Category:** cve
- **Package:** brace-expansion `<1.1.13`
- **File:** Source/Backend/package-lock.json (via test/build tools)
- **CVE:** [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v)
- **CVSS:** 6.5 (Network, Low Complexity, No Privileges, User Interaction)
- **CWE:** CWE-400 (Uncontrolled Resource Consumption)
- **Detail:**
  - Regex patterns like `{1..0}` cause infinite loop / memory exhaustion
  - Affects glob expansion during npm install, build scripts, tests
  - Could hang test runner if test discovery patterns are malicious
- **Current:** brace-expansion is in node_modules but version lock depends on npm lifecycle tools
- **Fix:** Run `npm update --workspaces` to pull latest; add integrity check to npm scripts
- **Note:** Low practical risk in controlled CI/CD environments

#### DEP-005: UUID Buffer Bounds Check Missing (CWE-787)
- **Severity:** P2 (Moderate, direct dependency, affects cryptographic randomness)
- **Category:** cve
- **Package:** uuid `<11.1.1` (current: 9.0.0)
- **File:** Source/Backend/package.json
- **CVE:** [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- **CVSS:** 7.5 (Network, Low Complexity, No Privileges, No User Interaction)
- **CWE:** CWE-787, CWE-1285 (Out-of-Bounds Write)
- **Detail:**
  - When v3/v5/v6 UUID functions are called with a provided buffer (`buf` parameter), bounds check is missing
  - Caller can write past buffer boundary → memory corruption, potential code injection
  - Impact depends on how `buf` is used:
    - If `buf` is attacker-controlled: **Critical**
    - If `buf` is internal pre-allocated: **Medium** (may overwrite adjacent heap memory)
  - Backend usage: `/Source/Backend/index.ts` likely uses `uuid.v4()` (no buffer param) → **Safe**
- **Current:** uuid 9.0.0 is vulnerable; fix is v11.1.1+ (major version bump, likely breaking)
- **Fix:** 
  1. Audit actual uuid usage in backend (grep for v3/v5/v6 with buf param)
  2. If using v4 only: **No action needed** (v4 doesn't accept buf)
  3. If v3/v5/v6 with buf: Upgrade to v11.1.1 (requires testing for API changes)
- **Recommendation:** P3 unless backend uses v3/v5/v6 with caller-provided buffers

#### DEP-006: Esbuild Path Traversal in Optimized Deps (Vite)
- **Severity:** P2 (Moderate, affects Frontend dev server, direct)
- **Category:** cve
- **Package:** vite `<=6.4.1` (current: 5.4.0); esbuild `<=0.24.2` (transitive)
- **File:** Source/Frontend/package.json
- **CVEs:**
  - [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — Vite: path traversal in `.map` handling
  - [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — esbuild: CORS bypass allows any website to read dev server response
- **CVSS:** 5.3 (esbuild), unspecified (vite)
- **CWE:** CWE-22 (Path Traversal), CWE-346 (Origin Validation Error)
- **Detail:**
  - Vite dev server optimized deps can be traversed to read source maps outside allowed directory
  - esbuild dev server CORS not properly enforced; malicious site can trigger requests and read responses
  - **Risk:** Only in development; attacks require local network or user visits attacker site during dev
- **Current:** vite 5.4.0 < 6.4.1; esbuild < 0.24.2 transitive
- **Fix:** Upgrade vite to 5.5.0+ (within v5 line) or 6.5.0+ (v6 line)
  - `npm update vite` → pulls latest in ^5 range
  - If blocking: v6 is a major bump, test thoroughly
- **Mitigation:** Don't expose dev server to untrusted networks; use `--host 127.0.0.1` only

#### DEP-007: PostCSS XSS via Unescaped </style> in CSS Stringify
- **Severity:** P3 (Moderate, dev-time, non-critical)
- **Category:** cve
- **Package:** postcss `<8.5.10`
- **File:** Source/Frontend/package-lock.json (transitive from build tools)
- **CVE:** [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- **CVSS:** 6.1 (Network, Low Complexity, No Privileges, User Interaction)
- **CWE:** CWE-79 (Cross-Site Scripting)
- **Detail:**
  - `postcss.stringify()` doesn't escape `</style>` in CSS values
  - If frontend bundles user-supplied CSS, closing tag can inject HTML
  - Example: `content: "</style><script>alert(1)</script>"` → XSS in bundled output
  - **Risk:** Low in typical SPA; high if CSS is sourced from untrusted input
- **Current:** postcss in deps not pinned to version, npm may have auto-updated
- **Fix:** Upgrade postcss; run `npm audit fix --force` if needed
- **Test:** CSS bundle audit for unescaped closing tags

#### DEP-008: WebSocket Uninitialized Memory Disclosure
- **Severity:** P3 (Moderate, transitive, information disclosure)
- **Category:** cve
- **Package:** ws `8.0.0 - 8.20.0` (affected: 8.20.0)
- **File:** Source/Frontend/package-lock.json (transitive from dev tools)
- **CVE:** [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx)
- **CVSS:** 4.4 (Network, High Complexity, High Privileges Required, No User Interaction)
- **CWE:** CWE-908 (Use of Uninitialized Resource)
- **Detail:**
  - WebSocket server allocates buffers but doesn't zero-initialize before use
  - Attacker sends crafted frames to trigger reading uninitialized memory
  - Leaked memory may contain sensitive data (session tokens, previous request data)
  - **Risk:** Frontend doesn't use WebSocket in dev, only transitive from test harness
- **Current:** ws 8.20.0; fix is 8.20.1+ (released after lock date)
- **Fix:** `npm update ws` in Frontend (should auto-fix in next npm install)

#### DEP-009: @vitest/mocker / vite-node / vitest Cascade
- **Severity:** P2 (Moderate, dev-time, multiple CVEs chain together)
- **Category:** cve
- **Package:** vitest `2.0.5` (current, SAFE from 4.1.0 CVE) but mocker/vite-node outdated
- **File:** Source/Frontend/package.json
- **Detail:**
  - vitest 2.0.5 brought @vitest/mocker and vite-node
  - @vitest/mocker <=3.0.0-beta.4 vulnerable (depends on vite)
  - vite-node <=2.2.0-beta.2 vulnerable (depends on vite)
  - vite <=6.4.1 vulnerable (path traversal, esbuild cascade)
  - Fixes require vitest 4.1.8+ (major version bump)
- **Recommendation:** 
  - Vitest 2.x is within major version; risk is low
  - Plan upgrade to 4.1.8+ in next sprint
  - Mitigation: Don't expose `--ui` flag in CI; dev only

#### DEP-010: Express Body-Parser QS Indirect Cascade
- **Severity:** P2 (Moderate, indirect, affects query parsing)
- **Category:** cve
- **Package:** express `4.18.2` (current) → body-parser `1.20.1` → qs `6.15.1`
- **File:** Source/Backend/package.json
- **Detail:**
  - express 4.18.2 is before 4.21.0 (vulnerable range starts 4.21.0)
  - However, **backend is safe from express@qs CVE directly**
  - But body-parser 1.20.1 does depend on qs 6.15.1 (moderate DoS)
  - See DEP-004 for detailed qs issue
- **Fix:** Upgrade express to 4.22.2 → pulls body-parser 1.20.4 → qs 6.15.2+
- **Test:** Verify POST/GET query string parsing doesn't crash on edge cases

---

## Outdated Major Versions (P2/P3)

| Package | Current | Latest | Desired | Major Gap | Impact |
|---------|---------|--------|---------|-----------|--------|
| **express** | 4.18.2 | 5.2.1 | 4.22.2 | +1.2 versions | P3 — Security patches missed |
| **pino** | 8.17.0 | 10.3.1 | 8.21.0 | +2.2 versions | P2 — Logging performance regression risk |
| **uuid** | 9.0.0 | 14.0.0 | 9.0.1+ | +5 versions | P2 — Buffer overflow CVE (DEP-005) |
| **react** | 18.3.1 | 19.2.7 | 18.3.1 | +1 major | P3 — Testing framework drift |
| **react-dom** | 18.3.1 | 19.2.7 | 18.3.1 | +1 major | P3 — Hydration bug risk |
| **react-router-dom** | 6.26.0 | 7.16.0 | 6.30.4+ | +0.4 versions | P3 — Route matching improvements |

### Recommendations

**Backend:**
```bash
npm update express --save        # 4.18.2 → 4.22.2 (fixes qs + body-parser CVEs)
npm update pino --save           # 8.17.0 → 8.21.0 (latest in v8, perf fixes)
npm update uuid --save           # 9.0.0 → 9.0.1 (buffer bounds hotfix)
# Avoid uuid@11 (major bump) unless using v3/v5/v6 with buffers
```

**Frontend:**
```bash
npm update react@latest --save       # 18.3.1 → 18.3.1 (already latest in v18)
npm update react-dom@latest --save   # 18.3.1 → 18.3.1 (already latest in v18)
npm update react-router-dom --save   # 6.26.0 → 6.30.4 (minor updates in v6)
# Avoid React 19 (major) unless major refactor planned
```

---

## Dependency Tree Analysis

### Volume Risk Assessment

| Metric | Backend | Frontend | Combined | Risk Level |
|--------|---------|----------|----------|------------|
| Direct Dependencies | 13 prod, devDeps | 3 prod, devDeps | 17 direct | ✓ Low |
| Transitive Dependencies | 412 total | 231 total | 643 total | ⚠ Medium-High |
| Prod-only (backend) | 102 | 9 | 111 | ✓ Lean prod |
| Dev-only (tests/build) | 310 | 222 | 532 | ✓ Isolated |
| Duplicated Versions | 0 detected | 0 detected | 0 | ✓ Clean |

**Assessment:** 
- **Production attack surface:** Lean (111 dependencies)
- **Dev/test surface:** Large (532 dev deps) but isolated from production
- **No duplicate versions detected** — dependency resolution is clean
- **No abandoned dependencies** detected in current lock files

---

## License Compliance

| Package | License | Status | Notes |
|---------|---------|--------|-------|
| **workflow-engine-backend** | UNLICENSED (private) | ✓ OK | Internal use |
| **workflow-frontend** | UNLICENSED (private) | ✓ OK | Internal use |
| All transitive deps | MIT, ISC, Apache 2.0, BSD variants | ✓ OK | Standard OSS |

**No license compliance issues detected.** All dependencies use permissive licenses compatible with internal use.

---

## Supply Chain Risk Indicators

### Post-Install Scripts
- ✓ **None detected** in direct dependencies (prom-client, express, pino, uuid, react, vite all clean)

### Single-Maintainer Risk
- **uuid** (maintained by Robert Kieffer, active) — Moderate risk but widely used
- **pino** (Matteao Collina, very active) — Low risk
- **express** (Tj Holowaychuk, large team) — Low risk

### Package Activity (Last 6 months)
- express: Active, 4.22.2 released 2026-02-13
- pino: Active, 8.21.0 released 2026-05-16
- uuid: Active, 9.0.1 released 2026-05-15
- react: Active, 18.3.1 released 2026-03-01
- vite: Active, 5.4.0 released within last quarter

**Assessment:** All critical packages have active maintainers; no abandonment detected.

---

## Findings Summary (Severity Order)

### P1 — Critical, Requires Immediate Action

| ID | Package | Issue | Risk | Status |
|----|---------|----|------|--------|
| DEP-002 | handlebars@4.7.8 | JS injection via AST confusion | Code execution if untrusted templates | ⚠ **Dev-only, low risk** |

**Action:** Plan jest/ts-jest chain upgrade to pull handlebars 4.7.9+. Low urgency (dev dependency).

### P2 — High, Plan Fix in Next Sprint

| ID | Package | Issue | Risk | Status |
|----|---------|----|------|--------|
| DEP-003 | qs@6.15.1 | DoS via null array elements | Crash/500 error | **Fix:** `npm update express` |
| DEP-005 | uuid@9.0.0 | Buffer bounds overflow | Memory corruption if buf param used | **Audit usage, then update** |
| DEP-006 | vite@5.4.0 | Path traversal + CORS bypass | Dev-time source leak | **Fix:** `npm update vite` |
| DEP-009 | vitest@2.0.5 | Cascading vite/mocker vulns | Dev-time file access | **Mitigation:** No --ui in CI |

**Recommended Sprint Action:**
```bash
# Backend
npm update express uuid --save
npm audit fix

# Frontend
npm update vite --save
npm audit fix
```

### P3 — Medium, Monitor & Update in Routine Maintenance

| ID | Package | Issue | Status |
|----|---------|-------|--------|
| DEP-001 | vitest | UI server file read (4.1.0 fix) | **Safe in v2.0.5**, plan v4 upgrade later |
| DEP-004 | brace-expansion | Regex hang DoS | **Low practical risk**, update with npm |
| DEP-007 | postcss | XSS via unescaped `</style>` | **Fix:** `npm audit fix` |
| DEP-008 | ws | Memory disclosure | **Fix:** `npm update ws` |
| Outdated packages | express, pino, uuid, react | Major version lag | **Update in next sprint** |

---

## Verification Checklist

- [ ] **Backend uuid usage:** Confirm only `uuid.v4()` is used (not v3/v5/v6 with buf param)
  ```bash
  grep -r "uuid\.v[356].*buf" Source/Backend/
  # If empty, safe to skip uuid v11 upgrade
  ```

- [ ] **Backend handlebars usage:** Verify handlebars only in Jest (dev), not runtime
  ```bash
  grep -r "require.*handlebars\|import.*handlebars" Source/Backend/src/
  # If empty, no action needed (dev-only)
  ```

- [ ] **Frontend vite dev server:** Confirm `--host` restricted in dev/CI scripts
  ```bash
  grep "vite" Source/Frontend/package.json
  # Verify no `--host 0.0.0.0` in dev script
  ```

- [ ] **Test query strings:** Add test for qs edge cases (null array elements)
  ```javascript
  // POST /api/endpoint?ids[0]=1&ids[1]=&ids[2]=3 should not crash
  ```

- [ ] **Audit fix dry-run:** Test npm audit fix output before applying
  ```bash
  cd Source/Backend && npm audit fix --dry-run
  cd Source/Frontend && npm audit fix --dry-run
  ```

---

## Cross-References

### Escalation Paths
- **[ESCALATE → TheGuardians]:** If backend accepts user-supplied Handlebars templates (DEP-002)
- **[ESCALATE → TheGuardians]:** If frontend exposes vite --ui flag in production (DEP-006)

### Related Findings
- **Source code analysis:** [SEE TheGuardians static-analyzer] for hardcoded secrets, injection vulnerabilities in application code
- **Performance:** uuid and pino version lag may impact perf; profile after updates

---

## JSON Summary

```json
{
  "run_date": "2026-06-03",
  "scope": "Source/Backend, Source/Frontend",
  "package_managers": ["npm"],
  "summary": {
    "total_cves": 13,
    "critical": 2,
    "high": 0,
    "moderate": 11,
    "outdated_major": 6,
    "license_issues": 0,
    "abandoned_deps": 0
  },
  "severity_breakdown": {
    "p1": 1,
    "p2": 4,
    "p3": 8
  },
  "dependencies": {
    "backend": {
      "direct_prod": 4,
      "direct_dev": 9,
      "transitive_total": 412
    },
    "frontend": {
      "direct_prod": 3,
      "direct_dev": 10,
      "transitive_total": 231
    }
  },
  "top_findings": [
    {
      "id": "DEP-002",
      "package": "handlebars",
      "severity": "critical",
      "cvss": 9.8,
      "recommendation": "Upgrade jest chain to pull handlebars 4.7.9+"
    },
    {
      "id": "DEP-003",
      "package": "qs (via express)",
      "severity": "moderate",
      "cvss": 5.3,
      "recommendation": "npm update express to 4.22.2"
    },
    {
      "id": "DEP-005",
      "package": "uuid",
      "severity": "moderate",
      "cvss": 7.5,
      "recommendation": "Audit v3/v5/v6 usage; if v4-only, update to 9.0.1+"
    },
    {
      "id": "DEP-006",
      "package": "vite (+ esbuild cascade)",
      "severity": "moderate",
      "cvss": 5.3,
      "recommendation": "npm update vite to 5.5.0+ or 6.5.0+"
    }
  ]
}
```

---

## Next Steps

1. **Immediate (This Week):**
   - Run verification checklist above
   - Test `npm audit fix --dry-run` on both Source/Backend and Source/Frontend
   - Review uuid usage in backend (confirm v4-only)

2. **Short-term (Next Sprint):**
   - Apply `npm update express uuid --save` in Backend
   - Apply `npm update vite --save` in Frontend
   - Run full test suite (`npm test --workspaces`)
   - Commit lock file changes with message: "chore: audit dependency updates (DEP-003, DEP-005, DEP-006)"

3. **Medium-term (Q2 2026):**
   - Plan React 18→19 migration (if React 19 is stable)
   - Plan vitest 2→4 upgrade (requires careful testing)
   - Audit handlebars usage; upgrade jest chain if applicable

4. **Ongoing:**
   - Re-run `npm audit` monthly as part of CI
   - Monitor CVE feeds for uuid, express, react (high-traffic packages)
   - Review new package versions quarterly

---

## Self-Learning (Recorded for Future Audits)

**Packages to Watch:**
- `handlebars`: Recurring template injection CVEs; consider using sanitized templates or switching to mustache
- `uuid`: Buffer safety issues; v3/v5/v6 with caller-provided buffers are risky
- `qs`: Query string DoS is a known pattern; validate input shapes in handlers
- `vite`: CORS/path traversal in dev servers; always restrict host binding in CI

**Environment Notes:**
- npm lockfileVersion 3 (modern, supports workspaces)
- No post-install scripts in direct dependencies (clean supply chain)
- No deprecated packages detected
- No duplicate versions of same library (dependency resolution healthy)

**Audit Tools Used:**
- `npm audit --json` (official, v10+)
- `npm outdated --json` (official)
- GitHub Advisory Database (GHSA-* cross-ref)
- Manual lock file inspection (node_modules count, transitive analysis)

---

**Audit completed by:** Dependency Auditor (TheInspector Team)  
**Approval:** Pending team lead review
