# TheInspector Health Report — 2026-07-22

**Grade: D** | Audit ID: `run-20260722-053537` | Branch: `audit/inspector-2026-07-22-3ff6a9` | Commit: `e4a9c2d`

> **Why D:** 3 P1 critical CVEs (CVSS 9.8) in npm dependencies. Grading thresholds require 0 P1s for grade C or above.
> The `Source/` codebase itself grades **A** (96% spec coverage, 0 P1s from quality-oracle) — the dependency supply chain drags the overall score to D.

---

## Escalations → TheGuardians (3 findings)

All three are CVSS 9.8 — code injection / RCE. Must be reviewed **before next deployment**.

| ID | Package | Workspace | CVSS | Finding | Fix |
|----|---------|-----------|------|---------|-----|
| **DEP-001** | `handlebars ≤4.7.8` | Backend | 9.8 | JavaScript injection via AST type confusion (RCE) | `npm update handlebars` |
| **DEP-002** | `vitest <3.2.6` | Frontend | 9.8 | Arbitrary file read + RCE when UI server running | `npm update vitest vite` |
| **DEP-003** | `protobufjs <7.5.5` | Orchestrator | 9.8 | Arbitrary code execution via malicious .proto parsing | `npm update protobufjs` |

**To trigger TheGuardians:** Read `Teams/TheGuardians/team-leader.md` and follow it exactly. Target: ephemeral isolated environment (required).

---

## Scorecard

| Metric | Value |
|--------|-------|
| **Overall Grade** | **D** |
| P1 Critical | 3 (all → TheGuardians) |
| P2 High | 7 (→ TheFixer) |
| P3 Medium | 13 (→ TheFixer backlog) |
| P4 Informational | 2 (monitoring) |
| Total CVEs | 31 (3 critical · 8 high · 20 med/low) |
| Spec Coverage (Source/) | 96% (26/27 FRs) |
| Tests | 164/169 passing (5 fail in search suite) |
| Specialists Run | 2 of 4 (static mode — services offline) |
| Prior Audit | None — first audit baseline |

---

## Top 5 Findings

1. **[P1 · ESCALATE]** DEP-001/002/003 — Three CVSS 9.8 RCE vulnerabilities in npm deps. Patch within 48h or block deployment.
2. **[P2]** QO-001 — `GET /api/search` not registered in `app.ts`. DependencyPicker typeahead returns 404. 5 tests failing.
3. **[P2]** DEP-004..008 — CRLF injection + 3 DoS CVEs in transitive deps. Single `npm audit fix` resolves all four.
4. **[P2]** QO-002 — Traceability enforcer has a blind spot (FR-dependency-* unchecked). CI gives false green while tests fail.
5. **[P3]** QO-006 — Route handlers bypass service layer (CLAUDE.md arch rule violation across 3 route files).

---

## Specialists

| Specialist | Mode | Grade | P1 | P2 | P3 |
|-----------|------|-------|-----|-----|-----|
| quality-oracle | Static | A | 0 | 2 | 10 |
| dependency-auditor | Static | D | 3 | 5 | 3 |
| performance-profiler | **SKIPPED** (backend offline) | — | — | — | — |
| chaos-monkey | **SKIPPED** (services offline) | — | — | — | — |

---

## P2 Findings (→ TheFixer)

| ID | Title | File |
|----|-------|------|
| QO-001 | GET /api/search not in app.ts — 5 tests fail, DependencyPicker 404 | `Source/Backend/src/app.ts` |
| QO-002 | Traceability enforcer blind spot (FR-dependency-* unchecked) | `tools/traceability-enforcer.py:48` |
| DEP-004 | form-data CRLF injection (CVSS 7.5) | `form-data 4.0.0–4.0.5` (all workspaces) |
| DEP-005 | Vite HMR access control bypass (dev security) | `vite <5.5.10` (Frontend) |
| DEP-006 | brace-expansion exponential DoS | `brace-expansion <1.1.16` (Backend) |
| DEP-007 | js-yaml quadratic merge-key DoS | `js-yaml ≤3.14.2` (Backend) |
| DEP-008 | path-to-regexp ReDoS via crafted URL | `path-to-regexp <0.1.13` (Orchestrator) |

---

## P3 Findings (→ TheFixer backlog)

