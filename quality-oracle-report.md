---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec | FR Count | Verified | Coverage |
|------|----------|----------|----------|
| `workflow-engine.md` → `Source/` (enforcer scope) | 13 FR-WF-* | 13/13 | **100%** |
| `tiered-merge-pipeline.md` → `platform/` | 10 FR-TMP-* | 9/10 | **90%** |
| Dependency linking → `Source/` + `portal/` | 16 FR-dependency-* | ~12/16 | **~75%** |
| `dev-workflow-platform.md` → `portal/` | 69+ FR-* | **Cannot measure** | ❌ Blind spot |

**Enforcer gate passes on self-judging-workflow (its sole target). Three P2s and four P3s open.**

---

### QO-001 — BlockedBadge missing `pending_dependencies` amber state
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Frontend/src/components/BlockedBadge.tsx`
- **Detail:** `FR-dependency-blocked-badge` specifies **two** badge states: a red "Blocked" badge (`hasUnresolvedBlockers=true`) and an **amber "Pending Dependencies" badge** for `status='pending_dependencies'`. The implementation only accepts `hasUnresolvedBlockers: boolean` — the `status` prop does not exist at all. The amber state is entirely absent. Tests (`BlockedBadge.test.tsx`) confirm: only 3 cases tested (false, undefined, true-red), zero amber-badge test.
- **Recommendation:** Add `status?: string` prop; render amber badge with text "Pending Dependencies" when `status === 'pending_dependencies'`; add corresponding test.
- **Cross-ref:** TheFixer (frontend-coder). [ESCALATE → TheFixer]

---

### QO-002 — `dependencyCheckDuration` histogram missing from metrics
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` requires **4 Prometheus metrics**: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `dependencyCheckDuration` histogram ❌, `cycleDetectionEvents` counter ✅. The histogram is absent — only 3 of 4 metrics are implemented. The metrics test file (`metrics.test.ts`) does not test for `dependency_check_duration` either, so the gap has no test guard. Architecture rule: "New routes must have observability" — dependency check operations should record duration.
- **Recommendation:** Add a `Histogram` named `dependency_check_duration_seconds` to `metrics.ts` and record it around the `hasUnresolvedBlockers()` call in the dependency service. Add a test case in `metrics.test.ts`.
- **Cross-ref:** TheFixer (backend-coder). [ESCALATE → TheFixer]

---

### QO-003 — `FR-dependency-api-types` open in portal — `as any` cast in DependencyPicker
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Shared/api.ts` lines 32–38, 59–67; `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291, 293
- **Detail:** `FR-dependency-api-types` requires `blocked_by?: string[]` on both `UpdateBugInput` and `UpdateFeatureRequestInput`. Both interfaces exist in `portal/Shared/api.ts` but neither has the `blocked_by` field. The portal's `DependencyPicker.tsx` works around this with two `as any` casts (`await bugs.update(itemId, { blocked_by: blockerIds } as any)` and similar for feature requests). This was flagged as ❌ Missing in the plan's own implementation delta table and has not been resolved.
- **Recommendation:** Add `blocked_by?: string[]` to both interfaces; remove the `as any` casts; confirm TypeScript compiles cleanly.
- **Cross-ref:** TheFixer (api-contract). [ESCALATE → TheFixer]

---

### QO-004 — Traceability enforcer has a multi-application blind spot
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer only scans `Source/` and `E2E/` — but this repo contains **three distinct applications**: `Source/` (workflow engine), `portal/` (dev-workflow-platform), and `platform/` (orchestrator/tiered-merge). 69+ FR-* requirements from `dev-workflow-platform.md` are implemented in `portal/` and are completely invisible to the enforcer. 10 FR-TMP-* requirements live in `platform/` and are also unscannable. The auto-detection picks the most-recently-modified `requirements.md` from `Plans/` — with all files sharing the same mtime, selection is arbitrary. Running `python3 tools/traceability-enforcer.py` as the architecture prescribes only verifies 13 of ~108 total requirements (~12%).
- **Recommendation:** Either (a) add `portal/` and `platform/` to `source_dirs` in `inspector.config.yml` and teach the enforcer to read that config, or (b) introduce a wrapper that runs the enforcer once per plan with `--file`. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) should explicitly specify `--file` for the active plan.
- **Cross-ref:** [ESCALATE → TheFixer (tooling)]

