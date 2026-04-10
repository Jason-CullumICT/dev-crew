import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Site, SiteStatus } from '../types'

interface Props {
  site?: Site
  onClose: () => void
}

function blankSite(): Site {
  return { id: uuidv4(), name: '', address: '', timezone: 'Australia/Sydney', status: 'Disarmed' }
}

const STATUSES: SiteStatus[] = ['Disarmed', 'Armed', 'PartialArm', 'Alarm', 'Lockdown']

export default function SiteModal({ site, onClose }: Props) {
  const addSite    = useStore(s => s.addSite)
  const updateSite = useStore(s => s.updateSite)

  const [draft, setDraft] = useState<Site>(site ?? blankSite())

  function set<K extends keyof Site>(key: K, value: Site[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function save() {
    if (!draft.name.trim()) return
    if (site) updateSite(draft)
    else addSite(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={site ? `Edit Site — ${site.name}` : 'New Site'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Site name" />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <input className={inputCls} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
        </div>
        <div>
          <label className={labelCls}>Timezone (IANA)</label>
          <input className={inputCls} value={draft.timezone} onChange={e => set('timezone', e.target.value)} placeholder="e.g. Australia/Sydney" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`px-3 py-1.5 rounded text-[10px] transition-colors ${
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
