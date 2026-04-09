# ABAC Reimagined — Design Specification

**Date:** 2026-04-09  
**Status:** Approved for implementation  
**App codename:** Axon

---

## Vision

A ground-up ABAC access control, intrusion detection, and grants platform built for two audiences simultaneously: **security operators** who live in the tool daily and need speed and density, and **architects** who need to understand exactly why the system behaves the way it does.

The signature UX idea: **three lenses on one data model**.

- **Canvas** — author the policy model visually
- **Oracle** — query the model in plain structured language
- **Reasoner** — debug any access decision step by step

Nothing is inherited from previous ABAC demo versions (v1, v2, v3). This is a clean-slate implementation.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | React 19 |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 |
| Router | React Router v7 |
| Build | Vite 8 |
| Icons | lucide-react |
| IDs | uuid v13 |
| Language | TypeScript 5.9 (strict) |

**Project location:** New standalone Vite app at `abac-soc-demo-v3/abac-reimagined/`

---

## Visual Design Language

- **Palette:** Near-black base (`#060912`), slate surfaces (`#0b0e18`, `#0f1320`), indigo/violet accent system (`#6366f1` Canvas, `#8b5cf6` Oracle, `#06b6d4` Reasoner)
- **Typography:** System sans-serif, 11–13px UI, monospace for rules/code
- **Surfaces:** Rounded cards (8–12px radius), subtle border (`#1e293b`), no heavy shadows
- **Motion:** Subtle transitions (150ms), no decorative animation
- **Density:** Compact but not cramped — operators need information density

---

## Information Architecture

### Icon Sidebar (56px wide)

Top section — three lenses, each with a distinct icon colour:
- **Canvas** — indigo `#6366f1` — graph/node icon
- **Oracle** — violet `#8b5cf6` — search icon  
- **Reasoner** — cyan `#06b6d4` — waveform/trace icon

Separator

Middle section — entity management (all dimmed `#374151` until active):
- **People** (users)
- **Groups**
- **Grants**
- **Schedules**
- **Doors**
- **Sites & Zones**

Separator

Bottom section:
- **Intrusion** — red-tinted icon
- **Avatar** (bottom, with initials)

### Top Bar (42px)

- Left: Active lens/section name + entity count summary
- Right: `⌘K` pill (always accessible, opens Oracle query palette from anywhere) + NowPill (live clock, day + time + timezone abbreviation, green pulse dot)

---

## Data Model

### User
```typescript
interface User {
  id: string
  name: string
  email: string
  department: string
  role: string
  clearanceLevel: number          // 1–5
  type: 'employee' | 'contractor' | 'visitor'
  status: 'active' | 'suspended' | 'inactive'
  customAttributes: Record<string, string>
}
```

### Group
```typescript
interface Group {
  id: string
  name: string
  description: string
  membershipType: 'static' | 'dynamic'
  members: string[]               // userId[] — for static groups
  membershipRules: Rule[]         // for dynamic groups
  subGroups: string[]             // groupId[] — NESTED GROUPS (new)
  inheritedPermissions: string[]  // grantId[] — grants assigned to this group
}
```

Group membership is **transitive**: member of subgroup → member of parent group → inherits parent's grants.

### Grant
```typescript
interface Grant {
  id: string
  name: string
  description: string
  scope: 'global' | 'site' | 'zone'
  targetId?: string               // siteId or zoneId when scope !== 'global'
  actions: ActionType[]
  applicationMode: 'assigned' | 'conditional' | 'auto'
  conditions: Rule[]              // evaluated when mode === 'conditional' | 'auto'
  conditionLogic: 'AND' | 'OR'
  scheduleId?: string             // links to a NamedSchedule
  customAttributes: Record<string, string>
}

type ActionType = 'unlock' | 'arm' | 'disarm' | 'lockdown' | 'view_logs' | 'manage_users' | 'manage_tasks' | 'override'
```

