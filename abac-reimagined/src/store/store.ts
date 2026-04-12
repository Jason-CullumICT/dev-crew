import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller, ArmingLog, CanvasPosition,
  SecurityEvent, Alarm, InputDevice, OutputDevice,
  ResponseRule, EscalationChain, ThreatLevel,
  AntiPassbackConfig, TwoPersonRule, EscortConfig, DoorInterlock, ZoneOccupancy,
  Credential, VisitorRegistration,
} from '../types'
import {
  USERS, GROUPS, GRANTS, SCHEDULES, POLICIES,
  DOORS, ZONES, SITES, CONTROLLERS,
  INPUT_DEVICES, OUTPUT_DEVICES,
  RESPONSE_RULES, ESCALATION_CHAINS,
  ANTI_PASSBACK_CONFIGS, TWO_PERSON_RULES, ESCORT_CONFIGS, DOOR_INTERLOCKS,
  CREDENTIALS, VISITOR_REGISTRATIONS,
} from './seed'

export function defaultCanvasPositions(): Record<string, CanvasPosition> {
  const positions: Record<string, CanvasPosition> = {}

  // Node widths after redesign: Group=~170px, Grant=~160px, Schedule=~170px, Door=100px
  // Each section starts after the previous section's rightmost column + gap

  // Groups: 2-column grid, 20 per column, 90px vertical gap
  const GROUP_W = 190    // node width + inter-column gap
  const GROUP_GAP_Y = 90
  const GROUP_PER_COL = 20
  GROUPS.forEach((g, i) => {
    const col = Math.floor(i / GROUP_PER_COL)
    const row = i % GROUP_PER_COL
    positions[`group-${g.id}`] = { x: 80 + col * GROUP_W, y: 60 + row * GROUP_GAP_Y }
  })
  const groupCols = Math.ceil(GROUPS.length / GROUP_PER_COL)
  const grantsStartX = 80 + groupCols * GROUP_W + 60 // 60px gap between sections

  // Grants: 2-column grid, 20 per column, 80px vertical gap
  const GRANT_W = 180
  const GRANT_GAP_Y = 80
  const GRANT_PER_COL = 20
  GRANTS.forEach((g, i) => {
    const col = Math.floor(i / GRANT_PER_COL)
    const row = i % GRANT_PER_COL
    positions[`grant-${g.id}`] = { x: grantsStartX + col * GRANT_W, y: 60 + row * GRANT_GAP_Y }
  })
  const grantCols = Math.ceil(GRANTS.length / GRANT_PER_COL)
  const schedulesStartX = grantsStartX + grantCols * GRANT_W + 60

  // Schedules: 1 column, 95px vertical gap
  const SCHEDULE_GAP_Y = 95
  SCHEDULES.forEach((s, i) => {
    positions[`schedule-${s.id}`] = { x: schedulesStartX, y: 60 + i * SCHEDULE_GAP_Y }
  })
  const doorsStartX = schedulesStartX + 200 + 60 // schedule tile ~200px wide + gap

  // Doors: multi-column grid, 40 per column, 50px vertical gap, 120px horizontal spacing
  const DOOR_COL_W = 120
  const DOOR_GAP_Y = 50
  const DOOR_PER_COL = 40
  DOORS.forEach((d, i) => {
    const col = Math.floor(i / DOOR_PER_COL)
    const row = i % DOOR_PER_COL
    positions[`door-${d.id}`] = { x: doorsStartX + col * DOOR_COL_W, y: 60 + row * DOOR_GAP_Y }
  })

  return positions
}

// Compute the next Y position for a new node in a column
function nextY(positions: Record<string, CanvasPosition>, prefix: string, gap: number): number {
  const ys = Object.entries(positions)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v.y)
  return ys.length > 0 ? Math.max(...ys) + gap : 60
}

