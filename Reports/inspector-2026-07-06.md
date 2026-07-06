# TheInspector — System Health Audit Report

**Audit ID:** `run-20260706-065058`
**Date:** 2026-07-06
**Branch:** `audit/inspector-2026-07-06-fdc2ba`
**Grade:** C (Needs Attention)
**HTML Report:** `Teams/TheInspector/findings/audit-2026-07-06-C.html`
**Bug Backlog JSON:** `Teams/TheInspector/findings/bug-backlog-2026-07-06.json`

---

## Overall Score

| Severity | Count |
|----------|-------|
| P1 Critical | **2** (escalated → TheGuardians) |
| P2 High | **7** |
| P3 Medium | **8** |
| P4 Low | **2** |
| **Total** | **19** |

Grading thresholds (from `inspector.config.yml`):
- A: 0 P1, ≤3 P2 → **FAILS** (2 P1s)
- B: 0 P1, ≤8 P2 → **FAILS** (2 P1s)
- C: ≤2 P1, ≤15 P2, ≥40% spec coverage → **PASS** → **Grade: C**

---

## 🔴 ESCALATION → TheGuardians

Both P1 findings are CVE-level RCE vulnerabilities that require a full security review before the next release.

### DEP-001 — Handlebars.js RCE (CVSS 9.8)
- **File:** `Source/Backend/package-lock.json`
- **CVEs:** GHSA-2w6w-674q-4c4q · GHSA-3mfm-83xf-c92r · GHSA-xhpv-hc6g-r9c6 · GHSA-9cx6-37pm-9jff · GHSA-xjpj-3mr7-gcpf
- **Risk:** If any code path passes user input to Handlebars template compilation, attackers get arbitrary JavaScript execution in the Node.js process (CVSS 9.8).
- **Fix:** `cd Source/Backend && npm update handlebars` (target ≥4.7.9); run `npm ls handlebars` to identify the parent; remove if unused.
- **Action:** TheGuardians must confirm whether user-controlled data can reach Handlebars templates.

### DEP-006 — Vitest UI Server RCE (CVSS 9.8)
- **File:** `Source/Frontend/package-lock.json`
- **CVEs:** GHSA-5xrq-8626-4rwp
- **Risk:** When vitest UI server is active, any network-reachable attacker (zero preconditions) can read and execute arbitrary files. CI environments are acutely exposed.
- **Fix:** `cd Source/Frontend && npm update vitest` (target ≥3.2.6). Also resolves DEP-012 (@vitest/mocker). Disable `--ui` in CI scripts immediately.
- **Action:** TheGuardians must audit CI configurations and confirm production builds do not include vitest.

---

## Specialist Results

### Quality Oracle (static)
**Grade contribution: B** · 0 P1 · 3 P2 · 3 P3 · 1 P4

| ID | Severity | Title | File |
|----|----------|-------|------|
| QO-001 | P2 | FR-dependency-search: /api/search endpoint not registered | `Source/Backend/src/app.ts` |
| QO-002 | P2 | Route handlers access workItemStore directly — no service layer | `Source/Backend/src/routes/workItems.ts:12` |
| QO-003 | P2 | spec-drift-audit.py generates false 0% coverage signal | `tools/spec-drift-audit.py:43` |
| QO-004 | P3 | Stale pipeline run ID hardcoded in playwright.pipeline.config.ts | `Source/E2E/playwright.pipeline.config.ts:4` |
| QO-005 | P3 | DebugPortalPage has no spec requirement — unlinked implementation | `Source/Frontend/src/pages/DebugPortalPage.tsx:1` |
| QO-006 | P3 | Duplicate test files for WorkItemListPage and WorkItemDetailPage | `Source/Frontend/tests/WorkItemListPage.test.tsx` |
| QO-007 | P4 | eslint-disable without documented reason | `Source/Frontend/src/components/DependencyPicker.tsx:82` |

**Spec coverage:**
- FR-WF-* (Workflow Engine): 100% (13/13) ✅
- FR-dependency-* (Dependency Tracking): 94% (15/16 — FR-dependency-search open) ⚠️
- FR-TMP-* (Tiered Merge Pipeline, platform/): 100% (10/10) ✅
- spec-drift-audit.py output: 0% ❌ **FALSE NEGATIVE — tool misconfigured (QO-003)**

### Dependency Auditor (static)
**Grade contribution: C/D** · 2 P1 · 4 P2 · 5 P3 · 1 P4 · 20 CVEs total

