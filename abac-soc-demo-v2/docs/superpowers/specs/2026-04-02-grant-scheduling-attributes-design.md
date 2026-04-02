# Grant Scheduling & Attribute Conditions — Design Spec
**Date:** 2026-04-02
**Project:** abac-soc-demo-v2
**Status:** Approved for implementation

---

## Overview

Extend the grant (RBAC permission) model with three interlocking capabilities:

1. **Application modes** — grants can be explicitly assigned (current), conditionally gated by ABAC rules, or automatically triggered for any user whose attributes match
2. **Time scheduling** — grants can be restricted to time windows (days of week, time of day, optional date range); time is also exposed as a `now` entity in `EvalContext` so policy rules can reference it directly
3. **Custom attributes** — grants carry `customAttributes: Record<string, string>` referenceable as `grant.attribute` in any rule

All three capabilities share the existing `Rule` / `RuleBuilder` infrastructure — no new rule format is introduced.

---

## 1. Data Model Changes

### 1.1 NowContext (new)

```ts
interface NowContext {
  hour: number;          // 0–23
  minute: number;        // 0–59
  dayOfWeek: string;     // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  dayOfWeekNum: number;  // 0=Sun, 1=Mon, …, 6=Sat
  date: string;          // 'YYYY-MM-DD'
  month: number;         // 1–12
}
```

Built once at evaluation time from `new Date()`, adjusted for timezone when a schedule's timezone is in scope.

### 1.2 Schedule (new)

```ts
interface Schedule {
  daysOfWeek: number[];  // subset of [0,1,2,3,4,5,6]; empty = all days
  startTime: string;     // 'HH:MM' 24h
  endTime: string;       // 'HH:MM' 24h
  validFrom?: string;    // 'YYYY-MM-DD' optional start date
  validUntil?: string;   // 'YYYY-MM-DD' optional end date
  timezone: string;      // IANA timezone string e.g. 'Australia/Sydney'
}
```

A grant with `schedule: null` has no time restriction. Schedule is evaluated as a pure time comparison against the current `NowContext` — it does not use the `Rule` system.

### 1.3 Grant (updated)

Adds four fields to the existing `Grant` interface:

```ts
interface Grant {
  id: string;
  name: string;
  description: string;
  scope: GrantScope;
  targetId?: string;
  actions: ActionType[];
  // --- new fields ---
  applicationMode: 'assigned' | 'conditional' | 'auto';
  conditions: Rule[];
  conditionLogic: 'AND' | 'OR';
  customAttributes: Record<string, string>;
  schedule: Schedule | null;
}
```

**applicationMode semantics:**
- `assigned` — grant applies when explicitly given to a user or group. Conditions and schedule still apply as filters if present. Default for all existing grants.
- `conditional` — grant must be explicitly assigned AND its conditions must pass. If conditions fail, the grant is excluded from the effective set.
- `auto` — grant is not assigned anywhere. The engine checks it against every user. If conditions pass (and schedule is satisfied), the grant is added automatically.

### 1.4 EvalContext (updated)

```ts
export interface EvalContext {
  user: User;
  door?: Door;
  zone?: Zone;
  site?: Site;
  controller?: Controller;
  grant?: Grant;           // grant currently being evaluated for conditions
  now: NowContext;         // current time — always present
  store: StoreSnapshot;
  _visitedGroups?: Set<string>;
}
```

`now` is always populated. `grant` is set per-grant when evaluating that grant's conditions.

---

## 2. Engine Changes (`src/engine/accessEngine.ts`)

### 2.1 buildNowContext(): NowContext

Pure function, no arguments. Returns current time broken into named fields. Called once at the top of `evaluateAccess` and `hasPermission`.

```ts
function buildNowContext(): NowContext
```

### 2.2 resolveAttribute — new entity keys

Two new `entityKey` cases added to the existing switch:

- `now` — reads `hour`, `minute`, `dayOfWeek`, `dayOfWeekNum`, `date`, `month` from `ctx.now`
- `grant` — reads built-in fields (`name`, `scope`, `applicationMode`) then `customAttributes[attrKey]` from `ctx.grant`

**Built-in attribute map additions:**

| Entity | Built-in attributes |
|--------|-------------------|
| now | hour, minute, dayOfWeek, dayOfWeekNum, date, month |
| grant | name, scope, applicationMode |

