import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/common/Modal';
import type { Controller } from '../types';
import { Plus, Search, Cpu, MapPin, Edit2, Trash2 } from 'lucide-react';

export const ControllersPage: React.FC = () => {
  const { controllers, doors, deleteController } = useStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingController, setEditingController] = useState<Controller | null>(null);

  const filteredControllers = controllers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search controllers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
        </div>
        <button onClick={() => { setEditingController(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold"><Plus className="w-4 h-4" /> Add Controller</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredControllers.map(ctrl => (
          <div key={ctrl.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg hover:border-slate-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-purple-500">
                  <Cpu className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">{ctrl.name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {ctrl.location}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingController(ctrl); setIsModalOpen(true); }} className="p-2 text-slate-500 hover:text-blue-400 transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteController(ctrl.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                <span>Managed Doors</span>
                <span>{ctrl.doorIds.length} Connected</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ctrl.doorIds.map(id => {
                  const door = doors.find(d => d.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      {door?.name || 'Unknown Door'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingController ? 'Edit Controller' : 'Add Controller'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); /* Implementation omitted for brevity */ setIsModalOpen(false); }}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</label>
            <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingController?.name} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</label>
            <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingController?.location} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
