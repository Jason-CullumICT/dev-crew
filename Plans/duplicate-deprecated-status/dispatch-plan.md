# Dispatch Plan: Duplicate/Deprecated Status Tagging for Bugs and Feature Requests

**Task:** Allow bugs and feature requests to be tagged as `duplicate` or `deprecated` with optional hiding from list views.

**Scope tag:** `full-stack`
**Confidence:** high
**Risk:** medium — new feature with new statuses, schema columns, endpoint changes, UI components, 10-15 files affected

RISK_LEVEL: medium

---

## Analysis

### Current State
The portal has bugs and feature requests with status enums that do not include `duplicate` or `deprecated`. There is no mechanism to mark items as duplicates of other items, or as deprecated/superseded. All items always appear in list views regardless of relevance.

Existing status enums:
- `BugStatus`: `'new' | 'triaged' | 'approved' | 'in_development' | 'resolved' | 'closed' | 'pending_dependencies'`
- `FeatureRequestStatus`: `'submitted' | 'under_review' | 'approved' | 'in_development' | 'completed' | 'closed' | 'pending_dependencies'`

### Data Model Changes

#### Schema Changes (columns added to existing tables)
```sql
-- Add to bugs table
ALTER TABLE bugs ADD COLUMN duplicate_of TEXT DEFAULT NULL;
ALTER TABLE bugs ADD COLUMN deprecation_reason TEXT DEFAULT NULL;

-- Add to feature_requests table
ALTER TABLE feature_requests ADD COLUMN duplicate_of TEXT DEFAULT NULL;
ALTER TABLE feature_requests ADD COLUMN deprecation_reason TEXT DEFAULT NULL;
```

The `duplicate_of` column stores the ID of the canonical item (e.g. `"FR-0009"`). The `deprecation_reason` column stores an optional free-text explanation.

#### Status Enum Changes
Add `'duplicate'` and `'deprecated'` to both `BugStatus` and `FeatureRequestStatus` type unions.

Update the CHECK constraints in schema.ts to include these new values.

#### Type Changes
Add to `Bug` and `FeatureRequest` interfaces:
```typescript
duplicate_of?: string | null;       // ID of canonical item (set when status is 'duplicate')
deprecation_reason?: string | null; // reason text (set when status is 'deprecated')
duplicated_by?: string[];           // IDs of items that are duplicates of this one (computed)
```

Add new API input types:
```typescript
interface MarkDuplicateInput {
  status: 'duplicate';
  duplicate_of: string;  // required — ID of canonical item
}

interface MarkDeprecatedInput {
  status: 'deprecated';
  deprecation_reason?: string;  // optional reason
}
```

### API Design

#### Modified Endpoints

**`PATCH /api/bugs/:id`** and **`PATCH /api/feature-requests/:id`**:
- Accept `status: "duplicate"` with required `duplicate_of: string` — validate that the referenced item exists
- Accept `status: "deprecated"` with optional `deprecation_reason: string`
- When setting status to `duplicate`: store `duplicate_of`, clear `deprecation_reason`
- When setting status to `deprecated`: store `deprecation_reason`, clear `duplicate_of`
- When setting any other status: clear both `duplicate_of` and `deprecation_reason`
- Validation: `duplicate_of` must reference an existing item; cannot mark as duplicate of self; cannot mark as duplicate of another duplicate (the canonical must not itself be a duplicate)

**`GET /api/bugs`** and **`GET /api/feature-requests`**:
- Add `include_hidden=true` query parameter
- By default (no param or `include_hidden=false`): exclude items with status `duplicate` or `deprecated`
- With `include_hidden=true`: return all items
- Existing `q` search parameter continues to work alongside `include_hidden`

**`GET /api/bugs/:id`** and **`GET /api/feature-requests/:id`**:
- Always return the full item regardless of status (no filtering on detail)
- Include `duplicate_of` and `deprecation_reason` fields
- Include computed `duplicated_by: string[]` — list of item IDs that have `duplicate_of` pointing to this item

### UI Design

