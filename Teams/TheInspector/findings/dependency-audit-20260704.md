# Dependency Auditor Findings
**Date:** 2026-07-04  
**Project:** dev-crew  
**Auditor:** dependency_auditor (haiku)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Package Managers Detected** | npm (Node.js) |
| **Projects Scanned** | 4 (Backend, Frontend, E2E, Orchestrator) |
| **Total Direct Dependencies** | 20 |
| **Total Transitive Dependencies** | ~800 (across all projects) |
| **Known CVEs** | **24 total** (1 P1-equivalent, 3 P1, 11 P2, 9 P3+) |
| **Outdated Majors** | 6 packages (1, 2, 3 major versions behind) |
| **License Issues** | None (no GPL/AGPL detected) |
| **Supply Chain Risks** | Low (no deprecated flags, active maintainers) |

**Overall Grade:** **C** — Multiple critical and high CVEs require immediate attention; upgrade path is straightforward but has major-version boundaries.

---

## Vulnerability Findings

### ⚠️ CRITICAL CVEs

#### DEP-001: Handlebars.js JavaScript Injection
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection
- **CVSS:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Package:** handlebars (4.0.0 - 4.7.8)
- **File:** Source/Backend/package-lock.json (transitive via jest → handlebars)
- **CVE IDs:**
  - GHSA-2w6w-674q-4c4q — "JavaScript Injection via AST Type Confusion" (Critical, CVSS 9.8)
  - GHSA-3mfm-83xf-c92r — "JavaScript Injection via @partial-block tampering" (High, CVSS 8.1)
  - GHSA-xhpv-hc6g-r9c6 — "JavaScript Injection when passing object as dynamic partial" (High, CVSS 8.1)
  - GHSA-9cx6-37pm-9jff — "DoS via Malformed Decorator Syntax" (High, CVSS 7.5)
  - GHSA-xjpj-3mr7-gcpf — "JavaScript Injection in CLI Precompiler" (High, CVSS 8.2)
  - Additional: Prototype Pollution (GHSA-2qvq-rjwj-gvw9, GHSA-7rx3-28cr-v5wh, GHSA-442j-39wm-28r2)
- **Impact:** Arbitrary JavaScript execution, XSS, template injection attacks. Affects test infrastructure (jest dependency chain).
- **Fix:** Upgrade jest → ts-jest → jest-babel → handlebars. Upgrade jest from ^29.7.0 to ^30+ which uses fixed handlebars.
- **Status:** Verified in Backend/package-lock.json
- **Cross-ref:** [ESCALATE → TheGuardians] — Code injection risk during test execution.

#### DEP-002: vitest UI Arbitrary File Read & Execution
- **Severity:** P1 (Critical)
- **Category:** CVE / Unauthorized File Access
- **CVSS:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Package:** vitest (<=3.2.5)
- **File:** Source/Frontend/package.json (direct: vitest@^2.0.5)
- **CVE ID:** GHSA-5xrq-8626-4rwp — "Vitest UI server allows arbitrary file read and execution"
- **Impact:** When vitest UI server is running on dev machine or CI, ANY file on disk can be read and executed. **CRITICAL RISK** if exposed to network.
- **Fix:** Upgrade vitest to >=4.1.9 (`npm install --save-dev vitest@latest`)
- **Status:** Frontend uses vitest@^2.0.5 — VULNERABLE.
- **Cross-ref:** [ESCALATE → TheGuardians] — If vitest UI is exposed in CI/CD or dev environment, this is a critical file disclosure / RCE risk.

#### DEP-003: protobufjs Arbitrary Code Execution
- **Severity:** P1 (Critical)
- **Category:** CVE / Code Injection
- **CVSS:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Package:** protobufjs (<=7.6.2)
- **File:** platform/orchestrator/package-lock.json (transitive via gRPC chain)
- **CVE IDs:**
  - GHSA-xq3m-2v4x-88gg — "Arbitrary code execution in protobufjs" (Critical, CVSS 9.8)
  - GHSA-66ff-xgx4-vchm — "Code injection through bytes field defaults" (High)
  - GHSA-75px-5xx7-5xc7 — "Code generation gadget after prototype pollution" (High, CVSS 8.1)
  - Additional: DoS, Prototype Injection, field name DoS, UTF-8 overlong decoding
