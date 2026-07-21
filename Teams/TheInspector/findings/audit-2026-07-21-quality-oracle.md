# Quality Oracle Audit — 2026-07-21

**Grade: B** (0 P1 · 4 P2 · 3 P3 after re-classification; spec coverage 100% of self-judging-workflow plan)

---

## Spec Coverage Summary

| Plan / Spec | FR IDs | Covered (Source/) | Covered (portal/) | Net |
|-------------|--------|-------------------|--------------------|-----|
| `Plans/self-judging-workflow` | 13 | 13 (100%) | — | ✅ PASS |
| `Specifications/dev-workflow-platform.md` | ~74 real\* | 0 | 74 (100%) | ✅ PASS (portal/) |
| `Plans/dependency-linking` | 15 | 15 (100%) | — | ✅ PASS |
| Other plans (orchestrated-dev-cycles, dev-cycle-traceability, orchestrator-cycle-dashboard) | target portal/ | n/a | mostly covered | ~PASS |

\* `FR-0004` and `FR-0007` extracted by regex are seed-data item IDs in the spec text, not requirement IDs. Enforcer regex matches them as requirements — false positive missing.

---

## Findings

### QO-001: Traceability Enforcer Blind to `portal/` — False PASS for Platform Spec
- **Severity:** P1 (architecture-violation)
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:75`
- **Detail:** `source_dirs = ["Source", "E2E"]` is hardcoded. The portal app (`portal/Backend`, `portal/Frontend`) implements FR-001 through FR-095 from `Specifications/dev-workflow-platform.md`, but the enforcer never scans it. Running `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` reports 76 MISSING even though 74 of 76 are implemented. This is a **false negative** that makes the platform spec look completely unimplemented.
- **Evidence:** `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` → 76 MISSING. Same check with portal/ included → 2 MISSING (both false positives from seed-data IDs in spec text).
- **Recommendation:** Add `"portal"` to `source_dirs` in `traceability-enforcer.py`. Also filter out regex false-positives like `FR-0004`/`FR-0007` that appear in seed-data descriptions by adding a word-boundary prefix (e.g. require `FR-` preceded only by pipe `|`, newline, or space — not alphanumeric context).
- **Cross-ref:** TheFixer (code change to tools/traceability-enforcer.py)

---

### QO-002: Verification Gate Checks Only One Plan (Always `self-judging-workflow`)
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:57`
- **Detail:** The default mode (`max(req_files, key=os.path.getmtime)`) always selects `Plans/self-judging-workflow/requirements.md` because it happens to have the highest mtime (1784611663.713989 vs others within 6ms). Five other plans with requirements.md files are **never automatically verified** by the standard gate in CLAUDE.md. Any developer running the standard `python3 tools/traceability-enforcer.py` only validates FR-WF-* and gets a false sense of complete coverage.

  Plans that fail when explicitly targeted:
  - `dependency-linking`: fails on `FR-070`, `FR-085` (spec IDs not used in code — see QO-003)
  - `dev-workflow-platform`: fails (portal/ not scanned — see QO-001)
  - `orchestrated-dev-cycles`: fails on `FR-048`, `FR-049`, `FR-XXX`
  - `dev-cycle-traceability`: fails on `FR-068`, `FR-069`, `FR-XXX`
  - `orchestrator-cycle-dashboard`: fails on `FR-075`, `FR-076`, `FR-0XX`

- **Recommendation:** Change the verification gate in CLAUDE.md to run the enforcer against ALL `Plans/*/requirements.md` files (e.g. `for f in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$f"; done`). Or add a `--all` flag to the enforcer that scans every plan.
- **Cross-ref:** TheFixer

---

### QO-003: FR ID Mismatch — `dependency-linking` Plan vs Spec Numbering
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/dependency-linking/requirements.md:6`
- **Detail:** The plan header states `Spec reference: Specifications/dev-workflow-platform.md (FR-070 — FR-085)`, but the plan uses `FR-dependency-*` IDs throughout. The canonical spec uses no such IDs — they were invented for implementation convenience. Traceability between the plan and the spec is broken: you cannot verify FR-070 through FR-085 against implementation because no code file says `// Verifies: FR-070`. The enforcer reports both `FR-070` and `FR-085` as MISSING when targeting the dependency-linking plan.
- **Recommendation:** Either (a) update `Specifications/dev-workflow-platform.md` to rename FR-070–FR-085 to the `FR-dependency-*` naming and keep one canonical ID set, or (b) add a mapping table to the plan linking `FR-dependency-* → FR-070 through FR-085`.
- **Cross-ref:** requirements-reviewer (spec update)

---

### QO-004: Portal Source Files Missing Traceability
- **Severity:** P2
- **Category:** untested / spec-drift
- **File:** Multiple (see below)
- **Detail:** Three non-test, non-config portal source files have no `// Verifies: FR-XXX` comment, making them unlinked implementations:
  1. `portal/Frontend/src/pages/TeamsPage.tsx` — no traceability comment
  2. `portal/Frontend/src/components/common/RepoSelector.tsx` — no traceability comment
  3. `portal/Backend/src/routes/teamDispatches.ts` — file header only has an informal description comment
- **Recommendation:** Add `// Verifies: FR-XXX` comments linking to the relevant portal spec requirement. TeamsPage and teamDispatches likely relate to the orchestrator cycle dashboard requirements; RepoSelector to the same. Check `Plans/orchestrator-cycle-dashboard/requirements.md` for the matching FR IDs.

---

