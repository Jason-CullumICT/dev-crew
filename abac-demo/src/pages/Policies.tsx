import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/common/Modal';
import type { Policy, Rule, Operator, LogicalOperator, Door } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, ShieldCheck, Trash2, Edit2, ChevronRight } from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const { policies, doors, addPolicy, updatePolicy, deletePolicy } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Access Policies</h2>
        <button 
          onClick={() => { setEditingPolicy(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Policy
        </button>
      </div>

      <div className="space-y-4">
        {policies.map(policy => (
          <div key={policy.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group">
            <div className="p-6 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{policy.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{policy.description}</p>
                  
                  <div className="flex gap-4 mt-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Operator: <span className="text-blue-400">{policy.logicalOperator}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Rules: <span className="text-slate-300">{policy.rules.length}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Applied to: <span className="text-slate-300">{policy.doorIds.length} Doors</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(policy)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deletePolicy(policy.id)} className="p-2 text-slate-400 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="bg-slate-950/50 px-6 py-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 mb-2">
                  <ChevronRight className="w-3 h-3" /> Attribute Logic
                </div>
                <div className="flex flex-wrap gap-2">
                  {policy.rules.map(rule => (
                    <div key={rule.id} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">
                      <span className="text-blue-400">{rule.attribute}</span>{' '}
                      <span className="text-amber-500">{rule.operator}</span>{' '}
                      <span className="text-slate-300">{Array.isArray(rule.value) ? `[${rule.value.join(',')}]` : rule.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 mb-2">
                  <ChevronRight className="w-3 h-3" /> Target Doors
                </div>
                <div className="flex flex-wrap gap-2">
                  {policy.doorIds.map(id => {
                    const door = doors.find(d => d.id === id);
                    return (
                      <span key={id} className="px-2 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 uppercase border border-slate-700">
                        {door?.name || 'Unknown'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingPolicy ? 'Edit Policy' : 'Create New Policy'}
        size="xl"
      >
        <PolicyForm 
          initialData={editingPolicy || undefined}
          doors={doors}
          onSubmit={(data) => {
            if (editingPolicy) updatePolicy({ ...editingPolicy, ...data });
            else addPolicy({ id: uuidv4(), ...data });
            setIsModalOpen(false);
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

const PolicyForm: React.FC<{ 
  initialData?: Partial<Policy>, 
  doors: Door[],
  onSubmit: (data: Omit<Policy, 'id'>) => void,
  onCancel: () => void 
}> = ({ initialData, doors, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    logicalOperator: initialData?.logicalOperator || 'AND' as LogicalOperator,
    rules: initialData?.rules || [] as Rule[],
    doorIds: initialData?.doorIds || [] as string[],
  });

  const addRule = () => {
    const newRule: Rule = { id: uuidv4(), attribute: 'user.department', operator: '==', value: '' };
    setFormData({ ...formData, rules: [...formData.rules, newRule] });
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setFormData({
      ...formData,
      rules: formData.rules.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  };

  const deleteRule = (id: string) => {
    setFormData({ ...formData, rules: formData.rules.filter(r => r.id !== id) });
  };

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Policy Name</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logical Operator</label>
            <select value={formData.logicalOperator} onChange={(e) => setFormData({...formData, logicalOperator: e.target.value as LogicalOperator})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm">
              <option value="AND">AND (All rules must match)</option>
              <option value="OR">OR (Any rule can match)</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Doors</label>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-[120px] overflow-y-auto space-y-2 scrollbar-hide">
            {doors.map(door => (
              <label key={door.id} className="flex items-center gap-2 cursor-pointer group text-slate-400 hover:text-slate-200">
                <input 
                  type="checkbox" 
                  checked={formData.doorIds.includes(door.id)} 
                  onChange={(e) => {
                    const ids = e.target.checked 
                      ? [...formData.doorIds, door.id]
                      : formData.doorIds.filter(id => id !== door.id);
                    setFormData({ ...formData, doorIds: ids });
                  }}
                  className="w-4 h-4 accent-blue-600 rounded border-slate-800 bg-slate-900" 
                />
                <span className="text-xs">{door.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attribute Rules</label>
          <button type="button" onClick={addRule} className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest transition-colors">+ Add Rule</button>
        </div>
        
        <div className="space-y-3">
          {formData.rules.map((rule, idx) => (
            <div key={rule.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] font-bold text-slate-600 w-4">{idx + 1}</div>
              <input 
                placeholder="attribute" 
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-600/50" 
                value={rule.attribute}
                onChange={(e) => updateRule(rule.id, { attribute: e.target.value })}
              />
              <select 
                className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold text-amber-500 focus:outline-none focus:ring-1 focus:ring-blue-600/50"
                value={rule.operator}
                onChange={(e) => updateRule(rule.id, { operator: e.target.value as Operator })}
              >
                <option value="==">==</option>
                <option value="!=">!=</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="IN">IN</option>
                <option value="NOT IN">NOT IN</option>
              </select>
              <input 
                placeholder="value" 
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600/50" 
                value={Array.isArray(rule.value) ? rule.value.join(',') : rule.value}
                onChange={(e) => {
                  const val = (rule.operator === 'IN' || rule.operator === 'NOT IN') 
                    ? e.target.value.split(',').map(s => s.trim())
                    : e.target.value;
                  updateRule(rule.id, { value: val });
                }}
              />
              <button type="button" onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {formData.rules.length === 0 && (
            <div className="text-center py-8 bg-slate-950/50 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs italic">
              No rules defined. This policy will always grant access to its targets.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20">Save Policy</button>
      </div>
    </form>
  );
};
