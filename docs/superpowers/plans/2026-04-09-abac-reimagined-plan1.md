# ABAC Reimagined (Axon) — Plan 1: Foundation + Three Lenses

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully working ABAC access control demo (Axon) from scratch — three lenses (Canvas, Oracle, Reasoner), real engine with nested groups and holiday schedules, rich seed data, Modern SaaS Dark design — playable in the browser with no CRUD editing required.

**Architecture:** New standalone Vite + React 19 + Zustand 5 + Tailwind v4 app at `abac-soc-demo-v3/abac-reimagined/`. Engine is split into three pure-function modules (groupEngine, scheduleEngine, accessEngine) that take only data arguments — no store access. Zustand store holds all entities + canvas node positions. Three lens pages (Canvas, Oracle, Reasoner) plus entity list pages and Intrusion render on top of the store.

**Tech Stack:** React 19, TypeScript 5.9 (strict), Vite 8, Zustand 5, Tailwind CSS v4, React Router v7, lucide-react, uuid, Vitest

**Spec:** `docs/superpowers/specs/2026-04-09-abac-reimagined-design.md`

**Note:** Plan 2 covers full CRUD edit forms for all entities. This plan gets you to a fully playable state with seed data.

---

## File Map

```
abac-reimagined/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── index.ts                  # All shared types — source of truth
│   ├── store/
│   │   ├── seed.ts                   # Rich seed data (12 users, 5 groups, 6 grants, 3 schedules...)
│   │   └── store.ts                  # Zustand store — all entities + canvas positions + arming log
│   ├── engine/
│   │   ├── groupEngine.ts            # resolveGroupMembership (recursive, cycle-safe)
│   │   ├── groupEngine.test.ts
│   │   ├── scheduleEngine.ts         # evaluateSchedule + buildNowContext + holiday logic
│   │   ├── scheduleEngine.test.ts
│   │   ├── accessEngine.ts           # collectGrants + evaluateAccess + hasPermission
│   │   └── accessEngine.test.ts
│   ├── components/
│   │   ├── Layout.tsx                # Icon sidebar + topbar shell + Outlet
│   │   ├── NowPill.tsx               # Live clock pill with timezone
│   │   └── CommandPalette.tsx        # ⌘K overlay — quick Oracle query
│   ├── canvas/
│   │   ├── CanvasGraph.tsx           # Graph viewport: grid, edges SVG, node rendering
│   │   ├── DetailPanel.tsx           # Right-side detail panel (opens on node select)
│   │   ├── useCanvasLayout.ts        # Node positions from store, drag handler
│   │   └── nodes/
│   │       ├── GroupNode.tsx         # Group card with inline subgroup pills
│   │       ├── GrantNode.tsx         # Grant card with mode badge
│   │       ├── DoorNode.tsx          # Door card with zone restriction tint
│   │       └── ScheduleNode.tsx      # Schedule card with holiday exclusion tags
│   └── pages/
│       ├── Canvas.tsx                # Canvas lens page
│       ├── Oracle.tsx                # Oracle lens page (forward + reverse query)
│       ├── Reasoner.tsx              # Reasoner lens page (5-step access trace)
│       ├── People.tsx                # User list (read-only)
│       ├── Groups.tsx                # Group list with nesting display (read-only)
│       ├── Grants.tsx                # Grant list (read-only)
│       ├── Schedules.tsx             # Schedule list with week grid + holidays (read-only)
│       ├── Doors.tsx                 # Door list (read-only)
│       ├── Sites.tsx                 # Sites + zones list (read-only)
│       └── Intrusion.tsx             # Arming control — live status + actions
```

---

## Task 1: Scaffold the project

**Files:**
- Create: `abac-reimagined/` (all scaffold files)

- [ ] **Step 1: Create the Vite app**

Run from `abac-soc-demo-v3/`:
```bash
npm create vite@latest abac-reimagined -- --template react-ts
cd abac-reimagined
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom zustand uuid lucide-react
npm install -D vitest @vitest/ui @types/uuid
```

- [ ] **Step 3: Install Tailwind v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 4: Configure Tailwind in vite.config.ts**

Replace entire `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 5: Configure vitest in vite.config.ts**

Replace entire `vite.config.ts` (adds test block):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 6: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Replace src/index.css**

Replace entire `src/index.css`:
```css
@import "tailwindcss";

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #060912;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Hide scrollbar but keep scroll */
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts on `http://localhost:5173` with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(axon): scaffold Vite + React + Tailwind v4 + Vitest"
```

---

## Task 2: Types

**Files:**
- Create: `src/types/index.ts`
- Delete: `src/App.css`, `src/assets/react.svg` (not needed)

- [ ] **Step 1: Create src/types/index.ts**

```typescript
// src/types/index.ts

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type ActionType =
  | 'unlock'
  | 'arm'
  | 'disarm'
  | 'lockdown'
  | 'view_logs'
  | 'manage_users'
  | 'manage_tasks'
  | 'override'

export type ZoneType = 'Perimeter' | 'Interior' | 'Restricted' | 'Public' | 'Secure'
export type ZoneStatus = 'Armed' | 'Disarmed' | 'Alarm'
export type SiteStatus = 'Armed' | 'Disarmed' | 'PartialArm' | 'Alarm' | 'Lockdown'

export interface User {
  id: string
  name: string
  email: string
  department: string
  role: string
  clearanceLevel: number
  type: 'employee' | 'contractor' | 'visitor'
  status: 'active' | 'suspended' | 'inactive'
  customAttributes: Record<string, string>
}

export interface Rule {
  id: string
  leftSide: string
  operator: '==' | '!=' | '>=' | '<=' | '>' | '<' | 'IN' | 'NOT_IN'
  rightSide: string | string[]
}

export interface Group {
  id: string
  name: string
  description: string
  membershipType: 'static' | 'dynamic'
  members: string[]           // userId[] — used when membershipType === 'static'
  membershipRules: Rule[]     // used when membershipType === 'dynamic'
  subGroups: string[]         // groupId[] — members of subgroups inherit this group's grants
  inheritedPermissions: string[] // grantId[]
}

export interface Grant {
  id: string
  name: string
  description: string
  scope: 'global' | 'site' | 'zone'
  targetId?: string
  actions: ActionType[]
  applicationMode: 'assigned' | 'conditional' | 'auto'
  conditions: Rule[]
  conditionLogic: 'AND' | 'OR'
  scheduleId?: string
  customAttributes: Record<string, string>
}

export interface TimeWindow {
  id: string
  days: DayOfWeek[]
  startTime: string   // 'HH:MM' 24h
  endTime: string     // 'HH:MM' 24h — may be less than startTime for overnight windows
}

export interface Holiday {
  id: string
  name: string
  month: number       // 1–12
  day: number         // 1–31
  behavior: 'deny_all' | 'allow_with_override' | 'normal'
  overrideGrantIds: string[]     // grants that remain active on this holiday
  requiredClearance?: number     // minimum clearanceLevel to use override grants
}

export interface NamedSchedule {
  id: string
  name: string
  timezone: string    // IANA, e.g. 'Australia/Sydney'
  windows: TimeWindow[]
  holidays: Holiday[]
}

export interface Policy {
  id: string
  name: string
  description: string
  rules: Rule[]
  logicalOperator: 'AND' | 'OR'
  doorIds: string[]
  scheduleId?: string
}

export interface Zone {
  id: string
  siteId: string
  name: string
  type: ZoneType
  status: ZoneStatus
}

export interface Site {
  id: string
  name: string
  address: string
  timezone: string
  status: SiteStatus
}

export interface Door {
  id: string
  name: string
  siteId: string
  zoneId?: string
  description: string
  customAttributes: Record<string, string>
}

export interface Controller {
  id: string
  name: string
  location: string
  siteId: string
  doorIds: string[]
  customAttributes: Record<string, string>
}

export interface ArmingLog {
  id: string
  timestamp: string
  userName: string
  action: string
  siteName: string
  result: 'Success' | 'Denied'
}

export interface NowContext {
  dayOfWeek: DayOfWeek
  hour: number
  minute: number
  date: string    // 'YYYY-MM-DD'
  month: number   // 1–12
  day: number     // 1–31
}

// Canvas node position — persisted in store so drags survive navigation
export interface CanvasPosition {
  x: number
  y: number
}

