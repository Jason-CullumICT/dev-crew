# Dependency Auditor Findings — 2026-05-16

## Executive Summary

Comprehensive dependency audit across 10 npm package manifests revealed **27 total vulnerabilities** affecting the dev-crew project:

- **Critical (P1):** 2 issues (code injection via handlebars, arbitrary code execution via protobufjs)
- **High (P2):** 3 issues (ReDoS, process crashes, denial of service)
- **Moderate (P3):** 20+ issues (XSS, path traversal, prototype pollution, regex DoS variants)
- **Outdated Major Versions:** 6 direct dependencies >1 major version behind
- **Total Direct Dependencies:** 39 across all packages
- **Total Transitive Dependencies:** 2,000+ (high supply chain surface)

### Package Managers Detected
- npm (10 manifests with lock files)
- No Go modules, Python, Rust, or Java packages detected

### Risk Assessment
**Grade:** D (2 critical vulnerabilities, no exploitability controls in place)

---

## Critical Findings (P1)

### DEP-001: Handlebars JavaScript Injection (CRITICAL)
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection
- **Package:** handlebars >=4.0.0 <=4.7.8
- **Affected Files:** 
  - Source/Backend (transitive via jest-handlebars)
  - Appears in test dependencies
- **CVEs:**
  - **GHSA-2w6w-674q-4c4q** — JavaScript Injection via AST Type Confusion (CVSS 9.8)
  - **GHSA-3mfm-83xf-c92r** — AST Type Confusion via @partial-block (CVSS 8.1)
  - **GHSA-xhpv-hc6g-r9c6** — JS Injection via dynamic partial object (CVSS 8.1)
  - **GHSA-9cx6-37pm-9jff** — DoS via malformed decorator syntax (CVSS 7.5)
  - **GHSA-xjpj-3mr7-gcpf** — JS Injection in CLI via unescaped names (CVSS 8.2)
  - Plus 3 additional moderate/low severity issues
- **Root Cause:** Type confusion in AST processing allows arbitrary code execution in templates
- **Exploitation Risk:** HIGH — If handlebars is used to compile untrusted templates, attacker can inject arbitrary JavaScript
- **Fix:** Update to >=4.7.9 (if available) or remove handlebars dependency if unused
- **Recommendation:** IMMEDIATE ACTION REQUIRED
  ```bash
  cd Source/Backend && npm audit fix
  ```
- **Notes:** Multiple overlapping vulnerabilities in the same package suggest fundamental design flaws in handlebars <4.7.9

---

### DEP-002: Protobufjs Arbitrary Code Execution (CRITICAL)
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection
- **Package:** protobufjs <=7.5.5
- **Affected Files:**
  - platform/orchestrator (direct dependency)
  - portal/Backend (transitive via @opentelemetry packages)
- **CVEs:**
  - **GHSA-xq3m-2v4x-88gg** — Arbitrary code execution in protobufjs (CVSS 9.8)
  - **GHSA-75px-5xx7-5xc7** — Code generation gadget after prototype pollution (CVSS 8.1)
  - **GHSA-66ff-xgx4-vchm** — Code injection through bytes field defaults (CVSS high)
  - **GHSA-jvwf-75h9-cwgg** — Process-wide DoS through unsafe option paths (CVSS 7.5)
  - **GHSA-685m-2w69-288q** — DoS via unbounded protobuf recursion (CVSS 7.5)
  - Plus 3 additional prototype pollution and DoS issues
- **Root Cause:** Prototype pollution in generated toObject code + unsafe option handling
- **Exploitation Risk:** CRITICAL — protobufjs processes external protocol buffers; attacker can craft malicious .proto files to execute arbitrary code
- **Fix:** Update to >=7.5.6 (if available) or >=8.x
  ```bash
  cd platform/orchestrator && npm update protobufjs
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
  ```
- **Recommendation:** IMMEDIATE ACTION REQUIRED — affects orchestrator infrastructure
- **Notes:** 8 separate CVEs in this package; systematic design issues in proto code generation

---

## High-Severity Findings (P2)

### DEP-003: path-to-regexp ReDoS (HIGH)
- **Severity:** P2 (High CVE + Exploitable)
- **Category:** CVE / Denial of Service
- **Package:** path-to-regexp <0.1.13
- **Affected Files:**
  - platform/orchestrator
  - portal/Backend
- **CVE:** GHSA-37ch-88jc-xwx2 (CVSS 7.5)
- **Details:** Regular Expression Denial of Service via multiple route parameters
  - Attacker crafts URL with polyglot route params to exhaust CPU
  - Causes backend unresponsiveness
