import { create } from 'zustand'
import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller, ArmingLog, CanvasPosition,
} from '../types'
import {
  USERS, GROUPS, GRANTS, SCHEDULES, POLICIES,
  DOORS, ZONES, SITES, CONTROLLERS,
} from './seed'

// Default canvas positions — columns by type
function defaultCanvasPositions(): Record<string, CanvasPosition> {
  const positions: Record<string, CanvasPosition> = {}
  // Groups column: x=80
  GROUPS.forEach((g, i) => { positions[`group-${g.id}`] = { x: 80, y: 60 + i * 130 } })
  // Grants column: x=340
  GRANTS.forEach((g, i) => { positions[`grant-${g.id}`] = { x: 340, y: 60 + i * 100 } })
  // Schedules column: x=340, below grants
  SCHEDULES.forEach((s, i) => { positions[`schedule-${s.id}`] = { x: 340, y: 60 + GRANTS.length * 100 + i * 90 } })
  // Doors column: x=620
  DOORS.forEach((d, i) => { positions[`door-${d.id}`] = { x: 620, y: 60 + i * 70 } })
  return positions
}

interface AxonStore {
  // ── Entities ──────────────────────────────────────────────────────────────
  users: User[]
  groups: Group[]
  grants: Grant[]
  schedules: NamedSchedule[]
  policies: Policy[]
  doors: Door[]
  zones: Zone[]
  sites: Site[]
  controllers: Controller[]
  armingLog: ArmingLog[]

  // ── Canvas state ──────────────────────────────────────────────────────────
  canvasPositions: Record<string, CanvasPosition>
  selectedCanvasNodeId: string | null

  // ── Entity actions ────────────────────────────────────────────────────────
  updateSite: (site: Site) => void
  updateZone: (zone: Zone) => void
  addArmingLog: (entry: ArmingLog) => void

  // ── Canvas actions ────────────────────────────────────────────────────────
  setCanvasPosition: (nodeKey: string, pos: CanvasPosition) => void
  setSelectedCanvasNode: (nodeId: string | null) => void
}

export const useStore = create<AxonStore>((set) => ({
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

  canvasPositions:    defaultCanvasPositions(),
  selectedCanvasNodeId: null,

  updateSite: (site) =>
    set(state => ({ sites: state.sites.map(s => s.id === site.id ? site : s) })),

  updateZone: (zone) =>
    set(state => ({ zones: state.zones.map(z => z.id === zone.id ? zone : z) })),

  addArmingLog: (entry) =>
    set(state => ({ armingLog: [entry, ...state.armingLog] })),

  setCanvasPosition: (nodeKey, pos) =>
    set(state => ({ canvasPositions: { ...state.canvasPositions, [nodeKey]: pos } })),

  setSelectedCanvasNode: (nodeId) =>
    set({ selectedCanvasNodeId: nodeId }),
}))
