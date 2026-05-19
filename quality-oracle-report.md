---

## Quality Oracle Findings

### Spec Coverage: ~92% actual / 100% enforcer-visible (misleading)
- 13 FR-WF-* requirements in `Plans/self-judging-workflow/` → **13/13 traced** in `Source/`
- ~86 FR-001–069 + FR-dependency-* in `Specifications/dev-workflow-platform.md` → **~78 traced** in `portal/`
- 10 FR-TMP-* in `Specifications/tiered-merge-pipeline.md` → **9/10 traced** in `platform/`
- `traceability-enforcer.py` sees **only Source/ + E2E/** — reports a false 100% green

**Grade: C** (1 P1, 4 P2, 6 P3)

---

### QO-001: `GET /api/search` Unregistered — Tests Will Fail
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (route absent) + `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** The search.test.ts file *explicitly documents* that the route is not wired in app.ts and the 5 tests will fail when run. `FR-dependency-search` requires `GET /api/search?q=` as a DependencyPicker typeahead endpoint. No `searchRouter` import or `app.use()` registration exists in app.ts.
- **Recommendation:** Create `src/routes/search.ts` filtering non-deleted work items by title/description, register in `app.ts`.

---

### QO-002: Traceability Enforcer Blind to `portal/` and `platform/`
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:78` (`source_dirs = ["Source", "E2E"]` hardcoded)
- **Detail:** Two entire app trees (`portal/` implements FR-001–069; `platform/` implements FR-TMP-*) carry `// Verifies:` comments but are never scanned. Running the enforcer without args gives a false **TRACEABILITY PASSED**. Against `Specifications/dev-workflow-platform.md` it reports **76 MISSING** because it looks in Source/ instead of portal/.
- **Recommendation:** Extend `source_dirs` to `["Source", "portal", "platform", "E2E"]`.

---

### QO-003: `dependencyCheckDuration` Histogram Missing from Metrics
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` requires 4 Prometheus metrics. Only 3 counters exist; the `dependency_check_duration_seconds` Histogram (BFS latency) is absent. Acceptance criterion: *"All 4 metrics visible at GET /metrics."*
- **Recommendation:** Add a `Histogram` export to `metrics.ts` and instrument `hasUnresolvedBlockers()` in `services/dependency.ts`.

---

### QO-004: Image-Upload Features (FR-070–095) Have No Specification File
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/image-upload/requirements.md` (26 FRs); `Specifications/` (no image-upload.md)
- **Detail:** FR-070 through FR-095 are fully implemented in `portal/` with traceability, but were built from a Plan without a prior Specification. This violates the *"spec-first"* rule in CLAUDE.md. Scope creep that bypassed the canonical workflow.
- **Recommendation:** Create `Specifications/image-upload.md` with the domain model (ImageAttachment entity, upload rules, storage contract, API shape).

---

### QO-005: Duplicate Frontend Test Files
- **Severity:** P2
- **Category:** untested (test hygiene)
- **Files:** `tests/WorkItemDetailPage.test.tsx` + `tests/pages/WorkItemDetailPage.test.tsx` (and same pair for WorkItemListPage)
- **Detail:** Both versions run in the test suite, inflating coverage numbers. Divergences between them create ambiguity about the canonical test contract.
- **Recommendation:** Delete the root-level versions (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`); promote `tests/pages/` versions as canonical.

---

### QO-006 through QO-011 (P3)

| ID | Finding | File |
|----|---------|------|
| QO-006 | FR-TMP-008 (Dockerfile.worker prereqs) has no `# Verifies:` comment | `platform/Dockerfile.worker` |
| QO-007 | Enforcer uses mtime-based plan selection — non-deterministic with single-commit repos | `tools/traceability-enforcer.py:57` |
| QO-008 | `workflow-engine.md` has no FR-XXX IDs — implementation traces to Plan, not Spec | `Specifications/workflow-engine.md` |
| QO-009 | FR-dependency-seed data not implemented in Source/ | `Source/Backend/` |
| QO-010 | `DebugPortalPage.tsx` uses `// Verifies: dev-crew debug portal` (non-standard, won't match enforcer) | `Source/Frontend/src/pages/DebugPortalPage.tsx:1` |
| QO-011 | 2 `eslint-disable react-hooks/exhaustive-deps` without documented justification | `DependencyPicker.tsx:82`, `useWorkItems.ts:63` |

---

**Findings saved to:** `Teams/TheInspector/findings/audit-2026-05-19-C.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
