import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Policy, Rule } from '../types';
import RuleBuilder from '../components/RuleBuilder';

interface PolicyDraft {
  name: string;
  description: string;
  logicalOperator: 'AND' | 'OR';
  rules: Rule[];
  doorIds: string[];
}

const emptyDraft = (): PolicyDraft => ({
  name: '',
  description: '',
  logicalOperator: 'AND',
  rules: [],
  doorIds: [],
});

const policyToDraft = (policy: Policy): PolicyDraft => ({
  name: policy.name,
  description: policy.description,
  logicalOperator: policy.logicalOperator,
  rules: policy.rules.map((r) => ({ ...r })),
  doorIds: [...policy.doorIds],
});

export default function Policies() {
  const policies = useStore((s) => s.policies);
  const doors = useStore((s) => s.doors);
  const addPolicy = useStore((s) => s.addPolicy);
  const updatePolicy = useStore((s) => s.updatePolicy);
  const deletePolicy = useStore((s) => s.deletePolicy);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PolicyDraft>(emptyDraft());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  };

  const openEdit = (policy: Policy) => {
    setEditingId(policy.id);
    setDraft(policyToDraft(policy));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const saveDraft = () => {
    if (editingId) {
      updatePolicy({
        id: editingId,
        name: draft.name,
        description: draft.description,
        logicalOperator: draft.logicalOperator,
        rules: draft.rules,
        doorIds: draft.doorIds,
      });
    } else {
      addPolicy({
        id: uuidv4(),
        name: draft.name,
        description: draft.description,
        logicalOperator: draft.logicalOperator,
        rules: draft.rules,
        doorIds: draft.doorIds,
      });
    }
    closeModal();
  };

  const toggleDoorId = (doorId: string) => {
    setDraft((d) => ({
      ...d,
      doorIds: d.doorIds.includes(doorId)
        ? d.doorIds.filter((id) => id !== doorId)
        : [...d.doorIds, doorId],
    }));
  };

  const isFormValid = draft.name.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">ABAC Policies</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add Policy
          </button>
        </div>

        {policies.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No policies defined.</p>
            <p className="text-sm mt-1">Click "Add Policy" to create your first ABAC policy.</p>
          </div>
        )}

        <div className="space-y-4">
          {policies.map((policy) => {
            const expanded = expandedIds.has(policy.id);
            const assignedDoors = doors.filter((d) => policy.doorIds.includes(d.id));

            return (
              <div
                key={policy.id}
                className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => toggleExpand(policy.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-white font-semibold text-base truncate">
                          {policy.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            policy.logicalOperator === 'AND'
                              ? 'bg-blue-900 text-blue-300 border border-blue-700'
                              : 'bg-purple-900 text-purple-300 border border-purple-700'
                          }`}
                        >
                          {policy.logicalOperator}
                        </span>
                      </div>
                      {policy.description && (
                        <p className="text-gray-400 text-sm mt-1 truncate">{policy.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{policy.rules.length} rule{policy.rules.length !== 1 ? 's' : ''}</span>
                        <span>{assignedDoors.length} door{assignedDoors.length !== 1 ? 's' : ''}</span>
                        <span className={`transition-transform ${expanded ? 'rotate-180' : ''} inline-block`}>
                          ▾
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(policy)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(policy.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-400 bg-gray-800 hover:bg-red-950 border border-gray-700 hover:border-red-800 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-800 px-5 pb-5 pt-4 space-y-4">
                    {policy.rules.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          Rules
                        </p>
                        <div className="space-y-2">
                          {policy.rules.map((rule, idx) => (
                            <div
                              key={rule.id}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              {idx > 0 && (
                                <span className="text-xs font-bold text-gray-500 w-8 text-center">
                                  {policy.logicalOperator}
                                </span>
                              )}
                              {idx === 0 && <span className="w-8" />}
                              <span className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm font-mono">
                                <span className="text-cyan-400">{rule.leftSide}</span>
                                <span className="text-yellow-400">{rule.operator}</span>
                                <span className="text-green-400">
                                  {Array.isArray(rule.rightSide) ? rule.rightSide.join(', ') : rule.rightSide}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignedDoors.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          Assigned Doors
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {assignedDoors.map((door) => (
                            <span
                              key={door.id}
                              className="inline-flex items-center px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300"
                            >
                              {door.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {policy.rules.length === 0 && assignedDoors.length === 0 && (
                      <p className="text-sm text-gray-600 italic">No rules or door assignments.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-2">Delete Policy</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete "
              {policies.find((p) => p.id === deleteConfirmId)?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deletePolicy(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-lg">
                {editingId ? 'Edit Policy' : 'Add Policy'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-300 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Policy name"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Logical Operator
                </label>
                <div className="flex gap-3">
                  {(['AND', 'OR'] as const).map((op) => (
                    <label
                      key={op}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${
                        draft.logicalOperator === op
                          ? op === 'AND'
                            ? 'bg-blue-900 border-blue-600 text-blue-200'
                            : 'bg-purple-900 border-purple-600 text-purple-200'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="logicalOperator"
                        value={op}
                        checked={draft.logicalOperator === op}
                        onChange={() => setDraft((d) => ({ ...d, logicalOperator: op }))}
                        className="sr-only"
                      />
                      {op}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Rules</label>
                <RuleBuilder
                  rules={draft.rules}
                  onChange={(rules) => setDraft((d) => ({ ...d, rules }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Assigned Doors
                </label>
                {doors.length === 0 && (
                  <p className="text-xs text-gray-600 italic">No doors available.</p>
                )}
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {doors.map((door) => {
                    const checked = draft.doorIds.includes(door.id);
                    return (
                      <label
                        key={door.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                          checked
                            ? 'bg-indigo-900 border-indigo-600 text-indigo-200'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDoorId(door.id)}
                          className="sr-only"
                        />
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-indigo-500 border-indigo-400' : 'border-gray-600'
                          }`}
                        >
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
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={!isFormValid}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
