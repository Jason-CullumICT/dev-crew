import { useStore } from '../store/store'

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
  const grants    = useStore(s => s.grants)
  const schedules = useStore(s => s.schedules)
  const sites     = useStore(s => s.sites)
  const zones     = useStore(s => s.zones)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Grants</h1>
        <span className="text-[10px] text-slate-600">{grants.length} grants</span>
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
                <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${SCOPE_CLASS[grant.scope]}`}>
                  {grant.scope}
                </span>
              </div>
              {grant.description && (
                <div className="text-[10px] text-slate-500">{grant.description}</div>
              )}
              <div className="flex flex-wrap gap-1">
                {grant.actions.map(a => (
                  <span key={a} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-400 px-1.5 py-0.5 rounded">{a}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${MODE_CLASS[grant.applicationMode]}`}>
                  {grant.applicationMode}
                </span>
                {schedule && (
                  <span className="text-[9px] bg-[#07100e] border border-[#134e4a] text-teal-400 px-1.5 py-0.5 rounded">{schedule.name}</span>
                )}
                {targetName && (
                  <span className="text-[9px] text-slate-500">→ {targetName}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
