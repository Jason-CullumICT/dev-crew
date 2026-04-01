# Universal ABAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade abac-soc-demo-v2 from user-only ABAC to a universal model where all entities carry custom attributes, rules reference any entity's attributes on either side, and groups contain any entity type with dynamic rule-based membership.

**Architecture:** A full `EvalContext` is threaded through the engine so `resolveAttribute("door.securityLevel", ctx)` works anywhere. Rule format changes from `{attribute, value}` to `{leftSide, rightSide}` supporting both literal and `entity.attribute` references. Groups generalise from `memberUserIds: string[]` to `members: GroupMember[]` with `targetEntityType` and optional dynamic membership rules.

**Tech Stack:** React 18, TypeScript, Zustand/sessionStorage, Tailwind CSS v4, lucide-react, Vite 8, no test framework — verify with `npm run build` (zero TS errors).

**Working directory:** `abac-soc-demo-v2/`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/types/index.ts` | New Rule, GroupMember, Group types; customAttributes on Door/Zone/Site/Controller |
| Rewrite | `src/engine/accessEngine.ts` | EvalContext, resolveAttribute, isEntityInGroup, evaluateRule, evaluateAccess, hasPermission |
| Create | `src/components/RuleBuilder.tsx` | Shared rule builder UI (leftSide/operator/rightSide) with attribute hint popover |
| Modify | `src/data/testData.ts` | Dynamic groups, cross-entity attributes, new policies |
| Rewrite | `src/pages/Groups.tsx` | Universal members, dynamic membership, RuleBuilder |
| Modify | `src/pages/Policies.tsx` | Swap inline rule builder for RuleBuilder component |
| Modify | `src/pages/Doors.tsx` | Add customAttributes key-value editor |
| Modify | `src/pages/Sites.tsx` | Add customAttributes to site and zone forms |
| Modify | `src/pages/Controllers.tsx` | Add customAttributes key-value editor |
| Modify | `src/pages/TestAccess.tsx` | Pass StoreSnapshot, show resolved context section |
| Modify | `src/pages/AccessMatrix.tsx` | Pass StoreSnapshot, update ruleResult column names |

---

## Task 1: Update types

**Files:** Modify `src/types/index.ts`

- [ ] **Replace the file with the following complete content:**

```typescript
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
  customAttributes: Record<string, string>;
  grantedPermissions: string[];
  groupIds: string[];
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

export interface Grant {
  id: string;
  name: string;
  description: string;
  scope: GrantScope;
  targetId?: string;
  actions: ActionType[];
}

export type SiteStatus = 'Armed' | 'Disarmed' | 'PartialArm' | 'Alarm' | 'Lockdown';

export interface Site {
  id: string;
  name: string;
  address: string;
  timezone: string;
  status: SiteStatus;
  assignedManagerIds: string[];
  zones: string[];
  customAttributes: Record<string, string>;
}

export type ZoneType = 'Perimeter' | 'Interior' | 'Secure' | 'Public' | 'Emergency';
export type ZoneStatus = 'Armed' | 'Disarmed' | 'Alarm';

export interface Zone {
  id: string;
  siteId: string;
  name: string;
  type: ZoneType;
  status: ZoneStatus;
  doorIds: string[];
  cameraIds?: string[];
  customAttributes: Record<string, string>;
}

export type LockState = 'Locked' | 'Unlocked' | 'Forced' | 'Held';

export interface Door {
  id: string;
  name: string;
  location: string;
  siteId: string;
  zoneId: string;
  controllerId: string;
  description: string;
  lockState: LockState;
  customAttributes: Record<string, string>;
}

export interface Controller {
  id: string;
  name: string;
  location: string;
  siteId: string;
  doorIds: string[];
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
  text: string;
  authorId: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  siteId: string;
  zoneId?: string;
  assignedToUserId?: string;
  createdByUserId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  category: TaskCategory;
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

export interface AccessResult {
  permissionGranted: boolean;
  abacGranted: boolean;
  overallGranted: boolean;
  matchedPolicy?: string;
  matchedGrants: string[];
  policyResults: PolicyResult[];
}

export interface ArmingLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  siteName: string;
  result: 'Success' | 'Denied';
}

export interface StoreSnapshot {
  allUsers: User[];
  allDoors: Door[];
  allZones: Zone[];
  allSites: Site[];
  allControllers: Controller[];
  allGroups: Group[];
}
```

- [ ] **Verify build:**
```bash
cd abac-soc-demo-v2 && npm run build 2>&1 | head -40
```
Expected: TypeScript errors about old `attribute`/`value`/`memberUserIds` fields — that is correct, they will be fixed in subsequent tasks.

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/types/index.ts
git commit -m "feat(abac): new Rule/Group/StoreSnapshot types with universal entity attributes"
```

---

## Task 2: Rewrite the access engine

**Files:** Rewrite `src/engine/accessEngine.ts`

- [ ] **Replace the entire file:**

