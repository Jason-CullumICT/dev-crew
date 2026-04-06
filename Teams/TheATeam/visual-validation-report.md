# Visual Validation Report

**Feature:** <!-- feature name -->
**Agent:** <!-- role that generated this report -->
**Cycle:** <!-- run ID -->
**Date:** <!-- ISO date -->

## Pages / Views Validated

| Page | URL / Route | Method | Result |
|------|-------------|--------|--------|
| <!-- page --> | <!-- route --> | Static / Dynamic | ✅ Pass / ❌ Fail |

## Validation Method

- [ ] Static analysis (read component code, check render logic)
- [ ] Dynamic (browser screenshot or DOM inspection via claude-in-chrome)

## Layout Checks

- [ ] No layout overflow or clipping at 1280px viewport
- [ ] Responsive at 768px (tablet)
- [ ] Dark mode renders correctly (if applicable)
- [ ] Loading states present where async data is fetched
- [ ] Empty states present where lists can be empty
- [ ] Error states handled visually

## Data Rendering

- [ ] All required fields display
- [ ] Numbers formatted correctly (currency, dates, counts)
- [ ] Long strings truncate gracefully (no overflow)
- [ ] Null/undefined values don't render as "null" or "undefined"

## Screenshots / Evidence

<!-- Paste paths to screenshots taken, or describe what was visually confirmed -->

## Issues Found

| Severity | Issue | Page | Screenshot |
|----------|-------|------|-----------|
| <!-- P1/P2/P3 --> | <!-- description --> | <!-- page --> | <!-- path or N/A --> |

## Verdict

- [ ] **APPROVED** — visually correct, ready to merge
- [ ] **CHANGES REQUIRED** — see issues above
