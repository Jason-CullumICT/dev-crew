import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Policy, ConditionChip, TimeWindow, Door } from '../types';
import ConditionChips from '../components/ConditionChips';
import TimeWindowChips from '../components/TimeWindowChips';
import SchedulePicker from '../components/SchedulePicker';
import {
  chipToRule,
  timeWindowToRules,
  rulesToConditionChips,
  rulesToTimeWindows,
  CHIP_COLORS,
} from '../lib/chipUtils';

// ── Lane display component ───────────────────────────────────────────────────

interface LaneProps {
  color: string;
  label: string;
  accentClass: string;
  children: React.ReactNode;
}

function Lane({ color, label, accentClass, children }: LaneProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-0.5 self-stretch rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${accentClass}`}>{label}</p>
        <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
      </div>
    </div>
  );
}

// ── Policy card ──────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  doors,
  groups,
  onEdit,
  onDelete,
}: {
  policy: Policy;
  doors: Door[];
  groups: { id: string; name: string }[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const schedules = useStore(s => s.schedules);

  const peopleChips = useMemo(() => rulesToConditionChips(policy.rules ?? [], groups), [policy.rules, groups]);
  const timeWindows = useMemo(() => rulesToTimeWindows(policy.rules ?? []), [policy.rules]);
  const assignedDoors = useMemo(() => doors.filter(d => (policy.doorIds ?? []).includes(d.id)), [doors, policy.doorIds]);
  const linkedSchedule = policy.scheduleId ? schedules.find(s => s.id === policy.scheduleId) : undefined;
  const isOverride = timeWindows.length === 0 && !policy.scheduleId && assignedDoors.length > 0 && assignedDoors.length >= doors.length;

  function chipLabel(tw: TimeWindow) {
    const dayPart = tw.days.length === 0 ? 'Every day' : tw.days.join('–');
    const timePart = tw.startTime === '00:00' && tw.endTime === '23:59' ? 'Always' : `${tw.startTime}–${tw.endTime}`;
    return timePart === 'Always' && dayPart === 'Every day' ? '24/7' : `${dayPart} ${timePart}`;
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden ${isOverride ? 'border-red-900' : 'border-gray-800'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <button type="button" onClick={() => setExpanded(e => !e)} className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-white font-semibold text-base">{policy.name}</span>
              {isOverride && (
                <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-medium">⚠ Override</span>
              )}
              <span className={`text-xs transition-transform inline-block ml-auto ${expanded ? 'rotate-180' : ''}`}>▾</span>
            </div>

            {/* Lanes (always visible) */}
            <div className="space-y-2">
              {/* People */}
              <Lane color="bg-indigo-600" label="People" accentClass="text-indigo-400">
                {peopleChips.length === 0 ? (
                  <span className="text-slate-600 text-xs italic">Anyone</span>
                ) : peopleChips.map((chip, i) => (
                  <span key={chip.id} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-slate-500 text-xs font-semibold">
                        {policy.logicalOperator}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
                      {chip.label}
                    </span>
                  </span>
                ))}
              </Lane>

              {/* Time */}
              <Lane color="bg-amber-500" label="Time" accentClass="text-amber-400">
                {linkedSchedule ? (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${linkedSchedule.color}22`, color: linkedSchedule.color, border: `1px solid ${linkedSchedule.color}66` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: linkedSchedule.color }} />
                    {linkedSchedule.name}
                  </span>
                ) : timeWindows.length === 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS.time}`}>Always (24/7)</span>
                ) : timeWindows.map(tw => (
                  <span key={tw.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS.time}`}>
                    {chipLabel(tw)}
                  </span>
                ))}
              </Lane>

              {/* Doors */}
              <Lane color="bg-emerald-500" label="Doors" accentClass="text-emerald-400">
                {assignedDoors.length === 0 ? (
                  <span className="text-slate-600 text-xs italic">No doors assigned</span>
                ) : assignedDoors.map(door => (
                  <span key={door.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS.door}`}>
                    {door.name}
                  </span>
                ))}
              </Lane>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button type="button" onClick={onEdit} className="px-3 py-1.5 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="px-3 py-1.5 text-xs text-red-400 bg-gray-800 hover:bg-red-950 border border-gray-700 hover:border-red-800 rounded-lg transition-colors">
              Delete
            </button>
          </div>
        </div>

        {expanded && policy.description && (
          <p className="text-slate-500 text-sm mt-3 border-t border-gray-800 pt-3">{policy.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Modal draft ──────────────────────────────────────────────────────────────

interface PolicyDraft {
  name: string;
  description: string;
  logicalOperator: 'AND' | 'OR';
  peopleChips: ConditionChip[];
  timeWindows: TimeWindow[];
  doorIds: string[];
  scheduleId: string | undefined;
}

function emptyDraft(): PolicyDraft {
  return { name: '', description: '', logicalOperator: 'AND', peopleChips: [], timeWindows: [], doorIds: [], scheduleId: undefined };
}

function policyToDraft(p: Policy, groups: { id: string; name: string }[]): PolicyDraft {
  return {
    name: p.name,
    description: p.description,
    logicalOperator: p.logicalOperator,
    peopleChips: rulesToConditionChips(p.rules, groups),
    timeWindows: rulesToTimeWindows(p.rules),
    doorIds: [...p.doorIds],
    scheduleId: p.scheduleId,
  };
}

function draftToPolicy(draft: PolicyDraft, id: string): Policy {
  const peopleRules = draft.peopleChips.map(chipToRule);
  const timeRules   = draft.timeWindows.flatMap(timeWindowToRules);
  return {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    logicalOperator: draft.logicalOperator,
    rules: [...peopleRules, ...timeRules],
    doorIds: draft.doorIds,
    scheduleId: draft.scheduleId,
  };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Policies() {
  const policies      = useStore(s => s.policies);
  const doors         = useStore(s => s.doors);
  const groups        = useStore(s => s.groups);
  const addPolicy     = useStore(s => s.addPolicy);
  const updatePolicy  = useStore(s => s.updatePolicy);
  const deletePolicy  = useStore(s => s.deletePolicy);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draft, setDraft]             = useState<PolicyDraft>(emptyDraft());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [doorSearch, setDoorSearch]   = useState('');

  const filteredDoors = useMemo(
    () => doors.filter(d => d.name.toLowerCase().includes(doorSearch.toLowerCase())),
    [doors, doorSearch],
  );

  function openAdd()          { setEditingId(null); setDraft(emptyDraft()); setDoorSearch(''); setModalOpen(true); }
  function openEdit(p: Policy) { setEditingId(p.id); setDraft(policyToDraft(p, groups)); setDoorSearch(''); setModalOpen(true); }
  function closeModal()       { setModalOpen(false); setEditingId(null); setDraft(emptyDraft()); setDoorSearch(''); }

  function handleSave() {
    if (!draft.name.trim()) return;
    const id = editingId ?? uuidv4();
    const policy = draftToPolicy(draft, id);
    if (editingId) updatePolicy(policy);
    else addPolicy(policy);
    closeModal();
  }

  function toggleDoor(doorId: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(doorId)
        ? d.doorIds.filter(id => id !== doorId)
        : [...d.doorIds, doorId],
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Access Policies</h1>
          <button type="button" onClick={openAdd} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
            + New Policy
          </button>
        </div>

        {policies.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No policies defined.</p>
            <p className="text-sm mt-1">Create a policy to define who can access which doors and when.</p>
          </div>
        )}

        <div className="space-y-4">
          {policies.map(policy => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              doors={doors}
              groups={groups}
              onEdit={() => openEdit(policy)}
              onDelete={() => setDeleteConfirmId(policy.id)}
            />
          ))}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Policy</h2>
            <p className="text-gray-400 text-sm mb-6">
              Remove "{policies.find(p => p.id === deleteConfirmId)?.name}"? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { deletePolicy(deleteConfirmId); setDeleteConfirmId(null); }}
                className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-lg">{editingId ? 'Edit Policy' : 'New Policy'}</h2>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Policy Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. After-Hours Research Lab"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Description <span className="text-gray-600 normal-case">(optional)</span></label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="What does this policy do?"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* People lane */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-indigo-600 rounded-full" />
                  <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">People</label>
                  <span className="text-xs text-gray-600">— who does this apply to?</span>
                </div>
                <p className="text-xs text-gray-600 pl-3">Leave empty to apply to everyone.</p>
                <div className="pl-3">
                  <div className="flex items-center gap-3 mb-2">
                    {(['AND', 'OR'] as const).map(op => (
                      <label key={op} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                        draft.logicalOperator === op
                          ? op === 'AND' ? 'bg-indigo-900 border-indigo-600 text-indigo-200' : 'bg-violet-900 border-violet-600 text-violet-200'
                          : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'
                      }`}>
                        <input type="radio" name="logic" value={op} checked={draft.logicalOperator === op} onChange={() => setDraft(d => ({ ...d, logicalOperator: op }))} className="sr-only" />
                        {op === 'AND' ? 'All conditions must match' : 'Any condition matches'}
                      </label>
                    ))}
                  </div>
                  <ConditionChips
                    chips={draft.peopleChips}
                    onChange={chips => setDraft(d => ({ ...d, peopleChips: chips }))}
                    allowGroupRef
                  />
                </div>
              </div>

              {/* Time lane */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-amber-500 rounded-full" />
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-widest">Time</label>
                  <span className="text-xs text-gray-600">— when is this active?</span>
                </div>
                <p className="text-xs text-gray-600 pl-3">Select a named schedule, or leave empty for always-on (24/7).</p>
                <div className="pl-3">
                  <SchedulePicker
                    value={draft.scheduleId}
                    onChange={scheduleId => setDraft(d => ({ ...d, scheduleId }))}
                    className="mb-3"
                  />
                  {!draft.scheduleId && (
                    <TimeWindowChips
                      windows={draft.timeWindows}
                      onChange={windows => setDraft(d => ({ ...d, timeWindows: windows }))}
                    />
                  )}
                </div>
              </div>

              {/* Doors lane */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-emerald-500 rounded-full" />
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Doors</label>
                  <span className="text-xs text-gray-600">— which doors does this unlock?</span>
                </div>
                <div className="pl-3">
                  <input
                    type="text"
                    value={doorSearch}
                    onChange={e => setDoorSearch(e.target.value)}
                    placeholder="Search doors..."
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 mb-2"
                  />
                  {doors.length === 0 && <p className="text-xs text-gray-600 italic">No doors available.</p>}
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filteredDoors.map(door => {
                      const checked = draft.doorIds.includes(door.id);
                      return (
                        <label key={door.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                          checked ? 'bg-emerald-900 border-emerald-600 text-emerald-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleDoor(door.id)} className="sr-only" />
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-400' : 'border-gray-600'}`}>
                            {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </span>
                          <span className="truncate">{door.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {draft.doorIds.length > 0 && (
                    <p className="text-xs text-emerald-500 mt-1">{draft.doorIds.length} door{draft.doorIds.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.name.trim()}
                className="px-4 py-2 text-sm text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingId ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
