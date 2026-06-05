# TheInspector — System Health Audit

| | |
|---|---|
| **Grade** | 🔴 **D** |
| **Audit Date** | 2026-06-05 |
| **Branch** | `audit/inspector-2026-06-05-2eb531` |
| **Mode** | Full codebase · First audit (no baseline) |
| **Specialists** | quality-oracle ✅ · dependency-auditor ✅ · performance-profiler ⏭ · chaos-monkey ⏭ |
| **HTML Report** | `Teams/TheInspector/findings/audit-2026-06-05-D.html` |
| **Bug Backlog** | `Teams/TheInspector/findings/bug-backlog-2026-06-05.json` |

---

## ⚠ ESCALATION → TheGuardians

**3 security findings require TheGuardians review before next release.**

```
Branch  : audit/inspector-2026-06-05-2eb531
When    : Before next release, or trigger TheGuardians now

Findings escalated:
  DEP-001  Handlebars JS injection (CVSS 9.8) — Backend test chain
  DEP-013  Vitest arbitrary file read + code execution (CVSS 9.8) — Frontend devDep
  DEP-018  esbuild CORS bypass (CVSS 5.3) — dev server source exposure

To trigger TheGuardians now:
  Read Teams/TheGuardians/team-leader.md and follow it exactly.
  Target: ephemeral isolated environment (required).

Non-security findings → TheFixer backlog (see bug-backlog-2026-06-05.json)
```

---

## Scorecards

| Metric | Value |
|--------|-------|
| P1 Critical | **3** |
| P2 High | **10** |
| P3 Medium | **13** |
| P4 Low | **1** |
| Spec coverage (Specifications/) | **0%** |
| Spec coverage (Plans/self-judging-workflow) | **100%** ✅ |
| → TheGuardians | **3** |
| Fixed (vs prior audit) | **N/A — first audit** |

**Grade rationale:** 3 P1 findings exceed grade-C maximum of 2. Spec coverage at 0% against `Specifications/` (threshold 40% for C). Grade: **D**.

---

## Section 1 — Executive Summary

**Top 5 findings an operator must act on:**

1. **🔴 P1 · Critical dev toolchain CVEs (CVSS 9.8):** `vitest@2.0.5` (GHSA-5xrq-8626-4rwp) allows any LAN host to read arbitrary project files and execute code while `npm test` is running. `handlebars` in the backend jest chain (GHSA-2w6w-674q-4c4q, CVSS 9.8) enables JS injection. Patch both before the next developer session. **Escalated to TheGuardians.**

2. **🔴 P1 · The canonical spec directory describes a product that no longer exists:** `Specifications/dev-workflow-platform.md` has 74 formal FRs for a SQLite-backed platform that was never built. The actual product (`Source/`) implements the self-judging workflow engine, specified in `Specifications/workflow-engine.md` — which has **zero formal FR IDs**. Effective spec coverage: **0%**.

3. **🟠 P2 · Three backend route handlers bypass the service layer:** `routes/workItems.ts`, `routes/workflow.ts`, and `routes/intake.ts` call the data store directly — violating the project's own architecture rule. `routes/dashboard.ts` is the correct model.

4. **🟠 P2 · 7 frontend files + errorHandler middleware have zero test coverage:** `useWorkItems` and `useDashboard` hooks own all API/error-state logic with no tests. `errorHandler.ts` enforces the `{error: "message"}` contract with no test.

5. **🟠 P2 · Dependency tracking feature is live but unspecified:** Full implementation in `Source/` with no entry in `Specifications/workflow-engine.md`. `FR-dependency-seed` (startup seed function) is confirmed **missing** from all of `Source/`.

---

## Section 2 — Scope & Environment

| Item | Value |
|------|-------|
| Backend service | 🔴 Offline (localhost:3001) — static mode |
| Frontend service | 🔴 Offline (localhost:5173) — static mode |
| performance-profiler | ⏭ Skipped — backend offline |
| chaos-monkey | ⏭ Skipped — all services required |
| Dependencies analysed | 27 direct · 648 transitive · 3 npm workspaces |
| Caveats | Latency baselines and fault injection deferred. CVE CVSS from GitHub advisories. |

---

## Section 3 — Specialist Reports

### quality-oracle · Grade D

- Spec coverage: **0%** against `Specifications/` (74 FRs, 0 traced). **100%** against `Plans/self-judging-workflow` (13 FRs).
- **1 P1, 3 P2, 3 P3, 1 P4**
- Architecture violations in 3 route files (direct store access)
- Traceability enforcer covers only 13/102 known requirements (false-positive PASSED)
- `FR-dependency-seed` confirmed unimplemented

