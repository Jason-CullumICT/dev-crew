# TheInspector — System Health Audit Report

**Grade: F** &nbsp;|&nbsp; Date: 2026-07-30 &nbsp;|&nbsp; Branch: `audit/inspector-2026-07-30-3735d2` &nbsp;|&nbsp; Run: `run-20260730-052653`

> **Full HTML report:** `Teams/TheInspector/findings/audit-2026-07-30-F.html`  
> **Bug backlog JSON:** `Teams/TheInspector/findings/bug-backlog-2026-07-30.json`

---

## §1 Header

| Item | Value |
|------|-------|
| Project | dev-crew Source App |
| Audit Date | 2026-07-30 |
| Branch | `audit/inspector-2026-07-30-3735d2` |
| Run ID | `run-20260730-052653` |
| **Overall Grade** | **F** — 5 P1 findings; 3 CVSS 9.8 exploitable vulnerabilities (DEP-001/002/003); exploitable auth bypass (Vitest UI, no auth) + critical domain failure (Handlebars RCE) |
| Specialists | quality-oracle ✓, dependency-auditor ✓, performance-profiler ⏭ (skipped), chaos-monkey ⏭ (skipped) |
| Mode | Static-only — services offline |

---

## §2 Scorecards

| Severity | Count | Key Specialists |
|----------|-------|----------------|
| **P1 Critical** | **5** | QO-001, DEP-001, DEP-002, DEP-003, DEP-004 |
| **P2 High** | **9** | QO-002/003/004, DEP-005–010 |
| **P3 Medium** | **9** | QO-005/006/007, DEP-011–016 |
| **P4 Low/Info** | **6** | QO-008/009/010, DEP-017–019 |
| **Total** | **29** | — |

| Metric | Value |
|--------|-------|
| Source/ spec coverage | 97% (28/29 FRs implemented) |
| Enforcer gate actual coverage | ~29% of active FRs (structural false-green — see QO-001) |
| portal/ spec coverage | **0%** (not scanned) |
| Dynamic findings | None (services offline) |
| Fixed since prior | N/A — first audit |

---

## §3 Executive Summary

**Top 5 things an operator needs to know:**

1. **Your dev toolchain can steal credentials.** Vitest@2.0.5 (Source/Frontend, portal/Frontend) opens an unauthenticated HTTP server on localhost when `test:watch` is running. Any machine on the same LAN can read `.env` files, SSH keys, and source code. Fix immediately: `npm update vitest@3.2.6` in both workspaces. **CVSS 9.8 / zero-precondition.**

2. **Your traceability gate is reporting false success.** `tools/traceability-enforcer.py` silently scans only 13 of 45 active requirements on every CI run. Every push reports TRACEABILITY PASSED while 32 FRs are completely unchecked. The project's primary quality mechanism is structurally broken.

3. **78 dependency vulnerabilities — 3 CRITICAL (CVSS 9.8) with known exploits.** Handlebars (RCE), Vitest (file read/execute), and OpenTelemetry/gRPC (DoS) are actionable today with `npm update`. All P2 CVEs follow from `npm audit fix`.

4. **portal/ is a full production application that nobody is inspecting.** The debug portal implements FR-001–FR-095 (95+ FRs) with its own Backend, Frontend, Shared, and Dockerfile — yet it appears in zero quality gates, zero spec coverage checks, and zero dependency audit workflows configured in this project.

5. **Architecture rules are violated in workItems.ts.** Route handlers call the store directly (bypassing the service layer) and business logic lives inline in HTTP handlers — a direct violation of CLAUDE.md architecture rules.

---

## §4 Scope & Environment

| Dimension | Value |
|-----------|-------|
| Source dirs scanned | `Source/` (per inspector.config.yml) — portal/ excluded |
| npm Workspaces | Source/Backend, Source/Frontend, Source/E2E, platform/orchestrator, portal/Backend, portal/Frontend |
| Specialists run | quality-oracle (static), dependency-auditor (static) |
| Specialists skipped | performance-profiler, chaos-monkey — services offline (localhost:3001, localhost:5173 not responding) |
| Requirements scanned | Plans/self-judging-workflow/requirements.md + Plans/dependency-linking/requirements.md |
| Data caveats | CVEs from npm registry; no dynamic exploitation. Spec coverage is static comment analysis only. |

---

## §5 Trend

