import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import UserModal from '../modals/UserModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { User, Credential } from '../types'

// ── HR Sync names pool ────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Drew', 'Quinn',
  'Avery', 'Blake', 'Cameron', 'Dana', 'Elliot', 'Frankie', 'Glen', 'Harley',
]
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Wilson', 'Moore', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris',
]
const DEPARTMENTS = ['Engineering', 'Security', 'Finance', 'HR', 'Operations', 'Legal', 'Sales']
const ROLES = ['Analyst', 'Manager', 'Director', 'Engineer', 'Specialist', 'Coordinator']

function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Toast component ───────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useState(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  })
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1c1f2e] border border-indigo-500/30 rounded-xl px-4 py-3 text-[11px] text-slate-200 shadow-xl max-w-[320px]">
      {message}
    </div>
  )
}

// ── HRSync panel ──────────────────────────────────────────────────────────────

function HRSyncPanel() {
  const users        = useStore(s => s.users)
  const groups       = useStore(s => s.groups)
  const addUser      = useStore(s => s.addUser)
  const updateUser   = useStore(s => s.updateUser)
  const addCredential = useStore(s => s.addCredential)
  const suspendCredential = useStore(s => s.suspendCredential)
  const credentials  = useStore(s => s.credentials)
  const updateGroup  = useStore(s => s.updateGroup)

  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
  }

  function handleNewStarter() {
    const firstName = randPick(FIRST_NAMES)
    const lastName  = randPick(LAST_NAMES)
    const name      = `${firstName} ${lastName}`
    const dept      = randPick(DEPARTMENTS)
    const role      = randPick(ROLES)
    const id        = `user-hr-${makeId()}`

    const newUser: User = {
      id,
      name,
      email:          `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      department:     dept,
      role,
      type:           'employee',
      status:         'active',
      // clearanceLevel is stored as a customAttribute (string)
      customAttributes: { source: 'hr_sync', clearanceLevel: String(Math.floor(Math.random() * 3) + 1) },
    }
    addUser(newUser)

    // Auto-assign to department-matching group if one exists
    const deptGroup = groups.find(g =>
      g.name.toLowerCase().includes(dept.toLowerCase()) && g.membershipType === 'static'
    )
    if (deptGroup) {
      updateGroup({ ...deptGroup, members: [...deptGroup.members, id] })
    }

    // Issue a proximity card credential
    const cred: Credential = {
      id:         `cred-hr-${makeId()}`,
      userId:     id,
      type:       'proximity_card',
      status:     'active',
      cardNumber: String(100000 + Math.floor(Math.random() * 900000)),
      facilityCode: 101,
      issuedAt:   new Date().toISOString(),
    }
    addCredential(cred)

    showToast(`HR Sync: New starter "${name}" (${dept}) added. Credential issued. ${deptGroup ? `Assigned to "${deptGroup.name}".` : 'No matching group found.'}`)
  }

  function handleLeaver() {
    const activeUsers = users.filter(u => u.status === 'active' && !u.customAttributes['hr_offboarded'])
    if (activeUsers.length === 0) {
      showToast('No active users to offboard.')
      return
    }
    const target = randPick(activeUsers)

    // Suspend user
    updateUser({ ...target, status: 'inactive', customAttributes: { ...target.customAttributes, hr_offboarded: 'true' } })

    // Suspend all their credentials
    const userCreds = credentials.filter(c => c.userId === target.id && c.status === 'active')
    userCreds.forEach(c => suspendCredential(c.id))

    // Remove from all static groups
    groups.filter(g => g.membershipType === 'static' && g.members.includes(target.id)).forEach(g => {
      updateGroup({ ...g, members: g.members.filter(m => m !== target.id) })
    })

    showToast(`HR Sync: "${target.name}" marked inactive. ${userCreds.length} credential(s) suspended. Removed from all groups.`)
  }

  return (
    <div className="bg-[#080b14] border border-[#1e293b] rounded-lg p-4 space-y-3 shrink-0">
      <div className="flex items-center gap-2">
        <RefreshCw size={12} className="text-indigo-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">HR Sync</span>
        <span className="text-[9px] text-slate-700">(simulated)</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleNewStarter}
          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-600/30 transition-colors"
        >
          + New Starter
        </button>
        <button
          onClick={handleLeaver}
          className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-600/30 transition-colors"
        >
          Process Leaver
        </button>
        <span className="text-[9px] text-slate-700 ml-2">
          New Starter: creates user, assigns to group, issues credential. Leaver: deactivates user, suspends credentials, removes from groups.
        </span>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

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

      {/* HR Sync */}
      <HRSyncPanel />

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
            const clLabel    = user.customAttributes.clearanceLevel ? `L${user.customAttributes.clearanceLevel}` : '—'
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