```typescript
import { CLEARANCE_RANK } from '../types';
import type {
  User, Group, Grant, Door, Zone, Site, Controller,
  Policy, ActionType, AccessResult, PolicyResult, RuleResult,
  Rule, Operator, StoreSnapshot, GroupMember,
} from '../types';

// ── Context ──────────────────────────────────────────────────────────────────

export interface EvalContext {
  user: User;
  door?: Door;
  zone?: Zone;
  site?: Site;
  controller?: Controller;
  store: StoreSnapshot;
}

// ── Attribute resolution ──────────────────────────────────────────────────────

const USER_BUILTINS = new Set(['name','email','department','role','clearanceLevel','status']);
const DOOR_BUILTINS = new Set(['name','location','lockState','description']);
const ZONE_BUILTINS = new Set(['name','type','status']);
const SITE_BUILTINS = new Set(['name','address','status','timezone']);
const CTRL_BUILTINS = new Set(['name','location']);
const GROUP_BUILTINS = new Set(['name','targetEntityType','membershipType']);

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
    // Legacy bare name → user attribute
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
    case 'group': {
      // Resolve against the first group the user belongs to (useful for group.minClearance style rules)
      const userGroup = ctx.store.allGroups.find(g =>
        g.members.some(m => m.entityType === 'user' && m.entityId === ctx.user.id)
      );
      return userGroup ? getBuiltinOrCustom(userGroup as unknown as Record<string, unknown>, GROUP_BUILTINS, attrKey) : '';
    }
    default:
      return '';
  }
}

// ── Group membership ──────────────────────────────────────────────────────────

const ENTITY_TYPE_KEYS = ['user', 'door', 'zone', 'site', 'controller'] as const;
type BareEntityType = typeof ENTITY_TYPE_KEYS[number];

function isBareEntity(s: string): s is BareEntityType {
  return (ENTITY_TYPE_KEYS as readonly string[]).includes(s);
}

function getEntityIdFromCtx(entityType: BareEntityType, ctx: EvalContext): string | undefined {
  switch (entityType) {
    case 'user': return ctx.user.id;
    case 'door': return ctx.door?.id;
    case 'zone': return ctx.zone?.id;
    case 'site': return ctx.site?.id;
    case 'controller': return ctx.controller?.id;
  }
}

function buildEntityCtx(entityType: BareEntityType, entityId: string, baseCtx: EvalContext): EvalContext {
  const { store } = baseCtx;
  const ctx: EvalContext = { user: baseCtx.user, store };
  switch (entityType) {
    case 'user': {
      const u = store.allUsers.find(x => x.id === entityId);
      if (u) ctx.user = u;
      break;
    }
    case 'door': {
      ctx.door = store.allDoors.find(x => x.id === entityId);
      break;
    }
    case 'zone': {
      ctx.zone = store.allZones.find(x => x.id === entityId);
      break;
    }
    case 'site': {
      ctx.site = store.allSites.find(x => x.id === entityId);
      break;
    }
    case 'controller': {
      ctx.controller = store.allControllers.find(x => x.id === entityId);
      break;
    }
  }
  return ctx;
}

function evaluateRuleSet(rules: Rule[], logic: 'AND' | 'OR', ctx: EvalContext): boolean {
  if (rules.length === 0) return false;
  const results = rules.map(r => evaluateRule(r, ctx).passed);
  return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

export function isEntityInGroup(
  entityId: string,
  entityType: GroupMember['entityType'],
  group: Group,
  ctx: EvalContext,
): boolean {
  const { membershipType, targetEntityType } = group;

  // Explicit membership
  if (membershipType === 'explicit' || membershipType === 'hybrid') {
    if (group.members.some(m => m.entityType === entityType && m.entityId === entityId)) {
      return true;
    }
  }

  // Dynamic membership (not supported for targetEntityType 'any')
  if ((membershipType === 'dynamic' || membershipType === 'hybrid') && targetEntityType !== 'any') {
    const entityCtx = buildEntityCtx(entityType, entityId, ctx);
    if (evaluateRuleSet(group.membershipRules, group.membershipLogic, entityCtx)) {
      return true;
    }
  }

  return false;
}

// ── Rule evaluation ───────────────────────────────────────────────────────────

function compareValues(left: string, op: Operator, right: string | string[]): boolean {
  if (op === '==') return left === right;
  if (op === '!=') return left !== right;
  if (op === 'IN') {
    const arr = Array.isArray(right) ? right : right.split(',').map(s => s.trim());
    return arr.includes(left);
  }
  if (op === 'NOT IN') {
    const arr = Array.isArray(right) ? right : right.split(',').map(s => s.trim());
    return !arr.includes(left);
  }
  if (op === '>=' || op === '<=') {
    const leftRank = CLEARANCE_RANK[left as keyof typeof CLEARANCE_RANK];
    const rightRank = CLEARANCE_RANK[(Array.isArray(right) ? right[0] : right) as keyof typeof CLEARANCE_RANK];
    if (leftRank !== undefined && rightRank !== undefined) {
      return op === '>=' ? leftRank >= rightRank : leftRank <= rightRank;
    }
    const ln = parseFloat(left);
    const rn = parseFloat(Array.isArray(right) ? right[0] : right);
    return op === '>=' ? ln >= rn : ln <= rn;
  }
  return false;
}

export function evaluateRule(rule: Rule, ctx: EvalContext): RuleResult {
  const { leftSide, operator, rightSide } = rule;

  // Membership check: bare entity type + IN/NOT IN + group.Name
  if (
    isBareEntity(leftSide) &&
    (operator === 'IN' || operator === 'NOT IN') &&
    typeof rightSide === 'string' &&
    rightSide.toLowerCase().startsWith('group.')
  ) {
    const groupName = rightSide.slice('group.'.length);
    const group = ctx.store.allGroups.find(
      g => g.name.toLowerCase() === groupName.toLowerCase(),
    );
    const entityId = getEntityIdFromCtx(leftSide, ctx);
    let inGroup = false;
    if (group && entityId) {
      inGroup = isEntityInGroup(entityId, leftSide, group, ctx);
    }
    const passed = operator === 'IN' ? inGroup : !inGroup;
    return {
      ruleId: rule.id,
      leftSide,
      operator,
      rightSide,
      leftResolved: entityId ?? '(none)',
      rightResolved: group ? `group:${group.name}` : '(group not found)',
      passed,
    };
  }

  // Attribute comparison
  const leftResolved = resolveAttribute(leftSide, ctx);

  let rightResolved: string;
  let resolvedRightForCompare: string | string[];

  if (Array.isArray(rightSide)) {
    rightResolved = rightSide.join(', ');
    resolvedRightForCompare = rightSide;
  } else if (rightSide.includes('.') && !rightSide.startsWith('group.')) {
    // entity.attribute reference on right side
    rightResolved = resolveAttribute(rightSide, ctx);
    resolvedRightForCompare = rightResolved;
  } else {
    rightResolved = rightSide;
    resolvedRightForCompare = rightSide;
  }

  const passed = compareValues(leftResolved, operator, resolvedRightForCompare);

  return {
    ruleId: rule.id,
    leftSide,
    operator,
    rightSide,
    leftResolved,
    rightResolved,
    passed,
  };
}

// ── Permission (RBAC) layer ───────────────────────────────────────────────────

function getEffectiveGrantIds(user: User, groups: Group[], ctx: EvalContext): Set<string> {
  const ids = new Set<string>(user.grantedPermissions);
  for (const group of groups) {
    if (group.inheritedPermissions.length === 0) continue;
    // Check if user is a member (explicit or dynamic)
    const isMember =
      group.members.some(m => m.entityType === 'user' && m.entityId === user.id) ||
      ((group.membershipType === 'dynamic' || group.membershipType === 'hybrid') &&
        group.targetEntityType !== 'any' &&
        evaluateRuleSet(group.membershipRules, group.membershipLogic, ctx));
    if (isMember) {
      for (const gid of group.inheritedPermissions) ids.add(gid);
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
  const grantIds = getEffectiveGrantIds(user, groups, ctx);
  for (const grantId of grantIds) {
    const grant = grants.find(g => g.id === grantId);
    if (!grant || !grant.actions.includes(action)) continue;
    if (grant.scope === 'global') return true;
    if (grant.scope === 'site' && siteId && grant.targetId === siteId) return true;
    if (grant.scope === 'zone' && zoneId && grant.targetId === zoneId) return true;
  }
  return false;
}

function getMatchedGrantNames(
  user: User,
  groups: Group[],
  grants: Grant[],
  action: ActionType,
  ctx: EvalContext,
  siteId?: string,
  zoneId?: string,
): string[] {
  const grantIds = getEffectiveGrantIds(user, groups, ctx);
  const matched: string[] = [];
  for (const grantId of grantIds) {
    const grant = grants.find(g => g.id === grantId);
    if (!grant || !grant.actions.includes(action)) continue;
    if (grant.scope === 'global') { matched.push(grant.name); continue; }
    if (grant.scope === 'site' && siteId && grant.targetId === siteId) { matched.push(grant.name); continue; }
    if (grant.scope === 'zone' && zoneId && grant.targetId === zoneId) matched.push(grant.name);
  }
  return matched;
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
  const zone = store.allZones.find(z => z.id === door.zoneId);
  const site = store.allSites.find(s => s.id === door.siteId);
  const controller = store.allControllers.find(c => c.id === door.controllerId);

  const ctx: EvalContext = { user, door, zone, site, controller, store };

  const permissionGranted = hasPermission(user, groups, grants, 'unlock', ctx, door.siteId, door.zoneId);
  const matchedGrants = getMatchedGrantNames(user, groups, grants, 'unlock', ctx, door.siteId, door.zoneId);

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

  return { permissionGranted, abacGranted, overallGranted: permissionGranted && abacGranted, matchedPolicy, matchedGrants, policyResults };
}
```

- [ ] **Run build** — expect errors in pages that call the old engine/group APIs. That is expected.
```bash
cd abac-soc-demo-v2 && npm run build 2>&1 | grep "error TS"
```

- [ ] **Commit engine:**
```bash
git add abac-soc-demo-v2/src/engine/accessEngine.ts
git commit -m "feat(abac): universal eval engine with EvalContext, resolveAttribute, isEntityInGroup"
```

---

## Task 3: Create RuleBuilder component

**Files:** Create `src/components/RuleBuilder.tsx`

- [ ] **Write the file:**