export interface StoreSnapshot {
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

// ── Engine result types ──────────────────────────────────────────────────────

export type ScheduleStatus = 'active' | 'inactive' | 'override_active'

export interface GrantResult {
  grantId: string
  grantName: string
  applicationMode: Grant['applicationMode']
  scheduleStatus: ScheduleStatus | null   // null if no schedule attached
  activeHolidayName?: string
  conditionResults: ConditionResult[]
  included: boolean
}

export interface ConditionResult {
  ruleId: string
  leftSide: string
  operator: string
  rightSide: string | string[]
  leftResolved: string
  rightResolved: string
  passed: boolean
}

export interface PolicyResult {
  policyId: string
  policyName: string
  ruleResults: ConditionResult[]
  passed: boolean
}

export interface AccessResult {
  permissionGranted: boolean
  abacPassed: boolean
  overallGranted: boolean
  matchedGrants: string[]
  grantResults: GrantResult[]
  policyResults: PolicyResult[]
  groupChain: string[]       // group names the user is in, including via nesting
  nowContext: NowContext
  activeHoliday?: Holiday
}
```

- [ ] **Step 2: Delete unused scaffold files**

```bash
rm src/App.css
rm src/assets/react.svg
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git rm src/App.css src/assets/react.svg
git commit -m "feat(axon): add all shared types"
```

---

## Task 3: Group Engine

**Files:**
- Create: `src/engine/groupEngine.ts`
- Create: `src/engine/groupEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/groupEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { resolveGroupMembership } from './groupEngine'
import type { User, Group } from '../types'

const baseUser: User = {
  id: 'u1', name: 'Test', email: 't@t.com', department: 'Operations',
  role: 'analyst', clearanceLevel: 3, type: 'employee', status: 'active',
  customAttributes: {},
}

const groups: Group[] = [
  {
    id: 'g-night', name: 'Night Shift', description: '', membershipType: 'static',
    members: ['u1'], membershipRules: [], subGroups: [], inheritedPermissions: ['grant-1'],
  },
  {
    id: 'g-noc', name: 'NOC Team', description: '', membershipType: 'dynamic',
    members: [], membershipRules: [{ id: 'r1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' }],
    subGroups: ['g-night'], inheritedPermissions: ['grant-2'],
  },
  {
    id: 'g-other', name: 'Other', description: '', membershipType: 'static',
    members: ['u99'], membershipRules: [], subGroups: [], inheritedPermissions: [],
  },
]

describe('resolveGroupMembership', () => {
  it('includes directly matched static group', () => {
    const result = resolveGroupMembership(baseUser, groups)
    expect(result).toContain('g-night')
  })

  it('includes dynamic group when rule matches', () => {
    const result = resolveGroupMembership(baseUser, groups)
    expect(result).toContain('g-noc')
  })

  it('propagates membership upward through subGroups', () => {
    // u1 is in g-night (direct). g-noc has g-night as subGroup.
    // So u1 should be in g-noc even without matching the dynamic rule.
    const staticOnlyUser: User = { ...baseUser, department: 'Finance' }
    // staticOnlyUser is NOT in g-noc via dynamic rule (dept != Operations)
    // but IS in g-night via static members list
    // g-noc has g-night as subGroup, so staticOnlyUser IS in g-noc
    const result = resolveGroupMembership(staticOnlyUser, groups)
    expect(result).toContain('g-night')
    expect(result).toContain('g-noc')
  })

  it('excludes groups the user does not match', () => {
    const result = resolveGroupMembership(baseUser, groups)
    expect(result).not.toContain('g-other')
  })

  it('does not infinite loop on circular subGroup references', () => {
    const circular: Group[] = [
      { id: 'ga', name: 'A', description: '', membershipType: 'static', members: ['u1'],
        membershipRules: [], subGroups: ['gb'], inheritedPermissions: [] },
      { id: 'gb', name: 'B', description: '', membershipType: 'static', members: [],
        membershipRules: [], subGroups: ['ga'], inheritedPermissions: [] },
    ]
    // Should not throw or hang
    const result = resolveGroupMembership(baseUser, circular)
    expect(result).toContain('ga')
  })

  it('handles clearanceLevel >= rule', () => {
    const clearanceGroups: Group[] = [{
      id: 'g-l3', name: 'L3+', description: '', membershipType: 'dynamic',
      members: [], membershipRules: [{ id: 'r1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
      subGroups: [], inheritedPermissions: [],
    }]
    expect(resolveGroupMembership({ ...baseUser, clearanceLevel: 3 }, clearanceGroups)).toContain('g-l3')
    expect(resolveGroupMembership({ ...baseUser, clearanceLevel: 2 }, clearanceGroups)).not.toContain('g-l3')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/engine/groupEngine.test.ts
```

Expected: FAIL with "Cannot find module './groupEngine'"

- [ ] **Step 3: Implement groupEngine.ts**

Create `src/engine/groupEngine.ts`:
```typescript
import type { User, Group, Rule } from '../types'

function resolveUserAttribute(leftSide: string, user: User): string | number {
  switch (leftSide) {
    case 'user.department':    return user.department
    case 'user.role':          return user.role
    case 'user.clearanceLevel': return user.clearanceLevel
    case 'user.type':          return user.type
    case 'user.status':        return user.status
    default:
      if (leftSide.startsWith('user.')) {
        const key = leftSide.slice(5)
        return user.customAttributes[key] ?? ''
      }
      return ''
  }
}

function evaluateRule(rule: Rule, user: User): boolean {
  const left = resolveUserAttribute(rule.leftSide, user)
  const right = rule.rightSide
  switch (rule.operator) {
    case '==':     return String(left) === String(right)
    case '!=':     return String(left) !== String(right)
    case '>=':     return Number(left) >= Number(right)
    case '<=':     return Number(left) <= Number(right)
    case '>':      return Number(left) > Number(right)
    case '<':      return Number(left) < Number(right)
    case 'IN': {
      const vals = Array.isArray(right)
        ? right
        : String(right).split(',').map(s => s.trim())
      return vals.includes(String(left))
    }
    case 'NOT_IN': {
      const vals = Array.isArray(right)
        ? right
        : String(right).split(',').map(s => s.trim())
      return !vals.includes(String(left))
    }
    default: return false
  }
}

function userDirectlyMatchesGroup(user: User, group: Group): boolean {
  if (group.membershipType === 'static') {
    return group.members.includes(user.id)
  }
  if (group.membershipRules.length === 0) return false
  return group.membershipRules.every(rule => evaluateRule(rule, user))
}

/**
 * Returns the IDs of every group the user belongs to, including groups
 * the user is in via subGroup nesting (transitive, cycle-safe).
 */
export function resolveGroupMembership(user: User, groups: Group[]): string[] {
  const result = new Set<string>()

  // Step 1: direct membership (static members list or dynamic rules)
  for (const group of groups) {
    if (userDirectlyMatchesGroup(user, group)) {
      result.add(group.id)
    }
  }

  // Step 2: propagate upward — if user is in a subGroup, they're also in the parent.
  // Repeat until no new groups are added (handles arbitrary nesting depth).
  let changed = true
  while (changed) {
    changed = false
    for (const group of groups) {
      if (!result.has(group.id) && group.subGroups.some(sgId => result.has(sgId))) {
        result.add(group.id)
        changed = true
      }
    }
  }

  return [...result]
}

/**
 * Collect all grantIds the user inherits from their groups.
 */
export function collectGroupGrants(user: User, groups: Group[]): string[] {
  const memberGroupIds = resolveGroupMembership(user, groups)
  const grantIds = new Set<string>()
  for (const groupId of memberGroupIds) {
    const group = groups.find(g => g.id === groupId)
    if (group) {
      for (const gid of group.inheritedPermissions) {
        grantIds.add(gid)
      }
    }
  }
  return [...grantIds]
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/engine/groupEngine.test.ts
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/groupEngine.ts src/engine/groupEngine.test.ts
git commit -m "feat(axon): group engine — transitive membership with cycle guard"
```

---

## Task 4: Schedule Engine

**Files:**
- Create: `src/engine/scheduleEngine.ts`
- Create: `src/engine/scheduleEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/scheduleEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { evaluateSchedule } from './scheduleEngine'
import type { NamedSchedule, NowContext } from '../types'

const schedule: NamedSchedule = {
  id: 's1', name: 'Business Hours', timezone: 'Australia/Sydney',
  windows: [{
    id: 'w1', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '08:00', endTime: '18:00',
  }],
  holidays: [
    {
      id: 'h1', name: 'Christmas Day', month: 12, day: 25,
      behavior: 'deny_all', overrideGrantIds: [],
    },
    {
      id: 'h2', name: 'ANZAC Day', month: 4, day: 25,
      behavior: 'allow_with_override', overrideGrantIds: ['grant-emergency'],
      requiredClearance: 3,
    },
  ],
}

const monMorning: NowContext = {
  dayOfWeek: 'Mon', hour: 10, minute: 0,
  date: '2026-04-06', month: 4, day: 6,
}
const satAfternoon: NowContext = {
  dayOfWeek: 'Sat', hour: 14, minute: 0,
  date: '2026-04-11', month: 4, day: 11,
}
const christmas: NowContext = {
  dayOfWeek: 'Fri', hour: 10, minute: 0,
  date: '2026-12-25', month: 12, day: 25,
}
const anzacDay: NowContext = {
  dayOfWeek: 'Sat', hour: 10, minute: 0,
  date: '2026-04-25', month: 4, day: 25,
}

describe('evaluateSchedule', () => {
  it('returns active on a weekday within business hours', () => {
    expect(evaluateSchedule(schedule, monMorning)).toBe('active')
  })

  it('returns inactive on a weekend', () => {
    expect(evaluateSchedule(schedule, satAfternoon)).toBe('inactive')
  })

  it('returns inactive on Christmas (deny_all holiday)', () => {
    expect(evaluateSchedule(schedule, christmas)).toBe('inactive')
  })

  it('returns inactive on ANZAC Day without override grant', () => {
    expect(evaluateSchedule(schedule, anzacDay)).toBe('inactive')
  })

  it('returns override_active on ANZAC Day with correct override grant and clearance', () => {
    expect(evaluateSchedule(schedule, anzacDay, 'grant-emergency', 3)).toBe('override_active')
  })

  it('returns inactive on ANZAC Day with override grant but insufficient clearance', () => {
    expect(evaluateSchedule(schedule, anzacDay, 'grant-emergency', 2)).toBe('inactive')
  })

  it('handles overnight windows (22:00–06:00)', () => {
    const overnight: NamedSchedule = {
      ...schedule,
      windows: [{ id: 'w2', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '22:00', endTime: '06:00' }],
      holidays: [],
    }
    const lateNight: NowContext = { dayOfWeek: 'Mon', hour: 23, minute: 30, date: '2026-04-06', month: 4, day: 6 }
    const earlyMorn: NowContext = { dayOfWeek: 'Mon', hour: 3, minute: 0, date: '2026-04-06', month: 4, day: 6 }
    const midDay: NowContext = { dayOfWeek: 'Mon', hour: 12, minute: 0, date: '2026-04-06', month: 4, day: 6 }
    expect(evaluateSchedule(overnight, lateNight)).toBe('active')
    expect(evaluateSchedule(overnight, earlyMorn)).toBe('active')
    expect(evaluateSchedule(overnight, midDay)).toBe('inactive')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/engine/scheduleEngine.test.ts
```

Expected: FAIL with "Cannot find module './scheduleEngine'"

- [ ] **Step 3: Implement scheduleEngine.ts**

Create `src/engine/scheduleEngine.ts`:
```typescript
import type { NamedSchedule, NowContext, DayOfWeek, Holiday } from '../types'

export type ScheduleStatus = 'active' | 'inactive' | 'override_active'

export function buildNowContext(): NowContext {
  const now = new Date()
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    dayOfWeek: days[now.getDay()],
    hour: now.getHours(),
    minute: now.getMinutes(),
    date: now.toISOString().slice(0, 10),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function matchesHoliday(now: NowContext, holidays: Holiday[]): Holiday | null {
  return holidays.find(h => h.month === now.month && h.day === now.day) ?? null
}

function isInWindow(now: NowContext, schedule: NamedSchedule): boolean {
  return schedule.windows.some(w => {
    if (!w.days.includes(now.dayOfWeek)) return false
    const [sh, sm] = w.startTime.split(':').map(Number)
    const [eh, em] = w.endTime.split(':').map(Number)
    const current = now.hour * 60 + now.minute
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (start <= end) {
      return current >= start && current < end
    }
    // Overnight window: active from start until midnight, and from midnight until end
    return current >= start || current < end
  })
}

/**
 * Evaluate whether a schedule is active at the given moment.
 *
 * @param schedule   The NamedSchedule to evaluate
 * @param now        Current time context
 * @param grantId    Optional — the grant being checked (for holiday override matching)
 * @param userClearance  Optional — the user's clearanceLevel (for holiday override requirement)
 */
export function evaluateSchedule(
  schedule: NamedSchedule,
  now: NowContext,
  grantId?: string,
  userClearance?: number,
): ScheduleStatus {
  const holiday = matchesHoliday(now, schedule.holidays)

  if (holiday) {
    if (holiday.behavior === 'deny_all') return 'inactive'

    if (holiday.behavior === 'allow_with_override') {
      const grantMatches = grantId !== undefined && holiday.overrideGrantIds.includes(grantId)
      const clearanceOk =
        holiday.requiredClearance === undefined ||
        (userClearance !== undefined && userClearance >= holiday.requiredClearance)
      if (grantMatches && clearanceOk) return 'override_active'
      return 'inactive'
    }
    // behavior === 'normal': fall through to window check
  }

  return isInWindow(now, schedule) ? 'active' : 'inactive'
}

export { matchesHoliday }
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/engine/scheduleEngine.test.ts
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/scheduleEngine.ts src/engine/scheduleEngine.test.ts
git commit -m "feat(axon): schedule engine — windows, overnight, holiday rules"
```

---

## Task 5: Access Engine

**Files:**
- Create: `src/engine/accessEngine.ts`
- Create: `src/engine/accessEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/accessEngine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { evaluateAccess, collectGrants } from './accessEngine'
import { buildNowContext } from './scheduleEngine'
import type { User, Group, Grant, Policy, Door, NamedSchedule, StoreSnapshot } from '../types'

const user: User = {
  id: 'u1', name: 'Sarah Chen', email: 's@co.com', department: 'Operations',
  role: 'analyst', clearanceLevel: 3, type: 'employee', status: 'active',
  customAttributes: {},
}

const group: Group = {
  id: 'g1', name: 'NOC Team', description: '', membershipType: 'dynamic',
  members: [],
  membershipRules: [{ id: 'r1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' }],
  subGroups: [],
  inheritedPermissions: ['grant-unlock'],
}

const grant: Grant = {
  id: 'grant-unlock', name: 'Unlock Grant', description: '', scope: 'global',
  actions: ['unlock'], applicationMode: 'assigned',
  conditions: [], conditionLogic: 'AND', customAttributes: {},
}

const door: Door = {
  id: 'door-1', name: 'Server Room A', siteId: 'site-1',
  description: '', customAttributes: {},
}

const policy: Policy = {
  id: 'pol-1', name: 'Clearance Policy', description: '',
  rules: [{ id: 'pr1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
  logicalOperator: 'AND', doorIds: ['door-1'],
}

const store: StoreSnapshot = {
  allUsers: [user],
  allGroups: [group],
  allGrants: [grant],
  allSchedules: [],
  allPolicies: [policy],
  allDoors: [door],
  allZones: [],
  allSites: [],
  allControllers: [],
}

const now = buildNowContext()

describe('collectGrants', () => {
  it('returns grants from matched groups', () => {
    const grants = collectGrants(user, [group], [grant], [], now)
    expect(grants.map(g => g.id)).toContain('grant-unlock')
  })

  it('does not return grants from unmatched groups', () => {
    const otherGroup: Group = {
      ...group, id: 'g2', membershipRules: [{ id: 'r2', leftSide: 'user.department', operator: '==', rightSide: 'Finance' }],
      inheritedPermissions: ['grant-other'],
    }
    const grants = collectGrants(user, [otherGroup], [grant], [], now)
    expect(grants.map(g => g.id)).not.toContain('grant-other')
  })

  it('includes auto grants when conditions pass', () => {
    const autoGrant: Grant = {
      ...grant, id: 'grant-auto', applicationMode: 'auto',
      conditions: [{ id: 'c1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    }
    const grants = collectGrants(user, [], [autoGrant], [], now)
    expect(grants.map(g => g.id)).toContain('grant-auto')
  })
})

describe('evaluateAccess', () => {
  it('grants access when permission layer passes and no ABAC policies block', () => {
    const result = evaluateAccess(user, door, store, now)
    expect(result.permissionGranted).toBe(true)
    expect(result.abacPassed).toBe(true)
    expect(result.overallGranted).toBe(true)
  })

  it('denies when user clearance is too low for the policy', () => {
    const lowUser: User = { ...user, clearanceLevel: 2 }
    const result = evaluateAccess(lowUser, door, store, now)
    expect(result.abacPassed).toBe(false)
    expect(result.overallGranted).toBe(false)
  })

  it('denies when user has no grant covering the door', () => {
    const noGrantStore: StoreSnapshot = { ...store, allGroups: [] }
    const result = evaluateAccess(user, door, noGrantStore, now)
    expect(result.permissionGranted).toBe(false)
    expect(result.overallGranted).toBe(false)
  })

  it('returns policyResults with per-rule trace', () => {
    const result = evaluateAccess(user, door, store, now)
    expect(result.policyResults).toHaveLength(1)
    expect(result.policyResults[0].ruleResults).toHaveLength(1)
    expect(result.policyResults[0].ruleResults[0].leftSide).toBe('user.clearanceLevel')
    expect(result.policyResults[0].ruleResults[0].passed).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/engine/accessEngine.test.ts
```

Expected: FAIL with "Cannot find module './accessEngine'"

- [ ] **Step 3: Implement accessEngine.ts**

Create `src/engine/accessEngine.ts`:
```typescript
import type {
  User, Grant, Group, Policy, Door, NamedSchedule, Rule,
  NowContext, StoreSnapshot, ActionType,
  AccessResult, GrantResult, PolicyResult, ConditionResult,
} from '../types'
import { resolveGroupMembership, collectGroupGrants } from './groupEngine'
import { evaluateSchedule, matchesHoliday } from './scheduleEngine'

// ── Rule evaluation for policy rules (user.* and now.*) ──────────────────────

function resolveLeft(leftSide: string, user: User, now: NowContext): string | number {
  if (leftSide.startsWith('user.')) {
    const key = leftSide.slice(5)
    switch (key) {
      case 'department':    return user.department
      case 'role':          return user.role
      case 'clearanceLevel': return user.clearanceLevel
      case 'type':          return user.type
      case 'status':        return user.status
      default:              return user.customAttributes[key] ?? ''
    }
  }
  if (leftSide.startsWith('now.')) {
    const key = leftSide.slice(4)
    switch (key) {
      case 'dayOfWeek': return now.dayOfWeek
      case 'hour':      return now.hour
      case 'minute':    return now.minute
      case 'month':     return now.month
      case 'day':       return now.day
    }
  }
  return ''
}

function evalRule(rule: Rule, user: User, now: NowContext): ConditionResult {
  const leftResolved = String(resolveLeft(rule.leftSide, user, now))
  const right = rule.rightSide
  const rightStr = Array.isArray(right) ? right.join(', ') : String(right)

  let passed: boolean
  switch (rule.operator) {
    case '==':     passed = leftResolved === rightStr; break
    case '!=':     passed = leftResolved !== rightStr; break
    case '>=':     passed = Number(leftResolved) >= Number(rightStr); break
    case '<=':     passed = Number(leftResolved) <= Number(rightStr); break
    case '>':      passed = Number(leftResolved) > Number(rightStr); break
    case '<':      passed = Number(leftResolved) < Number(rightStr); break
    case 'IN':     {
      const vals = Array.isArray(right) ? right : String(right).split(',').map(s => s.trim())
      passed = vals.includes(leftResolved)
      break
    }
    case 'NOT_IN': {
      const vals = Array.isArray(right) ? right : String(right).split(',').map(s => s.trim())
      passed = !vals.includes(leftResolved)
      break
    }
    default: passed = false
  }

  return {
    ruleId: rule.id,
    leftSide: rule.leftSide,
    operator: rule.operator,
    rightSide: rule.rightSide,
    leftResolved,
    rightResolved: rightStr,
    passed,
  }
}

// ── Grant collection ──────────────────────────────────────────────────────────

/**
 * Returns all grants that apply to this user at this moment.
 * Includes: grants from group membership + auto grants whose conditions pass.
 */
export function collectGrants(
  user: User,
  groups: Group[],
  grants: Grant[],
  schedules: NamedSchedule[],
  now: NowContext,
): Grant[] {
  const groupGrantIds = new Set(collectGroupGrants(user, groups))
  const result: Grant[] = []

  for (const grant of grants) {
    if (grant.applicationMode === 'auto') {
      // Auto grants apply if conditions pass
      if (grant.conditions.length === 0) {
        result.push(grant)
        continue
      }
      const condsPassed = grant.conditionLogic === 'AND'
        ? grant.conditions.every(c => evalRule(c, user, now).passed)
        : grant.conditions.some(c => evalRule(c, user, now).passed)
      if (condsPassed) result.push(grant)
    } else if (groupGrantIds.has(grant.id)) {
      result.push(grant)
    }
  }

  return result
}

// ── Access evaluation ─────────────────────────────────────────────────────────

/**
 * Full ABAC access evaluation for a user + door at a given time.
 */
export function evaluateAccess(
  user: User,
  door: Door,
  store: StoreSnapshot,
  now: NowContext,
  action: ActionType = 'unlock',
): AccessResult {
  const { allGroups, allGrants, allSchedules, allPolicies } = store

  // ── Permission layer ──────────────────────────────────────────────────────

  const candidateGrants = collectGrants(user, allGroups, allGrants, allSchedules, now)
  const groupIds = resolveGroupMembership(user, allGroups)
  const groupChain = groupIds.map(id => allGroups.find(g => g.id === id)?.name ?? id)

  // Determine active holiday across all schedules (for result reporting)
  const allHolidays = allSchedules.flatMap(s => s.holidays)
  const activeHoliday = matchesHoliday(now, allHolidays) ?? undefined

  const grantResults: GrantResult[] = []
  const matchedGrants: string[] = []

  for (const grant of candidateGrants) {
    if (!grant.actions.includes(action)) continue

    // Check scope covers this door
    const scopeCovers =
      grant.scope === 'global' ||
      (grant.scope === 'site' && grant.targetId === door.siteId) ||
      (grant.scope === 'zone' && grant.targetId === door.zoneId)

    if (!scopeCovers) continue

    // Evaluate schedule if attached
    let scheduleStatus: GrantResult['scheduleStatus'] = null
    let activeHolidayName: string | undefined
    if (grant.scheduleId) {
      const schedule = allSchedules.find(s => s.id === grant.scheduleId)
      if (schedule) {
        const status = evaluateSchedule(schedule, now, grant.id, user.clearanceLevel)
        scheduleStatus = status
        const h = matchesHoliday(now, schedule.holidays)
        if (h) activeHolidayName = h.name
      }
    }

    // Evaluate conditions (for conditional mode)
    const conditionResults: ConditionResult[] = grant.conditions.map(c => evalRule(c, user, now))

    const scheduleOk = scheduleStatus === null || scheduleStatus === 'active' || scheduleStatus === 'override_active'
    const conditionsOk = grant.applicationMode !== 'conditional' || (
      grant.conditionLogic === 'AND'
        ? conditionResults.every(r => r.passed)
        : conditionResults.some(r => r.passed)
    )

    const included = scheduleOk && conditionsOk

    grantResults.push({
      grantId: grant.id,
      grantName: grant.name,
      applicationMode: grant.applicationMode,
      scheduleStatus,
      activeHolidayName,
      conditionResults,
      included,
    })

    if (included) matchedGrants.push(grant.name)
  }

  const permissionGranted = matchedGrants.length > 0

  // ── ABAC layer (policies) ─────────────────────────────────────────────────

  const assignedPolicies = allPolicies.filter(p => p.doorIds.includes(door.id))
  const policyResults: PolicyResult[] = []

  for (const policy of assignedPolicies) {
    const ruleResults = policy.rules.map(r => evalRule(r, user, now))
    const passed = policy.rules.length === 0
      ? true
      : policy.logicalOperator === 'AND'
        ? ruleResults.every(r => r.passed)
        : ruleResults.some(r => r.passed)
    policyResults.push({ policyId: policy.id, policyName: policy.name, ruleResults, passed })
  }

  const abacPassed = assignedPolicies.length === 0 || policyResults.every(p => p.passed)

  return {
    permissionGranted,
    abacPassed,
    overallGranted: permissionGranted && abacPassed,
    matchedGrants,
    grantResults,
    policyResults,
    groupChain,
    nowContext: now,
    activeHoliday,
  }
}

/**
 * Lightweight permission check (no full trace) — used by Intrusion page.
 */
export function hasPermission(
  user: User,
  groups: Group[],
  grants: Grant[],
  action: ActionType,
  now: NowContext,
  schedules: NamedSchedule[],
  siteId?: string,
): boolean {
  const candidates = collectGrants(user, groups, grants, schedules, now)
  return candidates.some(g =>
    g.actions.includes(action) &&
    (g.scope === 'global' || (g.scope === 'site' && g.targetId === siteId))
  )
}
```

- [ ] **Step 4: Run all engine tests**

```bash
npx vitest run src/engine/
```

Expected: all tests PASS (groupEngine + scheduleEngine + accessEngine)

- [ ] **Step 5: Commit**

```bash
git add src/engine/accessEngine.ts src/engine/accessEngine.test.ts
git commit -m "feat(axon): access engine — collectGrants, evaluateAccess, hasPermission"
```

---

## Task 6: Seed Data

**Files:**
- Create: `src/store/seed.ts`

- [ ] **Step 1: Create seed.ts**

Create `src/store/seed.ts`:
```typescript
import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller,
} from '../types'

// ── Sites ────────────────────────────────────────────────────────────────────

export const SITES: Site[] = [
  { id: 'site-alpha', name: 'Alpha HQ', address: '1 Collins St, Melbourne VIC', timezone: 'Australia/Melbourne', status: 'Disarmed' },
  { id: 'site-beta',  name: 'Beta Campus', address: '200 Tech Ave, Sydney NSW', timezone: 'Australia/Sydney', status: 'Armed' },
  { id: 'site-gamma', name: 'Gamma Depot', address: '45 Harbour Rd, Brisbane QLD', timezone: 'Australia/Brisbane', status: 'Disarmed' },
]

// ── Zones ────────────────────────────────────────────────────────────────────

export const ZONES: Zone[] = [
  { id: 'z-alpha-perimeter', siteId: 'site-alpha', name: 'Perimeter', type: 'Perimeter', status: 'Disarmed' },
  { id: 'z-alpha-restricted', siteId: 'site-alpha', name: 'Restricted Labs', type: 'Restricted', status: 'Disarmed' },
  { id: 'z-alpha-interior', siteId: 'site-alpha', name: 'General Interior', type: 'Interior', status: 'Disarmed' },
  { id: 'z-beta-secure', siteId: 'site-beta', name: 'Secure Wing', type: 'Secure', status: 'Armed' },
  { id: 'z-beta-public', siteId: 'site-beta', name: 'Public Lobby', type: 'Public', status: 'Disarmed' },
  { id: 'z-gamma-interior', siteId: 'site-gamma', name: 'Warehouse', type: 'Interior', status: 'Disarmed' },
]

// ── Doors ────────────────────────────────────────────────────────────────────

export const DOORS: Door[] = [
  { id: 'door-alpha-server', name: 'Server Room A', siteId: 'site-alpha', zoneId: 'z-alpha-restricted', description: 'Primary server cluster', customAttributes: {} },
  { id: 'door-alpha-comms', name: 'Comms Hub', siteId: 'site-alpha', zoneId: 'z-alpha-restricted', description: 'Network operations', customAttributes: {} },
  { id: 'door-alpha-lab3', name: 'Lab 3', siteId: 'site-alpha', zoneId: 'z-alpha-restricted', description: 'Research lab', customAttributes: {} },
  { id: 'door-alpha-lobby', name: 'Main Lobby', siteId: 'site-alpha', zoneId: 'z-alpha-interior', description: 'Reception entrance', customAttributes: {} },
  { id: 'door-alpha-carpark', name: 'Car Park Entry', siteId: 'site-alpha', zoneId: 'z-alpha-perimeter', description: 'Underground parking', customAttributes: {} },
  { id: 'door-beta-dc', name: 'Data Centre', siteId: 'site-beta', zoneId: 'z-beta-secure', description: 'Beta primary DC', customAttributes: {} },
  { id: 'door-beta-noc', name: 'NOC Room', siteId: 'site-beta', zoneId: 'z-beta-secure', description: 'Network operations centre', customAttributes: {} },
  { id: 'door-beta-lobby', name: 'Beta Lobby', siteId: 'site-beta', zoneId: 'z-beta-public', description: 'Main entrance', customAttributes: {} },
  { id: 'door-gamma-main', name: 'Warehouse Main', siteId: 'site-gamma', zoneId: 'z-gamma-interior', description: 'Primary warehouse entry', customAttributes: {} },
  { id: 'door-gamma-office', name: 'Depot Office', siteId: 'site-gamma', zoneId: 'z-gamma-interior', description: 'Admin office', customAttributes: {} },
]

// ── Users ────────────────────────────────────────────────────────────────────

export const USERS: User[] = [
  { id: 'u-sarah',   name: 'Sarah Chen',     email: 'sarah.chen@axon.io',    department: 'Operations', role: 'Senior Analyst',    clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-marcus',  name: 'Marcus Webb',     email: 'marcus.webb@axon.io',   department: 'Security',   role: 'Security Director', clearanceLevel: 5, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-aisha',   name: 'Aisha Tanaka',    email: 'aisha.tanaka@axon.io',  department: 'Operations', role: 'Analyst',           clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-james',   name: 'James Park',      email: 'james.park@axon.io',    department: 'Operations', role: 'Junior Analyst',    clearanceLevel: 2, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-rachel',  name: 'Rachel Liu',      email: 'rachel.liu@axon.io',    department: 'Engineering', role: 'DevOps Engineer',  clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-tom',     name: 'Tom Okafor',      email: 'tom.okafor@axon.io',    department: 'Security',   role: 'Analyst',           clearanceLevel: 4, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-priya',   name: 'Priya Sharma',    email: 'priya.sharma@axon.io',  department: 'Engineering', role: 'SRE',              clearanceLevel: 2, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-ben',     name: 'Ben Kowalski',    email: 'ben.kowalski@axon.io',  department: 'Operations', role: 'Night Operator',    clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-nina',    name: 'Nina Rodriguez',  email: 'nina.r@axon.io',        department: 'Facilities', role: 'Manager',           clearanceLevel: 2, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-alex',    name: 'Alex Nguyen',     email: 'alex.n@contractor.io',  department: 'Engineering', role: 'Contractor',       clearanceLevel: 1, type: 'contractor', status: 'active',    customAttributes: { contractExpiry: '2026-12-31' } },
  { id: 'u-zoe',     name: 'Zoe Williams',    email: 'zoe.w@axon.io',         department: 'Operations', role: 'Weekend Operator',  clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-inactive',name: 'David Foster',    email: 'd.foster@axon.io',      department: 'Security',   role: 'Analyst',           clearanceLevel: 3, type: 'employee',   status: 'suspended', customAttributes: {} },
]

// ── Named Schedules ───────────────────────────────────────────────────────────

export const SCHEDULES: NamedSchedule[] = [
  {
    id: 'sched-business',
    name: 'Business Hours',
    timezone: 'Australia/Melbourne',
    windows: [{ id: 'w-bh', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '07:00', endTime: '19:00' }],
    holidays: [
      { id: 'h-christmas', name: 'Christmas Day', month: 12, day: 25, behavior: 'deny_all', overrideGrantIds: [] },
      { id: 'h-boxing',    name: 'Boxing Day',    month: 12, day: 26, behavior: 'deny_all', overrideGrantIds: [] },
      { id: 'h-newyear',   name: "New Year's Day",month: 1,  day: 1,  behavior: 'deny_all', overrideGrantIds: [] },
      { id: 'h-anzac',     name: 'ANZAC Day',     month: 4,  day: 25, behavior: 'allow_with_override', overrideGrantIds: ['grant-emergency'], requiredClearance: 3 },
    ],
  },
  {
    id: 'sched-night',
    name: 'Night Operations',
    timezone: 'Australia/Melbourne',
    windows: [{ id: 'w-night', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '20:00', endTime: '06:00' }],
    holidays: [
      { id: 'h-night-christmas', name: 'Christmas Day', month: 12, day: 25, behavior: 'deny_all', overrideGrantIds: [] },
    ],
  },
  {
    id: 'sched-247',
    name: '24/7 Always On',
    timezone: 'Australia/Melbourne',
    windows: [
      { id: 'w-247-wd', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '00:00', endTime: '23:59' },
      { id: 'w-247-we', days: ['Sat', 'Sun'], startTime: '00:00', endTime: '23:59' },
    ],
    holidays: [],
  },
]

// ── Grants ───────────────────────────────────────────────────────────────────

export const GRANTS: Grant[] = [
  {
    id: 'grant-general-access',
    name: 'General Access',
    description: 'Business hours access to non-restricted areas',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    scheduleId: 'sched-business',
    customAttributes: {},
  },
  {
    id: 'grant-night-ops',
    name: 'Night Ops',
    description: 'Night access to restricted areas for Operations staff',
    scope: 'site',
    targetId: 'site-alpha',
    actions: ['unlock', 'arm', 'disarm'],
    applicationMode: 'conditional',
    conditions: [{ id: 'c-night-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-night',
    customAttributes: {},
  },
  {
    id: 'grant-security-ops',
    name: 'Security Ops',
    description: 'Full access for Security department staff',
    scope: 'global',
    actions: ['unlock', 'arm', 'disarm', 'lockdown', 'view_logs'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    scheduleId: 'sched-247',
    customAttributes: {},
  },
  {
    id: 'grant-emergency',
    name: 'Emergency Access',
    description: 'L4+ staff — auto-applies in emergencies, overrides holiday schedules',
    scope: 'global',
    actions: ['unlock', 'arm', 'disarm', 'override'],
    applicationMode: 'auto',
    conditions: [{ id: 'c-emg-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' }],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-lab-access',
    name: 'Lab Access',
    description: 'Access to research labs during business hours',
    scope: 'zone',
    targetId: 'z-alpha-restricted',
    actions: ['unlock', 'view_logs'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    scheduleId: 'sched-business',
    customAttributes: {},
  },
  {
    id: 'grant-contractor',
    name: 'Contractor Lobby',
    description: 'Lobby-only access for contractors during business hours',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'c-con-1', leftSide: 'user.type', operator: '==', rightSide: 'contractor' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-business',
    customAttributes: {},
  },
]

// ── Groups ───────────────────────────────────────────────────────────────────

export const GROUPS: Group[] = [
  {
    id: 'g-noc',
    name: 'NOC Team',
    description: 'Network Operations Centre — all Operations department staff',
    membershipType: 'dynamic',
    members: [],
    membershipRules: [
      { id: 'gr-noc-1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' },
      { id: 'gr-noc-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: ['g-night-shift', 'g-weekend-crew'],
    inheritedPermissions: ['grant-general-access', 'grant-lab-access'],
  },
  {
    id: 'g-night-shift',
    name: 'Night Shift',
    description: 'Operations staff rostered for overnight shifts',
    membershipType: 'static',
    members: ['u-sarah', 'u-aisha', 'u-ben'],
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-night-ops'],
  },
  {
    id: 'g-weekend-crew',
    name: 'Weekend Crew',
    description: 'Operations staff rostered for weekend coverage',
    membershipType: 'static',
    members: ['u-zoe', 'u-ben', 'u-james'],
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-general-access'],
  },
  {
    id: 'g-security',
    name: 'Security Operations',
    description: 'Security department — full site access',
    membershipType: 'dynamic',
    members: [],
    membershipRules: [
      { id: 'gr-sec-1', leftSide: 'user.department', operator: '==', rightSide: 'Security' },
      { id: 'gr-sec-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-security-ops'],
  },
  {
    id: 'g-engineering',
    name: 'Engineering',
    description: 'Engineering staff — general access only',
    membershipType: 'dynamic',
    members: [],
    membershipRules: [
      { id: 'gr-eng-1', leftSide: 'user.department', operator: '==', rightSide: 'Engineering' },
      { id: 'gr-eng-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-general-access'],
  },
]

// ── Policies ─────────────────────────────────────────────────────────────────

export const POLICIES: Policy[] = [
  {
    id: 'pol-restricted-zone',
    name: 'Restricted Zone Clearance',
    description: 'Restricted zones require clearance level 3 or above',
    rules: [{ id: 'pr-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    logicalOperator: 'AND',
    doorIds: ['door-alpha-server', 'door-alpha-comms', 'door-alpha-lab3', 'door-beta-dc', 'door-beta-noc'],
  },
  {
    id: 'pol-active-only',
    name: 'Active Users Only',
    description: 'Suspended or inactive users are blocked everywhere',
    rules: [{ id: 'pr-2', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    logicalOperator: 'AND',
    doorIds: [
      'door-alpha-server', 'door-alpha-comms', 'door-alpha-lab3',
      'door-alpha-lobby', 'door-alpha-carpark',
      'door-beta-dc', 'door-beta-noc', 'door-beta-lobby',
      'door-gamma-main', 'door-gamma-office',
    ],
  },
]

// ── Controllers ───────────────────────────────────────────────────────────────

export const CONTROLLERS: Controller[] = [
  { id: 'ctrl-alpha-1', name: 'Alpha Panel A', location: 'Server Room corridor', siteId: 'site-alpha', doorIds: ['door-alpha-server', 'door-alpha-comms'], customAttributes: {} },
  { id: 'ctrl-alpha-2', name: 'Alpha Panel B', location: 'Main lobby', siteId: 'site-alpha', doorIds: ['door-alpha-lobby', 'door-alpha-carpark'], customAttributes: {} },
  { id: 'ctrl-alpha-3', name: 'Alpha Panel C', location: 'Lab corridor', siteId: 'site-alpha', doorIds: ['door-alpha-lab3'], customAttributes: {} },
  { id: 'ctrl-beta-1',  name: 'Beta Panel A',  location: 'DC floor', siteId: 'site-beta', doorIds: ['door-beta-dc', 'door-beta-noc'], customAttributes: {} },
  { id: 'ctrl-beta-2',  name: 'Beta Panel B',  location: 'Lobby', siteId: 'site-beta', doorIds: ['door-beta-lobby'], customAttributes: {} },
  { id: 'ctrl-gamma-1', name: 'Gamma Panel A', location: 'Warehouse entrance', siteId: 'site-gamma', doorIds: ['door-gamma-main', 'door-gamma-office'], customAttributes: {} },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/store/seed.ts
git commit -m "feat(axon): rich seed data — 3 sites, 10 doors, 12 users, 5 groups, 6 grants, 3 schedules"
```

---

## Task 7: Zustand Store

**Files:**
- Create: `src/store/store.ts`

- [ ] **Step 1: Create store.ts**

Create `src/store/store.ts`:
```typescript
import { create } from 'zustand'
import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller, ArmingLog, CanvasPosition,
} from '../types'
import {
  USERS, GROUPS, GRANTS, SCHEDULES, POLICIES,
  DOORS, ZONES, SITES, CONTROLLERS,
} from './seed'

// Default canvas positions — columns by type
function defaultCanvasPositions(): Record<string, CanvasPosition> {
  const positions: Record<string, CanvasPosition> = {}
  // Groups column: x=80
  GROUPS.forEach((g, i) => { positions[`group-${g.id}`] = { x: 80, y: 60 + i * 130 } })
  // Grants column: x=340
  GRANTS.forEach((g, i) => { positions[`grant-${g.id}`] = { x: 340, y: 60 + i * 100 } })
  // Schedules column: x=340, below grants
  SCHEDULES.forEach((s, i) => { positions[`schedule-${s.id}`] = { x: 340, y: 60 + GRANTS.length * 100 + i * 90 } })
  // Doors column: x=620
  DOORS.forEach((d, i) => { positions[`door-${d.id}`] = { x: 620, y: 60 + i * 70 } })
  return positions
}

interface AxonStore {
  // ── Entities ──────────────────────────────────────────────────────────────
  users: User[]
  groups: Group[]
  grants: Grant[]
  schedules: NamedSchedule[]
  policies: Policy[]
  doors: Door[]
  zones: Zone[]
  sites: Site[]
  controllers: Controller[]
  armingLog: ArmingLog[]

  // ── Canvas state ──────────────────────────────────────────────────────────
  canvasPositions: Record<string, CanvasPosition>
  selectedCanvasNodeId: string | null

  // ── Entity actions ────────────────────────────────────────────────────────
  updateSite: (site: Site) => void
  updateZone: (zone: Zone) => void
  addArmingLog: (entry: ArmingLog) => void

  // ── Canvas actions ────────────────────────────────────────────────────────
  setCanvasPosition: (nodeKey: string, pos: CanvasPosition) => void
  setSelectedCanvasNode: (nodeId: string | null) => void
}

export const useStore = create<AxonStore>((set) => ({
  users:       USERS,
  groups:      GROUPS,
  grants:      GRANTS,
  schedules:   SCHEDULES,
  policies:    POLICIES,
  doors:       DOORS,
  zones:       ZONES,
  sites:       SITES,
  controllers: CONTROLLERS,
  armingLog:   [],

  canvasPositions:    defaultCanvasPositions(),
  selectedCanvasNodeId: null,

  updateSite: (site) =>
    set(state => ({ sites: state.sites.map(s => s.id === site.id ? site : s) })),

  updateZone: (zone) =>
    set(state => ({ zones: state.zones.map(z => z.id === zone.id ? zone : z) })),

  addArmingLog: (entry) =>
    set(state => ({ armingLog: [entry, ...state.armingLog] })),

  setCanvasPosition: (nodeKey, pos) =>
    set(state => ({ canvasPositions: { ...state.canvasPositions, [nodeKey]: pos } })),

  setSelectedCanvasNode: (nodeId) =>
    set({ selectedCanvasNodeId: nodeId }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/store/store.ts
git commit -m "feat(axon): Zustand store — entities + canvas positions + arming log"
```

---

## Task 8: App Shell

**Files:**
- Create: `src/components/NowPill.tsx`
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create NowPill.tsx**

Create `src/components/NowPill.tsx`:
```tsx
import { useEffect, useState } from 'react'

export default function NowPill() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[time.getDay()]
  const h = String(time.getHours()).padStart(2, '0')
  const m = String(time.getMinutes()).padStart(2, '0')
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace(/_/g, ' ') ?? ''

  return (
    <div className="flex items-center gap-1.5 bg-[#041008] border border-[#14532d] rounded-full px-3 py-1 text-xs font-mono text-green-400 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {day} {h}:{m}
      {tz && <span className="text-[#14532d] ml-0.5">{tz}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Create Layout.tsx**

Create `src/components/Layout.tsx`:
```tsx
import { NavLink, Outlet } from 'react-router-dom'
import {
  Share2, Search, Activity, Users, UsersRound,
  KeyRound, CalendarClock, DoorOpen, Building2, Shield,
} from 'lucide-react'
import NowPill from './NowPill'
import { useStore } from '../store/store'

const primaryNav = [
  { to: '/canvas',    icon: Share2,       label: 'Canvas',     color: '#6366f1' },
  { to: '/oracle',    icon: Search,       label: 'Oracle',     color: '#8b5cf6' },
  { to: '/reasoner',  icon: Activity,     label: 'Reasoner',   color: '#06b6d4' },
]

const entityNav = [
  { to: '/people',    icon: Users,        label: 'People' },
  { to: '/groups',    icon: UsersRound,   label: 'Groups' },
  { to: '/grants',    icon: KeyRound,     label: 'Grants' },
  { to: '/schedules', icon: CalendarClock,label: 'Schedules' },
  { to: '/doors',     icon: DoorOpen,     label: 'Doors' },
  { to: '/sites',     icon: Building2,    label: 'Sites' },
]

function SidebarItem({
  to, icon: Icon, label, color,
}: {
  to: string; icon: React.ElementType; label: string; color?: string
}) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `relative group w-[38px] h-[38px] rounded-lg flex items-center justify-center transition-colors ${
          isActive
            ? 'bg-white/[0.06] border border-white/10'
            : 'hover:bg-white/[0.04]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            style={{ color: isActive ? (color ?? '#94a3b8') : '#374151' }}
            strokeWidth={1.8}
          />
          {/* Tooltip */}
          <div className="absolute left-[46px] bg-[#1c1f2e] border border-[#2d3148] rounded-md px-2.5 py-1 text-[11px] text-slate-200 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {label}
          </div>
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const selectedNode = useStore(s => s.selectedCanvasNodeId)

  return (
    <div className="flex h-screen overflow-hidden bg-[#060912]">
      {/* Sidebar */}
      <aside className="w-14 shrink-0 bg-[#07090f] border-r border-[#141828] flex flex-col items-center py-3 gap-1">
        {/* Logo */}
        <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shrink-0">
          <span className="text-white text-base font-bold leading-none">A</span>
        </div>

        {/* Three lenses */}
        {primaryNav.map(item => (
          <SidebarItem key={item.to} {...item} />
        ))}

        {/* Separator */}
        <div className="w-7 h-px bg-[#141828] my-1.5" />

        {/* Entity management */}
        {entityNav.map(item => (
          <SidebarItem key={item.to} {...item} />
        ))}

        {/* Separator */}
        <div className="w-7 h-px bg-[#141828] my-1.5" />

        {/* Intrusion */}
        <SidebarItem to="/intrusion" icon={Shield} label="Intrusion" />

        {/* Avatar */}
        <div className="mt-auto w-[30px] h-[30px] rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] text-slate-400 font-semibold cursor-pointer hover:border-indigo-500 transition-colors">
          SC
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-[42px] shrink-0 bg-[#08090f] border-b border-[#141828] flex items-center px-4 gap-3">
          <div className="flex-1" />
          <div className="now-pill-wrapper">
            <NowPill />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 4: Replace src/App.tsx**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Canvas from './pages/Canvas'
import Oracle from './pages/Oracle'
import Reasoner from './pages/Reasoner'
import People from './pages/People'
import Groups from './pages/Groups'
import Grants from './pages/Grants'
import Schedules from './pages/Schedules'
import Doors from './pages/Doors'
import Sites from './pages/Sites'
import Intrusion from './pages/Intrusion'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/canvas" replace />} />
        <Route path="canvas"    element={<Canvas />} />
        <Route path="oracle"    element={<Oracle />} />
        <Route path="reasoner"  element={<Reasoner />} />
        <Route path="people"    element={<People />} />
        <Route path="groups"    element={<Groups />} />
        <Route path="grants"    element={<Grants />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="doors"     element={<Doors />} />
        <Route path="sites"     element={<Sites />} />
        <Route path="intrusion" element={<Intrusion />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 5: Create stub pages so routing doesn't crash**

Create `src/pages/Canvas.tsx`:
```tsx
export default function Canvas() {
  return <div className="p-6 text-slate-400">Canvas — coming in Task 9</div>
}
```

Repeat for all other pages (Oracle, Reasoner, People, Groups, Grants, Schedules, Doors, Sites, Intrusion) — same stub pattern.

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Expected: app loads at `http://localhost:5173`, sidebar visible, all nav links navigate without errors.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat(axon): app shell — sidebar, topbar, NowPill, routing"
```

---

## Task 9: Canvas — Graph + Nodes

**Files:**
- Create: `src/canvas/nodes/GroupNode.tsx`
- Create: `src/canvas/nodes/GrantNode.tsx`
- Create: `src/canvas/nodes/DoorNode.tsx`
- Create: `src/canvas/nodes/ScheduleNode.tsx`
- Create: `src/canvas/useCanvasLayout.ts`
- Create: `src/canvas/CanvasGraph.tsx`
- Modify: `src/pages/Canvas.tsx`

- [ ] **Step 1: Create GroupNode.tsx**

Create `src/canvas/nodes/GroupNode.tsx`:
```tsx
import type { Group } from '../../types'

interface Props {
  group: Group
  allGroups: Group[]
  selected: boolean
  onClick: () => void
}

export default function GroupNode({ group, allGroups, selected, onClick }: Props) {
  const subGroupNames = group.subGroups.map(id => allGroups.find(g => g.id === id)?.name ?? id)

  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[148px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0f1320] border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12),0_8px_28px_rgba(0,0,0,0.5)]'
          : 'bg-[#0f1320] border border-[#1e2d4a] hover:shadow-[0_0_0_2px_rgba(99,102,241,0.25)]'
      }`}
    >
      <div className="text-[12px] font-semibold text-slate-100">{group.name}</div>
      <div className="text-[9px] text-[#374151] mt-0.5">
        {group.membershipType === 'dynamic' ? 'dynamic' : `static · ${group.members.length} members`}
      </div>

      {subGroupNames.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#1e293b]">
          <div className="text-[8px] text-[#1e3a5f] uppercase tracking-wide mb-1">Subgroups</div>
          {subGroupNames.map(name => (
            <div key={name} className="flex items-center gap-1.5 bg-[#080b12] border border-[#1e293b] rounded px-1.5 py-0.5 mt-1 text-[9px] text-[#475569]">
              <span className="text-[#1e3a5f]">↳</span> {name}
            </div>
          ))}
        </div>
      )}

      <div className="mt-1.5">
        <span className={`text-[8px] px-1.5 py-0.5 rounded border inline-block ${
          group.membershipType === 'dynamic'
            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {group.membershipType}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create GrantNode.tsx**

Create `src/canvas/nodes/GrantNode.tsx`:
```tsx
import type { Grant } from '../../types'

const MODE_STYLE: Record<Grant['applicationMode'], string> = {
  assigned:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  conditional: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  auto:        'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

interface Props {
  grant: Grant
  selected: boolean
  onClick: () => void
}

export default function GrantNode({ grant, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[136px] px-3.5 py-3 ${
        selected
          ? 'bg-[#0c0a1e] border-2 border-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]'
          : 'bg-[#0c0a1e] border border-[#2e1f6b] hover:shadow-[0_0_0_2px_rgba(139,92,246,0.25)]'
      }`}
    >
      <div className="text-[12px] font-semibold text-violet-200">{grant.name}</div>
      <div className="text-[9px] text-[#374151] mt-0.5">{grant.actions.join(' · ')}</div>
      <div className="mt-1.5">
        <span className={`text-[8px] px-1.5 py-0.5 rounded border inline-block ${MODE_STYLE[grant.applicationMode]}`}>
          {grant.applicationMode}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create DoorNode.tsx**

Create `src/canvas/nodes/DoorNode.tsx`:
```tsx
import type { Door, Zone } from '../../types'

interface Props {
  door: Door
  zone?: Zone
  selected: boolean
  onClick: () => void
}

export default function DoorNode({ door, zone, selected, onClick }: Props) {
  const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'

  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[116px] px-3 py-2.5 ${
        selected
          ? `bg-[#0a0d14] border-2 shadow-[0_0_0_4px_rgba(239,68,68,0.08)] ${isRestricted ? 'border-red-500' : 'border-slate-500'}`
          : `bg-[#0a0d14] border ${isRestricted ? 'border-red-900/50 hover:border-red-800' : 'border-[#1e293b] hover:border-slate-600'}`
      }`}
    >
      <div className="text-[9px] mb-1">🚪</div>
      <div className={`text-[11px] font-medium ${isRestricted ? 'text-red-300' : 'text-slate-300'}`}>
        {door.name}
      </div>
      {zone && (
        <div className="text-[9px] text-[#374151] mt-0.5">{zone.type}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create ScheduleNode.tsx**

Create `src/canvas/nodes/ScheduleNode.tsx`:
```tsx
import type { NamedSchedule } from '../../types'

interface Props {
  schedule: NamedSchedule
  selected: boolean
  onClick: () => void
}

export default function ScheduleNode({ schedule, selected, onClick }: Props) {
  const windowSummary = schedule.windows
    .map(w => `${w.days.length === 7 ? 'Every day' : w.days.join('/')} ${w.startTime}–${w.endTime}`)
    .join(', ')

  const denyHolidays = schedule.holidays.filter(h => h.behavior === 'deny_all')
  const overrideHolidays = schedule.holidays.filter(h => h.behavior === 'allow_with_override')

  return (
    <div
      onClick={onClick}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[140px] px-3.5 py-3 ${
        selected
          ? 'bg-[#07100e] border-2 border-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.12)]'
          : 'bg-[#07100e] border border-[#134e4a] hover:shadow-[0_0_0_2px_rgba(20,184,166,0.25)]'
      }`}
    >
      <div className="text-[11px] font-semibold text-teal-300">{schedule.name}</div>
      <div className="text-[9px] text-teal-900 mt-0.5 leading-relaxed">{windowSummary}</div>
      {denyHolidays.length > 0 && (
        <div className="text-[8px] text-teal-900 mt-1.5">
          ✕ {denyHolidays.map(h => h.name).join(', ')}
        </div>
      )}
      {overrideHolidays.length > 0 && (
        <div className="text-[8px] text-teal-700 mt-0.5">
          ⚠ {overrideHolidays.map(h => h.name).join(', ')}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create useCanvasLayout.ts**

Create `src/canvas/useCanvasLayout.ts`:
```typescript
import { useRef, useCallback } from 'react'
import { useStore } from '../store/store'
import type { CanvasPosition } from '../types'

export function useCanvasLayout() {
  const positions = useStore(s => s.canvasPositions)
  const setPosition = useStore(s => s.setCanvasPosition)
  const dragRef = useRef<{ nodeKey: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const startDrag = useCallback((nodeKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const pos = positions[nodeKey] ?? { x: 0, y: 0 }
    dragRef.current = { nodeKey, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      setPosition(dragRef.current.nodeKey, {
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      })
    }

    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [positions, setPosition])

  return { positions, startDrag }
}
```

- [ ] **Step 6: Create CanvasGraph.tsx**

Create `src/canvas/CanvasGraph.tsx`:
```tsx
import { useStore } from '../store/store'
import { useCanvasLayout } from './useCanvasLayout'
import GroupNode from './nodes/GroupNode'
import GrantNode from './nodes/GrantNode'
import DoorNode from './nodes/DoorNode'
import ScheduleNode from './nodes/ScheduleNode'
import type { CanvasPosition } from '../types'

function nodeCenter(pos: CanvasPosition, w = 148, h = 80): { x: number; y: number } {
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

export default function CanvasGraph() {
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const doors     = useStore(s => s.doors)
  const zones     = useStore(s => s.zones)
  const schedules = useStore(s => s.schedules)
  const selected  = useStore(s => s.selectedCanvasNodeId)
  const setSelected = useStore(s => s.setSelectedCanvasNode)

  const { positions, startDrag } = useCanvasLayout()

  function pos(key: string): CanvasPosition {
    return positions[key] ?? { x: 0, y: 0 }
  }

  // Compute SVG edges
  const edges: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []

  // Group → Grant edges (via inheritedPermissions)
  for (const group of groups) {
    const gPos = nodeCenter(pos(`group-${group.id}`))
    for (const grantId of group.inheritedPermissions) {
      const grPos = nodeCenter(pos(`grant-${grantId}`), 136)
      edges.push({ x1: gPos.x, y1: gPos.y, x2: grPos.x, y2: grPos.y, color: '#1e2d4a' })
    }
  }

  // Grant → Schedule edges
  for (const grant of grants) {
    if (!grant.scheduleId) continue
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const sPos  = nodeCenter(pos(`schedule-${grant.scheduleId}`), 140)
    edges.push({ x1: grPos.x, y1: grPos.y, x2: sPos.x, y2: sPos.y, color: '#134e4a' })
  }

  // Grant → Door edges (via scope: global → all doors, site → site doors, zone → zone doors)
  for (const grant of grants) {
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const coveredDoors = doors.filter(d =>
      grant.scope === 'global' ||
      (grant.scope === 'site'  && grant.targetId === d.siteId) ||
      (grant.scope === 'zone'  && grant.targetId === d.zoneId)
    ).slice(0, 3) // cap at 3 edges per grant to avoid visual chaos
    for (const door of coveredDoors) {
      const dPos = nodeCenter(pos(`door-${door.id}`), 116, 60)
      edges.push({ x1: grPos.x, y1: grPos.y, x2: dPos.x, y2: dPos.y, color: '#2e1f6b' })
    }
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(rgba(30,37,59,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(30,37,59,.35) 1px,transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      onClick={() => setSelected(null)}
    >
      {/* Edges SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        <defs>
          {['slate', 'violet', 'teal'].map((name, i) => {
            const colors = ['#1e2d4a', '#2e1f6b', '#134e4a']
            return (
              <marker key={name} id={`arr-${name}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0.5 L5,3 L0,5.5 Z" fill={colors[i]} />
              </marker>
            )
          })}
        </defs>
        {edges.map((e, i) => {
          const markerColor = e.color === '#1e2d4a' ? 'slate' : e.color === '#2e1f6b' ? 'violet' : 'teal'
          return (
            <path
              key={i}
              d={`M ${e.x1} ${e.y1} C ${(e.x1 + e.x2) / 2} ${e.y1} ${(e.x1 + e.x2) / 2} ${e.y2} ${e.x2} ${e.y2}`}
              stroke={e.color}
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="5,3"
              markerEnd={`url(#arr-${markerColor})`}
              opacity="0.7"
            />
          )
        })}
      </svg>

      {/* Group nodes */}
      {groups.map(group => {
        const p = pos(`group-${group.id}`)
        return (
          <div
            key={group.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`group-${group.id}`, e)}
          >
            <GroupNode
              group={group}
              allGroups={groups}
              selected={selected === `group-${group.id}`}
              onClick={() => setSelected(`group-${group.id}`)}
            />
          </div>
        )
      })}

      {/* Grant nodes */}
      {grants.map(grant => {
        const p = pos(`grant-${grant.id}`)
        return (
          <div
            key={grant.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`grant-${grant.id}`, e)}
          >
            <GrantNode
              grant={grant}
              selected={selected === `grant-${grant.id}`}
              onClick={() => setSelected(`grant-${grant.id}`)}
            />
          </div>
        )
      })}

      {/* Schedule nodes */}
      {schedules.map(schedule => {
        const p = pos(`schedule-${schedule.id}`)
        return (
          <div
            key={schedule.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`schedule-${schedule.id}`, e)}
          >
            <ScheduleNode
              schedule={schedule}
              selected={selected === `schedule-${schedule.id}`}
              onClick={() => setSelected(`schedule-${schedule.id}`)}
            />
          </div>
        )
      })}

      {/* Door nodes */}
      {doors.map(door => {
        const p = pos(`door-${door.id}`)
        const zone = zones.find(z => z.id === door.zoneId)
        return (
          <div
            key={door.id}
            style={{ left: p.x, top: p.y, position: 'absolute' }}
            onMouseDown={e => startDrag(`door-${door.id}`, e)}
          >
            <DoorNode
              door={door}
              zone={zone}
              selected={selected === `door-${door.id}`}
              onClick={() => setSelected(`door-${door.id}`)}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Create DetailPanel.tsx**

Create `src/canvas/DetailPanel.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Search, Activity, X } from 'lucide-react'

export default function DetailPanel() {
  const selected  = useStore(s => s.selectedCanvasNodeId)
  const setSelected = useStore(s => s.setSelectedCanvasNode)
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const doors     = useStore(s => s.doors)
  const zones     = useStore(s => s.zones)
  const schedules = useStore(s => s.schedules)
  const navigate  = useNavigate()

  if (!selected) return null

  const [type, id] = selected.split('-').reduce((acc, part, i) => {
    if (i === 0) return [part, '']
    return [acc[0], acc[1] ? `${acc[1]}-${part}` : part]
  }, ['', ''] as [string, string])

  let title = '', subtitle = '', body: React.ReactNode = null

  if (type === 'group') {
    const group = groups.find(g => g.id === id)
    if (!group) return null
    title = group.name
    subtitle = `Group · ${group.membershipType}`
    body = (
      <div className="space-y-4">
        {group.membershipType === 'dynamic' && group.membershipRules.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Membership rules</div>
            {group.membershipRules.map(r => (
              <div key={r.id} className="bg-[#111827] rounded px-2 py-1.5 text-[10px] font-mono text-slate-400 mb-1">
                <span className="text-indigo-400">{r.leftSide}</span>{' '}
                <span className="text-slate-600">{r.operator}</span>{' '}
                <span className="text-emerald-400">"{Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}"</span>
              </div>
            ))}
          </div>
        )}
        {group.subGroups.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Subgroups</div>
            <div className="flex flex-wrap gap-1">
              {group.subGroups.map(sgId => {
                const sg = groups.find(g => g.id === sgId)
                return sg ? <span key={sgId} className="text-[10px] bg-[#111827] border border-[#1e3a5f] text-blue-400 px-2 py-0.5 rounded">↳ {sg.name}</span> : null
              })}
            </div>
          </div>
        )}
        {group.inheritedPermissions.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Grants</div>
            <div className="flex flex-wrap gap-1">
              {group.inheritedPermissions.map(gid => {
                const g = grants.find(gr => gr.id === gid)
                return g ? <span key={gid} className="text-[10px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-2 py-0.5 rounded">{g.name}</span> : null
              })}
            </div>
          </div>
        )}
      </div>
    )
  } else if (type === 'grant') {
    const grant = grants.find(g => g.id === id)
    if (!grant) return null
    title = grant.name
    subtitle = `Grant · ${grant.applicationMode} · ${grant.scope}`
    body = (
      <div className="space-y-4">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Actions</div>
          <div className="flex flex-wrap gap-1">
            {grant.actions.map(a => (
              <span key={a} className="text-[10px] bg-[#111827] border border-[#1e293b] text-slate-400 px-2 py-0.5 rounded">{a}</span>
            ))}
          </div>
        </div>
        {grant.scheduleId && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Schedule</div>
            <span className="text-[10px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-2 py-0.5 rounded">
              {schedules.find(s => s.id === grant.scheduleId)?.name ?? grant.scheduleId}
            </span>
          </div>
        )}
        {grant.conditions.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Conditions</div>
            {grant.conditions.map(c => (
              <div key={c.id} className="bg-[#111827] rounded px-2 py-1.5 text-[10px] font-mono text-slate-400 mb-1">
                <span className="text-indigo-400">{c.leftSide}</span>{' '}
                <span className="text-slate-600">{c.operator}</span>{' '}
                <span className="text-amber-400">"{Array.isArray(c.rightSide) ? c.rightSide.join(', ') : c.rightSide}"</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  } else if (type === 'schedule') {
    const schedule = schedules.find(s => s.id === id)
    if (!schedule) return null
    title = schedule.name
    subtitle = `Schedule · ${schedule.timezone}`
    body = (
      <div className="space-y-4">
        {schedule.windows.map(w => (
          <div key={w.id}>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Window</div>
            <div className="text-[10px] text-slate-400">{w.days.join(', ')} · {w.startTime}–{w.endTime}</div>
          </div>
        ))}
        {schedule.holidays.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Holidays</div>
            {schedule.holidays.map(h => (
              <div key={h.id} className="text-[10px] text-slate-500 mb-0.5">
                <span className={h.behavior === 'deny_all' ? 'text-red-500' : 'text-amber-500'}>
                  {h.behavior === 'deny_all' ? '✕' : '⚠'} {h.name}
                </span>
                {' '}({h.month}/{h.day})
              </div>
            ))}
          </div>
        )}
      </div>
    )
  } else if (type === 'door') {
    const door = doors.find(d => d.id === id)
    if (!door) return null
    const zone = zones.find(z => z.id === door.zoneId)
    title = door.name
    subtitle = `Door · ${zone?.type ?? 'No zone'}`
    body = (
      <div className="space-y-4">
        {zone && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1">Zone</div>
            <div className="text-[10px] text-slate-400">{zone.name} · {zone.type}</div>
          </div>
        )}
        {door.description && (
          <div className="text-[10px] text-slate-500">{door.description}</div>
        )}
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-56 bg-[#07090f] border-l border-[#141828] flex flex-col z-10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#141828] flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-bold text-slate-100">{title}</div>
          <div className="text-[10px] text-[#374151] mt-0.5">{subtitle}</div>
        </div>
        <button onClick={() => setSelected(null)} className="text-[#374151] hover:text-slate-400 mt-0.5 shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {body}
      </div>

      {/* Quick actions */}
      <div className="px-4 py-3 border-t border-[#141828] space-y-2">
        <button
          onClick={() => navigate('/oracle')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] bg-violet-500/8 border border-violet-500/15 text-violet-400 hover:bg-violet-500/14 transition-colors"
        >
          <Search size={11} /> Query in Oracle
        </button>
        <button
          onClick={() => navigate('/reasoner')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] bg-cyan-500/8 border border-cyan-500/15 text-cyan-400 hover:bg-cyan-500/14 transition-colors"
        >
          <Activity size={11} /> Trace in Reasoner
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Replace Canvas.tsx**

Replace `src/pages/Canvas.tsx`:
```tsx
import CanvasGraph from '../canvas/CanvasGraph'
import DetailPanel from '../canvas/DetailPanel'
import { useStore } from '../store/store'

export default function Canvas() {
  const selectedNode = useStore(s => s.selectedCanvasNodeId)

  return (
    <div className="relative w-full h-full bg-[#0b0e18]">
      <CanvasGraph />
      {selectedNode && <DetailPanel />}
    </div>
  )
}
```

- [ ] **Step 9: Verify in browser**

Navigate to `/canvas`. Expected: dot-grid background with group, grant, schedule, and door nodes visible. Nodes are draggable. Clicking a node opens the detail panel. Clicking empty canvas deselects.

- [ ] **Step 10: Commit**

```bash
git add src/canvas/ src/pages/Canvas.tsx
git commit -m "feat(axon): Canvas lens — draggable nodes, edges, detail panel"
```

---

## Task 10: Oracle Lens

**Files:**
- Modify: `src/pages/Oracle.tsx`

- [ ] **Step 1: Replace Oracle.tsx with full implementation**

Replace `src/pages/Oracle.tsx`:
```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useStore } from '../store/store'
import { evaluateAccess, collectGrants } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import { resolveGroupMembership } from '../engine/groupEngine'
import type { User, Door, ActionType, AccessResult } from '../types'

type QueryMode = 'who-can-access' | 'what-can-person-access'

interface ResultRow {
  user: User
  door: Door
  result: AccessResult
}

export default function Oracle() {
  const users     = useStore(s => s.users)
  const doors     = useStore(s => s.doors)
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const policies  = useStore(s => s.policies)
  const zones     = useStore(s => s.zones)
  const sites     = useStore(s => s.sites)
  const controllers = useStore(s => s.controllers)

  const [mode, setMode] = useState<QueryMode>('who-can-access')
  const [selectedDoorId, setSelectedDoorId] = useState(doors[0]?.id ?? '')
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '')
  const [selectedAction, setSelectedAction] = useState<ActionType>('unlock')
  const [useNow, setUseNow] = useState(true)
  const [overrideHour, setOverrideHour] = useState(10)
  const [simulateHoliday, setSimulateHoliday] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)
  const [hasRun, setHasRun] = useState(false)

  const navigate = useNavigate()

  const store = useMemo(() => ({
    allUsers: users, allGroups: groups, allGrants: grants,
    allSchedules: schedules, allPolicies: policies, allDoors: doors,
    allZones: zones, allSites: sites, allControllers: controllers,
  }), [users, groups, grants, schedules, policies, doors, zones, sites, controllers])

  function buildNow() {
    const base = buildNowContext()
    if (useNow && !simulateHoliday) return base
    const hour = useNow ? base.hour : overrideHour
    // Simulate holiday: force month=12, day=25 (Christmas) for demo
    const holidayOverride = simulateHoliday ? { month: 12, day: 25, date: `${base.date.slice(0, 4)}-12-25` } : {}
    return { ...base, hour, ...holidayOverride }
  }

  function runQuery() {
    const now = buildNow()

    if (mode === 'who-can-access') {
      const door = doors.find(d => d.id === selectedDoorId)
      if (!door) return
      const rows: ResultRow[] = users.map(user => ({
        user,
        door,
        result: evaluateAccess(user, door, store, now, selectedAction),
      }))
      rows.sort((a, b) => (b.result.overallGranted ? 1 : 0) - (a.result.overallGranted ? 1 : 0))
      setResults(rows)
    } else {
      const user = users.find(u => u.id === selectedUserId)
      if (!user) return
      const rows: ResultRow[] = doors.map(door => ({
        user,
        door,
        result: evaluateAccess(user, door, store, now, selectedAction),
      }))
      rows.sort((a, b) => (b.result.overallGranted ? 1 : 0) - (a.result.overallGranted ? 1 : 0))
      setResults(rows)
    }
    setHasRun(true)
  }

  const granted  = results?.filter(r => r.result.overallGranted) ?? []
  const denied   = results?.filter(r => !r.result.overallGranted) ?? []

  const activeHoliday = results?.[0]?.result.activeHoliday

  function reasonSummary(row: ResultRow): string {
    const { result } = row
    if (!result.permissionGranted) {
      return 'No grant covers this door'
    }
    if (!result.abacPassed) {
      const failedRule = result.policyResults.flatMap(p => p.ruleResults).find(r => !r.passed)
      return failedRule ? `Policy: ${failedRule.leftSide} ${failedRule.operator} ${Array.isArray(failedRule.rightSide) ? failedRule.rightSide.join(',') : failedRule.rightSide} → ${failedRule.leftResolved}` : 'Policy check failed'
    }
    const chain = result.groupChain.join(' → ')
    const grantNames = result.matchedGrants.join(', ')
    return chain ? `${chain} → ${grantNames}` : grantNames
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0b0e18]">
      {/* Query type tabs */}
      <div className="flex border-b border-[#141828] shrink-0">
        {(['who-can-access', 'what-can-person-access'] as QueryMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults(null); setHasRun(false) }}
            className={`px-5 py-3 text-[11px] font-semibold border-b-2 transition-colors ${
              mode === m
                ? 'text-violet-300 border-violet-500 bg-violet-500/[0.04]'
                : 'text-[#374151] border-transparent hover:text-slate-400'
            }`}
          >
            {m === 'who-can-access' ? 'Who can access?' : 'What can a person access?'}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Query form */}
        <div className="w-80 border-r border-[#141828] flex flex-col p-4 gap-4 shrink-0 overflow-y-auto">
          {mode === 'who-can-access' ? (
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Door</label>
              <select
                value={selectedDoorId}
                onChange={e => setSelectedDoorId(e.target.value)}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
              >
                {doors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Person</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
              >
                {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.department}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Action</label>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value as ActionType)}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
            >
              {(['unlock','arm','disarm','lockdown','view_logs','override'] as ActionType[]).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Time</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useNow} onChange={e => setUseNow(e.target.checked)} className="accent-violet-500" />
              <span className="text-[11px] text-slate-400">Use current time</span>
            </label>
            {!useNow && (
              <input
                type="number"
                min={0} max={23}
                value={overrideHour}
                onChange={e => setOverrideHour(Number(e.target.value))}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-violet-500"
                placeholder="Hour (0–23)"
              />
            )}
          </div>

          <div
            className="flex items-center justify-between bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 cursor-pointer"
            onClick={() => setSimulateHoliday(s => !s)}
          >
            <div>
              <div className="text-[11px] text-slate-400">Simulate holiday</div>
              <div className="text-[9px] text-[#374151]">Tests Christmas Day rules</div>
            </div>
            <div className={`w-8 h-4.5 rounded-full transition-colors relative ${simulateHoliday ? 'bg-violet-600' : 'bg-[#1e293b]'}`}
              style={{ width: 32, height: 18 }}>
              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${simulateHoliday ? 'left-[14px]' : 'left-0.5'}`} style={{ width: 14, height: 14 }} />
            </div>
          </div>

          <button
            onClick={runQuery}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[12px] font-bold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-[0_4px_16px_rgba(99,102,241,0.25)]"
          >
            Run Query
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!hasRun ? (
            <div className="flex-1 flex items-center justify-center text-[#374151] text-[12px]">
              Configure a query and click Run
            </div>
          ) : (
            <>
              {/* Results header */}
              <div className="px-4 py-3 border-b border-[#141828] flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-semibold text-slate-200">
                  {results!.length} evaluated
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-500/8 text-emerald-400 border-emerald-500/20 font-semibold">
                  {granted.length} granted
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-red-500/8 text-red-400 border-red-500/20 font-semibold">
                  {denied.length} denied
                </span>
                {simulateHoliday && (
                  <span className="ml-auto text-[10px] text-amber-400 bg-amber-500/8 border border-amber-500/20 px-2 py-0.5 rounded">
                    🏖 Christmas Day rules in effect
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Granted */}
                {granted.map(row => (
                  <div key={`${row.user.id}-${row.door.id}`}
                    className="bg-[#0f1320] border-l-2 border-emerald-500 border border-[#1e293b] rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-[#374151] transition-colors cursor-pointer"
                    onClick={() => navigate('/reasoner')}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#0f2d1a] flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                      {row.user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-100">
                        {mode === 'who-can-access' ? row.user.name : row.door.name}
                      </div>
                      <div className="text-[9px] text-[#374151] truncate">{reasonSummary(row)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">GRANTED</span>
                      <span className="text-[9px] text-[#374151] flex items-center gap-1 hover:text-cyan-400">
                        <Activity size={9} /> Trace
                      </span>
                    </div>
                  </div>
                ))}

                {denied.length > 0 && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-[#141828]" />
                    <span className="text-[9px] text-[#374151]">{denied.length} denied</span>
                    <div className="flex-1 h-px bg-[#141828]" />
                  </div>
                )}

                {/* Denied */}
                {denied.map(row => (
                  <div key={`${row.user.id}-${row.door.id}`}
                    className="bg-[#0f1320] border-l-2 border-red-900 border border-[#1e293b] rounded-lg px-3 py-2.5 flex items-center gap-3 hover:border-[#374151] transition-colors cursor-pointer"
                    onClick={() => navigate('/reasoner')}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#1a0a0a] flex items-center justify-center text-[10px] font-bold text-red-400/50 shrink-0">
                      {row.user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-slate-400">
                        {mode === 'who-can-access' ? row.user.name : row.door.name}
                      </div>
                      <div className="text-[9px] text-red-900 truncate">{reasonSummary(row)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/8 text-red-400">DENIED</span>
                      <span className="text-[9px] text-[#374151] flex items-center gap-1 hover:text-cyan-400">
                        <Activity size={9} /> Trace
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/oracle`. Expected: two query mode tabs, form on left. Select a door, click "Run Query" — see all 12 users evaluated with GRANTED/DENIED rows. Toggle "Simulate holiday" — see results change for users without high enough clearance.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Oracle.tsx
git commit -m "feat(axon): Oracle lens — forward/reverse queries, holiday simulation"
```

---

## Task 11: Reasoner Lens

**Files:**
- Modify: `src/pages/Reasoner.tsx`

- [ ] **Step 1: Replace Reasoner.tsx**

Replace `src/pages/Reasoner.tsx`:
```tsx
import { useState, useMemo } from 'react'
import { CheckCircle, XCircle, MinusCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useStore } from '../store/store'
import { evaluateAccess } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import { resolveGroupMembership } from '../engine/groupEngine'
import type { ActionType, AccessResult } from '../types'

function StepHeader({ label, status, expanded, onToggle }: {
  label: string; status: 'pass' | 'fail' | 'skip' | 'holiday'; expanded: boolean; onToggle: () => void
}) {
  const Icon = status === 'pass' ? CheckCircle : status === 'fail' ? XCircle : MinusCircle
  const color = { pass: 'text-emerald-400', fail: 'text-red-400', skip: 'text-slate-600', holiday: 'text-amber-400' }[status]
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
    >
      <Icon size={15} className={color} />
      <span className="text-[12px] font-semibold text-slate-200 flex-1">{label}</span>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
        status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' :
        status === 'fail' ? 'bg-red-500/10 text-red-400' :
        status === 'holiday' ? 'bg-amber-500/10 text-amber-400' :
        'bg-slate-700 text-slate-500'
      }`}>{status}</span>
      {expanded ? <ChevronDown size={13} className="text-slate-600" /> : <ChevronRight size={13} className="text-slate-600" />}
    </button>
  )
}

export default function Reasoner() {
  const users     = useStore(s => s.users)
  const doors     = useStore(s => s.doors)
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const policies  = useStore(s => s.policies)
  const zones     = useStore(s => s.zones)
  const sites     = useStore(s => s.sites)
  const controllers = useStore(s => s.controllers)

  const [selectedUserId,  setSelectedUserId]  = useState(users[0]?.id ?? '')
  const [selectedDoorId,  setSelectedDoorId]  = useState(doors[0]?.id ?? '')
  const [selectedAction,  setSelectedAction]  = useState<ActionType>('unlock')
  const [result, setResult] = useState<AccessResult | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]))

  const store = useMemo(() => ({
    allUsers: users, allGroups: groups, allGrants: grants,
    allSchedules: schedules, allPolicies: policies, allDoors: doors,
    allZones: zones, allSites: sites, allControllers: controllers,
  }), [users, groups, grants, schedules, policies, doors, zones, sites, controllers])

  function toggleStep(i: number) {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function runTrace() {
    const user = users.find(u => u.id === selectedUserId)
    const door = doors.find(d => d.id === selectedDoorId)
    if (!user || !door) return
    const now = buildNowContext()
    setResult(evaluateAccess(user, door, store, now, selectedAction))
  }

  const user = users.find(u => u.id === selectedUserId)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0b0e18]">
      {/* Input strip */}
      <div className="border-b border-[#141828] px-4 py-3 flex items-end gap-3 shrink-0 bg-[#08090f]">
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Person</label>
          <select
            value={selectedUserId}
            onChange={e => { setSelectedUserId(e.target.value); setResult(null) }}
            className="bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Door</label>
          <select
            value={selectedDoorId}
            onChange={e => { setSelectedDoorId(e.target.value); setResult(null) }}
            className="bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {doors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold">Action</label>
          <select
            value={selectedAction}
            onChange={e => { setSelectedAction(e.target.value as ActionType); setResult(null) }}
            className="bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {(['unlock','arm','disarm','view_logs','lockdown'] as ActionType[]).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button
          onClick={runTrace}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[11px] font-bold hover:from-cyan-500 hover:to-teal-500 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.25)]"
        >
          Trace
        </button>
        {result && (
          <div className="ml-auto text-[10px] text-slate-500 font-mono">
            {result.nowContext.dayOfWeek} {String(result.nowContext.hour).padStart(2,'0')}:{String(result.nowContext.minute).padStart(2,'0')}
            {result.activeHoliday && <span className="ml-2 text-amber-400">🏖 {result.activeHoliday.name}</span>}
          </div>
        )}
      </div>

      {!result ? (
        <div className="flex-1 flex items-center justify-center text-[#374151] text-[12px]">
          Select a person, door, and action — then click Trace
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-[#141828]">

            {/* Step 1: Group Membership */}
            <div>
              <StepHeader
                label="1 · Group Membership"
                status={result.groupChain.length > 0 ? 'pass' : 'skip'}
                expanded={expandedSteps.has(0)}
                onToggle={() => toggleStep(0)}
              />
              {expandedSteps.has(0) && (
                <div className="px-6 pb-3 space-y-2">
                  {result.groupChain.length === 0 ? (
                    <p className="text-[10px] text-slate-600">User is not a member of any group.</p>
                  ) : (
                    result.groupChain.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-300">{name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Grant Collection */}
            <div>
              <StepHeader
                label="2 · Grant Collection"
                status={result.grantResults.length > 0 ? (result.permissionGranted ? 'pass' : 'fail') : 'skip'}
                expanded={expandedSteps.has(1)}
                onToggle={() => toggleStep(1)}
              />
              {expandedSteps.has(1) && (
                <div className="px-6 pb-3 space-y-2">
                  {result.grantResults.length === 0 ? (
                    <p className="text-[10px] text-slate-600">No grants cover this door + action.</p>
                  ) : (
                    result.grantResults.map(gr => (
                      <div key={gr.grantId}
                        className={`rounded-lg border px-3 py-2 ${gr.included ? 'border-emerald-900/50 bg-emerald-500/[0.04]' : 'border-[#1e293b] bg-[#0f1117]'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-slate-200">{gr.grantName}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${gr.included ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/8 text-red-400'}`}>
                            {gr.included ? 'INCLUDED' : 'EXCLUDED'}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#374151] space-y-0.5">
                          <div>Mode: <span className="text-slate-500">{gr.applicationMode}</span></div>
                          {gr.scheduleStatus !== null && (
                            <div>Schedule: <span className={
                              gr.scheduleStatus === 'active' ? 'text-emerald-400' :
                              gr.scheduleStatus === 'override_active' ? 'text-amber-400' :
                              'text-red-400'
                            }>{gr.scheduleStatus}{gr.activeHolidayName ? ` · 🏖 ${gr.activeHolidayName}` : ''}</span></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Schedule Evaluation (summary) */}
            <div>
              <StepHeader
                label="3 · Schedule Evaluation"
                status={
                  result.activeHoliday ? 'holiday' :
                  result.grantResults.some(g => g.scheduleStatus === 'inactive') ? 'fail' : 'pass'
                }
                expanded={expandedSteps.has(2)}
                onToggle={() => toggleStep(2)}
              />
              {expandedSteps.has(2) && (
                <div className="px-6 pb-3 space-y-1.5">
                  {result.activeHoliday && (
                    <div className="text-[10px] text-amber-400 bg-amber-500/[0.06] border border-amber-500/20 rounded px-3 py-2">
                      🏖 <span className="font-semibold">{result.activeHoliday.name}</span> in effect — holiday rules apply
                    </div>
                  )}
                  {result.grantResults.filter(g => g.scheduleStatus !== null).map(gr => (
                    <div key={gr.grantId} className="flex items-center gap-2 text-[10px]">
                      {gr.scheduleStatus === 'active' || gr.scheduleStatus === 'override_active'
                        ? <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                        : <XCircle size={11} className="text-red-400 shrink-0" />
                      }
                      <span className="text-slate-400">{gr.grantName}:</span>
                      <span className={
                        gr.scheduleStatus === 'active' ? 'text-emerald-400' :
                        gr.scheduleStatus === 'override_active' ? 'text-amber-400' : 'text-red-400'
                      }>{gr.scheduleStatus}</span>
                    </div>
                  ))}
                  {result.grantResults.every(g => g.scheduleStatus === null) && (
                    <p className="text-[10px] text-slate-600">No schedules attached to any candidate grant.</p>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Policy Check */}
            <div>
              <StepHeader
                label="4 · Policy Check"
                status={result.policyResults.length === 0 ? 'skip' : result.abacPassed ? 'pass' : 'fail'}
                expanded={expandedSteps.has(3)}
                onToggle={() => toggleStep(3)}
              />
              {expandedSteps.has(3) && (
                <div className="px-6 pb-3 space-y-3">
                  {result.policyResults.length === 0 ? (
                    <p className="text-[10px] text-slate-600">No policies assigned to this door.</p>
                  ) : (
                    result.policyResults.map(pr => (
                      <div key={pr.policyId} className={`rounded-lg border overflow-hidden ${pr.passed ? 'border-emerald-900/40' : 'border-red-900/40'}`}>
                        <div className={`flex items-center justify-between px-3 py-1.5 ${pr.passed ? 'bg-emerald-500/[0.04]' : 'bg-red-500/[0.04]'}`}>
                          <span className="text-[11px] font-semibold text-slate-300">{pr.policyName}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${pr.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/8 text-red-400'}`}>
                            {pr.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        <div className="divide-y divide-[#141828]">
                          {pr.ruleResults.map(rr => (
                            <div key={rr.ruleId} className="px-3 py-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="font-mono text-slate-400">{rr.leftSide}</span>
                              <span className="text-blue-400">{rr.operator}</span>
                              <span className="text-amber-300">{Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-slate-300">{rr.leftResolved}</span>
                              <span className="text-slate-600">→</span>
                              {rr.passed
                                ? <span className="text-emerald-400 font-bold">PASS</span>
                                : <span className="text-red-400 font-bold">FAIL</span>
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 5: Final Verdict */}
            <div>
              <StepHeader
                label="5 · Final Verdict"
                status={result.overallGranted ? 'pass' : 'fail'}
                expanded={expandedSteps.has(4)}
                onToggle={() => toggleStep(4)}
              />
              {expandedSteps.has(4) && (
                <div className="px-6 pb-4">
                  <div className={`rounded-xl border-2 p-6 flex items-center justify-center gap-4 ${
                    result.overallGranted
                      ? 'bg-emerald-950/30 border-emerald-500'
                      : 'bg-red-950/30 border-red-500'
                  }`}>
                    {result.overallGranted
                      ? <><CheckCircle size={28} className="text-emerald-400" /><span className="text-2xl font-black tracking-widest text-emerald-400">ACCESS GRANTED</span></>
                      : <><XCircle size={28} className="text-red-400" /><span className="text-2xl font-black tracking-widest text-red-400">ACCESS DENIED</span></>
                    }
                  </div>
                  {!result.overallGranted && (
                    <p className="text-[10px] text-slate-600 text-center mt-2">
                      {!result.permissionGranted ? 'Permission layer: no matching grant' : 'ABAC layer: policy check failed'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/reasoner`. Expected: input strip at top, click "Trace" — see 5 collapsible steps, each with PASS/FAIL status. Final verdict shows big GRANTED or DENIED banner. Try a suspended user on a restricted door.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Reasoner.tsx
git commit -m "feat(axon): Reasoner lens — 5-step access trace with collapsible steps"
```

---

## Task 12: Entity List Pages

**Files:**
- Modify: `src/pages/People.tsx`
- Modify: `src/pages/Groups.tsx`
- Modify: `src/pages/Grants.tsx`
- Modify: `src/pages/Schedules.tsx`
- Modify: `src/pages/Doors.tsx`
- Modify: `src/pages/Sites.tsx`

- [ ] **Step 1: Replace People.tsx**

Replace `src/pages/People.tsx`:
```tsx
import { useStore } from '../store/store'

const STATUS_CLASS = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
  inactive:  'bg-slate-700 text-slate-500 border border-slate-600',
}

const TYPE_CLASS = {
  employee:   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  contractor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  visitor:    'bg-slate-700 text-slate-400 border border-slate-600',
}

export default function People() {
  const users = useStore(s => s.users)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">People</h1>
        <span className="text-[10px] text-slate-600">{users.length} users</span>
      </div>

      <div className="grid gap-2">
        {users.map(user => (
          <div key={user.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-slate-100">{user.name}</div>
              <div className="text-[10px] text-slate-500">{user.role} · {user.department}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${TYPE_CLASS[user.type]}`}>{user.type}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${STATUS_CLASS[user.status]}`}>{user.status}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                L{user.clearanceLevel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace Groups.tsx**

Replace `src/pages/Groups.tsx`:
```tsx
import { useStore } from '../store/store'

export default function Groups() {
  const groups = useStore(s => s.groups)
  const grants = useStore(s => s.grants)
  const users  = useStore(s => s.users)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Groups</h1>
        <span className="text-[10px] text-slate-600">{groups.length} groups</span>
      </div>

      <div className="grid gap-3">
        {groups.map(group => {
          const subGroupNames = group.subGroups.map(id => groups.find(g => g.id === id)?.name ?? id)
          const grantNames    = group.inheritedPermissions.map(id => grants.find(g => g.id === id)?.name ?? id)
          const memberCount   = group.membershipType === 'static' ? group.members.length : null

          return (
            <div key={group.id} className="bg-[#0f1320] border border-[#1e2d4a] rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{group.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{group.description}</div>
                </div>
                <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                  group.membershipType === 'dynamic'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>{group.membershipType}</span>
              </div>

              {group.membershipType === 'dynamic' && group.membershipRules.length > 0 && (
                <div className="space-y-1">
                  {group.membershipRules.map(r => (
                    <div key={r.id} className="bg-[#111827] rounded px-2 py-1.5 text-[10px] font-mono text-slate-400">
                      <span className="text-indigo-400">{r.leftSide}</span>{' '}
                      <span className="text-slate-600">{r.operator}</span>{' '}
                      <span className="text-emerald-400">"{Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}"</span>
                    </div>
                  ))}
                </div>
              )}

              {memberCount !== null && memberCount > 0 && (
                <div className="text-[10px] text-slate-500">{memberCount} static members</div>
              )}

              {subGroupNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {subGroupNames.map(name => (
                    <span key={name} className="text-[9px] bg-[#080b12] border border-[#1e293b] text-slate-500 px-2 py-0.5 rounded">↳ {name}</span>
                  ))}
                </div>
              )}

              {grantNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {grantNames.map(name => (
                    <span key={name} className="text-[9px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-2 py-0.5 rounded">{name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace Grants.tsx**

Replace `src/pages/Grants.tsx`:
```tsx
import { useStore } from '../store/store'

const SCOPE_CLASS = {
  global: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  site:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  zone:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const MODE_CLASS = {
  assigned:    'bg-slate-700 text-slate-400 border-slate-600',
  conditional: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  auto:        'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export default function Grants() {
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const sites     = useStore(s => s.sites)
  const zones     = useStore(s => s.zones)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Grants</h1>
        <span className="text-[10px] text-slate-600">{grants.length} grants</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {grants.map(grant => {
          const schedule = grant.scheduleId ? schedules.find(s => s.id === grant.scheduleId) : null
          const targetName = grant.scope === 'site'
            ? sites.find(s => s.id === grant.targetId)?.name
            : grant.scope === 'zone'
              ? zones.find(z => z.id === grant.targetId)?.name
              : null

          return (
            <div key={grant.id} className="bg-[#0c0a1e] border border-[#2e1f6b] rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-bold text-violet-200">{grant.name}</div>
                <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${SCOPE_CLASS[grant.scope]}`}>
                  {grant.scope}
                </span>
              </div>
              {grant.description && (
                <div className="text-[10px] text-slate-500">{grant.description}</div>
              )}
              <div className="flex flex-wrap gap-1">
                {grant.actions.map(a => (
                  <span key={a} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-400 px-1.5 py-0.5 rounded">{a}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${MODE_CLASS[grant.applicationMode]}`}>
                  {grant.applicationMode}
                </span>
                {schedule && (
                  <span className="text-[9px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-1.5 py-0.5 rounded">{schedule.name}</span>
                )}
                {targetName && (
                  <span className="text-[9px] text-slate-500">→ {targetName}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Replace Schedules.tsx**

Replace `src/pages/Schedules.tsx`:
```tsx
import { useStore } from '../store/store'
import { buildNowContext } from '../engine/scheduleEngine'
import type { DayOfWeek } from '../types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Schedules() {
  const schedules = useStore(s => s.schedules)
  const grants    = useStore(s => s.grants)
  const now       = buildNowContext()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Schedules</h1>
        <span className="text-[10px] text-slate-600">{schedules.length} schedules</span>
      </div>

      <div className="grid gap-4">
        {schedules.map(schedule => {
          const usedBy = grants.filter(g => g.scheduleId === schedule.id)

          return (
            <div key={schedule.id} className="bg-[#07100e] border border-[#134e4a] rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-teal-200">{schedule.name}</div>
                  <div className="text-[10px] text-teal-900 mt-0.5">{schedule.timezone}</div>
                </div>
                {usedBy.length > 0 && (
                  <div className="text-[9px] text-teal-900">{usedBy.length} grant{usedBy.length !== 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Week grid */}
              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#134e4a] font-semibold mb-2">Time Windows</div>
                <div className="grid grid-cols-7 gap-px">
                  {DAYS.map(day => {
                    const active = schedule.windows.some(w => w.days.includes(day))
                    const isToday = day === now.dayOfWeek
                    return (
                      <div key={day}
                        className={`text-center py-1.5 rounded text-[9px] font-semibold ${
                          active
                            ? isToday ? 'bg-teal-500 text-teal-950' : 'bg-teal-500/20 text-teal-400'
                            : 'bg-[#0b0e18] text-[#134e4a]'
                        }`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
                {schedule.windows.map(w => (
                  <div key={w.id} className="text-[10px] text-teal-800 mt-1.5">
                    {w.days.join(', ')} · {w.startTime}–{w.endTime}
                  </div>
                ))}
              </div>

              {/* Holidays */}
              {schedule.holidays.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#134e4a] font-semibold mb-2">Holidays</div>
                  <div className="space-y-1.5">
                    {schedule.holidays.map(h => (
                      <div key={h.id} className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          h.behavior === 'deny_all' ? 'bg-red-500/10 text-red-400' :
                          h.behavior === 'allow_with_override' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {h.behavior === 'deny_all' ? 'DENY ALL' : h.behavior === 'allow_with_override' ? 'OVERRIDE' : 'NORMAL'}
                        </span>
                        <span className="text-[10px] text-slate-400">{h.name}</span>
                        <span className="text-[9px] text-slate-600">{h.month}/{h.day}</span>
                        {h.requiredClearance && (
                          <span className="text-[9px] text-amber-600">L{h.requiredClearance}+</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usedBy.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {usedBy.map(g => (
                    <span key={g.id} className="text-[9px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-1.5 py-0.5 rounded">{g.name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Replace Doors.tsx**

Replace `src/pages/Doors.tsx`:
```tsx
import { useStore } from '../store/store'

export default function Doors() {
  const doors = useStore(s => s.doors)
  const zones = useStore(s => s.zones)
  const sites = useStore(s => s.sites)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Doors</h1>
        <span className="text-[10px] text-slate-600">{doors.length} doors</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {doors.map(door => {
          const zone = zones.find(z => z.id === door.zoneId)
          const site = sites.find(s => s.id === door.siteId)
          const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'
          return (
            <div key={door.id} className={`bg-[#0a0d14] border rounded-lg px-4 py-3 flex items-center gap-3 ${isRestricted ? 'border-red-900/40' : 'border-[#1e293b]'}`}>
              <span className="text-[18px] shrink-0">🚪</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-semibold ${isRestricted ? 'text-red-300' : 'text-slate-200'}`}>{door.name}</div>
                <div className="text-[10px] text-slate-600">{site?.name} {zone ? `· ${zone.name} (${zone.type})` : ''}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Replace Sites.tsx**

Replace `src/pages/Sites.tsx`:
```tsx
import { useStore } from '../store/store'

const SITE_STATUS_CLASS = {
  Disarmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Armed:      'bg-red-500/10 text-red-400 border-red-500/20',
  PartialArm: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Alarm:      'bg-red-600/20 text-red-300 border-red-600/30',
  Lockdown:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export default function Sites() {
  const sites = useStore(s => s.sites)
  const zones = useStore(s => s.zones)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Sites & Zones</h1>
      <div className="space-y-4">
        {sites.map(site => {
          const siteZones = zones.filter(z => z.siteId === site.id)
          return (
            <div key={site.id} className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{site.name}</div>
                  <div className="text-[10px] text-slate-500">{site.address}</div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${SITE_STATUS_CLASS[site.status]}`}>
                  {site.status}
                </span>
              </div>
              {siteZones.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {siteZones.map(zone => (
                    <div key={zone.id} className="bg-[#080b10] border border-[#141828] rounded-lg px-3 py-2 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium text-slate-300">{zone.name}</div>
                        <div className="text-[9px] text-slate-600">{zone.type}</div>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${
                        zone.status === 'Armed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        zone.status === 'Alarm'  ? 'bg-red-600/20 text-red-300 border-red-600/30' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>{zone.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Verify all pages load**

Navigate to each page in turn. Expected: no crashes, each page renders its entity list with correct styling.

- [ ] **Step 8: Commit**

```bash
git add src/pages/
git commit -m "feat(axon): entity list pages — People, Groups, Grants, Schedules, Doors, Sites"
```

---

## Task 13: Intrusion Page

**Files:**
- Modify: `src/pages/Intrusion.tsx`

- [ ] **Step 1: Replace Intrusion.tsx**

Replace `src/pages/Intrusion.tsx`:
```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../store/store'
import { hasPermission } from '../engine/accessEngine'
import { buildNowContext } from '../engine/scheduleEngine'
import type { SiteStatus, ZoneType, ZoneStatus } from '../types'

const SITE_STATUS_BADGE: Record<SiteStatus, string> = {
  Disarmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Armed:      'bg-red-500/10 text-red-400 border-red-500/20',
  PartialArm: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Alarm:      'bg-red-600/20 text-red-300 border-red-600/30',
  Lockdown:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const ZONE_STATUS_BADGE: Record<ZoneStatus, string> = {
  Armed:    'bg-red-500/10 text-red-400 border-red-500/20',
  Disarmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Alarm:    'bg-red-600/20 text-red-300 border-red-600/30',
}

export default function Intrusion() {
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const users       = useStore(s => s.users)
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const schedules   = useStore(s => s.schedules)
  const armingLog   = useStore(s => s.armingLog)
  const updateSite  = useStore(s => s.updateSite)
  const updateZone  = useStore(s => s.updateZone)
  const addArmingLog = useStore(s => s.addArmingLog)

  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? '')

  const selectedSite = sites.find(s => s.id === selectedSiteId) ?? null
  const siteZones    = zones.filter(z => z.siteId === selectedSiteId)
  const now          = buildNowContext()

  // Acting user = first active user with arm permission (for demo)
  const actingUser = users.find(u =>
    u.status === 'active' &&
    hasPermission(u, groups, grants, 'arm', now, schedules, selectedSiteId)
  ) ?? users.find(u => u.status === 'active') ?? users[0]

  const authorizedUsers = users.filter(u =>
    u.status === 'active' &&
    hasPermission(u, groups, grants, 'arm', now, schedules, selectedSiteId)
  )

  function log(action: string, result: 'Success' | 'Denied') {
    if (!actingUser || !selectedSite) return
    addArmingLog({
      id: uuidv4(), timestamp: new Date().toISOString(),
      userName: actingUser.name, action, siteName: selectedSite.name, result,
    })
  }

  function arm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Armed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Armed' }))
    log('Armed', 'Success')
  }

  function disarm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Disarmed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Disarmed' }))
    log('Disarmed', 'Success')
  }

  function partialArm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'PartialArm' })
    const perimeterTypes: ZoneType[] = ['Perimeter']
    const interiorTypes: ZoneType[]  = ['Interior', 'Public']
    siteZones.forEach(z => {
      if (perimeterTypes.includes(z.type)) updateZone({ ...z, status: 'Armed' })
      else if (interiorTypes.includes(z.type)) updateZone({ ...z, status: 'Disarmed' })
    })
    log('Partial Arm', 'Success')
  }

  function lockdown() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Lockdown' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Armed' }))
    log('Lockdown', 'Success')
  }

  function clearAlarm() {
    if (!selectedSite) return
    updateSite({ ...selectedSite, status: 'Disarmed' })
    siteZones.forEach(z => updateZone({ ...z, status: 'Disarmed' }))
    log('Clear Alarm', 'Success')
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h1 className="text-xl font-bold text-slate-100">Intrusion Control</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: site + zones + authorized users */}
        <div className="lg:col-span-2 space-y-4">
          {/* Site selector */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <label className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Site</label>
            <select
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSite && (
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${SITE_STATUS_BADGE[selectedSite.status]}`}>
                  {selectedSite.status}
                </span>
                <span className="text-[10px] text-slate-500">{selectedSite.address}</span>
              </div>
            )}
          </div>

          {/* Zone statuses */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Zone Statuses</div>
            {siteZones.length === 0
              ? <p className="text-[11px] text-slate-600">No zones found for this site.</p>
              : (
                <div className="divide-y divide-[#141828]">
                  {siteZones.map(zone => (
                    <div key={zone.id} className="py-2.5 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-[11px] font-medium text-slate-300">{zone.name}</div>
                        <div className="text-[9px] text-slate-600">{zone.type}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${ZONE_STATUS_BADGE[zone.status]}`}>
                        {zone.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Authorized users */}
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3">
              Arm/Disarm Permission — {authorizedUsers.length} users
            </div>
            {authorizedUsers.length === 0
              ? <p className="text-[11px] text-slate-600">No users have arm permission for this site right now.</p>
              : (
                <div className="space-y-2">
                  {authorizedUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 text-[11px]">
                      <div className="w-6 h-6 rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[9px] font-bold text-slate-400">
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-slate-300">{u.name}</span>
                      <span className="text-slate-600 text-[9px]">{u.department}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Right: actions + log */}
        <div className="space-y-4">
          <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">Actions</div>
            {[
              { label: 'Arm Site',         fn: arm,       cls: 'bg-red-700 hover:bg-red-600' },
              { label: 'Disarm Site',      fn: disarm,    cls: 'bg-emerald-700 hover:bg-emerald-600' },
              { label: 'Partial Arm',      fn: partialArm,cls: 'bg-amber-600 hover:bg-amber-500' },
              { label: 'Trigger Lockdown', fn: lockdown,  cls: 'bg-purple-700 hover:bg-purple-600' },
              { label: 'Clear Alarm',      fn: clearAlarm,cls: 'bg-blue-700 hover:bg-blue-600' },
            ].map(({ label, fn, cls }) => (
              <button
                key={label}
                onClick={fn}
                disabled={!selectedSite}
                className={`w-full py-2.5 rounded-lg text-white text-[12px] font-semibold transition-colors disabled:bg-[#1e293b] disabled:text-slate-600 disabled:cursor-not-allowed ${cls}`}
              >
                {label}
              </button>
            ))}
            {actingUser && (
              <p className="text-[9px] text-slate-600 pt-1">Acting as: {actingUser.name}</p>
            )}
          </div>

          {/* Arming log */}
          {armingLog.length > 0 && (
            <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2">Log</div>
              <div className="space-y-1.5">
                {armingLog.slice(0, 8).map(entry => (
                  <div key={entry.id} className="text-[9px] text-slate-600 font-mono">
                    <span className="text-slate-500">{entry.userName}</span>
                    {' '}→ <span className="text-slate-400">{entry.action}</span>
                    {' · '}{entry.siteName}
                    {' · '}<span className={entry.result === 'Success' ? 'text-emerald-600' : 'text-red-600'}>{entry.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/intrusion`. Expected: site selector, zone status table, authorized users list, action buttons. Click "Arm Site" — zone statuses flip to Armed, entry appears in log. Click "Disarm" — all zones return to Disarmed.

- [ ] **Step 3: Run all tests one final time**

```bash
npx vitest run
```

Expected: all engine tests PASS with no new failures.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Intrusion.tsx
git commit -m "feat(axon): Intrusion page — live arm/disarm with permission check and log"
```

---

## Task 14: Final Polish + Verification

**Files:**
- No new files — visual verification + tag

- [ ] **Step 1: Full navigation check**

Visit each route in order and confirm no white screens:
- `/canvas` — graph visible, nodes draggable, click to select, detail panel opens
- `/oracle` — both query modes work, holiday toggle changes results
- `/reasoner` — trace runs, 5 steps expand/collapse, verdict shows
- `/people` — all 12 users listed
- `/groups` — all 5 groups listed with membership rules and subgroups
- `/grants` — all 6 grants listed with mode + schedule badges
- `/schedules` — all 3 schedules with week grid and holiday list
- `/doors` — all 10 doors, restricted zones red-tinted
- `/sites` — all 3 sites with zone breakdown
- `/intrusion` — site selector, arm/disarm buttons, log appends

- [ ] **Step 2: Spot-check Oracle**

In Oracle, set mode to "Who can access?", select "Server Room A", action "unlock", enable "Simulate holiday".

Expected: James Park (clearance L2) is DENIED because ANZAC Day holiday override requires L3. Sarah Chen (L3) is GRANTED via Holiday Override.

- [ ] **Step 3: Spot-check Reasoner**

Select David Foster (suspended) + any door. Click Trace.

Expected: Step 4 (Policy Check) shows `user.status == active → suspended → FAIL`. Final verdict: ACCESS DENIED.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(axon): Plan 1 complete — Foundation + Three Lenses + Entity Pages + Intrusion"
```

---

## What's Next (Plan 2)

Plan 2 covers full CRUD editing for all entities:
- Group editor with drag-and-drop subgroup assignment and dynamic rule builder
- Grant editor with condition builder, schedule picker, scope selector
- Schedule editor with holiday builder (add/remove holidays, set behavior + override grants)
- People editor with clearance, type, department, status
- Door/Site/Zone editors
- CommandPalette (⌘K) quick query overlay from anywhere
