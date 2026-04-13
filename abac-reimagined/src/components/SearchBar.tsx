import { Search, X } from 'lucide-react'
import { Input } from '../ui/input'

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
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] pointer-events-none"
        />
        <Input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        {isFiltered && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {isFiltered && resultCount !== undefined && totalCount !== undefined && (
        <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 whitespace-nowrap">
          Showing {resultCount} of {totalCount}
        </span>
      )}
    </div>
  )
}
