import { useState } from 'react'
import { useStore } from '../store/store'
import ZoneModal from '../modals/ZoneModal'
import type { Zone, ZoneType, ZoneStatus } from '../types'

const TYPE_CLASS: Record<ZoneType, string> = {
  Perimeter:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Interior:   'bg-slate-700 text-slate-400 border-slate-600',
  Restricted: 'bg-red-500/10 text-red-400 border-red-500/20',
  Public:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Secure:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const STATUS_CLASS: Record<ZoneStatus, string> = {
  Armed:    'bg-red-500/10 text-red-400 border-red-500/20',
  Disarmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Alarm:    'bg-red-600/20 text-red-300 border-red-600/30',
}

export default function Zones() {
  const zones      = useStore(s => s.zones)
  const sites      = useStore(s => s.sites)
  const deleteZone = useStore(s => s.deleteZone)

  const [editing, setEditing] = useState<Zone | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Zones</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{zones.length} zones</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {zones.map(zone => {
          const site = sites.find(s => s.id === zone.siteId)
          return (
            <div key={zone.id} className="bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-100">{zone.name}</div>
                <div className="text-[10px] text-slate-500">{site?.name ?? zone.siteId}</div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${TYPE_CLASS[zone.type]}`}>{zone.type}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${STATUS_CLASS[zone.status]}`}>{zone.status}</span>
              <button onClick={() => setEditing(zone)} className="text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">Edit</button>
              <button onClick={() => deleteZone(zone.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <ZoneModal zone={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
