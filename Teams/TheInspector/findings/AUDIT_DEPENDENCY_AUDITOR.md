# Dependency Auditor — Security & Compliance Findings

**Date:** 2026-07-15  
**Agent:** dependency_auditor (Haiku model)  
**Analysis Scope:** NPM packages across all Source/, platform/, and portal/ directories  
**Overall Risk Level:** 🔴 **HIGH** — Multiple critical CVEs with active exploits

---

## Executive Summary

Scanned **13 package.json files** across 6 independent projects:
- **Source/Backend, Source/Frontend, Source/E2E**
- **platform/orchestrator, portal/Backend, portal/Frontend**
- **Plus 4 demo/example projects (abac-*)**

**Key Metrics:**
| Metric | Count |
|--------|-------|
| **Total Dependencies** | ~2,000+ (transitive) |
| **Direct Dependencies** | ~30 |
| **CVEs Found** | **31 total** |
| **Critical (P1)** | 3 (handlebars, vitest, protobufjs) |
| **High (P2)** | 5 (form-data, vite, ws, gRPC, path-to-regexp) |
| **Medium (P3)** | 7+ (qs, uuid, brace-expansion, js-yaml, postcss, react-router, babel) |

---

## 🔴 P1 — CRITICAL VULNERABILITIES (Immediate Action Required)

### DEP-001: Handlebars.js Multiple JavaScript Injection Vulnerabilities

- **Severity:** P1 (CRITICAL)
- **Package:** `handlebars@4.0.0-4.7.8`
- **Category:** Security / Code Injection (CWE-94, CWE-843)
- **Affected Versions:** >= 4.0.0, <= 4.7.8
- **CVSSv3 Scores:**
  - **GHSA-2w6w-674q-4c4q**: 9.8 (JS injection via AST type confusion)
  - **GHSA-3mfm-83xf-c92r**: 8.1 (JS injection via @partial-block tampering)
  - **GHSA-xhpv-hc6g-r9c6**: 8.1 (JS injection via dynamic partial)
  - **GHSA-9cx6-37pm-9jff**: 7.5 (DoS via malformed decorator syntax)
  - **GHSA-xjpj-3mr7-gcpf**: 8.2 (CLI precompiler JS injection)
  - Plus 3 additional moderate-severity prototype pollution/access control gaps

**Location:** 
```
Source/Backend/node_modules/handlebars
(likely transitive via @babel/core or test framework)
```

**Impact:** Arbitrary JavaScript execution in template rendering context. An attacker can inject code via specially-crafted template syntax or configuration options.

**Fix:**
- Upgrade `handlebars` to **>= 4.7.9** (if available) or
- Remove dependency if not directly required
- Check which package pulls in handlebars (likely Babel or test runner)
- `npm audit fix --force` may help

**Cross-Ref:** [ESCALATE → TheGuardians] — This is a code execution vulnerability in the build/test pipeline.

---

### DEP-002: Vitest UI Arbitrary File Read & Code Execution

- **Severity:** P1 (CRITICAL)
- **Package:** `vitest@<3.2.6` (currently ~3.0.x in Source/Frontend)
- **Category:** Security / Unauthorized Access (CWE-862)
- **CVSSv3 Score:** 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **CVE/Advisory:** GHSA-5xrq-8626-4rwp

**Location:**
```
Source/Frontend/node_modules/vitest
```

**Vulnerability Detail:**
When Vitest UI server is running (via `npm run test:watch` or `vitest --ui`), an attacker on the network can:
1. Read arbitrary files from the filesystem
2. Execute arbitrary code on the system

This is due to missing authentication/path validation on the dev server.

**Impact:** 
- If a developer runs Vitest UI server on a shared network or with port exposed
- Allows remote code execution during development
- Can lead to supply-chain compromise if CI environment runs tests with UI server

**Fix:**
```bash
cd Source/Frontend
npm install vitest@^3.2.6  # or npm audit fix
```

**Recommended Action:** 
- Upgrade to **vitest >= 3.2.6**
- Set `--ui` to localhost-only in dev mode
- Do NOT run Vitest UI on production/CI servers

**Cross-Ref:** [ESCALATE → TheGuardians] — Arbitrary code execution during dev/test phase.

