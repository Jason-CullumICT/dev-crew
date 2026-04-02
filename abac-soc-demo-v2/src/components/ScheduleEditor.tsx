import { useState } from 'react';
import type { Schedule } from '../types';

interface ScheduleEditorProps {
  schedule: Schedule | null;
  onChange: (schedule: Schedule | null) => void;
  defaultTimezone?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SCHEDULE: Schedule = {
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '08:00',
  endTime: '18:00',
  timezone: 'Australia/Sydney',
};

export default function ScheduleEditor({ schedule, onChange, defaultTimezone }: ScheduleEditorProps) {
  const [showDateRange, setShowDateRange] = useState(
    !!(schedule?.validFrom || schedule?.validUntil),
  );

  const enabled = schedule !== null;

  function handleEnable(checked: boolean) {
    if (checked) {
      onChange({ ...DEFAULT_SCHEDULE, timezone: defaultTimezone ?? DEFAULT_SCHEDULE.timezone });
    } else {
      onChange(null);
    }
  }

  function update(patch: Partial<Schedule>) {
    if (!schedule) return;
    onChange({ ...schedule, ...patch });
  }

  function toggleDay(dayNum: number) {
    if (!schedule) return;
    const current = schedule.daysOfWeek;
    const next = current.includes(dayNum)
      ? current.filter((d) => d !== dayNum)
      : [...current, dayNum].sort();
    update({ daysOfWeek: next });
  }

  return (
    <div className="space-y-3">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          role="switch"
          aria-checked={enabled}
          onClick={() => handleEnable(!enabled)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            enabled ? 'bg-teal-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
        <span className="text-xs font-medium text-slate-300">
          {enabled ? 'Time-restricted' : 'No time restriction'}
        </span>
      </label>

      {enabled && schedule && (
        <div className="space-y-3 pl-3 border-l-2 border-slate-700">
          {/* Day of week pills */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Days of week</p>
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((label, idx) => {
                const active = schedule.daysOfWeek.includes(idx);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      active
                        ? 'bg-teal-700 border-teal-500 text-teal-100'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              {schedule.daysOfWeek.length === 0 && (
                <span className="text-xs text-slate-500 italic ml-1">All days</span>
              )}
            </div>
          </div>

          {/* Time range */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Time window (24h)</p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => update({ startTime: e.target.value })}
                className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => update({ endTime: e.target.value })}
                className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Timezone (IANA)</p>
            <input
              type="text"
              value={schedule.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
              placeholder="e.g. Australia/Sydney"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Date range (optional) */}
          {!showDateRange ? (
            <button
              type="button"
              onClick={() => setShowDateRange(true)}
              className="text-xs text-slate-400 hover:text-teal-400 transition-colors underline underline-offset-2"
            >
              + Add date range
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-slate-400">Date range (optional)</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDateRange(false);
                    update({ validFrom: undefined, validUntil: undefined });
                  }}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={schedule.validFrom ?? ''}
                  onChange={(e) => update({ validFrom: e.target.value || undefined })}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-slate-500 text-xs">to</span>
                <input
                  type="date"
                  value={schedule.validUntil ?? ''}
                  onChange={(e) => update({ validUntil: e.target.value || undefined })}
                  className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
