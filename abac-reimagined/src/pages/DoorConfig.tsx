import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Shield, Users, UserCheck, Link2, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store/store'
import DeviceModal from '../modals/DeviceModal'
import ConfirmDialog from '../components/ConfirmDialog'
import type { InputDevice, OutputDevice, DeviceStatus } from '../types'

type AnyDevice = (InputDevice & { io: 'Input' }) | (OutputDevice & { io: 'Output' })

const STATUS_COLOR: Record<DeviceStatus, string> = {
  online:      '#22c55e',
  offline:     '#ef4444',
  tamper:      '#f59e0b',
  fault:       '#f59e0b',
  low_battery: '#fbbf24',
}

function DeviceShape({
  device,
  side,
}: {
  device: AnyDevice
  side: 'left' | 'right'
}) {
  const color = STATUS_COLOR[device.status]
  return (
    <g>
      <rect
        width={80}
        height={28}
        rx={4}
        fill="#0a0d14"
        stroke={color}
        strokeWidth={1.2}
        opacity={0.9}
      />
      <text
        x={40}
        y={10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7}
        fontWeight={600}
        fill={color}
      >
        {device.type.replace(/_/g, ' ')}
      </text>
      <text
        x={40}
        y={20}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={6}
        fill="#94a3b8"
      >
        {device.name.length > 14 ? device.name.slice(0, 13) + '…' : device.name}
      </text>
      {/* Connector line from shape to center */}
      {side === 'left' ? (
        <line x1={80} y1={14} x2={120} y2={14} stroke="#1e293b" strokeWidth={1} />
      ) : (
        <line x1={0} y1={14} x2={-40} y2={14} stroke="#1e293b" strokeWidth={1} />
      )}
    </g>
  )
}

