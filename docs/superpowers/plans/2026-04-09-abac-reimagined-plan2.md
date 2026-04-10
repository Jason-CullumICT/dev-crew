# ABAC Reimagined (Axon) — Plan 2: Full CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add create / edit / delete for every entity in the Axon app so a presenter can build any ABAC scenario from scratch without touching seed data.

**Architecture:** Modal-based CRUD — a generic `Modal` wrapper handles overlay/Escape/Save/Cancel; tabbed modals (Groups, Grants, Schedules, Policies) include a sticky tab bar inside the body; a shared `RuleBuilder` component handles all inline attribute-operator-value rows. All writes go through new Zustand store actions with cascade cleanup.

**Tech Stack:** React 19, TypeScript 5.9 strict, Zustand 5, Tailwind v4, uuid v13, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-09-abac-reimagined-plan2-design.md`

---

## File Map

```
abac-reimagined/src/
├── store/
│   └── store.ts                     MODIFY — add add/update/delete for all 9 entity types
├── components/
│   ├── Modal.tsx                     CREATE — generic modal wrapper (overlay, Escape, header, footer)
│   ├── RuleBuilder.tsx               CREATE — inline always-visible rule rows (attribute · op · value)
│   └── CommandPalette.tsx            REPLACE stub — ⌘K global search overlay
├── modals/                           CREATE directory
│   ├── UserModal.tsx
│   ├── GroupModal.tsx
│   ├── GrantModal.tsx
│   ├── ScheduleModal.tsx
│   ├── SiteModal.tsx
│   ├── ZoneModal.tsx
│   ├── DoorModal.tsx
│   ├── PolicyModal.tsx
│   └── ControllerModal.tsx
├── pages/
│   ├── People.tsx                    MODIFY — add Edit/Delete/+ New buttons
│   ├── Groups.tsx                    MODIFY — add Edit/Delete/+ New buttons
│   ├── Grants.tsx                    MODIFY — add Edit/Delete/+ New buttons
│   ├── Schedules.tsx                 MODIFY — add Edit/Delete/+ New buttons
│   ├── Sites.tsx                     MODIFY — add Edit/Delete/+ New buttons
│   ├── Doors.tsx                     MODIFY — add Edit/Delete/+ New buttons
│   ├── Zones.tsx                     CREATE — new list page
│   ├── Policies.tsx                  CREATE — new list page
│   └── Controllers.tsx               CREATE — new list page
├── App.tsx                           MODIFY — add /zones, /policies, /controllers routes
└── components/Layout.tsx             MODIFY — add 3 sidebar items + wire CommandPalette
```

---

## Task 1: Store CRUD Actions

**Files:**
- Modify: `src/store/store.ts`

- [ ] **Step 1: Replace store.ts with full CRUD version**

Replace `src/store/store.ts` entirely:

```typescript
import { create } from 'zustand'
import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller, ArmingLog, CanvasPosition,
} from '../types'
import {
  USERS, GROUPS, GRANTS, SCHEDULES, POLICIES,
  DOORS, ZONES, SITES, CONTROLLERS,
} from './seed'

