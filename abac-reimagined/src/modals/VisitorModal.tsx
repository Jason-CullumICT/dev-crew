import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type { VisitorRegistration } from '../types'

interface Props {
  registration?: VisitorRegistration  // undefined = new
  onClose: () => void
}

function blank(): VisitorRegistration {
  return {
    id:              uuidv4(),
    visitorName:     '',
    visitorEmail:    '',
    visitorCompany:  '',
    hostUserId:      '',
    escortUserId:    undefined,
    purpose:         '',
    scheduledDate:   new Date().toISOString().slice(0, 10),
    scheduledTime:   '09:00',
    status:          'pre_registered',
    allowedDoorIds:  [],
    notes:           '',
  }
}

export default function VisitorModal({ registration, onClose }: Props) {
  const addVisitorRegistration    = useStore(s => s.addVisitorRegistration)
  const updateVisitorRegistration = useStore(s => s.updateVisitorRegistration)
  const users = useStore(s => s.users)
  const doors = useStore(s => s.doors)

  const [draft, setDraft] = useState<VisitorRegistration>(registration ?? blank())

  const employees = useMemo(
    () => users.filter(u => u.type === 'employee' && u.status === 'active'),
    [users]
  )

  const perimeterDoors = useMemo(
    () => doors.filter(d => ['Visitor Reception', 'Main Entrance', 'Rear Entrance'].includes(d.name)),
    [doors]
  )

  function setField<K extends keyof VisitorRegistration>(key: K, value: VisitorRegistration[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function toggleDoor(doorId: string) {
    setDraft(d => ({
      ...d,
      allowedDoorIds: d.allowedDoorIds.includes(doorId)
        ? d.allowedDoorIds.filter(id => id !== doorId)
        : [...d.allowedDoorIds, doorId],
    }))
  }

  function save() {
    if (!draft.visitorName.trim() || !draft.hostUserId) return
    if (registration) updateVisitorRegistration(draft)
    else addVisitorRegistration(draft)
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'
  const selectCls = `${inputCls} appearance-none`

  return (
    <Modal
      title={registration ? `Edit — ${registration.visitorName}` : 'New Visitor Registration'}
      onClose={onClose}
      onSave={save}
    >
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Visitor Name *</label>
            <input
              className={inputCls}
              value={draft.visitorName}
              onChange={e => setField('visitorName', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              className={inputCls}
              value={draft.visitorEmail}
              onChange={e => setField('visitorEmail', e.target.value)}
              placeholder="visitor@company.com"
              type="email"
            />
          </div>
          <div>
            <label className={labelCls}>Company</label>
            <input
              className={inputCls}
              value={draft.visitorCompany}
              onChange={e => setField('visitorCompany', e.target.value)}
              placeholder="Organisation name"
            />
          </div>
          <div>
            <label className={labelCls}>Purpose</label>
            <input
              className={inputCls}
              value={draft.purpose}
              onChange={e => setField('purpose', e.target.value)}
              placeholder="Reason for visit"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Host *</label>
            <select
              className={selectCls}
              value={draft.hostUserId}
              onChange={e => setField('hostUserId', e.target.value)}
            >
              <option value="">Select host...</option>
              {employees.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Escort (optional)</label>
            <select
              className={selectCls}
              value={draft.escortUserId ?? ''}
              onChange={e => setField('escortUserId', e.target.value || undefined)}
            >
              <option value="">No escort assigned</option>
              {employees.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Scheduled Date</label>
            <input
              className={inputCls}
              type="date"
              value={draft.scheduledDate}
              onChange={e => setField('scheduledDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Scheduled Time</label>
            <input
              className={inputCls}
              type="time"
              value={draft.scheduledTime}
              onChange={e => setField('scheduledTime', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Allowed Doors</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {perimeterDoors.length === 0 && (
              <p className="text-slate-600 text-[11px]">No visitor-accessible doors configured.</p>
            )}
            {perimeterDoors.map(door => (
              <label
                key={door.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0d1017] border border-[#1e293b] cursor-pointer hover:border-indigo-500/40 transition-colors"
              >
                <input
                  type="checkbox"
                  className="accent-indigo-500"
                  checked={draft.allowedDoorIds.includes(door.id)}
                  onChange={() => toggleDoor(door.id)}
                />
                <span className="text-[11px] text-slate-300 truncate">{door.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={draft.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Additional instructions or notes..."
          />
        </div>
      </div>
    </Modal>
  )
}
