# ABAC Reimagined (Axon) — Plan 2: Full CRUD Design

**Date:** 2026-04-09  
**Status:** Approved  
**Builds on:** Plan 1 (`docs/superpowers/specs/2026-04-09-abac-reimagined-design.md`)

---

## Goal

Add full create / edit / delete capability for every entity in the Axon app. After Plan 2, the demo is fully self-contained: a presenter can build any ABAC scenario from scratch in the browser without touching seed data.

---

## Core Interaction Pattern

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Edit trigger | Modal dialog | Focused, scales to any viewport, no layout shift |
| Complex editors | Tabbed modal | Groups, Grants, Schedules, Policies get tabs so content doesn't overflow |
| Simple editors | Single-page modal | Users, Sites, Zones, Doors — few enough fields to fit without tabs |
| Rule builder | Inline always-visible dropdowns | No expand/collapse; stable layout; fastest for live demos |
| Delete | Instant, no confirmation | In-memory seed data — snappy UX appropriate for a demo |

### Modal anatomy

```
┌─────────────────────────────────────────────────┐
│ Edit Group — NOC Team                        [✕] │  ← header
├──────────────────────────────────────────────────│
│ [Basics] [Members] [Rules] [Grants]              │  ← tabs (complex only)
├──────────────────────────────────────────────────│
│                                                  │
│   (tab content — forms, rule rows, pickers)      │  ← body (scrollable)
│                                                  │
├──────────────────────────────────────────────────│
│                       [Cancel]  [Save]           │  ← footer
└──────────────────────────────────────────────────┘
```

- Modal opens centered with a dark overlay (`bg-black/60`)
- `Escape` key closes (same as Cancel — discards changes)
- Save writes to Zustand store and closes modal
- New entity: `+ New` button in list page header → same modal, empty fields, uuid() assigned on save

---

## Rule Builder Component

Used in: Group (membership rules), Grant (conditions), Policy (rules), Schedule (holiday entries differ — see below).

```
┌──────────────────────────────────────────────────────────┐
│ Match:  [ALL (AND)] [ANY (OR)]                           │
│                                                          │
│  [department ▾]  [== ▾]  [____________]  [✕]            │
│  [clearanceLevel ▾]  [>= ▾]  [____________]  [✕]        │
│                                                          │
│  [+ Add rule]                                            │
└──────────────────────────────────────────────────────────┘
```

- **Left side dropdown** — attribute name, populated from a fixed list of known User attributes: `department`, `role`, `clearanceLevel`, `type`, `status`, plus any `customAttributes` keys present on any user in the store
- **Operator dropdown** — `==`, `!=`, `>=`, `<=`, `>`, `<`, `IN`, `NOT_IN`
- **Value input** — free text; for `IN` / `NOT_IN` accepts comma-separated values
- **AND/OR toggle** — segmented control above the rule list; applies to `conditionLogic` / `logicalOperator`
- **+ Add rule** — appends a new blank row immediately (no animation)
- **✕** — removes that row immediately (no animation)

### Reusable component

`src/components/RuleBuilder.tsx` — accepts `rules: Rule[]`, `logic: 'AND' | 'OR'`, `onChange(rules, logic)`. Used by all four editors that need it.

---

## Zustand Store Extensions

Add to `store.ts` for every entity:

