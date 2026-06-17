# Verify Reporter Learnings

## 2026-04-15 — FIX-001: Cross-entity image deletion verification

### Where the fix lives
The image delete fix is in `portal/Backend/`, NOT `Source/Backend/`. The `portal/Backend` directory has its own test suite using **Vitest** (`npm test` runs `vitest run`), separate from the Workflow Engine backend in `Source/Backend/` which uses Jest.

### Test execution
- `portal/Backend`: run `npm install && npm test` from `portal/Backend/` — uses Vitest
- `Source/Backend`: run `npm install && npm test` from `Source/Backend/` — uses Jest
- `Source/Frontend`: run `npm install && npm test` from `Source/Frontend/` — uses Vitest
- Neither directory has `node_modules` pre-installed in this environment — always run `npm install` first

### Pre-existing failures in Source/Backend
`tests/routes/search.test.ts` has 5 failing tests (search route returns 404 — route not yet implemented). This is NOT caused by the image delete fix and was pre-existing.

### Traceability enforcer
Run from repo root: `python3 tools/traceability-enforcer.py`
- Scans `Source/` and `E2E/` only — does NOT scan `portal/`
- Changes in `portal/Backend/` don't affect traceability results

### Fix verification checklist for FIX-001
- `portal/Backend/src/services/imageService.ts` line 120-141: `deleteImage()` now has 4 params (db, imageId, entityId, entityType)
- Cross-entity check at line 132: throws AppError(403) if `row.entity_id !== entityId || row.entity_type !== entityType`
- Audit-level WARN log at line 133 captures both requested and actual entity info
- `portal/Backend/src/routes/bugs.ts` line 208: passes `id, 'bug'` to `deleteImage()`
- `portal/Backend/src/routes/featureRequests.ts` line 333: passes `id, 'feature_request'` to `deleteImage()`
- Tests: `imageService.test.ts`, `imageRoutes.test.ts`, `images.test.ts` all include `// Fixes: FIX-001` tags

### Architecture note
The `portal/` directory is infrastructure that pipeline agents must not touch, but the fix was in `portal/Backend/` as an application fix. The ownership verification was applied cleanly at the service layer — routes just needed to pass `id` from `req.params` through.
