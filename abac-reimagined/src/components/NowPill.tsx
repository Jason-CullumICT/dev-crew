import { useEffect, useState } from 'react'

export default function NowPill() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[time.getDay()]
  const h = String(time.getHours()).padStart(2, '0')
  const m = String(time.getMinutes()).padStart(2, '0')
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace(/_/g, ' ') ?? ''

  return (
    <div className="flex items-center gap-1.5 bg-[#041008] border border-[#14532d] rounded-full px-3 py-1 text-xs font-mono text-green-400 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {day} {h}:{m}
      {tz && <span className="text-[#14532d] ml-0.5">{tz}</span>}
    </div>
  )
}
