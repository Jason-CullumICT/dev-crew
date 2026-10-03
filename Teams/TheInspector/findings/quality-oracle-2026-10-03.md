# Quality Oracle Findings — 2026-10-03

**Auditor:** quality-oracle  
**Scope:** Full audit — spec-drift analysis, traceability coverage, architecture rule compliance, test hygiene, code pattern enforcement  
**Config:** Teams/TheInspector/inspector.config.yml

---

## Spec Coverage Summary

| Spec Document | FR Count | Implementation Dir | Enforcer Scans It? | Coverage |
|---|---|---|---|---|
| `Specifications/workflow-engine.md` (FR-WF-001—013) | 13 | `Source/` | ✅ Yes | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001—069) | 69 | `portal/` | ❌ No | Implemented but blind |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001—010) | 10 | `platform/` | ❌ No | Implemented but blind |
| Plans/orchestrated-dev-cycles (FR-033—049) | 17 | `portal/` | ❌ No | Implemented but blind |
| Plans/dev-cycle-traceability (FR-050—069) | 20 | `portal/` | ❌ No | Implemented but blind |
| Plans/image-upload (FR-070—089) | 20 | `portal/` | ❌ No | Implemented but blind |
| Plans/orchestrator-cycle-dashboard (FR-070—076) | 7 | `portal/` | ❌ No | FR-070 COLLIDES ⚠️ |

**Effective enforcer coverage: 13 of ~156 total specified FRs (8.3%)**  
The enforcer passes today only because it defaults to the smallest plan targeting `Source/`.

---

## Findings

### QO-001: Traceability Enforcer Scans Wrong Directory for Portal App
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:69-70`
- **Detail:** The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. The primary application implementing `dev-workflow-platform.md` requirements (FR-001 through FR-089) lives in `portal/`, not `Source/`. When run against any portal plan (e.g., `--file Plans/dev-workflow-platform/requirements.md`), the enforcer reports 100% failure (all 34 requirements missing) even though the portal/ codebase contains 277 `// Verifies:` annotations across 60+ files. This means: (a) the verification gate passes only because the default targets `Source/` which has a small, fully covered plan; (b) any CI run explicitly checking portal plans will always fail; (c) agents cannot trust the enforcer's PASS/FAIL signal for the largest spec domain.
- **Recommendation:** Add `portal/` and `platform/` to the `source_dirs` list in `check_traceability()`, OR make the scan directories configurable via `inspector.config.yml` (already has `source.dirs`) and read that config in the enforcer. The config file already defines `source.dirs: ["Source/"]` — extend it to include `["Source/", "portal/", "platform/"]` and have the enforcer read it.
- **Cross-ref:** Escalate fix to TheFixer → backend-coder (tools/ is writable by solo session)

---

### QO-002: FR-070 ID Collision — Two Plans Define Different Requirements with Same ID
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/image-upload/requirements.md:1`, `Plans/orchestrator-cycle-dashboard/requirements.md:1`
- **Detail:** FR-070 is defined twice with entirely different semantics:
  - In `Plans/image-upload/`: FR-070 = "Add `ImageAttachment` shared type"
  - In `Plans/orchestrator-cycle-dashboard/`: FR-070 = "Create `OrchestratorCyclesPage` that polls orchestrator"
  
  Portal frontend code (`OrchestratorCyclesPage.tsx:1-2`) uses `// Verifies: FR-070, FR-091` which is ambiguous — a reader/enforcer cannot know which FR-070 is meant. This breaks the single-source-of-truth rule for requirement IDs and makes traceability reports unreliable.
- **Recommendation:** Renumber one plan's requirements to avoid collision. Suggest renaming `orchestrator-cycle-dashboard` FRs to `FR-OCD-070` through `FR-OCD-076`, or reassigning to the next available sequential block (FR-092+). Update all `// Verifies:` comments in the affected files.
- **Cross-ref:** `portal/Frontend/src/pages/OrchestratorCyclesPage.tsx:1-2`