```typescript
import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Rule, Operator } from '../types';
import { useStore } from '../store/store';

const OPERATORS: Operator[] = ['==', '!=', '>=', '<=', 'IN', 'NOT IN'];
const BARE_ENTITIES = ['user', 'door', 'zone', 'site', 'controller'];

function buildHints(
  users: { customAttributes: Record<string, string> }[],
  doors: { customAttributes: Record<string, string> }[],
  zones: { customAttributes: Record<string, string> }[],
  sites: { customAttributes: Record<string, string> }[],
  controllers: { customAttributes: Record<string, string> }[],
  groupNames: string[],
): { left: string[]; right: string[] } {
  const attrs = (prefix: string, builtins: string[], entities: { customAttributes: Record<string, string> }[]) => {
    const custom = new Set<string>();
    entities.forEach(e => Object.keys(e.customAttributes).forEach(k => custom.add(k)));
    return [...builtins, ...custom].map(k => `${prefix}.${k}`);
  };

  const left = [
    ...BARE_ENTITIES,
    ...attrs('user', ['department', 'role', 'clearanceLevel', 'status', 'name'], users),
    ...attrs('door', ['lockState', 'location', 'name', 'description'], doors),
    ...attrs('zone', ['type', 'status', 'name'], zones),
    ...attrs('site', ['status', 'name', 'address'], sites),
    ...attrs('controller', ['name', 'location'], controllers),
  ];

  const right = [
    ...left.filter(h => !BARE_ENTITIES.includes(h)),
    ...groupNames.map(n => `group.${n}`),
    // Common literal values
    'Unclassified', 'Confidential', 'Secret', 'TopSecret',
    'Active', 'Suspended', 'Pending',
    'Armed', 'Disarmed', 'Alarm', 'Lockdown', 'PartialArm',
    'Locked', 'Unlocked', 'Forced', 'Held',
    'Perimeter', 'Interior', 'Secure', 'Public', 'Emergency',
  ];

  return { left: [...new Set(left)], right: [...new Set(right)] };
}

interface RuleDraft {
  id: string;
  leftSide: string;
  operator: Operator;
  rightSide: string;
}

function draftFromRule(r: Rule): RuleDraft {
  return {
    id: r.id,
    leftSide: r.leftSide,
    operator: r.operator,
    rightSide: Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide,
  };
}

function draftToRule(d: RuleDraft): Rule {
  const isArray = (d.operator === 'IN' || d.operator === 'NOT IN') && !d.rightSide.startsWith('group.');
  return {
    id: d.id,
    leftSide: d.leftSide,
    operator: d.operator,
    rightSide: isArray ? d.rightSide.split(',').map(s => s.trim()).filter(Boolean) : d.rightSide,
  };
}

function HintInput({
  value,
  onChange,
  hints,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  hints: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = hints.filter(h => h.toLowerCase().includes(value.toLowerCase()) && h !== value).slice(0, 12);

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-xl max-h-48 overflow-y-auto">
          {filtered.map(h => (
            <li
              key={h}
              className="px-3 py-1.5 text-xs font-mono text-slate-200 hover:bg-slate-700 cursor-pointer"
              onMouseDown={() => { onChange(h); setOpen(false); }}
            >
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface RuleBuilderProps {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

export default function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const users = useStore(s => s.users);
  const doors = useStore(s => s.doors);
  const zones = useStore(s => s.zones);
  const sites = useStore(s => s.sites);
  const controllers = useStore(s => s.controllers);
  const groups = useStore(s => s.groups);

  const hints = buildHints(users, doors, zones, sites, controllers, groups.map(g => g.name));
  const [drafts, setDrafts] = useState<RuleDraft[]>(() => rules.map(draftFromRule));

  function sync(next: RuleDraft[]) {
    setDrafts(next);
    onChange(next.map(draftToRule));
  }

  function addRule() {
    sync([...drafts, { id: uuidv4(), leftSide: '', operator: '==', rightSide: '' }]);
  }

  function removeRule(id: string) {
    sync(drafts.filter(d => d.id !== id));
  }

  function updateDraft(id: string, patch: Partial<RuleDraft>) {
    sync(drafts.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  const isIN = (op: Operator) => op === 'IN' || op === 'NOT IN';

  return (
    <div className="space-y-2">
      {drafts.map(d => (
        <div key={d.id} className="flex items-center gap-2 flex-wrap">
          <HintInput
            value={d.leftSide}
            onChange={v => updateDraft(d.id, { leftSide: v })}
            hints={hints.left}
            placeholder="user.clearanceLevel"
            className="min-w-36"
          />
          <select
            value={d.operator}
            onChange={e => updateDraft(d.id, { operator: e.target.value as Operator })}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <HintInput
            value={d.rightSide}
            onChange={v => updateDraft(d.id, { rightSide: v })}
            hints={hints.right}
            placeholder={isIN(d.operator) ? 'group.Name or a, b, c' : 'Secret or door.requiredClearance'}
            className="min-w-48"
          />
          <button
            type="button"
            onClick={() => removeRule(d.id)}
            className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add rule
      </button>
    </div>
  );
}
```

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/components/RuleBuilder.tsx
git commit -m "feat(abac): shared RuleBuilder component with entity.attribute hint autocomplete"
```

---

## Task 4: Update test data

**Files:** Rewrite `src/data/testData.ts`

- [ ] **Replace the file with the following** (this regenerates all seed data using new types):

```typescript
import { v4 as uuidv4 } from 'uuid';
import type {
  User, Group, GroupMember, Grant, Site, Zone, Door,
  Controller, Policy, Task, ArmingLog, Rule,
} from '../types';
import { useStore } from '../store/store';

