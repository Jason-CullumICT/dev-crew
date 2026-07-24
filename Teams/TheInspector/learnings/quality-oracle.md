# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run — 2026-07-24

### Spec Coverage Trend

| Spec File | Coverage (by ID) | Notes |
|-----------|-----------------|-------|
| `Specifications/dev-workflow-platform.md` | **0%** (76/76 missing) | Source uses FR-WF-* Plan IDs, not spec FR-001…FR-069 |
| `Specifications/tiered-merge-pipeline.md` | **0% in Source/** (implemented in platform/) | Enforcer doesn't scan platform/ |
| `Specifications/workflow-engine.md` | **N/A** | No FR IDs defined in this spec |
| `Plans/self-judging-workflow/requirements.md` | **100% PASSING** ✅ | Enforcer designed for Plan-level IDs |
| `Plans/dependency-linking/requirements.md` | ~90% (seed + histogram missing) | 7 cross-ref IDs flagged as false positives |

### Key Structural Discovery

The project has a **two-tier ID system**:
- **Specification IDs** (FR-001…FR-069, FR-XXX): defined in Specifications/ files, **NOT referenced in Source/**
- **Plan IDs** (FR-WF-*, FR-dependency-*, FR-TMP-*): defined in Plans/ files, **referenced in Source/**

The traceability enforcer (`tools/traceability-enforcer.py`) is designed to work against Plans/, not Specifications/. Running it against Specifications/ will always show ~0% coverage. This is expected behavior per the enforcer's design (it uses Plans/ as its default source), but it means the canonical Specs are untraceable by the automated gate.

### Architecture Reality

- `Specifications/dev-workflow-platform.md` (FR-001 to FR-069): Describes a full platform with SQLite, Feature Requests, Bug Reports, Development Cycles. **None of these are implemented in Source/**. Source implements a different, simpler in-memory workflow engine.
- `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010): Implemented in `platform/orchestrator/` not in `Source/`. The enforcer's Source/-only scan gives a false-negative.
- `Specifications/workflow-engine.md`: The actual blueprint for Source/ — but has no machine-verifiable FR IDs.

### Common Pattern Violations Found

1. **Missing Prometheus histogram**: `dependencyCheckDuration` histogram required by FR-dependency-metrics is absent from `Source/Backend/src/metrics.ts`
2. **Missing seed file**: FR-dependency-seed has no implementation (`Source/Backend/src/seed.ts` doesn't exist)
3. **Stale plan paths**: `Plans/dependency-linking/requirements.md` references `portal/Backend/src/...` paths that are actually `Source/Backend/src/...`
4. **Invalid traceability comment**: `DebugPortalPage.tsx` uses `// Verifies: dev-crew debug portal` (not FR-XXX format)
5. **eslint-disable suppressions**: 2 files suppress `react-hooks/exhaustive-deps`

### Useful File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Canonical spec for platform | `Specifications/dev-workflow-platform.md` |
| Canonical spec for workflow engine | `Specifications/workflow-engine.md` |
| Tiered merge pipeline spec | `Specifications/tiered-merge-pipeline.md` |
| Plan-level FR-WF-* requirements (source of truth for enforcer) | `Plans/self-judging-workflow/requirements.md` |
| Plan-level FR-dependency-* requirements | `Plans/dependency-linking/requirements.md` |
| Metrics implementation | `Source/Backend/src/metrics.ts` |
| Dependency service | `Source/Backend/src/services/dependency.ts` |
| Tiered-merge-pipeline implementation | `platform/orchestrator/lib/dispatch.js`, `platform/orchestrator/lib/workflow-engine.test.js` |
| Traceability enforcer | `tools/traceability-enforcer.py` |

### Enforcer Behavior Notes

- Enforcer scans `source_dirs: ["Source", "E2E"]` — does NOT scan `platform/`
- Enforcer regex `FR-[A-Z0-9-]+` matches uppercase-only IDs — misses `FR-dependency-*` (lowercase) when scanning spec files
- Enforcer's default target is most-recently-modified `Plans/**/requirements.md` — always use `--file` flag when auditing specs directly
- To check plan-level coverage (the "correct" use): `python3 tools/traceability-enforcer.py --file Plans/self-judging-workflow/requirements.md`
