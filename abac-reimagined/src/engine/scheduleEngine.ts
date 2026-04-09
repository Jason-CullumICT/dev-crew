import type { NamedSchedule, NowContext, DayOfWeek, Holiday } from '../types'

export type ScheduleStatus = 'active' | 'inactive' | 'override_active'

export function buildNowContext(): NowContext {
  const now = new Date()
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    dayOfWeek: days[now.getDay()],
    hour: now.getHours(),
    minute: now.getMinutes(),
    date: now.toISOString().slice(0, 10),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

export function matchesHoliday(now: NowContext, holidays: Holiday[]): Holiday | null {
  return holidays.find(h => h.month === now.month && h.day === now.day) ?? null
}

function isInWindow(now: NowContext, schedule: NamedSchedule): boolean {
  return schedule.windows.some(w => {
    if (!w.days.includes(now.dayOfWeek)) return false
    const [sh, sm] = w.startTime.split(':').map(Number)
    const [eh, em] = w.endTime.split(':').map(Number)
    const current = now.hour * 60 + now.minute
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (start <= end) {
      return current >= start && current < end
    }
    // Overnight window: active from start until midnight, and from midnight until end
    return current >= start || current < end
  })
}

/**
 * Evaluate whether a schedule is active at the given moment.
 *
 * @param schedule       The NamedSchedule to evaluate
 * @param now            Current time context
 * @param grantId        Optional — the grant being checked (for holiday override matching)
 * @param userClearance  Optional — the user's clearanceLevel (for holiday override requirement)
 */
export function evaluateSchedule(
  schedule: NamedSchedule,
  now: NowContext,
  grantId?: string,
  userClearance?: number,
): ScheduleStatus {
  const holiday = matchesHoliday(now, schedule.holidays)

  if (holiday) {
    if (holiday.behavior === 'deny_all') return 'inactive'

    if (holiday.behavior === 'allow_with_override') {
      const grantMatches = grantId !== undefined && holiday.overrideGrantIds.includes(grantId)
      const clearanceOk =
        holiday.requiredClearance === undefined ||
        (userClearance !== undefined && userClearance >= holiday.requiredClearance)
      if (grantMatches && clearanceOk) return 'override_active'
      return 'inactive'
    }
    // behavior === 'normal': fall through to window check
  }

  return isInWindow(now, schedule) ? 'active' : 'inactive'
}
