import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TimeWindow } from '../types';
import { CHIP_COLORS } from '../lib/chipUtils';

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PRESETS: { label: string; days: string[]; startTime: string; endTime: string }[] = [
  { label: 'Business Hours (Mon–Fri 08–18)', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' },
  { label: 'Evening (Mon–Fri 18:00–22:00)',  days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '18:00', endTime: '22:00' },
  { label: 'Weekend',                         days: ['Sat','Sun'],                  startTime: '00:00', endTime: '23:59' },
  { label: 'Always (24/7)',                   days: [],                             startTime: '00:00', endTime: '23:59' },
];

interface TimeWindowChipsProps {
  windows: TimeWindow[];
  onChange: (windows: TimeWindow[]) => void;
}

function chipLabel(tw: TimeWindow): string {
  // Only show "Always (24/7)" when there are no day restrictions AND no time restriction
  if (tw.days.length === 0 && tw.startTime === '00:00' && tw.endTime === '23:59') {
    return 'Always (24/7)';
  }
  const dayPart = tw.days.length === 0 ? 'Every day' : tw.days.join('–');
  // Show times unless they span the full day
  const timePart = tw.startTime === '00:00' && tw.endTime === '23:59'
    ? 'all hours'
    : `${tw.startTime}–${tw.endTime}`;
  return `${dayPart} ${timePart}`;
}

export default function TimeWindowChips({ windows, onChange }: TimeWindowChipsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [draft, setDraft] = useState<Omit<TimeWindow, 'id'>>({ days: [], startTime: '08:00', endTime: '18:00' });
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        closePicker();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [pickerOpen]);

  function closePicker() {
    setPickerOpen(false);
    setCustomMode(false);
    setDraft({ days: [], startTime: '08:00', endTime: '18:00' });
  }

  function removeWindow(id: string) {
    onChange(windows.filter(w => w.id !== id));
  }

  function addPreset(preset: typeof PRESETS[0]) {
    // Deduplicates by exact match of days+startTime+endTime — this correctly blocks
    // re-adding an identical window regardless of whether it came from a preset or custom entry
    const already = windows.some(
      w => w.days.join(',') === preset.days.join(',') && w.startTime === preset.startTime && w.endTime === preset.endTime
    );
    if (!already) {
      onChange([...windows, { id: uuidv4(), ...preset }]);
    }
    closePicker();
  }

  function addCustom() {
    // days: [] means "every day" (no restriction) — this is intentional and valid
    if (draft.endTime <= draft.startTime) return; // guarded by UI validation
    onChange([...windows, { id: uuidv4(), ...draft }]);
    closePicker();
  }

  function toggleDay(day: string) {
    setDraft(d => ({
      ...d,
      days: d.days.includes(day) ? d.days.filter(x => x !== day) : [...d.days, day],
    }));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {windows.map(tw => (
        <span
          key={tw.id}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${CHIP_COLORS.time}`}
        >
          {chipLabel(tw)}
          <button
            type="button"
            onClick={() => removeWindow(tw.id)}
            className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
            aria-label={`Remove ${chipLabel(tw)}`}
          >
            ×
          </button>
        </span>
      ))}

      <div className="relative" ref={pickerRef}>
        {!pickerOpen && windows.length < 1 && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors px-1"
          >
            + add time window
          </button>
        )}

        {/* Preset list */}
        {pickerOpen && !customMode && (
          <div className="absolute left-0 top-6 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 py-1">
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => addPreset(p)}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-slate-700 transition-colors"
              >
                Custom...
              </button>
              <button
                type="button"
                onClick={closePicker}
                className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Custom picker */}
        {pickerOpen && customMode && (
          <div className="absolute left-0 top-6 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-64 p-3 space-y-3">
            <p className="text-xs text-slate-400 font-medium">Custom time window</p>

            <div>
              <p className="text-xs text-slate-500 mb-1">Days</p>
              <div className="flex flex-wrap gap-1">
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      draft.days.includes(day)
                        ? 'bg-amber-800 text-amber-200'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Start</p>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={e => setDraft(d => ({ ...d, startTime: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">End</p>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={e => setDraft(d => ({ ...d, endTime: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {draft.endTime <= draft.startTime && (
              <p className="text-xs text-red-400">End time must be after start time</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addCustom}
                disabled={draft.endTime <= draft.startTime}
                className="flex-1 px-2 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
              >
                ← back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
