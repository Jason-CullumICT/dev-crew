## Quality Oracle Audit — 2026-11-26

**Grade: C** | Plans-level spec coverage: **96.5%** (28/29) | All-scopes coverage: **27.2%** (28/103)

---

### Findings — 8 total (2 P1, 3 P2, 3 P3)

---

#### 🔴 QO-001 — P1 | Traceability Enforcer Regex Excludes All Lowercase FR IDs
**File:** `tools/traceability-enforcer.py` ~line 65

The enforcer regex `FR-[A-Z0-9-]+` only matches uppercase characters. All 16 requirements in `Plans/dependency-linking` use the `FR-dependency-*` format (lowercase), so they are **silently skipped**. Instead, the enforcer picks up seed-data identifiers like `FR-0002` from prose in the requirements file, producing 7 false-positive failures. Net effect: `--plan dependency-linking` exits with code 1 for the wrong reason while the real 16 requirements go unchecked.

**Fix:** Change regex to `FR-[A-Za-z0-9-]+`

---

#### 🔴 QO-002 — P1 | `GET /api/search` Not Registered — Tests Will Fail
**File:** `Source/Backend/tests/routes/search.test.ts` + `Source/Backend/src/app.ts`

`FR-dependency-search` requires `GET /api/search`. The test file itself documents the gap at lines 1–7: *"these tests will FAIL until the route is implemented."* No `app.use('/api/search', ...)` exists in `app.ts`. CI will produce test failures.

**Escalate → TheFixer**

---

#### 🟠 QO-003 — P2 | Routes Bypass Service Layer (Architecture Violation)
**Files:** `workItems.ts`, `workflow.ts`, `intake.ts` — routes directly call `store.*`

CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* These 3 route files import and call `store.createWorkItem`, `store.findById`, `store.updateWorkItem`, `store.softDelete` directly (10+ call sites in `workflow.ts` alone). The service layer is used correctly everywhere else.

**Escalate → TheFixer**

---

#### 🟠 QO-004 — P2 | `Specifications/` Has 74 FRs with 0% Traceability
**File:** `Specifications/dev-workflow-platform.md` (FR-001 to FR-069)

74 functional requirements covering feature requests, bug reports, development cycles, pipeline orchestration, and SQLite — none appear in any `// Verifies:` comment in `Source/`. The enforcer never targets `Specifications/`. Either the spec is superseded (and needs archiving) or it represents unstarted work. Either way, it's invisible and creates false coverage confidence.

---

#### 🟠 QO-005 — P2 | `eslint-disable` Suppressing Hook Dependency Warnings
**Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` without justification comments, risking stale closures. CLAUDE.md prohibits suppressing lint rules.

---

#### 🟡 QO-006 — P3 | Silent JSON Parse Failure in `api/client.ts`
**File:** `Source/Frontend/src/api/client.ts:26`

`.catch(() => ({}))` swallows JSON parse errors silently. If the backend returns a non-JSON error (e.g., HTML 502), the thrown `Error` will have message `undefined`. Violates the "never swallow errors silently" rule.

---

#### 🟡 QO-007 — P3 | `dependency-linking` Status Table References Stale `portal/` Paths
**File:** `Plans/dependency-linking/requirements.md` lines 38–53

The status table marks `FR-dependency-frontend-tests` as ❌ Missing, but `DependencySection.test.tsx` and `BlockedBadge.test.tsx` both exist under `Source/Frontend/tests/components/`. Written for the old `portal/` path, not updated after migration.

---

#### 🟡 QO-008 — P3 | Enforcer is Single-Plan — Multi-Plan Coverage Drops Silently
**File:** `tools/traceability-enforcer.py` lines 36–40

Default mode selects only the most-recently-modified `requirements.md`. With 19 plans in the repo, any new plan creation silently drops all prior plans from the enforcement gate. Full fix: aggregate all `Plans/*/requirements.md` in one pass.

---

**Report saved to:** `Teams/TheInspector/findings/audit-2026-11-26-quality-oracle.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
