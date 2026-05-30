# Quality Oracle Findings — 2026-05-30

> **Audit scope:** Full static analysis — spec drift, traceability, pattern enforcement, test hygiene
> **Config:** `Teams/TheInspector/inspector.config.yml`
> **Prior findings:** None (first run)

---

## Spec Coverage Summary

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| `Specifications/dev-workflow-platform.md` | 69 (FR-001..FR-069) | 0 | 0% ⚠️ |
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001..FR-WF-013) | 13 | 100% ✅ |
| `Plans/image-upload/requirements.md` | 21 (FR-070..FR-089) | 0 | 0% ⚠️ |
| `Plans/orchestrated-dev-cycles/requirements.md` | 18 (FR-033..FR-049) | 0 | 0% ⚠️ |
| `Plans/duplicate-deprecated-status/requirements.md` | 15 (FR-DUP-01..FR-DUP-13) | 0 | 0% ⚠️ |
| `Plans/dependency-linking/requirements.md` | 7 | 0 formal | ~0%* |

\* Dependency features ARE implemented but under a different FR namespace (`FR-dependency-*`), creating a namespace mismatch that fails the enforcer.

**Effective coverage across all tracked requirements: ~9% (13/137+ unique FRs)**

---

## Findings

---

### QO-001: Traceability Enforcer Has Dangerous Auto-Selection Blind Spot

- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (auto-selection logic, lines 33–55)
- **Detail:** The enforcer without arguments picks the **most recently modified** `Plans/*/requirements.md`. As of today, that is `Plans/self-judging-workflow/requirements.md` which passes 100%. However, **4 other plans with unimplemented requirements are silently skipped**, resulting in a falsely clean gate. Running `npm test --workspaces` and the enforcer in sequence gives a green signal when the actual traceability debt is severe.

  Affected plans suppressed by auto-selection:
  - `Plans/image-upload/` — **21 MISSING FRs** (FR-070..FR-089)
  - `Plans/orchestrated-dev-cycles/` — **18 MISSING FRs** (FR-033..FR-049)
  - `Plans/duplicate-deprecated-status/` — **15 MISSING FRs** (FR-DUP-01..FR-DUP-13)
  - `Plans/dependency-linking/` — **7 MISSING FRs** (FR-0002..FR-0005, FR-0007, FR-070, FR-085)

  Verified by running each plan explicitly:
  ```
  python3 tools/traceability-enforcer.py --plan image-upload
  → TRACEABILITY FAILURE: 21 requirements lack implementation!
  ```

- **Recommendation:** Change the enforcer's default behaviour: either check ALL `Plans/*/requirements.md` files and fail on any missing, or require `--plan` explicitly with no fallback. A CI step that runs `--plan self-judging-workflow` alone is insufficient.

  Quick fix for CI:
  ```bash
  for plan in Plans/*/; do
    [ -f "${plan}requirements.md" ] && python3 tools/traceability-enforcer.py --file "${plan}requirements.md" || true
  done
  ```

- **Cross-ref:** TheFixer for enforcer script change

---

