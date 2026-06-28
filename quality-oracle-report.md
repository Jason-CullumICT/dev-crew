## Quality Oracle Findings — 2026-06-28

**Grade: C** (1 P1, 4 P2, 1 P3, 1 P4)

---

### Spec Coverage: 79%
28 requirements checked (FR-WF-* + FR-dependency-*). 22 fully compliant, 6 with gaps or deviations.

| Plan | Requirements | Compliant |
|------|-------------|-----------|
| self-judging-workflow (FR-WF-*) | 13 | 13 (100%) |
| dependency-linking (FR-dependency-*) | 15 | 11 (73%) |

*Specs/dev-workflow-platform.md (FR-001..069) and tiered-merge-pipeline.md (FR-TMP-*) target `portal/` and `platform/` respectively — separate apps, not covered by Source/ enforcer.*

---

### QO-001 — `GET /api/search` NOT REGISTERED · P1 · unimplemented-requirement
**File:** `Source/Backend/src/app.ts` (missing), `Source/Backend/tests/routes/search.test.ts`

The `FR-dependency-search` endpoint is fully tested (5 supertest cases) but never registered in `app.ts`. The test file self-documents this: *"these tests will FAIL until the route is implemented."* Every `DependencyPicker` typeahead call hits a 404 in production.

**Fix:** Create `Source/Backend/src/routes/search.ts`, filter non-deleted items by title/description, and add `app.use('/api/search', searchRouter)` to `app.ts`.

---

### QO-002 — `dependencyCheckDuration` Histogram Missing · P2 · spec-drift
**File:** `Source/Backend/src/metrics.ts`

`FR-dependency-metrics` requires 4 metrics. Only 3 are present — the `dependencyCheckDuration` `Histogram` is entirely absent. No `.observe()` calls exist in the dependency service. Dependency check latency is invisible to operators.

---

### QO-003 — `BlockedBadge` Missing Amber `pending_dependencies` State · P2 · spec-drift
**File:** `Source/Frontend/src/components/BlockedBadge.tsx`

`FR-dependency-blocked-badge` specifies two states: red "Blocked" ✅ and amber "Pending Dependencies" when `status='pending_dependencies'` ❌. The `status` prop doesn't exist on the component. The test suite also only covers the red/absent cases.

---

### QO-004 — `dispatch-gating` Returns 400 Instead of `pending_dependencies` Status Transition · P2 · spec-drift
**File:** `Source/Backend/src/routes/workflow.ts:230-245`

The spec says blocked items should transition to `pending_dependencies` status. The implementation returns a `400` error and does nothing to the item's status. `pending_dependencies` is also absent from the `WorkItemStatus` enum and `VALID_STATUS_TRANSITIONS`. Two valid resolutions: align the code to the spec (add the status), or align the spec to the code (document the 400-error approach).

---

### QO-005 — Traceability Enforcer Targets Most-Recently-Modified Plan Only · P2 · architecture-violation
**File:** `tools/traceability-enforcer.py:49-57`

The enforcer picks its target by `max(req_files, key=os.path.getmtime)`. Today that's `Plans/self-judging-workflow/requirements.md`. FR-dependency-* requirements from `Plans/dependency-linking/requirements.md` are **never enforced** — which is how QO-001 (the missing search route) slipped through undetected. Fix: run the enforcer with explicit `--plan` for each active plan.

---

### QO-006 — eslint-disable Without Justification · P3 · pattern-violation
`Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63` suppress `react-hooks/exhaustive-deps` without explaining why the omission is safe.

---

### QO-007 — DebugPortalPage Uses Non-FR Traceability String · P4 · pattern-violation
`// Verifies: dev-crew debug portal` is a description, not an FR ID. The enforcer regex won't match it; the page has no backing requirement.

---

### QO-008 — portal/ Missing FR-dependency-api-types + FR-dependency-seed · P2 [ESCALATE → TheFixer]
`portal/Shared/api.ts` `UpdateBugInput` and `UpdateFeatureRequestInput` lack `blocked_by?: string[]` (confirmed); `portal/Backend/src/database/seed.ts` does not exist. Both were documented as missing in the plan's implementation delta and remain unresolved.

---

**Findings written to:** `Teams/TheInspector/findings/audit-2026-06-28-C.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