### dependency-auditor · Grade D

- 15 CVEs total: **2 Critical** (CVSS 9.8), 7 P2, 6 P3
- 4 deprecated packages (Backend test chain)
- 6 major version gaps
- **2 P1, 7 P2, 10 P3**
- License compliance: ✅ MIT/Apache/ISC only

### performance-profiler · ⏭ Skipped

Services offline. Static latency pattern checks (unbounded list iteration, large payload serialization) deferred.

### chaos-monkey · ⏭ Skipped

Requires all services healthy for dynamic fault injection (state machine abuse, malformed bodies, concurrent transitions).

---

## Section 4 — Re-Verification Summary

| Status | Count | Notes |
|--------|-------|-------|
| 🆕 NEW | 27 | All findings — first audit |
| ✅ FIXED | 0 | No prior baseline |
| ⚠ STILL OPEN | 0 | No prior baseline |
| 🔺 REGRESSED | 0 | No prior baseline |

---

## Section 5 — Cross-Reference Map

Root causes that span multiple findings — one fix resolves multiple IDs:

| Root Cause | Affected Findings | Single Fix Impact |
|------------|-------------------|-------------------|
| Dev toolchain not pinned to patched versions | DEP-013, DEP-015, DEP-016, DEP-018 | Upgrade `vite ≥6.5.0` + `vitest ≥4.1.0` — resolves 4 dev-server CVEs |
| Spec directory not updated after product pivot | QO-001, QO-003, QO-004 | Archive superseded spec + add FR-WF-XXX IDs — resolves all 3 spec-drift findings |
| No service layer abstraction for work items | QO-002 | Introduce `workItemService.ts` — enables isolation testing, unblocks future architecture |
| Wide test dependency chain via jest | DEP-001, DEP-006, DEP-007, DEP-008/009 | `npm update` in Backend + remove deprecated devDeps — cleans entire handlebars chain |

---

## Section 6 — P1 Findings (Expanded)

### QO-001 — Specification Domain Mismatch · **P1 · spec-drift** · → TheFixer

**Files:** `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`

`Specifications/dev-workflow-platform.md` defines 74 FRs (FR-001–FR-069+) for a product that does not exist in `Source/`. The active product spec (`Specifications/workflow-engine.md`) has **zero formal FR IDs**, making the traceability enforcer's PASSED result a false positive covering only 13% of the known requirement space.

**Fix:**
1. Move `Specifications/dev-workflow-platform.md` → `Specifications/archive/`
2. Add `FR-WF-XXX` identifiers to `Specifications/workflow-engine.md`
3. Define `FR-070–FR-085` (referenced in `Source/Shared/api-contracts.md` but undefined)
4. Update traceability enforcer default target to `Specifications/`

---

### DEP-001 — Handlebars JS Injection · **P1 · cve · CVSS 9.8** · → TheGuardians

**Package:** `handlebars@4.7.8` (transitive: jest → babel-jest → @babel/core → handlebars)  
**CVE:** GHSA-2w6w-674q-4c4q + 7 related advisories

Arbitrary JavaScript injection via AST type confusion, @partial-block tampering, dynamic partials. If CI processes any external template data, attacker can execute code and exfiltrate secrets.

**Fix:** `cd Source/Backend && npm update` (pulls handlebars ≥4.7.9)

---

### DEP-013 — Vitest Arbitrary File Read & Execution · **P1 · cve · CVSS 9.8** · → TheGuardians

**Package:** `vitest@2.0.5` (Frontend direct devDep)  
**CVE:** GHSA-5xrq-8626-4rwp · CWE-862

Vitest UI server (started with `npm run test`) exposes an unauthenticated endpoint. Any host on the developer's local network (or any web page visited while the server runs) can read arbitrary files from the machine and execute JS in the test runner context. `.env` secrets, SSH keys, and source code are all at risk.

**Immediate workaround:** Never run `npm run test` with `--ui` flag while on a shared network or while browsing untrusted websites.  
**Fix:** `cd Source/Frontend && npm install vitest@^4.1.0 --save-dev` (major version bump — test thoroughly)

---

## Section 7 — P2 Findings