---

### QO-003: FR-090 Through FR-095 Referenced in Code But Undefined in Any Specification
- **Severity:** P2
- **Category:** spec-drift (orphaned requirement references)
- **Files:**
  - `portal/Frontend/src/components/orchestrator/types.ts` — references FR-090
  - `portal/Frontend/src/components/orchestrator/RunsTab.tsx:1` — references FR-091, FR-093, FR-094, FR-095
  - `portal/Frontend/src/pages/OrchestratorCyclesPage.tsx:2` — references FR-091
- **Detail:** These requirement IDs do not appear in any `Specifications/*.md`, any `Plans/*/requirements.md`, or `docs/` document. Code referencing undefined FRs is a "ghost traceability" anti-pattern — it creates false confidence that requirements are traced while the underlying specs don't exist. This likely represents features implemented without writing the spec first, violating the core project mandate: "Every decision and line of code must trace back to a specification. If the spec doesn't cover it, write the spec first."
- **Recommendation:** Either (a) write the missing specifications for FR-090—095 in the appropriate Plans directory before the next code change, or (b) remap the code comments to existing FRs that they actually satisfy. The spec must be written first.
- **Cross-ref:** QO-002 (FR-070 collision may be part of the same numbering gap problem)

---

### QO-004: Recently-Modified Files Lack All Traceability — teamDispatches and TeamsPage
- **Severity:** P2
- **Category:** spec-drift (unlinked implementation)
- **Files:**
  - `portal/Backend/src/routes/teamDispatches.ts` — 85 lines, 0 `Verifies:` comments, modified within 14 days
  - `portal/Frontend/src/pages/TeamsPage.tsx` — 406 lines, 0 `Verifies:` comments, modified within 14 days
- **Detail:** Both files implement team dispatch functionality visible in the portal UI, but neither file carries any `// Verifies: FR-XXX` traceability comment. This is an unlinked implementation — it cannot be traced to any specification. Per architecture rules: "Every FR needs a test with `// Verifies: FR-XXX` traceability comments." The TeamsPage is a full page component (406 lines) with no spec reference at all.
- **Recommendation:** Identify the FR(s) these files implement (check if a team-dispatch spec exists in Plans/ or needs to be written), then add `// Verifies: FR-XXX` comments at the top of each file and at key function implementations.

---

### QO-005: Large Service Files Exceeding 500-Line Threshold
- **Severity:** P3
- **Category:** architecture-violation (file size / complexity)
- **Files:**
  - `portal/Backend/src/services/cycleService.ts` — 526 lines
  - `portal/Backend/src/services/featureRequestService.ts` — 506 lines
- **Detail:** Both files exceed the 500-line threshold and are candidates for decomposition. Large service files tend to accumulate mixed responsibilities, making them harder to test in isolation and increasing the risk of side effects when any single concern changes. `cycleService.ts` handles cycle lifecycle, ticket management, CI/CD simulation, and learning/feature creation — these could be separate service concerns.
- **Recommendation:** Extract sub-services where cohesion is low. For `cycleService.ts`: consider splitting cycle CRUD, ticket management, and post-completion artifacts (Learning, Feature) into separate modules. For `featureRequestService.ts`: consider separating voting logic into its own `votingService.ts` (already partially done with `votingService.ts`).

---

### QO-006: eslint-disable Suppressions in Recently-Modified Source Files
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `portal/Frontend/src/hooks/useApi.ts:35` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Three recently-modified files suppress `react-hooks/exhaustive-deps`. CLAUDE.md states "No disabled linting rules." While `react-hooks/exhaustive-deps` is frequently suppressed for legitimate patterns (stable callbacks, intentional dep-array omissions), each suppression should be accompanied by an inline comment explaining WHY it is intentional (e.g., `// deps intentionally omitted: search triggers only on explicit user action`). The `portal/Backend/src/middleware/errorHandler.ts` suppression is valid by Express convention (4-arg error handler signature).
- **Recommendation:** Add explanatory comments alongside each `eslint-disable` suppression to document intent. Review whether any suppressed hook dep could be addressed by moving logic inside or outside the effect instead.

