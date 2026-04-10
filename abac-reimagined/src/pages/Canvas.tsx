import { useState, useCallback } from 'react'
import CanvasGraph from '../canvas/CanvasGraph'
import DetailPanel from '../canvas/DetailPanel'
import { useStore } from '../store/store'

type EntityType = 'groups' | 'grants' | 'schedules' | 'doors'

const ALL_TYPES: EntityType[] = ['groups', 'grants', 'schedules', 'doors']

const TYPE_LABELS: Record<EntityType, string> = {
  groups:    'Groups',
  grants:    'Grants',
  schedules: 'Schedules',
  doors:     'Doors',
}

const TYPE_COLORS: Record<EntityType, string> = {
  groups:    'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 data-[active]:bg-indigo-500/30 data-[active]:border-indigo-400',
  grants:    'bg-violet-500/15 text-violet-300 border-violet-500/30 data-[active]:bg-violet-500/30 data-[active]:border-violet-400',
  schedules: 'bg-teal-500/15 text-teal-300 border-teal-500/30 data-[active]:bg-teal-500/30 data-[active]:border-teal-400',
  doors:     'bg-slate-500/15 text-slate-300 border-slate-500/30 data-[active]:bg-slate-500/30 data-[active]:border-slate-400',
}

// Vertical gaps per type
const LAYOUT_GAP = {
  groups:    110,
  grants:    95,
  schedules: 85,
  doors:     65,
}
// Max rows per column before wrapping to a new column
const LAYOUT_MAX_PER_COL = 25

// Node dimensions for bounding box calculation
const NODE_DIMS: Record<EntityType, { w: number; h: number }> = {
  groups:    { w: 148, h: 80 },
  grants:    { w: 136, h: 80 },
  schedules: { w: 140, h: 80 },
  doors:     { w: 100, h: 60 },
}

const ZOOM_MIN = 0.1
const ZOOM_MAX = 3

interface LayoutFit {
  zoom: number
  pan:  { x: number; y: number }
}

function computeFit(
  positions: { x: number; y: number; w: number; h: number }[],
  containerW: number,
  containerH: number,
): LayoutFit {
  if (positions.length === 0) return { zoom: 0.65, pan: { x: 20, y: 20 } }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const { x, y, w, h } of positions) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  const bbW = maxX - minX
  const bbH = maxY - minY
  if (bbW === 0 || bbH === 0) return { zoom: 0.65, pan: { x: 20, y: 20 } }

  const padding = 40
  const zoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, Math.min(
      (containerW - padding * 2) / bbW,
      (containerH - padding * 2) / bbH,
    ) * 0.85),
  )

  // Center the bounding box in the viewport
  const pan = {
    x: (containerW - bbW * zoom) / 2 - minX * zoom,
    y: (containerH - bbH * zoom) / 2 - minY * zoom,
  }

  return { zoom, pan }
}

