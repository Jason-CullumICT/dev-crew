import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import DeviceModal from '../modals/DeviceModal'
import type { InputDevice, OutputDevice, DeviceStatus } from '../types'

type AnyDevice = (InputDevice & { io: 'Input' }) | (OutputDevice & { io: 'Output' })

const GRID_COLS = '2fr 60px 1fr 1.5fr 1.5fr 1.5fr 60px 1fr 80px'

function StatusBadge({ status }: { status: DeviceStatus }) {
  if (status === 'online') {
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-[10px] text-green-400">online</span>
      </span>
    )
  }
  if (status === 'offline') {
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
        <span className="text-[10px] text-red-400">offline</span>
      </span>
    )
  }
  if (status === 'tamper') {
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
        <span className="text-[10px] text-amber-400">tamper</span>
      </span>
    )
  }
  if (status === 'fault') {
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
        <span className="text-[10px] text-amber-400">fault</span>
      </span>
    )
  }
  if (status === 'low_battery') {
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <span className="text-[10px] text-amber-300">low_battery</span>
      </span>
    )
  }
  return <span className="text-[10px] text-slate-600">{status}</span>
}

export default function Hardware() {
  const inputDevices      = useStore(s => s.inputDevices)
  const outputDevices     = useStore(s => s.outputDevices)
  const doors             = useStore(s => s.doors)
  const sites             = useStore(s => s.sites)
  const controllers       = useStore(s => s.controllers)
  const deleteInputDevice  = useStore(s => s.deleteInputDevice)
  const deleteOutputDevice = useStore(s => s.deleteOutputDevice)

  const [search, setSearch]               = useState('')
  const [editingDevice, setEditingDevice] = useState<AnyDevice | null | 'new-input' | 'new-output'>(null)
  const [pendingDelete, setPendingDelete] = useState<AnyDevice | null>(null)

  // Combine devices into unified list
  const combined = useMemo<AnyDevice[]>(() => {
    const inputs:  AnyDevice[] = inputDevices.map(d  => ({ ...d, io: 'Input'  as const }))
    const outputs: AnyDevice[] = outputDevices.map(d => ({ ...d, io: 'Output' as const }))
    return [...inputs, ...outputs]
  }, [inputDevices, outputDevices])

  const filtered = useMemo<AnyDevice[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return combined
    return combined.filter(device => {
      const door       = doors.find(d => d.id === device.doorId)
      const site       = sites.find(s => s.id === door?.siteId)
      const controller = controllers.find(c => c.id === device.controllerId)
      return (
        device.name.toLowerCase().includes(q) ||
        (door?.name.toLowerCase().includes(q) ?? false) ||
        (site?.name.toLowerCase().includes(q) ?? false) ||
        (controller?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [combined, search, doors, sites, controllers])

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 37,
    overscan: 15,
  })

  function handleDeleteConfirm() {
    if (!pendingDelete) return
    if (pendingDelete.io === 'Input') deleteInputDevice?.(pendingDelete.id)
    else deleteOutputDevice?.(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100">Hardware</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#111827] border border-[#1e293b] text-[10px] text-slate-400 font-semibold">
            {combined.length.toLocaleString()} devices
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingDevice('new-input')}
            className="px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1e293b] text-white text-[11px] font-semibold hover:bg-[#1a2035] transition-colors"
          >
            + Input
          </button>
          <button
            onClick={() => setEditingDevice('new-output')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            + Output
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, door, site, or controller..."
          resultCount={filtered.length}
          totalCount={combined.length}
        />
      </div>

      {/* Table header */}
      <div
        className="shrink-0 grid text-[9px] uppercase tracking-wider text-slate-600 font-semibold px-3 py-1.5"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <span>Name</span>
        <span>I/O</span>
        <span>Type</span>
        <span>Door</span>
        <span>Site</span>
        <span>Controller</span>
        <span className="text-center">Port</span>
        <span>Status</span>
        <span />
      </div>

      {/* Virtual table body */}
      <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const device     = filtered[virtualRow.index]
            const door       = doors.find(d => d.id === device.doorId)
            const site       = sites.find(s => s.id === door?.siteId)
            const controller = controllers.find(c => c.id === device.controllerId)

            return (
              <div
                key={`${device.io}-${device.id}`}
                className="grid items-center px-3 border-b border-[#0d1221] hover:bg-[#0a0d18] transition-colors text-[11px]"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: virtualRow.size,
                  gridTemplateColumns: GRID_COLS,
                }}
              >
                <span className="text-slate-200 font-medium truncate pr-2">{device.name}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border w-fit ${
                  device.io === 'Input'
                    ? 'text-blue-300 border-blue-800/50 bg-blue-900/20'
                    : 'text-violet-300 border-violet-800/50 bg-violet-900/20'
                }`}>
                  {device.io}
                </span>
                <span className="text-slate-400 truncate pr-2">{device.type.replace(/_/g, ' ')}</span>
                <span className="text-slate-400 truncate pr-2">{door?.name ?? '—'}</span>
                <span className="text-slate-500 truncate pr-2">{site?.name ?? '—'}</span>
                <span className="text-slate-500 truncate pr-2">{controller?.name ?? '—'}</span>
                <span className="text-center text-slate-500">{device.port}</span>
                <StatusBadge status={device.status} />
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
                    aria-label="Delete"
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-[12px] text-slate-600 py-8 text-center">
            {search ? 'No devices match your search.' : 'No hardware devices configured.'}
          </p>
        )}
      </div>

      {editingDevice !== null && (
        <DeviceModal
          device={editingDevice === 'new-input' || editingDevice === 'new-output' ? undefined : editingDevice}
          defaultIo={editingDevice === 'new-input' ? 'Input' : editingDevice === 'new-output' ? 'Output' : undefined}
          onClose={() => setEditingDevice(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete device?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
