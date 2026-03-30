# Dispatch Plan: Duplicate/Deprecated Status for Bugs & Feature Requests

RISK_LEVEL: medium

## Summary

Add `duplicate` and `deprecated` status values to bugs and feature requests, with `duplicate_of` / `deprecation_reason` fields, list-level hiding by default, and UI controls for marking items and toggling visibility.

**Complexity estimate:** Backend M (2pts), Frontend M (2pts) → 1 backend-coder, 1 frontend-coder

---

## Stage 1: Requirements

### Functional Requirements

- **FR-DUP-01**: Add `duplicate` and `deprecated` to `BugStatus` and `FeatureRequestStatus` type unions
- **FR-DUP-02**: Add `duplicate_of: string | null` and `deprecation_reason: string | null` fields to `BugReport` and `FeatureRequest` types
- **FR-DUP-03**: Add `duplicated_by: string[]` computed field to both entity types (items that reference this as `duplicate_of`)
- **FR-DUP-04**: `PATCH /api/bugs/:id` and `PATCH /api/feature-requests/:id` accept `status: "duplicate"` with required `duplicate_of` field, or `status: "deprecated"` with optional `deprecation_reason`
- **FR-DUP-05**: List endpoints (`GET /api/bugs`, `GET /api/feature-requests`) exclude `duplicate` and `deprecated` items by default; `?include_hidden=true` includes them
- **FR-DUP-06**: Detail endpoints (`GET /api/bugs/:id`, `GET /api/feature-requests/:id`) always return the full item regardless of status
- **FR-DUP-07**: Validation: `duplicate_of` must reference an existing item of the same type, and must not reference self
- **FR-DUP-08**: DB schema: add `duplicate_of TEXT` and `deprecation_reason TEXT` columns to `bugs` and `feature_requests` tables (idempotent ALTER)
- **FR-DUP-09**: Detail view: action buttons to mark as Duplicate (ID picker) or Deprecated (reason text field)
- **FR-DUP-10**: Detail view: banners for duplicate (link to canonical) and deprecated (show reason) items
- **FR-DUP-11**: List view: hide duplicate/deprecated by default, toggle to show them
- **FR-DUP-12**: Canonical items show a badge with count of duplicates pointing to them
- **FR-DUP-13**: Add `duplicate` and `deprecated` to `RESOLVED_STATUSES` so they count as resolved for dependency gating

### Scoping / Bin-Packing

| FR | Layer | Size | Notes |
|---|---|---|---|
| FR-DUP-01..03 | Shared | S | Type changes |
| FR-DUP-04..07, 13 | Backend | M | Route + service + validation logic |
| FR-DUP-08 | Backend | S | Schema migration |
| FR-DUP-09..12 | Frontend | M | UI components, toggle, banners |

**Backend total:** S(1) + M(2) = 3pts → 1 coder
**Frontend total:** M(2) = 2pts → 1 coder

---

## Stage 2: API Contract

### Shared Types Changes (`portal/Shared/types.ts`)

```typescript
// Update status unions:
export type FeatureRequestStatus = 'potential' | 'voting' | 'approved' | 'denied' | 'in_development' | 'completed' | 'pending_dependencies' | 'duplicate' | 'deprecated';
export type BugStatus = 'reported' | 'triaged' | 'in_development' | 'resolved' | 'closed' | 'pending_dependencies' | 'duplicate' | 'deprecated';

// Add to RESOLVED_STATUSES:
export const RESOLVED_STATUSES: readonly string[] = ['completed', 'resolved', 'closed', 'duplicate', 'deprecated'] as const;

// Hidden statuses constant (new):
export const HIDDEN_STATUSES: readonly string[] = ['duplicate', 'deprecated'] as const;

// Add fields to FeatureRequest interface:
//   duplicate_of: string | null;
//   deprecation_reason: string | null;
//   duplicated_by: string[];

// Add fields to BugReport interface:
//   duplicate_of: string | null;
//   deprecation_reason: string | null;
//   duplicated_by: string[];
```

### Shared API Types Changes (`portal/Shared/api.ts`)