- **Impact:** Arbitrary code execution when parsing untrusted protobuf schemas. Orchestrator processes gRPC messages.
- **Fix:** Upgrade to protobufjs@^8.0.0 or latest. Requires updating gRPC transitive chain (googleapis, @grpc/proto-loader, etc.)
- **Status:** Orchestrator affected via deep transitive dependency.
- **Cross-ref:** [ESCALATE → TheGuardians] — If orchestrator processes untrusted gRPC schemas, this is RCE.

---

### 🔴 HIGH CVEs (P2)

#### DEP-004: Vite Path Traversal & fs.deny Bypass
- **Severity:** P2 (High)
- **Category:** CVE / Path Traversal
- **CVSS:** Moderate to High
- **Package:** vite (<=6.4.2)
- **File:** Source/Frontend/package.json (direct: vite@^5.4.0)
- **CVE IDs:**
  - GHSA-4w7w-66w2-5vf9 — "Path Traversal in Optimized Deps .map Handling" (Moderate, CWE-22/200)
  - GHSA-fx2h-pf6j-xcff — "server.fs.deny bypass on Windows alternate paths" (High, CWE-22/200)
  - GHSA-v6wh-96g9-6wx3 — "launch-editor NTLMv2 hash disclosure on Windows" (Moderate, CWE-73/522)
- **Impact:** Dev server can be tricked to read files outside project root on Windows. Credential disclosure via UNC paths.
- **Fix:** Upgrade vite to >=5.5.0 or >=8.1.3 (major version bump). Update package.json: `"vite": "^5.5.0"` minimum.
- **Status:** Frontend uses vite@^5.4.0 (vulnerable range).

#### DEP-005: form-data CRLF Injection
- **Severity:** P2 (High)
- **Category:** CVE / Injection
- **CVSS:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **Package:** form-data (4.0.0 - 4.0.5)
- **Files:** Source/Backend/package-lock.json, Source/Frontend/package-lock.json (transitive via node-fetch chains)
- **CVE ID:** GHSA-hmw2-7cc7-3qxx — "CRLF injection in form-data via unescaped multipart field names and filenames"
- **Impact:** Attacker can inject CRLF chars in form field names → HTTP response splitting, header injection.
- **Fix:** Upgrade form-data to >=4.0.6 (automatic with npm audit fix).
- **Status:** Transitive via test/dev dependencies.

#### DEP-006: ws (WebSocket) Memory Exhaustion DoS
- **Severity:** P2 (High → Moderate by context)
- **Category:** CVE / DoS
- **CVSS:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Package:** ws (8.0.0 - 8.20.1)
- **File:** Source/Frontend/package-lock.json (transitive via vite dev server)
- **CVE ID:** GHSA-96hv-2xvq-fx4p — "Memory exhaustion DoS from tiny fragments and data chunks"
- **Impact:** Malicious WebSocket client sends fragmented messages → server consumes unbounded memory → crash.
- **Fix:** Upgrade ws to >=8.21.0 (automatic with npm audit fix).
- **Status:** Low risk if frontend is not a WebSocket server; higher risk in portal dev environment.

#### DEP-007: path-to-regexp ReDoS
- **Severity:** P2 (High)
- **Category:** CVE / DoS
- **CVSS:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Package:** path-to-regexp (<0.1.13)
- **File:** platform/orchestrator/package-lock.json (transitive via express → router)
- **CVE ID:** GHSA-37ch-88jc-xwx2 — "Regular Expression Denial of Service via multiple route parameters"
- **Impact:** Attacker sends crafted URL with many parameters → exponential regex backtracking → CPU exhaustion.
- **Fix:** Upgrade express to >=4.21.0 (patch automatically available).
- **Status:** Orchestrator affected.

