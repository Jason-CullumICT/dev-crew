import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { v4 as uuidv4 } from 'uuid';
import { CheckSquare, Plus, AlignLeft, LayoutGrid, Calendar, Filter } from 'lucide-react';
import type { Task, TaskStatus } from '../types';

export const TaskBoardPage: React.FC = () => {
  const { tasks, users, sites, addTask, updateTask } = useStore();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const columns: TaskStatus[] = ['Open', 'InProgress', 'Blocked', 'Complete'];

  const handleOpenAdd = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const site = sites.find(s => s.id === task.siteId);
    const assignee = users.find(u => u.id === task.assignedToUserId);
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'Complete';

    return (
      <div 
        onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
        className={`bg-slate-900 border p-4 rounded-xl cursor-pointer hover:border-blue-500 transition-all ${isOverdue ? 'border-rose-900/50 shadow-[0_0_10px_rgba(225,29,72,0.1)]' : 'border-slate-800'}`}
      >
        <div className="flex justify-between items-start mb-2">
          <Badge variant={task.priority === 'Critical' ? 'red' : task.priority === 'High' ? 'orange' : 'slate'}>{task.priority}</Badge>
          <Badge variant="blue">{task.category}</Badge>
        </div>
        <h4 className="font-bold text-slate-200 text-sm mb-1 leading-tight">{task.title}</h4>
        <div className="text-[10px] text-slate-500 mb-3">{site?.name || 'Unknown Site'}</div>
        
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-bold border border-slate-700">
              {assignee?.name.charAt(0) || '?'}
            </div>
            <span className="text-xs text-slate-400">{assignee?.name.split(' ')[0] || 'Unassigned'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className={`w-3 h-3 ${isOverdue ? 'text-rose-500' : ''}`} />
            <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><CheckSquare className="text-emerald-500"/> Task Management</h2>
        
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-1 rounded-lg flex border border-slate-800">
            <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid className="w-4 h-4"/></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}><AlignLeft className="w-4 h-4"/></button>
          </div>
          <button className="flex items-center gap-2 text-slate-400 hover:text-slate-200 px-3 py-2 bg-slate-900 rounded-xl border border-slate-800 text-sm font-bold">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="flex-1 grid grid-cols-4 gap-6 overflow-hidden">
          {columns.map(status => {
            const colTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                  <h3 className="font-bold text-slate-300 uppercase tracking-widest text-[11px]">{status.replace(/([A-Z])/g, ' $1').trim()}</h3>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">{colTasks.length}</span>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-hide">
                  {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden p-0">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50">
            <div className="col-span-4">Task</div>
            <div className="col-span-2">Site / Zone</div>
            <div className="col-span-2">Assignee</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-2">Status</div>
          </div>
          <div className="flex-1 overflow-auto">
            {tasks.map(task => {
              const site = sites.find(s => s.id === task.siteId);
              const assignee = users.find(u => u.id === task.assignedToUserId);
              return (
                <div key={task.id} onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800/50 items-center hover:bg-slate-800/30 transition-colors cursor-pointer">
                  <div className="col-span-4">
                    <div className="text-sm font-bold text-slate-200">{task.title}</div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="blue">{task.category}</Badge>
                      <Badge variant={task.priority === 'Critical' ? 'red' : 'slate'}>{task.priority}</Badge>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-slate-400">{site?.name}</div>
                  <div className="col-span-2 text-xs text-slate-300">{assignee?.name || 'Unassigned'}</div>
                  <div className="col-span-2 text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString()}</div>
                  <div className="col-span-2"><Badge variant={task.status === 'Complete' ? 'green' : 'slate'}>{task.status}</Badge></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Edit Task' : 'New Task'} size="lg">
        {/* Simplified Task Form for Mock */}
        <form className="space-y-4" onSubmit={(e) => { 
          e.preventDefault(); 
          const target = e.target as any;
          const data: any = {
            title: target.title.value,
            description: target.desc.value,
            status: target.status.value,
            priority: target.priority.value,
            dueDate: target.dueDate.value,
            siteId: target.siteId.value,
            assignedToUserId: target.assignee.value,
            category: 'Other',
          };
          if (editingTask) updateTask({ ...editingTask, ...data });
          else addTask({ id: uuidv4(), createdByUserId: users[0]?.id, notes: [], ...data });
          setIsModalOpen(false); 
        }}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title</label>
            <input required name="title" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.title} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
            <textarea required name="desc" rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.description} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
              <select name="status" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.status || 'Open'}>
                <option value="Open">Open</option><option value="InProgress">In Progress</option><option value="Blocked">Blocked</option><option value="Complete">Complete</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority</label>
              <select name="priority" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.priority || 'Medium'}>
                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Due Date</label>
              <input required name="dueDate" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.dueDate.split('T')[0] || new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site</label>
              <select name="siteId" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.siteId}>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assignee</label>
              <select name="assignee" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm" defaultValue={editingTask?.assignedToUserId}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Save Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
