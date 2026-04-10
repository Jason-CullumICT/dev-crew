import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Group, GroupMember, ConditionChip, TimeWindow, User, Rule } from '../types';
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
import GroupsB from './GroupsB';

// ── Badge helpers ────────────────────────────────────────────────────────────

function membershipBadges(group: Group): string[] {
  const badges: string[] = [];
  const rules = group.membershipRules ?? [];
  const hasDynamic  = rules.some(r => !r.leftSide.startsWith('now.'));
  const hasTime     = rules.some(r => r.leftSide.startsWith('now.'));
  const hasExplicit = group.membershipType === 'explicit' || group.membershipType === 'hybrid';
  if (hasDynamic || group.membershipType === 'dynamic') badges.push('auto-enrolled');
  if (hasExplicit && group.membershipType !== 'dynamic') badges.push('hand-picked');
  if (hasTime) badges.push('time-gated');
  return badges;
}

const BADGE_COLORS: Record<string, string> = {
  'auto-enrolled': 'bg-indigo-900 text-indigo-300',
  'hand-picked':   'bg-slate-700 text-slate-300',
  'time-gated':    'bg-amber-900 text-amber-300',
};

// ── Modal draft ──────────────────────────────────────────────────────────────

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

// ── Sentence chip row (read-only card display) ───────────────────────────────

function chipVerb(chipType: string): string {
  if (chipType === 'department') return 'work in';
  if (chipType === 'clearance')  return 'have';
  if (chipType === 'role')       return 'have role';
  if (chipType === 'group')      return 'are in';
  return 'are'; // status, personType
}

