import { useState } from 'react'
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

export default function Canvas() {
  const selectedNode = useStore(s => s.selectedCanvasNodeId)
  const sites        = useStore(s => s.sites)

  const [siteFilter, setSiteFilter]       = useState<string>('all')
  const [scopeFilter, setScopeFilter]     = useState<string>('all')
  const [visibleTypes, setVisibleTypes]   = useState<Set<EntityType>>(new Set(ALL_TYPES))

  function toggleType(t: EntityType) {
    setVisibleTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) {
        // Don't allow deselecting all
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
      <div className="relative flex-1 min-h-0">
        <CanvasGraph
          siteFilter={siteFilter === 'all' ? null : siteFilter}
          scopeFilter={scopeFilter === 'all' ? null : scopeFilter}
          visibleTypes={visibleTypes}
        />
        {selectedNode && <DetailPanel />}
      </div>
    </div>
  )
}
