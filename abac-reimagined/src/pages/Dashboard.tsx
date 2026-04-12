import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, DoorOpen, CalendarClock, ShieldAlert,
  Search, Activity, Share2, Shield,
} from 'lucide-react'
import { useStore } from '../store/store'
import { buildNowContext } from '../engine/scheduleEngine'
import { evaluateSchedule } from '../engine/scheduleEngine'
import type { ArmingLog } from '../types'
import EventFeed from '../components/EventFeed'
import AlarmCard from '../components/AlarmCard'
import { useDesignSystem } from '../contexts/DesignSystemContext'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

// ── Timeline helpers (mirrored from Intrusion) ────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

interface DotProps {
  action: string
  result: 'Success' | 'Denied'
}

function TimelineDot({ action, result }: DotProps) {
  if (result === 'Denied') {
    return (
      <div
        className="w-3 h-3 rounded-full border-2 shrink-0"
        style={{ borderColor: '#dc2626', backgroundColor: 'transparent' }}
      />
    )
  }
  const colorMap: Record<string, string> = {
    Armed:           '#dc2626',
    Disarmed:        '#10b981',
    Lockdown:        '#7c3aed',
    'Partial Arm':   '#f59e0b',
    'Clear Alarm':   '#f59e0b',
  }
  const color = colorMap[action] ?? '#64748b'
  return (
    <div
      className="w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  )
}

// ── Quick link card ────────────────────────────────────────────────────────────

interface QuickLinkProps {
  to: string
  icon: React.ElementType
  label: string
  description: string
  iconColor?: string
}

function QuickLink({ to, icon: Icon, label, description, iconColor }: QuickLinkProps) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="w-full text-left bg-[#0b0f1a] border border-[#1e293b] hover:border-slate-600 rounded-xl p-4 flex items-start gap-3 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-[#111827] border border-[#1e293b] flex items-center justify-center shrink-0 group-hover:border-slate-600 transition-colors">
        <Icon size={15} style={{ color: iconColor ?? '#6366f1' }} strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-slate-200">{label}</div>
        <div className="text-[10px] text-slate-600 mt-0.5">{description}</div>
      </div>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate    = useNavigate()
  const { designSystem } = useDesignSystem()
  const isShadcn = designSystem === 'shadcn'

  const users     = useStore(s => s.users)
  const doors     = useStore(s => s.doors)
  const zones     = useStore(s => s.zones)
  const sites     = useStore(s => s.sites)
  const schedules = useStore(s => s.schedules)
  const armingLog = useStore(s => s.armingLog)
  const resetToSeed = useStore(s => s.resetToSeed)
  const events    = useStore(s => s.events)
  const alarms    = useStore(s => s.alarms)

  // Ticker so relative timestamps refresh each minute
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Stat calculations ──────────────────────────────────────────────────────

  const employees   = users.filter(u => u.type === 'employee').length
  const contractors = users.filter(u => u.type === 'contractor').length
  const visitors    = users.filter(u => u.type === 'visitor').length

  const perimeterZones  = zones.filter(z => z.type === 'Perimeter').length
  const interiorZones   = zones.filter(z => z.type === 'Interior' || z.type === 'Public').length
  const restrictedZones = zones.filter(z => z.type === 'Restricted' || z.type === 'Secure').length

  const now = buildNowContext()

  const activeSchedules = schedules.filter(s => {
    const status = evaluateSchedule(s, now)
    return status === 'active' || status === 'override_active'
  }).length

  const sitesInAlarm = sites.filter(s => s.status === 'Alarm' || s.status === 'Lockdown').length

  // ── Recent intrusion log ───────────────────────────────────────────────────

  const recentLog: ArmingLog[] = armingLog.slice(0, 10)

  // ── Reset handler ──────────────────────────────────────────────────────────

  function handleReset() {
    if (window.confirm('Reset all demo data to seed state? This cannot be undone.')) {
      resetToSeed()
    }
  }

  // ── Shadcn: Stat card ──────────────────────────────────────────────────────

  function ShadcnStatCard({
    icon: Icon,
    iconColor,
    label,
    value,
    breakdown,
    alarm,
  }: {
    icon: React.ElementType
    iconColor: string
    label: string
    value: number
    breakdown: string
    alarm?: boolean
  }) {
    return (
      <Card className={alarm && value > 0 ? 'ring-2 ring-red-500/50 animate-pulse' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center">
              <Icon size={14} style={{ color: iconColor }} strokeWidth={1.8} />
            </div>
            <CardTitle className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">
              {label}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[hsl(var(--foreground))]">{value}</div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{breakdown}</p>
        </CardContent>
      </Card>
    )
  }

  // ── Classic: Stat card (original) ─────────────────────────────────────────

  function ClassicStatCard({
    icon: Icon,
    iconColor,
    label,
    value,
    breakdown,
  }: {
    icon: React.ElementType
    iconColor: string
    label: string
    value: number
    breakdown: string
  }) {
    return (
      <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#111827] border border-[#1e293b] flex items-center justify-center">
            <Icon size={14} style={{ color: iconColor }} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        <div className="text-[10px] text-slate-500 mt-1">{breakdown}</div>
      </div>
    )
  }

  // ── Shadcn render ──────────────────────────────────────────────────────────

  if (isShadcn) {
    const activeAlarms = alarms.filter(a => a.state !== 'cleared')

    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full bg-[hsl(var(--background))]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">System Overview</h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ShadcnStatCard
            icon={Users}
            iconColor="#6366f1"
            label="Total People"
            value={users.length}
            breakdown={`${employees} employees · ${contractors} contractors · ${visitors} visitors`}
          />
          <ShadcnStatCard
            icon={DoorOpen}
            iconColor="#8b5cf6"
            label="Total Doors"
            value={doors.length}
            breakdown={`${perimeterZones} Perimeter · ${interiorZones} Interior · ${restrictedZones} Restricted`}
          />
          <ShadcnStatCard
            icon={CalendarClock}
            iconColor="#06b6d4"
            label="Active Schedules"
            value={activeSchedules}
            breakdown={`${schedules.length - activeSchedules} inactive of ${schedules.length} total`}
          />
          <ShadcnStatCard
            icon={ShieldAlert}
            iconColor={sitesInAlarm > 0 ? '#ef4444' : '#10b981'}
            label="Sites in Alarm"
            value={sitesInAlarm}
            breakdown={sitesInAlarm > 0 ? 'Alarm or Lockdown status active' : 'All sites nominal'}
            alarm={true}
          />
        </div>

        {/* Bottom 2-column */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Recent Events */}
          <Card className="flex flex-col" style={{ minHeight: 220 }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">
                Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {events.length > 0 ? (
                <div className="flex-1 min-h-0">
                  <EventFeed compact />
                </div>
              ) : recentLog.length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No events yet.</p>
              ) : (
                <div className="relative pl-5">
                  <div
                    className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-[hsl(var(--border))]"
                  />
                  <div className="space-y-3">
                    {recentLog.map(entry => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className="relative z-10 -ml-5 flex items-center justify-center w-5 pt-0.5">
                          <TimelineDot action={entry.action} result={entry.result} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-semibold ${entry.result === 'Success' ? 'text-[hsl(var(--foreground))]' : 'text-red-400'}`}>
                              {entry.action}
                            </span>
                            {entry.result === 'Denied' && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                DENIED
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            {entry.userName} &middot; {entry.siteName}
                          </div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]/60">
                            {relativeTime(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Active Alarms + Quick Links */}
          <div className="space-y-4">
            {/* Active Alarms */}
            <Card className={activeAlarms.length > 0 ? 'border-red-500/40 bg-red-500/5' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-red-400/90 font-semibold">
                      Active Alarms
                    </CardTitle>
                    {activeAlarms.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {activeAlarms.length}
                      </Badge>
                    )}
                  </div>
                  {activeAlarms.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/monitor')}
                      className="text-xs h-6 px-2 text-[hsl(var(--primary))]"
                    >
                      View all
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeAlarms.length === 0 ? (
                  <p className="text-sm text-emerald-400 font-medium">No active alarms — all clear</p>
                ) : (
                  <div className="space-y-2">
                    {activeAlarms.slice(0, 3).map(alarm => (
                      <AlarmCard key={alarm.id} alarm={alarm} compact />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">
              Quick Links
            </p>

            <div className="grid grid-cols-1 gap-2">
              {[
                { to: '/oracle',   icon: Search,   iconColor: '#8b5cf6', label: 'Run Access Query',       description: 'Check who can access what, across all policies' },
                { to: '/reasoner', icon: Activity, iconColor: '#06b6d4', label: 'Trace Access Decision',  description: 'Step through ABAC evaluation for a specific request' },
                { to: '/canvas',   icon: Share2,   iconColor: '#6366f1', label: 'View Canvas',            description: 'Visual graph of groups, grants, schedules, and doors' },
                { to: '/intrusion',icon: Shield,   iconColor: '#ef4444', label: 'Intrusion Control',      description: 'Arm, disarm, and monitor site intrusion zones' },
              ].map(link => (
                <Button
                  key={link.to}
                  variant="outline"
                  onClick={() => navigate(link.to)}
                  className="w-full justify-start gap-3 h-auto py-3 px-4 text-left"
                >
                  <div className="w-7 h-7 rounded-md bg-[hsl(var(--secondary))] flex items-center justify-center shrink-0">
                    <link.icon size={14} style={{ color: link.iconColor }} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{link.label}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] font-normal mt-0.5">{link.description}</div>
                  </div>
                </Button>
              ))}
            </div>

            {/* Reset to seed */}
            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-red-400"
              >
                Reset Demo Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Classic render (unchanged) ─────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">System Overview</h1>
      </div>

      {/* Top stat cards — 4 column */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ClassicStatCard
          icon={Users}
          iconColor="#6366f1"
          label="Total People"
          value={users.length}
          breakdown={`${employees} employees · ${contractors} contractors · ${visitors} visitors`}
        />
        <ClassicStatCard
          icon={DoorOpen}
          iconColor="#8b5cf6"
          label="Total Doors"
          value={doors.length}
          breakdown={`${perimeterZones} Perimeter · ${interiorZones} Interior · ${restrictedZones} Restricted`}
        />
        <ClassicStatCard
          icon={CalendarClock}
          iconColor="#06b6d4"
          label="Active Schedules"
          value={activeSchedules}
          breakdown={`${schedules.length - activeSchedules} inactive of ${schedules.length} total`}
        />
        <div className={sitesInAlarm > 0 ? 'rounded-xl ring-2 ring-red-500/50 animate-pulse' : ''}>
          <ClassicStatCard
            icon={ShieldAlert}
            iconColor={sitesInAlarm > 0 ? '#ef4444' : '#10b981'}
            label="Sites in Alarm"
            value={sitesInAlarm}
            breakdown={sitesInAlarm > 0 ? 'Alarm or Lockdown status active' : 'All sites nominal'}
          />
        </div>
      </div>

      {/* Bottom 2-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Recent Events (EventFeed when events exist, else intrusion log) */}
        <div className="bg-[#0f1320] border border-[#1e293b] rounded-xl p-4 flex flex-col" style={{ minHeight: 220 }}>
          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-3 shrink-0">
            Recent Events
          </div>
          {events.length > 0 ? (
            <div className="flex-1 min-h-0">
              <EventFeed compact />
            </div>
          ) : recentLog.length === 0 ? (
            <p className="text-[11px] text-slate-600">No events yet.</p>
          ) : (
            <div className="relative pl-5">
              <div
                className="absolute left-[5px] top-1.5 bottom-1.5 w-px"
                style={{ backgroundColor: '#1e293b' }}
              />
              <div className="space-y-3">
                {recentLog.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="relative z-10 -ml-5 flex items-center justify-center w-5 pt-0.5">
                      <TimelineDot action={entry.action} result={entry.result} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold ${entry.result === 'Success' ? 'text-slate-300' : 'text-red-400'}`}>
                          {entry.action}
                        </span>
                        {entry.result === 'Denied' && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-semibold">
                            DENIED
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-600 truncate">
                        {entry.userName} &middot; {entry.siteName}
                      </div>
                      <div className="text-[9px] text-slate-700">
                        {relativeTime(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Alarms + Quick Links + Reset */}
        <div className="space-y-3">
          {/* Active Alarms — always visible, prominent red-tinted card */}
          {(() => {
            const activeAlarms = alarms.filter(a => a.state !== 'cleared')
            return (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-wider text-red-400/80 font-semibold">
                      Active Alarms
                    </div>
                    {activeAlarms.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        {activeAlarms.length}
                      </span>
                    )}
                  </div>
                  {activeAlarms.length > 0 && (
                    <button
                      onClick={() => navigate('/monitor')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View all →
                    </button>
                  )}
                </div>
                {activeAlarms.length === 0 ? (
                  <p className="text-[11px] text-emerald-400/80 font-medium">No active alarms — all clear</p>
                ) : (
                  activeAlarms.slice(0, 3).map(alarm => (
                    <AlarmCard key={alarm.id} alarm={alarm} compact />
                  ))
                )}
              </div>
            )
          })()}

          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold">
            Quick Links
          </div>
          <div className="grid grid-cols-1 gap-2">
            <QuickLink
              to="/oracle"
              icon={Search}
              iconColor="#8b5cf6"
              label="Run Access Query"
              description="Check who can access what, across all policies"
            />
            <QuickLink
              to="/reasoner"
              icon={Activity}
              iconColor="#06b6d4"
              label="Trace Access Decision"
              description="Step through ABAC evaluation for a specific request"
            />
            <QuickLink
              to="/canvas"
              icon={Share2}
              iconColor="#6366f1"
              label="View Canvas"
              description="Visual graph of groups, grants, schedules, and doors"
            />
            <QuickLink
              to="/intrusion"
              icon={Shield}
              iconColor="#ef4444"
              label="Intrusion Control"
              description="Arm, disarm, and monitor site intrusion zones"
            />
          </div>

          {/* Reset to seed — subtle destructive action */}
          <div className="pt-3 flex justify-end">
            <button
              onClick={handleReset}
              className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
            >
              Reset Demo Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
