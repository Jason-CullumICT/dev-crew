import { useEffect, useRef } from 'react'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  details?: string[]
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export default function ConfirmDialog({
  open,
  title,
  message,
  details,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
  }, [open])

  const isDanger = variant === 'danger'
  const IconComponent = isDanger ? AlertCircle : AlertTriangle
  const iconClass = isDanger ? 'text-red-400' : 'text-amber-400'

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <IconComponent size={16} className={`${iconClass} shrink-0`} />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{message}</p>

          {details && details.length > 0 && (
            <ul className="space-y-1">
              {details.map((d, i) => (
                <li key={i} className="text-xs text-[hsl(var(--muted-foreground))] flex items-start gap-1.5">
                  <span className="mt-px opacity-50">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            ref={cancelRef}
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isDanger ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
