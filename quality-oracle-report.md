## Quality Oracle Findings — 2026-10-19

**Grade: B** · 0 P1 · 2 P2 · 2 P3 · 2 P4

---

### Spec Coverage

| Spec | FRs | Coverage in Source/ |
|---|---|---|
| Active plan (FR-WF-\*, FR-dependency-\*) | 28 | **100%** ✅ |
| `dev-workflow-platform.md` (FR-001–069) | 74 | **0%** ❌ (lives in `portal/`) |
| `tiered-merge-pipeline.md` (FR-TMP-\*) | 10 | **0% in Source/** ⚠️ (lives in `platform/`) |

---

### Findings

**QO-001 (P2) — Traceability enforcer blind to `Specifications/`**
`tools/traceability-enforcer.py` only scans `Plans/*/requirements.md` (most-recently-modified) against `Source/`. It never validates any `Specifications/*.md` file against its implementation directory. Running the enforcer manually against `Specifications/dev-workflow-platform.md` yields **76 MISSING**; against `tiered-merge-pipeline.md` yields **13 MISSING** — all false alarms because these specs target `portal/` and `platform/` respectively. But this means any future spec added to `Specifications/` with no companion plan will silently have zero enforcement.
→ **Fix:** add a `--specs` mode that accepts an explicit spec file + implementation dir pair.

**QO-002 (P2) — System split (Source/ vs portal/) is undocumented**
The project silently splits across three implementation targets (`Source/`, `portal/`, `platform/`) but CLAUDE.md and the specs contain no documentation of this split. A new agent reading CLAUDE.md and the specs has no way to know that `dev-workflow-platform.md` (described as "The most critical documents") targets `portal/`, not `Source/`. Cross-contamination risk: an agent could implement FR-001 in `Source/` when it already exists in `portal/`.
→ **Fix:** Add `# Implemented-in: portal/` headers to specs; update CLAUDE.md with a system topology section.

**QO-003 (P3) — Duplicate test files for WorkItemDetailPage and WorkItemListPage**
Both `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines) exist and test the same component. They differ in imports and test cases — neither is a strict subset of the other. Same for WorkItemListPage. The `tests/pages/` versions are newer and more comprehensive.
→ **Fix:** Delete the root-level `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`; keep `tests/pages/` versions.

**QO-004 (P3) — `eslint-disable` in 2 production files**
`DependencyPicker.tsx:82` and `useWorkItems.ts:63` both suppress `react-hooks/exhaustive-deps` with no rationale comment. This could mask stale closure bugs.
→ **Fix:** Replace bare suppression with documented reasoning, e.g. `// eslint-disable-next-line react-hooks/exhaustive-deps — intentional: debounced query resets on mount only`.

**QO-005 (P4) — FR-TMP-008 not traced in platform/**
All FR-TMP-001/002/003/004/005/006/007/009/010 have `// Verifies:` in `platform/orchestrator/lib/`. FR-TMP-008 (Dockerfile.worker prerequisites) is untraced because Dockerfiles don't carry comments in the enforcer's scan scope.

**QO-006 (P4) — Silent `.catch()` in api/client.ts error path**
`response.json().catch(() => ({}))` discards JSON parse error context, but the outer `throw` ensures failure is propagated — borderline acceptable.

---

### Architecture Rule Compliance: All Green

✅ No `console.log` in production source · ✅ No hardcoded secrets · ✅ No direct DB calls from routes · ✅ No framework imports in services · ✅ No files over 500 lines · ✅ No skipped tests · ✅ All active-plan FRs traced

---

**Report saved to:** `Teams/TheInspector/findings/audit-2026-10-19-quality-oracle.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
