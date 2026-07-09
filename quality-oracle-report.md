---

## Quality Oracle Findings — Full Audit Report

**Date:** 2026-07-09 | **Grade: A** (0 P1, 2 P2, 5 P3, 2 P4)

---

### Spec Coverage: 99% actual / 12% enforcer-tracked

| Spec Document | FR Count | Coverage | Enforcement |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (Source/) | 13 | 100% | ✅ Enforcer-gated |
| `Specifications/dev-workflow-platform.md` (portal/) | ~85 | ~100% | ❌ Not enforced |
| `Specifications/tiered-merge-pipeline.md` (platform/) | 10 | 90% | ❌ Not enforced |
| **Total canonical** | **~108** | **~99%** | **12% gated** |

The implementation is in good shape — actual coverage is near-complete. The danger is the enforcer's narrow scope.

---

### QO-001 · P2 · spec-drift — Enforcer covers only 12% of canonical spec
**File:** `tools/traceability-enforcer.py`

The enforcer auto-selects the most-recently-modified `Plans/*/requirements.md` — currently `Plans/self-judging-workflow/requirements.md` (13 FRs). `Specifications/dev-workflow-platform.md` (85 FRs, implemented in `portal/`) and `Specifications/tiered-merge-pipeline.md` (10 FRs, implemented in `platform/`) are never scanned. A silent regression in either codebase will pass the verification gate.

**Recommendation:** Extend enforcer with `--multi` mode or add per-spec invocations to the CI gate:
```bash
python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md --source portal/
python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md --source platform/
```

---

### QO-002 · P2 · spec-drift — FR-073–FR-095 are phantom requirements
**Files:** `portal/Backend/src/middleware/upload.ts:1`, `portal/Backend/src/services/imageService.ts:1`, `portal/Backend/tests/imageRoutes.test.ts:1`

23 FR IDs (FR-073–FR-095) appear in portal `// Verifies:` comments but exist in **no Specification document**. `Specifications/dev-workflow-platform.md` ends at FR-069. These appear to cover image upload and orchestrator proxy features — built without a spec, violating "specs are source of truth."

**Recommendation:** Add FR-073–FR-095 to `Specifications/dev-workflow-platform.md` with acceptance criteria, or create a new `Specifications/image-upload.md`.

---

### QO-003 · P3 · spec-drift — `dependencyCheckDuration` histogram missing from Source/ metrics
**File:** `Source/Backend/src/metrics.ts:1`

`FR-dependency-metrics` requires four metrics including a `dependencyCheckDuration` histogram. `Source/Backend/src/metrics.ts` has only the three counters and claims `// Verifies: FR-dependency-metrics`. The portal correctly implements `portal_dependency_check_duration_seconds`. The Source/ workflow engine's dependency operations are unobservable from a timing perspective.

---

### QO-004 · P3 · pattern-violation — Stale hardcoded E2E test path committed
**File:** `Source/E2E/playwright.pipeline.config.ts:5`

Hardcoded `testDir: "./tests/cycle-run-1774659927912-8dd3ac77"` — that directory doesn't exist. Running this config fails immediately. This appears to be a past-run artifact accidentally committed.

**Recommendation:** Delete or gitignore this file; the canonical config is `playwright.config.ts`.

---

### QO-005 · P3 · test-coverage — Duplicate test files for FR-WF-010 and FR-WF-011
**Files:** `Source/Frontend/tests/WorkItemListPage.test.tsx` + `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`; same for `WorkItemDetailPage`

Two near-identical test files exist in two locations, both claiming the same FRs. The `tests/pages/` versions appear to be the newer canonical copies.

**Recommendation:** Delete `tests/WorkItemListPage.test.tsx` and `tests/WorkItemDetailPage.test.tsx` (top-level), keep `tests/pages/` versions.

---

### QO-006 · P3 · spec-drift — FR-dependency-dispatch-gating behavior conflicts with spec
**File:** `Source/Backend/src/routes/workflow.ts:231`

The cited spec (`dev-workflow-platform.md`) says blocked dispatch → HTTP 200 + `status: pending_dependencies`. Source/ implementation returns HTTP 400. The two apps intentionally differ, but the shared FR ID makes the spec untrustworthy as a reference.

**Recommendation:** Define a separate `FR-WF-dependency-dispatch-gating` in `Plans/self-judging-workflow/requirements.md` with the correct 400 acceptance criteria and update the `Verifies:` comment.

---

### QO-007 · P3 · pattern-violation — 135 `console.log` calls in platform orchestrator
**File:** `platform/orchestrator/lib/workflow-engine.js:284` (and throughout)

Violates CLAUDE.md rule: "Use the project's logger abstraction, never `console.log`." Unstructured output breaks log aggregation pipelines. **→ ESCALATE to TheFixer**

---

### QO-008 · P4 · untested — FR-TMP-008 has no `Verifies:` comment in Dockerfile
**File:** `platform/Dockerfile.worker:39`

The implementation exists but the traceability comment is absent. Enforcer also doesn't scan Dockerfiles.

---

### QO-009 · P4 · pattern-violation — eslint-disable suppressions without rationale
**Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`

Two `react-hooks/exhaustive-deps` suppressions lack explanatory comments. Add rationale or fix the dependency arrays.

---

**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
