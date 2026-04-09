// Full implementation in Task 13
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60" onClick={onClose}>
      <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
        <p className="text-slate-500 text-[11px]">Command Palette — coming in Task 13</p>
      </div>
    </div>
  )
}
