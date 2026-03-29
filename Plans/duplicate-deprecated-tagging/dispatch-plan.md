# Dispatch Plan: Duplicate & Deprecated Tagging for Bugs and Feature Requests

**Task:** Allow bugs and feature requests to be tagged as duplicate or deprecated with optional hiding from list views.

**Scope tag:** `fullstack`
**Confidence:** high
**Risk:** medium — new feature with schema changes, new API behavior, and frontend UI updates across ~15 files

RISK_LEVEL: medium

---

## Analysis

### Current State
The portal has bugs and feature requests with existing status enums. There is no mechanism to mark items as duplicates of other items or as deprecated/superseded. All items appear in list views regardless of relevance.

### What This Feature Adds
1. Two new status values: `duplicate` and `deprecated`
2. New fields: `duplicate_of`, `deprecation_reason`, `duplicated_by[]`
3. API support for setting these statuses with validation
4. Default hiding of duplicate/deprecated items from list endpoints (`include_hidden=true` to show)
5. UI for marking items, displaying banners, and toggling visibility
6. Resolution of known duplicate: FR-0008 superseded by FR-0009

---

## Specification: Type Changes

### Shared Types (`portal/Shared/types.ts`)

```typescript
// Add to existing BugStatus / FeatureRequestStatus enums:
type BugStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'duplicate' | 'deprecated';
type FeatureRequestStatus = 'open' | 'in-progress' | 'completed' | 'closed' | 'duplicate' | 'deprecated';

// Add to Bug and FeatureRequest interfaces:
interface Bug {
  // ... existing fields ...
  duplicate_of?: string;        // ID of canonical bug (e.g. "BUG-0012")
  deprecation_reason?: string;  // reason for deprecation
  duplicated_by?: string[];     // IDs of bugs that are duplicates of this one
}

interface FeatureRequest {
  // ... existing fields ...
  duplicate_of?: string;        // ID of canonical FR (e.g. "FR-0009")
  deprecation_reason?: string;
  duplicated_by?: string[];
}
```

### API Input Types (`portal/Shared/api.ts`)

```typescript
interface MarkDuplicateInput {
  status: 'duplicate';
  duplicate_of: string;  // required — ID of the canonical item
}

interface MarkDeprecatedInput {
  status: 'deprecated';
  deprecation_reason?: string;  // optional reason
}
```

---

## Specification: Database Schema Changes

### `portal/Backend/src/database/schema.ts`

Add columns to both bugs and feature_requests tables:
- `duplicate_of TEXT NULL` — references another item's ID
- `deprecation_reason TEXT NULL` — free-text reason for deprecation

The `duplicated_by` field is computed at query time (reverse lookup), not stored.

---

## Specification: API Contracts

### PATCH `/api/bugs/:id` and PATCH `/api/feature-requests/:id`

**New accepted payloads:**

Mark as duplicate:
```json
{
  "status": "duplicate",
  "duplicate_of": "BUG-0005"
}
```
- Validates that `duplicate_of` references an existing item of the same type
- Validates that `duplicate_of` does not point to self
- Validates that `duplicate_of` target is not itself a duplicate (no chains)
- Clears `deprecation_reason` if previously set

Mark as deprecated:
```json
{
  "status": "deprecated",
  "deprecation_reason": "Superseded by FR-0009"
}
```
- `deprecation_reason` is optional
- Clears `duplicate_of` if previously set

Reopen (un-duplicate / un-deprecate):
```json
{
  "status": "open"
}
```
- Clears both `duplicate_of` and `deprecation_reason`

**Error responses:**
- `400` — missing `duplicate_of` when status is `duplicate`
- `404` — `duplicate_of` target does not exist
- `422` — `duplicate_of` points to self or to another duplicate

### GET `/api/bugs` and GET `/api/feature-requests`

**New query parameter:** `include_hidden=true`

- Default behavior (no param or `include_hidden=false`): exclude items where status is `duplicate` or `deprecated`
- `include_hidden=true`: return all items including duplicates and deprecated
- Each returned canonical item includes `duplicated_by: string[]` (list of IDs that point to it)

### GET `/api/bugs/:id` and GET `/api/feature-requests/:id`

- Always returns the full item regardless of status
- Includes `duplicate_of`, `deprecation_reason`, and `duplicated_by` fields as applicable

---

## Specification: UI Requirements

### Detail View (`BugDetail.tsx` / `FeatureRequestDetail.tsx`)

1. **Status banners:**
   - Duplicate: yellow/amber banner — "This item is a duplicate of [ID]" with clickable link to canonical item
   - Deprecated: grey banner — "This item is deprecated. Reason: {reason}" (or "No reason given")

2. **Action buttons** (in status/actions area):
   - "Mark as Duplicate" button → opens modal/popover with:
     - ID picker/search field to select canonical item (same type only)
     - Confirm button
   - "Mark as Deprecated" button → opens modal/popover with:
     - Optional reason text field
     - Confirm button
   - Both buttons hidden if item is already duplicate or deprecated
   - "Reopen" or "Restore" button shown if item IS duplicate or deprecated