| ID | Category | Title | Files / Packages | Route | Priority |
|----|----------|-------|------------------|-------|----------|
| QO-002 | arch-violation | Route handlers call store directly (3 files) | `routes/workItems.ts`, `routes/workflow.ts`, `routes/intake.ts` | TheFixer | This sprint |
| QO-003 | spec-drift | Traceability enforcer covers 13/102 requirements; FR-dependency-seed missing | `tools/traceability-enforcer.py` | TheFixer | This sprint |
| QO-004 | spec-drift | Dependency feature live with no Specifications/ entry | `Specifications/workflow-engine.md` | TheFixer | This sprint |
| DEP-002 | cve | UUID buffer bounds check missing (CVSS 7.5, GHSA-w5hq-g745-h8pq) | `uuid@9.0.0` | TheFixer | Next sprint |
| DEP-003/4 | cve | Express qs DoS — malformed query crashes server (CVSS 5.3) | `express@4.18.2` | TheFixer | **Block deploy** |
| DEP-014 | cve | React Router open redirect via protocol-relative URL | `react-router-dom@6.26.0` | TheFixer | This sprint |
| DEP-015 | cve | Vite path traversal in .map file handling | `vite@5.4.0` | TheFixer | This sprint |
| DEP-016 | cve | PostCSS XSS via unescaped `</style>` (CVSS 6.1) | `postcss@<8.5.10` | TheFixer | This sprint |
| DEP-018 | cve | esbuild CORS bypass — any website reads dev server (CVSS 5.3) | `esbuild@≤0.24.2` | **TheGuardians** | This sprint |
| DEP-019 | cve | WS uninitialized memory disclosure (CVSS 4.4) | `ws@8.0.0–8.20.0` | TheFixer | This sprint |

---

## Section 8 — Spec Coverage

| Spec Source | FRs | Traced | Coverage |
|-------------|-----|--------|----------|
| `Specifications/dev-workflow-platform.md` | 74 | 0 | **0%** 🔴 |
| `Specifications/workflow-engine.md` | 0 formal IDs | N/A | unmeasurable |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking/requirements.md` | 15 | not enforced | unknown |
| `FR-070–FR-085` (api-contracts.md) | 16 | — | **undefined** |

**Top uncovered requirements:**
1. FR-001–FR-069+ — all in superseded spec (not built)
2. `FR-dependency-seed` — confirmed unimplemented in `Source/`
3. FR-070–FR-085 — referenced but never formally defined
4. FR-dependency-\* (15 IDs) — implemented but not enforced

---

## Section 9 — Latency Baselines

⏭ **Not measured** — backend offline. Configured budgets for next run:

| Endpoint | p95 Budget | p99 Budget |
|----------|-----------|-----------|
| `GET /api/work-items` | 100 ms | 500 ms |
| `GET /api/dashboard` | 150 ms | 500 ms |
| All others | 200 ms | 500 ms |

Static flags to check when services are live: unbounded Map iteration on list endpoint, large payload serialization.

---

## Section 10 — Fixed Findings

None — first audit, no baseline. All P1/P2 findings recorded in `Teams/TheInspector/learnings/` for next run comparison.

---

## Section 11 — Recommendations (Prioritised)

### 🚫 Block Deployment
1. **Patch Vitest (DEP-013)** — `cd Source/Frontend && npm install vitest@^4.1.0 --save-dev`. CVSS 9.8; LAN code execution.
2. **Patch Handlebars (DEP-001)** — `cd Source/Backend && npm update`. CVSS 9.8; build/CI injection.
3. **Fix Express qs DoS (DEP-003/4)** — `cd Source/Backend && npm update express`. Zero-precondition server crash.

### 🏃 This Sprint
4. **Archive superseded spec + add FR-WF-XXX IDs** — resolves QO-001/003/004 (root cause of 0% spec coverage)
5. **Introduce `workItemService.ts`** — extract store calls from 3 route files (QO-002)
6. **Upgrade vite ≥6.5.0 + react-router-dom ≥6.30.4** — resolves DEP-014/015/016/018 (4 CVEs, 1 vite upgrade)
7. **Implement FR-dependency-seed** — missing startup seed function (QO-003/004)
8. **Write tests for hooks + errorHandler** — useWorkItems, useDashboard, middleware/errorHandler.ts (QO-006)

### 📅 Next Sprint
9. **Upgrade uuid ≥14.0.0** — DEP-002/012 (buffer bounds + 5 major versions behind)
10. **Remove deprecated Backend devDeps** — glob, inflight, supertest@old, superagent@old (DEP-006–009)
11. **Upgrade pino to v10** — DEP-011 (2 major versions behind)
12. **Clean up duplicate test files** — remove stale top-level variants for WorkItemDetailPage/ListPage (QO-005)
13. **Add badge component tests** — PriorityBadge, StatusBadge, TypeBadge, Layout, DebugPortalPage (QO-006)

### 📦 Backlog
14. Plan React 19 migration (DEP-020/021)
15. Plan Express v5 migration (DEP-010)
16. Document eslint-disable suppressions (QO-008)
17. Clarify/consolidate dual logger files (QO-007)

---

## Section 12 — P3/P4 Summary

| ID | Sev | Category | Title |
|----|-----|----------|-------|
| QO-005 | P3 | test-hygiene | Duplicate test files (WorkItemDetailPage, WorkItemListPage) |
| QO-006 | P3 | untested | 7 frontend files + errorHandler middleware uncovered |
| QO-007 | P3 | arch-violation | Dual logger files with overlapping Verifies comments |
| DEP-006 | P3 | abandoned | glob — deprecated, security issues |
| DEP-007 | P3 | abandoned | inflight — memory leak, unsupported |
| DEP-008 | P3 | abandoned | supertest — upgrade to ≥7.1.3 |
| DEP-009 | P3 | abandoned | superagent — upgrade to ≥10.2.2 |
| DEP-010 | P3 | outdated | express 4.18 → 5.2 (1 major) |
| DEP-011 | P3 | outdated | pino 8.17 → 10.3 (2 majors) |
| DEP-012 | P3 | outdated | uuid 9 → 14 (5 majors) |
| DEP-020 | P3 | outdated | react 18.3 → 19.2 (1 major) |
| DEP-021 | P3 | outdated | react-dom 18.3 → 19.2 (1 major) |
| DEP-022 | P3 | outdated | react-router-dom 6.26 → 7.17 (1 major) |
| QO-008 | P4 | pattern | Unexplained eslint-disable suppressions in 2 files |

---

## Risk Matrix

```
                │ Zero-pre-  │ Authenti-  │ Privileged │ Admin │ Physical/
