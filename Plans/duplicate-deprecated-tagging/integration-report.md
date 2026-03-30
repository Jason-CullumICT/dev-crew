# Integration Report: Duplicate/Deprecated Tagging (Cycle 2)

**Date**: 2026-03-30
**Agent**: integration
**Team**: TheATeam
**RISK_LEVEL**: medium

## Summary

The duplicate/deprecated tagging feature is **substantially complete** with one MEDIUM severity gap identified and one LOW data migration outstanding. All backend logic (routes, services, schema) is fully functional and tested. Frontend list views, detail banners, and show/hide toggles are operational. The FeatureRequestDetail component is missing rendered action buttons/forms for marking items as duplicate/deprecated (state and handlers exist but JSX is absent).

## Test Results

### Backend Tests
- **528/528 tests passing** (16 test files, 0 failures)
- `portal/Backend/tests/duplicate-deprecated.test.ts`: **20/20 tests passing**
- Covers: PATCH duplicate/deprecated for bugs and FRs, include_hidden filtering, GET by ID for hidden items, duplicated_by on canonical items, terminal status enforcement

### Frontend Tests
- `portal/Frontend/tests/duplicate-deprecated-ui.test.tsx`: **12/12 tests passing**
- Covers: FR list status colors, opacity for hidden items, duplicate count badge, detail banners (duplicate + deprecated), show hidden toggle on both pages
- **12 pre-existing failures** in other test files (Traceability, Learnings, BugReports, FeatureRequests) — none related to this feature. Root causes: missing `repos` mock export, UI element mismatches in unrelated components.

### E2E Tests
- Written to `Source/E2E/tests/cycle-run-1774902243202-d89b8b3a/duplicate-deprecated-tagging.spec.ts`
- **22 test cases** covering:
  - UI navigation and page rendering (feature requests + bug reports)
  - Show hidden toggle behavior
  - Duplicate count badge rendering
  - Detail view navigation and banners (duplicate + deprecated)
  - API validation: hidden filtering, duplicate_of required, self-reference rejection, invalid reference rejection
  - GET by ID returns hidden items
  - Canonical item duplicated_by list
  - Deprecated status with optional reason
  - Console error checks on both pages
- Uses relative URLs as required by pipeline config

## FR Traceability Matrix

| FR ID | Description | Status | Verified By |
|-------|-------------|--------|-------------|
| FR-DUP-01 | duplicate/deprecated in status enums | ✅ PASS | `Shared/types.ts` has both statuses in `FeatureRequestStatus` and `BugStatus` enums |
| FR-DUP-02 | duplicate_of/deprecation_reason fields | ✅ PASS | Schema columns, shared types, and services all include fields |
| FR-DUP-03 | Canonical items show duplicated_by list | ✅ PASS | Both `mapBugRow` and `mapFRRow` compute `duplicated_by` from DB |
| FR-DUP-04 | PATCH accepts duplicate/deprecated | ✅ PASS | Both route handlers destructure and pass fields; both services validate |
| FR-DUP-05 | List endpoints exclude hidden by default | ✅ PASS | Both routes read `include_hidden`; both services filter via `HIDDEN_STATUSES` |
| FR-DUP-06 | GET /:id always returns full item | ✅ PASS | No status filtering on `getById` methods |
| FR-DUP-07 | Validate duplicate_of references exist | ✅ PASS | Both services: require field, reject self-reference, validate target exists in DB |
| FR-DUP-08 | Schema columns | ✅ PASS | `duplicate_of` and `deprecation_reason` on both tables via idempotent ALTER TABLE |
| FR-DUP-09 | Detail view: action buttons | ⚠️ PARTIAL | BugDetail: complete buttons+forms. **FeatureRequestDetail: handlers+state exist but JSX buttons/forms NOT rendered** |
| FR-DUP-10 | Detail view: banners | ✅ PASS | Both bug and FR detail show duplicate (purple) and deprecated (gray) banners |
| FR-DUP-11 | List view: hidden by default, toggle | ✅ PASS | Both pages have "Show hidden (duplicate/deprecated)" checkbox, pass `include_hidden` to API |
| FR-DUP-12 | List view: duplicate count badge | ✅ PASS | Both bug and FR lists show purple badge with count |
| FR-DUP-13 | Count as resolved for dependency cascade | ✅ PASS | `RESOLVED_STATUSES` includes both `duplicate` and `deprecated` |
| FR-DUP-14 | Mark FR-0008 as duplicate of FR-0009 | ❌ NOT DONE | Data migration not executed (requires running backend) |