> **First audit — no baseline.** All 29 findings are classified as NEW. A baseline is now established. The next audit will show FIXED / STILL OPEN / REGRESSED comparisons against today's results.

---

## §6 Specialist Reports

| Specialist | Mode | Verdict | P1 | P2 | P3 | P4 |
|-----------|------|---------|----|----|----|----|
| quality-oracle | Static | **FAIL (D)** | 1 | 3 | 3 | 3 |
| dependency-auditor | Static | **FAIL (F)** | 4 | 6 | 6 | 3 |
| performance-profiler | — | ⏭ Skipped | — | — | — | — |
| chaos-monkey | — | ⏭ Skipped | — | — | — | — |

**quality-oracle:** Scanned Source/ against FR-WF-* and FR-dependency-* requirements. Found the traceability gate is structurally broken (P1), portal/ is invisible to all gates (P2), FR-dependency-seed is missing (P2), and dependency features are duplicated with incompatible ID schemes across Source/ and portal/ (P2).

**dependency-auditor:** Scanned 6 npm workspaces. Found 3 CRITICAL CVSS 9.8 vulnerabilities (Handlebars RCE, Vitest file read/execute, gRPC DoS), 10 HIGH, 59 MODERATE, and 6 LOW/INFO. Total: 78 CVEs.

---

## §7 Re-Verification Summary

| Status | Count | Notes |
|--------|-------|-------|
| 🆕 NEW | 29 | All findings — first audit, no prior baseline |
| ✅ FIXED | 0 | — |
| 🔁 STILL OPEN | 0 | — |
| ⬇ REGRESSED | 0 | — |

---

## §8 Cross-Reference Map

Root causes spanning multiple specialists — one fix resolves multiple findings:

| Root Cause | Findings Resolved | Specialists | Single Fix | Impact |
|-----------|-------------------|------------|-----------|--------|
| **portal/ excluded from all monitoring** | QO-002 + DEP-004 | quality-oracle, dependency-auditor | Add `portal/` to `inspector.config.yml source.dirs` | Closes 1 P2 + 1 P1; prevents future silent accumulation |
| **Stale dev toolchain (vitest/vite drift)** | DEP-002, DEP-003, DEP-008, DEP-016 | dependency-auditor (cross-workspace) | `npm update vitest@3.2.6 vite@latest` in Source/Frontend + portal/Frontend | Closes 2 P1 + 1 P2 + 1 P3 in single pass |
| **No automated dep scanning in CI** | QO-001 + all 19 DEP findings | quality-oracle, dependency-auditor | Fix enforcer (QO-001) + add `npm audit` to GitHub Actions | Structural fix; prevents recurrence of entire DEP class |
| **Incomplete in-memory store implementation** | QO-003, QO-007, QO-010 | quality-oracle | Service layer refactor + seed.ts + enum value | Closes 1 P2 + 1 P3 + 1 P4 in single TheFixer task |

---

## §9 P1 Findings — Expanded

### QO-001 · P1 · Traceability enforcer produces a false-green quality gate

- **Specialist:** quality-oracle
- **File:** `tools/traceability-enforcer.py`
- **Route:** solo-session
- **Exploit Scenario:** Run `python3 tools/traceability-enforcer.py` on any CI push → prints "TRACEABILITY PASSED (13/13)" while 32 of 45 active FRs are completely unchecked. The enforcer auto-selects the most recently modified `requirements.md`, which today resolves to FR-WF-001–013 only. `FR-dependency-seed` (confirmed missing from Source/) goes entirely undetected.
- **Impact:** The project's primary quality mechanism — the mechanism that is supposed to prove "every decision traces to a spec" — has been reporting false success. Actual enforcer coverage is ~29%.
- **Fix:** Change enforcer to scan ALL `requirements.md` files in `Plans/`, or add an explicit `specs.active_plans` list to `inspector.config.yml`.

---

### DEP-001 · P1 · Handlebars.js JavaScript Injection — 8 CVEs (CVSS 9.8) `[ESCALATE → TheGuardians]`

- **Specialist:** dependency-auditor
- **File:** `Source/Backend/node_modules/handlebars` (transitive)
- **CVEs:** GHSA-2w6w-674q-4c4q, GHSA-3mfm-83xf-c92r, GHSA-xhpv-hc6g-r9c6 + 5 more
- **Route:** TheFixer + TheGuardians
- **Exploit Scenario:** Attacker crafts a Handlebars template with `@partial-block` or prototype pollution payload → AST parser fails to enforce template boundaries → arbitrary property access → function injection → full Node.js process compromise.
- **Impact:** Remote code execution if any Handlebars template string originates from user input. Executes at build time and test time.
- **Fix:** `cd Source/Backend && npm update handlebars@4.7.9 --save && npm test`