Severity        │ condition  │ cated      │            │       │ Dev
────────────────┼────────────┼────────────┼────────────┼───────┼──────────
P1              │ DEP-013*   │ DEP-001*   │ QO-001     │       │
                │ (Vitest)   │ (Handlebars│ (spec ops) │       │
────────────────┼────────────┼────────────┼────────────┼───────┼──────────
P2              │ DEP-003/4  │ DEP-002    │ QO-003     │       │ DEP-015
                │ DEP-014    │ DEP-019    │ QO-004     │       │ DEP-018*
                │ DEP-016    │            │            │       │
                │ QO-002     │            │            │       │
────────────────┼────────────┼────────────┼────────────┼───────┼──────────
P3              │ DEP-006    │ QO-005     │ DEP-010-12 │ DEP-  │
                │            │ QO-006     │            │ 020-22│
                │            │ QO-007     │            │DEP-007│
                │            │            │            │DEP-008│
                │            │            │            │DEP-009│
────────────────┼────────────┼────────────┼────────────┼───────┼──────────
P4              │            │ QO-008     │            │       │

* = [ESCALATE → TheGuardians]
```

---

## Trend

📊 **First audit — no baseline.** Grade: **D**

Target for next audit (2026-07-05): **Grade C** (max 2 P1, max 15 P2, ≥40% spec coverage)

| Condition | Met? |
|-----------|------|
| P1 count ≤ 2 (for C) | ❌ 3 P1s |
| P2 count ≤ 15 (for C) | ✅ 10 P2s |
| Spec coverage ≥ 40% (for C) | ❌ 0% |
| P1 count = 0 (for B) | ❌ 3 P1s |

---

## Artifacts

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-06-05-D.html` | Full HTML report (16 sections, risk matrix, spec coverage charts) |
| `Teams/TheInspector/findings/bug-backlog-2026-06-05.json` | Structured bug backlog (27 findings + 3 escalations) |
| `Teams/TheInspector/findings/audit-2026-06-05-D.md` | Quality oracle detailed findings |
| `Teams/TheInspector/findings/dependency-audit-2026-06-05.md` | Dependency auditor detailed findings |
| `Teams/TheInspector/learnings/quality-oracle.md` | Updated learnings for re-verification |
| `Teams/TheInspector/learnings/dependency-auditor.md` | Updated learnings for re-verification |

---

_Generated by TheInspector · team_leader · Run ID: run-20260605-064722_  
_Next audit: 2026-07-05 or after P1 remediations are merged_
