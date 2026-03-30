# Audit Report: Duplicate/Deprecated Tagging Feature

**Auditor:** TheInspector
**Date:** 2026-03-30
**Team:** TheATeam
**Feature:** Allow bugs and feature requests to be tagged as duplicate or deprecated with optional hiding

---

## Executive Summary

The implementation is **~95% complete** with strong backend coverage and good test traceability. One **critical UI gap** exists: the FeatureRequestDetail component is missing the rendered JSX for its "Mark as Duplicate" / "Mark as Deprecated" action buttons and forms, despite having the state variables and handlers fully implemented. A data migration (FR-0008 as duplicate of FR-0009) was also not executed.

**Verdict:** PASS WITH REQUIRED FIXES (1 critical, 1 minor)

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
| FR-DUP-10 | Detail view: banners for duplicate/deprecated items | PASS | Both components render purple (duplicate) and gray (deprecated) banners |
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

**Reference implementation:** `portal/Frontend/src/components/bugs/BugDetail.tsx` has the complete working version.

---

## Minor Findings

### MINOR: Missing dedicated API input types

**File:** `portal/Shared/api.ts`

**Problem:** Spec references `MarkDuplicateInput` and `MarkDeprecatedInput` types, but the implementation embeds these fields into the generic `UpdateFeatureRequestInput` / `UpdateBugInput` types instead.

**Impact:** Low. The generic types work correctly. Dedicated types would improve API documentation but are not functionally necessary.

**Recommendation:** Accept as-is. The generic update types cover the use case.

### MINOR: Data migration not executed (FR-DUP-14)

FR-0008 should be marked as duplicate of FR-0009 per the spec's "Known Duplicates to Resolve" section. The dispatch plan includes the curl command but it was not run.

**Recommendation:** Execute after the critical fix is deployed.

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
| Observability (structured logging) | N/A | No new routes added; existing middleware covers logging |

---

## Test Coverage Assessment

### Backend Tests (20/20 passing)
- Duplicate status with validation (bugs + FRs): 8 tests
- Deprecated status with/without reason: 2 tests
- `include_hidden` filtering: 4 tests
- GET by ID returns hidden items: 2 tests
- `duplicated_by` on canonical items: 2 tests
- Terminal status enforcement: 2 tests

**Traceability:** 100% — all tests have `// Verifies: FR-DUP-XX` comments

### Frontend Tests (12/12 passing)
- Status rendering and styling: 3 tests
- Duplicate count badge: 2 tests
- Detail view banners: 3 tests
- Show hidden toggle: 4 tests

**Traceability:** 100% — all tests have `// Verifies: FR-DUP-XX` comments

### Test Gaps
- No test for FeatureRequestDetail action buttons (blocked by missing UI)
- No test for BugDetail disposition UI
- No test for canonical items with zero duplicates

---

## Required Actions

1. **[CRITICAL]** Add disposition JSX to `FeatureRequestDetail.tsx` — buttons and forms for "Mark as Duplicate" / "Mark as Deprecated". State and handlers already exist; only the rendered UI is missing.
2. **[MINOR]** Execute data migration: mark FR-0008 as duplicate of FR-0009.
3. **[OPTIONAL]** Add frontend test for FeatureRequestDetail disposition buttons after fix #1.
