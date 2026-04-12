// src/engine/responseEngine.ts
// Phase 3 — Response Rules Engine
// Evaluates ResponseRules against incoming SecurityEvents and executes actions.

import { v4 as uuidv4 } from 'uuid'
import type {
  SecurityEvent,
  ResponseRule,
  ResponseAction,
  Zone,
  Site,
  Alarm,
  ThreatLevel,
} from '../types'

// ── Minimal store interface (avoids circular import with store.ts) ─────────────

export interface StoreActions {
  getState: () => StoreSlice
}

export interface StoreSlice {
  zones:        Zone[]
  sites:        Site[]
  alarms:       Alarm[]
  threatLevel:  ThreatLevel
  updateZone:   (zone: Zone) => void
  updateSite:   (site: Site) => void
  addEvent:     (event: SecurityEvent) => void
  escalateAlarm:(id: string) => void
  setThreatLevel:(level: ThreatLevel) => void
}

// Re-export type alias used in callers
export type AxonStore = StoreActions

// ── Type for the state slice needed by rule evaluation ───────────────────────

export interface ResponseEngineState {
  zones:        Zone[]
  sites:        Site[]
  threatLevel:  ThreatLevel
  responseRules: ResponseRule[]
}

// ── evaluateRules ─────────────────────────────────────────────────────────────

/**
 * Matches an event against enabled rules sorted by priority.
 * Returns the actions of the FIRST matching rule (priority ordering).
 * Rules with equal priority are evaluated in array order.
 */
export function evaluateRules(
  event: SecurityEvent,
  rules: ResponseRule[],
  state: ResponseEngineState,
): ResponseAction[] {
  const sorted = [...rules]
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    if (ruleMatches(event, rule, state)) {
      return rule.actions
    }
  }

  return []
}

// ── ruleMatches ───────────────────────────────────────────────────────────────

function ruleMatches(
  event: SecurityEvent,
  rule: ResponseRule,
  state: ResponseEngineState,
): boolean {
  // ── Trigger: event type must match ───────────────────────────────────────
  if (!rule.trigger.eventTypes.includes(event.eventType)) return false

  // ── Trigger: severity filter (optional) ──────────────────────────────────
  if (rule.trigger.severities && rule.trigger.severities.length > 0) {
    if (!rule.trigger.severities.includes(event.severity)) return false
  }

  const cond = rule.conditions

  // ── Condition: site filter ────────────────────────────────────────────────
  if (cond.siteIds && cond.siteIds.length > 0) {
    if (!cond.siteIds.includes(event.siteId)) return false
  }

  // ── Condition: zone type filter ───────────────────────────────────────────
  if (cond.zoneTypes && cond.zoneTypes.length > 0 && event.zoneId) {
    const zone = state.zones.find(z => z.id === event.zoneId)
    if (!zone || !cond.zoneTypes.includes(zone.type)) return false
  }

  // ── Condition: arm state filter ───────────────────────────────────────────
  if (cond.armStates && cond.armStates.length > 0 && event.zoneId) {
    const zone = state.zones.find(z => z.id === event.zoneId)
    if (!zone || !cond.armStates.includes(zone.status)) return false
  }

  // ── Condition: threat level filter ───────────────────────────────────────
  if (cond.threatLevels && cond.threatLevels.length > 0) {
    if (!cond.threatLevels.includes(state.threatLevel)) return false
  }

  return true
}

// ── executeAction ─────────────────────────────────────────────────────────────

/**
 * Applies a single ResponseAction to the store.
 * The store param is the full zustand store API (get/set) accessed via getState().
 */