### NamedSchedule
```typescript
interface NamedSchedule {
  id: string
  name: string
  timezone: string                // IANA timezone, e.g. 'Australia/Sydney'
  windows: TimeWindow[]           // recurring day/time windows
  holidays: Holiday[]             // named holiday exclusions/overrides (new)
}

interface TimeWindow {
  id: string
  days: DayOfWeek[]               // ['Mon','Tue','Wed','Thu','Fri']
  startTime: string               // 'HH:MM' 24h
  endTime: string                 // 'HH:MM' 24h
}

interface Holiday {
  id: string
  name: string                    // 'Christmas Day', 'ANZAC Day'
  month: number                   // 1–12
  day: number                     // 1–31 (fixed date only — no floating rules)
  behavior: 'deny_all' | 'allow_with_override' | 'normal'
  overrideGrantIds: string[]      // grants that remain active on this holiday
  requiredClearance?: number      // minimum clearance to use override grants
}

type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
```

**Schedule evaluation logic:**
1. Check if current day/time falls in any `TimeWindow` → active if yes
2. Check if current date matches any `Holiday`:
   - `deny_all`: schedule is inactive regardless of window
   - `allow_with_override`: schedule inactive EXCEPT for `overrideGrantIds` (subject to `requiredClearance`)
   - `normal`: holiday has no special effect

### Policy
```typescript
interface Policy {
  id: string
  name: string
  description: string
  rules: Rule[]
  logicalOperator: 'AND' | 'OR'
  doorIds: string[]
  scheduleId?: string
}
```

### Rule
```typescript
interface Rule {
  id: string
  leftSide: string               // 'user.department', 'user.clearanceLevel', 'now.dayOfWeek', etc.
  operator: '==' | '!=' | '>=' | '<=' | '>' | '<' | 'IN' | 'NOT_IN'
  rightSide: string | string[]
}
```

### Door, Site, Zone, Controller
Similar to v3 — no structural changes to these entities.

### StoreSnapshot (for engine calls)
```typescript
interface StoreSnapshot {
  allUsers: User[]
  allGroups: Group[]
  allGrants: Grant[]
  allSchedules: NamedSchedule[]
  allPolicies: Policy[]
  allDoors: Door[]
  allZones: Zone[]
  allSites: Site[]
  allControllers: Controller[]
}
```

---

## ABAC Engine

### Group Membership Resolution (with nesting)

```
resolveGroupMembership(userId, groups) → groupId[]
```

Recursive: for each group, check direct membership (static) or rule match (dynamic). Then for each matched group, add that group's `subGroups`' parent groups too. Circular reference protection via visited set.

Result: the full set of groups (direct + inherited via nesting) a user belongs to.

### Grant Collection

```
collectGrants(userId, groups, grants, store) → grantId[]
```

1. Resolve user's group set (above)
2. Collect `inheritedPermissions` from all matched groups
3. Add any `auto` grants whose conditions all pass for this user
4. Return deduplicated grant IDs

### Schedule Evaluation

```
evaluateSchedule(schedule, now, grantId?) → 'active' | 'inactive' | 'override_active'
```

1. Check holiday match for `now.date`
2. If holiday `deny_all` → return `inactive`
3. If holiday `allow_with_override` and `grantId` is in `overrideGrantIds` and user meets `requiredClearance` → return `override_active`
4. If holiday `allow_with_override` and not override → return `inactive`
5. Check `windows` for `now.dayOfWeek` + `now.hour`/`now.minute` → return `active` or `inactive`

### Access Evaluation

```
evaluateAccess(user, door, store, now) → AccessResult
```

Full result includes:
- `permissionGranted: boolean` — does any grant cover this door + action?
- `abacPassed: boolean` — do all policies assigned to this door pass?
- `overallGranted: boolean` — both layers pass
- `grantResults: GrantResult[]` — per-grant trace
- `policyResults: PolicyResult[]` — per-policy trace
- `groupChain: string[]` — the group inheritance path
- `nowContext: NowContext`
- `activeHoliday?: Holiday` — if a holiday rule is in effect

---

## Three Lenses

### Canvas

**Layout:** Full viewport with dot-grid background. Graph toolbar top-left (`+ Group`, `+ Grant`, `+ Door`, `+ Schedule`, `Select`, `Fit`). Detail panel slides in from right on node selection. Minimap bottom-left.