---

### DEP-003: Protobufjs Arbitrary Code Execution + 7 Additional Critical/High CVEs

- **Severity:** P1 (CRITICAL)
- **Package:** `protobufjs@<=7.5.5` (transitive via gRPC in platform/orchestrator)
- **Category:** Security / Code Injection (CWE-94, CWE-1321, CWE-674, etc.)
- **Location:** 
```
platform/orchestrator/node_modules/protobufjs
(pulled in via @grpc/grpc-js)
```

**CVEs Found (Most Critical First):**

| CVE | Title | CVSS | CWE |
|-----|-------|------|-----|
| GHSA-xq3m-2v4x-88gg | Arbitrary code execution | 9.8 | CWE-94 |
| GHSA-75px-5xx7-5xc7 | Code generation gadget after prototype pollution | 8.1 | CWE-94, CWE-1321 |
| GHSA-jvwf-75h9-cwgg | Process-wide DoS via unsafe option paths | 7.5 | CWE-1321 |
| GHSA-685m-2w69-288q | DoS via unbounded protobuf recursion | 7.5 | CWE-674 |
| GHSA-66ff-xgx4-vchm | Code injection through bytes field defaults | 8.1+ | CWE-94 |
| GHSA-2pr8-phx7-x9h3 | DoS from crafted field names | 5.3 | CWE-20 |
| GHSA-fx83-v9x8-x52w | Prototype injection in constructors | 5.3 | CWE-1321 |
| GHSA-q6x5-8v7m-xcrf | Overlong UTF-8 decoding | 5.3 | CWE-176 |

**Attack Vector:** A remote attacker can send a malformed protobuf message or JSON descriptor that:
1. Executes arbitrary JavaScript (gadget chains via prototype pollution)
2. Crashes the server (unbounded recursion, malformed field names)
3. Leaks sensitive data (UTF-8 handling)

**Impact:** 
- Affects the orchestrator server which manages agent pipelines
- High impact: orchestrator is infrastructure; compromise = full system compromise

**Fix:**
```bash
cd platform/orchestrator
npm audit fix  # Will upgrade @grpc/grpc-js which pulls in fixed protobufjs
```

**Recommended Action:** 
- Upgrade **@grpc/grpc-js** to >= 1.14.4
- Verify gRPC dependency lock file is updated
- Consider gRPC client input validation/sanitization
- Do not accept untrusted protobuf messages

**Cross-Ref:** [ESCALATE → TheGuardians] — Arbitrary code execution in orchestrator infrastructure.

---

## 🟠 P2 — HIGH SEVERITY VULNERABILITIES (Schedule Fix This Sprint)

### DEP-004: form-data CRLF Injection

- **Severity:** P2 (HIGH)
- **Package:** `form-data@4.0.0-4.0.5`
- **Category:** Security / Injection (CWE-93)
- **CVSSv3 Score:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
- **Location:** Source/Backend, Source/Frontend (transitive)

**Impact:** Attacker can inject CRLF characters into multipart form data headers, breaking SMTP, HTTP, or other protocols that parse headers.

**Fix:**
```bash
npm audit fix  # Will upgrade form-data to >= 4.0.6
```

---

### DEP-005: Vite Path Traversal & fs.deny Bypass on Windows

- **Severity:** P2 (HIGH)
- **Package:** `vite@<=6.4.2` (Source/Frontend currently uses ^5.4.0)
- **Category:** Security / Path Traversal (CWE-22)
- **CVEs:**
  - GHSA-4w7w-66w2-5vf9: Path traversal in `.map` file handling
  - GHSA-v6wh-96g9-6wx3: NTLMv2 hash disclosure via UNC paths (Windows)
  - GHSA-fx2h-pf6j-xcff: fs.deny bypass on Windows alternate paths (HIGH)

**Location:**
```
Source/Frontend/node_modules/vite
```

**Fix:**
```bash
cd Source/Frontend
npm install vite@^6.4.3  # or npm audit fix
```

---

### DEP-006: ws WebSocket Library Memory Exhaustion DoS