### 2.3 isScheduleActive(schedule: Schedule, now: NowContext): boolean

```ts
function isScheduleActive(schedule: Schedule, now: NowContext): boolean
```

Returns true when ALL of:
- `schedule.daysOfWeek` is empty OR includes `now.dayOfWeekNum`
- Current time `HH:MM` is `>= schedule.startTime` AND `<= schedule.endTime`
- `now.date >= schedule.validFrom` if `validFrom` is set
- `now.date <= schedule.validUntil` if `validUntil` is set

Note: timezone conversion uses the native `Intl.DateTimeFormat` API (no extra library needed) to derive the local `HH:MM` and date in `schedule.timezone` from `new Date()`.

### 2.4 getEffectiveGrantIds — updated logic

```
1. Collect candidate grant IDs:
   a. user.grantedPermissions (explicit)
   b. inheritedPermissions from groups where user is a member (explicit + dynamic)
   c. ALL grants in store.allGrants where grant.applicationMode === 'auto'

2. For each candidate grant ID (deduplicated):
   a. Look up the grant object
   b. If grant.applicationMode === 'auto' or 'conditional':
      - Build ctx with grant set: { ...ctx, grant }
      - Evaluate grant.conditions against ctx using grant.conditionLogic
      - If conditions fail → exclude this grant
   c. If grant.schedule is not null:
      - Check isScheduleActive(grant.schedule, ctx.now)
      - If inactive → exclude this grant
   d. Otherwise → include

3. Return the surviving grant IDs as a Set<string>
```

`store.allGrants` is added to `StoreSnapshot`.

### 2.5 StoreSnapshot — updated

```ts
interface StoreSnapshot {
  allUsers: User[];
  allDoors: Door[];
  allZones: Zone[];
  allSites: Site[];
  allControllers: Controller[];
  allGroups: Group[];
  allGrants: Grant[];    // new — needed for auto grant scanning
}
```

### 2.6 evaluateAccess — updated

Builds `NowContext` at the start and includes it in `EvalContext`. Passes updated `store` (now including `allGrants`) from caller.

---

## 3. Store Changes (`src/store/store.ts`)

No structural changes. Storage key bumped from `soc-demo-store-v2` to `soc-demo-store-v3` to force migration of old grant objects that lack the new fields.

---

## 4. Component Changes

### 4.1 ScheduleEditor (new — `src/components/ScheduleEditor.tsx`)

```tsx
interface ScheduleEditorProps {
  schedule: Schedule | null;
  onChange: (schedule: Schedule | null) => void;
}
```

Renders:
- **Enable toggle** — when off, `schedule` is `null` and no time restriction applies
- **Day row** — `Mon Tue Wed Thu Fri Sat Sun` as toggleable pill buttons; empty selection = all days
- **Time range** — `from [HH:MM] to [HH:MM]` paired inputs (24h)
- **Date range** — optional `valid from` / `valid until` date inputs; hidden when not in use (show "Add date range" link)
- **Timezone** — select input; default from `store.sites[0].timezone` or `'UTC'`

When the enable toggle is turned on, defaults to Mon–Fri 08:00–18:00 in the first site's timezone.

### 4.2 RuleBuilder — updated left-side hints

Add `now.*` suggestions to `LEFT_SIDE_SUGGESTIONS`:
```
now.hour       (e.g. 9)
now.minute
now.dayOfWeek  (e.g. Mon)
now.date       (e.g. 2026-04-02)
now.month      (e.g. 4)
grant.name
grant.scope
```

Add `now` and `grant` to the `LEFT_SIDE_SUGGESTIONS` list only — **not** to `BARE_ENTITY_TYPES`. They must not trigger the group membership hint path (`IN group.X`) since they are not containable entities.

### 4.3 Permissions page — updated (`src/pages/Permissions.tsx`)

**Grant cards** gain three new badges:
- **Mode badge**: `Assigned` (slate) / `Conditional` (amber) / `Auto` (purple)
- **Schedule badge** if `schedule !== null`: `Mon–Fri 08:00–18:00` in slate-teal
- **Conditions badge** if `conditions.length > 0`: `N conditions` in indigo

**Grant edit modal** gains four new sections (below existing actions checklist):

