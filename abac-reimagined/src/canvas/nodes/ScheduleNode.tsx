import type { NamedSchedule } from '../../types'

interface Props {
  schedule: NamedSchedule
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
}

export default function ScheduleNode({ schedule, selected, highlighted, dimmed, onClick }: Props) {
  const windowSummary = schedule.windows
    .map(w => `${w.days.length === 7 ? 'Every day' : w.days.join('/')} ${w.startTime}–${w.endTime}`)
    .join(', ')

  const denyHolidays = schedule.holidays.filter(h => h.behavior === 'deny_all')
  const overrideHolidays = schedule.holidays.filter(h => h.behavior === 'allow_with_override')

  return (
    <div
      onClick={onClick}
      style={{ opacity: dimmed ? 0.2 : 1 }}
      className={`absolute rounded-[10px] cursor-pointer transition-all select-none min-w-[140px] px-3.5 py-3 ${
        selected
          ? 'bg-[#07100e] border-2 border-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.12)]'
          : highlighted
            ? 'bg-[#07100e] border-2 border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.2)]'
            : 'bg-[#07100e] border border-[#134e4a] hover:shadow-[0_0_0_2px_rgba(20,184,166,0.25)]'
      }`}
    >
      <div className="text-[11px] font-semibold text-teal-300">{schedule.name}</div>
      <div className="text-[9px] text-teal-900 mt-0.5 leading-relaxed">{windowSummary}</div>
      {denyHolidays.length > 0 && (
        <div className="text-[8px] text-teal-900 mt-1.5">
          ✕ {denyHolidays.map(h => h.name).join(', ')}
        </div>
      )}
      {overrideHolidays.length > 0 && (
        <div className="text-[8px] text-teal-700 mt-0.5">
          ⚠ {overrideHolidays.map(h => h.name).join(', ')}
        </div>
      )}

      {selected && (
        <div className="mt-2 pt-2 border-t border-[#134e4a]/40 space-y-1">
          <div className="text-[8px] text-teal-900 uppercase tracking-wide">Timezone</div>
          <div className="text-[9px] text-teal-700">{schedule.timezone}</div>
          {schedule.windows.length > 0 && (
            <div>
              <div className="text-[8px] text-teal-900 uppercase tracking-wide mt-1 mb-0.5">{schedule.windows.length} window{schedule.windows.length !== 1 ? 's' : ''}</div>
              {schedule.windows.map((w, i) => (
                <div key={i} className="text-[9px] text-teal-800">{w.days.join('/')} {w.startTime}–{w.endTime}</div>
              ))}
            </div>
          )}
          {schedule.holidays.length > 0 && (
            <div className="text-[8px] text-teal-900 mt-1">{schedule.holidays.length} holiday rule{schedule.holidays.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
