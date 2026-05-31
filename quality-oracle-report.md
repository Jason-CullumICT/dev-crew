---

## Quality Oracle Findings

**Audit Date:** 2026-05-31  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Mode:** Full static audit (no prior P1/P2 findings to re-verify — first run)

---

### Spec Coverage Summary

| Source Tree | Spec Family | FRs in Spec | FRs Traced in Code | Coverage |
|-------------|-------------|-------------|-------------------|----------|
| `Source/` | Self-Judging Workflow Engine | 13 (FR-WF-*) | 13 | **100%** ✅ |
| `Source/` | Dependency Linking (WF layer) | 15 (FR-dependency-*) | 15 | **100%** ✅ |
| `portal/` | Dev Workflow Platform (FR-001..069) | 69 | ~67 | **~97%** ⚠️ |
| `portal/` | Orchestrated Dev Cycles (FR-033..049) | 19 | 19 | **100%** ✅ |
| `portal/` | Dev Cycle Traceability (FR-050..069) | 20 | 19 | **95%** ⚠️ |
| `platform/` | Tiered Merge Pipeline (FR-TMP-*) | 10 | 9 | **90%** ⚠️ |

**Enforcer gate result today:** `python3 tools/traceability-enforcer.py` → **PASS** (misleading — see QO-001 below)

---

### QO-001: Traceability Enforcer Is Blind to `portal/`
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py:~10` — `source_dirs = ["Source", "E2E"]`
- **Detail:** The enforcer hardcodes its scan to `Source/` and `E2E/`. The main product app — implementing FR-001 through FR-069+, FR-DUP-*, FR-dependency-* — lives in `portal/`. Running the enforcer against any portal-based plan (`dev-workflow-platform`, `orchestrated-dev-cycles`, `dependency-linking`, `dev-cycle-traceability`) reports **100% failure with every FR listed as MISSING** — all false negatives. The verifier appears to PASS in CLAUDE.md's verification gate only because the default plan selection picks the most-recently-modified `requirements.md`, which happens to be `Plans/self-judging-workflow/requirements.md` — a Source/-based plan. This creates a **permanently green quality gate that enforces only 13 of 80+ active requirements**.
- **Recommendation:** Add `"portal"` to `source_dirs` in `tools/traceability-enforcer.py`. Also add `portal/Backend/tests/` and `portal/Frontend/tests/` to `inspector.config.yml` `source.test_dirs`.
- **Cross-ref:** Affects all portal plans; escalate to solo session (portal changes are allowed there)

---

### QO-002: `FR-dependency-api-types` — `blocked_by` Missing from Shared API Types
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `portal/Shared/api.ts:32` (`UpdateFeatureRequestInput`), `portal/Shared/api.ts:59` (`UpdateBugInput`)
- **Detail:** Per `FR-dependency-api-types`, both update input types must include `blocked_by?: string[]`. Neither does. As a result, `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293` must use `as any` casts to pass the dependency payload in PATCH calls — a direct architecture violation ("Shared types are single source of truth — no inline type re-definitions"). TypeScript cannot catch malformed dependency PATCH bodies at compile time.
- **Recommendation:**
  ```ts
  // portal/Shared/api.ts
  export interface UpdateFeatureRequestInput {
    ...existing fields...
    blocked_by?: string[];   // FR-dependency-api-types
  }
  export interface UpdateBugInput {
    ...existing fields...
    blocked_by?: string[];   // FR-dependency-api-types
  }
  ```
  Then remove the `as any` casts on lines 291/293 of `DependencyPicker.tsx`.
- **Cross-ref:** Route to TheFixer (backend-coder for api.ts, frontend-coder for picker)

---

### QO-003: `FR-dependency-seed` — Idempotent Dependency Seed Data Not Implemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` — `seed.ts` does not exist
- **Detail:** `FR-dependency-seed` requires an idempotent seed function that inserts 8 known blocking relationships on startup (BUG-0010 blocked_by BUG-0003–0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003). No `seed.ts` exists in `portal/Backend/src/database/`, and `portal/Backend/src/index.ts` contains no seeding call. Fresh deployments show zero dependency relationships — the acceptance criteria for this requirement cannot be met.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent seeding logic; call it from `index.ts` after `initializeSchema()`.
- **Cross-ref:** Route to TheFixer (backend-coder)

---

### QO-004: `FR-dependency-frontend-tests` — Two Portal Test Files Missing
- **Severity:** P2
- **Category:** untested / spec-drift
- **File:** `portal/Frontend/tests/BlockedBadge.test.tsx` (missing), `portal/Frontend/tests/DependencySection.test.tsx` (missing)
- **Detail:** `FR-dependency-frontend-tests` requires `BlockedBadge.test.tsx` and `DependencySection.test.tsx` in `portal/Frontend/tests/`. `DependencyPicker.test.tsx` exists there (321 lines) but the other two are absent. **Note:** Both files *do* exist in `Source/Frontend/tests/components/` for the self-judging-workflow app, but not for the portal app. The acceptance criteria specifically requires portal-layer tests with `// Verifies: FR-dependency-section` and `// Verifies: FR-dependency-blocked-badge` comments.
- **Recommendation:** Create `portal/Frontend/tests/BlockedBadge.test.tsx` and `portal/Frontend/tests/DependencySection.test.tsx` mirroring the Source/ implementations but targeting portal components.
- **Cross-ref:** Route to TheFixer (frontend-coder)

---

