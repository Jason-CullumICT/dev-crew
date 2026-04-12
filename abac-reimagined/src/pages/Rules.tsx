// src/pages/Rules.tsx
// Phase 3 — Response Rules Builder page

import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useStore } from '../store/store'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type {
  ResponseRule,
  ResponseAction,
  ResponseActionType,
  SecurityEventType,
  EventSeverity,
  ZoneType,
  ZoneStatus,
  ThreatLevel,
} from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_EVENT_TYPES: SecurityEventType[] = [
  'access_granted', 'access_denied', 'door_forced', 'door_held',
  'sensor_trip', 'controller_offline', 'arm_state_change', 'panic_button',
  'door_contact_open', 'door_contact_close', 'reader_tamper',
  'device_offline', 'device_online', 'pir_trigger',
]

const ALL_SEVERITIES: EventSeverity[] = ['critical', 'warning', 'info']
const ALL_ZONE_TYPES: ZoneType[] = ['Perimeter', 'Interior', 'Restricted', 'Public', 'Secure']
const ALL_ARM_STATES: ZoneStatus[] = ['Armed', 'Disarmed', 'Alarm']
const ALL_THREAT_LEVELS: ThreatLevel[] = ['normal', 'elevated', 'high', 'critical', 'lockdown']

const ACTION_TYPES: ResponseActionType[] = [
  'lock_door', 'lock_zone', 'lock_site', 'unlock_door', 'unlock_zone',
  'activate_siren', 'activate_strobe', 'trigger_camera',
  'send_notification', 'escalate_alarm', 'change_threat_level',
  'arm_zone', 'disarm_zone',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyRule(): ResponseRule {
  return {
    id:         uuidv4(),
    name:       'New Rule',
    enabled:    true,
    priority:   5,
    trigger:    { eventTypes: [], severities: [] },
    conditions: {},
    actions:    [],
  }
}

function emptyAction(): ResponseAction {
  return { type: 'send_notification', params: {} }
}


// ── Multi-select chip component ───────────────────────────────────────────────

function ChipSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: T[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  function toggle(opt: T) {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt))
    } else {
      onChange([...selected, opt])
    }
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
              selected.includes(opt)
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                : 'bg-white/[0.03] border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Action row editor ─────────────────────────────────────────────────────────

