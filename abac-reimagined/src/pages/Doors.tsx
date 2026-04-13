import { useState, useMemo, useRef } from 'react'
import { Pencil, Trash2, Settings2, ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useStore } from '../store/store'
import DoorModal from '../modals/DoorModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Door } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

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
    estimateSize: () => 60,
    overscan: 10,
  })

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteDoor(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-4 flex flex-col h-full overflow-hidden bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Doors</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{doors.length} doors</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      <div className="shrink-0 space-y-2">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by door name, site, or zone..."
          resultCount={filtered.length}
          totalCount={doors.length}
        />
        {/* Zone color legend */}
        <div className="flex items-center gap-4 text-[9px] text-[hsl(var(--muted-foreground))] flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500/40 border border-red-500/40" />
            <span>Red border = Restricted / Secure zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--border))] border border-[hsl(var(--border))]" />
            <span>Default = Perimeter / Interior / Public</span>
          </div>
        </div>
      </div>

      {/* Virtual scroll container */}
      <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
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
                <div className={`bg-[hsl(var(--card))] border rounded-lg px-4 py-3 flex items-center gap-3 ${isRestricted ? 'border-red-500/40' : 'border-[hsl(var(--border))]'}`}>
                  <span className="text-[18px] shrink-0">🚪</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold ${isRestricted ? 'text-red-400' : 'text-[hsl(var(--foreground))]'}`}>
                        {door.name}
                      </span>
                      {door.isElevator && (
                        <Badge variant="info" className="text-[8px] px-1 py-0 flex items-center gap-0.5">
                          <ArrowUpDown size={8} />
                          LIFT
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {site?.name} {zone ? `· ${zone.name} (${zone.type})` : ''}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-cyan-400"
                  >
                    <Link to={`/doors/${door.id}`} aria-label="Configure">
                      <Settings2 size={12} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(door)}
                    aria-label="Edit"
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(door)}
                    aria-label="Delete"
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] py-4">
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
