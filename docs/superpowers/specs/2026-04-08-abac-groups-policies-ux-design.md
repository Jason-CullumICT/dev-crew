# ABAC Demo — Groups & Policies UX Redesign

**Date:** 2026-04-08  
**Scope:** `abac-soc-demo-v2/src/pages/Groups.tsx`, `abac-soc-demo-v2/src/pages/Policies.tsx`, `abac-soc-demo-v2/src/data/realWorldData.ts`  
**Team:** TheATeam (no external checks — UI/UX mock only)  
**Design QA priority:** Simplicity first, UX second

---

## Goal

Replace the current technical-vocabulary UI (raw dropdowns, attribute strings, rule builders) with human-readable, chip-based interfaces that a non-technical persona can use to build and understand complex ABAC Groups and Policies. The underlying data model and store are unchanged — the UX translates plain language into the existing rule/grant structures invisibly.

---

## Groups Page

### UX Pattern: Sentence Builder (Option A)

Group cards read as plain-English sentences composed of labelled chips. No raw attribute strings are exposed. The modal for creating/editing a group uses the same chip grammar.

### Card list view

Each group card shows:
- **Name** + **badge labels** (not a dropdown): `auto-enrolled` (dynamic/hybrid), `time-gated` (has time-window conditions), `hand-picked` (explicit)
- **Member count** (for explicit/hybrid) or omitted for pure dynamic
- **Sentence row:** chips inline — e.g. `People who work in [Security] and are [Active] during [20:00–06:00] on [Weekdays]`
- Edit / Delete actions

Chip colour convention:
| Chip type | Colour |
|---|---|
| Department / Role / Type | Indigo (`bg-indigo-900 text-indigo-300`) |
| Status | Green (`bg-green-900 text-green-300`) |
| Clearance | Violet (`bg-violet-900 text-violet-300`) |
| Time / Schedule | Amber (`bg-amber-900 text-amber-300`) |
| Group reference | Slate (`bg-slate-700 text-slate-300`) |

### Create/Edit modal

Sections (replacing raw dropdowns and RuleBuilder):

1. **Name** — text input, unchanged
2. **Who belongs?** — sentence builder row. User clicks `+ add condition` to add chips:
   - Attribute picker (dropdown with human labels): "works in [dept]", "has [clearance] clearance", "is [status]", "has role [role]"
   - Each condition becomes a chip; chips are removable
3. **When?** (optional) — time-window chip builder: day picker + start/end time. Produces an amber chip e.g. `Mon–Fri 20:00–06:00`. Adding any time condition applies `time-gated` badge.
4. **Membership type** — hidden from user; derived automatically:
   - Only attribute conditions → `dynamic` (auto-enrolled badge)
   - Only explicit members → `explicit` (hand-picked badge)
   - Both → `hybrid`
5. **Explicitly add members** (optional, for explicit/hybrid) — existing searchable checkbox list, unchanged
6. **Inherited Grants** — existing grant picker, unchanged

Chip conditions translate to `membershipRules` Rule objects on save:
- "works in Engineering" → `{ leftSide: "user.department", operator: "==", rightSide: "Engineering" }`
- "has Confidential clearance" → `{ leftSide: "user.clearanceLevel", operator: ">=", rightSide: "Confidential" }`
- "is Active" → `{ leftSide: "user.status", operator: "==", rightSide: "Active" }`
- Time window chips → `now.hour >= X` AND `now.hour < Y` + day rules

### Three demo groups (seeded into store)

| Name | Sentence | Grants | Badge |
|---|---|---|---|
| Data Centre Engineers | People who work in `Engineering` with `Confidential` clearance and are `Active` | Data Centre Unlock | auto-enrolled |
| Night Shift Security | People in `Security` who are `Active` during `20:00–06:00` on `Weekdays` | All Doors Unlock | auto-enrolled · time-gated |
| Cleared Contractors | People of type `Contractor` with `TopSecret` clearance who are `Active` during `Business Hours` | Escorted Access | auto-enrolled · time-gated |

---

## Policies Page

### UX Pattern: Colour-Coded Lanes (Option C)

Each policy card shows three horizontally-stacked colour-coded lanes. Each lane is independently readable and editable. No rule builder exposed.

### Lane colour convention

| Lane | Colour | Meaning |
|---|---|---|
| People | Indigo / Purple | Who this applies to — Group chips or attribute chips |
| Time | Amber | When it's active — schedule chips |
| Doors | Green | Which doors it unlocks |

### Card list view

Each policy card shows:
- **Name** + optional `⚠ Override` badge for policies with no time restriction and all-doors access
- Three lanes, each showing their chips inline
- OR logic shown as `OR` label between chips within a lane
- Edit / Delete actions
- Expand/collapse for the detail lanes (default: expanded)

### Create/Edit modal

Three sections replace the current flat form:

1. **Name** — text input, unchanged
2. **People lane** — chip builder:
   - "From group [picker]" → adds a Group chip (renders as group name, saves as `user IN group.GroupName` rule)
   - "Where [attribute] [is/has]" → adds an attribute chip
   - Multiple chips default to AND; toggle OR available per lane
3. **Time lane** (optional) — same day + time-window chip builder as Groups; if empty, policy is always-active
4. **Doors lane** — existing door checkbox picker, displayed as green chips; unchanged data model (`doorIds`)

Chips in the People lane translate to `rules` Rule objects on save. Group chips use the existing `user IN group.X` syntax the engine already resolves.

### Three demo policies (seeded into store)

| Name | People Lane | Time Lane | Doors Lane |
|---|---|---|---|
| Business Hours — All Staff | `Any department` · `Active` | `Mon–Fri` `08:00–18:00` | Main Entrance · East Wing Lobby · West Wing Lobby |
| After-Hours Research Lab | `Data Centre Engineers` _(group ref)_ · `Confidential+` | `Always (24/7)` | Research Lab Entry · Lab Server Room |
| Emergency Override | `Security` OR `Emergency Team` · `TopSecret` | `Always (no restriction)` | All Doors |

The "After-Hours Research Lab" policy People lane references the "Data Centre Engineers" Group by name — demonstrating the cross-page ABAC layering.

---

## What does NOT change

- `types/index.ts` — no type changes
- `store/store.ts` — no store shape changes
- `engine/accessEngine.ts` — no engine changes
- `RuleBuilder` component — kept but not surfaced in Groups or Policies UI (used by other pages)
- `AttributeEditor`, `ScheduleEditor` — unchanged
- All other pages — untouched

---

## Constraints

- This is a UI/UX mock — no backend, no API calls
- No external team checks (TheATeam internal pipeline only)
- Design QA gate: simplicity first — if any chip label requires technical knowledge to understand, it must be reworded
- All chip-to-rule translation happens at save time in the component; the store receives standard `Rule[]` objects

---

## Files to modify

| File | Change |
|---|---|
| `src/pages/Groups.tsx` | Full rewrite of card list + modal with sentence builder UX |
| `src/pages/Policies.tsx` | Full rewrite of card list + modal with colour-coded lanes UX |
| `src/data/realWorldData.ts` | Add 3 demo Groups (with grants) + 3 demo Policies referencing them |
