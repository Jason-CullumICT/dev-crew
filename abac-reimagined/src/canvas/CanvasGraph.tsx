import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { useCanvasLayout } from './useCanvasLayout'
import GroupNode from './nodes/GroupNode'
import GrantNode from './nodes/GrantNode'
import DoorNode from './nodes/DoorNode'
import ScheduleNode from './nodes/ScheduleNode'
import CanvasMinimap from './CanvasMinimap'
import HoverTooltip from './HoverTooltip'
import type { CanvasPosition } from '../types'

type EntityType = 'groups' | 'grants' | 'schedules' | 'doors'

interface Props {
  siteFilter:    string | null
  scopeFilter:   string | null
  visibleTypes:  Set<EntityType>
  onAutoLayout?: () => void
  initialZoom?:  number
  initialPan?:   { x: number; y: number }
}

const CANVAS_W = 4000
const CANVAS_H = 3000
const GRID_SIZE = 24
const ZOOM_MIN = 0.1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.12

// Cluster background colors per site (cycling palette)
const SITE_CLUSTER_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.06)',  border: 'rgba(99, 102, 241, 0.18)',  label: 'rgba(99, 102, 241, 0.5)'  },
  { bg: 'rgba(20, 184, 166, 0.06)',  border: 'rgba(20, 184, 166, 0.18)',  label: 'rgba(20, 184, 166, 0.5)'  },
  { bg: 'rgba(245, 158, 11, 0.06)',  border: 'rgba(245, 158, 11, 0.18)',  label: 'rgba(245, 158, 11, 0.5)'  },
  { bg: 'rgba(239, 68, 68, 0.06)',   border: 'rgba(239, 68, 68, 0.18)',   label: 'rgba(239, 68, 68, 0.5)'   },
  { bg: 'rgba(168, 85, 247, 0.06)',  border: 'rgba(168, 85, 247, 0.18)',  label: 'rgba(168, 85, 247, 0.5)'  },
  { bg: 'rgba(59, 130, 246, 0.06)',  border: 'rgba(59, 130, 246, 0.18)',  label: 'rgba(59, 130, 246, 0.5)'  },
  { bg: 'rgba(236, 72, 153, 0.06)',  border: 'rgba(236, 72, 153, 0.18)',  label: 'rgba(236, 72, 153, 0.5)'  },
  { bg: 'rgba(16, 185, 129, 0.06)',  border: 'rgba(16, 185, 129, 0.18)',  label: 'rgba(16, 185, 129, 0.5)'  },
]

const DOOR_NODE_W = 100   // was 116 — updated to match compact door chip size
const DOOR_NODE_H = 60
const CLUSTER_PAD = 20

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

interface BundledEdge {
  grantKey:  string
  x1: number; y1: number   // grant center
  x2: number; y2: number   // centroid of covered doors
  count:     number
  colorKey:  EdgeColor
}

