import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, X, DoorOpen, Cpu } from 'lucide-react';
import { useStore } from '../store/store';
import type { Controller } from '../types';
import AttributeEditor from '../components/AttributeEditor';

interface FormState {
  name: string;
  location: string;
  siteId: string;
  doorIds: string[];
  customAttributes: Record<string, string>;
}

const EMPTY_FORM: FormState = {
  name: '',
  location: '',
  siteId: '',
  doorIds: [],
  customAttributes: {},
};

export default function Controllers() {
  const controllers = useStore((s) => s.controllers);
  const sites = useStore((s) => s.sites);
  const doors = useStore((s) => s.doors);
  const addController = useStore((s) => s.addController);
  const updateController = useStore((s) => s.updateController);
  const deleteController = useStore((s) => s.deleteController);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const siteById = useMemo(() => {
    const map: Record<string, string> = {};
    sites.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [sites]);

  const doorById = useMemo(() => {
    const map: Record<string, string> = {};
    doors.forEach((d) => { map[d.id] = d.name; });
    return map;
  }, [doors]);

  const filteredDoors = useMemo(
    () => form.siteId ? doors.filter((d) => d.siteId === form.siteId) : [],
    [doors, form.siteId],
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(controller: Controller) {
    setEditingId(controller.id);
    setForm({
      name: controller.name,
      location: controller.location,
      siteId: controller.siteId,
      doorIds: [...controller.doorIds],
      customAttributes: controller.customAttributes ?? {},
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSiteChange(siteId: string) {
    setForm((prev) => ({ ...prev, siteId, doorIds: [] }));
  }

  function toggleDoor(doorId: string) {
    setForm((prev) => {
      const has = prev.doorIds.includes(doorId);
      return {
        ...prev,
        doorIds: has
          ? prev.doorIds.filter((id) => id !== doorId)
          : [...prev.doorIds, doorId],
      };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.siteId) return;

    if (editingId) {
      updateController({
        id: editingId,
        name: form.name.trim(),
        location: form.location.trim(),
        siteId: form.siteId,
        doorIds: form.doorIds,
        customAttributes: form.customAttributes,
      });
    } else {
      addController({
        id: uuidv4(),
        name: form.name.trim(),
        location: form.location.trim(),
        siteId: form.siteId,
        doorIds: form.doorIds,
        customAttributes: form.customAttributes,
      });
    }
    closeModal();
  }

  function handleDelete(id: string) {
    deleteController(id);
    setConfirmDeleteId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-100">Controllers</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Controller
        </button>
      </div>

      {/* Controller list */}
      {controllers.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <Cpu size={32} className="mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400 text-sm">No controllers configured. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {controllers.map((controller) => {
            const isExpanded = expandedIds.has(controller.id);
            const managedDoors = controller.doorIds
              .map((id) => ({ id, name: doorById[id] ?? id }))
              .filter(Boolean);

            return (
              <div
                key={controller.id}
                className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpand(controller.id)}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{controller.name}</p>
                      <p className="text-xs text-slate-400 truncate">{controller.location || 'No location set'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Site</p>
                      <p className="text-sm text-slate-300 truncate">
                        {siteById[controller.siteId] ?? controller.siteId}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Managed Doors</p>
                      <p className="text-sm text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <DoorOpen size={14} className="text-slate-400" />
                          {controller.doorIds.length}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(controller)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-md transition-colors"
                      aria-label="Edit controller"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(controller.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors"
                      aria-label="Delete controller"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Expanded door list */}
                {isExpanded && (
                  <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/50">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Managed Doors
                    </p>
                    {managedDoors.length === 0 ? (
                      <p className="text-sm text-slate-500">No doors assigned to this controller.</p>
                    ) : (
                      <ul className="space-y-1">
                        {managedDoors.map((door) => (
                          <li key={door.id} className="flex items-center gap-2 text-sm text-slate-300">
                            <DoorOpen size={13} className="text-slate-500 flex-shrink-0" />
                            {door.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Delete Controller</h2>
            <p className="text-sm text-slate-400">
              Are you sure you want to delete this controller? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">
                {editingId ? 'Edit Controller' : 'Add Controller'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-md transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300" htmlFor="ctrl-name">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="ctrl-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Panel A"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300" htmlFor="ctrl-location">
                  Location
                </label>
                <input
                  id="ctrl-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Server Room B"
                />
              </div>

              {/* Site */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300" htmlFor="ctrl-site">
                  Site <span className="text-red-400">*</span>
                </label>
                <select
                  id="ctrl-site"
                  required
                  value={form.siteId}
                  onChange={(e) => handleSiteChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>Select a site...</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Door multi-select */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-300">
                  Managed Doors
                  {form.siteId && (
                    <span className="ml-2 text-xs text-slate-500 font-normal">
                      (filtered by selected site)
                    </span>
                  )}
                </p>
                {!form.siteId ? (
                  <p className="text-xs text-slate-500 italic">Select a site to see available doors.</p>
                ) : filteredDoors.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No doors found for the selected site.</p>
                ) : (
                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {filteredDoors.map((door) => {
                      const checked = form.doorIds.includes(door.id);
                      return (
                        <label
                          key={door.id}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDoor(door.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                          />
                          <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors select-none">
                            {door.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {form.doorIds.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {form.doorIds.length} door{form.doorIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Custom Attributes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Custom Attributes</label>
                <AttributeEditor
                  attributes={form.customAttributes ?? {}}
                  onChange={(customAttributes) => setForm((prev) => ({ ...prev, customAttributes }))}
                />
              </div>

              {/* Form actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Add Controller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