### QO-002: Primary Specification Has Zero Source Implementation Traces

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Specifications/dev-workflow-platform.md` (FR-001..FR-069)
- **Detail:** The authoritative domain specification `Specifications/dev-workflow-platform.md` defines **69 requirements** covering Feature Requests, Bug Reports, Development Cycles, Pipeline Orchestration, and a full Frontend — none of which exist in `Source/`. Zero occurrences of `FR-001` through `FR-069` appear anywhere in the source tree.

  The implemented application (a Work Item Workflow Engine) traces to `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` (FR-WF-001..FR-WF-013). This is a **different product** from what the primary spec describes.

  This creates a fundamental architectural mismatch:
  - `Specifications/dev-workflow-platform.md` — a Feature Request / Bug / Cycle management platform (UNIMPLEMENTED)
  - `Source/` — a work-item routing and assessment engine (IMPLEMENTED, traces to FR-WF-XXX)

  CLAUDE.md states: _"Every decision and line of code must trace back to a specification."_ and _"Specs are source of truth — implementation traces to specs, never the other way around."_ Neither condition holds for the primary spec.

- **Recommendation:** One of:
  1. **Clarify intent:** If `dev-workflow-platform.md` is a future roadmap, mark it explicitly as `STATUS: PLANNED` and move it to `Specifications/roadmap/`. The current spec filename implies it is authoritative.
  2. **Retire the orphaned spec:** If the team has decided the workflow-engine is the product, align `Specifications/dev-workflow-platform.md` to describe it.
  3. **Implement the gap:** If FR-001..FR-069 are required, create implementation plans for each unimplemented FR group.

  This is the highest-priority architectural issue in the codebase.

- **Cross-ref:** [ESCALATE → TheFixer] for spec reconciliation; TheInspector cannot resolve this unilaterally

---

### QO-003: FR Namespace Fragmentation Breaks Cross-Plan Traceability

- **Severity:** P2
- **Category:** spec-drift
- **File:** Multiple (source and plans)
- **Detail:** Three incompatible FR naming conventions coexist:
  - `FR-WF-XXX` — plan-aligned (self-judging-workflow, 13 IDs, all traced)
  - `FR-dependency-XXX` — invented in-source IDs with no plan-level counterpart (e.g., `FR-dependency-endpoints`, `FR-dependency-picker`, `FR-dependency-blocked-badge`)
  - `FR-001..FR-069` — the primary spec numbering, with zero source references

  The `FR-dependency-*` IDs are referenced in `Plans/dependency-linking/requirements.md` as `FR-0002..FR-0007` — a completely different format. The enforcer reports 7 missing FRs for that plan, but the implementation exists under `FR-dependency-*` IDs. The gap is a naming convention mismatch, not missing code.

  However, the `FR-dependency-*` IDs are also not defined anywhere as a canonical list, making the enforcer unable to check them without a requirements file that uses the same notation.

- **Recommendation:** Standardise on one FR naming pattern. Recommend aligning all plan requirements to `FR-{short-plan-slug}-{NNN}` format and updating source `Verifies:` comments to match. Create or update `Plans/dependency-linking/requirements.md` to use the `FR-dependency-XXX` IDs that source already carries.

- **Cross-ref:** TheFixer to update plans/source to consistent naming

---

### QO-004: NFR Coverage Has Zero Traceability

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (NFR-1, NFR-2, NFR-3)
- **Detail:** `Specifications/tiered-merge-pipeline.md` defines three non-functional requirements:
  - NFR-1: E2E phase adds ≤5 minutes to pipeline
  - NFR-2: All new phases are additive — no existing pipeline behavior broken
  - NFR-3: Graceful degradation at every step

  None of these appear in Source/ or E2E/ as `// Verifies: NFR-X` comments. The traceability enforcer's regex (`FR-[A-Z0-9-]+`) does not even match `NFR-` prefixed IDs, so NFRs are structurally excluded from enforcement.

- **Recommendation:** Add `NFR-[0-9]+` to the enforcer's pattern and add traceability comments in the E2E/pipeline configuration for each NFR.

---

### QO-005: `eslint-disable` in Two Production Source Files

- **Severity:** P2
- **Category:** pattern-violation / architecture-violation
- **File:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` via `eslint-disable-next-line`. CLAUDE.md lists **"Disabled linting rules (`eslint-disable`, `nolint`)"** as a flagged code pattern.

  The `exhaustive-deps` rule is specifically designed to prevent stale closure bugs in `useEffect` — suppressing it without documentation of why it's safe is a latent correctness risk.

  ```typescript
  // Source/Frontend/src/hooks/useWorkItems.ts:63
  // eslint-disable-next-line react-hooks/exhaustive-deps
  
  // Source/Frontend/src/components/DependencyPicker.tsx:82
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ```

- **Recommendation:** Either:
  1. Restructure the effect to satisfy the dependency rule (move the function out of the component, use `useCallback`, or accept stable refs)
  2. If suppression is genuinely intentional, add a dated comment explaining why: `// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit X to prevent infinite loop (added 2026-05-30)`

- **Cross-ref:** TheFixer for remediation

---

### QO-006: Duplicate Frontend Test Files Create Test Runner Ambiguity

- **Severity:** P2
- **Category:** test-quality
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` ← root level
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` ← pages subdirectory
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` ← root level
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` ← pages subdirectory
- **Detail:** Both levels exist for the same components. Both have `// Verifies: FR-WF-XXX` headers. Both files cover similar scenarios (loading states, rendering, actions). It's unclear which is canonical, and both run on `npm test`, potentially duplicating coverage counts and hiding gaps.

  The root-level files appear to be older iterations not cleaned up after the `tests/pages/` structure was introduced.

- **Recommendation:** Audit for coverage parity, designate one as canonical (recommend `tests/pages/`), delete the stale root-level duplicates.

---

### QO-007: `DebugPortalPage.tsx` Lacks Valid FR Traceability

- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The traceability comment reads:
  ```
  // Verifies: dev-crew debug portal — embedded container-test viewer
  ```
  This is descriptive prose, not an FR identifier. The page is not covered by any requirement in any spec or plan file. CLAUDE.md: _"Every FR needs a test with `// Verifies: FR-XXX` traceability comments"_ — by extension every source file should trace to a spec requirement.

- **Recommendation:** Either add this page to a spec/plan with a proper FR ID, or explicitly mark it as infrastructure (`// Infrastructure: debug portal — not subject to FR traceability`).

---

### QO-008: `Specifications/tiered-merge-pipeline.md` Has Unresolved Orphan FR Refs

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** The tiered-merge-pipeline spec references NFR-1, NFR-2, NFR-3 but does not define any FRs of its own. It describes CI/CD pipeline behavior for the platform infrastructure (`platform/`). However, the inspector config in `inspector.config.yml` scopes source analysis to `Source/` only, and `platform/` is explicitly off-limits for pipeline agents. This means the NFRs in this spec can never be verified through the standard enforcement path.