---

### DEP-002/003 · P1 · Vitest UI Server — Arbitrary File Read & Execution (CVSS 9.8) `[ESCALATE → TheGuardians]`

- **Specialist:** dependency-auditor
- **Files:** `Source/Frontend/package.json`, `portal/Frontend/package.json`
- **CVE:** GHSA-5xrq-8626-4rwp
- **Route:** TheFixer + TheGuardians
- **Exploit Scenario:** Developer runs `npm run test:watch` → Vitest@2.0.5 UI server opens on `localhost:51204` with **NO authentication**. Any machine on the same network: `fetch('http://localhost:51204/?file=../../../../.env')` → full `.env` credentials, SSH keys, git history exposed. Code execution also possible via snapshot uploads.
- **Impact:** Zero-precondition developer machine compromise. CVSS 9.8. In CI without port-binding restrictions this is directly exploitable.
- **Fix:**
  ```bash
  cd Source/Frontend && npm update vitest@3.2.6 --save-dev && npm test
  cd portal/Frontend && npm update vitest@3.2.6 --save-dev && npm test
  ```

---

### DEP-004 · P1 · Portal Backend OpenTelemetry + gRPC Cascade Crashes (CVSS 9.8 + 7.5)

- **Specialist:** dependency-auditor
- **File:** `portal/Backend/package.json`
- **CVEs:** GHSA-q7rr-3cgh-j5r3, GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq
- **Route:** TheFixer
- **Exploit Scenario:** Attacker sends malformed gRPC message to portal backend → `@grpc/grpc-js@1.14.0-1.14.3` crashes the server process → portal down until orchestrator restart. Prometheus exporter also crashes on malformed HTTP requests to `/metrics`.
- **Impact:** DoS on portal/Backend. Trace pipeline goes dark.
- **Fix:**
  ```bash
  cd portal/Backend
  npm update @opentelemetry/auto-instrumentations-node@latest --save
  npm update @grpc/grpc-js@1.14.4 --save
  npm test
  ```

---

## §10 Risk Matrix

| | Zero-precondition | Authenticated | Privileged | Admin |
|-|------------------|---------------|-----------|-------|
| **P1** | DEP-002, DEP-003 (Vitest — no auth, network RCE/file read) | DEP-001 (Handlebars — if user-controlled templates) | DEP-004 (gRPC crash — network access) | — |
| **P2** | DEP-008 (Vite path traversal — dev server) | DEP-009 (React Router — user clicks link) | DEP-005/006/007/010 (DoS, CRLF, memory) | QO-002/003/004 (scope gap, missing seed, arch duplication) |
| **P3** | QO-007 (route bypasses service layer — any caller) | DEP-011/012/013 (uuid, babel, body-parser) | QO-005/006 (stale plan, logger) | — |
| **P4** | QO-009 (API error swallow — any request) | — | QO-008/010, DEP-014–016 (lint, enum, version gaps) | — |

> **Zero-precondition:** Any user on the network (no auth needed) · **Authenticated:** Requires valid credentials (any role) · **Privileged:** Requires specific permissions · **Admin:** Requires admin/superuser role

---

## §11 Spec Coverage

| Requirement Set | FRs | Covered | % |
|----------------|-----|---------|---|
| FR-WF-001–013 (self-judging workflow) | 13 | 13 | **100%** |
| FR-dependency-* (dependency-linking) | 16 | 15 | **94%** ← 1 missing (FR-dependency-seed) |
| FR-001–FR-032 (dev-workflow-platform, Source/) | 32 | 0 | N/A — in portal/ |
| FR-001–FR-095 (dev-workflow-platform, portal/) | 95+ | not scanned | **0% (blind spot)** |
| **Enforcer gate (actual CI check)** | **13** | **13** | **100% (FALSE GREEN)** |

**Top 5 uncovered requirements:**