export default function Canvas() {
  const selectedNode    = useStore(s => s.selectedCanvasNodeId)
  const sites           = useStore(s => s.sites)
  const allGroups       = useStore(s => s.groups)
  const allGrants       = useStore(s => s.grants)
  const allSchedules    = useStore(s => s.schedules)
  const allDoors        = useStore(s => s.doors)
  const zones           = useStore(s => s.zones)
  const setCanvasPosition = useStore(s => s.setCanvasPosition)
  const edgeMode        = useStore(s => s.edgeMode)
  const setEdgeMode     = useStore(s => s.setEdgeMode)

  const [siteFilter, setSiteFilter]       = useState<string>('all')
  const [scopeFilter, setScopeFilter]     = useState<string>('all')
  const [visibleTypes, setVisibleTypes]   = useState<Set<EntityType>>(new Set(ALL_TYPES))

  // ── Auto-layout trigger ────────────────────────────────────────────────────
  const [layoutResetKey, setLayoutResetKey] = useState(0)
  const [initialFit, setInitialFit]         = useState<LayoutFit | null>(null)

  const handleAutoLayout = useCallback(() => {
    const activeSite  = siteFilter  === 'all' ? null : siteFilter
    const activeScope = scopeFilter === 'all' ? null : scopeFilter

    // Compute visible entities (same filter logic as CanvasGraph)
    const visibleDoors = allDoors.filter(d => {
      if (activeSite && d.siteId !== activeSite) return false
      return true
    })
    const visibleDoorIds = new Set(visibleDoors.map(d => d.id))

    const visibleGrants = allGrants.filter(g => {
      if (activeScope && g.scope !== activeScope) return false
      if (activeSite) {
        if (g.scope === 'global') return true
        if (g.scope === 'site'  && g.targetId !== activeSite) return false
        if (g.scope === 'zone') {
          const zone = zones.find(z => z.id === g.targetId)
          if (!zone || zone.siteId !== activeSite) return false
        }
      }
      return true
    })
    void visibleDoorIds // referenced in grant filter above

    const visibleSchedules = allSchedules.filter(s => {
      if (activeSite) return visibleGrants.some(g => g.scheduleId === s.id)
      return true
    })

    const groups    = visibleTypes.has('groups')    ? [...allGroups].sort((a, b)    => a.name.localeCompare(b.name))    : []
    const grants    = visibleTypes.has('grants')    ? [...visibleGrants].sort((a, b)  => a.name.localeCompare(b.name))  : []
    const schedules = visibleTypes.has('schedules') ? [...visibleSchedules].sort((a, b) => a.name.localeCompare(b.name)) : []
    const doors     = visibleTypes.has('doors')     ? [...visibleDoors].sort((a, b)   => a.name.localeCompare(b.name))   : []

    // Track all final positions for fit-to-content computation
    const allPositions: { x: number; y: number; w: number; h: number }[] = []

    // Returns the next available X position (right edge of this type's columns + gap)
    function assignPositions(
      items: { id: string }[],
      baseX: number,
      gapY: number,
      prefix: string,
      dims: { w: number; h: number },
      interColumnGap = 40,
    ): number {
      if (items.length === 0) return baseX
      const numCols = Math.ceil(items.length / LAYOUT_MAX_PER_COL)
      items.forEach((item, i) => {
        const col = Math.floor(i / LAYOUT_MAX_PER_COL)
        const row = i % LAYOUT_MAX_PER_COL
        const x   = baseX + col * (dims.w + interColumnGap)
        const y   = 60 + row * gapY
        setCanvasPosition(`${prefix}-${item.id}`, { x, y })
        allPositions.push({ x, y, w: dims.w, h: dims.h })
      })
      return baseX + numCols * (dims.w + interColumnGap)
    }

    // Each type's base X is computed dynamically so overflow columns don't overlap
    const TYPE_GAP = 80  // gap between type sections
    const groupsRight    = assignPositions(groups,    80,           LAYOUT_GAP.groups,    'group',    NODE_DIMS.groups)
    const grantsRight    = assignPositions(grants,    groupsRight  + TYPE_GAP, LAYOUT_GAP.grants,    'grant',    NODE_DIMS.grants)
    const schedulesRight = assignPositions(schedules, grantsRight  + TYPE_GAP, LAYOUT_GAP.schedules, 'schedule', NODE_DIMS.schedules)
    assignPositions(doors,     schedulesRight + TYPE_GAP, LAYOUT_GAP.doors,     'door',     NODE_DIMS.doors)

    // Compute fit-to-content zoom/pan
    const containerEl = document.querySelector('[data-canvas-container]') as HTMLElement | null
    const containerW  = containerEl?.clientWidth  ?? 800
    const containerH  = containerEl?.clientHeight ?? 600
    const fit = computeFit(allPositions, containerW, containerH)
    setInitialFit(fit)

    // Remount CanvasGraph with new initial viewport
    setLayoutResetKey(k => k + 1)
  }, [siteFilter, scopeFilter, visibleTypes, allGroups, allGrants, allSchedules, allDoors, zones, setCanvasPosition])

  function toggleType(t: EntityType) {
    setVisibleTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) {
        if (next.size === 1) return prev
        next.delete(t)
      } else {
        next.add(t)
      }
      return next
    })
  }

  function resetFilters() {
    setSiteFilter('all')
    setScopeFilter('all')
    setVisibleTypes(new Set(ALL_TYPES))
  }

  const isFiltered = siteFilter !== 'all' || scopeFilter !== 'all' || visibleTypes.size < ALL_TYPES.length

  const EDGE_MODE_OPTIONS = [
    { value: 'always' as const, label: 'Always' },
    { value: 'hover'  as const, label: 'Hover'  },
    { value: 'off'    as const, label: 'Off'    },
  ]

  return (
    <div className="flex flex-col w-full h-full bg-[#0b0e18]">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#090d18] flex-shrink-0 flex-wrap">

        {/* Site filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wide whitespace-nowrap">Site</span>
          <select
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            className="text-[11px] bg-[#0f1320] border border-[#1e2d4a] text-slate-300 rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-indigo-500/50 min-w-[140px]"
          >
            <option value="all">All Sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-[#1e2d4a]" />

        {/* Grant scope filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wide whitespace-nowrap">Grant Scope</span>
          <div className="flex gap-1">
            {(['all', 'global', 'site', 'zone'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => setScopeFilter(scope)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors capitalize ${
                  scopeFilter === scope
                    ? 'bg-violet-500/25 text-violet-300 border-violet-400/50'
                    : 'bg-transparent text-slate-500 border-[#1e2d4a] hover:text-slate-300 hover:border-slate-500'
                }`}
              >
                {scope === 'all' ? 'Any' : scope}
              </button>
            ))}
          </div>
        </div>

        <div className="h-4 w-px bg-[#1e2d4a]" />

        {/* Entity type toggles */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wide whitespace-nowrap">Show</span>
          <div className="flex gap-1">
            {ALL_TYPES.map(t => {
              const active = visibleTypes.has(t)
              return (
                <button
                  key={t}
                  data-active={active ? '' : undefined}
                  onClick={() => toggleType(t)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${TYPE_COLORS[t]} ${
                    active ? '' : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="h-4 w-px bg-[#1e2d4a]" />

        {/* Edge visibility mode */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wide whitespace-nowrap">Edges</span>
          <div className="flex gap-1">
            {EDGE_MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEdgeMode(opt.value)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  edgeMode === opt.value
                    ? 'bg-violet-500/25 text-violet-300 border-violet-400/50'
                    : 'bg-transparent text-slate-500 border-[#1e2d4a] hover:text-slate-300 hover:border-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset — only visible when something is filtered */}
        {isFiltered && (
          <>
            <div className="h-4 w-px bg-[#1e2d4a]" />
            <button
              onClick={resetFilters}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset filters
            </button>
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="relative flex-1 min-h-0" data-canvas-container>
        <CanvasGraph
          key={layoutResetKey}
          siteFilter={siteFilter === 'all' ? null : siteFilter}
          scopeFilter={scopeFilter === 'all' ? null : scopeFilter}
          visibleTypes={visibleTypes}
          onAutoLayout={handleAutoLayout}
          initialZoom={initialFit?.zoom ?? (siteFilter !== 'all' ? 0.85 : 0.65)}
          initialPan={initialFit?.pan}
        />
        {selectedNode && <DetailPanel />}
      </div>
    </div>
  )
}