3. **Duplicated-by badge** on canonical items:
   - Show subtle badge/chip: "N duplicates" linking to or listing the duplicate IDs

### List View (`BugList.tsx` / `FeatureRequestList.tsx`)

1. **Default behavior:** items with status `duplicate` or `deprecated` are hidden
2. **Toggle control:** checkbox or toggle — "Show hidden items" (or separate "Show duplicates" / "Show deprecated")
   - Recommended: single "Show hidden" toggle for simplicity
   - Toggle adds `include_hidden=true` query param to API call
3. **Visual treatment of hidden items when shown:**
   - Reduced opacity or strikethrough text to visually distinguish from active items
   - Status badge shows "Duplicate" or "Deprecated" in muted color
4. **Duplicate count badge** on canonical items in list view

---

## Known Duplicate Resolution

After implementation is complete, mark FR-0008 as deprecated with:
```json
{
  "status": "duplicate",
  "duplicate_of": "FR-0009"
}
```
This should be done as a data migration or seed update, not as a one-off API call.

---

## Files to Create or Modify

### Backend (7 files)
| File | Action |
|------|--------|
| `portal/Shared/types.ts` | Modify — add statuses, fields |
| `portal/Shared/api.ts` | Modify — add input types |
| `portal/Backend/src/database/schema.ts` | Modify — add columns |
| `portal/Backend/src/routes/bugs.ts` | Modify — handle new statuses, include_hidden |
| `portal/Backend/src/routes/featureRequests.ts` | Modify — handle new statuses, include_hidden |
| `portal/Backend/src/services/bugService.ts` | Modify — filtering, validation, duplicated_by |
| `portal/Backend/src/services/featureRequestService.ts` | Modify — filtering, validation, duplicated_by |

### Frontend (4 files)
| File | Action |
|------|--------|
| `portal/Frontend/src/components/bugs/BugDetail.tsx` | Modify — banners, action buttons, duplicated_by |
| `portal/Frontend/src/components/bugs/BugList.tsx` | Modify — hide toggle, visual treatment |
| `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` | Modify — banners, action buttons, duplicated_by |
| `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx` | Modify — hide toggle, visual treatment |

### Tests (4 files)
| File | Action |
|------|--------|
| `portal/Backend/src/routes/bugs.test.ts` | Create/modify — test new PATCH payloads, include_hidden |
| `portal/Backend/src/routes/featureRequests.test.ts` | Create/modify — test new PATCH payloads, include_hidden |
| `portal/Backend/src/services/bugService.test.ts` | Create/modify — test filtering, validation |
| `portal/Backend/src/services/featureRequestService.test.ts` | Create/modify — test filtering, validation |

**Total: ~15 files**

---

## Verification Criteria

### Backend
- `PATCH /api/bugs/:id` with `status: "duplicate", duplicate_of: "BUG-001"` succeeds and persists
- `PATCH /api/bugs/:id` with `status: "duplicate"` (no duplicate_of) returns 400
- `PATCH /api/bugs/:id` with `duplicate_of` pointing to self returns 422
- `PATCH /api/bugs/:id` with `duplicate_of` pointing to nonexistent item returns 404
- `GET /api/bugs` excludes duplicate/deprecated items by default
- `GET /api/bugs?include_hidden=true` includes all items
- `GET /api/bugs/:id` returns full item regardless of status
- Canonical items include `duplicated_by` array
- Same tests pass for feature-requests endpoints
- FR-0008 is correctly marked as duplicate of FR-0009 in seed data

### Frontend
- Detail view shows correct banner for duplicate items with link to canonical
- Detail view shows correct banner for deprecated items with reason
- Mark as Duplicate flow works with ID picker
- Mark as Deprecated flow works with optional reason
- List view hides duplicate/deprecated items by default
- Show hidden toggle reveals hidden items with visual distinction
- Canonical items show duplicate count badge

---

## Dispatch Instructions

### backend-coder-1

**Task:** Implement shared types, database schema changes, and all backend API logic for duplicate/deprecated tagging.

**Instructions:**

1. **Shared types** (`portal/Shared/types.ts`):
   - Add `'duplicate'` and `'deprecated'` to `BugStatus` and `FeatureRequestStatus` type unions
   - Add optional fields `duplicate_of?: string`, `deprecation_reason?: string`, `duplicated_by?: string[]` to `Bug` and `FeatureRequest` interfaces

2. **API types** (`portal/Shared/api.ts`):
   - Add `MarkDuplicateInput` interface: `{ status: 'duplicate'; duplicate_of: string }`
   - Add `MarkDeprecatedInput` interface: `{ status: 'deprecated'; deprecation_reason?: string }`

3. **Database schema** (`portal/Backend/src/database/schema.ts`):
   - Add `duplicate_of TEXT NULL` column to bugs and feature_requests tables
   - Add `deprecation_reason TEXT NULL` column to both tables

