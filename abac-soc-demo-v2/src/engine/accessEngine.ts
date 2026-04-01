import type { User, Group, Grant, Door, Policy, ActionType, AccessResult, PolicyResult } from '../types';
import { CLEARANCE_RANK as RANK } from '../types';

// Layer 1: RBAC — does this user hold a grant covering this action+scope?
export function hasPermission(
  user: User,
  groups: Group[],
  grants: Grant[],
  action: ActionType,
  siteId?: string,
  zoneId?: string,
): boolean {
  const grantIds = new Set<string>([
    ...user.grantedPermissions,
    ...groups
      .filter((g) => user.groupIds.includes(g.id))
      .flatMap((g) => g.inheritedPermissions),
  ]);

  for (const grantId of grantIds) {
    const grant = grants.find((g) => g.id === grantId);
    if (!grant) continue;
    if (!grant.actions.includes(action)) continue;

    if (grant.scope === 'global') return true;
    if (grant.scope === 'site' && siteId && grant.targetId === siteId) return true;
    if (grant.scope === 'zone' && zoneId && grant.targetId === zoneId) return true;
  }
  return false;
}

function getMatchedGrants(
  user: User,
  groups: Group[],
  grants: Grant[],
  action: ActionType,
  siteId?: string,
  zoneId?: string,
): string[] {
  const grantIds = new Set<string>([
    ...user.grantedPermissions,
    ...groups
      .filter((g) => user.groupIds.includes(g.id))
      .flatMap((g) => g.inheritedPermissions),
  ]);

  const matched: string[] = [];
  for (const grantId of grantIds) {
    const grant = grants.find((g) => g.id === grantId);
    if (!grant) continue;
    if (!grant.actions.includes(action)) continue;
    if (grant.scope === 'global') { matched.push(grant.name); continue; }
    if (grant.scope === 'site' && siteId && grant.targetId === siteId) { matched.push(grant.name); continue; }
    if (grant.scope === 'zone' && zoneId && grant.targetId === zoneId) { matched.push(grant.name); }
  }
  return matched;
}

function evaluateRule(user: User, rule: { attribute: string; operator: string; value: string | string[] }): { actual: string; passed: boolean } {
  const attr = rule.attribute.toLowerCase();
  let actual = '';

  if (attr === 'department') actual = user.department;
  else if (attr === 'role') actual = user.role;
  else if (attr === 'clearancelevel') actual = user.clearanceLevel;
  else if (attr === 'status') actual = user.status;
  else actual = user.customAttributes[rule.attribute] ?? '';

  let passed = false;
  const op = rule.operator;
  const val = rule.value;

  if (op === '==') passed = actual === val;
  else if (op === '!=') passed = actual !== val;
  else if (op === 'IN') passed = Array.isArray(val) && val.includes(actual);
  else if (op === 'NOT IN') passed = Array.isArray(val) && !val.includes(actual);
  else if (op === '>=' || op === '<=') {
    // Clearance hierarchy comparison
    const actualRank = RANK[actual as keyof typeof RANK] ?? -1;
    const valRank = RANK[val as keyof typeof RANK] ?? -1;
    if (actualRank === -1 || valRank === -1) {
      // Numeric fallback
      const an = parseFloat(actual);
      const vn = parseFloat(val as string);
      passed = op === '>=' ? an >= vn : an <= vn;
    } else {
      passed = op === '>=' ? actualRank >= valRank : actualRank <= valRank;
    }
  }

  return { actual, passed };
}

// Layer 2: ABAC — do any policies assigned to this door match the user's attributes?
export function evaluateAccess(
  user: User,
  door: Door,
  policies: Policy[],
  groups: Group[],
  grants: Grant[],
): AccessResult {
  const permissionGranted = hasPermission(user, groups, grants, 'unlock', door.siteId, door.zoneId);
  const matchedGrants = getMatchedGrants(user, groups, grants, 'unlock', door.siteId, door.zoneId);

  const assignedPolicies = policies.filter((p) => p.doorIds.includes(door.id));

  const policyResults: PolicyResult[] = assignedPolicies.map((policy) => {
    const ruleResults = policy.rules.map((rule) => {
      const { actual, passed } = evaluateRule(user, rule);
      return { ruleId: rule.id, attribute: rule.attribute, operator: rule.operator, value: rule.value, actual, passed };
    });

    const passed =
      policy.rules.length === 0
        ? false
        : policy.logicalOperator === 'AND'
          ? ruleResults.every((r) => r.passed)
          : ruleResults.some((r) => r.passed);

    return { policyId: policy.id, policyName: policy.name, passed, ruleResults };
  });

  const abacGranted = assignedPolicies.length === 0 ? true : policyResults.some((p) => p.passed);
  const matchedPolicy = policyResults.find((p) => p.passed)?.policyName;

  return {
    permissionGranted,
    abacGranted,
    overallGranted: permissionGranted && abacGranted,
    matchedPolicy,
    matchedGrants,
    policyResults,
  };
}