```typescript
// Pattern: add, update, delete
addUser(user: User): void        // assigns uuid if id missing
updateUser(user: User): void
deleteUser(id: string): void     // cascade: remove from group.members

addGroup(group: Group): void
updateGroup(group: Group): void
deleteGroup(id: string): void    // cascade: remove from other groups' subGroups

addGrant(grant: Grant): void
updateGrant(grant: Grant): void
deleteGrant(id: string): void    // cascade: remove from group.inheritedPermissions

addSchedule(schedule: NamedSchedule): void
updateSchedule(schedule: NamedSchedule): void
deleteSchedule(id: string): void  // cascade: clear grant.scheduleId, policy.scheduleId

addPolicy(policy: Policy): void
updatePolicy(policy: Policy): void
deletePolicy(id: string): void

addDoor(door: Door): void
updateDoor(door: Door): void
deleteDoor(id: string): void     // cascade: remove from policy.doorIds, controller.doorIds

addZone(zone: Zone): void
updateZone(zone: Zone): void     // already exists in Plan 1
deleteZone(id: string): void     // cascade: clear door.zoneId

addSite(site: Site): void
updateSite(site: Site): void     // already exists in Plan 1
deleteSite(id: string): void     // cascade: delete zones and doors belonging to this site

addController(controller: Controller): void
updateController(controller: Controller): void
deleteController(id: string): void
```

Canvas positions auto-initialized when a new Group, Grant, Schedule, or Door is added (append to relevant column with y offset).

---

## Entity Editors

### Users — Simple modal

**Fields:**
- Name (text)
- Email (text)
- Department (text)
- Role (text)
- Clearance Level (1–5 numeric picker or segmented: L1 L2 L3 L4 L5)
- Type (segmented: employee / contractor / visitor)
- Status (segmented: active / suspended / inactive)
- Custom Attributes — key/value row table with + Add / ✕ Remove (same stable-row pattern as rule builder)

### Groups — Tabbed modal (4 tabs)

**Tab 1 — Basics:** Name, Description  
**Tab 2 — Members:** Scrollable checklist of all users (name + department shown). Check = member.  
**Tab 3 — Rules:** RuleBuilder component. Rules here populate `membershipRules`.  
**Tab 4 — Grants:** Scrollable checklist of all grants (name + scope shown). Check = inherited permission.  

Note: both Members and Rules are always shown (no dynamic/static toggle). The engine uses whichever is populated.

### Grants — Tabbed modal (4 tabs)

**Tab 1 — Basics:**
- Name, Description
- Scope (segmented: global / site / zone)
- Target — dropdown of sites or zones, filtered by scope selection (hidden when scope = global)
- Application Mode (segmented: assigned / conditional / auto)

**Tab 2 — Actions:** Checkbox grid of all `ActionType` values (unlock, arm, disarm, lockdown, view_logs, manage_users, manage_tasks, override)

**Tab 3 — Conditions:** RuleBuilder component. Results populate `conditions`.

**Tab 4 — Schedule:** Single dropdown of all schedules (or "None"). Shows schedule name + timezone.

### Schedules — Tabbed modal (3 tabs)

**Tab 1 — Basics:** Name, Timezone (text input with IANA placeholder)

**Tab 2 — Time Windows:** List of window rows. Each row:
- Day checkboxes: Mon Tue Wed Thu Fri Sat Sun (inline, no animation)
- Start time (HH:MM input)
- End time (HH:MM input)
- ✕ remove
- `+ Add window` button below list

**Tab 3 — Holidays:** List of holiday rows. Each row:
- Name (text)
- Month (1–12 numeric)
- Day (1–31 numeric)
- Behavior (segmented: deny_all / allow_with_override / normal)
- Required Clearance (numeric, only shown when behavior = allow_with_override)
- Override Grants (multi-select checkboxes of grants, only shown when behavior = allow_with_override)
- ✕ remove
- `+ Add holiday` button below list

### Sites — Simple modal

Name, Address, Timezone (text), Status (segmented: Disarmed / Armed / PartialArm / Alarm / Lockdown)

### Zones — Simple modal

Name, Site (dropdown), Type (segmented: Perimeter / Interior / Restricted / Public / Secure), Status (segmented: Armed / Disarmed / Alarm)

### Doors — Simple modal

Name, Site (dropdown), Zone (dropdown filtered by selected site), Description, Custom Attributes (key/value rows same as Users)

### Policies — Tabbed modal (4 tabs)

