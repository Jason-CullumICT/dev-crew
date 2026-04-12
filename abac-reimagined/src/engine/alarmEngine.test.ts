// src/engine/alarmEngine.test.ts

import { describe, it, expect } from 'vitest'
import {
  shouldCreateAlarm,
  createAlarm,
  checkRepeatedDenials,
  processEventForAlarm,
} from './alarmEngine'
import type { SecurityEvent, Alarm } from '../types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id:        'evt-1',
    timestamp: new Date().toISOString(),
    category:  'access',
    severity:  'info',
    eventType: 'access_granted',
    siteId:    'site-1',
    message:   'Test event',
    metadata:  {},
    ...overrides,
  }
}

function makeDenialAt(timestamp: Date, doorId = 'door-1'): SecurityEvent {
  return makeEvent({
    id:        `denial-${timestamp.getTime()}-${Math.random()}`,
    timestamp: timestamp.toISOString(),
    eventType: 'access_denied',
    severity:  'warning',
    category:  'access',
    doorId,
  })
}

// ── shouldCreateAlarm ─────────────────────────────────────────────────────────

describe('shouldCreateAlarm', () => {
  it('returns true for door_forced', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'door_forced', severity: 'critical', category: 'intrusion' }))).toBe(true)
  })

  it('returns true for door_held', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'door_held', severity: 'warning', category: 'alarm' }))).toBe(true)
  })

  it('returns true for sensor_trip', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'sensor_trip', severity: 'critical', category: 'intrusion' }))).toBe(true)
  })

  it('returns true for controller_offline', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'controller_offline', severity: 'warning', category: 'system' }))).toBe(true)
  })

  it('returns true for panic_button', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'panic_button', severity: 'critical', category: 'intrusion' }))).toBe(true)
  })

  it('returns false for access_granted', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'access_granted' }))).toBe(false)
  })

  it('returns false for access_denied', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'access_denied', severity: 'warning', category: 'access' }))).toBe(false)
  })

  it('returns false for arm_state_change', () => {
    expect(shouldCreateAlarm(makeEvent({ eventType: 'arm_state_change', category: 'system' }))).toBe(false)
  })
})

// ── createAlarm ───────────────────────────────────────────────────────────────

