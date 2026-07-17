## Quality Oracle Audit — 2026-07-17 | Grade: **B**

### Spec Coverage

| Scope | FRs | Covered | % |
|---|---|---|---|
| `Plans/self-judging-workflow` | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking` | 16 | 16 | **100%** ✅ |
| `Specifications/tiered-merge-pipeline.md` | 10 | 0 | **0%** ❌ |
| `Specifications/dev-workflow-platform.md` | 69+ | 0 | **0%** ⚠️ (portal/ app) |
| `Specifications/workflow-engine.md` | 0 IDs | N/A | — |

---

### 7 Findings (ranked by severity)

**QO-001 · P1 · spec-drift** — `tools/traceability-enforcer.py`
The CI gate (`python3 tools/traceability-enforcer.py`) only reads the most-recently-modified `Plans/*/requirements.md` and only scans `Source/`. It **never touches `Specifications/*.md`**. Running the enforcer against `Specifications/tiered-merge-pipeline.md` exits 1 with 13 MISSING; against `dev-workflow-platform.md`, 76 MISSING — but the default gate reports PASS. Spec drift in Specifications/ is invisible to the gate.

**QO-002 · P2 · spec-drift** — `Specifications/tiered-merge-pipeline.md`
All 10 FR-TMP-001–010 requirements (risk classification, E2E generation, auto-PR, AI review, auto-merge) have zero `// Verifies:` comments anywhere in `Source/`. Features live in `platform/orchestrator` but carry no traceability link back to the spec.

**QO-003 · P2 · test-coverage** — `Source/Frontend/tests/WorkItemDetailPage.test.tsx`
Two root-level test files (`WorkItemDetailPage.test.tsx`, `WorkItemListPage.test.tsx`) are stale duplicates of more comprehensive versions in `tests/pages/`. The root version still mocks `assess: vi.fn()` — an action removed from the UI — indicating it's no longer maintained. Both run in CI, creating false coverage confidence.

**QO-004 · P2 · architecture-violation** — `Source/Backend/src/routes/workItems.ts:12`
Route handlers `workItems.ts` and `workflow.ts` import directly from `../store/workItemStore`, bypassing the service layer. Architecture rule: "No direct DB calls from route handlers — use the service layer." Validation logic (lines 87–117) is not unit-testable independently of HTTP.

**QO-005 · P3 · pattern-violation** — `Source/Frontend/src/components/DependencyPicker.tsx:82`
Two `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions (`DependencyPicker.tsx:82`, `useWorkItems.ts:63`) have no comment explaining why the dep array is intentionally incomplete. Risk of stale closures.

**QO-006 · P3 · spec-drift** — `Specifications/workflow-engine.md`
The spec uses narrative prose and tables with no `FR-XXX` identifiers. It covers the entire work item domain (the primary product implemented in `Source/`) but is completely untraceable by the enforcer.

**QO-007 · P3 · spec-drift** — `Specifications/dev-workflow-platform.md`
The enforcer `source_dirs` include only `Source/` — `portal/` is never scanned. FR-001–069 for the portal app are permanently invisible to the gate regardless of coverage in `portal/`.

---

### Clean Patterns ✅
Console.log absent from production source · No hardcoded secrets · No skipped tests · All catch blocks log+respond · 34/35 source files have `Verifies:` comments · 169 test cases · List endpoints all use `{data: T[]}` wrapper

**Findings file:** `Teams/TheInspector/findings/audit-2026-07-17-B.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