---

### QO-005 — Duplicate test files inflating test suite
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (237 lines)
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (254 lines)
- **Detail:** Both `WorkItemListPage` and `WorkItemDetailPage` have test files in two locations. Both sets carry `// Verifies: FR-WF-010` and `FR-WF-011` comments. Vitest will run all four files, counting coverage twice and masking any test divergence. The `tests/pages/` versions appear to be the canonical set (authored in the spec-driven pipeline run); the top-level `tests/` copies appear to be earlier iterations. They are not identical — the older copies cover different edge cases, so naively deleting one set may drop coverage.
- **Recommendation:** Merge the unique test cases from the older top-level files into the `tests/pages/` canonical files; delete the top-level duplicates. Confirm test count is stable.
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-006 — `FR-TMP-008` has zero traceability markers
- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker`
- **Detail:** `FR-TMP-008` specifies that the worker container must have `gh` CLI, Playwright, and `GITHUB_TOKEN` forwarded. `platform/Dockerfile.worker` clearly implements all three (lines 31–40 install `gh`, lines 35–40 install Playwright + Chromium). But the file contains **zero** `# Verifies: FR-TMP-008` comments. Architecture rule: "Every FR needs a test with `// Verifies: FR-XXX` traceability comments." Dockerfiles are not TypeScript, but the convention must extend to infrastructure files.
- **Recommendation:** Add `# Verifies: FR-TMP-008` comment at the `gh` and Playwright install blocks.
- **Cross-ref:** solo-session (platform owner)

---

### QO-007 — Enforcer regex captures seed data item IDs as false requirements
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py` line 63; `Plans/dependency-linking/requirements.md`
- **Detail:** The enforcer extracts IDs matching `FR-[A-Z0-9-]+`. `Plans/dependency-linking/requirements.md` contains references to feature-request seed items (`FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`) as *data* in the seed-data description, and references to spec range markers (`FR-070`, `FR-085`). All of these are captured as if they were requirement IDs. Running the enforcer against this plan finds 7 "missing" requirements, all of which are data references — not actual spec FRs. This pollutes the output and makes the enforcer unreliable for the dependency-linking plan.
- **Recommendation:** Add a convention: actual requirement IDs in plans must be in a structured table; seed data references must be code-fenced or distinguished. Alternatively, the enforcer could look only at table rows matching `| FR-...` rather than free text.
- **Cross-ref:** TheFixer (tooling)

---

### QO-008 — `FR-dependency-seed` has no implementation in portal/
- **Severity:** P3
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (missing `seed.ts`)
- **Detail:** `FR-dependency-seed` requires an idempotent `seed.ts` in `portal/Backend/src/database/` that pre-populates 8 specific dependency relationships (BUG-0010 blocked by BUG-0003/4/5/6/7; FR-0004 blocked by FR-0003; FR-0005 blocked by FR-0002; FR-0007 blocked by FR-0003). The `portal/Backend/src/database/` directory contains only `schema.ts` and `connection.ts`. No `seed.ts` exists. The plan's implementation delta table listed this as partially done but the file is absent.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts`, call it on server startup after schema migration, with idempotency guards (check existence before insert). Add `// Verifies: FR-dependency-seed` and confirm the test for it in `portal/Backend/tests/dependencies.test.ts`.
- **Cross-ref:** TheFixer (backend-coder, portal module). [ESCALATE → TheFixer]

---

### QO-009 — `DebugPortalPage.tsx` uses informal traceability reference
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** Uses `// Verifies: dev-crew debug portal — embedded container-test viewer` — not an FR-* identifier. Architecture rule requires `// Verifies: FR-XXX` format. This file was recently modified (in scope as unlinked implementation).
- **Recommendation:** Either assign it to an existing FR (e.g., FR-WF-011 or a new FR if the debug portal has no formal requirement) or add the debug portal to a spec. If it's intentionally out-of-spec scope, add a comment explaining why no FR applies.

---

