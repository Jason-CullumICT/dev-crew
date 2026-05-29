# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-05-29 (Full Audit)

### Spec Coverage Trend
- First baseline run — no prior trend to compare.
- Self-Judging Workflow Engine (Plans/self-judging-workflow, Source/): **100%** (13/13 FR-WF-* traced)
- Tiered-Merge-Pipeline (platform/): **90%** (9/10 FR-TMP-* traced; FR-TMP-008 untraced)
- Dependency Linking (hybrid Source/ + portal/): **~75%** (3 open items: api-types, metrics histogram, blocked-badge pending state)
- Dev-Workflow-Platform (portal/): **CANNOT MEASURE** — enforcer scope does not include portal/

### Critical Architecture Notes

**This repo has THREE distinct applications with separate specs and dirs:**
| App | Spec | Dir | Enforcer covers? |
|-----|------|-----|-----------------|
| Self-Judging Workflow Engine | `Specifications/workflow-engine.md` | `Source/` | ✅ Yes (auto-detected plan: self-judging-workflow) |
| Dev-Workflow Platform | `Specifications/dev-workflow-platform.md` | `portal/` | ❌ No |
| Tiered-Merge Pipeline | `Specifications/tiered-merge-pipeline.md` | `platform/` | ❌ No |

**Traceability enforcer limitation:** `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`. Plans targeting `portal/` (dev-workflow-platform, dependency-linking, dev-cycle-traceability, orchestrated-dev-cycles etc.) will ALWAYS show false failures when run without `--file`. The auto-detection picks the most-recently-modified requirements.md; with identical mtimes all plans have equal weight and selection is arbitrary.

### Open P2 Findings (confirm or close on next run)
1. `FR-dependency-blocked-badge` — `BlockedBadge.tsx` missing amber `pending_dependencies` state (no `status` prop exists at all)
2. `FR-dependency-metrics` — `dependencyCheckDuration` histogram not in `Source/Backend/src/metrics.ts`
3. `FR-dependency-api-types` (portal/) — `UpdateBugInput`/`UpdateFeatureRequestInput` missing `blocked_by?: string[]`; portal `DependencyPicker.tsx` uses `as any` cast

### Useful File Paths for Future Audits
- All Verifies comments: `grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx"`
- Plan requirements index: `Plans/*/requirements.md` (8 files total)
- Enforcer: `python3 tools/traceability-enforcer.py --file Plans/<name>/requirements.md`
- Metrics definition: `Source/Backend/src/metrics.ts`
- Portal API types: `portal/Shared/api.ts`
- Portal frontend DependencyPicker: `portal/Frontend/src/components/shared/DependencyPicker.tsx`
- FR-TMP-* in platform: `platform/orchestrator/lib/workflow-engine.js` and `platform/orchestrator/lib/config.js`

### Common Pattern Violations Found
- Duplicate test files: `tests/WorkItemListPage.test.tsx` AND `tests/pages/WorkItemListPage.test.tsx` (same for WorkItemDetailPage)
- `eslint-disable-next-line react-hooks/exhaustive-deps` in `useWorkItems.ts:63` and `DependencyPicker.tsx:82` without rationale comments
- Enforcer regex `FR-\d{3,}` captures seed data item IDs (FR-0002, FR-0003, etc.) as false requirement IDs

### Learnings for Future Audits
1. Always run enforcer per-plan for dependency-linking plan: targets portal/ paths, will always fail against Source/
2. Check `dependencyCheckDuration` histogram specifically — it was the only missing metric
3. `BlockedBadge` component is simpler than spec — check if `status='pending_dependencies'` amber badge was intentionally deferred or forgotten
4. `FR-dependency-seed` (portal/): no `seed.ts` found in `portal/Backend/src/database/` — may be an open requirement
