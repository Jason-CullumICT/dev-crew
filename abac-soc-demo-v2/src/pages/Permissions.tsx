import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Grant, GrantScope, ActionType } from '../types';

const ALL_ACTIONS: ActionType[] = [
  'arm',
  'disarm',
  'unlock',
  'lockdown',
  'view_logs',
  'manage_users',
  'manage_tasks',
  'override',
];

const ACTION_LABEL: Record<ActionType, string> = {
  arm: 'arm',
  disarm: 'disarm',
  unlock: 'unlock',
  lockdown: 'lockdown',
  view_logs: 'view_logs',
  manage_users: 'manage_users',
  manage_tasks: 'manage_tasks',
  override: 'override',
};

const SCOPE_BADGE_CLASS: Record<GrantScope, string> = {
  global: 'bg-blue-900 text-blue-300 border border-blue-700',
  site: 'bg-green-900 text-green-300 border border-green-700',
  zone: 'bg-orange-900 text-orange-300 border border-orange-700',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  scope: 'global' as GrantScope,
  targetId: '',
  actions: [] as ActionType[],
};

type FormState = typeof EMPTY_FORM;

export default function Permissions() {
  const grants = useStore((s) => s.grants);
  const sites = useStore((s) => s.sites);
  const zones = useStore((s) => s.zones);
  const addGrant = useStore((s) => s.addGrant);
  const updateGrant = useStore((s) => s.updateGrant);
  const deleteGrant = useStore((s) => s.deleteGrant);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(grant: Grant) {
    setEditingId(grant.id);
    setForm({
      name: grant.name,
      description: grant.description,
      scope: grant.scope,
      targetId: grant.targetId ?? '',
      actions: [...grant.actions],
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleScopeChange(scope: GrantScope) {
    setForm((f) => ({ ...f, scope, targetId: '' }));
  }

  function handleActionToggle(action: ActionType) {
    setForm((f) => {
      const has = f.actions.includes(action);
      return {
        ...f,
        actions: has ? f.actions.filter((a) => a !== action) : [...f.actions, action],
      };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const grant: Grant = {
      id: editingId ?? uuidv4(),
      name: form.name.trim(),
      description: form.description.trim(),
      scope: form.scope,
      targetId: form.scope !== 'global' && form.targetId ? form.targetId : undefined,
      actions: form.actions,
    };
    if (editingId) {
      updateGrant(grant);
    } else {
      addGrant(grant);
    }
    closeModal();
  }

  function getTargetName(grant: Grant): string {
    if (grant.scope === 'site') {
      return sites.find((s) => s.id === grant.targetId)?.name ?? grant.targetId ?? '';
    }
    if (grant.scope === 'zone') {
      const zone = zones.find((z) => z.id === grant.targetId);
      if (!zone) return grant.targetId ?? '';
      const site = sites.find((s) => s.id === zone.siteId);
      return site ? `${zone.name} (${site.name})` : zone.name;
    }
    return '';
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white tracking-wide">Permissions</h1>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-md transition-colors"
          >
            + Add Grant
          </button>
        </div>

        {grants.length === 0 ? (
          <div className="text-gray-500 text-sm mt-12 text-center">No grants defined. Click "Add Grant" to create one.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-base truncate">{grant.name}</div>
                    {grant.description && (
                      <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{grant.description}</div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SCOPE_BADGE_CLASS[grant.scope]}`}
                  >
                    {grant.scope}
                  </span>
                </div>

                {grant.scope !== 'global' && grant.targetId && (
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500 mr-1">Target:</span>
                    {getTargetName(grant)}
                  </div>
                )}

                {grant.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {grant.actions.map((action) => (
                      <span
                        key={action}
                        className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded"
                      >
                        {ACTION_LABEL[action]}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1 mt-auto">
                  <button
                    onClick={() => openEdit(grant)}
                    className="flex-1 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded transition-colors border border-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteGrant(grant.id)}
                    className="flex-1 text-xs px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded transition-colors border border-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Grant' : 'Add Grant'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-300 font-medium">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Grant name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-300 font-medium">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-300 font-medium">Scope</label>
                <div className="flex gap-4">
                  {(['global', 'site', 'zone'] as GrantScope[]).map((scope) => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="scope"
                        value={scope}
                        checked={form.scope === scope}
                        onChange={() => handleScopeChange(scope)}
                        className="accent-blue-500"
                      />
                      <span className={`text-sm capitalize px-2 py-0.5 rounded-full ${SCOPE_BADGE_CLASS[scope]}`}>
                        {scope}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {form.scope === 'site' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-gray-300 font-medium">Site</label>
                  <select
                    value={form.targetId}
                    onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select a site --</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.scope === 'zone' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-gray-300 font-medium">Zone</label>
                  <select
                    value={form.targetId}
                    onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select a zone --</option>
                    {zones.map((zone) => {
                      const site = sites.find((s) => s.id === zone.siteId);
                      return (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}{site ? ` (${site.name})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-300 font-medium">Actions</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ACTIONS.map((action) => (
                    <label key={action} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.actions.includes(action)}
                        onChange={() => handleActionToggle(action)}
                        className="accent-blue-500 w-4 h-4"
                      />
                      <span className="text-sm text-gray-300">{action}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-md border border-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-md transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
