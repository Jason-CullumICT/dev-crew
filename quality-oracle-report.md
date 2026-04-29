---

## Quality Oracle Findings

**Grade: C** | 1 P1 · 6 P2 · 3 P3 · 2 P4

---

### Spec Coverage

| Requirement Set | Total | Traced | Coverage |
|----------------|-------|--------|----------|
| FR-WF-001..013 (workflow engine, enforced by tool) | 13 | 13 | **100%** |
| FR-dependency-* (Source/ scope, comment-only) | 13 | 12 | **92%** |
| FR-TMP-001..010 (tiered-merge-pipeline, platform/ scope) | 10 | 0 | 0% (different codebase) |
| FR-001..069 (dev-workflow-platform, portal/ scope) | 69 | 0 | 0% (different codebase) |

The three specs in `Specifications/` target three separate codebases. Source/-scoped coverage is **96%**. The traceability enforcer passes cleanly for its FR-WF-* scope.

---

### Findings

#### **QO-001 · P1 · spec-drift** — `GET /api/search` not wired into app.ts
- `Source/Backend/src/app.ts` has no `searchRouter` mount
- `Source/Backend/tests/routes/search.test.ts:1-6` explicitly documents: *"These tests will FAIL until the route is implemented"*
- The `DependencyPicker` typeahead (`searchItems()`) is completely non-functional in production
- **Fix:** Implement the search route handler, register at `app.use('/api/search', searchRouter)` → **TheFixer**

#### **QO-002 · P2 · architecture-violation** — OTel tracing absent from Source/Backend
- Both CLAUDE.md and FR-WF-013 mandate OpenTelemetry distributed tracing
- No `@opentelemetry/*` imports exist in `Source/Backend/src/` (only transitive dep in lockfile)
- No spans, no `traceparent` header propagation → **TheFixer**

#### **QO-003 · P2 · spec-drift** — `dependencyCheckDuration` histogram missing
- FR-dependency-metrics requires 4 metrics; `Source/Backend/src/metrics.ts` has 3
- Missing: `dependency_check_duration` histogram (latency of readiness checks)
- → **TheFixer**: Add `Histogram` to `metrics.ts`, instrument `computeHasUnresolvedBlockers` and `isReady`

#### **QO-004 · P2 · spec-drift** — Portal: `UpdateBugInput`/`UpdateFeatureRequestInput` missing `blocked_by?`
- `portal/Shared/api.ts` both interfaces lack `blocked_by?: string[]`
- Forces `as any` casts at `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`
- Documented open in `Plans/dependency-linking/requirements.md` → **TheFixer**

#### **QO-005 · P2 · spec-drift** — Portal: `seed.ts` not created
- `portal/Backend/src/database/` has `connection.ts` and `schema.ts` only — no `seed.ts`
- FR-dependency-seed requires idempotent dependency seeding on startup → **TheFixer**

#### **QO-006 · P2 · untested** — Portal: `DependencySection.test.tsx` + `BlockedBadge.test.tsx` missing
- Two component test files mandated by FR-dependency-frontend-tests do not exist
- `DependencyPicker.test.tsx` ✅ exists; the other two ❌ do not → **TheFixer**

#### **QO-007 · P2 · spec-drift** — `pending_dependencies` status absent; dispatch-gating deviates from spec
- FR-dependency-dispatch-gating spec: *"status becomes `pending_dependencies`"* when blockers block approval
- Source/ implementation: item stays `approved`, `/dispatch` returns HTTP 400 instead
- No `PendingDependencies` value in `WorkItemStatus` enum; UI shows blocked items as `approved` with no visual indicator → Either add the status or formally document the deviation in the spec → **TheFixer** (cross-layer: Shared + Backend + Frontend)

#### **QO-008 · P3 · process** — Traceability enforcer doesn't cover FR-dependency-*
- Tool only checks 13 FR-WF requirements; FR-dependency-* (13 more) are comment-only
- Add `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` to verification gates

#### **QO-009 · P3 · spec-drift** — FR-TMP-001..010 entirely untracked
- `Specifications/tiered-merge-pipeline.md` has 10 requirements targeting `platform/` orchestrator
- Zero `// Verifies: FR-TMP-*` comments anywhere; implementation status unknown → Solo-session audit of `platform/`

#### **QO-010 · P3 · pattern-violation** — `eslint-disable-next-line react-hooks/exhaustive-deps` in production code
- `Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63`
- Stale closure risk; neither suppression has a rationale comment → **TheFixer**

#### **QO-011 · P4** — Duplicate logger modules (`logger.ts` + `utils/logger.ts`)
#### **QO-012 · P4** — `portal/Frontend/.../DependencyPicker.tsx:288` has `// Verifies: FR-0001` (should be `FR-dependency-picker`)

---

Findings saved to `Teams/TheInspector/findings/audit-2026-04-29-C.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
