---

## Quality Oracle Findings — Full Audit Report

**Date:** 2026-08-10 | **Grade: C** | **Spec Coverage at Enforcer Level: 12%** | **Estimated True Coverage: ~91%**

---

### Spec Coverage: ~91% (estimated)

| Codebase | Requirements | FRs Traced | Enforcer Checks |
|----------|-------------|-----------|-----------------|
| `Source/` (workflow engine) | FR-WF-001 to FR-WF-013 | 13 / 13 = 100% | ✅ Yes — verified |
| `portal/` (dev platform) | FR-001–069, FR-dependency-*, FR-DUP-* | ~85 / 88 = 97% (3 gaps) | ❌ Never scanned |
| `platform/` (merge pipeline) | FR-TMP-001 to FR-TMP-010 | 7 / 10 confirmed | ❌ Never scanned |

---

### QO-001 — P1 · architecture-violation
**Traceability enforcer blind to `portal/` and `platform/` — mandatory gate is a false pass**

`tools/traceability-enforcer.py` line 70 hardcodes `source_dirs = ["Source", "E2E"]`. The portal/ codebase (1,073 `Verifies:` comments, FR-001 through FR-069 + dependency FRs) and platform/ (FR-TMP-*) are **never scanned**. When run against `Plans/dev-workflow-platform/requirements.md` it reports all 34 requirements MISSING — 100% false positives. The CLAUDE.md-mandated gate (`python3 tools/traceability-enforcer.py`) silently checks only 12% of the codebase and returns PASS.

**Fix:** Add `"portal"` and `"platform/orchestrator"` to `source_dirs` in the enforcer, or read them from `inspector.config.yml`.

---

### QO-002 — P1 · architecture-violation
**Nondeterministic default plan selection when all `requirements.md` mtimes are equal**

All 8 `Plans/*/requirements.md` files share identical mtime (`Aug 10 04:02`). The enforcer's `max(req_files, key=os.path.getmtime)` is position-dependent on equal keys — which plan "wins" is filesystem- and Python-version-dependent. Different CI environments may check entirely different plans.

**Fix:** Require `--plan` or `--file` explicitly in CI. Or scan all plans in one pass.

---

### QO-003 — P2 · spec-drift
**`blocked_by` field missing from `UpdateBugInput` / `UpdateFeatureRequestInput`; `as any` cast active**

`portal/Shared/api.ts` lines 32–38 and 59–67: neither `UpdateFeatureRequestInput` nor `UpdateBugInput` includes `blocked_by?: string[]`. FR-dependency-api-types is unimplemented. The frontend `DependencyPicker.tsx` lines 291–293 casts both PATCH calls to `as any`, bypassing type safety for a core dispatch-gating feature.

**Fix:** Add `blocked_by?: string[];` to both interfaces. Remove the two `as any` casts. Escalate → TheFixer.

---

### QO-004 — P2 · spec-drift
**FR-dependency-seed unimplemented — `portal/Backend/src/database/seed.ts` does not exist**

The database directory only contains `connection.ts` and `schema.ts`. The 9 known dependency relationships (BUG-0010 blocked by 5 bugs; 3 FR cross-dependencies) cannot be seeded, leaving the dependency UI without representative data on fresh installs.

**Fix:** Create `seed.ts` with check-before-insert logic; wire into `index.ts` startup. Escalate → TheFixer.

---

### QO-005 — P2 · untested
**Two required frontend test files missing: `DependencySection.test.tsx`, `BlockedBadge.test.tsx`**

FR-dependency-frontend-tests explicitly requires both. Only `DependencyPicker.test.tsx` exists. `DependencySection` and `BlockedBadge` — components that drive the dispatch-gating UI — have zero automated test coverage. Regressions in the "Blocked By" chip, edit button, or pending_dependencies highlight would be undetected.

**Fix:** Create both test files per `Plans/dependency-linking/requirements.md` lines 64–73 with `// Verifies: FR-dependency-section` / `// Verifies: FR-dependency-blocked-badge` comments. Escalate → TheFixer / frontend-coder.

---

### QO-006 — P2 · spec-drift
**FR-TMP-006, FR-TMP-008, FR-TMP-010 have no `Verifies:` comments; `platform/` outside all enforcer scope**

FR-TMP-006 (Auto-Merge Logic), FR-TMP-008 (Worker Container Prerequisites), and FR-TMP-010 (Error Handling) have no `Verifies:` references found in `platform/orchestrator/`. The other 7 FR-TMP-* requirements do have traceability comments. The enforcer never checks `platform/` at all, so this gap is permanently invisible to CI gates.

**Fix:** Add traceability comments in `platform/orchestrator/lib/workflow-engine.js` for FR-TMP-006/010 and in `platform/Dockerfile.worker` for FR-TMP-008. **Note:** per CLAUDE.md, `platform/` changes require a solo session — never pipeline agents.

---

### QO-007 — P3 · pattern-violation
**Two files exceed 500-line split threshold**

- `portal/Backend/src/services/cycleService.ts` — **526 lines** (cycle lifecycle + pipeline linking + completion logic mixed)
- `portal/Backend/src/services/featureRequestService.ts` — **506 lines** (CRUD + voting + approval/denial + duplicate detection)

---

### QO-008 — P4 · pattern-violation
**4 `eslint-disable` suppressions active**

Three suppress `react-hooks/exhaustive-deps` (`DependencyPicker.tsx:82`, `useWorkItems.ts:63`, `useApi.ts:35`). One suppresses `no-unused-vars` in `errorHandler.ts:21` (idiomatic Express pattern — acceptable). The hooks suppressions carry stale-closure risk.

---

**Learnings updated** at `Teams/TheInspector/learnings/quality-oracle.md` with fast-lookup grep commands, structural facts, and open finding tracker for future re-verification.
