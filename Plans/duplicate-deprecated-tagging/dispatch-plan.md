# Dispatch Plan: Duplicate/Deprecated Tagging for Bugs and Feature Requests

RISK_LEVEL: medium

> New feature with new status values, 10-15 files across backend/frontend/shared, schema columns already exist, filtering and UI updates needed.

## Task Summary

Complete the implementation of duplicate/deprecated tagging for bugs and feature requests. The previous dependency-linking cycle added the types, schema columns, and partial backend support. This cycle closes the remaining gaps:

- **Backend**: Wire `duplicate_of`/`deprecation_reason` through route handlers, add `include_hidden` query param support to both list endpoints, add hidden-status filtering to FR list service
- **Frontend**: Add "Show hidden" toggle on list pages, add duplicate/deprecated banners and styling to FR list, add duplicate count badge to FR list
- **Data**: Mark FR-0008 as duplicate of FR-0009

## Gap Analysis (What Already Exists vs What's Missing)

### Already Implemented (DO NOT re-implement)
- `portal/Shared/types.ts` — `duplicate`/`deprecated` in status enums, `HIDDEN_STATUSES`, `duplicate_of`, `deprecation_reason`, `duplicated_by` fields ✅
- `portal/Shared/api.ts` — `duplicate_of`/`deprecation_reason` in `UpdateFeatureRequestInput` and `UpdateBugInput` ✅
- `portal/Backend/src/database/schema.ts` — `duplicate_of` and `deprecation_reason` columns on both tables ✅
- `portal/Backend/src/services/bugService.ts` — Full duplicate/deprecated handling in `updateBug()`, `listBugs()` has `include_hidden` filtering ✅
- `portal/Frontend/src/components/bugs/BugDetail.tsx` — Duplicate/deprecated banners and action buttons ✅
- `portal/Frontend/src/components/bugs/BugList.tsx` — Status colors, duplicate badge, opacity for hidden items ✅
- `portal/Frontend/src/api/client.ts` — `include_hidden` param support on `featureRequests.list()` and `bugs.list()` ✅

### Missing (TO BE IMPLEMENTED)

#### Backend Gaps
1. **Bug route PATCH handler** (`portal/Backend/src/routes/bugs.ts`): Does NOT destructure or pass `duplicate_of`/`deprecation_reason` from `req.body` to `updateBug()`. Currently only passes `{ title, description, severity, status, source_system, blocked_by }`.
2. **FR route PATCH handler** (`portal/Backend/src/routes/featureRequests.ts`): Does NOT destructure or pass `duplicate_of`/`deprecation_reason` from `req.body` to `updateFeatureRequest()`. Currently only passes `{ status, description, priority, blocked_by }`.
3. **FR service `updateFeatureRequest()`** (`portal/Backend/src/services/featureRequestService.ts`): Does NOT handle `duplicate_of`/`deprecation_reason` fields at all. The `UpdateFeatureRequestInput` interface is missing these fields. Needs the same validation logic as `bugService.updateBug()`: require `duplicate_of` when status=duplicate, validate reference exists, accept optional `deprecation_reason` when status=deprecated, clear fields on other transitions.
4. **Bug list route** (`portal/Backend/src/routes/bugs.ts`): GET `/` does NOT read `include_hidden` query param or pass it to `listBugs()`.
5. **FR list route** (`portal/Backend/src/routes/featureRequests.ts`): GET `/` does NOT read `include_hidden` query param.
6. **FR list service** (`portal/Backend/src/services/featureRequestService.ts`): `listFeatureRequests()` does NOT filter out hidden statuses. It has no `include_hidden` option. Needs the same filtering as `bugService.listBugs()`.

#### Frontend Gaps
7. **FeatureRequestList** (`portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`): Missing `duplicate`/`deprecated` status colors, missing opacity for hidden items, missing duplicate count badge on canonical items.
8. **FeatureRequestDetail** (`portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`): Already has action buttons and banners — **BUT** missing the duplicate banner that shows the canonical item link and the deprecated banner with reason. Wait — re-checking... Actually the detail component does NOT have the banners. It has the action buttons but no banners at the top like BugDetail does.
9. **BugReportsPage** (`portal/Frontend/src/pages/BugReportsPage.tsx`): No "Show hidden" toggle; doesn't pass `include_hidden` to `bugs.list()`.
10. **FeatureRequestsPage** (`portal/Frontend/src/pages/FeatureRequestsPage.tsx`): No "Show hidden" toggle; doesn't pass `include_hidden` to `featureRequests.list()`.

#### Data Migration
11. FR-0008 should be marked as duplicate of FR-0009 (requires a seed/migration script or API call).

## Requirements (FR IDs)

