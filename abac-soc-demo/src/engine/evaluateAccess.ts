import { CLEARANCE_HIERARCHY } from '../types';
import type { 
  User, 
  Door, 
  Policy, 
  AccessResult, 
  Rule, 
  RuleResult, 
  PolicyResult, 
  ClearanceLevel,
  Group,
  Grant,
  ActionType
} from '../types';

export function hasPermission(
  user: User, 
  groups: Group[], 
  grants: Grant[], 
  action: ActionType, 
  siteId?: string, 
  zoneId?: string
): boolean {
  // Get all direct grants
  const userGrants = grants.filter(g => user.grantedPermissions.includes(g.id));
  
  // Get inherited grants
  const userGroups = groups.filter(g => user.groupIds.includes(g.id));
  const groupGrantIds = userGroups.flatMap(g => g.inheritedPermissions);
  const inheritedGrants = grants.filter(g => groupGrantIds.includes(g.id));
  
  const allGrants = [...userGrants, ...inheritedGrants];

  return allGrants.some(grant => {
    if (!grant.actions.includes(action)) return false;

    if (grant.scope === 'global') return true;
    
    if (grant.scope === 'site' && siteId && grant.targetId === siteId) return true;
    
    if (grant.scope === 'zone' && zoneId && grant.targetId === zoneId) return true;
    
    return false;
  });
}

export function evaluateAccess(
  user: User, 
  door: Door, 
  policies: Policy[],
  groups: Group[],
  grants: Grant[]
): AccessResult {
  // 1. Permission check layer (Unlock action for the door's site or zone)
  const permissionGranted = hasPermission(user, groups, grants, 'unlock', door.siteId, door.zoneId);

  // 2. ABAC layer
  const policyResults: PolicyResult[] = policies.map(policy => {
    const ruleResults: RuleResult[] = policy.rules.map(rule => evaluateRule(user, door, rule));
    
    let passed = false;
    if (policy.rules.length === 0) {
      passed = true;
    } else if (policy.logicalOperator === 'AND') {
      passed = ruleResults.every(r => r.passed);
    } else {
      passed = ruleResults.some(r => r.passed);
    }

    return {
      policyId: policy.id,
      policyName: policy.name,
      passed,
      ruleResults
    };
  });

  const matchedPolicy = policyResults.find(p => p.passed);
  const abacGranted = !!matchedPolicy;

  const overallGranted = permissionGranted && abacGranted;

  return {
    permissionGranted,
    abacGranted,
    overallGranted,
    matchedPolicy: matchedPolicy?.policyName,
    policyResults
  };
}

function evaluateRule(user: User, door: Door, rule: Rule): RuleResult {
  const actualValue = getAttributeValue(user, door, rule.attribute);
  let passed = false;
  let reason = '';

  const { operator, value } = rule;

  try {
    switch (operator) {
      case '==':
        passed = actualValue === value;
        reason = passed ? `Matches ${value}` : `Expected ${value}, got ${actualValue}`;
        break;
      case '!=':
        passed = actualValue !== value;
        reason = passed ? `Does not match ${value}` : `Matches forbidden ${value}`;
        break;
      case '>=':
        if (rule.attribute.includes('clearanceLevel')) {
          const actualRank = CLEARANCE_HIERARCHY[actualValue as ClearanceLevel] ?? -1;
          const targetRank = CLEARANCE_HIERARCHY[value as ClearanceLevel] ?? 0;
          passed = actualRank >= targetRank;
          reason = passed ? `Clearance ${actualValue} >= ${value}` : `Insufficient clearance: ${actualValue} < ${value}`;
        } else {
          passed = Number(actualValue) >= Number(value);
          reason = passed ? `${actualValue} >= ${value}` : `${actualValue} < ${value}`;
        }
        break;
      case '<=':
        if (rule.attribute.includes('clearanceLevel')) {
          const actualRank = CLEARANCE_HIERARCHY[actualValue as ClearanceLevel] ?? -1;
          const targetRank = CLEARANCE_HIERARCHY[value as ClearanceLevel] ?? 0;
          passed = actualRank <= targetRank;
          reason = passed ? `Clearance ${actualValue} <= ${value}` : `Excessive clearance: ${actualValue} > ${value}`;
        } else {
          passed = Number(actualValue) <= Number(value);
          reason = passed ? `${actualValue} <= ${value}` : `${actualValue} > ${value}`;
        }
        break;
      case 'IN':
        if (Array.isArray(value)) {
          passed = value.includes(actualValue as string);
          reason = passed ? `${actualValue} is in [${value.join(', ')}]` : `${actualValue} not in [${value.join(', ')}]`;
        } else {
          passed = false;
          reason = 'Invalid rule: value must be an array for IN operator';
        }
        break;
      case 'NOT IN':
        if (Array.isArray(value)) {
          passed = !value.includes(actualValue as string);
          reason = passed ? `${actualValue} is not in [${value.join(', ')}]` : `${actualValue} is in forbidden list [${value.join(', ')}]`;
        } else {
          passed = false;
          reason = 'Invalid rule: value must be an array for NOT IN operator';
        }
        break;
      default:
        passed = false;
        reason = `Unknown operator: ${operator}`;
    }
  } catch (err) {
    passed = false;
    reason = `Error evaluating rule: ${err}`;
  }

  return {
    attribute: rule.attribute,
    operator,
    value,
    actualValue,
    passed,
    reason
  };
}

function getAttributeValue(user: User, door: Door, attribute: string): string | null {
  if (attribute.startsWith('user.')) {
    const key = attribute.replace('user.', '');
    if (key.startsWith('customAttributes.')) {
      const customKey = key.replace('customAttributes.', '');
      return user.customAttributes[customKey] || null;
    }
    return (user as any)[key] || null;
  }
  if (attribute.startsWith('door.')) {
    const key = attribute.replace('door.', '');
    return (door as any)[key] || null;
  }
  return null;
}
