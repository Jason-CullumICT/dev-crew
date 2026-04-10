import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import ScheduleModal from '../modals/ScheduleModal'
import { buildNowContext } from '../engine/scheduleEngine'
import type { NamedSchedule, DayOfWeek } from '../types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Schedules() {
  const schedules      = useStore(s => s.schedules)
  const grants         = useStore(s => s.grants)
  const deleteSchedule = useStore(s => s.deleteSchedule)
  const now            = buildNowContext()

  const [editing, setEditing] = useState<NamedSchedule | null | 'new'>(null)

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Schedules</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{schedules.length} schedules</span>
          <button onClick={() => setEditing('new')} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors">+ New</button>
        </div>
      </div>

      <div className="grid gap-4">
        {schedules.map(schedule => {
          const usedBy = grants.filter(g => g.scheduleId === schedule.id)
          return (
            <div key={schedule.id} className="bg-[#07100e] border border-[#134e4a] rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-teal-200">{schedule.name}</div>
                  <div className="text-[10px] text-teal-900 mt-0.5">{schedule.timezone}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {usedBy.length > 0 && <div className="text-[9px] text-teal-900">{usedBy.length} grant{usedBy.length !== 1 ? 's' : ''}</div>}
                  <button onClick={() => setEditing(schedule)} aria-label="Edit" className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteSchedule(schedule.id)} aria-label="Delete" className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-wider text-[#134e4a] font-semibold mb-2">Time Windows</div>
                <div className="grid grid-cols-7 gap-px">
                  {DAYS.map(day => {
                    const active = schedule.windows.some(w => w.days.includes(day))
                    const isToday = day === now.dayOfWeek
                    return (
                      <div key={day} className={`text-center py-1.5 rounded text-[9px] font-semibold ${
                        active ? isToday ? 'bg-teal-500 text-teal-950' : 'bg-teal-500/20 text-teal-400'
                        : 'bg-[#0b0e18] text-[#134e4a]'
                      }`}>{day}</div>
                    )
                  })}
                </div>
                {schedule.windows.map(w => (
                  <div key={w.id} className="text-[10px] text-teal-800 mt-1.5">
                    {w.days.join(', ')} · {w.startTime}–{w.endTime}
                  </div>
                ))}
              </div>

              {schedule.holidays.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#134e4a] font-semibold mb-2">Holidays</div>
                  <div className="space-y-1.5">
                    {schedule.holidays.map(h => (
                      <div key={h.id} className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          h.behavior === 'deny_all' ? 'bg-red-500/10 text-red-400' :
                          h.behavior === 'allow_with_override' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {h.behavior === 'deny_all' ? 'DENY ALL' : h.behavior === 'allow_with_override' ? 'OVERRIDE' : 'NORMAL'}
                        </span>
                        <span className="text-[10px] text-slate-400">{h.name}</span>
                        <span className="text-[9px] text-slate-600">{h.month}/{h.day}</span>
                        {h.requiredClearance && <span className="text-[9px] text-amber-600">L{h.requiredClearance}+</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {usedBy.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {usedBy.map(g => (
                    <span key={g.id} className="text-[9px] bg-[#0c0a1e] border border-[#2e1f6b] text-violet-400 px-1.5 py-0.5 rounded">{g.name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <ScheduleModal schedule={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
