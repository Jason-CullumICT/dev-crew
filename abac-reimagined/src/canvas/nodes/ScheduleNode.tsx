import type { NamedSchedule } from '../../types'

interface Props {
  schedule: NamedSchedule
  selected: boolean
  highlighted?: boolean
  dimmed?: boolean
  onClick: () => void
  onDoubleClick?: () => void
}

function summariseWindow(window: NamedSchedule['windows'][0]): string {
  const days = window.days
  if (days.length === 7) return `Every day ${window.startTime}–${window.endTime}`
  if (days.length === 5 && days.includes('Mon') && days.includes('Fri') && !days.includes('Sat') && !days.includes('Sun')) {
    return `Mon-Fri ${window.startTime}–${window.endTime}`
  }
  return `${days.join('/')} ${window.startTime}–${window.endTime}`
}

export default function ScheduleNode({ schedule, selected, highlighted, dimmed, onClick, onDoubleClick }: Props) {
  const firstWindow = schedule.windows[0]
  const secondaryLabel = firstWindow ? summariseWindow(firstWindow) : `${schedule.windows.length} windows`

  return (
    <div
      onClick={onClick}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.() }}
      style={{ opacity: dimmed ? 0.2 : 1 }}
      className={`absolute rounded-lg cursor-pointer transition-all select-none min-w-[140px] pl-3.5 pr-3.5 py-3 border-l-4 border-teal-500 ${
        selected
          ? 'bg-[#07100e] shadow-[0_0_0_4px_rgba(20,184,166,0.12)] ring-1 ring-teal-500/60'
          : highlighted
            ? 'bg-[#07100e] ring-1 ring-teal-400/60 shadow-[0_0_0_3px_rgba(20,184,166,0.2)]'
            : 'bg-[#07100e] hover:shadow-[0_0_0_2px_rgba(20,184,166,0.25)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Schedule icon: clock face */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <circle cx="8" cy="8" r="6" stroke="#14b8a6" strokeWidth="1.2"/>
          <line x1="8" y1="8" x2="8" y2="4.5" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="8" y1="8" x2="10.5" y2="9.5" stroke="#14b8a6" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-slate-100 truncate">{schedule.name}</div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{secondaryLabel}</div>
        </div>
      </div>

      {selected && (
        <div className="mt-2 pt-2 border-t border-[#134e4a]/40 space-y-1.5">
          <div className="text-[9px] text-slate-500">{schedule.timezone}</div>
          {schedule.windows.length > 0 && (
            <div>
              <div className="text-[9px] text-slate-500 mb-0.5">{schedule.windows.length} window{schedule.windows.length !== 1 ? 's' : ''}</div>
              {schedule.windows.map((w, i) => (
                <div key={i} className="text-[9px] text-teal-700">{w.days.join('/')} {w.startTime}–{w.endTime}</div>
              ))}
            </div>
          )}
          {schedule.holidays.length > 0 && (
            <div className="text-[9px] text-slate-500">{schedule.holidays.length} holiday rule{schedule.holidays.length !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
