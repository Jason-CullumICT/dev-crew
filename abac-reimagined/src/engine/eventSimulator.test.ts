// src/engine/eventSimulator.test.ts

import { describe, it, expect } from 'vitest'
import {
  getCondition,
  pickWeightedEventType,
  generateEvent,
  type SimCondition,
} from './eventSimulator'
import type { User, Door, Zone, Site, Controller, SecurityEventType } from '../types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const site: Site = {
  id: 'site-1',
  name: 'Test HQ',
  address: '1 Test St',
  timezone: 'UTC',
  status: 'Disarmed',
}

const siteArmed: Site = { ...site, status: 'Armed' }
const siteLockdown: Site = { ...site, status: 'Lockdown' }

const zone: Zone = {
  id: 'zone-1',
  siteId: 'site-1',
  name: 'Perimeter',
  type: 'Perimeter',
  status: 'Disarmed',
}

const zoneArmed: Zone = { ...zone, status: 'Armed' }
const zoneAlarm: Zone = { ...zone, status: 'Alarm' }

const door: Door = {
  id: 'door-1',
  name: 'Main Entrance',
  siteId: 'site-1',
  zoneId: 'zone-1',
  description: '',
  customAttributes: {},
}

const user: User = {
  id: 'user-1',
  name: 'Alice Smith',
  email: 'alice@test.com',
  department: 'Engineering',
  role: 'engineer',
  clearanceLevel: 2,
  type: 'employee',
  status: 'active',
  customAttributes: {},
}

const controller: Controller = {
  id: 'ctrl-1',
  name: 'Panel A',
  location: 'Lobby',
  siteId: 'site-1',
  doorIds: ['door-1'],
  customAttributes: {},
}

// ── getCondition ──────────────────────────────────────────────────────────────

describe('getCondition', () => {
  it('returns lockdown when site status is Lockdown', () => {
    expect(getCondition(10, 'Lockdown', 'Disarmed')).toBe('lockdown')
  })

  it('returns lockdown when zone status is Alarm regardless of site', () => {
    expect(getCondition(10, 'Disarmed', 'Alarm')).toBe('lockdown')
  })

  it('returns business during business hours with disarmed site', () => {
    expect(getCondition(9, 'Disarmed', 'Disarmed')).toBe('business')
    // Zone Armed (not Alarm) does not force afterhours — site is still Disarmed in business hours
    expect(getCondition(17, 'Disarmed', 'Armed')).toBe('business')
  })

  it('returns business during business hours with PartialArm site', () => {
    expect(getCondition(12, 'PartialArm', 'Disarmed')).toBe('business')
  })

  it('returns afterhours outside business hours even if site is Disarmed', () => {
    expect(getCondition(7, 'Disarmed', 'Disarmed')).toBe('afterhours')
    expect(getCondition(18, 'Disarmed', 'Disarmed')).toBe('afterhours')
    expect(getCondition(23, 'Disarmed', 'Disarmed')).toBe('afterhours')
    expect(getCondition(0, 'Disarmed', 'Disarmed')).toBe('afterhours')
  })

  it('returns afterhours during business hours when site is Armed', () => {
    expect(getCondition(10, 'Armed', 'Disarmed')).toBe('afterhours')
  })

  it('treats hour boundary 8 as business start', () => {
    expect(getCondition(8, 'Disarmed', 'Disarmed')).toBe('business')
  })

  it('treats hour boundary 18 as afterhours', () => {
    expect(getCondition(18, 'Disarmed', 'Disarmed')).toBe('afterhours')
  })
})

// ── pickWeightedEventType ─────────────────────────────────────────────────────

const ALL_EVENT_TYPES: SecurityEventType[] = [
  'access_granted', 'access_denied', 'door_forced', 'door_held',
  'sensor_trip', 'controller_offline', 'arm_state_change', 'panic_button',
  'door_contact_open', 'door_contact_close', 'reader_tamper',
  'device_offline', 'device_online', 'pir_trigger',
]

describe('pickWeightedEventType', () => {
  it('always returns a valid SecurityEventType for each condition', () => {
    const conditions: SimCondition[] = ['business', 'afterhours', 'lockdown']
    for (const condition of conditions) {
      for (let i = 0; i < 20; i++) {
        const result = pickWeightedEventType(condition)
        expect(ALL_EVENT_TYPES).toContain(result)
      }
    }
  })

  it('access_granted dominates in business condition (forcing random to 0)', () => {
    // random() = 0 → cursor starts at 0, first non-zero weight wins
    const result = pickWeightedEventType('business', () => 0)
    expect(result).toBe('access_granted')
  })

  it('access_denied dominates in lockdown condition (forcing random toward high value)', () => {
    // random() = 0.09 → 9% of total 100 = 9, which is inside the access_denied block (starts at 5)
    const result = pickWeightedEventType('lockdown', () => 0.09)
    expect(result).toBe('access_denied')
  })

  it('returns different event types across many samples for business (distribution check)', () => {
    const counts: Partial<Record<SecurityEventType, number>> = {}
    for (let i = 0; i < 1000; i++) {
      const type = pickWeightedEventType('business')
      counts[type] = (counts[type] ?? 0) + 1
    }
    // access_granted should be the most frequent
    const grantedCount = counts['access_granted'] ?? 0
    expect(grantedCount).toBeGreaterThan(600) // ~80% of 1000
  })

  it('returns sensor_trip in afterhours condition (forcing random to mid-range)', () => {
    // afterhours weights: granted=20, denied=30, forced=5, sensor=20, offline=10, arm=15
    // total=100; 20+30+5=55, so random at 0.60 → cursor = 60, after granted(60>20→40), denied(40>30→10), forced(10>5→5), sensor(5>20 no → picks sensor)
    const result = pickWeightedEventType('afterhours', () => 0.6)
    expect(result).toBe('sensor_trip')
  })
})

