---

## Quality Oracle Findings — 2026-05-16

**Overall Grade: C** · P1: 1 · P2: 3 · P3: 6

---

### Spec Coverage

| Spec / Plan | Reqs | Enforcer Coverage | Actual Coverage |
|---|---|---|---|
| `workflow-engine.md` (FR-WF-001…013) | 13 | ✅ 100% | 100% |
| `dev-workflow-platform.md` (FR-001…069) | 69 | ❌ 0%* | ~100% in `portal/` |
| `dependency-linking` (FR-dependency-*) | 16 | 0%* | 81% (3 open) |
| `tiered-merge-pipeline.md` (FR-TMP-001…010) | 10 | 0% | unknown (platform/) |

\* enforcer blind to `portal/`

---

### Findings

#### 🔴 QO-001 — P1: Traceability Enforcer Blindspot (`portal/` Unscanned)
**File:** `tools/traceability-enforcer.py:68`

The enforcer only scans `["Source", "E2E"]`. The main application (`portal/Backend/`, `portal/Frontend/`) — which implements FR-001 through FR-069 and all dependency/image/dup requirements — is completely invisible to it. Running the enforcer against `dev-workflow-platform` returns **34 false failures**; running it without `--plan` auto-selects `self-judging-workflow` (13 FRs) and reports PASSED, giving false confidence.

**Fix:** Add `"portal"` to `source_dirs` in the enforcer and to `inspector.config.yml`.

---

#### 🟠 QO-002 — P2: FR-dependency-api-types Still Open (`blocked_by` Missing)
**Files:** `portal/Shared/api.ts:32-67` · `portal/Frontend/src/components/shared/DependencyPicker.tsx:291-293`

`UpdateBugInput` and `UpdateFeatureRequestInput` lack `blocked_by?: string[]`. DependencyPicker uses `as any` cast workaround. This was marked ❌ Missing in the plan delta table — still true today.

**Fix:** Add `blocked_by?: string[];` to both interfaces; remove the `as any` casts.

---

#### 🟠 QO-003 — P2: FR-dependency-seed Still Open (No `seed.ts`)
**File:** `portal/Backend/src/database/` (contains only `connection.ts` + `schema.ts`)

The idempotent seed file wiring in the 8 known dependency relationships was never created. Fresh instances have no demo data for the DependencySection UI.

---

#### 🟠 QO-004 — P2: FR-dependency-frontend-tests — Two Portal Tests Missing
**File:** `portal/Frontend/tests/` (no `DependencySection.test.tsx`, no `BlockedBadge.test.tsx`)

`Source/Frontend/tests/components/` has copies, but those test the workflow-engine app's components — not the portal's canonical versions at `portal/Frontend/src/components/shared/`.

---

#### 🟡 QO-005 — P3: Specifications Not Updated (50+ Implemented FRs Absent)
**File:** `Specifications/dev-workflow-platform.md` (ends at FR-069)

Image upload (FR-070…095), duplicate/deprecated status (FR-DUP-01…13), and dependency tracking (FR-dependency-*) are shipped but not in the canonical spec. The project rule "specs are source of truth" is violated — the spec is ~40% behind the implementation.

---

#### 🟡 QO-006 — P3: DB Connection Acquired in Route Handlers (51 occurrences, 9 files)
All `portal/Backend/src/routes/*.ts` files call `getDb()` in route handlers and pass the connection to services. Architecture rule: "No direct DB calls from route handlers." The SQL stays in services (good), but routes shouldn't own DB acquisition.

---

#### 🟡 QO-007 — P3: FR-TMP-001…010 — Zero Traceability in Any Scanned Dir
The tiered-merge-pipeline spec (10 requirements) has no `// Verifies: FR-TMP-*` comments anywhere in `Source/` or `portal/`. Likely in `platform/` (unscanned by design). Coverage is completely dark.

---

#### 🟡 QO-008 — P3: Dependency Components Duplicated Across Both Apps
`DependencySection.tsx`, `BlockedBadge.tsx`, `DependencyPicker.tsx`, and `dependency.ts` exist in **both** `Source/` and `portal/`. The workflow-engine spec doesn't define a dependency feature. The `Source/` copies are unspecified scope additions.

---

#### 🟡 QO-009 — P3: Five Production Files Exceed 500 Lines
`FeatureRequestDetail.tsx` (550), `BugDetail.tsx` (546), `cycleService.ts` (526), `portal/Frontend/src/api/client.ts` (525), `featureRequestService.ts` (506).

---

#### 🟡 QO-010 — P3: `eslint-disable` in 2 Production Files
`Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63` suppress `react-hooks/exhaustive-deps`. Both files were modified in the last 14 days.

---

**Report saved to:** `Teams/TheInspector/findings/audit-2026-05-16-C.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`

**Priority escalation path:**
- **QO-001** (P1 enforcer fix) → TheFixer, one-line change to `traceability-enforcer.py`
- **QO-002/003/004** (P2 open dependency requirements) → TheFixer, portal scope
- **QO-005** (spec staleness) → requirements-reviewer, solo session on `Specifications/`