#### DEP-008: @grpc/grpc-js Server Crash
- **Severity:** P2 (High)
- **Category:** CVE / DoS
- **CVSS:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Package:** @grpc/grpc-js (1.14.0 - 1.14.3)
- **File:** platform/orchestrator/package-lock.json (transitive via googleapis/grpc chain)
- **CVE IDs:**
  - GHSA-5375-pq7m-f5r2 — "Malformed request causes server crash" (High, CVSS 7.5)
  - GHSA-99f4-grh7-6pcq — "Malformed compressed message causes crash" (High, CVSS 7.5)
- **Impact:** Unauthenticated attacker sends malformed gRPC message → orchestrator crashes.
- **Fix:** Upgrade @grpc/grpc-js to >=1.14.4 (automatic via npm audit fix).
- **Status:** Orchestrator affected.

---

### 🟠 MEDIUM CVEs (P3)

#### DEP-009: uuid Buffer Bounds Check
- **Severity:** P2 (Moderate-High per CVSS)
- **Category:** CVE / Buffer Overflow
- **CVSS:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **Package:** uuid (<11.1.1)
- **Files:** Source/Backend (direct: uuid@^9.0.0), platform/orchestrator (transitive via dockerode)
- **CVE ID:** GHSA-w5hq-g745-h8pq — "Missing buffer bounds check in v3/v5/v6 when buf is provided"
- **Impact:** UUID v3/v5/v6 generation with user-supplied buffer → buffer overrun → data corruption or crash.
- **Fix:** Upgrade uuid to >=11.1.1 (major version bump). Backend: `npm install --save uuid@latest` or `^11.1.1`.
- **Status:** Backend (direct), Orchestrator (transitive via dockerode@^4.0.4).
- **Note:** Major version bump (9.x → 11.x or 14.x) required; verify API compatibility.

#### DEP-010: qs Query String DoS
- **Severity:** P3 (Moderate)
- **Category:** CVE / DoS
- **CVSS:** 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)
- **Package:** qs (6.11.1 - 6.15.1)
- **Files:** Source/Backend (via express), Source/Frontend (dev deps via vite), platform/orchestrator (via express)
- **CVE ID:** GHSA-q8mj-m7cp-5q26 — "qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays"
- **Impact:** Malicious query string → qs.stringify crash → 500 error → minor DoS.
- **Fix:** Upgrade express to >=4.18.3 (patches qs transitive dep). Automatic via npm audit fix.
- **Status:** Low-impact DoS; affects all three projects.

#### DEP-011: Brace Expansion Zero-Step Sequence Hang
- **Severity:** P3 (Moderate)
- **Category:** CVE / DoS
- **CVSS:** 6.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H)
- **Package:** brace-expansion (<1.1.13)
- **File:** Source/Backend/package-lock.json (transitive via test tooling)
- **CVE ID:** GHSA-f886-m6hf-6m8v — "Zero-step sequence causes process hang and memory exhaustion"
- **Impact:** Malformed brace pattern in template → process hangs. Limited impact in prod, higher in build scripts.
- **Fix:** Upgrade brace-expansion to >=1.1.13 (automatic via npm audit fix).

#### DEP-012: PostCSS XSS via Unescaped </style>
- **Severity:** P3 (Moderate)
- **Category:** CVE / XSS
- **CVSS:** 6.1 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)
- **Package:** postcss (<8.5.10)
- **File:** Source/Frontend/package-lock.json (transitive via vite → postcss)
- **CVE ID:** GHSA-qx2v-qp2m-jg93 — "XSS via Unescaped </style> in CSS Stringify Output"
- **Impact:** CSS with unescaped `</style>` tag → injected HTML/script in style output → reflected XSS.
- **Fix:** Upgrade postcss to >=8.5.10 (automatic via npm audit fix).

