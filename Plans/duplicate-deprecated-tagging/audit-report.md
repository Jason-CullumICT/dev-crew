# Audit Report: Duplicate/Deprecated Tagging Feature

**Auditor:** TheInspector
**Date:** 2026-03-30
**Team:** TheATeam
**Feature:** Allow bugs and feature requests to be tagged as duplicate or deprecated with optional hiding

---

## Executive Summary

The implementation is **~90% complete** with strong backend coverage, good test traceability, and correct architecture. Three issues found:

1. **CRITICAL:** FeatureRequestDetail component is missing the rendered JSX for "Mark as Duplicate" / "Mark as Deprecated" action buttons and forms, despite having state variables and handlers fully implemented.
2. **MEDIUM:** Duplicate banners in both BugDetail and FeatureRequestDetail link to the list page (`/bugs` or `/feature-requests`) instead of navigating to the specific canonical item. The app uses in-page item selection (no dedicated routes per item), so `Link to="/bugs"` does not open the referenced item.
3. **MINOR:** Data migration (FR-0008 as duplicate of FR-0009) was not executed.

**Verdict:** PASS WITH REQUIRED FIXES (1 critical, 1 medium, 1 minor)

---

## Spec Compliance Matrix

| Req ID | Requirement | Status | Notes |
|--------|-------------|--------|-------|
| FR-DUP-01 | New `duplicate` and `deprecated` status values | PASS | Added to both `FeatureRequestStatus` and `BugStatus` enums in `Shared/types.ts` |
| FR-DUP-02 | `duplicate_of` and `deprecation_reason` fields on types | PASS | Present on both `FeatureRequest` and `BugReport` types with `string \| null` |
| FR-DUP-03 | `duplicated_by: string[]` on canonical items | PASS | Computed dynamically via DB query in both `mapBugRow` and `mapFRRow` |
| FR-DUP-04 | PATCH accepts `status: "duplicate"` with `duplicate_of`, `status: "deprecated"` with optional `deprecation_reason` | PASS | Both route handlers pass fields to service layer; validation is thorough |
| FR-DUP-05 | List endpoints exclude hidden by default, accept `include_hidden=true` | PASS | `HIDDEN_STATUSES` constant used; `include_hidden` query param parsed in both routes |
| FR-DUP-06 | GET by ID returns full item regardless of status | PASS | No status filtering in `getBugById` / `getFeatureRequestById` |
| FR-DUP-07 | Validate `duplicate_of` references existing item | PASS | Checks: required field, no self-reference, target exists in DB |
| FR-DUP-08 | Terminal status enforcement (no transitions out of duplicate/deprecated) | PASS | Bug service: direct check; FR service: `STATUS_TRANSITIONS` map with empty arrays |
| FR-DUP-09 | Detail view: action buttons to mark as Duplicate/Deprecated | **FAIL** | BugDetail: complete. **FeatureRequestDetail: handlers exist but JSX buttons/forms missing** |
| FR-DUP-10 | Detail view: banners for duplicate/deprecated items | **PARTIAL** | Both components render banners, but **links to canonical items are broken** — navigate to list page, not the specific item |
| FR-DUP-11 | List view: hidden by default with toggle | PASS | Both pages have "Show hidden (duplicate/deprecated)" checkbox controlling `include_hidden` |
| FR-DUP-12 | Canonical items show duplicate count badge | PASS | Both list components show purple badge with count when `duplicated_by.length > 0` |
| FR-DUP-13 | Field clearing on status transitions | PASS | Both services clear conflicting fields appropriately |
| FR-DUP-14 | Data migration: FR-0008 marked as duplicate of FR-0009 | **NOT DONE** | Curl command in plan but not executed |

---

## Critical Findings

### CRITICAL: FeatureRequestDetail missing disposition UI (FR-DUP-09)

**File:** `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`

**Problem:** The component has:
- State variables for the forms (lines 41-45): `showDuplicateForm`, `duplicateOfId`, `showDeprecatedForm`, `deprecationReason`, `markingStatus`
- Handler functions (lines 172-214): `handleMarkDuplicate`, `handleMarkDeprecated`
- But **zero rendered JSX** for the buttons or forms — the component's JSX ends after the deny form at line 469

**Impact:** Users cannot mark feature requests as duplicate or deprecated from the UI. The backend supports it, but the frontend has no way to trigger it.

**Fix:** Add a Disposition section after the deny form (after line 469, before the closing `</div>`), matching the pattern in `BugDetail.tsx` lines 342-421. The state and handlers are already wired — only the JSX is missing.

**Reference implementation:** `portal/Frontend/src/components/bugs/BugDetail.tsx` lines 342-421

### MEDIUM: Duplicate banner links do not navigate to canonical item (FR-DUP-10)