describe('createAlarm', () => {
  it('creates alarm with state=active and empty notes', () => {
    const event = makeEvent({ eventType: 'door_forced', severity: 'critical', category: 'intrusion', doorId: 'door-1' })
    const alarm = createAlarm(event)
    expect(alarm.state).toBe('active')
    expect(alarm.notes).toEqual([])
    expect(alarm.triggerEventId).toBe(event.id)
  })

  it('generates a unique ID', () => {
    const event = makeEvent({ eventType: 'door_forced', severity: 'critical', category: 'intrusion' })
    const ids = Array.from({ length: 20 }, () => createAlarm(event).id)
    expect(new Set(ids).size).toBe(20)
  })

  it('maps door_forced to critical severity', () => {
    const event = makeEvent({ eventType: 'door_forced', severity: 'info', category: 'intrusion', doorId: 'door-99' })
    const alarm = createAlarm(event)
    expect(alarm.severity).toBe('critical')
  })

  it('maps door_held to warning severity', () => {
    const event = makeEvent({ eventType: 'door_held', severity: 'info', category: 'alarm', doorId: 'door-2' })
    const alarm = createAlarm(event)
    expect(alarm.severity).toBe('warning')
  })

  it('maps sensor_trip to critical severity', () => {
    const event = makeEvent({ eventType: 'sensor_trip', severity: 'info', category: 'intrusion', zoneId: 'zone-1' })
    const alarm = createAlarm(event)
    expect(alarm.severity).toBe('critical')
  })

  it('maps controller_offline to warning severity', () => {
    const event = makeEvent({ eventType: 'controller_offline', severity: 'info', category: 'system' })
    const alarm = createAlarm(event)
    expect(alarm.severity).toBe('warning')
  })

  it('maps panic_button to critical severity', () => {
    const event = makeEvent({ eventType: 'panic_button', severity: 'info', category: 'intrusion' })
    const alarm = createAlarm(event)
    expect(alarm.severity).toBe('critical')
  })

  it('sets title with "Door Forced Open" pattern for door_forced', () => {
    const event = makeEvent({
      eventType: 'door_forced',
      severity: 'critical',
      category: 'intrusion',
      doorId: 'door-3',
      metadata: { doorName: 'Server Room A' },
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Door Forced Open — Server Room A')
  })

  it('sets title with doorId fallback when doorName not in metadata', () => {
    const event = makeEvent({
      eventType: 'door_forced',
      severity: 'critical',
      category: 'intrusion',
      doorId: 'door-42',
      metadata: {},
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Door Forced Open — door-42')
  })

  it('sets title with "Door Held Open" pattern for door_held', () => {
    const event = makeEvent({
      eventType: 'door_held',
      severity: 'warning',
      category: 'alarm',
      doorId: 'door-5',
      metadata: { doorName: 'Loading Bay' },
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Door Held Open — Loading Bay')
  })

  it('sets title with "Sensor Trip" pattern for sensor_trip', () => {
    const event = makeEvent({
      eventType: 'sensor_trip',
      severity: 'critical',
      category: 'intrusion',
      zoneId: 'zone-2',
      metadata: { zoneName: 'Secure Vault' },
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Sensor Trip — Secure Vault')
  })

  it('sets title with "Controller Offline" pattern for controller_offline', () => {
    const event = makeEvent({
      eventType: 'controller_offline',
      severity: 'warning',
      category: 'system',
      metadata: { ctrlName: 'Panel B' },
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Controller Offline — Panel B')
  })

  it('uses controllerId from metadata as fallback for controller_offline', () => {
    const event = makeEvent({
      eventType: 'controller_offline',
      severity: 'warning',
      category: 'system',
      metadata: { controllerId: 'ctrl-77' },
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Controller Offline — ctrl-77')
  })

  it('sets title with "Panic Button" pattern for panic_button', () => {
    const event = makeEvent({
      eventType: 'panic_button',
      severity: 'critical',
      category: 'intrusion',
      doorId: 'door-1',
      metadata: { doorName: 'Reception' },
    })
    const alarm = createAlarm(event)
    expect(alarm.title).toBe('Panic Button — Reception')
  })

  it('copies siteId, zoneId, doorId from event', () => {
    const event = makeEvent({
      eventType: 'sensor_trip',
      severity: 'critical',
      category: 'intrusion',
      siteId:  'site-99',
      zoneId:  'zone-99',
      doorId:  'door-99',
    })
    const alarm = createAlarm(event)
    expect(alarm.siteId).toBe('site-99')
    expect(alarm.zoneId).toBe('zone-99')
    expect(alarm.doorId).toBe('door-99')
  })
})

// ── checkRepeatedDenials ──────────────────────────────────────────────────────

describe('checkRepeatedDenials', () => {
  const now = new Date('2026-01-01T12:00:00.000Z')

  it('returns true when 3 denials at same door within 60s', () => {
    const events = [
      makeDenialAt(new Date(now.getTime() - 10_000)),
      makeDenialAt(new Date(now.getTime() - 20_000)),
      makeDenialAt(new Date(now.getTime() - 30_000)),
    ]
    // Prepend a "latest" event to anchor the time window
    const latest = makeEvent({ timestamp: now.toISOString() })
    expect(checkRepeatedDenials('door-1', [latest, ...events])).toBe(true)
  })

  it('returns false when only 2 denials at same door within 60s', () => {
    const events = [
      makeDenialAt(new Date(now.getTime() - 10_000)),
      makeDenialAt(new Date(now.getTime() - 20_000)),
    ]
    const latest = makeEvent({ timestamp: now.toISOString() })
    expect(checkRepeatedDenials('door-1', [latest, ...events])).toBe(false)
  })

  it('returns false when 3 denials but all older than 60s', () => {
    const events = [
      makeDenialAt(new Date(now.getTime() - 70_000)),
      makeDenialAt(new Date(now.getTime() - 80_000)),
      makeDenialAt(new Date(now.getTime() - 90_000)),
    ]
    const latest = makeEvent({ timestamp: now.toISOString() })
    expect(checkRepeatedDenials('door-1', [latest, ...events])).toBe(false)
  })

  it('returns false when 3 denials are for a different door', () => {
    const events = [
      makeDenialAt(new Date(now.getTime() - 10_000), 'door-2'),
      makeDenialAt(new Date(now.getTime() - 20_000), 'door-2'),
      makeDenialAt(new Date(now.getTime() - 30_000), 'door-2'),
    ]
    const latest = makeEvent({ timestamp: now.toISOString() })
    expect(checkRepeatedDenials('door-1', [latest, ...events])).toBe(false)
  })

  it('counts exactly at the 60s boundary (inclusive)', () => {
    // Event exactly 60000ms before "now" should be included (>= cutoff)
    const events = [
      makeDenialAt(new Date(now.getTime() - 0)),
      makeDenialAt(new Date(now.getTime() - 30_000)),
      makeDenialAt(new Date(now.getTime() - 60_000)), // exactly at cutoff
    ]
    const latest = makeEvent({ timestamp: now.toISOString() })
    expect(checkRepeatedDenials('door-1', [latest, ...events])).toBe(true)
  })

  it('returns false for empty event list', () => {
    expect(checkRepeatedDenials('door-1', [])).toBe(false)
  })

  it('returns true when exactly 3 denials and some are within window', () => {
    const events = [
      makeDenialAt(new Date(now.getTime() - 5_000)),
      makeDenialAt(new Date(now.getTime() - 15_000)),
      makeDenialAt(new Date(now.getTime() - 59_000)),
      // 4th denial outside window — should not count
      makeDenialAt(new Date(now.getTime() - 61_000)),
    ]
    const latest = makeEvent({ timestamp: now.toISOString() })
    expect(checkRepeatedDenials('door-1', [latest, ...events])).toBe(true)
  })
})

// ── processEventForAlarm ──────────────────────────────────────────────────────

describe('processEventForAlarm', () => {
  it('creates alarm for door_forced', () => {
    const event = makeEvent({ eventType: 'door_forced', severity: 'critical', category: 'intrusion' })
    const alarm = processEventForAlarm(event, [], [])
    expect(alarm).not.toBeNull()
    expect(alarm?.severity).toBe('critical')
    expect(alarm?.state).toBe('active')
  })

  it('creates alarm for panic_button', () => {
    const event = makeEvent({ eventType: 'panic_button', severity: 'critical', category: 'intrusion' })
    const alarm = processEventForAlarm(event, [], [])
    expect(alarm).not.toBeNull()
    expect(alarm?.severity).toBe('critical')
  })

  it('creates alarm for controller_offline', () => {
    const event = makeEvent({ eventType: 'controller_offline', severity: 'warning', category: 'system' })
    const alarm = processEventForAlarm(event, [], [])
    expect(alarm).not.toBeNull()
    expect(alarm?.severity).toBe('warning')
  })

  it('returns null for access_granted', () => {
    const event = makeEvent({ eventType: 'access_granted' })
    expect(processEventForAlarm(event, [], [])).toBeNull()
  })

  it('returns null for arm_state_change', () => {
    const event = makeEvent({ eventType: 'arm_state_change', category: 'system' })
    expect(processEventForAlarm(event, [], [])).toBeNull()
  })

  it('creates repeated-denial alarm when 3+ denials at same door in 60s', () => {
    const now = new Date()
    const doorId = 'door-42'
    const pastDenials = [
      makeDenialAt(new Date(now.getTime() - 10_000), doorId),
      makeDenialAt(new Date(now.getTime() - 20_000), doorId),
    ]
    const currentDenial = makeEvent({
      eventType: 'access_denied',
      severity:  'warning',
      category:  'access',
      doorId,
      timestamp: now.toISOString(),
    })
    const alarm = processEventForAlarm(currentDenial, pastDenials, [])
    expect(alarm).not.toBeNull()
    expect(alarm?.severity).toBe('warning')
    expect(alarm?.title).toContain('Repeated Denied Access')
    expect(alarm?.doorId).toBe(doorId)
  })

  it('returns null for access_denied when fewer than 3 in window', () => {
    const doorId = 'door-42'
    const now = new Date()
    const pastDenials = [
      makeDenialAt(new Date(now.getTime() - 10_000), doorId),
    ]
    const currentDenial = makeEvent({
      eventType: 'access_denied',
      severity:  'warning',
      category:  'access',
      doorId,
      timestamp: now.toISOString(),
    })
    expect(processEventForAlarm(currentDenial, pastDenials, [])).toBeNull()
  })

  it('does not create duplicate repeated-denial alarm when one already active', () => {
    const doorId = 'door-42'
    const now = new Date()
    const pastDenials = [
      makeDenialAt(new Date(now.getTime() - 10_000), doorId),
      makeDenialAt(new Date(now.getTime() - 20_000), doorId),
    ]
    const existingAlarm: Alarm = {
      id: 'alarm-existing',
      triggerEventId: 'evt-0',
      severity: 'warning',
      state: 'active',
      siteId: 'site-1',
      doorId,
      title: `Repeated Denied Access — ${doorId}`,
      notes: [],
    }
    const currentDenial = makeEvent({
      eventType: 'access_denied',
      severity:  'warning',
      category:  'access',
      doorId,
      timestamp: now.toISOString(),
    })
    expect(processEventForAlarm(currentDenial, pastDenials, [existingAlarm])).toBeNull()
  })

  it('creates new repeated-denial alarm if existing one is cleared', () => {
    const doorId = 'door-42'
    const now = new Date()
    const pastDenials = [
      makeDenialAt(new Date(now.getTime() - 10_000), doorId),
      makeDenialAt(new Date(now.getTime() - 20_000), doorId),
    ]
    const clearedAlarm: Alarm = {
      id: 'alarm-cleared',
      triggerEventId: 'evt-0',
      severity: 'warning',
      state: 'cleared',
      siteId: 'site-1',
      doorId,
      title: `Repeated Denied Access — ${doorId}`,
      clearedAt: new Date(now.getTime() - 300_000).toISOString(),
      notes: [],
    }
    const currentDenial = makeEvent({
      eventType: 'access_denied',
      severity:  'warning',
      category:  'access',
      doorId,
      timestamp: now.toISOString(),
    })
    const alarm = processEventForAlarm(currentDenial, pastDenials, [clearedAlarm])
    expect(alarm).not.toBeNull()
    expect(alarm?.title).toContain('Repeated Denied Access')
  })
})