- **Severity:** P2 (HIGH)
- **Package:** `ws@8.0.0-8.20.1` (or 8.0.0-8.20.1 in transitive deps)
- **Category:** Security / DoS (CWE-400, CWE-770)
- **CVSSv3 Score:** 7.5 (Memory exhaustion from tiny fragments)
- **Location:** Source/Frontend (transitive via vite/dev server)

**Impact:** Attacker sends many tiny WebSocket fragments to exhaust server memory.

**Fix:**
```bash
npm audit fix  # Will upgrade ws to >= 8.21.0
```

---

### DEP-007: @grpc/grpc-js Server Crash via Malformed Requests

- **Severity:** P2 (HIGH)
- **Package:** `@grpc/grpc-js@1.14.0-1.14.3`
- **Category:** Security / DoS (CWE-248, CWE-400)
- **CVSSv3 Score:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Location:** platform/orchestrator (transitive)

**CVEs:**
- GHSA-5375-pq7m-f5r2: Malformed request causes server crash
- GHSA-99f4-grh7-6pcq: Malformed compressed message causes crash

**Impact:** DoS on the orchestrator gRPC interface.

**Fix:**
```bash
npm audit fix  # Will upgrade to >= 1.14.4
```

---

### DEP-008: path-to-regexp Regular Expression DoS (ReDoS)

- **Severity:** P2 (HIGH)
- **Package:** `path-to-regexp@<0.1.13`
- **Category:** Security / DoS (CWE-1333)
- **CVSSv3 Score:** 7.5
- **Location:** platform/orchestrator

**Impact:** Attacker crafts a URL with multiple route parameters that causes exponential regex backtracking, hanging the server.

**Fix:**
```bash
npm audit fix
```

---

## 🟡 P3 — MEDIUM VULNERABILITIES (Fix Next Sprint)

### DEP-009: qs Remote DoS via Crash

- **Severity:** P3 (MEDIUM)
- **Package:** `qs@6.11.1-6.15.1`
- **Category:** DoS (CWE-476)
- **CVSSv3 Score:** 5.3
- **Affects:** Source/Backend, Source/Frontend (transitive via express/body-parser)

**Impact:** qs.stringify crashes with TypeError on null/undefined entries.

**Fix:** `npm audit fix`

---

### DEP-010: uuid Buffer Overflow

- **Severity:** P3 (MEDIUM)
- **Package:** `uuid@<11.1.1` (currently v9.0.0 in Source/Backend)
- **Category:** Buffer Overflow (CWE-787, CWE-1285)
- **CVSSv3 Score:** 7.5 (HIGH)
- **Location:** Source/Backend, portal/Backend

**Impact:** Missing bounds check when buf is provided to v3/v5/v6 UUID functions. Attacker can write beyond buffer bounds.

**Fix:**
```bash
cd Source/Backend && npm install uuid@^11.1.1  # Major version bump required
```

**Note:** uuid 14.0.1 is latest; v9→v11 is a jump of 2 major versions. Test compatibility after upgrade.

---

### DEP-011: brace-expansion Hang/Memory Exhaustion

- **Severity:** P3 (MEDIUM)
- **Package:** `brace-expansion@<1.1.13`
- **Category:** DoS (CWE-400)
- **CVSSv3 Score:** 6.5
- **Affects:** Source/Frontend (transitive)

**Impact:** Zero-step sequences cause process hang.

**Fix:** `npm audit fix`

---

### DEP-012: js-yaml Quadratic-Complexity DoS

- **Severity:** P3 (MEDIUM)
- **Package:** `js-yaml@<3.15.0`
- **Category:** DoS (CWE-407)
- **CVSSv3 Score:** 5.3
- **Affects:** Likely in build/config parsing

**Impact:** Repeated aliases in YAML cause quadratic-complexity parsing.

**Fix:** `npm audit fix`

---

### DEP-013: postcss XSS via Unescaped </style>

- **Severity:** P3 (MEDIUM)
- **Package:** `postcss@<8.5.10`
- **Category:** XSS (CWE-79)
- **CVSSv3 Score:** 6.1
- **Affects:** Source/Frontend (transitive via toolchain)

**Impact:** If postcss output is embedded in HTML, unescaped </style> tag can break out of CSS and inject HTML.