function defaultCanvasPositions(): Record<string, CanvasPosition> {
  const positions: Record<string, CanvasPosition> = {}
  GROUPS.forEach((g, i)    => { positions[`group-${g.id}`]    = { x: 80,  y: 60 + i * 130 } })
  GRANTS.forEach((g, i)    => { positions[`grant-${g.id}`]    = { x: 340, y: 60 + i * 100 } })
  SCHEDULES.forEach((s, i) => { positions[`schedule-${s.id}`] = { x: 340, y: 60 + GRANTS.length * 100 + i * 90 } })
  DOORS.forEach((d, i)     => { positions[`door-${d.id}`]     = { x: 620, y: 60 + i * 70 } })
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
  canvasPositions:     Record<string, CanvasPosition>
  selectedCanvasNodeId: string | null

  // ── Plan 1 actions ────────────────────────────────────────────────────────
  updateSite:           (site: Site)            => void
  updateZone:           (zone: Zone)            => void
  addArmingLog:         (entry: ArmingLog)      => void
  setCanvasPosition:    (key: string, pos: CanvasPosition) => void
  setSelectedCanvasNode:(id: string | null)     => void

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

  canvasPositions:      defaultCanvasPositions(),
  selectedCanvasNodeId: null,

  // ── Plan 1 ────────────────────────────────────────────────────────────────
  updateSite: (site) =>
    set(state => ({ sites: state.sites.map(s => s.id === site.id ? site : s) })),

  updateZone: (zone) =>
    set(state => ({ zones: state.zones.map(z => z.id === zone.id ? zone : z) })),

  addArmingLog: (entry) =>
    set(state => ({ armingLog: [entry, ...state.armingLog] })),

  setCanvasPosition: (key, pos) =>
    set(state => ({ canvasPositions: { ...state.canvasPositions, [key]: pos } })),

  setSelectedCanvasNode: (id) =>
    set({ selectedCanvasNodeId: id }),

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
    })),

  // ── Sites ─────────────────────────────────────────────────────────────────
  addSite: (site) =>
    set(state => ({ sites: [...state.sites, site] })),

  deleteSite: (id) =>
    set(state => {
      const zoneIds = state.zones.filter(z => z.siteId === id).map(z => z.id)
      const doorIds = state.doors.filter(d => d.siteId === id).map(d => d.id)
      const restPositions = { ...state.canvasPositions }
      doorIds.forEach(did => { delete restPositions[`door-${did}`] })
      return {
        sites:       state.sites.filter(s => s.id !== id),
        zones:       state.zones.filter(z => z.siteId !== id),
        doors:       state.doors.filter(d => d.siteId !== id),
        policies:    state.policies.map(p => ({ ...p, doorIds: p.doorIds.filter(d => !doorIds.includes(d)) })),
        controllers: state.controllers.filter(c => c.siteId !== id),
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
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd abac-reimagined && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/store.ts
git commit -m "feat(axon): store CRUD actions — add/update/delete for all 9 entity types with cascade cleanup"
```

---

## Task 2: Modal Wrapper + RuleBuilder

**Files:**
- Create: `src/components/Modal.tsx`
- Create: `src/components/RuleBuilder.tsx`

- [ ] **Step 1: Create Modal.tsx**

Create `src/components/Modal.tsx`:

```tsx
import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  onSave: () => void
  size?: 'md' | 'lg'
  children: React.ReactNode
}

export default function Modal({ title, onClose, onSave, size = 'md', children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const maxW = size === 'lg' ? 'max-w-xl' : 'max-w-md'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={`bg-[#0d1117] border border-[#1e293b] rounded-xl shadow-2xl w-full ${maxW} max-h-[80vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e293b] shrink-0">
          <span className="text-[13px] font-semibold text-slate-100">{title}</span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#1e293b] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1e293b] text-slate-400 text-[12px] hover:bg-[#263548] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RuleBuilder.tsx**

Create `src/components/RuleBuilder.tsx`:

```tsx
import { v4 as uuidv4 } from 'uuid'
import type { Rule } from '../types'

const ATTRIBUTES = ['department', 'role', 'clearanceLevel', 'type', 'status']
const OPERATORS: Rule['operator'][] = ['==', '!=', '>=', '<=', '>', '<', 'IN', 'NOT_IN']

interface RuleBuilderProps {
  rules: Rule[]
  logic: 'AND' | 'OR'
  onChange: (rules: Rule[], logic: 'AND' | 'OR') => void
  extraAttributes?: string[]
}

export default function RuleBuilder({ rules, logic, onChange, extraAttributes = [] }: RuleBuilderProps) {
  const allAttributes = [...ATTRIBUTES, ...extraAttributes.filter(a => !ATTRIBUTES.includes(a))]

  function updateRule(id: string, patch: Partial<Rule>) {
    onChange(rules.map(r => r.id === id ? { ...r, ...patch } : r), logic)
  }

  function removeRule(id: string) {
    onChange(rules.filter(r => r.id !== id), logic)
  }

  function addRule() {
    onChange([...rules, { id: uuidv4(), leftSide: 'department', operator: '==', rightSide: '' }], logic)
  }

  return (
    <div className="space-y-2">
      {/* AND/OR toggle — only shown when more than one rule */}
      {rules.length > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] text-slate-500">Match:</span>
          <div className="flex rounded overflow-hidden border border-[#1e293b]">
            {(['AND', 'OR'] as const).map(op => (
              <button
                key={op}
                onClick={() => onChange(rules, op)}
                className={`px-3 py-1 text-[9px] font-semibold transition-colors ${
                  logic === op
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#111827] text-slate-500 hover:text-slate-300'
                }`}
              >
                {op === 'AND' ? 'ALL (AND)' : 'ANY (OR)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rule rows — always visible, no expand/collapse */}
      {rules.map(rule => (
        <div key={rule.id} className="flex gap-2 items-center bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2">
          <select
            value={rule.leftSide}
            onChange={e => updateRule(rule.id, { leftSide: e.target.value })}
            className="bg-[#080b12] border border-[#2d3148] rounded px-2 py-1 text-[10px] text-indigo-400 flex-1 focus:outline-none focus:border-indigo-500"
          >
            {allAttributes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={rule.operator}
            onChange={e => updateRule(rule.id, { operator: e.target.value as Rule['operator'] })}
            className="bg-[#080b12] border border-[#2d3148] rounded px-2 py-1 text-[10px] text-slate-400 w-[76px] focus:outline-none focus:border-indigo-500"
          >
            {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>

          <input
            value={Array.isArray(rule.rightSide) ? rule.rightSide.join(', ') : rule.rightSide}
            onChange={e => {
              const val = e.target.value
              const isMulti = rule.operator === 'IN' || rule.operator === 'NOT_IN'
              updateRule(rule.id, {
                rightSide: isMulti ? val.split(',').map(s => s.trim()).filter(Boolean) : val,
              })
            }}
            placeholder={rule.operator === 'IN' || rule.operator === 'NOT_IN' ? 'val1, val2' : 'value'}
            className="bg-[#080b12] border border-[#2d3148] rounded px-2 py-1 text-[10px] text-emerald-400 flex-1 focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={() => removeRule(rule.id)}
            className="text-slate-600 hover:text-red-400 text-sm shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add rule */}
      <button
        onClick={addRule}
        className="w-full border border-dashed border-[#1e293b] rounded-lg py-2 text-[10px] text-slate-600 hover:text-slate-400 hover:border-[#2d3148] transition-colors"
      >
        + Add rule
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Modal.tsx src/components/RuleBuilder.tsx
git commit -m "feat(axon): Modal wrapper + RuleBuilder shared components"
```

---

## Task 3: New Routes + Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`
- Create: `src/pages/Zones.tsx` (stub)
- Create: `src/pages/Policies.tsx` (stub)
- Create: `src/pages/Controllers.tsx` (stub)

- [ ] **Step 1: Create stub pages**

Create `src/pages/Zones.tsx`:
```tsx
export default function Zones() {
  return <div className="p-6 text-slate-400">Zones — coming in Task 6</div>
}
```

Create `src/pages/Policies.tsx`:
```tsx
export default function Policies() {
  return <div className="p-6 text-slate-400">Policies — coming in Task 11</div>
}
```

Create `src/pages/Controllers.tsx`:
```tsx
export default function Controllers() {
  return <div className="p-6 text-slate-400">Controllers — coming in Task 12</div>
}
```

- [ ] **Step 2: Add routes to App.tsx**

Replace `src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Canvas from './pages/Canvas'
import Oracle from './pages/Oracle'
import Reasoner from './pages/Reasoner'
import People from './pages/People'
import Groups from './pages/Groups'
import Grants from './pages/Grants'
import Schedules from './pages/Schedules'
import Doors from './pages/Doors'
import Sites from './pages/Sites'
import Zones from './pages/Zones'
import Policies from './pages/Policies'
import Controllers from './pages/Controllers'
import Intrusion from './pages/Intrusion'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/canvas" replace />} />
        <Route path="canvas"      element={<Canvas />} />
        <Route path="oracle"      element={<Oracle />} />
        <Route path="reasoner"    element={<Reasoner />} />
        <Route path="people"      element={<People />} />
        <Route path="groups"      element={<Groups />} />
        <Route path="grants"      element={<Grants />} />
        <Route path="schedules"   element={<Schedules />} />
        <Route path="doors"       element={<Doors />} />
        <Route path="sites"       element={<Sites />} />
        <Route path="zones"       element={<Zones />} />
        <Route path="policies"    element={<Policies />} />
        <Route path="controllers" element={<Controllers />} />
        <Route path="intrusion"   element={<Intrusion />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 3: Add sidebar items + CommandPalette to Layout.tsx**

Replace `src/components/Layout.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Share2, Search, Activity, Users, UsersRound,
  KeyRound, CalendarClock, DoorOpen, Building2, Shield,
  Layers, FileText, Cpu,
} from 'lucide-react'
import NowPill from './NowPill'
import CommandPalette from './CommandPalette'

const primaryNav = [
  { to: '/canvas',    icon: Share2,       label: 'Canvas',      color: '#6366f1' },
  { to: '/oracle',    icon: Search,       label: 'Oracle',      color: '#8b5cf6' },
  { to: '/reasoner',  icon: Activity,     label: 'Reasoner',    color: '#06b6d4' },
]

const entityNav = [
  { to: '/people',      icon: Users,        label: 'People' },
  { to: '/groups',      icon: UsersRound,   label: 'Groups' },
  { to: '/grants',      icon: KeyRound,     label: 'Grants' },
  { to: '/schedules',   icon: CalendarClock,label: 'Schedules' },
  { to: '/doors',       icon: DoorOpen,     label: 'Doors' },
  { to: '/sites',       icon: Building2,    label: 'Sites' },
  { to: '/zones',       icon: Layers,       label: 'Zones' },
  { to: '/policies',    icon: FileText,     label: 'Policies' },
  { to: '/controllers', icon: Cpu,          label: 'Controllers' },
]

function SidebarItem({ to, icon: Icon, label, color }: { to: string; icon: React.ElementType; label: string; color?: string }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `relative group w-[38px] h-[38px] rounded-lg flex items-center justify-center transition-colors ${
          isActive ? 'bg-white/[0.06] border border-white/10' : 'hover:bg-white/[0.04]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} style={{ color: isActive ? (color ?? '#94a3b8') : '#374151' }} strokeWidth={1.8} />
          <div className="absolute left-[46px] bg-[#1c1f2e] border border-[#2d3148] rounded-md px-2.5 py-1 text-[11px] text-slate-200 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {label}
          </div>
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#060912]">
      {/* Sidebar */}
      <aside className="w-14 shrink-0 bg-[#07090f] border-r border-[#141828] flex flex-col items-center py-3 gap-1 overflow-y-auto">
        {/* Logo */}
        <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shrink-0">
          <span className="text-white text-base font-bold leading-none">A</span>
        </div>

        {primaryNav.map(item => <SidebarItem key={item.to} {...item} />)}

        <div className="w-7 h-px bg-[#141828] my-1.5 shrink-0" />

        {entityNav.map(item => <SidebarItem key={item.to} {...item} />)}

        <div className="w-7 h-px bg-[#141828] my-1.5 shrink-0" />

        <SidebarItem to="/intrusion" icon={Shield} label="Intrusion" />

        <div className="mt-auto w-[30px] h-[30px] rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] text-slate-400 font-semibold cursor-pointer hover:border-indigo-500 transition-colors">
          SC
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[42px] shrink-0 bg-[#08090f] border-b border-[#141828] flex items-center px-4 gap-3">
          <div className="flex-1" />
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <span>⌘K</span>
          </button>
          <NowPill />
        </header>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 4: Verify browser — 3 new sidebar icons appear**

Run `npm run dev` (or check the running dev server). Navigate to `/zones`, `/policies`, `/controllers` — all show stub text. Sidebar has 9 entity items. ⌘K button visible in topbar.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx src/pages/Zones.tsx src/pages/Policies.tsx src/pages/Controllers.tsx
git commit -m "feat(axon): new routes (zones, policies, controllers) + sidebar items + ⌘K trigger"
```

---

## Task 4: UserModal + People Page

**Files:**
- Create: `src/modals/UserModal.tsx`
- Modify: `src/pages/People.tsx`

- [ ] **Step 1: Create UserModal.tsx**

Create `src/modals/UserModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { User } from '../types'

interface Props {
  user?: User        // undefined = new user
  onClose: () => void
}

function blankUser(): User {
  return {
    id: uuidv4(),
    name: '', email: '', department: '', role: '',
    clearanceLevel: 1,
    type: 'employee',
    status: 'active',
    customAttributes: {},
  }
}

export default function UserModal({ user, onClose }: Props) {
  const addUser    = useStore(s => s.addUser)
  const updateUser = useStore(s => s.updateUser)

  const [draft, setDraft] = useState<User>(user ?? blankUser())
  const [attrKey, setAttrKey] = useState('')
  const [attrVal, setAttrVal] = useState('')

  function set<K extends keyof User>(key: K, value: User[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function addAttr() {
    if (!attrKey.trim()) return
    setDraft(d => ({ ...d, customAttributes: { ...d.customAttributes, [attrKey.trim()]: attrVal } }))
    setAttrKey(''); setAttrVal('')
  }

  function removeAttr(key: string) {
    setDraft(d => {
      const { [key]: _, ...rest } = d.customAttributes
      return { ...d, customAttributes: rest }
    })
  }

  function save() {
    if (!draft.name.trim()) return
    if (user) updateUser(draft)
    else addUser(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={user ? `Edit User — ${user.name}` : 'New User'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={draft.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className={labelCls}>Department</label>
            <input className={inputCls} value={draft.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Operations" />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <input className={inputCls} value={draft.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Analyst" />
          </div>
        </div>

        {/* Clearance */}
        <div>
          <label className={labelCls}>Clearance Level</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => set('clearanceLevel', n)}
                className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-colors ${
                  draft.clearanceLevel === n ? 'bg-indigo-600 text-white' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                L{n}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className={labelCls}>Type</label>
          <div className="flex gap-1">
            {(['employee', 'contractor', 'visitor'] as const).map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                  draft.type === t ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-1">
            {(['active', 'suspended', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                  draft.status === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Custom attributes */}
        <div>
          <label className={labelCls}>Custom Attributes</label>
          <div className="space-y-1.5 mb-2">
            {Object.entries(draft.customAttributes).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 bg-[#111827] border border-[#1e293b] rounded px-3 py-1.5">
                <span className="text-[10px] text-indigo-400 flex-1">{k}</span>
                <span className="text-[10px] text-emerald-400 flex-1">{v}</span>
                <button onClick={() => removeAttr(k)} className="text-slate-600 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={attrKey} onChange={e => setAttrKey(e.target.value)} placeholder="key"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-indigo-400 focus:outline-none focus:border-indigo-500" />
            <input value={attrVal} onChange={e => setAttrVal(e.target.value)} placeholder="value"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-emerald-400 focus:outline-none focus:border-indigo-500" />
            <button onClick={addAttr} className="px-3 py-1.5 bg-[#1e293b] rounded text-[11px] text-slate-400 hover:text-slate-200 transition-colors">+ Add</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update People.tsx**

Replace `src/pages/People.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import UserModal from '../modals/UserModal'
import type { User } from '../types'

const STATUS_CLASS = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
  inactive:  'bg-slate-700 text-slate-500 border border-slate-600',
}

const TYPE_CLASS = {
  employee:   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  contractor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  visitor:    'bg-slate-700 text-slate-400 border border-slate-600',
}

export default function People() {
  const users      = useStore(s => s.users)
  const deleteUser = useStore(s => s.deleteUser)

  const [editing, setEditing] = useState<User | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">People</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{users.length} users</span>
          <button
            onClick={() => setEditing('new')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        {users.map(user => (
          <div key={user.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-slate-100">{user.name}</div>
              <div className="text-[10px] text-slate-500">{user.role} · {user.department}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${TYPE_CLASS[user.type]}`}>{user.type}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${STATUS_CLASS[user.status]}`}>{user.status}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">L{user.clearanceLevel}</span>
              <button onClick={() => setEditing(user)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors ml-1">Edit</button>
              <button onClick={() => deleteUser(user.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && (
        <UserModal
          user={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/people`. Expected: `+ New` button in header, each row has Edit/Delete. Click `+ New` — modal opens. Fill in name, click Save — user appears in list. Click Edit on an existing user — modal pre-filled. Click Delete — user removed.

- [ ] **Step 4: Commit**

```bash
git add src/modals/UserModal.tsx src/pages/People.tsx
git commit -m "feat(axon): UserModal + People CRUD — create, edit, delete users"
```

---

## Task 5: SiteModal + Sites Page

**Files:**
- Create: `src/modals/SiteModal.tsx`
- Modify: `src/pages/Sites.tsx`

- [ ] **Step 1: Create SiteModal.tsx**

Create `src/modals/SiteModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Site, SiteStatus } from '../types'

interface Props {
  site?: Site
  onClose: () => void
}

function blankSite(): Site {
  return { id: uuidv4(), name: '', address: '', timezone: 'Australia/Sydney', status: 'Disarmed' }
}

const STATUSES: SiteStatus[] = ['Disarmed', 'Armed', 'PartialArm', 'Alarm', 'Lockdown']

export default function SiteModal({ site, onClose }: Props) {
  const addSite    = useStore(s => s.addSite)
  const updateSite = useStore(s => s.updateSite)

  const [draft, setDraft] = useState<Site>(site ?? blankSite())

  function set<K extends keyof Site>(key: K, value: Site[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function save() {
    if (!draft.name.trim()) return
    if (site) updateSite(draft)
    else addSite(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={site ? `Edit Site — ${site.name}` : 'New Site'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Site name" />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input className={inputCls} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
        </div>
        <div>
          <label className={labelCls}>Timezone (IANA)</label>
          <input className={inputCls} value={draft.timezone} onChange={e => set('timezone', e.target.value)} placeholder="e.g. Australia/Sydney" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`px-3 py-1.5 rounded text-[10px] transition-colors ${
                  draft.status === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update Sites.tsx**

Replace `src/pages/Sites.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import SiteModal from '../modals/SiteModal'
import type { Site, SiteStatus, ZoneStatus } from '../types'

const SITE_STATUS_CLASS: Record<SiteStatus, string> = {
  Disarmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Armed:      'bg-red-500/10 text-red-400 border-red-500/20',
  PartialArm: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Alarm:      'bg-red-600/20 text-red-300 border-red-600/30',
  Lockdown:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const ZONE_STATUS_CLASS: Record<ZoneStatus, string> = {
  Armed:    'bg-red-500/10 text-red-400 border-red-500/20',
  Disarmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Alarm:    'bg-red-600/20 text-red-300 border-red-600/30',
}

export default function Sites() {
  const sites      = useStore(s => s.sites)
  const zones      = useStore(s => s.zones)
  const deleteSite = useStore(s => s.deleteSite)

  const [editing, setEditing] = useState<Site | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Sites & Zones</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{sites.length} sites</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="space-y-4">
        {sites.map(site => {
          const siteZones = zones.filter(z => z.siteId === site.id)
          return (
            <div key={site.id} className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{site.name}</div>
                  <div className="text-[10px] text-slate-500">{site.address}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${SITE_STATUS_CLASS[site.status]}`}>{site.status}</span>
                  <button onClick={() => setEditing(site)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => deleteSite(site.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
              {siteZones.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {siteZones.map(zone => (
                    <div key={zone.id} className="bg-[#080b10] border border-[#141828] rounded-lg px-3 py-2 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium text-slate-300">{zone.name}</div>
                        <div className="text-[9px] text-slate-600">{zone.type}</div>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${ZONE_STATUS_CLASS[zone.status]}`}>{zone.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <SiteModal site={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser, then commit**

Navigate to `/sites`. `+ New` button works, Edit/Delete on each site work. Deleting a site removes its zones from the Zones page (cascade).

```bash
git add src/modals/SiteModal.tsx src/pages/Sites.tsx
git commit -m "feat(axon): SiteModal + Sites CRUD"
```

---

## Task 6: ZoneModal + Zones Page

**Files:**
- Create: `src/modals/ZoneModal.tsx`
- Modify: `src/pages/Zones.tsx`

- [ ] **Step 1: Create ZoneModal.tsx**

Create `src/modals/ZoneModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Zone, ZoneType, ZoneStatus } from '../types'

interface Props {
  zone?: Zone
  onClose: () => void
}

function blankZone(): Zone {
  return { id: uuidv4(), siteId: '', name: '', type: 'Interior', status: 'Disarmed' }
}

const ZONE_TYPES: ZoneType[]   = ['Perimeter', 'Interior', 'Restricted', 'Public', 'Secure']
const ZONE_STATUSES: ZoneStatus[] = ['Disarmed', 'Armed', 'Alarm']

export default function ZoneModal({ zone, onClose }: Props) {
  const sites      = useStore(s => s.sites)
  const addZone    = useStore(s => s.addZone)
  const updateZone = useStore(s => s.updateZone)

  const [draft, setDraft] = useState<Zone>(() => zone ?? { ...blankZone(), siteId: sites[0]?.id ?? '' })

  function set<K extends keyof Zone>(key: K, value: Zone[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function save() {
    if (!draft.name.trim() || !draft.siteId) return
    if (zone) updateZone(draft)
    else addZone(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={zone ? `Edit Zone — ${zone.name}` : 'New Zone'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Zone name" />
        </div>
        <div>
          <label className={labelCls}>Site</label>
          <select className={inputCls} value={draft.siteId} onChange={e => set('siteId', e.target.value)}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <div className="flex gap-1 flex-wrap">
            {ZONE_TYPES.map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`px-3 py-1.5 rounded text-[10px] transition-colors ${
                  draft.type === t ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-1">
            {ZONE_STATUSES.map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`flex-1 py-1.5 rounded text-[10px] transition-colors ${
                  draft.status === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Implement Zones.tsx**

Replace `src/pages/Zones.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import ZoneModal from '../modals/ZoneModal'
import type { Zone, ZoneType, ZoneStatus } from '../types'

const TYPE_CLASS: Record<ZoneType, string> = {
  Perimeter:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Interior:   'bg-slate-700 text-slate-400 border-slate-600',
  Restricted: 'bg-red-500/10 text-red-400 border-red-500/20',
  Public:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Secure:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const STATUS_CLASS: Record<ZoneStatus, string> = {
  Armed:    'bg-red-500/10 text-red-400 border-red-500/20',
  Disarmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Alarm:    'bg-red-600/20 text-red-300 border-red-600/30',
}

export default function Zones() {
  const zones      = useStore(s => s.zones)
  const sites      = useStore(s => s.sites)
  const deleteZone = useStore(s => s.deleteZone)

  const [editing, setEditing] = useState<Zone | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Zones</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{zones.length} zones</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {zones.map(zone => {
          const site = sites.find(s => s.id === zone.siteId)
          return (
            <div key={zone.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-100">{zone.name}</div>
                <div className="text-[10px] text-slate-500">{site?.name ?? zone.siteId}</div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${TYPE_CLASS[zone.type]}`}>{zone.type}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${STATUS_CLASS[zone.status]}`}>{zone.status}</span>
              <button onClick={() => setEditing(zone)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
              <button onClick={() => deleteZone(zone.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <ZoneModal zone={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

Navigate to `/zones`. All 6 seed zones visible. Add new zone → appears. Edit → modal pre-filled. Delete → cascades clear door.zoneId.

```bash
git add src/modals/ZoneModal.tsx src/pages/Zones.tsx
git commit -m "feat(axon): ZoneModal + Zones page CRUD"
```

---

## Task 7: DoorModal + Doors Page

**Files:**
- Create: `src/modals/DoorModal.tsx`
- Modify: `src/pages/Doors.tsx`

- [ ] **Step 1: Create DoorModal.tsx**

Create `src/modals/DoorModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Door } from '../types'

interface Props {
  door?: Door
  onClose: () => void
}

function blankDoor(firstSiteId: string): Door {
  return { id: uuidv4(), name: '', siteId: firstSiteId, zoneId: undefined, description: '', customAttributes: {} }
}

export default function DoorModal({ door, onClose }: Props) {
  const sites      = useStore(s => s.sites)
  const zones      = useStore(s => s.zones)
  const addDoor    = useStore(s => s.addDoor)
  const updateDoor = useStore(s => s.updateDoor)

  const [draft, setDraft] = useState<Door>(door ?? blankDoor(sites[0]?.id ?? ''))
  const [attrKey, setAttrKey] = useState('')
  const [attrVal, setAttrVal] = useState('')

  const siteZones = zones.filter(z => z.siteId === draft.siteId)

  function set<K extends keyof Door>(key: K, value: Door[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function addAttr() {
    if (!attrKey.trim()) return
    setDraft(d => ({ ...d, customAttributes: { ...d.customAttributes, [attrKey.trim()]: attrVal } }))
    setAttrKey(''); setAttrVal('')
  }

  function removeAttr(key: string) {
    setDraft(d => {
      const { [key]: _, ...rest } = d.customAttributes
      return { ...d, customAttributes: rest }
    })
  }

  function save() {
    if (!draft.name.trim()) return
    if (door) updateDoor(draft)
    else addDoor(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={door ? `Edit Door — ${door.name}` : 'New Door'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Door name" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={draft.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
        </div>
        <div>
          <label className={labelCls}>Site</label>
          <select className={inputCls} value={draft.siteId}
            onChange={e => setDraft(d => ({ ...d, siteId: e.target.value, zoneId: undefined }))}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Zone (optional)</label>
          <select className={inputCls} value={draft.zoneId ?? ''}
            onChange={e => set('zoneId', e.target.value || undefined)}>
            <option value="">— None —</option>
            {siteZones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.type})</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Custom Attributes</label>
          <div className="space-y-1.5 mb-2">
            {Object.entries(draft.customAttributes).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 bg-[#111827] border border-[#1e293b] rounded px-3 py-1.5">
                <span className="text-[10px] text-indigo-400 flex-1">{k}</span>
                <span className="text-[10px] text-emerald-400 flex-1">{v}</span>
                <button onClick={() => removeAttr(k)} className="text-slate-600 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={attrKey} onChange={e => setAttrKey(e.target.value)} placeholder="key"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-indigo-400 focus:outline-none focus:border-indigo-500" />
            <input value={attrVal} onChange={e => setAttrVal(e.target.value)} placeholder="value"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-emerald-400 focus:outline-none focus:border-indigo-500" />
            <button onClick={addAttr} className="px-3 py-1.5 bg-[#1e293b] rounded text-[11px] text-slate-400 hover:text-slate-200 transition-colors">+ Add</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update Doors.tsx**

Replace `src/pages/Doors.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import DoorModal from '../modals/DoorModal'
import type { Door } from '../types'

export default function Doors() {
  const doors      = useStore(s => s.doors)
  const zones      = useStore(s => s.zones)
  const sites      = useStore(s => s.sites)
  const deleteDoor = useStore(s => s.deleteDoor)

  const [editing, setEditing] = useState<Door | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Doors</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{doors.length} doors</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {doors.map(door => {
          const zone = zones.find(z => z.id === door.zoneId)
          const site = sites.find(s => s.id === door.siteId)
          const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'
          return (
            <div key={door.id} className={`bg-[#0a0d14] border rounded-lg px-4 py-3 flex items-center gap-3 ${isRestricted ? 'border-red-900/40' : 'border-[#1e293b]'}`}>
              <span className="text-[18px] shrink-0">🚪</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-semibold ${isRestricted ? 'text-red-300' : 'text-slate-200'}`}>{door.name}</div>
                <div className="text-[10px] text-slate-600">{site?.name} {zone ? `· ${zone.name} (${zone.type})` : ''}</div>
              </div>
              <button onClick={() => setEditing(door)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
              <button onClick={() => deleteDoor(door.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <DoorModal door={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

```bash
git add src/modals/DoorModal.tsx src/pages/Doors.tsx
git commit -m "feat(axon): DoorModal + Doors CRUD"
```

---

## Task 8: GroupModal + Groups Page

**Files:**
- Create: `src/modals/GroupModal.tsx`
- Modify: `src/pages/Groups.tsx`

- [ ] **Step 1: Create GroupModal.tsx**

Create `src/modals/GroupModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import RuleBuilder from '../components/RuleBuilder'
import { useStore } from '../store/store'
import type { Group, Rule } from '../types'

interface Props {
  group?: Group
  onClose: () => void
}

function blankGroup(): Group {
  return { id: uuidv4(), name: '', description: '', membershipType: 'static', members: [], membershipRules: [], subGroups: [], inheritedPermissions: [] }
}

type Tab = 'Basics' | 'Members' | 'Rules' | 'Grants'
const TABS: Tab[] = ['Basics', 'Members', 'Rules', 'Grants']

export default function GroupModal({ group, onClose }: Props) {
  const users       = useStore(s => s.users)
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const addGroup    = useStore(s => s.addGroup)
  const updateGroup = useStore(s => s.updateGroup)

  const [draft, setDraft] = useState<Group>(group ?? blankGroup())
  const [tab, setTab]     = useState<Tab>('Basics')
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND')

  // Exclude self from subgroup picker
  const otherGroups = groups.filter(g => g.id !== draft.id)

  function toggleMember(uid: string) {
    setDraft(d => ({
      ...d,
      members: d.members.includes(uid) ? d.members.filter(m => m !== uid) : [...d.members, uid],
    }))
  }

  function toggleSubGroup(gid: string) {
    setDraft(d => ({
      ...d,
      subGroups: d.subGroups.includes(gid) ? d.subGroups.filter(s => s !== gid) : [...d.subGroups, gid],
    }))
  }

  function toggleGrant(gid: string) {
    setDraft(d => ({
      ...d,
      inheritedPermissions: d.inheritedPermissions.includes(gid)
        ? d.inheritedPermissions.filter(p => p !== gid)
        : [...d.inheritedPermissions, gid],
    }))
  }

  function onRulesChange(rules: Rule[], l: 'AND' | 'OR') {
    setDraft(d => ({ ...d, membershipRules: rules }))
    setLogic(l)
  }

  function save() {
    if (!draft.name.trim()) return
    if (group) updateGroup(draft)
    else addGroup(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={group ? `Edit Group — ${group.name}` : 'New Group'} onClose={onClose} onSave={save} size="lg">
      {/* Tab bar — sticky inside scrollable body */}
      <div className="sticky top-0 z-10 flex border-b border-[#1e293b] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
              tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-400'
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'Basics' && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Group name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls + ' resize-none h-20'} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Describe this group's purpose" />
            </div>
            {/* Subgroups picker on Basics tab */}
            <div>
              <label className={labelCls}>Sub-groups (members inherit this group's grants)</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {otherGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                    <input type="checkbox" checked={draft.subGroups.includes(g.id)} onChange={() => toggleSubGroup(g.id)}
                      className="accent-indigo-500" />
                    <span className="text-[11px] text-slate-300">{g.name}</span>
                  </label>
                ))}
                {otherGroups.length === 0 && <p className="text-[10px] text-slate-600 px-3">No other groups exist yet.</p>}
              </div>
            </div>
          </>
        )}

        {tab === 'Members' && (
          <div>
            <label className={labelCls}>Users ({draft.members.length} selected)</label>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                  <input type="checkbox" checked={draft.members.includes(u.id)} onChange={() => toggleMember(u.id)}
                    className="accent-indigo-500" />
                  <div className="flex-1">
                    <div className="text-[11px] text-slate-300">{u.name}</div>
                    <div className="text-[9px] text-slate-600">{u.department} · L{u.clearanceLevel}</div>
                  </div>
                  <span className="text-[9px] text-slate-600">{u.status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'Rules' && (
          <div>
            <p className="text-[10px] text-slate-500 mb-3">Users matching these rules are dynamically included in the group alongside any static members.</p>
            <RuleBuilder rules={draft.membershipRules} logic={logic} onChange={onRulesChange} />
          </div>
        )}

        {tab === 'Grants' && (
          <div>
            <label className={labelCls}>Inherited Grants ({draft.inheritedPermissions.length} selected)</label>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {grants.map(g => (
                <label key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                  <input type="checkbox" checked={draft.inheritedPermissions.includes(g.id)} onChange={() => toggleGrant(g.id)}
                    className="accent-indigo-500" />
                  <div className="flex-1">
                    <div className="text-[11px] text-slate-300">{g.name}</div>
                    <div className="text-[9px] text-slate-600">{g.scope} · {g.applicationMode}</div>
                  </div>
                </label>
              ))}
              {grants.length === 0 && <p className="text-[10px] text-slate-600 px-3">No grants exist yet.</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update Groups.tsx**

Replace `src/pages/Groups.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import GroupModal from '../modals/GroupModal'
import type { Group } from '../types'

export default function Groups() {
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const deleteGroup = useStore(s => s.deleteGroup)

  const [editing, setEditing] = useState<Group | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Groups</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{groups.length} groups</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid gap-3">
        {groups.map(group => {
          const subGroupNames = group.subGroups.map(id => groups.find(g => g.id === id)?.name ?? id)
          const grantNames    = group.inheritedPermissions.map(id => grants.find(g => g.id === id)?.name ?? id)
          const memberCount   = group.members.length

          return (
            <div key={group.id} className="bg-[#0f1320] border border-[#1e2d4a] rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{group.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{group.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {memberCount > 0 && <span className="text-[9px] text-slate-600">{memberCount} members</span>}
                  <button onClick={() => setEditing(group)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => deleteGroup(group.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>

              {group.membershipRules.length > 0 && (
                <div className="space-y-1">
                  {group.membershipRules.map(r => (
                    <div key={r.id} className="bg-[#111827] rounded px-2 py-1.5 text-[10px] font-mono text-slate-400">
                      <span className="text-indigo-400">{r.leftSide}</span>{' '}
                      <span className="text-slate-600">{r.operator}</span>{' '}
                      <span className="text-emerald-400">"{Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}"</span>
                    </div>
                  ))}
                </div>
              )}

              {subGroupNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {subGroupNames.map(name => (
                    <span key={name} className="text-[9px] bg-[#080b12] border border-[#1e293b] text-slate-500 px-2 py-0.5 rounded">↳ {name}</span>
                  ))}
                </div>
              )}

              {grantNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {grantNames.map(name => (
                    <span key={name} className="text-[9px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-2 py-0.5 rounded">{name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <GroupModal group={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

Navigate to `/groups`. Tabs work (Basics / Members / Rules / Grants). Rule builder adds/removes rows without layout shift. Save creates a new group visible in the list.

```bash
git add src/modals/GroupModal.tsx src/pages/Groups.tsx
git commit -m "feat(axon): GroupModal (tabbed) + Groups CRUD — members, rules, subgroups, grants"
```

---

## Task 9: GrantModal + Grants Page

**Files:**
- Create: `src/modals/GrantModal.tsx`
- Modify: `src/pages/Grants.tsx`

- [ ] **Step 1: Create GrantModal.tsx**

Create `src/modals/GrantModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import RuleBuilder from '../components/RuleBuilder'
import { useStore } from '../store/store'
import type { Grant, ActionType, Rule } from '../types'

interface Props {
  grant?: Grant
  onClose: () => void
}

const ALL_ACTIONS: ActionType[] = ['unlock', 'arm', 'disarm', 'lockdown', 'view_logs', 'manage_users', 'manage_tasks', 'override']

function blankGrant(): Grant {
  return {
    id: uuidv4(), name: '', description: '',
    scope: 'global', targetId: undefined,
    actions: [], applicationMode: 'assigned',
    conditions: [], conditionLogic: 'AND',
    scheduleId: undefined, customAttributes: {},
  }
}

type Tab = 'Basics' | 'Actions' | 'Conditions' | 'Schedule'
const TABS: Tab[] = ['Basics', 'Actions', 'Conditions', 'Schedule']

export default function GrantModal({ grant, onClose }: Props) {
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const schedules   = useStore(s => s.schedules)
  const addGrant    = useStore(s => s.addGrant)
  const updateGrant = useStore(s => s.updateGrant)

  const [draft, setDraft]   = useState<Grant>(grant ?? blankGrant())
  const [tab, setTab]       = useState<Tab>('Basics')
  const [logic, setLogic]   = useState<'AND' | 'OR'>(grant?.conditionLogic ?? 'AND')

  function toggleAction(a: ActionType) {
    setDraft(d => ({
      ...d,
      actions: d.actions.includes(a) ? d.actions.filter(x => x !== a) : [...d.actions, a],
    }))
  }

  function onConditionsChange(rules: Rule[], l: 'AND' | 'OR') {
    setDraft(d => ({ ...d, conditions: rules, conditionLogic: l }))
    setLogic(l)
  }

  function save() {
    if (!draft.name.trim()) return
    if (grant) updateGrant(draft)
    else addGrant(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  const scopeTargets = draft.scope === 'site' ? sites : draft.scope === 'zone' ? zones : []

  return (
    <Modal title={grant ? `Edit Grant — ${grant.name}` : 'New Grant'} onClose={onClose} onSave={save} size="lg">
      <div className="sticky top-0 z-10 flex border-b border-[#1e293b] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
              tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-400'
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'Basics' && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Grant name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What this grant allows" />
            </div>
            <div>
              <label className={labelCls}>Scope</label>
              <div className="flex gap-1">
                {(['global', 'site', 'zone'] as const).map(s => (
                  <button key={s} onClick={() => setDraft(d => ({ ...d, scope: s, targetId: undefined }))}
                    className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                      draft.scope === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {draft.scope !== 'global' && (
              <div>
                <label className={labelCls}>Target {draft.scope === 'site' ? 'Site' : 'Zone'}</label>
                <select className={inputCls} value={draft.targetId ?? ''}
                  onChange={e => setDraft(d => ({ ...d, targetId: e.target.value || undefined }))}>
                  <option value="">— Select —</option>
                  {scopeTargets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Application Mode</label>
              <div className="flex gap-1">
                {(['assigned', 'conditional', 'auto'] as const).map(m => (
                  <button key={m} onClick={() => setDraft(d => ({ ...d, applicationMode: m }))}
                    className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                      draft.applicationMode === m ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'Actions' && (
          <div>
            <label className={labelCls}>Permitted Actions ({draft.actions.length} selected)</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ACTIONS.map(a => (
                <label key={a} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#111827] border border-[#1e293b] hover:border-indigo-500/30 cursor-pointer transition-colors">
                  <input type="checkbox" checked={draft.actions.includes(a)} onChange={() => toggleAction(a)} className="accent-indigo-500" />
                  <span className="text-[11px] text-slate-300 font-mono">{a}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'Conditions' && (
          <div>
            <p className="text-[10px] text-slate-500 mb-3">Conditions restrict which users this grant applies to, regardless of group membership.</p>
            <RuleBuilder rules={draft.conditions} logic={logic} onChange={onConditionsChange} />
          </div>
        )}

        {tab === 'Schedule' && (
          <div>
            <label className={labelCls}>Time Schedule (optional)</label>
            <select className={inputCls} value={draft.scheduleId ?? ''}
              onChange={e => setDraft(d => ({ ...d, scheduleId: e.target.value || undefined }))}>
              <option value="">— No schedule (always active) —</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.timezone})</option>)}
            </select>
            {draft.scheduleId && (
              <p className="text-[10px] text-slate-600 mt-2">This grant will only be active during the selected schedule's windows.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update Grants.tsx**

Replace `src/pages/Grants.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import GrantModal from '../modals/GrantModal'
import type { Grant } from '../types'

const SCOPE_CLASS = {
  global: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  site:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  zone:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const MODE_CLASS = {
  assigned:    'bg-slate-700 text-slate-400 border-slate-600',
  conditional: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  auto:        'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export default function Grants() {
  const grants      = useStore(s => s.grants)
  const schedules   = useStore(s => s.schedules)
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const deleteGrant = useStore(s => s.deleteGrant)

  const [editing, setEditing] = useState<Grant | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Grants</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{grants.length} grants</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {grants.map(grant => {
          const schedule = grant.scheduleId ? schedules.find(s => s.id === grant.scheduleId) : null
          const targetName = grant.scope === 'site'
            ? sites.find(s => s.id === grant.targetId)?.name
            : grant.scope === 'zone'
              ? zones.find(z => z.id === grant.targetId)?.name
              : null

          return (
            <div key={grant.id} className="bg-[#0c0a1e] border border-[#2e1f6b] rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-bold text-violet-200">{grant.name}</div>
                <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${SCOPE_CLASS[grant.scope]}`}>{grant.scope}</span>
              </div>
              {grant.description && <div className="text-[10px] text-slate-500">{grant.description}</div>}
              <div className="flex flex-wrap gap-1">
                {grant.actions.map(a => (
                  <span key={a} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-400 px-1.5 py-0.5 rounded">{a}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${MODE_CLASS[grant.applicationMode]}`}>{grant.applicationMode}</span>
                {schedule && <span className="text-[9px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-1.5 py-0.5 rounded">{schedule.name}</span>}
                {targetName && <span className="text-[9px] text-slate-500">→ {targetName}</span>}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditing(grant)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                <button onClick={() => deleteGrant(grant.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <GrantModal grant={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

Navigate to `/grants`. All 4 tabs work. Actions tab shows checkbox grid. Conditions tab shows rule builder. Schedule tab shows dropdown.

```bash
git add src/modals/GrantModal.tsx src/pages/Grants.tsx
git commit -m "feat(axon): GrantModal (tabbed) + Grants CRUD — actions, conditions, schedule"
```

---

## Task 10: ScheduleModal + Schedules Page

**Files:**
- Create: `src/modals/ScheduleModal.tsx`
- Modify: `src/pages/Schedules.tsx`

- [ ] **Step 1: Create ScheduleModal.tsx**

Create `src/modals/ScheduleModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { NamedSchedule, TimeWindow, Holiday, DayOfWeek } from '../types'

interface Props {
  schedule?: NamedSchedule
  onClose: () => void
}

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function blankSchedule(): NamedSchedule {
  return { id: uuidv4(), name: '', timezone: 'Australia/Sydney', windows: [], holidays: [] }
}

function blankWindow(): TimeWindow {
  return { id: uuidv4(), days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '18:00' }
}

function blankHoliday(): Holiday {
  return { id: uuidv4(), name: '', month: 1, day: 1, behavior: 'deny_all', overrideGrantIds: [] }
}

type Tab = 'Basics' | 'Windows' | 'Holidays'
const TABS: Tab[] = ['Basics', 'Windows', 'Holidays']

export default function ScheduleModal({ schedule, onClose }: Props) {
  const grants          = useStore(s => s.grants)
  const addSchedule     = useStore(s => s.addSchedule)
  const updateSchedule  = useStore(s => s.updateSchedule)

  const [draft, setDraft] = useState<NamedSchedule>(schedule ?? blankSchedule())
  const [tab, setTab]     = useState<Tab>('Basics')

  // ── Windows helpers ────────────────────────────────────────────────────────

  function addWindow() {
    setDraft(d => ({ ...d, windows: [...d.windows, blankWindow()] }))
  }

  function removeWindow(id: string) {
    setDraft(d => ({ ...d, windows: d.windows.filter(w => w.id !== id) }))
  }

  function updateWindow(id: string, patch: Partial<TimeWindow>) {
    setDraft(d => ({ ...d, windows: d.windows.map(w => w.id === id ? { ...w, ...patch } : w) }))
  }

  function toggleDay(windowId: string, day: DayOfWeek) {
    const win = draft.windows.find(w => w.id === windowId)
    if (!win) return
    const days = win.days.includes(day) ? win.days.filter(d => d !== day) : [...win.days, day]
    updateWindow(windowId, { days })
  }

  // ── Holiday helpers ────────────────────────────────────────────────────────

  function addHoliday() {
    setDraft(d => ({ ...d, holidays: [...d.holidays, blankHoliday()] }))
  }

  function removeHoliday(id: string) {
    setDraft(d => ({ ...d, holidays: d.holidays.filter(h => h.id !== id) }))
  }

  function updateHoliday(id: string, patch: Partial<Holiday>) {
    setDraft(d => ({ ...d, holidays: d.holidays.map(h => h.id === id ? { ...h, ...patch } : h) }))
  }

  function toggleOverrideGrant(holidayId: string, grantId: string) {
    const hol = draft.holidays.find(h => h.id === holidayId)
    if (!hol) return
    const ids = hol.overrideGrantIds.includes(grantId)
      ? hol.overrideGrantIds.filter(g => g !== grantId)
      : [...hol.overrideGrantIds, grantId]
    updateHoliday(holidayId, { overrideGrantIds: ids })
  }

  function save() {
    if (!draft.name.trim()) return
    if (schedule) updateSchedule(draft)
    else addSchedule(draft)
    onClose()
  }

  const inputCls = 'bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={schedule ? `Edit Schedule — ${schedule.name}` : 'New Schedule'} onClose={onClose} onSave={save} size="lg">
      <div className="sticky top-0 z-10 flex border-b border-[#1e293b] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
              tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-400'
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'Basics' && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls + ' w-full'} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Schedule name" />
            </div>
            <div>
              <label className={labelCls}>Timezone (IANA)</label>
              <input className={inputCls + ' w-full'} value={draft.timezone} onChange={e => setDraft(d => ({ ...d, timezone: e.target.value }))} placeholder="e.g. Australia/Sydney" />
            </div>
          </>
        )}

        {tab === 'Windows' && (
          <div className="space-y-3">
            {draft.windows.map(win => (
              <div key={win.id} className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 space-y-3">
                {/* Day toggles */}
                <div className="flex gap-1">
                  {ALL_DAYS.map(day => (
                    <button key={day} onClick={() => toggleDay(win.id, day)}
                      className={`flex-1 py-1 rounded text-[9px] font-semibold transition-colors ${
                        win.days.includes(day) ? 'bg-teal-600 text-teal-950' : 'bg-[#0b0e18] text-slate-600 hover:text-slate-400 border border-[#1e293b]'
                      }`}>
                      {day}
                    </button>
                  ))}
                </div>
                {/* Time range */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Start</label>
                    <input type="time" className={inputCls + ' w-full'} value={win.startTime}
                      onChange={e => updateWindow(win.id, { startTime: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>End</label>
                    <input type="time" className={inputCls + ' w-full'} value={win.endTime}
                      onChange={e => updateWindow(win.id, { endTime: e.target.value })} />
                  </div>
                  <button onClick={() => removeWindow(win.id)} className="text-slate-600 hover:text-red-400 text-sm mt-4 transition-colors">✕</button>
                </div>
              </div>
            ))}
            <button onClick={addWindow}
              className="w-full border border-dashed border-[#1e293b] rounded-lg py-2 text-[10px] text-slate-600 hover:text-slate-400 hover:border-[#2d3148] transition-colors">
              + Add window
            </button>
          </div>
        )}

        {tab === 'Holidays' && (
          <div className="space-y-3">
            {draft.holidays.map(h => (
              <div key={h.id} className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 space-y-3">
                <div className="flex gap-2">
                  <input className={inputCls + ' flex-1'} value={h.name} onChange={e => updateHoliday(h.id, { name: e.target.value })} placeholder="Holiday name" />
                  <input type="number" min={1} max={12} className={inputCls + ' w-16'} value={h.month}
                    onChange={e => updateHoliday(h.id, { month: Number(e.target.value) })} placeholder="MM" />
                  <input type="number" min={1} max={31} className={inputCls + ' w-16'} value={h.day}
                    onChange={e => updateHoliday(h.id, { day: Number(e.target.value) })} placeholder="DD" />
                  <button onClick={() => removeHoliday(h.id)} className="text-slate-600 hover:text-red-400 text-sm transition-colors">✕</button>
                </div>
                {/* Behavior */}
                <div className="flex gap-1">
                  {(['deny_all', 'allow_with_override', 'normal'] as const).map(b => (
                    <button key={b} onClick={() => updateHoliday(h.id, { behavior: b })}
                      className={`flex-1 py-1 rounded text-[9px] font-semibold transition-colors ${
                        h.behavior === b ? 'bg-indigo-600 text-white' : 'bg-[#0b0e18] text-slate-600 hover:text-slate-400 border border-[#1e293b]'
                      }`}>
                      {b === 'deny_all' ? 'Deny All' : b === 'allow_with_override' ? 'Override' : 'Normal'}
                    </button>
                  ))}
                </div>
                {/* Override settings — shown only when behavior is allow_with_override */}
                {h.behavior === 'allow_with_override' && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className={labelCls}>Required Clearance</label>
                      <input type="number" min={1} max={5} className={inputCls + ' w-24'}
                        value={h.requiredClearance ?? ''}
                        onChange={e => updateHoliday(h.id, { requiredClearance: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="L1-L5" />
                    </div>
                    <div>
                      <label className={labelCls}>Override Grants</label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {grants.map(g => (
                          <label key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#0b0e18] cursor-pointer">
                            <input type="checkbox" checked={h.overrideGrantIds.includes(g.id)}
                              onChange={() => toggleOverrideGrant(h.id, g.id)} className="accent-indigo-500" />
                            <span className="text-[10px] text-slate-400">{g.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addHoliday}
              className="w-full border border-dashed border-[#1e293b] rounded-lg py-2 text-[10px] text-slate-600 hover:text-slate-400 hover:border-[#2d3148] transition-colors">
              + Add holiday
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update Schedules.tsx**

Replace `src/pages/Schedules.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import ScheduleModal from '../modals/ScheduleModal'
import { buildNowContext } from '../engine/scheduleEngine'
import type { NamedSchedule, DayOfWeek } from '../types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Schedules() {
  const schedules       = useStore(s => s.schedules)
  const grants          = useStore(s => s.grants)
  const deleteSchedule  = useStore(s => s.deleteSchedule)
  const now             = buildNowContext()

  const [editing, setEditing] = useState<NamedSchedule | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Schedules</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{schedules.length} schedules</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid gap-4">
        {schedules.map(schedule => {
          const usedBy = grants.filter(g => g.scheduleId === schedule.id)
          return (
            <div key={schedule.id} className="bg-[#07100e] border border-[#134e4a] rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-teal-200">{schedule.name}</div>
                  <div className="text-[10px] text-teal-900 mt-0.5">{schedule.timezone}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {usedBy.length > 0 && <div className="text-[9px] text-teal-900">{usedBy.length} grant{usedBy.length !== 1 ? 's' : ''}</div>}
                  <button onClick={() => setEditing(schedule)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => deleteSchedule(schedule.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#134e4a] font-semibold mb-2">Time Windows</div>
                <div className="grid grid-cols-7 gap-px">
                  {DAYS.map(day => {
                    const active = schedule.windows.some(w => w.days.includes(day))
                    const isToday = day === now.dayOfWeek
                    return (
                      <div key={day} className={`text-center py-1.5 rounded text-[9px] font-semibold ${
                        active ? isToday ? 'bg-teal-500 text-teal-950' : 'bg-teal-500/20 text-teal-400'
                        : 'bg-[#0b0e18] text-[#134e4a]'
                      }`}>{day}</div>
                    )
                  })}
                </div>
                {schedule.windows.map(w => (
                  <div key={w.id} className="text-[10px] text-teal-800 mt-1.5">
                    {w.days.join(', ')} · {w.startTime}–{w.endTime}
                  </div>
                ))}
              </div>

              {schedule.holidays.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#134e4a] font-semibold mb-2">Holidays</div>
                  <div className="space-y-1.5">
                    {schedule.holidays.map(h => (
                      <div key={h.id} className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          h.behavior === 'deny_all' ? 'bg-red-500/10 text-red-400' :
                          h.behavior === 'allow_with_override' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {h.behavior === 'deny_all' ? 'DENY ALL' : h.behavior === 'allow_with_override' ? 'OVERRIDE' : 'NORMAL'}
                        </span>
                        <span className="text-[10px] text-slate-400">{h.name}</span>
                        <span className="text-[9px] text-slate-600">{h.month}/{h.day}</span>
                        {h.requiredClearance && <span className="text-[9px] text-amber-600">L{h.requiredClearance}+</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usedBy.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {usedBy.map(g => (
                    <span key={g.id} className="text-[9px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-1.5 py-0.5 rounded">{g.name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <ScheduleModal schedule={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

Navigate to `/schedules`. Windows tab shows day toggles + time pickers. Holidays tab — add a holiday, set behavior to "Override", see required clearance + grants picker appear.

```bash
git add src/modals/ScheduleModal.tsx src/pages/Schedules.tsx
git commit -m "feat(axon): ScheduleModal (tabbed) + Schedules CRUD — windows, holidays, override grants"
```

---

## Task 11: PolicyModal + Policies Page

**Files:**
- Create: `src/modals/PolicyModal.tsx`
- Modify: `src/pages/Policies.tsx`

- [ ] **Step 1: Create PolicyModal.tsx**

Create `src/modals/PolicyModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import RuleBuilder from '../components/RuleBuilder'
import { useStore } from '../store/store'
import type { Policy, Rule } from '../types'

interface Props {
  policy?: Policy
  onClose: () => void
}

function blankPolicy(): Policy {
  return { id: uuidv4(), name: '', description: '', rules: [], logicalOperator: 'AND', doorIds: [], scheduleId: undefined }
}

type Tab = 'Basics' | 'Rules' | 'Doors' | 'Schedule'
const TABS: Tab[] = ['Basics', 'Rules', 'Doors', 'Schedule']

export default function PolicyModal({ policy, onClose }: Props) {
  const doors         = useStore(s => s.doors)
  const sites         = useStore(s => s.sites)
  const schedules     = useStore(s => s.schedules)
  const addPolicy     = useStore(s => s.addPolicy)
  const updatePolicy  = useStore(s => s.updatePolicy)

  const [draft, setDraft] = useState<Policy>(policy ?? blankPolicy())
  const [tab, setTab]     = useState<Tab>('Basics')
  const [logic, setLogic] = useState<'AND' | 'OR'>(policy?.logicalOperator ?? 'AND')

  function toggleDoor(did: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(did) ? d.doorIds.filter(x => x !== did) : [...d.doorIds, did],
    }))
  }

  function onRulesChange(rules: Rule[], l: 'AND' | 'OR') {
    setDraft(d => ({ ...d, rules, logicalOperator: l }))
    setLogic(l)
  }

  function save() {
    if (!draft.name.trim()) return
    if (policy) updatePolicy(draft)
    else addPolicy(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={policy ? `Edit Policy — ${policy.name}` : 'New Policy'} onClose={onClose} onSave={save} size="lg">
      <div className="sticky top-0 z-10 flex border-b border-[#1e293b] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
              tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-400'
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'Basics' && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Policy name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls + ' resize-none h-20'} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Describe what this policy enforces" />
            </div>
          </>
        )}

        {tab === 'Rules' && (
          <div>
            <p className="text-[10px] text-slate-500 mb-3">Policy rules are evaluated against the requesting user. All rules must pass (AND) or any rule must pass (OR) for the policy to allow access.</p>
            <RuleBuilder rules={draft.rules} logic={logic} onChange={onRulesChange} />
          </div>
        )}

        {tab === 'Doors' && (
          <div>
            <label className={labelCls}>Applies to Doors ({draft.doorIds.length} selected)</label>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {doors.map(door => {
                const site = sites.find(s => s.id === door.siteId)
                return (
                  <label key={door.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                    <input type="checkbox" checked={draft.doorIds.includes(door.id)} onChange={() => toggleDoor(door.id)} className="accent-indigo-500" />
                    <div className="flex-1">
                      <div className="text-[11px] text-slate-300">{door.name}</div>
                      <div className="text-[9px] text-slate-600">{site?.name}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Schedule' && (
          <div>
            <label className={labelCls}>Active Schedule (optional)</label>
            <select className={inputCls} value={draft.scheduleId ?? ''}
              onChange={e => setDraft(d => ({ ...d, scheduleId: e.target.value || undefined }))}>
              <option value="">— Always active —</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.timezone})</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Implement Policies.tsx**

Replace `src/pages/Policies.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import PolicyModal from '../modals/PolicyModal'
import type { Policy } from '../types'

export default function Policies() {
  const policies      = useStore(s => s.policies)
  const doors         = useStore(s => s.doors)
  const schedules     = useStore(s => s.schedules)
  const deletePolicy  = useStore(s => s.deletePolicy)

  const [editing, setEditing] = useState<Policy | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Policies</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{policies.length} policies</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid gap-3">
        {policies.map(policy => {
          const schedule = policy.scheduleId ? schedules.find(s => s.id === policy.scheduleId) : null
          const policyDoors = policy.doorIds.map(id => doors.find(d => d.id === id)?.name ?? id)
          return (
            <div key={policy.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{policy.name}</div>
                  {policy.description && <div className="text-[10px] text-slate-500 mt-0.5">{policy.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-slate-600">{policy.rules.length} rule{policy.rules.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setEditing(policy)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => deletePolicy(policy.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
              {policyDoors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {policyDoors.map(name => (
                    <span key={name} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-500 px-1.5 py-0.5 rounded">🚪 {name}</span>
                  ))}
                </div>
              )}
              {schedule && (
                <span className="text-[9px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-1.5 py-0.5 rounded inline-block">{schedule.name}</span>
              )}
            </div>
          )
        })}
        {policies.length === 0 && <p className="text-[12px] text-slate-600">No policies yet. Click + New to create one.</p>}
      </div>

      {editing !== null && (
        <PolicyModal policy={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

Navigate to `/policies`. Seed policies visible. + New opens tabbed modal with Rules (RuleBuilder), Doors (checklist), Schedule (picker).

```bash
git add src/modals/PolicyModal.tsx src/pages/Policies.tsx
git commit -m "feat(axon): PolicyModal (tabbed) + Policies page CRUD"
```

---

## Task 12: ControllerModal + Controllers Page

**Files:**
- Create: `src/modals/ControllerModal.tsx`
- Modify: `src/pages/Controllers.tsx`

- [ ] **Step 1: Create ControllerModal.tsx**

Create `src/modals/ControllerModal.tsx`:

```tsx
import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Controller } from '../types'

interface Props {
  controller?: Controller
  onClose: () => void
}

function blankController(firstSiteId: string): Controller {
  return { id: uuidv4(), name: '', location: '', siteId: firstSiteId, doorIds: [], customAttributes: {} }
}

export default function ControllerModal({ controller, onClose }: Props) {
  const sites             = useStore(s => s.sites)
  const doors             = useStore(s => s.doors)
  const addController     = useStore(s => s.addController)
  const updateController  = useStore(s => s.updateController)

  const [draft, setDraft] = useState<Controller>(controller ?? blankController(sites[0]?.id ?? ''))

  const siteDoors = doors.filter(d => d.siteId === draft.siteId)

  function toggleDoor(did: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(did) ? d.doorIds.filter(x => x !== did) : [...d.doorIds, did],
    }))
  }

  function save() {
    if (!draft.name.trim()) return
    if (controller) updateController(draft)
    else addController(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={controller ? `Edit Controller — ${controller.name}` : 'New Controller'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Controller name" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input className={inputCls} value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="Physical location" />
        </div>
        <div>
          <label className={labelCls}>Site</label>
          <select className={inputCls} value={draft.siteId}
            onChange={e => setDraft(d => ({ ...d, siteId: e.target.value, doorIds: [] }))}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Managed Doors ({draft.doorIds.length} selected)</label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {siteDoors.map(door => (
              <label key={door.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                <input type="checkbox" checked={draft.doorIds.includes(door.id)} onChange={() => toggleDoor(door.id)} className="accent-indigo-500" />
                <span className="text-[11px] text-slate-300">{door.name}</span>
              </label>
            ))}
            {siteDoors.length === 0 && <p className="text-[10px] text-slate-600 px-3">No doors in this site.</p>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Implement Controllers.tsx**

Replace `src/pages/Controllers.tsx`:

```tsx
import { useState } from 'react'
import { useStore } from '../store/store'
import ControllerModal from '../modals/ControllerModal'
import type { Controller } from '../types'

export default function Controllers() {
  const controllers       = useStore(s => s.controllers)
  const sites             = useStore(s => s.sites)
  const doors             = useStore(s => s.doors)
  const deleteController  = useStore(s => s.deleteController)

  const [editing, setEditing] = useState<Controller | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Controllers</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{controllers.length} controllers</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {controllers.map(ctrl => {
          const site = sites.find(s => s.id === ctrl.siteId)
          const ctrlDoors = ctrl.doorIds.map(id => doors.find(d => d.id === id)?.name ?? id)
          return (
            <div key={ctrl.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-bold text-slate-100">{ctrl.name}</div>
                  <div className="text-[10px] text-slate-500">{site?.name} · {ctrl.location}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditing(ctrl)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => deleteController(ctrl.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
              {ctrlDoors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ctrlDoors.map(name => (
                    <span key={name} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-500 px-1.5 py-0.5 rounded">🚪 {name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {controllers.length === 0 && <p className="text-[12px] text-slate-600">No controllers yet.</p>}
      </div>

      {editing !== null && (
        <ControllerModal controller={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify, then commit**

Navigate to `/controllers`. Seed controllers listed. + New opens modal. Changing site resets door selection. Save persists.

```bash
git add src/modals/ControllerModal.tsx src/pages/Controllers.tsx
git commit -m "feat(axon): ControllerModal + Controllers page CRUD"
```

---

## Task 13: CommandPalette

**Files:**
- Modify: `src/components/CommandPalette.tsx`

- [ ] **Step 1: Replace CommandPalette stub**

Replace `src/components/CommandPalette.tsx` (currently a stub or empty):

```tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'

interface Props {
  onClose: () => void
}

interface Result {
  id: string
  label: string
  sublabel: string
  type: string
  route: string
}

export default function CommandPalette({ onClose }: Props) {
  const users       = useStore(s => s.users)
  const groups      = useStore(s => s.groups)
  const grants      = useStore(s => s.grants)
  const schedules   = useStore(s => s.schedules)
  const doors       = useStore(s => s.doors)
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const policies    = useStore(s => s.policies)
  const controllers = useStore(s => s.controllers)

  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  useEffect(() => { inputRef.current?.focus() }, [])

  const allResults: Result[] = [
    ...users.map(u => ({ id: u.id, label: u.name, sublabel: `${u.department} · L${u.clearanceLevel}`, type: 'User', route: '/people' })),
    ...groups.map(g => ({ id: g.id, label: g.name, sublabel: g.description, type: 'Group', route: '/groups' })),
    ...grants.map(g => ({ id: g.id, label: g.name, sublabel: `${g.scope} · ${g.applicationMode}`, type: 'Grant', route: '/grants' })),
    ...schedules.map(s => ({ id: s.id, label: s.name, sublabel: s.timezone, type: 'Schedule', route: '/schedules' })),
    ...doors.map(d => ({ id: d.id, label: d.name, sublabel: d.description, type: 'Door', route: '/doors' })),
    ...sites.map(s => ({ id: s.id, label: s.name, sublabel: s.address, type: 'Site', route: '/sites' })),
    ...zones.map(z => ({ id: z.id, label: z.name, sublabel: z.type, type: 'Zone', route: '/zones' })),
    ...policies.map(p => ({ id: p.id, label: p.name, sublabel: p.description, type: 'Policy', route: '/policies' })),
    ...controllers.map(c => ({ id: c.id, label: c.name, sublabel: c.location, type: 'Controller', route: '/controllers' })),
  ]

  const filtered = query.trim()
    ? allResults.filter(r =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.sublabel.toLowerCase().includes(query.toLowerCase()) ||
        r.type.toLowerCase().includes(query.toLowerCase())
      )
    : allResults.slice(0, 12)  // show first 12 when no query

  // Group results by type
  const grouped = filtered.reduce<Record<string, Result[]>>((acc, r) => {
    acc[r.type] = [...(acc[r.type] ?? []), r]
    return acc
  }, {})

  // Flatten for keyboard navigation
  const flat = Object.values(grouped).flat()

  useEffect(() => { setSelected(0) }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && flat[selected]) { navigate(flat[selected].route); onClose() }
    if (e.key === 'Escape') onClose()
  }

  const TYPE_COLOR: Record<string, string> = {
    User: 'text-indigo-400', Group: 'text-slate-400', Grant: 'text-violet-400',
    Schedule: 'text-teal-400', Door: 'text-amber-400', Site: 'text-emerald-400',
    Zone: 'text-blue-400', Policy: 'text-orange-400', Controller: 'text-pink-400',
  }

  let flatIdx = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70" onClick={onClose}>
      <div
        className="bg-[#0d1117] border border-[#2d3148] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e293b]">
          <span className="text-slate-500 text-[14px]">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search entities..."
            className="flex-1 bg-transparent text-[13px] text-slate-100 focus:outline-none placeholder:text-slate-600"
          />
          <span className="text-[10px] text-slate-600 border border-[#1e293b] rounded px-1.5 py-0.5">ESC</span>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto py-1">
          {flat.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-slate-600">No results for "{query}"</div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="px-4 py-1.5 text-[9px] uppercase tracking-wider text-slate-600 font-semibold">{type}s</div>
              {items.map(item => {
                const idx = flatIdx++
                const isSelected = idx === selected
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.route); onClose() }}
                    onMouseEnter={() => setSelected(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-[#1c1f2e]' : 'hover:bg-[#111827]'}`}
                  >
                    <span className={`text-[10px] font-semibold w-16 shrink-0 ${TYPE_COLOR[type] ?? 'text-slate-400'}`}>{type}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-200 truncate">{item.label}</div>
                      {item.sublabel && <div className="text-[10px] text-slate-600 truncate">{item.sublabel}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#1e293b] flex gap-3 text-[9px] text-slate-600">
          <span>↑↓ navigate</span>
          <span>↵ go to page</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify CommandPalette works**

Press `Ctrl+K` (or `⌘K` on Mac). Overlay opens. Type "sarah" — Sarah Chen appears under Users. Arrow keys navigate. Enter navigates to `/people`. Escape closes.

- [ ] **Step 3: Run all engine tests**

```bash
cd abac-reimagined && npx vitest run
```

Expected: 20/20 tests pass.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CommandPalette.tsx
git commit -m "feat(axon): CommandPalette — ⌘K global entity search with keyboard navigation"
```

---

## Task 14: Final Verification

**Files:** None — verification only.

- [ ] **Step 1: Full navigation smoke test**

Visit every route and confirm no white screens or console errors:
- `/canvas` — canvas renders, drag works, ⌘K opens palette
- `/oracle` — queries work
- `/reasoner` — trace runs
- `/people` — 12 users, Edit/Delete/+ New all work
- `/groups` — 5 groups, tabbed modal opens with all 4 tabs
- `/grants` — 6 grants, tabbed modal opens with all 4 tabs
- `/schedules` — 3 schedules, tabbed modal with Windows/Holidays tabs
- `/doors` — 10 doors, Edit/Delete/+ New work, zone filter works
- `/sites` — 3 sites, Edit/Delete/+ New work
- `/zones` — 6 zones, Edit/Delete/+ New work
- `/policies` — 2 policies, tabbed modal opens
- `/controllers` — 6 controllers, Edit/Delete/+ New work
- `/intrusion` — arm/disarm still works

- [ ] **Step 2: CRUD round-trip test**

1. `/people` → `+ New` → create "Test User", department "QA", L2, active → Save → appears in list
2. `/groups` → `+ New` → name "QA Group" → Members tab → check Test User → Save
3. `/grants` → `+ New` → name "QA Unlock" → Actions tab → check `unlock` → Save
4. In Groups → Edit "QA Group" → Grants tab → check "QA Unlock" → Save
5. `/reasoner` → select "Test User" + any door → Trace → verify group chain includes "QA Group"
6. Delete "QA Unlock" → navigate to `/groups` → edit "QA Group" → Grants tab → "QA Unlock" no longer listed (cascade worked)

- [ ] **Step 3: Run all engine tests one final time**

```bash
npx vitest run
```

Expected: 20/20 PASS.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(axon): Plan 2 complete — full CRUD for all 9 entity types + CommandPalette"
```

---

## What's Next (Plan 3)

- localStorage persistence (edits survive page refresh)
- Bulk import/export (JSON seed download/upload)
- Undo/redo stack
- User avatar + login simulation (switch acting user)
