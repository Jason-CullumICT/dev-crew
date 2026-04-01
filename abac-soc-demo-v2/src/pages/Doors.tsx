import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Door, LockState } from '../types';
import AttributeEditor from '../components/AttributeEditor';

const LOCK_STATE_OPTIONS: LockState[] = ['Locked', 'Unlocked', 'Forced', 'Held'];

function lockStateBadge(state: LockState) {
  const base = 'px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide';
  switch (state) {
    case 'Unlocked':
      return <span className={`${base} bg-green-900 text-green-300 border border-green-700`}>Unlocked</span>;
    case 'Locked':
      return <span className={`${base} bg-red-900 text-red-300 border border-red-700`}>Locked</span>;
    case 'Forced':
      return <span className={`${base} bg-orange-900 text-orange-300 border border-orange-700`}>Forced</span>;
    case 'Held':
      return <span className={`${base} bg-yellow-900 text-yellow-300 border border-yellow-700`}>Held</span>;
  }
}

interface FormState {
  name: string;
  location: string;
  description: string;
  siteId: string;
  zoneId: string;
  controllerId: string;
  lockState: LockState;
  customAttributes: Record<string, string>;
}

const emptyForm: FormState = {
  name: '',
  location: '',
  description: '',
  siteId: '',
  zoneId: '',
  controllerId: '',
  lockState: 'Locked',
  customAttributes: {},
};

export default function Doors() {
  const doors = useStore((s) => s.doors);
  const sites = useStore((s) => s.sites);
  const zones = useStore((s) => s.zones);
  const controllers = useStore((s) => s.controllers);
  const addDoor = useStore((s) => s.addDoor);
  const updateDoor = useStore((s) => s.updateDoor);
  const deleteDoor = useStore((s) => s.deleteDoor);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredDoors = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return doors;
    return doors.filter((d) => {
      const site = sites.find((s) => s.id === d.siteId);
      return (
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        (site?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [doors, sites, search]);

  const filteredZones = useMemo(
    () => zones.filter((z) => z.siteId === form.siteId),
    [zones, form.siteId],
  );

  const filteredControllers = useMemo(
    () => controllers.filter((c) => c.siteId === form.siteId),
    [controllers, form.siteId],
  );

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(door: Door) {
    setForm({
      name: door.name,
      location: door.location,
      description: door.description,
      siteId: door.siteId,
      zoneId: door.zoneId,
      controllerId: door.controllerId,
      lockState: door.lockState,
      customAttributes: door.customAttributes ?? {},
    });
    setEditingId(door.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSiteChange(siteId: string) {
    setForm((f) => ({ ...f, siteId, zoneId: '', controllerId: '' }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      updateDoor({
        id: editingId,
        name: form.name,
        location: form.location,
        description: form.description,
        siteId: form.siteId,
        zoneId: form.zoneId,
        controllerId: form.controllerId,
        lockState: form.lockState,
        customAttributes: form.customAttributes,
      });
    } else {
      addDoor({
        id: uuidv4(),
        name: form.name,
        location: form.location,
        description: form.description,
        siteId: form.siteId,
        zoneId: form.zoneId,
        controllerId: form.controllerId,
        lockState: form.lockState,
        customAttributes: form.customAttributes,
      });
    }
    closeModal();
  }

  function confirmDelete(id: string) {
    setDeleteConfirmId(id);
  }

  function handleDelete() {
    if (deleteConfirmId) {
      deleteDoor(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Doors</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Door
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, location, or site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Site</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Zone</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Controller</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Lock State</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      No doors found.
                    </td>
                  </tr>
                ) : (
                  filteredDoors.map((door) => {
                    const site = sites.find((s) => s.id === door.siteId);
                    const zone = zones.find((z) => z.id === door.zoneId);
                    const controller = controllers.find((c) => c.id === door.controllerId);
                    return (
                      <tr
                        key={door.id}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-100 font-medium">{door.name}</td>
                        <td className="px-4 py-3 text-gray-300">{door.location}</td>
                        <td className="px-4 py-3 text-gray-300">{site?.name ?? <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-gray-300">{zone?.name ?? <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-gray-300">{controller?.name ?? <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-3">{lockStateBadge(door.lockState)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(door)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => confirmDelete(door.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Edit Door' : 'Add Door'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-white transition-colors rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Door name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Physical location"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Site</label>
                <select
                  required
                  value={form.siteId}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a site...</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Zone</label>
                <select
                  value={form.zoneId}
                  onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
                  disabled={!form.siteId}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a zone...</option>
                  {filteredZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Controller</label>
                <select
                  value={form.controllerId}
                  onChange={(e) => setForm((f) => ({ ...f, controllerId: e.target.value }))}
                  disabled={!form.siteId}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a controller...</option>
                  {filteredControllers.map((controller) => (
                    <option key={controller.id} value={controller.id}>
                      {controller.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Lock State</label>
                <select
                  value={form.lockState}
                  onChange={(e) => setForm((f) => ({ ...f, lockState: e.target.value as LockState }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {LOCK_STATE_OPTIONS.map((ls) => (
                    <option key={ls} value={ls}>
                      {ls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Custom Attributes</label>
                <AttributeEditor
                  attributes={form.customAttributes ?? {}}
                  onChange={(customAttributes) => setForm((f) => ({ ...f, customAttributes }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Door'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Door</h2>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to delete this door? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
