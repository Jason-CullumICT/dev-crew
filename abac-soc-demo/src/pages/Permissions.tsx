import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { KeyRound, Plus, Edit2, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Grant, GrantScope, ActionType } from '../types';

export const PermissionsPage: React.FC = () => {
  const { grants, sites, zones, addGrant, updateGrant, deleteGrant } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);

  const handleOpenAdd = () => {
    setEditingGrant(null);
    setIsModalOpen(true);
  };

  const handleEdit = (grant: Grant) => {
    setEditingGrant(grant);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><KeyRound className="text-amber-500"/> Explicit Grants (Permissions)</h2>
        <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Create Grant
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {grants.map(grant => {
          let targetName = 'Global (All)';
          if (grant.scope === 'site') targetName = sites.find(s => s.id === grant.targetId)?.name || 'Unknown Site';
          if (grant.scope === 'zone') targetName = zones.find(z => z.id === grant.targetId)?.name || 'Unknown Zone';

          return (
            <Card key={grant.id}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-100">{grant.name}</h3>
                    <Badge variant={grant.scope === 'global' ? 'red' : grant.scope === 'site' ? 'blue' : 'yellow'}>{grant.scope}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{grant.description}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(grant)} className="p-1.5 text-slate-500 hover:text-blue-400"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => { if(confirm('Delete?')) deleteGrant(grant.id); }} className="p-1.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Scope</div>
                  <div className="text-sm font-medium text-slate-300">{targetName}</div>
                </div>
                
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Allowed Actions</div>
                  <div className="flex flex-wrap gap-2">
                    {grant.actions.map(a => <Badge key={a} variant="slate">{a}</Badge>)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGrant ? 'Edit Grant' : 'Add Grant'}>
        <GrantForm initialData={editingGrant || undefined} onSubmit={(data) => {
          if (editingGrant) updateGrant({ ...editingGrant, ...data });
          else addGrant({ id: uuidv4(), ...data });
          setIsModalOpen(false);
        }} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

const AVAILABLE_ACTIONS: ActionType[] = ['arm', 'disarm', 'unlock', 'lockdown', 'view_logs', 'manage_users', 'manage_tasks', 'override'];

const GrantForm: React.FC<{ initialData?: Partial<Grant>, onSubmit: (data: any) => void, onCancel: () => void }> = ({ initialData, onSubmit, onCancel }) => {
  const { sites, zones } = useStore();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    scope: initialData?.scope || 'global' as GrantScope,
    targetId: initialData?.targetId || '',
    actions: initialData?.actions || [],
  });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grant Name</label>
        <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
        <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scope</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value as GrantScope, targetId: ''})}>
            <option value="global">Global</option><option value="site">Site Specific</option><option value="zone">Zone Specific</option>
          </select>
        </div>
        {formData.scope !== 'global' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target ID</label>
            <select required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.targetId} onChange={e => setFormData({...formData, targetId: e.target.value})}>
              <option value="">-- Select Target --</option>
              {formData.scope === 'site' && sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {formData.scope === 'zone' && zones.map(z => <option key={z.id} value={z.id}>{z.name} (Site: {sites.find(s=>s.id===z.siteId)?.name})</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-4">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Allowed Actions</label>
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
          {AVAILABLE_ACTIONS.map(action => (
            <label key={action} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input type="checkbox" checked={formData.actions.includes(action)} onChange={e => {
                const acts = e.target.checked ? [...formData.actions, action] : formData.actions.filter(a => a !== action);
                setFormData({...formData, actions: acts});
              }} className="accent-blue-600"/>
              {action}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Save Grant</button>
      </div>
    </form>
  );
};