export function generateTestData() {
  // ── Sites ──────────────────────────────────────────────────────────────────
  const s1 = uuidv4(), s2 = uuidv4(), s3 = uuidv4(), s4 = uuidv4(), s5 = uuidv4();
  const sites: Site[] = [
    { id: s1, name: 'HQ Office', address: '1 Corporate Drive, Auckland', timezone: 'Pacific/Auckland', status: 'Armed', assignedManagerIds: [], zones: [], customAttributes: { classification: 'Internal', operationalStatus: 'Active' } },
    { id: s2, name: 'Regional Office', address: '45 Regional Blvd, Wellington', timezone: 'Pacific/Auckland', status: 'Armed', assignedManagerIds: [], zones: [], customAttributes: { classification: 'Internal', operationalStatus: 'Active' } },
    { id: s3, name: 'Data Centre Alpha', address: '99 Server Lane, Christchurch', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [], customAttributes: { classification: 'TopSecret', operationalStatus: 'Critical' } },
    { id: s4, name: 'Central Warehouse', address: '200 Industrial Way, Hamilton', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [], customAttributes: { classification: 'Internal', operationalStatus: 'Active' } },
    { id: s5, name: 'Executive Suite', address: '10 Boardroom St, Auckland', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [], customAttributes: { classification: 'Confidential', operationalStatus: 'Active' } },
  ];

  // ── Zones ──────────────────────────────────────────────────────────────────
  const zones: Zone[] = [];
  function mkZone(siteId: string, name: string, type: Zone['type'], status: Zone['status'], customAttributes: Record<string, string> = {}): Zone {
    const z: Zone = { id: uuidv4(), siteId, name, type, status, doorIds: [], customAttributes };
    zones.push(z);
    return z;
  }
  const z_hq_peri  = mkZone(s1, 'HQ Perimeter', 'Perimeter', 'Armed');
  const z_hq_int   = mkZone(s1, 'HQ Interior', 'Interior', 'Armed');
  const z_hq_sec   = mkZone(s1, 'HQ Secure Lab', 'Secure', 'Armed', { classification: 'Secret' });
  const z_reg_peri = mkZone(s2, 'Regional Perimeter', 'Perimeter', 'Armed');
  const z_reg_int  = mkZone(s2, 'Regional Interior', 'Interior', 'Disarmed');
  const z_reg_pub  = mkZone(s2, 'Regional Lobby', 'Public', 'Disarmed');
  const z_dc_sec   = mkZone(s3, 'DC Secure Zone', 'Secure', 'Armed', { classification: 'TopSecret' });
  const z_dc_int   = mkZone(s3, 'DC Operations', 'Interior', 'Disarmed', { classification: 'Secret' });
  const z_dc_emg   = mkZone(s3, 'DC Emergency', 'Emergency', 'Disarmed');
  const z_wh_peri  = mkZone(s4, 'Warehouse Perimeter', 'Perimeter', 'Disarmed');
  const z_wh_int   = mkZone(s4, 'Warehouse Floor', 'Interior', 'Disarmed');
  const z_ex_sec   = mkZone(s5, 'Executive Secure', 'Secure', 'Disarmed', { classification: 'TopSecret' });
  const z_ex_pub   = mkZone(s5, 'Executive Lobby', 'Public', 'Disarmed');

  // Assign zones to sites
  sites[0].zones = [z_hq_peri.id, z_hq_int.id, z_hq_sec.id];
  sites[1].zones = [z_reg_peri.id, z_reg_int.id, z_reg_pub.id];
  sites[2].zones = [z_dc_sec.id, z_dc_int.id, z_dc_emg.id];
  sites[3].zones = [z_wh_peri.id, z_wh_int.id];
  sites[4].zones = [z_ex_sec.id, z_ex_pub.id];

  // ── Controllers ────────────────────────────────────────────────────────────
  const ctrl1: Controller = { id: uuidv4(), name: 'HQ-CTRL-01', location: 'HQ Server Room', siteId: s1, doorIds: [], customAttributes: {} };
  const ctrl2: Controller = { id: uuidv4(), name: 'DC-CTRL-01', location: 'DC Control Room', siteId: s3, doorIds: [], customAttributes: {} };
  const ctrl3: Controller = { id: uuidv4(), name: 'REG-CTRL-01', location: 'Regional IT Closet', siteId: s2, doorIds: [], customAttributes: {} };
  const controllers: Controller[] = [ctrl1, ctrl2, ctrl3];

  // ── Doors ──────────────────────────────────────────────────────────────────
  function mkDoor(name: string, location: string, siteId: string, zoneId: string, ctrl: Controller, lockState: Door['lockState'], customAttributes: Record<string, string> = {}): Door {
    const d: Door = { id: uuidv4(), name, location, siteId, zoneId, controllerId: ctrl.id, description: `${name} access point`, lockState, customAttributes };
    ctrl.doorIds.push(d.id);
    return d;
  }

  const d1  = mkDoor('HQ Main Entrance',    'Ground Floor',  s1, z_hq_peri.id, ctrl1, 'Locked',   { securityLevel: 'Standard', requiredClearance: 'Unclassified' });
  const d2  = mkDoor('HQ Side Gate',        'Car Park',      s1, z_hq_peri.id, ctrl1, 'Locked',   { securityLevel: 'Standard', requiredClearance: 'Unclassified' });
  const d3  = mkDoor('HQ Lab Door',         'Level 3',       s1, z_hq_sec.id,  ctrl1, 'Locked',   { securityLevel: 'High',     requiredClearance: 'Secret' });
  const d4  = mkDoor('HQ Server Room',      'Basement',      s1, z_hq_int.id,  ctrl1, 'Locked',   { securityLevel: 'High',     requiredClearance: 'Confidential' });
  const d5  = mkDoor('Regional Front Door', 'Ground Floor',  s2, z_reg_peri.id,ctrl3, 'Unlocked', { securityLevel: 'Standard', requiredClearance: 'Unclassified' });
  const d6  = mkDoor('Regional Meetings',   'Level 2',       s2, z_reg_int.id, ctrl3, 'Locked',   { securityLevel: 'Standard', requiredClearance: 'Unclassified' });
  const d7  = mkDoor('DC Primary Access',   'Entry Lobby',   s3, z_dc_sec.id,  ctrl2, 'Locked',   { securityLevel: 'Critical', requiredClearance: 'Secret' });
  const d8  = mkDoor('DC Operations Room',  'Level 1',       s3, z_dc_int.id,  ctrl2, 'Locked',   { securityLevel: 'High',     requiredClearance: 'Secret' });
  const d9  = mkDoor('DC Emergency Exit',   'East Wing',     s3, z_dc_emg.id,  ctrl2, 'Locked',   { securityLevel: 'Standard', requiredClearance: 'Unclassified' });
  const d10 = mkDoor('Warehouse Gate A',    'North Entry',   s4, z_wh_peri.id, ctrl1, 'Unlocked', { securityLevel: 'Low',      requiredClearance: 'Unclassified' });
  const d11 = mkDoor('Warehouse Floor',     'Loading Bay',   s4, z_wh_int.id,  ctrl1, 'Locked',   { securityLevel: 'Low',      requiredClearance: 'Unclassified' });
  const d12 = mkDoor('Executive Suite Entry','Level 20',     s5, z_ex_sec.id,  ctrl1, 'Locked',   { securityLevel: 'Critical', requiredClearance: 'TopSecret' });
  const doors: Door[] = [d1,d2,d3,d4,d5,d6,d7,d8,d9,d10,d11,d12];

  // Assign doors to zones
  z_hq_peri.doorIds  = [d1.id, d2.id];
  z_hq_sec.doorIds   = [d3.id];
  z_hq_int.doorIds   = [d4.id];
  z_reg_peri.doorIds = [d5.id];
  z_reg_int.doorIds  = [d6.id];
  z_dc_sec.doorIds   = [d7.id];
  z_dc_int.doorIds   = [d8.id];
  z_dc_emg.doorIds   = [d9.id];
  z_wh_peri.doorIds  = [d10.id];
  z_wh_int.doorIds   = [d11.id];
  z_ex_sec.doorIds   = [d12.id];

  // ── Grants ─────────────────────────────────────────────────────────────────
  const g1: Grant = { id: uuidv4(), name: 'Global Admin', description: 'Full access', scope: 'global', actions: ['arm','disarm','unlock','lockdown','view_logs','manage_users','manage_tasks','override'] };
  const g2: Grant = { id: uuidv4(), name: 'Global View', description: 'View logs globally', scope: 'global', actions: ['view_logs'] };
  const g3: Grant = { id: uuidv4(), name: 'HQ Arm/Disarm', description: 'Arm/disarm HQ', scope: 'site', targetId: s1, actions: ['arm','disarm'] };
  const g4: Grant = { id: uuidv4(), name: 'HQ Unlock', description: 'Unlock HQ doors', scope: 'site', targetId: s1, actions: ['unlock'] };
  const g5: Grant = { id: uuidv4(), name: 'DC Secure Access', description: 'Full DC access', scope: 'site', targetId: s3, actions: ['arm','disarm','unlock','lockdown','override'] };
  const g6: Grant = { id: uuidv4(), name: 'Regional Operator', description: 'Operate regional', scope: 'site', targetId: s2, actions: ['arm','disarm','unlock'] };
  const g7: Grant = { id: uuidv4(), name: 'Warehouse Access', description: 'Warehouse access', scope: 'site', targetId: s4, actions: ['arm','disarm','unlock'] };
  const g8: Grant = { id: uuidv4(), name: 'Task Manager', description: 'Manage tasks globally', scope: 'global', actions: ['manage_tasks'] };
  const grants: Grant[] = [g1,g2,g3,g4,g5,g6,g7,g8];

  // ── Users ──────────────────────────────────────────────────────────────────
  const names = [
    'Alice Chen','Bob Martinez','Carol Smith','David Johnson','Eve Williams',
    'Frank Brown','Grace Lee','Henry Davis','Iris Wilson','Jack Anderson',
    'Karen Taylor','Leo Thomas','Mia Jackson','Nathan White','Olivia Harris',
    'Paul Martin','Quinn Thompson','Rachel Garcia','Sam Robinson','Tina Clark',
    'Uma Lewis','Victor Walker','Wendy Hall','Xavier Young','Yara Allen',
    'Zoe King','Aaron Wright','Bella Scott','Carlos Green','Diana Adams',
  ];
  const depts = ['Engineering','Security','Operations','Executive','Facilities'];
  const roles = ['Engineer','Security Officer','Operator','Director','Facilities Manager','Analyst','Administrator'];
  const clearances: User['clearanceLevel'][] = ['Unclassified','Confidential','Secret','TopSecret'];

  const users: User[] = names.map((name, i) => ({
    id: uuidv4(),
    name,
    email: `${name.toLowerCase().replace(' ','.')}@example.com`,
    department: depts[i % 5],
    role: roles[i % 7],
    clearanceLevel: clearances[i % 4],
    status: i === 5 ? 'Suspended' : i === 12 ? 'Pending' : 'Active',
    customAttributes: { team: depts[i % 5].toLowerCase(), shift: i % 2 === 0 ? 'Day' : 'Night' },
    grantedPermissions: i === 0 ? [g1.id] : [],
    groupIds: [],
  }));

  // ── Groups (universal) ─────────────────────────────────────────────────────
  // Helper to build GroupMember from user
  const um = (u: User): GroupMember => ({ entityType: 'user', entityId: u.id });
  const dm = (d: Door): GroupMember => ({ entityType: 'door', entityId: d.id });
  const zm = (z: Zone): GroupMember => ({ entityType: 'zone', entityId: z.id });

  // Rule helpers
  const rule = (leftSide: string, operator: Rule['operator'], rightSide: string | string[]): Rule =>
    ({ id: uuidv4(), leftSide, operator, rightSide });

  const grp_exec: Group = {
    id: uuidv4(), name: 'Executives', description: 'Executive leadership team',
    members: users.filter(u => u.department === 'Executive').map(um),
    membershipRules: [], membershipLogic: 'AND', membershipType: 'explicit',
    targetEntityType: 'user', inheritedPermissions: [g1.id],
  };

  const grp_sec: Group = {
    id: uuidv4(), name: 'Senior Security', description: 'Active security officers',
    members: [],
    membershipRules: [
      rule('user.department', '==', 'Security'),
      rule('user.status', '==', 'Active'),
    ],
    membershipLogic: 'AND', membershipType: 'dynamic',
    targetEntityType: 'user', inheritedPermissions: [g3.id, g4.id, g6.id],
  };

  const grp_ops: Group = {
    id: uuidv4(), name: 'Operations Team', description: 'Operations staff',
    members: users.filter(u => u.department === 'Operations').map(um),
    membershipRules: [], membershipLogic: 'AND', membershipType: 'explicit',
    targetEntityType: 'user', inheritedPermissions: [g2.id, g8.id],
  };

  const grp_eng: Group = {
    id: uuidv4(), name: 'Engineering Lead', description: 'Engineering with Secret+ clearance',
    members: [],
    membershipRules: [
      rule('user.department', '==', 'Engineering'),
      rule('user.clearanceLevel', '>=', 'Secret'),
    ],
    membershipLogic: 'AND', membershipType: 'dynamic',
    targetEntityType: 'user', inheritedPermissions: [g4.id, g5.id],
  };

  const grp_fac: Group = {
    id: uuidv4(), name: 'Facilities', description: 'Facilities management',
    members: users.filter(u => u.department === 'Facilities').map(um),
    membershipRules: [], membershipLogic: 'AND', membershipType: 'explicit',
    targetEntityType: 'user', inheritedPermissions: [g3.id, g7.id],
  };

  const grp_ro: Group = {
    id: uuidv4(), name: 'Read-Only', description: 'Audit read-only access',
    members: [users[20], users[21], users[22]].map(um),
    membershipRules: [], membershipLogic: 'AND', membershipType: 'explicit',
    targetEntityType: 'user', inheritedPermissions: [g2.id],
  };

  const grp_high_doors: Group = {
    id: uuidv4(), name: 'High Security Doors', description: 'Doors with High or Critical security level',
    members: [],
    membershipRules: [rule('door.securityLevel', 'IN', ['High', 'Critical'])],
    membershipLogic: 'AND', membershipType: 'dynamic',
    targetEntityType: 'door', inheritedPermissions: [],
  };

  const grp_secure_zones: Group = {
    id: uuidv4(), name: 'Secure Zones', description: 'Zones of type Secure',
    members: [z_hq_sec, z_dc_sec, z_ex_sec].map(zm),
    membershipRules: [rule('zone.type', '==', 'Secure')],
    membershipLogic: 'AND', membershipType: 'hybrid',
    targetEntityType: 'zone', inheritedPermissions: [],
  };

  const groups: Group[] = [grp_exec, grp_sec, grp_ops, grp_eng, grp_fac, grp_ro, grp_high_doors, grp_secure_zones];

  // Update user groupIds for explicit groups (so RBAC hasPermission works without full dynamic eval on users page)
  users.forEach(u => {
    for (const g of groups) {
      if (g.membershipType !== 'explicit' && g.membershipType !== 'hybrid') continue;
      if (g.targetEntityType !== 'user' && g.targetEntityType !== 'any') continue;
      if (g.members.some(m => m.entityType === 'user' && m.entityId === u.id)) {
        u.groupIds.push(g.id);
      }
    }
  });

  sites[0].assignedManagerIds = [users[0].id, users[1].id];
  sites[1].assignedManagerIds = [users[5].id];
  sites[2].assignedManagerIds = [users[10].id];

  // ── ABAC Policies ──────────────────────────────────────────────────────────
  const policies: Policy[] = [
    {
      id: uuidv4(), name: 'Engineering Department Only', description: 'Allow only Engineering members',
      rules: [rule('user.department', '==', 'Engineering')],
      logicalOperator: 'AND', doorIds: [d3.id, d4.id],
    },
    {
      id: uuidv4(), name: 'Cross-entity Clearance Check', description: 'User clearance must meet door requirement',
      rules: [rule('user.clearanceLevel', '>=', 'door.requiredClearance')],
      logicalOperator: 'AND', doorIds: [d3.id, d7.id, d8.id, d12.id],
    },
    {
      id: uuidv4(), name: 'Security Team Active', description: 'Active security officers only',
      rules: [
        rule('user.department', '==', 'Security'),
        rule('user.status', '==', 'Active'),
      ],
      logicalOperator: 'AND', doorIds: [d1.id, d2.id],
    },
    {
      id: uuidv4(), name: 'Ops or Facilities', description: 'Operations or Facilities teams',
      rules: [rule('user.department', 'IN', ['Operations', 'Facilities'])],
      logicalOperator: 'AND', doorIds: [d10.id, d11.id],
    },
    {
      id: uuidv4(), name: 'Engineering Lead & High Security Door', description: 'User in Engineering Lead group AND door in High Security Doors group',
      rules: [
        rule('user', 'IN', 'group.Engineering Lead'),
        rule('door', 'IN', 'group.High Security Doors'),
      ],
      logicalOperator: 'AND', doorIds: [d3.id, d7.id, d8.id],
    },
    {
      id: uuidv4(), name: 'TopSecret Executive Access', description: 'TopSecret clearance + Executive dept',
      rules: [
        rule('user.clearanceLevel', '==', 'TopSecret'),
        rule('user.department', '==', 'Executive'),
      ],
      logicalOperator: 'AND', doorIds: [d12.id],
    },
  ];

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const taskTitles = [
    'Monthly fire exit inspection','CCTV calibration','Door controller firmware update',
    'Access audit Q1','Smoke detector test','Badge reader replacement – HQ',
    'Incident report review','Staff security training','Data centre cooling check',
    'Perimeter fence repair','Key card issuance audit','Emergency lighting test',
    'Lockdown drill preparation','Visitor access policy review','Annual security assessment',
  ];
  const tasks: Task[] = taskTitles.map((title, i) => ({
    id: uuidv4(), title,
    description: 'Scheduled task for facility maintenance and security operations.',
    siteId: sites[i % 5].id, zoneId: zones[i % zones.length].id,
    assignedToUserId: users[i % users.length].id, createdByUserId: users[0].id,
    priority: (['Low','Medium','High','Critical'] as Task['priority'][])[i % 4],
    status: (['Open','InProgress','Blocked','Complete','Open'] as Task['status'][])[i % 5],
    dueDate: new Date(Date.now() + (i - 7) * 86400000).toISOString().split('T')[0],
    category: (['Inspection','Maintenance','Incident','Audit','Training','Other'] as Task['category'][])[i % 6],
    notes: [],
  }));

  // ── Arming Logs ────────────────────────────────────────────────────────────
  const armingLogs: ArmingLog[] = Array.from({ length: 10 }, (_, i) => ({
    id: uuidv4(), timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    userName: users[i % users.length].name,
    action: ['Armed','Disarmed','Partial Arm','Lockdown','Clear Alarm'][i % 5],
    siteName: sites[i % 5].name, result: i === 3 ? 'Denied' : 'Success',
  }));

  const store = useStore.getState();
  store.setUsers(users); store.setGroups(groups); store.setGrants(grants);
  store.setSites(sites); store.setZones(zones); store.setDoors(doors);
  store.setControllers(controllers); store.setPolicies(policies);
  store.setTasks(tasks); store.setArmingLogs(armingLogs);
}
```

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/data/testData.ts
git commit -m "feat(abac): regenerate test data with universal groups, cross-entity attributes, membership policies"
```

