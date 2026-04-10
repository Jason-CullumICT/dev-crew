import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Controller } from '../types'

interface Props {
  controller?: Controller
  onClose: () => void
}

function blankController(firstSiteId: string): Controller {
  return { id: uuidv4(), name: '', location: '', siteId: firstSiteId, doorIds: [], customAttributes: {} }
}

export default function ControllerModal({ controller, onClose }: Props) {
  const sites            = useStore(s => s.sites)
  const doors            = useStore(s => s.doors)
  const addController    = useStore(s => s.addController)
  const updateController = useStore(s => s.updateController)

  const [draft, setDraft] = useState<Controller>(controller ?? blankController(sites[0]?.id ?? ''))

  const siteDoors = doors.filter(d => d.siteId === draft.siteId)

  function toggleDoor(did: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(did) ? d.doorIds.filter(x => x !== did) : [...d.doorIds, did],
    }))
  }

  function save() {
    if (!draft.name.trim()) return
    if (controller) updateController(draft)
    else addController(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={controller ? `Edit Controller — ${controller.name}` : 'New Controller'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Controller name" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input className={inputCls} value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder="Physical location" />
        </div>
        <div>
          <label className={labelCls}>Site</label>
          <select className={inputCls} value={draft.siteId}
            onChange={e => setDraft(d => ({ ...d, siteId: e.target.value, doorIds: [] }))}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Managed Doors ({draft.doorIds.length} selected)</label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {siteDoors.map(door => (
              <label key={door.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                <input type="checkbox" checked={draft.doorIds.includes(door.id)} onChange={() => toggleDoor(door.id)} className="accent-indigo-500" />
                <span className="text-[11px] text-slate-300">{door.name}</span>
              </label>
            ))}
            {siteDoors.length === 0 && <p className="text-[10px] text-slate-600 px-3">No doors in this site.</p>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
