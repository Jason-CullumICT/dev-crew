import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Group, GroupMember, ConditionChip, TimeWindow, User, Rule, Grant, Door } from '../types';
import { CLEARANCE_RANK } from '../types';
import ConditionChips from '../components/ConditionChips';
import TimeWindowChips from '../components/TimeWindowChips';
import {
  chipToRule,
  timeWindowToRules,
  rulesToConditionChips,
  rulesToTimeWindows,
  CHIP_COLORS,
} from '../lib/chipUtils';

// ── Modal draft (mirrored from Groups.tsx) ───────────────────────────────────

interface GroupDraft {
  id: string;
  name: string;
  description: string;
  conditionChips: ConditionChip[];
  timeWindows: TimeWindow[];
  members: GroupMember[];
  memberSearch: string;
  inheritedPermissions: string[];
}

function emptyDraft(): GroupDraft {
  return { id: '', name: '', description: '', conditionChips: [], timeWindows: [], members: [], memberSearch: '', inheritedPermissions: [] };
}

function groupToDraft(g: Group, groups: { id: string; name: string }[]): GroupDraft {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    conditionChips: rulesToConditionChips(g.membershipRules ?? [], groups),
    timeWindows: rulesToTimeWindows(g.membershipRules ?? []),
    members: [...(g.members ?? [])],
    memberSearch: '',
    inheritedPermissions: [...(g.inheritedPermissions ?? [])],
  };
}

function draftToGroup(draft: GroupDraft, existing?: Group): Group {
  const conditionRules = draft.conditionChips.map(chipToRule);
  const timeRules      = draft.timeWindows.flatMap(timeWindowToRules);
  const membershipRules = [...conditionRules, ...timeRules];

  const hasConditions = conditionRules.length > 0;
  const hasExplicit   = draft.members.length > 0;
  const membershipType: Group['membershipType'] =
    hasConditions && hasExplicit ? 'hybrid' :
    hasConditions                ? 'dynamic' :
                                   'explicit';

  return {
    ...(existing ?? {}),
    id: draft.id || uuidv4(),
    name: draft.name.trim(),
    description: draft.description,
    members: draft.members,
    membershipRules,
    membershipLogic: 'AND',
    membershipType,
    targetEntityType: 'user',
    inheritedPermissions: draft.inheritedPermissions,
  } as Group;
}

// ── User matching (mirrored from Groups.tsx) ─────────────────────────────────

function userMatchesRule(user: User, rule: Rule): boolean {
  const v = Array.isArray(rule.rightSide) ? rule.rightSide[0] : rule.rightSide;
  switch (rule.leftSide) {
    case 'user.department':
      return rule.operator === '==' ? user.department === v : user.department !== v;
    case 'user.status':
      return rule.operator === '==' ? (user.status as string) === v : (user.status as string) !== v;
    case 'user.role':
      return rule.operator === '==' ? user.role === v : user.role !== v;
    case 'user.type':
      return rule.operator === '==' ? (user as Record<string, unknown>)['type'] === v : (user as Record<string, unknown>)['type'] !== v;
    case 'user.clearanceLevel': {
      const uRank = CLEARANCE_RANK[user.clearanceLevel] ?? 0;
      const rRank = CLEARANCE_RANK[v as keyof typeof CLEARANCE_RANK] ?? 0;
      if (rule.operator === '>=') return uRank >= rRank;
      if (rule.operator === '<=') return uRank <= rRank;
      if (rule.operator === '==') return uRank === rRank;
      if (rule.operator === '!=') return uRank !== rRank;
      return false;
    }
    default:
      return false;
  }
}

