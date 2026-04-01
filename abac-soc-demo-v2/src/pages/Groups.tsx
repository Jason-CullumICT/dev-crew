import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Group, User, Grant } from '../types';

interface FormState {
  name: string;
  description: string;
  memberUserIds: string[];
  inheritedPermissions: string[];
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  memberUserIds: [],
  inheritedPermissions: [],
});

export default function Groups() {
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const grants = useStore((s) => s.grants);
  const addGroup = useStore((s) => s.addGroup);
  const updateGroup = useStore((s) => s.updateGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const updateUser = useStore((s) => s.updateUser);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [memberSearch, setMemberSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q),
    );
  }, [users, memberSearch]);

  function openAdd() {
    setEditingGroup(null);
    setForm(emptyForm());
    setMemberSearch('');
    setModalOpen(true);
  }

  function openEdit(g: Group) {
    setEditingGroup(g);
    setForm({
      name: g.name,
      description: g.description,
      memberUserIds: [...g.memberUserIds],
      inheritedPermissions: [...g.inheritedPermissions],
    });
    setMemberSearch('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingGroup(null);
    setForm(emptyForm());
    setMemberSearch('');
  }

  function syncUserGroupIds(
    groupId: string,
    oldMemberIds: string[],
    newMemberIds: string[],
  ) {
    const added = newMemberIds.filter((id) => !oldMemberIds.includes(id));
    const removed = oldMemberIds.filter((id) => !newMemberIds.includes(id));

    added.forEach((userId) => {
      const user = users.find((u) => u.id === userId);
      if (user && !user.groupIds.includes(groupId)) {
        updateUser({ ...user, groupIds: [...user.groupIds, groupId] });
      }
    });

    removed.forEach((userId) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        updateUser({
          ...user,
          groupIds: user.groupIds.filter((gid) => gid !== groupId),
        });
      }
    });
  }

  function handleSave() {
    if (!form.name.trim()) return;

    if (editingGroup) {
      const updated: Group = {
        ...editingGroup,
        name: form.name.trim(),
        description: form.description.trim(),
        memberUserIds: form.memberUserIds,
        inheritedPermissions: form.inheritedPermissions,
      };
      updateGroup(updated);
      syncUserGroupIds(
        editingGroup.id,
        editingGroup.memberUserIds,
        form.memberUserIds,
      );
    } else {
      const newGroup: Group = {
        id: uuidv4(),
        name: form.name.trim(),
        description: form.description.trim(),
        memberUserIds: form.memberUserIds,
        inheritedPermissions: form.inheritedPermissions,
      };
      addGroup(newGroup);
      syncUserGroupIds(newGroup.id, [], form.memberUserIds);
    }

    closeModal();
  }

  function handleDelete(g: Group) {
    syncUserGroupIds(g.id, g.memberUserIds, []);
    deleteGroup(g.id);
    if (expandedId === g.id) setExpandedId(null);
  }

  function toggleMember(userId: string) {
    setForm((prev) =>
      prev.memberUserIds.includes(userId)
        ? { ...prev, memberUserIds: prev.memberUserIds.filter((id) => id !== userId) }
        : { ...prev, memberUserIds: [...prev.memberUserIds, userId] },
    );
  }

  function toggleGrant(grantId: string) {
    setForm((prev) =>
      prev.inheritedPermissions.includes(grantId)
        ? {
            ...prev,
            inheritedPermissions: prev.inheritedPermissions.filter(
              (id) => id !== grantId,
            ),
          }
        : {
            ...prev,
            inheritedPermissions: [...prev.inheritedPermissions, grantId],
          },
    );
  }

  function getUserById(id: string): User | undefined {
    return users.find((u) => u.id === id);
  }

  function getGrantById(id: string): Grant | undefined {
    return grants.find((g) => g.id === id);
  }

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
                onClick={() =>
                  setExpandedId(isExpanded ? null : group.id)
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-white text-base">
                      {group.name}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 text-xs font-medium">
                      {group.memberUserIds.length} member
                      {group.memberUserIds.length !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 text-xs font-medium">
                      {group.inheritedPermissions.length} grant
                      {group.inheritedPermissions.length !== 1 ? 's' : ''}
                    </span>
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
                    {group.memberUserIds.length === 0 ? (
                      <p className="text-gray-600 text-sm">No members</p>
                    ) : (
                      <ul className="space-y-2">
                        {group.memberUserIds.map((uid) => {
                          const u = getUserById(uid);
                          return (
                            <li key={uid} className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-indigo-800 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                                {u ? u.name.charAt(0).toUpperCase() : '?'}
                              </span>
                              <div>
                                <span className="text-sm text-white">
                                  {u ? u.name : uid}
                                </span>
                                {u && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    {u.department}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
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
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {editingGroup ? 'Edit Group' : 'Add Group'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-300 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Group name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description"
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Member Picker */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Members ({form.memberUserIds.length} selected)
                </label>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 mb-2"
                />
                <div className="bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-700">
                  {filteredUsers.length === 0 && (
                    <div className="px-3 py-3 text-gray-500 text-sm text-center">
                      No users match
                    </div>
                  )}
                  {filteredUsers.map((u) => {
                    const checked = form.memberUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(u.id)}
                          className="w-4 h-4 accent-indigo-500 shrink-0"
                        />
                        <span className="text-sm text-white">{u.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {u.department}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Grant Picker */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Grants ({form.inheritedPermissions.length} selected)
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-700">
                  {grants.length === 0 && (
                    <div className="px-3 py-3 text-gray-500 text-sm text-center">
                      No grants available
                    </div>
                  )}
                  {grants.map((grant) => {
                    const checked = form.inheritedPermissions.includes(grant.id);
                    return (
                      <label
                        key={grant.id}
                        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGrant(grant.id)}
                          className="w-4 h-4 accent-emerald-500 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-white block">
                            {grant.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-500 capitalize">
                              {grant.scope}
                            </span>
                            {grant.actions.length > 0 && (
                              <span className="text-xs text-gray-600">
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
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
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
