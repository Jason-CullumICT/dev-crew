import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { User, ClearanceLevel, UserStatus } from '../types';

type SortField = 'name' | 'department' | 'role' | 'clearanceLevel' | 'status';
type SortDir = 'asc' | 'desc';

const CLEARANCE_ORDER: ClearanceLevel[] = ['Unclassified', 'Confidential', 'Secret', 'TopSecret'];

function clearanceBadge(level: ClearanceLevel) {
  const base = 'px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide';
  switch (level) {
    case 'Unclassified': return `${base} bg-gray-700 text-gray-300`;
    case 'Confidential': return `${base} bg-blue-900 text-blue-300`;
    case 'Secret': return `${base} bg-orange-900 text-orange-300`;
    case 'TopSecret': return `${base} bg-red-900 text-red-300`;
  }
}

function statusBadge(status: UserStatus) {
  const base = 'px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide';
  switch (status) {
    case 'Active': return `${base} bg-green-900 text-green-300`;
    case 'Suspended': return `${base} bg-red-900 text-red-300`;
    case 'Pending': return `${base} bg-yellow-900 text-yellow-300`;
  }
}

const PAGE_SIZE = 25;

const BLANK_USER: Omit<User, 'id'> = {
  name: '',
  email: '',
  department: '',
  role: '',
  clearanceLevel: 'Unclassified',
  status: 'Active',
  customAttributes: {},
  grantedPermissions: [],
  groupIds: [],
};

interface AttrRow {
  key: string;
  value: string;
}

function attrsToRows(attrs: Record<string, string>): AttrRow[] {
  return Object.entries(attrs).map(([key, value]) => ({ key, value }));
}

function rowsToAttrs(rows: AttrRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const r of rows) {
    if (r.key.trim()) result[r.key.trim()] = r.value;
  }
  return result;
}

interface ModalState {
  open: boolean;
  mode: 'add' | 'edit';
  userId: string | null;
  form: Omit<User, 'id'>;
  attrRows: AttrRow[];
}

