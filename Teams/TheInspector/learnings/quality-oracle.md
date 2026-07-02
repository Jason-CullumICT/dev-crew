# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-07-02 — Full Audit

### Architecture Overview

Three parallel codebases with separate spec+plan files:
- `Source/` — Self-Judging Workflow Engine (workflow-engine.md spec, Plans/self-judging-workflow/)
- `portal/` — Dev-Workflow Platform app (dev-workflow-platform.md spec, Plans/dev-workflow-platform/)
- `platform/` — Orchestrator infrastructure (not source-auditable; pipeline agents must never touch it)

### Traceability Enforcer Behaviour

- Default run targets **most-recently-modified** `requirements.md` under `Plans/` — only one file at a time, 7+ others skipped silently
- Scans `Source/` and `E2E/` only — `platform/` (which holds FR-TMP-* impls) is never scanned
- Regex `FR-[A-Z0-9-]+` picks up false positives from seed-data IDs and spec range references in plain text (e.g. "FR-0002", "FR-070", "FR-085")
- When enforcer says PASS, it only means the targeted plan file passes — cross-plan coverage is unverified

### Useful File Paths

| Purpose | Path |
|---------|------|
| Source/ backend metrics | `Source/Backend/src/metrics.ts` |
| Portal/ backend metrics | `portal/Backend/src/metrics.ts` |
| Platform orchestrator | `platform/orchestrator/lib/workflow-engine.js`, `dispatch.js`, `config.js` |
| Portal shared types | `portal/Shared/types.ts`, `portal/Shared/api.ts` |
| Portal database | `portal/Backend/src/database/schema.ts` (no seed.ts) |
| Plans with requirements.md | Plans/dependency-linking/, Plans/self-judging-workflow/, Plans/dev-workflow-platform/, etc. |

### Known Open Items (as of 2026-07-02)

| ID | Status | Details |
|----|--------|---------|
| `dependencyCheckDuration` histogram | OPEN | Missing from `Source/Backend/src/metrics.ts`; present in portal/ |
| `FR-dependency-api-types` (portal/) | OPEN | `UpdateBugInput`/`UpdateFeatureRequestInput` in portal/Shared/api.ts lack `blocked_by?: string[]` |
| `FR-dependency-seed` (portal/) | OPEN | No `seed.ts` in `portal/Backend/src/database/` |
| `FR-dependency-frontend-tests` (portal/) | OPEN | `DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing in portal/Frontend/tests/ |
| `FR-TMP-008` verifies comment | OPEN | Worker container prerequisites have no `// Verifies: FR-TMP-008` comment in platform/ |

### Pattern Notes

- `workflow-engine.md` spec has no numbered FR-XXX IDs — FR-WF-* only exist in Plans/self-judging-workflow/requirements.md
- `Specifications/tiered-merge-pipeline.md` FR-TMP-* have no corresponding requirements.md in Plans/tiered-merge-pipeline/
- All backend Source/ and portal/ files have Verifies comments — very good traceability discipline
- No `console.log` in production Source/ code; no hardcoded secrets; no empty catch blocks
- 2 `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions: `useWorkItems.ts:63`, `DependencyPicker.tsx:82`
- `DebugPortalPage.tsx` uses informal Verifies comment (not a canonical FR-XXX ID)
