import type { User, Group } from '../types'
import { evalRule } from './ruleEval'

function userDirectlyMatchesGroup(user: User, group: Group): boolean {
  if (group.membershipType === 'static') {
    return group.members.includes(user.id)
  }
  if (group.membershipRules.length === 0) return false

  // H3 fix: respect membershipLogic; default to 'AND' for backwards compat
  const logic = group.membershipLogic ?? 'AND'
  const evaluate = (rule: Parameters<typeof evalRule>[0]) => evalRule(rule, user).passed

  return logic === 'OR'
    ? group.membershipRules.some(evaluate)
    : group.membershipRules.every(evaluate)
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