#### Detail View — Status Banners
- **Duplicate banner**: When item has `status: 'duplicate'`, show a yellow/amber banner at the top: "This item is a duplicate of [FR-0009] Title" with the canonical item as a clickable link
- **Deprecated banner**: When item has `status: 'deprecated'`, show a grey banner at the top: "This item has been deprecated" with the reason if provided
- **Duplicated-by badge**: When the canonical item has `duplicated_by.length > 0`, show a subtle info badge: "N duplicates point to this item"

#### Detail View — Action Buttons
Below the existing header/meta section, add:
- "Mark as Duplicate" button → opens a modal/inline form with an item ID picker (search across bugs and FRs to select the canonical item). On submit, PATCH with `{ status: 'duplicate', duplicate_of: selectedId }`
- "Mark as Deprecated" button → opens a modal/inline form with an optional reason text field. On submit, PATCH with `{ status: 'deprecated', deprecation_reason: reasonText }`
- These buttons should only appear when the item is NOT already duplicate/deprecated. If it is, show the banner instead (with an "Undo" or "Restore" action to change status back)

#### List View — Filtering
- By default, items with status `duplicate` or `deprecated` are hidden from the list
- Add a toggle control (checkbox or toggle switch): "Show hidden items" or separate "Show duplicates" / "Show deprecated" checkboxes
- When toggled on, hidden items appear in the list but visually distinguished (greyed out text, strikethrough, or dimmed row)
- The toggle state is local UI state (no persistence needed)

#### List View — Duplicate Count Badge
- On canonical items (items that have `duplicated_by.length > 0`), show a small badge in the status column: e.g. "2 duplicates"

### Known Duplicates to Resolve
After implementation, the system should be used to mark:
- FR-0008 as `duplicate` of FR-0009 (FR-0008 is the basic dependency tracking; FR-0009 is the full dependency linking with dispatch gating that was implemented)

---

## Files to Create / Modify

### Shared Types (2 files)
- `portal/Shared/types.ts` — add `duplicate` and `deprecated` to status enums; add `duplicate_of`, `deprecation_reason`, `duplicated_by` fields; add `MarkDuplicateInput` and `MarkDeprecatedInput` types; add `HIDDEN_STATUSES` constant
- `portal/Shared/api.ts` — update `getBugs`/`getFeatureRequests` to accept `include_hidden` param; add `markAsDuplicate` and `markAsDeprecated` convenience functions

### Backend (4 files modified)
- `portal/Backend/src/database/schema.ts` — add `duplicate_of` and `deprecation_reason` columns to both tables; update CHECK constraints
- `portal/Backend/src/services/bugService.ts` — add filtering logic for `include_hidden`; add `duplicated_by` computation in enrichment; add validation for duplicate/deprecated status transitions
- `portal/Backend/src/services/featureRequestService.ts` — same changes as bugService
- (Routes: if routes exist as separate files they need updating too; if service methods are called directly from route handlers, the service changes cover it)

### Frontend (4 files modified, 1 new)
- `portal/Frontend/src/components/shared/DuplicateDeprecatedBanner.tsx` — **new** component for detail view banners (duplicate link banner, deprecated reason banner)
- `portal/Frontend/src/components/bugs/BugDetail.tsx` — integrate banners and action buttons for mark-as-duplicate/deprecated
- `portal/Frontend/src/components/bugs/BugList.tsx` — add hidden item filtering toggle, visual treatment for hidden items, duplicate count badge
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — same as BugDetail
- `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx` — same as BugList

---

## Verification Criteria

### Backend
- `duplicate` and `deprecated` are valid status values in both tables
- PATCH with `status: 'duplicate'` requires `duplicate_of` field, returns 400 without it
- PATCH with `status: 'duplicate', duplicate_of: 'SELF-ID'` returns 400
- PATCH with `status: 'duplicate', duplicate_of: 'NONEXISTENT'` returns 404
- PATCH with `status: 'duplicate', duplicate_of: 'ANOTHER-DUPLICATE'` returns 400 (cannot chain duplicates)
- PATCH with `status: 'deprecated'` works with or without `deprecation_reason`
- GET list endpoints exclude `duplicate` and `deprecated` items by default
- GET list endpoints with `include_hidden=true` return all items
- GET detail endpoints always return full item regardless of status
- GET detail endpoint for canonical item includes `duplicated_by` array
- Changing status away from `duplicate` clears `duplicate_of`
- Changing status away from `deprecated` clears `deprecation_reason`
- Existing dependency features continue to work (no regression)