1. **Application Mode** — segmented control or radio group:
   - `Assigned` — default, no extra explanation
   - `Conditional` — helper text: "Grant must be explicitly assigned and conditions must also pass"
   - `Auto` — helper text: "Grant applies automatically to anyone whose attributes match — no assignment needed"

2. **Conditions** (visible for `conditional` and `auto`):
   - `<RuleBuilder rules={...} onChange={...} />`
   - AND / OR logic toggle
   - Helper: "Use `now.dayOfWeek IN Mon,Tue,Wed,Thu,Fri` for time-based conditions, or `user.role == admin` for attribute-triggered grants"

3. **Schedule** (visible for all modes):
   - `<ScheduleEditor schedule={...} onChange={...} />`

4. **Custom Attributes**:
   - `<AttributeEditor attributes={...} onChange={...} />`

### 4.4 TestAccess — updated results panel

The **Permission Layer** section is expanded to show per-grant evaluation detail:

For each grant that was considered (matched + evaluated):
- Grant name + mode badge (`AUTO` / `CONDITIONAL` / `ASSIGNED`)
- If schedule present: `Schedule ✓` or `Schedule ✗ (outside Mon–Fri 08:00–18:00)`
- If conditions present: condition rule rows (same format as ABAC rule rows — leftSide, operator, rightSide → leftResolved vs rightResolved → PASS/FAIL)
- Final outcome: included or excluded from effective grant set

Add a **"Now"** context box showing: `Wed 14:23 · 2026-04-02` so the viewer knows what time was used during evaluation.

---

## 5. Test Data Updates (`src/data/testData.ts`)

Migrate all existing grants to include new fields with backwards-compatible defaults:
- `applicationMode: 'assigned'`
- `conditions: []`
- `conditionLogic: 'AND'`
- `customAttributes: {}`
- `schedule: null`

Add three demo grants:

```ts
{
  id: 'grant-day-shift',
  name: 'Day Shift Access',
  description: 'Unlock access restricted to business hours',
  scope: 'global',
  actions: ['unlock'],
  applicationMode: 'assigned',
  conditions: [],
  conditionLogic: 'AND',
  customAttributes: { tier: 'standard' },
  schedule: {
    daysOfWeek: [1,2,3,4,5],
    startTime: '08:00',
    endTime: '18:00',
    timezone: 'Australia/Sydney',
  },
},
{
  id: 'grant-admin-auto',
  name: 'Admin Auto-Grant',
  description: 'Automatically granted to any user with role == admin',
  scope: 'global',
  actions: ['unlock', 'arm', 'disarm', 'manage_users'],
  applicationMode: 'auto',
  conditions: [{ id: 'c-aa-1', leftSide: 'user.role', operator: '==', rightSide: 'admin' }],
  conditionLogic: 'AND',
  customAttributes: { tier: 'admin' },
  schedule: null,
},
{
  id: 'grant-high-sec-conditional',
  name: 'High Security Access',
  description: 'Assigned grant that only counts for Secret-cleared users',
  scope: 'global',
  actions: ['unlock', 'override'],
  applicationMode: 'conditional',
  conditions: [{ id: 'c-hs-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'Secret' }],
  conditionLogic: 'AND',
  customAttributes: { tier: 'secure' },
  schedule: null,
},
```

Assign `grant-day-shift` and `grant-high-sec-conditional` to at least one existing user or group so they appear in TestAccess evaluation.

---

## 6. Definition of Done

- `npm run build` passes with zero TypeScript errors
- TestAccess shows per-grant evaluation trace including schedule and condition results
- Auto-triggered grant (`Admin Auto-Grant`) appears for users with `role == admin` without being explicitly assigned
- Conditional grant is excluded for users below `Secret` clearance
- Schedule correctly passes/fails based on current time (verified by observing the "Now" context box)
- `now.dayOfWeek` and `now.hour` resolve correctly in policy rule evaluation
- `grant.customAttributes.tier` resolves correctly when referenced in a policy rule
- All callers of `evaluateAccess` and `hasPermission` (TestAccess, AccessMatrix, Arming) pass `allGrants` in their `StoreSnapshot`
- All 12 pages render without crashes
- Permissions page shows mode/schedule/condition badges on grant cards
