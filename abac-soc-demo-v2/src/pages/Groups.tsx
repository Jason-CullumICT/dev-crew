import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Group, GroupMember, Grant, Rule } from '../types';
import RuleBuilder from '../components/RuleBuilder';

interface GroupDraft {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  membershipRules: Rule[];
  membershipLogic: 'AND' | 'OR';
  membershipType: 'explicit' | 'dynamic' | 'hybrid';
  targetEntityType: 'user' | 'door' | 'zone' | 'site' | 'controller' | 'any';
  inheritedPermissions: string[];
}

const emptyDraft = (): GroupDraft => ({
  id: '',
  name: '',
  description: '',
  members: [],
  membershipRules: [],
  membershipLogic: 'AND',
  membershipType: 'explicit',
  targetEntityType: 'user',
  inheritedPermissions: [],
});

const ENTITY_TYPE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'door', label: 'Door' },
  { value: 'zone', label: 'Zone' },
  { value: 'site', label: 'Site' },
  { value: 'controller', label: 'Controller' },
  { value: 'any', label: 'Any' },
] as const;

const MEMBERSHIP_TYPE_OPTIONS = [
  { value: 'explicit', label: 'Explicit' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

const MEMBERSHIP_TYPE_COLORS: Record<GroupDraft['membershipType'], string> = {
  explicit: 'bg-blue-900 text-blue-300',
  dynamic: 'bg-purple-900 text-purple-300',
  hybrid: 'bg-amber-900 text-amber-300',
};

const TARGET_ENTITY_COLORS: Record<GroupDraft['targetEntityType'], string> = {
  user: 'bg-indigo-900 text-indigo-300',
  door: 'bg-teal-900 text-teal-300',
  zone: 'bg-cyan-900 text-cyan-300',
  site: 'bg-green-900 text-green-300',
  controller: 'bg-rose-900 text-rose-300',
  any: 'bg-slate-700 text-slate-300',
};

function memberCountLabel(group: Group): string {
  if (group.membershipType === 'dynamic') return 'Dynamic (rule-based)';
  if (group.membershipType === 'hybrid') {
    return `${group.members.length} explicit + dynamic rules`;
  }
  const count = group.members.length;
  return `${count} explicit member${count !== 1 ? 's' : ''}`;
}

export default function Groups() {
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const grants = useStore((s) => s.grants);
  const doors = useStore((s) => s.doors);
  const zones = useStore((s) => s.zones);
  const sites = useStore((s) => s.sites);
  const controllers = useStore((s) => s.controllers);

  const addGroup = useStore((s) => s.addGroup);
  const updateGroup = useStore((s) => s.updateGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const updateUser = useStore((s) => s.updateUser);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft());
  const [memberSearch, setMemberSearch] = useState('');

  // Build entity list for a given type
  function getEntitiesForType(type: string): { id: string; label: string }[] {
    switch (type) {
      case 'user':
        return users.map((u) => ({ id: u.id, label: u.name }));
      case 'door':
        return doors.map((d) => ({ id: d.id, label: d.name }));
      case 'zone':
        return zones.map((z) => ({ id: z.id, label: z.name }));
      case 'site':
        return sites.map((s) => ({ id: s.id, label: s.name }));
      case 'controller':
        return controllers.map((c) => ({ id: c.id, label: c.name }));
      default:
        return [];
    }
  }

  // Determine which entity types to show in the member picker
  const pickerEntityTypes = useMemo((): GroupMember['entityType'][] => {
    if (draft.targetEntityType === 'any') {
      return ['user', 'door', 'zone', 'site', 'controller'];
    }
    return [draft.targetEntityType];
  }, [draft.targetEntityType]);

  // Filter entities per type by the search string
  function filteredEntities(type: GroupMember['entityType']) {
    const q = memberSearch.toLowerCase();
    return getEntitiesForType(type).filter((e) =>
      e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
    );
  }

  function toggleMember(entityType: GroupMember['entityType'], entityId: string) {
    const exists = draft.members.some(
      (m) => m.entityType === entityType && m.entityId === entityId,
    );
    if (exists) {
      setDraft((d) => ({
        ...d,
        members: d.members.filter(
          (m) => !(m.entityType === entityType && m.entityId === entityId),
        ),
      }));
    } else {
      setDraft((d) => ({
        ...d,
        members: [...d.members, { entityType, entityId }],
      }));
    }
  }

  function toggleGrant(grantId: string) {
    setDraft((d) =>
      d.inheritedPermissions.includes(grantId)
        ? {
            ...d,
            inheritedPermissions: d.inheritedPermissions.filter(
              (id) => id !== grantId,
            ),
          }
        : { ...d, inheritedPermissions: [...d.inheritedPermissions, grantId] },
    );
  }

  function openAdd() {
    setEditingGroup(null);
    setDraft(emptyDraft());
    setMemberSearch('');
    setModalOpen(true);
  }

  function openEdit(g: Group) {
    setEditingGroup(g);
    setDraft({
      id: g.id,
      name: g.name,
      description: g.description,
      members: [...g.members],
      membershipRules: [...g.membershipRules],
      membershipLogic: g.membershipLogic,
      membershipType: g.membershipType,
      targetEntityType: g.targetEntityType,
      inheritedPermissions: [...g.inheritedPermissions],
    });
    setMemberSearch('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingGroup(null);
    setDraft(emptyDraft());
    setMemberSearch('');
  }

  // Sync user.groupIds when explicit user members change
  function syncUserGroupIds(
    groupId: string,
    oldMembers: GroupMember[],
    newMembers: GroupMember[],
  ) {
    // Read live state at call time, not stale render-closure value
    const liveUsers = useStore.getState().users;

    const oldUserIds = oldMembers
      .filter((m) => m.entityType === 'user')
      .map((m) => m.entityId);
    const newUserIds = newMembers
      .filter((m) => m.entityType === 'user')
      .map((m) => m.entityId);

    const added = newUserIds.filter((id) => !oldUserIds.includes(id));
    const removed = oldUserIds.filter((id) => !newUserIds.includes(id));

    added.forEach((userId) => {
      const user = liveUsers.find((u) => u.id === userId);
      if (user && !user.groupIds.includes(groupId)) {
        updateUser({ ...user, groupIds: [...user.groupIds, groupId] });
      }
    });

    removed.forEach((userId) => {
      const user = liveUsers.find((u) => u.id === userId);
      if (user) {
        updateUser({
          ...user,
          groupIds: user.groupIds.filter((gid) => gid !== groupId),
        });
      }
    });
  }

  function handleSave() {
    if (!draft.name.trim()) return;

    if (editingGroup) {
      const updated: Group = {
        ...editingGroup,
        name: draft.name.trim(),
        description: draft.description.trim(),
        members: draft.members,
        membershipRules: draft.membershipRules,
        membershipLogic: draft.membershipLogic,
        membershipType: draft.membershipType,
        targetEntityType: draft.targetEntityType,
        inheritedPermissions: draft.inheritedPermissions,
      };
      updateGroup(updated);
      syncUserGroupIds(editingGroup.id, editingGroup.members, draft.members);
    } else {
      const newGroup: Group = {
        id: uuidv4(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        members: draft.members,
        membershipRules: draft.membershipRules,
        membershipLogic: draft.membershipLogic,
        membershipType: draft.membershipType,
        targetEntityType: draft.targetEntityType,
        inheritedPermissions: draft.inheritedPermissions,
      };
      addGroup(newGroup);
      syncUserGroupIds(newGroup.id, [], draft.members);
    }

    closeModal();
  }

  function handleDelete(g: Group) {
    syncUserGroupIds(g.id, g.members, []);
    deleteGroup(g.id);
    if (expandedId === g.id) setExpandedId(null);
  }

  function getGrantById(id: string): Grant | undefined {
    return grants.find((g) => g.id === id);
  }

  function getLabelForMember(m: GroupMember): string {
    const entities = getEntitiesForType(m.entityType);
    return entities.find((e) => e.id === m.entityId)?.label ?? m.entityId;
  }

  const showMemberPicker =
    draft.membershipType === 'explicit' || draft.membershipType === 'hybrid';
  const showRuleBuilder =
    draft.membershipType === 'dynamic' || draft.membershipType === 'hybrid';
  const showGrantPicker =
    draft.targetEntityType === 'user' || draft.targetEntityType === 'any';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Groups</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Group
        </button>
      </div>

      {/* Group List */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-12">
            No groups defined. Create one to get started.
          </div>
        )}
        {groups.map((group) => {
          const isExpanded = expandedId === group.id;
          return (
            <div
              key={group.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Card Header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : group.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-base">
                      {group.name}
                    </span>
                    {/* Target entity type badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        TARGET_ENTITY_COLORS[group.targetEntityType]
                      }`}
                    >
                      {group.targetEntityType}
                    </span>
                    {/* Membership type badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        MEMBERSHIP_TYPE_COLORS[group.membershipType]
                      }`}
                    >
                      {group.membershipType.charAt(0).toUpperCase() +
                        group.membershipType.slice(1)}
                    </span>
                    {/* Member count badge */}
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      {memberCountLabel(group)}
                    </span>
                    {group.inheritedPermissions.length > 0 && (
                      <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        {group.inheritedPermissions.length} grant
                        {group.inheritedPermissions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-gray-400 text-sm mt-1 truncate">
                      {group.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(group);
                    }}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(group);
                    }}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <span className="text-gray-500 text-sm ml-1">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-gray-800 px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Members */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Members
                    </h3>
                    {group.membershipType === 'dynamic' ? (
                      <p className="text-gray-500 text-sm italic">
                        Membership determined by rules
                      </p>
                    ) : group.members.length === 0 ? (
                      <p className="text-gray-600 text-sm">No members</p>
                    ) : (
                      <ul className="space-y-2">
                        {group.members.map((m) => (
                          <li key={`${m.entityType}-${m.entityId}`} className="flex items-center gap-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                TARGET_ENTITY_COLORS[
                                  m.entityType as GroupMember['entityType']
                                ]
                              }`}
                            >
                              {m.entityType}
                            </span>
                            <span className="text-sm text-white">
                              {getLabelForMember(m)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(group.membershipType === 'dynamic' ||
                      group.membershipType === 'hybrid') &&
                      group.membershipRules.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Rules ({group.membershipLogic})
                          </h4>
                          <ul className="space-y-1">
                            {group.membershipRules.map((r) => (
                              <li
                                key={r.id}
                                className="text-xs text-gray-400 font-mono bg-slate-900 rounded px-2 py-1"
                              >
                                {r.leftSide} {r.operator}{' '}
                                {Array.isArray(r.rightSide)
                                  ? r.rightSide.join(', ')
                                  : r.rightSide}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>

                  {/* Grants */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Inherited Grants
                    </h3>
                    {group.inheritedPermissions.length === 0 ? (
                      <p className="text-gray-600 text-sm">No grants</p>
                    ) : (
                      <ul className="space-y-2">
                        {group.inheritedPermissions.map((gid) => {
                          const grant = getGrantById(gid);
                          return (
                            <li key={gid} className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-sm text-white">
                                {grant ? grant.name : gid}
                              </span>
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
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">
                {editingGroup ? 'Edit Group' : 'Add Group'}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-300 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="Group name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, description: e.target.value }))
                  }
                  placeholder="Optional description"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Target Entity Type */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Target Entity Type
                </label>
                <select
                  value={draft.targetEntityType}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      targetEntityType: e.target
                        .value as GroupDraft['targetEntityType'],
                      // Reset members when target type changes
                      members: [],
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {ENTITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Membership Type */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Membership Type
                </label>
                <select
                  value={draft.membershipType}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      membershipType: e.target
                        .value as GroupDraft['membershipType'],
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {MEMBERSHIP_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member Picker (explicit and hybrid) */}
              {showMemberPicker && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Members ({draft.members.length} selected)
                  </label>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search entities..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 mb-2"
                  />
                  <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-700">
                    {pickerEntityTypes.map((entityType) => {
                      const entities = filteredEntities(entityType);
                      if (entities.length === 0) return null;
                      return (
                        <div key={entityType}>
                          {draft.targetEntityType === 'any' && (
                            <div className="px-3 py-1 bg-slate-800 sticky top-0">
                              <span
                                className={`text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${TARGET_ENTITY_COLORS[entityType]}`}
                              >
                                {entityType}
                              </span>
                            </div>
                          )}
                          {entities.map((entity) => {
                            const checked = draft.members.some(
                              (m) =>
                                m.entityType === entityType &&
                                m.entityId === entity.id,
                            );
                            return (
                              <label
                                key={entity.id}
                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleMember(entityType, entity.id)
                                  }
                                  className="w-4 h-4 accent-indigo-500 shrink-0"
                                />
                                <span className="text-sm text-slate-100">
                                  {entity.label}
                                </span>
                                <span className="text-xs text-slate-500 ml-auto font-mono">
                                  {entity.id.slice(0, 8)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
                    {pickerEntityTypes.every(
                      (t) => filteredEntities(t).length === 0,
                    ) && (
                      <div className="px-3 py-3 text-slate-500 text-sm text-center">
                        No entities match
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Membership Rules (dynamic and hybrid) */}
              {showRuleBuilder && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Membership Rules
                    </label>
                    {/* AND/OR toggle */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      {(['AND', 'OR'] as const).map((logic) => (
                        <button
                          key={logic}
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({ ...d, membershipLogic: logic }))
                          }
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            draft.membershipLogic === logic
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {logic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RuleBuilder
                    rules={draft.membershipRules}
                    onChange={(rules) =>
                      setDraft((d) => ({ ...d, membershipRules: rules }))
                    }
                  />
                </div>
              )}

              {/* Grant Picker (user or any targets) */}
              {showGrantPicker && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Inherited Grants ({draft.inheritedPermissions.length}{' '}
                    selected)
                  </label>
                  <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-700">
                    {grants.length === 0 && (
                      <div className="px-3 py-3 text-slate-500 text-sm text-center">
                        No grants available
                      </div>
                    )}
                    {grants.map((grant) => {
                      const checked = draft.inheritedPermissions.includes(
                        grant.id,
                      );
                      return (
                        <label
                          key={grant.id}
                          className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGrant(grant.id)}
                            className="w-4 h-4 accent-emerald-500 shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-100 block">
                              {grant.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500 capitalize">
                                {grant.scope}
                              </span>
                              {grant.actions.length > 0 && (
                                <span className="text-xs text-slate-600">
                                  {grant.actions.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
              >
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