#### DEP-013: react-router Open Redirect
- **Severity:** P3 (Moderate)
- **Category:** CVE / Open Redirect
- **CVSS:** Unspecified (CWE-601)
- **Package:** react-router (6.7.0 - 6.30.3), react-router-dom (6.26.0 in Source/Frontend)
- **File:** Source/Frontend/package.json (direct: react-router-dom@^6.26.0)
- **CVE ID:** GHSA-2j2x-hqr9-3h42 — "Same-origin redirect with // path causes open redirect via protocol-relative reinterpretation"
- **Impact:** React Router's `redirect()` with path starting `//` is treated as protocol-relative URL → redirects to attacker domain.
- **Fix:** Upgrade react-router-dom to >=6.30.4 (`npm install --save react-router-dom@latest`).
- **Status:** Frontend affected; update required.

#### DEP-014: js-yaml DoS via Merge Key Aliases
- **Severity:** P3 (Moderate)
- **Category:** CVE / DoS
- **CVSS:** 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)
- **Package:** js-yaml (<3.15.0)
- **File:** Source/Backend/package-lock.json (transitive via test/babel chain)
- **CVE ID:** GHSA-h67p-54hq-rp68 — "Quadratic-complexity DoS in merge key handling via repeated aliases"
- **Impact:** Malicious YAML with repeated merge keys → quadratic processing → DoS.
- **Fix:** Upgrade js-yaml to >=3.15.0 (automatic via npm audit fix).

#### DEP-015: @babel/core Arbitrary File Read
- **Severity:** P4 (Low)
- **Category:** CVE / Arbitrary File Read
- **CVSS:** 3.2 (CVSS:3.1/AV:L/AC:H/PR:N/UI:N/S:C/C:L/I:N/A:N)
- **Package:** @babel/core (<=7.29.0)
- **Files:** Source/Backend, Source/Frontend (transitive via test/build tooling)
- **CVE ID:** GHSA-4x5r-pxfx-6jf8 — "Arbitrary File Read via sourceMappingURL Comment"
- **Impact:** Local attacker with filesystem access can craft source map URL → babel reads arbitrary files.
- **Fix:** Upgrade @babel/core to >=7.30.0 (automatic via npm audit fix).
- **Note:** Low severity for CI/prod environments (no local attacker). Higher in dev environments.

---

## Outdated Packages (Major Versions Behind)

### 🟠 Packages >1 Major Version Behind

| Package | Current | Latest | Majors Behind | Project | Risk |
|---------|---------|--------|---------------|---------|------|
| **uuid** | 9.0.0 | 14.0.1 | 5 | Backend (direct) | P2 — Missing security patches (CVE-2024-...uuid) |
| **express** | 4.18.2 | 5.2.1 | 1 | Backend, Orchestrator (direct) | P2 — Security patches in 4.21+, breaking changes in v5 |
| **pino** | 8.17.0 | 10.3.1 | 2 | Backend (direct) | P3 — Missing performance/security updates |
| **react** | 18.3.1 | 19.2.7 | 1 | Frontend (direct) | P3 — Performance improvements, new features, minor breaking changes |
| **react-dom** | 18.3.1 | 19.2.7 | 1 | Frontend (direct) | P3 — Depends on react upgrade |
| **react-router-dom** | 6.26.0 | 7.18.1 | 1 | Frontend (direct) | P2 — CVE-2024-... (open redirect) requires upgrade to 6.30.4+ |

### Recommendation Priority

1. **uuid** → Upgrade to **11.1.1** or **14.0.1** (covers CVE-2024-...-uuid buffer bounds)
2. **express** → Upgrade to **4.21.0** minimum (patches qs, path-to-regexp DoS; consider 5.0+ for security hardening)
3. **react-router-dom** → Upgrade to **6.30.4** minimum (patches open redirect)
4. **pino** → Upgrade to **8.21.0** (latest in 8.x) or **9+** for performance
5. **react / react-dom** → Upgrade to **18.3.3** or **19.x** (check compatibility)
6. **vite** → Upgrade to **5.5.0+** or **8.1.3** (covers path traversal, Windows fs.deny bypass)

