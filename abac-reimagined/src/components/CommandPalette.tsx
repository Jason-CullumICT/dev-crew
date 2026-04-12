import { useState, useEffect, useRef, useMemo } from 'react'
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
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(0)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Memoize the full entity search index so it is not rebuilt on every keystroke
  const allResults: Result[] = useMemo(() => [
    ...users.map(u => ({ id: u.id, label: u.name, sublabel: `${u.department} · L${u.customAttributes.clearanceLevel ?? '?'}`, type: 'User', route: '/people' })),
    ...groups.map(g => ({ id: g.id, label: g.name, sublabel: g.description, type: 'Group', route: '/groups' })),
    ...grants.map(g => ({ id: g.id, label: g.name, sublabel: `${g.scope} · ${g.applicationMode}`, type: 'Grant', route: '/grants' })),
    ...schedules.map(s => ({ id: s.id, label: s.name, sublabel: s.timezone, type: 'Schedule', route: '/schedules' })),
    ...doors.map(d => ({ id: d.id, label: d.name, sublabel: d.description, type: 'Door', route: '/doors' })),
    ...sites.map(s => ({ id: s.id, label: s.name, sublabel: s.address, type: 'Site', route: '/sites' })),
    ...zones.map(z => ({ id: z.id, label: z.name, sublabel: z.type, type: 'Zone', route: '/zones' })),
    ...policies.map(p => ({ id: p.id, label: p.name, sublabel: p.description, type: 'Policy', route: '/policies' })),
    ...controllers.map(c => ({ id: c.id, label: c.name, sublabel: c.location, type: 'Controller', route: '/controllers' })),
  ], [users, groups, grants, schedules, doors, sites, zones, policies, controllers])

  const filtered = query.trim()
    ? allResults.filter(r =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.sublabel.toLowerCase().includes(query.toLowerCase()) ||
        r.type.toLowerCase().includes(query.toLowerCase())
      )
    : allResults.slice(0, 12)

  // Group results by type
  const grouped = filtered.reduce<Record<string, Result[]>>((acc, r) => {
    acc[r.type] = [...(acc[r.type] ?? []), r]
    return acc
  }, {})

  // Flatten for keyboard navigation — build once so indices are stable
  const flat = useMemo(() => Object.values(grouped).flat(), [grouped])

  // Build a stable index map so we never use a mutable counter during render
  const flatIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    flat.forEach((item, idx) => map.set(`${item.type}:${item.id}`, idx))
    return map
  }, [flat])

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/70" onClick={onClose}>
      <div
        className="bg-[#0d1117] border border-[#2d3148] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e293b]">
          <span className="text-slate-500 text-[14px]">&#x1F50D;</span>
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
                const idx = flatIndexMap.get(`${item.type}:${item.id}`) ?? 0
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
          <span>&#x2191;&#x2193; navigate</span>
          <span>&#x21B5; go to page</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  )
}