| ID | Severity | Package | CVE | Fix |
|----|----------|---------|-----|-----|
| DEP-001 | P1 🔴 | handlebars | GHSA-2w6w-674q-4c4q (CVSS 9.8) | `npm update handlebars` |
| DEP-006 | P1 🔴 | vitest | GHSA-5xrq-8626-4rwp (CVSS 9.8) | `npm update vitest` |
| DEP-002 | P2 | form-data (Backend) | GHSA-hmw2-7cc7-3qxx (CVSS 7.5) | `npm update form-data` |
| DEP-007 | P2 | vite | GHSA-fx2h-pf6j-xcff | `npm update vite` |
| DEP-008 | P2 | ws | GHSA-96hv-2xvq-fx4p (CVSS 7.5) | `npm update ws` |
| DEP-009 | P2 | form-data (Frontend) | GHSA-hmw2-7cc7-3qxx | `npm update form-data` |
| DEP-004 | P3 | brace-expansion | GHSA-f886-m6hf-6m8v | `npm update brace-expansion` |
| DEP-010 | P3 | vite (path traversal) | GHSA-4w7w-66w2-5vf9 | resolved by DEP-007 fix |
| DEP-011 | P3 | react-router-dom | outdated 6.26.0 | `npm update react-router-dom` |
| DEP-012 | P3 | @vitest/mocker | RCE (same as DEP-006) | resolved by DEP-006 fix |
| DEP-013 | P3 | postcss/esbuild/vite-node | various moderate | `npm update postcss esbuild vite-node` |
| DEP-005 | P4 | @babel/core | GHSA-4x5r-pxfx-6jf8 (CVSS 3.2) | `npm update @babel/core` |

### Performance Profiler
**Skipped** — backend offline at `http://localhost:3001/` during audit window. Re-run with services live.

### Chaos Monkey
**Skipped** — both services offline (requires all services healthy). Re-run with services live.

---

## Cross-Reference Map

| Root Cause | Affected Findings | Single Fix | Impact |
|-----------|-------------------|-----------|--------|
| Vitest ≤3.2.5 | DEP-006 + DEP-012 | `npm update vitest` | Closes P1 + P3 with one command |
| form-data CRLF (same CVE, two packages) | DEP-002 + DEP-009 | `npm update form-data` in both dirs | Closes 2 × P2 |
| Vite outdated | DEP-007 + DEP-010 | `npm update vite` | Closes P2 + P3 |
| Missing service layer for work-item CRUD | QO-001 + QO-002 | Create `workItemService.ts` + `searchService.ts`; register `/api/search` | Closes 2 × P2 |

---

## Recommended Action Plan

### 🚨 Block deployment until resolved
- [ ] Patch Vitest ≥3.2.6: `cd Source/Frontend && npm update vitest` (DEP-006, DEP-012)
- [ ] Patch Handlebars: `cd Source/Backend && npm ls handlebars && npm update handlebars` (DEP-001)
- [ ] Coordinate with TheGuardians for security validation

### 🟠 This sprint (P2)
- [ ] Implement `GET /api/search?q=` route + searchService.ts (QO-001)
- [ ] Extract `workItemService.ts`; refactor 3 route files (QO-002)
- [ ] Fix spec-drift-audit.py false negative (QO-003)
- [ ] `npm update form-data` in Backend and Frontend (DEP-002, DEP-009)
- [ ] `npm update vite` in Frontend (DEP-007, DEP-010)
- [ ] `npm update ws` in Frontend (DEP-008)

### 🟡 Next sprint (P3)
- [ ] Delete stale `playwright.pipeline.config.ts` or env-var the run ID (QO-004)
- [ ] Add FR-WF-014 for DebugPortalPage or document as infrastructure scope (QO-005)
- [ ] Merge duplicate test files into `tests/pages/` variants (QO-006)
- [ ] `npm update brace-expansion react-router-dom postcss esbuild vite-node` (DEP-004, DEP-011, DEP-013)
- [ ] Re-run audit with services live for performance and chaos coverage

### ⬜ Backlog (P4)
- [ ] Document eslint-disable suppressions (QO-007)
- [ ] `npm update @babel/core` (DEP-005)
- [ ] Plan major version upgrades: express 5.x, pino 10.x, uuid 14.x

---

## Trend

First audit — no baseline. Grade C established as baseline for next run.

---

## Deliverables

- **HTML Report:** `Teams/TheInspector/findings/audit-2026-07-06-C.html` (16 sections)
- **Bug Backlog:** `Teams/TheInspector/findings/bug-backlog-2026-07-06.json`
- **This file:** `inspector-report.md`

---

*Generated by TheInspector team-leader · Audit ID `run-20260706-065058` · 2026-07-06*