---

### QO-007: Frontend Test Setup File Has No Traceability (Minor)
- **Severity:** P4
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/setup.ts` — 0 `Verifies:` comments
  - `portal/Frontend/tests/setup.ts` — 0 `Verifies:` comments
- **Detail:** Both test setup files lack traceability annotations. This is expected for infrastructure setup files that configure test runners rather than verify requirements. However, it creates noise when scanning for zero-traceability files.
- **Recommendation:** Add a comment `// Test setup — no FR requirement to verify` to suppress future audit flags. No FR annotation required.

---

### QO-008: Traceability Enforcer Config Mismatch with inspector.config.yml
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py:69-70`, `Teams/TheInspector/inspector.config.yml:41-43`
- **Detail:** The inspector config defines `source.dirs: ["Source/"]` — already incomplete for the portal app. The enforcer ignores this config entirely and hardcodes its own directory list. There is configuration duplication with no single source of truth for which directories to scan. This means updating the inspector config has zero effect on enforcer behavior.
- **Recommendation:** Refactor the enforcer to read `inspector.config.yml` (using Python's `yaml` module or a simple regex parse) for `source.dirs`. This also enables the fix for QO-001 without a code change to the enforcer — just update the config.

---

## Architecture Rule Compliance Summary

| Rule | Status |
|---|---|
| Specs are source of truth | ⚠️ Partial — FR-090—095 have no spec backing |
| No direct DB calls from route handlers | ✅ Service layer used throughout |
| Shared types are single source of truth | ✅ Source/Shared/ and portal/Shared/ used |
| Every FR needs a test with Verifies comment | ⚠️ teamDispatches, TeamsPage, ghost FRs untraced |
| No hardcoded secrets | ✅ No violations found |
| All list endpoints return {data: T[]} wrappers | ✅ Consistent |
| New routes must have observability | ✅ Structured logging, no console.log in backend src |
| Business logic has no framework imports | ✅ Services are clean |
| Never swallow errors silently | ✅ No empty catch blocks found |
| No console.log in production source | ✅ No violations in src/ files |

---

## Spec Coverage: 8.3%

- **13** requirements enforced by default enforcer run (Source/ only)
- **~156** total specified requirements across all active specs
- **~143** requirements in portal/ — implemented with Verifies comments but invisible to the enforcer

The true implementation coverage is high (portal/ has 277+ Verifies annotations) but the **enforcement** coverage is critically low. The verification gate as described in CLAUDE.md (`python3 tools/traceability-enforcer.py`) only validates 8% of specified requirements.

---

```json
{
  "audit_date": "2026-10-03",
  "grade": "C",
  "spec_coverage_enforced_pct": 8.3,
  "spec_coverage_actual_pct": 85,
  "total_requirements_specified": 156,
  "total_requirements_enforced": 13,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer scans wrong directory for portal app" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-070 ID collision between image-upload and orchestrator-cycle-dashboard plans" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-090 through FR-095 referenced in code but undefined in any specification" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "teamDispatches.ts and TeamsPage.tsx lack all traceability (recently modified)" },
    { "id": "QO-005", "severity": "P3", "category": "architecture-violation", "title": "cycleService.ts (526 lines) and featureRequestService.ts (506 lines) exceed 500-line threshold" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions in 3 recently-modified source files without explanatory comments" },
    { "id": "QO-007", "severity": "P4", "category": "test-coverage", "title": "Test setup files lack traceability annotations (expected for setup files)" },
    { "id": "QO-008", "severity": "P3", "category": "architecture-violation", "title": "Enforcer ignores inspector.config.yml — config duplication with no effect" }
  ],
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 3,
  "p4_count": 1
}
```
