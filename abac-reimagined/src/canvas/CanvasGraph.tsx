import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/store'
import { useCanvasLayout } from './useCanvasLayout'
import GroupNode from './nodes/GroupNode'
import GrantNode from './nodes/GrantNode'
import DoorNode from './nodes/DoorNode'
import ScheduleNode from './nodes/ScheduleNode'
import type { CanvasPosition } from '../types'

type EntityType = 'groups' | 'grants' | 'schedules' | 'doors'

interface Props {
  siteFilter:   string | null
  scopeFilter:  string | null
  visibleTypes: Set<EntityType>
}

const CANVAS_W = 4000
const CANVAS_H = 3000
const GRID_SIZE = 24
const ZOOM_MIN = 0.1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.12

function nodeCenter(pos: CanvasPosition, w = 148, h = 80): { x: number; y: number } {
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

const EDGE_COLORS = {
  slate:  { dim: '#1e2d4a', bright: '#60a5fa' },
  violet: { dim: '#2e1f6b', bright: '#a78bfa' },
  teal:   { dim: '#134e4a', bright: '#2dd4bf' },
}

type EdgeColor = keyof typeof EDGE_COLORS

interface Edge {
  x1: number; y1: number; x2: number; y2: number
  colorKey: EdgeColor
  sourceKey: string; targetKey: string
}

export default function CanvasGraph({ siteFilter, scopeFilter, visibleTypes }: Props) {
  const allGroups    = useStore(s => s.groups)
  const allGrants    = useStore(s => s.grants)
  const allDoors     = useStore(s => s.doors)
  const zones        = useStore(s => s.zones)
  const allSchedules = useStore(s => s.schedules)
  const selected     = useStore(s => s.selectedCanvasNodeId)
  const setSelected  = useStore(s => s.setSelectedCanvasNode)

  // ── Viewport state ─────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.65)
  const [pan, setPan]   = useState({ x: 20, y: 20 })

  // Refs so event handlers (registered once) always see current values
  const zoomRef = useRef(zoom)
  const panRef  = useRef(pan)
  zoomRef.current = zoom
  panRef.current  = pan

  const { positions, startDrag } = useCanvasLayout(zoomRef)

  // Non-passive wheel handler (must be added via useEffect for preventDefault to work)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const mx   = e.clientX - rect.left
      const my   = e.clientY - rect.top

      const factor  = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor))
      const ratio   = newZoom / zoomRef.current

      const newPan = {
        x: mx - (mx - panRef.current.x) * ratio,
        y: my - (my - panRef.current.y) * ratio,
      }

      zoomRef.current = newZoom
      panRef.current  = newPan
      setZoom(newZoom)
      setPan(newPan)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Pan drag on background
  const panDragRef    = useRef<{ startX: number; startY: number; origPan: { x: number; y: number }; moved: boolean } | null>(null)

  const handlePanStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    panDragRef.current = { startX: e.clientX, startY: e.clientY, origPan: panRef.current, moved: false }

    function onMove(ev: MouseEvent) {
      if (!panDragRef.current) return
      const dx = ev.clientX - panDragRef.current.startX
      const dy = ev.clientY - panDragRef.current.startY
      if (!panDragRef.current.moved && Math.hypot(dx, dy) > 4) panDragRef.current.moved = true
      const newPan = { x: panDragRef.current.origPan.x + dx, y: panDragRef.current.origPan.y + dy }
      panRef.current = newPan
      setPan(newPan)
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Only clear selection on click if we didn't pan
  function handleBackgroundClick(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return
    if (panDragRef.current?.moved) { panDragRef.current = null; return }
    setSelected(null)
  }

  // Zoom button helpers
  function zoomBy(factor: number) {
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor))
    // Zoom toward canvas center
    const el = containerRef.current
    if (!el) return
    const mx = el.clientWidth / 2
    const my = el.clientHeight / 2
    const ratio = newZoom / zoomRef.current
    const newPan = { x: mx - (mx - panRef.current.x) * ratio, y: my - (my - panRef.current.y) * ratio }
    zoomRef.current = newZoom
    panRef.current  = newPan
    setZoom(newZoom)
    setPan(newPan)
  }

  function resetView() {
    setZoom(0.65)
    setPan({ x: 20, y: 20 })
    zoomRef.current = 0.65
    panRef.current  = { x: 20, y: 20 }
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const filteredDoors = allDoors.filter(d => {
    if (siteFilter && d.siteId !== siteFilter) return false
    return true
  })
  const visibleDoorIds = new Set(filteredDoors.map(d => d.id))

  const filteredGrants = allGrants.filter(g => {
    if (scopeFilter && g.scope !== scopeFilter) return false
    if (siteFilter) {
      if (g.scope === 'global') return true
      if (g.scope === 'site'  && g.targetId !== siteFilter) return false
      if (g.scope === 'zone') {
        const zone = zones.find(z => z.id === g.targetId)
        if (!zone || zone.siteId !== siteFilter) return false
      }
    }
    return true
  })

  const filteredSchedules = allSchedules.filter(s => {
    if (siteFilter) return filteredGrants.some(g => g.scheduleId === s.id)
    return true
  })

  const groups    = visibleTypes.has('groups')    ? allGroups         : []
  const grants    = visibleTypes.has('grants')    ? filteredGrants    : []
  const schedules = visibleTypes.has('schedules') ? filteredSchedules : []
  const doors     = visibleTypes.has('doors')     ? filteredDoors     : []

  const visibleKeys = new Set<string>([
    ...groups.map(g    => `group-${g.id}`),
    ...grants.map(g    => `grant-${g.id}`),
    ...schedules.map(s => `schedule-${s.id}`),
    ...doors.map(d     => `door-${d.id}`),
  ])

  function pos(key: string): CanvasPosition {
    return positions[key] ?? { x: 0, y: 0 }
  }

  // ── Edges ──────────────────────────────────────────────────────────────────
  const edges: Edge[] = []

  for (const group of groups) {
    const gPos = nodeCenter(pos(`group-${group.id}`))
    for (const grantId of group.inheritedPermissions) {
      const key = `grant-${grantId}`
      if (!visibleKeys.has(key)) continue
      const grPos = nodeCenter(pos(key), 136)
      edges.push({ x1: gPos.x, y1: gPos.y, x2: grPos.x, y2: grPos.y, colorKey: 'slate', sourceKey: `group-${group.id}`, targetKey: key })
    }
  }

  for (const grant of grants) {
    if (!grant.scheduleId) continue
    const key = `schedule-${grant.scheduleId}`
    if (!visibleKeys.has(key)) continue
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const sPos  = nodeCenter(pos(key), 140)
    edges.push({ x1: grPos.x, y1: grPos.y, x2: sPos.x, y2: sPos.y, colorKey: 'teal', sourceKey: `grant-${grant.id}`, targetKey: key })
  }

  for (const grant of grants) {
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const coveredDoors = doors.filter(d =>
      visibleDoorIds.has(d.id) && (
        grant.scope === 'global' ||
        (grant.scope === 'site'  && grant.targetId === d.siteId) ||
        (grant.scope === 'zone'  && grant.targetId === d.zoneId)
      )
    ).slice(0, 3)
    for (const door of coveredDoors) {
      const key  = `door-${door.id}`
      const dPos = nodeCenter(pos(key), 116, 60)
      edges.push({ x1: grPos.x, y1: grPos.y, x2: dPos.x, y2: dPos.y, colorKey: 'violet', sourceKey: `grant-${grant.id}`, targetKey: key })
    }
  }

  // ── Selection highlight ────────────────────────────────────────────────────
  const connectedKeys = new Set<string>()
  if (selected) {
    for (const e of edges) {
      if (e.sourceKey === selected) connectedKeys.add(e.targetKey)
      if (e.targetKey === selected) connectedKeys.add(e.sourceKey)
    }
  }
  const hasSelection = selected !== null

  function nodeProps(key: string) {
    if (!hasSelection || key === selected) return { highlighted: false, dimmed: false }
    if (connectedKeys.has(key)) return { highlighted: true, dimmed: false }
    return { highlighted: false, dimmed: true }
  }

  const totalVisible = groups.length + grants.length + schedules.length + doors.length

  // ── Grid background that tracks pan/zoom ───────────────────────────────────
  const gs  = GRID_SIZE * zoom
  const bgStyle = {
    backgroundImage: 'linear-gradient(rgba(30,37,59,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(30,37,59,.35) 1px,transparent 1px)',
    backgroundSize:  `${gs}px ${gs}px`,
    backgroundPosition: `${pan.x % gs}px ${pan.y % gs}px`,
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ ...bgStyle, cursor: panDragRef.current ? 'grabbing' : 'grab' }}
      onMouseDown={handlePanStart}
      onClick={handleBackgroundClick}
    >
      {/* Transformed canvas */}
      <div
        style={{
          position: 'absolute',
          left: 0, top: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Edges SVG */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: CANVAS_W, height: CANVAS_H, overflow: 'visible' }}
        >
          <defs>
            {(Object.entries(EDGE_COLORS) as [EdgeColor, { dim: string; bright: string }][]).flatMap(([name, { dim, bright }]) => [
              <marker key={name} id={`arr-${name}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0.5 L5,3 L0,5.5 Z" fill={dim} />
              </marker>,
              <marker key={`${name}-bright`} id={`arr-${name}-bright`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0.5 L5,3 L0,5.5 Z" fill={bright} />
              </marker>,
            ])}
          </defs>
          {edges.map((e, i) => {
            const isConnected = hasSelection && (e.sourceKey === selected || e.targetKey === selected)
            const isDimmed    = hasSelection && !isConnected
            const color       = isConnected ? EDGE_COLORS[e.colorKey].bright : EDGE_COLORS[e.colorKey].dim
            const markerSuffix = isConnected ? '-bright' : ''
            return (
              <path
                key={i}
                d={`M ${e.x1} ${e.y1} C ${(e.x1 + e.x2) / 2} ${e.y1} ${(e.x1 + e.x2) / 2} ${e.y2} ${e.x2} ${e.y2}`}
                stroke={color}
                strokeWidth={isConnected ? 2.5 : 1.5}
                fill="none"
                strokeDasharray={isConnected ? 'none' : '5,3'}
                markerEnd={`url(#arr-${e.colorKey}${markerSuffix})`}
                opacity={isDimmed ? 0.1 : isConnected ? 1 : 0.7}
              />
            )
          })}
        </svg>

        {/* Group nodes */}
        {groups.map(group => {
          const p = pos(`group-${group.id}`)
          const key = `group-${group.id}`
          const { highlighted, dimmed } = nodeProps(key)
          return (
            <div key={group.id} style={{ left: p.x, top: p.y, position: 'absolute' }} onMouseDown={e => startDrag(key, e)}>
              <GroupNode group={group} allGroups={allGroups} selected={selected === key} highlighted={highlighted} dimmed={dimmed} onClick={() => setSelected(key)} />
            </div>
          )
        })}

        {/* Grant nodes */}
        {grants.map(grant => {
          const p = pos(`grant-${grant.id}`)
          const key = `grant-${grant.id}`
          const { highlighted, dimmed } = nodeProps(key)
          return (
            <div key={grant.id} style={{ left: p.x, top: p.y, position: 'absolute' }} onMouseDown={e => startDrag(key, e)}>
              <GrantNode grant={grant} selected={selected === key} highlighted={highlighted} dimmed={dimmed} onClick={() => setSelected(key)} />
            </div>
          )
        })}

        {/* Schedule nodes */}
        {schedules.map(schedule => {
          const p = pos(`schedule-${schedule.id}`)
          const key = `schedule-${schedule.id}`
          const { highlighted, dimmed } = nodeProps(key)
          return (
            <div key={schedule.id} style={{ left: p.x, top: p.y, position: 'absolute' }} onMouseDown={e => startDrag(key, e)}>
              <ScheduleNode schedule={schedule} selected={selected === key} highlighted={highlighted} dimmed={dimmed} onClick={() => setSelected(key)} />
            </div>
          )
        })}

        {/* Door nodes */}
        {doors.map(door => {
          const p = pos(`door-${door.id}`)
          const key = `door-${door.id}`
          const zone = zones.find(z => z.id === door.zoneId)
          const { highlighted, dimmed } = nodeProps(key)
          return (
            <div key={door.id} style={{ left: p.x, top: p.y, position: 'absolute' }} onMouseDown={e => startDrag(key, e)}>
              <DoorNode door={door} zone={zone} selected={selected === key} highlighted={highlighted} dimmed={dimmed} onClick={() => setSelected(key)} />
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {totalVisible === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-slate-600 text-sm">No nodes match the current filters</div>
            <div className="text-slate-700 text-[11px] mt-1">Try adjusting site or scope filters</div>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 pointer-events-auto">
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => zoomBy(1 + ZOOM_STEP * 1.5)}
          className="w-7 h-7 rounded bg-[#0f1320] border border-[#1e2d4a] text-slate-400 hover:text-slate-200 hover:border-slate-500 text-sm font-medium leading-none flex items-center justify-center transition-colors"
          title="Zoom in"
        >+</button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={resetView}
          className="w-14 h-5 rounded bg-[#0f1320] border border-[#1e2d4a] text-[9px] text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
          title="Reset view"
        >{Math.round(zoom * 100)}%</button>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => zoomBy(1 - ZOOM_STEP * 1.5)}
          className="w-7 h-7 rounded bg-[#0f1320] border border-[#1e2d4a] text-slate-400 hover:text-slate-200 hover:border-slate-500 text-sm font-medium leading-none flex items-center justify-center transition-colors"
          title="Zoom out"
        >−</button>
      </div>
    </div>
  )
}
