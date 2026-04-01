import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/store';
import type { Task, TaskStatus, TaskPriority, TaskCategory, TaskNote } from '../types';

type ViewMode = 'kanban' | 'list';

const KANBAN_COLUMNS: TaskStatus[] = ['Open', 'InProgress', 'Blocked', 'Complete'];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Medium: 'bg-green-500/20 text-green-300 border border-green-500/30',
  High: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  Critical: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  Open: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  InProgress: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Blocked: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  Complete: 'bg-green-500/20 text-green-300 border border-green-500/30',
  Cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

const COLUMN_HEADER: Record<TaskStatus, string> = {
  Open: 'text-gray-300',
  InProgress: 'text-blue-300',
  Blocked: 'text-orange-300',
  Complete: 'text-green-300',
  Cancelled: 'text-red-300',
};

const COLUMN_BORDER: Record<TaskStatus, string> = {
  Open: 'border-gray-600',
  InProgress: 'border-blue-600',
  Blocked: 'border-orange-600',
  Complete: 'border-green-600',
  Cancelled: 'border-red-600',
};

interface TaskFormState {
  title: string;
  description: string;
  siteId: string;
  zoneId: string;
  assignedToUserId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  category: TaskCategory;
}

const emptyForm = (): TaskFormState => ({
  title: '',
  description: '',
  siteId: '',
  zoneId: '',
  assignedToUserId: '',
  priority: 'Medium',
  status: 'Open',
  dueDate: '',
  category: 'Inspection',
});

export default function Tasks() {
  const tasks = useStore((s) => s.tasks);
  const sites = useStore((s) => s.sites);
  const zones = useStore((s) => s.zones);
  const users = useStore((s) => s.users);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<TaskFormState>(emptyForm());
  const [noteText, setNoteText] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<TaskStatus | 'All'>('All');

  const filteredZones = useMemo(
    () => zones.filter((z) => z.siteId === form.siteId),
    [zones, form.siteId],
  );

  const filteredListTasks = useMemo(() => {
    let result = tasks;
    if (listStatusFilter !== 'All') {
      result = result.filter((t) => t.status === listStatusFilter);
    }
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q),
      );
    }
    return result;
  }, [tasks, listSearch, listStatusFilter]);

  function getSiteName(id: string) {
    return sites.find((s) => s.id === id)?.name ?? '—';
  }

  function getUserName(id?: string) {
    if (!id) return '—';
    return users.find((u) => u.id === id)?.name ?? '—';
  }

  function openAdd() {
    setForm(emptyForm());
    setNoteText('');
    setSelectedTask(null);
    setIsAdding(true);
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description,
      siteId: task.siteId,
      zoneId: task.zoneId ?? '',
      assignedToUserId: task.assignedToUserId ?? '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      category: task.category,
    });
    setNoteText('');
    setSelectedTask(task);
    setIsAdding(false);
  }

  function closeModal() {
    setSelectedTask(null);
    setIsAdding(false);
    setNoteText('');
  }

  function handleFormChange(field: keyof TaskFormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'siteId') next.zoneId = '';
      return next;
    });
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const createdByUserId = users[0]?.id ?? '';

    if (isAdding) {
      const newTask: Task = {
        id: uuidv4(),
        title: form.title,
        description: form.description,
        siteId: form.siteId,
        zoneId: form.zoneId || undefined,
        assignedToUserId: form.assignedToUserId || undefined,
        createdByUserId,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate,
        category: form.category,
        notes: [],
      };
      addTask(newTask);
    } else if (selectedTask) {
      updateTask({
        ...selectedTask,
        title: form.title,
        description: form.description,
        siteId: form.siteId,
        zoneId: form.zoneId || undefined,
        assignedToUserId: form.assignedToUserId || undefined,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate,
        category: form.category,
      });
    }
    closeModal();
  }

  function handleAddNote() {
    if (!noteText.trim() || !selectedTask) return;
    const authorId = users[0]?.id ?? '';
    const note: TaskNote = {
      id: uuidv4(),
      text: noteText.trim(),
      authorId,
      timestamp: new Date().toISOString(),
    };
    updateTask({ ...selectedTask, notes: [...selectedTask.notes, note] });
    setSelectedTask((prev) => (prev ? { ...prev, notes: [...prev.notes, note] } : prev));
    setNoteText('');
  }

  function handleDelete() {
    if (!selectedTask) return;
    deleteTask(selectedTask.id);
    closeModal();
  }

  const isModalOpen = isAdding || selectedTask !== null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Task Board</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              List
            </button>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Task
          </button>
        </div>
      </div>

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div
                key={col}
                className={`bg-gray-900 rounded-xl border-t-2 ${COLUMN_BORDER[col]} p-4 min-h-64`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-sm font-semibold uppercase tracking-wider ${COLUMN_HEADER[col]}`}>
                    {col === 'InProgress' ? 'In Progress' : col}
                  </h2>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {colTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => openEdit(task)}
                      className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-lg p-3 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-white leading-snug">{task.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${PRIORITY_BADGE[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <span className="text-xs text-gray-400">{getSiteName(task.siteId)}</span>
                        <span className="text-xs text-gray-500">{getUserName(task.assignedToUserId)}</span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">{task.dueDate}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 p-4 border-b border-gray-800">
            <input
              type="text"
              placeholder="Search by title, category, or status..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={listStatusFilter}
              onChange={(e) => setListStatusFilter(e.target.value as TaskStatus | 'All')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Complete">Complete</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Title</th>
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Priority</th>
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Site</th>
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Assignee</th>
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Due Date</th>
                  <th className="text-left text-xs text-gray-400 font-semibold uppercase tracking-wider px-4 py-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredListTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-10">No tasks found.</td>
                  </tr>
                )}
                {filteredListTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => openEdit(task)}
                    className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{task.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_BADGE[task.priority]}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[task.status]}`}>
                        {task.status === 'InProgress' ? 'In Progress' : task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{getSiteName(task.siteId)}</td>
                    <td className="px-4 py-3 text-gray-300">{getUserName(task.assignedToUserId)}</td>
                    <td className="px-4 py-3 text-gray-400">{task.dueDate || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{task.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {isAdding ? 'Add Task' : 'Edit Task'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
                &times;
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="Task title"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Task description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Site</label>
                  <select
                    value={form.siteId}
                    onChange={(e) => handleFormChange('siteId', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Zone (optional)</label>
                  <select
                    value={form.zoneId}
                    onChange={(e) => handleFormChange('zoneId', e.target.value)}
                    disabled={!form.siteId}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  >
                    <option value="">Select zone</option>
                    {filteredZones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Assignee</label>
                  <select
                    value={form.assignedToUserId}
                    onChange={(e) => handleFormChange('assignedToUserId', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Open">Open</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Complete">Complete</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => handleFormChange('dueDate', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="Inspection">Inspection</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Incident">Incident</option>
                  <option value="Audit">Audit</option>
                  <option value="Training">Training</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {!isAdding && selectedTask && (
                <div className="flex flex-col gap-3 border-t border-gray-800 pt-4 mt-1">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Notes</h3>
                  <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
                    {selectedTask.notes.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No notes yet.</p>
                    )}
                    {selectedTask.notes.map((note) => (
                      <div key={note.id} className="bg-gray-800 rounded-lg p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-300">{getUserName(note.authorId)}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200">{note.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                      placeholder="Add a note..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!noteText.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-800">
              <div>
                {!isAdding && selectedTask && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/40 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isAdding ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