---

## Task 5: Update Policies page

**Files:** Modify `src/pages/Policies.tsx`

- [ ] **Replace the `RuleDraft`/inline rule builder section** — swap the draft types and rule builder JSX with imports of `RuleBuilder` and updated field names. Replace the full file:

```typescript
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react';
import { useStore } from '../store/store';
import type { Policy, Rule } from '../types';
import RuleBuilder from '../components/RuleBuilder';

interface PolicyDraft {
  name: string;
  description: string;
  logicalOperator: 'AND' | 'OR';
  rules: Rule[];
  doorIds: string[];
}

const emptyDraft = (): PolicyDraft => ({
  name: '', description: '', logicalOperator: 'AND', rules: [], doorIds: [],
});

const policyToDraft = (p: Policy): PolicyDraft => ({
  name: p.name, description: p.description,
  logicalOperator: p.logicalOperator,
  rules: p.rules.map(r => ({ ...r })),
  doorIds: [...p.doorIds],
});

function ruleDisplay(r: Rule): string {
  const right = Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide;
  return `${r.leftSide} ${r.operator} ${right}`;
}

export default function Policies() {
  const policies = useStore(s => s.policies);
  const doors = useStore(s => s.doors);
  const addPolicy = useStore(s => s.addPolicy);
  const updatePolicy = useStore(s => s.updatePolicy);
  const deletePolicy = useStore(s => s.deletePolicy);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PolicyDraft>(emptyDraft());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(p: Policy) {
    setEditingId(p.id);
    setDraft(policyToDraft(p));
    setModalOpen(true);
  }

  function save() {
    if (!draft.name.trim()) return;
    if (editingId) {
      updatePolicy({ id: editingId, name: draft.name, description: draft.description, logicalOperator: draft.logicalOperator, rules: draft.rules, doorIds: draft.doorIds });
    } else {
      addPolicy({ id: uuidv4(), name: draft.name, description: draft.description, logicalOperator: draft.logicalOperator, rules: draft.rules, doorIds: draft.doorIds });
    }
    setModalOpen(false);
  }

  function toggleDoor(id: string) {
    setDraft(d => ({ ...d, doorIds: d.doorIds.includes(id) ? d.doorIds.filter(x => x !== id) : [...d.doorIds, id] }));
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">ABAC Policies</h1>
          <p className="text-sm text-slate-400 mt-1">{policies.length} policies</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      <div className="space-y-3">
        {policies.map(p => {
          const expanded = expandedId === p.id;
          const assignedDoors = doors.filter(d => p.doorIds.includes(d.id));
          return (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setExpandedId(expanded ? null : p.id)} className="text-slate-400 hover:text-slate-200">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100">{p.name}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.logicalOperator === 'AND' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>{p.logicalOperator}</span>
                    <span className="text-xs text-slate-500">{p.rules.length} rules · {p.doorIds.length} doors</span>
                  </div>
                  {p.description && <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDeleteId(p.id)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Rules</p>
                    <div className="space-y-1">
                      {p.rules.map(r => (
                        <div key={r.id} className="text-xs font-mono bg-slate-900 rounded px-3 py-1.5 text-slate-300">
                          {ruleDisplay(r)}
                        </div>
                      ))}
                      {p.rules.length === 0 && <p className="text-xs text-slate-500 italic">No rules</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Assigned Doors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedDoors.map(d => <span key={d.id} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{d.name}</span>)}
                      {assignedDoors.length === 0 && <span className="text-xs text-slate-500 italic">None</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {policies.length === 0 && <p className="text-slate-500 text-sm italic text-center py-12">No policies. Add one to get started.</p>}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">{editingId ? 'Edit Policy' : 'Add Policy'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-200 text-xl">×</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
                  <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                  <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} rows={2} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Logical Operator</label>
                  <div className="flex gap-3">
                    {(['AND','OR'] as const).map(op => (
                      <label key={op} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={draft.logicalOperator === op} onChange={() => setDraft(d => ({ ...d, logicalOperator: op }))} className="accent-blue-500" />
                        <span className={`text-sm font-bold ${op === 'AND' ? 'text-blue-400' : 'text-purple-400'}`}>{op}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Rules</label>
                  <RuleBuilder rules={draft.rules} onChange={rules => setDraft(d => ({ ...d, rules }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Assigned Doors</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto bg-slate-800 rounded p-2">
                    {doors.map(d => (
                      <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 rounded px-2 py-1">
                        <input type="checkbox" checked={draft.doorIds.includes(d.id)} onChange={() => toggleDoor(d.id)} className="accent-blue-500" />
                        <span className="text-xs text-slate-300">{d.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700">
              <button onClick={() => setModalOpen(false)} className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2">Cancel</button>
              <button onClick={save} disabled={!draft.name.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm mx-4">
            <p className="text-slate-200 mb-4">Delete this policy?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5">Cancel</button>
              <button onClick={() => { deletePolicy(confirmDeleteId); setConfirmDeleteId(null); }} className="bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/pages/Policies.tsx
git commit -m "feat(abac): Policies page uses shared RuleBuilder with leftSide/rightSide rule format"
```

