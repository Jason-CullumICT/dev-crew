---

## Quality Oracle Findings

### Spec Coverage Summary

| Specification | FRs | Traced | Coverage | Enforcer Checks? |
|---|---|---|---|---|
| `workflow-engine.md` (FR-WF-001…013) | 13 | 13 | **100%** | ✅ Yes (default run) |
| `dev-workflow-platform.md` (FR-001…069 + FR-dependency-*) | 76 | 74 | **97.4%** | ❌ No — lives in `portal/` |
| `tiered-merge-pipeline.md` (FR-TMP-001…010) | 10 | 9 | **90%** | ❌ No — lives in `platform/` |
| **Effective gate coverage** | **99 total** | **96** | **~97%** actual | **12.7% gated** |

The gate *passes* every run while 86 of 99 FRs are outside its scan scope. This is the most serious finding.

---

### QO-001 — Traceability Enforcer Blindspot
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py` (scan dirs, line ~65: `source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer hardcodes `["Source", "E2E"]` as scan directories. It never looks in `portal/` (which implements 74 platform FRs) or `platform/` (which implements 9 tiered-merge FRs). The CLAUDE.md verification gate says to run `python3 tools/traceability-enforcer.py` — this command always passes regardless of portal/ or platform/ health. The 76 FRs in `dev-workflow-platform.md` and 10 FRs in `tiered-merge-pipeline.md` are permanently invisible to the gate. Separately, the default enforcer targets only the most recently modified `Plans/**/requirements.md` (currently `Plans/self-judging-workflow/requirements.md`, 13 FRs) — running it against the other specs requires explicit `--file` arguments that no gate automation currently does.
- **Recommendation:** Add `"portal"` and `"platform"` to `source_dirs` in the enforcer, OR create separate gate commands (`--file Specifications/dev-workflow-platform.md`, `--file Specifications/tiered-merge-pipeline.md`) wired into CLAUDE.md verification gates.
- **Cross-ref:** Escalate to TheFixer for enforcer fix; impacts every team that runs the gate.

---

### QO-002 — Duplicate Frontend Test Files
- **Severity:** P2
- **Category:** test-coverage / correctness
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (same for WorkItemListPage)
- **Detail:** Each page component has **two different test files** at different paths with overlapping but non-identical coverage. The root-level versions (`tests/*.test.tsx`) are older and less comprehensive (fewer fixtures, no type-safe helpers, fewer test cases). The `tests/pages/` versions are newer and more thorough. Vitest likely runs both, creating a situation where: (a) test count is inflated by double-running easier cases, (b) a regression in the newer test version could be masked by the older version still passing, and (c) the traceability comments point to the same FR-WF-010/011 IDs in both files, making it hard to know which is authoritative.
- **Failure scenario:** A refactor breaks the `WorkItemDetailPage` loading state. The newer `tests/pages/WorkItemDetailPage.test.tsx` catches it. The older root-level file's shallower test still passes. CI shows "tests passing" but the regression exists.
- **Recommendation:** Delete the root-level `WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx` (keep the `tests/pages/` versions which are more complete). Verify no unique coverage is lost before deletion.
- **Cross-ref:** TheFixer for cleanup.

---

### QO-003 — FR-TMP-008 Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (line ~107)
- **Detail:** FR-TMP-008 specifies that `gh` CLI must be installed in `Dockerfile.worker`. Scanning `platform/`, `Source/`, and `E2E/` finds **zero references** to FR-TMP-008 — no `// Verifies: FR-TMP-008` comment anywhere, and no evidence in any Dockerfile that this was implemented. All other FR-TMP-* requirements (001–007, 009–010) are traced in `platform/orchestrator/lib/workflow-engine.js` and its test file.
- **Failure scenario:** The tiered merge pipeline runs on a worker container that lacks `gh` — PR creation silently fails (FR-TMP-004 `graceful degradation` kicks in), meaning the auto-merge feature never executes for any risk level.
- **Recommendation:** Verify `platform/Dockerfile.worker` (or equivalent) installs `gh` CLI. Add `// Verifies: FR-TMP-008` comment to that Dockerfile or to a test that asserts the binary is present.
- **Cross-ref:** [ESCALATE → solo-session only] — `platform/` must not be touched by pipeline agents.

---

### QO-004 — Missing Observability for Expected Errors in Dependency Endpoint
- **Severity:** P3
- **Category:** pattern-violation (observability)
- **File:** `Source/Backend/src/routes/workflow.ts:330–351`
- **Detail:** The dependency action catch block (line 330) branches on error message content to return 400 (self-reference), 404 (not found), and 409 (circular). These branches return JSON responses but **do not call `logger`** — they swallow the error signal silently. Only the final 500 fallback at line 349 logs. CLAUDE.md mandates structured logging for all workflow transitions, and the architecture rule states "Never swallow errors silently." Expected errors are still observable events from a tracing perspective.
- **Failure scenario:** A client sends a circular dependency request → the 409 is returned but no log entry is emitted. In a production incident, the ops team has no visibility into the frequency or pattern of circular dependency attempts.
- **Recommendation:** Add `logger.warn(...)` calls before each status-specific return in the catch block (lines 334–346), using a consistent structure like `{ msg: 'Dependency action rejected', reason: 'self-reference'|'not-found'|'circular', workItemId }`.