### Frontend
- Detail view shows duplicate banner with link to canonical when status is `duplicate`
- Detail view shows deprecated banner with reason when status is `deprecated`
- Detail view has "Mark as Duplicate" and "Mark as Deprecated" action buttons
- Duplicate action opens picker to select canonical item
- Deprecated action opens form with optional reason
- List view hides duplicate/deprecated items by default
- List view toggle reveals hidden items with visual distinction
- Canonical items show duplicate count badge in list view
- All existing UI features continue to work (no regression)

---

## Dispatch Instructions

### backend-coder-1

**Task:** Implement schema changes, service logic, and API modifications for duplicate/deprecated status support.

**Instructions:**

1. **Shared Types** (`portal/Shared/types.ts`):
   - Add `'duplicate'` and `'deprecated'` to both `BugStatus` and `FeatureRequestStatus` type unions
   - Add constant:
     ```typescript
     export const HIDDEN_STATUSES: readonly string[] = ['duplicate', 'deprecated'] as const;
     ```
   - Add to `Bug` interface:
     ```typescript
     duplicate_of?: string | null;
     deprecation_reason?: string | null;
     duplicated_by: string[];
     ```
   - Add to `FeatureRequest` interface (same fields)
   - Add new types:
     ```typescript
     export interface MarkDuplicateInput {
       status: 'duplicate';
       duplicate_of: string;
     }

     export interface MarkDeprecatedInput {
       status: 'deprecated';
       deprecation_reason?: string;
     }
     ```

2. **Database Schema** (`portal/Backend/src/database/schema.ts`):
   - Add `duplicate_of TEXT DEFAULT NULL` and `deprecation_reason TEXT DEFAULT NULL` columns to the `bugs` table
   - Add `duplicate_of TEXT DEFAULT NULL` and `deprecation_reason TEXT DEFAULT NULL` columns to the `feature_requests` table
   - Update the status CHECK constraints to include `'duplicate'` and `'deprecated'` for both tables:
     - Bugs: `CHECK(status IN ('new', 'triaged', 'approved', 'in_development', 'pending_dependencies', 'resolved', 'closed', 'duplicate', 'deprecated'))`
     - Feature requests: `CHECK(status IN ('submitted', 'under_review', 'approved', 'in_development', 'pending_dependencies', 'completed', 'closed', 'duplicate', 'deprecated'))`

3. **Bug Service** (`portal/Backend/src/services/bugService.ts`):
   - Modify `listBugs` method signature to accept an `options` parameter: `listBugs(query?: string, options?: { include_hidden?: boolean })`
   - When `include_hidden` is false or absent, add `WHERE status NOT IN ('duplicate', 'deprecated')` to the query
   - Modify `updateBug` to handle new status transitions:
     - If `status === 'duplicate'`: require `duplicate_of` in the data; validate the referenced item exists (check both bugs and feature_requests tables); validate it's not self-referential; validate the canonical item is not itself a duplicate; store `duplicate_of`, set `deprecation_reason = null`
     - If `status === 'deprecated'`: store `deprecation_reason` (can be null), set `duplicate_of = null`
     - If transitioning away from `duplicate`/`deprecated`: clear both `duplicate_of` and `deprecation_reason`
   - Modify `enrichBug` to include `duplicate_of`, `deprecation_reason`, and computed `duplicated_by`:
     - `duplicated_by`: query `SELECT id FROM bugs WHERE duplicate_of = ?` UNION `SELECT id FROM feature_requests WHERE duplicate_of = ?` where `?` is the current bug's ID
   - Add `duplicate_of` and `deprecation_reason` to the UPDATE SQL statements

4. **Feature Request Service** (`portal/Backend/src/services/featureRequestService.ts`):
   - Apply all the same changes as the bug service, adapted for feature requests

5. **Route handlers** (if `portal/Backend/src/routes/` files exist — they may not in the current codebase):
   - Ensure list endpoints read `include_hidden` from query params and pass to service
   - Ensure PATCH endpoints pass `duplicate_of` and `deprecation_reason` from request body to service

