import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import DoorModal from '../modals/DoorModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Door } from '../types'

export default function Doors() {
  const doors      = useStore(s => s.doors)
  const zones      = useStore(s => s.zones)
  const sites      = useStore(s => s.sites)
  const deleteDoor = useStore(s => s.deleteDoor)

  const [editing, setEditing]             = useState<Door | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Door | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return doors
    return doors.filter(door => {
      const zone = zones.find(z => z.id === door.zoneId)
      const site = sites.find(s => s.id === door.siteId)
      return (
        door.name.toLowerCase().includes(q) ||
        (site?.name.toLowerCase().includes(q) ?? false) ||
        (zone?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [doors, zones, sites, search])

  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // px — accounts for gap between cards
    overscan: 10,
  })

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteDoor(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-100">Doors</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{doors.length} doors</span>
          <button
            onClick={() => setEditing('new')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      <div className="shrink-0">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by door name, site, or zone..."
          resultCount={filtered.length}
          totalCount={doors.length}
        />
      </div>

      {/* Virtual scroll container — single-column for simplicity with virtualizer */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const door = filtered[virtualRow.index]
            const zone = zones.find(z => z.id === door.zoneId)
            const site = sites.find(s => s.id === door.siteId)
            const isRestricted = zone?.type === 'Restricted' || zone?.type === 'Secure'
            return (
              <div
                key={door.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '8px',
                }}
              >
                <div className={`bg-[#0a0d14] border rounded-lg px-4 py-3 flex items-center gap-3 ${isRestricted ? 'border-red-900/40' : 'border-[#1e293b]'}`}>
                  <span className="text-[18px] shrink-0">🚪</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-semibold ${isRestricted ? 'text-red-300' : 'text-slate-200'}`}>{door.name}</div>
                    <div className="text-[10px] text-slate-600">{site?.name} {zone ? `· ${zone.name} (${zone.type})` : ''}</div>
                  </div>
                  <button
                    onClick={() => setEditing(door)}
                    aria-label="Edit"
                    className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(door)}
                    aria-label="Delete"
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-[12px] text-slate-600 py-4">
            {search ? 'No doors match your search.' : 'No doors yet. Click + New to create one.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <DoorModal door={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete door?"
        message={`"${pendingDelete?.name}" will be permanently deleted and removed from all policies and controllers.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