```typescript
// Update UpdateFeatureRequestInput:
export interface UpdateFeatureRequestInput {
  status?: string;
  description?: string;
  priority?: string;
  duplicate_of?: string;          // Required when status='duplicate'
  deprecation_reason?: string;    // Optional when status='deprecated'
}

// Update UpdateBugInput:
export interface UpdateBugInput {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  source_system?: string;
  duplicate_of?: string;          // Required when status='duplicate'
  deprecation_reason?: string;    // Optional when status='deprecated'
}
```

### Backend Endpoints

#### PATCH /api/bugs/:id
- Accept `duplicate_of` when `status: "duplicate"` (required; must be valid BUG-XXXX, not self)
- Accept `deprecation_reason` when `status: "deprecated"` (optional string)
- Return 400 if `status: "duplicate"` and `duplicate_of` missing or invalid
- Clear `duplicate_of`/`deprecation_reason` when transitioning away from these statuses

#### PATCH /api/feature-requests/:id
- Same as above but `duplicate_of` must be valid FR-XXXX

#### GET /api/bugs (list)
- Add `include_hidden` query param (default: false)
- When false: filter out `status IN ('duplicate', 'deprecated')`
- When true: return all

#### GET /api/feature-requests (list)
- Same `include_hidden` param

#### GET /api/bugs/:id, GET /api/feature-requests/:id (detail)
- No changes — always returns full item
- Add computed `duplicated_by: string[]` field

### Database Schema Changes (`portal/Backend/src/database/schema.ts`)

```sql
-- Idempotent ALTER for both tables:
ALTER TABLE feature_requests ADD COLUMN duplicate_of TEXT;
ALTER TABLE feature_requests ADD COLUMN deprecation_reason TEXT;
ALTER TABLE bugs ADD COLUMN duplicate_of TEXT;
ALTER TABLE bugs ADD COLUMN deprecation_reason TEXT;
```

### Frontend API Client Changes (`portal/Frontend/src/api/client.ts`)

- `bugs.list()` and `featureRequests.list()` accept `include_hidden?: boolean` param
- Pass as `?include_hidden=true` query param when set

---

## Stage 3: Implementation

### backend-coder-1

**FRs:** FR-DUP-01, FR-DUP-02, FR-DUP-03, FR-DUP-04, FR-DUP-05, FR-DUP-06, FR-DUP-07, FR-DUP-08, FR-DUP-13

**Files to modify:**

1. **`portal/Shared/types.ts`**
   - Add `'duplicate' | 'deprecated'` to `FeatureRequestStatus` and `BugStatus` unions
   - Add `'duplicate', 'deprecated'` to `RESOLVED_STATUSES`
   - Add `HIDDEN_STATUSES` constant
   - Add `duplicate_of`, `deprecation_reason`, `duplicated_by` fields to `FeatureRequest` and `BugReport` interfaces

2. **`portal/Shared/api.ts`**
   - Add `duplicate_of?: string` and `deprecation_reason?: string` to `UpdateFeatureRequestInput` and `UpdateBugInput`

3. **`portal/Backend/src/database/schema.ts`**
   - Add idempotent ALTER TABLE for `duplicate_of TEXT` and `deprecation_reason TEXT` on both `feature_requests` and `bugs` tables

4. **`portal/Backend/src/services/bugService.ts`**
   - Add `'duplicate', 'deprecated'` to `VALID_BUG_STATUSES`
   - In `mapBugRow`: add `duplicate_of`, `deprecation_reason` from row; compute `duplicated_by` via DB query
   - In `updateBug`: handle `duplicate_of` and `deprecation_reason` fields; validate `duplicate_of` references existing bug, not self; require `duplicate_of` when status='duplicate'; allow transition to `duplicate`/`deprecated` from any status
   - In `listBugs`: exclude hidden statuses by default; accept `include_hidden` option

5. **`portal/Backend/src/services/featureRequestService.ts`**
   - Add `'duplicate', 'deprecated'` to `VALID_STATUSES`
   - In `mapFRRow`: add `duplicate_of`, `deprecation_reason` from row; compute `duplicated_by`
   - In `updateFeatureRequest`: same validation as bugs but for FR IDs; update STATUS_TRANSITIONS to allow `duplicate`/`deprecated` from any status
   - In `listFeatureRequests`: exclude hidden statuses by default; accept `include_hidden`

