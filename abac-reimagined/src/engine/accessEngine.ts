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