**Fix:** `npm audit fix`

---

### DEP-014: react-router-dom Open Redirect

- **Severity:** P3 (MEDIUM)
- **Package:** `react-router-dom@6.7.0-6.30.3` (Source/Frontend uses ^6.26.0)
- **Category:** Open Redirect (CWE-601)
- **CVSSv3 Score:** Not scored (but moderate impact)
- **Location:** Source/Frontend

**Impact:** Same-origin redirect with path starting `//` can cause open redirect via protocol-relative URL reinterpretation.

**Fix:**
```bash
cd Source/Frontend
npm install react-router-dom@^6.30.4  # or npm audit fix
```

---

### DEP-015: @babel/core Arbitrary File Read via sourceMappingURL

- **Severity:** P3 (LOW-MEDIUM)
- **Package:** `@babel/core@<=7.29.0`
- **Category:** File Read (CWE-22, CWE-200)
- **CVSSv3 Score:** 3.2
- **Affects:** Source/Backend, Source/Frontend (dev dependencies)

**Fix:** `npm audit fix`

---

## 📊 Dependency Size & Supply Chain Analysis

### Dependency Tree Metrics

| Project | Prod Deps | Dev Deps | Optional | Total | Risk Flag |
|---------|-----------|----------|----------|-------|-----------|
| Source/Backend | 4 | 8 | 0 | 12 | 🟢 Low |
| Source/Frontend | 3 | 9 | 50 | 62 | 🟡 Med (optional) |
| Source/E2E | 1 | 0 | 1 | 2 | 🟢 Low |
| **platform/orchestrator** | 3 | 0 | 0 | 3 | 🔴 **577 transitive** |
| portal/Backend | 11 | 8 | 0 | 19 | 🟡 Med (397 transitive) |
| portal/Frontend | 3 | 9 | 49 | 61 | 🟡 Med (424 transitive) |

**Supply Chain Risk Findings:**
- **platform/orchestrator** has **the highest risk surface**: 577 total dependencies
  - Contains gRPC/protobufjs (critical), express (moderate), dockerode (vulnerable to uuid)
  - Used as infrastructure backbone; compromise = full system compromise
  
- **portal/Backend** has 397 prod + 181 dev dependencies
  - Better-sqlite3, OpenTelemetry instrumentation, cors
  - High-value target for supply-chain attacks
  
- **Demo projects** (abac-*) use newer versions of React/Router:
  - Some already updated to React 19.2.4 and react-router-dom 7.13.2
  - Suggests version drift across monorepo (not all projects updated equally)

---

## 🔧 Recommended Remediation Plan

### Phase 1: Critical (This Week)
Priority: Fix arbitrary code execution vulnerabilities

**Actions:**
```bash
# 1. Fix Vitest critical CVE
cd Source/Frontend && npm install vitest@^3.2.6

# 2. Fix Protobufjs in orchestrator
cd platform/orchestrator && npm audit fix

# 3. Identify & remove/upgrade Handlebars
cd Source/Backend
npm ls handlebars  # Identify the path
# If in test framework, update test framework
```

### Phase 2: High Severity (This Sprint)
Priority: Fix path traversal, injection, DoS vulnerabilities

```bash
# All projects
npm audit fix

# Specific upgrades if audit fix doesn't resolve:
cd Source/Frontend && npm install vite@^6.4.3 react-router-dom@^6.30.4
cd platform/orchestrator && npm audit fix
```

### Phase 3: Medium Severity (Next Sprint)
Priority: Update major versions, reduce technical debt

```bash
# Source/Backend: UUID major version upgrade (test thoroughly!)
npm install uuid@^11.1.1
npm test

# pino upgrade (major version)
npm install pino@^10.3.1

# React ecosystem upgrades in Source/Frontend
npm install react@^19 react-dom@^19
```

### Phase 4: Ongoing
- Set up automated dependency scanning (npm audit in CI)
- Use `npm outdated` in pre-commit hooks
- Evaluate using npm 7+ workspaces for monorepo consistency
- Track demo projects separately (different version pins)

---

## 📋 License Compliance Check

