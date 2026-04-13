// src/pages/Escalations.tsx
// Phase 3 — Escalation Chain editor page

import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useStore } from '../store/store'
import ConfirmDialog from '../components/ConfirmDialog'
import { Button } from '../ui/button'
import type {
  EscalationChain,
  EscalationStep,
  ResponseAction,
  ResponseActionType,
  ThreatLevel,
} from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTION_TYPES: ResponseActionType[] = [
  'lock_door', 'lock_zone', 'lock_site', 'unlock_door', 'unlock_zone',
  'activate_siren', 'activate_strobe', 'trigger_camera',
  'send_notification', 'escalate_alarm', 'change_threat_level',
  'arm_zone', 'disarm_zone',
]

const ALL_THREAT_LEVELS: ThreatLevel[] = ['normal', 'elevated', 'high', 'critical', 'lockdown']

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyChain(): EscalationChain {
  return {
    id:    uuidv4(),
    name:  'New Escalation Chain',
    steps: [],
  }
}

function emptyStep(): EscalationStep {
  return {
    delayMinutes:  0,
    notifyUserIds: [],
    autoActions:   [],
  }
}

function emptyAction(): ResponseAction {
  return { type: 'send_notification', params: { message: '' } }
}

// ── Step action editor ────────────────────────────────────────────────────────

