import { useStore } from '../store/store'

export default function SimulationToggle() {
  const speed    = useStore(s => s.simulationSpeed)
  const setSpeed = useStore(s => s.setSimulationSpeed)

  const isRunning = speed > 0

  function togglePlay() {
    setSpeed(isRunning ? 0 : 1)
  }

  function toggleSpeed() {
    if (!isRunning) return
    setSpeed(speed === 1 ? 10 : 1)
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        title={isRunning ? 'Pause simulation' : 'Start simulation'}
        className="w-[26px] h-[26px] rounded-md flex items-center justify-center border transition-colors
          border-[#1e293b] bg-[#0b0f1a] hover:border-slate-600 text-slate-400 hover:text-slate-200"
      >
        {isRunning ? (
          /* Pause icon */
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
            <rect x="6"   y="1" width="2.5" height="8" rx="0.5" />
          </svg>
        ) : (
          /* Play icon */
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 1.5 L9 5 L2 8.5 Z" />
          </svg>
        )}
      </button>

      {/* Speed toggle — only shown when running */}
      {isRunning && (
        <button
          onClick={toggleSpeed}
          title={`Speed: ${speed}x — click to toggle`}
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-[#1e293b] bg-[#0b0f1a] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
        >
          {speed}x
        </button>
      )}

      {/* LIVE indicator */}
      {isRunning && (
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      )}
    </div>
  )
}