export default function DoorConfig() {
  const { doorId } = useParams<{ doorId: string }>()

  const doors       = useStore(s => s.doors)
  const zones       = useStore(s => s.zones)
  const sites       = useStore(s => s.sites)
  const controllers = useStore(s => s.controllers)
  const inputDevices       = useStore(s => s.inputDevices)
  const outputDevices      = useStore(s => s.outputDevices)
  const deleteInputDevice  = useStore(s => s.deleteInputDevice)
  const deleteOutputDevice = useStore(s => s.deleteOutputDevice)

  // Phase 4 — Advanced Access Control
  const antiPassbackConfigs = useStore(s => s.antiPassbackConfigs)
  const twoPersonRules      = useStore(s => s.twoPersonRules)
  const escortConfigs       = useStore(s => s.escortConfigs)
  const doorInterlocks      = useStore(s => s.doorInterlocks)
  const updateAntiPassbackConfig = useStore(s => s.updateAntiPassbackConfig)
  const updateTwoPersonRule      = useStore(s => s.updateTwoPersonRule)
  const addTwoPersonRule         = useStore(s => s.addTwoPersonRule)
  const updateEscortConfig       = useStore(s => s.updateEscortConfig)
  const addEscortConfig          = useStore(s => s.addEscortConfig)

  const [editingDevice, setEditingDevice] = useState<AnyDevice | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AnyDevice | null>(null)

  const door       = doors.find(d => d.id === doorId)
  const zone       = zones.find(z => z.id === door?.zoneId)
  const site       = sites.find(s => s.id === door?.siteId)
  const controller = controllers.find(c => c.doorIds.includes(doorId ?? ''))

  // Phase 4 derived data
  const antiPassbackCfg = antiPassbackConfigs.find(c => c.zoneId === door?.zoneId)
  const twoPersonRule   = twoPersonRules.find(r => r.doorId === doorId)
  const escortCfg       = escortConfigs.find(c => c.doorId === doorId)
  const interlock       = doorInterlocks.find(i => i.doorAId === doorId || i.doorBId === doorId)

  const doorInputs:  AnyDevice[] = inputDevices
    .filter(d => d.doorId === doorId)
    .map(d => ({ ...d, io: 'Input' as const }))

  const doorOutputs: AnyDevice[] = outputDevices
    .filter(d => d.doorId === doorId)
    .map(d => ({ ...d, io: 'Output' as const }))

  const allDevices: AnyDevice[] = [...doorInputs, ...doorOutputs]

  function handleDeleteConfirm() {
    if (!pendingDelete) return
    if (pendingDelete.io === 'Input' && deleteInputDevice) {
      deleteInputDevice(pendingDelete.id)
    } else if (pendingDelete.io === 'Output' && deleteOutputDevice) {
      deleteOutputDevice(pendingDelete.id)
    }
    setPendingDelete(null)
  }

  if (!door) {
    return (
      <div className="p-6">
        <Link to="/doors" className="text-indigo-400 text-[12px] flex items-center gap-1 mb-4">
          <ArrowLeft size={13} /> Back to Doors
        </Link>
        <p className="text-slate-500 text-[13px]">Door not found.</p>
      </div>
    )
  }

  // SVG wiring diagram dimensions
  const SVG_W  = 500
  const SVG_H  = Math.max(160, Math.max(doorInputs.length, doorOutputs.length) * 44 + 40)
  const CENTER_X = SVG_W / 2
  const CENTER_Y = SVG_H / 2
  const DOOR_W   = 60
  const DOOR_H   = 80

  return (
    <div className="p-6 space-y-6 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div>
        <Link to="/doors" className="text-indigo-400 text-[11px] flex items-center gap-1 mb-3 hover:text-indigo-300 transition-colors">
          <ArrowLeft size={12} /> Back to Doors
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{door.name}</h1>
            <div className="text-[11px] text-slate-500 mt-1 space-x-3">
              {site       && <span>Site: <span className="text-slate-400">{site.name}</span></span>}
              {zone       && <span>Zone: <span className="text-slate-400">{zone.name} ({zone.type})</span></span>}
              {controller && <span>Controller: <span className="text-slate-400">{controller.name}</span></span>}
            </div>
          </div>
          <div className="text-[10px] text-slate-600">
            {doorInputs.length} inputs · {doorOutputs.length} outputs
          </div>
        </div>
      </div>

      {/* Elevator door note */}
      {door.isElevator && (
        <div className="flex items-start gap-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-4 py-3">
          <ArrowUpDown size={14} className="text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-cyan-300">
            <span className="font-semibold">Elevator door</span> — floor access controlled by zone grants. Ensure appropriate zone-scoped grants are assigned to control which floors users can reach.
          </p>
        </div>
      )}

      {/* SVG Wiring Diagram */}
      <div className="bg-[#080b14] border border-[#1e293b] rounded-xl p-4 overflow-x-auto">
        <div className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold mb-3">Wiring Diagram</div>
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="mx-auto"
        >
          {/* Center door rectangle */}
          <rect
            x={CENTER_X - DOOR_W / 2}
            y={CENTER_Y - DOOR_H / 2}
            width={DOOR_W}
            height={DOOR_H}
            rx={6}
            fill="#0a0d14"
            stroke="#334155"
            strokeWidth={1.5}
          />
          <text
            x={CENTER_X}
            y={CENTER_Y - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fontWeight={600}
            fill="#94a3b8"
          >
            DOOR
          </text>
          <text
            x={CENTER_X}
            y={CENTER_Y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill="#64748b"
          >
            {door.name.length > 9 ? door.name.slice(0, 8) + '…' : door.name}
          </text>

          {/* Input devices — left side */}
          {doorInputs.map((device, i) => {
            const totalInputs = doorInputs.length
            const startY = CENTER_Y - ((totalInputs - 1) * 38) / 2
            const y = startY + i * 38
            const x = 20
            return (
              <g key={device.id} transform={`translate(${x}, ${y - 14})`}>
                <DeviceShape device={device} side="left" />
              </g>
            )
          })}

          {/* Input labels */}
          <text x={20} y={20} fontSize={8} fill="#60a5fa" fontWeight={600}>Inputs</text>

          {/* Output devices — right side */}
          {doorOutputs.map((device, i) => {
            const totalOutputs = doorOutputs.length
            const startY = CENTER_Y - ((totalOutputs - 1) * 38) / 2
            const y = startY + i * 38
            const x = CENTER_X + DOOR_W / 2 + 40
            return (
              <g key={device.id} transform={`translate(${x}, ${y - 14})`}>
                <DeviceShape device={device} side="right" />
              </g>
            )
          })}

          {/* Output labels */}
          <text x={CENTER_X + DOOR_W / 2 + 40} y={20} fontSize={8} fill="#a78bfa" fontWeight={600}>Outputs</text>

          {allDevices.length === 0 && (
            <text x={CENTER_X} y={SVG_H - 16} textAnchor="middle" fontSize={9} fill="#334155">
              No devices attached to this door
            </text>
          )}
        </svg>
      </div>

      {/* Device table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold text-slate-400">Attached Devices ({allDevices.length})</div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditingDevice({ io: 'Input', id: '', name: '', type: 'card_reader', doorId: door.id, controllerId: controller?.id ?? '', port: 1, status: 'online', config: {} })}
              className="px-2.5 py-1 rounded-lg bg-[#111827] border border-[#1e293b] text-[10px] text-slate-300 hover:bg-[#1a2035] transition-colors"
            >
              + Input device
            </button>
            <button
              onClick={() => setEditingDevice({ io: 'Output', id: '', name: '', type: 'electric_strike', doorId: door.id, controllerId: controller?.id ?? '', port: 1, status: 'online', config: {} })}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-800/50 text-[10px] text-indigo-300 hover:bg-indigo-600/30 transition-colors"
            >
              + Output device
            </button>
          </div>
        </div>

        {allDevices.length === 0 ? (
          <p className="text-[12px] text-slate-600 py-4">No devices configured for this door.</p>
        ) : (
          <div className="border border-[#1e293b] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid text-[9px] uppercase tracking-wider text-slate-600 font-semibold px-4 py-2 bg-[#080b14] border-b border-[#1e293b]"
              style={{ gridTemplateColumns: '2fr 60px 1fr 60px 1fr 80px' }}>
              <span>Name</span>
              <span>I/O</span>
              <span>Type</span>
              <span className="text-center">Port</span>
              <span>Status</span>
              <span />
            </div>
            {allDevices.map(device => (
              <div
                key={`${device.io}-${device.id}`}
                className="grid items-center px-4 py-2.5 border-b border-[#0d1221] last:border-0 hover:bg-[#0a0d18] transition-colors text-[11px]"
                style={{ gridTemplateColumns: '2fr 60px 1fr 60px 1fr 80px' }}
              >
                <span className="text-slate-200 font-medium truncate">{device.name}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border w-fit ${
                  device.io === 'Input'
                    ? 'text-blue-300 border-blue-800/50 bg-blue-900/20'
                    : 'text-violet-300 border-violet-800/50 bg-violet-900/20'
                }`}>
                  {device.io}
                </span>
                <span className="text-slate-400">{device.type.replace(/_/g, ' ')}</span>
                <span className="text-center text-slate-500">{device.port}</span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: STATUS_COLOR[device.status] }}
                >
                  {device.status}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setEditingDevice(device)}
                    aria-label="Edit"
                    className="p-1.5 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(device)}
                    aria-label="Remove"
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Phase 4 — Advanced Access Control ────────────────────────────────── */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Shield size={13} className="text-indigo-400" />
          Advanced Access Control
        </div>
        <div className="grid gap-3">

          {/* Anti-passback */}
          <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={12} className="text-amber-400" />
              <span className="text-[11px] font-semibold text-slate-300">Anti-Passback</span>
              <span className="text-[9px] text-slate-600 ml-1">(zone-level)</span>
            </div>
            {antiPassbackCfg ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500 w-24">Mode</span>
                  <div className="flex gap-1">
                    {(['hard', 'soft', 'off'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateAntiPassbackConfig({ ...antiPassbackCfg, mode })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          antiPassbackCfg.mode === mode
                            ? mode === 'hard'
                              ? 'bg-red-900/50 border-red-700 text-red-300'
                              : mode === 'soft'
                                ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                                : 'bg-slate-800 border-slate-600 text-slate-300'
                            : 'bg-transparent border-[#1e293b] text-slate-600 hover:border-slate-600'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500 w-24">Reset</span>
                  <span className="text-slate-400">{antiPassbackCfg.resetMinutes} min</span>
                  {antiPassbackCfg.mode === 'off' && (
                    <span className="text-[10px] text-slate-600 italic">— no reset (mode is off)</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-600">Zone not configured for anti-passback.</p>
            )}
          </div>

          {/* Two-person rule */}
          <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-blue-400" />
              <span className="text-[11px] font-semibold text-slate-300">Two-Person Rule</span>
            </div>
            {twoPersonRule ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500 w-24">Enabled</span>
                  <button
                    onClick={() => updateTwoPersonRule({ ...twoPersonRule, enabled: !twoPersonRule.enabled })}
                    className={`relative w-8 h-4 rounded-full transition-colors ${twoPersonRule.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${twoPersonRule.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <span className={`text-[10px] font-semibold ${twoPersonRule.enabled ? 'text-blue-400' : 'text-slate-600'}`}>
                    {twoPersonRule.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500 w-24">Timeout</span>
                  <span className="text-slate-400">{twoPersonRule.timeoutSeconds}s</span>
                  <span className="text-[10px] text-slate-600">— second person must badge within this window</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-slate-600 flex-1">Not configured for this door.</p>
                <button
                  onClick={() => addTwoPersonRule({ doorId: doorId ?? '', enabled: true, timeoutSeconds: 30 })}
                  className="px-2 py-0.5 rounded text-[10px] text-blue-400 border border-blue-800/50 hover:bg-blue-900/20 transition-colors"
                >
                  + Enable
                </button>
              </div>
            )}
          </div>

          {/* Escort mode */}
          <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={12} className="text-emerald-400" />
              <span className="text-[11px] font-semibold text-slate-300">Escort Mode</span>
            </div>
            {escortCfg ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500 w-24">Enabled</span>
                  <button
                    onClick={() => updateEscortConfig({ ...escortCfg, enabled: !escortCfg.enabled })}
                    className={`relative w-8 h-4 rounded-full transition-colors ${escortCfg.enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${escortCfg.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <span className={`text-[10px] font-semibold ${escortCfg.enabled ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {escortCfg.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500 w-24">Visitor timeout</span>
                  <span className="text-slate-400">{escortCfg.escortTimeoutSeconds}s</span>
                  <span className="text-[10px] text-slate-600">— visitor must badge after escort badges</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-slate-600 flex-1">Not configured for this door.</p>
                <button
                  onClick={() => addEscortConfig({ doorId: doorId ?? '', enabled: true, escortTimeoutSeconds: 15 })}
                  className="px-2 py-0.5 rounded text-[10px] text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/20 transition-colors"
                >
                  + Enable
                </button>
              </div>
            )}
          </div>

          {/* Door interlock / mantrap */}
          <div className="bg-[#0a0d14] border border-[#1e293b] rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={12} className="text-violet-400" />
              <span className="text-[11px] font-semibold text-slate-300">Door Interlock (Mantrap)</span>
            </div>
            {interlock ? (
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 w-24">Pair name</span>
                  <span className="text-violet-300 font-medium">{interlock.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 w-24">Door A</span>
                  <span className="text-slate-400 font-mono text-[10px]">{interlock.doorAId}</span>
                  {interlock.doorAId === doorId && <span className="text-violet-400 text-[9px] font-semibold">(this door)</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 w-24">Door B</span>
                  <span className="text-slate-400 font-mono text-[10px]">{interlock.doorBId}</span>
                  {interlock.doorBId === doorId && <span className="text-violet-400 text-[9px] font-semibold">(this door)</span>}
                </div>
                <div className="mt-2 text-[10px] text-slate-600 italic">
                  One door must fully close before the other can open.
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-600">This door is not part of a mantrap pair.</p>
            )}
          </div>

        </div>
      </div>

      {editingDevice !== null && (
        <DeviceModal
          device={editingDevice.id ? editingDevice : undefined}
          defaultIo={editingDevice.io}
          onClose={() => setEditingDevice(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove device?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