### QO-010 — `eslint-disable-next-line` without rationale
- **Severity:** P4
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without an explanatory comment. Architecture rule: "Never swallow errors silently" — the same principle applies to suppressed lint warnings; suppression without documentation means reviewers cannot distinguish intentional from accidental.
- **Recommendation:** Add a brief comment on each `eslint-disable-next-line` line explaining the intentional omission from deps (e.g., `// intentionally omit to avoid re-fetching on every render`).

---

### QO-011 — Silent JSON parse catch in API client
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}))` — the error IS re-thrown on the next line via `throw new Error(...)`, so this is not a truly silent swallow. But the catch suppresses the JSON parse error without logging or documenting the intent. A reviewer cannot tell if this is intentional or a mistake.
- **Recommendation:** Add a comment: `// JSON parse may fail for non-JSON error bodies (e.g., 502 HTML pages) — fall back to empty object; the outer throw still propagates`

---

```json
{
  "grade": "B",
  "run_date": "2026-05-29",
  "enforcer_result": "PASSED (self-judging-workflow plan only)",
  "spec_coverage": {
    "workflow_engine_source": "100% (13/13)",
    "tiered_merge_pipeline_platform": "90% (9/10)",
    "dependency_linking_hybrid": "~75% (12-13/16)",
    "dev_workflow_platform_portal": "UNMEASURED (blind spot)"
  },
  "findings": {
    "P1": 0,
    "P2": 4,
    "P3": 4,
    "P4": 3
  },
  "findings_list": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift", "title": "BlockedBadge missing pending_dependencies amber state", "file": "Source/Frontend/src/components/BlockedBadge.tsx", "fr": "FR-dependency-blocked-badge"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from metrics", "file": "Source/Backend/src/metrics.ts", "fr": "FR-dependency-metrics"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-api-types open — as any cast in DependencyPicker", "file": "portal/Shared/api.ts", "fr": "FR-dependency-api-types"},
    {"id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "Traceability enforcer blind to portal/ and platform/", "file": "tools/traceability-enforcer.py", "fr": "N/A"},
    {"id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "Duplicate test files for WorkItemListPage and WorkItemDetailPage", "file": "Source/Frontend/tests/", "fr": "N/A"},
    {"id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-008 has zero traceability markers in Dockerfile.worker", "file": "platform/Dockerfile.worker", "fr": "FR-TMP-008"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "Enforcer regex captures seed data item IDs as false requirements", "file": "tools/traceability-enforcer.py", "fr": "N/A"},
    {"id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed: portal/Backend/src/database/seed.ts missing", "file": "portal/Backend/src/database/", "fr": "FR-dependency-seed"},
    {"id": "QO-009", "severity": "P4", "category": "pattern-violation", "title": "DebugPortalPage.tsx informal traceability reference", "file": "Source/Frontend/src/pages/DebugPortalPage.tsx:1", "fr": "N/A"},
    {"id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable-next-line without rationale", "file": "Source/Frontend/src/hooks/useWorkItems.ts:63", "fr": "N/A"},
    {"id": "QO-011", "severity": "P4", "category": "pattern-violation", "title": "Silent JSON parse catch in API client lacks explanatory comment", "file": "Source/Frontend/src/api/client.ts:26", "fr": "N/A"}
  ],
  "positives": [
    "Source/ has zero console.log in production code",
    "No hardcoded secrets or credentials found",
    "No direct DB calls from route handlers (in-memory store pattern respected)",
    "No empty catch blocks in Source/ backend",
    "438 total Verifies comments — very dense traceability culture",
    "FR-WF-001 through FR-WF-013 all 100% traced with strong per-function granularity",
    "All recently modified frontend source files have Verifies comments",
    "No test.skip or test.todo found in test suite",
    "No files over 500 lines in Source/"
  ],
  "escalations": [
    {"finding": "QO-001", "team": "TheFixer", "role": "frontend-coder"},
    {"finding": "QO-002", "team": "TheFixer", "role": "backend-coder"},
    {"finding": "QO-003", "team": "TheFixer", "role": "api-contract"},
    {"finding": "QO-004", "team": "TheFixer", "role": "tooling"},
    {"finding": "QO-008", "team": "TheFixer", "role": "backend-coder (portal)"}
  ]
}
```