function matchGroupUsers(group: Group, users: User[]): User[] {
  const conditionRules = (group.membershipRules ?? []).filter(r => !r.leftSide.startsWith('now.'));
  if (group.membershipType === 'explicit') {
    const ids = new Set((group.members ?? []).map(m => m.entityId));
    return users.filter(u => ids.has(u.id));
  }
  const dynamic = conditionRules.length === 0 ? [] : users.filter(u => conditionRules.every(r => userMatchesRule(u, r)));
  if (group.membershipType === 'hybrid') {
    const ids = new Set((group.members ?? []).map(m => m.entityId));
    const map = new Map<string, User>();
    dynamic.forEach(u => map.set(u.id, u));
    users.filter(u => ids.has(u.id)).forEach(u => map.set(u.id, u));
    return [...map.values()];
  }
  return dynamic;
}

// ── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['bg-indigo-700','bg-violet-700','bg-sky-700','bg-rose-700','bg-amber-700','bg-teal-700'];

function nameToColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % AVATAR_PALETTE.length;
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

// ── Type badge ────────────────────────────────────────────────────────────────

function GroupTypeBadge({ group }: { group: Group }) {
  const rules = group.membershipRules ?? [];
  const hasDynamic  = rules.some(r => !r.leftSide.startsWith('now.'));
  const hasExplicit = group.membershipType === 'explicit' || group.membershipType === 'hybrid';

  if (hasDynamic && hasExplicit) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-900 text-violet-300">Hybrid</span>;
  }
  if (hasDynamic || group.membershipType === 'dynamic') {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-900 text-indigo-300">Dynamic</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-700 text-slate-300">Explicit</span>;
}

// ── Schedule heatmap (shared) ─────────────────────────────────────────────────

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

// ── Schedule cell (for table) ─────────────────────────────────────────────────

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

// ── Group detail drawer ───────────────────────────────────────────────────────

