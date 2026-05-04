---

## Quality Oracle Findings

**Overall Grade: B** | P1: 0 | P2: 4 | P3: 2 | P4: 1

---

### Spec Coverage: 92% (100% for in-scope requirements)

| Spec | FRs | Coverage |
|------|-----|----------|
| `workflow-engine.md` → `Source/` (FR-WF-*) | 13 | ✅ 100% |
| `dev-workflow-platform.md` → `portal/` (FR-001..FR-069) | 69 | ✅ 100% |
| `FR-dependency-*` + `FR-DUP-*` → `portal/` | ~28 | ✅ ~100% |
| `tiered-merge-pipeline.md` (FR-TMP-001..010) | 10 | ❌ 0% (Phase 2, no plan yet) |

---

### QO-001 — Traceability Enforcer Blind to `portal/` — **P2 / tooling**
**File:** `tools/traceability-enforcer.py:78`

The default verification gate (`python3 tools/traceability-enforcer.py`) silently selects the most-recently-modified plan (`self-judging-workflow`, 13 FRs in `Source/`) and reports **PASS**. Seven other plans live in `portal/` — when run with `--file` against each of those plans, the enforcer reports 7–32 "missing" FRs per plan (118 total "missing") because it only scans `["Source", "E2E"]`. Every one of those FRs is *actually implemented* with `// Verifies:` in `portal/`, but they are invisible to the tool.

**Impact:** The standard gate is a false-pass signal. An agent could ship untraced `portal/` code and the gate would still say PASS.

**Fix:** Add `"portal"` to `source_dirs` in `traceability-enforcer.py:78` and to `inspector.config.yml`.

---

### QO-002 — Direct DB Calls in Route Handler — **P2 / architecture-violation**
**File:** `portal/Backend/src/routes/teamDispatches.ts:37, 41, 72`

The only route file in the entire codebase (across both `Source/` and `portal/`) that violates the "no direct DB calls from route handlers" rule. `db.prepare()` is called directly inside `router.get` and `router.post` handlers with no service layer.

**Fix:** Extract a `teamDispatchService.ts`.

---

### QO-003 — Three Unlinked Implementations — **P2 / spec-drift**
Three production files have zero `// Verifies:` comments and no matching Plan or Specification requirement was found:
- `portal/Backend/src/routes/teamDispatches.ts`
- `portal/Frontend/src/components/common/RepoSelector.tsx`
- `portal/Frontend/src/pages/TeamsPage.tsx`

**Fix:** Write spec requirements for these features, or add them to an existing plan.

---

### QO-004 — Two `eslint-disable` Suppressions Without Explanation — **P2 / pattern-violation**
- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

Both suppress `react-hooks/exhaustive-deps` with no comment explaining why the omitted dependency is safe. Can hide stale-closure bugs.

---

### QO-005 — Tiered Merge Pipeline Spec Entirely Unimplemented — **P3 / spec-drift**
`Specifications/tiered-merge-pipeline.md` defines 10 Phase-1 requirements (FR-TMP-001..010) with no corresponding Plan directory and zero `// Verifies:` anywhere. Needs either a plan created or the spec explicitly marked as deferred.

---

### QO-006 — Duplicate Test Files — **P3 / test-quality**
`WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` each exist in *two* locations: `Source/Frontend/tests/` (top-level) **and** `Source/Frontend/tests/pages/`. Four files, two components, doubling test time and risk of divergence. The `tests/pages/` versions are more complete; the top-level originals should be removed.

---

### QO-007 — Silent Search Error, No Log Emitted — **P4 / pattern-violation**
`Source/Frontend/src/components/DependencyPicker.tsx:56` — catch block is documented as intentional but emits no log. Degraded typeahead is invisible in production.

---

**Report written to:** `Teams/TheInspector/findings/audit-2026-05-04-B.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