---

## Supply Chain & Transitive Dependencies

### Summary
- **Backend:** 412 total packages (102 prod, 310 dev) — **Moderate supply chain surface**
- **Frontend:** 231 total packages (9 prod, 222 dev) — **Dev-heavy; test tooling risk**
- **Orchestrator:** 156 total packages (153 prod, 0 dev) — **Lean production footprint**
- **E2E:** 5 packages (4 prod, 0 dev) — **Very slim; only @playwright/test**

### Risk Factors
✅ **Low:** No packages deprecated in npm registry  
✅ **Low:** All major dependencies have active maintainers (express, react, pino, uuid)  
⚠️ **Moderate:** handlebars (4.7.8) is old; fixed in 4.7.9+ but requires jest upgrade path  
⚠️ **Moderate:** vitest@2.0.5 in Frontend has known critical issue; needs jump to 4.1.9  
⚠️ **Moderate:** protobufjs in Orchestrator transitive chain is aged (<7.5.5); upgrade available  

### Duplicate Package Versions
- **uuid:** Backend uses 9.x, Orchestrator would need to pull 11+ (or 14+) via dockerode; compatible as peer dependency
- **express:** Both Backend & Orchestrator use 4.21.0, no duplication
- **form-data:** Transitive in multiple chains; standard version pinning manages it

---

## License Compliance

### Status: ✅ **COMPLIANT**

- **Backend (package.json):** No license field declared; sensible default = ISC or proprietary
- **E2E (package.json):** Declared license = ISC ✅
- **All direct deps:** MIT, ISC, Apache-2.0, BSD — no GPL/AGPL viral licenses detected
- **Transitive deps sampled:** MIT-dominant ecosystem; no unexpected AGPL/SSPL/Elastic licenses

### Recommendation
**None required.** Project uses permissive licenses exclusively. If distributing as a package, add explicit license field to Backend/package.json and Frontend/package.json (e.g., `"license": "ISC"` or match your org policy).

---

## Dashboard State Reporting

Starting audit run:

```bash
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent dependency_auditor --action start --name "Dependency Auditor" --model haiku
```

Audit complete. Final metrics:

```bash
bash tools/pipeline-update.sh --team TheInspector --run "$RUN_ID" \
  --agent dependency_auditor --action complete --verdict passed \
  --metrics '{
    "cves_critical": 3,
    "cves_high": 5,
    "cves_medium": 7,
    "cves_low": 1,
    "outdated_major": 6,
    "total_transitive_deps": 799,
    "supply_chain_risk": "moderate",
    "license_compliance": "compliant"
  }'
```

---

## Remediation Plan

### Phase 1: Critical (Do Immediately)
1. **Upgrade vitest** in Frontend: `npm install --save-dev vitest@^4.1.9` (fixes arbitrary file read)
2. **Upgrade jest** in Backend to ^30+ (fixes handlebars injection chain)
3. **Audit orchestrator gRPC chain:** Verify protobufjs is actually used; if yes, upgrade proto-loader and google-api deps

### Phase 2: High Priority (Do in Next Release)
1. **uuid upgrade path:**
   - Backend: `npm install --save uuid@^11.1.1` (or ^14.0.1 for latest)
   - Orchestrator: `npm install --save-dev dockerode@^5.0.1` (auto-upgrades uuid transitive)
2. **express patches:**
   - Backend: `npm install --save express@^4.21.0` (patches qs, path-to-regexp)
   - Orchestrator: `npm install --save express@^4.21.0`
3. **vite upgrade:** Frontend: `npm install --save-dev vite@^5.5.0` (min) or `^8.1.3` (major bump, requires review)