**Tab 1 — Basics:** Name, Description, Logical Operator (AND / OR segmented)  
**Tab 2 — Rules:** RuleBuilder component  
**Tab 3 — Doors:** Scrollable checklist of all doors (name + site shown)  
**Tab 4 — Schedule:** Single dropdown (or None)

### Controllers — Simple modal

Name, Location (text), Site (dropdown), Doors (scrollable checklist filtered by site)

---

## CommandPalette (⌘K)

Global keyboard shortcut `Ctrl+K` / `⌘K` opens a centered search overlay:

```
┌─────────────────────────────────────────────┐
│  🔍  Search entities...                     │
├─────────────────────────────────────────────┤
│  Users                                      │
│    Sarah Chen — Security · L3               │
│    James Park — NOC · L2                    │
│  Groups                                     │
│    NOC Team                                 │
│  Grants                                     │
│    NOC After Hours Access                   │
└─────────────────────────────────────────────┘
```

- Filters all entities (Users, Groups, Grants, Schedules, Doors, Sites, Zones, Policies) by name as user types
- Results grouped by entity type, max 4 per group shown
- `↑` `↓` to navigate, `Enter` or click navigates to that entity's list page
- `Escape` closes
- Implemented as `src/components/CommandPalette.tsx` (already stubbed in Layout)
- Registered via `useEffect` keydown listener in Layout

---

## File Map

```
src/
├── components/
│   ├── RuleBuilder.tsx          # Reusable rule row editor (NEW)
│   ├── CommandPalette.tsx       # ⌘K overlay (REPLACE stub)
│   └── Modal.tsx                # Generic modal wrapper with overlay + Escape (NEW)
├── store/
│   └── store.ts                 # Add all CRUD actions + canvas init for new nodes (MODIFY)
├── pages/
│   ├── People.tsx               # Add Edit/Delete buttons + UserModal (MODIFY)
│   ├── Groups.tsx               # Add Edit/Delete buttons + GroupModal (MODIFY)
│   ├── Grants.tsx               # Add Edit/Delete buttons + GrantModal (MODIFY)
│   ├── Schedules.tsx            # Add Edit/Delete buttons + ScheduleModal (MODIFY)
│   ├── Sites.tsx                # Add Edit/Delete buttons + SiteModal (MODIFY)
│   ├── Doors.tsx                # Add Edit/Delete buttons + DoorModal (MODIFY)
│   └── Layout.tsx               # Wire up CommandPalette (MODIFY)
└── modals/                      # (NEW directory)
    ├── UserModal.tsx
    ├── GroupModal.tsx
    ├── GrantModal.tsx
    ├── ScheduleModal.tsx
    ├── SiteModal.tsx
    ├── ZoneModal.tsx
    ├── DoorModal.tsx
    ├── PolicyModal.tsx
    └── ControllerModal.tsx
```

Missing entity pages (Zones, Policies, Controllers) need to be created as full list pages with Edit/Delete/+ New, following the same pattern as existing pages.

---

## New Pages Required

**Zones** (`src/pages/Zones.tsx`) — List zones grouped by site. Edit/Delete/+ New.  
**Policies** (`src/pages/Policies.tsx`) — List policies with rule count, door count. Edit/Delete/+ New.  
**Controllers** (`src/pages/Controllers.tsx`) — List controllers with door count. Edit/Delete/+ New.  

Add these three routes to `App.tsx` and sidebar items to `Layout.tsx`.

---

## Design Constraints

- **No external form libraries** — plain controlled React inputs only (YAGNI)
- **No animation** — no transitions, no expand/collapse, no layout shifts
- **In-memory only** — all edits live in Zustand; page refresh resets to seed data (by design for a demo)
- **Cascade deletes** — deleting an entity cleans up all references in other entities' arrays
- **Canvas auto-position** — new Group, Grant, Schedule, Door nodes get canvas positions appended to their column at the bottom

---

## Out of Scope (Plan 3)

- Persistence (localStorage or backend)
- Drag-and-drop subgroup assignment
- Bulk operations
- Undo/redo
