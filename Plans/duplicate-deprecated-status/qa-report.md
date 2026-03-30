# QA Report: Duplicate/Deprecated Status for Bugs & Feature Requests

**Date:** 2026-03-30
**QA Agent:** test
**Team:** TheATeam
**RISK_LEVEL:** medium

## Summary

Implementation reviewed against specifications (`Plans/duplicate-deprecated-status/requirements.md`), API contracts (`Plans/duplicate-deprecated-status/contracts.md`), and dispatch plan (`Plans/duplicate-deprecated-status/dispatch-plan.md`).

## Requirements Coverage

| FR ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| FR-DUP-01 | Add `duplicate`/`deprecated` to status unions | PASS | Both `BugStatus` and `FeatureRequestStatus` updated in `portal/Shared/types.ts:7,11` |
| FR-DUP-02 | Add `duplicate_of`, `deprecation_reason` fields | PASS | Added to both `FeatureRequest` and `BugReport` interfaces |
| FR-DUP-03 | Computed `duplicated_by` field | PASS | Computed via DB query in both `mapBugRow` and `mapFRRow` |
| FR-DUP-04 | PATCH endpoints accept new statuses | PASS | Both routes forward `duplicate_of`/`deprecation_reason`; validation in service layer |
| FR-DUP-05 | List endpoints filter hidden by default | PASS | `include_hidden` query param implemented in both routes and services |
| FR-DUP-06 | Detail endpoints always return full item | PASS | No filtering on GET by ID |
| FR-DUP-07 | Validate `duplicate_of` references | PASS | Self-ref check, existence check, correct table |
| FR-DUP-08 | Schema migration | PASS | Idempotent ALTER TABLE in `schema.ts:232-247` |
| FR-DUP-09 | Detail view action buttons | PASS | "Mark as Duplicate" and "Mark as Deprecated" in both BugDetail and FeatureRequestDetail |
| FR-DUP-10 | Detail view banners | PASS | Duplicate (purple) and deprecated (gray) banners with links/reasons |
| FR-DUP-11 | List view show/hide toggle | PASS | Checkbox "Show hidden (duplicate/deprecated)" in both pages; passes `include_hidden` to API |
| FR-DUP-12 | Canonical items duplicate count badge | PASS | Purple pill badge in both BugList and FeatureRequestList |
| FR-DUP-13 | Added to RESOLVED_STATUSES | PASS | `duplicate` and `deprecated` in `RESOLVED_STATUSES` constant |

## Test Results

### Backend Tests
- **508 tests passed, 0 failed** (all 15 test files pass)
- New FR-DUP tests added in `bugs.test.ts` and `featureRequests.test.ts`
- Tests cover: list filtering, mark duplicate with valid/invalid/self/missing `duplicate_of`, mark deprecated with/without reason, `duplicated_by` computation, terminal status transitions

### Frontend Tests
- **206 passed, 2 failed** (3 failed test files, 12 passed) — all failures are **pre-existing**, not regressions
- New FR-DUP tests added: show hidden toggle, `include_hidden` param passing, `duplicated_by` badge rendering
- Feature-specific tests (BugReports.test.tsx + FeatureRequests.test.tsx): **29/29 passed**

### Pre-existing Frontend Failures (NOT regressions)
- `Learnings.test.tsx` (2 test failures) — filter UI button text changed, cycle filter assertion mismatch
- `OrchestratorCycleCard.test.tsx`, `OrchestratorCycles.test.tsx` — import/transform failures (0 tests run)

### E2E Tests
- Written to `Source/E2E/tests/cycle-run-1774854074575-0d7e6a2e/duplicate-deprecated-status.spec.ts`
- 14 test cases covering: API CRUD, validation, list filtering, UI toggle, console error check

## Traceability

All implementation files contain `// Verifies: FR-DUP-XX` comments. Traceability enforcer targets `Plans/orchestrated-dev-cycles/requirements.md` (unrelated to this feature) so its failures are not relevant to this change.

## Findings

### MEDIUM: Duplicate banner link is generic (BugDetail + FeatureRequestDetail)

**Files:** `portal/Frontend/src/components/bugs/BugDetail.tsx:182`, `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:228`

The duplicate banner links to `/bugs` or `/feature-requests` list pages rather than deep-linking to the canonical item's detail view. This is because the detail view uses a selection-based pattern (click in list to open detail panel), not individual routes per item. The current behavior is acceptable for v1 but could be improved to scroll-to or auto-select the canonical item.

**Severity:** LOW — cosmetic, no functional impact.

### MEDIUM: Bug service lacks explicit STATUS_TRANSITIONS map

**File:** `portal/Backend/src/services/bugService.ts`

Unlike `featureRequestService.ts` which has an explicit `STATUS_TRANSITIONS` map controlling allowed transitions, `bugService.ts` allows any status-to-status transition as long as the target is in `VALID_BUG_STATUSES`. The only guard is the terminal-status check for `duplicate`/`deprecated`. This means bugs can go from `closed` → `reported` which may not be intended.

**Severity:** MEDIUM — pre-existing design gap, not introduced by this feature. The duplicate/deprecated terminal status guard is correctly implemented.

### INFO: `HIDDEN_STATUSES` correctly used across all layers

The `HIDDEN_STATUSES` constant from Shared types is imported and used consistently in:
- Backend services (list filtering)
- Frontend list components (opacity styling)
- Frontend detail components (hiding action buttons)
- Frontend pages (show/hide toggle)

### INFO: Dependency gating integration correct

`RESOLVED_STATUSES` includes `duplicate` and `deprecated`, so items blocked by a duplicate/deprecated item will correctly cascade to unblocked. `onItemCompleted` fires when transitioning to these statuses.

### INFO: Fields cleared on status transitions

When transitioning to `duplicate`: `deprecation_reason` is cleared.
When transitioning to `deprecated`: `duplicate_of` is cleared.
When transitioning to any other status: both fields are cleared.
This prevents stale data from persisting across status changes.

## Architecture Compliance

- [x] No direct DB calls from route handlers — service layer pattern maintained
- [x] Shared types are single source of truth — `portal/Shared/types.ts` updated once
- [x] FR traceability comments present in all modified files
- [x] Schema changes use idempotent migration pattern
- [x] No hardcoded secrets
- [x] List endpoints return `{data: T[]}` wrappers
- [x] Structured logging used (not console.log)
- [x] Business logic has no framework imports (service files)

## Verdict: APPROVED

All 13 functional requirements implemented and tested. Zero new test failures. Backend tests pass 100%. Implementation follows architecture rules and API contracts.
