import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Share2, Search, Activity, Users, UsersRound,
  KeyRound, CalendarClock, DoorOpen, Building2, Shield,
  Layers, FileText, Cpu, LayoutDashboard,
  Monitor as MonitorIcon, CircuitBoard, Workflow, GitBranch, UserCheck,
  UserPlus, CreditCard, BarChart3, HeartPulse,
} from 'lucide-react'
import NowPill from './NowPill'
import CommandPalette from './CommandPalette'
import ErrorBoundary from './ErrorBoundary'
import SimulationToggle from './SimulationToggle'
import ThreatLevelPill from './ThreatLevelPill'
import { useStore } from '../store/store'
import { useSimulation } from '../hooks/useSimulation'
import { Button } from '../ui/button'
import { cn } from '../lib/utils'

const primaryNav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', color: '#22c55e' },
  { to: '/canvas',    icon: Share2,          label: 'Canvas',    color: '#6366f1' },
  { to: '/monitor',   icon: MonitorIcon,     label: 'Monitor',   color: '#ef4444' },
  { to: '/oracle',    icon: Search,          label: 'Oracle',    color: '#8b5cf6' },
  { to: '/reasoner',  icon: Activity,        label: 'Reasoner',  color: '#06b6d4' },
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
  { to: '/hardware',    icon: CircuitBoard, label: 'Hardware' },
  { to: '/rules',       icon: Workflow,     label: 'Rules' },
  { to: '/escalations', icon: GitBranch,    label: 'Escalations' },
  { to: '/muster',      icon: UserCheck,    label: 'Muster' },
  { to: '/visitors',      icon: UserPlus,     label: 'Visitors' },
  { to: '/credentials',   icon: CreditCard,   label: 'Credentials' },
  { to: '/reports',       icon: BarChart3,    label: 'Reports' },
  { to: '/system-health', icon: HeartPulse,   label: 'System Health' },
]

// Map pathname segments to display names
const PAGE_NAMES: Record<string, string> = {
  canvas:      'Canvas',
  monitor:     'Monitor',
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
  hardware:    'Hardware',
  intrusion:   'Intrusion',
  rules:       'Response Rules',
  escalations: 'Escalation Chains',
  muster:      'Muster Report',
  visitors:    'Visitor Management',
  credentials:    'Credentials',
  reports:        'Compliance Reports',
  'system-health': 'System Health',
}

function usePageTitle() {
  const location = useLocation()
  const segment = location.pathname.replace(/^\//, '').split('/')[0]
  return PAGE_NAMES[segment] ?? ''
}

function SidebarItem({ to, icon: Icon, label, color, badge }: { to: string; icon: React.ElementType; label: string; color?: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      title={label}
      className="relative group w-full"
    >
      {({ isActive }) => (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-3 px-3 h-9 font-medium text-sm rounded-lg',
            isActive
              ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-l-2 border-[hsl(var(--primary))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
          asChild={false}
        >
          <Icon
            size={16}
            style={{ color: isActive ? (color ?? 'hsl(var(--primary))') : undefined }}
            strokeWidth={1.8}
            className="shrink-0"
          />
          <span className="truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white leading-none shrink-0">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </Button>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pageTitle = usePageTitle()

  // Start simulation engine
  useSimulation()

  // Unacknowledged alarm count for badge
  const alarms = useStore(s => s.alarms)
  const unacknowledgedCount = alarms.filter(a => a.state === 'active').length

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
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      {/* Sidebar — 208px wide with text labels */}
      <aside className="w-52 shrink-0 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col py-4 overflow-y-auto">
        {/* Logo */}
        <div className="px-3 mb-5 flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold leading-none">A</span>
          </div>
          <span className="text-sm font-bold text-[hsl(var(--foreground))]">Axon ABAC</span>
        </div>

        <div className="px-2 space-y-0.5">
          {primaryNav.map(item => (
            <SidebarItem
              key={item.to}
              {...item}
              badge={item.to === '/monitor' ? unacknowledgedCount : undefined}
            />
          ))}
        </div>

        <div className="mx-3 my-3 h-px bg-[hsl(var(--border))]" />

        <div className="px-2 space-y-0.5">
          {entityNav.map(item => <SidebarItem key={item.to} {...item} />)}
        </div>

        <div className="mx-3 my-3 h-px bg-[hsl(var(--border))]" />

        <div className="px-2">
          <SidebarItem to="/intrusion" icon={Shield} label="Intrusion" />
        </div>

        <div className="mt-auto px-3 pt-3">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center justify-center text-[11px] text-[hsl(var(--muted-foreground))] font-semibold cursor-pointer hover:border-[hsl(var(--primary))] transition-colors">
            SC
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-12 shrink-0 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] flex items-center px-5 gap-3">
          {pageTitle && (
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {pageTitle}
            </span>
          )}

          <div className="flex-1" />

          <SimulationToggle />
          <ThreatLevelPill />

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
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
