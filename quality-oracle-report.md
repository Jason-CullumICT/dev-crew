## Quality Oracle Audit — 2026-11-13 · Grade: **C**

---

### Spec Coverage

| Scope | Coverage |
|-------|----------|
| `Plans/self-judging-workflow` (13 FRs) | ✅ 100% |
| `Plans/dependency-linking` (FR-dependency-*) | ✅ ~100% |
| 5 other APPROVED plans | ❌ 0% — gaps not caught by CI gate |
| `Specifications/` directory (77 FRs) | ❌ 0% — entirely outside enforcer scope |

**Effective CI-gate coverage: 100% of one plan. Effective full-project coverage: ~22%.**

---

### Findings (8 total)

#### 🔴 P1 — QO-001: Traceability Enforcer Defaults to Single Plan
**File:** `tools/traceability-enforcer.py:46`

The CLAUDE.md verification gate runs `python3 tools/traceability-enforcer.py` with no args. The enforcer selects the **most recently modified** `requirements.md` in `Plans/` — currently `self-judging-workflow`. Seven other plans are silently skipped every gate run. Five have `## Verdict: APPROVED` with real missing implementations:
- `dev-cycle-traceability`: FR-068, FR-069 missing
- `duplicate-deprecated-status`: FR-DUP-11..13 missing
- `orchestrated-dev-cycles`: FR-048, FR-049 missing
- `orchestrator-cycle-dashboard`: FR-075, FR-076 missing
- `image-upload`: FR-070..FR-085+ missing

**Fix:** Add an `--all` flag to run against every plan, and invoke it in the CLAUDE.md gate.

---

#### 🔴 P1 — QO-002: `Specifications/` Has Zero Traceability Enforcement
**Files:** `Specifications/dev-workflow-platform.md` (77 FRs), `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010)

CLAUDE.md calls `Specifications/` *"the most critical documents"* and mandates that implementation traces to specs. The enforcer only scans `Plans/` — never `Specifications/`. Zero of the 77 FRs in the main spec file have any `// Verifies:` coverage.

Additionally: `Specifications/dev-workflow-platform.md` describes a **different product** (SQLite-backed feature-request platform) from what's in `Source/` (in-memory workflow engine). These specs either need to be marked `superseded` or they represent genuine unimplemented scope — there's currently no way to tell.

**Fix:** Classify each spec with a status field (`active | superseded | roadmap`). Extend enforcer to cover active specs.

---

#### 🟠 P2 — QO-003: Route Handlers Import Store Directly — Architecture Violation
**Files:** `routes/workflow.ts:15`, `routes/intake.ts:4`, `routes/workItems.ts:12`

All three import `* as store from '../store/workItemStore'` and call store functions directly. Architecture rule: *"No direct DB calls from route handlers — use the service layer."* The store is the persistence tier; routes should only speak to services.

**Fix:** Extract `workItemService.ts` and `intakeService.ts` facades; routes call service functions only.

---

#### 🟠 P2 — QO-004: Silent Error Swallow in Frontend API Client
**File:** `Source/Frontend/src/api/client.ts:26`

```ts
const body = await response.json().catch(() => ({}));
```

Silently returns `{}` on JSON parse failure (e.g., 502 HTML error page). Architecture rule: *"Never swallow errors silently."*

**Fix:** Log + re-throw, or add an explicit comment documenting the intentional suppression.

---

#### 🟠 P2 — QO-005: Enforcer Extracts FR IDs from Prose — False Positives
**File:** `tools/traceability-enforcer.py:60`

Regex `FR-[A-Z0-9-]+` matches ALL occurrences in files, including data-example IDs in table cells (e.g., dependency-linking mentions `FR-0002`..`FR-0007` as seed **item IDs**, not requirement IDs). Teams learn to ignore enforcer failures — which is how real gaps go unnoticed.

**Fix:** Restrict extraction to the first column of Markdown tables (`^\|\s*FR-…\s*\|`). Skip template placeholders (`FR-X+`).

---

#### 🟡 P3 — QO-006: OpenTelemetry Tracing Not Implemented
No `@opentelemetry/*` imports anywhere in `Source/`. CLAUDE.md mandates OTel HTTP instrumentation and W3C `traceparent` propagation. Logging ✅ and Prometheus metrics ✅ are implemented; tracing is the gap.

---

#### 🟡 P3 — QO-007: `eslint-disable` in Two React Hooks
`useWorkItems.ts:63` and `DependencyPicker.tsx:82` silence `react-hooks/exhaustive-deps`. Each needs either the missing dependency added or a comment explaining the intentional omission.

---

#### ⚪ P4 — QO-008: Infrastructure Files Without Test Coverage
`app.ts`, `errorHandler.ts`, `logger.ts`, `WorkItem.ts`, `utils/id.ts`, `utils/logger.ts` have no test files. Highest risk: `utils/id.ts` (ID uniqueness) and `errorHandler.ts` (response shape correctness).

---

### Clean Checks ✅
No violations found in: `console.log` usage · hardcoded secrets · API `{data: T[]}` response wrappers · files >500 lines · stale TODO/FIXME comments · backend empty-catch blocks

---

Report saved to: `Teams/TheInspector/findings/audit-2026-11-13-C.md`
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
