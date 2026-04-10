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
