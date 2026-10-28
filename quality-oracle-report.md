## Quality Oracle — Full Audit Complete

**Grade: B** (1 P1, 3 P2, 3 P3 — no P1 exploitable defects, but a structural traceability gap)

---

### Spec Coverage: ~88%

| Spec | FRs | Traced | Coverage |
|---|---|---|---|
| Workflow Engine (FR-WF-001–013) | 13 | 13 | **100%** |
| Dev Workflow Platform (FR-001–069 + FR-dependency-*) | ~85 | ~82 | **~96%** |
| Tiered Merge Pipeline (FR-TMP-001–010) | 10 | **0** | **0%** |

---

### Findings

**QO-001 · P1 — Enforcer Scope Too Narrow (False PASS)**
`tools/traceability-enforcer.py` only scans the most-recently-modified plan file (`Plans/self-judging-workflow/requirements.md`, 13 items) and only looks in `Source/`. It never touches `portal/` or `Specifications/tiered-merge-pipeline.md`. The PASS output is misleading — ~13 open requirements and a whole spec are invisible to it.
→ Fix: add `portal/` to scan dirs; register the dev-workflow-platform spec as a second requirement source in `inspector.config.yml`.

**QO-002 · P2 — Three FR-dependency Items Still Open in `portal/`**
- `portal/Backend/src/database/seed.ts` — **does not exist** (FR-dependency-seed)
- `portal/Frontend/src/components/shared/DependencyPicker.tsx:291-293` — `as any` casts because `UpdateBugInput`/`UpdateFeatureRequestInput` lack `blocked_by` (FR-dependency-api-types)
- `portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` — **do not exist** (FR-dependency-frontend-tests)
→ Route to TheFixer. All three are small-scope items already scoped in `Plans/dependency-linking/requirements.md`.

**QO-003 · P2 — Route Handlers Import Store Directly (Architecture Violation)**
`Source/Backend/src/routes/workItems.ts`, `workflow.ts`, and `intake.ts` all `import * as store from '../store/workItemStore'`, bypassing the service layer. The architecture rule "No direct DB calls from route handlers" is violated across all three.

**QO-004 · P2 — FR-TMP-001–010 Have Zero Traceability**
`Specifications/tiered-merge-pipeline.md` (Risk Classification, Playwright E2E, Auto-PR, Auto-Merge, etc.) has no `// Verifies:` references anywhere. Unknown if intentionally deferred or silently abandoned.

**QO-005 · P3 — Non-Canonical FR IDs in `portal/Backend/tests/dependencies.test.ts`**
Tests use `FR-dependency-cycle-detection`, `FR-dependency-linking`, and `FR-dependency-ready-check` — none are canonical spec IDs. Should map to `FR-dependency-service` and `FR-dependency-endpoints`.

**QO-006 · P3 — Undocumented `eslint-disable` in `useWorkItems.ts:63`**
The disable is functionally justified but lacks a comment explaining why. Future field additions to `WorkItemFilters` would silently skip re-fetches.

**QO-007 · P3 — Duplicate `WorkItemDetailPage` Test Files**
`Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` both cover FR-WF-011 with overlapping test cases.

---

Full report written to `Teams/TheInspector/findings/audit-2026-10-28-quality-oracle.md`. Learnings persisted to `Teams/TheInspector/learnings/quality-oracle.md`.
