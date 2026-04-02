import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import type { User, ClearanceLevel } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, Edit2, Trash2, Mail, Building2, User as UserIcon, ShieldCheck } from 'lucide-react';
import { evaluateAccess } from '../engine/evaluateAccess';

export const UsersPage: React.FC = () => {
  const { users, doors, policies, addUser, updateUser, deleteUser } = useStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleViewProfile = (user: User) => {
    setViewingUser(user);
    setIsProfileOpen(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50"
          />
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden p-0">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50">
          <div className="col-span-4">User Details</div>
          <div className="col-span-3">Department & Role</div>
          <div className="col-span-2">Clearance</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <div ref={parentRef} className="flex-1 overflow-auto scrollbar-hide">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const user = filteredUsers[virtualRow.index];
              return (
                <div key={user.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800/50 items-center hover:bg-slate-800/30 transition-colors group">
                  <div className="col-span-4 flex items-center gap-3">
                    <div onClick={() => handleViewProfile(user)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700 cursor-pointer hover:border-blue-500 transition-all">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div onClick={() => handleViewProfile(user)} className="text-sm font-bold text-slate-200 truncate cursor-pointer hover:text-blue-400 transition-all">{user.name}</div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-slate-500" /> {user.department}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{user.role}</div>
                  </div>
                  <div className="col-span-2"><Badge clearance={user.clearanceLevel}>{user.clearanceLevel}</Badge></div>
                  <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => { if(confirm('Delete user?')) deleteUser(user.id); }} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'}>
        <UserForm initialData={editingUser || undefined} onSubmit={(data) => {
          if (editingUser) updateUser({ ...editingUser, ...data });
          else addUser({ id: uuidv4(), ...data, customAttributes: {} });
          setIsModalOpen(false);
        }} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="User Security Profile" size="lg">
        {viewingUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-6 p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500">
                <UserIcon className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-100">{viewingUser.name}</h3>
                <p className="text-slate-500 text-sm">{viewingUser.email}</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="blue">{viewingUser.department}</Badge>
                  <Badge clearance={viewingUser.clearanceLevel}>{viewingUser.clearanceLevel}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Accessible Doors</h4>
              <div className="grid grid-cols-2 gap-3">
                {doors.map(door => {
                  const doorPolicies = policies.filter(p => p.doorIds.includes(door.id));
                  const result = evaluateAccess(viewingUser, door, doorPolicies);
                  if (!result.granted) return null;
                  return (
                    <div key={door.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-300">{door.name}</div>
                      <div className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> {result.matchedPolicy}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const UserForm: React.FC<{ initialData?: Partial<User>, onSubmit: (data: any) => void, onCancel: () => void }> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    department: initialData?.department || 'Engineering',
    role: initialData?.role || 'Staff',
    clearanceLevel: initialData?.clearanceLevel || 'Unclassified' as ClearanceLevel,
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</label>
        <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
        <input required type="email" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
            <option>Engineering</option><option>Security</option><option>Operations</option><option>Executive</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clearance</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.clearanceLevel} onChange={e => setFormData({...formData, clearanceLevel: e.target.value as ClearanceLevel})}>
            <option value="Unclassified">Unclassified</option><option value="Confidential">Confidential</option><option value="Secret">Secret</option><option value="TopSecret">TopSecret</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Save</button>
      </div>
    </form>
  );
};
