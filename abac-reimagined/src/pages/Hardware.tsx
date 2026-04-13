import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import DeviceModal from '../modals/DeviceModal'
import type { InputDevice, OutputDevice, DeviceStatus } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

type AnyDevice = (InputDevice & { io: 'Input' }) | (OutputDevice & { io: 'Output' })

const GRID_COLS = '2fr 60px 1fr 1.5fr 1.5fr 1.5fr 60px 1fr 80px'

function StatusBadge({ status }: { status: DeviceStatus }) {
  const dotClass = {
    online:      'bg-emerald-500',
    offline:     'bg-red-500 animate-pulse',
    tamper:      'bg-amber-500 animate-pulse',
    fault:       'bg-amber-500 animate-pulse',
    low_battery: 'bg-amber-400',
  }[status] ?? 'bg-[hsl(var(--muted-foreground))]'

  const textClass = {
    online:      'text-emerald-400',
    offline:     'text-red-400',
    tamper:      'text-amber-400',
    fault:       'text-amber-400',
    low_battery: 'text-amber-300',
  }[status] ?? 'text-[hsl(var(--muted-foreground))]'

  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <span className={`text-[10px] ${textClass}`}>{status}</span>
    </span>
  )
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
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Hardware</h1>
          <Badge variant="secondary" className="text-xs font-semibold">
            {combined.length.toLocaleString()} devices
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingDevice('new-input')}
          >
            + Input
          </Button>
          <Button
            size="sm"
            onClick={() => setEditingDevice('new-output')}
          >
            + Output
          </Button>
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
        className="shrink-0 grid text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold px-3 py-1.5 border-b border-[hsl(var(--border))]"
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
                className="grid items-center px-3 border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--accent))] transition-colors text-[11px]"
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
                <span className="text-[hsl(var(--foreground))] font-medium truncate pr-2">{device.name}</span>
                <Badge
                  variant={device.io === 'Input' ? 'info' : 'violet'}
                  className="text-[9px] w-fit"
                >
                  {device.io}
                </Badge>
                <span className="text-[hsl(var(--muted-foreground))] truncate pr-2">{device.type.replace(/_/g, ' ')}</span>
                <span className="text-[hsl(var(--muted-foreground))] truncate pr-2">{door?.name ?? '—'}</span>
                <span className="text-[hsl(var(--muted-foreground))]/70 truncate pr-2">{site?.name ?? '—'}</span>
                <span className="text-[hsl(var(--muted-foreground))]/70 truncate pr-2">{controller?.name ?? '—'}</span>
                <span className="text-center text-[hsl(var(--muted-foreground))]">{device.port}</span>
                <StatusBadge status={device.status} />
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingDevice(device)}
                    aria-label="Edit"
                    className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                  >
                    <Pencil size={11} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(device)}
                    aria-label="Delete"
                    className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                  >
                    <Trash2 size={11} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] py-8 text-center">
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