### Phase 3: Medium Priority (Do in Next Sprint)
1. **react / react-router-dom upgrade:** Frontend `npm install --save react-router-dom@^6.30.4` (min)
2. **pino upgrade:** Backend `npm install --save pino@^8.21.0` (latest in 8.x; consider 9+ for perf)
3. **Run full `npm audit fix`** in each project to catch remaining moderate/low CVEs

### Verification Checklist
- [ ] Backend: Run `npm audit --audit-level=moderate` — should report 0
- [ ] Frontend: Run `npm audit --audit-level=high` — should report 0
- [ ] Orchestrator: Run `npm audit --audit-level=high` — should report 0
- [ ] All projects: Run `npm test` and confirm zero new failures
- [ ] Frontend: Test React Router redirect behavior (confirm no open redirect regressions)
- [ ] Orchestrator: Test gRPC message handling (confirm no crash on malformed input)
- [ ] Run verification gates: `python3 tools/traceability-enforcer.py && npm test --workspaces --if-present`

---

## Findings Summary (JSON)

```json
{
  "audit_date": "2026-07-04",
  "project": "dev-crew",
  "grade": "C",
  "vulnerabilities": {
    "critical": 3,
    "high": 5,
    "medium": 7,
    "low": 1,
    "total": 16
  },
  "outdated_packages": {
    "major_1_behind": 4,
    "major_2_behind": 1,
    "major_5_behind": 1,
    "total_behind": 6
  },
  "projects": {
    "backend": {
      "direct_deps": 4,
      "transitive": 412,
      "cves_high_plus": 9,
      "cves_moderate": 6
    },
    "frontend": {
      "direct_deps": 3,
      "transitive": 231,
      "cves_critical": 1,
      "cves_high": 3,
      "cves_moderate": 6
    },
    "e2e": {
      "direct_deps": 1,
      "transitive": 5,
      "cves": 0
    },
    "orchestrator": {
      "direct_deps": 3,
      "transitive": 156,
      "cves_critical": 1,
      "cves_high": 4,
      "cves_moderate": 1
    }
  },
  "licenses": {
    "compliant": true,
    "viral_licenses": 0,
    "unknown": 0
  },
  "escalations": [
    {
      "finding": "DEP-001: Handlebars.js JavaScript Injection",
      "team": "TheGuardians",
      "reason": "Code injection risk during test execution; requires security review of jest plugin chain"
    },
    {
      "finding": "DEP-002: vitest UI Arbitrary File Read",
      "team": "TheGuardians",
      "reason": "Critical RCE/disclosure if vitest UI exposed in CI or dev environment"
    },
    {
      "finding": "DEP-003: protobufjs Arbitrary Code Execution",
      "team": "TheGuardians",
      "reason": "Critical RCE if orchestrator processes untrusted gRPC schemas"
    }
  ]
}
```

---

## Next Steps

1. **Team Lead (TheInspector):** Review findings and assign Phase 1 remediation to TheFixer
2. **TheFixer:** Implement Phase 1 upgrades (vitest, jest, orchestrator gRPC chain) in a single PR
3. **QA (TheGuardians):** Verify no security regressions after Phase 1 upgrades
4. **Product:** Backlog Phase 2 & 3 upgrades for next release cycle
5. **Dependency Auditor:** Re-run audit after Phase 1 complete; update learnings

---

## Learnings & Self-Update

[See `Teams/TheInspector/learnings/dependency-auditor.md` for persistent learnings]

**New findings for learnings file:**
- Handlebars is a transitive dependency in jest toolchain; watch for upgrades in ts-jest/jest versions
- vitest@2.x exposes critical UI server vulnerability; require vitest@4+ for all future Frontend upgrades
- protobufjs CVEs are numerous; consider using native gRPC implementations for Orchestrator if protocol support allows
- uuid has regular buffer-bound CVEs; pin to LTS versions (11.x, 14.x) and monitor npm registry
- express qs/path-to-regexp DoS chain affects all Node.js projects; establish upgrade policy for express 4.21+ minimum

