import { useState } from 'react'
import { useStore } from '../store/store'
import ControllerModal from '../modals/ControllerModal'
import type { Controller } from '../types'

export default function Controllers() {
  const controllers      = useStore(s => s.controllers)
  const sites            = useStore(s => s.sites)
  const doors            = useStore(s => s.doors)
  const deleteController = useStore(s => s.deleteController)

  const [editing, setEditing] = useState<Controller | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Controllers</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{controllers.length} controllers</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {controllers.map(ctrl => {
          const site = sites.find(s => s.id === ctrl.siteId)
          const ctrlDoors = ctrl.doorIds.map(id => doors.find(d => d.id === id)?.name ?? id)
          return (
            <div key={ctrl.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-bold text-slate-100">{ctrl.name}</div>
                  <div className="text-[10px] text-slate-500">{site?.name} · {ctrl.location}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditing(ctrl)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
                  <button onClick={() => deleteController(ctrl.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
              {ctrlDoors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ctrlDoors.map(name => (
                    <span key={name} className="text-[9px] bg-[#111827] border border-[#1e293b] text-slate-500 px-1.5 py-0.5 rounded">🚪 {name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {controllers.length === 0 && <p className="text-[12px] text-slate-600">No controllers yet.</p>}
      </div>

      {editing !== null && (
        <ControllerModal controller={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
