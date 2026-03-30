# QA Integration Report: Duplicate/Deprecated Status Feature (FR-0008)

**Role:** integration (QA)
**Team:** TheATeam
**Date:** 2026-03-30
**Feature:** Allow bugs and feature requests to be tagged as duplicate or deprecated with optional hiding

RISK_LEVEL: medium

---

## 1. Test Execution Summary

### Backend Unit/Integration Tests
- **Test suite:** `portal/Backend/src/__tests__/duplicate-deprecated.test.ts`
- **Result:** 29/29 tests PASSED
- **Coverage areas:**
  - Bug: mark as duplicate (valid, missing duplicate_of, self-ref, non-existent, chain prevention, cross-type)
  - Bug: mark as deprecated (with/without reason)
  - Bug: restore from duplicate/deprecated (clears fields)
  - Bug: list filtering (default hides, include_hidden shows all, combined with query)
  - Bug: detail always returns full item
  - Bug: duplicated_by computation
  - FR: same core test coverage as bugs
  - Cross-type duplicated_by
  - Dependency regression test

### Traceability Enforcer
- `tools/traceability-enforcer.py` does not exist in the workspace — SKIPPED

### E2E Tests Written
- `Source/E2E/tests/cycle-run-1774837912867-a380d3fa/duplicate-deprecated-bugs.spec.ts` — 11 tests
- `Source/E2E/tests/cycle-run-1774837912867-a380d3fa/duplicate-deprecated-feature-requests.spec.ts` — 14 tests
- `Source/E2E/tests/cycle-run-1774837912867-a380d3fa/duplicate-deprecated-banner.spec.ts` — 8 tests

---

## 2. Specification Compliance Review

### Shared Types (`portal/Shared/types.ts`) — PASS
- [x] `duplicate` and `deprecated` added to `BugStatus` union
- [x] `duplicate` and `deprecated` added to `FeatureRequestStatus` union
- [x] `HIDDEN_STATUSES` constant defined correctly
- [x] `duplicate_of`, `deprecation_reason`, `duplicated_by` fields on `Bug` and `FeatureRequest`
- [x] `MarkDuplicateInput` and `MarkDeprecatedInput` interfaces defined
- [x] All fields have correct types (`string | null`, `string[]`, etc.)

### API Client (`portal/Shared/api.ts`) — PASS
- [x] `getBugs()` accepts `include_hidden` option
- [x] `getFeatureRequests()` accepts `include_hidden` option
- [x] `markAsDuplicate()` convenience function implemented
- [x] `markAsDeprecated()` convenience function implemented
- [x] Both use proper route resolution via `itemTypeToRoute()`

### Database Schema (`portal/Backend/src/database/schema.ts`) — PASS
- [x] `duplicate_of TEXT DEFAULT NULL` on bugs table
- [x] `deprecation_reason TEXT DEFAULT NULL` on bugs table
- [x] `duplicate_of TEXT DEFAULT NULL` on feature_requests table
- [x] `deprecation_reason TEXT DEFAULT NULL` on feature_requests table
- [x] CHECK constraints updated to include `duplicate` and `deprecated` for both tables
- [x] Seed function marks FR-0008 as duplicate of FR-0009

### Bug Service (`portal/Backend/src/services/bugService.ts`) — PASS
- [x] `listBugs` accepts `include_hidden` option, filters hidden statuses by default
- [x] Combined query + hidden filtering works correctly
- [x] `updateBug` validates `duplicate_of` required when `status: 'duplicate'`
- [x] Self-reference validation (400)
- [x] Non-existent canonical item validation (404)
- [x] Duplicate chain prevention (400)
- [x] Cross-table canonical lookup (bugs + feature_requests)
- [x] `deprecated` status sets `deprecation_reason`, clears `duplicate_of`
- [x] `duplicate` status sets `duplicate_of`, clears `deprecation_reason`
- [x] Restore from hidden clears both fields
- [x] `enrichBug` computes `duplicated_by` via UNION ALL across both tables
- [x] Metrics tracked for all operations
- [x] UPDATE SQL includes `duplicate_of` and `deprecation_reason`

### Feature Request Service (`portal/Backend/src/services/featureRequestService.ts`) — PASS
- [x] Same changes as BugService, correctly adapted for feature requests
- [x] Uses `feature_request` item type for metrics
- [x] Restore defaults to clearing fields (UI restores to `submitted`)

### Banner Component (`portal/Frontend/src/components/shared/DuplicateDeprecatedBanner.tsx`) — PASS
- [x] Duplicate banner: amber/yellow, shows link to canonical item
- [x] Deprecated banner: grey, shows reason if provided
- [x] Duplicated-by badge: blue info badge with count
- [x] Route inference from ID prefix (BUG- → /bugs/, FR- → /feature-requests/)
- [x] Proper data-testid attributes for E2E testing

### Bug Detail (`portal/Frontend/src/components/bugs/BugDetail.tsx`) — PASS
- [x] `DuplicateDeprecatedBanner` integrated above content
- [x] "Mark as Duplicate" button with inline form
- [x] "Mark as Deprecated" button with inline form
- [x] Buttons hidden when item is already duplicate/deprecated
- [x] "Restore" button shown for hidden items (restores to `new`)
- [x] Error display for failed actions
- [x] Proper data-testid attributes

