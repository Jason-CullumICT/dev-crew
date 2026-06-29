## Quality Oracle Findings — 2026-06-29

**Grade: C** | 2 P1 · 5 P2 · 4 P3 · 2 P4

---

### Spec Coverage: 91%

| Plan / Spec | FRs | Traced | Coverage |
|-------------|-----|--------|----------|
| `self-judging-workflow` (FR-WF-*) | 13 | 13 | ✅ 100% |
| `dev-workflow-platform.md` (FR-001–FR-069) | 69 | 69 | ✅ 100% |
| `dependency-linking` (FR-dependency-*) | 16 | 14 | ⚠️ 87.5% |
| `duplicate-deprecated-status` (FR-DUP-*) | 13 | 13 | ✅ 100% |
| `image-upload` (FR-070–FR-089) | 20 | 20 | ✅ 100% |
| `tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | 🔴 0% |
| **Total** | **141** | **129** | **91%** |

> ⚠️ `python3 tools/traceability-enforcer.py` currently reports **100% PASSED** — but only checks 13 of 141 FRs.

---

### P1 Findings

**QO-001: Traceability Enforcer Blind to `portal/`**  
`tools/traceability-enforcer.py` scans only `["Source", "E2E"]`. The `portal/` directory holds 113 TypeScript files implementing the primary product spec (FR-001 to FR-069 + 50 additional FRs). None are checked. The enforcer also auto-selects the most-recently-modified `requirements.md`, silently skipping the image-upload, dependency-linking, orchestrator-cycle-dashboard, and duplicate-deprecated-status plans entirely. **Fix:** add `portal` to scan dirs and run enforcer against each plan explicitly.

**QO-002: Duplicate FR IDs — FR-070 to FR-076 Collision**  
`Plans/orchestrator-cycle-dashboard/requirements.md` and `Plans/image-upload/requirements.md` assign identical IDs to completely different features (e.g., `FR-070` = "OrchestratorCyclesPage" in one, = "ImageAttachment shared type" in the other). Every `// Verifies: FR-070` comment in source is now ambiguous. **Fix:** renumber one plan to a prefixed scheme (e.g., `FR-OCD-001`).

---

### P2 Findings

**QO-003: Ghost FR-090 — No Spec Definition**  
7 source locations in `portal/Frontend/src/components/orchestrator/types.ts` and `portal/Frontend/src/api/client.ts` reference `FR-090`, which exists in no spec or plan file. Likely a mis-labelled `FR-TMP-009`.

**QO-004: FR-dependency-api-types — Still Open**  
`portal/Shared/api.ts` `UpdateBugInput` / `UpdateFeatureRequestInput` still lack `blocked_by?: string[]`. `DependencyPicker.tsx:291,293` still uses `as any` casts. Plan's own delta table flagged this ❌ Missing; re-verified today — unchanged.

**QO-005: FR-dependency-seed — Still Open**  
`portal/Backend/src/database/seed.ts` does not exist. Plan's delta table flagged it ❌ Missing; still absent.

**QO-006: FR-TMP-001–FR-TMP-010 — 0% Traced**  
The entire tiered-merge-pipeline spec (risk classification, Playwright E2E runner, auto-PR, AI review, auto-merge) has zero `// Verifies: FR-TMP-*` comments anywhere in tracked source. May live in `platform/` (excluded from all tooling).

**QO-007: Malformed ID `FR-0001` in `portal/Frontend/src/api/client.ts:227`**  
Should be `FR-001`. Will be treated as an unknown ID if the enforcer is ever expanded to scan portal/.

---

### P3 / P4 Findings

| ID | Sev | File | Issue |
|----|-----|------|-------|
| QO-008 | P3 | `portal/Backend/src/routes/teamDispatches.ts` | No Verifies comments, no spec backing for team-dispatch history endpoint |
| QO-009 | P3 | `portal/Frontend/src/components/common/RepoSelector.tsx`, `portal/Frontend/src/pages/TeamsPage.tsx` | No Verifies, no tests for TeamsPage |
| QO-010 | P3 | `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63` | `eslint-disable react-hooks/exhaustive-deps` without justification |
| QO-011 | P4 | `Source/Shared/api-contracts.md:5` | Status says "WIP — dependency tracking"; dependency tracking is complete |
| QO-012 | P4 | `Source/Frontend/src/api/client.ts:26` | `.catch(() => ({}))` silently swallows JSON parse errors |

---

Full report saved to: `Teams/TheInspector/findings/audit-2026-06-29-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
