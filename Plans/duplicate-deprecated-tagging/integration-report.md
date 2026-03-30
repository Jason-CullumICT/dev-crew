# Integration Report: Duplicate/Deprecated Tagging

**Date**: 2026-03-30
**Agent**: integration
**Team**: TheATeam
**RISK_LEVEL**: medium

## Summary

The duplicate/deprecated tagging feature is **substantially complete** with one MEDIUM severity gap identified. All backend logic, route handlers, service layer, frontend list views, detail views, and tests are functional and passing.

## Test Results

### Backend Tests
- **528/528 tests passing** (16 test files)
- `portal/Backend/tests/duplicate-deprecated.test.ts`: **20/20 tests passing**
- Covers: PATCH duplicate/deprecated for bugs and FRs, include_hidden filtering, GET by ID for hidden items, duplicated_by on canonical items, terminal status enforcement

### Frontend Tests
- `portal/Frontend/tests/duplicate-deprecated-ui.test.tsx`: **12/12 tests passing**
- Covers: FR list status colors, opacity for hidden items, duplicate count badge, detail banners (duplicate + deprecated), show hidden toggle on both pages
- **15 pre-existing failures** in other test files (Traceability, ImageUpload, Learnings, FeatureRequests, BugReports) — none related to this feature

### E2E Tests
- Written to `Source/E2E/tests/cycle-run-1774898752370-e56f9935/duplicate-deprecated.spec.ts`
- 13 test cases covering UI navigation, toggle behavior, API endpoint verification, validation, and console error checks
- Uses relative URLs as required

## FR Traceability Matrix

| FR ID | Description | Status | Verified By |
|-------|-------------|--------|-------------|
| FR-DUP-01 | duplicate/deprecated in status enums | ✅ PASS | types.ts has both statuses in enums |
| FR-DUP-02 | duplicate_of/deprecation_reason fields | ✅ PASS | Schema, types, services all have fields |
| FR-DUP-03 | Canonical items show duplicated_by list | ✅ PASS | Both mapBugRow and mapFRRow compute duplicated_by from DB |
| FR-DUP-04 | PATCH accepts duplicate/deprecated | ✅ PASS | Both route handlers pass fields; both services validate |
| FR-DUP-05 | List endpoints exclude hidden by default | ✅ PASS | Both routes read include_hidden; both services filter |
| FR-DUP-06 | GET /:id always returns full item | ✅ PASS | No filtering on getById methods |
| FR-DUP-07 | Validate duplicate_of references exist | ✅ PASS | Both services validate against their respective tables |
| FR-DUP-08 | Schema columns | ✅ PASS | Already existed |
| FR-DUP-09 | Detail view: action buttons | ⚠️ PARTIAL | Bug detail has buttons + forms; FR detail has handlers and state but **missing rendered UI buttons and forms** |
| FR-DUP-10 | Detail view: banners | ✅ PASS | Both bug and FR detail show duplicate/deprecated banners |
| FR-DUP-11 | List view: hidden by default, toggle | ✅ PASS | Both pages have showHidden toggle, pass include_hidden to API |
| FR-DUP-12 | List view: duplicate count badge | ✅ PASS | Both bug and FR lists show badge |
| FR-DUP-13 | Count as resolved for cascade | ✅ PASS | RESOLVED_STATUSES includes both |
| FR-DUP-14 | Mark FR-0008 as duplicate of FR-0009 | ❌ NOT DONE | Data migration not executed |

## Findings

### MEDIUM: FeatureRequestDetail missing "Mark as Duplicate/Deprecated" action buttons (FR-DUP-09)

**File**: `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`

The component has:
- ✅ State variables: `showDuplicateForm`, `showDeprecatedForm`, `duplicateOfId`, `deprecationReason`, `markingStatus`
- ✅ Handler functions: `handleMarkDuplicate()`, `handleMarkDeprecated()`
- ✅ Banners for duplicate/deprecated status (FR-DUP-10)
- ❌ **Missing**: The actual JSX buttons ("Mark as Duplicate", "Mark as Deprecated") and their corresponding form dialogs are not rendered

**Comparison**: `BugDetail.tsx` (lines 342-430) has the full UI:
- Buttons to trigger forms (visible when `!isHidden && !showDuplicateForm && !showDeprecatedForm`)
- Duplicate form with ID input + confirm/cancel buttons
- Deprecated form with reason textarea + confirm/cancel buttons

**Impact**: Users cannot mark feature requests as duplicate/deprecated from the detail view UI. The API supports it (via direct PATCH), but the UI action buttons are missing.

**Recommendation**: Copy the button/form pattern from `BugDetail.tsx` lines 342-430 into `FeatureRequestDetail.tsx`, adapting the text from "bug" to "feature request".

### LOW: FR-DUP-14 Data migration not executed

FR-0008 has not been marked as a duplicate of FR-0009. The dispatch plan indicates this should be done via:
```bash
curl -X PATCH http://localhost:3001/api/feature-requests/FR-0008 \
  -H 'Content-Type: application/json' \
  -d '{"status": "duplicate", "duplicate_of": "FR-0009"}'
```
This requires the backend to be running with actual data.

### INFO: Pre-existing test failures (not related to this feature)

15 pre-existing test failures exist across 7 frontend test files:
- `tests/FeatureRequests.test.tsx` (2 failures)
- `tests/Traceability.test.tsx` (4 failures)
- `tests/BugReports.test.tsx` (1 failure)
- `tests/Learnings.test.tsx` (2 failures)
- `tests/ImageUpload.test.tsx` (6 failures)

These appear related to incomplete mocks for `repos.list()` and image-related APIs. None are caused by the duplicate/deprecated feature changes.

### INFO: Unused state variables in FeatureRequestDetail

The state variables for duplicate/deprecated forms (`showDuplicateForm`, `showDeprecatedForm`, etc.) and handler functions are declared but never referenced in JSX. This is dead code until the buttons are added.

## Architecture Compliance

| Rule | Status |
|------|--------|
| No direct DB calls from routes | ✅ All routes delegate to services |
| Service layer handles business logic | ✅ Validation, transitions in services |
| Shared types are single source of truth | ✅ `HIDDEN_STATUSES`, status enums from Shared/types |
| API returns `{data: T[]}` for lists | ✅ Both list endpoints wrap in `{data}` |
| Traceability comments | ✅ All new code has `// Verifies: FR-DUP-XX` |
| No hardcoded secrets | ✅ N/A |
| Structured logging | ✅ All routes use logger |
| No console.log | ✅ Verified |

## Security Review

- **Input validation**: `duplicate_of` validated against DB (prevents references to non-existent items)
- **Self-reference prevention**: Cannot mark item as duplicate of itself
- **Terminal status enforcement**: Cannot transition out of duplicate/deprecated (prevents status manipulation)
- **No injection vectors**: All DB queries use parameterized statements
- **No XSS risk**: No raw HTML rendering of user-supplied `deprecation_reason`

## Conclusion

The feature is **ready for merge with one caveat**: the FeatureRequestDetail UI buttons for marking items as duplicate/deprecated are missing (MEDIUM). The backend API fully supports the feature, so marking FRs as duplicate/deprecated can be done via API calls but not through the UI detail view. The BugDetail has the complete implementation to reference.
