import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { NamedSchedule, TimeWindow, Holiday, DayOfWeek } from '../types'

interface Props {
  schedule?: NamedSchedule
  onClose: () => void
}

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function blankSchedule(): NamedSchedule {
  return { id: uuidv4(), name: '', timezone: 'Australia/Sydney', windows: [], holidays: [] }
}

function blankWindow(): TimeWindow {
  return { id: uuidv4(), days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '18:00' }
}

function blankHoliday(): Holiday {
  return { id: uuidv4(), name: '', month: 1, day: 1, behavior: 'deny_all', overrideGrantIds: [] }
}

type Tab = 'Basics' | 'Windows' | 'Holidays'
const TABS: Tab[] = ['Basics', 'Windows', 'Holidays']

export default function ScheduleModal({ schedule, onClose }: Props) {
  const grants         = useStore(s => s.grants)
  const addSchedule    = useStore(s => s.addSchedule)
  const updateSchedule = useStore(s => s.updateSchedule)

  const [draft, setDraft] = useState<NamedSchedule>(schedule ?? blankSchedule())
  const [tab, setTab]     = useState<Tab>('Basics')

  // ── Windows helpers ──────────────────────────────────────────────────────────

  function addWindow() {
    setDraft(d => ({ ...d, windows: [...d.windows, blankWindow()] }))
  }

  function removeWindow(id: string) {
    setDraft(d => ({ ...d, windows: d.windows.filter(w => w.id !== id) }))
  }

  function updateWindow(id: string, patch: Partial<TimeWindow>) {
    setDraft(d => ({ ...d, windows: d.windows.map(w => w.id === id ? { ...w, ...patch } : w) }))
  }

  function toggleDay(windowId: string, day: DayOfWeek) {
    const win = draft.windows.find(w => w.id === windowId)
    if (!win) return
    const days = win.days.includes(day) ? win.days.filter(d => d !== day) : [...win.days, day]
    updateWindow(windowId, { days })
  }

  // ── Holiday helpers ──────────────────────────────────────────────────────────

  function addHoliday() {
    setDraft(d => ({ ...d, holidays: [...d.holidays, blankHoliday()] }))
  }

  function removeHoliday(id: string) {
    setDraft(d => ({ ...d, holidays: d.holidays.filter(h => h.id !== id) }))
  }

  function updateHoliday(id: string, patch: Partial<Holiday>) {
    setDraft(d => ({ ...d, holidays: d.holidays.map(h => h.id === id ? { ...h, ...patch } : h) }))
  }

  function toggleOverrideGrant(holidayId: string, grantId: string) {
    const hol = draft.holidays.find(h => h.id === holidayId)
    if (!hol) return
    const ids = hol.overrideGrantIds.includes(grantId)
      ? hol.overrideGrantIds.filter(g => g !== grantId)
      : [...hol.overrideGrantIds, grantId]
    updateHoliday(holidayId, { overrideGrantIds: ids })
  }

  function save() {
    if (!draft.name.trim()) return
    if (schedule) updateSchedule(draft)
    else addSchedule(draft)
    onClose()
  }

  const inputCls = 'bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  return (
    <Modal title={schedule ? `Edit Schedule — ${schedule.name}` : 'New Schedule'} onClose={onClose} onSave={save} size="lg">
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
              <input className={inputCls + ' w-full'} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Schedule name" />
            </div>
            <div>
              <label className={labelCls}>Timezone (IANA)</label>
              <input className={inputCls + ' w-full'} value={draft.timezone} onChange={e => setDraft(d => ({ ...d, timezone: e.target.value }))} placeholder="e.g. Australia/Sydney" />
            </div>
          </>
        )}

        {tab === 'Windows' && (
          <div className="space-y-3">
            {draft.windows.map(win => (
              <div key={win.id} className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 space-y-3">
                {/* Day toggles */}
                <div className="flex gap-1">
                  {ALL_DAYS.map(day => (
                    <button key={day} onClick={() => toggleDay(win.id, day)}
                      className={`flex-1 py-1 rounded text-[9px] font-semibold transition-colors ${
                        win.days.includes(day) ? 'bg-teal-600 text-teal-950' : 'bg-[#0b0e18] text-slate-600 hover:text-slate-400 border border-[#1e293b]'
                      }`}>
                      {day}
                    </button>
                  ))}
                </div>
                {/* Time range */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Start</label>
                    <input type="time" className={inputCls + ' w-full'} value={win.startTime}
                      onChange={e => updateWindow(win.id, { startTime: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>End</label>
                    <input type="time" className={inputCls + ' w-full'} value={win.endTime}
                      onChange={e => updateWindow(win.id, { endTime: e.target.value })} />
                  </div>
                  <button onClick={() => removeWindow(win.id)} className="text-slate-600 hover:text-red-400 text-sm mt-4 transition-colors">✕</button>
                </div>
              </div>
            ))}
            <button onClick={addWindow}
              className="w-full border border-dashed border-[#1e293b] rounded-lg py-2 text-[10px] text-slate-600 hover:text-slate-400 hover:border-[#2d3148] transition-colors">
              + Add window
            </button>
          </div>
        )}

        {tab === 'Holidays' && (
          <div className="space-y-3">
            {draft.holidays.map(h => (
              <div key={h.id} className="bg-[#111827] border border-[#1e293b] rounded-lg p-3 space-y-3">
                <div className="flex gap-2">
                  <input className={inputCls + ' flex-1'} value={h.name} onChange={e => updateHoliday(h.id, { name: e.target.value })} placeholder="Holiday name" />
                  <input type="number" min={1} max={12} className={inputCls + ' w-16'} value={h.month}
                    onChange={e => updateHoliday(h.id, { month: Number(e.target.value) })} placeholder="MM" />
                  <input type="number" min={1} max={31} className={inputCls + ' w-16'} value={h.day}
                    onChange={e => updateHoliday(h.id, { day: Number(e.target.value) })} placeholder="DD" />
                  <button onClick={() => removeHoliday(h.id)} className="text-slate-600 hover:text-red-400 text-sm transition-colors">✕</button>
                </div>
                {/* Behavior */}
                <div className="flex gap-1">
                  {(['deny_all', 'allow_with_override', 'normal'] as const).map(b => (
                    <button key={b} onClick={() => updateHoliday(h.id, { behavior: b })}
                      className={`flex-1 py-1 rounded text-[9px] font-semibold transition-colors ${
                        h.behavior === b ? 'bg-indigo-600 text-white' : 'bg-[#0b0e18] text-slate-600 hover:text-slate-400 border border-[#1e293b]'
                      }`}>
                      {b === 'deny_all' ? 'Deny All' : b === 'allow_with_override' ? 'Override' : 'Normal'}
                    </button>
                  ))}
                </div>
                {/* Override settings — shown only when behavior is allow_with_override */}
                {h.behavior === 'allow_with_override' && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className={labelCls}>Required Clearance</label>
                      <input type="number" min={1} max={5} className={inputCls + ' w-24'}
                        value={h.requiredClearance ?? ''}
                        onChange={e => updateHoliday(h.id, { requiredClearance: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="L1-L5" />
                    </div>
                    <div>
                      <label className={labelCls}>Override Grants</label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {grants.map(g => (
                          <label key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#0b0e18] cursor-pointer">
                            <input type="checkbox" checked={h.overrideGrantIds.includes(g.id)}
                              onChange={() => toggleOverrideGrant(h.id, g.id)} className="accent-indigo-500" />
                            <span className="text-[10px] text-slate-400">{g.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addHoliday}
              className="w-full border border-dashed border-[#1e293b] rounded-lg py-2 text-[10px] text-slate-600 hover:text-slate-400 hover:border-[#2d3148] transition-colors">
              + Add holiday
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