export default function CanvasGraph({
  siteFilter, scopeFilter, visibleTypes, onAutoLayout,
  initialZoom, initialPan,
}: Props) {
  const navigate = useNavigate()

  const allGroups     = useStore(s => s.groups)
  const allGrants     = useStore(s => s.grants)
  const allDoors      = useStore(s => s.doors)
  const zones         = useStore(s => s.zones)
  const allSchedules  = useStore(s => s.schedules)
  const allSites      = useStore(s => s.sites)
  const selected      = useStore(s => s.selectedCanvasNodeId)
  const setSelected   = useStore(s => s.setSelectedCanvasNode)
  const edgeMode      = useStore(s => s.edgeMode)
  const inputDevices  = useStore(s => s.inputDevices)
  const outputDevices = useStore(s => s.outputDevices)

  // Compute device counts per door for badge display
  const deviceCountByDoor = useMemo(() => {
    const map = new Map<string, { inputs: number; outputs: number; hasUnhealthy: boolean }>()
    for (const d of inputDevices) {
      const existing = map.get(d.doorId) ?? { inputs: 0, outputs: 0, hasUnhealthy: false }
      const unhealthy = d.status === 'offline' || d.status === 'tamper' || d.status === 'fault'
      map.set(d.doorId, {
        inputs: existing.inputs + 1,
        outputs: existing.outputs,
        hasUnhealthy: existing.hasUnhealthy || unhealthy,
      })
    }
    for (const d of outputDevices) {
      if (!d.doorId) continue
      const existing = map.get(d.doorId) ?? { inputs: 0, outputs: 0, hasUnhealthy: false }
      const unhealthy = d.status === 'offline' || d.status === 'tamper' || d.status === 'fault'
      map.set(d.doorId, {
        inputs: existing.inputs,
        outputs: existing.outputs + 1,
        hasUnhealthy: existing.hasUnhealthy || unhealthy,
      })
    }
    return map
  }, [inputDevices, outputDevices])

  // ── Hover state ────────────────────────────────────────────────────────────
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [hoverScreenPos, setHoverScreenPos] = useState({ x: 0, y: 0 })
  const hoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Viewport state ─────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(initialZoom ?? 0.65)
  const [pan, setPan]   = useState(initialPan  ?? { x: 20, y: 20 })

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
  const panDragRef = useRef<{
    startX: number; startY: number
    origPan: { x: number; y: number }
    moved: boolean
  } | null>(null)

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

  // Fit-to-content: compute bounding box of ALL visible nodes (use pos() so
  // unpositioned nodes default to 0,0 instead of being skipped).
  function fitToContent() {
    const el = containerRef.current
    if (!el) return

    type NodeEntry = { key: string; w: number; h: number }
    const nodeEntries: NodeEntry[] = [
      ...groups.map(g    => ({ key: `group-${g.id}`,    w: 148,         h: 80 })),
      ...grants.map(g    => ({ key: `grant-${g.id}`,    w: 136,         h: 80 })),
      ...schedules.map(s => ({ key: `schedule-${s.id}`, w: 140,         h: 80 })),
      ...doors.map(d     => ({ key: `door-${d.id}`,     w: DOOR_NODE_W, h: DOOR_NODE_H })),
    ]

    if (nodeEntries.length === 0) return

    const padding = 40
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const { key, w, h } of nodeEntries) {
      // Use pos() so nodes with no explicit position default to (0,0)
      const p = pos(key)
      minX = Math.min(minX, p.x - padding)
      minY = Math.min(minY, p.y - padding)
      maxX = Math.max(maxX, p.x + w + padding)
      maxY = Math.max(maxY, p.y + h + padding)
    }

    const bbW = maxX - minX
    const bbH = maxY - minY
    if (bbW <= 0 || bbH <= 0) return

    const cW = el.clientWidth
    const cH = el.clientHeight

    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN,
      Math.min(cW / bbW, cH / bbH) * 0.9
    ))
    const newPan = {
      x: (cW - bbW * newZoom) / 2 - minX * newZoom,
      y: (cH - bbH * newZoom) / 2 - minY * newZoom,
    }

    zoomRef.current = newZoom
    panRef.current  = newPan
    setZoom(newZoom)
    setPan(newPan)
  }

  // Minimap pan callback
  const handleMinimapPan = useCallback((newPan: { x: number; y: number }) => {
    panRef.current = newPan
    setPan(newPan)
  }, [])

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

  // ── Site clusters for doors (only when no site filter) ─────────────────────
  interface SiteCluster {
    siteId: string
    siteName: string
    left: number
    top: number
    width: number
    height: number
    colorIdx: number
  }

  const siteClusters: SiteCluster[] = []

  if (!siteFilter && visibleTypes.has('doors') && doors.length > 0) {
    const siteOrder: string[] = []
    for (const door of doors) {
      if (!siteOrder.includes(door.siteId)) siteOrder.push(door.siteId)
    }

    siteOrder.forEach((siteId, idx) => {
      const siteDoors = doors.filter(d => d.siteId === siteId)
      if (siteDoors.length === 0) return

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const door of siteDoors) {
        const p = pos(`door-${door.id}`)
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x + DOOR_NODE_W)
        maxY = Math.max(maxY, p.y + DOOR_NODE_H)
      }

      const site = allSites.find(s => s.id === siteId)
      siteClusters.push({
        siteId,
        siteName: site?.name ?? siteId,
        left:   minX - CLUSTER_PAD,
        top:    minY - CLUSTER_PAD,
        width:  maxX - minX + CLUSTER_PAD * 2,
        height: maxY - minY + CLUSTER_PAD * 2,
        colorIdx: idx % SITE_CLUSTER_COLORS.length,
      })
    })
  }

  // ── Edges ──────────────────────────────────────────────────────────────────
  const edges: Edge[] = []
  const bundledGrantEdges: BundledEdge[] = []

  // H7: Track the FULL logical coverage of each grant→door
  const grantFullDoorCoverage = new Map<string, Set<string>>()

  // Group → Grant edges
  for (const group of groups) {
    const gPos = nodeCenter(pos(`group-${group.id}`))
    for (const grantId of group.inheritedPermissions) {
      const key = `grant-${grantId}`
      if (!visibleKeys.has(key)) continue
      const grPos = nodeCenter(pos(key), 136)
      edges.push({ x1: gPos.x, y1: gPos.y, x2: grPos.x, y2: grPos.y, colorKey: 'slate', sourceKey: `group-${group.id}`, targetKey: key })
    }
  }

  // Grant → Schedule edges
  for (const grant of grants) {
    if (!grant.scheduleId) continue
    const key = `schedule-${grant.scheduleId}`
    if (!visibleKeys.has(key)) continue
    const grPos = nodeCenter(pos(`grant-${grant.id}`), 136)
    const sPos  = nodeCenter(pos(key), 140)
    edges.push({ x1: grPos.x, y1: grPos.y, x2: sPos.x, y2: sPos.y, colorKey: 'teal', sourceKey: `grant-${grant.id}`, targetKey: key })
  }

  // Grant → Door edges (bundled)
  for (const grant of grants) {
    const grantKey = `grant-${grant.id}`
    const grPos    = nodeCenter(pos(grantKey), 136)

    const allCoveredDoors = doors.filter(d =>
      visibleDoorIds.has(d.id) && (
        grant.scope === 'global' ||
        (grant.scope === 'site' && grant.targetId === d.siteId) ||
        (grant.scope === 'zone' && grant.targetId === d.zoneId)
      )
    )
    const fullDoorKeys = new Set(allCoveredDoors.map(d => `door-${d.id}`))
    grantFullDoorCoverage.set(grantKey, fullDoorKeys)

    if (allCoveredDoors.length === 0) continue

    // Global-scope: no grant→door edges (tile shows "GLOBAL")
    if (grant.scope === 'global') continue

    // Site-scope or zone-scope: draw ONE bundled line to centroid of covered doors
    let sumX = 0, sumY = 0
    for (const door of allCoveredDoors) {
      const dPos = nodeCenter(pos(`door-${door.id}`), DOOR_NODE_W, DOOR_NODE_H)
      sumX += dPos.x
      sumY += dPos.y
    }
    const cx = sumX / allCoveredDoors.length
    const cy = sumY / allCoveredDoors.length

    bundledGrantEdges.push({
      grantKey,
      x1: grPos.x, y1: grPos.y,
      x2: cx,      y2: cy,
      count: allCoveredDoors.length,
      colorKey: 'violet',
    })
  }

  // ── Clear selection when no longer visible ─────────────────────────────────
  if (selected && !visibleKeys.has(selected)) {
    queueMicrotask(() => setSelected(null))
  }

  // ── Selection highlight ────────────────────────────────────────────────────
  const connectedKeys = new Set<string>()
  const selectionEdges: Edge[] = []

  if (selected && visibleKeys.has(selected)) {
    for (const e of edges) {
      if (e.sourceKey === selected) connectedKeys.add(e.targetKey)
      if (e.targetKey === selected) connectedKeys.add(e.sourceKey)
    }
    // Bundled edges also contribute to connectedKeys
    for (const be of bundledGrantEdges) {
      if (be.grantKey === selected) {
        const fullCoverage = grantFullDoorCoverage.get(be.grantKey)
        if (fullCoverage) fullCoverage.forEach(k => connectedKeys.add(k))
      }
      if (selected.startsWith('door-')) {
        const fullCoverage = grantFullDoorCoverage.get(be.grantKey)
        if (fullCoverage?.has(selected)) connectedKeys.add(be.grantKey)
      }
    }

    // For a selected grant: highlight ALL covered doors and draw individual selection edges
    if (selected.startsWith('grant-')) {
      const fullCoverage = grantFullDoorCoverage.get(selected)
      if (fullCoverage) {
        const grPos = nodeCenter(pos(selected), 136)
        for (const doorKey of fullCoverage) {
          connectedKeys.add(doorKey)
          const dPos = nodeCenter(pos(doorKey), DOOR_NODE_W, DOOR_NODE_H)
          selectionEdges.push({ x1: grPos.x, y1: grPos.y, x2: dPos.x, y2: dPos.y, colorKey: 'violet', sourceKey: selected, targetKey: doorKey })
        }
      }
    }

    // For a selected door: highlight ALL grants that cover it and draw individual selection edges
    if (selected.startsWith('door-')) {
      for (const [grantKey, doorKeys] of grantFullDoorCoverage) {
        if (doorKeys.has(selected)) {
          connectedKeys.add(grantKey)
          const grPos = nodeCenter(pos(grantKey), 136)
          const dPos  = nodeCenter(pos(selected), DOOR_NODE_W, DOOR_NODE_H)
          selectionEdges.push({ x1: grPos.x, y1: grPos.y, x2: dPos.x, y2: dPos.y, colorKey: 'violet', sourceKey: grantKey, targetKey: selected })
        }
      }
    }
  }

  const hasSelection = selected !== null && visibleKeys.has(selected)

  // ── Edge visibility filtering based on edgeMode ────────────────────────────
  function edgeIsVisible(sourceKey: string, targetKey: string): boolean {
    if (edgeMode === 'off') return false
    if (edgeMode === 'always') return true
    // 'hover': show only edges connected to hovered node or selected node
    if (hasSelection && (sourceKey === selected || targetKey === selected)) return true
    if (hoveredKey && (sourceKey === hoveredKey || targetKey === hoveredKey)) return true
    return false
  }

  function bundledEdgeIsVisible(be: BundledEdge): boolean {
    if (edgeMode === 'off') return false
    if (edgeMode === 'always') return true
    if (hasSelection && be.grantKey === selected) return true
    if (hoveredKey && be.grantKey === hoveredKey) return true
    // Also show if any covered door is hovered
    if (hoveredKey && hoveredKey.startsWith('door-')) {
      const coverage = grantFullDoorCoverage.get(be.grantKey)
      if (coverage?.has(hoveredKey)) return true
    }
    return false
  }

  const visibleEdges      = edges.filter(e => edgeIsVisible(e.sourceKey, e.targetKey))
  const visibleBundled    = bundledGrantEdges.filter(be => bundledEdgeIsVisible(be))
  // Selection edges: show when selected node is active. In hover mode, hide
  // selection edges when hovering a DIFFERENT node (avoids confusing lines
  // that look related to the hovered node but aren't).
  const visibleSelEdges = (() => {
    if (edgeMode === 'off') return []
    if (!hasSelection) return []
    if (edgeMode === 'hover' && hoveredKey && hoveredKey !== selected) return []
    return selectionEdges
  })()

  function nodeProps(key: string) {
    if (!hasSelection || key === selected) return { highlighted: false, dimmed: false }
    if (connectedKeys.has(key)) return { highlighted: true, dimmed: false }
    return { highlighted: false, dimmed: true }
  }

  const totalVisible = groups.length + grants.length + schedules.length + doors.length

  // ── Minimap nodes list ─────────────────────────────────────────────────────
  const minimapNodes = [
    ...groups.map(g    => ({ key: `group-${g.id}`,    pos: pos(`group-${g.id}`) })),
    ...grants.map(g    => ({ key: `grant-${g.id}`,    pos: pos(`grant-${g.id}`) })),
    ...schedules.map(s => ({ key: `schedule-${s.id}`, pos: pos(`schedule-${s.id}`) })),
    ...doors.map(d     => ({ key: `door-${d.id}`,     pos: pos(`door-${d.id}`) })),
  ]

  const containerWidth  = containerRef.current?.clientWidth  ?? 800
  const containerHeight = containerRef.current?.clientHeight ?? 600

  // ── Grid background that tracks pan/zoom ───────────────────────────────────
  const gs = GRID_SIZE * zoom
  const bgStyle = {
    backgroundImage: 'linear-gradient(rgba(30,37,59,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(30,37,59,.35) 1px,transparent 1px)',
    backgroundSize:  `${gs}px ${gs}px`,
    backgroundPosition: `${pan.x % gs}px ${pan.y % gs}px`,
  }

  // ── Hover handlers ─────────────────────────────────────────────────────────
  function makeHoverEnter(key: string) {
    return (e: React.MouseEvent) => {
      if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current)
      // Use raw viewport coordinates — HoverTooltip is position:fixed
      setHoveredKey(key)
      setHoverScreenPos({ x: e.clientX, y: e.clientY })
    }
  }

  function makeHoverLeave() {
    return () => {
      if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current)
      hoverDebounceRef.current = setTimeout(() => setHoveredKey(null), 150)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ ...bgStyle, cursor: panDragRef.current ? 'grabbing' : 'grab' }}
      onMouseDown={handlePanStart}
      onClick={handleBackgroundClick}
    >
      {/* Animated edge flow keyframes */}
      <style>{`@keyframes edgeFlow { from { stroke-dashoffset: 12; } to { stroke-dashoffset: 0; } }`}</style>

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
        {/* Site cluster background regions */}
        {siteClusters.map(cluster => {
          const colors = SITE_CLUSTER_COLORS[cluster.colorIdx]
          return (
            <div
              key={cluster.siteId}
              style={{
                position: 'absolute',
                left:   cluster.left,
                top:    cluster.top,
                width:  cluster.width,
                height: cluster.height,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.label,
                  letterSpacing: '0.04em',
                  userSelect: 'none',
                  textTransform: 'uppercase',
                }}
              >
                {cluster.siteName}
              </span>
            </div>
          )
        })}

        {/* Edges SVG */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: CANVAS_W, height: CANVAS_H, overflow: 'visible' }}
          aria-hidden="true"
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

          {/* Regular edges (group→grant, grant→schedule) */}
          {visibleEdges.map((e) => {
            const isConnected = hasSelection && (e.sourceKey === selected || e.targetKey === selected)
            const isDimmed    = hasSelection && !isConnected
            const color       = isConnected ? EDGE_COLORS[e.colorKey].bright : EDGE_COLORS[e.colorKey].dim
            const markerSuffix = isConnected ? '-bright' : ''
            return (
              <path
                key={`${e.sourceKey}→${e.targetKey}`}
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

          {/* Selection edges (individual grant→door lines when selected) */}
          {visibleSelEdges.map((e) => {
            const color = EDGE_COLORS[e.colorKey].bright
            return (
              <path
                key={`sel-${e.sourceKey}→${e.targetKey}`}
                d={`M ${e.x1} ${e.y1} C ${(e.x1 + e.x2) / 2} ${e.y1} ${(e.x1 + e.x2) / 2} ${e.y2} ${e.x2} ${e.y2}`}
                stroke={color}
                strokeWidth={2.5}
                fill="none"
                strokeDasharray="none"
                markerEnd={`url(#arr-${e.colorKey}-bright)`}
                opacity={1}
              />
            )
          })}

          {/* Bundled grant→door edges */}
          {visibleBundled.map((be) => {
            const isConnected = hasSelection && be.grantKey === selected
            const isDimmed    = hasSelection && !isConnected && !connectedKeys.has(be.grantKey)
            const mx = (be.x1 + be.x2) / 2
            const my = (be.y1 + be.y2) / 2
            return (
              <g key={`bundled-${be.grantKey}`} opacity={isDimmed ? 0.08 : 1}>
                <path
                  d={`M ${be.x1} ${be.y1} C ${mx} ${be.y1} ${mx} ${be.y2} ${be.x2} ${be.y2}`}
                  stroke="rgba(139,92,246,0.3)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Count badge at midpoint */}
                <circle cx={mx} cy={my} r={10} fill="#2e1f6b" stroke="#8b5cf6" strokeWidth={1} />
                <text
                  x={mx} y={my}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={8}
                  fontWeight={600}
                  fill="#c4b5fd"
                >
                  {be.count}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Group nodes */}
        {groups.map(group => {
          const p   = pos(`group-${group.id}`)
          const key = `group-${group.id}`
          const { highlighted, dimmed } = nodeProps(key)
          return (
            <div
              key={group.id}
              style={{ left: p.x, top: p.y, position: 'absolute' }}
              onMouseDown={e => startDrag(key, e)}
              onMouseEnter={makeHoverEnter(key)}
              onMouseLeave={makeHoverLeave()}
            >
              <GroupNode
                group={group}
                allGroups={allGroups}
                selected={selected === key}
                highlighted={highlighted}
                dimmed={dimmed}
                onClick={() => setSelected(key)}
                onDoubleClick={() => navigate('/groups')}
              />
            </div>
          )
        })}

        {/* Grant nodes */}
        {grants.map(grant => {
          const p   = pos(`grant-${grant.id}`)
          const key = `grant-${grant.id}`
          const { highlighted, dimmed } = nodeProps(key)
          const coveredDoorCount = grantFullDoorCoverage.get(key)?.size ?? 0
          return (
            <div
              key={grant.id}
              style={{ left: p.x, top: p.y, position: 'absolute' }}
              onMouseDown={e => startDrag(key, e)}
              onMouseEnter={makeHoverEnter(key)}
              onMouseLeave={makeHoverLeave()}
            >
              <GrantNode
                grant={grant}
                selected={selected === key}
                highlighted={highlighted}
                dimmed={dimmed}
                onClick={() => setSelected(key)}
                onDoubleClick={() => navigate('/grants')}
                coveredDoorCount={coveredDoorCount}
              />
            </div>
          )
        })}

        {/* Schedule nodes */}
        {schedules.map(schedule => {
          const p   = pos(`schedule-${schedule.id}`)
          const key = `schedule-${schedule.id}`
          const { highlighted, dimmed } = nodeProps(key)
          return (
            <div
              key={schedule.id}
              style={{ left: p.x, top: p.y, position: 'absolute' }}
              onMouseDown={e => startDrag(key, e)}
              onMouseEnter={makeHoverEnter(key)}
              onMouseLeave={makeHoverLeave()}
            >
              <ScheduleNode
                schedule={schedule}
                selected={selected === key}
                highlighted={highlighted}
                dimmed={dimmed}
                onClick={() => setSelected(key)}
                onDoubleClick={() => navigate('/schedules')}
              />
            </div>
          )
        })}

        {/* Door nodes */}
        {doors.map(door => {
          const p    = pos(`door-${door.id}`)
          const key  = `door-${door.id}`
          const zone = zones.find(z => z.id === door.zoneId)
          const { highlighted, dimmed } = nodeProps(key)
          const deviceCount = deviceCountByDoor.get(door.id)
          return (
            <div
              key={door.id}
              style={{ left: p.x, top: p.y, position: 'absolute' }}
              onMouseDown={e => startDrag(key, e)}
              onMouseEnter={makeHoverEnter(key)}
              onMouseLeave={makeHoverLeave()}
            >
              <DoorNode
                door={door}
                zone={zone}
                selected={selected === key}
                highlighted={highlighted}
                dimmed={dimmed}
                onClick={() => setSelected(key)}
                onDoubleClick={() => navigate('/doors')}
                deviceCount={deviceCount}
              />
            </div>
          )
        })}
      </div>

      {/* HoverTooltip — rendered outside the transform div (screen space) */}
      <HoverTooltip nodeKey={hoveredKey} screenX={hoverScreenPos.x} screenY={hoverScreenPos.y} />

      {/* Node count HUD — top-right, outside transform */}
      {totalVisible > 0 && (
        <div
          className="absolute top-2 right-2 pointer-events-none"
          style={{
            background: 'rgba(9,13,24,0.75)',
            border: '1px solid rgba(30,45,74,0.7)',
            borderRadius: 5,
            padding: '3px 8px',
          }}
        >
          <span className="text-[9px] text-slate-600 tracking-wide">
            {[
              groups.length    > 0 ? `Groups: ${groups.length}`       : null,
              grants.length    > 0 ? `Grants: ${grants.length}`       : null,
              schedules.length > 0 ? `Schedules: ${schedules.length}` : null,
              doors.length     > 0 ? `Doors: ${doors.length}`         : null,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {/* Empty state */}
      {totalVisible === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-slate-600 text-sm">No nodes match the current filters</div>
            <div className="text-slate-700 text-[11px] mt-1">Try adjusting site or scope filters</div>
          </div>
        </div>
      )}

      {/* Bottom-left controls: minimap + auto-layout */}
      <div
        className="absolute bottom-4 left-4 flex flex-col items-start gap-2 pointer-events-auto"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Auto-layout button */}
        {onAutoLayout && (
          <button
            onClick={onAutoLayout}
            className="text-[10px] px-2.5 py-1 rounded bg-[#0f1320] border border-[#1e2d4a] text-slate-400 hover:text-slate-200 hover:border-indigo-500/50 transition-colors whitespace-nowrap"
            title="Arrange visible nodes in hierarchical columns"
          >
            Auto-Layout
          </button>
        )}

        {/* Minimap */}
        <CanvasMinimap
          nodes={minimapNodes}
          pan={pan}
          zoom={zoom}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          canvasW={CANVAS_W}
          canvasH={CANVAS_H}
          onPanChange={handleMinimapPan}
        />
      </div>

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
          onClick={fitToContent}
          className="w-14 h-5 rounded bg-[#0f1320] border border-[#1e2d4a] text-[9px] text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
          title="Fit to content"
        >Fit</button>
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