1. **FR-dependency-seed** — No `seed.ts` exists anywhere in `Source/Backend/src/`
2. **FR-001–FR-095 (portal/)** — Entire portal/ application outside enforcer scope
3. **FR-dependency-dispatch-gating** — Spec says `pending_dependencies` status; code returns HTTP 400
4. **All FR-TMP-*** — tiered-merge-pipeline FRs in platform/, outside scan boundary
5. All portal/ FR-* with no corresponding `// Verifies:` comment in Source/ (dual-implementation mismatch)

---

## §12 Latency Baselines

> ⏭ **performance-profiler did not run** (services offline). No dynamic latency data available.

Expected latency budgets (from inspector.config.yml — not yet measured):

| Endpoint | Budget p95 | Budget p99 |
|----------|-----------|-----------|
| `GET /api/work-items` | 100ms | 500ms |
| `GET /api/dashboard` | 150ms | 500ms |
| All other routes | 200ms | 500ms |

Static note: QO-007 (service layer bypass) and in-memory store are expected to be within budget; no synchronous I/O or unbounded queries found.

---

## §13 P2 Findings

| ID | Category | Title | File | Status | Route |
|----|----------|-------|------|--------|-------|
| QO-002 | architecture | portal/ app completely outside inspector scope | inspector.config.yml | NEW | solo-session |
| QO-003 | spec-drift | FR-dependency-seed confirmed missing | Source/Backend/src/ | NEW | TheFixer |
| QO-004 | architecture | Dependency features duplicated across Source/ and portal/ with incompatible FR IDs | Source/Backend/src/services/dependency.ts | NEW | TheATeam |
| DEP-005 | cve | brace-expansion DoS (CVSS 6.5) | Source/Backend | NEW | TheFixer |
| DEP-006 | cve | form-data CRLF Injection (CVSS 7.3) | Source/Backend, Source/Frontend | NEW | TheFixer |
| DEP-007 | cve | js-yaml Quadratic DoS (CVSS 5.3) | Source/Backend | NEW | TheFixer |
| DEP-008 | cve `[ESCALATE]` | Vite Path Traversal + Windows Bypass (CVSS 7.5) | Source/Frontend | NEW | TheFixer + TheGuardians |
| DEP-009 | cve | React Router Open Redirect (CVSS 6.1) | Source/Frontend | NEW | TheFixer |
| DEP-010 | cve | ws Memory Exhaustion & Info Disclosure (CVSS 7.5) | Source/Frontend | NEW | TheFixer |

---

## §14 Fixed Findings

> **First audit — no prior baseline.** No fixed findings to report.

---

## §15 Recommendations

### 🚫 Block Deployment

- **[DEP-002/003]** `npm update vitest@3.2.6` in `Source/Frontend` + `portal/Frontend` — CVSS 9.8, zero-precondition dev machine compromise
- **[DEP-001]** `npm update handlebars@4.7.9` in `Source/Backend` — CVSS 9.8 RCE; have TheGuardians verify no user-controlled templates
- **[DEP-004]** Update `@opentelemetry` + `@grpc/grpc-js@1.14.4` in `portal/Backend` — DoS attack surface
- **[QO-001]** Fix `traceability-enforcer.py` to scan all active requirements files — current gate is structurally a false positive

### 🏃 This Sprint

- **[QO-002]** Add `portal/` to `inspector.config.yml source.dirs`; update CLAUDE.md portal/ description
- **[QO-003]** Create `Source/Backend/src/store/seed.ts` with idempotent dependency data (TheFixer)
- **[DEP-008]** Update `vite` to latest in `Source/Frontend` + `portal/Frontend` — path traversal CVE
- **[DEP-005–007, DEP-009, DEP-010]** `npm audit fix` across all workspaces
- **[QO-007]** Refactor `workItems.ts` to use service layer (TheFixer)
- Add `npm audit --audit-level=high` to GitHub Actions CI

### 📅 Next Sprint

- **[QO-004]** TheATeam architectural decision on dual dependency tracking
- **[QO-005]** Update `Plans/dependency-linking/requirements.md` implementation delta
- **[QO-006]** Fix logger to pretty-print in dev and respect `LOG_LEVEL`
- **[DEP-011–013]** Update uuid, @babel/core; verify body-parser limit config
- **[DEP-014]** Align Express to 4.22.2 across all workspaces

### 📋 Backlog