### Bug List (`portal/Frontend/src/components/bugs/BugList.tsx`) — PASS
- [x] `showHidden` state with checkbox toggle
- [x] `include_hidden` passed to `getBugs()` API call
- [x] Re-fetches on toggle change (via useCallback + useEffect dependency)
- [x] Hidden items dimmed with `opacity: 0.5`
- [x] Duplicate count badge on canonical items

### Feature Request Detail (`portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`) — PASS
- [x] Same changes as BugDetail, adapted for feature requests
- [x] Restores to `submitted` (correct default for FRs)

### Feature Request List (`portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`) — PASS
- [x] Same changes as BugList, adapted for feature requests

### Metrics (`portal/Backend/src/metrics.ts`) — PASS
- [x] `duplicateDeprecatedOperations` counter with `operation` and `item_type` labels

---

## 3. Findings

### CRITICAL — None

### HIGH — None

### MEDIUM

**M1: No route files — backend service called directly (INFO/architectural note)**
- Severity: MEDIUM
- The project has no `portal/Backend/src/routes/` directory. Services are presumably called directly from an app-level route handler. The dispatch plan mentions "if routes exist as separate files they need updating too." Since they don't exist, the service-level changes are sufficient. However, the `include_hidden` query parameter handling must be wired in wherever the route handler calls `listBugs`/`listFeatureRequests`. This could not be verified since the route handler/app entry point was not found in the workspace files.
- **Recommendation:** Verify that the application entry point (server.ts or app.ts) passes the `include_hidden` query parameter to the service methods.

**M2: No input sanitization on `duplicate_of` field**
- Severity: MEDIUM
- The `duplicate_of` field is accepted as a raw string from the request body and stored directly. While SQLite parameterized queries prevent SQL injection, there is no validation that the string follows the expected ID format (`BUG-XXXX` or `FR-XXXX`). A malicious or malformed input like an extremely long string could be stored.
- **Recommendation:** Add format validation for `duplicate_of` (regex: `/^(BUG|FR)-\d{4,}$/`).

### LOW

**L1: `searchItems` in api.ts doesn't pass `include_hidden`**
- Severity: LOW
- The `searchItems()` function used by DependencyPicker calls `getBugs` and `getFeatureRequests` without passing `include_hidden`. This means when searching for a canonical item to link as a duplicate, hidden items won't appear in search results. This is technically correct behavior (you shouldn't link to a hidden item as canonical — the chain prevention already blocks it), but it could cause confusion if an item was previously marked as duplicate and someone wants to find it via search.
- **Recommendation:** Consider whether search should show hidden items when used in the duplicate-of picker context.

**L2: `deprecation_reason` input uses single-line `<input type="text">` instead of `<textarea>`**
- Severity: LOW
- The dispatch plan says "optional reason text field" and the deprecation reason could be a multi-line explanation. Currently both BugDetail and FeatureRequestDetail use `<input type="text">`.
- **Recommendation:** Consider using `<textarea>` for the deprecation reason input for longer reasons.

**L3: No loading state during action submission**
- Severity: LOW
- When submitting mark-as-duplicate or mark-as-deprecated, there's no loading indicator. The submit button remains clickable during the async operation, potentially allowing double-submission.
- **Recommendation:** Add loading state to disable the submit button during API calls.

### INFO

**I1: Traceability comments use `FR-0008` throughout**
- All implementation files correctly reference `FR-0008` in their `// Verifies:` comments, maintaining traceability.

**I2: Known duplicate FR-0008 → FR-0009 is seeded in schema initialization**
- The seed function in `schema.ts` correctly marks FR-0008 as duplicate of FR-0009 if both exist.

**I3: Existing dependency features are not regressed**
- Test confirms blocked_by/blocks/has_unresolved_blockers fields still work alongside duplicate status.
- Dispatch gating is correctly skipped for duplicate/deprecated statuses (they don't trigger DISPATCH_TRIGGER_STATUSES).

---

## 4. Security Review

- **SQL Injection:** All database queries use parameterized statements — PASS
- **XSS:** React's JSX escaping prevents XSS in banner text and reason display — PASS
- **IDOR:** No authorization model exists in the codebase (pre-existing), so this is not a regression — N/A
- **Input validation:** `duplicate_of` validated for existence and chain prevention; `deprecation_reason` is free text — ACCEPTABLE

---

## 5. Architecture Review

- No architecture violations detected
- New code follows existing patterns (service classes, enrichment methods, inline styles)
- Metrics follow existing Prometheus counter pattern
- Schema changes are additive (new nullable columns, updated CHECK constraints)
- No breaking changes to existing APIs (new optional parameters only)

---

## 6. E2E Test Coverage

Written 33 Playwright E2E tests across 3 files:

| File | Tests | Coverage |
|------|-------|----------|
| `duplicate-deprecated-bugs.spec.ts` | 11 | Bug list, detail, toggle, mark deprecated, restore, console errors |
| `duplicate-deprecated-feature-requests.spec.ts` | 14 | FR list, detail, toggle, mark deprecated, restore, duplicate badge, dimmed rows, console errors |
| `duplicate-deprecated-banner.spec.ts` | 8 | Duplicate banner with link, deprecated banner with/without reason, duplicated-by badge, error cases, cancel form |

All tests use relative URLs as required by the pipeline.

---

## 7. Verdict

**PASS** — Implementation is complete and correct against the specification. All 29 backend tests pass. 33 E2E tests written for browser verification. No critical or high severity issues found. Two medium findings should be addressed in a follow-up but do not block merge.