- **Recommendation:** Either move NFR coverage to E2E tests that run against the platform, or document that this spec's NFRs are verified by CI/CD runtime evidence rather than source traceability.

---

### QO-009: Multiple Plans Have Requirements Files for Unimplemented Features

- **Severity:** P3
- **Category:** spec-drift
- **Files:** `Plans/image-upload/`, `Plans/orchestrated-dev-cycles/`, `Plans/duplicate-deprecated-status/`
- **Detail:** Three plans contain `requirements.md` with approved requirements that have no source implementation. These are not speculative — the plan verdicts say `APPROVED`. This indicates either:
  - Work was planned, approved, but never dispatched to coders, OR
  - Work was implemented in a separate repo/branch that was never merged

  Summary of gaps:
  - `image-upload`: 21 FRs covering image attachment CRUD for feature requests and bugs
  - `orchestrated-dev-cycles`: 18 FRs covering pipeline-linked development cycles (FR-033..FR-049)
  - `duplicate-deprecated-status`: 15 FRs covering duplicate detection and deprecated status handling

- **Recommendation:** For each plan: confirm whether work was completed elsewhere (merge it), actively in progress (track it), or abandoned (mark the plan `STATUS: DEFERRED` or `STATUS: CANCELLED`). CLAUDE.md mandates specs-first but abandoned plans create phantom debt.

- **Cross-ref:** [ESCALATE → TheFixer] for implementation; team leader to triage status

---

### QO-010: Hardcoded `localhost:4200` Fallback in Frontend

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`
- **Detail:**
  ```typescript
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  ```
  The `localhost:4200` URL is hardcoded as a development fallback. While this works locally, it will silently connect to an absent/wrong host in staging/production environments where `VITE_PORTAL_URL` is not set. CLAUDE.md: _"No hardcoded secrets — use environment variables via `.env`"_ — the spirit of this rule extends to hardcoded infrastructure addresses.

- **Recommendation:** Remove the fallback or make it throw/warn loudly in non-development environments:
  ```typescript
  const portalUrl = import.meta.env.VITE_PORTAL_URL;
  if (!portalUrl && import.meta.env.MODE !== 'development') {
    console.error('VITE_PORTAL_URL not set');
  }
  ```

---

## Grade Assessment

Per `inspector.config.yml` grading:

| Metric | Value | Threshold |
|--------|-------|-----------|
| P1 findings | **2** | A: 0, B: 0, C: ≤2 |
| P2 findings | **4** | A: ≤3, B: ≤8 |
| Spec coverage (primary spec) | **0%** | A: ≥80%, B: ≥60%, C: ≥40% |

**Overall Grade: D**

The zero spec coverage against the primary spec (`Specifications/dev-workflow-platform.md`) triggers the D grade regardless of P1/P2 thresholds. However, this grade is misleading — the implementation has **100% coverage** against its operational spec (`Plans/self-judging-workflow/requirements.md`). The D grade reflects a structural problem (two specs, one implemented product) rather than code quality failure.

If coverage is measured only against the operational spec the implementation targets, the grade would be **B** (0 P1s, 4 P2s, 100% spec coverage).

---

## JSON Summary

```json
{
  "audit_date": "2026-05-30",
  "grade": "D",
  "grade_note": "Grade reflects primary spec orphan (0% coverage). Operational spec coverage is 100%.",
  "spec_coverage": {
    "primary_spec_dev_workflow_platform": "0%",
    "operational_spec_self_judging_workflow": "100%",
    "plans_with_zero_coverage": ["image-upload", "orchestrated-dev-cycles", "duplicate-deprecated-status", "dependency-linking"]
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer has dangerous auto-selection blind spot"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "Primary spec has zero source implementation traces (0/69 FRs)"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR namespace fragmentation breaks cross-plan traceability"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "NFR coverage has zero traceability"},
    {"id": "QO-005", "severity": "P2", "category": "pattern-violation", "title": "eslint-disable in two production source files"},
    {"id": "QO-006", "severity": "P2", "category": "test-quality", "title": "Duplicate frontend test files for same components"},
    {"id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "DebugPortalPage lacks valid FR traceability"},
    {"id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "tiered-merge-pipeline NFRs have no enforcement path"},
    {"id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "3 approved plans with unimplemented requirements"},
    {"id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "Hardcoded localhost:4200 fallback in production source"}
  ],
  "clean_areas": [
    "Backend source files: 100% Verifies comment coverage",
    "Frontend source files: 100% Verifies comment coverage",
    "No console.log in production source (logger abstraction used)",
    "No empty catch blocks found",
    "No hardcoded secrets found",
    "No test skips or .todo markers found",
    "No files over 500 lines",
    "Self-judging-workflow spec: 13/13 FRs traced and enforcer passes"
  ]
}
```
