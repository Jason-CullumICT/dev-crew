# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-09-25

### Spec Coverage Summary
- **Active plan (self-judging-workflow)**: 13/13 requirements traced — ✅ PASS
- **All plans combined**: 7/8 plans FAIL traceability — 124+ unimplemented requirements across other plans
- Plans with failures: dependency-linking (7), dev-cycle-traceability (21), dev-workflow-platform (34), duplicate-deprecated-status (15), image-upload (21), orchestrated-dev-cycles (18), orchestrator-cycle-dashboard (8)

### Key Learnings

1. **Traceability enforcer uses most-recently-modified plan**: Running `python3 tools/traceability-enforcer.py` picks the most recently modified `requirements.md` by default. In this codebase, `self-judging-workflow` is that file — and it passes. But 7 other plans fail. Teams can falsely believe they've passed traceability checks.

2. **FR-dependency-search is a known gap with deliberate test documentation**: `Source/Backend/tests/routes/search.test.ts` opens with a note that the route is NOT wired to `app.ts` — tests intentionally fail to document the gap. `DependencyPicker.tsx` calls `workItemsApi.searchItems()` which hits `/api/search` (unregistered), but the catch block silently swallows the error. This means dependency typeahead search returns empty results without any user feedback.

3. **OpenTelemetry is specified but not implemented**: CLAUDE.md requires OTel tracing with traceparent header propagation. The current logger (`Source/Backend/src/utils/logger.ts`) has no OTel integration — no trace/span ID injection. This is an architecture rule violation.

4. **Logger has no development pretty-printing**: CLAUDE.md says "pretty-printing in development". The logger always emits JSON regardless of NODE_ENV.

5. **Duplicate frontend test files**: Both `tests/WorkItemDetailPage.test.tsx` and `tests/pages/WorkItemDetailPage.test.tsx` exist (same for WorkItemListPage). They test the same components with different mock setups. The `tests/pages/` versions are more complete.

6. **Two-logger pattern**: `Source/Backend/src/logger.ts` wraps `utils/logger.ts` to provide a compat interface accepting `{msg, ...ctx}` objects. Routes import from `src/logger.ts`; tests and utilities use `utils/logger.ts` directly. Both are valid but the split can confuse newcomers.

### Useful File Paths
- Requirements enforcer: `tools/traceability-enforcer.py`
- All plan requirements: `Plans/*/requirements.md`
- Logger implementation: `Source/Backend/src/utils/logger.ts` (core), `Source/Backend/src/logger.ts` (compat wrapper)
- Search gap: `Source/Backend/tests/routes/search.test.ts` (documents the gap), `Source/Frontend/src/components/DependencyPicker.tsx:54` (caller)
- App route registration: `Source/Backend/src/app.ts`

### Spec Coverage Trend
- First audit — baseline established