interface AxonStore {
  // ── Entities ──────────────────────────────────────────────────────────────
  users:         User[]
  groups:        Group[]
  grants:        Grant[]
  schedules:     NamedSchedule[]
  policies:      Policy[]
  doors:         Door[]
  zones:         Zone[]
  sites:         Site[]
  controllers:   Controller[]
  armingLog:     ArmingLog[]
  inputDevices:  InputDevice[]
  outputDevices: OutputDevice[]

  // ── SOC Monitoring state ──────────────────────────────────────────────────
  events:          SecurityEvent[]   // capped at 500, newest first
  alarms:          Alarm[]           // persists until cleared (no cap)
  simulationSpeed: 0 | 1 | 10       // 0 = paused

  // ── Phase 3 — Response Rules Engine ──────────────────────────────────────
  responseRules:     ResponseRule[]
  escalationChains:  EscalationChain[]
  threatLevel:       ThreatLevel

  // ── Phase 4 — Advanced Access Control ────────────────────────────────────
  antiPassbackConfigs: AntiPassbackConfig[]
  twoPersonRules:      TwoPersonRule[]
  escortConfigs:       EscortConfig[]
  doorInterlocks:      DoorInterlock[]
  zoneOccupancy:       ZoneOccupancy[]
  musterActive:        boolean

  // ── Phase 5 — Visitor & Credential Management ─────────────────────────────
  credentials:          Credential[]
  visitorRegistrations: VisitorRegistration[]

  // ── Canvas state ──────────────────────────────────────────────────────────
  canvasPositions:      Record<string, CanvasPosition>
  selectedCanvasNodeId: string | null
  edgeMode:             'always' | 'hover' | 'off'

  // ── SOC Monitoring actions ────────────────────────────────────────────────
  addEvent:           (event: SecurityEvent)                      => void
  addAlarm:           (alarm: Alarm)                              => void
  acknowledgeAlarm:   (id: string, userId: string)                => void
  escalateAlarm:      (id: string)                                => void
  clearAlarm:         (id: string)                                => void
  addAlarmNote:       (id: string, note: string)                  => void
  setSimulationSpeed: (speed: 0 | 1 | 10)                        => void
  clearAllEvents:     ()                                          => void

  // ── Phase 3 — Response Rules Engine ──────────────────────────────────────
  addResponseRule:    (rule: ResponseRule)       => void
  updateResponseRule: (rule: ResponseRule)       => void
  deleteResponseRule: (id: string)               => void
  addEscalationChain:    (chain: EscalationChain) => void
  updateEscalationChain: (chain: EscalationChain) => void
  deleteEscalationChain: (id: string)             => void
  setThreatLevel:     (level: ThreatLevel)       => void

  // ── Phase 4 — Advanced Access Control ────────────────────────────────────
  addAntiPassbackConfig:    (cfg: AntiPassbackConfig) => void
  updateAntiPassbackConfig: (cfg: AntiPassbackConfig) => void
  deleteAntiPassbackConfig: (zoneId: string)          => void
  addTwoPersonRule:    (rule: TwoPersonRule) => void
  updateTwoPersonRule: (rule: TwoPersonRule) => void
  deleteTwoPersonRule: (doorId: string)      => void
  addEscortConfig:    (cfg: EscortConfig) => void
  updateEscortConfig: (cfg: EscortConfig) => void
  deleteEscortConfig: (doorId: string)    => void
  addDoorInterlock:    (interlock: DoorInterlock) => void
  updateDoorInterlock: (interlock: DoorInterlock) => void
  deleteDoorInterlock: (id: string)               => void
  setMusterActive:      (active: boolean)         => void
  updateZoneOccupancy:  (zoneId: string, userIds: string[]) => void

  // ── Phase 5 — Visitor & Credential Management ─────────────────────────────
  addCredential:         (cred: Credential)      => void
  updateCredential:      (cred: Credential)      => void
  deleteCredential:      (id: string)            => void
  suspendCredential:     (id: string)            => void
  revokeCredential:      (id: string)            => void
  reactivateCredential:  (id: string)            => void