| FR ID | Description | Layer | Status |
|-------|-------------|-------|--------|
| FR-DUP-01 | Add duplicate/deprecated to status enums | Shared | ✅ Done |
| FR-DUP-02 | Add duplicate_of and deprecation_reason fields to entities | Shared+Schema | ✅ Done |
| FR-DUP-03 | Canonical items show duplicated_by list | Service | ✅ Done (both services) |
| FR-DUP-04 | PATCH accepts status=duplicate with duplicate_of, status=deprecated with deprecation_reason | Routes+Service | ⚠️ Bug service done; FR route+service missing |
| FR-DUP-05 | List endpoints exclude hidden by default, accept include_hidden=true | Routes+Service | ⚠️ Bug service done; routes + FR service missing |
| FR-DUP-06 | GET /:id always returns full item regardless of status | Routes | ✅ Done |
| FR-DUP-07 | Validate duplicate_of references exist | Service | ✅ Done (bug); Missing (FR) |
| FR-DUP-08 | Schema columns for duplicate_of and deprecation_reason | Schema | ✅ Done |
| FR-DUP-09 | Detail view: action buttons for duplicate/deprecated | Frontend | ✅ Done (both) |
| FR-DUP-10 | Detail view: banners for duplicate/deprecated items | Frontend | ✅ Bug done; FR missing banners |
| FR-DUP-11 | List view: hidden by default, toggle to show | Frontend | ⚠️ Partial — need show/hide toggle on pages |
| FR-DUP-12 | List view: duplicate count badge on canonical items | Frontend | ✅ Bug done; FR missing |
| FR-DUP-13 | Duplicate/deprecated count as resolved for dependency cascade | Service | ✅ Done |
| FR-DUP-14 | Mark FR-0008 as duplicate of FR-0009 | Data | ❌ Not done |

## Dispatch Instructions

### backend-coder-1

**Assignment**: Complete backend gaps for duplicate/deprecated support (FR-DUP-04, FR-DUP-05, FR-DUP-07)

**Files to modify**:

1. **`portal/Backend/src/routes/bugs.ts`** (lines ~80-95, PATCH handler)
   - Add `duplicate_of` and `deprecation_reason` to the destructured `req.body` fields
   - Pass them through to `updateBug(db, id, { title, description, severity, status, source_system, blocked_by, duplicate_of, deprecation_reason })`
   - In GET `/` handler, read `include_hidden` from `req.query` and pass to `listBugs(db, { status, severity, include_hidden: req.query.include_hidden === 'true' })`

2. **`portal/Backend/src/routes/featureRequests.ts`** (lines ~55-75, PATCH handler and GET `/`)
   - Add `duplicate_of` and `deprecation_reason` to the destructured `req.body` fields in PATCH
   - Pass them through to `updateFeatureRequest(db, id, { status, description, priority, blocked_by, duplicate_of, deprecation_reason })`
   - In GET `/` handler, read `include_hidden` from `req.query` and pass to `listFeatureRequests(db, { status, source, include_hidden: req.query.include_hidden === 'true' })`

3. **`portal/Backend/src/services/featureRequestService.ts`**
   - Add `include_hidden?: boolean` to `ListFeatureRequestsOptions` interface
   - Add hidden-status filtering to `listFeatureRequests()` — copy pattern from `bugService.listBugs()`:
     ```
     if (!opts.include_hidden) {
       query += ` AND status NOT IN (${HIDDEN_STATUSES.map(() => '?').join(', ')})`;
       params.push(...HIDDEN_STATUSES);
     }
     ```
   - Add `duplicate_of?: string` and `deprecation_reason?: string` to `UpdateFeatureRequestInput` interface
   - Add duplicate/deprecated handling to `updateFeatureRequest()` — copy validation pattern from `bugService.updateBug()`:
     - When `newStatus === 'duplicate'`: require `duplicate_of`, reject self-reference, validate canonical FR exists via `SELECT id FROM feature_requests WHERE id = ?`, set `duplicate_of` column, clear `deprecation_reason`
     - When `newStatus === 'deprecated'`: set `deprecation_reason` (optional), clear `duplicate_of`
     - On other status transitions: clear both fields

**Key constraint**: The STATUS_TRANSITIONS map already includes duplicate/deprecated as valid targets. The `RESOLVED_STATUSES` constant already includes them. Just need the field handling and validation.

**Tests to write**: `portal/Backend/tests/duplicate-deprecated.test.ts`
- PATCH bug with status=duplicate + duplicate_of → sets fields correctly
- PATCH bug with status=duplicate without duplicate_of → 400
- PATCH FR with status=duplicate + duplicate_of → sets fields correctly
- PATCH FR with status=deprecated + deprecation_reason → sets fields
- GET /api/bugs excludes hidden by default
- GET /api/bugs?include_hidden=true includes hidden
- GET /api/feature-requests excludes hidden by default
- GET /api/feature-requests?include_hidden=true includes hidden
- GET /api/bugs/:id returns hidden items directly
- Canonical item shows duplicated_by
- Cannot transition out of duplicate status (terminal)

