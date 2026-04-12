// src/engine/eventSimulator.ts
// Probabilistic event generation engine for the SOC demo simulation.

import { v4 as uuidv4 } from 'uuid'
import type {
  SecurityEvent,
  SecurityEventType,
  EventSeverity,
  EventCategory,
  SiteStatus,
  ZoneStatus,
  User,
  Door,
  Zone,
  Site,
  Controller,
} from '../types'

// ── Condition classification ──────────────────────────────────────────────────

export type SimCondition = 'business' | 'afterhours' | 'lockdown'

/**
 * Determines the simulation condition based on the current hour (0-23),
 * site status, and zone status.
 */
export function getCondition(
  hour: number,
  siteStatus: SiteStatus,
  zoneStatus: ZoneStatus,
): SimCondition {
  if (siteStatus === 'Lockdown') return 'lockdown'
  if (zoneStatus === 'Alarm') return 'lockdown'

  const isBusinessHours = hour >= 8 && hour < 18
  if (isBusinessHours && (siteStatus === 'Disarmed' || siteStatus === 'PartialArm')) {
    return 'business'
  }
  return 'afterhours'
}

// ── Probability weight tables ─────────────────────────────────────────────────

// Each entry is [eventType, weight]. Weights are relative (will be normalised).
type WeightEntry = [SecurityEventType, number]

const WEIGHT_TABLES: Record<SimCondition, WeightEntry[]> = {
  business: [
    ['access_granted',     80],
    ['access_denied',      10],
    ['door_forced',         1],
    ['door_held',           2],
    ['sensor_trip',         2],
    ['controller_offline',  5],
    ['arm_state_change',    0],
    ['panic_button',        0],
  ],
  afterhours: [
    ['access_granted',     20],
    ['access_denied',      30],
    ['door_forced',         5],
    ['door_held',           0],
    ['sensor_trip',        20],
    ['controller_offline', 10],
    ['arm_state_change',   15],
    ['panic_button',        0],
  ],
  lockdown: [
    ['access_granted',      5],
    ['access_denied',      60],
    ['door_forced',         5],
    ['door_held',           0],
    ['sensor_trip',        15],
    ['controller_offline', 10],
    ['arm_state_change',    5],
    ['panic_button',        0],
  ],
}

/**
 * Picks a weighted-random SecurityEventType for the given condition.
 * Exposed for testing.
 */
export function pickWeightedEventType(
  condition: SimCondition,
  random: () => number = Math.random,
): SecurityEventType {
  const table = WEIGHT_TABLES[condition]
  const total = table.reduce((acc, [, w]) => acc + w, 0)
  let cursor = random() * total
  for (const [type, weight] of table) {
    cursor -= weight
    if (cursor <= 0) return type
  }
  // Fallback — should not be reached if weights are correct
  return table[0][0]
}

// ── Severity + category mapping ───────────────────────────────────────────────

function severityFor(eventType: SecurityEventType): EventSeverity {
  switch (eventType) {
    case 'door_forced':
    case 'panic_button':
      return 'critical'
    case 'access_denied':
    case 'door_held':
    case 'sensor_trip':
    case 'controller_offline':
      return 'warning'
    default:
      return 'info'
  }
}

function categoryFor(eventType: SecurityEventType): EventCategory {
  switch (eventType) {
    case 'access_granted':
    case 'access_denied':
      return 'access'
    case 'door_forced':
    case 'sensor_trip':
    case 'panic_button':
      return 'intrusion'
    case 'arm_state_change':
    case 'controller_offline':
      return 'system'
    case 'door_held':
      return 'alarm'
  }
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildMessage(
  eventType: SecurityEventType,
  site: Site,
  zone: Zone | undefined,
  door: Door | undefined,
  user: User | undefined,
  controller: Controller | undefined,
): string {
  const siteName = site.name
  const zoneName = zone?.name ?? 'Unknown Zone'
  const doorName = door?.name ?? 'Unknown Door'
  const userName = user?.name ?? 'Unknown User'
  const ctrlName = controller?.name ?? 'Unknown Controller'

  switch (eventType) {
    case 'access_granted':
      return `Access granted — ${userName} at ${doorName} (${siteName})`
    case 'access_denied':
      return `Access denied — ${userName} at ${doorName} (${siteName})`
    case 'door_forced':
      return `Door forced open — ${doorName} at ${siteName}`
    case 'door_held':
      return `Door held open >30s — ${doorName} at ${siteName}`
    case 'sensor_trip':
      return `Motion sensor tripped — ${zoneName} at ${siteName}`
    case 'controller_offline':
      return `Controller offline — ${ctrlName} at ${siteName}`
    case 'arm_state_change':
      return `Arm state changed — ${zoneName} at ${siteName}`
    case 'panic_button':
      return `Panic button activated — ${doorName ?? zoneName} at ${siteName}`
  }
}

// ── Random helpers ────────────────────────────────────────────────────────────

function pick<T>(arr: T[], random: () => number = Math.random): T {
  return arr[Math.floor(random() * arr.length)]
}

// ── generateEvent ─────────────────────────────────────────────────────────────

export interface GenerateEventInput {
  users:       User[]
  doors:       Door[]
  zones:       Zone[]
  sites:       Site[]
  controllers: Controller[]
  hour?:       number
}

/**
 * Generates a single SecurityEvent based on the current store entities.
 * Picks a random site → random zone within that site → random door within that zone.
 */
export function generateEvent(
  input: GenerateEventInput,
  random: () => number = Math.random,
): SecurityEvent {
  const { users, doors, zones, sites, controllers } = input
  const hour = input.hour ?? new Date().getHours()

  // Pick a random site
  const site = pick(sites.length > 0 ? sites : [{ id: 'unknown', name: 'Unknown Site', address: '', timezone: 'UTC', status: 'Disarmed' as const }], random)

  // Zones and doors scoped to this site
  const siteZones = zones.filter(z => z.siteId === site.id)
  const zone = siteZones.length > 0 ? pick(siteZones, random) : undefined

  const siteDoors = doors.filter(d => d.siteId === site.id && (zone === undefined || d.zoneId === zone.id))
  const door = siteDoors.length > 0 ? pick(siteDoors, random) : undefined

  // Controllers scoped to this site
  const siteControllers = controllers.filter(c => c.siteId === site.id)
  const controller = siteControllers.length > 0 ? pick(siteControllers, random) : undefined

  // Determine condition
  const condition = getCondition(hour, site.status, zone?.status ?? 'Disarmed')

  // Pick event type
  const eventType = pickWeightedEventType(condition, random)

  // Pick user for access events
  const activeUsers = users.filter(u => u.status === 'active')
  const user = (eventType === 'access_granted' || eventType === 'access_denied') && activeUsers.length > 0
    ? pick(activeUsers, random)
    : undefined

  const severity = severityFor(eventType)
  const category = categoryFor(eventType)
  const message = buildMessage(eventType, site, zone, door, user, controller)

  const metadata: Record<string, string> = {
    condition,
    hour: String(hour),
  }
  if (controller) metadata['controllerId'] = controller.id

  return {
    id:        uuidv4(),
    timestamp: new Date().toISOString(),
    category,
    severity,
    eventType,
    siteId:    site.id,
    zoneId:    zone?.id,
    doorId:    door?.id,
    userId:    user?.id,
    message,
    metadata,
  }
}