### QO-005: `FR-TMP-008` Untraced + No `requirements.md` for Tiered Merge Pipeline
- **Severity:** P3
- **Category:** spec-drift
- **File:** `platform/orchestrator/lib/workflow-engine.js`, `platform/orchestrator/lib/config.js`
- **Detail:** FR-TMP-001–007, 009, 010 all have `// Verifies:` comments in platform/. FR-TMP-008 (Worker Container Prerequisites — `gh` CLI in Dockerfile.worker, Playwright installable on demand) has no traceability comment anywhere. Additionally, `Plans/tiered-merge-pipeline/` contains no `requirements.md`, so the traceability enforcer can never be pointed at this plan to verify coverage.
- **Recommendation:** Add `// Verifies: FR-TMP-008` to the relevant section of `platform/Dockerfile.worker`. Create `Plans/tiered-merge-pipeline/requirements.md` (can be minimal — just list FR-TMP-001..010 so the enforcer can target it).
- **Cross-ref:** platform/ is solo-session only (pipeline agents must not touch it)

---

### QO-006: `eslint-disable` Suppressions in Production Frontend Source
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line react-hooks/exhaustive-deps`. Architecture rules flag disabled linting rules. These suppressions can mask stale-closure bugs where hooks read outdated values because a missing dependency isn't refreshing the effect.
- **Recommendation:** Audit both suppression sites — either fix the dependency array to include the missing dep (and verify no infinite loops), or document explicitly why the dep is intentionally excluded with a comment justifying it.
- **Cross-ref:** Route to TheFixer

---

### QO-007: Inspector Config `source.dirs` and `test_dirs` Missing `portal/`
- **Severity:** P3
- **Category:** doc-stale / architecture-violation
- **File:** `Teams/TheInspector/inspector.config.yml:42-46`
- **Detail:** `source.dirs` lists only `["Source/"]` and `test_dirs` lists `["Source/Backend/tests/", "Source/Frontend/tests/"]`. The portal app is the larger and older of the two products, yet it is invisible to any inspector scan that relies on this config. Performance profiler, dependency auditor, and chaos monkey all derive their scope from this config.
- **Recommendation:** Add `"portal/"` to `source.dirs`; add `"portal/Backend/tests/"` and `"portal/Frontend/tests/"` to `test_dirs`.

---

### QO-008: Build/Config Files Without Traceability (Infrastructure — Acceptable)
- **Severity:** P4
- **Category:** pattern-violation (minor)
- **File:** `Source/E2E/playwright.pipeline.config.ts`, `Source/Frontend/vite.config.ts`, `Source/Frontend/src/vite-env.d.ts`
- **Detail:** All three were modified in the last 14 days and contain zero `// Verifies:` comments. All are build infrastructure files (Playwright runner config, Vite build config, TypeScript env declaration stub) — not business logic. This is P4 / acceptable but noted for completeness.
- **Recommendation:** No action required unless the team wants to add a token comment for completeness.

---

### Overall Grade: **B**

| Dimension | Result |
|-----------|--------|
| P1 findings | 0 |
| P2 findings | 4 (QO-001..004) |
| P3 findings | 3 (QO-005..007) |
| Min spec coverage (portal) | ~97% |
| Enforcer gate | ⚠️ Structurally misleading |

**Grade rationale:** Zero P1s and solid spec coverage in all three source trees earn a B. The grade is held at B (not A) by QO-001 — a structural quality gate failure that makes the enforcer's green signal unreliable for 80% of the codebase. Until `portal/` is added to the enforcer scan, drift can accumulate silently. QO-002, QO-003, and QO-004 are concrete unfulfilled requirements from the dependency-linking plan's own implementation delta.

---

### JSON Summary

```json
{
  "audit_date": "2026-05-31",
  "grade": "B",
  "spec_coverage": {
    "source_wf": "100%",
    "source_dependency": "100%",
    "portal_platform": "~97%",
    "platform_tmp": "90%"
  },
  "findings": [
    {"id":"QO-001","severity":"P2","category":"architecture-violation","title":"Traceability enforcer blind to portal/","file":"tools/traceability-enforcer.py"},
    {"id":"QO-002","severity":"P2","category":"spec-drift","title":"FR-dependency-api-types: blocked_by missing from UpdateBugInput/UpdateFeatureRequestInput","file":"portal/Shared/api.ts:32,59"},
    {"id":"QO-003","severity":"P2","category":"spec-drift","title":"FR-dependency-seed: seed.ts does not exist","file":"portal/Backend/src/database/"},
    {"id":"QO-004","severity":"P2","category":"untested","title":"FR-dependency-frontend-tests: BlockedBadge.test.tsx and DependencySection.test.tsx missing in portal","file":"portal/Frontend/tests/"},
    {"id":"QO-005","severity":"P3","category":"spec-drift","title":"FR-TMP-008 untraced; no requirements.md for tiered-merge-pipeline plan","file":"platform/Dockerfile.worker"},
    {"id":"QO-006","severity":"P3","category":"pattern-violation","title":"eslint-disable suppressions in production frontend source","file":"Source/Frontend/src/hooks/useWorkItems.ts:63,Source/Frontend/src/components/DependencyPicker.tsx:82"},
    {"id":"QO-007","severity":"P3","category":"doc-stale","title":"Inspector config source.dirs missing portal/","file":"Teams/TheInspector/inspector.config.yml:42-46"},
    {"id":"QO-008","severity":"P4","category":"pattern-violation","title":"Build/config files without Verifies comments","file":"Source/E2E/playwright.pipeline.config.ts"}
  ],
  "enforcer_status": "WARNING: enforcer passes by default but only covers Source/ (13 WF requirements); portal/ (70+ FRs) is unscanned",
  "open_plan_gaps": ["FR-dependency-api-types","FR-dependency-seed","FR-dependency-frontend-tests (portal)","FR-TMP-008"]
}
```

---

**Learnings file updated:** `Teams/TheInspector/learnings/quality-oracle.md`
