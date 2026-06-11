---

## Quality Oracle Findings

**Grade: B** — 0 P1s, 6 P2s, 100% formal spec coverage

---

### Spec Coverage: 100% (formal specs) / ~87% (dependency plan)

| Spec | FRs | Covered |
|------|-----|---------|
| `Specifications/dev-workflow-platform.md` (FR-001..069) | 69 | **69 / 100%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010) | 10 | **10 / 100%** ¹ |
| `Plans/self-judging-workflow/` (FR-WF-001..013) | 13 | **13 / 100%** |
| `Plans/dependency-linking/` (FR-dependency-*) | 15 | **13 / 87%** |

¹ FR-TMP-008 is functionally implemented (gh CLI in Dockerfile.worker, GITHUB_TOKEN passed) — traceability comment only missing.

---

### QO-001 — FR-dependency-api-types: Shared types missing `blocked_by`
- **Severity:** P2 | **Category:** spec-drift
- **Files:** `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`) and `:59` (`UpdateBugInput`)
- **Detail:** Both types lack the `blocked_by?: string[]` field required by FR-dependency-api-types. `DependencyPicker.tsx:291,293` works around this with `as any` casts. This was tracked as incomplete in the dependency-linking plan and **remains open**.
- **Recommendation:** Add `blocked_by?: string[]` to both types in `portal/Shared/api.ts`; remove the `as any` casts.

---

### QO-002 — Architecture: Direct DB calls in `teamDispatches.ts` route
- **Severity:** P2 | **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37,41,72`
- **Detail:** Route handler calls `getDb()` and runs SQL queries directly — no service layer. Violates "No direct DB calls from route handlers." Also: no `// Verifies:` comment, no test file.
- **Recommendation:** Extract to `teamDispatchService.ts`. Add spec + traceability + tests.

---

### QO-003 — Duplicate type definitions diverge from Shared layer
- **Severity:** P2 | **Category:** architecture-violation
- **Files:** `portal/Backend/src/services/featureRequestService.ts:244` and `bugService.ts:184` each re-define `UpdateFeatureRequestInput`/`UpdateBugInput` with `blocked_by` that the Shared version lacks.
- **Detail:** Violates "Shared types are single source of truth." The service-layer types are richer than Shared — root cause of QO-001 and the `as any` casts.
- **Recommendation:** Fix Shared/api.ts (QO-001), then remove the duplicate service-layer definitions.

---

### QO-004 — Silent error swallowing (`.catch(() => {})`)
- **Severity:** P2 | **Category:** architecture-violation
- **Files:** `portal/Frontend/src/components/bugs/BugDetail.tsx:82`, `FeatureRequestDetail.tsx:80`, `common/RepoSelector.tsx:20`
- **Detail:** Repo-list fetch failures are silently dropped. Users see an empty selector with no explanation. Violates "Never swallow errors silently."
- **Recommendation:** Log the error and set an error state that renders a user-visible message. If intentionally optional, add an inline comment.

---

### QO-005 — TeamsPage and team-dispatches route: untraced, no spec
- **Severity:** P2 | **Category:** unlinked-implementation
- **Files:** `portal/Frontend/src/pages/TeamsPage.tsx`, `portal/Backend/src/routes/teamDispatches.ts`
- **Detail:** Implements a feature with no entry in `Specifications/`, no `// Verifies:` comment, and no test coverage. Untraced scope creep.
- **Recommendation:** Write a spec or plan with FR IDs, add traceability, add tests.

---

### QO-006 — Spec documentation gap: FR-070–095 absent from Specifications/ + FR ID collision
- **Severity:** P2 | **Category:** spec-drift
- **Detail:** `Specifications/dev-workflow-platform.md` ends at FR-069. FR-070–095 (orchestrator dashboard, image upload) are implemented in `portal/` but defined only in `Plans/`. Worse, **both** `Plans/orchestrator-cycle-dashboard/requirements.md` and `Plans/image-upload/requirements.md` define FR-070..076 for _different_ features — an FR ID collision. In code, FR-070 = `OrchestratorCyclesPage`.
- **Recommendation:** Append FR-070..095 to the canonical spec. Renumber one conflicting feature with a distinct prefix (e.g. `FR-IMG-*` or `FR-ORC-*`).

---

### QO-007 — FR-dependency-seed: `seed.ts` does not exist (P3)
- **File:** `portal/Backend/src/database/seed.ts` — missing
- **Detail:** Required by FR-dependency-seed; no seed file exists.

### QO-008 — FR-TMP-008: no Verifies comment (P4)
- **File:** `platform/Dockerfile.worker:28-32` — functionally correct, traceability comment missing.

### QO-009 — Large production files: 4 files >500 lines (P3)
`FeatureRequestDetail.tsx` (550), `BugDetail.tsx` (546), `cycleService.ts` (526), `api/client.ts` (525).

### QO-010 — `eslint-disable` on react-hooks/exhaustive-deps in 3 hooks (P3)
`useWorkItems.ts:63`, `DependencyPicker.tsx:82`, `useApi.ts:35` — potential stale-closure bugs.

---

**Architecture compliance:** 3 rules broken (no-direct-DB, shared-types-single-source, never-swallow-errors). No `console.log` violations. No hardcoded secrets. All list endpoints use `{data: T[]}` wrappers correctly.

**Report saved to:** `Teams/TheInspector/findings/audit-2026-06-11-B.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
