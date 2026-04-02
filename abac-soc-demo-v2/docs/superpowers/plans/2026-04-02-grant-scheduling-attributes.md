# Grant Scheduling & Attribute Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add application modes (assigned/conditional/auto), time scheduling, and custom attributes to grants, exposing `now.*` and `grant.*` as rule attributes throughout the ABAC engine.

**Architecture:** Grants gain five new fields; `EvalContext` gains `now: NowContext` and `grant?: Grant`; `getEffectiveGrantIds` is rewritten to handle auto-scanning and condition/schedule filtering; the `Permissions` page gets three new form sections using existing `RuleBuilder` and `AttributeEditor` components plus a new `ScheduleEditor`.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS v4, Vite — no new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `NowContext`, `Schedule`, `GrantResult`; update `Grant`, `EvalContext`, `StoreSnapshot`, `AccessResult` |
| `src/engine/accessEngine.ts` | Modify | Add `buildNowContext`, `isScheduleActive`; extend `resolveAttribute`; rewrite `getEffectiveGrantIds`; update `evaluateAccess` |
| `src/components/ScheduleEditor.tsx` | Create | Day-of-week toggles, time range, date range, timezone picker |
| `src/components/RuleBuilder.tsx` | Modify | Add `now.*` and `grant.*` to left-side hints |
| `src/pages/Permissions.tsx` | Modify | Mode selector, conditions RuleBuilder, ScheduleEditor, AttributeEditor, updated grant cards |
| `src/pages/TestAccess.tsx` | Modify | Pass `allGrants` in snapshot; add grant trace panel and Now context box |
| `src/pages/AccessMatrix.tsx` | Modify | Pass `allGrants` in snapshot |
| `src/pages/Arming.tsx` | Modify | Pass `allGrants` in snapshot |
| `src/store/store.ts` | Modify | Bump storage key to `soc-demo-store-v3` |
| `src/data/testData.ts` | Modify | Migrate existing grants; add 3 demo grants |

---

## Task 1: Update types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Read the current types file**

```bash
# Confirm current Grant interface ends at line 51
```

- [ ] **Step 2: Add NowContext, Schedule, GrantResult interfaces and update Grant, EvalContext, StoreSnapshot, AccessResult**

Replace the entire `src/types/index.ts` with the content below. All existing interfaces are preserved; only `Grant`, `StoreSnapshot`, and `AccessResult` gain new fields, and four new interfaces are added.

```ts
export type ClearanceLevel = 'Unclassified' | 'Confidential' | 'Secret' | 'TopSecret';
export const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  Unclassified: 0, Confidential: 1, Secret: 2, TopSecret: 3,
};

export type UserStatus = 'Active' | 'Suspended' | 'Pending';

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  clearanceLevel: ClearanceLevel;
  status: UserStatus;
  grantedPermissions: string[];
  customAttributes: Record<string, string>;
}

export interface GroupMember {
  entityType: 'user' | 'door' | 'zone' | 'site' | 'controller';
  entityId: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  membershipRules: Rule[];
  membershipLogic: 'AND' | 'OR';
  membershipType: 'explicit' | 'dynamic' | 'hybrid';
  targetEntityType: 'user' | 'door' | 'zone' | 'site' | 'controller' | 'any';
  inheritedPermissions: string[];
}

export type GrantScope = 'global' | 'site' | 'zone';
export type ActionType =
  | 'arm' | 'disarm' | 'unlock' | 'lockdown'
  | 'view_logs' | 'manage_users' | 'manage_tasks' | 'override';

export interface Schedule {
  daysOfWeek: number[];   // [0..6]; 0=Sun,1=Mon,…,6=Sat; empty = all days
  startTime: string;      // 'HH:MM' 24h
  endTime: string;        // 'HH:MM' 24h
  validFrom?: string;     // 'YYYY-MM-DD' optional
  validUntil?: string;    // 'YYYY-MM-DD' optional
  timezone: string;       // IANA e.g. 'Australia/Sydney'
}

export interface Grant {
  id: string;
  name: string;
  description: string;
  scope: GrantScope;
  targetId?: string;
  actions: ActionType[];
  applicationMode: 'assigned' | 'conditional' | 'auto';
  conditions: Rule[];
  conditionLogic: 'AND' | 'OR';
  customAttributes: Record<string, string>;
  schedule: Schedule | null;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  status: string;
  timezone: string;
  customAttributes: Record<string, string>;
}

export type ZoneType = 'Perimeter' | 'Interior' | 'Secure' | 'Public' | 'Emergency';
export type ZoneStatus = 'Armed' | 'Disarmed' | 'Alarm';

export interface Zone {
  id: string;
  name: string;
  siteId: string;
  type: ZoneType;
  status: ZoneStatus;
  customAttributes: Record<string, string>;
}

export type LockState = 'Locked' | 'Unlocked' | 'Forced' | 'Held';

export interface Door {
  id: string;
  name: string;
  siteId: string;
  zoneId: string;
  controllerId: string;
  location: string;
  lockState: LockState;
  description: string;
  customAttributes: Record<string, string>;
}

export interface Controller {
  id: string;
  name: string;
  siteId: string;
  location: string;
  customAttributes: Record<string, string>;
}

export type Operator = '==' | '!=' | '>=' | '<=' | 'IN' | 'NOT IN';

export interface Rule {
  id: string;
  leftSide: string;
  operator: Operator;
  rightSide: string | string[];
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  logicalOperator: 'AND' | 'OR';
  doorIds: string[];
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Open' | 'InProgress' | 'Blocked' | 'Complete' | 'Cancelled';
export type TaskCategory = 'Inspection' | 'Maintenance' | 'Incident' | 'Audit' | 'Training' | 'Other';

export interface TaskNote {
  id: string;
  content: string;
  authorId: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  assignedTo?: string;
  siteId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  notes: TaskNote[];
}

export interface RuleResult {
  ruleId: string;
  leftSide: string;
  operator: Operator;
  rightSide: string | string[];
  leftResolved: string;
  rightResolved: string;
  passed: boolean;
}

export interface PolicyResult {
  policyId: string;
  policyName: string;
  passed: boolean;
  ruleResults: RuleResult[];
}

export interface NowContext {
  hour: number;          // 0–23
  minute: number;        // 0–59
  dayOfWeek: string;     // 'Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'
  dayOfWeekNum: number;  // 0=Sun … 6=Sat
  date: string;          // 'YYYY-MM-DD'
  month: number;         // 1–12
}

export interface GrantResult {
  grantId: string;
  grantName: string;
  applicationMode: Grant['applicationMode'];
  scheduleActive: boolean | null;    // null if no schedule
  conditionsPassed: boolean | null;  // null if assigned with no conditions
  conditionResults: RuleResult[];
  included: boolean;
}

export interface AccessResult {
  permissionGranted: boolean;
  abacGranted: boolean;
  overallGranted: boolean;
  matchedPolicy?: string;
  matchedGrants: string[];
  policyResults: PolicyResult[];
  grantResults: GrantResult[];
  nowContext: NowContext;
}

export interface ArmingLog {
  id: string;
  siteId: string;
  action: string;
  userId: string;
  timestamp: string;
  note?: string;
}

export interface StoreSnapshot {
  allUsers: User[];
  allDoors: Door[];
  allZones: Zone[];
  allSites: Site[];
  allControllers: Controller[];
  allGroups: Group[];
  allGrants: Grant[];
}
```

