# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-06-22

### Spec Coverage Trend

| Scope | FRs Defined | FRs Traced | Coverage |
|-------|------------|------------|----------|
| Source/ (workflow-engine FR-WF-*) | 13 | 13 | 100% ✅ |
| portal/ (dev-workflow-platform FR-001–069) | 69 | 69 | 100% ✅ (enforcer blind) |
| portal/ (FR-dependency-*) | 16 | 13 | 81% ⚠ (3 items outstanding) |
| platform/ (FR-TMP-001–010) | 10 | 10 | 100% ✅ (enforcer blind) |

**Overall**: ~102/108 requirements traced (94%). Enforcer can only verify Source/ scope (13/13).

---

## Critical Architecture Facts

- **Two separate applications**: `Source/` is the self-judging workflow engine (FR-WF-*); `portal/` is the dev-workflow-platform (FR-001–069)
- **Traceability enforcer is hardcoded to `Source/` and `E2E/`** — never scans `portal/` or `platform/`
- **Default enforcer run targets last-modified requirements.md** in Plans/ — currently resolves to `Plans/self-judging-workflow/requirements.md`
- All 7 non-self-judging-workflow plans will FAIL the enforcer when explicitly targeted (but not because of missing traceability — because the portal/ is not scanned)

## Useful File Paths

| Path | Content |
|------|---------|
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 — only plan that passes enforcer |
| `Plans/dependency-linking/requirements.md` | FR-dependency-* — 3 items still open (api-types, seed, frontend-tests) |
| `portal/Shared/api.ts` | UpdateBugInput and UpdateFeatureRequestInput — missing blocked_by field |
| `portal/Backend/src/database/` | Only connection.ts + schema.ts; seed.ts is MISSING |
| `portal/Frontend/tests/` | DependencySection.test.tsx and BlockedBadge.test.tsx are MISSING |
| `Source/Backend/src/metrics.ts` | Has 3 of 4 FR-dependency-metrics; missing dependencyCheckDuration histogram |
| `Source/Frontend/tests/` | Duplicate test files: top-level WorkItemDetailPage/ListPage AND pages/ subdirectory versions |

## Common Pattern Violations Found

- FR-dependency-* ID collision: Source/ claims FR-dependency-* IDs defined for portal/
- Enforcer regex false positives: data entity references (FR-0002, etc.) and spec range text (FR-070—FR-085) extracted as requirement IDs from Plans/dependency-linking/requirements.md
- ESLint suppressions without justification: DependencyPicker.tsx:82 and useWorkItems.ts:63

## Recommendations for Faster Future Audits

1. Add `portal/` to enforcer `source_dirs` — this alone would fix the 7 failing plans
2. Run enforcer with `--plan self-judging-workflow` to avoid the non-deterministic default
3. Check `Plans/dependency-linking/requirements.md` Implementation Delta table for open items first
4. The `FR-XXX` in Plans/dev-cycle-traceability/requirements.md is a template placeholder — not a real requirement ID
