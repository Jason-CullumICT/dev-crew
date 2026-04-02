import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { UsersRound, Plus, Edit2, Trash2, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Group } from '../types';

export const GroupsPage: React.FC = () => {
  const { groups, users, grants, addGroup, updateGroup, deleteGroup } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const handleOpenAdd = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><UsersRound className="text-blue-500"/> User Groups</h2>
        <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <Card key={group.id} className="flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{group.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{group.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(group)} className="p-1.5 text-slate-500 hover:text-blue-400"><Edit2 className="w-4 h-4"/></button>
                <button onClick={() => { if(confirm('Delete?')) deleteGroup(group.id); }} className="p-1.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>

            <div className="space-y-4 mt-auto">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <UsersRound className="w-3 h-3"/> Members ({group.memberUserIds.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.memberUserIds.slice(0, 5).map(uid => {
                    const user = users.find(u => u.id === uid);
                    return <Badge key={uid} variant="slate">{user?.name || 'Unknown'}</Badge>;
                  })}
                  {group.memberUserIds.length > 5 && <Badge variant="slate">+{group.memberUserIds.length - 5} more</Badge>}
                  {group.memberUserIds.length === 0 && <span className="text-xs text-slate-600 italic">No members</span>}
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3"/> Inherited Grants ({group.inheritedPermissions.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.inheritedPermissions.map(pid => {
                    const grant = grants.find(g => g.id === pid);
                    return <Badge key={pid} variant="blue">{grant?.name || 'Unknown'}</Badge>;
                  })}
                  {group.inheritedPermissions.length === 0 && <span className="text-xs text-slate-600 italic">No grants</span>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGroup ? 'Edit Group' : 'Add Group'} size="lg">
        <GroupForm initialData={editingGroup || undefined} onSubmit={(data) => {
          if (editingGroup) updateGroup({ ...editingGroup, ...data });
          else addGroup({ id: uuidv4(), ...data });
          setIsModalOpen(false);
        }} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

const GroupForm: React.FC<{ initialData?: Partial<Group>, onSubmit: (data: any) => void, onCancel: () => void }> = ({ initialData, onSubmit, onCancel }) => {
  const { users, grants } = useStore();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    memberUserIds: initialData?.memberUserIds || [],
    inheritedPermissions: initialData?.inheritedPermissions || [],
  });

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Group Name</label>
          <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
          <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Members</label>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto space-y-1">
            {users.map(u => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 p-1 hover:bg-slate-900 rounded">
                <input type="checkbox" checked={formData.memberUserIds.includes(u.id)} onChange={e => {
                  const ids = e.target.checked ? [...formData.memberUserIds, u.id] : formData.memberUserIds.filter(id => id !== u.id);
                  setFormData({...formData, memberUserIds: ids});
                }} className="accent-blue-600"/>
                {u.name} <span className="opacity-50">({u.department})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Grants</label>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto space-y-1">
            {grants.map(g => (
              <label key={g.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 p-1 hover:bg-slate-900 rounded">
                <input type="checkbox" checked={formData.inheritedPermissions.includes(g.id)} onChange={e => {
                  const ids = e.target.checked ? [...formData.inheritedPermissions, g.id] : formData.inheritedPermissions.filter(id => id !== g.id);
                  setFormData({...formData, inheritedPermissions: ids});
                }} className="accent-blue-600"/>
                {g.name} <span className="opacity-50">({g.scope})</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Save Group</button>
      </div>
    </form>
  );
};
