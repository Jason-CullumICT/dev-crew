import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Share2, Search, Activity, Users, UsersRound,
  KeyRound, CalendarClock, DoorOpen, Building2, Shield,
  Layers, FileText, Cpu, LayoutDashboard,
} from 'lucide-react'
import NowPill from './NowPill'
import CommandPalette from './CommandPalette'
import ErrorBoundary from './ErrorBoundary'

const primaryNav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', color: '#22c55e' },
  { to: '/canvas',    icon: Share2,       label: 'Canvas',      color: '#6366f1' },
  { to: '/oracle',    icon: Search,       label: 'Oracle',      color: '#8b5cf6' },
  { to: '/reasoner',  icon: Activity,     label: 'Reasoner',    color: '#06b6d4' },
]

const entityNav = [
  { to: '/people',      icon: Users,        label: 'People' },
  { to: '/groups',      icon: UsersRound,   label: 'Groups' },
  { to: '/grants',      icon: KeyRound,     label: 'Grants' },
  { to: '/schedules',   icon: CalendarClock,label: 'Schedules' },
  { to: '/doors',       icon: DoorOpen,     label: 'Doors' },
  { to: '/sites',       icon: Building2,    label: 'Sites' },
  { to: '/zones',       icon: Layers,       label: 'Zones' },
  { to: '/policies',    icon: FileText,     label: 'Policies' },
  { to: '/controllers', icon: Cpu,          label: 'Controllers' },
]

// Map pathname segments to display names
const PAGE_NAMES: Record<string, string> = {
  canvas:      'Canvas',
  oracle:      'Oracle',
  reasoner:    'Reasoner',
  people:      'People',
  groups:      'Groups',
  grants:      'Grants',
  schedules:   'Schedules',
  doors:       'Doors',
  sites:       'Sites',
  zones:       'Zones',
  policies:    'Policies',
  controllers: 'Controllers',
  intrusion:   'Intrusion',
}

function usePageTitle() {
  const location = useLocation()
  const segment = location.pathname.replace(/^\//, '').split('/')[0]
  return PAGE_NAMES[segment] ?? ''
}

function SidebarItem({ to, icon: Icon, label, color }: { to: string; icon: React.ElementType; label: string; color?: string }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `relative group w-[38px] h-[38px] rounded-lg flex items-center justify-center transition-colors ${
          isActive
            ? 'bg-white/[0.06] border border-white/10'
            : 'hover:bg-white/[0.04]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Left accent bar for active state */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[18px] rounded-r bg-indigo-500"
              aria-hidden="true"
            />
          )}
          <Icon
            size={17}
            style={{ color: isActive ? (color ?? '#94a3b8') : '#374151' }}
            strokeWidth={1.8}
          />
          <div className="absolute left-[46px] bg-[#1c1f2e] border border-[#2d3148] rounded-md px-2.5 py-1 text-[11px] text-slate-200 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            {label}
          </div>
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pageTitle = usePageTitle()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#060912]">
      {/* Sidebar */}
      <aside className="w-14 shrink-0 bg-[#07090f] border-r border-[#141828] flex flex-col items-center py-3 gap-1 overflow-y-auto">
        {/* Logo */}
        <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shrink-0">
          <span className="text-white text-base font-bold leading-none">A</span>
        </div>

        {primaryNav.map(item => <SidebarItem key={item.to} {...item} />)}

        <div className="w-7 h-px bg-[#141828] my-1.5 shrink-0" />

        {entityNav.map(item => <SidebarItem key={item.to} {...item} />)}

        <div className="w-7 h-px bg-[#141828] my-1.5 shrink-0" />

        <SidebarItem to="/intrusion" icon={Shield} label="Intrusion" />

        <div className="mt-auto w-[30px] h-[30px] rounded-full bg-[#1c1f2e] border border-[#2d3148] flex items-center justify-center text-[11px] text-slate-400 font-semibold cursor-pointer hover:border-indigo-500 transition-colors">
          SC
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[42px] shrink-0 bg-[#08090f] border-b border-[#141828] flex items-center px-4 gap-3">
          {/* Page title on the left */}
          {pageTitle && (
            <span className="text-[12px] font-semibold text-slate-400">
              {pageTitle}
            </span>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <span>⌘K</span>
          </button>
          <NowPill />
        </header>

        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
