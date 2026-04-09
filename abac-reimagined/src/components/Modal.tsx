import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  onSave: () => void
  size?: 'md' | 'lg'
  children: React.ReactNode
}

export default function Modal({ title, onClose, onSave, size = 'md', children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const maxW = size === 'lg' ? 'max-w-xl' : 'max-w-md'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={`bg-[#0d1117] border border-[#1e293b] rounded-xl shadow-2xl w-full ${maxW} max-h-[80vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e293b] shrink-0">
          <span className="text-[13px] font-semibold text-slate-100">{title}</span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none transition-colors"
          >
            ✕
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
