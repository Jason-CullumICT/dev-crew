import { useState, useMemo } from 'react'
import { UserPlus, LogIn, LogOut, Monitor, Search, X } from 'lucide-react'
import { useStore } from '../store/store'
import type { VisitorRegistration, VisitorStatus } from '../types'
import VisitorModal from '../modals/VisitorModal'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<VisitorStatus, string> = {
  pre_registered: 'Pre-registered',
  checked_in:     'Checked In',
  checked_out:    'Checked Out',
  cancelled:      'Cancelled',
}

function StatusBadge({ status }: { status: VisitorStatus }) {
  const variantMap: Record<VisitorStatus, 'info' | 'success' | 'secondary' | 'destructive'> = {
    pre_registered: 'info',
    checked_in:     'success',
    checked_out:    'secondary',
    cancelled:      'destructive',
  }
  return (
    <Badge variant={variantMap[status]} className="text-[10px]">
      {STATUS_LABELS[status]}
    </Badge>
  )
}

// ── Visitor card ─────────────────────────────────────────────────────────────

interface VisitorCardProps {
  reg: VisitorRegistration
  hostName: string
  onCheckIn:  () => void
  onCheckOut: () => void
  onEdit:     () => void
}

function VisitorCard({ reg, hostName, onCheckIn, onCheckOut, onEdit }: VisitorCardProps) {
  return (
    <div
      className="bg-[#0d1017] border border-[#1e253a] rounded-xl p-4 flex flex-col gap-3 hover:border-[#2a3150] transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-100 truncate">{reg.visitorName}</p>
          <p className="text-[11px] text-slate-500 truncate">{reg.visitorCompany}</p>
        </div>
        <StatusBadge status={reg.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div>
          <span className="text-slate-600">Host</span>
          <p className="text-slate-300 truncate">{hostName}</p>
        </div>
        <div>
          <span className="text-slate-600">Purpose</span>
          <p className="text-slate-300 truncate">{reg.purpose}</p>
        </div>
        <div>
          <span className="text-slate-600">Date</span>
          <p className="text-slate-300">{reg.scheduledDate}</p>
        </div>
        <div>
          <span className="text-slate-600">Time</span>
          <p className="text-slate-300">{reg.scheduledTime}</p>
        </div>
      </div>

      {(reg.status === 'pre_registered' || reg.status === 'checked_in') && (
        <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
          {reg.status === 'pre_registered' && (
            <button
              onClick={onCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 border border-green-600/30 text-[11px] font-medium hover:bg-green-600/30 transition-colors"
            >
              <LogIn size={12} />
              Check In
            </button>
          )}
          {reg.status === 'checked_in' && (
            <button
              onClick={onCheckOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600/20 text-slate-300 border border-slate-600/30 text-[11px] font-medium hover:bg-slate-600/30 transition-colors"
            >
              <LogOut size={12} />
              Check Out
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Kiosk mode ───────────────────────────────────────────────────────────────

interface KioskProps {
  onExit: () => void
}

function KioskMode({ onExit }: KioskProps) {
  const users                 = useStore(s => s.users)
  const visitorRegistrations  = useStore(s => s.visitorRegistrations)
  const checkInVisitor        = useStore(s => s.checkInVisitor)
  const checkOutVisitor       = useStore(s => s.checkOutVisitor)
  const addCredential         = useStore(s => s.addCredential)

  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return visitorRegistrations.filter(
      r => (r.status === 'pre_registered' || r.status === 'checked_in') &&
           r.visitorName.toLowerCase().includes(q)
    )
  }, [search, visitorRegistrations])

  function handleCheckIn(reg: VisitorRegistration) {
    const credId = `cred-temp-${Date.now()}`
    addCredential({
      id:       credId,
      userId:   `visitor-${reg.id}`,
      type:     'proximity_card',
      status:   'active',
      cardNumber: `TEMP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8h
    })
    checkInVisitor(reg.id, credId)
    setSearch('')
  }

  function handleCheckOut(reg: VisitorRegistration) {
    checkOutVisitor(reg.id)
    setSearch('')
  }

  function hostName(hostUserId: string) {
    return users.find(u => u.id === hostUserId)?.name ?? hostUserId
  }

  return (
    <div className="flex flex-col items-center justify-start gap-8 h-full bg-[#060912] p-8 pt-16">
      <div className="text-center">
        <p className="text-[11px] text-indigo-400 uppercase tracking-widest font-semibold mb-2">Kiosk Mode</p>
        <h1 className="text-4xl font-bold text-slate-100 mb-1">Visitor Check-In</h1>
        <p className="text-slate-500 text-sm">Search by visitor name to check in or check out</p>
      </div>

      <div className="relative w-full max-w-lg">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="w-full bg-[#0d1017] border border-[#1e253a] rounded-2xl pl-12 pr-4 py-4 text-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          placeholder="Search visitor name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            onClick={() => setSearch('')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="w-full max-w-lg space-y-3">
        {search.trim() && filtered.length === 0 && (
          <p className="text-center text-slate-600 py-8 text-sm">No matching visitors found.</p>
        )}
        {filtered.map(reg => (
          <div key={reg.id} className="bg-[#0d1017] border border-[#1e253a] rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-100">{reg.visitorName}</p>
              <p className="text-sm text-slate-500">{reg.visitorCompany} — Host: {hostName(reg.hostUserId)}</p>
              <p className="text-xs text-slate-600 mt-0.5">{reg.purpose}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {reg.status === 'pre_registered' && (
                <button
                  onClick={() => handleCheckIn(reg)}
                  className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-500 transition-colors"
                >
                  Check In
                </button>
              )}
              {reg.status === 'checked_in' && (
                <button
                  onClick={() => handleCheckOut(reg)}
                  className="px-5 py-2.5 rounded-xl bg-slate-600 text-white font-semibold text-sm hover:bg-slate-500 transition-colors"
                >
                  Check Out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onExit}
        className="fixed top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1017] border border-[#1e253a] text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
      >
        <X size={13} />
        Exit Kiosk
      </button>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'pre_registered' | 'checked_in' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pre_registered', label: 'Pre-registered' },
  { id: 'checked_in',     label: 'Checked In' },
  { id: 'history',        label: 'History' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Visitors() {
  const users                 = useStore(s => s.users)
  const visitorRegistrations  = useStore(s => s.visitorRegistrations)
  const checkInVisitor        = useStore(s => s.checkInVisitor)
  const checkOutVisitor       = useStore(s => s.checkOutVisitor)
  const addCredential         = useStore(s => s.addCredential)

  const [tab, setTab]         = useState<Tab>('pre_registered')
  const [kioskMode, setKiosk] = useState(false)
  const [modalReg, setModalReg]   = useState<VisitorRegistration | null | undefined>(undefined)
  // undefined = closed, null = new, VisitorRegistration = edit

  const hostName = (id: string) => users.find(u => u.id === id)?.name ?? id

  const tabItems = useMemo(() => {
    if (tab === 'pre_registered') return visitorRegistrations.filter(r => r.status === 'pre_registered')
    if (tab === 'checked_in')     return visitorRegistrations.filter(r => r.status === 'checked_in')
    return visitorRegistrations.filter(r => r.status === 'checked_out' || r.status === 'cancelled')
  }, [tab, visitorRegistrations])

  function handleCheckIn(reg: VisitorRegistration) {
    const credId = `cred-temp-${Date.now()}`
    addCredential({
      id:       credId,
      userId:   `visitor-${reg.id}`,
      type:     'proximity_card',
      status:   'active',
      cardNumber: `TEMP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    })
    checkInVisitor(reg.id, credId)
  }

  if (kioskMode) {
    return <KioskMode onExit={() => setKiosk(false)} />
  }

  return (
    <div className="flex flex-col h-full bg-[#060912] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-[#141828] flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold text-slate-100">Visitor Management</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {visitorRegistrations.filter(r => r.status === 'checked_in').length} currently on-site
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setKiosk(true)}
          className="gap-1.5"
        >
          <Monitor size={13} />
          Kiosk Mode
        </Button>

        <Button
          size="sm"
          onClick={() => setModalReg(null)}
          className="gap-1.5"
        >
          <UserPlus size={13} />
          New Registration
        </Button>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 px-6 pt-3 pb-0 flex gap-1 border-b border-[#141828]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[12px] font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-slate-400'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              tab === t.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#1e253a] text-slate-600'
            }`}>
              {tab === t.id ? tabItems.length : (
                t.id === 'pre_registered' ? visitorRegistrations.filter(r => r.status === 'pre_registered').length :
                t.id === 'checked_in'    ? visitorRegistrations.filter(r => r.status === 'checked_in').length :
                visitorRegistrations.filter(r => r.status === 'checked_out' || r.status === 'cancelled').length
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tabItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-600">
            <UserPlus size={32} className="mb-2 opacity-30" />
            <p className="text-[13px]">No visitors in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tabItems.map(reg => (
              <VisitorCard
                key={reg.id}
                reg={reg}
                hostName={hostName(reg.hostUserId)}
                onCheckIn={() => handleCheckIn(reg)}
                onCheckOut={() => checkOutVisitor(reg.id)}
                onEdit={() => setModalReg(reg)}
              />
            ))}
          </div>
        )}
      </div>

      {modalReg !== undefined && (
        <VisitorModal
          registration={modalReg ?? undefined}
          onClose={() => setModalReg(undefined)}
        />
      )}
    </div>
  )
}
