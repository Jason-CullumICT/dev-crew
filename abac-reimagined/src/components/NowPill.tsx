import { useEffect, useState } from 'react'

function getTzAbbreviation(date: Date): string {
  // Extract the short timezone abbreviation from a formatted date string.
  // Intl.DateTimeFormat with timeZoneName:'short' produces strings like
  // "Fri, Apr 10, 2026, 5:35 PM NZST" — we grab the last space-delimited token.
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(date)
    const tzPart = parts.find(p => p.type === 'timeZoneName')
    return tzPart?.value ?? ''
  } catch {
    return ''
  }
}

export default function NowPill() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day  = days[time.getDay()]
  const h    = String(time.getHours()).padStart(2, '0')
  const m    = String(time.getMinutes()).padStart(2, '0')
  const tzAbbr = getTzAbbreviation(time)

  return (
    <div className="flex items-center gap-1.5 bg-[#041008] border border-[#14532d] rounded-full px-3 py-1 text-xs font-mono text-green-400 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <span>{day} {h}:{m}</span>
      {tzAbbr && (
        <span className="text-green-600 ml-0.5">{tzAbbr}</span>
      )}
    </div>
  )
}