4. **Services** (`portal/Backend/src/services/bugService.ts` and `featureRequestService.ts`):
   - Add validation logic for `duplicate` status: require `duplicate_of`, verify target exists, not self-referencing, target is not itself a duplicate
   - Add logic to compute `duplicated_by` reverse lookup on read
   - Add filtering: by default exclude items with status `duplicate` or `deprecated` from list queries
   - Accept `include_hidden` parameter to bypass the filter
   - When status changes away from `duplicate`, clear `duplicate_of`; away from `deprecated`, clear `deprecation_reason`

5. **Routes** (`portal/Backend/src/routes/bugs.ts` and `featureRequests.ts`):
   - PATCH endpoint: accept `duplicate_of` and `deprecation_reason` fields; delegate validation to service
   - GET list endpoint: read `include_hidden` query param, pass to service
   - GET detail endpoint: always return full item with computed `duplicated_by`
   - Return appropriate HTTP status codes: 400 for missing duplicate_of, 404 for nonexistent target, 422 for self-reference or chain

6. **Data seed**: Update seed data to mark FR-0008 as `status: "duplicate", duplicate_of: "FR-0009"`.

**Files:**
- `portal/Shared/types.ts`
- `portal/Shared/api.ts`
- `portal/Backend/src/database/schema.ts`
- `portal/Backend/src/routes/bugs.ts`
- `portal/Backend/src/routes/featureRequests.ts`
- `portal/Backend/src/services/bugService.ts`
- `portal/Backend/src/services/featureRequestService.ts`

**Scope tag:** `backend`

---

### frontend-coder-1

**Task:** Implement all frontend UI for duplicate/deprecated tagging — detail view banners and actions, list view hiding and toggles.

**Dependencies:** Depends on backend-coder-1 completing shared types in `portal/Shared/types.ts` and `portal/Shared/api.ts`.

**Instructions:**

1. **Detail views** (`BugDetail.tsx` and `FeatureRequestDetail.tsx`):
   - Add status banner component:
     - Duplicate: amber/yellow banner with text "This item is a duplicate of [ID]" — ID is a clickable link navigating to the canonical item's detail page
     - Deprecated: grey banner with text "This item has been deprecated" and the reason if provided
   - Add action buttons:
     - "Mark as Duplicate" button → modal with searchable ID picker (dropdown or text input with validation) to select canonical item of same type. On confirm, PATCH the item with `{ status: "duplicate", duplicate_of: selectedId }`
     - "Mark as Deprecated" button → modal with optional reason text field. On confirm, PATCH with `{ status: "deprecated", deprecation_reason: text }`
     - Hide these buttons if item is already duplicate/deprecated; show "Restore" button instead that PATCHes status back to `"open"`
   - Show "N duplicates" badge on canonical items that have `duplicated_by` entries, with expandable list of duplicate IDs

2. **List views** (`BugList.tsx` and `FeatureRequestList.tsx`):
   - Add "Show hidden items" toggle (checkbox or switch) above the list
   - When toggled on, add `include_hidden=true` query param to the fetch call
   - When hidden items are displayed, apply visual distinction: reduced opacity (0.6) and a muted status badge ("Duplicate" / "Deprecated")
   - On canonical items, show a small badge with duplicate count if `duplicated_by.length > 0`

3. **Styling:** Use existing design system patterns. Banners should be dismissible but reappear on page reload. Keep the UI clean — don't add excessive chrome.

**Files:**
- `portal/Frontend/src/components/bugs/BugDetail.tsx`
- `portal/Frontend/src/components/bugs/BugList.tsx`
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`
- `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`

**Scope tag:** `frontend`

---

### qa-tester-1

**Task:** Write comprehensive tests for the duplicate/deprecated tagging feature — both backend API tests and frontend component tests.

**Dependencies:** Depends on backend-coder-1 and frontend-coder-1 completing their work.

**Instructions:**

1. **Backend route tests** (`bugs.test.ts` and `featureRequests.test.ts`):
   - Test PATCH with valid duplicate payload succeeds
   - Test PATCH with duplicate status but missing `duplicate_of` returns 400
   - Test PATCH with `duplicate_of` pointing to self returns 422
   - Test PATCH with `duplicate_of` pointing to nonexistent item returns 404
   - Test PATCH with `duplicate_of` pointing to another duplicate returns 422 (no chains)
   - Test PATCH with valid deprecated payload succeeds (with and without reason)
   - Test restoring a duplicate/deprecated item back to open clears metadata
   - Test GET list excludes hidden items by default
   - Test GET list with `include_hidden=true` returns all items
   - Test GET detail always returns item regardless of status
   - Test canonical item's `duplicated_by` field is populated correctly
   - Repeat all above for both bugs and feature-requests

2. **Backend service tests** (`bugService.test.ts` and `featureRequestService.test.ts`):
   - Unit test validation logic in isolation
   - Test `duplicated_by` computation
   - Test filter logic with and without `include_hidden`

3. **Run all tests** and ensure they pass. Report any failures with details.

**Files:**
- `portal/Backend/src/routes/bugs.test.ts`
- `portal/Backend/src/routes/featureRequests.test.ts`
- `portal/Backend/src/services/bugService.test.ts`
- `portal/Backend/src/services/featureRequestService.test.ts`

**Scope tag:** `qa`
