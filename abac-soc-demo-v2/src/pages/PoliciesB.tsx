import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Policy, ConditionChip, TimeWindow, Door } from '../types';
import ConditionChips from '../components/ConditionChips';
import TimeWindowChips from '../components/TimeWindowChips';
import {
  chipToRule,
  timeWindowToRules,
  rulesToConditionChips,
  rulesToTimeWindows,
  CHIP_COLORS,
} from '../lib/chipUtils';

// ── Schedule heatmap (shared with GroupsB) ────────────────────────────────────

function ScheduleHeatmap({ timeWindows }: { timeWindows: TimeWindow[] }) {
  if (timeWindows.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm text-green-400">Always active (24/7)</span>
      </div>
    );
  }
  const tw = timeWindows[0];
  const DAY_KEYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const activeDays = tw.days ?? [];
  return (
    <div>
      <div className="flex gap-1.5 mb-2">
        {DAY_KEYS.map(d => (
          <div key={d} className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-sm ${activeDays.includes(d) ? 'bg-amber-700' : 'bg-gray-800'}`} />
            <span className="text-[9px] text-gray-600">{d[0]}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-amber-300 text-sm">{tw.startTime ?? '00:00'} – {tw.endTime ?? '23:59'}</div>
    </div>
  );
}

// ── Schedule cell for table ───────────────────────────────────────────────────

function ScheduleCell({ timeWindows }: { timeWindows: TimeWindow[] }) {
  if (timeWindows.length === 0) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        24/7
      </span>
    );
  }
  const tw = timeWindows[0];
  const dayLabel = tw.days.length === 0 ? 'Every day' : tw.days.slice(0, 3).join(',') + (tw.days.length > 3 ? '…' : '');
  return (
    <span className="flex items-center gap-1.5 text-xs text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      <span className="font-mono">{dayLabel} {tw.startTime}–{tw.endTime}</span>
    </span>
  );
}

// ── Modal draft (mirrored from Policies.tsx) ──────────────────────────────────

interface PolicyDraft {
  name: string;
  description: string;
  logicalOperator: 'AND' | 'OR';
  peopleChips: ConditionChip[];
  timeWindows: TimeWindow[];
  doorIds: string[];
}

function emptyDraft(): PolicyDraft {
  return { name: '', description: '', logicalOperator: 'AND', peopleChips: [], timeWindows: [], doorIds: [] };
}

function policyToDraft(p: Policy, groups: { id: string; name: string }[]): PolicyDraft {
  return {
    name: p.name,
    description: p.description,
    logicalOperator: p.logicalOperator,
    peopleChips: rulesToConditionChips(Array.isArray(p.rules) ? p.rules : [], groups),
    timeWindows: rulesToTimeWindows(Array.isArray(p.rules) ? p.rules : []),
    doorIds: [...(p.doorIds ?? [])],
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
  };
}

// ── Override detection ────────────────────────────────────────────────────────

function isOverridePolicy(policy: Policy): boolean {
  const safeRules = Array.isArray(policy.rules) ? policy.rules : [];
  return safeRules.filter(r => !r.leftSide.startsWith('now.')).length === 0
    && (policy.doorIds ?? []).length > 0;
}

// ── People chip summary text ──────────────────────────────────────────────────

function buildPeopleSummary(policy: Policy, groups: { id: string; name: string }[]): string {
  const safeRules = Array.isArray(policy.rules) ? policy.rules : [];
  const peopleChips = rulesToConditionChips(safeRules.filter(r => !r.leftSide.startsWith('now.')), groups);
  if (peopleChips.length === 0) return 'All staff';
  return peopleChips.slice(0, 2).map(c => c.label).join(' · ');
}

// ── Policy detail drawer ──────────────────────────────────────────────────────

interface PolicyDrawerProps {
  policy: Policy;
  doors: Door[];
  groups: { id: string; name: string }[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PolicyDrawer({ policy, doors, groups, onClose, onEdit, onDelete }: PolicyDrawerProps) {
  const users = useStore(s => s.users);
  const sites = useStore(s => s.sites);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const safeRules    = Array.isArray(policy.rules) ? policy.rules : [];
  const peopleChips  = useMemo(() => rulesToConditionChips(safeRules.filter(r => !r.leftSide.startsWith('now.')), groups), [safeRules, groups]);
  const timeWindows  = useMemo(() => rulesToTimeWindows(safeRules), [safeRules]);
  const assignedDoors = useMemo(() => doors.filter(d => (policy.doorIds ?? []).includes(d.id)), [doors, policy.doorIds]);
  const override     = isOverridePolicy(policy);

  // Qualifying user count (AND/OR logic)
  const qualifyingCount = useMemo(() => {
    const condRules = safeRules.filter(r => !r.leftSide.startsWith('now.') && r.leftSide !== 'user');
    if (condRules.length === 0) return users.length;
    const RANK: Record<string, number> = { Unclassified: 0, Confidential: 1, Secret: 2, TopSecret: 3 };
    function passes(user: typeof users[0], rule: typeof condRules[0]): boolean {
      const v = Array.isArray(rule.rightSide) ? rule.rightSide[0] : rule.rightSide;
      switch (rule.leftSide) {
        case 'user.department': return rule.operator === '==' ? user.department === v : user.department !== v;
        case 'user.status':    return rule.operator === '==' ? (user.status as string) === v : (user.status as string) !== v;
        case 'user.role':      return rule.operator === '==' ? user.role === v : user.role !== v;
        case 'user.clearanceLevel': {
          const uR = RANK[user.clearanceLevel] ?? 0, rR = RANK[v] ?? 0;
          if (rule.operator === '>=') return uR >= rR;
          if (rule.operator === '<=') return uR <= rR;
          if (rule.operator === '==') return uR === rR;
          if (rule.operator === '!=') return uR !== rR;
          return false;
        }
        default: return false;
      }
    }
    return users.filter(u =>
      policy.logicalOperator === 'OR'
        ? condRules.some(r => passes(u, r))
        : condRules.every(r => passes(u, r))
    ).length;
  }, [users, safeRules, policy.logicalOperator]);

  // Doors by site
  const doorsBySite = useMemo(() => {
    return assignedDoors.reduce<Record<string, { siteName: string; doors: Door[] }>>((acc, d) => {
      const key = d.siteId || '__none__';
      if (!acc[key]) {
        const siteName = sites.find(s => s.id === d.siteId)?.name ?? 'Unassigned';
        acc[key] = { siteName, doors: [] };
      }
      acc[key].doors.push(d);
      return acc;
    }, {});
  }, [assignedDoors, sites]);

  const siteGroups = Object.values(doorsBySite);
  const multipleSites = siteGroups.length > 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{policy.name}</h2>
          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
            policy.logicalOperator === 'AND'
              ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
              : 'bg-violet-950 text-violet-400 border border-violet-800'
          }`}>{policy.logicalOperator}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none shrink-0 ml-2">×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Risk indicators */}
        {(override || timeWindows.length === 0) && (
          <div className="space-y-1.5">
            {override && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-950/40 border border-red-900 rounded-lg">
                <span className="text-red-400 text-sm">⚠</span>
                <span className="text-xs text-red-300">Override policy — no people filter set with active doors.</span>
              </div>
            )}
            {!override && timeWindows.length === 0 && peopleChips.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/40 border border-amber-900 rounded-lg">
                <span className="text-amber-400 text-sm">⚠</span>
                <span className="text-xs text-amber-300">No people filter or time restriction — applies to all staff 24/7.</span>
              </div>
            )}
          </div>
        )}

        {/* Who has access */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Who Has Access</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-white tabular-nums">{qualifyingCount}</span>
            <span className="text-gray-500 text-sm">{qualifyingCount === 1 ? 'person' : 'people'}</span>
          </div>
          {peopleChips.length === 0 ? (
            <span className="text-xs text-gray-500 italic">No filter — open to all staff</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {peopleChips.map((chip, i) => (
                <span key={chip.id} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      policy.logicalOperator === 'AND'
                        ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                        : 'bg-violet-950 text-violet-400 border border-violet-800'
                    }`}>{policy.logicalOperator}</span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
                    {chip.label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Schedule</p>
          <ScheduleHeatmap timeWindows={timeWindows} />
        </div>

        {/* Doors by site */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            Doors by Site
            {assignedDoors.length > 0 && (
              <span className="ml-2 font-normal normal-case text-gray-600">
                {assignedDoors.length} door{assignedDoors.length !== 1 ? 's' : ''}
                {multipleSites ? `, ${siteGroups.length} sites` : ''}
              </span>
            )}
          </p>
          {assignedDoors.length === 0 ? (
            <p className="text-xs italic text-gray-600">No doors assigned</p>
          ) : (
            <div className="space-y-3">
              {siteGroups.map(({ siteName, doors: siteDoors }) => (
                <div key={siteName}>
                  {multipleSites && (
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{siteName}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {siteDoors.map(d => (
                      <span key={d.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-900 text-emerald-300 border border-emerald-800">
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800 shrink-0 space-y-2">
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Edit Policy
        </button>
        {confirmDelete ? (
          <div className="flex gap-2">
            <span className="flex-1 text-xs text-red-400 flex items-center">Sure?</span>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg transition-colors"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full px-4 py-2 border border-red-800 hover:bg-red-950 text-red-400 text-sm rounded-lg transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── Policy table row ──────────────────────────────────────────────────────────

interface PolicyRowProps {
  policy: Policy;
  doors: Door[];
  groups: { id: string; name: string }[];
  isSelected: boolean;
  onSelect: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDeleteRequest: (e: React.MouseEvent) => void;
}

function PolicyRow({ policy, doors, groups, isSelected, onSelect, onEdit, onDeleteRequest }: PolicyRowProps) {
  const users = useStore(s => s.users);

  const safeRules    = Array.isArray(policy.rules) ? policy.rules : [];
  const timeWindows  = useMemo(() => rulesToTimeWindows(safeRules), [safeRules]);
  const assignedDoors = useMemo(() => doors.filter(d => (policy.doorIds ?? []).includes(d.id)), [doors, policy.doorIds]);
  const override     = isOverridePolicy(policy);
  const summaryText  = useMemo(() => buildPeopleSummary(policy, groups), [policy, groups]);

  // Qualifying user count
  const qualifyingCount = useMemo(() => {
    const condRules = safeRules.filter(r => !r.leftSide.startsWith('now.') && r.leftSide !== 'user');
    if (condRules.length === 0) return users.length;
    const RANK: Record<string, number> = { Unclassified: 0, Confidential: 1, Secret: 2, TopSecret: 3 };
    function passes(user: typeof users[0], rule: typeof condRules[0]): boolean {
      const v = Array.isArray(rule.rightSide) ? rule.rightSide[0] : rule.rightSide;
      switch (rule.leftSide) {
        case 'user.department': return rule.operator === '==' ? user.department === v : user.department !== v;
        case 'user.status':    return rule.operator === '==' ? (user.status as string) === v : (user.status as string) !== v;
        case 'user.role':      return rule.operator === '==' ? user.role === v : user.role !== v;
        case 'user.clearanceLevel': {
          const uR = RANK[user.clearanceLevel] ?? 0, rR = RANK[v] ?? 0;
          if (rule.operator === '>=') return uR >= rR;
          if (rule.operator === '<=') return uR <= rR;
          if (rule.operator === '==') return uR === rR;
          if (rule.operator === '!=') return uR !== rR;
          return false;
        }
        default: return false;
      }
    }
    return users.filter(u =>
      policy.logicalOperator === 'OR'
        ? condRules.some(r => passes(u, r))
        : condRules.every(r => passes(u, r))
    ).length;
  }, [users, safeRules, policy.logicalOperator]);

  // Site count
  const siteIds = useMemo(() => [...new Set(assignedDoors.map(d => d.siteId).filter(Boolean))], [assignedDoors]);

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors group/row ${
        override
          ? isSelected ? 'bg-red-950/30' : 'bg-red-950/20 hover:bg-red-950/30'
          : isSelected ? 'bg-indigo-950/50' : 'hover:bg-gray-800/50'
      }`}
    >
      {/* Name + summary */}
      <td className={`px-6 py-3 ${
        override
          ? 'border-l-2 border-red-500'
          : isSelected ? 'border-l-2 border-indigo-500' : 'border-l-2 border-transparent'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{policy.name}</span>
          {override && <span className="text-xs text-red-400 font-medium shrink-0">⚠ Override</span>}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{summaryText}</div>
      </td>

      {/* People */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-indigo-300">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span className="font-mono tabular-nums">{qualifyingCount === users.length ? 'All staff' : qualifyingCount}</span>
        </span>
      </td>

      {/* Schedule */}
      <td className="px-4 py-3">
        <ScheduleCell timeWindows={timeWindows} />
      </td>

      {/* Doors */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-mono tabular-nums">
            {assignedDoors.length} door{assignedDoors.length !== 1 ? 's' : ''}
            {siteIds.length > 1 ? ` / ${siteIds.length} sites` : ''}
          </span>
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-[11px] text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDeleteRequest}
            className="px-2 py-1 text-[11px] text-red-400 bg-gray-700 hover:bg-red-950 rounded transition-colors"
          >
            Del
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PoliciesBProps {
  onSwitchToA: () => void;
}

export default function PoliciesB({ onSwitchToA }: PoliciesBProps) {
  const policies      = useStore(s => s.policies);
  const doors         = useStore(s => s.doors);
  const groups        = useStore(s => s.groups);
  const addPolicy     = useStore(s => s.addPolicy);
  const updatePolicy  = useStore(s => s.updatePolicy);
  const deletePolicy  = useStore(s => s.deletePolicy);

  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draft, setDraft]             = useState<PolicyDraft>(emptyDraft());
  const [doorSearch, setDoorSearch]   = useState('');
  const [search, setSearch]           = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const displayPolicies = useMemo(() => {
    let list = policies.filter(p => Array.isArray(p.rules));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [policies, search]);

  const selectedPolicy = policies.find(p => p.id === selectedId) ?? null;

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

  function handleDelete(id: string) {
    deletePolicy(id);
    if (selectedId === id) setSelectedId(null);
    setDeleteConfirmId(null);
  }

  function toggleDoor(doorId: string) {
    setDraft(d => ({
      ...d,
      doorIds: d.doorIds.includes(doorId)
        ? d.doorIds.filter(id => id !== doorId)
        : [...d.doorIds, doorId],
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-white">Access Policies</h1>
        <button
          onClick={onSwitchToA}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
        >
          ← Design A (Cards)
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: filter bar + table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 shrink-0 bg-gray-950">
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={openAdd}
              className="ml-auto px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
            >
              + New Policy
            </button>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 overflow-y-auto">
            {displayPolicies.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                {policies.filter(p => Array.isArray(p.rules)).length === 0
                  ? 'No policies yet. Create one to get started.'
                  : 'No policies match the search.'}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-950 z-10">
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Policy</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">People</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Schedule</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Doors</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {displayPolicies.map(policy => (
                    <PolicyRow
                      key={policy.id}
                      policy={policy}
                      doors={doors}
                      groups={groups}
                      isSelected={selectedId === policy.id}
                      onSelect={() => setSelectedId(policy.id === selectedId ? null : policy.id)}
                      onEdit={e => { e.stopPropagation(); openEdit(policy); }}
                      onDeleteRequest={e => { e.stopPropagation(); setDeleteConfirmId(policy.id); }}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: detail drawer */}
        {selectedPolicy && (
          <div className="border-l border-gray-800 bg-gray-900 w-[420px] shrink-0 flex flex-col overflow-hidden">
            <PolicyDrawer
              policy={selectedPolicy}
              doors={doors}
              groups={groups}
              onClose={() => setSelectedId(null)}
              onEdit={() => openEdit(selectedPolicy)}
              onDelete={() => handleDelete(selectedPolicy.id)}
            />
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirmId && (() => {
        const target = policies.find(p => p.id === deleteConfirmId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-white font-semibold text-lg mb-2">Delete Policy</h2>
              <p className="text-gray-400 text-sm mb-6">
                Remove "{target.name}"? This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit/Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-lg">{editingId ? 'Edit Policy' : 'New Policy'}</h2>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
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

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                  Description <span className="text-gray-600 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="What does this policy do?"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

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

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 bg-amber-500 rounded-full" />
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-widest">Time</label>
                  <span className="text-xs text-gray-600">— when is this active?</span>
                </div>
                <p className="text-xs text-gray-600 pl-3">Leave empty for always-on (24/7).</p>
                <div className="pl-3">
                  <TimeWindowChips
                    windows={draft.timeWindows}
                    onChange={windows => setDraft(d => ({ ...d, timeWindows: windows }))}
                  />
                </div>
              </div>

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
                            {checked && (
                              <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white">
                                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
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
