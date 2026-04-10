import type { User, Rule, NowContext, ConditionResult } from '../types'

// ── Attribute resolution ──────────────────────────────────────────────────────

/**
 * Resolve a `user.*` leftSide key to its value on the given User.
 */
function resolveUserAttr(key: string, user: User): string | number {
  switch (key) {
    case 'department':     return user.department
    case 'role':           return user.role
    case 'clearanceLevel': return user.clearanceLevel
    case 'type':           return user.type
    case 'status':         return user.status
    default:               return user.customAttributes[key] ?? ''
  }
}

/**
 * Resolve a rule's leftSide expression.
 *
 * Handles:
 *   - `user.*`  — user attribute lookup
 *   - `now.*`   — time context lookup (requires NowContext)
 *   - anything else — returns empty string
 */
export function resolveLeft(
  leftSide: string,
  user: User,
  now?: NowContext,
): string | number {
  if (leftSide.startsWith('user.')) {
    return resolveUserAttr(leftSide.slice(5), user)
  }
  if (leftSide.startsWith('now.') && now !== undefined) {
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

// ── Single-rule evaluation ────────────────────────────────────────────────────

/**
 * Evaluate one Rule against a user and (optionally) a NowContext.
 *
 * Always returns a ConditionResult so callers can inspect `.passed` or log
 * the full trace. When `now` is omitted, `now.*` left-sides resolve to ''.
 */
export function evalRule(rule: Rule, user: User, now?: NowContext): ConditionResult {
  const leftResolved = String(resolveLeft(rule.leftSide, user, now))
  const right = rule.rightSide

  // For == and !=, when rightSide is an array, use includes / !includes
  // rather than joining to a string (which would never match a single value).
  let passed: boolean
  switch (rule.operator) {
    case '==':
      if (Array.isArray(right)) {
        passed = right.map(String).includes(leftResolved)
      } else {
        passed = leftResolved === String(right)
      }
      break
    case '!=':
      if (Array.isArray(right)) {
        passed = !right.map(String).includes(leftResolved)
      } else {
        passed = leftResolved !== String(right)
      }
      break
    case '>=': passed = Number(leftResolved) >= Number(right); break
    case '<=': passed = Number(leftResolved) <= Number(right); break
    case '>':  passed = Number(leftResolved) > Number(right); break
    case '<':  passed = Number(leftResolved) < Number(right); break
    case 'IN': {
      const vals = Array.isArray(right)
        ? right.map(String)
        : String(right).split(',').map(s => s.trim())
      passed = vals.includes(leftResolved)
      break
    }
    case 'NOT_IN': {
      const vals = Array.isArray(right)
        ? right.map(String)
        : String(right).split(',').map(s => s.trim())
      passed = !vals.includes(leftResolved)
      break
    }
    default: passed = false
  }

  const rightResolved = Array.isArray(right) ? right.join(', ') : String(right)

  return {
    ruleId: rule.id,
    leftSide: rule.leftSide,
    operator: rule.operator,
    rightSide: rule.rightSide,
    leftResolved,
    rightResolved,
    passed,
  }
}
