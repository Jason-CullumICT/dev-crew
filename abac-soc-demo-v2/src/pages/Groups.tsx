import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Group, GroupMember, ConditionChip, TimeWindow } from '../types';
import ConditionChips from '../components/ConditionChips';
import TimeWindowChips from '../components/TimeWindowChips';
import {
  chipToRule,
  timeWindowToRules,
  rulesToConditionChips,
  rulesToTimeWindows,
  CHIP_COLORS,
} from '../lib/chipUtils';

// ── Badge helpers ────────────────────────────────────────────────────────────

function membershipBadges(group: Group): string[] {
  const badges: string[] = [];
  const hasDynamic  = group.membershipRules.some(r => !r.leftSide.startsWith('now.'));
  const hasTime     = group.membershipRules.some(r => r.leftSide.startsWith('now.'));
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

function groupToDraft(g: Group): GroupDraft {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    conditionChips: rulesToConditionChips(g.membershipRules),
    timeWindows: rulesToTimeWindows(g.membershipRules),
    members: [...g.members],
    memberSearch: '',
    inheritedPermissions: [...g.inheritedPermissions],
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
    description: draft.description.trim(),
    members: draft.members,
    membershipRules,
    membershipLogic: 'AND',
    membershipType,
    targetEntityType: 'user',
    inheritedPermissions: draft.inheritedPermissions,
  } as Group;
}

// ── Sentence chip row (read-only card display) ───────────────────────────────

function SentenceRow({ group }: { group: Group }) {
  const chips      = useMemo(() => rulesToConditionChips(group.membershipRules), [group.membershipRules]);
  const timeWindows = useMemo(() => rulesToTimeWindows(group.membershipRules), [group.membershipRules]);

  if (chips.length === 0 && timeWindows.length === 0 && group.members.length === 0) {
    return <span className="text-slate-600 text-xs italic">No conditions defined</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      {chips.length > 0 && <span className="text-slate-500">People who are</span>}
      {chips.map((chip, i) => (
        <span key={chip.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-600 font-semibold">and</span>}
          <span className={`px-2 py-0.5 rounded-full font-medium ${CHIP_COLORS[chip.chipType] ?? 'bg-slate-700 text-slate-300'}`}>
            {chip.label}
          </span>
        </span>
      ))}
      {timeWindows.map(tw => {
        const dayPart  = tw.days.length === 0 ? '' : tw.days.join('–');
        const timePart = `${tw.startTime}–${tw.endTime}`;
        return (
          <span key={tw.id} className="flex items-center gap-1">
            <span className="text-slate-500">during</span>
            {dayPart && (
              <span className={`px-2 py-0.5 rounded-full font-medium ${CHIP_COLORS.time}`}>{dayPart}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full font-medium ${CHIP_COLORS.time}`}>{timePart}</span>
          </span>
        );
      })}
      {group.membershipType !== 'dynamic' && group.members.length > 0 && chips.length > 0 && (
        <span className="text-slate-500">+ {group.members.length} explicit</span>
      )}
      {group.membershipType === 'explicit' && group.members.length > 0 && chips.length === 0 && (
        <span className="text-slate-500">{group.members.length} hand-picked member{group.members.length !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Groups() {
  const users       = useStore(s => s.users);
  const groups      = useStore(s => s.groups);
  const grants      = useStore(s => s.grants);
  const addGroup    = useStore(s => s.addGroup);
  const updateGroup = useStore(s => s.updateGroup);
  const deleteGroup = useStore(s => s.deleteGroup);
  const updateUser  = useStore(s => s.updateUser);

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
  function openEdit(g: Group) { setEditingGroup(g); setDraft(groupToDraft(g)); setModalOpen(true); }
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Groups</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Group
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-16">No groups yet. Create one to get started.</div>
        )}
        {groups.map(group => {
          const isExpanded = expandedId === group.id;
          const badges     = membershipBadges(group);
          const grantCount = group.inheritedPermissions.length;

          return (
            <div key={group.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : group.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-white text-base">{group.name}</span>
                    {badges.map(badge => (
                      <span key={badge} className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[badge]}`}>
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
                  {group.description && (
                    <p className="text-slate-500 text-xs mt-1 truncate">{group.description}</p>
                  )}
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
              {isExpanded && (
                <div className="border-t border-gray-800 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Members</h3>
                    {group.membershipType === 'dynamic' ? (
                      <p className="text-gray-500 text-sm italic">Membership determined by conditions</p>
                    ) : group.members.length === 0 ? (
                      <p className="text-gray-600 text-sm">No explicit members</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.members.map(m => {
                          const user = users.find(u => u.id === m.entityId);
                          return (
                            <li key={m.entityId} className="text-sm text-white flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              {user?.name ?? m.entityId}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inherited Grants</h3>
                    {group.inheritedPermissions.length === 0 ? (
                      <p className="text-gray-600 text-sm">No grants</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.inheritedPermissions.map(gid => {
                          const grant = grants.find(g => g.id === gid);
                          return (
                            <li key={gid} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-sm text-white">{grant?.name ?? gid}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
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

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="What is this group for?"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
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
                          onChange={() => setDraft(d => ({
                            ...d,
                            inheritedPermissions: checked
                              ? d.inheritedPermissions.filter(id => id !== grant.id)
                              : [...d.inheritedPermissions, grant.id],
                          }))}
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