export default function Users() {
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const grants = useStore((s) => s.grants);
  const addUser = useStore((s) => s.addUser);
  const updateUser = useStore((s) => s.updateUser);
  const deleteUser = useStore((s) => s.deleteUser);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: 'add',
    userId: null,
    form: { ...BLANK_USER },
    attrRows: [],
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q),
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortField === 'clearanceLevel') {
        av = CLEARANCE_ORDER.indexOf(a.clearanceLevel);
        bv = CLEARANCE_ORDER.indexOf(b.clearanceLevel);
      } else {
        av = (a[sortField] as string).toLowerCase();
        bv = (b[sortField] as string).toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function openAdd() {
    setModal({
      open: true,
      mode: 'add',
      userId: null,
      form: { ...BLANK_USER, grantedPermissions: [], groupIds: [] },
      attrRows: [],
    });
  }

  function openEdit(u: User) {
    setModal({
      open: true,
      mode: 'edit',
      userId: u.id,
      form: {
        name: u.name,
        email: u.email,
        department: u.department,
        role: u.role,
        clearanceLevel: u.clearanceLevel,
        status: u.status,
        customAttributes: { ...u.customAttributes },
        grantedPermissions: [...u.grantedPermissions],
        groupIds: [...u.groupIds],
      },
      attrRows: attrsToRows(u.customAttributes),
    });
  }

  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
  }

  function setFormField<K extends keyof Omit<User, 'id'>>(key: K, value: Omit<User, 'id'>[K]) {
    setModal((m) => ({ ...m, form: { ...m.form, [key]: value } }));
  }

  function togglePermission(grantId: string) {
    setModal((m) => {
      const perms = m.form.grantedPermissions.includes(grantId)
        ? m.form.grantedPermissions.filter((x) => x !== grantId)
        : [...m.form.grantedPermissions, grantId];
      return { ...m, form: { ...m.form, grantedPermissions: perms } };
    });
  }

  function toggleGroup(groupId: string) {
    setModal((m) => {
      const ids = m.form.groupIds.includes(groupId)
        ? m.form.groupIds.filter((x) => x !== groupId)
        : [...m.form.groupIds, groupId];
      return { ...m, form: { ...m.form, groupIds: ids } };
    });
  }

  function setAttrRow(idx: number, field: 'key' | 'value', val: string) {
    setModal((m) => {
      const rows = [...m.attrRows];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...m, attrRows: rows };
    });
  }

  function addAttrRow() {
    setModal((m) => ({ ...m, attrRows: [...m.attrRows, { key: '', value: '' }] }));
  }

  function removeAttrRow(idx: number) {
    setModal((m) => {
      const rows = m.attrRows.filter((_, i) => i !== idx);
      return { ...m, attrRows: rows };
    });
  }

  function handleSubmit() {
    const attrs = rowsToAttrs(modal.attrRows);
    const data = { ...modal.form, customAttributes: attrs };
    if (modal.mode === 'add') {
      addUser({ id: uuidv4(), ...data });
    } else if (modal.userId) {
      updateUser({ id: modal.userId, ...data });
    }
    closeModal();
  }

  function handleDelete(id: string) {
    if (expandedId === id) setExpandedId(null);
    deleteUser(id);
  }

  function getEffectivePermissions(user: User): string[] {
    const directGrantIds = new Set(user.grantedPermissions);
    const userGroups = groups.filter((g) => user.groupIds.includes(g.id));
    const groupGrantIds = userGroups.flatMap((g) => g.inheritedPermissions);
    const all = new Set([...directGrantIds, ...groupGrantIds]);
    return grants.filter((g) => all.has(g.id)).map((g) => g.name);
  }

  function SortArrow({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-gray-600">↕</span>;
    return <span className="ml-1 text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const thClass =
    'px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-200 whitespace-nowrap';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-semibold rounded transition-colors"
          >
            + Add User
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-600"
          />
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className={thClass} onClick={() => handleSort('name')}>
                  Name <SortArrow field="name" />
                </th>
                <th className={thClass} onClick={() => handleSort('department')}>
                  Department <SortArrow field="department" />
                </th>
                <th className={thClass} onClick={() => handleSort('role')}>
                  Role <SortArrow field="role" />
                </th>
                <th className={thClass} onClick={() => handleSort('clearanceLevel')}>
                  Clearance <SortArrow field="clearanceLevel" />
                </th>
                <th className={thClass} onClick={() => handleSort('status')}>
                  Status <SortArrow field="status" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
              {pageUsers.map((user) => (
                <>
                  <tr
                    key={user.id}
                    className={`border-b border-gray-800 hover:bg-gray-800/60 cursor-pointer transition-colors ${expandedId === user.id ? 'bg-gray-800/80' : ''}`}
                    onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-100">{user.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.department}</td>
                    <td className="px-4 py-3 text-gray-300">{user.role}</td>
                    <td className="px-4 py-3">
                      <span className={clearanceBadge(user.clearanceLevel)}>{user.clearanceLevel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(user.status)}>{user.status}</span>
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEdit(user)}
                        className="mr-2 p-1.5 rounded text-gray-400 hover:text-cyan-400 hover:bg-gray-700 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expandedId === user.id && (
                    <tr key={`${user.id}-detail`} className="bg-gray-850 border-b border-gray-700">
                      <td colSpan={6} className="px-6 py-4 bg-gray-900/70">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Custom Attributes */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Custom Attributes
                            </h3>
                            {Object.keys(user.customAttributes).length === 0 ? (
                              <p className="text-xs text-gray-600">None</p>
                            ) : (
                              <dl className="space-y-1">
                                {Object.entries(user.customAttributes).map(([k, v]) => (
                                  <div key={k} className="flex gap-2 text-xs">
                                    <dt className="text-gray-400 font-medium">{k}:</dt>
                                    <dd className="text-gray-300">{v}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </div>

                          {/* Direct Grants */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Direct Grants
                            </h3>
                            {user.grantedPermissions.length === 0 ? (
                              <p className="text-xs text-gray-600">None</p>
                            ) : (
                              <ul className="space-y-1">
                                {user.grantedPermissions.map((gid) => {
                                  const g = grants.find((x) => x.id === gid);
                                  return (
                                    <li key={gid} className="text-xs text-cyan-400">
                                      {g ? g.name : <span className="text-gray-600">{gid}</span>}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          {/* Group Memberships */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Group Memberships
                            </h3>
                            {user.groupIds.length === 0 ? (
                              <p className="text-xs text-gray-600">None</p>
                            ) : (
                              <ul className="space-y-1">
                                {user.groupIds.map((gid) => {
                                  const g = groups.find((x) => x.id === gid);
                                  return (
                                    <li key={gid} className="text-xs text-purple-400">
                                      {g ? g.name : <span className="text-gray-600">{gid}</span>}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          {/* Effective Permissions */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              Effective Permissions
                            </h3>
                            {(() => {
                              const perms = getEffectivePermissions(user);
                              return perms.length === 0 ? (
                                <p className="text-xs text-gray-600">None</p>
                              ) : (
                                <ul className="space-y-1">
                                  {perms.map((name) => (
                                    <li key={name} className="text-xs text-green-400">
                                      {name}
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length} users
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pg: number;
                if (totalPages <= 7) {
                  pg = i + 1;
                } else if (safePage <= 4) {
                  pg = i + 1;
                } else if (safePage >= totalPages - 3) {
                  pg = totalPages - 6 + i;
                } else {
                  pg = safePage - 3 + i;
                }
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      pg === safePage
                        ? 'bg-cyan-700 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {modal.mode === 'add' ? 'Add User' : 'Edit User'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={modal.form.name}
                    onChange={(e) => setFormField('name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="text"
                    value={modal.form.email}
                    onChange={(e) => setFormField('email', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={modal.form.department}
                    onChange={(e) => setFormField('department', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
                  <input
                    type="text"
                    value={modal.form.role}
                    onChange={(e) => setFormField('role', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-cyan-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Clearance Level</label>
                  <select
                    value={modal.form.clearanceLevel}
                    onChange={(e) => setFormField('clearanceLevel', e.target.value as ClearanceLevel)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-cyan-600"
                  >
                    <option value="Unclassified">Unclassified</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Secret">Secret</option>
                    <option value="TopSecret">TopSecret</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                  <select
                    value={modal.form.status}
                    onChange={(e) => setFormField('status', e.target.value as UserStatus)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-cyan-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Grants */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Granted Permissions</label>
                {grants.length === 0 ? (
                  <p className="text-xs text-gray-600">No grants defined.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto border border-gray-700 rounded p-2 bg-gray-800/50">
                    {grants.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={modal.form.grantedPermissions.includes(g.id)}
                          onChange={() => togglePermission(g.id)}
                          className="accent-cyan-500 w-3.5 h-3.5 shrink-0"
                        />
                        <span className="text-xs text-gray-300 group-hover:text-gray-100 truncate">
                          {g.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Groups */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Group Memberships</label>
                {groups.length === 0 ? (
                  <p className="text-xs text-gray-600">No groups defined.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto border border-gray-700 rounded p-2 bg-gray-800/50">
                    {groups.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={modal.form.groupIds.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                          className="accent-purple-500 w-3.5 h-3.5 shrink-0"
                        />
                        <span className="text-xs text-gray-300 group-hover:text-gray-100 truncate">
                          {g.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Attributes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-400">Custom Attributes</label>
                  <button
                    type="button"
                    onClick={addAttrRow}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    + Add
                  </button>
                </div>
                {modal.attrRows.length === 0 ? (
                  <p className="text-xs text-gray-600">No custom attributes.</p>
                ) : (
                  <div className="space-y-2">
                    {modal.attrRows.map((row, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Key"
                          value={row.key}
                          onChange={(e) => setAttrRow(idx, 'key', e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-600"
                        />
                        <span className="text-gray-600 text-xs">=</span>
                        <input
                          type="text"
                          placeholder="Value"
                          value={row.value}
                          onChange={(e) => setAttrRow(idx, 'value', e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:border-cyan-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttrRow(idx)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded transition-colors"
              >
                {modal.mode === 'add' ? 'Add User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
