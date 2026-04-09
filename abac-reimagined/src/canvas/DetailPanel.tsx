import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import { Search, Activity, X } from 'lucide-react'

export default function DetailPanel() {
  const selected  = useStore(s => s.selectedCanvasNodeId)
  const setSelected = useStore(s => s.setSelectedCanvasNode)
  const groups    = useStore(s => s.groups)
  const grants    = useStore(s => s.grants)
  const doors     = useStore(s => s.doors)
  const zones     = useStore(s => s.zones)
  const schedules = useStore(s => s.schedules)
  const navigate  = useNavigate()

  if (!selected) return null

  // Parse "type-rest-of-id" — type is first segment, id is everything after
  const dashIdx = selected.indexOf('-')
  const type = dashIdx === -1 ? selected : selected.slice(0, dashIdx)
  const id = dashIdx === -1 ? '' : selected.slice(dashIdx + 1)

  let title = '', subtitle = '', body: React.ReactNode = null

  if (type === 'group') {
    const group = groups.find(g => g.id === id)
    if (!group) return null
    title = group.name
    subtitle = `Group · ${group.membershipType}`
    body = (
      <div className="space-y-4">
        {group.membershipType === 'dynamic' && group.membershipRules.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Membership rules</div>
            {group.membershipRules.map(r => (
              <div key={r.id} className="bg-[#111827] rounded px-2 py-1.5 text-[10px] font-mono text-slate-400 mb-1">
                <span className="text-indigo-400">{r.leftSide}</span>{' '}
                <span className="text-slate-600">{r.operator}</span>{' '}
                <span className="text-emerald-400">"{Array.isArray(r.rightSide) ? r.rightSide.join(', ') : r.rightSide}"</span>
              </div>
            ))}
          </div>
        )}
        {group.subGroups.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Subgroups</div>
            <div className="flex flex-wrap gap-1">
              {group.subGroups.map(sgId => {
                const sg = groups.find(g => g.id === sgId)
                return sg ? <span key={sgId} className="text-[10px] bg-[#111827] border border-[#1e3a5f] text-blue-400 px-2 py-0.5 rounded">↳ {sg.name}</span> : null
              })}
            </div>
          </div>
        )}
        {group.inheritedPermissions.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Grants</div>
            <div className="flex flex-wrap gap-1">
              {group.inheritedPermissions.map(gid => {
                const g = grants.find(gr => gr.id === gid)
                return g ? <span key={gid} className="text-[10px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-2 py-0.5 rounded">{g.name}</span> : null
              })}
            </div>
          </div>
        )}
      </div>
    )
  } else if (type === 'grant') {
    const grant = grants.find(g => g.id === id)
    if (!grant) return null
    title = grant.name
    subtitle = `Grant · ${grant.applicationMode} · ${grant.scope}`
    body = (
      <div className="space-y-4">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Actions</div>
          <div className="flex flex-wrap gap-1">
            {grant.actions.map(a => (
              <span key={a} className="text-[10px] bg-[#111827] border border-[#1e293b] text-slate-400 px-2 py-0.5 rounded">{a}</span>
            ))}
          </div>
        </div>
        {grant.scheduleId && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Schedule</div>
            <span className="text-[10px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-2 py-0.5 rounded">
              {schedules.find(s => s.id === grant.scheduleId)?.name ?? grant.scheduleId}
            </span>
          </div>
        )}
        {grant.conditions.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Conditions</div>
            {grant.conditions.map(c => (
              <div key={c.id} className="bg-[#111827] rounded px-2 py-1.5 text-[10px] font-mono text-slate-400 mb-1">
                <span className="text-indigo-400">{c.leftSide}</span>{' '}
                <span className="text-slate-600">{c.operator}</span>{' '}
                <span className="text-amber-400">"{Array.isArray(c.rightSide) ? c.rightSide.join(', ') : c.rightSide}"</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  } else if (type === 'schedule') {
    const schedule = schedules.find(s => s.id === id)
    if (!schedule) return null
    title = schedule.name
    subtitle = `Schedule · ${schedule.timezone}`
    body = (
      <div className="space-y-4">
        {schedule.windows.map(w => (
          <div key={w.id}>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Window</div>
            <div className="text-[10px] text-slate-400">{w.days.join(', ')} · {w.startTime}–{w.endTime}</div>
          </div>
        ))}
        {schedule.holidays.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1.5">Holidays</div>
            {schedule.holidays.map(h => (
              <div key={h.id} className="text-[10px] text-slate-500 mb-0.5">
                <span className={h.behavior === 'deny_all' ? 'text-red-500' : 'text-amber-500'}>
                  {h.behavior === 'deny_all' ? '✕' : '⚠'} {h.name}
                </span>
                {' '}({h.month}/{h.day})
              </div>
            ))}
          </div>
        )}
      </div>
    )
  } else if (type === 'door') {
    const door = doors.find(d => d.id === id)
    if (!door) return null
    const zone = zones.find(z => z.id === door.zoneId)
    title = door.name
    subtitle = `Door · ${zone?.type ?? 'No zone'}`
    body = (
      <div className="space-y-4">
        {zone && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#374151] font-semibold mb-1">Zone</div>
            <div className="text-[10px] text-slate-400">{zone.name} · {zone.type}</div>
          </div>
        )}
        {door.description && (
          <div className="text-[10px] text-slate-500">{door.description}</div>
        )}
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-56 bg-[#07090f] border-l border-[#141828] flex flex-col z-10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#141828] flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-bold text-slate-100">{title}</div>
          <div className="text-[10px] text-[#374151] mt-0.5">{subtitle}</div>
        </div>
        <button onClick={() => setSelected(null)} className="text-[#374151] hover:text-slate-400 mt-0.5 shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {body}
      </div>

      {/* Quick actions */}
      <div className="px-4 py-3 border-t border-[#141828] space-y-2">
        <button
          onClick={() => navigate('/oracle')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] bg-violet-500/[0.08] border border-violet-500/[0.15] text-violet-400 hover:bg-violet-500/[0.14] transition-colors"
        >
          <Search size={11} /> Query in Oracle
        </button>
        <button
          onClick={() => navigate('/reasoner')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[10px] bg-cyan-500/[0.08] border border-cyan-500/[0.15] text-cyan-400 hover:bg-cyan-500/[0.14] transition-colors"
        >
          <Activity size={11} /> Trace in Reasoner
        </button>
      </div>
    </div>
  )
}
