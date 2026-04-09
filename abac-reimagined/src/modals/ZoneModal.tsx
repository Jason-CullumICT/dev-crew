import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Zone, ZoneType, ZoneStatus } from '../types'

interface Props {
  zone?: Zone
  onClose: () => void
}

function blankZone(): Zone {
  return { id: uuidv4(), siteId: '', name: '', type: 'Interior', status: 'Disarmed' }
}

const ZONE_TYPES: ZoneType[]     = ['Perimeter', 'Interior', 'Restricted', 'Public', 'Secure']
const ZONE_STATUSES: ZoneStatus[] = ['Disarmed', 'Armed', 'Alarm']

export default function ZoneModal({ zone, onClose }: Props) {
  const sites      = useStore(s => s.sites)
  const addZone    = useStore(s => s.addZone)
  const updateZone = useStore(s => s.updateZone)

  const [draft, setDraft] = useState<Zone>(() => zone ?? { ...blankZone(), siteId: sites[0]?.id ?? '' })

  function set<K extends keyof Zone>(key: K, value: Zone[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function save() {
    if (!draft.name.trim() || !draft.siteId) return
    if (zone) updateZone(draft)
    else addZone(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={zone ? `Edit Zone — ${zone.name}` : 'New Zone'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Zone name" />
        </div>
        <div>
          <label className={labelCls}>Site</label>
          <select className={inputCls} value={draft.siteId} onChange={e => set('siteId', e.target.value)}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <div className="flex gap-1 flex-wrap">
            {ZONE_TYPES.map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`px-3 py-1.5 rounded text-[10px] transition-colors ${
                  draft.type === t ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-1">
            {ZONE_STATUSES.map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`flex-1 py-1.5 rounded text-[10px] transition-colors ${
                  draft.status === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
