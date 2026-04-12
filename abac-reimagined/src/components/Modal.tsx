import { useEffect, useRef } from 'react'
import { useDesignSystem } from '../contexts/DesignSystemContext'
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

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function ClassicModal({ title, onClose, onSave, size = 'md', children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const el = dialogRef.current
    if (!el) return
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  const maxW = size === 'lg' ? 'max-w-xl' : 'max-w-md'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-[#0d1117] border border-[#1e293b] rounded-xl shadow-2xl w-full ${maxW} max-h-[80vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e293b] shrink-0">
          <span className="text-[13px] font-semibold text-slate-100">{title}</span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors"
          >
            &#x2715;
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#1e293b] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1e293b] text-slate-400 text-[12px] hover:bg-[#263548] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-500 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ShadcnModal({ title, onClose, onSave, size = 'md', children }: ModalProps) {
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

export default function Modal(props: ModalProps) {
  const { designSystem } = useDesignSystem()

  if (designSystem === 'shadcn') {
    return <ShadcnModal {...props} />
  }

  return <ClassicModal {...props} />
}
