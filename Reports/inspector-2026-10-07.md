# TheInspector — System Health Audit Report

> **Grade: D** &nbsp;|&nbsp; Branch: `main` &nbsp;|&nbsp; Date: 2026-10-07 &nbsp;|&nbsp; Mode: Static (services offline)
>
> ⚠️ **Security escalations present — TheGuardians review required before next release.**

---

## Section 1 — Header

| Field | Value |
|-------|-------|
| **Overall Grade** | 🔴 **D** |
| **Audit Date** | 2026-10-07 |
| **Branch** | main |
| **Scope Mode** | Full codebase — static analysis (backend/frontend services offline) |
| **Specialists Run** | quality-oracle · dependency-auditor (performance-profiler and chaos-monkey skipped — services down) |
| **Escalations** | ⚠️ 5 findings escalated → TheGuardians |

---

## Section 2 — Scorecards

| Specialist | P1 | P2 | P3 | P4 | Spec Coverage | Dynamic Tests | FIXED |
|---|---|---|---|---|---|---|---|
| quality-oracle | 1 | 2 | 2 | 2 | 97% actual / **12.7% gated** | — | 0 |
| dependency-auditor | 4 | 7 | 5 | 2 | N/A | — | 0 |
| performance-profiler | *skipped* | — | — | — | — | 0 | — |
| chaos-monkey | *skipped* | — | — | — | — | 0 | — |
| **TOTAL** | **5** | **9** | **7** | **4** | — | — | **0** |

**Grade thresholds (from inspector.config.yml):**

| Grade | Max P1 | Max P2 | Min Coverage |
|-------|--------|--------|--------------|
| A | 0 | 3 | 80% |
| B | 0 | 8 | 60% |
| C | 2 | 15 | 40% |
| **D** | **5 (exceeds C)** | — | — |

---

## Section 3 — Executive Summary

Five P1 findings require immediate action. This codebase is well-structured at the source level (no hardcoded secrets, no console.log leakage, consistent type imports, good per-file traceability discipline) — but the dependency layer carries critical unpatched CVEs, and the quality gate has a structural blindspot that silently passes while 87% of FRs are outside its scan scope.

**Top 5 issues an operator must know today:**

