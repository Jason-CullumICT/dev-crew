---

## Quality Oracle Findings — 2026-05-23

**Grade: B** | 2 P1 · 5 P2 · 3 P3 · 1 P4

---

### Spec Coverage

The project has **three codebases against three specs** — only one (`Source/`) is visible to the default verification gate:

| Codebase | Spec | Enforcer Coverage |
|----------|------|------------------|
| `Source/` | workflow-engine.md → FR-WF-001–013 | ✅ 100% |
| `portal/` | dev-workflow-platform.md → FR-001–069 | ❌ blind |
| `platform/orchestrator/` | tiered-merge-pipeline.md → FR-TMP-001–010 | ❌ blind |

The default `python3 tools/traceability-enforcer.py` reports **PASS** while ~80 requirements in portal/ and platform/ are unscanned.

---

### QO-001 · P1 · Enforcer Blind to `portal/` and `platform/`
**`tools/traceability-enforcer.py:69`** — Scans only `["Source", "E2E"]`. Running against dev-workflow-platform plan yields **34 false-missing requirements**. Any agent using the default gate will see PASS while two entire codebases are unverified.
> **Fix:** Add `portal` and `platform` to `source_dirs` in the enforcer, or add per-codebase gate invocations to CLAUDE.md.

---

### QO-002 · P1 · `pending_dependencies` Status Missing from `WorkItemStatus` Enum
**`Source/Shared/types/workflow.ts`** — `api-contracts.md` and `FR-dependency-dispatch-gating` both specify: "if transitioning to `approved` with unresolved blockers → set status to `pending_dependencies`." The enum has **no `pending_dependencies` member**, `VALID_STATUS_TRANSITIONS` has no entry for it, and the dispatch endpoint returns a 400 error rather than performing a status transition. The `// Verifies: FR-dependency-dispatch-gating` comment is a false claim.
> **Fix:** Add `PendingDependencies = 'pending-dependencies'` to enum, update transition table and approve/dispatch endpoints. Portal implements this correctly — mirror it.

---

### QO-003 · P2 · `dependencyCheckDuration` Histogram Missing from Source/ Metrics
**`Source/Backend/src/metrics.ts`** — FR-dependency-metrics requires 4 metrics; only 3 are implemented. The Histogram is present in `portal/Backend/src/metrics.ts` but absent from `Source/Backend/src/metrics.ts`. The `// Verifies: FR-dependency-metrics` comment is incomplete.

---

### QO-004 · P2 · `as any` Casts in portal/ DependencyPicker (FR-dependency-api-types Open)
**`portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`** — `UpdateBugInput`/`UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`. Explicitly tracked as `❌ Missing` in Plans/dependency-linking/requirements.md — still not fixed.

---

### QO-005 · P2 · `seed.ts` Missing from portal/ Database Directory
**`portal/Backend/src/database/`** — Only `connection.ts` and `schema.ts` exist. FR-dependency-seed requires idempotent seeding of 8 known dependency relationships. Also explicitly tracked as `❌ Missing` in the dependency-linking plan.

---

### QO-006 · P2 · Duplicate Frontend Test Files (Diverged)
Two pairs of test files covering the same components have diverged:
- `tests/WorkItemDetailPage.test.tsx` (368L) ≠ `tests/pages/WorkItemDetailPage.test.tsx` (393L)
- `tests/WorkItemListPage.test.tsx` (286L) ≠ `tests/pages/WorkItemListPage.test.tsx` (262L)

Both pairs run in the test suite. No canonical version is obvious; they cover different scenarios.

---

### QO-007 · P2 · Enforcer Regex False-Matches Seed Data IDs as Requirements
**`tools/traceability-enforcer.py:62`** — Regex `FR-[A-Z0-9-]+` matches prose like "FR-0004 blocked_by FR-0003" as requirement IDs `FR-0004`, `FR-0003`. Produces 7 false failures when run against dependency-linking requirements.md.

---

### QO-008 · P3 · FR-WF-* IDs Live Only in Plans/, Not in Specifications/
`Specifications/workflow-engine.md` has no formal FR-WF-XXX section. The spec-first rule says "implementation traces to specs" — but FR-WF-* IDs exist only in the Plan layer. Spec changes won't show impact on traceable requirements.

---

### QO-009 · P3 · FR-TMP-008 Has No `Verifies:` Comment in Dockerfile.worker
`platform/Dockerfile.worker:31–32` installs `gh` CLI (satisfying FR-TMP-008) but has no traceability comment.

---

### QO-010 · P3 · Two `eslint-disable` Suppressions Without Justification Comments
`DependencyPicker.tsx:82` and `useWorkItems.ts:63` suppress `react-hooks/exhaustive-deps` without explaining why the effect intentionally omits the dependency. Potential stale-closure risk.

---

### QO-011 · P4 · DashboardPage.tsx Missing File-Level `// Verifies:` Comment
The only page in `Source/Frontend/src/pages/` without a file-level traceability comment.

---

**Report saved:** `Teams/TheInspector/findings/audit-2026-05-23-B.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