**Files:**
- `portal/Frontend/src/components/bugs/BugDetail.tsx` line 182: `<Link to="/bugs">`
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` line 227: `<Link to="/feature-requests">`

**Problem:** The spec says "duplicate items show a banner linking to the canonical item." Both banners display the canonical ID text but the `Link` navigates to the list page root (`/bugs` or `/feature-requests`) rather than to the specific canonical item. The app uses in-page selection via `onSelect` callbacks (no dedicated routes per item), so navigating to `/bugs` simply shows the list without selecting anything.

**Impact:** Clicking the canonical item link in a duplicate banner does not actually take the user to that item. The user lands on the list page and must manually find and click the canonical item.

**Fix:** Either:
1. Accept an `onNavigateToItem` callback prop and use it instead of `Link`, or
2. Use URL search params (e.g., `/bugs?select=BUG-0003`) that the page component can read and auto-select, or
3. If a simpler approach is acceptable, remove the `Link` and display the ID as plain text (partial fix — removes the misleading clickable link)

---

## Minor Findings

### MINOR: Missing dedicated API input types

**File:** `portal/Shared/api.ts`

**Problem:** Spec references `MarkDuplicateInput` and `MarkDeprecatedInput` types, but the implementation embeds these fields into the generic `UpdateFeatureRequestInput` / `UpdateBugInput` types instead.

**Impact:** Low. The generic types work correctly. Dedicated types would improve API documentation but are not functionally necessary.

**Recommendation:** Accept as-is. The generic update types cover the use case.

### MINOR: Data migration not executed (FR-DUP-14)

FR-0008 should be marked as duplicate of FR-0009 per the spec's "Known Duplicates to Resolve" section. The dispatch plan includes the curl command but it was not run.

**Recommendation:** Execute after fixes are deployed.

### INFO: Dead code in FeatureRequestDetail

State variables and handler functions for duplicate/deprecated forms (lines 41-45, 172-214) are declared but never referenced in JSX. This will become live code once the disposition section is added (see critical finding above).

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No direct DB calls from route handlers | PASS | All routes delegate to service layer |
| Service layer separation | PASS | Validation, filtering, and DB queries in services |
| Shared types as single source of truth | PASS | `HIDDEN_STATUSES`, status enums, and field types defined in `Shared/types.ts` |
| Schema changes require migration | PASS | `duplicate_of` and `deprecation_reason` added via idempotent ALTER TABLE |
| Every FR needs a test with traceability | PASS | All 20 backend + 12 frontend tests have `// Verifies: FR-DUP-XX` comments |
| API response patterns | PASS | List endpoints return `{data: T[]}`, single items return directly |
| No hardcoded secrets | PASS | No secrets in code |
| Observability (structured logging) | PASS | All routes use logger; no console.log |
| Business logic has no framework imports | PASS | Services are pure functions with DB access |

---

## Security Review

| Check | Result | Notes |
|-------|--------|-------|
| Input validation: `duplicate_of` | PASS | Required when status=duplicate, validated against DB |
| Self-reference prevention | PASS | `duplicate_of !== id` in both services |
| Terminal status enforcement | PASS | Cannot transition out of duplicate/deprecated |
| SQL injection | PASS | All queries use parameterized statements |
| XSS risk | PASS | No raw HTML rendering of `deprecation_reason` |
| Cross-type references | PASS | `duplicate_of` validates against same-type table only |

---

## Test Coverage Assessment

### Backend Tests (20/20 passing)
- Duplicate status with validation (bugs + FRs): 8 tests
- Deprecated status with/without reason: 2 tests
- `include_hidden` filtering: 4 tests
- GET by ID returns hidden items: 2 tests
- `duplicated_by` on canonical items: 2 tests
- Terminal status enforcement: 2 tests

### Frontend Tests (12/12 passing)
- Status rendering and styling: 3 tests
- Duplicate count badge: 2 tests
- Detail view banners: 3 tests
- Show hidden toggle: 4 tests

### E2E Tests (22 cases)
- UI navigation, toggle behavior, badge rendering
- API validation (hidden filtering, duplicate_of, self-reference, invalid reference)
- GET by ID for hidden items, duplicated_by list, deprecated with reason

**Traceability:** 100% — all tests have `// Verifies: FR-DUP-XX` comments

### Pre-existing Failures (not caused by this feature)
12 pre-existing test failures across unrelated files (Traceability.test.tsx, Learnings.test.tsx, ImageUpload.test.tsx, OrchestratorCycleCard.test.tsx). None related to duplicate/deprecated changes.

### Test Gaps
- No test for FeatureRequestDetail action buttons (blocked by missing UI)
- No test for BugDetail disposition button interactions
- No test verifying the duplicate banner link navigates correctly (which would have caught the broken link)

---

## Required Actions

| # | Severity | Action | File(s) |
|---|----------|--------|---------|
| 1 | **CRITICAL** | Add disposition JSX to FeatureRequestDetail — buttons and forms for "Mark as Duplicate" / "Mark as Deprecated". State and handlers exist; only JSX is missing. | `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` |
| 2 | **MEDIUM** | Fix duplicate banner links to navigate to the canonical item instead of the list page root. Applies to both bug and FR detail components. | `BugDetail.tsx` line 182, `FeatureRequestDetail.tsx` line 227 |
| 3 | **MINOR** | Execute data migration: mark FR-0008 as duplicate of FR-0009. | Runtime (curl against backend) |
| 4 | **OPTIONAL** | Add frontend tests for disposition buttons and banner link navigation after fixes #1 and #2. | Frontend test files |
