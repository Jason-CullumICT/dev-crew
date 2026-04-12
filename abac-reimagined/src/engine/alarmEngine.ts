// src/engine/alarmEngine.ts
// Alarm creation and classification logic for the SOC demo.

import { v4 as uuidv4 } from 'uuid'
import type {
  SecurityEvent,
  SecurityEventType,
  Alarm,
  EventSeverity,
} from '../types'

// ── shouldCreateAlarm ─────────────────────────────────────────────────────────

/**
 * Returns true if the given event should automatically create an alarm.
 * Repeated-denial detection is handled separately in processEventForAlarm.
 */
export function shouldCreateAlarm(event: SecurityEvent): boolean {
  const alarmTypes: SecurityEventType[] = [
    'door_forced',
    'door_held',
    'sensor_trip',
    'controller_offline',
    'panic_button',
    'reader_tamper',
    'pir_trigger',
    'device_offline',
  ]
  return alarmTypes.includes(event.eventType)
}

// ── Alarm title + severity mapping ────────────────────────────────────────────

function alarmTitleFor(event: SecurityEvent): string {
  const doorName  = event.metadata['doorName']  ?? event.doorId  ?? 'Unknown Door'
  const zoneName  = event.metadata['zoneName']  ?? event.zoneId  ?? 'Unknown Zone'
  const ctrlName  = event.metadata['ctrlName']  ?? event.metadata['controllerId'] ?? 'Unknown Controller'
  const location  = doorName !== 'Unknown Door' ? doorName : zoneName

  switch (event.eventType) {
    case 'door_forced':
      return `Door Forced Open — ${doorName}`
    case 'door_held':
      return `Door Held Open — ${doorName}`
    case 'sensor_trip':
      return `Sensor Trip — ${zoneName}`
    case 'controller_offline':
      return `Controller Offline — ${ctrlName}`
    case 'panic_button':
      return `Panic Button — ${location}`
    case 'reader_tamper':
      return `Reader Tamper — ${event.metadata['deviceName'] ?? doorName}`
    case 'pir_trigger':
      return `PIR Motion — ${event.metadata['deviceName'] ?? zoneName}`
    case 'device_offline':
      return `Device Offline — ${event.metadata['deviceName'] ?? doorName}`
    default:
      return `Security Alert — ${event.eventType}`
  }
}

function alarmSeverityFor(event: SecurityEvent): EventSeverity {
  switch (event.eventType) {
    case 'door_forced':
    case 'panic_button':
    case 'sensor_trip':
      return 'critical'
    case 'door_held':
    case 'controller_offline':
      return 'warning'
    default:
      return event.severity
  }
}

// ── createAlarm ───────────────────────────────────────────────────────────────

/**
 * Creates an Alarm from a SecurityEvent. Does not check shouldCreateAlarm —
 * the caller is responsible for that gate.
 */
export function createAlarm(event: SecurityEvent): Alarm {
  return {
    id:             uuidv4(),
    triggerEventId: event.id,
    severity:       alarmSeverityFor(event),
    state:          'active',
    siteId:         event.siteId,
    zoneId:         event.zoneId,
    doorId:         event.doorId,
    title:          alarmTitleFor(event),
    notes:          [],
  }
}

// ── checkRepeatedDenials ──────────────────────────────────────────────────────

/**
 * Returns true when there are 3 or more access_denied events for the same
 * doorId within the last 60 seconds (relative to the most recent event's
 * timestamp, or Date.now() if recentEvents is empty).
 */
export function checkRepeatedDenials(
  doorId: string,
  recentEvents: SecurityEvent[],
): boolean {
  const now = recentEvents.length > 0
    ? new Date(recentEvents[0].timestamp).getTime()
    : Date.now()

  const cutoff = now - 60_000

  const denials = recentEvents.filter(
    e =>
      e.eventType === 'access_denied' &&
      e.doorId === doorId &&
      new Date(e.timestamp).getTime() >= cutoff,
  )

  return denials.length >= 3
}

// ── processEventForAlarm ──────────────────────────────────────────────────────

/**
 * Given a new event, the recent event history, and the existing alarm list,
 * returns a new Alarm to add to the store or null if no alarm is warranted.
 *
 * Rules:
 * 1. If the event type is in the direct-alarm set → create alarm.
 * 2. If the event is access_denied and checkRepeatedDenials triggers, and
 *    there is no existing active/acknowledged repeated-denial alarm for this
 *    door already in the list → create a warning alarm.
 */
export function processEventForAlarm(
  event: SecurityEvent,
  recentEvents: SecurityEvent[],
  existingAlarms: Alarm[],
): Alarm | null {
  // Direct alarm types
  if (shouldCreateAlarm(event)) {
    return createAlarm(event)
  }

  // Repeated denial check
  if (event.eventType === 'access_denied' && event.doorId !== undefined) {
    const doorId = event.doorId
    // Include the current event in the check window
    const eventsWithCurrent = [event, ...recentEvents]
    if (checkRepeatedDenials(doorId, eventsWithCurrent)) {
      // Don't create a duplicate alarm if one is already active for this door
      const alreadyActive = existingAlarms.some(
        a =>
          a.doorId === doorId &&
          a.title.startsWith('Repeated Denied Access') &&
          (a.state === 'active' || a.state === 'acknowledged'),
      )
      if (!alreadyActive) {
        const doorName = event.metadata['doorName'] ?? doorId
        return {
          id:             uuidv4(),
          triggerEventId: event.id,
          severity:       'warning',
          state:          'active',
          siteId:         event.siteId,
          zoneId:         event.zoneId,
          doorId,
          title:          `Repeated Denied Access — ${doorName}`,
          notes:          [],
        }
      }
    }
  }

  return null
}
