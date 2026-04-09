import { useState } from 'react'
import { useStore } from '../store/store'
import PolicyModal from '../modals/PolicyModal'
import type { Policy } from '../types'

export default function Policies() {
  const policies     = useStore(s => s.policies)
  const doors        = useStore(s => s.doors)
  const schedules    = useStore(s => s.schedules)
  const deletePolicy = useStore(s => s.deletePolicy)

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
