# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-07-09

### Architecture Overview (Critical for Future Audits)

This repository contains **three distinct applications** with three separate FR namespaces. Do NOT conflate them:

| Application | Location | Spec Document | FR Namespace |
|-------------|----------|---------------|--------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` | `FR-WF-001`–`FR-WF-013` |
| Dev Workflow Platform (Portal) | `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001`–`FR-069`, `FR-dependency-*` |
| Tiered Merge Pipeline | `platform/` | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-001`–`FR-TMP-010` |

### Spec Coverage Trend

- **Enforcer-tracked coverage**: 13 of ~108 canonical FRs (12%) — the enforcer only scans `Plans/self-judging-workflow/requirements.md`.
- **Actual implementation coverage**: ~107/108 (99%) — all three apps have `Verifies:` comments for their respective FRs.
- The gap between enforcer coverage and actual coverage is the primary risk signal. If the enforcer were extended to cover all specs, coverage would be near-100%.

### Common Pattern Violations Found

1. **console.log in platform/**: `platform/orchestrator/lib/workflow-engine.js` has 135+ `console.log` calls — violates "use logger abstraction" rule. This is infrastructure code but the rule is not carved out.
2. **eslint-disable suppressions**: Two `react-hooks/exhaustive-deps` suppressions in production Frontend code.
3. **Phantom requirements (FR-073–FR-095)**: Portal code references 23 FRs not defined in any Specification file. Image upload and orchestrator proxy features implemented without backing spec.
4. **Stale committed Playwright config**: `Source/E2E/playwright.pipeline.config.ts` has a hardcoded non-existent test directory.

### Useful File Paths for Future Audits

| What | Path |
|------|------|
| Source/ traceability enforcer | `tools/traceability-enforcer.py` |
| Active plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Portal spec | `Specifications/dev-workflow-platform.md` |
| Tiered merge spec | `Specifications/tiered-merge-pipeline.md` |
| Source metrics | `Source/Backend/src/metrics.ts` |
| Portal metrics | `portal/Backend/src/metrics.ts` |
| Platform orchestrator | `platform/orchestrator/lib/workflow-engine.js` |
| Prior drift report | `spec-drift-report.json` (STALE — analysis was incorrect, treat with caution) |

### Prior P1/P2 Findings Status

_First audit — no prior P1/P2 to re-verify._

### Key Discovery: spec-drift-report.json is Incorrect

The root-level `spec-drift-report.json` reports FR-WF-001–FR-WF-013 as "untracked implementations" (wrong — they ARE spec-backed via Plans/) and reports 0% coverage for FR-TMP-* (partially wrong — most are implemented in platform/ with Verifies comments). Do not trust this file — it uses a flawed alias-resolution approach.

### Spec Coverage Trend

- 2026-07-09: Enforcer passes (13/13 WF reqs). Actual multi-spec coverage ~99%. Enforcer scope is the vulnerability.
