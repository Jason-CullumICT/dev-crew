import { useEffect, useRef } from 'react'
import { AlertTriangle, AlertCircle } from 'lucide-react'

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    // Focus cancel button when dialog opens
    cancelRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'
  const IconComponent = isDanger ? AlertCircle : AlertTriangle
  const iconClass = isDanger ? 'text-red-400' : 'text-amber-400'
  const confirmClass = isDanger
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-amber-600 hover:bg-amber-500 text-white'
  const borderAccent = isDanger ? 'border-red-900/40' : 'border-amber-900/40'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`bg-[#0d1117] border ${borderAccent} rounded-xl shadow-2xl w-full max-w-sm mx-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <IconComponent size={18} className={`${iconClass} shrink-0 mt-0.5`} />
            <div className="space-y-1.5">
              <div
                id="confirm-dialog-title"
                className="text-[13px] font-semibold text-slate-100"
              >
                {title}
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">{message}</p>
            </div>
          </div>

          {details && details.length > 0 && (
            <ul className="ml-9 space-y-1">
              {details.map((d, i) => (
                <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                  <span className="text-slate-600 mt-px">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#1e293b]">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg bg-[#1e293b] text-slate-400 text-[12px] hover:bg-[#263548] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${confirmClass}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
