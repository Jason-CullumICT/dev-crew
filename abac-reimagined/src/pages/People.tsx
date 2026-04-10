import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import UserModal from '../modals/UserModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { User } from '../types'

const STATUS_CLASS: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
  inactive:  'bg-slate-700 text-slate-500 border border-slate-600',
}

const TYPE_CLASS: Record<string, string> = {
  employee:   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  contractor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  visitor:    'bg-slate-700 text-slate-400 border border-slate-600',
}

export default function People() {
  const users      = useStore(s => s.users)
  const deleteUser = useStore(s => s.deleteUser)

  const [editing, setEditing]             = useState<User | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    )
  }, [users, search])

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  })

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteUser(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-100">People</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{users.length} users</span>
          <button
            onClick={() => setEditing('new')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or department..."
          resultCount={filtered.length}
          totalCount={users.length}
        />
      </div>

      {/* Column headers */}
      <div className="shrink-0 px-4 flex items-center gap-4">
        {/* Avatar placeholder */}
        <div className="w-8 shrink-0" />
        {/* Name+subtitle */}
        <div className="flex-1 min-w-0 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
          Name
        </div>
        {/* Department */}
        <div className="w-[120px] shrink-0 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
          Department
        </div>
        {/* Type */}
        <div className="w-[80px] shrink-0 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
          Type
        </div>
        {/* Status */}
        <div className="w-[70px] shrink-0 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
          Status
        </div>
        {/* CL */}
        <div className="w-[40px] shrink-0 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
          CL
        </div>
        {/* Actions */}
        <div className="w-[60px] shrink-0" />
      </div>

      {/* Virtual scroll container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <div
          style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const user = filtered[virtualRow.index]
            const typeClass  = TYPE_CLASS[user.type]   ?? 'bg-slate-700 text-slate-400 border border-slate-600'
            const statusClass = STATUS_CLASS[user.status] ?? 'bg-slate-700 text-slate-500 border border-slate-600'
            const typeLabel  = user.type   || '—'
            const statusLabel = user.status || '—'
            const clLabel    = user.clearanceLevel != null ? `L${user.clearanceLevel}` : '—'
            const dept       = user.department || '—'

            return (
              <div
                key={user.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '8px',
                }}
              >
                <div className="bg-[#0f1320] border border-[#1e293b] rounded-lg px-4 py-3 flex items-center gap-4">
                  {/* Avatar — 40px visual, mapped to w-8 (32px) + gap-4 (16px) alignment */}
                  <div className="w-8 h-8 rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] font-bold text-slate-400 shrink-0">
                    {user.name ? user.name.split(' ').map(n => n[0]).join('') : '?'}
                  </div>

                  {/* Name + subtitle — flex-1 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-100 truncate">
                      {user.name || '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {user.role || '—'} · {user.email || '—'}
                    </div>
                  </div>

                  {/* Department — 120px */}
                  <div className="w-[120px] shrink-0 text-[10px] text-slate-400 truncate">
                    {dept}
                  </div>

                  {/* Type badge — 80px */}
                  <div className="w-[80px] shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${typeClass}`}>
                      {typeLabel}
                    </span>
                  </div>

                  {/* Status badge — 70px */}
                  <div className="w-[70px] shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* CL badge — 40px */}
                  <div className="w-[40px] shrink-0">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                      {clLabel}
                    </span>
                  </div>

                  {/* Edit / Delete — 60px */}
                  <div className="w-[60px] shrink-0 flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setEditing(user)}
                      aria-label="Edit"
                      className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setPendingDelete(user)}
                      aria-label="Delete"
                      className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-[12px] text-slate-600 py-4">
            {search ? 'No users match your search.' : 'No users yet.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <UserModal
          user={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete user?"
        message={`"${pendingDelete?.name}" will be permanently deleted and removed from all groups.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
