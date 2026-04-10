import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import type { NamedSchedule } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isActiveNow(s: NamedSchedule): boolean {
  const now = new Date();
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  if (s.daysOfWeek.length > 0 && !s.daysOfWeek.includes(day)) return false;
  if (s.validUntil && now > new Date(s.validUntil)) return false;
  if (s.validFrom && now < new Date(s.validFrom)) return false;
  const [sh, sm] = s.startTime.split(':').map(Number);
  const [eh, em] = s.endTime.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (startMins < endMins) return nowMins >= startMins && nowMins < endMins;
  return nowMins >= startMins || nowMins < endMins; // overnight
}

function isExpiringSoon(s: NamedSchedule): boolean {
  if (!s.validUntil) return false;
  const until = new Date(s.validUntil);
  const diff = until.getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
}

function timeToPercent(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
}

// ── Timeline band for a schedule row ─────────────────────────────────────────

function TimelineBand({ schedule, isActive }: { schedule: NamedSchedule; isActive: boolean }) {
  const startPct = timeToPercent(schedule.startTime);
  const endPct = timeToPercent(schedule.endTime);
  const isOvernight = endPct <= startPct;

  const bandStyle = (left: number, width: number) => ({
    left: `${left}%`,
    width: `${width}%`,
    backgroundColor: `${schedule.color}33`,
    borderColor: `${schedule.color}${isActive ? 'cc' : '55'}`,
    color: schedule.color,
  });

  if (isOvernight) {
    // Two bands: start→midnight and midnight→end
    const rightWidth = 100 - startPct;
    const leftWidth = endPct;
    return (
      <>
        {rightWidth > 0.5 && (
          <div
            className="absolute top-1 bottom-1 border rounded text-[9px] font-semibold flex items-center justify-center overflow-hidden px-1"
            style={bandStyle(startPct, rightWidth)}
            title={`${schedule.name} (${schedule.startTime}–midnight)`}
          >
            <span className="truncate">{schedule.name}</span>
          </div>
        )}
        {leftWidth > 0.5 && (
          <div
            className="absolute top-1 bottom-1 border rounded text-[9px] font-semibold flex items-center justify-center overflow-hidden px-1"
            style={bandStyle(0, leftWidth)}
            title={`${schedule.name} (midnight–${schedule.endTime})`}
          >
            <span className="truncate">{schedule.name}</span>
          </div>
        )}
      </>
    );
  }

  const width = endPct - startPct;
  return (
    <div
      className="absolute top-1 bottom-1 border rounded text-[9px] font-semibold flex items-center justify-center overflow-hidden px-1"
      style={bandStyle(startPct, width)}
      title={`${schedule.name} (${schedule.startTime}–${schedule.endTime})`}
    >
      <span className="truncate">{schedule.name}</span>
    </div>
  );
}

// ── Hours ruler ───────────────────────────────────────────────────────────────

