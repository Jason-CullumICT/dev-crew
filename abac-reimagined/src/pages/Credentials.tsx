import { useState, useMemo } from 'react'
import { CreditCard, Search } from 'lucide-react'
import { useStore } from '../store/store'
import type { Credential, CredentialStatus, CredentialType } from '../types'
import CredentialModal from '../modals/CredentialModal'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<CredentialType, string> = {
  proximity_card: 'Prox Card',
  smart_card:     'Smart Card',
  pin:            'PIN',
  mobile:         'Mobile',
  biometric:      'Biometric',
}

function StatusBadge({ status }: { status: CredentialStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  const variantMap: Record<CredentialStatus, 'success' | 'warning' | 'destructive' | 'outline'> = {
    active:    'success',
    suspended: 'warning',
    revoked:   'destructive',
    expired:   'outline',
  }
  return (
    <Badge variant={variantMap[status]} className="text-[10px]">
      {label}
    </Badge>
  )
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Credentials() {
  const users               = useStore(s => s.users)
  const credentials         = useStore(s => s.credentials)
  const suspendCredential   = useStore(s => s.suspendCredential)
  const revokeCredential    = useStore(s => s.revokeCredential)
  const reactivateCredential = useStore(s => s.reactivateCredential)

  const [search, setSearch]   = useState('')
  const [modalCred, setModalCred] = useState<Credential | null | undefined>(undefined)
  // undefined = closed, null = new, Credential = edit

  const userMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.name)
    return m
  }, [users])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return credentials
    return credentials.filter(c => {
      const name = userMap.get(c.userId)?.toLowerCase() ?? ''
      const card = (c.cardNumber ?? '').toLowerCase()
      return name.includes(q) || card.includes(q)
    })
  }, [credentials, search, userMap])

  // Paginate for performance — show first 200 matches
  const displayed = filtered.slice(0, 200)

  return (
    <div className="flex flex-col h-full bg-[#060912] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-[#141828] flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold text-slate-100">Credentials</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {credentials.filter(c => c.status === 'active').length} active of {credentials.length} total
          </p>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            className="bg-[#0d1017] border border-[#1e253a] rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-52"
            placeholder="Search name or card number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Button
          size="sm"
          onClick={() => setModalCred(null)}
          className="gap-1.5"
        >
          <CreditCard size={13} />
          Issue Credential
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {search && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-600">
            <CreditCard size={32} className="mb-2 opacity-30" />
            <p className="text-[13px]">No credentials match your search</p>
          </div>
        ) : (
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-left">
                {['User', 'Type', 'Card / PIN', 'Facility', 'Status', 'Issued', 'Expires', 'Actions'].map(h => (
                  <th key={h} className="py-2 px-3 text-[9px] uppercase tracking-wider text-slate-600 font-semibold border-b border-[#141828]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(cred => {
                const name = userMap.get(cred.userId) ?? cred.userId
                const { status } = cred
                return (
                  <tr
                    key={cred.id}
                    className="border-b border-[#0e1120] hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-2 px-3 text-slate-200 font-medium max-w-[160px] truncate">{name}</td>
                    <td className="py-2 px-3 text-slate-400">{TYPE_LABELS[cred.type]}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono">
                      {cred.type === 'pin' ? (
                        <span className="blur-sm group-hover:blur-none transition-all">{cred.pin ?? '—'}</span>
                      ) : (
                        cred.cardNumber ?? '—'
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{cred.facilityCode != null ? `FC-${cred.facilityCode}` : '—'}</td>
                    <td className="py-2 px-3"><StatusBadge status={cred.status} /></td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{fmtDate(cred.issuedAt)}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{fmtDate(cred.expiresAt)}</td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {status === 'active' && (
                          <>
                            <ActionBtn
                              label="Suspend"
                              color="amber"
                              onClick={() => suspendCredential(cred.id)}
                            />
                            <ActionBtn
                              label="Revoke"
                              color="red"
                              onClick={() => revokeCredential(cred.id)}
                            />
                          </>
                        )}
                        {(status === 'suspended' || status === 'revoked') && (
                          <ActionBtn
                            label="Reactivate"
                            color="green"
                            onClick={() => reactivateCredential(cred.id)}
                          />
                        )}
                        {status === 'expired' && (
                          <span className="text-slate-700 text-[10px]">Expired</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtered.length > 200 && (
          <p className="text-[11px] text-slate-600 text-center mt-4">
            Showing 200 of {filtered.length} results — refine search to narrow results
          </p>
        )}
      </div>

      {modalCred !== undefined && (
        <CredentialModal
          credential={modalCred ?? undefined}
          onClose={() => setModalCred(undefined)}
        />
      )}
    </div>
  )
}

// ── Inline action button ──────────────────────────────────────────────────────

interface ActionBtnProps {
  label:   string
  color:   'amber' | 'red' | 'green'
  onClick: () => void
}

const COLOR_MAP: Record<ActionBtnProps['color'], string> = {
  amber: 'text-amber-400 hover:bg-amber-500/10 border-amber-600/30',
  red:   'text-red-400   hover:bg-red-500/10   border-red-600/30',
  green: 'text-green-400 hover:bg-green-500/10 border-green-600/30',
}

function ActionBtn({ label, color, onClick }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded border text-[9px] font-medium transition-colors ${COLOR_MAP[color]}`}
    >
      {label}
    </button>
  )
}
