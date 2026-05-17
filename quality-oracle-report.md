---

## Quality Oracle Findings — 2026-05-17

**Grade: C** | 1 P1 · 5 P2 · 4 P3 · 2 P4

---

### Spec Coverage: ~95%

| Spec | FRs | Covered |
|------|-----|---------|
| dev-workflow-platform.md (FR-001..FR-069) | 69 | **100%** in `portal/` |
| FR-WF-001..FR-WF-013 (workflow engine) | 13 | **100%** in `Source/` |
| FR-TMP-001..FR-TMP-010 (tiered merge) | 10 | **90%** in `platform/orchestrator/` |
| FR-dependency-* | 16 | **87%** — 2 open gaps |
| FR-070..FR-095 + FR-DUP-* (extension) | 39 | 100% implemented — **absent from `Specifications/`** |

---

### QO-001 — FR-070 ID Collision · **P1 · spec-drift**
Both `Plans/image-upload/requirements.md` and `Plans/orchestrator-cycle-dashboard/requirements.md` assign **FR-070** to completely different features (ImageAttachment type vs. OrchestratorCyclesPage). Every `// Verifies: FR-070` comment in `portal/` is now ambiguous. The dependency-linking plan makes it a three-way collision by citing `Specifications/dev-workflow-platform.md (FR-070 — FR-085)` — IDs that don't exist in that file. **→ Solo/spec-author fix needed: renumber image-upload FRs to FR-IMG-001+ and orchestrator-cycle FRs to FR-OCD-001+.**

---

### QO-002 — Traceability Enforcer Blind Spot · **P2 · spec-drift**
`tools/traceability-enforcer.py:78` scans only `["Source", "E2E"]`. The entire `portal/` codebase (the larger of the two apps) is invisible to it. Running the enforcer today returns **PASSED** — but only reflects ~40% of the codebase. **→ Add `"portal"` to `source_dirs`; add `--all-plans` mode.**

---

### QO-003 — FR-dependency-seed Missing · **P2 · spec-drift**
`portal/Backend/src/database/seed.ts` does not exist. The dependency-linking plan's own delta table marks this `❌ Missing`. The 9 seeded relationships (BUG-0010 blocked by 5 bugs; 3 FR dependencies) cannot be demonstrated. **→ TheFixer: create seed.ts per FR-dependency-seed.**

---

### QO-004 — `as any` Cast from Incomplete API Types · **P2 · spec-drift + arch-violation**
`UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`. `DependencyPicker.tsx:291-293` works around this with `as any` casts — explicitly "❌ Missing" in the plan delta. **→ TheFixer: add field to both update types, remove casts.**

---

### QO-005 — Silent Error Swallowing · **P2 · architecture-violation**
Three portal frontend files use empty `.catch(() => {})`:
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`
- `portal/Frontend/src/components/common/RepoSelector.tsx:20`
- `portal/Frontend/src/components/bugs/BugDetail.tsx:82`

Violates CLAUDE.md: *"Never swallow errors silently."* **→ TheFixer: replace with at-minimum a `logger.warn` or UI error state.**

---

### QO-006 — 39 Extension FRs Absent from `Specifications/` · **P2 · spec-drift (inverse)**
FR-070..FR-095 (image upload, orchestrator cycle dashboard), FR-DUP-01..FR-DUP-13 (duplicate/deprecated status) are fully implemented but exist only in `Plans/`. `Specifications/dev-workflow-platform.md` has never been updated. CLAUDE.md: *"Specs are source of truth."* **→ requirements-reviewer: append extension sections to the canonical spec.**

---

### QO-007 — Phantom `FR-0001` Traceability ID · **P3**
`portal/Frontend/src/components/shared/DependencySection.tsx` uses `// Verifies: FR-0001` (5 times). No such four-zero-padded ID exists anywhere. Should be `FR-dependency-section`. **→ TheFixer: one-line fix × 5.**

---

### QO-008 — No Tests for `search.ts` and `teamDispatches.ts` · **P3 · untested**
Two portal backend routes have no test files. `search.ts` (FR-dependency-search, the DependencyPicker typeahead) is especially high-risk. **→ TheFixer: add `search.test.ts` + `teamDispatches.test.ts`.**

---

### QO-009 — Five Production Files Exceed 500 Lines · **P3 · pattern-violation**
`FeatureRequestDetail.tsx` (550), `BugDetail.tsx` (546), `cycleService.ts` (526), `client.ts` (525), `featureRequestService.ts` (506). All grew by feature accretion. Split candidates are clear — detail component sub-sections, domain client modules.

---

### QO-010 — 4 ESLint-disable Suppressions · **P3 · pattern-violation**
`useApi.ts:35`, `errorHandler.ts:21`, `DependencyPicker.tsx:82`, `useWorkItems.ts:63`. The `exhaustive-deps` suppressions carry stale-closure risk in hooks.

---

### QO-011 · QO-012 — Minor Traceability Gaps · **P4**
`platform/Dockerfile.worker` has no `# Verifies: FR-TMP-008`. `Source/Frontend/src/pages/DebugPortalPage.tsx` uses free-text instead of `Verifies: FR-XXX`.

---

Full report saved to: `Teams/TheInspector/findings/audit-2026-05-17-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`  
Route P2–P4 code fixes → **TheFixer** | Route spec gaps → **requirements-reviewer (solo session)**