function ActionEditor({
  action,
  index,
  doors,
  zones,
  sites,
  onChange,
  onRemove,
}: {
  action: ResponseAction
  index: number
  doors: Array<{ id: string; name: string }>
  zones: Array<{ id: string; name: string }>
  sites: Array<{ id: string; name: string }>
  onChange: (a: ResponseAction) => void
  onRemove: () => void
}) {
  const targetOptions = useMemo(() => {
    if (action.type.includes('door')) return doors
    if (action.type.includes('zone') || action.type === 'arm_zone' || action.type === 'disarm_zone') return zones
    if (action.type.includes('site')) return sites
    return []
  }, [action.type, doors, zones, sites])

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] text-slate-600 w-4 shrink-0 mt-1">{index + 1}.</div>

      <div className="flex-1 flex flex-wrap gap-2 items-start">
        {/* Action type */}
        <select
          value={action.type}
          onChange={e => onChange({ ...action, type: e.target.value as ResponseActionType, targetId: undefined })}
          className="bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-indigo-500/50"
        >
          {ACTION_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {/* Target selector (for door/zone/site actions) */}
        {targetOptions.length > 0 && (
          <select
            value={action.targetId ?? ''}
            onChange={e => onChange({ ...action, targetId: e.target.value || undefined })}
            className="bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-indigo-500/50"
          >
            <option value="">(from event)</option>
            {targetOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        )}

        {/* change_threat_level param */}
        {action.type === 'change_threat_level' && (
          <select
            value={action.params['level'] ?? 'elevated'}
            onChange={e => onChange({ ...action, params: { ...action.params, level: e.target.value } })}
            className="bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-indigo-500/50"
          >
            {ALL_THREAT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}

        {/* Duration param for siren/strobe */}
        {(action.type === 'activate_siren' || action.type === 'activate_strobe') && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={300}
              value={action.params['duration'] ?? '30'}
              onChange={e => onChange({ ...action, params: { ...action.params, duration: e.target.value } })}
              className="w-16 bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-indigo-500/50"
            />
            <span className="text-[10px] text-slate-600">sec</span>
          </div>
        )}

        {/* Message param for notifications */}
        {action.type === 'send_notification' && (
          <input
            type="text"
            placeholder="notification message"
            value={action.params['message'] ?? ''}
            onChange={e => onChange({ ...action, params: { ...action.params, message: e.target.value } })}
            className="flex-1 min-w-[160px] bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-700 outline-none focus:border-indigo-500/50"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-slate-700 hover:text-red-400 transition-colors mt-0.5 shrink-0"
        title="Remove action"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── Rule editor modal ─────────────────────────────────────────────────────────

function RuleModal({
  rule,
  onSave,
  onClose,
}: {
  rule: ResponseRule
  onSave: (r: ResponseRule) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ResponseRule>(rule)
  const doors  = useStore(s => s.doors)
  const zones  = useStore(s => s.zones)
  const sites  = useStore(s => s.sites)

  function update(patch: Partial<ResponseRule>) {
    setDraft(d => ({ ...d, ...patch }))
  }
  function updateConditions(patch: Partial<ResponseRule['conditions']>) {
    setDraft(d => ({ ...d, conditions: { ...d.conditions, ...patch } }))
  }
  function updateTrigger(patch: Partial<ResponseRule['trigger']>) {
    setDraft(d => ({ ...d, trigger: { ...d.trigger, ...patch } }))
  }
  function addAction() {
    setDraft(d => ({ ...d, actions: [...d.actions, emptyAction()] }))
  }
  function updateAction(i: number, a: ResponseAction) {
    setDraft(d => {
      const next = [...d.actions]
      next[i] = a
      return { ...d, actions: next }
    })
  }
  function removeAction(i: number) {
    setDraft(d => ({ ...d, actions: d.actions.filter((_, idx) => idx !== i) }))
  }

  const doorOpts = doors.map(d => ({ id: d.id, name: d.name }))
  const zoneOpts = zones.map(z => ({ id: z.id, name: z.name }))
  const siteOpts = sites.map(s => ({ id: s.id, name: s.name }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1320] border border-[#1e293b] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] shrink-0">
          <span className="text-sm font-semibold text-slate-200">
            {draft.id === rule.id && rule.name === 'New Rule' ? 'New Rule' : `Edit Rule — ${draft.name}`}
          </span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name + enabled + priority */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Rule Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={e => update({ name: e.target.value })}
                className="w-full bg-[#0b0e18] border border-[#1e293b] rounded px-3 py-1.5 text-[12px] text-slate-300 outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Priority</label>
              <input
                type="number"
                min={1}
                max={100}
                value={draft.priority}
                onChange={e => update({ priority: Number(e.target.value) })}
                className="w-16 bg-[#0b0e18] border border-[#1e293b] rounded px-2 py-1.5 text-[12px] text-slate-300 outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                id="rule-enabled"
                checked={draft.enabled}
                onChange={e => update({ enabled: e.target.checked })}
                className="accent-indigo-500"
              />
              <label htmlFor="rule-enabled" className="text-[11px] text-slate-400 select-none cursor-pointer">Enabled</label>
            </div>
          </div>

          {/* Trigger */}
          <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">WHEN (Trigger)</div>
            <ChipSelect
              label="Event Types"
              options={ALL_EVENT_TYPES}
              selected={draft.trigger.eventTypes}
              onChange={v => updateTrigger({ eventTypes: v })}
            />
            <ChipSelect
              label="Severities (optional — leave empty for all)"
              options={ALL_SEVERITIES}
              selected={draft.trigger.severities ?? []}
              onChange={v => updateTrigger({ severities: v })}
            />
          </div>

          {/* Conditions */}
          <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">AND (Conditions)</div>
            <ChipSelect
              label="Zone Types (empty = all)"
              options={ALL_ZONE_TYPES}
              selected={draft.conditions.zoneTypes ?? []}
              onChange={v => updateConditions({ zoneTypes: v.length > 0 ? v : undefined })}
            />
            <ChipSelect
              label="Arm States (empty = all)"
              options={ALL_ARM_STATES}
              selected={draft.conditions.armStates ?? []}
              onChange={v => updateConditions({ armStates: v.length > 0 ? v : undefined })}
            />
            <ChipSelect
              label="Threat Levels (empty = all)"
              options={ALL_THREAT_LEVELS}
              selected={draft.conditions.threatLevels ?? []}
              onChange={v => updateConditions({ threatLevels: v.length > 0 ? v : undefined })}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">THEN (Actions)</div>
              <button
                type="button"
                onClick={addAction}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={11} />
                Add Action
              </button>
            </div>
            {draft.actions.length === 0 && (
              <p className="text-[11px] text-slate-700">No actions yet. Add one above.</p>
            )}
            <div className="space-y-1.5">
              {draft.actions.map((action, i) => (
                <ActionEditor
                  key={i}
                  action={action}
                  index={i}
                  doors={doorOpts}
                  zones={zoneOpts}
                  sites={siteOpts}
                  onChange={a => updateAction(i, a)}
                  onRemove={() => removeAction(i)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#1e293b] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onSave(draft); onClose() }}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[11px] text-white font-medium transition-colors"
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Rule row component ────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: ResponseRule
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const triggerSummary = rule.trigger.eventTypes.slice(0, 2).join(', ') +
    (rule.trigger.eventTypes.length > 2 ? ` +${rule.trigger.eventTypes.length - 2}` : '')
  const actionSummary = rule.actions.slice(0, 2).map(a => a.type.replace(/_/g, ' ')).join(', ') +
    (rule.actions.length > 2 ? ` +${rule.actions.length - 2}` : '')

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#141828] hover:bg-white/[0.02] transition-colors group">
      {/* Enabled toggle */}
      <button
        onClick={onToggle}
        className={`w-7 h-4 rounded-full flex items-center transition-colors shrink-0 ${
          rule.enabled ? 'bg-indigo-600' : 'bg-[#1e293b]'
        }`}
        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
      >
        <span
          className={`w-3 h-3 rounded-full bg-white shadow transition-transform mx-0.5 ${
            rule.enabled ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </button>

      {/* Priority badge */}
      <div className="w-8 text-center">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1e293b] text-slate-400">
          P{rule.priority}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-slate-200 font-medium truncate">{rule.name}</div>
      </div>

      {/* Trigger summary */}
      <div className="w-48 shrink-0 hidden sm:block">
        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Trigger</div>
        <div className="text-[10px] text-slate-400 truncate">{triggerSummary || '—'}</div>
      </div>

      {/* Actions summary */}
      <div className="w-48 shrink-0 hidden md:block">
        <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">Actions</div>
        <div className="text-[10px] text-slate-400 truncate">{actionSummary || '—'}</div>
      </div>

      {/* Buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:bg-white/[0.04] transition-colors"
          title="Edit rule"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
          title="Delete rule"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Rules page ────────────────────────────────────────────────────────────────

export default function Rules() {
  const rules            = useStore(s => s.responseRules)
  const addRule          = useStore(s => s.addResponseRule)
  const updateRule       = useStore(s => s.updateResponseRule)
  const deleteRule       = useStore(s => s.deleteResponseRule)

  const [query, setQuery]         = useState('')
  const [editing, setEditing]     = useState<ResponseRule | null>(null)
  const [deleting, setDeleting]   = useState<ResponseRule | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return rules
      .filter(r =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.trigger.eventTypes.some(t => t.includes(q)) ||
        r.actions.some(a => a.type.includes(q))
      )
      .sort((a, b) => a.priority - b.priority)
  }, [rules, query])

  function handleSave(rule: ResponseRule) {
    if (rules.find(r => r.id === rule.id)) {
      updateRule(rule)
    } else {
      addRule(rule)
    }
  }

  function handleToggle(rule: ResponseRule) {
    updateRule({ ...rule, enabled: !rule.enabled })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#141828] shrink-0">
        <SearchBar value={query} onChange={setQuery} placeholder="Search rules..." />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-600">{filtered.length} rules</span>
          <button
            onClick={() => setEditing(emptyRule())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] text-white font-medium transition-colors"
          >
            <Plus size={12} />
            New Rule
          </button>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#141828] shrink-0">
        <div className="w-7 shrink-0" />
        <div className="w-8 shrink-0 text-[9px] uppercase tracking-wider text-slate-600">Pri</div>
        <div className="flex-1 text-[9px] uppercase tracking-wider text-slate-600">Rule Name</div>
        <div className="w-48 shrink-0 hidden sm:block text-[9px] uppercase tracking-wider text-slate-600">Trigger</div>
        <div className="w-48 shrink-0 hidden md:block text-[9px] uppercase tracking-wider text-slate-600">Actions</div>
        <div className="w-14 shrink-0" />
      </div>

      {/* Rule list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-[12px]">
            {query ? 'No rules match your search.' : 'No rules configured yet.'}
          </div>
        ) : (
          filtered.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onEdit={() => setEditing(rule)}
              onDelete={() => setDeleting(rule)}
              onToggle={() => handleToggle(rule)}
            />
          ))
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <RuleModal
          rule={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <ConfirmDialog
          open={true}
          title="Delete Rule"
          message={`Delete "${deleting.name}"? This cannot be undone.`}
          onConfirm={() => { deleteRule(deleting.id); setDeleting(null) }}
          onCancel={() => setDeleting(null)}
          variant="danger"
        />
      )}
    </div>
  )
}
