import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
                  <button onClick={() => setEditing(group)} aria-label="Edit" className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteGroup(group.id)} aria-label="Delete" className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} />
                  </button>
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