function StepActionRow({
  action,
  index,
  onChange,
  onRemove,
}: {
  action: ResponseAction
  index: number
  onChange: (a: ResponseAction) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[9px] text-slate-700 w-3">{index + 1}.</span>
      <select
        value={action.type}
        onChange={e => onChange({ ...action, type: e.target.value as ResponseActionType })}
        className="bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-0.5 text-[10px] text-slate-300 outline-none focus:border-indigo-500/50"
      >
        {ACTION_TYPES.map(t => (
          <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
        ))}
      </select>

      {action.type === 'change_threat_level' && (
        <select
          value={action.params['level'] ?? 'elevated'}
          onChange={e => onChange({ ...action, params: { ...action.params, level: e.target.value } })}
          className="bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-0.5 text-[10px] text-slate-300 outline-none focus:border-indigo-500/50"
        >
          {ALL_THREAT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      )}

      {action.type === 'send_notification' && (
        <input
          type="text"
          placeholder="message"
          value={action.params['message'] ?? ''}
          onChange={e => onChange({ ...action, params: { ...action.params, message: e.target.value } })}
          className="flex-1 bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-0.5 text-[10px] text-slate-300 placeholder-slate-700 outline-none focus:border-indigo-500/50"
        />
      )}

      <button onClick={onRemove} className="text-slate-700 hover:text-red-400 transition-colors ml-auto">
        <X size={11} />
      </button>
    </div>
  )
}

// ── Step editor ───────────────────────────────────────────────────────────────

function StepEditor({
  step,
  index,
  users,
  onChange,
  onRemove,
}: {
  step: EscalationStep
  index: number
  users: Array<{ id: string; name: string }>
  onChange: (s: EscalationStep) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  function toggleUser(uid: string) {
    if (step.notifyUserIds.includes(uid)) {
      onChange({ ...step, notifyUserIds: step.notifyUserIds.filter(x => x !== uid) })
    } else {
      onChange({ ...step, notifyUserIds: [...step.notifyUserIds, uid] })
    }
  }

  function addAction() {
    onChange({ ...step, autoActions: [...step.autoActions, emptyAction()] })
  }

  function updateAction(i: number, a: ResponseAction) {
    const next = [...step.autoActions]
    next[i] = a
    onChange({ ...step, autoActions: next })
  }

  function removeAction(i: number) {
    onChange({ ...step, autoActions: step.autoActions.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="rounded-lg border border-[#1e293b] bg-white/[0.02]">
      {/* Step header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-400 shrink-0">
          {index + 1}
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] text-slate-500">After</span>
          <input
            type="number"
            min={0}
            max={1440}
            value={step.delayMinutes}
            onChange={e => onChange({ ...step, delayMinutes: Number(e.target.value) })}
            className="w-14 bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-0.5 text-[11px] text-slate-300 outline-none focus:border-indigo-500/50"
          />
          <span className="text-[10px] text-slate-500">minutes</span>
        </div>
        <button
          onClick={() => setExpanded(x => !x)}
          className="text-slate-600 hover:text-slate-400 transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button
          onClick={onRemove}
          className="text-slate-700 hover:text-red-400 transition-colors"
          title="Remove step"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[#1e293b]">
          {/* Notify users */}
          <div className="pt-2">
            <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1.5">Notify Users</div>
            <div className="flex flex-wrap gap-1.5">
              {users.slice(0, 20).map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`px-2 py-0.5 rounded text-[9px] border transition-colors ${
                    step.notifyUserIds.includes(u.id)
                      ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/[0.03] border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-400'
                  }`}
                >
                  {u.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-actions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-600">Auto Actions</div>
              <button
                onClick={addAction}
                className="flex items-center gap-1 text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={10} />
                Add
              </button>
            </div>
            {step.autoActions.length === 0 && (
              <p className="text-[10px] text-slate-700">No automatic actions for this step.</p>
            )}
            <div className="space-y-0.5">
              {step.autoActions.map((a, i) => (
                <StepActionRow
                  key={i}
                  action={a}
                  index={i}
                  onChange={na => updateAction(i, na)}
                  onRemove={() => removeAction(i)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chain editor card ─────────────────────────────────────────────────────────

function ChainCard({
  chain,
  users,
  onUpdate,
  onDelete,
}: {
  chain: EscalationChain
  users: Array<{ id: string; name: string }>
  onUpdate: (c: EscalationChain) => void
  onDelete: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  function updateName(name: string) {
    onUpdate({ ...chain, name })
  }

  function addStep() {
    onUpdate({ ...chain, steps: [...chain.steps, emptyStep()] })
  }

  function updateStep(i: number, s: EscalationStep) {
    const next = [...chain.steps]
    next[i] = s
    onUpdate({ ...chain, steps: next })
  }

  function removeStep(i: number) {
    onUpdate({ ...chain, steps: chain.steps.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Chain header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e293b]">
        <input
          type="text"
          value={chain.name}
          onChange={e => updateName(e.target.value)}
          className="flex-1 bg-transparent text-[13px] font-semibold text-slate-200 outline-none border-b border-transparent focus:border-indigo-500/50"
        />
        <span className="text-[10px] text-slate-600">{chain.steps.length} steps</span>
        <button
          onClick={() => setDeleting(true)}
          className="text-slate-700 hover:text-red-400 transition-colors"
          title="Delete chain"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {chain.steps.length === 0 && (
          <p className="text-[11px] text-slate-700">No steps yet. Add the first escalation step below.</p>
        )}
        {chain.steps.map((step, i) => (
          <StepEditor
            key={i}
            step={step}
            index={i}
            users={users}
            onChange={s => updateStep(i, s)}
            onRemove={() => removeStep(i)}
          />
        ))}
        <button
          onClick={addStep}
          className="flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
        >
          <Plus size={11} />
          Add Step
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          open={true}
          title="Delete Escalation Chain"
          message={`Delete "${chain.name}"? This cannot be undone.`}
          onConfirm={() => { onDelete(); setDeleting(false) }}
          onCancel={() => setDeleting(false)}
          variant="danger"
        />
      )}
    </div>
  )
}

// ── Escalations page ──────────────────────────────────────────────────────────

export default function Escalations() {
  const chains       = useStore(s => s.escalationChains)
  const users        = useStore(s => s.users)
  const addChain     = useStore(s => s.addEscalationChain)
  const updateChain  = useStore(s => s.updateEscalationChain)
  const deleteChain  = useStore(s => s.deleteEscalationChain)

  const userOptions = useMemo(
    () => users.filter(u => u.status === 'active').map(u => ({ id: u.id, name: u.name })),
    [users]
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] shrink-0">
        <div>
          <div className="text-sm font-medium text-[hsl(var(--foreground))]">Escalation Chains</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Define step-by-step response workflows. Each step fires after a delay with notifications and auto-actions.
          </div>
        </div>
        <Button size="sm" onClick={() => addChain(emptyChain())} className="gap-1.5">
          <Plus size={12} />
          New Chain
        </Button>
      </div>

      {/* Chain list */}
      <div className="flex-1 overflow-y-auto p-4">
        {chains.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-[12px]">
            No escalation chains configured yet.
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {chains.map(chain => (
              <ChainCard
                key={chain.id}
                chain={chain}
                users={userOptions}
                onUpdate={c => updateChain(c)}
                onDelete={() => deleteChain(chain.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
