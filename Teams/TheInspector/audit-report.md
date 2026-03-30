# Audit Report: Duplicate/Deprecated Status Feature

**Auditor:** TheInspector
**Date:** 2026-03-30
**Feature:** Allow bugs and feature requests to be tagged as duplicate or deprecated with optional hiding
**Implemented by:** TheATeam
**Tests:** 29/29 passing

---

## Executive Summary

The service layer, database schema, shared types, frontend components, and tests are well-implemented. However, the **backend HTTP route layer is entirely missing** — there are no Express route handlers or application entry point, meaning the API is not actually callable over HTTP. Additionally, there are several medium and low severity issues.

**Overall Verdict: INCOMPLETE — 1 critical gap, 2 medium issues, 5 low issues**

---

## Critical Issues

### C1: Route/HTTP Layer Does Not Exist

**Severity:** CRITICAL
**Location:** `portal/Backend/src/routes/` (directory does not exist)

The specification lists `portal/Backend/src/routes/bugs.ts` and `portal/Backend/src/routes/featureRequests.ts` as files to modify. Neither file exists. There is also no `portal/Backend/src/index.ts` entry point, no Express app initialization, and no error-handling middleware.

The service layer is fully implemented and tested, but there is **no HTTP surface** to expose it. The frontend `api.ts` makes `fetch()` calls to `/api/bugs/:id` and `/api/feature-requests/:id`, but nothing serves those endpoints.

**What's missing:**
- `portal/Backend/src/routes/bugs.ts` — route handlers for GET/PATCH/POST endpoints
- `portal/Backend/src/routes/featureRequests.ts` — route handlers for GET/PATCH/POST endpoints
- `portal/Backend/src/index.ts` — Express app with middleware, route registration, DB init
- Error-handling middleware to convert `DependencyError` (with `statusCode`) to HTTP responses
- Query parameter parsing for `include_hidden`

**Impact:** The feature cannot be used end-to-end. Frontend calls will fail with connection errors or 404s.

---

## Medium Issues

### M1: Unused Type Exports — `MarkDuplicateInput` and `MarkDeprecatedInput`

**Severity:** MEDIUM
**Location:** `portal/Shared/types.ts:119-127`

These interfaces are exported but never imported or used anywhere in the codebase. The `api.ts` functions construct payloads inline instead of using these types.

**Recommendation:** Either import and use them in `api.ts` for type safety, or remove them to avoid dead code.

### M2: No Submit Button Disabling on Empty Duplicate ID

**Severity:** MEDIUM
**Location:** `portal/Frontend/src/components/bugs/BugDetail.tsx:298`, `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:306`

The "Mark as Duplicate" form's Submit button is clickable even when the canonical item ID field is empty. The handler silently returns on empty input (`if (!duplicateOfInput.trim()) return`), giving the user no feedback.

**Recommendation:** Add `disabled={!duplicateOfInput.trim()}` to the submit button.

---

## Low Issues

### L1: No Loading State During Form Submissions

**Severity:** LOW
**Location:** BugDetail.tsx and FeatureRequestDetail.tsx — `handleMarkDuplicate`, `handleMarkDeprecated`, `handleRestore` functions

No loading indicator or button disabling during API calls. Users can double-click submit or navigate away during in-flight requests.

### L2: No AbortController on Unmount

**Severity:** LOW
**Location:** BugDetail.tsx and FeatureRequestDetail.tsx

If the component unmounts while an API call is in flight, the callback attempts state updates on an unmounted component.

### L3: Silent Handling of Inconsistent Data in Banner

**Severity:** LOW
**Location:** `portal/Frontend/src/components/shared/DuplicateDeprecatedBanner.tsx:65-72`

When `status === 'duplicate'` but `duplicateOf` is null/undefined, the banner is silently not rendered. No warning or fallback for this data integrity issue.

### L4: Route Inference Fallback in Banner

**Severity:** LOW
**Location:** `DuplicateDeprecatedBanner.tsx:49-53`

The `getItemRoute()` function defaults to `'#'` if the item ID doesn't match known prefixes (BUG-, FR-). Could produce dead links if ID format changes.

### L5: No Seeding Idempotency Test

**Severity:** LOW
**Location:** Test suite gap

The `seedKnownDuplicates()` function in `schema.ts:61-76` is idempotent by design, but no test verifies this — e.g., calling it twice doesn't corrupt data.

---

## Requirements Checklist

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | `duplicate` and `deprecated` added to status enums | PASS | Both `BugStatus` and `FeatureRequestStatus` in types.ts |
| 2 | `duplicate_of` and `deprecation_reason` fields on types | PASS | On both Bug and FeatureRequest interfaces |
| 3 | `duplicated_by: string[]` on canonical items | PASS | Computed via SQL UNION in enrichment functions |
| 4 | `PATCH` accepts `status: "duplicate"` with `duplicate_of` | PASS | Service layer validates and handles correctly |
| 5 | `PATCH` accepts `status: "deprecated"` with optional reason | PASS | Service layer handles correctly |
| 6 | List endpoints exclude hidden by default | PASS | Service filters with `status NOT IN (...)` |
| 7 | List endpoints accept `include_hidden=true` | PARTIAL | Service supports it; no HTTP layer to parse query param |
| 8 | GET by ID returns item regardless of status | PASS | No status filter on getById methods |
| 9 | Duplicate validation (exists, no self-ref, no chaining) | PASS | All three checks implemented and tested |
| 10 | Cross-type duplicates (bug -> FR, FR -> bug) | PASS | Both directions tested |
| 11 | UI: Action buttons for Duplicate/Deprecated | PASS | Both detail views have buttons and forms |
| 12 | UI: Duplicate banner with link to canonical | PASS | DuplicateDeprecatedBanner component |
| 13 | UI: Deprecated banner with reason | PASS | DuplicateDeprecatedBanner component |
| 14 | UI: Hidden items excluded from list by default | PASS | Controlled by `showHidden` state + API param |
| 15 | UI: Toggle to show hidden items | PASS | Checkbox in both list views |
| 16 | UI: Duplicate count badge on canonical items | PASS | Badge in both list views |
| 17 | FR-0008 seeded as duplicate of FR-0009 | PASS | `seedKnownDuplicates()` in schema.ts |
| 18 | `MarkDuplicateInput`/`MarkDeprecatedInput` types in api.ts | FAIL | Defined in types.ts but not used in api.ts |
| 19 | Route handlers in bugs.ts / featureRequests.ts | FAIL | Files do not exist |
| 20 | Database columns for duplicate_of, deprecation_reason | PASS | Both tables have columns with proper defaults |
| 21 | Metrics for duplicate/deprecated operations | PASS | Counter with operation and item_type labels |

---

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       29 passed, 29 total
Time:        1.467s
```

All tests exercise the service layer directly. No HTTP/route-level tests exist (consistent with the missing route layer).

---

## Recommendations (Priority Order)

1. **[CRITICAL]** Create route handlers and Express app entry point to make the API callable over HTTP
2. **[MEDIUM]** Use or remove the dead `MarkDuplicateInput`/`MarkDeprecatedInput` types
3. **[MEDIUM]** Disable duplicate form submit button when ID input is empty
4. **[LOW]** Add loading states to form submissions
5. **[LOW]** Add route-level integration tests once routes exist
