import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import SiteModal from '../modals/SiteModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Site, SiteStatus, ZoneStatus } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

const SITE_STATUS_VARIANT: Record<SiteStatus, 'success' | 'destructive' | 'warning' | 'violet' | 'outline'> = {
  Disarmed:   'success',
  Armed:      'destructive',
  PartialArm: 'warning',
  Alarm:      'destructive',
  Lockdown:   'violet',
}

const ZONE_STATUS_VARIANT: Record<ZoneStatus, 'destructive' | 'success' | 'outline'> = {
  Armed:    'destructive',
  Disarmed: 'success',
  Alarm:    'destructive',
}

export default function Sites() {
  const sites      = useStore(s => s.sites)
  const zones      = useStore(s => s.zones)
  const doors      = useStore(s => s.doors)
  const deleteSite = useStore(s => s.deleteSite)

  const [editing, setEditing]             = useState<Site | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Site | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sites
    return sites.filter(s => s.name.toLowerCase().includes(q))
  }, [sites, search])

  function getCascadeDetails(site: Site): string[] {
    const details: string[] = []
    const siteZoneCount = zones.filter(z => z.siteId === site.id).length
    const siteDoorCount = doors.filter(d => d.siteId === site.id).length
    if (siteZoneCount > 0) {
      details.push(`${siteZoneCount} zone${siteZoneCount !== 1 ? 's' : ''} will also be deleted`)
    }
    if (siteDoorCount > 0) {
      details.push(`${siteDoorCount} door${siteDoorCount !== 1 ? 's' : ''} will also be deleted`)
    }
    return details
  }

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteSite(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  const cascadeDetails = pendingDelete ? getCascadeDetails(pendingDelete) : []

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Sites & Zones</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{sites.length} sites</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by site name..."
        resultCount={filtered.length}
        totalCount={sites.length}
      />

      {filtered.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {search ? 'No sites match your search.' : 'No sites yet. Click + New to create one.'}
        </p>
      )}

      <div className="space-y-4">
        {filtered.map(site => {
          const siteZones = zones.filter(z => z.siteId === site.id)
          return (
            <Card key={site.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{site.name}</CardTitle>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{site.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={SITE_STATUS_VARIANT[site.status]} className="text-[9px]">
                      {site.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(site)}
                      aria-label="Edit"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(site)}
                      aria-label="Delete"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {siteZones.length > 0 && (
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {siteZones.map(zone => (
                      <div key={zone.id} className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-[hsl(var(--foreground))]">{zone.name}</div>
                          <div className="text-[9px] text-[hsl(var(--muted-foreground))]">{zone.type}</div>
                        </div>
                        <Badge variant={ZONE_STATUS_VARIANT[zone.status]} className="text-[8px]">
                          {zone.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {editing !== null && (
        <SiteModal site={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete site?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        details={cascadeDetails}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