- **[QO-008/009/010]** Remove eslint-disable suppressions; log API parse failures; add `PendingDependencies` enum value
- **[DEP-015]** Plan React 18→19 + react-router 6→7 (Q4 2026)
- **[DEP-017]** Evaluate OpenTelemetry footprint in portal/Backend (577 deps)
- **[DEP-018/019]** Post-install script audit + license compliance check
- Enable Dependabot/Renovate for continuous monitoring

---

## §16 P3/P4 Summary

| ID | Sev | Category | Title | File | Route |
|----|-----|----------|-------|------|-------|
| QO-005 | P3 | doc-stale | Plans/dependency-linking delta is materially wrong | Plans/dependency-linking/requirements.md | TheFixer |
| QO-006 | P3 | pattern-violation | Logger never pretty-prints in dev; LOG_LEVEL ignored | Source/Backend/src/utils/logger.ts | TheFixer |
| QO-007 | P3 | architecture | Route handlers bypass service layer (4 call sites) | Source/Backend/src/routes/workItems.ts | TheFixer |
| DEP-011 | P3 | cve | uuid Buffer Bounds Check Missing (CVSS 4.3) | Source/Backend/package.json | TheFixer |
| DEP-012 | P3 | cve | @babel/core File Read via sourceMappingURL | all workspaces | TheFixer |
| DEP-013 | P3 | cve | body-parser DoS via invalid limit value | Source/Backend middleware | TheFixer |
| DEP-014 | P3 | outdated | Express version gaps across workspaces | Backend, orchestrator, portal/Backend | TheFixer |
| DEP-015 | P3 | outdated | React & React Router major version gap | Source/Frontend, portal/Frontend | Backlog |
| DEP-016 | P3 | outdated | Vite & Vitest version gaps | Source/Frontend, portal/Frontend | TheFixer |
| QO-008 | P4 | pattern-violation | eslint-disable suppressing exhaustive-deps in prod hooks | useWorkItems.ts:63, DependencyPicker.tsx:82 | TheFixer |
| QO-009 | P4 | pattern-violation | Silent JSON parse swallow in API client error path | Source/Frontend/src/api/client.ts:26 | TheFixer |
| QO-010 | P4 | spec-drift | pending_dependencies status missing from WorkItemStatus enum | Source/Shared/types/workflow.ts | TheFixer |
| DEP-017 | P4 | supply-chain | Large transitive dependency tree (portal/Backend: 577 deps) | portal/Backend/package.json | Backlog |
| DEP-018 | P4 | supply-chain | Post-install scripts audit pending | all workspaces | Backlog |
| DEP-019 | P4 | license | License compliance audit not completed | all workspaces | Backlog |

---

## Grading Rationale

```
Config thresholds:
  A: max_p1=0,  max_p2=3,  min_spec_coverage=80
  B: max_p1=0,  max_p2=8,  min_spec_coverage=60
  C: max_p1=2,  max_p2=15, min_spec_coverage=40
  D: max_p1=999 (anything worse = D)
  F: reserved for exploitable auth bypass + critical domain failure

Audit result:
  P1 count: 5  →  exceeds C threshold (max 2 P1)
  P2 count: 9  →  exceeds B threshold (max 8 P2)

F criteria check:
  ✓ Exploitable auth bypass: DEP-002/003 — Vitest UI server with ZERO authentication
    (any network peer reads any file or executes code; CVSS 9.8 / zero-precondition)
  ✓ Critical domain failure: DEP-001 — Handlebars JavaScript injection (CVSS 9.8 RCE)
    if any template string is user-controlled; runs at build-time on every CI push

Grade: F
```

---

## Escalation Block

```
⚠  ESCALATION → TheGuardians
   Findings : DEP-001 Handlebars.js JavaScript Injection (CVSS 9.8)
              DEP-002/003 Vitest UI Arbitrary File Read/Execute (CVSS 9.8)
              DEP-008 Vite Path Traversal (CVSS 7.5)
   Branch   : audit/inspector-2026-07-30-3735d2
   When     : Before next release, or wait for the scheduled security run.

   To trigger TheGuardians now:
     Read Teams/TheGuardians/team-leader.md and follow it exactly.
     Target: ephemeral isolated environment (required).

   Non-security findings → TheFixer backlog (see §15 above)
```

---

*Generated by TheInspector · team-leader · run-20260730-052653 · 2026-07-30*  
*Backlog: `Teams/TheInspector/findings/bug-backlog-2026-07-30.json`*  
*HTML report: `Teams/TheInspector/findings/audit-2026-07-30-F.html`*