- [ ] **Step 3: Verify TypeScript sees only the expected errors (types file itself should be error-free)**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "types/index.ts"
```

Expected: zero errors in `types/index.ts`. Errors in other files are expected at this stage.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/types/index.ts && git commit -m "feat(types): add NowContext, Schedule, GrantResult; extend Grant/EvalContext/StoreSnapshot/AccessResult"
```

---

## Task 2: Engine core — buildNowContext, isScheduleActive, resolveAttribute extensions

**Files:**
- Modify: `src/engine/accessEngine.ts`

- [ ] **Step 1: Read the current engine file to confirm line numbers**

Check that `EvalContext` is at lines 10–18, `resolveAttribute` starts at line 38, and the builtin sets are at lines 21–27.

- [ ] **Step 2: Update EvalContext, add NOW_BUILTINS + GRANT_BUILTINS, add buildNowContext and isScheduleActive**

Replace the top section of `accessEngine.ts` (lines 1–68) with:

```ts
import { CLEARANCE_RANK } from '../types';
import type {
  User, Group, Grant, Door, Zone, Site, Controller,
  Policy, ActionType, AccessResult, PolicyResult, RuleResult,
  Rule, Operator, StoreSnapshot, GroupMember, NowContext, GrantResult,
} from '../types';

// ── Context ──────────────────────────────────────────────────────────────────

export interface EvalContext {
  user: User;
  door?: Door;
  zone?: Zone;
  site?: Site;
  controller?: Controller;
  grant?: Grant;
  now: NowContext;
  store: StoreSnapshot;
  _visitedGroups?: Set<string>;
}

// ── Now context ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function buildNowContext(): NowContext {
  const d = new Date();
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
    dayOfWeek: DAY_NAMES[d.getDay()],
    dayOfWeekNum: d.getDay(),
    date: d.toISOString().slice(0, 10),
    month: d.getMonth() + 1,
  };
}

// ── Schedule evaluation ───────────────────────────────────────────────────────

export function isScheduleActive(schedule: import('../types').Schedule): boolean {
  const now = new Date();
  // Convert to schedule timezone using toLocaleString (widely supported)
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone }));
  const h = tzDate.getHours();
  const m = tzDate.getMinutes();
  const dayNum = tzDate.getDay();
  const localTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const localDate = `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(2, '0')}-${String(tzDate.getDate()).padStart(2, '0')}`;

  if (schedule.daysOfWeek.length > 0 && !schedule.daysOfWeek.includes(dayNum)) return false;
  if (localTime < schedule.startTime) return false;
  if (localTime > schedule.endTime) return false;
  if (schedule.validFrom && localDate < schedule.validFrom) return false;
  if (schedule.validUntil && localDate > schedule.validUntil) return false;
  return true;
}

// ── Attribute resolution ──────────────────────────────────────────────────────

const USER_BUILTINS = new Set(['name','email','department','role','clearanceLevel','status']);
const DOOR_BUILTINS = new Set(['name','location','lockState','description']);
const ZONE_BUILTINS = new Set(['name','type','status']);
const SITE_BUILTINS = new Set(['name','address','status','timezone']);
const CTRL_BUILTINS = new Set(['name','location']);
const GROUP_BUILTINS = new Set(['name','targetEntityType','membershipType']);
const NOW_BUILTINS  = new Set(['hour','minute','dayOfWeek','dayOfWeekNum','date','month']);
const GRANT_BUILTINS = new Set(['name','scope','applicationMode']);

function getBuiltinOrCustom(entity: Record<string, unknown>, builtins: Set<string>, key: string): string {
  if (builtins.has(key)) {
    const v = entity[key];
    return v == null ? '' : String(v);
  }
  const custom = entity['customAttributes'] as Record<string, string> | undefined;
  return custom?.[key] ?? '';
}

export function resolveAttribute(ref: string, ctx: EvalContext): string {
  const dot = ref.indexOf('.');
  if (dot === -1) {
    return getBuiltinOrCustom(ctx.user as unknown as Record<string, unknown>, USER_BUILTINS, ref);
  }
  const entityKey = ref.slice(0, dot).toLowerCase();
  const attrKey = ref.slice(dot + 1);

  switch (entityKey) {
    case 'user':
      return getBuiltinOrCustom(ctx.user as unknown as Record<string, unknown>, USER_BUILTINS, attrKey);
    case 'door':
      return ctx.door ? getBuiltinOrCustom(ctx.door as unknown as Record<string, unknown>, DOOR_BUILTINS, attrKey) : '';
    case 'zone':
      return ctx.zone ? getBuiltinOrCustom(ctx.zone as unknown as Record<string, unknown>, ZONE_BUILTINS, attrKey) : '';
    case 'site':
      return ctx.site ? getBuiltinOrCustom(ctx.site as unknown as Record<string, unknown>, SITE_BUILTINS, attrKey) : '';
    case 'controller':
      return ctx.controller ? getBuiltinOrCustom(ctx.controller as unknown as Record<string, unknown>, CTRL_BUILTINS, attrKey) : '';
    case 'now':
      return getBuiltinOrCustom(ctx.now as unknown as Record<string, unknown>, NOW_BUILTINS, attrKey);
    case 'grant':
      return ctx.grant ? getBuiltinOrCustom(ctx.grant as unknown as Record<string, unknown>, GRANT_BUILTINS, attrKey) : '';
    case 'group': {
      const userGroup = ctx.store.allGroups.find(g =>
        g.members.some(m => m.entityType === 'user' && m.entityId === ctx.user.id)
      );
      return userGroup ? getBuiltinOrCustom(userGroup as unknown as Record<string, unknown>, GROUP_BUILTINS, attrKey) : '';
    }
    default:
      return '';
  }
}
```