**Nodes:**
- **Group node** — shows name, membership type badge, and inline subgroup pills (nested groups as pills inside the node, not as floating nodes). Selected state: indigo border + glow.
- **Grant node** — violet tones. Shows name, actions summary, application mode badge.
- **Door node** — slate. Zone restriction shown via red-tinted border for `Restricted` zones.
- **Schedule node** — teal tones. Shows name, window summary, holiday names as small exclusion tags.

**Edges:** Dashed lines with directional arrows. Group→Grant (slate), Grant→Door (violet), Schedule→Grant (teal).

**Detail Panel (right, 228px):** Opens on node click. Shows:
- Entity name + type + key metadata
- Membership rules (monospace, readable)
- Connected entities as chips
- "Edit [entity]" button → slide-over form
- "Query in Oracle" → switches to Oracle pre-filled
- "Trace in Reasoner" → switches to Reasoner pre-filled

**Editing:** Click any node → detail panel. "Edit" button opens a full slide-over form (not a modal). Canvas remains visible behind it.

**Initial node layout:** On first load, nodes are placed in columns by type — Groups column (x≈80), Grants column (x≈320), Doors column (x≈560), Schedules column (x≈320, below Grants) — spaced vertically by index × 100px. Positions are persisted in Zustand so manual drags survive navigation.

### Oracle

**Layout:** Split pane. Left (380px): query form. Right: results.

**Query modes (tabs):**
1. **"Who can access?"** — pick door, action, day, time, holiday toggle, optional clearance filter → evaluates all users
2. **"What can a person access?"** — pick user, day, time, holiday toggle → evaluates all doors

**Query form fields:**
- Door/zone selector (searchable)
- Action selector
- Day-of-week selector
- Time selector (including "Now")
- Holiday toggle — treats the query as if today is a public holiday
- Clearance filter (optional minimum)

**Results display:**
- Natural-language summary of the query shown above results
- Count badges: `N granted` / `N denied`
- Each result row: avatar initials, name, one-line reason (group chain → grant → schedule status), GRANTED/DENIED badge, "Trace" link
- Granted results first, then a divider, then denied results
- Denied rows show the specific reason (clearance too low, no matching grant, holiday exclusion, schedule outside window)
- Footer summary if a holiday rule affected results
- "Export results" button

**⌘K integration:** Pressing ⌘K anywhere in the app opens a floating Oracle palette (not the full Oracle lens) — a single search input. Results appear inline. Click "Full query" to go to the Oracle lens.

### Reasoner

**Layout:** Three-column input strip at top (Person / Door / Time+Date). Below: collapsible step-by-step trace. Final verdict banner at bottom.

**Trace steps (each collapsible):**

1. **Group Membership** — lists all groups the user belongs to, showing the nesting chain (e.g. "Weekend Crew → NOC Team via subgroup"). Pass/fail per group evaluation.

2. **Grant Collection** — lists all grants collected (from groups + auto grants). Shows whether each grant covers this door (scope check).

3. **Schedule Evaluation** — for each grant collected in step 2 that has a `scheduleId`: look up the `NamedSchedule` by `grant.scheduleId`, call `evaluateSchedule(schedule, now, grantId)`, show whether current time is in a window and whether a holiday rule is active. Grants with no `scheduleId` are always schedule-active.

4. **Policy Check** — for each policy assigned to this door: shows each rule evaluation (`user.clearanceLevel >= 3` → resolved `2 >= 3` → FAIL). Pass/fail per policy.

5. **Final Verdict** — large GRANTED (green) or DENIED (red) banner. Shows which layer failed if denied (Permission layer or Policy layer or both).

Each step has a status indicator: `PASS` (green), `FAIL` (red), `SKIP` (grey, when irrelevant), `HOLIDAY` (amber).

---

## Schedules Page (entity management)

Full CRUD for `NamedSchedule`. Each schedule card shows:
- Name + timezone
- Visual week grid showing active windows (Mon–Sun × time slots, coloured cells)
- Holiday list with behaviour badge (`deny all` / `allow with override`)
- Grants using this schedule (chip list)

**Holiday editor:** Add holidays by name + month/day (or floating rule like "last Monday in May"). Set behaviour: deny all, allow with override. If "allow with override": pick which grants remain active + minimum clearance.