## Findings

### MEDIUM: FeatureRequestDetail missing "Mark as Duplicate/Deprecated" action buttons (FR-DUP-09)

**File**: `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`
**Severity**: MEDIUM

The component has:
- ✅ State variables (lines 41-44): `showDuplicateForm`, `duplicateOfId`, `showDeprecatedForm`, `deprecationReason`, `markingStatus`
- ✅ Handler functions (lines 172-214): `handleMarkDuplicate()`, `handleMarkDeprecated()`
- ✅ Banners for duplicate/deprecated status (lines 223-237)
- ❌ **Missing**: The JSX buttons ("Mark as Duplicate", "Mark as Deprecated") and their form dialogs are not rendered anywhere in the component

**Reference**: `BugDetail.tsx` lines 342-421 has the complete working implementation with:
- Toggle buttons (visible when `!isHidden && !showDuplicateForm && !showDeprecatedForm`)
- Duplicate form with ID input + confirm/cancel
- Deprecated form with reason textarea + confirm/cancel

**Impact**: Users cannot mark feature requests as duplicate/deprecated from the UI detail view. The backend API fully supports it via PATCH, and the frontend handlers are wired, but there's no UI trigger.

**Recommendation**: Add the Disposition section JSX from BugDetail.tsx (lines 342-421) to FeatureRequestDetail.tsx, adapting "bug" text to "feature request".

### LOW: FR-0008 data migration not executed (FR-DUP-14)

**Severity**: LOW

FR-0008 should be marked as duplicate of FR-0009 per the spec's "Known Duplicates to Resolve" section. This requires a running backend:
```bash
curl -X PATCH http://localhost:3001/api/feature-requests/FR-0008 \
  -H 'Content-Type: application/json' \
  -d '{"status": "duplicate", "duplicate_of": "FR-0009"}'
```

### INFO: Pre-existing frontend test failures (not caused by this feature)

12 pre-existing test failures across 4 files:
- `tests/Traceability.test.tsx` (4 failures) — missing `repos` mock export in API client mock
- `tests/Learnings.test.tsx` — missing "Filter" button in rendered output
- `tests/BugReports.test.tsx` — element mismatch
- `tests/FeatureRequests.test.tsx` — element mismatch

None are caused by the duplicate/deprecated feature changes. Root causes are missing mock definitions and UI element changes from other features.

### INFO: Dead code in FeatureRequestDetail

State variables and handler functions for duplicate/deprecated forms (lines 41-44, 172-214) are declared but never referenced in JSX. This becomes live code once the action buttons are added.

## Architecture Compliance

| Rule | Status |
|------|--------|
| No direct DB calls from routes | ✅ All routes delegate to services |
| Service layer handles business logic | ✅ Validation, transitions, field clearing in services |
| Shared types are single source of truth | ✅ `HIDDEN_STATUSES`, status enums, field types from `Shared/types.ts` |
| API returns `{data: T[]}` for lists | ✅ Both list endpoints wrap in `{data}` |
| Traceability comments (`// Verifies: FR-DUP-XX`) | ✅ All new test code has traceability |
| No hardcoded secrets | ✅ N/A |
| Structured logging (no console.log) | ✅ Verified — all routes use logger |
| Schema changes via migration | ✅ Idempotent ALTER TABLE in schema.ts |
| No framework imports in business logic | ✅ Services are pure |

## Security Review

| Check | Result |
|-------|--------|
| Input validation: `duplicate_of` validated against DB | ✅ PASS |
| Self-reference prevention | ✅ PASS — `duplicate_of !== id` check in both services |
| Terminal status enforcement | ✅ PASS — cannot transition out of duplicate/deprecated |
| SQL injection | ✅ PASS — all DB queries use parameterized statements |
| XSS risk | ✅ PASS — no raw HTML rendering of `deprecation_reason` |
| Cross-type reference | ✅ PASS — `duplicate_of` validates against same-type table only |

## Conclusion

The feature is **ready for merge with one known gap**:

1. **MEDIUM** (FR-DUP-09): FeatureRequestDetail UI buttons/forms for marking items as duplicate/deprecated are missing. Backend fully supports the operations; only the frontend trigger UI is absent. The state and handlers are in place — only JSX rendering is needed.
2. **LOW** (FR-DUP-14): FR-0008 not yet marked as duplicate of FR-0009 (requires running backend).

**Recommendation**: Fix #1 before merge if full UI parity with BugDetail is required. The feature is functional via API and BugDetail UI without it.
