import { useState, useMemo } from 'react'
import { Pencil, Trash2, Search, X } from 'lucide-react'
import { useStore } from '../store/store'
import GrantModal from '../modals/GrantModal'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Grant } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

export default function Grants() {
  const grants      = useStore(s => s.grants)
  const groups      = useStore(s => s.groups)
  const schedules   = useStore(s => s.schedules)
  const sites       = useStore(s => s.sites)
  const zones       = useStore(s => s.zones)
  const deleteGrant = useStore(s => s.deleteGrant)

  const [editing, setEditing]             = useState<Grant | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Grant | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return grants
    return grants.filter(g => g.name.toLowerCase().includes(q))
  }, [grants, search])

  function getCascadeDetails(grant: Grant): string[] {
    const details: string[] = []
    const affectedGroups = groups.filter(g => g.inheritedPermissions.includes(grant.id))
    if (affectedGroups.length > 0) {
      details.push(`${affectedGroups.length} group${affectedGroups.length !== 1 ? 's' : ''} will lose this permission`)
    }
    return details
  }

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteGrant(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  const cascadeDetails = pendingDelete ? getCascadeDetails(pendingDelete) : []

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Grants</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{grants.length} grants</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by grant name..."
          className="pl-9 pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {search ? 'No grants match your search.' : 'No grants yet. Click + New to create one.'}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(grant => {
          const schedule = grant.scheduleId ? schedules.find(s => s.id === grant.scheduleId) : null
          const targetName = grant.scope === 'site'
            ? sites.find(s => s.id === grant.targetId)?.name
            : grant.scope === 'zone'
              ? zones.find(z => z.id === grant.targetId)?.name
              : null

          const scopeVariant = ((): 'info' | 'success' | 'warning' => {
            if (grant.scope === 'global') return 'info'
            if (grant.scope === 'site') return 'success'
            return 'warning'
          })()

          const modeVariant = ((): 'secondary' | 'warning' | 'violet' => {
            if (grant.applicationMode === 'assigned') return 'secondary'
            if (grant.applicationMode === 'conditional') return 'warning'
            return 'violet'
          })()

          return (
            <Card key={grant.id} className="min-h-[180px] flex flex-col border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm text-[hsl(var(--primary))]">{grant.name}</CardTitle>
                  <Badge variant={scopeVariant} className="text-[10px] shrink-0">
                    {grant.scope}
                  </Badge>
                </div>
                {grant.description && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{grant.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-2">
                {grant.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {grant.actions.map(a => (
                      <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={modeVariant} className="text-[10px]">{grant.applicationMode}</Badge>
                  {schedule && (
                    <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/30">{schedule.name}</Badge>
                  )}
                  {targetName && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">→ {targetName}</span>
                  )}
                </div>
                <div className="flex gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(grant)}
                    aria-label="Edit"
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(grant)}
                    aria-label="Delete"
                    className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {editing !== null && (
        <GrantModal grant={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete grant?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        details={cascadeDetails}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
