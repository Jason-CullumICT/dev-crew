Now the full audit report:

---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec | FR IDs | Scanned By Enforcer | Actual Coverage |
|------|--------|---------------------|-----------------|
| `dev-workflow-platform.md` (FR-001 — FR-069) | 74 | ❌ Not scanned (portal/) | ~100% in `portal/` |
| `self-judging-workflow` (FR-WF-001 — FR-WF-013) | 13 | ✅ Passes | 100% in `Source/` |
| `tiered-merge-pipeline.md` (FR-TMP-001 — FR-TMP-010) | 10 | ❌ Not scanned (platform/) | 90% (FR-TMP-008 untraced) |
| `workflow-engine.md` | 0 FR IDs | ❌ Unenforceable (no IDs) | Unenforceable |

---

### QO-001: Traceability Enforcer Blind Spot — platform/ and portal/ excluded from scans

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:69` (hardcoded `source_dirs = ["Source", "E2E"]`)
- **Detail:** The mandatory verification gate (`python3 tools/traceability-enforcer.py`) auto-selects the most recently modified plan (`Plans/self-judging-workflow/requirements.md`) and scans only `Source/` and `E2E/`. Running it against `Specifications/dev-workflow-platform.md` reports **76 requirements MISSING** — but they're fully implemented in `portal/` (1074 `Verifies:` comments found there). `Specifications/tiered-merge-pipeline.md` implementation lives in `platform/orchestrator/` and is equally invisible to the enforcer. Agents running the gate see a green pass and believe all three specs are covered — they are not verified.
- **Recommendation:** Extend `source_dirs` in `traceability-enforcer.py` to include `portal/` and `platform/`. Alternatively, add a secondary invocation to the verification gate: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` and configure it to scan `portal/`.
- **Cross-ref:** All agents running verification gates are affected. TheFixer should coordinate the fix with a solo session since `tools/` is solo-editable.

---

### QO-002: `Specifications/workflow-engine.md` Has No FR-XXX Identifiers — Unenforceable

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/workflow-engine.md`
- **Detail:** The workflow-engine spec defines domain model, status lifecycle, routing rules, assessment pod, and API endpoints — but uses no `FR-XXX` identifiers. Traceability is tracked instead in `Plans/self-judging-workflow/requirements.md` under `FR-WF-*`. This means the canonical domain spec can never be checked by the enforcer. If a future feature changes behavior without updating the spec, no gate will catch it. The spec also cannot be referenced by `// Verifies:` comments, so implementations have no normative anchor.
- **Recommendation:** Add `FR-WF-XXX` IDs directly to the table rows in `workflow-engine.md`, matching the existing IDs in `Plans/self-judging-workflow/requirements.md`. This makes the spec the authoritative source of IDs rather than a Plans file.
- **Cross-ref:** requirements-reviewer agent owns `Specifications/`.

---

### QO-003: Architecture Violation — Route Handlers Bypass Service Layer in `Source/Backend`

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44`, `Source/Backend/src/routes/intake.ts:19`
- **Detail:** `workItems.ts` and `intake.ts` both call `store.createWorkItem()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()`, and `store.getAllItems()` directly. The architecture rule is explicit: *"No direct DB calls from route handlers — use the service layer."* The in-memory store (`workItemStore.ts`) is the persistence layer; calling it from routes is the same violation as calling SQLite from a route handler. By contrast, `dashboard.ts` correctly delegates to `dashboardService`. The `workflow.ts` router also calls `store.findById()` and `store.updateWorkItem()` at multiple points (lines 45, 100, 156, 218, 268...).
- **Recommendation:** Extract a `workItemService.ts` that wraps `workItemStore` for CRUD operations. Route handlers should call service functions only.
- **Cross-ref:** [ESCALATE → TheFixer] for implementation.

---

### QO-004: Open Delta — `portal/Shared/api.ts` Missing `blocked_by` Field (FR-dependency-api-types)

- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`), `portal/Shared/api.ts:59` (`UpdateBugInput`)
- **Detail:** The dependency-linking plan (FR-dependency-api-types) requires `blocked_by?: string[]` on both `UpdateFeatureRequestInput` and `UpdateBugInput`. Neither interface has this field. As a result, `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291 and 293 use `as any` casts. This is a type-safety gap — PATCH bodies for dependency updates bypass TypeScript validation.
- **Recommendation:** Add `blocked_by?: string[]` to both interfaces in `portal/Shared/api.ts`. Remove `as any` casts from `DependencyPicker.tsx`.
- **Cross-ref:** [ESCALATE → TheFixer] backend + frontend coor via api-contract.

---

### QO-005: Open Delta — `portal/Backend/src/database/seed.ts` Missing (FR-dependency-seed)

- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (file absent)
- **Detail:** FR-dependency-seed requires an idempotent seed file that inserts 4 known dependency relationships after base seed data: BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003. Only `connection.ts` and `schema.ts` exist in that directory. Without seed data, the dependency relationships for known bugs/FRs are missing in fresh environments, making demo and integration testing unreliable.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent insert logic and wire it into `portal/Backend/src/index.ts` startup.
- **Cross-ref:** [ESCALATE → TheFixer] backend-coder.

---

### QO-006: Logger Missing Dev/Prod Mode Switch in `Source/Backend`

- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Backend/src/utils/logger.ts:17`
- **Detail:** The `emit()` function unconditionally writes JSON to `process.stdout`. The architecture rule and `CLAUDE.md` both state *"structured JSON logging in production, pretty-printing in development."* There is no `NODE_ENV` check. Developers running the server locally see raw JSON lines rather than human-readable output. Additionally, `src/logger.ts` exists as a compatibility wrapper around `src/utils/logger.ts` — two logger abstractions in the same service is a smell that can lead to imports from either path, defeating the single-logger-sink rule.
- **Recommendation:** Add `NODE_ENV` check to `emit()` — use `JSON.stringify(entry)` in production and a formatted string (e.g., `[LEVEL] message context`) in development. Consolidate to one logger entry point (recommend keeping `utils/logger.ts` as canonical and removing `src/logger.ts` by re-exporting).
- **Cross-ref:** [ESCALATE → TheFixer] backend-coder.

