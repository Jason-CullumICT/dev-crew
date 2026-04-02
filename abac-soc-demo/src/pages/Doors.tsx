import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import type { Door, Controller } from '../types';
import { Plus, Search, MapPin, Cpu, Info, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { evaluateAccess } from '../engine/evaluateAccess';
import { v4 as uuidv4 } from 'uuid';

export const DoorsPage: React.FC = () => {
  const { doors, controllers, users, policies, groups, grants, addDoor, updateDoor, deleteDoor } = useStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingDoor, setEditingDoor] = useState<Door | null>(null);
  const [viewingDoor, setViewingDoor] = useState<Door | null>(null);

  const filteredDoors = doors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.location.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Search doors..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50"/></div>
        <button onClick={() => { setEditingDoor(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /> Add Door</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoors.map(door => {
          const controller = controllers.find(c => c.id === door.controllerId);
          return (
            <div key={door.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 group relative overflow-hidden transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-all"></div>
              <div className="flex justify-between items-start mb-4">
                <div onClick={() => { setViewingDoor(door); setIsProfileOpen(true); }} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-blue-500 cursor-pointer hover:border-blue-500 transition-all"><MapPin className="w-6 h-6" /></div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingDoor(door); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => { if(confirm('Delete?')) deleteDoor(door.id); }} className="p-2 text-slate-400 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 onClick={() => { setViewingDoor(door); setIsProfileOpen(true); }} className="text-lg font-bold text-slate-100 mb-1 cursor-pointer hover:text-blue-400 transition-all">{door.name}</h3>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2 mb-4"><Info className="w-3 h-3" /> {door.location}</div>
              <div className="space-y-3 pt-4 border-t border-slate-800/50">
                <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Controller</span><span className="text-slate-300 font-medium flex items-center gap-1"><Cpu className="w-3 h-3" /> {controller?.name || 'Unassigned'}</span></div>
                <div className="text-xs text-slate-400 italic line-clamp-2">{door.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDoor ? 'Edit Door' : 'Add Door'}>
        <DoorForm initialData={editingDoor || undefined} controllers={controllers} onSubmit={(data) => {
          if (editingDoor) updateDoor({ ...editingDoor, ...data });
          else addDoor({ id: uuidv4(), ...data, lockState: 'Locked' });
          setIsModalOpen(false);
        }} onCancel={() => setIsModalOpen(false)} />
      </Modal>

      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Door Security Profile" size="lg">
        {viewingDoor && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <h3 className="text-2xl font-bold text-slate-100">{viewingDoor.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{viewingDoor.location}</p>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-900">
                {policies.filter(p => p.doorIds.includes(viewingDoor.id)).map(p => <Badge key={p.id} variant="yellow">{p.name}</Badge>)}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Authorized Users ({users.filter(u => evaluateAccess(u, viewingDoor, policies.filter(p => p.doorIds.includes(viewingDoor.id)), groups, grants).overallGranted).length})</h4>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {users.map(user => {
                  const result = evaluateAccess(user, viewingDoor, policies.filter(p => p.doorIds.includes(viewingDoor.id)), groups, grants);
                  if (!result.overallGranted) return null;
                  return (
                    <div key={user.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div><div className="font-bold text-slate-200">{user.name}</div><div className="text-[10px] text-slate-500">{user.department} • {user.clearanceLevel}</div></div>
                      <div className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {result.matchedPolicy || 'Explicit'}</div>
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

const DoorForm: React.FC<{ initialData?: Partial<Door>, controllers: Controller[], onSubmit: (data: any) => void, onCancel: () => void }> = ({ initialData, controllers, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    location: initialData?.location || '',
    siteId: initialData?.siteId || '',
    zoneId: initialData?.zoneId || '',
    controllerId: initialData?.controllerId || (controllers[0]?.id || ''),
    description: initialData?.description || '',
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Door Name</label><input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
      <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</label><input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
      <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controller</label><select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.controllerId} onChange={e => setFormData({...formData, controllerId: e.target.value})}>{controllers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="space-y-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label><textarea rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800"><button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button><button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Save</button></div>
    </form>
  );
};