| ID | Category | Title |
|----|---------|-------|
| QO-003 | spec-drift | Canonical FR-001..069 never traced in Source/ |
| QO-004 | spec-drift | dependencyCheckDuration histogram missing from metrics.ts |
| QO-005 | arch-violation | Logger ignores LOG_LEVEL env var + NODE_ENV pretty-print |
| QO-006 | arch-violation | Route handlers directly call store — no service layer for CRUD |
| QO-007 | pattern-violation | workItemStore.ts bypasses logger shim |
| QO-008 | arch-violation | OpenTelemetry tracing not implemented (CLAUDE.md + FR-021 require it) |
| QO-009 | test-quality | Duplicate test files for WorkItemDetailPage + WorkItemListPage |
| QO-010 | spec-drift | Dispatch gating returns 400 instead of 200+pending_dependencies |
| QO-011 | pattern-violation | eslint-disable without justification comment (DependencyPicker, useWorkItems) |
| QO-012 | doc-stale | Plans/dependency-linking Implementation Delta has stale portal/ paths |
| DEP-009 | CVE/buffer | uuid missing bounds check (GHSA-w5hq-g745-h8pq) |
| DEP-010 | CVE/multiple | react-router open redirect + ws + postcss + esbuild |
| DEP-011 | outdated | 8 packages ≥1 major version behind (pino, vite, vitest, react…) |

---

## Cross-Reference Map (one fix → multiple findings)

| Root Cause | Findings | Single Fix |
|-----------|---------|-----------|
| Outdated Frontend dev toolchain | DEP-002 + DEP-005 | `npm update vitest vite` |
| Traceability infrastructure gaps | QO-002 + QO-003 | Expand enforcer + canonical ID mapping |
| Missing route + bypassed service layer | QO-001 + QO-006 | Create `workItemService.ts` + `routes/search.ts` + mount in `app.ts` |
| Stale transitive deps (Backend) | DEP-001 + DEP-004 + DEP-006 + DEP-007 | `npm audit fix` in Backend workspace |
| Logger abstraction inconsistency | QO-005 + QO-007 | Patch `utils/logger.ts` + update `workItemStore.ts` import |

---

## Recommendations

**Block deployment:**
- Escalate DEP-001/002/003 to TheGuardians immediately
- Patch: `npm update handlebars` (Backend) · `npm update vitest vite` (Frontend) · `npm update protobufjs` (Orchestrator — solo session)
- Fix QO-001: mount `searchRouter` in `app.ts` → restores DependencyPicker + fixes 5 tests

**This sprint:**
- `npm audit fix` across all workspaces (resolves DEP-004..008)
- Fix enforcer scope so CI no longer gives false green (QO-002)
- Add `dependencyCheckDuration` histogram to metrics.ts (QO-004)
- Align dispatch gating response with spec or update spec (QO-010)

**Next sprint:**
- Extract `workItemService.ts` service layer (QO-006)
- Fix logger LOG_LEVEL + NODE_ENV (QO-005, QO-007)
- Add canonical FR cross-reference table in plan files (QO-003)
- Consolidate duplicate test files (QO-009)
- Plan major version upgrades: vitest 2→4, vite 5→8, pino 8→10

**Backlog:**
- OTel tracing or formally mark out of scope (QO-008)
- eslint-disable justification comments (QO-011)
- Update stale plans doc (QO-012)
- Enable Dependabot / Snyk continuous monitoring (DEP-012)
- Run `npx license-checker --json` manually (DEP-013)
- Re-run TheInspector with services online (performance-profiler + chaos-monkey skipped this run)

---

## Report Artifacts

| File | Description |
|------|------------|
| `Teams/TheInspector/findings/audit-2026-07-22-D.html` | Full 16-section HTML health report |
| `Teams/TheInspector/findings/bug-backlog-2026-07-22.json` | Structured bug backlog (all findings + escalations as JSON) |
| `Teams/TheInspector/findings/DEP-AUDIT-2026-07-22.md` | Full dependency auditor report (504 lines, 13 findings) |
| `Teams/TheInspector/findings/dependency-audit-summary.json` | Dependency audit summary JSON |

---

*Generated by TheInspector Team Leader · 2026-07-22 · Audit ID: `run-20260722-053537`*
