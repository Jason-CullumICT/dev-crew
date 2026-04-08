# Design QA Report — ABAC SOC Demo v3 (Schedules First-Class)

**Date:** 2026-04-09  
**Reviewer:** TheDesigners / design-qa  
**Branch:** feat/schedules-first-class  
**Verdict:** FAIL — 1 Blocker, 4 Warnings, 1 Cosmetic

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Blocker  | 1     | FIXED  |
| Warning  | 4     | FIXED  |
| Cosmetic | 1     | Open   |

---

## BLOCKER

### B-1: Controllers page — white-screen crash on render

**File:** `src/pages/Controllers.tsx`

**Root cause:** `controller.doorIds` is `undefined` on seed records loaded via `as any` cast in `realWorldData.ts`. Three call sites access it without a null guard:

| Line | Expression | Fix |
|------|-----------|-----|
| 79   | `[...controller.doorIds]` | `[...(controller.doorIds ?? [])]` |
| 162  | `controller.doorIds.map(...)` | `(controller.doorIds ?? []).map(...)` |
| 197  | `controller.doorIds.length` | `(controller.doorIds ?? []).length` |

**Status:** Fixed in this session.

---

## WARNINGS

### W-1: Permissions tiles — not clickable

**File:** `src/pages/Permissions.tsx`

The grant card `<div>` (line 178) has no `onClick` handler. Users cannot open the edit modal by clicking the tile — only the explicit "Edit" button works.

**Fix:** Added `onClick={() => openEdit(grant)}` + `cursor-pointer hover:border-gray-600 transition-colors` to card wrapper. Added `e.stopPropagation()` to Delete button to prevent double-fire.

**Status:** Fixed in this session.

### W-2: Navigation layout — 13 items vs 7 approved

**File:** `src/components/Layout.tsx`

The nav bar had 13 items in a single undifferentiated row. The approved design spec lists 7 primary items. The remaining 6 are operational/diagnostic tools that cluttered the primary navigation.

**Fix:** Split into `primaryNavItems` (7: Dashboard, Schedules, Groups, Policies, Permissions, People, Infrastructure) and `secondaryNavItems` (6: Arming, Doors, Controllers, Tasks, Test Access, Access Matrix). Secondary items render dimmer (`text-slate-500`) after a `|` separator.

**Status:** Fixed in this session.

### W-3: NowPill — missing timezone abbreviation

**File:** `src/components/Layout.tsx`

The clock pill showed `Wed 14:22` but the spec shows `Wed 14:22 AEST`. Without a timezone label, times are ambiguous in a multi-site SOC context.

**Fix:** Added `Intl.DateTimeFormat().resolvedOptions().timeZone` extraction, rendered as a dimmed suffix inside the pill.

**Status:** Fixed in this session.

### W-4: Arming page — `allSchedules` missing from storeSnapshot

**File:** `src/pages/Arming.tsx`

`storeSnapshot` passed to `hasPermission` / `evaluateAccess` was missing `allSchedules`. The `StoreSnapshot` type requires this field. Without it, schedule-gated group membership evaluations silently skip the schedule check, producing incorrect `authorizedUsers` results.

**Fix:** Added `const schedules = useStore((s) => s.schedules)` and `allSchedules: schedules` to the snapshot object.

**Status:** Fixed in this session.

---

## COSMETIC

### C-1: Permissions cards — redundant "Edit" button

**File:** `src/pages/Permissions.tsx`

Now that the entire card is clickable (W-1 fix), the explicit "Edit" button inside the card is redundant. It is not wrong — it aids discoverability — but it adds visual noise.

**Recommendation:** Remove the "Edit" button; rely on the card click affordance + `cursor-pointer` styling.

**Status:** Open — left for product decision.

---

## Notes

All crashes in this session trace to the same root cause: `as any` casts in `realWorldData.ts` bypass TypeScript's type system, allowing seed records with missing optional array fields (`doorIds`, `membershipRules`, `inheritedPermissions`, `rules`, `doorIds`, `conditions`, `actions`) to reach components that call `.map()`, `.filter()`, `.some()`, `.length`, `.includes()` directly.

**Long-term fix:** Remove `as any` casts and align seed data with the TypeScript types, or add explicit fallback defaults in the store initialization layer.