  addVisitorRegistration:    (reg: VisitorRegistration) => void
  updateVisitorRegistration: (reg: VisitorRegistration) => void
  deleteVisitorRegistration: (id: string)               => void
  checkInVisitor:            (id: string, credentialId: string) => void
  checkOutVisitor:           (id: string)                       => void

  // ── Plan 1 actions ────────────────────────────────────────────────────────
  updateSite:            (site: Site)            => void
  updateZone:            (zone: Zone)            => void
  addArmingLog:          (entry: ArmingLog)      => void
  setCanvasPosition:     (key: string, pos: CanvasPosition) => void
  setSelectedCanvasNode: (id: string | null)     => void
  setEdgeMode:           (mode: 'always' | 'hover' | 'off') => void

  // ── Seed reset ────────────────────────────────────────────────────────────
  resetToSeed: () => void

  // ── Users ─────────────────────────────────────────────────────────────────
  addUser:    (user: User)   => void
  updateUser: (user: User)   => void
  deleteUser: (id: string)   => void   // cascade: remove from group.members

  // ── Groups ────────────────────────────────────────────────────────────────
  addGroup:    (group: Group) => void  // canvas position auto-assigned
  updateGroup: (group: Group) => void
  deleteGroup: (id: string)   => void  // cascade: remove from other groups' subGroups

  // ── Grants ────────────────────────────────────────────────────────────────
  addGrant:    (grant: Grant) => void  // canvas position auto-assigned
  updateGrant: (grant: Grant) => void
  deleteGrant: (id: string)   => void  // cascade: remove from group.inheritedPermissions

  // ── Schedules ─────────────────────────────────────────────────────────────
  addSchedule:    (schedule: NamedSchedule) => void  // canvas position auto-assigned
  updateSchedule: (schedule: NamedSchedule) => void
  deleteSchedule: (id: string)              => void  // cascade: clear grant.scheduleId, policy.scheduleId

  // ── Policies ──────────────────────────────────────────────────────────────
  addPolicy:    (policy: Policy) => void
  updatePolicy: (policy: Policy) => void
  deletePolicy: (id: string)     => void

  // ── Doors ─────────────────────────────────────────────────────────────────
  addDoor:    (door: Door) => void  // canvas position auto-assigned
  updateDoor: (door: Door) => void
  deleteDoor: (id: string) => void  // cascade: remove from policy.doorIds, controller.doorIds

  // ── Zones ─────────────────────────────────────────────────────────────────
  addZone:    (zone: Zone) => void
  deleteZone: (id: string) => void  // cascade: clear door.zoneId

  // ── Sites ─────────────────────────────────────────────────────────────────
  addSite:    (site: Site) => void
  deleteSite: (id: string) => void  // cascade: delete zones + doors for this site

  // ── Controllers ───────────────────────────────────────────────────────────
  addController:    (controller: Controller) => void
  updateController: (controller: Controller) => void
  deleteController: (id: string)             => void   // cascade: remove devices where controllerId matches

  // ── Input Devices ─────────────────────────────────────────────────────────
  addInputDevice:    (device: InputDevice)  => void
  updateInputDevice: (device: InputDevice)  => void
  deleteInputDevice: (id: string)           => void

  // ── Output Devices ────────────────────────────────────────────────────────
  addOutputDevice:    (device: OutputDevice) => void
  updateOutputDevice: (device: OutputDevice) => void
  deleteOutputDevice: (id: string)           => void
}

