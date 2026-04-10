import { describe, it, expect } from 'vitest'
import { evaluateSchedule } from './scheduleEngine'
import type { NamedSchedule, NowContext } from '../types'

const schedule: NamedSchedule = {
  id: 's1', name: 'Business Hours', timezone: 'Australia/Sydney',
  windows: [{
    id: 'w1', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '08:00', endTime: '18:00',
  }],
  holidays: [
    {
      id: 'h1', name: 'Christmas Day', month: 12, day: 25,
      behavior: 'deny_all', overrideGrantIds: [],
    },
    {
      id: 'h2', name: 'ANZAC Day', month: 4, day: 25,
      behavior: 'allow_with_override', overrideGrantIds: ['grant-emergency'],
      requiredClearance: 3,
    },
  ],
}

const monMorning: NowContext = {
  dayOfWeek: 'Mon', hour: 10, minute: 0,
  date: '2026-04-06', month: 4, day: 6,
}
const satAfternoon: NowContext = {
  dayOfWeek: 'Sat', hour: 14, minute: 0,
  date: '2026-04-11', month: 4, day: 11,
}
const christmas: NowContext = {
  dayOfWeek: 'Fri', hour: 10, minute: 0,
  date: '2026-12-25', month: 12, day: 25,
}
const anzacDay: NowContext = {
  dayOfWeek: 'Sat', hour: 10, minute: 0,
  date: '2026-04-25', month: 4, day: 25,
}

describe('evaluateSchedule', () => {
  it('returns active on a weekday within business hours', () => {
    expect(evaluateSchedule(schedule, monMorning)).toBe('active')
  })

  it('returns inactive on a weekend', () => {
    expect(evaluateSchedule(schedule, satAfternoon)).toBe('inactive')
  })

  it('returns inactive on Christmas (deny_all holiday)', () => {
    expect(evaluateSchedule(schedule, christmas)).toBe('inactive')
  })

  it('returns inactive on ANZAC Day without override grant', () => {
    expect(evaluateSchedule(schedule, anzacDay)).toBe('inactive')
  })

  it('returns override_active on ANZAC Day with correct override grant and clearance', () => {
    expect(evaluateSchedule(schedule, anzacDay, 'grant-emergency', 3)).toBe('override_active')
  })

  it('returns inactive on ANZAC Day with override grant but insufficient clearance', () => {
    expect(evaluateSchedule(schedule, anzacDay, 'grant-emergency', 2)).toBe('inactive')
  })

  it('handles overnight windows (22:00–06:00)', () => {
    const overnight: NamedSchedule = {
      ...schedule,
      windows: [{ id: 'w2', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '22:00', endTime: '06:00' }],
      holidays: [],
    }
    const lateNight: NowContext = { dayOfWeek: 'Mon', hour: 23, minute: 30, date: '2026-04-06', month: 4, day: 6 }
    const earlyMorn: NowContext = { dayOfWeek: 'Tue', hour: 3, minute: 0, date: '2026-04-07', month: 4, day: 7 }
    const midDay: NowContext = { dayOfWeek: 'Mon', hour: 12, minute: 0, date: '2026-04-06', month: 4, day: 6 }
    expect(evaluateSchedule(overnight, lateNight)).toBe('active')
    expect(evaluateSchedule(overnight, earlyMorn)).toBe('active')
    expect(evaluateSchedule(overnight, midDay)).toBe('inactive')
  })
})
