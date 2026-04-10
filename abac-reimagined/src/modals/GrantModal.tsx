import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import RuleBuilder from '../components/RuleBuilder'
import { useStore } from '../store/store'
import type { Grant, ActionType, Rule } from '../types'

interface Props {
  grant?: Grant
  onClose: () => void
}

const ALL_ACTIONS: ActionType[] = ['unlock', 'arm', 'disarm', 'lockdown', 'view_logs', 'manage_users', 'manage_tasks', 'override']

function blankGrant(): Grant {
  return {
    id: uuidv4(), name: '', description: '',
    scope: 'global', targetId: undefined,
    actions: [], applicationMode: 'assigned',
    conditions: [], conditionLogic: 'AND',
    scheduleId: undefined, customAttributes: {},
  }
}

type Tab = 'Basics' | 'Actions' | 'Conditions' | 'Schedule'
const TABS: Tab[] = ['Basics', 'Actions', 'Conditions', 'Schedule']

export default function GrantModal({ grant, onClose }: Props) {
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const schedules   = useStore(s => s.schedules)
  const addGrant    = useStore(s => s.addGrant)
  const updateGrant = useStore(s => s.updateGrant)

  const [draft, setDraft] = useState<Grant>(grant ?? blankGrant())
  const [tab, setTab]     = useState<Tab>('Basics')
  const [logic, setLogic] = useState<'AND' | 'OR'>(grant?.conditionLogic ?? 'AND')

  function toggleAction(a: ActionType) {
    setDraft(d => ({
      ...d,
      actions: d.actions.includes(a) ? d.actions.filter(x => x !== a) : [...d.actions, a],
    }))
  }

  function onConditionsChange(rules: Rule[], l: 'AND' | 'OR') {
    setDraft(d => ({ ...d, conditions: rules, conditionLogic: l }))
    setLogic(l)
  }

  function save() {
    if (!draft.name.trim()) return
    if (grant) updateGrant(draft)
    else addGrant(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  const scopeTargets = draft.scope === 'site' ? sites : draft.scope === 'zone' ? zones : []

  return (
    <Modal title={grant ? `Edit Grant — ${grant.name}` : 'New Grant'} onClose={onClose} onSave={save} size="lg">
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
              <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Grant name" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What this grant allows" />
            </div>
            <div>
              <label className={labelCls}>Scope</label>
              <div className="flex gap-1">
                {(['global', 'site', 'zone'] as const).map(s => (
                  <button key={s} onClick={() => setDraft(d => ({ ...d, scope: s, targetId: undefined }))}
                    className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                      draft.scope === s ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {draft.scope !== 'global' && (
              <div>
                <label className={labelCls}>Target {draft.scope === 'site' ? 'Site' : 'Zone'}</label>
                <select className={inputCls} value={draft.targetId ?? ''}
                  onChange={e => setDraft(d => ({ ...d, targetId: e.target.value || undefined }))}>
                  <option value="">— Select —</option>
                  {scopeTargets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Application Mode</label>
              <div className="flex gap-1">
                {(['assigned', 'conditional', 'auto'] as const).map(m => (
                  <button key={m} onClick={() => setDraft(d => ({ ...d, applicationMode: m }))}
                    className={`flex-1 py-1.5 rounded text-[11px] capitalize transition-colors ${
                      draft.applicationMode === m ? 'bg-indigo-600 text-white font-semibold' : 'bg-[#111827] text-slate-500 hover:text-slate-300 border border-[#1e293b]'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'Actions' && (
          <div>
            <label className={labelCls}>Permitted Actions ({draft.actions.length} selected)</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ACTIONS.map(a => (
                <label key={a} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#111827] border border-[#1e293b] hover:border-indigo-500/30 cursor-pointer transition-colors">
                  <input type="checkbox" checked={draft.actions.includes(a)} onChange={() => toggleAction(a)} className="accent-indigo-500" />
                  <span className="text-[11px] text-slate-300 font-mono">{a}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'Conditions' && (
          <div>
            <p className="text-[10px] text-slate-500 mb-3">Conditions restrict which users this grant applies to, regardless of group membership.</p>
            <RuleBuilder rules={draft.conditions} logic={logic} onChange={onConditionsChange} />
          </div>
        )}

        {tab === 'Schedule' && (
          <div>
            <label className={labelCls}>Time Schedule (optional)</label>
            <select className={inputCls} value={draft.scheduleId ?? ''}
              onChange={e => setDraft(d => ({ ...d, scheduleId: e.target.value || undefined }))}>
              <option value="">— No schedule (always active) —</option>
              {schedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.timezone})</option>)}
            </select>
            {draft.scheduleId && (
              <p className="text-[10px] text-slate-600 mt-2">This grant will only be active during the selected schedule's windows.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