---

## Task 6: Rewrite Groups page

**Files:** Rewrite `src/pages/Groups.tsx`

- [ ] **Replace the entire file:**

```typescript
import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronDown, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react';
import { useStore } from '../store/store';
import type { Group, GroupMember, Rule } from '../types';
import RuleBuilder from '../components/RuleBuilder';

type EntityType = GroupMember['entityType'];
type MembershipType = Group['membershipType'];
type TargetEntityType = Group['targetEntityType'];

interface GroupDraft {
  name: string;
  description: string;
  targetEntityType: TargetEntityType;
  membershipType: MembershipType;
  members: GroupMember[];
  membershipRules: Rule[];
  membershipLogic: 'AND' | 'OR';
  inheritedPermissions: string[];
}

const emptyDraft = (): GroupDraft => ({
  name: '', description: '',
  targetEntityType: 'user', membershipType: 'explicit',
  members: [], membershipRules: [], membershipLogic: 'AND',
  inheritedPermissions: [],
});

const groupToDraft = (g: Group): GroupDraft => ({
  name: g.name, description: g.description,
  targetEntityType: g.targetEntityType, membershipType: g.membershipType,
  members: [...g.members],
  membershipRules: g.membershipRules.map(r => ({ ...r })),
  membershipLogic: g.membershipLogic,
  inheritedPermissions: [...g.inheritedPermissions],
});

const TARGET_TYPES: TargetEntityType[] = ['user','door','zone','site','controller','any'];
const MEMBERSHIP_TYPES: MembershipType[] = ['explicit','dynamic','hybrid'];

export default function Groups() {
  const users = useStore(s => s.users);
  const groups = useStore(s => s.groups);
  const grants = useStore(s => s.grants);
  const doors = useStore(s => s.doors);
  const zones = useStore(s => s.zones);
  const sites = useStore(s => s.sites);
  const controllers = useStore(s => s.controllers);
  const addGroup = useStore(s => s.addGroup);
  const updateGroup = useStore(s => s.updateGroup);
  const deleteGroup = useStore(s => s.deleteGroup);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft());
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Entity lists for the member picker keyed by targetEntityType
  const entityList = useMemo<{ id: string; label: string }[]>(() => {
    switch (draft.targetEntityType) {
      case 'user': return users.map(u => ({ id: u.id, label: `${u.name} (${u.department})` }));
      case 'door': return doors.map(d => ({ id: d.id, label: d.name }));
      case 'zone': return zones.map(z => ({ id: z.id, label: z.name }));
      case 'site': return sites.map(s => ({ id: s.id, label: s.name }));
      case 'controller': return controllers.map(c => ({ id: c.id, label: c.name }));
      case 'any': return [];
    }
  }, [draft.targetEntityType, users, doors, zones, sites, controllers]);

  const filteredEntities = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return entityList.filter(e => e.label.toLowerCase().includes(q));
  }, [entityList, memberSearch]);

  function isMember(entityId: string): boolean {
    return draft.members.some(m => m.entityId === entityId);
  }

  function toggleMember(entityId: string) {
    const type = draft.targetEntityType as EntityType;
    setDraft(d => ({
      ...d,
      members: isMember(entityId)
        ? d.members.filter(m => m.entityId !== entityId)
        : [...d.members, { entityType: type, entityId }],
    }));
  }

  function toggleGrant(grantId: string) {
    setDraft(d => ({
      ...d,
      inheritedPermissions: d.inheritedPermissions.includes(grantId)
        ? d.inheritedPermissions.filter(x => x !== grantId)
        : [...d.inheritedPermissions, grantId],
    }));
  }

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setMemberSearch('');
    setModalOpen(true);
  }

  function openEdit(g: Group) {
    setEditingId(g.id);
    setDraft(groupToDraft(g));
    setMemberSearch('');
    setModalOpen(true);
  }

  function save() {
    if (!draft.name.trim()) return;
    const g: Group = {
      id: editingId ?? uuidv4(),
      name: draft.name, description: draft.description,
      members: draft.members,
      membershipRules: draft.membershipRules,
      membershipLogic: draft.membershipLogic,
      membershipType: draft.membershipType,
      targetEntityType: draft.targetEntityType,
      inheritedPermissions: draft.inheritedPermissions,
    };
    if (editingId) updateGroup(g); else addGroup(g);
    setModalOpen(false);
  }

  // Display helpers
  function resolveMemberLabel(m: GroupMember): string {
    switch (m.entityType) {
      case 'user': return users.find(u => u.id === m.entityId)?.name ?? m.entityId;
      case 'door': return doors.find(d => d.id === m.entityId)?.name ?? m.entityId;
      case 'zone': return zones.find(z => z.id === m.entityId)?.name ?? m.entityId;
      case 'site': return sites.find(s => s.id === m.entityId)?.name ?? m.entityId;
      case 'controller': return controllers.find(c => c.id === m.entityId)?.name ?? m.entityId;
    }
  }

  const membershipTypeBadge = (t: MembershipType) => {
    const map: Record<MembershipType, string> = {
      explicit: 'bg-slate-700 text-slate-300',
      dynamic: 'bg-blue-900 text-blue-300',
      hybrid: 'bg-purple-900 text-purple-300',
    };
    return map[t];
  };

  const showExplicitPicker = draft.membershipType === 'explicit' || draft.membershipType === 'hybrid';
  const showDynamicRules = draft.membershipType === 'dynamic' || draft.membershipType === 'hybrid';
  const showGrants = draft.targetEntityType === 'user' || draft.targetEntityType === 'any';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Groups</h1>
          <p className="text-sm text-slate-400 mt-1">{groups.length} groups</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      <div className="space-y-3">
        {groups.map(g => {
          const expanded = expandedId === g.id;
          return (
            <div key={g.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setExpandedId(expanded ? null : g.id)} className="text-slate-400 hover:text-slate-200">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100">{g.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${membershipTypeBadge(g.membershipType)}`}>{g.membershipType}</span>
                    <span className="text-xs text-slate-500">{g.targetEntityType}</span>
                    {g.members.length > 0 && <span className="text-xs bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded">{g.members.length} explicit</span>}
                    {g.membershipRules.length > 0 && <span className="text-xs bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">{g.membershipRules.length} rules</span>}
                  </div>
                  {g.description && <p className="text-xs text-slate-400 mt-0.5">{g.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(g)} className="text-slate-400 hover:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDeleteId(g.id)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expanded && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {g.members.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Explicit Members</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.members.map((m, i) => (
                          <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{resolveMemberLabel(m)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.membershipRules.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Membership Rules ({g.membershipLogic})</p>
                      <div className="space-y-1">
                        {g.membershipRules.map(r => (
                          <div key={r.id} className="text-xs font-mono bg-slate-900 rounded px-2 py-1 text-slate-300">
                            {r.leftSide} {r.operator} {Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.inheritedPermissions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Inherited Grants</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.inheritedPermissions.map(gid => {
                          const gr = grants.find(x => x.id === gid);
                          return gr ? <span key={gid} className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded">{gr.name}</span> : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <p className="text-slate-500 text-sm italic text-center py-12">No groups yet.</p>}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">{editingId ? 'Edit Group' : 'Add Group'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-200 text-xl">×</button>
            </div>
            <div className="px-5 py-4 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name *</label>
                  <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                  <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Target Entity Type</label>
                    <select value={draft.targetEntityType} onChange={e => setDraft(d => ({ ...d, targetEntityType: e.target.value as TargetEntityType, members: [] }))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Membership Type</label>
                    <select value={draft.membershipType} onChange={e => setDraft(d => ({ ...d, membershipType: e.target.value as MembershipType }))} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {MEMBERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {showExplicitPicker && draft.targetEntityType !== 'any' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Explicit Members ({draft.members.length} selected)</label>
                  <input type="text" placeholder="Search..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="w-full mb-2 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <div className="max-h-40 overflow-y-auto bg-slate-800 rounded p-2 space-y-0.5">
                    {filteredEntities.map(e => (
                      <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 rounded px-2 py-1">
                        <input type="checkbox" checked={isMember(e.id)} onChange={() => toggleMember(e.id)} className="accent-blue-500" />
                        <span className="text-xs text-slate-300">{e.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {showDynamicRules && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="block text-xs font-medium text-slate-400">Membership Rules</label>
                    <div className="flex gap-2">
                      {(['AND','OR'] as const).map(op => (
                        <label key={op} className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={draft.membershipLogic === op} onChange={() => setDraft(d => ({ ...d, membershipLogic: op }))} className="accent-blue-500" />
                          <span className={`text-xs font-bold ${op === 'AND' ? 'text-blue-400' : 'text-purple-400'}`}>{op}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <RuleBuilder rules={draft.membershipRules} onChange={rules => setDraft(d => ({ ...d, membershipRules: rules }))} />
                </div>
              )}

              {showGrants && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Inherited Grants</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto bg-slate-800 rounded p-2">
                    {grants.map(gr => (
                      <label key={gr.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 rounded px-2 py-1">
                        <input type="checkbox" checked={draft.inheritedPermissions.includes(gr.id)} onChange={() => toggleGrant(gr.id)} className="accent-blue-500" />
                        <span className="text-xs text-slate-300">{gr.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700">
              <button onClick={() => setModalOpen(false)} className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2">Cancel</button>
              <button onClick={save} disabled={!draft.name.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm mx-4">
            <p className="text-slate-200 mb-4">Delete this group?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5">Cancel</button>
              <button onClick={() => { deleteGroup(confirmDeleteId); setConfirmDeleteId(null); }} className="bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/pages/Groups.tsx
git commit -m "feat(abac): Groups page supports universal entity membership and dynamic rules"
```

---

## Task 7: Add customAttributes editor to Doors, Sites, Controllers

**Files:** Modify `src/pages/Doors.tsx`, `src/pages/Sites.tsx`, `src/pages/Controllers.tsx`

### 7a — Shared attribute editor component

- [ ] **Create `src/components/AttributeEditor.tsx`:**

```typescript
import { Plus, Trash2 } from 'lucide-react';

interface AttributeEditorProps {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

export default function AttributeEditor({ value, onChange }: AttributeEditorProps) {
  const pairs = Object.entries(value);

  function set(key: string, val: string) {
    onChange({ ...value, [key]: val });
  }

  function remove(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function add() {
    let k = 'key';
    let n = 1;
    while (k in value) { k = `key${n++}`; }
    onChange({ ...value, [k]: '' });
  }

  return (
    <div className="space-y-1.5">
      {pairs.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <input
            value={k}
            onChange={e => { remove(k); set(e.target.value, v); }}
            placeholder="key"
            className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-slate-500 text-xs">=</span>
          <input
            value={v}
            onChange={e => set(k, e.target.value)}
            placeholder="value"
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button type="button" onClick={() => remove(k)} className="text-slate-500 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add attribute
      </button>
    </div>
  );
}
```

### 7b — Doors.tsx

- [ ] **In `src/pages/Doors.tsx`, add `customAttributes` to the `FormState` interface and `emptyForm`:**

Find the `FormState` interface and `emptyForm` constant and update them:
```typescript
// Add to FormState interface
  customAttributes: Record<string, string>;

// Update emptyForm
  customAttributes: {},
```

- [ ] **Add `AttributeEditor` to the Doors modal form** — find the closing section of the modal form fields and add before the closing `</div>` of the form:

```typescript
import AttributeEditor from '../components/AttributeEditor';
// ... inside modal form, after lockState field:
<div>
  <label className="block text-xs font-medium text-slate-400 mb-2">Custom Attributes</label>
  <AttributeEditor
    value={form.customAttributes}
    onChange={v => setForm(f => ({ ...f, customAttributes: v }))}
  />
</div>
```

- [ ] **In the `openEdit` handler in Doors.tsx**, populate `customAttributes` from the door:
Find where form is set from the door object and add `customAttributes: door.customAttributes ?? {}`.

- [ ] **In the save handler in Doors.tsx**, include `customAttributes: form.customAttributes` when calling `addDoor`/`updateDoor`.

- [ ] **In Sites.tsx**, apply the same pattern: add `customAttributes: Record<string, string>` to both the site form state and zone form state, wire up `AttributeEditor` in both the site modal and zone modal.

- [ ] **In Controllers.tsx**, apply the same pattern: add `customAttributes: Record<string, string>` to the controller form state, wire up `AttributeEditor` in the controller modal.

- [ ] **Verify build:**
```bash
cd abac-soc-demo-v2 && npm run build 2>&1 | grep "error TS"
```

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/components/AttributeEditor.tsx abac-soc-demo-v2/src/pages/Doors.tsx abac-soc-demo-v2/src/pages/Sites.tsx abac-soc-demo-v2/src/pages/Controllers.tsx
git commit -m "feat(abac): add customAttributes editor to Doors, Sites/Zones, Controllers"
```

---

## Task 8: Update TestAccess and AccessMatrix

**Files:** Modify `src/pages/TestAccess.tsx`, `src/pages/AccessMatrix.tsx`

### 8a — TestAccess

- [ ] **Replace `src/pages/TestAccess.tsx` with:**

```typescript
import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/store';
import type { AccessResult, Door, StoreSnapshot } from '../types';
import { evaluateAccess } from '../engine/accessEngine';

export default function TestAccess() {
  const users = useStore(s => s.users);
  const doors = useStore(s => s.doors);
  const policies = useStore(s => s.policies);
  const groups = useStore(s => s.groups);
  const grants = useStore(s => s.grants);
  const sites = useStore(s => s.sites);
  const zones = useStore(s => s.zones);
  const controllers = useStore(s => s.controllers);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDoorId, setSelectedDoorId] = useState('');
  const [result, setResult] = useState<AccessResult | null>(null);

  const selectedUser = users.find(u => u.id === selectedUserId) ?? null;
  const selectedDoor = doors.find(d => d.id === selectedDoorId) ?? null;

  function getSiteName(door: Door): string {
    return sites.find(s => s.id === door.siteId)?.name ?? door.siteId;
  }

  function handleEvaluate() {
    if (!selectedUser || !selectedDoor) return;
    const store: StoreSnapshot = {
      allUsers: users, allDoors: doors, allZones: zones,
      allSites: sites, allControllers: controllers, allGroups: groups,
    };
    setResult(evaluateAccess(selectedUser, selectedDoor, policies, groups, grants, store));
  }

  const assignedPolicies = selectedDoor ? policies.filter(p => p.doorIds.includes(selectedDoor.id)) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Test Access</h1>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">User</label>
            <select className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedUserId} onChange={e => { setSelectedUserId(e.target.value); setResult(null); }}>
              <option value="">Select a user...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.department}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Door</label>
            <select className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDoorId} onChange={e => { setSelectedDoorId(e.target.value); setResult(null); }}>
              <option value="">Select a door...</option>
              {doors.map(d => <option key={d.id} value={d.id}>{d.name} — {getSiteName(d)}</option>)}
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

      {result && (
        <div className="space-y-4">
          {/* Permission layer */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Permission Layer (RBAC)</h2>
            <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full border ${result.permissionGranted ? 'bg-green-900 border-green-700 text-green-300' : 'bg-red-900 border-red-700 text-red-300'}`}>
              {result.permissionGranted ? 'GRANTED' : 'DENIED'}
            </span>
            {result.matchedGrants.length > 0 ? (
              <ul className="space-y-1">
                {result.matchedGrants.map((g, i) => (
                  <li key={i} className="text-sm text-green-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />{g}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No matching grants found.</p>
            )}
          </div>

          {/* ABAC layer */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">ABAC Layer</h2>
            {assignedPolicies.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No policies assigned — ABAC allows by default.</p>
            ) : (
              <div className="space-y-4">
                {result.policyResults.map(pr => (
                  <div key={pr.policyId} className="border border-slate-600 rounded-md overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-700 px-4 py-2">
                      <span className="text-sm font-semibold text-slate-200">{pr.policyName}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${pr.passed ? 'bg-green-900 border-green-700 text-green-300' : 'bg-red-900 border-red-700 text-red-300'}`}>
                        {pr.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-700">
                      {pr.ruleResults.map(rr => {
                        const right = Array.isArray(rr.rightSide) ? rr.rightSide.join(', ') : rr.rightSide;
                        return (
                          <div key={rr.ruleId} className="px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-mono text-slate-300">
                              {rr.leftSide} <span className="text-blue-400">{rr.operator}</span> <span className="text-amber-300">{right}</span>
                            </span>
                            <span className="text-slate-500">→</span>
                            <span className="font-mono text-slate-400">
                              <span className="text-slate-200">{rr.leftResolved}</span>
                              {rr.rightResolved !== right && <> vs <span className="text-slate-200">{rr.rightResolved}</span></>}
                            </span>
                            <span className="text-slate-500">→</span>
                            <span className={`text-xs font-bold ${rr.passed ? 'text-green-300' : 'text-red-300'}`}>{rr.passed ? 'PASS' : 'FAIL'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overall banner */}
          <div className={`rounded-lg border-2 p-6 flex items-center justify-center gap-4 ${result.overallGranted ? 'bg-green-950 border-green-500' : 'bg-red-950 border-red-500'}`}>
            {result.overallGranted ? (
              <><CheckCircle className="w-10 h-10 text-green-400 shrink-0" /><span className="text-3xl font-extrabold tracking-widest text-green-400">ACCESS GRANTED</span></>
            ) : (
              <><XCircle className="w-10 h-10 text-red-400 shrink-0" /><span className="text-3xl font-extrabold tracking-widest text-red-400">ACCESS DENIED</span></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 8b — AccessMatrix

- [ ] **In `src/pages/AccessMatrix.tsx`**, find the `evaluateAccess` call and update it to pass a `StoreSnapshot`. Add these store selectors near the top of the component alongside the existing ones:

```typescript
const zones = useStore(s => s.zones);
const sites = useStore(s => s.sites);
const controllers = useStore(s => s.controllers);
```

- [ ] **Build a memoized store snapshot** (add after store selectors):

```typescript
const storeSnapshot: StoreSnapshot = useMemo(() => ({
  allUsers: users, allDoors: doors, allZones: zones,
  allSites: sites, allControllers: controllers, allGroups: groups,
}), [users, doors, zones, sites, controllers, groups]);
```

Add `import type { StoreSnapshot } from '../types';` and `import { useMemo } from 'react';` if not already present.

- [ ] **Update every `evaluateAccess(user, door, policies, groups, grants)` call** in AccessMatrix to `evaluateAccess(user, door, policies, groups, grants, storeSnapshot)`.

- [ ] **Update the rule result columns** in the breakdown modal table — change column header `Attribute` to `Left Side` and `Expected` to `Right Side`, and update cell references from `r.attribute` to `r.leftSide` and `r.value` to `Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide`.

- [ ] **Run full build:**
```bash
cd abac-soc-demo-v2 && npm run build 2>&1
```
Expected: `✓ built` with zero TypeScript errors.

- [ ] **Commit:**
```bash
git add abac-soc-demo-v2/src/pages/TestAccess.tsx abac-soc-demo-v2/src/pages/AccessMatrix.tsx
git commit -m "feat(abac): update TestAccess and AccessMatrix for new evaluateAccess signature"
```

---

## Task 9: Final verification

- [ ] **Check build is clean:**
```bash
cd abac-soc-demo-v2 && npm run build 2>&1
```
Expected output ends with `✓ built in Xms`, zero `error TS` lines.

- [ ] **Start dev server and verify manually:**
```bash
cd abac-soc-demo-v2 && npm run dev
```
Open `http://localhost:4304` and check:
1. **Dashboard** loads with counts
2. **Groups page** — "Senior Security" and "Engineering Lead" show `dynamic` badge with rules visible when expanded
3. **Groups page** — "High Security Doors" shows `targetEntityType: door`
4. **Policies page** — "Cross-entity Clearance Check" shows rule `user.clearanceLevel >= door.requiredClearance`
5. **Policies page** — "Engineering Lead & High Security Door" shows two membership rules
6. **Test Access** — Select Alice Chen (Engineering, Secret) + HQ Lab Door → should GRANT (Engineering dept, clearance >= Secret)
7. **Test Access** — Select Frank Brown (Security, Suspended) + HQ Main Entrance → should DENY (Security & Active Status policy fails because status = Suspended)
8. **Access Matrix** — loads grid, clicking a cell shows left/right resolved values

- [ ] **Final commit tagging the feature complete:**
```bash
git add -A
git commit -m "feat(abac): universal ABAC complete — entity attributes, cross-entity rules, universal groups"
```