- [ ] **Step 3: Verify no new TypeScript errors in the engine file**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "accessEngine.ts"
```

Expected: zero errors in `accessEngine.ts`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/engine/accessEngine.ts && git commit -m "feat(engine): add buildNowContext, isScheduleActive, extend resolveAttribute for now.* and grant.*"
```

---

## Task 3: Engine grants — rewrite getEffectiveGrantIds + evaluateAccess

**Files:**
- Modify: `src/engine/accessEngine.ts`

- [ ] **Step 1: Replace getEffectiveGrantIds and update evaluateAccess**

Find the `getEffectiveGrantIds` function (currently lines ~251–262) and the `hasPermission`, `getMatchedGrantNames`, and `evaluateAccess` functions. Replace everything from `getEffectiveGrantIds` to the end of the file with:

```ts
// ── Permission (RBAC) layer ───────────────────────────────────────────────────

function evaluateGrantConditions(grant: Grant, ctx: EvalContext): {
  conditionsPassed: boolean | null;
  conditionResults: RuleResult[];
} {
  if (grant.conditions.length === 0) {
    return { conditionsPassed: null, conditionResults: [] };
  }
  const grantCtx: EvalContext = { ...ctx, grant };
  const conditionResults = grant.conditions.map(r => evaluateRule(r, grantCtx));
  const conditionsPassed =
    grant.conditionLogic === 'AND'
      ? conditionResults.every(r => r.passed)
      : conditionResults.some(r => r.passed);
  return { conditionsPassed, conditionResults };
}

function buildGrantResults(
  candidateIds: Set<string>,
  allGrants: Grant[],
  ctx: EvalContext,
): { effectiveIds: Set<string>; grantResults: GrantResult[] } {
  const grantResults: GrantResult[] = [];
  const effectiveIds = new Set<string>();

  for (const grantId of candidateIds) {
    const grant = allGrants.find(g => g.id === grantId);
    if (!grant) continue;

    const scheduleActive = grant.schedule ? isScheduleActive(grant.schedule) : null;
    const { conditionsPassed, conditionResults } = evaluateGrantConditions(grant, ctx);

    // Conditional grants require conditions to pass
    let included = true;
    if (grant.applicationMode === 'conditional' && conditionsPassed === false) included = false;
    // Schedule must be active if set
    if (scheduleActive === false) included = false;

    grantResults.push({
      grantId: grant.id,
      grantName: grant.name,
      applicationMode: grant.applicationMode,
      scheduleActive,
      conditionsPassed,
      conditionResults,
      included,
    });

    if (included) effectiveIds.add(grantId);
  }

  return { effectiveIds, grantResults };
}

function collectCandidateGrantIds(user: User, groups: Group[], ctx: EvalContext): Set<string> {
  const ids = new Set<string>(user.grantedPermissions);

  // Inherited from groups
  for (const group of groups) {
    if (group.inheritedPermissions.length === 0) continue;
    if (isEntityInGroup(user.id, 'user', group, ctx)) {
      for (const gid of group.inheritedPermissions) ids.add(gid);
    }
  }

  // Auto grants — scan all grants whose conditions match
  for (const grant of ctx.store.allGrants) {
    if (grant.applicationMode === 'auto' && grant.conditions.length > 0) {
      const grantCtx: EvalContext = { ...ctx, grant };
      if (evaluateRuleSet(grant.conditions, grant.conditionLogic, grantCtx)) {
        ids.add(grant.id);
      }
    }
  }

  return ids;
}

export function hasPermission(
  user: User,
  groups: Group[],
  grants: Grant[],
  action: ActionType,
  ctx: EvalContext,
  siteId?: string,
  zoneId?: string,
): boolean {
  const candidateIds = collectCandidateGrantIds(user, groups, ctx);
  const { effectiveIds } = buildGrantResults(candidateIds, ctx.store.allGrants, ctx);
  for (const grantId of effectiveIds) {
    const grant = grants.find(g => g.id === grantId);
    if (!grant || !grant.actions.includes(action)) continue;
    if (grant.scope === 'global') return true;
    if (grant.scope === 'site' && siteId && grant.targetId === siteId) return true;
    if (grant.scope === 'zone' && zoneId && grant.targetId === zoneId) return true;
  }
  return false;
}

// ── Main evaluateAccess ───────────────────────────────────────────────────────

export function evaluateAccess(
  user: User,
  door: Door,
  policies: Policy[],
  groups: Group[],
  grants: Grant[],
  store: StoreSnapshot,
): AccessResult {
  const now = buildNowContext();
  const zone = store.allZones.find(z => z.id === door.zoneId);
  const site = store.allSites.find(s => s.id === door.siteId);
  const controller = store.allControllers.find(c => c.id === door.controllerId);

  const ctx: EvalContext = { user, door, zone, site, controller, now, store };

  const candidateIds = collectCandidateGrantIds(user, groups, ctx);
  const { effectiveIds, grantResults } = buildGrantResults(candidateIds, store.allGrants, ctx);

  // Determine permission from effective grants
  let permissionGranted = false;
  const matchedGrants: string[] = [];
  for (const grantId of effectiveIds) {
    const grant = grants.find(g => g.id === grantId);
    if (!grant || !grant.actions.includes('unlock')) continue;
    const scopeMatch =
      grant.scope === 'global' ||
      (grant.scope === 'site' && grant.targetId === door.siteId) ||
      (grant.scope === 'zone' && grant.targetId === door.zoneId);
    if (scopeMatch) {
      permissionGranted = true;
      matchedGrants.push(grant.name);
    }
  }

  const assignedPolicies = policies.filter(p => p.doorIds.includes(door.id));
  const policyResults: PolicyResult[] = assignedPolicies.map(policy => {
    const ruleResults = policy.rules.map(rule => evaluateRule(rule, ctx));
    const passed =
      policy.rules.length === 0
        ? false
        : policy.logicalOperator === 'AND'
          ? ruleResults.every(r => r.passed)
          : ruleResults.some(r => r.passed);
    return { policyId: policy.id, policyName: policy.name, passed, ruleResults };
  });

  const abacGranted = assignedPolicies.length === 0 ? true : policyResults.some(p => p.passed);
  const matchedPolicy = policyResults.find(p => p.passed)?.policyName;

  return {
    permissionGranted,
    abacGranted,
    overallGranted: permissionGranted && abacGranted,
    matchedPolicy,
    matchedGrants,
    policyResults,
    grantResults,
    nowContext: now,
  };
}
```