6. **`portal/Backend/src/routes/bugs.ts`**
   - Pass `include_hidden` query param to `listBugs`
   - Pass `duplicate_of` and `deprecation_reason` from request body to `updateBug`

7. **`portal/Backend/src/routes/featureRequests.ts`**
   - Pass `include_hidden` query param to `listFeatureRequests`
   - Pass `duplicate_of` and `deprecation_reason` from request body to `updateFeatureRequest`

**Key implementation details:**
- `duplicated_by` is computed by querying the same table: `SELECT id FROM <table> WHERE duplicate_of = ?`
- STATUS_TRANSITIONS: any status → `duplicate` and any status → `deprecated` (these are terminal dispositions)
- When setting `status: 'duplicate'`, also set `duplicate_of` column; when setting other statuses, clear `duplicate_of` and `deprecation_reason`

### frontend-coder-1

**FRs:** FR-DUP-09, FR-DUP-10, FR-DUP-11, FR-DUP-12

**Files to modify:**

1. **`portal/Frontend/src/api/client.ts`**
   - Add `include_hidden?: boolean` to `bugs.list()` and `featureRequests.list()` params
   - Pass as query param

2. **`portal/Frontend/src/components/bugs/BugDetail.tsx`**
   - Add "Mark as Duplicate" button → shows modal/inline form with ID input for canonical bug
   - Add "Mark as Deprecated" button → shows inline form with optional reason
   - Add banner when `bug.status === 'duplicate'`: "This bug is a duplicate of {bug.duplicate_of}" with clickable link
   - Add banner when `bug.status === 'deprecated'`: "This bug is deprecated. Reason: {bug.deprecation_reason}"
   - Add `STATUS_COLORS` entries for `duplicate` and `deprecated`

3. **`portal/Frontend/src/components/bugs/BugList.tsx`**
   - Add `STATUS_COLORS` entries for `duplicate` and `deprecated`
   - Show duplicate count badge on canonical items (use `duplicated_by` length)
   - Add subtle styling for hidden items when shown

4. **`portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`**
   - Same duplicate/deprecated action buttons as BugDetail
   - Same banners for duplicate/deprecated status
   - Add `STATUS_COLORS` entries

5. **`portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`**
   - Same changes as BugList: `STATUS_COLORS`, duplicate badge
   - Subtle styling for hidden items

6. **`portal/Frontend/src/pages/BugReportsPage.tsx`**
   - Add `showHidden` state (default false)
   - Pass `include_hidden: showHidden` to `bugs.list()`
   - Add "Show hidden" toggle checkbox in filter bar
   - Add `duplicate` and `deprecated` to STATUS_OPTIONS

7. **`portal/Frontend/src/pages/FeatureRequestsPage.tsx`**
   - Same `showHidden` toggle
   - Pass `include_hidden: showHidden` to `featureRequests.list()`
   - Add `duplicate` and `deprecated` to STATUS_OPTIONS

**Key implementation details:**
- Duplicate ID picker: simple text input with validation (check format BUG-XXXX / FR-XXXX)
- The `onUpdate` callback already refreshes the detail view — reuse it
- Toggle should be a labeled checkbox: "Show hidden (duplicate/deprecated)"
- Duplicate count badge: small gray pill next to canonical item showing e.g. "2 duplicates"

---

## Stage 4: QA

Standard QA pipeline applies. Key test scenarios:

1. **Backend unit tests:**
   - Mark bug as duplicate with valid/invalid/self/missing `duplicate_of`
   - Mark FR as deprecated with/without reason
   - List endpoint filters hidden by default, includes with `include_hidden=true`
   - Detail endpoint always returns full item
   - `duplicated_by` populated correctly
   - Status transition validation

2. **Frontend tests:**
   - Duplicate/deprecated banners render
   - Action buttons appear/disappear based on status
   - Toggle shows/hides items
   - Duplicate count badge appears on canonical items

3. **E2E:**
   - Full flow: create bug → mark as duplicate → verify hidden → toggle → verify visible
   - Canonical item shows duplicate count