---

## Groups Page (entity management)

Each group card:
- Name + membership type badge
- For dynamic: membership rules shown as human-readable chips
- For static: member count + avatar stack
- Subgroup section: shows nested subgroups as indented pills. Can add/remove subgroups inline.
- Inherited grants chip list

**Group nesting UI:** Drag-and-drop subgroup assignment in the editor, or type-to-search. Circular dependency detection (A cannot be subgroup of B if B is already subgroup of A, directly or transitively).

---

## Intrusion Detection Page

Two-column layout. Left: site selector + zone status table + authorised users list. Right: action buttons.

**Site status:** Armed / Disarmed / PartialArm / Alarm / Lockdown — shown as coloured badges. Live (re-evaluates on store change).

**Zone status table:** Per-zone status row with zone name, type, current status badge.

**Authorised users panel:** Shows users who currently have `arm`/`disarm` permission for the selected site at the current time — evaluated live using the full engine.

**Action buttons:** Arm, Disarm, Partial Arm, Trigger Lockdown, Clear Alarm. Each checks the acting user's permission before executing. Permission denied state shown inline.

**Arming log:** Timestamped log of all arm/disarm actions in the current session.

---

## Seed Data

Rich enough to demonstrate all features. Includes:
- 3 sites (Alpha, Beta, Gamma)
- 10 doors across sites with varied zone types
- 12 users across departments, clearance levels, statuses
- 5 groups (2 dynamic, 3 static) with 2 levels of nesting
- 6 grants (assigned, conditional, auto modes)
- 3 named schedules including one with holiday rules (Christmas deny-all, ANZAC Day allow-with-override for L3+)
- 2 policies with multi-rule ABAC conditions

---

## Project Structure

```
abac-reimagined/
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Router setup
│   ├── types/
│   │   └── index.ts               # All shared types
│   ├── store/
│   │   ├── store.ts               # Zustand store
│   │   └── seed.ts                # Seed data
│   ├── engine/
│   │   ├── accessEngine.ts        # evaluateAccess, collectGrants, resolveGroupMembership
│   │   ├── scheduleEngine.ts      # evaluateSchedule, holiday resolution
│   │   └── groupEngine.ts         # resolveGroupMembership (recursive with cycle guard)
│   ├── components/
│   │   ├── Layout.tsx             # Icon sidebar + topbar shell
│   │   ├── NowPill.tsx
│   │   ├── CommandPalette.tsx     # ⌘K overlay
│   │   ├── SlideOver.tsx          # Generic slide-over wrapper
│   │   └── RuleBuilder.tsx        # Shared rule editor
│   ├── pages/
│   │   ├── Canvas.tsx             # Canvas lens
│   │   ├── Oracle.tsx             # Oracle lens
│   │   ├── Reasoner.tsx           # Reasoner lens
│   │   ├── People.tsx
│   │   ├── Groups.tsx
│   │   ├── Grants.tsx
│   │   ├── Schedules.tsx
│   │   ├── Doors.tsx
│   │   ├── Sites.tsx
│   │   └── Intrusion.tsx
│   └── canvas/
│       ├── CanvasGraph.tsx        # Graph rendering + node layout
│       ├── nodes/
│       │   ├── GroupNode.tsx
│       │   ├── GrantNode.tsx
│       │   ├── DoorNode.tsx
│       │   └── ScheduleNode.tsx
│       ├── DetailPanel.tsx        # Right-side detail panel
│       └── useCanvasLayout.ts     # Node position state
```

---

## Key Design Constraints

1. **No shared code with v1/v2/v3** — clean slate, no imports across projects
2. **All null guards from day one** — every optional array field initialised in seed data and typed as required in the interface (no `?` on arrays — use `[]` as default)
3. **Engine is pure** — `accessEngine`, `scheduleEngine`, `groupEngine` take only data arguments, no store access. Testable in isolation.
4. **Group nesting is transitive but cycle-safe** — engine uses a `visited: Set<string>` guard
5. **Canvas uses plain CSS positioning** — no external graph library. Nodes are absolute-positioned divs. Edges are SVG paths computed from node positions. Keeps bundle tiny and gives full design control.