**Traceability**: All tests must include `// Verifies: FR-DUP-XX` comments.

---

### frontend-coder-1

**Assignment**: Complete frontend gaps for duplicate/deprecated support (FR-DUP-10, FR-DUP-11, FR-DUP-12)

**Files to modify**:

1. **`portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`**
   - Add `duplicate` and `deprecated` to `STATUS_COLORS`:
     ```
     duplicate: 'bg-purple-100 text-purple-700',
     deprecated: 'bg-gray-200 text-gray-500',
     ```
   - Import `HIDDEN_STATUSES` from shared types
   - Add opacity class for hidden items: `${HIDDEN_STATUSES.includes(fr.status) ? "opacity-60" : ""}`
   - Add duplicate count badge (copy pattern from BugList):
     ```
     {fr.duplicated_by && fr.duplicated_by.length > 0 && (
       <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
         {fr.duplicated_by.length} duplicate{fr.duplicated_by.length > 1 ? 's' : ''}
       </span>
     )}
     ```

2. **`portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`**
   - Add duplicate banner at top of component (after opening div, before header). Copy from BugDetail:
     ```
     {fr.status === 'duplicate' && fr.duplicate_of && (
       <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
         This feature request is a duplicate of{' '}
         <Link to="/feature-requests" className="font-semibold underline hover:text-purple-900">
           {fr.duplicate_of}
         </Link>
       </div>
     )}
     ```
   - Add deprecated banner:
     ```
     {fr.status === 'deprecated' && (
       <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700">
         This feature request is deprecated.{fr.deprecation_reason ? ` Reason: ${fr.deprecation_reason}` : ''}
       </div>
     )}
     ```

3. **`portal/Frontend/src/pages/BugReportsPage.tsx`**
   - Add `showHidden` state: `const [showHidden, setShowHidden] = useState(false)`
   - Pass `include_hidden: showHidden || undefined` to `bugs.list()` in `fetchFn`
   - Add `showHidden` to useApi deps array
   - Add toggle checkbox in the filters area:
     ```
     <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
       <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
       Show hidden (duplicate/deprecated)
     </label>
     ```

4. **`portal/Frontend/src/pages/FeatureRequestsPage.tsx`**
   - Same pattern as BugReportsPage: add `showHidden` state, pass to `featureRequests.list()`, add checkbox toggle

**No new files needed** — all changes are modifications to existing components.

**Tests to write**: `portal/Frontend/tests/duplicate-deprecated-ui.test.ts` (or `.spec.ts`)
- FR list renders duplicate/deprecated status colors
- FR list shows duplicate count badge on canonical items
- FR list applies opacity to hidden items
- FR detail shows duplicate banner with link
- FR detail shows deprecated banner with reason
- Show hidden toggle fetches with include_hidden=true
- Hidden items hidden by default (verify count before/after toggle)

**Traceability**: All tests must include `// Verifies: FR-DUP-XX` comments.

---

## Data Migration: FR-0008 → Duplicate of FR-0009

After backend-coder-1 completes, the QA/integration phase should execute:
```bash
curl -X PATCH http://localhost:3001/api/feature-requests/FR-0008 \
  -H 'Content-Type: application/json' \
  -d '{"status": "duplicate", "duplicate_of": "FR-0009"}'
```

This resolves the known duplicate identified in the task requirements.

## Integration Risks

1. **FR service duplicate_of validation**: Must validate against `feature_requests` table (not `bugs`). Cross-type duplicates (bug→FR or FR→bug) are not in scope — `duplicate_of` references same-type items only.
2. **Terminal status enforcement**: The STATUS_TRANSITIONS map already blocks exits from duplicate/deprecated. The bug service has an additional guard — the FR service relies on the transition map. Both approaches work.
3. **Cascade on duplicate/deprecated**: Already handled — `RESOLVED_STATUSES` includes both, so `onItemCompleted()` cascade fires correctly.

## File Change Summary

| File | Agent | Change Type |
|------|-------|-------------|
| `portal/Backend/src/routes/bugs.ts` | backend-coder-1 | Modify (pass fields + include_hidden) |
| `portal/Backend/src/routes/featureRequests.ts` | backend-coder-1 | Modify (pass fields + include_hidden) |
| `portal/Backend/src/services/featureRequestService.ts` | backend-coder-1 | Modify (add dup/dep handling + filtering) |
| `portal/Backend/tests/duplicate-deprecated.test.ts` | backend-coder-1 | Create (new test file) |
| `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx` | frontend-coder-1 | Modify (status colors, badge, opacity) |
| `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` | frontend-coder-1 | Modify (add banners) |
| `portal/Frontend/src/pages/BugReportsPage.tsx` | frontend-coder-1 | Modify (show hidden toggle) |
| `portal/Frontend/src/pages/FeatureRequestsPage.tsx` | frontend-coder-1 | Modify (show hidden toggle) |

**Total**: ~8 files, 2 agents, medium complexity.
