import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import ZoneModal from '../modals/ZoneModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Zone, ZoneType, ZoneStatus } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

const TYPE_VARIANT: Record<ZoneType, 'info' | 'secondary' | 'destructive' | 'success' | 'violet'> = {
  Perimeter:  'info',
  Interior:   'secondary',
  Restricted: 'destructive',
  Public:     'success',
  Secure:     'violet',
}

const STATUS_VARIANT: Record<ZoneStatus, 'destructive' | 'success' | 'outline'> = {
  Armed:    'destructive',
  Disarmed: 'success',
  Alarm:    'destructive',
}

export default function Zones() {
  const zones      = useStore(s => s.zones)
  const sites      = useStore(s => s.sites)
  const doors      = useStore(s => s.doors)
  const deleteZone = useStore(s => s.deleteZone)

  const [editing, setEditing]             = useState<Zone | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Zone | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return zones
    return zones.filter(z => z.name.toLowerCase().includes(q))
  }, [zones, search])

  function getCascadeDetails(zone: Zone): string[] {
    const details: string[] = []
    const zoneDoorCount = doors.filter(d => d.zoneId === zone.id).length
    if (zoneDoorCount > 0) {
      details.push(`${zoneDoorCount} door${zoneDoorCount !== 1 ? 's' : ''} in this zone will lose their zone assignment`)
    }
    return details
  }

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteZone(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  const cascadeDetails = pendingDelete ? getCascadeDetails(pendingDelete) : []

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Zones</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{zones.length} zones</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by zone name..."
        resultCount={filtered.length}
        totalCount={zones.length}
      />

      {filtered.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {search ? 'No zones match your search.' : 'No zones yet. Click + New to create one.'}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-2">
        {filtered.map(zone => {
          const site = sites.find(s => s.id === zone.siteId)
          return (
            <div key={zone.id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{zone.name}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{site?.name ?? zone.siteId}</div>
              </div>
              <Badge variant={TYPE_VARIANT[zone.type]} className="text-[9px]">{zone.type}</Badge>
              <Badge variant={STATUS_VARIANT[zone.status]} className="text-[9px]">{zone.status}</Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(zone)}
                aria-label="Edit"
                className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
              >
                <Pencil size={12} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPendingDelete(zone)}
                aria-label="Delete"
                className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <ZoneModal zone={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete zone?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        details={cascadeDetails}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="warning"
      />
    </div>
  )
}
