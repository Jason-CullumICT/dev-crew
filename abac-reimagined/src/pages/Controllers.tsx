import { useState, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import ControllerModal from '../modals/ControllerModal'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Controller } from '../types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

export default function Controllers() {
  const controllers      = useStore(s => s.controllers)
  const sites            = useStore(s => s.sites)
  const doors            = useStore(s => s.doors)
  const deleteController = useStore(s => s.deleteController)

  const [editing, setEditing]             = useState<Controller | null | 'new'>(null)
  const [search, setSearch]               = useState('')
  const [pendingDelete, setPendingDelete] = useState<Controller | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return controllers
    return controllers.filter(ctrl =>
      ctrl.name.toLowerCase().includes(q) ||
      ctrl.location.toLowerCase().includes(q)
    )
  }, [controllers, search])

  function handleDeleteConfirm() {
    if (pendingDelete) {
      deleteController(pendingDelete.id)
      setPendingDelete(null)
    }
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full bg-[hsl(var(--background))]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Controllers</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{controllers.length} controllers</span>
          <Button size="sm" onClick={() => setEditing('new')}>
            + New
          </Button>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name or location..."
        resultCount={filtered.length}
        totalCount={controllers.length}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map(ctrl => {
          const site = sites.find(s => s.id === ctrl.siteId)
          return (
            <Card key={ctrl.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{ctrl.name}</CardTitle>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {site?.name} · {ctrl.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(ctrl)}
                      aria-label="Edit"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(ctrl)}
                      aria-label="Delete"
                      className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {ctrl.doorIds.length > 0 && (
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {ctrl.doorIds.map(id => (
                      <Badge key={id} variant="secondary" className="text-[9px]">
                        🚪 {doors.find(d => d.id === id)?.name ?? id}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {search ? 'No controllers match your search.' : 'No controllers yet.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <ControllerModal controller={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete controller?"
        message={`"${pendingDelete?.name}" will be permanently deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
        variant="danger"
      />
    </div>
  )
}
