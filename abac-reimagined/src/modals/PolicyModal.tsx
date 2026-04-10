import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import RuleBuilder from '../components/RuleBuilder'
import { useStore } from '../store/store'
import type { Policy, Rule } from '../types'

interface Props {
  policy?: Policy
  onClose: () => void
}

function blankPolicy(): Policy {
  return { id: uuidv4(), name: '', description: '', rules: [], logicalOperator: 'AND', doorIds: [], scheduleId: undefined }
}

type Tab = 'Basics' | 'Rules' | 'Doors' | 'Schedule'
const TABS: Tab[] = ['Basics', 'Rules', 'Doors', 'Schedule']

export default function PolicyModal({ policy, onClose }: Props) {
  const doors        = useStore(s => s.doors)
  const sites        = useStore(s => s.sites)
  const schedules    = useStore(s => s.schedules)
  const addPolicy    = useStore(s => s.addPolicy)
  const updatePolicy = useStore(s => s.updatePolicy)

  const [draft, setDraft] = useState<Policy>(policy ?? blankPolicy())
  const [tab, setTab]     = useState<Tab>('Basics')
  const [logic, setLogic] = useState<'AND' | 'OR'>(policy?.logicalOperator ?? 'AND')

  function toggleDoor(did: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(did) ? d.doorIds.filter(x => x !== did) : [...d.doorIds, did],
    }))
  }

  function onRulesChange(rules: Rule[], l: 'AND' | 'OR') {
    setDraft(d => ({ ...d, rules, logicalOperator: l }))
    setLogic(l)
  }

  function save() {
    if (!draft.name.trim()) return
    if (policy) updatePolicy(draft)
    else addPolicy(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={policy ? `Edit Policy — ${policy.name}` : 'New Policy'} onClose={onClose} onSave={save} size="lg">
      <div className="sticky top-0 z-10 flex border-b border-[#1e293b] bg-[#0d1117]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[10px] font-semibold tracking-wide transition-colors ${
              tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-400'
            }`}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'Basics' && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Policy name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls + ' resize-none h-20'} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Describe what this policy enforces" />
            </div>
          </>
        )}

        {tab === 'Rules' && (
          <div>
            <p className="text-[10px] text-slate-500 mb-3">Policy rules are evaluated against the requesting user. All rules must pass (AND) or any rule must pass (OR) for the policy to allow access.</p>
            <RuleBuilder rules={draft.rules} logic={logic} onChange={onRulesChange} />
          </div>
        )}

        {tab === 'Doors' && (
          <div>
            <label className={labelCls}>Applies to Doors ({draft.doorIds.length} selected)</label>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {doors.map(door => {
                const site = sites.find(s => s.id === door.siteId)
                return (
                  <label key={door.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#111827] cursor-pointer">
                    <input type="checkbox" checked={draft.doorIds.includes(door.id)} onChange={() => toggleDoor(door.id)} className="accent-indigo-500" />
                    <div className="flex-1">
                      <div className="text-[11px] text-slate-300">{door.name}</div>
                      <div className="text-[9px] text-slate-600">{site?.name}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Schedule' && (
          <div>
            <label className={labelCls}>Active Schedule (optional)</label>
            <select className={inputCls} value={draft.scheduleId ?? ''}
              onChange={e => setDraft(d => ({ ...d, scheduleId: e.target.value || undefined }))}>
              <option value="">— Always active —</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.timezone})</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}