function SentenceRow({ group }: { group: Group }) {
  const groups      = useStore(s => s.groups);
  const rules       = group.membershipRules ?? [];
  const chips       = useMemo(() => rulesToConditionChips(rules, groups), [rules, groups]);
  const timeWindows = useMemo(() => rulesToTimeWindows(rules), [rules]);

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-sm mt-1">
      {chips.map((chip, i) => (
        <span key={chip.id} className="flex items-center gap-1.5">
          <span className="text-slate-400">
            {i === 0 ? `People who ${chipVerb(chip.chipType)}` : `and ${chipVerb(chip.chipType)}`}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
            {chip.label}
          </span>
        </span>
      ))}
      {timeWindows.map(tw => {
        const dayPart  = tw.days.length === 0 ? '' : tw.days.join('–');
        const timePart = `${tw.startTime}–${tw.endTime}`;
        return (
          <span key={tw.id} className="flex items-center gap-1.5">
            <span className="text-slate-400">during</span>
            {dayPart && <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${CHIP_COLORS.time}`}>{dayPart}</span>}
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${CHIP_COLORS.time}`}>{timePart}</span>
          </span>
        );
      })}
      {group.membershipType !== 'dynamic' && (group.members ?? []).length > 0 && chips.length > 0 && (
        <span className="text-slate-500 text-xs">+ {group.members.length} explicit</span>
      )}
      {group.membershipType === 'explicit' && (group.members ?? []).length > 0 && chips.length === 0 && (
        <span className="text-slate-400 text-xs">{group.members.length} hand-picked member{group.members.length !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

// ── Live member evaluation ───────────────────────────────────────────────────

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
      return rule.operator === '==' ? (user as any).type === v : (user as any).type !== v;
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
      return false; // now.* time rules — not evaluated client-side
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

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_PALETTE = ['bg-indigo-700','bg-violet-700','bg-sky-700','bg-rose-700','bg-amber-700','bg-teal-700'];
const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Main component ───────────────────────────────────────────────────────────

export default function Groups() {
  const users       = useStore(s => s.users);
  const groups      = useStore(s => s.groups);
  const grants      = useStore(s => s.grants);
  const doors       = useStore(s => s.doors);
  const addGroup    = useStore(s => s.addGroup);
  const updateGroup = useStore(s => s.updateGroup);
  const deleteGroup = useStore(s => s.deleteGroup);
  const updateUser  = useStore(s => s.updateUser);

  const [designB, setDesignB]         = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [draft, setDraft]             = useState<GroupDraft>(emptyDraft());

  // ── Member sync ─────────────────────────────────────────────────────────────

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

  // ── Modal handlers ───────────────────────────────────────────────────────────

  function openAdd()         { setEditingGroup(null); setDraft(emptyDraft()); setModalOpen(true); }
  function openEdit(g: Group) { setEditingGroup(g); setDraft(groupToDraft(g, groups)); setModalOpen(true); }
  function closeModal()      { setModalOpen(false); setEditingGroup(null); setDraft(emptyDraft()); }

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
    if (expandedId === g.id) setExpandedId(null);
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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (designB) return <GroupsB onSwitchToA={() => setDesignB(false)} />;

  // Only show groups that were created with the new chip-based schema (have membershipRules)
  const displayGroups = groups.filter(g => g.membershipRules !== undefined);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Groups</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDesignB(true)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
          >
            Design B (Table)
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Group
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {displayGroups.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-16">No groups yet. Create one to get started.</div>
        )}
        {displayGroups.map(group => {
          const isExpanded = expandedId === group.id;
          const badges     = membershipBadges(group);
          const grantCount = (group.inheritedPermissions ?? []).length;
          const accentBorder = badges.includes('time-gated') ? 'border-l-amber-500' :
                               badges.includes('auto-enrolled') ? 'border-l-indigo-500' :
                               'border-l-slate-600';

          return (
            <div key={group.id} className={`bg-gray-900 border-l-4 ${accentBorder} border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors`}>
              {/* Card header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : group.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-white text-base">{group.name}</span>
                    {badges.map(badge => (
                      <span key={badge} className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[badge] ?? 'bg-slate-700 text-slate-300'}`}>
                        {badge}
                      </span>
                    ))}
                    {grantCount > 0 && (
                      <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        {grantCount} grant{grantCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <SentenceRow group={group} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(group); }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(group); }}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <span className="text-slate-500 text-sm ml-1">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (() => {
                const timeWindows  = rulesToTimeWindows(group.membershipRules ?? []);
                const matched      = matchGroupUsers(group, users);
                const visible      = matched.slice(0, 5);
                const hiddenCount  = matched.length - visible.length;
                const DOOR_LIMIT   = 5;

                const resolvedGrants = (group.inheritedPermissions ?? []).map(gid => {
                  const grant = grants.find(g => g.id === gid);
                  if (!grant) return null;
                  let grantDoors = grant.scope === 'zone' && grant.targetId
                    ? doors.filter(d => d.zoneId === grant.targetId)
                    : grant.scope === 'site' && grant.targetId
                      ? doors.filter(d => d.siteId === grant.targetId)
                      : doors; // global or unscoped
                  return { grant, visible: grantDoors.slice(0, DOOR_LIMIT), hidden: Math.max(0, grantDoors.length - DOOR_LIMIT) };
                }).filter(Boolean) as { grant: import('../types').Grant; visible: import('../types').Door[]; hidden: number }[];

                return (
                  <div className="border-t border-gray-800 bg-gray-950/50">
                    {group.description && (
                      <div className="px-5 pt-4">
                        <p className="text-gray-500 text-sm leading-relaxed">{group.description}</p>
                      </div>
                    )}
                    <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Live member count */}
                      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Live Members</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-white tabular-nums">{matched.length}</span>
                          <span className="text-gray-500 text-sm">{matched.length === 1 ? 'person qualifies' : 'people qualify'}</span>
                        </div>
                        {matched.length === 0 ? (
                          <p className="text-gray-600 text-xs italic">No users match the current conditions</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {visible.map((u, i) => (
                              <span key={u.id} title={u.name} className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full text-xs font-medium text-white ${AVATAR_PALETTE[i % AVATAR_PALETTE.length]}`}>
                                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold shrink-0">{getInitials(u.name)}</span>
                                {u.name.split(' ')[0]}
                              </span>
                            ))}
                            {hiddenCount > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">+{hiddenCount} more</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Access granted via */}
                      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Access Granted Via</p>
                        {resolvedGrants.length === 0 ? (
                          <p className="text-gray-600 text-sm italic">No grants assigned</p>
                        ) : (
                          <div className="space-y-3">
                            {resolvedGrants.map(({ grant, visible: gd, hidden }) => (
                              <div key={grant.id}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="text-xs font-semibold text-gray-300">{grant.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${grant.scope === 'global' ? 'bg-blue-900 text-blue-300' : grant.scope === 'site' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}>{grant.scope}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {grant.scope === 'global' && gd.length > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-900 text-emerald-300">All doors</span>
                                  ) : gd.map(d => (
                                    <span key={d.id} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-900 text-emerald-300">{d.name}</span>
                                  ))}
                                  {hidden > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-500 border border-gray-700">+{hidden}</span>}
                                </div>
                                <div className="flex gap-1">
                                  {grant.actions.map(a => (
                                    <span key={a} className="px-1.5 py-px rounded text-[10px] font-mono bg-gray-800 text-gray-400 border border-gray-700">{a}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Schedule */}
                      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">When Active</p>
                        {timeWindows.length === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-emerald-400 text-sm font-medium">Always active (24/7)</span>
                          </div>
                        ) : timeWindows.map(tw => {
                          const active = tw.days.length === 0 ? ALL_DAYS : tw.days;
                          return (
                            <div key={tw.id} className="space-y-2">
                              <div className="flex gap-1 flex-wrap">
                                {ALL_DAYS.map(day => (
                                  <span key={day} className={`text-[10px] font-bold px-1.5 py-1 rounded leading-none ${active.includes(day) ? 'bg-amber-900 text-amber-300 border border-amber-700' : 'bg-gray-800 text-gray-600 border border-gray-700'}`}>
                                    {day.slice(0, 2)}
                                  </span>
                                ))}
                              </div>
                              {!(tw.startTime === '00:00' && tw.endTime === '23:59') && (
                                <span className="px-2.5 py-1 rounded-lg bg-amber-900/60 border border-amber-800 text-amber-300 text-xs font-mono font-semibold">
                                  {tw.startTime} – {tw.endTime}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">{editingGroup ? 'Edit Group' : 'New Group'}</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Name */}
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

              {/* Who belongs? */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Who belongs in this group?</label>
                <p className="text-xs text-slate-600 mb-3">People who match all of these conditions are automatically enrolled.</p>
                <ConditionChips
                  chips={draft.conditionChips}
                  onChange={chips => setDraft(d => ({ ...d, conditionChips: chips }))}
                />
              </div>

              {/* When? */}
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

              {/* Explicit members */}
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

              {/* Grants */}
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

            {/* Modal footer */}
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
