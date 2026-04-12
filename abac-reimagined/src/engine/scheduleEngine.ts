import type { NamedSchedule, NowContext, DayOfWeek, Holiday, ScheduleStatus } from '../types'

// ScheduleStatus is imported from types (M14 fix: no local duplicate)

export function buildNowContext(timezone?: string): NowContext {
  const now = new Date()
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (timezone) {
    // C1 fix: use Intl.DateTimeFormat to extract local time parts in the given
    // IANA timezone, so schedules are evaluated against the correct local clock.
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    })
    const parts = Object.fromEntries(
      fmt.formatToParts(now)
        .filter(p => p.type !== 'literal')
        .map(p => [p.type, p.value])
    )

    // weekday short form from Intl may be locale-dependent; map to our DayOfWeek
    const weekdayMap: Record<string, DayOfWeek> = {
      Sun: 'Sun', Mon: 'Mon', Tue: 'Tue', Wed: 'Wed',
      Thu: 'Thu', Fri: 'Fri', Sat: 'Sat',
    }
    const dayOfWeek: DayOfWeek = weekdayMap[parts['weekday']] ?? days[now.getDay()]

    const year = parts['year'] ?? ''
    const month = parts['month'] ?? '01'
    const day = parts['day'] ?? '01'
    const date = `${year}-${month}-${day}`
    const hour = Number(parts['hour'] ?? 0)
    const minute = Number(parts['minute'] ?? 0)
    const monthNum = Number(month)
    const dayNum = Number(day)

    return { dayOfWeek, hour, minute, date, month: monthNum, day: dayNum }
  }

  // No timezone provided — use system local time
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

/** Map a day-of-week to its 0-based index (Sun=0 … Sat=6). */
const DOW_INDEX: Record<DayOfWeek, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}
const DOW_BY_INDEX: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isInWindow(now: NowContext, schedule: NamedSchedule): boolean {
  return schedule.windows.some(w => {
    const [sh, sm] = w.startTime.split(':').map(Number)
    const [eh, em] = w.endTime.split(':').map(Number)
    const current = now.hour * 60 + now.minute
    const start = sh * 60 + sm
    const end = eh * 60 + em

    if (start <= end) {
      // Normal (same-day) window
      return w.days.includes(now.dayOfWeek) && current >= start && current < end
    }

    // C7 fix: overnight window — the window spans midnight.
    //   Case A: we are in the "evening" portion — current day must be in w.days
    if (w.days.includes(now.dayOfWeek) && current >= start) return true

    // Case B: we are in the "morning" portion (current < end) —
    //   the window STARTED on the previous calendar day, so the PREVIOUS
    //   day must be in w.days.
    if (current < end) {
      const todayIdx = DOW_INDEX[now.dayOfWeek]
      const prevIdx = (todayIdx + 6) % 7   // wrap Sunday back to Saturday
      const prevDay = DOW_BY_INDEX[prevIdx]
      if (w.days.includes(prevDay)) return true
    }

    return false
  })
}

/**
 * Evaluate whether a schedule is active at the given moment.
 *
 * @param schedule  The NamedSchedule to evaluate
 * @param now       Current time context
 * @param grantId   Optional — the grant being checked (for holiday override matching)
 */
export function evaluateSchedule(
  schedule: NamedSchedule,
  now: NowContext,
  grantId?: string,
): ScheduleStatus {
  // C1: Callers are responsible for building a timezone-aware NowContext via
  // buildNowContext(schedule.timezone) when real-time evaluation is needed.
  // We trust the passed `now` directly so tests can inject fixed time contexts.

  const holiday = matchesHoliday(now, schedule.holidays)

  if (holiday) {
    if (holiday.behavior === 'deny_all') return 'inactive'

    if (holiday.behavior === 'allow_with_override') {
      const grantMatches = grantId !== undefined && holiday.overrideGrantIds.includes(grantId)
      if (grantMatches) return 'override_active'
      return 'inactive'
    }
    // behavior === 'normal': fall through to window check
  }

  return isInWindow(now, schedule) ? 'active' : 'inactive'
}
