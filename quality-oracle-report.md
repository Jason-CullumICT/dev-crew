Now the full audit report:

---

## Quality Oracle Findings — 2026-10-26

### Spec Coverage Summary

| Spec | Requirements | Enforcer Gate | Code Coverage |
|------|-------------|---------------|--------------|
| `workflow-engine.md` via `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | ✅ Scans Source/ | **100%** |
| `dev-workflow-platform.md` (FR-001–FR-069 + FR-dependency-*) | ~85 | ❌ **Not scanned** | Appears full — portal/ |
| `tiered-merge-pipeline.md` (FR-TMP-001–FR-TMP-010) | 10 | ❌ Not scanned | **0% — no code anywhere** |
| Image-upload / orchestrator features (FR-070–FR-095) | ~26 | ❌ Not scanned | Appears full — portal/ |

**Enforcer-reported coverage: 100% (scope: 13 of ~134 spec requirements)**
**True unimplemented requirements: 10 (FR-TMP-001 to FR-TMP-010)**

---

### QO-001 — Traceability Enforcer Scope Is Critically Narrow
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:80`
- **Detail:** The enforcer scans only `Source/` and `E2E/`. The `portal/` directory — which implements the majority of domain requirements from `Specifications/dev-workflow-platform.md` (FR-001–FR-069) and image-upload (FR-070–FR-095) — is **never scanned**. The gate reports 100% pass by covering only 13 of ~134 spec requirements. Traceability can silently break in portal/ without any gate failure.
- **Recommendation:** Extend `check_traceability()` to also scan `portal/` — add `"portal"` to the `source_dirs` list. Also add a separate enforcer invocation targeting `Specifications/` FRs, not just the latest `Plans/*/requirements.md`.
- **Cross-ref:** Any agent editing portal/ has no enforcer safety net.

---

### QO-002 — `teamDispatches.ts` Route Contains Raw SQL (No Service Layer)
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37`
- **Detail:** Route handler directly calls `db.prepare("SELECT * FROM team_dispatches...").all(...)` and `db.prepare("INSERT INTO team_dispatches...").run(...)`. This violates the non-negotiable architecture rule: **"No direct DB calls from route handlers — use the service layer."** All other portal routes delegate to service functions; this one is the exception and creates an inconsistency.
- **Recommendation:** Extract DB logic into `portal/Backend/src/services/teamDispatchService.ts`. Route handler should call service functions only.
- **Cross-ref:** `[ESCALATE → TheFixer]`

---

### QO-003 — `tiered-merge-pipeline.md` Specification Is Completely Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** FR-TMP-001 through FR-TMP-010 (risk classification, Playwright E2E generation, auto-PR, AI PR review, auto-merge) have **zero `// Verifies:` references** in any directory (`Source/`, `portal/`, or `E2E/`). A full specification exists — including risk tiers, merge strategies, and environment variable config — with no corresponding implementation. The spec may be aspirational/future-work, but this is not documented.
- **Recommendation:** Either (a) mark the spec `## Status: Planned / Not Yet Implemented` to prevent confusion, or (b) create a Plans entry and backlog task to implement it, or (c) archive it if superseded.
- **Cross-ref:** `Plans/tiered-merge-pipeline/` exists — check if it has implementation work.

---

### QO-004 — Three Production Files in Portal Have No Traceability
- **Severity:** P2
- **Category:** spec-drift (unlinked implementation)
- **Files:**
  - `portal/Backend/src/routes/teamDispatches.ts` (recently added)
  - `portal/Frontend/src/components/common/RepoSelector.tsx` (recently added)
  - `portal/Frontend/src/pages/TeamsPage.tsx` (recently added)
- **Detail:** All three were modified in the last 14 days and contain zero `// Verifies:` comments. Per architecture rules and the spec-first workflow, every FR needs a test with traceability comments. These files implement observable product features (team dispatch history, repo selection, teams page) without any spec anchor.
- **Recommendation:** Identify the Plan or Specification that covers these features (likely an unreviewed Teams-page feature). Add `// Verifies: <FR-ID>` or write the spec first if none exists.

---