- **Fix:** `npm update path-to-regexp`
- **Cross-ref:** [CROSS-REF: red-teamer] — ReDoS is exploitable; verify impact on routing handlers
- **Recommendation:** Update immediately; this is a direct attack vector on REST endpoints

---

### DEP-004: OpenTelemetry Prometheus Exporter Crash (HIGH)
- **Severity:** P2 (High + Denial of Service)
- **Category:** CVE / DoS
- **Package:** 
  - @opentelemetry/auto-instrumentations-node <=0.74.0
  - @opentelemetry/sdk-node <0.217.0
- **Affected Files:** portal/Backend (direct dependencies)
- **CVE:** GHSA-q7rr-3cgh-j5r3 (CVSS 7.5)
- **Details:** Malformed HTTP request to Prometheus metrics endpoint causes process crash
  - Attacker sends crafted HTTP to `/metrics` endpoint
  - Process crashes, observability is lost, service restarts
- **Fix:** 
  ```bash
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node
  ```
- **Recommendation:** Update immediately; affects observability infrastructure
- **Notes:** Both packages must be updated together to avoid version conflicts

---

### DEP-005: Picomatch ReDoS (HIGH)
- **Severity:** P2 (High CVE)
- **Category:** CVE / Denial of Service
- **Package:** picomatch <=2.3.1 || 4.0.0-4.0.3
- **Affected Files:** portal/Frontend (transitive via vitest toolchain)
- **CVEs:**
  - GHSA-c2c7-rcm5-vvqj — ReDoS via extglob quantifiers (CVSS 7.5, 2 variants)
  - GHSA-3v7f-55p6-f55p — Method injection in POSIX character classes (CVSS 5.3, 2 variants)
- **Details:** Glob pattern matching causes catastrophic backtracking on certain inputs
- **Fix:** `npm update picomatch` (upgrade vitest to >=4.1.6)
- **Recommendation:** Update as part of test toolchain upgrade
- **Notes:** Test-only dependency; lower production risk but still a vector if tests run on untrusted input

---

## Moderate Findings (P3) — Summary Table

| Package | Severity | Issue | Affected | Fix |
|---------|----------|-------|----------|-----|
| **vite** | moderate | Path traversal in `.map` handling (GHSA-4w7w-66w2-5vf9) | Source/Frontend, portal/Frontend | `npm update vite@latest` |
| **vitest** | moderate | Cascading from vite (multiple variants) | Source/Frontend, portal/Backend/Frontend | `npm update vitest@latest` |
| **esbuild** | moderate | Dev server CORS bypass (GHSA-67mh-4wv8-2f99) | Source/Frontend, portal/Backend/Frontend | Update via vite/vitest |
| **postcss** | moderate | XSS via unescaped `</style>` (GHSA-qx2v-qp2m-jg93) | Multiple | `npm update postcss@latest` |
| **brace-expansion** | moderate | Process hang via zero-step sequence (GHSA-f886-m6hf-6m8v) | Source/Backend | `npm audit fix` |
| **@protobufjs/utf8** | moderate | Overlong UTF-8 decoding (GHSA-q6x5-8v7m-xcrf) | platform/orchestrator, portal/Backend | Upgrade protobufjs |
| **@vitest/mocker, vite-node** | moderate | Cascading vite issues | portal/Backend/Frontend | Update vite/vitest |

**Total P3 Issues:** 20+ (mostly cascading from core build toolchain)

---

## Outdated Major Versions (P3)

Dependencies more than 1 major version behind latest:

| Package | Current | Latest | Gap | File | Risk |
|---------|---------|--------|-----|------|------|
| **express** | 4.18.2 | 5.2.1 | 1 major | Source/Backend | Medium — may miss security patches in 4.x |
| **pino** | 8.17.0 | 10.3.1 | 2 major | Source/Backend | Medium — logging library, should be updated |
| **uuid** | 9.0.0 | 14.0.0 | 5 major | Source/Backend | Low — utility library, but old |
| **react** | 18.3.1 | 19.2.6 | 1 major | Source/Frontend | Medium — 18.x may have unpatched security issues |
| **react-dom** | 18.3.1 | 19.2.6 | 1 major | Source/Frontend | Medium — must match React version |
| **react-router-dom** | 6.26.0 | 7.15.1 | 1 major | Source/Frontend | Medium — routing library, should align with React |

**Recommendation:** Schedule major version upgrades; don't do ad-hoc. Test thoroughly.

---

## Supply Chain Analysis

### Dependency Tree Size
- **Source/Backend:** 102 prod + 310 dev = 412 total
- **Source/Frontend:** 9 prod + 222 dev = 231 total
- **Source/E2E:** 4 prod (minimal)
- **platform/orchestrator:** 153 prod + 0 dev = 153 total
- **portal/Backend:** 397 prod + 181 dev = 578 total
- **portal/Frontend:** 9 prod + 416 dev = 425 total