**Analysis:** 
All scanned projects use standard OSS licenses (MIT, Apache-2.0, ISC, BSD). No GPL/AGPL dependencies detected that would create viral licensing issues for proprietary code.

**Projects:**
- Source/* packages: MIT, ISC (mostly standard)
- platform/orchestrator: MIT (express, dockerode, multer)
- portal/*: MIT, Apache-2.0 (React, TypeScript, tooling)

**Finding:** 🟢 **No license compliance issues.**

---

## 🔐 Security Context (TheInspector Config)

This audit aligns with **inspector.config.yml** security context:
- **Critical Operations** affected:
  - Protobufjs: Could compromise orchestrator control flow (work item state machine integrity)
  - Vitest: Could compromise build pipeline integrity
  - Handlebars: Could inject code into templates (if used in state transitions)

- **Threat Scenarios** impacted:
  - "Phantom work item access" → Enabled by protobufjs RCE in orchestrator
  - "Store key collision" → Could be enabled by code injection vulnerabilities
  - "Unbounded list exfiltration" → Related to ws DoS (could cause availability issues)

**Escalations to TheGuardians:**
- Protobufjs (RCE)
- Vitest (RCE)
- Handlebars (Code injection)
- All form-data/qs/path-to-regexp issues (could enable access control bypass)

---

## 📝 JSON Summary

```json
{
  "audit_date": "2026-07-15",
  "agent": "dependency_auditor",
  "projects_scanned": 6,
  "direct_dependencies": 30,
  "transitive_dependencies": 2000,
  "vulnerabilities_by_severity": {
    "critical": 3,
    "high": 5,
    "medium": 7,
    "low": 1
  },
  "top_risks": [
    "handlebars@4.7.8 (JS injection, CVSS 9.8)",
    "vitest@3.2.5 (RCE via UI server, CVSS 9.8)",
    "protobufjs@7.5.5 (RCE, CVSS 9.8)"
  ],
  "outdated_major_versions": {
    "express": "4.18 → 4.22 (current) or 5.2.1 (major)",
    "pino": "8.17 → 8.21 or 10.3.1 (2 major versions behind)",
    "uuid": "9.0 → 14.0.1 (5 minor versions behind, directly vulnerable)",
    "react": "18.3 → 19.2 (1 major behind)",
    "react-router-dom": "6.26 → 6.30 or 7.18 (1-2 majors behind)"
  },
  "supply_chain_risk_flags": [
    "platform/orchestrator: 577 transitive deps (highest risk surface)",
    "portal/Backend: 397 prod + 181 dev deps (high-value target)",
    "Version drift across demo projects (newer versions used in abac-* vs Source/)"
  ],
  "license_compliance": "PASS (no GPL/AGPL issues)",
  "escalations_to_guardians": 3,
  "recommended_immediate_actions": [
    "Upgrade vitest to >=3.2.6",
    "Fix protobufjs via @grpc/grpc-js upgrade",
    "Remove or upgrade handlebars"
  ],
  "estimated_fix_time_hours": {
    "critical": 4,
    "high": 6,
    "medium": 4,
    "total": 14
  }
}
```

---

## 📚 Cross-References

- [ESCALATE → TheGuardians]: Protobufjs RCE, Vitest RCE, Handlebars code injection
- [ESCALATE → TheFixer]: All medium/low severity CVEs, outdated major versions
- [CROSS-REF: red-teamer]: Form-data CRLF injection could enable email header spoofing if orchestrator sends notifications
- [CROSS-REF: chaos-monkey]: Test gRPC malformed message handling under GHSA-5375/GHSA-99f4 attack scenarios
- [CROSS-REF: static-analyzer]: Handlebars usage in Source/Backend — if found, audit template rendering code for untrusted input

---

## 🔄 Next Steps

1. **Review this report** with dev leads
2. **Assign Phase 1 fixes** to backend/frontend teams immediately
3. **Verify all tests pass** after npm audit fix
4. **Update learnings document** with version pins and CVE watch list
5. **Schedule Phase 2-4 remediation** in sprint planning

---

**Report Generated By:** dependency_auditor (Claude Haiku)  
**Confidence Level:** High (npm audit tool provides authoritative CVE data)  
**Recommended Review By:** Security lead, backend lead, frontend lead
