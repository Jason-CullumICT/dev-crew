import { useStore } from '../store/store';

interface SchedulePickerProps {
  value: string | undefined;
  onChange: (scheduleId: string | undefined) => void;
  className?: string;
}

export default function SchedulePicker({ value, onChange, className }: SchedulePickerProps) {
  const schedules = useStore(s => s.schedules);

  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 appearance-none pr-8"
      >
        <option value="">No schedule (always active)</option>
        {schedules.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {/* Colour dot for selected schedule */}
      {value && (() => {
        const sched = schedules.find(s => s.id === value);
        return sched ? (
          <span
            className="absolute right-8 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
            style={{ backgroundColor: sched.color }}
            aria-hidden="true"
          />
        ) : null;
      })()}
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▾</span>
    </div>
  );
}
