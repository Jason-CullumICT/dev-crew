# Backend Fixer Learnings

## 2026-04-15 — FIX-001: Cross-entity image deletion (portal/Backend)

### Fix Applied
**Security bug:** `deleteImage()` in `imageService.ts` accepted only `imageId` — no entity ownership check.
Both DELETE routes in `bugs.ts` and `featureRequests.ts` called `deleteImage(db, imageId)` ignoring the `:id` URL param.

### Solution Pattern
1. **Service layer first**: Add `entityId: string, entityType: ImageEntityType` to `deleteImage()` signature.
2. Query the image row, compare `row.entity_id !== entityId || row.entity_type !== entityType`, throw `AppError(403, ...)` on mismatch.
3. Log the blocked attempt at WARN level with full context (both requested and actual entity info) for audit trail.
4. **Route handlers**: Extract `id` from `req.params`, pass as third/fourth args to `deleteImage`.
5. **Update ALL call sites**: There were TWO test files that called `deleteImage` — `imageService.test.ts` AND `images.test.ts`. Both needed updating.

### Pitfalls Encountered
- `tests/images.test.ts` was a separate test file that also used the old `deleteImage(db, id)` 2-arg signature. Running the full suite (not just the target test files) revealed the additional failures.
- Always run the full `npm test` in the project root after changes, not just targeted test files — there may be sibling test files that cover the same service.

### Test Framework
- `portal/Backend` uses **Vitest** (not Jest). Use `npm test` (runs `vitest run`) in that directory.
- Do NOT run `npx vitest` globally — it installs a different version. Use the local install via `npm test`.

### Traceability
- New tests tagged with `// Fixes: FIX-001`
- Existing tests updated with `// Fixes: FIX-001` comment on the changed lines
- Traceability enforcer scans `Source/` and `E2E/` — changes in `portal/` are not scanned by the enforcer, so no traceability issues arise.

### Architecture Notes
- The fix plan referred to `portal/Backend/` not `Source/Backend/` — always read fix-plan.md to determine actual file paths.
- Error message intentionally generic: `"Image does not belong to this entity"` — avoids leaking entity details in the error body.
- 403 Forbidden (not 404) is correct for ownership violations — per security best practice and fix plan specification.
