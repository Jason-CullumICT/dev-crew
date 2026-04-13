import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'

interface ModalProps {
  title: string
  onClose: () => void
  onSave: () => void
  size?: 'md' | 'lg'
  children: React.ReactNode
}

export default function Modal({ title, onClose, onSave, size = 'md', children }: ModalProps) {
  const maxW = size === 'lg' ? 'max-w-xl' : 'max-w-md'

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className={`${maxW} max-h-[85vh] flex flex-col gap-0 p-0`}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[hsl(var(--border))] shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[hsl(var(--border))] gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
