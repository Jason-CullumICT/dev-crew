import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Door } from '../types'

interface Props {
  door?: Door
  onClose: () => void
}

function blankDoor(firstSiteId: string): Door {
  return { id: uuidv4(), name: '', siteId: firstSiteId, zoneId: undefined, description: '', customAttributes: {} }
}

export default function DoorModal({ door, onClose }: Props) {
  const sites      = useStore(s => s.sites)
  const zones      = useStore(s => s.zones)
  const addDoor    = useStore(s => s.addDoor)
  const updateDoor = useStore(s => s.updateDoor)

  const [draft, setDraft] = useState<Door>(door ?? blankDoor(sites[0]?.id ?? ''))
  const [attrKey, setAttrKey] = useState('')
  const [attrVal, setAttrVal] = useState('')

  const siteZones = zones.filter(z => z.siteId === draft.siteId)

  function set<K extends keyof Door>(key: K, value: Door[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function addAttr() {
    if (!attrKey.trim()) return
    setDraft(d => ({ ...d, customAttributes: { ...d.customAttributes, [attrKey.trim()]: attrVal } }))
    setAttrKey(''); setAttrVal('')
  }

  function removeAttr(key: string) {
    setDraft(d => {
      const { [key]: _, ...rest } = d.customAttributes
      return { ...d, customAttributes: rest }
    })
  }

  function save() {
    if (!draft.name.trim()) return
    if (door) updateDoor(draft)
    else addDoor(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={door ? `Edit Door — ${door.name}` : 'New Door'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Door name" />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={draft.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
        </div>
        <div>
          <label className={labelCls}>Site</label>
          <select className={inputCls} value={draft.siteId}
            onChange={e => setDraft(d => ({ ...d, siteId: e.target.value, zoneId: undefined }))}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Zone (optional)</label>
          <select className={inputCls} value={draft.zoneId ?? ''}
            onChange={e => set('zoneId', e.target.value || undefined)}>
            <option value="">— None —</option>
            {siteZones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.type})</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Custom Attributes</label>
          <div className="space-y-1.5 mb-2">
            {Object.entries(draft.customAttributes).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 bg-[#111827] border border-[#1e293b] rounded px-3 py-1.5">
                <span className="text-[10px] text-indigo-400 flex-1">{k}</span>
                <span className="text-[10px] text-emerald-400 flex-1">{v}</span>
                <button onClick={() => removeAttr(k)} className="text-slate-600 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={attrKey} onChange={e => setAttrKey(e.target.value)} placeholder="key"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-indigo-400 focus:outline-none focus:border-indigo-500" />
            <input value={attrVal} onChange={e => setAttrVal(e.target.value)} placeholder="value"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded px-2 py-1.5 text-[11px] text-emerald-400 focus:outline-none focus:border-indigo-500" />
            <button onClick={addAttr} className="px-3 py-1.5 bg-[#1e293b] rounded text-[11px] text-slate-400 hover:text-slate-200 transition-colors">+ Add</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
