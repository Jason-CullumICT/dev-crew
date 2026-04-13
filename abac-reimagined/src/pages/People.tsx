import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2, RefreshCw, Search, X } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import UserModal from '../modals/UserModal'
import ConfirmDialog from '../components/ConfirmDialog'
import type { User, Credential } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Table, TableHeader, TableRow, TableHead, TableCell } from '../ui/table'

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
      customAttributes: { source: 'hr_sync', clearanceLevel: String(Math.floor(Math.random() * 3) + 1) },
    }
    addUser(newUser)

    const deptGroup = groups.find(g =>
      g.name.toLowerCase().includes(dept.toLowerCase()) && g.membershipType === 'static'
    )
    if (deptGroup) {
      updateGroup({ ...deptGroup, members: [...deptGroup.members, id] })
    }

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

    updateUser({ ...target, status: 'inactive', customAttributes: { ...target.customAttributes, hr_offboarded: 'true' } })

    const userCreds = credentials.filter(c => c.userId === target.id && c.status === 'active')
    userCreds.forEach(c => suspendCredential(c.id))

    groups.filter(g => g.membershipType === 'static' && g.members.includes(target.id)).forEach(g => {
      updateGroup({ ...g, members: g.members.filter(m => m !== target.id) })
    })

    showToast(`HR Sync: "${target.name}" marked inactive. ${userCreds.length} credential(s) suspended. Removed from all groups.`)
  }

  return (
    <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3 shrink-0 bg-[hsl(var(--card))]">
      <div className="flex items-center gap-2">
        <RefreshCw size={13} className="text-[hsl(var(--primary))]" />
        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">HR Sync</span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">(simulated)</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="secondary" onClick={handleNewStarter} className="text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10">
          + New Starter
        </Button>
        <Button size="sm" variant="secondary" onClick={handleLeaver} className="text-red-400 border border-red-500/30 hover:bg-red-500/10">
          Process Leaver
        </Button>
        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
          New Starter: creates user, assigns to group, issues credential. Leaver: deactivates user, suspends credentials, removes from groups.
        </span>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
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
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden bg-[hsl(var(--background))]">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">People</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{users.length} users</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      {/* HR Sync */}
      <HRSyncPanel />

      {/* Search */}
      <div className="shrink-0 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or department..."
          className="pl-9 pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {search && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] -mt-2 shrink-0">
          Showing {filtered.length} of {users.length}
        </p>
      )}

      {/* Table — virtual scroll container */}
      <div className="flex-1 min-h-0 overflow-hidden border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))]">
        {/* Fixed table head */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Department</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-12">CL</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
        </Table>

        {/* Virtual scrolled body */}
        <div ref={parentRef} className="overflow-y-auto" style={{ height: 'calc(100% - 37px)' }}>
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const user = filtered[virtualRow.index]
              const clLabel = user.customAttributes.clearanceLevel ? `L${user.customAttributes.clearanceLevel}` : '—'
              const dept    = user.department || '—'

              const typeBadgeVariant = ((): 'default' | 'warning' | 'outline' => {
                if (user.type === 'employee') return 'default'
                if (user.type === 'contractor') return 'warning'
                return 'outline'
              })()
              const statusBadgeVariant = ((): 'success' | 'destructive' | 'outline' => {
                if (user.status === 'active') return 'success'
                if (user.status === 'suspended') return 'destructive'
                return 'outline'
              })()

              return (
                <div
                  key={user.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <table className="w-full">
                    <tbody>
                      <TableRow>
                        <TableCell className="w-10">
                          <div className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center text-xs font-bold text-[hsl(var(--muted-foreground))]">
                            {user.name ? user.name.split(' ').map(n => n[0]).join('') : '?'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                            {user.name || '—'}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            {user.role || '—'} · {user.email || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="w-32 text-sm text-[hsl(var(--muted-foreground))] truncate">
                          {dept}
                        </TableCell>
                        <TableCell className="w-24">
                          <Badge variant={typeBadgeVariant} className="text-[10px]">
                            {user.type || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-24">
                          <Badge variant={statusBadgeVariant} className="text-[10px]">
                            {user.status || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-12">
                          <Badge variant="secondary" className="text-[10px]">
                            {clLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-16 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(user)}
                              aria-label="Edit"
                              className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                            >
                              <Pencil size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(user)}
                              aria-label="Delete"
                              className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] py-6 px-4">
              {search ? 'No users match your search.' : 'No users yet.'}
            </p>
          )}
        </div>
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
