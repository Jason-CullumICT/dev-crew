import { useState } from 'react'
import { useStore } from '../store/store'
import type { Alarm } from '../types'

interface Props {
  alarm: Alarm
  compact?: boolean
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-red-500/40',
  warning:  'border-amber-500/40',
  info:     'border-blue-500/40',
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const STATE_BADGE: Record<string, string> = {
  active:       'bg-red-500/10 text-red-300 border-red-500/20',
  acknowledged: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  escalated:    'bg-violet-500/10 text-violet-300 border-violet-500/20',
  cleared:      'bg-slate-500/10 text-slate-500 border-slate-500/20',
}

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export default function AlarmCard({ alarm, compact = false }: Props) {
  const acknowledgeAlarm = useStore(s => s.acknowledgeAlarm)
  const escalateAlarm    = useStore(s => s.escalateAlarm)
  const clearAlarm       = useStore(s => s.clearAlarm)
  const addAlarmNote     = useStore(s => s.addAlarmNote)
  const sites            = useStore(s => s.sites)

  const [noteInput, setNoteInput] = useState('')

  const borderClass = SEVERITY_BORDER[alarm.severity] ?? 'border-slate-500/40'
  const severityBadge = SEVERITY_BADGE[alarm.severity] ?? ''
  const stateBadge    = STATE_BADGE[alarm.state] ?? ''
  const siteName = sites.find(s => s.id === alarm.siteId)?.name ?? alarm.siteId
  const isCleared = alarm.state === 'cleared'
  const showActions = !compact && !isCleared

  function handleNote() {
    if (!noteInput.trim()) return
    addAlarmNote(alarm.id, noteInput.trim())
    setNoteInput('')
  }

  return (
    <div className={`bg-[#0f1320] border ${borderClass} rounded-xl p-3 space-y-2`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-200 leading-tight">{alarm.title}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityBadge}`}>
            {alarm.severity}
          </span>
          <span className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${stateBadge}`}>
            {alarm.state}
          </span>
        </div>
      </div>

      {/* Site + time */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1e293b] text-slate-500">{siteName}</span>
        <span className="text-[9px] text-slate-600">{relativeTime(alarm.acknowledgedAt ?? alarm.escalatedAt ?? alarm.clearedAt ?? new Date().toISOString())}</span>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center gap-1.5 pt-0.5">
          {alarm.state === 'active' && (
            <button
              onClick={() => acknowledgeAlarm(alarm.id, 'soc-operator')}
              className="text-[9px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors font-semibold"
            >
              ACK
            </button>
          )}
          {(alarm.state === 'active' || alarm.state === 'acknowledged') && (
            <button
              onClick={() => escalateAlarm(alarm.id)}
              className="text-[9px] px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors font-semibold"
            >
              Escalate
            </button>
          )}
          <button
            onClick={() => clearAlarm(alarm.id)}
            className="text-[9px] px-2 py-1 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-colors font-semibold"
          >
            Clear
          </button>
        </div>
      )}

      {/* Notes section — full mode only */}
      {!compact && (
        <div className="space-y-1">
          {alarm.notes.map((note, i) => (
            <div key={i} className="text-[9px] text-slate-500 pl-2 border-l border-[#1e293b]">
              {note}
            </div>
          ))}
          {!isCleared && (
            <div className="flex gap-1 pt-0.5">
              <input
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNote() }}
                placeholder="Add note..."
                className="flex-1 text-[9px] bg-[#0b0f1a] border border-[#1e293b] text-slate-400 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 placeholder-slate-700"
              />
              <button
                onClick={handleNote}
                className="text-[9px] px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
