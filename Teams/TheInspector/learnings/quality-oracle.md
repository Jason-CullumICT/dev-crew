# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-28 — Grade D

### Spec Coverage Trend
- First baseline audit. Coverage: **0%** of `Specifications/` FRs (69 total).
- Plans-level coverage (self-judging-workflow): **100%** (13/13).
- Trend: N/A (baseline).

### Key Structural Discoveries

#### 1. Two-layer requirement hierarchy
- `Specifications/` holds canonical domain specs (FR-001–FR-069 in `dev-workflow-platform.md`) — these describe the INTENDED long-term platform.
- `Plans/*/requirements.md` holds feature-level requirements with `FR-WF-*` and `FR-dependency-*` IDs — these describe what agents ACTUALLY built.
- The traceability enforcer (`tools/traceability-enforcer.py`) only checks Plans-level, not Specifications-level. So the enforcer always passes while canonical spec drift is invisible.

#### 2. Namespace map (as of 2026-11-28)
| Namespace | Defined in | Verified in source |
|-----------|-----------|-------------------|
| `FR-001`–`FR-069` | `Specifications/dev-workflow-platform.md` | ❌ Zero references |
| `FR-WF-001`–`FR-WF-013` | `Plans/self-judging-workflow/requirements.md` | ✅ Full coverage |
| `FR-dependency-*` | `Plans/dependency-linking/requirements.md` | ✅ Full coverage |
| `FR-WF-010`, `FR-WF-011` | Plans (self-judging-workflow) | ✅ Covered in frontend tests |

#### 3. Fast-path files for future audits
- **Canonical spec**: `Specifications/dev-workflow-platform.md` — 69 FRs, FR-001..069
- **Active plan reqs**: `Plans/self-judging-workflow/requirements.md` (most recently checked by enforcer)
- **Dep plan reqs**: `Plans/dependency-linking/requirements.md`
- **Traceability enforcer**: `tools/traceability-enforcer.py` — `python3 tools/traceability-enforcer.py`
- **Backend source**: `Source/Backend/src/` — routes, services, store, models, middleware
- **Frontend source**: `Source/Frontend/src/` — pages, components, hooks, api
- **Backend tests**: `Source/Backend/tests/routes/`, `Source/Backend/tests/services/`, `Source/Backend/tests/store/`
- **Frontend tests**: `Source/Frontend/tests/` and `Source/Frontend/tests/pages/`

#### 4. Known open issues (as of 2026-11-28)
- **QO-001 (P1)**: Canonical specs unmaintained — `Specifications/dev-workflow-platform.md` describes a different system.
- **QO-002 (P2)**: Enforcer scope must be widened to cover `Specifications/`.
- **QO-003 (P2)**: FR ID namespaces disconnected.
- **QO-004 (P2)**: `search.test.ts` tests an unimplemented `GET /api/search` route — known failing.
- **QO-005 (P2)**: `Source/E2E/package.json` test script is `echo "Error: no test specified" && exit 1` — no actual E2E tests.
- **QO-006 (P2)**: 11 frontend source files missing `// Verifies:` comments.
- **QO-007 (P3)**: Missing tests: Layout, PriorityBadge, StatusBadge, TypeBadge, useDashboard, useWorkItems, DebugPortalPage.
- **QO-008 (P3)**: `eslint-disable` in DependencyPicker.tsx:82 and useWorkItems.ts:63.
- **QO-009 (P3)**: Hardcoded `localhost:4200` fallback in DebugPortalPage.tsx:5.

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` — recurring, check on every audit
- Hardcoded localhost fallback URLs in frontend pages
- Frontend component files missing Verifies comments (pages/components/hooks)

### Useful Grep Patterns
```bash
# Find all canonical spec FRs
grep -oP "FR-\d+" Specifications/dev-workflow-platform.md | sort -u

# Find all source Verifies comments
grep -rn "Verifies:" Source/ | grep -oP "FR-[A-Za-z0-9\-]+" | sort -u

# Find recently modified source files
git log --since="14 days ago" --name-only --pretty=format: -- Source/ | grep -v "^$" | sort -u

# Find files with no Verifies
grep -rL "Verifies:" Source/Frontend/src/**/*.{ts,tsx}

# Check eslint-disable
grep -rn "eslint-disable" Source/Frontend/src/

# Run traceability enforcer
python3 tools/traceability-enforcer.py
```