export const useStore = create<AxonStore>()(
  persist(
    (set) => ({
      users:         USERS,
      groups:        GROUPS,
      grants:        GRANTS,
      schedules:     SCHEDULES,
      policies:      POLICIES,
      doors:         DOORS,
      zones:         ZONES,
      sites:         SITES,
      controllers:   CONTROLLERS,
      armingLog:     [],
      inputDevices:  INPUT_DEVICES,
      outputDevices: OUTPUT_DEVICES,

      events:          [],
      alarms:          [],
      simulationSpeed: 0 as const,

      responseRules:    RESPONSE_RULES,
      escalationChains: ESCALATION_CHAINS,
      threatLevel:      'normal' as ThreatLevel,

      antiPassbackConfigs: ANTI_PASSBACK_CONFIGS,
      twoPersonRules:      TWO_PERSON_RULES,
      escortConfigs:       ESCORT_CONFIGS,
      doorInterlocks:      DOOR_INTERLOCKS,
      zoneOccupancy:       [],
      musterActive:        false,

      credentials:          CREDENTIALS,
      visitorRegistrations: VISITOR_REGISTRATIONS,

      canvasPositions:      defaultCanvasPositions(),
      selectedCanvasNodeId: null,
      edgeMode:             'hover' as const,

      // ── SOC Monitoring ────────────────────────────────────────────────────────
      addEvent: (event) =>
        set(state => ({ events: [event, ...state.events].slice(0, 500) })),

      addAlarm: (alarm) =>
        set(state => ({ alarms: [...state.alarms, alarm] })),

      acknowledgeAlarm: (id, userId) =>
        set(state => ({
          alarms: state.alarms.map(a =>
            a.id === id
              ? { ...a, state: 'acknowledged' as const, acknowledgedBy: userId, acknowledgedAt: new Date().toISOString() }
              : a
          ),
        })),

      escalateAlarm: (id) =>
        set(state => ({
          alarms: state.alarms.map(a =>
            a.id === id
              ? { ...a, state: 'escalated' as const, escalatedAt: new Date().toISOString() }
              : a
          ),
        })),

      clearAlarm: (id) =>
        set(state => ({
          alarms: state.alarms.map(a =>
            a.id === id
              ? { ...a, state: 'cleared' as const, clearedAt: new Date().toISOString() }
              : a
          ),
        })),

      addAlarmNote: (id, note) =>
        set(state => ({
          alarms: state.alarms.map(a =>
            a.id === id
              ? { ...a, notes: [...a.notes, note] }
              : a
          ),
        })),

      setSimulationSpeed: (speed) =>
        set({ simulationSpeed: speed }),

      clearAllEvents: () =>
        set({ events: [] }),

      // ── Phase 3 — Response Rules Engine ──────────────────────────────────────
      addResponseRule: (rule) =>
        set(state => ({ responseRules: [...state.responseRules, rule] })),

      updateResponseRule: (rule) =>
        set(state => ({ responseRules: state.responseRules.map(r => r.id === rule.id ? rule : r) })),

      deleteResponseRule: (id) =>
        set(state => ({ responseRules: state.responseRules.filter(r => r.id !== id) })),

      addEscalationChain: (chain) =>
        set(state => ({ escalationChains: [...state.escalationChains, chain] })),

      updateEscalationChain: (chain) =>
        set(state => ({ escalationChains: state.escalationChains.map(c => c.id === chain.id ? chain : c) })),

      deleteEscalationChain: (id) =>
        set(state => ({ escalationChains: state.escalationChains.filter(c => c.id !== id) })),

      setThreatLevel: (level) =>
        set({ threatLevel: level }),

      // ── Phase 4 — Advanced Access Control ────────────────────────────────────
      addAntiPassbackConfig: (cfg) =>
        set(state => ({ antiPassbackConfigs: [...state.antiPassbackConfigs, cfg] })),

      updateAntiPassbackConfig: (cfg) =>
        set(state => ({
          antiPassbackConfigs: state.antiPassbackConfigs.map(c => c.zoneId === cfg.zoneId ? cfg : c),
        })),

      deleteAntiPassbackConfig: (zoneId) =>
        set(state => ({ antiPassbackConfigs: state.antiPassbackConfigs.filter(c => c.zoneId !== zoneId) })),

      addTwoPersonRule: (rule) =>
        set(state => ({ twoPersonRules: [...state.twoPersonRules, rule] })),

      updateTwoPersonRule: (rule) =>
        set(state => ({
          twoPersonRules: state.twoPersonRules.map(r => r.doorId === rule.doorId ? rule : r),
        })),

      deleteTwoPersonRule: (doorId) =>
        set(state => ({ twoPersonRules: state.twoPersonRules.filter(r => r.doorId !== doorId) })),

      addEscortConfig: (cfg) =>
        set(state => ({ escortConfigs: [...state.escortConfigs, cfg] })),

      updateEscortConfig: (cfg) =>
        set(state => ({
          escortConfigs: state.escortConfigs.map(c => c.doorId === cfg.doorId ? cfg : c),
        })),

      deleteEscortConfig: (doorId) =>
        set(state => ({ escortConfigs: state.escortConfigs.filter(c => c.doorId !== doorId) })),

      addDoorInterlock: (interlock) =>
        set(state => ({ doorInterlocks: [...state.doorInterlocks, interlock] })),

      updateDoorInterlock: (interlock) =>
        set(state => ({
          doorInterlocks: state.doorInterlocks.map(i => i.id === interlock.id ? interlock : i),
        })),

      deleteDoorInterlock: (id) =>
        set(state => ({ doorInterlocks: state.doorInterlocks.filter(i => i.id !== id) })),

      setMusterActive: (active) =>
        set({ musterActive: active }),

      updateZoneOccupancy: (zoneId, userIds) =>
        set(state => {
          const existing = state.zoneOccupancy.find(o => o.zoneId === zoneId)
          const updated: ZoneOccupancy = { zoneId, userIds, lastUpdated: new Date().toISOString() }
          return {
            zoneOccupancy: existing
              ? state.zoneOccupancy.map(o => o.zoneId === zoneId ? updated : o)
              : [...state.zoneOccupancy, updated],
          }
        }),

      // ── Phase 5 — Visitor & Credential Management ────────────────────────────
      addCredential: (cred) =>
        set(state => ({ credentials: [...state.credentials, cred] })),

      updateCredential: (cred) =>
        set(state => ({ credentials: state.credentials.map(c => c.id === cred.id ? cred : c) })),

      deleteCredential: (id) =>
        set(state => ({ credentials: state.credentials.filter(c => c.id !== id) })),

      suspendCredential: (id) =>
        set(state => ({
          credentials: state.credentials.map(c =>
            c.id === id ? { ...c, status: 'suspended' as const, suspendedAt: new Date().toISOString() } : c
          ),
        })),

      revokeCredential: (id) =>
        set(state => ({
          credentials: state.credentials.map(c =>
            c.id === id ? { ...c, status: 'revoked' as const, revokedAt: new Date().toISOString() } : c
          ),
        })),

      reactivateCredential: (id) =>
        set(state => ({
          credentials: state.credentials.map(c =>
            c.id === id ? { ...c, status: 'active' as const, suspendedAt: undefined, revokedAt: undefined } : c
          ),
        })),

      addVisitorRegistration: (reg) =>
        set(state => ({ visitorRegistrations: [...state.visitorRegistrations, reg] })),

      updateVisitorRegistration: (reg) =>
        set(state => ({
          visitorRegistrations: state.visitorRegistrations.map(r => r.id === reg.id ? reg : r),
        })),

      deleteVisitorRegistration: (id) =>
        set(state => ({ visitorRegistrations: state.visitorRegistrations.filter(r => r.id !== id) })),

      checkInVisitor: (id, credentialId) =>
        set(state => ({
          visitorRegistrations: state.visitorRegistrations.map(r =>
            r.id === id
              ? { ...r, status: 'checked_in' as const, checkInTime: new Date().toISOString(), credentialId }
              : r
          ),
        })),

      checkOutVisitor: (id) =>
        set(state => ({
          visitorRegistrations: state.visitorRegistrations.map(r =>
            r.id === id
              ? { ...r, status: 'checked_out' as const, checkOutTime: new Date().toISOString() }
              : r
          ),
        })),

      // ── Plan 1 ────────────────────────────────────────────────────────────────
      updateSite: (site) =>
        set(state => ({ sites: state.sites.map(s => s.id === site.id ? site : s) })),

      updateZone: (zone) =>
        set(state => ({ zones: state.zones.map(z => z.id === zone.id ? zone : z) })),

      addArmingLog: (entry) =>
        set(state => ({ armingLog: [entry, ...state.armingLog].slice(0, 100) })),

      // Trade-off note: spreading the full canvasPositions record on every drag frame creates
      // GC pressure (~660 entries). This shallow-clone approach is correct and cheap enough for
      // a demo; a production canvas would batch drag updates or use a separate drag-state atom.
      setCanvasPosition: (key, pos) =>
        set(state => {
          const next = { ...state.canvasPositions }
          next[key] = pos
          return { canvasPositions: next }
        }),

      setSelectedCanvasNode: (id) =>
        set({ selectedCanvasNodeId: id }),

      setEdgeMode: (mode) =>
        set({ edgeMode: mode }),

      // ── Seed reset ────────────────────────────────────────────────────────────
      resetToSeed: () =>
        set({
          users:         USERS,
          groups:        GROUPS,
          grants:        GRANTS,
          schedules:     SCHEDULES,
          policies:      POLICIES,
          doors:         DOORS,
          zones:         ZONES,
          sites:         SITES,
          controllers:   CONTROLLERS,
          inputDevices:  INPUT_DEVICES,
          outputDevices: OUTPUT_DEVICES,
          canvasPositions: defaultCanvasPositions(),
          armingLog:     [],
          events:        [],
          alarms:        [],
          responseRules:    RESPONSE_RULES,
          escalationChains: ESCALATION_CHAINS,
          threatLevel:      'normal' as ThreatLevel,
          antiPassbackConfigs: ANTI_PASSBACK_CONFIGS,
          twoPersonRules:      TWO_PERSON_RULES,
          escortConfigs:       ESCORT_CONFIGS,
          doorInterlocks:      DOOR_INTERLOCKS,
          zoneOccupancy:       [],
          musterActive:        false,
          credentials:          CREDENTIALS,
          visitorRegistrations: VISITOR_REGISTRATIONS,
        }),

      // ── Users ─────────────────────────────────────────────────────────────────
      addUser: (user) =>
        set(state => ({ users: [...state.users, user] })),

      updateUser: (user) =>
        set(state => ({ users: state.users.map(u => u.id === user.id ? user : u) })),

      deleteUser: (id) =>
        set(state => ({
          users:  state.users.filter(u => u.id !== id),
          groups: state.groups.map(g => ({ ...g, members: g.members.filter(m => m !== id) })),
        })),

      // ── Groups ────────────────────────────────────────────────────────────────
      addGroup: (group) =>
        set(state => ({
          groups: [...state.groups, group],
          canvasPositions: {
            ...state.canvasPositions,
            [`group-${group.id}`]: { x: 80, y: nextY(state.canvasPositions, 'group-', 130) },
          },
        })),

      updateGroup: (group) =>
        set(state => ({ groups: state.groups.map(g => g.id === group.id ? group : g) })),

      deleteGroup: (id) =>
        set(state => {
          const { [`group-${id}`]: _removed, ...restPositions } = state.canvasPositions
          return {
            groups: state.groups
              .filter(g => g.id !== id)
              .map(g => ({ ...g, subGroups: g.subGroups.filter(sg => sg !== id) })),
            canvasPositions: restPositions,
          }
        }),

      // ── Grants ────────────────────────────────────────────────────────────────
      addGrant: (grant) =>
        set(state => ({
          grants: [...state.grants, grant],
          canvasPositions: {
            ...state.canvasPositions,
            [`grant-${grant.id}`]: { x: 340, y: nextY(state.canvasPositions, 'grant-', 100) },
          },
        })),

      updateGrant: (grant) =>
        set(state => ({ grants: state.grants.map(g => g.id === grant.id ? grant : g) })),

      deleteGrant: (id) =>
        set(state => {
          const { [`grant-${id}`]: _removed, ...restPositions } = state.canvasPositions
          return {
            grants: state.grants.filter(g => g.id !== id),
            groups: state.groups.map(g => ({
              ...g,
              inheritedPermissions: g.inheritedPermissions.filter(p => p !== id),
            })),
            // Cascade: remove deleted grant from any holiday override lists so stale
            // grant references don't silently persist in schedule holiday config.
            schedules: state.schedules.map(s => ({
              ...s,
              holidays: s.holidays.map(h =>
                h.overrideGrantIds.includes(id)
                  ? { ...h, overrideGrantIds: h.overrideGrantIds.filter(gid => gid !== id) }
                  : h
              ),
            })),
            canvasPositions: restPositions,
          }
        }),

      // ── Schedules ─────────────────────────────────────────────────────────────
      addSchedule: (schedule) =>
        set(state => ({
          schedules: [...state.schedules, schedule],
          canvasPositions: {
            ...state.canvasPositions,
            [`schedule-${schedule.id}`]: { x: 340, y: nextY(state.canvasPositions, 'schedule-', 90) },
          },
        })),

      updateSchedule: (schedule) =>
        set(state => ({ schedules: state.schedules.map(s => s.id === schedule.id ? schedule : s) })),

      deleteSchedule: (id) =>
        set(state => {
          const { [`schedule-${id}`]: _removed, ...restPositions } = state.canvasPositions
          return {
            schedules: state.schedules.filter(s => s.id !== id),
            grants:    state.grants.map(g => g.scheduleId === id ? { ...g, scheduleId: undefined } : g),
            policies:  state.policies.map(p => p.scheduleId === id ? { ...p, scheduleId: undefined } : p),
            canvasPositions: restPositions,
          }
        }),

      // ── Policies ──────────────────────────────────────────────────────────────
      addPolicy: (policy) =>
        set(state => ({ policies: [...state.policies, policy] })),

      updatePolicy: (policy) =>
        set(state => ({ policies: state.policies.map(p => p.id === policy.id ? policy : p) })),

      deletePolicy: (id) =>
        set(state => ({ policies: state.policies.filter(p => p.id !== id) })),

      // ── Doors ─────────────────────────────────────────────────────────────────
      addDoor: (door) =>
        set(state => ({
          doors: [...state.doors, door],
          canvasPositions: {
            ...state.canvasPositions,
            [`door-${door.id}`]: { x: 620, y: nextY(state.canvasPositions, 'door-', 70) },
          },
        })),

      updateDoor: (door) =>
        set(state => ({ doors: state.doors.map(d => d.id === door.id ? door : d) })),

      deleteDoor: (id) =>
        set(state => {
          const { [`door-${id}`]: _removed, ...restPositions } = state.canvasPositions
          return {
            doors:         state.doors.filter(d => d.id !== id),
            policies:      state.policies.map(p => ({ ...p, doorIds: p.doorIds.filter(d => d !== id) })),
            controllers:   state.controllers.map(c => ({ ...c, doorIds: c.doorIds.filter(d => d !== id) })),
            inputDevices:  state.inputDevices.filter(dev => dev.doorId !== id),
            outputDevices: state.outputDevices.filter(dev => dev.doorId !== id),
            canvasPositions: restPositions,
          }
        }),

      // ── Zones ─────────────────────────────────────────────────────────────────
      addZone: (zone) =>
        set(state => ({ zones: [...state.zones, zone] })),

      deleteZone: (id) =>
        set(state => ({
          zones: state.zones.filter(z => z.id !== id),
          doors: state.doors.map(d => d.zoneId === id ? { ...d, zoneId: undefined } : d),
          // Cascade: clear targetId on zone-scoped grants that pointed at this zone.
          grants: state.grants.map(g =>
            g.scope === 'zone' && g.targetId === id ? { ...g, targetId: undefined } : g
          ),
        })),

      // ── Sites ─────────────────────────────────────────────────────────────────
      addSite: (site) =>
        set(state => ({ sites: [...state.sites, site] })),

      deleteSite: (id) =>
        set(state => {
          // zoneIds reserved: zones don't currently have canvas positions, but if they gain
          // them in future this is where per-zone canvas cleanup would go.
          const doorIds = state.doors.filter(d => d.siteId === id).map(d => d.id)
          const restPositions = { ...state.canvasPositions }
          doorIds.forEach(did => { delete restPositions[`door-${did}`] })
          return {
            sites:         state.sites.filter(s => s.id !== id),
            zones:         state.zones.filter(z => z.siteId !== id),
            doors:         state.doors.filter(d => d.siteId !== id),
            policies:      state.policies.map(p => ({ ...p, doorIds: p.doorIds.filter(d => !doorIds.includes(d)) })),
            controllers:   state.controllers.filter(c => c.siteId !== id),
            inputDevices:  state.inputDevices.filter(dev => !doorIds.includes(dev.doorId)),
            outputDevices: state.outputDevices.filter(dev => dev.doorId == null || !doorIds.includes(dev.doorId)),
            // Cascade: clear targetId on site-scoped grants that pointed at this site.
            grants: state.grants.map(g =>
              g.scope === 'site' && g.targetId === id ? { ...g, targetId: undefined } : g
            ),
            canvasPositions: restPositions,
          }
        }),

      // ── Controllers ───────────────────────────────────────────────────────────
      addController: (controller) =>
        set(state => ({ controllers: [...state.controllers, controller] })),

      updateController: (controller) =>
        set(state => ({ controllers: state.controllers.map(c => c.id === controller.id ? controller : c) })),

      deleteController: (id) =>
        set(state => ({
          controllers:   state.controllers.filter(c => c.id !== id),
          inputDevices:  state.inputDevices.filter(dev => dev.controllerId !== id),
          outputDevices: state.outputDevices.filter(dev => dev.controllerId !== id),
        })),

      // ── Input Devices ─────────────────────────────────────────────────────────
      addInputDevice: (device) =>
        set(state => ({ inputDevices: [...state.inputDevices, device] })),

      updateInputDevice: (device) =>
        set(state => ({ inputDevices: state.inputDevices.map(d => d.id === device.id ? device : d) })),

      deleteInputDevice: (id) =>
        set(state => ({ inputDevices: state.inputDevices.filter(d => d.id !== id) })),

      // ── Output Devices ────────────────────────────────────────────────────────
      addOutputDevice: (device) =>
        set(state => ({ outputDevices: [...state.outputDevices, device] })),

      updateOutputDevice: (device) =>
        set(state => ({ outputDevices: state.outputDevices.map(d => d.id === device.id ? device : d) })),

      deleteOutputDevice: (id) =>
        set(state => ({ outputDevices: state.outputDevices.filter(d => d.id !== id) })),
    }),
    {
      name: 'axon-store',
      version: 7, // Bump to add Phase 5 visitor & credential management
      partialize: (state) => {
        // Exclude ephemeral UI state and ephemeral SOC data from persistence
        // zoneOccupancy and musterActive are ephemeral (reset on reload)
        const {
          selectedCanvasNodeId: _excl1,
          edgeMode: _excl2,
          events: _excl3,
          alarms: _excl4,
          zoneOccupancy: _excl5,
          musterActive: _excl6,
          ...rest
        } = state
        return rest
      },
    }
  )
)
