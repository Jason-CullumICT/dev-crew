import { useStore } from '../store/store'

export default function Groups() {
  const groups = useStore(s => s.groups)
  const grants = useStore(s => s.grants)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Groups</h1>
        <span className="text-[10px] text-slate-600">{groups.length} groups</span>
      </div>

      <div className="grid gap-3">
        {groups.map(group => {
          const subGroupNames = group.subGroups.map(id => groups.find(g => g.id === id)?.name ?? id)
          const grantNames    = group.inheritedPermissions.map(id => grants.find(g => g.id === id)?.name ?? id)
          const memberCount   = group.membershipType === 'static' ? group.members.length : null

          return (
            <div key={group.id} className="bg-[#0f1320] border border-[#1e2d4a] rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{group.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{group.description}</div>
                </div>
                <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                  group.membershipType === 'dynamic'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>{group.membershipType}</span>
              </div>

              {group.membershipType === 'dynamic' && group.membershipRules.length > 0 && (
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

              {memberCount !== null && memberCount > 0 && (
                <div className="text-[10px] text-slate-500">{memberCount} static members</div>
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
    </div>
  )
}