---

### QO-005 — Undocumented eslint-disable Suppressions
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63` and `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line react-hooks/exhaustive-deps` but provide no documentation of WHY the suppression is safe. This is a subtle stale-closure risk: if a dependency is omitted intentionally (e.g., a stable import reference), that reasoning is invisible. Future maintainers may add captured variables that genuinely need to be in the dep array, see the disable comment, and assume it's already handled.
- **Failure scenario:** A developer adds a new state variable to the `useEffect` in `useWorkItems` without realising the dep suppression means lint won't warn them. The effect stales on that variable and users see outdated filter results.
- **Recommendation:** Replace the bare eslint-disable with an explanatory comment, e.g.: `// eslint-disable-next-line react-hooks/exhaustive-deps — workItemsApi is a stable module-level import; all primitive filter fields are listed`.

---

### QO-006 — DebugPortalPage Non-Standard Traceability Comment
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file opens with `// Verifies: dev-crew debug portal — embedded container-test viewer`, which does not match the `FR-\d+` or `FR-[A-Z]+-\d+` pattern enforced by the traceability system. The page is not linked to any functional requirement. While DebugPortalPage is a utility view (embeds the portal iframe), it still represents code whose purpose cannot be traced to a spec.
- **Recommendation:** Either create a minimal FR for the debug portal integration in the relevant plan and use that ID, or add a comment block explaining this is internal tooling exempt from FR traceability.

---

### QO-007 — FR-XXXX Notation Ambiguity in Platform Spec
- **Severity:** P4
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:475`
- **Detail:** The spec uses `FR-XXXX` format for **both** functional requirement IDs (e.g., `FR-020`) and seeded feature request entity IDs (e.g., "FR-0004 blocked_by FR-0003"). The enforcer's regex `FR-[A-Z0-9-]+` matches both, causing FR-0004 and FR-0007 to appear as "unimplemented requirements" when they are actually data references. This is a documentation smell — requirement IDs and entity IDs should use distinct namespaces (e.g., `REQ-004` vs `FR-0004`).
- **Recommendation:** Add a note to the spec clarifying that FR-0001…FR-0010 in the seed data section are feature request entity IDs, not requirement IDs. Longer term, distinguish the namespaces.

---

### Pattern Enforcement Pass (No Findings)

| Check | Result |
|---|---|
| `console.log` in production source | ✅ None found |
| Hardcoded secrets / passwords | ✅ None found |
| Empty catch blocks | ✅ None found (all catch blocks log or re-throw) |
| Files > 500 lines | ✅ None (largest: WorkItemDetailPage.tsx at 426 lines) |
| TODO/FIXME/HACK > 3 months old | ✅ None found |
| Inline type re-definitions | ✅ Types imported from Shared/ consistently |
| Direct DB calls from routes | ✅ N/A — in-memory store; service layer present |

---

```json
{
  "audit_date": "2026-10-07",
  "spec_coverage": {
    "workflow_engine": { "total": 13, "traced": 13, "pct": 100 },
    "dev_workflow_platform": { "total": 76, "traced": 74, "pct": 97.4 },
    "tiered_merge_pipeline": { "total": 10, "traced": 9, "pct": 90 },
    "effective_gate_coverage_pct": 12.7
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer excludes portal/ and platform/" },
    { "id": "QO-002", "severity": "P2", "category": "test-coverage", "title": "Duplicate frontend test files at two paths" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-008 has no implementation reference" },
    { "id": "QO-004", "severity": "P3", "category": "pattern-violation", "title": "Expected errors in dependency catch block not logged" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "Undocumented eslint-disable suppressions" },
    { "id": "QO-006", "severity": "P4", "category": "pattern-violation", "title": "DebugPortalPage non-standard Verifies comment" },
    { "id": "QO-007", "severity": "P4", "category": "spec-drift", "title": "FR-XXXX notation ambiguity in platform spec" }
  ],
  "grade": "B",
  "p1_count": 1,
  "p2_count": 2,
  "p3_count": 2,
  "p4_count": 2
}
```

**Grade: B** (1 P1, 2 P2 — below the A threshold of 0 P1/≤3 P2, above C). The codebase is well-structured with strong observability, no console.log leakage, no hardcoded secrets, and good per-file traceability discipline. The single P1 (enforcer blindspot) is a tooling gap, not a code quality gap — the actual implementation coverage across all zones is ~97%.