- [ ] **Step 2: Verify zero errors in the engine file**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "accessEngine.ts"
```

Expected: zero errors in `accessEngine.ts`.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/engine/accessEngine.ts && git commit -m "feat(engine): rewrite getEffectiveGrantIds for auto/conditional/schedule grant modes"
```

---

## Task 4: Migrate test data + bump store key

**Files:**
- Modify: `src/data/testData.ts`
- Modify: `src/store/store.ts`

- [ ] **Step 1: Bump storage key in store.ts**

In `src/store/store.ts` line 140, change:
```ts
name: 'soc-demo-store-v2',
```
to:
```ts
name: 'soc-demo-store-v3',
```

- [ ] **Step 2: Migrate all existing grants in testData.ts**

Read `src/data/testData.ts`. Find the eight grant definitions (`g1`–`g8`). Add the five new fields to each:

```ts
// Add to every existing grant object:
applicationMode: 'assigned' as const,
conditions: [],
conditionLogic: 'AND' as const,
customAttributes: {},
schedule: null,
```

Example — `g1` becomes:
```ts
const g1: Grant = {
  id: uuidv4(),
  name: 'Global Admin',
  description: 'Full access to all actions',
  scope: 'global',
  actions: ['arm','disarm','unlock','lockdown','view_logs','manage_users','manage_tasks','override'],
  applicationMode: 'assigned',
  conditions: [],
  conditionLogic: 'AND',
  customAttributes: {},
  schedule: null,
};
```

Apply the same pattern to g2–g8.

- [ ] **Step 3: Add three demo grants**

After the `g8` declaration, add:

```ts
const gDayShift: Grant = {
  id: 'grant-day-shift',
  name: 'Day Shift Access',
  description: 'Unlock access restricted to business hours Mon–Fri',
  scope: 'global',
  actions: ['unlock'],
  applicationMode: 'assigned',
  conditions: [],
  conditionLogic: 'AND',
  customAttributes: { tier: 'standard' },
  schedule: {
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '18:00',
    timezone: 'Australia/Sydney',
  },
};

const gAdminAuto: Grant = {
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
};

const gHighSec: Grant = {
  id: 'grant-high-sec',
  name: 'High Security Access',
  description: 'Assigned grant that only counts for Secret-cleared users',
  scope: 'global',
  actions: ['unlock', 'override'],
  applicationMode: 'conditional',
  conditions: [{ id: 'c-hs-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'Secret' }],
  conditionLogic: 'AND',
  customAttributes: { tier: 'secure' },
  schedule: null,
};
```

- [ ] **Step 4: Update grants array and assign new grants**

Replace:
```ts
const grants: Grant[] = [g1, g2, g3, g4, g5, g6, g7, g8];
```
with:
```ts
const grants: Grant[] = [g1, g2, g3, g4, g5, g6, g7, g8, gDayShift, gAdminAuto, gHighSec];
```

Then find where user permissions are assigned (the `users.forEach` or explicit `grantedPermissions` block). Add `gDayShift.id` to at least two users and `gHighSec.id` to the user(s) with `clearanceLevel: 'Secret'` or higher.

Example — inside the user assignment block:
```ts
// Give day shift access to a couple of users
users[0].grantedPermissions.push(gDayShift.id);
users[1].grantedPermissions.push(gDayShift.id);
// Give conditional high-sec grant to users with Secret+ clearance
users.filter(u => ['Secret','TopSecret'].includes(u.clearanceLevel))
     .forEach(u => u.grantedPermissions.push(gHighSec.id));
```

- [ ] **Step 5: Verify zero TypeScript errors in testData.ts**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "testData.ts"
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/data/testData.ts src/store/store.ts && git commit -m "feat(data): migrate grants to new schema, add 3 demo grants, bump store to v3"
```

---

## Task 5: Create ScheduleEditor component

**Files:**
- Create: `src/components/ScheduleEditor.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/ScheduleEditor.tsx
import { useState, useEffect } from 'react';
import type { Schedule } from '../types';
import { useStore } from '../store/store';

interface ScheduleEditorProps {
  schedule: Schedule | null;
  onChange: (schedule: Schedule | null) => void;
}

const DAY_LABELS: { num: number; label: string; short: string }[] = [
  { num: 1, label: 'Monday', short: 'Mon' },
  { num: 2, label: 'Tuesday', short: 'Tue' },
  { num: 3, label: 'Wednesday', short: 'Wed' },
  { num: 4, label: 'Thursday', short: 'Thu' },
  { num: 5, label: 'Friday', short: 'Fri' },
  { num: 6, label: 'Saturday', short: 'Sat' },
  { num: 0, label: 'Sunday', short: 'Sun' },
];

const DEFAULT_SCHEDULE: Schedule = {
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '08:00',
  endTime: '18:00',
  timezone: 'Australia/Sydney',
};

