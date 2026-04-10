import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller, ArmingLog, CanvasPosition,
} from '../types'
import {
  USERS, GROUPS, GRANTS, SCHEDULES, POLICIES,
  DOORS, ZONES, SITES, CONTROLLERS,
} from './seed'

export function defaultCanvasPositions(): Record<string, CanvasPosition> {
  const positions: Record<string, CanvasPosition> = {}

  // Groups: 2-column grid, 25 per column, gap 120
  GROUPS.forEach((g, i) => {
    const col = Math.floor(i / 25)
    const row = i % 25
    positions[`group-${g.id}`] = { x: 80 + col * 180, y: 60 + row * 120 }
  })

  // Grants: 2-column grid, 25 per column, gap 95
  GRANTS.forEach((g, i) => {
    const col = Math.floor(i / 25)
    const row = i % 25
    positions[`grant-${g.id}`] = { x: 460 + col * 180, y: 60 + row * 95 }
  })

  // Schedules: 1 column, x=840, gap 85
  SCHEDULES.forEach((s, i) => {
    positions[`schedule-${s.id}`] = { x: 840, y: 60 + i * 85 }
  })

  // Doors: 12-column grid, 45 per column, gap 65 — covers all ~540 doors
  DOORS.forEach((d, i) => {
    const col = Math.floor(i / 45)
    const row = i % 45
    positions[`door-${d.id}`] = { x: 1040 + col * 140, y: 60 + row * 65 }
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
  users:       User[]
  groups:      Group[]
  grants:      Grant[]
  schedules:   NamedSchedule[]
  policies:    Policy[]
  doors:       Door[]
  zones:       Zone[]
  sites:       Site[]
  controllers: Controller[]
  armingLog:   ArmingLog[]

  // ── Canvas state ──────────────────────────────────────────────────────────
  canvasPositions:      Record<string, CanvasPosition>
  selectedCanvasNodeId: string | null
  edgeMode:             'always' | 'hover' | 'off'

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
  deleteController: (id: string)             => void
}

export const useStore = create<AxonStore>()(
  persist(
    (set) => ({
      users:       USERS,
      groups:      GROUPS,
      grants:      GRANTS,
      schedules:   SCHEDULES,
      policies:    POLICIES,
      doors:       DOORS,
      zones:       ZONES,
      sites:       SITES,
      controllers: CONTROLLERS,
      armingLog:   [],

      canvasPositions:      defaultCanvasPositions(),
      selectedCanvasNodeId: null,
      edgeMode:             'hover' as const,

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
          users:       USERS,
          groups:      GROUPS,
          grants:      GRANTS,
          schedules:   SCHEDULES,
          policies:    POLICIES,
          doors:       DOORS,
          zones:       ZONES,
          sites:       SITES,
          controllers: CONTROLLERS,
          canvasPositions: defaultCanvasPositions(),
          armingLog:   [],
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
            doors:       state.doors.filter(d => d.id !== id),
            policies:    state.policies.map(p => ({ ...p, doorIds: p.doorIds.filter(d => d !== id) })),
            controllers: state.controllers.map(c => ({ ...c, doorIds: c.doorIds.filter(d => d !== id) })),
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
            sites:       state.sites.filter(s => s.id !== id),
            zones:       state.zones.filter(z => z.siteId !== id),
            doors:       state.doors.filter(d => d.siteId !== id),
            policies:    state.policies.map(p => ({ ...p, doorIds: p.doorIds.filter(d => !doorIds.includes(d)) })),
            controllers: state.controllers.filter(c => c.siteId !== id),
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
        set(state => ({ controllers: state.controllers.filter(c => c.id !== id) })),
    }),
    {
      name: 'axon-store',
      partialize: (state) => {
        // Exclude ephemeral UI state from persistence
        const { selectedCanvasNodeId: _excl1, edgeMode: _excl2, ...rest } = state
        return rest
      },
    }
  )
)
