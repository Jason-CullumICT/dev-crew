import { CLEARANCE_RANK } from '../types';
import type {
  User, Group, Grant, Door, Zone, Site, Controller,
  Policy, ActionType, AccessResult, PolicyResult, RuleResult,
  Rule, Operator, StoreSnapshot, GroupMember, NowContext, GrantResult, Schedule,
  NamedSchedule,
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
  _visitedGroups?: Set<string>;  // internal recursion guard
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

export function isScheduleActive(schedule: Schedule): boolean {
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

// ── Named schedule evaluation ─────────────────────────────────────────────────

export function isNamedScheduleActive(schedule: NamedSchedule): boolean {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone }));
  const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][tzDate.getDay()];
  const h = tzDate.getHours();
  const m = tzDate.getMinutes();
  const localDate = `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(2, '0')}-${String(tzDate.getDate()).padStart(2, '0')}`;

  if (schedule.daysOfWeek.length > 0 && !schedule.daysOfWeek.includes(dayName)) return false;
  if (schedule.validFrom && localDate < schedule.validFrom) return false;
  if (schedule.validUntil && localDate > schedule.validUntil) return false;

  const nowMins = h * 60 + m;
  const [sh, sm] = schedule.startTime.split(':').map(Number);
  const [eh, em] = schedule.endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (startMins < endMins) {
    return nowMins >= startMins && nowMins < endMins;
  }
  // overnight (e.g. 20:00–06:00)
  return nowMins >= startMins || nowMins < endMins;
}

// ── Attribute resolution ──────────────────────────────────────────────────────

const USER_BUILTINS  = new Set(['name','email','department','role','clearanceLevel','status']);
const DOOR_BUILTINS  = new Set(['name','location','lockState','description']);
const ZONE_BUILTINS  = new Set(['name','type','status']);
const SITE_BUILTINS  = new Set(['name','address','status','timezone']);
const CTRL_BUILTINS  = new Set(['name','location']);
const GROUP_BUILTINS = new Set(['name','targetEntityType','membershipType']);
const NOW_BUILTINS   = new Set(['hour','minute','dayOfWeek','dayOfWeekNum','date','month']);
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
    case 'now':
      return getBuiltinOrCustom(ctx.now as unknown as Record<string, unknown>, NOW_BUILTINS, attrKey);
    case 'grant':
      return ctx.grant ? getBuiltinOrCustom(ctx.grant as unknown as Record<string, unknown>, GRANT_BUILTINS, attrKey) : '';
    case 'group': {
      // Resolve against the first group the user belongs to
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
  const { store, now } = baseCtx;
  const ctx: EvalContext = { user: baseCtx.user, now, store };
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
  visitedGroupIds: Set<string> = new Set(),
): boolean {
  if (visitedGroupIds.has(group.id)) return false;
  const visited = new Set(visitedGroupIds);
  visited.add(group.id);

  // Check named schedule gate first (v3 scheduleId approach)
  if (group.scheduleId) {
    const namedSchedule = ctx.store.allSchedules?.find(s => s.id === group.scheduleId);
    if (namedSchedule && !isNamedScheduleActive(namedSchedule)) {
      return false;
    }
  }

  const { membershipType, targetEntityType } = group;

  // Explicit membership
  if (membershipType === 'explicit' || membershipType === 'hybrid') {
    if (group.members.some(m => m.entityType === entityType && m.entityId === entityId)) {
      return true;
    }
  }

  // Dynamic membership (not supported for targetEntityType 'any')
  if ((membershipType === 'dynamic' || membershipType === 'hybrid') && targetEntityType !== 'any') {
    const entityCtx = buildEntityCtx(entityType, entityId, { ...ctx, _visitedGroups: visited });
    if (evaluateRuleSet(group.membershipRules, group.membershipLogic, entityCtx)) {
      return true;
    }
  }

  return false;
}

// ── Rule evaluation ───────────────────────────────────────────────────────────

function compareValues(left: string, op: Operator, right: string | string[]): boolean {
  if (op === '==') {
    const r = Array.isArray(right) ? right[0] ?? '' : right;
    return left === r;
  }
  if (op === '!=') {
    const r = Array.isArray(right) ? right[0] ?? '' : right;
    return left !== r;
  }
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
      inGroup = isEntityInGroup(entityId, leftSide, group, ctx, ctx._visitedGroups ?? new Set());
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

    let included = true;
    // Conditional grants require conditions to pass
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
    // Check named schedule gate for policy (v3)
    if (policy.scheduleId) {
      const namedSchedule = store.allSchedules?.find(s => s.id === policy.scheduleId);
      if (namedSchedule && !isNamedScheduleActive(namedSchedule)) {
        return { policyId: policy.id, policyName: policy.name, passed: false, ruleResults: [] };
      }
    }
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
