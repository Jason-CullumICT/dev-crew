import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  resultCount?: number
  totalCount?: number
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  resultCount,
  totalCount,
}: SearchBarProps) {
  const isFiltered = value.trim().length > 0

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search
          size={12}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#0f1320] border border-[#1e2d4a] rounded-lg pl-8 pr-8 py-2 text-[12px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
        />
        {isFiltered && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {isFiltered && resultCount !== undefined && totalCount !== undefined && (
        <span className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">
          Showing {resultCount} of {totalCount}
        </span>
      )}
    </div>
  )
}