interface DrawerProps {
  group: Group;
  users: User[];
  grants: Grant[];
  doors: Door[];
  allGroups: Group[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function GroupDrawer({ group, users, grants, doors, allGroups, onClose, onEdit, onDelete }: DrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rules       = group.membershipRules ?? [];
  const chips       = useMemo(() => rulesToConditionChips(rules.filter(r => !r.leftSide.startsWith('now.')), allGroups), [rules, allGroups]);
  const timeWindows = useMemo(() => rulesToTimeWindows(rules), [rules]);
  const matched     = useMemo(() => matchGroupUsers(group, users), [group, users]);

  const resolvedGrants = useMemo(() => (group.inheritedPermissions ?? []).map(gid => {
    const grant = grants.find(g => g.id === gid);
    if (!grant) return null;
    const grantDoors = grant.scope === 'zone' && grant.targetId
      ? doors.filter(d => d.zoneId === grant.targetId)
      : grant.scope === 'site' && grant.targetId
        ? doors.filter(d => d.siteId === grant.targetId)
        : doors;
    return { grant, doors: grantDoors };
  }).filter((x): x is { grant: Grant; doors: Door[] } => x !== null), [group.inheritedPermissions, grants, doors]);

  return (
    <div className="flex flex-col h-full">
      {/* Drawer header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-white truncate pr-2">{group.name}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none shrink-0">×</button>
      </div>

      {/* Drawer body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Membership conditions */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Membership Conditions</p>
          {chips.length === 0 ? (
            <p className="text-xs italic text-gray-600">No conditions</p>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {chips.map((chip, i) => (
                <span key={chip.id} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[10px] font-bold text-gray-600">AND</span>}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
                    {chip.label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Live members */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Live Members</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-white tabular-nums">{matched.length}</span>
            <span className="text-gray-500 text-sm">{matched.length === 1 ? 'person' : 'people'}</span>
          </div>
          {matched.length === 0 ? (
            <p className="text-xs italic text-gray-600">No users match the current conditions</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {matched.slice(0, 8).map(u => (
                <span
                  key={u.id}
                  title={u.name}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white ${AVATAR_PALETTE[nameToColorIndex(u.name)]}`}
                >
                  {getInitials(u.name)}
                </span>
              ))}
              {matched.length > 8 && (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 border border-gray-700 text-xs font-medium text-gray-400">
                  +{matched.length - 8}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        {timeWindows.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Schedule</p>
            <ScheduleHeatmap timeWindows={timeWindows} />
          </div>
        )}

        {/* Access grants */}
        {resolvedGrants.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Access Grants</p>
            <div className="space-y-2">
              {resolvedGrants.map(({ grant, doors: grantDoors }) => (
                <div key={grant.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-200">{grant.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      grant.scope === 'global' ? 'bg-blue-900 text-blue-300' :
                      grant.scope === 'site'   ? 'bg-green-900 text-green-300' :
                                                 'bg-orange-900 text-orange-300'
                    }`}>{grant.scope}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {grant.scope === 'global' ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-900 text-emerald-300">All doors</span>
                    ) : grantDoors.slice(0, 4).map(d => (
                      <span key={d.id} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-900 text-emerald-300">{d.name}</span>
                    ))}
                    {grant.scope !== 'global' && grantDoors.length > 4 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-700 text-gray-400">+{grantDoors.length - 4}</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {grant.actions.map(a => (
                      <span key={a} className="px-1.5 py-px rounded text-[10px] font-mono bg-gray-900 text-gray-400 border border-gray-700">{a}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer footer */}
      <div className="px-5 py-4 border-t border-gray-800 shrink-0 space-y-2">
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Edit Group
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

// ── Main component ────────────────────────────────────────────────────────────

interface GroupsBProps {
  onSwitchToA: () => void;
}

export default function GroupsB({ onSwitchToA }: GroupsBProps) {
  const users       = useStore(s => s.users);
  const groups      = useStore(s => s.groups);
  const grants      = useStore(s => s.grants);
  const doors       = useStore(s => s.doors);
  const addGroup    = useStore(s => s.addGroup);
  const updateGroup = useStore(s => s.updateGroup);
  const deleteGroup = useStore(s => s.deleteGroup);
  const updateUser  = useStore(s => s.updateUser);

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [draft, setDraft]               = useState<GroupDraft>(emptyDraft());
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<'all' | 'dynamic' | 'explicit' | 'hybrid'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const displayGroups = useMemo(() => {
    let list = groups.filter(g => g.membershipRules !== undefined);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g => g.name.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      list = list.filter(g => g.membershipType === typeFilter);
    }
    return list;
  }, [groups, search, typeFilter]);

  const selectedGroup = groups.find(g => g.id === selectedId) ?? null;

  // ── Member sync ──────────────────────────────────────────────────────────────

  function syncUserGroupIds(groupId: string, oldMembers: GroupMember[], newMembers: GroupMember[]) {
    const liveUsers = useStore.getState().users;
    const oldIds = oldMembers.filter(m => m.entityType === 'user').map(m => m.entityId);
    const newIds = newMembers.filter(m => m.entityType === 'user').map(m => m.entityId);
    newIds.filter(id => !oldIds.includes(id)).forEach(userId => {
      const u = liveUsers.find(u => u.id === userId);
      if (u && !u.groupIds.includes(groupId)) updateUser({ ...u, groupIds: [...u.groupIds, groupId] });
    });
    oldIds.filter(id => !newIds.includes(id)).forEach(userId => {
      const u = liveUsers.find(u => u.id === userId);
      if (u) updateUser({ ...u, groupIds: u.groupIds.filter(gid => gid !== groupId) });
    });
  }

  // ── Modal handlers ────────────────────────────────────────────────────────────

  function openAdd()          { setEditingGroup(null); setDraft(emptyDraft()); setModalOpen(true); }
  function openEdit(g: Group) { setEditingGroup(g); setDraft(groupToDraft(g, groups)); setModalOpen(true); }
  function closeModal()       { setModalOpen(false); setEditingGroup(null); setDraft(emptyDraft()); }

  function handleSave() {
    if (!draft.name.trim()) return;
    const group = draftToGroup(draft, editingGroup ?? undefined);
    if (editingGroup) {
      updateGroup(group);
      syncUserGroupIds(group.id, editingGroup.members, draft.members);
    } else {
      addGroup(group);
      syncUserGroupIds(group.id, [], draft.members);
    }
    closeModal();
  }

  function handleDelete(g: Group) {
    syncUserGroupIds(g.id, g.members, []);
    deleteGroup(g.id);
    if (selectedId === g.id) setSelectedId(null);
    setDeleteConfirmId(null);
  }

  function toggleMember(userId: string) {
    const exists = draft.members.some(m => m.entityType === 'user' && m.entityId === userId);
    setDraft(d => ({
      ...d,
      members: exists
        ? d.members.filter(m => !(m.entityType === 'user' && m.entityId === userId))
        : [...d.members, { entityType: 'user' as const, entityId: userId }],
    }));
  }

  const filteredUsers = useMemo(
    () => users.filter(u => u.name.toLowerCase().includes(draft.memberSearch.toLowerCase())),
    [users, draft.memberSearch],
  );

  const TYPE_FILTERS: { key: 'all' | 'dynamic' | 'explicit' | 'hybrid'; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'dynamic',  label: 'Dynamic'  },
    { key: 'explicit', label: 'Explicit' },
    { key: 'hybrid',   label: 'Hybrid'   },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-white">Groups</h1>
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
              placeholder="Search groups..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex gap-1">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    typeFilter === f.key
                      ? 'bg-indigo-700 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={openAdd}
              className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
            >
              + New Group
            </button>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 overflow-y-auto">
            {displayGroups.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                {groups.filter(g => g.membershipRules !== undefined).length === 0
                  ? 'No groups yet. Create one to get started.'
                  : 'No groups match the current filter.'}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-950 z-10">
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Group</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Members</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Grants</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Schedule</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {displayGroups.map(group => {
                    const isSelected  = selectedId === group.id;
                    const timeWindows = rulesToTimeWindows(group.membershipRules ?? []);
                    const memberCount = matchGroupUsers(group, users).length;
                    const grantCount  = (group.inheritedPermissions ?? []).length;
                    const condChips   = rulesToConditionChips(
                      (group.membershipRules ?? []).filter(r => !r.leftSide.startsWith('now.')),
                      groups,
                    );

                    return (
                      <GroupRow
                        key={group.id}
                        group={group}
                        isSelected={isSelected}
                        timeWindows={timeWindows}
                        memberCount={memberCount}
                        grantCount={grantCount}
                        condChips={condChips}
                        onSelect={() => setSelectedId(group.id === selectedId ? null : group.id)}
                        onEdit={e => { e.stopPropagation(); openEdit(group); }}
                        onDeleteRequest={e => { e.stopPropagation(); setDeleteConfirmId(group.id); }}
                      />
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: detail drawer */}
        {selectedGroup && (
          <div className="border-l border-gray-800 bg-gray-900 w-[420px] shrink-0 flex flex-col overflow-hidden">
            <GroupDrawer
              group={selectedGroup}
              users={users}
              grants={grants}
              doors={doors}
              allGroups={groups}
              onClose={() => setSelectedId(null)}
              onEdit={() => openEdit(selectedGroup)}
              onDelete={() => handleDelete(selectedGroup)}
            />
          </div>
        )}
      </div>

      {/* Inline delete confirm modal */}
      {deleteConfirmId && (() => {
        const target = groups.find(g => g.id === deleteConfirmId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-white font-semibold text-lg mb-2">Delete Group</h2>
              <p className="text-gray-400 text-sm mb-6">Remove "{target.name}"? This cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(target)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">{editingGroup ? 'Edit Group' : 'New Group'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Group Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Night Shift Security"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Who belongs in this group?</label>
                <p className="text-xs text-slate-600 mb-3">People who match all of these conditions are automatically enrolled.</p>
                <ConditionChips
                  chips={draft.conditionChips}
                  onChange={chips => setDraft(d => ({ ...d, conditionChips: chips }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  When are they active? <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <p className="text-xs text-slate-600 mb-3">Leave empty for no time restriction.</p>
                <TimeWindowChips
                  windows={draft.timeWindows}
                  onChange={windows => setDraft(d => ({ ...d, timeWindows: windows }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Also include specific people <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <p className="text-xs text-slate-600 mb-3">These people are always in the group regardless of the conditions above.</p>
                <input
                  type="text"
                  value={draft.memberSearch}
                  onChange={e => setDraft(d => ({ ...d, memberSearch: e.target.value }))}
                  placeholder="Search people..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 mb-2"
                />
                <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-800">
                  {filteredUsers.length === 0 && (
                    <div className="px-3 py-3 text-slate-600 text-sm text-center">No people match</div>
                  )}
                  {filteredUsers.map(user => {
                    const checked = draft.members.some(m => m.entityType === 'user' && m.entityId === user.id);
                    return (
                      <label key={user.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-800 transition-colors">
                        <input type="checkbox" checked={checked} onChange={() => toggleMember(user.id)} className="w-4 h-4 accent-indigo-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-100 block">{user.name}</span>
                          <span className="text-xs text-slate-500">{user.department}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Grants <span className="text-slate-600 normal-case font-normal">— what can people in this group do?</span>
                </label>
                <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-800">
                  {grants.length === 0 && (
                    <div className="px-3 py-3 text-slate-600 text-sm text-center">No grants available</div>
                  )}
                  {grants.map(grant => {
                    const checked = draft.inheritedPermissions.includes(grant.id);
                    return (
                      <label key={grant.id} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setDraft(d => {
                            const alreadyChecked = d.inheritedPermissions.includes(grant.id);
                            return {
                              ...d,
                              inheritedPermissions: alreadyChecked
                                ? d.inheritedPermissions.filter(id => id !== grant.id)
                                : [...d.inheritedPermissions, grant.id],
                            };
                          })}
                          className="w-4 h-4 accent-emerald-500 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-100 block">{grant.name}</span>
                          <span className="text-xs text-slate-500 capitalize">{grant.scope} · {grant.actions.join(', ')}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button onClick={closeModal} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!draft.name.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingGroup ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row sub-component (extracted to keep table body clean) ────────────────────

interface GroupRowProps {
  group: Group;
  isSelected: boolean;
  timeWindows: TimeWindow[];
  memberCount: number;
  grantCount: number;
  condChips: ConditionChip[];
  onSelect: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDeleteRequest: (e: React.MouseEvent) => void;
}

function GroupRow({
  group, isSelected, timeWindows, memberCount, grantCount, condChips,
  onSelect, onEdit, onDeleteRequest,
}: GroupRowProps) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors group/row ${
        isSelected ? 'bg-indigo-950/50' : 'hover:bg-gray-800/50'
      }`}
    >
      {/* Name + chip preview */}
      <td className={`px-6 py-3 ${isSelected ? 'border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}>
        <div className="text-sm font-medium text-white">{group.name}</div>
        {condChips.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {condChips.slice(0, 2).map(c => (
              <span key={c.id} className={`px-1.5 py-px rounded text-[10px] font-medium truncate max-w-[120px] ${CHIP_COLORS[c.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
                {c.label}
              </span>
            ))}
            {condChips.length > 2 && (
              <span className="text-[10px] text-gray-600">+{condChips.length - 2}</span>
            )}
          </div>
        )}
      </td>

      {/* Type badge */}
      <td className="px-4 py-3">
        <GroupTypeBadge group={group} />
      </td>

      {/* Members */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-white tabular-nums">{memberCount}</span>
      </td>

      {/* Grants */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm tabular-nums text-emerald-400">{grantCount}</span>
      </td>

      {/* Schedule */}
      <td className="px-4 py-3">
        <ScheduleCell timeWindows={timeWindows} />
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
