import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '../components/Modal'
import { useStore } from '../store/store'
import type {
  InputDevice,
  OutputDevice,
  InputDeviceType,
  OutputDeviceType,
  DeviceStatus,
} from '../types'

type AnyDevice = (InputDevice & { io: 'Input' }) | (OutputDevice & { io: 'Output' })

interface Props {
  device?: AnyDevice
  defaultIo?: 'Input' | 'Output'
  onClose: () => void
}

const INPUT_TYPES: InputDeviceType[] = [
  'card_reader',
  'rex_button',
  'door_contact',
  'pir_sensor',
  'glass_break',
  'panic_button',
  'intercom',
]

const OUTPUT_TYPES: OutputDeviceType[] = [
  'electric_strike',
  'mag_lock',
  'siren',
  'strobe',
  'camera_trigger',
  'relay_output',
]

const DEVICE_STATUSES: DeviceStatus[] = ['online', 'offline', 'tamper', 'fault', 'low_battery']

function blankInput(doorId: string, controllerId: string): InputDevice {
  return {
    id: uuidv4(),
    name: '',
    type: 'card_reader',
    doorId,
    controllerId,
    port: 1,
    status: 'online',
    config: {},
  }
}

function blankOutput(doorId: string, controllerId: string): OutputDevice {
  return {
    id: uuidv4(),
    name: '',
    type: 'electric_strike',
    doorId,
    controllerId,
    port: 1,
    status: 'online',
    config: {},
  }
}

export default function DeviceModal({ device, defaultIo, onClose }: Props) {
  const doors       = useStore(s => s.doors)
  const controllers = useStore(s => s.controllers)

  const addInputDevice     = useStore(s => s.addInputDevice)
  const updateInputDevice  = useStore(s => s.updateInputDevice)
  const addOutputDevice    = useStore(s => s.addOutputDevice)
  const updateOutputDevice = useStore(s => s.updateOutputDevice)

  const firstDoorId       = doors[0]?.id       ?? ''
  const firstControllerId = controllers[0]?.id ?? ''

  const [io, setIo] = useState<'Input' | 'Output'>(
    device?.io ?? defaultIo ?? 'Input'
  )

  const [inputDraft, setInputDraft] = useState<InputDevice>(
    device?.io === 'Input'
      ? { ...device }
      : blankInput(firstDoorId, firstControllerId)
  )

  const [outputDraft, setOutputDraft] = useState<OutputDevice>(
    device?.io === 'Output'
      ? { ...device }
      : blankOutput(firstDoorId, firstControllerId)
  )

  const isEditing = device !== undefined

  function save() {
    if (io === 'Input') {
      if (!inputDraft.name.trim()) return
      if (isEditing && updateInputDevice) updateInputDevice(inputDraft)
      else if (addInputDevice) addInputDevice(inputDraft)
    } else {
      if (!outputDraft.name.trim()) return
      if (isEditing && updateOutputDevice) updateOutputDevice(outputDraft)
      else if (addOutputDevice) addOutputDevice(outputDraft)
    }
    onClose()
  }

  const inputCls = 'w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-[12px] text-slate-100 focus:outline-none focus:border-indigo-500'
  const labelCls = 'block text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-1'

  const title = isEditing
    ? `Edit Device — ${device?.name}`
    : `New ${io} Device`

  return (
    <Modal title={title} onClose={onClose} onSave={save}>
      <div className="p-5 space-y-4">
        {/* I/O toggle — only shown when creating */}
        {!isEditing && (
          <div>
            <label className={labelCls}>Device Direction</label>
            <div className="flex gap-2">
              {(['Input', 'Output'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setIo(v)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                    io === v
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-[#111827] border-[#1e293b] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {io === 'Input' ? (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                value={inputDraft.name}
                onChange={e => setInputDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Device name"
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select
                className={inputCls}
                value={inputDraft.type}
                onChange={e => setInputDraft(d => ({ ...d, type: e.target.value as InputDeviceType }))}
              >
                {INPUT_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Door</label>
              <select
                className={inputCls}
                value={inputDraft.doorId}
                onChange={e => setInputDraft(d => ({ ...d, doorId: e.target.value }))}
              >
                {doors.map(door => (
                  <option key={door.id} value={door.id}>{door.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Controller</label>
              <select
                className={inputCls}
                value={inputDraft.controllerId}
                onChange={e => setInputDraft(d => ({ ...d, controllerId: e.target.value }))}
              >
                {controllers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Port</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                value={inputDraft.port}
                onChange={e => setInputDraft(d => ({ ...d, port: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={inputDraft.status}
                onChange={e => setInputDraft(d => ({ ...d, status: e.target.value as DeviceStatus }))}
              >
                {DEVICE_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                value={outputDraft.name}
                onChange={e => setOutputDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Device name"
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select
                className={inputCls}
                value={outputDraft.type}
                onChange={e => setOutputDraft(d => ({ ...d, type: e.target.value as OutputDeviceType }))}
              >
                {OUTPUT_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Door</label>
              <select
                className={inputCls}
                value={outputDraft.doorId ?? ''}
                onChange={e => setOutputDraft(d => ({ ...d, doorId: e.target.value || undefined }))}
              >
                <option value="">— None —</option>
                {doors.map(door => (
                  <option key={door.id} value={door.id}>{door.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Controller</label>
              <select
                className={inputCls}
                value={outputDraft.controllerId}
                onChange={e => setOutputDraft(d => ({ ...d, controllerId: e.target.value }))}
              >
                {controllers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Port</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                value={outputDraft.port}
                onChange={e => setOutputDraft(d => ({ ...d, port: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={outputDraft.status}
                onChange={e => setOutputDraft(d => ({ ...d, status: e.target.value as DeviceStatus }))}
              >
                {DEVICE_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