export function executeAction(
  action: ResponseAction,
  event: SecurityEvent,
  store: AxonStore,
): void {
  switch (action.type) {
    case 'lock_door': {
      // Lock the door referenced by the event (or targetId override)
      const doorId = action.targetId ?? event.doorId
      if (!doorId) break
      // Locking a door means arming its zone — we log it as a notification event
      emitActionEvent(store, event, `Door locked: ${doorId}`, 'system')
      break
    }

    case 'unlock_door': {
      const doorId = action.targetId ?? event.doorId
      if (!doorId) break
      emitActionEvent(store, event, `Door unlocked: ${doorId}`, 'system')
      break
    }

    case 'lock_zone': {
      const zoneId = action.targetId ?? event.zoneId
      if (!zoneId) break
      const state = store.getState()
      const zone  = state.zones.find(z => z.id === zoneId)
      if (zone) {
        state.updateZone({ ...zone, status: 'Armed' })
        emitActionEvent(store, event, `Zone locked (Armed): ${zone.name}`, 'system')
      }
      break
    }

    case 'unlock_zone': {
      const zoneId = action.targetId ?? event.zoneId
      if (!zoneId) break
      const state = store.getState()
      const zone  = state.zones.find(z => z.id === zoneId)
      if (zone) {
        state.updateZone({ ...zone, status: 'Disarmed' })
        emitActionEvent(store, event, `Zone unlocked (Disarmed): ${zone.name}`, 'system')
      }
      break
    }

    case 'arm_zone': {
      const zoneId = action.targetId ?? event.zoneId
      if (!zoneId) break
      const state = store.getState()
      const zone  = state.zones.find(z => z.id === zoneId)
      if (zone) {
        state.updateZone({ ...zone, status: 'Armed' })
        emitActionEvent(store, event, `Zone armed: ${zone.name}`, 'system')
      }
      break
    }

    case 'disarm_zone': {
      const zoneId = action.targetId ?? event.zoneId
      if (!zoneId) break
      const state = store.getState()
      const zone  = state.zones.find(z => z.id === zoneId)
      if (zone) {
        state.updateZone({ ...zone, status: 'Disarmed' })
        emitActionEvent(store, event, `Zone disarmed: ${zone.name}`, 'system')
      }
      break
    }

    case 'lock_site': {
      const siteId = action.targetId ?? event.siteId
      const state  = store.getState()
      const site   = state.sites.find(s => s.id === siteId)
      if (site) {
        state.updateSite({ ...site, status: 'Lockdown' })
        emitActionEvent(store, event, `Site locked down: ${site.name}`, 'system')
      }
      break
    }

    case 'activate_siren': {
      const duration = action.params['duration'] ?? '30'
      emitActionEvent(store, event, `Siren activated (${duration}s)`, 'system')
      break
    }

    case 'activate_strobe': {
      const duration = action.params['duration'] ?? '15'
      emitActionEvent(store, event, `Strobe activated (${duration}s)`, 'system')
      break
    }

    case 'trigger_camera': {
      const preset = action.params['preset'] ?? 'default'
      emitActionEvent(store, event, `Camera triggered — preset: ${preset}`, 'system')
      break
    }

    case 'send_notification': {
      const msg     = action.params['message'] ?? 'Security notification'
      const channel = action.params['channel'] ?? 'security-team'
      emitActionEvent(store, event, `Notification [${channel}]: ${msg}`, 'system')
      break
    }

    case 'escalate_alarm': {
      // Find the most recent active alarm for this event and escalate it
      const state  = store.getState()
      const alarm  = [...state.alarms]
        .sort((a, b) => new Date(b.acknowledgedAt ?? b.escalatedAt ?? '').getTime() -
                        new Date(a.acknowledgedAt ?? a.escalatedAt ?? '').getTime())
        .find(a => a.siteId === event.siteId && (a.state === 'active' || a.state === 'acknowledged'))
      if (alarm) {
        state.escalateAlarm(alarm.id)
      }
      emitActionEvent(store, event, 'Alarm escalated via response rule', 'system')
      break
    }

    case 'change_threat_level': {
      const level = action.params['level'] as ThreatLevel | undefined
      if (!level) break
      const state = store.getState()
      state.setThreatLevel(level)
      emitActionEvent(store, event, `Threat level changed to: ${level}`, 'system')
      break
    }

    default:
      break
  }
}

// ── emitActionEvent ───────────────────────────────────────────────────────────

/**
 * Emits a synthetic SecurityEvent to record the response action taken.
 * Uses category 'system' so it shows in the event feed without generating alarms.
 */
function emitActionEvent(
  store: AxonStore,
  triggerEvent: SecurityEvent,
  message: string,
  _category: 'system',
): void {
  store.getState().addEvent({
    id:        uuidv4(),
    timestamp: new Date().toISOString(),
    category:  'system',
    severity:  'info',
    eventType: 'arm_state_change', // closest available system-level type
    siteId:    triggerEvent.siteId,
    zoneId:    triggerEvent.zoneId,
    doorId:    triggerEvent.doorId,
    message,
    metadata:  {
      responseAction: 'true',
      triggerEventId: triggerEvent.id,
    },
  })
}

