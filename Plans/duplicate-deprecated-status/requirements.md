# Requirements: Duplicate/Deprecated Status for Bugs & Feature Requests

## Problem Statement

There is no way to mark bugs or feature requests as duplicates of other items, or as deprecated/superseded. Stale items clutter the list and slow triage.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-DUP-01 | Add `duplicate` and `deprecated` to both `BugStatus` and `FeatureRequestStatus` type unions | Must |
| FR-DUP-02 | Add `duplicate_of` (string, nullable) and `deprecation_reason` (string, nullable) fields to both entity types | Must |
| FR-DUP-03 | Add computed `duplicated_by` (string[]) to both entity types listing IDs that reference this item as `duplicate_of` | Must |
| FR-DUP-04 | PATCH endpoints accept `status: "duplicate"` + required `duplicate_of`, or `status: "deprecated"` + optional `deprecation_reason` | Must |
| FR-DUP-05 | List endpoints exclude duplicate/deprecated items by default; `?include_hidden=true` includes them | Must |
| FR-DUP-06 | Detail endpoints always return the full item regardless of status | Must |
| FR-DUP-07 | Validate `duplicate_of` references a real item of the same type and is not self-referencing | Must |
| FR-DUP-08 | Schema migration adds `duplicate_of` and `deprecation_reason` columns to both tables | Must |
| FR-DUP-09 | Detail view: action buttons to mark as Duplicate (ID picker) or Deprecated (reason field) | Must |
| FR-DUP-10 | Detail view: banners for duplicate items (link to canonical) and deprecated items (reason) | Must |
| FR-DUP-11 | List view: toggle to show hidden (duplicate/deprecated) items | Must |
| FR-DUP-12 | Canonical items show duplicate count badge in list view | Should |
| FR-DUP-13 | `duplicate` and `deprecated` count as resolved for dependency gating | Must |

## Non-Functional Requirements

- Idempotent schema migration (check column existence before ALTER)
- No breaking changes to existing API consumers (hidden filter is additive)
- Input length limit on `deprecation_reason` (same as description: 10000 chars)

## Known Duplicates to Resolve Post-Implementation

- FR-0008 (portal dependency tracking) should be marked `duplicate` of FR-0009 (dependency linking with dispatch gating)

## Verdict: APPROVED