// ── generateEvent ─────────────────────────────────────────────────────────────

describe('generateEvent', () => {
  const baseInput = {
    users:       [user],
    doors:       [door],
    zones:       [zone],
    sites:       [site],
    controllers: [controller],
    hour:        10, // business hours
  }

  it('produces a SecurityEvent with required fields', () => {
    const event = generateEvent(baseInput)
    expect(event.id).toBeTruthy()
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(['access', 'alarm', 'system', 'intrusion']).toContain(event.category)
    expect(['critical', 'warning', 'info']).toContain(event.severity)
    expect(ALL_EVENT_TYPES).toContain(event.eventType)
    expect(event.siteId).toBe('site-1')
    expect(event.message).toBeTruthy()
    expect(event.metadata).toBeDefined()
  })

  it('sets siteId to the picked site', () => {
    for (let i = 0; i < 10; i++) {
      const event = generateEvent(baseInput)
      expect(event.siteId).toBe('site-1')
    }
  })

  it('sets zoneId when zone belongs to the site', () => {
    const event = generateEvent(baseInput)
    // The only zone belongs to site-1, so it should be picked
    expect(event.zoneId).toBe('zone-1')
  })

  it('sets doorId when door belongs to the site', () => {
    const event = generateEvent(baseInput)
    expect(event.doorId).toBe('door-1')
  })

  it('sets userId for access_granted events', () => {
    // Force access_granted by using random() = 0 (first weight in business table)
    const event = generateEvent(baseInput, () => 0)
    expect(event.eventType).toBe('access_granted')
    expect(event.userId).toBe('user-1')
  })

  it('does not set userId for non-access events like controller_offline', () => {
    // random at ~0.9 should pick controller_offline in business hours
    // business: granted=80, denied=10, forced=1, held=2, sensor=2, offline=5 → total=100
    // 0.92 * 100 = 92; after 80+10+1+2 = 93... actually 0.91 => 91 after 80=11, after 10=1, after 1=-... let's use a deterministic approach
    // We'll just test many events and find a controller_offline
    let foundOffline = false
    for (let i = 0; i < 500; i++) {
      const event = generateEvent(baseInput)
      if (event.eventType === 'controller_offline') {
        expect(event.userId).toBeUndefined()
        foundOffline = true
        break
      }
    }
    // It should appear in 500 samples with 5% probability
    expect(foundOffline).toBe(true)
  })

  it('includes condition in metadata', () => {
    const event = generateEvent(baseInput)
    expect(event.metadata['condition']).toBe('business')
  })

  it('handles empty arrays gracefully (no crash)', () => {
    const emptyInput = {
      users:       [],
      doors:       [],
      zones:       [],
      sites:       [site],
      controllers: [],
      hour:        10,
    }
    expect(() => generateEvent(emptyInput)).not.toThrow()
  })

  it('generates unique IDs across multiple calls', () => {
    const ids = Array.from({ length: 50 }, () => generateEvent(baseInput).id)
    const unique = new Set(ids)
    expect(unique.size).toBe(50)
  })

  it('uses lockdown probabilities when site is in lockdown', () => {
    const lockdownInput = { ...baseInput, sites: [siteLockdown] }
    const counts: Partial<Record<SecurityEventType, number>> = {}
    for (let i = 0; i < 500; i++) {
      const event = generateEvent(lockdownInput)
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1
    }
    // In lockdown, access_denied should dominate (~60%)
    const deniedCount = counts['access_denied'] ?? 0
    expect(deniedCount).toBeGreaterThan(200) // ~60% of 500
  })

  it('zone alarm triggers lockdown condition', () => {
    const alarmZoneInput = { ...baseInput, zones: [zoneAlarm] }
    const counts: Partial<Record<SecurityEventType, number>> = {}
    for (let i = 0; i < 300; i++) {
      const event = generateEvent(alarmZoneInput)
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1
    }
    // In lockdown access_denied dominates, should be >100 of 300
    const deniedCount = counts['access_denied'] ?? 0
    expect(deniedCount).toBeGreaterThan(100)
  })

  it('generates afterhours events outside business hours', () => {
    const nightInput = { ...baseInput, hour: 2 }
    const counts: Partial<Record<SecurityEventType, number>> = {}
    for (let i = 0; i < 500; i++) {
      const event = generateEvent(nightInput)
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1
    }
    // In afterhours, access_denied should appear more than access_granted
    const denied = counts['access_denied'] ?? 0
    const granted = counts['access_granted'] ?? 0
    expect(denied).toBeGreaterThan(granted)
  })

  it('produces correct severity for door_forced (critical)', () => {
    // Generate events until we hit door_forced (weight exists in lockdown table)
    for (let i = 0; i < 500; i++) {
      const event = generateEvent({ ...baseInput, sites: [siteLockdown] })
      if (event.eventType === 'door_forced') {
        expect(event.severity).toBe('critical')
        expect(event.category).toBe('intrusion')
        return
      }
    }
    // door_forced has non-zero weight, so we should find one in 500 tries
    expect.unreachable('door_forced not generated in 500 attempts')
  })

  it('produces correct severity for arm_state_change (info)', () => {
    const armedSiteInput = { ...baseInput, sites: [siteArmed], zones: [zoneArmed], hour: 2 }
    let found = false
    for (let i = 0; i < 500; i++) {
      const event = generateEvent(armedSiteInput)
      if (event.eventType === 'arm_state_change') {
        expect(event.severity).toBe('info')
        expect(event.category).toBe('system')
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })
})
