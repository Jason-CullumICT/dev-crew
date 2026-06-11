# TheInspector — System Health Report

**Date:** 2026-06-11  
**Branch:** `audit/inspector-2026-06-11-c90486`  
**Overall Grade: C** (2 P1 · 9 P2 · 10 P3 · 1 P4)  
**Scope:** Full codebase — static analysis (services offline; performance-profiler & chaos-monkey skipped)

---

## Grade Breakdown

| Metric | Threshold (Grade C) | Actual | Status |
|--------|---------------------|--------|--------|
| P1 findings | ≤ 2 | **2** | ✅ C threshold |
| P2 findings | ≤ 15 | **9** | ✅ |
| Spec coverage | ≥ 40% | **100%** | ✅ |

Specialist grades: quality-oracle **B** · dependency-auditor **D** → combined **C**

---

## ⚠ ESCALATION → TheGuardians

Two P1 findings must be reviewed by TheGuardians before next release:

### DEP-001 — Handlebars JavaScript Injection (CVSS 9.8)
- **Package:** `handlebars@4.7.8` via `ts-jest@^29.1.2` (Backend dev dep)
- **Risk:** Arbitrary code execution in CI pipeline if test data contains malformed Handlebars templates
- **CVEs:** GHSA-2w6w-674q-4c4q (CVSS 9.8), GHSA-3mfm-83xf-c92r (8.1), GHSA-xhpv-hc6g-r9c6 (8.1), GHSA-9cx6-37pm-9jff (7.5)
- **Fix:** `cd Source/Backend && npm update ts-jest`

### DEP-007 — Vitest Build Toolchain Path Traversal
- **Package:** `vitest@2.0.5` → `esbuild` (GHSA-67mh-4wv8-2f99) + `vite` (GHSA-4w7w-66w2-5vf9) (Frontend dev dep)
- **Risk:** Source code and `.env` file exposure from dev server; exfiltration of developer secrets
- **Fix:** `cd Source/Frontend && npm install vitest@4` (also resolves DEP-009, DEP-012)

---

## P2 Findings (9 total — route to TheFixer)

| ID | Category | Title | File | Route |
|----|----------|-------|------|-------|
| QO-001 | spec-drift | Shared types missing `blocked_by` field (FR-dependency-api-types) | `portal/Shared/api.ts:32,59` | TheFixer |
| QO-002 | arch-violation | Direct DB calls in `teamDispatches.ts` route handler | `portal/Backend/src/routes/teamDispatches.ts:37,41,72` | TheFixer |
| QO-003 | arch-violation | Duplicate `UpdateBugInput`/`UpdateFeatureRequestInput` diverge from Shared | `featureRequestService.ts:244`, `bugService.ts:184` | TheFixer |
| QO-004 | arch-violation | Silent error swallowing (`.catch(() => {})`) in 3 frontend components | `BugDetail.tsx:82`, `FeatureRequestDetail.tsx:80`, `RepoSelector.tsx:20` | TheFixer |
| QO-005 | unlinked-impl | TeamsPage + team-dispatches: no spec, no traceability, no tests | `portal/Frontend/src/pages/TeamsPage.tsx` | TheFixer |
| QO-006 | spec-drift | FR-070..095 absent from `Specifications/` + FR ID collision | `Specifications/dev-workflow-platform.md` | TheFixer |
| DEP-002 | CVE-injection | QS/Prototype pollution in `express@4.18.2` (production) | `Source/Backend/package.json` | TheFixer |
| DEP-005 | outdated | `pino@8.17.0` — 2 major versions behind | `Source/Backend/package.json` | TheFixer |
| DEP-008 | CVE-redirect | React Router open redirect via protocol-relative URL (production) | `Source/Frontend/package.json` | TheFixer |

---

## Cross-Reference Map (single fix → multiple findings)

| Root Cause | Affected Findings | Fix Impact |
|-----------|------------------|-----------|
| Missing `blocked_by` in `portal/Shared/api.ts` | QO-001, QO-003 | 1 file change resolves 2 P2s |
| `teamDispatches.ts` bypasses service layer + no spec | QO-002, QO-005 | spec + service + tests resolves 2 P2s |
| `vitest@2.0.5` outdated toolchain | DEP-007 (P1), DEP-009 (P3), DEP-012 (P3) | `npm install vitest@4` resolves 1 P1 + 2 P3s |

---

## Recommendations

### Block deployment / Immediate (24-48 h)
1. **DEP-001:** `cd Source/Backend && npm update ts-jest`
2. **DEP-007:** `cd Source/Frontend && npm install vitest@4`
3. Escalate both to TheGuardians for CI/dev pipeline security review

### This sprint
4. **DEP-008:** `npm install react-router-dom@6.30.4` (production open redirect)
5. **DEP-002:** `cd Source/Backend && npm install express@4.22.2` (production QS injection, also fixes DEP-003)
6. **QO-001/003:** Add `blocked_by?: string[]` to `portal/Shared/api.ts`; remove service-layer duplicates
7. **QO-004:** Replace 3 empty `.catch(() => {})` with logged error states
8. **QO-002/005:** Create `teamDispatchService.ts` + write spec with FR IDs + add tests

### Next sprint
9. **QO-006:** Append FR-070..095 to `Specifications/dev-workflow-platform.md`; resolve FR ID collision (rename FR-IMG-* and FR-ORC-*)
10. **DEP-005:** Plan `pino@10` migration
11. **QO-007:** Create `portal/Backend/src/database/seed.ts` per FR-dependency-seed
12. Re-run TheInspector with services online (performance-profiler + chaos-monkey)

### Backlog
- QO-009: Split 4 files >500 lines into smaller components
- QO-010: Audit 3 `eslint-disable react-hooks/exhaustive-deps` suppressions
- DEP-006: `npm install uuid@14`
- DEP-010/011: Plan React 19 + react-router-dom v7 migrations
- QO-008: Add `// Verifies: FR-TMP-008` to `platform/Dockerfile.worker:28`

---

## Spec Coverage

| Specification | FRs | Coverage |
|---------------|-----|----------|
| `Specifications/dev-workflow-platform.md` | 69 | **100%** |
| `Specifications/tiered-merge-pipeline.md` | 10 | **90%** (FR-TMP-008 missing comment) |
| `Plans/self-judging-workflow` | 13 | **100%** |
| `Plans/dependency-linking` | 15 | **87%** |
| `Plans/duplicate-deprecated-status` | 13 | **85%** |

FR ID collision: Both `Plans/orchestrator-cycle-dashboard` and `Plans/image-upload` define FR-070..076 for different features. Must be resolved before next drift analysis.

---

## Output Files

| File | Description |
|------|-------------|
| `Teams/TheInspector/findings/audit-2026-06-11-C.html` | Full HTML report (16 sections) |
| `Teams/TheInspector/findings/bug-backlog-2026-06-11.json` | Machine-readable bug backlog (2 escalations + 9 P2 bugs) |
| `inspector-report.md` | This summary |

---

*Generated by TheInspector · team-leader · 2026-06-11*
