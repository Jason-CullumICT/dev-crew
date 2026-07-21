## Quality Oracle Findings — 2026-07-21

**Grade: B** · 1 P1 · 4 P2 · 2 P3

---

### Spec Coverage

| Scope | FRs | Covered | % |
|-------|-----|---------|---|
| `self-judging-workflow` plan (Source/) | 13 | 13 | **100%** ✅ |
| `dev-workflow-platform` spec (portal/) | 74 real* | 74 | **100%** ✅ |
| **Enforcer default view (gate as written)** | 13 | 13 | **~15% of total** ⚠️ |

\*`FR-0004`, `FR-0007` in the spec are seed-data item IDs, not requirement IDs — enforcer regex matches them as false positives.

---

### Findings

**QO-001 (P1 · spec-drift) — Enforcer blind to `portal/`**  
`tools/traceability-enforcer.py:75` — `source_dirs = ["Source", "E2E"]` never scans `portal/`. Running the enforcer against `Specifications/dev-workflow-platform.md` reports **76 MISSING** even though 74/76 are fully implemented in `portal/`. Fix: add `"portal"` to `source_dirs`.

**QO-002 (P2 · spec-drift) — Gate only ever checks one plan**  
`tools/traceability-enforcer.py:57` — The CLAUDE.md gate runs with no args, always selecting `self-judging-workflow/requirements.md` (highest mtime). Five other plans fail when explicitly targeted. Fix: gate should iterate all `Plans/*/requirements.md` or accept `--all`.

**QO-003 (P2 · spec-drift) — FR-dependency-* IDs don't match spec's FR-070–085**  
`Plans/dependency-linking/requirements.md:6` — Plan says spec reference is FR-070–FR-085, but no code uses those IDs. Enforcer reports FR-070 and FR-085 permanently MISSING. Fix: either rename spec IDs or add a mapping table.

**QO-004 (P2 · untested) — 3 portal files lack `// Verifies:` comments**  
`portal/Backend/src/routes/teamDispatches.ts`, `portal/Frontend/src/pages/TeamsPage.tsx`, `portal/Frontend/src/components/common/RepoSelector.tsx` — unlinked implementations.

**QO-005 (P2 · architecture-violation) — Silent `catch {}` in `cycleService.ts:103`**  
`portal/Backend/src/services/cycleService.ts:103` — JSON.parse failure swallowed with no documentation. Architecture rule: every catch must re-throw, log, or explicitly document suppression.

**QO-006 (P3 · architecture-violation) — `eslint-disable` without rationale**  
`Source/Frontend/src/hooks/useWorkItems.ts:63` and `DependencyPicker.tsx:82` — two `react-hooks/exhaustive-deps` suppressions with no comment explaining why they're safe.

**QO-007 (P3 · untested) — `DebugPortalPage.tsx` modified recently, no traceability**  
`Source/Frontend/src/pages/DebugPortalPage.tsx:1` — modified in the last 14 days; uses informal comment instead of `// Verifies: FR-XXX`.

---

Report saved to `Teams/TheInspector/findings/audit-2026-07-21-quality-oracle.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