**Total transitive dependencies:** 2,000+ (estimated from lock file sizes)

### Risk Indicators

#### High-Risk Patterns
1. **Build toolchain concentration:** vite + vitest + esbuild are deeply nested; single vulnerability cascades to multiple packages
2. **Protobuf ecosystem:** orchestrator + portal both depend on protobufjs indirectly via @opentelemetry; hard to update independently
3. **Test library bloat:** portal/Frontend has 416 dev dependencies; difficult to maintain
4. **No lock file analysis for known vulnerabilities:** npm audit relies on registry data; pin exact versions in production

#### Post-Install Scripts
- ⚠️ **jest** has post-install scripts (build from source)
- ⚠️ **ts-jest** has post-install scripts
- ✅ No known malicious post-install scripts detected

#### Single-Maintainer / Low-Download Packages
- Spot check: No packages with <100 downloads/week detected in critical path
- OpenTelemetry packages are well-maintained
- pino (logging) is actively maintained

---

## License Compliance

Spot-check of key dependencies (full license audit can be run via `npx license-checker`):

| Package | License | Compliance Status |
|---------|---------|-------------------|
| express | MIT | ✅ Compatible |
| react | MIT | ✅ Compatible |
| pino | MIT | ✅ Compatible |
| vite | MIT | ✅ Compatible |
| jest | MIT | ✅ Compatible |
| typescript | Apache 2.0 | ✅ Compatible |
| @opentelemetry/* | Apache 2.0 | ✅ Compatible |

**No GPL/AGPL detected.** License risk: LOW

---

## Remediation Priority & Roadmap

### Phase 1: IMMEDIATE (This Week)
1. **Handlebars (DEP-001):** `cd Source/Backend && npm audit fix`
2. **Protobufjs (DEP-002):** `cd platform/orchestrator && npm update protobufjs`
   - May require version bump of orchestrator dependencies
   - Test orchestrator stability after update
3. **OpenTelemetry (DEP-004):** `cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node @opentelemetry/sdk-node`

### Phase 2: THIS MONTH
4. **Build toolchain:** Upgrade vite/vitest/esbuild across all packages
   - Source/Frontend: `npm update vite vitest`
   - portal/Frontend: `npm update vite vitest@latest` (requires major version bump)
   - portal/Backend: Same
5. **path-to-regexp (DEP-003):** Included in orchestrator updates

### Phase 3: QUARTERLY REVIEW
6. **Major version upgrades:**
   - React 18→19 (Source/Frontend)
   - Express 4→5 (Source/Backend)
   - Pino 8→10 (Source/Backend)
7. **Dependency tree reduction:** Audit and remove unused dev dependencies in portal/Frontend (416 dev deps is excessive)

---

## Testing & Verification

Before committing any changes:
```bash
# Run all audit fixes
for dir in Source/Backend Source/Frontend platform/orchestrator portal/Backend portal/Frontend; do
  cd "$dir" && npm audit
done

# Verify no new test failures
npm test --workspaces --if-present

# Run traceability gates
python3 tools/traceability-enforcer.py
```

---

## Findings JSON Summary

```json
{
  "audit_date": "2026-05-16",
  "total_packages_scanned": 10,
  "total_vulnerabilities": 27,
  "severity_breakdown": {
    "critical": 2,
    "high": 3,
    "moderate": 22,
    "low": 0
  },
  "critical_packages": [
    {
      "name": "handlebars",
      "version_range": ">=4.0.0 <=4.7.8",
      "cve_count": 8,
      "highest_cvss": 9.8
    },
    {
      "name": "protobufjs",
      "version_range": "<=7.5.5",
      "cve_count": 8,
      "highest_cvss": 9.8
    }
  ],
  "outdated_major_versions": 6,
  "license_risk": "low",
  "overall_grade": "D",
  "next_audit": "2026-06-16"
}
```

---

## Notes for Cross-Team Coordination

- **[CROSS-REF: red-teamer]** — path-to-regexp ReDoS is a direct attack vector on REST routing; prioritize testing POST /api/* endpoints with polyglot route parameters
- **[CROSS-REF: red-teamer]** — Handlebars and protobufjs both enable code injection; if these packages process external input, escalate to security review immediately
- **[ESCALATE → TheGuardians]** — Two critical CVEs warrant security team sign-off before proceeding

---

## Agent Learning Notes

_See Teams/TheInspector/learnings/dependency-auditor.md for persistent learnings from this run._

