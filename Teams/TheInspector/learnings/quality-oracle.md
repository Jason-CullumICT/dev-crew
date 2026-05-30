# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Run: 2026-05-30 (First Run — Full Audit)

### Spec Coverage Trend

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| `Specifications/dev-workflow-platform.md` | 69 (FR-001..FR-069) | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001..FR-WF-013) | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` | 7 | 0 via enforcer (implemented with different FR namespace) | ~0% formal |
| `Plans/image-upload/requirements.md` | 21 | 0 | **0%** |
| `Plans/orchestrated-dev-cycles/requirements.md` | 18 | 0 | **0%** |
| `Plans/duplicate-deprecated-status/requirements.md` | 15 | 0 | **0%** |

### Key Discovery: Two Incompatible Applications

The repo hosts **two distinct applications** in `Specifications/`:
1. `Specifications/workflow-engine.md` — self-judging work item workflow engine (IMPLEMENTED in Source/)
2. `Specifications/dev-workflow-platform.md` — full dev platform with Feature Requests, Bug Reports, Dev Cycles (NOT in Source/)

Source/ only implements the workflow-engine domain. The dev-workflow-platform spec is either a future roadmap or describes an entirely different application. This creates a structural spec drift that **cannot be resolved by adding traceability comments** — it requires a decision on which spec Source/ is meant to satisfy.

### Traceability Enforcer Blind Spot

`tools/traceability-enforcer.py` without arguments targets the **most recently modified** `Plans/*/requirements.md`. As of 2026-05-30 that is `Plans/self-judging-workflow/requirements.md` (100% pass). All other plans with unimplemented FRs are silently ignored. The enforcer falsely reports PASSED.

To expose true traceability debt, run:
```
python3 tools/traceability-enforcer.py --plan image-upload         # 21 MISSING
python3 tools/traceability-enforcer.py --plan orchestrated-dev-cycles  # 18 MISSING
python3 tools/traceability-enforcer.py --plan duplicate-deprecated-status  # 15 MISSING
python3 tools/traceability-enforcer.py --plan dependency-linking   # 7 MISSING (namespace mismatch)
```

### FR Namespace Fragmentation

Source code uses three disjoint FR namespaces:
- `FR-WF-XXX` — aligns with self-judging-workflow plan (13 IDs)
- `FR-dependency-XXX` — informal IDs for dependency feature (no plan-level alignment)
- `FR-001..FR-069` — in `Specifications/dev-workflow-platform.md` (ZERO source references)

The `FR-dependency-*` IDs exist in source but have no corresponding plan with matching IDs — `Plans/dependency-linking/requirements.md` uses `FR-0002..FR-0007` format. This namespace mismatch means the enforcer always fails dependency-linking even though features are implemented.

### Common Pattern Violations

- `eslint-disable-next-line react-hooks/exhaustive-deps` in two production files (CLAUDE.md prohibits eslint-disable)
- NFR-1, NFR-2, NFR-3 from `Specifications/tiered-merge-pipeline.md` have zero source traces
- Duplicate test files: root-level tests and `tests/pages/` subtests for WorkItemDetailPage and WorkItemListPage

### Useful File Paths for Future Audits

- Enforcer: `tools/traceability-enforcer.py`
- Master spec: `Specifications/dev-workflow-platform.md` (FR-001..FR-069, UNIMPLEMENTED)
- Active spec: `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md`
- All source Verifies: `grep -rn "Verifies:" Source/`
- Backend source files: all have Verifies comments (good hygiene)
- Frontend source files: all have Verifies comments (good hygiene)
- Eslint violations: `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- Duplicate test files: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/WorkItemListPage.test.tsx` (root = stale)
