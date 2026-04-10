import type {
  User, Grant, Group, Policy, Door, NamedSchedule,
  NowContext, StoreSnapshot, ActionType,
  AccessResult, GrantResult, PolicyResult, ConditionResult,
} from '../types'
import { evalRule } from './ruleEval'
import { resolveGroupMembership, collectGroupGrants } from './groupEngine'
import { evaluateSchedule, matchesHoliday } from './scheduleEngine'

// ── Grant collection ──────────────────────────────────────────────────────────

/**
 * Returns all grants that apply to this user at this moment.
 * Includes: grants from group membership + auto grants whose conditions pass.
 *
 * Design note — `assigned` vs `conditional` application modes:
 *   - `assigned`:    the grant is explicitly assigned via group membership.
 *                    Conditions are NOT evaluated here — they are purely
 *                    informational metadata on assigned grants. The group
 *                    membership itself is the access decision.
 *   - `conditional`: conditions ARE evaluated and must pass for the grant to
 *                    apply. This is the dynamic, attribute-based gate.
 *   - `auto`:        conditions (if any) are evaluated at collection time.
 *                    If there are no conditions the grant is always collected.
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
      // `assigned` — no condition evaluation; group membership is the sole gate
      result.push(grant)
    }
  }

  // Note: `schedules` parameter is kept for future use / API compatibility
  void schedules

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

    // Check scope covers this door (C5 fix: zone scope now included)
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

  const assignedPolicies = allPolicies.filter((p: Policy) => p.doorIds.includes(door.id))
  const policyResults: PolicyResult[] = []

  for (const policy of assignedPolicies) {
    const ruleResults = policy.rules.map(r => evalRule(r, user, now))
    // H4 fix: empty policy fails closed — no rules means deny, not permit
    const passed = policy.rules.length === 0
      ? false
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
 *
 * C5 fix: accepts optional `zoneId` and checks zone-scoped grants in addition
 * to global and site-scoped grants.
 */
export function hasPermission(
  user: User,
  groups: Group[],
  grants: Grant[],
  action: ActionType,
  now: NowContext,
  schedules: NamedSchedule[],
  siteId?: string,
  zoneId?: string,
): boolean {
  const candidates = collectGrants(user, groups, grants, schedules, now)
  return candidates.some(g =>
    g.actions.includes(action) &&
    (
      g.scope === 'global' ||
      (g.scope === 'site' && g.targetId === siteId) ||
      (g.scope === 'zone' && g.targetId === zoneId)
    )
  )
}
