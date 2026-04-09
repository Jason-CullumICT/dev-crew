import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { User } from '../types'

interface Props {
  user?: User        // undefined = new user
  onClose: () => void
}

function blankUser(): User {
  return {
    id: uuidv4(),
    name: '', email: '', department: '', role: '',
    clearanceLevel: 1,
    type: 'employee',
    status: 'active',
    customAttributes: {},
  }
}

export default function UserModal({ user, onClose }: Props) {
  const addUser    = useStore(s => s.addUser)
  const updateUser = useStore(s => s.updateUser)

  const [draft, setDraft] = useState<User>(user ?? blankUser())
  const [attrKey, setAttrKey] = useState('')
  const [attrVal, setAttrVal] = useState('')

  function set<K extends keyof User>(key: K, value: User[K]) {
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
    if (user) updateUser(draft)
    else addUser(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={user ? `Edit User — ${user.name}` : 'New User'} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={draft.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className={labelCls}>Department</label>
            <input className={inputCls} value={draft.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Operations" />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <input className={inputCls} value={draft.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Analyst" />
          </div>
        </div>

        {/* Clearance */}
        <div>
          <label className={labelCls}>Clearance Level</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => set('clearanceLevel', n)}
                className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-colors ${
                  draft.clearanceLevel === n ? 'bg-indigo-600 text-white' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                L{n}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className={labelCls}>Type</label>
          <div className="flex gap-1">
            {(['employee', 'contractor', 'visitor'] as const).map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                  draft.type === t ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-1">
            {(['active', 'suspended', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => set('status', s)}
                className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                  draft.status === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Custom attributes */}
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