export default function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const sites = useStore(s => s.sites);
  const defaultTz = sites[0]?.timezone ?? 'UTC';

  const [enabled, setEnabled] = useState(schedule !== null);
  const [local, setLocal] = useState<Schedule>(schedule ?? { ...DEFAULT_SCHEDULE, timezone: defaultTz });
  const [showDateRange, setShowDateRange] = useState(
    !!(schedule?.validFrom || schedule?.validUntil)
  );

  useEffect(() => {
    setEnabled(schedule !== null);
    if (schedule) setLocal(schedule);
    setShowDateRange(!!(schedule?.validFrom || schedule?.validUntil));
  }, [schedule]);

  function handleToggle(on: boolean) {
    setEnabled(on);
    onChange(on ? local : null);
  }

  function update(patch: Partial<Schedule>) {
    const next = { ...local, ...patch };
    setLocal(next);
    if (enabled) onChange(next);
  }

  function toggleDay(dayNum: number) {
    const next = local.daysOfWeek.includes(dayNum)
      ? local.daysOfWeek.filter(d => d !== dayNum)
      : [...local.daysOfWeek, dayNum].sort((a, b) => a - b);
    update({ daysOfWeek: next });
  }

  return (
    <div className="space-y-3">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <button
          type="button"
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-slate-300">Restrict to time window</span>
      </label>

      {enabled && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
          {/* Day of week */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Days</p>
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map(({ num, short }) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => toggleDay(num)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    local.daysOfWeek.includes(num)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {short}
                </button>
              ))}
              {local.daysOfWeek.length === 0 && (
                <span className="text-xs text-slate-500 italic">All days</span>
              )}
            </div>
          </div>

          {/* Time range */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Time Range</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={local.startTime}
                onChange={e => update({ startTime: e.target.value })}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-500 text-sm">to</span>
              <input
                type="time"
                value={local.endTime}
                onChange={e => update({ endTime: e.target.value })}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Timezone</p>
            <input
              type="text"
              value={local.timezone}
              onChange={e => update({ timezone: e.target.value })}
              placeholder="e.g. Australia/Sydney"
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date range */}
          {!showDateRange ? (
            <button
              type="button"
              onClick={() => setShowDateRange(true)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add date range (optional)
            </button>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Date Range</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDateRange(false);
                    update({ validFrom: undefined, validUntil: undefined });
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={local.validFrom ?? ''}
                  onChange={e => update({ validFrom: e.target.value || undefined })}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="date"
                  value={local.validUntil ?? ''}
                  onChange={e => update({ validUntil: e.target.value || undefined })}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "ScheduleEditor.tsx"
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/components/ScheduleEditor.tsx && git commit -m "feat: add ScheduleEditor component with day toggles, time range, timezone, date range"
```

---

## Task 6: Update RuleBuilder hints

**Files:**
- Modify: `src/components/RuleBuilder.tsx`

- [ ] **Step 1: Add now.* and grant.* entries to LEFT_SIDE_SUGGESTIONS**

Find `LEFT_SIDE_SUGGESTIONS` (currently lines 10–24). Replace it with:

```ts
const LEFT_SIDE_SUGGESTIONS = [
  'user.clearanceLevel',
  'user.department',
  'user.role',
  'user.status',
  'door.securityLevel',
  'door.lockState',
  'zone.type',
  'zone.status',
  'site.status',
  'now.hour',
  'now.minute',
  'now.dayOfWeek',
  'now.date',
  'now.month',
  'grant.name',
  'grant.scope',
  'user',
  'door',
  'zone',
  'site',
];
```

`now` and `grant` are NOT added to `BARE_ENTITY_TYPES` — they don't support `IN group.X` membership syntax.

- [ ] **Step 2: Verify TypeScript**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "RuleBuilder.tsx"
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/components/RuleBuilder.tsx && git commit -m "feat: add now.* and grant.* attribute hints to RuleBuilder"
```

---

## Task 7: Update Permissions page

**Files:**
- Modify: `src/pages/Permissions.tsx`

- [ ] **Step 1: Read the current Permissions.tsx**

Note: `EMPTY_FORM` is at lines 34–40, `handleSubmit` is at lines 94–110, the modal form ends around line 320.

- [ ] **Step 2: Rewrite Permissions.tsx**

Replace the full file with:

```tsx
import { useState } from 'react';
import { useStore } from '../store/store';
import type { Grant, GrantScope, ActionType, Rule, Schedule } from '../types';
import RuleBuilder from '../components/RuleBuilder';
import AttributeEditor from '../components/AttributeEditor';
import ScheduleEditor from '../components/ScheduleEditor';

const ALL_ACTIONS: ActionType[] = [
  'arm', 'disarm', 'unlock', 'lockdown',
  'view_logs', 'manage_users', 'manage_tasks', 'override',
];

const ACTION_LABEL: Record<ActionType, string> = {
  arm: 'Arm', disarm: 'Disarm', unlock: 'Unlock', lockdown: 'Lockdown',
  view_logs: 'View Logs', manage_users: 'Manage Users',
  manage_tasks: 'Manage Tasks', override: 'Override',
};

const SCOPE_BADGE: Record<GrantScope, string> = {
  global: 'bg-blue-900 text-blue-300 border-blue-700',
  site:   'bg-green-900 text-green-300 border-green-700',
  zone:   'bg-orange-900 text-orange-300 border-orange-700',
};

const MODE_BADGE: Record<Grant['applicationMode'], string> = {
  assigned:    'bg-slate-700 text-slate-300',
  conditional: 'bg-amber-900 text-amber-300',
  auto:        'bg-purple-900 text-purple-300',
};

const MODE_LABEL: Record<Grant['applicationMode'], string> = {
  assigned: 'Assigned', conditional: 'Conditional', auto: 'Auto',
};

type GrantDraft = Omit<Grant, 'id'> & { id: string };

const EMPTY_DRAFT: GrantDraft = {
  id: '',
  name: '',
  description: '',
  scope: 'global',
  targetId: undefined,
  actions: [],
  applicationMode: 'assigned',
  conditions: [],
  conditionLogic: 'AND',
  customAttributes: {},
  schedule: null,
};

export default function Permissions() {
  const grants  = useStore(s => s.grants);
  const sites   = useStore(s => s.sites);
  const zones   = useStore(s => s.zones);
  const addGrant    = useStore(s => s.addGrant);
  const updateGrant = useStore(s => s.updateGrant);
  const deleteGrant = useStore(s => s.deleteGrant);

  const [draft, setDraft] = useState<GrantDraft | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function openAdd() {
    setDraft({ ...EMPTY_DRAFT, id: crypto.randomUUID() });
  }

  function openEdit(grant: Grant) {
    setDraft({ ...grant });
  }

  function closeModal() {
    setDraft(null);
  }

  function handleScopeChange(scope: GrantScope) {
    setDraft(d => d ? { ...d, scope, targetId: undefined } : d);
  }

  function handleActionToggle(action: ActionType) {
    setDraft(d => {
      if (!d) return d;
      const actions = d.actions.includes(action)
        ? d.actions.filter(a => a !== action)
        : [...d.actions, action];
      return { ...d, actions };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const grant: Grant = {
      id: draft.id,
      name: draft.name.trim(),
      description: draft.description.trim(),
      scope: draft.scope,
      targetId: draft.targetId,
      actions: draft.actions,
      applicationMode: draft.applicationMode,
      conditions: draft.conditions,
      conditionLogic: draft.conditionLogic,
      customAttributes: draft.customAttributes,
      schedule: draft.schedule,
    };
    if (grants.find(g => g.id === grant.id)) {
      updateGrant(grant);
    } else {
      addGrant(grant);
    }
    closeModal();
  }

  function getTargetName(grant: Grant): string {
    if (grant.scope === 'site') return sites.find(s => s.id === grant.targetId)?.name ?? grant.targetId ?? '';
    if (grant.scope === 'zone') {
      const z = zones.find(z => z.id === grant.targetId);
      if (!z) return grant.targetId ?? '';
      const s = sites.find(s => s.id === z.siteId);
      return s ? `${z.name} (${s.name})` : z.name;
    }
    return '';
  }

  function scheduleLabel(schedule: Schedule): string {
    const days = schedule.daysOfWeek.length === 0
      ? 'All days'
      : schedule.daysOfWeek
          .sort((a, b) => a - b)
          .map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d])
          .join('–');
    return `${days} ${schedule.startTime}–${schedule.endTime}`;
  }

  const showTarget = draft?.scope === 'site' || draft?.scope === 'zone';
  const showConditions = draft?.applicationMode === 'conditional' || draft?.applicationMode === 'auto';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Permissions</h1>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-md text-sm transition-colors"
        >
          + New Grant
        </button>
      </div>

      {/* Grant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grants.map(grant => (
          <div key={grant.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-100 truncate">{grant.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{grant.description}</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SCOPE_BADGE[grant.scope]}`}>
                {grant.scope}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODE_BADGE[grant.applicationMode]}`}>
                {MODE_LABEL[grant.applicationMode]}
              </span>
              {grant.schedule && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-900 text-teal-300">
                  {scheduleLabel(grant.schedule)}
                </span>
              )}
              {grant.conditions.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300">
                  {grant.conditions.length} condition{grant.conditions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Target */}
            {grant.scope !== 'global' && (
              <p className="text-xs text-slate-400">
                <span className="text-slate-500">Target: </span>{getTargetName(grant)}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-1">
              {grant.actions.map(a => (
                <span key={a} className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                  {ACTION_LABEL[a]}
                </span>
              ))}
            </div>

            <div className="flex gap-2 mt-auto pt-2">
              <button
                onClick={() => openEdit(grant)}
                className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition-colors"
              >
                Edit
              </button>
              {deleteConfirmId === grant.id ? (
                <>
                  <button
                    onClick={() => { deleteGrant(grant.id); setDeleteConfirmId(null); }}
                    className="flex-1 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDeleteConfirmId(grant.id)}
                  className="text-xs bg-slate-700 hover:bg-red-900 text-slate-400 hover:text-red-300 px-3 py-1.5 rounded transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {draft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">
                {grants.find(g => g.id === draft.id) ? 'Edit Grant' : 'New Grant'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input
                  required
                  value={draft.name}
                  onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={e => setDraft(d => d ? { ...d, description: e.target.value } : d)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Scope</label>
                <div className="flex gap-2">
                  {(['global', 'site', 'zone'] as GrantScope[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleScopeChange(s)}
                      className={`flex-1 text-sm font-medium py-1.5 rounded border transition-colors capitalize ${
                        draft.scope === s
                          ? SCOPE_BADGE[s] + ' border-current'
                          : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target */}
              {showTarget && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-300">
                    {draft.scope === 'site' ? 'Site' : 'Zone'}
                  </label>
                  <select
                    value={draft.targetId ?? ''}
                    onChange={e => setDraft(d => d ? { ...d, targetId: e.target.value } : d)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select…</option>
                    {draft.scope === 'site'
                      ? sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                      : zones.map(z => {
                          const s = sites.find(s => s.id === z.siteId);
                          return <option key={z.id} value={z.id}>{z.name}{s ? ` (${s.name})` : ''}</option>;
                        })
                    }
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Actions</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_ACTIONS.map(action => (
                    <label key={action} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.actions.includes(action)}
                        onChange={() => handleActionToggle(action)}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-slate-300">{ACTION_LABEL[action]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Application Mode */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Application Mode</label>
                <div className="space-y-1.5">
                  {(['assigned', 'conditional', 'auto'] as Grant['applicationMode'][]).map(mode => (
                    <label key={mode} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="applicationMode"
                        value={mode}
                        checked={draft.applicationMode === mode}
                        onChange={() => setDraft(d => d ? { ...d, applicationMode: mode } : d)}
                        className="mt-0.5 accent-blue-500"
                      />
                      <div>
                        <span className={`text-sm font-medium px-1.5 py-0.5 rounded ${MODE_BADGE[mode]}`}>
                          {MODE_LABEL[mode]}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {mode === 'assigned' && 'Grant applies when explicitly given to a user or group.'}
                          {mode === 'conditional' && 'Grant must be explicitly assigned AND all conditions must pass.'}
                          {mode === 'auto' && 'Grant applies automatically to anyone whose attributes match — no assignment needed.'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              {showConditions && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-300">Conditions</label>
                    <div className="flex gap-1">
                      {(['AND', 'OR'] as const).map(logic => (
                        <button
                          key={logic}
                          type="button"
                          onClick={() => setDraft(d => d ? { ...d, conditionLogic: logic } : d)}
                          className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                            draft.conditionLogic === logic
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {logic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RuleBuilder
                    rules={draft.conditions}
                    onChange={(conditions: Rule[]) => setDraft(d => d ? { ...d, conditions } : d)}
                  />
                  <p className="text-xs text-slate-500">
                    Use <code className="bg-slate-700 px-1 rounded">user.role == admin</code> for attribute triggers,{' '}
                    <code className="bg-slate-700 px-1 rounded">now.dayOfWeek IN Mon,Tue,Wed,Thu,Fri</code> for time conditions.
                  </p>
                </div>
              )}

              {/* Schedule */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Schedule</label>
                <ScheduleEditor
                  schedule={draft.schedule}
                  onChange={(schedule: Schedule | null) => setDraft(d => d ? { ...d, schedule } : d)}
                />
              </div>

              {/* Custom Attributes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Custom Attributes</label>
                <AttributeEditor
                  attributes={draft.customAttributes}
                  onChange={(customAttributes: Record<string, string>) =>
                    setDraft(d => d ? { ...d, customAttributes } : d)
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors">
                  Save Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify zero errors in Permissions.tsx**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "Permissions.tsx"
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/pages/Permissions.tsx && git commit -m "feat: rewrite Permissions page with mode selector, conditions, schedule, and custom attributes"
```

---

## Task 8: Update TestAccess — grant trace + Now box

**Files:**
- Modify: `src/pages/TestAccess.tsx`

- [ ] **Step 1: Read the current TestAccess.tsx to confirm current structure**

Confirm selectors are at lines 8–15, `handleEvaluate` is around lines 27–40, and the results panel renders from line ~94.

- [ ] **Step 2: Update TestAccess.tsx**

Replace the full file with:

```tsx
import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/store';
import type { AccessResult, Door, StoreSnapshot } from '../types';
import { evaluateAccess } from '../engine/accessEngine';

const MODE_BADGE: Record<string, string> = {
  assigned:    'bg-slate-700 text-slate-300',
  conditional: 'bg-amber-900 text-amber-300',
  auto:        'bg-purple-900 text-purple-300',
};

export default function TestAccess() {
  const users       = useStore(s => s.users);
  const doors       = useStore(s => s.doors);
  const policies    = useStore(s => s.policies);
  const groups      = useStore(s => s.groups);
  const grants      = useStore(s => s.grants);
  const sites       = useStore(s => s.sites);
  const zones       = useStore(s => s.zones);
  const controllers = useStore(s => s.controllers);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDoorId, setSelectedDoorId] = useState('');
  const [result, setResult] = useState<AccessResult | null>(null);
  const [evaluated, setEvaluated] = useState(false);

  const selectedUser = users.find(u => u.id === selectedUserId) ?? null;
  const selectedDoor = doors.find(d => d.id === selectedDoorId) ?? null;

  function getSiteName(door: Door): string {
    return sites.find(s => s.id === door.siteId)?.name ?? door.siteId;
  }

  function handleEvaluate() {
    if (!selectedUser || !selectedDoor) return;
    const store: StoreSnapshot = {
      allUsers: users, allDoors: doors, allZones: zones,
      allSites: sites, allControllers: controllers,
      allGroups: groups, allGrants: grants,
    };
    setResult(evaluateAccess(selectedUser, selectedDoor, policies, groups, grants, store));
    setEvaluated(true);
  }

  const assignedPolicies = selectedDoor
    ? policies.filter(p => p.doorIds.includes(selectedDoor.id))
    : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Test Access</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">User</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedUserId}
              onChange={e => { setSelectedUserId(e.target.value); setEvaluated(false); setResult(null); }}
            >
              <option value="">Select a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} — {u.department}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Door</label>
            <select
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDoorId}
              onChange={e => { setSelectedDoorId(e.target.value); setEvaluated(false); setResult(null); }}
            >
              <option value="">Select a door...</option>
              {doors.map(d => (
                <option key={d.id} value={d.id}>{d.name} — {getSiteName(d)}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-md transition-colors"
          disabled={!selectedUserId || !selectedDoorId}
          onClick={handleEvaluate}
        >
          Evaluate Access
        </button>
      </div>

      {evaluated && result && (
        <div className="space-y-4">
          {/* Now context */}
          <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Now</span>
            <span className="text-sm font-mono text-slate-300">
              {result.nowContext.dayOfWeek} {String(result.nowContext.hour).padStart(2,'0')}:{String(result.nowContext.minute).padStart(2,'0')}
              {' · '}{result.nowContext.date}
            </span>
          </div>

          {/* Permission layer */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">Permission Layer</h2>
              {result.permissionGranted ? (
                <span className="inline-flex items-center bg-green-900 border border-green-700 text-green-300 text-sm font-bold px-3 py-1 rounded-full">GRANTED</span>
              ) : (
                <span className="inline-flex items-center bg-red-900 border border-red-700 text-red-300 text-sm font-bold px-3 py-1 rounded-full">DENIED</span>
              )}
            </div>

            {result.grantResults.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No grants considered.</p>
            ) : (
              <div className="space-y-2">
                {result.grantResults.map(gr => (
                  <div
                    key={gr.grantId}
                    className={`border rounded-md overflow-hidden ${
                      gr.included ? 'border-slate-600' : 'border-slate-700 opacity-60'
                    }`}
                  >
                    <div className={`flex items-center gap-2 px-4 py-2 ${gr.included ? 'bg-slate-700' : 'bg-slate-800'}`}>
                      <span className="text-sm font-semibold text-slate-200 flex-1">{gr.grantName}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${MODE_BADGE[gr.applicationMode]}`}>
                        {gr.applicationMode.toUpperCase()}
                      </span>
                      {gr.included ? (
                        <span className="text-xs font-bold text-green-300 bg-green-900 border border-green-700 px-2 py-0.5 rounded-full">ACTIVE</span>
                      ) : (
                        <span className="text-xs font-bold text-red-300 bg-red-900 border border-red-700 px-2 py-0.5 rounded-full">EXCLUDED</span>
                      )}
                    </div>

                    {(gr.scheduleActive !== null || gr.conditionsPassed !== null || gr.conditionResults.length > 0) && (
                      <div className="px-4 py-2 space-y-1 bg-slate-800/50">
                        {gr.scheduleActive !== null && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Schedule:</span>
                            {gr.scheduleActive ? (
                              <span className="text-green-300 font-semibold">✓ Active</span>
                            ) : (
                              <span className="text-red-300 font-semibold">✗ Outside window</span>
                            )}
                          </div>
                        )}
                        {gr.conditionResults.map(rr => (
                          <div key={rr.ruleId} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-slate-300">
                              {rr.leftSide} <span className="text-blue-400">{rr.operator}</span>{' '}
                              <span className="text-amber-300">
                                {Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide}
                              </span>
                            </span>
                            <span className="text-slate-500">→</span>
                            <span className="font-mono text-slate-400">
                              <span className="text-slate-200">{rr.leftResolved}</span>
                              {rr.rightResolved !== (Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide) && (
                                <span className="text-slate-400"> vs <span className="text-slate-200">{rr.rightResolved}</span></span>
                              )}
                            </span>
                            <span className="text-slate-500">→</span>
                            {rr.passed ? (
                              <span className="font-bold text-green-300">PASS</span>
                            ) : (
                              <span className="font-bold text-red-300">FAIL</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ABAC layer */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">ABAC Layer</h2>
            {assignedPolicies.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No policies assigned — access allowed by default.</p>
            ) : (
              <div className="space-y-4">
                {result.policyResults.map(pr => (
                  <div key={pr.policyId} className="border border-slate-600 rounded-md overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-700 px-4 py-2">
                      <span className="text-sm font-semibold text-slate-200">{pr.policyName}</span>
                      {pr.passed ? (
                        <span className="text-xs font-bold text-green-300 bg-green-900 border border-green-700 px-2 py-0.5 rounded-full">PASS</span>
                      ) : (
                        <span className="text-xs font-bold text-red-300 bg-red-900 border border-red-700 px-2 py-0.5 rounded-full">FAIL</span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-700">
                      {pr.ruleResults.map(rr => (
                        <div key={rr.ruleId} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono text-slate-300">
                            {rr.leftSide} <span className="text-blue-400">{rr.operator}</span>{' '}
                            <span className="text-amber-300">
                              {Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide}
                            </span>
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className="font-mono text-slate-400">
                            resolved: <span className="text-slate-200">{rr.leftResolved}</span>
                            {rr.rightResolved !== (Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide) && (
                              <span className="text-slate-400"> vs <span className="text-slate-200">{rr.rightResolved}</span></span>
                            )}
                          </span>
                          <span className="text-slate-500">→</span>
                          {rr.passed ? (
                            <span className="text-xs font-bold text-green-300">PASS</span>
                          ) : (
                            <span className="text-xs font-bold text-red-300">FAIL</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overall verdict */}
          <div className={`rounded-lg border-2 p-6 flex items-center justify-center gap-4 ${
            result.overallGranted ? 'bg-green-950 border-green-500' : 'bg-red-950 border-red-500'
          }`}>
            {result.overallGranted ? (
              <>
                <CheckCircle className="w-10 h-10 text-green-400 shrink-0" />
                <span className="text-3xl font-extrabold tracking-widest text-green-400">ACCESS GRANTED</span>
              </>
            ) : (
              <>
                <XCircle className="w-10 h-10 text-red-400 shrink-0" />
                <span className="text-3xl font-extrabold tracking-widest text-red-400">ACCESS DENIED</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify zero errors in TestAccess.tsx**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep "TestAccess.tsx"
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/pages/TestAccess.tsx && git commit -m "feat: add per-grant trace, Now context box, and schedule/condition evaluation to TestAccess"
```

---

## Task 9: Update AccessMatrix + Arming for allGrants in StoreSnapshot

**Files:**
- Modify: `src/pages/AccessMatrix.tsx`
- Modify: `src/pages/Arming.tsx`

- [ ] **Step 1: Update AccessMatrix.tsx**

Read the file. Find every place a `StoreSnapshot` object is constructed (there are two: the `resultGrid` useMemo and the `handleCellClick` callback). Add `allGrants: grants` to each:

```ts
const store: StoreSnapshot = {
  allUsers: users,
  allDoors: doors,
  allZones: zones,
  allSites: sites,
  allControllers: controllers,
  allGroups: groups,
  allGrants: grants,   // ← add this line
};
```

Also ensure `grants` is read from the store as a separate selector if not already:
```ts
const grants = useStore(s => s.grants);
```

And add it to the `resultGrid` useMemo dependency array.

- [ ] **Step 2: Update Arming.tsx**

Read the file. Find where `hasPermission` is called. It receives a `ctx: EvalContext` which contains `store: StoreSnapshot`. Add `allGrants: grants` to the snapshot used to build the ctx:

```ts
const storeSnapshot: StoreSnapshot = {
  allUsers: users,
  allDoors: doors,
  allZones: zones,
  allSites: sites,
  allControllers: controllers,
  allGroups: groups,
  allGrants: grants,   // ← add this line
};
```

Also add `const grants = useStore(s => s.grants);` selector if not already present.

- [ ] **Step 3: Full TypeScript check**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1 | grep -E "(AccessMatrix|Arming)\.tsx"
```

Expected: zero errors in both files.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add src/pages/AccessMatrix.tsx src/pages/Arming.tsx && git commit -m "feat: pass allGrants in StoreSnapshot to AccessMatrix and Arming"
```

---

## Task 10: Final build verification

**Files:** None modified.

- [ ] **Step 1: Full TypeScript check — must be zero errors**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npx tsc --noEmit 2>&1
```

Expected output: empty (no errors). If any errors appear, fix them before proceeding.

- [ ] **Step 2: Production build**

```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npm run build 2>&1
```

Expected: `✓ built in X.XXs` with no errors. Fix any Vite/esbuild errors before proceeding.

- [ ] **Step 3: Commit any fixes**

Only commit if fixes were needed:
```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && git add -A && git commit -m "fix: resolve any remaining TypeScript errors for clean build"
```

- [ ] **Step 4: Verify demo scenarios in browser**

Start dev server:
```bash
cd /c/Users/JCullum/repos/dev-crew/abac-soc-demo-v2 && npm run dev
```

Check:
1. **Permissions page** — grant cards show mode badges; "Admin Auto-Grant" shows `Auto` badge; "Day Shift Access" shows schedule badge; editing a grant shows the three new sections
2. **TestAccess** — after evaluating, the "Now" box shows current day/time; "Admin Auto-Grant" appears in the grant trace for any user with `role == admin`; "High Security Access" shows EXCLUDED for users below Secret clearance
3. **Policy rules** — open any policy and type `now.` in the left-side rule input — should show `now.hour`, `now.dayOfWeek` etc. as hints
4. **All 12 pages** — navigate through every page, confirm no white screens or console errors
