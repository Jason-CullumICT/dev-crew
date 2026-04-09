import { useState } from 'react'
import { useStore } from '../store/store'
import DoorModal from '../modals/DoorModal'
import type { Door } from '../types'

export default function Doors() {
  const doors      = useStore(s => s.doors)
  const zones      = useStore(s => s.zones)
  const sites      = useStore(s => s.sites)
  const deleteDoor = useStore(s => s.deleteDoor)

  const [editing, setEditing] = useState<Door | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Doors</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{doors.length} doors</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {doors.map(door => {
          const zone = zones.find(z => z.id === door.zoneId)
          const site = sites.find(s => s.id === door.siteId)
          const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'
          return (
            <div key={door.id} className={`bg-[#0a0d14] border rounded-lg px-4 py-3 flex items-center gap-3 ${isRestricted ? 'border-red-900/40' : 'border-[#1e293b]'}`}>
              <span className="text-[18px] shrink-0">🚪</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[12px] font-semibold ${isRestricted ? 'text-red-300' : 'text-slate-200'}`}>{door.name}</div>
                <div className="text-[10px] text-slate-600">{site?.name} {zone ? `· ${zone.name} (${zone.type})` : ''}</div>
              </div>
              <button onClick={() => setEditing(door)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
              <button onClick={() => deleteDoor(door.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <DoorModal door={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
