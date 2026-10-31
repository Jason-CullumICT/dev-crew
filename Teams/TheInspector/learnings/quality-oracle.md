# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-10-31 (first full audit)

### Spec Coverage Trend

| Plan | Coverage | Trend |
|------|----------|-------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 100% | baseline |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 94% (15/16) | baseline |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | N/A — targets `portal/`, not `Source/` | — |

### Key Architecture Facts

- **Two separate products** share this repo:
  - `Source/` — Self-Judging Workflow Engine (FR-WF-* naming, Plans-based specs)
  - `portal/` — Dev-Workflow Platform (FR-001–069 naming, Specifications/ docs)
- The **inspector config** (`inspector.config.yml`) is misconfigured: `specs.dir: Specifications/` maps to the portal product but `source.dirs: [Source/]` is the workflow engine.
- **Traceability enforcer** reads from `Plans/*/requirements.md`, NOT `Specifications/`. Spec-dir mismatch doesn't affect enforcer output, but confuses the inspector's drift analysis.

### FR Naming Schemes

| Product | FR ID pattern | Location |
|---------|---------------|----------|
| Workflow Engine | `FR-WF-\d+` | `Plans/self-judging-workflow/requirements.md` |
| Dependency Feature | `FR-dependency-[a-z-]+` | `Plans/dependency-linking/requirements.md` |
| Portal Platform | `FR-\d+` (001–069) | `Specifications/dev-workflow-platform.md` |

Inspector config pattern `FR-\\d+` only matches the portal scheme. Fix to `FR-[A-Z][A-Z0-9-]+` to capture all three.

### Open P1/P2 Findings (for re-verification next run)

| ID | Severity | Finding | File |
|----|----------|---------|------|
| QO-001 | P1 | Inspector config `specs.dir` maps to wrong application | `Teams/TheInspector/inspector.config.yml:33` |
| QO-002 | P2 | Route handlers import store directly (bypass service layer) | `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4` |
| QO-003 | P2 | `FR-dependency-seed` not implemented — no seed file, no Verifies comment | `Source/Backend/src/store/` (missing) |
| QO-004 | P2 | `dependencyCheckDuration` histogram missing from metrics.ts | `Source/Backend/src/metrics.ts` |

### Common Pattern Violations Found

- **Direct store access in routes** (3 route files) — not a service-layer pattern
- **Logger always JSON** — no NODE_ENV check for pretty-printing in development
- **eslint-disable-next-line** in 2 frontend hooks (exhaustive-deps suppression)

### Useful File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Backend routes (architecture audit) | `Source/Backend/src/routes/` |
| Metrics (FR-dependency-metrics check) | `Source/Backend/src/metrics.ts` |
| Logger (observability check) | `Source/Backend/src/utils/logger.ts` |
| Active plan requirements | `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Frontend hooks (pattern violations) | `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82` |
