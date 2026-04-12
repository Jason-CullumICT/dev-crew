import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { Credential, CredentialType } from '../types'

interface Props {
  credential?: Credential  // undefined = new
  onClose: () => void
}

const CREDENTIAL_TYPES: { value: CredentialType; label: string }[] = [
  { value: 'proximity_card', label: 'Proximity Card' },
  { value: 'smart_card',     label: 'Smart Card' },
  { value: 'pin',            label: 'PIN' },
  { value: 'mobile',         label: 'Mobile' },
  { value: 'biometric',      label: 'Biometric' },
]

function generateCardNumber(): string {
  return `C-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`
}

function generatePin(): string {
  return String(1000 + Math.floor(Math.random() * 9000))
}

function blank(): Credential {
  return {
    id:           uuidv4(),
    userId:       '',
    type:         'proximity_card',
    status:       'active',
    cardNumber:   generateCardNumber(),
    facilityCode: 1,
    issuedAt:     new Date().toISOString(),
  }
}

export default function CredentialModal({ credential, onClose }: Props) {
  const addCredential    = useStore(s => s.addCredential)
  const updateCredential = useStore(s => s.updateCredential)
  const users            = useStore(s => s.users)

  const [draft, setDraft] = useState<Credential>(credential ?? blank())

  const activeUsers = useMemo(
    () => users.filter(u => u.status !== 'inactive').sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  )

  function setField<K extends keyof Credential>(key: K, value: Credential[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function handleTypeChange(type: CredentialType) {
    setDraft(d => ({
      ...d,
      type,
      cardNumber:   ['proximity_card', 'smart_card'].includes(type) ? (d.cardNumber ?? generateCardNumber()) : undefined,
      facilityCode: ['proximity_card', 'smart_card'].includes(type) ? (d.facilityCode ?? 1) : undefined,
      pin:          type === 'pin' ? (d.pin ?? generatePin()) : undefined,
    }))
  }

  function save() {
    if (!draft.userId) return
    if (credential) updateCredential(draft)
    else addCredential(draft)
    onClose()
  }

  const inputCls  = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls  = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'
  const selectCls = `${inputCls} appearance-none`

  const showCardFields = draft.type === 'proximity_card' || draft.type === 'smart_card'
  const showPinField   = draft.type === 'pin'

  return (
    <Modal
      title={credential ? `Edit Credential — ${credential.cardNumber ?? credential.id}` : 'Issue Credential'}
      onClose={onClose}
      onSave={save}
    >
      <div className="p-5 space-y-4">
        <div>
          <label className={labelCls}>User *</label>
          <select
            className={selectCls}
            value={draft.userId}
            onChange={e => setField('userId', e.target.value)}
          >
            <option value="">Select user...</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} — {u.department} ({u.type})</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Credential Type</label>
          <div className="flex gap-1.5 flex-wrap">
            {CREDENTIAL_TYPES.map(ct => (
              <button
                key={ct.value}
                onClick={() => handleTypeChange(ct.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                  draft.type === ct.value
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#111827] text-slate-500 border-[#1e293b] hover:text-slate-300'
                }`}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {showCardFields && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Card Number</label>
              <div className="flex gap-1.5">
                <input
                  className={inputCls}
                  value={draft.cardNumber ?? ''}
                  onChange={e => setField('cardNumber', e.target.value)}
                  placeholder="C-000001"
                />
                <button
                  onClick={() => setField('cardNumber', generateCardNumber())}
                  className="px-2 py-1 rounded-lg bg-[#111827] border border-[#1e293b] text-[10px] text-slate-500 hover:text-slate-300 shrink-0"
                  title="Generate new card number"
                >
                  Gen
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Facility Code</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                max={255}
                value={draft.facilityCode ?? ''}
                onChange={e => setField('facilityCode', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1"
              />
            </div>
          </div>
        )}

        {showPinField && (
          <div>
            <label className={labelCls}>PIN</label>
            <div className="flex gap-1.5">
              <input
                className={inputCls}
                value={draft.pin ?? ''}
                onChange={e => setField('pin', e.target.value)}
                placeholder="4–8 digit PIN"
                maxLength={8}
              />
              <button
                onClick={() => setField('pin', generatePin())}
                className="px-2 py-1 rounded-lg bg-[#111827] border border-[#1e293b] text-[10px] text-slate-500 hover:text-slate-300 shrink-0"
                title="Generate new PIN"
              >
                Gen
              </button>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Expiry Date (optional)</label>
          <input
            className={inputCls}
            type="date"
            value={draft.expiresAt ? draft.expiresAt.slice(0, 10) : ''}
            onChange={e =>
              setField('expiresAt', e.target.value ? `${e.target.value}T23:59:59Z` : undefined)
            }
          />
        </div>
      </div>
    </Modal>
  )
}