function HoursRuler({ currentHour }: { currentHour: number }) {
  return (
    <div className="flex border-b border-[#0f172a] shrink-0" style={{ height: 28 }}>
      <div className="w-[220px] shrink-0 border-r border-[#0f172a]" />
      <div className="flex-1 relative flex">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className={`flex-1 text-[10px] px-0.5 border-r border-[#0f172a] flex items-center ${
              i === currentHour ? 'text-[#60a5fa] font-bold' : 'text-slate-600'
            }`}
          >
            {String(i).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Now line ──────────────────────────────────────────────────────────────────

function NowLine({ pct }: { pct: number }) {
  return (
    <div
      className="absolute top-0 bottom-0 w-[2px] bg-[#3b82f6] z-20 pointer-events-none"
      style={{ left: `${pct}%` }}
      aria-label="Current time"
    />
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center border-b border-[#0f172a]" style={{ minHeight: 22 }}>
      <div className="w-[220px] shrink-0 border-r border-[#0f172a] px-3 flex items-center">
        <span className="text-[9px] uppercase tracking-widest text-[#334155] font-bold">{label}</span>
      </div>
      <div className="flex-1 h-px bg-[#0f172a]" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Schedules() {
  const schedules = useStore(s => s.schedules);
  const groups = useStore(s => s.groups);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowPct = (currentHour * 60 + currentMinute) / (24 * 60) * 100;

  const groupsWithSchedule = groups.filter(g => g.scheduleId);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[now.getDay()];
  const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  const activeSchedules = schedules.filter(isActiveNow);
  const inactiveSchedules = schedules.filter(s => !isActiveNow(s));

  return (
    <div className="flex flex-col h-full bg-[#080c14] text-slate-300 overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-[#0f172a] shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Schedules</h1>
          <p className="text-xs text-slate-500 mt-0.5">Named time windows — click to select, view group links below</p>
        </div>
        <button
          className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors"
          onClick={() => {/* future: open add schedule modal */}}
        >
          + New Schedule
        </button>
      </div>

      {/* Main layout: sidebar + timeline */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 bg-[#060a10] border-r border-[#0f172a] flex flex-col overflow-y-auto">
          <div className="flex-1 divide-y divide-[#0f172a]">
            {schedules.length === 0 && (
              <p className="text-slate-600 text-xs p-4 italic">No schedules defined.</p>
            )}
            {schedules.map(s => {
              const active = isActiveNow(s);
              const expiring = isExpiringSoon(s);
              const isSelected = selectedId === s.id;
              return (
                <button
                  key={s.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(isSelected ? null : s.id)}
                  className={`w-full text-left flex items-start gap-2 px-3 py-3 transition-colors ${
                    isSelected ? 'bg-[#0f1a2e] border-l-2' : 'hover:bg-[#0a1020] border-l-2 border-transparent'
                  }`}
                  style={isSelected ? { borderLeftColor: s.color } : {}}
                >
                  <div className="w-2.5 shrink-0 self-stretch rounded-sm mt-0.5" style={{ backgroundColor: s.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200 truncate">{s.name}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          active ? 'bg-green-400 animate-pulse' : expiring ? 'bg-amber-400' : 'bg-slate-600'
                        }`}
                        title={active ? 'Active now' : expiring ? 'Expiring soon' : 'Inactive'}
                        aria-label={active ? 'Active' : expiring ? 'Expiring soon' : 'Inactive'}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {s.startTime}–{s.endTime}
                    </p>
                    <p className="text-[10px] text-slate-600 truncate">
                      {s.daysOfWeek.length === 7 ? 'Every day' : s.daysOfWeek.join(', ')}
                    </p>
                    {s.validUntil && (
                      <p className="text-[10px] text-amber-500 mt-0.5">Until {s.validUntil}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Timeline area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky ruler */}
          <div className="shrink-0 sticky top-0 z-10 bg-[#060a10]">
            <HoursRuler currentHour={currentHour} />
          </div>

          {/* Scrollable rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <SectionDivider label="Schedules (time windows)" />

            {schedules.length === 0 && (
              <div className="px-6 py-6 text-slate-600 text-sm italic">No schedules. Create one to get started.</div>
            )}

            {schedules.map(s => {
              const active = isActiveNow(s);
              const isSelected = selectedId === s.id;
              return (
                <div
                  key={s.id}
                  className={`flex border-b border-[#0f172a] transition-colors ${
                    isSelected ? 'bg-[#0a1420]' : 'hover:bg-[#060e18]'
                  }`}
                  style={{ minHeight: 44 }}
                >
                  {/* Row label */}
                  <div className="w-[220px] shrink-0 border-r border-[#0f172a] px-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-300 truncate">{s.name}</span>
                    {active && (
                      <span className="text-[9px] text-green-400 font-medium ml-auto shrink-0">Active</span>
                    )}
                  </div>

                  {/* Timeline bands */}
                  <div className="flex-1 relative">
                    {/* Hour grid */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 border-r border-[#0f172a]/40" />
                      ))}
                    </div>
                    <NowLine pct={nowPct} />
                    <TimelineBand schedule={s} isActive={active} />
                  </div>
                </div>
              );
            })}

            {groupsWithSchedule.length > 0 && (
              <>
                <SectionDivider label="Groups (when members auto-enrol)" />
                {groupsWithSchedule.map(g => {
                  const linkedSched = schedules.find(s => s.id === g.scheduleId);
                  if (!linkedSched) return null;
                  const active = isActiveNow(linkedSched);
                  return (
                    <div
                      key={g.id}
                      className="flex border-b border-[#0f172a] hover:bg-[#060e18] transition-colors"
                      style={{ minHeight: 44 }}
                    >
                      <div className="w-[220px] shrink-0 border-r border-[#0f172a] px-3 flex flex-col justify-center gap-0.5">
                        <span className="text-xs text-slate-300 truncate">{g.name}</span>
                        <span className="text-[10px] text-slate-600 truncate">via {linkedSched.name}</span>
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: 24 }, (_, i) => (
                            <div key={i} className="flex-1 border-r border-[#0f172a]/40" />
                          ))}
                        </div>
                        <NowLine pct={nowPct} />
                        <TimelineBand schedule={linkedSched} isActive={active} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#0f172a] bg-[#060a10] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500">
            Now: <span className="text-slate-300 font-mono">{currentDay} {timeStr}</span>
          </span>
          {activeSchedules.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeSchedules.map(s => (
                <span
                  key={s.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: `${s.color}22`, color: s.color, border: `1px solid ${s.color}55` }}
                >
                  <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: s.color }} />
                  Active
                </span>
              ))}
            </div>
          )}
          {inactiveSchedules.slice(0, 3).map(s => (
            <span
              key={s.id}
              className="text-[11px] text-slate-600 px-2 py-0.5 bg-[#0f172a] rounded-full"
            >
              Inactive — {s.name} starts {s.startTime}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-600 mr-1">Jump to:</span>
          <button className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-[#0f172a] rounded transition-colors">Today 00:00</button>
          <button className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-[#0f172a] rounded transition-colors">Tomorrow</button>
          <button className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-[#0f172a] rounded transition-colors">Weekend</button>
        </div>
      </div>
    </div>
  );
}
