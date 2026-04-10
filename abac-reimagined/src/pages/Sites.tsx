import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import SiteModal from '../modals/SiteModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Site, SiteStatus, ZoneStatus } from '../types'

const SITE_STATUS_CLASS: Record<SiteStatus, string> = {
  Disarmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Armed:      'bg-red-500/10 text-red-400 border-red-500/20',
  PartialArm: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Alarm:      'bg-red-600/20 text-red-300 border-red-600/30',
  Lockdown:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const ZONE_STATUS_CLASS: Record<ZoneStatus, string> = {
  Armed:    'bg-red-500/10 text-red-400 border-red-500/20',
  Disarmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Alarm:    'bg-red-600/20 text-red-300 border-red-600/30',
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
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Sites & Zones</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-600">{sites.length} sites</span>
          <button
            onClick={() => setEditing('new')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            + New
          </button>
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
        <p className="text-[12px] text-slate-600">
          {search ? 'No sites match your search.' : 'No sites yet. Click + New to create one.'}
        </p>
      )}

      <div className="space-y-4">
        {filtered.map(site => {
          const siteZones = zones.filter(z => z.siteId === site.id)
          return (
            <div key={site.id} className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-slate-100">{site.name}</div>
                  <div className="text-[10px] text-slate-500">{site.address}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${SITE_STATUS_CLASS[site.status]}`}>{site.status}</span>
                  <button
                    onClick={() => setEditing(site)}
                    aria-label="Edit"
                    className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setPendingDelete(site)}
                    aria-label="Delete"
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {siteZones.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {siteZones.map(zone => (
                    <div key={zone.id} className="bg-[#080b10] border border-[#141828] rounded-lg px-3 py-2 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium text-slate-300">{zone.name}</div>
                        <div className="text-[9px] text-slate-600">{zone.type}</div>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${ZONE_STATUS_CLASS[zone.status]}`}>{zone.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