1. **protobufjs RCE (CVSS 9.8)** — Arbitrary code execution possible via malformed protobuf messages. Affects the gRPC orchestrator and portal backend. Patch within hours.
2. **handlebars injection chain (CVSS 9.3, 8 CVEs)** — Template injection in the Source/Backend transitive dependency chain. If any user-controlled input reaches Handlebars, this is code execution.
3. **proxy-addr auth bypass** — Express trust-proxy IP spoofing. Affects Source/Backend and orchestrator. Any reverse-proxy deployment is at risk.
4. **Traceability gate blindspot** — The CI gate (`python3 tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`, silently passing while `portal/` (74 FRs) and `platform/` (9 FRs) are never checked. 86 of 99 FRs are permanently outside gate coverage.
5. **7 additional HIGH CVEs** — path-to-regexp ReDoS, grpc-js crash/auth bypass, form-data CRLF injection, nanoid weak RNG, and more in the P2 backlog.

---

## Section 4 — Scope & Environment

| Item | Value |
|------|-------|
| **Codebase** | dev-crew Source App — Express REST API + React SPA |
| **Directories scanned** | Source/, portal/, platform/orchestrator, E2E/ |
| **Package manifests** | 6 npm workspaces (Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend) |
| **Specs audited** | workflow-engine.md (13 FRs), dev-workflow-platform.md (76 FRs), tiered-merge-pipeline.md (10 FRs) |
| **Services checked** | backend (localhost:3001) — offline · frontend (localhost:5173) — offline |
| **performance-profiler** | Skipped (backend offline) |
| **chaos-monkey** | Skipped (all services required) |
| **Data caveats** | Dependency audit uses npm audit output — some moderate CVEs may be dev-only; vitest/tinypool (DEP-004) is test-time only, lower production risk |
| **Prior audit** | None — first audit run |

---

## Section 5 — Trend

**First audit — no baseline available.**

No prior `Teams/TheInspector/findings/` entries exist for comparison. All findings are classified as **NEW**. Baseline established today at Grade D with 5 P1 / 9 P2 findings.

Next audit target: Grade C (resolve all P1 CVEs, reduce P2 count to ≤15).

---

## Section 6 — Specialist Reports

### quality-oracle
| Field | Value |
|-------|-------|
| Mode | Static |
| Verdict | ⚠️ Issues found |
| P1 / P2 / P3 / P4 | 1 / 2 / 2 / 2 |
| Spec coverage | 97% actual traced; 12.7% gated (enforcer blindspot) |
| Duration | Static analysis |

Architecture and pattern discipline is strong. No console.log, no hardcoded secrets, no empty catches, no inline type re-definitions, no files over 500 lines. The single P1 is a tooling gap (gate blindspot), not a code quality issue.

### dependency-auditor
| Field | Value |
|-------|-------|
| Mode | Static (npm audit) |
| Verdict | 🔴 Critical findings |
| P1 / P2 / P3 / P4 | 4 / 7 / 5 / 2 |
| Total vulnerabilities | 152 (12 critical, 67 high, 67 moderate, 6 low) |
| Highest risk workspace | portal/Backend — 61 vulns, 578 transitive deps |
| Duration | Static analysis |

### performance-profiler
*Skipped — backend service offline at time of audit.*

### chaos-monkey
*Skipped — all services must be healthy for chaos testing.*

---

## Section 7 — Re-Verification Summary

| Finding | Status | Notes |
|---------|--------|-------|
| All QO-* | NEW | First audit |
| All DEP-* | NEW | First audit |

No FIXED, STILL OPEN, or REGRESSED items — this is the baseline audit.

---

## Section 8 — Cross-Reference Map

Root causes that span multiple specialists — a single fix resolves findings from 2+ specialists.

| Root Cause | Affected Findings | Single Fix | Fix Impact |
|---|---|---|---|
| **Unpatched gRPC/protobuf stack** | DEP-001 (RCE), DEP-007 (crash/auth bypass) | `npm update @grpc/grpc-js` in platform/orchestrator and portal/Backend | Resolves both P1 DEP-001 and P2 DEP-007 simultaneously |
| **CI gate doesn't cover full codebase** | QO-001 (enforcer blindspot) + all future undetected drift in portal/ and platform/ | Extend enforcer scan dirs OR add per-spec gate invocations to CLAUDE.md | Closes the structural gap enabling silent spec drift across 86 FRs |
| **Express transitive dep lag** | DEP-002 (proxy-addr), DEP-005 (path-to-regexp) | `npm update express` in Source/Backend and orchestrator | One `npm update express` resolves P1 DEP-002 and P2 DEP-005 together |
| **form-data and multipart handling** | DEP-011 (CRLF injection) + [CROSS-REF: red-teamer] file upload audit | `npm update form-data`, audit upload endpoints | Resolves both the dep CVE and the code-level upload risk |
| **portal/Backend dep sprawl** | DEP-001 (via opentelemetry), DEP-007 (via grpc-js), DEP-011, DEP-005 | Upgrade opentelemetry packages in portal/Backend | One upgrade wave resolves 4+ findings in the highest-risk workspace |

---

## Section 9 — P1 Findings (Expanded)

### QO-001 — Traceability Enforcer Blindspot
- **ID:** QO-001 · **Severity:** P1 · **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py` (line ~65: `source_dirs = ["Source", "E2E"]`)
- **Status:** NEW
- **Exploit scenario:** The CI verification gate always passes — even if `portal/` or `platform/` implementations diverge from specs completely. A developer deletes the only implementation of FR-020 in portal/ and the gate still reports clean. Spec drift accumulates silently.
- **Impact:** 86 of 99 tracked FRs are permanently invisible to the automated gate. The CLAUDE.md verification step is functionally broken for most of the codebase.
- **Recommendation:** Add `"portal"` and `"platform"` to `source_dirs` in the enforcer, OR add `--file Specifications/dev-workflow-platform.md` and `--file Specifications/tiered-merge-pipeline.md` invocations to CLAUDE.md verification gates. Route to **TheFixer**.
- **[CROSS-REF: dependency-auditor]** — The same gap that hides spec drift also means new vulnerabilities in portal/ may not be caught by automated checks.

---

### DEP-001 — protobufjs Arbitrary Code Execution (CVSS 9.8)
- **ID:** DEP-001 · **Severity:** P1 · **Category:** CVE / Remote Code Execution
- **Package:** `protobufjs` (<7.5.5)
- **Files:** `platform/orchestrator/package-lock.json`, `portal/Backend/package-lock.json`
- **Status:** NEW · **[ESCALATE → TheGuardians]**
- **Exploit scenario:** An attacker sends a malformed protobuf message to any gRPC endpoint (or uploads a crafted `.proto` file). The prototype pollution gadget chain in protobufjs triggers arbitrary code execution in the Node.js process. Full server compromise.
- **CVSS:** 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
- **Impact:** Remote code execution on orchestrator and portal backend. Complete compromise of the pipeline infrastructure.
- **Fix:**
  ```bash
  cd platform/orchestrator && npm update @grpc/grpc-js --force
  cd portal/Backend && npm update @opentelemetry/auto-instrumentations-node --force
  ```
- **Timeline:** IMMEDIATE (within hours).

---

### DEP-002 — proxy-addr IPv4-Mapped IPv6 Trust Bypass (CVSS 7.5)
- **ID:** DEP-002 · **Severity:** P1 · **Category:** CVE / Authentication Bypass
- **Package:** `proxy-addr` (<1.3.2 in some configs)
- **Files:** `Source/Backend/package-lock.json`, `platform/orchestrator/package-lock.json`
- **Status:** NEW · **[ESCALATE → TheGuardians]**
- **Exploit scenario:** Attacker behind a reverse proxy sends `X-Forwarded-For: ::ffff:127.0.0.1`. Express trusts this as a loopback address, granting any request the same trust level as a local connection. IP-based access controls and rate limiting are bypassed.
- **CVSS:** 7.5
- **Impact:** Authentication and rate-limiting bypass for any deployment behind a reverse proxy with `trust proxy` enabled.
- **Fix:**
  ```bash
  cd Source/Backend && npm update express --save
  cd platform/orchestrator && npm update express --save
  ```
- **Timeline:** Within 48 hours.

---

### DEP-003 — handlebars JavaScript Injection Chain (CVSS 9.3, 8 CVEs)
- **ID:** DEP-003 · **Severity:** P1 · **Category:** CVE / Template Injection
- **Package:** `handlebars` (≤4.7.8)
- **Files:** `Source/Backend/package-lock.json` (transitive)
- **Status:** NEW · **[ESCALATE → TheGuardians]**
- **Exploit scenario:** If any user-controlled string reaches `Handlebars.compile()` — via config files, form inputs, or template partials — the attacker injects a crafted partial to execute arbitrary JavaScript via AST Type Confusion. Prototype pollution enables further attack chains.
- **CVSS:** 9.3+
- **Impact:** Code execution if handlebars processes untrusted input. Even if not in the critical path today, this vulnerability will be exploited if the dependency remains.
- **Fix:**
  ```bash
  cd Source/Backend && npm audit fix --force
  ```
- **Timeline:** IMMEDIATE. Verify whether handlebars is in the production request path; escalate to TheGuardians for code audit.

---

### DEP-004 — vitest/tinypool Worker Thread Sandbox Escape (CVSS 8.6)
- **ID:** DEP-004 · **Severity:** P1 (test context) · **Category:** CVE / Worker Sandbox Escape
- **Package:** `vitest` (≤2.0.5), `tinypool`
- **Files:** `Source/Frontend/package-lock.json`, `portal/Frontend/package-lock.json`
- **Status:** NEW
- **Exploit scenario:** A malicious test file or dependency confusion attack plants code that escapes the vitest worker sandbox. Side-channel attacks possible in shared worker pools. Primarily a CI/build-time risk.
- **CVSS:** 8.6
- **Impact:** Build/CI compromise — lower production risk but critical for supply chain integrity.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest
  cd portal/Frontend && npm update vitest
  ```
- **Timeline:** Within 1 week.
- **Note:** Production impact is low; this is P1 due to CVSS score and CI exposure.

---

## Section 10 — Risk Matrix

```
Severity  │ Zero-precondition │ Authenticated │ Privileged │ Admin │ Physical
──────────┼───────────────────┼───────────────┼────────────┼───────┼─────────
P1        │ DEP-001 DEP-003   │ DEP-002       │            │       │
          │ DEP-004           │               │            │       │
──────────┼───────────────────┼───────────────┼────────────┼───────┼─────────
P2        │ DEP-005 DEP-006   │ DEP-007       │            │       │
          │ DEP-010 DEP-011   │ DEP-009       │            │       │
          │ QO-003            │               │            │       │
──────────┼───────────────────┼───────────────┼────────────┼───────┼─────────
P2 (tool) │ QO-001 QO-002     │               │            │       │
──────────┼───────────────────┼───────────────┼────────────┼───────┼─────────
P3        │ DEP-008           │               │ QO-004     │       │
          │ DEP-012…016       │               │ QO-005     │       │
──────────┼───────────────────┼───────────────┼────────────┼───────┼─────────
P4        │ DEP-017           │               │ QO-006     │ QO-007│
```

---

## Section 11 — Spec Coverage

**Overall actual traced coverage: ~97%**
**CI gate effective coverage: 12.7%** ← structural gap (QO-001)

| Specification | Total FRs | Traced | Coverage | Gated? |
|---|---|---|---|---|
| workflow-engine.md | 13 | 13 | 100% | ✅ Yes |
| dev-workflow-platform.md | 76 | 74 | 97.4% | ❌ No (portal/) |
| tiered-merge-pipeline.md | 10 | 9 | 90% | ❌ No (platform/) |
| **Effective gate total** | 13 | 13 | **12.7%** | — |

**Top uncovered/ungated requirements:**
1. FR-TMP-008 — `gh` CLI in Dockerfile.worker (unimplemented, zero references)
2. FR-018 — (dev-workflow-platform.md) — not traced (portal/ excluded from gate)
3. FR-019 — (dev-workflow-platform.md) — not traced
4. FR-020…074 — portal/ FRs — all outside gate scan (74 items total)
5. FR-TMP-001…007, 009, 010 — platform/ FRs — outside gate scan (9 items total)

---

## Section 12 — Latency Baselines

**Performance-profiler was skipped** — backend service at `http://localhost:3001/` was offline.

Static analysis identified these patterns to validate on next dynamic run:

| Endpoint | Budget (p95) | Static Risk | Status |
|---|---|---|---|
| GET /api/work-items | 100ms | Unbounded Map iteration — no slice/limit | ⚠️ Check |
| GET /api/dashboard | 150ms | Large payload serialisation possible | ⚠️ Check |
| All endpoints | 200ms (default p95) | Synchronous I/O: none (in-memory) | ✅ Low risk |

---

## Section 13 — P2 Findings

| ID | Category | Title | File/Package | Status |
|---|---|---|---|---|
| QO-002 | test-coverage | Duplicate frontend test files at two paths | Source/Frontend/tests/*.test.tsx | NEW |
| QO-003 | spec-drift | FR-TMP-008 has no implementation reference | Specifications/tiered-merge-pipeline.md | NEW |
| DEP-005 | CVE / DoS | path-to-regexp ReDoS (CVSS 7.5) | platform/orchestrator, portal/Backend | NEW |
| DEP-006 | CVE / DoS | brace-expansion unbounded recursion (7 CVEs) | Source/Backend | NEW |
| DEP-007 | CVE / Auth | @grpc/grpc-js crash + auth bypass (4 CVEs) | platform/orchestrator, portal/Backend | NEW |
| DEP-008 | CVE / DoS | browserslist memory exhaustion + prototype write | Source/Frontend, portal/Frontend | NEW |
| DEP-009 | CVE / Crypto | nanoid weak RNG (if used for tokens) | Source/Frontend, portal/Backend | NEW · [ESCALATE → TheGuardians] |
| DEP-010 | CVE / DoS | js-yaml quadratic DoS (3 CVEs) | Source/Backend | NEW |
| DEP-011 | CVE / Injection | form-data CRLF injection in multipart upload | All workspaces | NEW · [ESCALATE → TheGuardians] |

**Fix commands for P2 batch:**
```bash
# Resolves DEP-005, DEP-006, DEP-007, DEP-008, DEP-010, DEP-011
cd platform/orchestrator && npm update
cd portal/Backend && npm update
cd Source/Backend && npm update
cd Source/Frontend && npm update browserslist vitest
cd portal/Frontend && npm update browserslist vitest
```

---

## Section 14 — Fixed Findings

**No fixed findings** — this is the baseline (first) audit. No prior state to compare against.

---

## Section 15 — Recommendations

### 🔴 Block Deployment (resolve before next release)
1. **Patch protobufjs** (DEP-001) — `npm update @grpc/grpc-js --force` in platform/orchestrator and portal/Backend
2. **Patch proxy-addr** (DEP-002) — `npm update express` in Source/Backend and orchestrator
3. **Patch handlebars** (DEP-003) — `npm audit fix --force` in Source/Backend; TheGuardians audits for user-controlled template compilation
4. **TheGuardians security review** — Triggered by DEP-001, DEP-002, DEP-003, DEP-009, DEP-011 escalations

### 🟠 This Sprint
5. **Fix enforcer gate** (QO-001) — Add `portal/` and `platform/` to scan dirs, or add per-spec gate invocations → TheFixer
6. **Patch vitest** (DEP-004) — `npm update vitest` in Source/Frontend and portal/Frontend
7. **Batch P2 CVE patches** (DEP-005 through DEP-011) — run npm update across all workspaces
8. **Verify FR-TMP-008** (QO-003) — Confirm `gh` CLI is in Dockerfile.worker; add traceability comment
9. **Remove duplicate test files** (QO-002) — Delete root-level WorkItemDetailPage/WorkItemListPage tests, keep tests/pages/ versions

### 🟡 Next Sprint
10. **Add logging to dependency catch block** (QO-004) — `logger.warn()` for 400/404/409 branches in workflow.ts
11. **Document eslint-disable suppressions** (QO-005) — Explain WHY each react-hooks/exhaustive-deps suppression is safe
12. **Plan React 18→19 upgrade** (DEP-012)
13. **Upgrade uuid** (DEP-013) — 5 major versions behind, verify API compatibility first
14. **Upgrade Pino** (DEP-014) and OpenTelemetry (DEP-016)

### 🔵 Backlog
15. **Fix DebugPortalPage traceability comment** (QO-006) — Use a real FR ID or mark as internal tooling
16. **Resolve FR-XXXX namespace ambiguity** (QO-007) — Distinguish requirement IDs from entity IDs in the spec
17. **Audit portal/Backend transitive deps** (DEP-017) — 578 transitive packages; prune unnecessary ones
18. **Add `npm audit` to CI** (DEP-017 follow-on) — `--audit-level=moderate` gate in every workspace
19. **Upgrade @types/node** (DEP-015)

---

## Section 16 — P3/P4 Summary

### P3 Findings

| ID | Category | Title | Status |
|---|---|---|---|
| QO-004 | pattern-violation | Expected errors in dependency catch block not logged | NEW |
| QO-005 | pattern-violation | Undocumented eslint-disable suppressions | NEW |
| DEP-012 | outdated-major | React 18→19 (1 major behind) | NEW |
| DEP-013 | outdated-major | uuid 9→14 (5 majors behind) | NEW |
| DEP-014 | outdated-major | Pino 8→10 (2 majors behind) | NEW |
| DEP-015 | outdated-major | @types/node significantly behind | NEW |
| DEP-016 | outdated-major | OpenTelemetry 40+ patch versions behind | NEW |

### P4 Findings

| ID | Category | Title | Status |
|---|---|---|---|
| QO-006 | pattern-violation | DebugPortalPage non-standard Verifies comment | NEW |
| QO-007 | spec-drift | FR-XXXX notation ambiguity in platform spec | NEW |
| DEP-017 | supply-chain | portal/Backend 578 transitive deps (supply chain risk) | NEW |
| DEP-018 | supply-chain-positive | No post-install scripts detected ✅ | POSITIVE |

---

## Escalation Block

The following findings are escalated to **TheGuardians** for full security review:

| Finding | Summary | Risk |
|---------|---------|------|
| DEP-001 | protobufjs RCE (CVSS 9.8) | Remote code execution via untrusted protobuf |
| DEP-002 | proxy-addr auth bypass | IP trust model bypass behind reverse proxy |
| DEP-003 | handlebars injection chain (CVSS 9.3) | Code execution if user-controlled templates |
| DEP-009 | nanoid weak RNG | Predictable IDs if used for security tokens |
| DEP-011 | form-data CRLF injection | Header injection in multipart file uploads |

```
⚠️  ESCALATION → TheGuardians
   Findings : DEP-001 (protobufjs RCE CVSS 9.8), DEP-002 (proxy-addr auth bypass),
              DEP-003 (handlebars injection CVSS 9.3), DEP-009 (nanoid weak RNG),
              DEP-011 (form-data CRLF injection)
   Branch  : main
   When    : before next release

   To trigger TheGuardians:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see bug-backlog-2026-10-07.json)
```

---

## Bug Backlog JSON

```json
{
  "audit_id": "inspector-2026-10-07",
  "audit_date": "2026-10-07",
  "grade": "D",
  "specialists": ["quality-oracle", "dependency-auditor"],
  "skipped_specialists": ["performance-profiler", "chaos-monkey"],
  "skip_reason": "Services offline (backend: localhost:3001, frontend: localhost:5173)",
  "totals": {
    "p1": 5,
    "p2": 9,
    "p3": 7,
    "p4": 4,
    "total_findings": 25
  },
  "escalations": [
    {
      "id": "DEP-001",
      "severity": "P1",
      "title": "protobufjs Arbitrary Code Execution",
      "cvss": 9.8,
      "packages": ["protobufjs (<7.5.5)"],
      "workspaces": ["platform/orchestrator", "portal/Backend"],
      "fix": "npm update @grpc/grpc-js --force",
      "route_to": "TheGuardians",
      "escalation_reason": "Remote code execution via untrusted protobuf messages"
    },
    {
      "id": "DEP-002",
      "severity": "P1",
      "title": "proxy-addr IPv4-Mapped IPv6 Trust Bypass",
      "cvss": 7.5,
      "packages": ["proxy-addr (via express)"],
      "workspaces": ["Source/Backend", "platform/orchestrator"],
      "fix": "npm update express --save",
      "route_to": "TheGuardians",
      "escalation_reason": "Authentication bypass via IP spoofing behind reverse proxy"
    },
    {
      "id": "DEP-003",
      "severity": "P1",
      "title": "handlebars JavaScript Injection Chain (8 CVEs)",
      "cvss": 9.3,
      "packages": ["handlebars (<=4.7.8)"],
      "workspaces": ["Source/Backend"],
      "fix": "npm audit fix --force in Source/Backend",
      "route_to": "TheGuardians",
      "escalation_reason": "Template injection / code execution if user-controlled input reaches Handlebars.compile()"
    },
    {
      "id": "DEP-009",
      "severity": "P2",
      "title": "nanoid Weak Random Number Generation",
      "cvss": 7.5,
      "packages": ["nanoid"],
      "workspaces": ["Source/Frontend", "portal/Backend", "portal/Frontend"],
      "fix": "Verify nanoid version; use crypto.randomUUID() for security tokens",
      "route_to": "TheGuardians",
      "escalation_reason": "Predictable IDs if nanoid used for session tokens or security nonces"
    },
    {
      "id": "DEP-011",
      "severity": "P2",
      "title": "form-data CRLF Injection in Multipart Upload",
      "cvss": 7.5,
      "packages": ["form-data (>=4.0.0 <4.0.6)"],
      "workspaces": ["Source/Backend", "Source/Frontend", "portal/Backend", "portal/Frontend"],
      "fix": "npm update form-data",
      "route_to": "TheGuardians",
      "escalation_reason": "Header injection via crafted filename in multipart upload"
    }
  ],
  "backlog": [
    {
      "id": "QO-001",
      "severity": "P1",
      "category": "architecture-violation",
      "title": "Traceability enforcer excludes portal/ and platform/ (86 of 99 FRs outside gate)",
      "file": "tools/traceability-enforcer.py",
      "line": 65,
      "recommendation": "Add 'portal' and 'platform' to source_dirs, or add per-spec gate invocations",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-004",
      "severity": "P1",
      "category": "CVE",
      "title": "vitest/tinypool Worker Thread Sandbox Escape (CVSS 8.6)",
      "packages": ["vitest (<=2.0.5)", "tinypool"],
      "workspaces": ["Source/Frontend", "portal/Frontend"],
      "fix": "npm update vitest",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "QO-002",
      "severity": "P2",
      "category": "test-coverage",
      "title": "Duplicate frontend test files at two paths — regression masking risk",
      "files": [
        "Source/Frontend/tests/WorkItemDetailPage.test.tsx",
        "Source/Frontend/tests/WorkItemListPage.test.tsx"
      ],
      "recommendation": "Delete root-level versions; keep tests/pages/ versions",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "QO-003",
      "severity": "P2",
      "category": "spec-drift",
      "title": "FR-TMP-008 has no implementation reference — gh CLI may be missing from Dockerfile.worker",
      "file": "platform/Dockerfile.worker (verify)",
      "recommendation": "Verify gh CLI installed; add // Verifies: FR-TMP-008 comment",
      "route_to": "solo-session (platform/ only)",
      "status": "NEW"
    },
    {
      "id": "DEP-005",
      "severity": "P2",
      "category": "CVE",
      "title": "path-to-regexp ReDoS (CVSS 7.5)",
      "packages": ["path-to-regexp (<0.1.13)"],
      "workspaces": ["platform/orchestrator", "portal/Backend"],
      "fix": "npm update in affected workspaces",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-006",
      "severity": "P2",
      "category": "CVE",
      "title": "brace-expansion unbounded recursion / DoS (7 CVEs)",
      "packages": ["brace-expansion (<1.1.21)"],
      "workspaces": ["Source/Backend"],
      "fix": "npm update brace-expansion",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-007",
      "severity": "P2",
      "category": "CVE",
      "title": "@grpc/grpc-js server crash + auth bypass (4 CVEs)",
      "packages": ["@grpc/grpc-js (>=1.14.0 <1.14.5)"],
      "workspaces": ["platform/orchestrator", "portal/Backend"],
      "fix": "npm update to @grpc/grpc-js >=1.14.5",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-008",
      "severity": "P2",
      "category": "CVE",
      "title": "browserslist memory exhaustion + prototype write (2 CVEs)",
      "packages": ["browserslist (<=4.28.6)"],
      "workspaces": ["Source/Frontend", "portal/Frontend"],
      "fix": "npm update browserslist",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-010",
      "severity": "P2",
      "category": "CVE",
      "title": "js-yaml quadratic-time DoS (3 CVEs)",
      "packages": ["js-yaml (<3.15.0)"],
      "workspaces": ["Source/Backend"],
      "fix": "npm update js-yaml",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "QO-004",
      "severity": "P3",
      "category": "pattern-violation",
      "title": "Expected errors in dependency catch block not logged",
      "file": "Source/Backend/src/routes/workflow.ts",
      "line_range": "330-351",
      "recommendation": "Add logger.warn() before each status-specific return (400/404/409 branches)",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "QO-005",
      "severity": "P3",
      "category": "pattern-violation",
      "title": "Undocumented eslint-disable suppressions (react-hooks/exhaustive-deps)",
      "files": [
        "Source/Frontend/src/hooks/useWorkItems.ts:63",
        "Source/Frontend/src/components/DependencyPicker.tsx:82"
      ],
      "recommendation": "Add explanatory comment for each suppression",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-012",
      "severity": "P3",
      "category": "outdated-major",
      "title": "React 18→19 (1 major version behind)",
      "packages": ["react@18.3.1"],
      "fix": "Plan React 19 upgrade",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-013",
      "severity": "P3",
      "category": "outdated-major",
      "title": "uuid 9→14 (5 major versions behind)",
      "packages": ["uuid@9.0.0"],
      "fix": "npm update uuid@latest --save (verify API compatibility)",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-014",
      "severity": "P3",
      "category": "outdated-major",
      "title": "Pino 8→10 (2 major versions behind)",
      "packages": ["pino@8.17.0"],
      "fix": "npm update pino@10 --save",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-015",
      "severity": "P3",
      "category": "outdated-major",
      "title": "@types/node significantly behind (Node 20 → 22+)",
      "fix": "npm update @types/node@latest --save-dev",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-016",
      "severity": "P3",
      "category": "outdated-minor",
      "title": "OpenTelemetry 40+ patch versions behind (0.40.3 → 0.81.0+)",
      "fix": "npm update @opentelemetry/auto-instrumentations-node@latest in portal/Backend",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "QO-006",
      "severity": "P4",
      "category": "pattern-violation",
      "title": "DebugPortalPage non-standard Verifies comment",
      "file": "Source/Frontend/src/pages/DebugPortalPage.tsx",
      "line": 1,
      "recommendation": "Use a real FR ID or mark as internal tooling exempt from traceability",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "QO-007",
      "severity": "P4",
      "category": "spec-drift",
      "title": "FR-XXXX notation ambiguity — requirement IDs vs entity IDs in platform spec",
      "file": "Specifications/dev-workflow-platform.md",
      "line": 475,
      "recommendation": "Add note distinguishing requirement IDs (FR-020) from entity IDs (FR-0004)",
      "route_to": "TheFixer",
      "status": "NEW"
    },
    {
      "id": "DEP-017",
      "severity": "P4",
      "category": "supply-chain",
      "title": "portal/Backend 578 transitive dependencies — elevated supply chain risk",
      "recommendation": "Audit and prune unnecessary transitive dependencies; add npm audit to CI",
      "route_to": "TheFixer",
      "status": "NEW"
    }
  ],
  "positive_findings": [
    {
      "id": "DEP-018",
      "title": "No post-install scripts detected — good supply chain hygiene",
      "note": "Maintain this policy; add detection to CI"
    },
    {
      "title": "No console.log in production source",
      "source": "quality-oracle"
    },
    {
      "title": "No hardcoded secrets or passwords",
      "source": "quality-oracle"
    },
    {
      "title": "No empty catch blocks — all catch paths log or re-throw",
      "source": "quality-oracle"
    },
    {
      "title": "Types consistently imported from Shared/ — no inline re-definitions",
      "source": "quality-oracle"
    },
    {
      "title": "Source/E2E — zero vulnerabilities",
      "source": "dependency-auditor"
    }
  ],
  "next_audit_target": {
    "grade": "C",
    "requirements": "Resolve all 5 P1 findings; reduce P2 to ≤15",
    "recommended_date": "2026-10-21"
  }
}
```