6. **Seed data**: After implementation, mark FR-0008 as duplicate of FR-0009:
   - Insert or update: `UPDATE feature_requests SET status = 'duplicate', duplicate_of = 'FR-0009' WHERE id = 'FR-0008'`
   - This should be added to the seed/init logic if a seed file exists, or documented for manual execution

**Files to modify:**
- `portal/Shared/types.ts`
- `portal/Backend/src/database/schema.ts`
- `portal/Backend/src/services/bugService.ts`
- `portal/Backend/src/services/featureRequestService.ts`

**Validation:** Run existing tests to ensure no regressions. Manually verify:
- Creating a bug/FR with duplicate/deprecated status works
- List filtering excludes hidden items by default
- Detail view includes all new fields
- Validation errors return proper HTTP status codes

---

### frontend-coder-1

**Task:** Implement UI components for duplicate/deprecated banners, action buttons, list filtering, and duplicate count badges.

**Prerequisites:** Depends on backend-coder-1 completing shared types in `portal/Shared/types.ts`.

**Instructions:**

1. **API Client** (`portal/Shared/api.ts`):
   - Modify `getBugs()` to accept optional `include_hidden` parameter:
     ```typescript
     export async function getBugs(options?: { include_hidden?: boolean }): Promise<ListResponse<Bug>> {
       const params = options?.include_hidden ? '?include_hidden=true' : '';
       return request<ListResponse<Bug>>(`/bugs${params}`);
     }
     ```
   - Apply same change to `getFeatureRequests()`
   - Add convenience functions:
     ```typescript
     export async function markAsDuplicate(itemType: DependencyItemType, id: string, duplicateOf: string): Promise<Bug | FeatureRequest> {
       const route = itemTypeToRoute(itemType);
       return request(`/${route}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify({ status: 'duplicate', duplicate_of: duplicateOf }),
       });
     }

     export async function markAsDeprecated(itemType: DependencyItemType, id: string, reason?: string): Promise<Bug | FeatureRequest> {
       const route = itemTypeToRoute(itemType);
       return request(`/${route}/${encodeURIComponent(id)}`, {
         method: 'PATCH',
         body: JSON.stringify({ status: 'deprecated', deprecation_reason: reason }),
       });
     }
     ```
   - Import `MarkDuplicateInput` and `MarkDeprecatedInput` from types if used

2. **DuplicateDeprecatedBanner Component** (`portal/Frontend/src/components/shared/DuplicateDeprecatedBanner.tsx`) — **new file**:
   - Props: `status: string`, `duplicateOf?: string | null`, `deprecationReason?: string | null`, `duplicatedBy?: string[]`
   - Render conditions:
     - If `status === 'duplicate'` and `duplicateOf`: amber/yellow banner with text "This item is a duplicate of" and a clickable link to the canonical item. Infer the route from the ID prefix: `BUG-*` → `/bugs/:id`, `FR-*` → `/feature-requests/:id`
     - If `status === 'deprecated'`: grey banner with text "This item has been deprecated" and the reason if provided
     - If `duplicatedBy && duplicatedBy.length > 0`: subtle blue info badge: "{N} duplicate(s) point to this item"
   - Styled inline (consistent with existing component patterns — no CSS modules, just style objects)

3. **BugDetail Updates** (`portal/Frontend/src/components/bugs/BugDetail.tsx`):
   - Import and render `<DuplicateDeprecatedBanner>` above the description section, passing `status`, `duplicate_of`, `deprecation_reason`, `duplicated_by` from the bug data
   - Add action buttons below the header meta section (only shown when status is NOT `duplicate` or `deprecated`):
     - "Mark as Duplicate" button: on click, show an inline form or small modal with a text input for the canonical item ID (or reuse the existing `DependencyPicker` search to find items). On submit, call `markAsDuplicate('bug', bugId, selectedId)` then reload
     - "Mark as Deprecated" button: on click, show an inline form with an optional textarea for the reason. On submit, call `markAsDeprecated('bug', bugId, reason)` then reload
   - When status IS `duplicate` or `deprecated`, show a "Restore" button that PATCHes the status back to `new` (for bugs) or the previous status

4. **BugList Updates** (`portal/Frontend/src/components/bugs/BugList.tsx`):
   - Add state: `const [showHidden, setShowHidden] = useState(false)`
   - Modify the data fetch to pass `include_hidden: showHidden` to `getBugs()`
   - Re-fetch when `showHidden` changes
   - Add a toggle above the table: checkbox labeled "Show hidden (duplicate/deprecated)" that controls `showHidden`
   - For items with status `duplicate` or `deprecated`, apply dimmed/greyed styling to the row (e.g. `opacity: 0.5` or lighter text color)
   - For items with `duplicated_by.length > 0`, show a small badge next to the status: e.g. "3 duplicates" in a subtle style
   - Add status style cases for `duplicate` (amber) and `deprecated` (grey) in the status rendering

5. **FeatureRequestDetail Updates** (`portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`):
   - Same changes as BugDetail, adapted for feature requests (use `markAsDuplicate('feature_request', ...)`, default restore status is `submitted`)

6. **FeatureRequestList Updates** (`portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`):
   - Same changes as BugList, adapted for feature requests

**Files to modify:**
- `portal/Shared/api.ts`
- `portal/Frontend/src/components/shared/DuplicateDeprecatedBanner.tsx` (new)
- `portal/Frontend/src/components/bugs/BugDetail.tsx`
- `portal/Frontend/src/components/bugs/BugList.tsx`
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`
- `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`

