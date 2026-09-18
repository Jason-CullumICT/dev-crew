# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-18

### Spec Coverage Trend

- **Active plan (self-judging-workflow + dependency-linking):** 27/28 requirements traced = **96%**
- **Active plan P1 gap:** `FR-dependency-search` — `GET /api/search` exists in tests but is NOT registered in `Source/Backend/src/app.ts`

### Architecture of this Repository

**Two separate apps** live in this repo — critical context for future audits:

| App | Dir | Spec | FR Namespace |
|-----|-----|------|--------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | FR-WF-001 to FR-WF-013 |
| Dev Workflow Platform (portal) | `portal/` | `Specifications/dev-workflow-platform.md` | FR-001 to FR-069 |
| Platform orchestrator | `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 |

The traceability enforcer only scans `Source/` and `E2E/` — it does NOT cover `portal/` or `platform/`.

### Key File Paths (fast lookup)

| Purpose | Path |
|---------|------|
| Source backend app entry | `Source/Backend/src/app.ts` |
| Source backend metrics | `Source/Backend/src/metrics.ts` |
| Source shared types | `Source/Shared/types/workflow.ts` |
| Active plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Dependency plan requirements | `Plans/dependency-linking/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Portal backend metrics | `portal/Backend/src/metrics.ts` |

### Traceability Enforcer Gotchas

1. **Auto-selects most-recently-modified plan.** Running without `--plan` picks `self-judging-workflow` only. The `dependency-linking` plan must be checked separately with `--plan dependency-linking`.
2. **False positives from entity IDs in prose.** The pattern `FR-[A-Z0-9-]+` matches `FR-0002`, `FR-0003` etc. that appear as work-item entity IDs in prose descriptions (e.g., "FR-0004 blocked_by FR-0003"). These are NOT requirement IDs — filter by checking they appear in `| FR-ID |` table rows only.
3. **FR-070, FR-085 reported missing** from dependency-linking plan — these are real: the plan claims "FR-070 — FR-085" in `dev-workflow-platform.md` but those IDs don't appear as Verifies comments. Not critical for Source/ since that spec covers portal/.

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` in hooks/components without rationale comment
- Duplicate test files: `tests/` root and `tests/pages/` both contain WorkItemListPage and WorkItemDetailPage tests
- `Source/E2E/playwright.pipeline.config.ts` hardcodes an expired cycle run directory (auto-generated, should use env var)

### Open P1/P2 from this audit (for re-verification next run)

| ID | Status | File |
|----|--------|------|
| QO-001 P1 | OPEN | `Source/Backend/src/app.ts` — search route unregistered |
| QO-002 P2 | OPEN | `Source/Backend/src/metrics.ts` — dependencyCheckDuration missing |
| QO-003 P2 | OPEN | `Specifications/` — no labeling of which app each spec covers |
| QO-004 P2 | OPEN | `tools/traceability-enforcer.py` — auto-selects wrong plan |
| QO-005 P2 | OPEN | `Source/E2E/` — FR-TMP-* have zero Verifies |
