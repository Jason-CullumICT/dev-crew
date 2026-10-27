# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-10-27 — First audit (self-judging-workflow + dependency-tracking)

### Key File Paths for Faster Future Audits

| Purpose | Path |
|---------|------|
| Active requirements (FR-WF-*) | `Plans/self-judging-workflow/requirements.md` |
| Dependency requirements (FR-dependency-*) | `Plans/dependency-linking/requirements.md` |
| Traceability enforcer target | Reads `Plans/self-judging-workflow/requirements.md` |
| Spec for current Source app | `Specifications/workflow-engine.md` |
| Legacy/portal spec (NOT Source/) | `Specifications/dev-workflow-platform.md` |
| Prometheus metrics | `Source/Backend/src/metrics.ts` |
| App route registration | `Source/Backend/src/app.ts` |
| Frontend tests | `Source/Frontend/tests/*.test.tsx` |

### Architecture Observations

1. **Traceability enforcer reads Plans/, not Specifications/**. The enforcer scans `Plans/self-judging-workflow/requirements.md` for FR IDs, not `Specifications/`. This means spec coverage % from the enforcer reflects Plans coverage, not Specification coverage. Always cross-check both.

2. **Two incompatible spec namespaces coexist in `Specifications/`**:
   - `workflow-engine.md` → implemented in `Source/` (FR-WF-* IDs live in Plans/)
   - `dev-workflow-platform.md` → for the legacy `portal/` app (FR-001 — FR-069 + FR-dependency-*) — **NOT in Source/**

3. **FR-dependency-* IDs span both apps**. The portal had FR-dependency-* and the Source/workflow-engine also adopted FR-dependency-* IDs for its own dependency feature. The traceability comment namespace is shared but the implementations are separate apps. Don't confuse them.

4. **Search route gap is intentional-but-unfinished**. `Source/Backend/tests/routes/search.test.ts` documents its own gap ("tests will FAIL until the route is implemented"). The `GET /api/search` route must be created and registered in `app.ts`.

5. **`dependency_check_duration` histogram is specified but not implemented**. The spec requires 4 metrics; only 3 counters are present in `metrics.ts`. The histogram for dependency check duration is missing.

6. **Dedicated component test files are required but missing**. `FR-dependency-frontend-tests` requires `DependencySection.test.tsx` and `BlockedBadge.test.tsx` as standalone files; only `integration.test.tsx` covers these indirectly.

### Spec Coverage Trend

| Date | Coverage | P1s | P2s | Grade |
|------|----------|-----|-----|-------|
| 2026-10-27 | 93% (27/29) | 0–1 | 3 | B |

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` without rationale (useWorkItems.ts, DependencyPicker.tsx)
- `DebugPortalPage.tsx` uses informal Verifies comment without an FR ID
- Spec document (`workflow-engine.md`) is prose-only with no embedded FR IDs

### Useful Grep Patterns

```bash
# Find all Verifies comments in source
grep -rn "Verifies:" Source/

# Find all FR IDs used in source
grep -rn "FR-WF-\|FR-dependency-" Source/ | grep "Verifies:"

# Check for missing route registrations
grep -n "app.use\|app.get\|app.post" Source/Backend/src/app.ts

# Check for console.log violations
grep -rn "console\." Source/Backend/src/ Source/Frontend/src/
```