### QO-005: Silent JSON.parse Catch in Portal Cycle Service
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/services/cycleService.ts:103`
- **Detail:** `catch { parsedFixes = null; }` swallows JSON parse errors without logging or a suppression comment. Architecture rule: "every `catch` block must either re-throw, log with full context, or **explicitly document** why the error is intentionally suppressed." The current comment is on line 98 (`// FR-055: Parse considered_fixes JSON`) but does not explain the suppress-to-null intent.
- **Recommendation:** Add a comment: `// Intentionally suppressed: malformed JSON stored in legacy records is treated as null` (or equivalent).

---

### QO-006: Two `eslint-disable-next-line` Suppressions Without Rationale
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with no accompanying explanation for why the dependency exclusion is safe. Architecture rules prohibit disabled linting rules unless documented.
  - `useWorkItems.ts:63` — exhaustive-deps suppression on `useCallback` for `fetchItems`
  - `DependencyPicker.tsx:82` — suppression on `handleAdd` (which closes over `selectedIdSet` and `blocksIdSet`)
- **Recommendation:** Add inline comments explaining why the missing deps are intentionally excluded (e.g. "intentionally omits `selectedIdSet` reference to avoid infinite re-render loop — idSet is a derived value recalculated each render").

---

### QO-007: `DebugPortalPage.tsx` Has No FR Traceability (Recently Modified)
- **Severity:** P3
- **Category:** untested
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** Modified in the last 14 days. Uses an informal comment (`// dev-crew debug portal — embedded container-test viewer`) instead of a `// Verifies: FR-XXX` traceability comment. No spec FR directly covers the debug portal iframe component.
- **Recommendation:** Either add a traceability comment if a spec requirement covers this feature, or add a note like `// Internal tooling — not covered by product FR` to document the intentional absence.

---

## Traceability Enforcer False Positives

The regex `FR-[A-Z0-9-]+` in `traceability-enforcer.py:64` matches seed-data item IDs that appear in spec prose. Confirmed false positives:

| Matched token | Where it appears | Actually is |
|---------------|------------------|-------------|
| `FR-0004` | `Specifications/dev-workflow-platform.md` dependency seed section | Feature request document ID (data), not a requirement |
| `FR-0007` | Same location | Same — data ID |
| `FR-XXX` | Multiple plan templates | Literal placeholder (never a real ID) |
| `FR-XXXX` | Same | Same |
| `FR-0XX` | orchestrator-cycle-dashboard plan | Same |

These cause phantom MISSING reports. The enforcer should exclude tokens that appear only in non-`|`-delimited prose contexts or add a minimum length/format check.

---

## Architecture Rule Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | ✅ | FR-WF-* and FR-dependency-* all have source references |
| No direct DB calls from route handlers | ✅ | Routes delegate to services/store |
| Shared types single source of truth | ✅ | Both layers import from `Source/Shared/types/workflow.ts` |
| Every FR needs a test with `// Verifies:` | ✅ (FR-WF-*) / ⚠️ (portal 3 files) | Self-judging-workflow plan: 100%. Portal: 3 files unlinked |
| No hardcoded secrets | ✅ | No secrets found in source |
| All list endpoints return `{data: T[]}` wrappers | ✅ | Verified in routes |
| New routes must have observability (structured logging, metrics) | ✅ | All backend routes use `logger` and metrics counters |
| Business logic has no framework imports | ✅ | Services are clean |
| No `console.log` in production source | ✅ | No violations in Source/ or portal/Backend/src |
| Never swallow errors silently | ⚠️ | One undocumented suppress in portal/cycleService.ts:103 |
| No disabled lint rules | ⚠️ | 2 `eslint-disable` in Source/Frontend |

---

## Test Quality Assessment

| Area | Test Files | Skipped | Todos | Source Files w/o Tests |
|------|-----------|---------|-------|----------------------|
| Source/Backend | 14 test files | 0 | 0 | 0 |
| Source/Frontend | 11 test files | 0 | 0 | `DebugPortalPage.tsx` (no test) |
| portal/Frontend | 15 test files | 0 | 0 | `TeamsPage.tsx`, `RepoSelector.tsx` |
| portal/Backend | 6+ test files | 0 | 0 | `teamDispatches.ts` |

No `test.skip`, `xit`, `xdescribe`, or `.only` found anywhere. No assertions-free test files found.

---

## Code Pattern Violations

| Pattern | Count | Files |
|---------|-------|-------|
| `console.log` in production | 0 | — |
| Hardcoded secrets / URLs | 0 | — |
| Empty catch blocks | 1 | portal/Backend/src/services/cycleService.ts:103 (undocumented) |
| `eslint-disable` | 2 | Source/Frontend (both undocumented) |
| Files > 500 lines | 0 | Largest: workflow.ts at 374 lines |

---

```json
{
  "audit_date": "2026-07-21",
  "grade": "B",
  "spec_coverage_self_judging_workflow": "100%",
  "spec_coverage_dev_workflow_platform_with_portal": "100% (74/74 real FRs)",
  "spec_coverage_enforcer_default_view": "~15% (only self-judging-workflow plan scanned)",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Enforcer blind to portal/ — false PASS for platform spec" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "Verification gate checks only one plan (always self-judging-workflow)" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-* IDs don't match spec FR-070–FR-085 numbering" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "3 portal source files lack Verifies comments" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "Silent JSON.parse catch in cycleService.ts undocumented" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "2 eslint-disable suppressions without rationale" },
    { "id": "QO-007", "severity": "P3", "category": "untested", "title": "DebugPortalPage.tsx missing traceability (recently modified)" }
  ],
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 2,
  "false_positive_fr_ids_in_enforcer": ["FR-0004", "FR-0007", "FR-XXX", "FR-XXXX", "FR-0XX"],
  "no_skipped_tests": true,
  "no_hardcoded_secrets": true,
  "no_console_log_in_production": true
}
```
