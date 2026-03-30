# Frontend Coder Learnings

## Test Mock Patterns

- When adding new fields to shared types (e.g. `BugReport`, `FeatureRequest`), ALL test files with mock objects of those types need updating — not just the directly related test files. Use `npx tsc --noEmit` to find them all.
- `vi.clearAllMocks()` in `beforeEach` wipes `mockResolvedValue` set in the `vi.mock()` factory. Re-set mocks in each `beforeEach` that uses `clearAllMocks`.
- Components like `BugDetail` and `FeatureRequestDetail` call `repos.list()` and `images.list()` on mount — any test rendering these components needs those mocked.
- The `onSubmit` for `BugForm` and `FeatureRequestForm` now takes 3 args: `(input, imageFiles, targetRepo?)`. Tests expecting 2 args need `expect.anything()` for the third.

## Component Labels

- BugDetail uses "Attachments" (not "Screenshots") for the image section heading.

## Pre-existing Test Failures (as of 2026-03-30)

- `tests/OrchestratorCycleCard.test.tsx` — missing module `CycleCard`
- `tests/OrchestratorCycles.test.tsx` — missing module `CompletedCyclesSection`
- `tests/Learnings.test.tsx` — 2 failures related to cycle filter UI
- These are NOT caused by duplicate/deprecated feature work.