---

### QO-007: FR-TMP-008 Has No `// Verifies:` Traceability Comment

- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/orchestrator/` (no file contains `Verifies: FR-TMP-008`)
- **Detail:** FR-TMP-008 (Worker Container Prerequisites — gh CLI, Playwright installable, GITHUB_TOKEN env) is the only tiered-merge-pipeline requirement with zero traceability. The `workflow-engine.test.js` file covers FR-TMP-001, 003, 004, 005, 006, 007, 009, 010, but not 008. The relevant logic (Dockerfile.worker, config checks) likely exists but is not tagged.
- **Recommendation:** Add `// Verifies: FR-TMP-008` comment to `Dockerfile.worker` (or wherever the gh CLI install lives in `platform/`) and to a test that verifies the env var setup.
- **Cross-ref:** Solo session only — `platform/` is solo-session-only per CLAUDE.md.

---

### QO-008: ESLint `react-hooks/exhaustive-deps` Suppressions May Hide Stale Closures

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress the `react-hooks/exhaustive-deps` rule rather than fixing the dependency array. Stale closures from missing dependencies can cause subtle bugs: cached values that don't update when dependencies change, or infinite loops when dependencies are incorrectly omitted.
- **Recommendation:** Investigate both suppression sites. If the omitted dependency is intentional (e.g., a stable ref), document why with a comment. If not, add it to the dependency array.
- **Cross-ref:** frontend-coder.

---

### QO-009: `portal/Frontend/src/api/client.ts` Exceeds 500-Line Threshold

- **Severity:** P3
- **Category:** simplification
- **File:** `portal/Frontend/src/api/client.ts` (525 lines)
- **Detail:** The client file contains typed API functions for all 9+ entity domains (feature requests, bugs, cycles, pipeline runs, feedback, learnings, features, dependencies, search, images). At 525 lines it exceeds the 500-line split threshold. Large client files become difficult to test in isolation and create merge conflicts as new endpoints are added.
- **Recommendation:** Split into domain-specific client modules (e.g., `api/featureRequests.ts`, `api/bugs.ts`, `api/cycles.ts`) with a barrel re-export in `api/index.ts`.
- **Cross-ref:** frontend-coder.

---

### QO-010: Traceability Enforcer Incorrectly Parses Seed Data IDs as Requirement IDs

- **Severity:** P3
- **Category:** test-coverage
- **File:** `tools/traceability-enforcer.py:65`
- **Detail:** The enforcer uses pattern `FR-[A-Z0-9-]+` which matches seed data references like `FR-0002`, `FR-0003` in `Plans/dependency-linking/requirements.md` (where they refer to feature request records, not FR IDs). Running the enforcer against the dependency-linking requirements reports these as unimplemented requirements, producing false failures. This trains agents to ignore traceability failures.
- **Recommendation:** Tighten the pattern to require `FR-` followed by capital-letter prefixes or specific formats (e.g., `FR-[A-Z]+-\d+` or `FR-\d{3,}`). Alternatively, add a comment prefix to seed data references in the requirements file (e.g., `seed:FR-0002`).
- **Cross-ref:** Solo session for `tools/`.

---

```json
{
  "audit_date": "2026-08-02",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "dev-workflow-platform": { "fr_count": 74, "covered_in": "portal/", "coverage_pct": "~100%", "enforcer_sees": "0%" },
    "self-judging-workflow": { "fr_count": 13, "covered_in": "Source/", "coverage_pct": "100%", "enforcer_sees": "100%" },
    "tiered-merge-pipeline": { "fr_count": 10, "covered_in": "platform/", "coverage_pct": "90%", "missing": ["FR-TMP-008"] },
    "workflow-engine": { "fr_count": 0, "note": "no FR-XXX IDs in spec — unenforceable" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer blind spot — portal/ and platform/ excluded" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "workflow-engine.md has no FR-XXX IDs — unenforceable" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store directly — no service layer in Source/Backend" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "portal/Shared/api.ts missing blocked_by on update types (FR-dependency-api-types)" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "portal/Backend/src/database/seed.ts absent (FR-dependency-seed)" },
    { "id": "QO-006", "severity": "P2", "category": "pattern-violation", "title": "Source/Backend logger always emits JSON — no dev pretty-print mode" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "FR-TMP-008 has no Verifies comment anywhere" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable react-hooks/exhaustive-deps in 2 files" },
    { "id": "QO-009", "severity": "P3", "category": "simplification", "title": "portal/Frontend/src/api/client.ts is 525 lines — split needed" },
    { "id": "QO-010", "severity": "P3", "category": "test-coverage", "title": "Enforcer pattern matches seed data FRs — false negatives" }
  ],
  "grade": "C",
  "grade_rationale": "2 P1 findings (enforcer blind spot and unenforceable spec), 4 P2 findings — exceeds B threshold of max_p2=8 but total P1=2 disqualifies A/B. True functional coverage is likely high but verification tooling is unreliable."
}
```

---

**Learnings file updated** at `Teams/TheInspector/learnings/quality-oracle.md` with repo layout map, known open deltas, useful grep commands, and spec coverage trend table for faster future audits.