### QO-005 — Empty `.catch(() => {})` Blocks Silently Swallow Errors
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `portal/Frontend/src/components/bugs/BugDetail.tsx:82`
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80`
  - `portal/Frontend/src/components/common/RepoSelector.tsx:20`
- **Detail:** Three production frontend files silently suppress errors on `repos.list()` calls. Violates: **"Never swallow errors silently — every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."** Users get no feedback; failures are invisible.
- **Recommendation:** Log the error (e.g., `console.warn` or logger) and/or set an error state. If the failure is truly non-critical (repo list defaulting gracefully), add a comment explaining the intentional suppression.
- **Cross-ref:** `[ESCALATE → TheFixer]`

---

### QO-006 — Plans Create FR Numbers Outside Specifications (Spec-First Workflow Broken)
- **Severity:** P3
- **Category:** spec-drift / process-violation
- **File:** `Plans/image-upload/requirements.md` (and other Plan files)
- **Detail:** `Plans/image-upload/requirements.md` defines FR-070 through FR-095. These requirements exist in Plans/ but **do not appear in any `Specifications/` document**. `Specifications/dev-workflow-platform.md` tops out at FR-069. The architecture rule states "Specifications/ → Plans/ → Source/ → Tests" — spec is source of truth. Plans are supposed to trace to spec, not originate new requirements independently.
- **Recommendation:** For each Plan-only FR range, either: (a) add the requirements to the corresponding Specification document, or (b) create new domain specs (e.g., `Specifications/image-upload.md`). This is currently working in practice but creates orphaned requirements invisible to spec reviewers.

---

### QO-007 — `eslint-disable` Suppression in Four Production Files
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `portal/Frontend/src/components/shared/DependencyPicker.tsx:82` — `eslint-disable-next-line react-hooks/exhaustive-deps`
  - `portal/Frontend/src/hooks/useApi.ts:35` — `eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** All four suppress `react-hooks/exhaustive-deps` — the same rule in both apps, in the same component type (`DependencyPicker`). Suppressing exhaustive-deps masks potential stale closure bugs and is a sign the effect dependency array is manually managed incorrectly.
- **Recommendation:** Review each suppression. Add a comment explaining exactly why the dependency is excluded. If a useCallback/useMemo extraction would fix it, prefer that over suppression.

---

### QO-008 — `interface TeamDispatch` Defined Inline in Route File
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:14`
- **Detail:** `interface TeamDispatch` is defined directly in the route handler file. Architecture rule: **"Shared types are single source of truth — no inline type re-definitions across layers."** This type should live in `portal/Shared/types.ts`.
- **Recommendation:** Move `TeamDispatch` to `portal/Shared/types.ts` and import it.

---

```json
{
  "audit_date": "2026-10-26",
  "spec_coverage": {
    "enforcer_reported": "100% (13/13 FR-WF-*)",
    "enforcer_scope_fraction": "13/134 total spec requirements (~10%)",
    "unimplemented_frs": ["FR-TMP-001","FR-TMP-002","FR-TMP-003","FR-TMP-004","FR-TMP-005","FR-TMP-006","FR-TMP-007","FR-TMP-008","FR-TMP-009","FR-TMP-010"],
    "portal_coverage": "apparent full coverage — not enforcer-validated"
  },
  "findings": [
    {"id":"QO-001","severity":"P1","category":"spec-drift","file":"tools/traceability-enforcer.py","title":"Enforcer ignores portal/ — gate covers 10% of spec requirements"},
    {"id":"QO-002","severity":"P1","category":"architecture-violation","file":"portal/Backend/src/routes/teamDispatches.ts","title":"Raw SQL in route handler, no service layer"},
    {"id":"QO-003","severity":"P2","category":"spec-drift","file":"Specifications/tiered-merge-pipeline.md","title":"FR-TMP-001–010 have zero implementation anywhere"},
    {"id":"QO-004","severity":"P2","category":"spec-drift","file":"portal/Backend/src/routes/teamDispatches.ts","title":"3 recently-added portal files have no Verifies comments"},
    {"id":"QO-005","severity":"P2","category":"architecture-violation","file":"portal/Frontend/src/components/bugs/BugDetail.tsx","title":"Empty .catch(() => {}) blocks silently swallow errors"},
    {"id":"QO-006","severity":"P3","category":"spec-drift","file":"Plans/image-upload/requirements.md","title":"Plan-originated FRs not backed by Specifications/"},
    {"id":"QO-007","severity":"P3","category":"pattern-violation","file":"portal/Frontend/src/components/shared/DependencyPicker.tsx","title":"eslint-disable suppression in 4 production files"},
    {"id":"QO-008","severity":"P3","category":"architecture-violation","file":"portal/Backend/src/routes/teamDispatches.ts","title":"Inline interface TeamDispatch not in Shared types"}
  ],
  "grade": "C",
  "grade_rationale": "2 P1s, 3 P2s. Grading config: C = max_p1:2, max_p2:15, min_spec_coverage:40. True spec coverage unverifiable by tool — enforcer scope mismatch is itself a P1."
}
```

---

**Grade: C**

Two P1s — one a systemic gate failure (enforcer blind to portal), one a clear architecture violation (SQL in route) — alongside three P2s including a fully unimplemented spec and swallowed errors. The codebase is otherwise well-structured: consistent structured logging, Prometheus metrics present, OTel tracing in place, and the FR-WF-* traceability is solid. The gaps are concentrated in the portal layer and tooling scope.
