# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Log

### 2026-11-22 — Full Audit (Grade: C)

**Spec Coverage Trend:** First audit — baseline established. 14% enforcement coverage (13/~90 FRs).

**Architecture Map (critical for future audits):**

| App | Directory | Spec | FR IDs Used |
|-----|-----------|------|-------------|
| Workflow Engine | `Source/` | `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/` | FR-WF-001..013, FR-dependency-* |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | FR-001..069, FR-dependency-* |
| Merge Pipeline | `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001..010 |

**Traceability Enforcer Behaviour:**
- Run with no args → auto-selects most-recently-modified `Plans/*/requirements.md` → currently `Plans/self-judging-workflow/requirements.md`
- Does NOT scan `Specifications/` at all — formal specs are unenforced
- Regex `FR-[A-Z0-9-]+` over-matches: picks up seed data IDs (FR-0002, etc.) and prose range refs (FR-070) causing false failures when pointed at `Plans/dependency-linking/requirements.md`
- Run with `--file Plans/dependency-linking/requirements.md` to check dependency plan separately

**Open Plan Items (as of this audit):**
- `FR-dependency-api-types`: `blocked_by?: string[]` missing from `portal/Shared/api.ts` UpdateFeatureRequestInput + UpdateBugInput
- `FR-dependency-seed`: `portal/Backend/src/database/seed.ts` does not exist
- `FR-dependency-frontend-tests`: `portal/Frontend/tests/DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist

**Key File Paths for Faster Future Audits:**
- Traceability enforcer: `tools/traceability-enforcer.py`
- Portal metrics (complete): `portal/Backend/src/metrics.ts` — has all 4 FR-dependency-metrics
- Source metrics (incomplete): `Source/Backend/src/metrics.ts` — missing `dependencyCheckDuration` Histogram
- Portal API types: `portal/Shared/api.ts` — check for `blocked_by` field
- Duplicate logger: `Source/Backend/src/logger.ts` (shim) + `Source/Backend/src/utils/logger.ts` (real)
- Portal Frontend tests dir: `portal/Frontend/tests/` — check for DependencySection + BlockedBadge tests

**Common Pattern Violations Found:**
1. OTel never implemented in Source/ (zero `@opentelemetry` imports)
2. Logger always emits JSON regardless of NODE_ENV (no dev pretty-print)
3. `eslint-disable-next-line react-hooks/exhaustive-deps` in `Source/Frontend/src/hooks/useWorkItems.ts:82`

**Spec Drift Patterns:**
- Two parallel dependency implementations (Source/ and portal/) with diverging metric coverage
- Formal Specifications disconnected from traceability enforcement
- workflow-engine.md spec has zero FR IDs → cannot be enforced

## Learnings

1. **Always run enforcer against both plans**: `python3 tools/traceability-enforcer.py` (auto) AND `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` to cover the dependency plan.
2. **portal/ is a second app** — it has its own Backend/Frontend/Shared; treat it as separate from Source/.
3. **FR-dependency-* spans both apps**: the same FR IDs appear in both portal/ and Source/ with different implementations. This is intentional dual-implementation, not a copy-paste error.
4. **Specifications/*.md are aspirational docs** — they are not currently enforced. The Plans/*.md requirements files are what gets enforced.
5. **Grade rubric** (from inspector.config.yml): A ≤3 P2s; B ≤8 P2s; C ≤2 P1s+≤15 P2s; D = more P1s.