**Validation:** Verify:
- Banners render correctly for duplicate and deprecated items
- Action buttons open forms and submit correctly
- List views hide duplicate/deprecated by default
- Toggle reveals hidden items with visual distinction
- Duplicate count badges appear on canonical items
- No regression on existing dependency UI features

---

### qa-tester-1

**Task:** Write integration tests for the duplicate/deprecated status feature covering API, service, and UI behavior.

**Prerequisites:** Depends on both backend-coder-1 and frontend-coder-1 completing their work.

**Instructions:**

1. **API / Service Tests**:
   - Test PATCH to set `status: 'duplicate'` with valid `duplicate_of` → succeeds, stores correctly
   - Test PATCH to set `status: 'duplicate'` without `duplicate_of` → returns 400
   - Test PATCH to set `status: 'duplicate'` with `duplicate_of` pointing to self → returns 400
   - Test PATCH to set `status: 'duplicate'` with `duplicate_of` pointing to non-existent item → returns 404
   - Test PATCH to set `status: 'duplicate'` with `duplicate_of` pointing to another duplicate → returns 400
   - Test PATCH to set `status: 'deprecated'` with reason → succeeds
   - Test PATCH to set `status: 'deprecated'` without reason → succeeds
   - Test PATCH to restore a duplicate item to normal status → clears `duplicate_of`
   - Test PATCH to restore a deprecated item to normal status → clears `deprecation_reason`
   - Test GET list without `include_hidden` → does not include duplicate/deprecated items
   - Test GET list with `include_hidden=true` → includes all items
   - Test GET detail of duplicate item → returns full item with `duplicate_of`
   - Test GET detail of canonical item → includes `duplicated_by` array listing all duplicates
   - Test cross-type duplicates (bug duplicate of FR, FR duplicate of bug)
   - Test the FR-0008 → FR-0009 known duplicate is seeded correctly

2. **UI Tests**:
   - Detail view renders duplicate banner with canonical link when status is `duplicate`
   - Detail view renders deprecated banner with reason when status is `deprecated`
   - Detail view shows action buttons for non-hidden items
   - Detail view shows restore button for hidden items
   - List view hides duplicate/deprecated items by default
   - List view toggle reveals hidden items
   - Hidden items in list have dimmed visual treatment
   - Canonical items show duplicate count badge

3. **Edge Cases**:
   - Marking an item as duplicate that has its own duplicates (chain prevention)
   - Marking an item as duplicate when it is a dependency blocker (should still work — status is independent of dependency system)
   - include_hidden parameter combined with search query `q`
   - Large number of duplicates pointing to one canonical item

**Files:**
- `portal/Backend/src/__tests__/duplicate-deprecated.test.ts` (new)
- `portal/Frontend/src/__tests__/duplicate-deprecated.test.tsx` (new)

**Validation:** All tests pass, no regressions in existing test suites.
