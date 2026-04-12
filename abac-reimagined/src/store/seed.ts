// src/store/seed.ts
// Procedurally generated seed data for the ABAC demo application.
// All IDs are deterministic strings — no uuid calls.

import type { Site, Zone, Door, User, NamedSchedule, Grant, Group, Controller, Policy, Rule, InputDevice, OutputDevice, DeviceStatus } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SITES (20)
// ─────────────────────────────────────────────────────────────────────────────

export const SITES: Site[] = [
  // AU/NZ
  { id: 'site-syd',  name: 'Sydney HQ',           address: '1 Martin Place, Sydney NSW 2000, Australia',                timezone: 'Australia/Sydney',     status: 'Disarmed' },
  { id: 'site-mel',  name: 'Melbourne Office',     address: '101 Collins Street, Melbourne VIC 3000, Australia',         timezone: 'Australia/Melbourne',   status: 'Disarmed' },
  { id: 'site-bne',  name: 'Brisbane Campus',      address: '200 George Street, Brisbane QLD 4000, Australia',           timezone: 'Australia/Brisbane',    status: 'Armed'    },
  { id: 'site-akl',  name: 'Auckland Office',      address: '157 Lambton Quay, Auckland 1010, New Zealand',              timezone: 'Pacific/Auckland',      status: 'Disarmed' },
  { id: 'site-cbr',  name: 'Canberra Gov',         address: '18 London Circuit, Canberra ACT 2601, Australia',           timezone: 'Australia/Sydney',      status: 'Armed'    },
  // US
  { id: 'site-nyc',  name: 'New York HQ',          address: '30 Rockefeller Plaza, New York NY 10112, USA',              timezone: 'America/New_York',      status: 'Disarmed' },
  { id: 'site-sfo',  name: 'San Francisco Tech',   address: '555 Mission Street, San Francisco CA 94105, USA',           timezone: 'America/Los_Angeles',   status: 'Disarmed' },
  { id: 'site-chi',  name: 'Chicago Midwest',      address: '225 West Wacker Drive, Chicago IL 60606, USA',              timezone: 'America/Chicago',       status: 'Disarmed' },
  { id: 'site-dal',  name: 'Dallas Operations',    address: '2200 Ross Avenue, Dallas TX 75201, USA',                    timezone: 'America/Chicago',       status: 'Armed'    },
  { id: 'site-sea',  name: 'Seattle Innovation',   address: '1301 5th Avenue, Seattle WA 98101, USA',                    timezone: 'America/Los_Angeles',   status: 'Disarmed' },
  { id: 'site-bos',  name: 'Boston Research',      address: '100 Federal Street, Boston MA 02110, USA',                  timezone: 'America/New_York',      status: 'Disarmed' },
  { id: 'site-den',  name: 'Denver Data Centre',   address: '1700 Lincoln Street, Denver CO 80203, USA',                 timezone: 'America/Denver',        status: 'Disarmed' },
  // UK/EU
  { id: 'site-lon',  name: 'London HQ',            address: '30 St Mary Axe, London EC3A 8BF, United Kingdom',           timezone: 'Europe/London',         status: 'Disarmed' },
  { id: 'site-fra',  name: 'Frankfurt EU Hub',     address: 'Taunusanlage 12, 60325 Frankfurt am Main, Germany',         timezone: 'Europe/Berlin',         status: 'Disarmed' },
  { id: 'site-par',  name: 'Paris Office',         address: '29 Avenue de Opera, 75001 Paris, France',                   timezone: 'Europe/Paris',          status: 'Disarmed' },
  { id: 'site-ams',  name: 'Amsterdam Node',       address: 'Gustav Mahlerplein 2, 1082 MA Amsterdam, Netherlands',      timezone: 'Europe/Amsterdam',      status: 'Disarmed' },
  { id: 'site-dub',  name: 'Dublin EMEA',          address: '1 Grand Canal Square, Dublin D02 P820, Ireland',            timezone: 'Europe/Dublin',         status: 'Disarmed' },
  { id: 'site-sto',  name: 'Stockholm Office',     address: 'Stureplan 4A, 114 35 Stockholm, Sweden',                    timezone: 'Europe/Stockholm',      status: 'Disarmed' },
  // APAC
  { id: 'site-sgp',  name: 'Singapore APAC',       address: '1 Raffles Place, Singapore 048616',                         timezone: 'Asia/Singapore',        status: 'Disarmed' },
  { id: 'site-tko',  name: 'Tokyo Office',         address: '2-7-3 Marunouchi, Chiyoda-ku, Tokyo 100-0005, Japan',       timezone: 'Asia/Tokyo',            status: 'Lockdown' },
]

// ─────────────────────────────────────────────────────────────────────────────
// ZONES (60 — 3 per site)
// ─────────────────────────────────────────────────────────────────────────────

// Per-zone overrides applied immutably during construction
const ZONE_OVERRIDES: Partial<Record<string, Partial<Zone>>> = {
  'zone-cbr-secure':    { type: 'Restricted' },
  'zone-den-secure':    { type: 'Restricted' },
  'zone-tko-secure':    { type: 'Restricted' },
  'zone-tko-interior':  { status: 'Alarm' },
  'zone-tko-perimeter': { status: 'Alarm' },
}

function makeZones(siteId: string, siteName: string): Zone[] {
  const siteKey = siteId.replace('site-', '')
  const base: Zone[] = [
    { id: `zone-${siteKey}-perimeter`, siteId, name: `${siteName} Perimeter`, type: 'Perimeter', status: 'Disarmed' },
    { id: `zone-${siteKey}-interior`,  siteId, name: `${siteName} Interior`,  type: 'Interior',  status: 'Disarmed' },
    { id: `zone-${siteKey}-secure`,    siteId, name: `${siteName} Secure`,    type: 'Secure',    status: 'Armed'    },
  ]
  return base.map(z => {
    const override = ZONE_OVERRIDES[z.id]
    return override ? { ...z, ...override } : z
  })
}

export const ZONES: Zone[] = SITES.flatMap(s => makeZones(s.id, s.name))

// ─────────────────────────────────────────────────────────────────────────────
// DOORS (~500 generated — 7-9 per zone, using all names from each pool)
// ─────────────────────────────────────────────────────────────────────────────

const PERIMETER_DOOR_NAMES = [
  'Main Entrance', 'Rear Entrance', 'Loading Bay 1', 'Loading Bay 2',
  'North Gate', 'South Gate', 'East Gate', 'Visitor Reception', 'Delivery Dock',
]
const INTERIOR_DOOR_NAMES = [
  'Reception Main', 'Floor 1 East', 'Floor 1 West', 'Floor 2 East',
  'Floor 2 West', 'Floor 3 East', 'Stairwell A', 'Lift Lobby', 'Breakroom',
]
const SECURE_DOOR_NAMES = [
  'Server Room A', 'Server Room B', 'Network Hub', 'Security Office',
  'Executive Suite', 'Data Vault', 'Control Room', 'Lab Access', 'Safe Room',
]

function makeDoors(siteId: string, zoneId: string, namePool: string[]): Door[] {
  const siteKey = siteId.replace('site-', '')
  const zoneKey = zoneId.replace(`zone-${siteKey}-`, '')
  return namePool.map((name, n) => ({
    id:          `door-${siteKey}-${zoneKey}-${n + 1}`,
    name,
    siteId,
    zoneId,
    description: `${name} access point at ${siteKey.toUpperCase()} ${zoneKey} zone`,
    customAttributes: {},
  }))
}

export const DOORS: Door[] = ZONES.flatMap(z => {
  if (z.type === 'Perimeter' || z.type === 'Public') return makeDoors(z.siteId, z.id, PERIMETER_DOOR_NAMES)
  if (z.type === 'Interior')                          return makeDoors(z.siteId, z.id, INTERIOR_DOOR_NAMES)
  return makeDoors(z.siteId, z.id, SECURE_DOOR_NAMES)
})

function doorsForSite(siteId: string): string[] {
  return DOORS.filter(d => d.siteId === siteId).map(d => d.id)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULES (15)
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEDULES: NamedSchedule[] = [
  {
    id: 'sched-aest-biz',
    name: 'AEST Business Hours',
    timezone: 'Australia/Sydney',
    windows: [{ id: 'tw-aest-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' }],
    holidays: [
      { id: 'hol-anzac',  name: 'ANZAC Day',     month: 4,  day: 25, behavior: 'deny_all',            overrideGrantIds: [],                           requiredClearance: undefined },
      { id: 'hol-xmas',   name: 'Christmas Day',  month: 12, day: 25, behavior: 'deny_all',            overrideGrantIds: [],                           requiredClearance: undefined },
      { id: 'hol-ausday', name: 'Australia Day',  month: 1,  day: 26, behavior: 'allow_with_override', overrideGrantIds: ['grant-emergency-override'], requiredClearance: 3 },
    ],
  },
  {
    id: 'sched-nzst-biz',
    name: 'NZST Business Hours',
    timezone: 'Pacific/Auckland',
    windows: [{ id: 'tw-nzst-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:30', endTime: '17:30' }],
    holidays: [],
  },
  {
    id: 'sched-gmt-biz',
    name: 'GMT Business Hours',
    timezone: 'Europe/London',
    windows: [{ id: 'tw-gmt-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' }],
    holidays: [],
  },
  {
    id: 'sched-cet-biz',
    name: 'CET Business Hours',
    timezone: 'Europe/Berlin',
    windows: [{ id: 'tw-cet-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' }],
    holidays: [],
  },
  {
    id: 'sched-est-biz',
    name: 'EST Business Hours',
    timezone: 'America/New_York',
    windows: [{ id: 'tw-est-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' }],
    holidays: [],
  },
  {
    id: 'sched-pst-biz',
    name: 'PST Business Hours',
    timezone: 'America/Los_Angeles',
    windows: [{ id: 'tw-pst-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' }],
    holidays: [],
  },
  {
    id: 'sched-sgt-biz',
    name: 'SGT/JST Business Hours',
    timezone: 'Asia/Singapore',
    windows: [{ id: 'tw-sgt-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '09:00', endTime: '18:00' }],
    holidays: [],
  },
  {
    id: 'sched-night-shift',
    name: 'Night Shift',
    timezone: 'UTC',
    windows: [{ id: 'tw-night-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '20:00', endTime: '06:00' }],
    holidays: [],
  },
  {
    id: 'sched-24-7',
    name: '24/7 Always On',
    timezone: 'UTC',
    windows: [{ id: 'tw-247-1', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], startTime: '00:00', endTime: '00:00' }],
    holidays: [],
  },
  {
    id: 'sched-weekend',
    name: 'Weekend Access',
    timezone: 'UTC',
    windows: [{ id: 'tw-wknd-1', days: ['Sat','Sun'], startTime: '08:00', endTime: '20:00' }],
    holidays: [],
  },
  {
    id: 'sched-contractor',
    name: 'Contractor Hours',
    timezone: 'UTC',
    windows: [{ id: 'tw-ctr-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '09:00', endTime: '17:00' }],
    holidays: [],
  },
  {
    id: 'sched-emergency',
    name: 'Emergency Access',
    timezone: 'UTC',
    windows: [{ id: 'tw-emg-1', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], startTime: '00:00', endTime: '23:59' }],
    holidays: [],
  },
  {
    id: 'sched-executive',
    name: 'Executive Access',
    timezone: 'UTC',
    windows: [{ id: 'tw-exec-1', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], startTime: '06:00', endTime: '22:00' }],
    holidays: [],
  },
  {
    id: 'sched-maintenance',
    name: 'Maintenance Window',
    timezone: 'UTC',
    windows: [{ id: 'tw-maint-1', days: ['Sat'], startTime: '02:00', endTime: '06:00' }],
    holidays: [],
  },
  {
    id: 'sched-mst-biz',
    name: 'MST Business Hours',
    timezone: 'America/Denver',
    windows: [{ id: 'tw-mst-1', days: ['Mon','Tue','Wed','Thu','Fri'], startTime: '08:00', endTime: '18:00' }],
    holidays: [],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// GRANTS (40)
// ─────────────────────────────────────────────────────────────────────────────

export const GRANTS: Grant[] = [
  // ── 5 Global grants ────────────────────────────────────────────────────────
  {
    id: 'grant-basic-unlock',
    name: 'Basic Unlock',
    description: 'Standard door unlock for all active employees — applied automatically.',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-emergency-override',
    name: 'Emergency Override',
    description: 'Emergency unlock authority for senior personnel with clearance level 4+.',
    scope: 'global',
    actions: ['unlock', 'override'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-emg-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-emergency',
    customAttributes: {},
  },
  {
    id: 'grant-lockdown-authority',
    name: 'Lockdown Authority',
    description: 'Ability to arm/disarm sites and initiate lockdown. Restricted to clearance 5.',
    scope: 'global',
    actions: ['arm', 'disarm', 'lockdown'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-lkd-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '5' },
    ],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-audit-log-access',
    name: 'Audit Log Access',
    description: 'Read-only access to audit logs. Auto-applied to security and compliance roles.',
    scope: 'global',
    actions: ['view_logs'],
    applicationMode: 'auto',
    conditions: [
      { id: 'cr-aud-1', leftSide: 'user.department', operator: 'IN', rightSide: ['Security', 'Legal', 'Finance'] },
    ],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-global-admin',
    name: 'Global Admin',
    description: 'Full user and task management rights. Reserved for clearance level 5 executives.',
    scope: 'global',
    actions: ['manage_users', 'manage_tasks'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-adm-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '5' },
      { id: 'cr-adm-2', leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    conditionLogic: 'AND',
    customAttributes: {},
  },

  // ── 15 Site-scoped grants ──────────────────────────────────────────────────
  {
    id: 'grant-site-syd',
    name: 'Sydney Site Access',
    description: 'Standard access grant for Sydney HQ employees.',
    scope: 'site', targetId: 'site-syd',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'cr-syd-1', leftSide: 'user.department', operator: '!=', rightSide: 'Visitor' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-aest-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-mel',
    name: 'Melbourne Site Access',
    description: 'Conditional access grant for Melbourne Office.',
    scope: 'site', targetId: 'site-mel',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [{ id: 'cr-mel-1', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-aest-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-bne',
    name: 'Brisbane Campus Access',
    description: 'Assigned access for Brisbane Campus personnel.',
    scope: 'site', targetId: 'site-bne',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-bne-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-aest-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-nyc',
    name: 'New York HQ Access',
    description: 'Auto-granted access for New York HQ employees during business hours.',
    scope: 'site', targetId: 'site-nyc',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'cr-nyc-1', leftSide: 'user.type', operator: '==', rightSide: 'employee' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-est-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-sfo',
    name: 'San Francisco Tech Access',
    description: 'Conditional tech hub access for engineering and IT.',
    scope: 'site', targetId: 'site-sfo',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-sfo-1', leftSide: 'user.department', operator: 'IN', rightSide: ['Engineering', 'IT', 'Research'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-pst-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-lon',
    name: 'London HQ Access',
    description: 'Standard access for London HQ assigned personnel.',
    scope: 'site', targetId: 'site-lon',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [{ id: 'cr-lon-1', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-gmt-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-fra',
    name: 'Frankfurt EU Hub Access',
    description: 'Conditional EU hub access for operations and finance.',
    scope: 'site', targetId: 'site-fra',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-fra-1', leftSide: 'user.department',    operator: 'IN', rightSide: ['Finance', 'Operations', 'Legal'] },
      { id: 'cr-fra-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-cet-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-sgp',
    name: 'Singapore APAC Access',
    description: 'Auto-granted APAC hub access during regional business hours.',
    scope: 'site', targetId: 'site-sgp',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'cr-sgp-1', leftSide: 'user.type', operator: '!=', rightSide: 'visitor' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-sgt-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-tko',
    name: 'Tokyo Office Access',
    description: 'Highly restricted access — Tokyo is in lockdown. Clearance 4+ only.',
    scope: 'site', targetId: 'site-tko',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-tko-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
      { id: 'cr-tko-2', leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-sgt-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-cbr',
    name: 'Canberra Gov Access',
    description: 'Government facility — clearance 3+ required, assigned mode.',
    scope: 'site', targetId: 'site-cbr',
    actions: ['unlock', 'view_logs'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-cbr-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-cbr-2', leftSide: 'user.status',          operator: '==', rightSide: 'active' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-aest-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-den',
    name: 'Denver Data Centre Access',
    description: 'Data centre site access — IT and Engineering with active status.',
    scope: 'site', targetId: 'site-den',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-den-1', leftSide: 'user.department', operator: 'IN', rightSide: ['IT', 'Engineering', 'Security'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-mst-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-chi',
    name: 'Chicago Midwest Access',
    description: 'Auto-granted access for Chicago Midwest office employees.',
    scope: 'site', targetId: 'site-chi',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'cr-chi-1', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-site-sea',
    name: 'Seattle Innovation Access',
    description: 'Conditional Seattle access for innovation staff.',
    scope: 'site', targetId: 'site-sea',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-sea-1', leftSide: 'user.department',    operator: 'IN', rightSide: ['Engineering', 'Research', 'IT'] },
      { id: 'cr-sea-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
    ],
    conditionLogic: 'OR',
    scheduleId: 'sched-pst-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-bos',
    name: 'Boston Research Access',
    description: 'Research campus access — employees and approved contractors.',
    scope: 'site', targetId: 'site-bos',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-bos-1', leftSide: 'user.department', operator: 'IN', rightSide: ['Research', 'Engineering'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-est-biz',
    customAttributes: {},
  },
  {
    id: 'grant-site-akl',
    name: 'Auckland Office Access',
    description: 'Auto-granted access for Auckland Office active staff during NZ business hours.',
    scope: 'site', targetId: 'site-akl',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'cr-akl-1', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-nzst-biz',
    customAttributes: {},
  },

  // ── 20 Zone-scoped grants ──────────────────────────────────────────────────
  {
    id: 'grant-zone-syd-secure',
    name: 'Sydney Secure Zone',
    description: 'Access to Sydney secure zone — clearance 3+.',
    scope: 'zone', targetId: 'zone-syd-secure',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [{ id: 'cr-zsyd-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-zone-nyc-secure',
    name: 'NYC Secure Zone',
    description: 'Access to New York secure zone — clearance 3+ employees.',
    scope: 'zone', targetId: 'zone-nyc-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-znyc-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-znyc-2', leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-est-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-lon-secure',
    name: 'London Secure Zone',
    description: 'London secure zone access for senior security and IT staff.',
    scope: 'zone', targetId: 'zone-lon-secure',
    actions: ['unlock', 'view_logs'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zlon-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zlon-2', leftSide: 'user.department',     operator: 'IN', rightSide: ['Security', 'IT'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-gmt-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-sgp-secure',
    name: 'Singapore Secure Zone',
    description: 'APAC secure zone access — clearance 4 required.',
    scope: 'zone', targetId: 'zone-sgp-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [{ id: 'cr-zsgp-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' }],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-zone-fra-secure',
    name: 'Frankfurt Secure Zone',
    description: 'EU secure zone — clearance 3+ with finance or legal background.',
    scope: 'zone', targetId: 'zone-fra-secure',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zfra-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zfra-2', leftSide: 'user.department',     operator: 'IN', rightSide: ['Finance', 'Legal', 'Security'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-cet-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-den-restricted',
    name: 'Denver Restricted Zone',
    description: 'Denver data centre restricted zone — IT and Security clearance 4+.',
    scope: 'zone', targetId: 'zone-den-secure',
    actions: ['unlock', 'override'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zden-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
      { id: 'cr-zden-2', leftSide: 'user.department',     operator: 'IN', rightSide: ['IT', 'Engineering'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-24-7',
    customAttributes: {},
  },
  {
    id: 'grant-zone-cbr-restricted',
    name: 'Canberra Restricted Zone',
    description: 'Government restricted zone — clearance 5 only.',
    scope: 'zone', targetId: 'zone-cbr-secure',
    actions: ['unlock', 'arm', 'disarm'],
    applicationMode: 'assigned',
    conditions: [{ id: 'cr-zcbr-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '5' }],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-zone-sfo-secure',
    name: 'San Francisco Secure Zone',
    description: 'Tech campus secure zone — engineering and research clearance 3+.',
    scope: 'zone', targetId: 'zone-sfo-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-zsfo-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zsfo-2', leftSide: 'user.department',     operator: 'IN', rightSide: ['Engineering', 'Research'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-pst-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-bos-secure',
    name: 'Boston Research Secure Zone',
    description: 'Research lab secure zone — active employees clearance 3+.',
    scope: 'zone', targetId: 'zone-bos-secure',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zbos-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zbos-2', leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-est-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-mel-secure',
    name: 'Melbourne Secure Zone',
    description: 'Melbourne secure zone — active clearance 3 staff.',
    scope: 'zone', targetId: 'zone-mel-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [{ id: 'cr-zmel-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-aest-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-tko-secure',
    name: 'Tokyo Secure Zone',
    description: 'Tokyo restricted zone during lockdown — clearance 5 only.',
    scope: 'zone', targetId: 'zone-tko-secure',
    actions: ['unlock', 'lockdown'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-ztko-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '5' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-24-7',
    customAttributes: {},
  },
  {
    id: 'grant-zone-chi-secure',
    name: 'Chicago Secure Zone',
    description: 'Chicago secure zone — operations and security staff.',
    scope: 'zone', targetId: 'zone-chi-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-zchi-1', leftSide: 'user.department',     operator: 'IN', rightSide: ['Operations', 'Security'] },
      { id: 'cr-zchi-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-zone-dal-secure',
    name: 'Dallas Secure Zone',
    description: 'Dallas operations secure zone — clearance 2+ active employees.',
    scope: 'zone', targetId: 'zone-dal-secure',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [
      { id: 'cr-zdal-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
      { id: 'cr-zdal-2', leftSide: 'user.status',          operator: '==', rightSide: 'active' },
    ],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-zone-sea-secure',
    name: 'Seattle Secure Zone',
    description: 'Seattle innovation secure zone — engineering clearance 3.',
    scope: 'zone', targetId: 'zone-sea-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-zsea-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-pst-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-akl-secure',
    name: 'Auckland Secure Zone',
    description: 'Auckland secure zone — clearance 3+ NZ employees.',
    scope: 'zone', targetId: 'zone-akl-secure',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zakl-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zakl-2', leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-nzst-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-par-secure',
    name: 'Paris Secure Zone',
    description: 'Paris secure zone — legal and executive clearance 3+.',
    scope: 'zone', targetId: 'zone-par-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-zpar-1', leftSide: 'user.department',     operator: 'IN', rightSide: ['Legal', 'Executive', 'Finance'] },
      { id: 'cr-zpar-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-cet-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-ams-secure',
    name: 'Amsterdam Secure Zone',
    description: 'Amsterdam node secure zone — IT operations clearance 3+.',
    scope: 'zone', targetId: 'zone-ams-secure',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zams-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zams-2', leftSide: 'user.department',     operator: 'IN', rightSide: ['IT', 'Engineering'] },
    ],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-zone-dub-secure',
    name: 'Dublin Secure Zone',
    description: 'EMEA secure zone — clearance 3+ with active status.',
    scope: 'zone', targetId: 'zone-dub-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-zdub-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zdub-2', leftSide: 'user.status',          operator: '==', rightSide: 'active' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-gmt-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-sto-secure',
    name: 'Stockholm Secure Zone',
    description: 'Stockholm secure zone — Scandinavian operations clearance 3+.',
    scope: 'zone', targetId: 'zone-sto-secure',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [
      { id: 'cr-zsto-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-cet-biz',
    customAttributes: {},
  },
  {
    id: 'grant-zone-bne-secure',
    name: 'Brisbane Secure Zone',
    description: 'Brisbane campus secure zone — engineering and security.',
    scope: 'zone', targetId: 'zone-bne-secure',
    actions: ['unlock'],
    applicationMode: 'conditional',
    conditions: [
      { id: 'cr-zbne-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'cr-zbne-2', leftSide: 'user.department',     operator: 'IN', rightSide: ['Engineering', 'Security', 'IT'] },
    ],
    conditionLogic: 'AND',
    scheduleId: 'sched-aest-biz',
    customAttributes: {},
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// USER GENERATION (2000)
// ─────────────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'James','Emily','Liam','Olivia','Noah','Ava','William','Sophia','Benjamin','Isabella',
  'Lucas','Mia','Henry','Charlotte','Alexander','Amelia','Sebastian','Harper','Jack','Evelyn',
  'Aiden','Abigail','Matthew','Ella','Samuel','Elizabeth','David','Camila','Joseph','Luna',
  'Yuki','Mei','Hiroshi','Priya','Arjun','Fatima','Omar','Amara','Kwame','Nadia',
  'Santiago','Valentina','Mateus','Aisha','Tariq','Zara','Kofi','Ingrid','Mikael','Astrid',
  'Chen','Wei','Jia','Ravi','Divya','Leila','Hassan','Chidi','Ayasha','Brendan',
]

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
  'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
  'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
  'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
  'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
  'Nakamura','Patel','Singh','Ahmed','Okafor','Mensah','Johansson','Andersen','Mueller','Dubois',
  'Yamamoto','Kim','Chen','Ivanova','Osei','Reyes','Ferreira','Kowalski','Lindqvist','Adeyemi',
]

const ROLES_BY_DEPT: Record<string, string[]> = {
  Engineering:  ['Software Engineer','Senior Engineer','Lead Engineer','DevOps Engineer','SRE','Platform Engineer','Data Engineer'],
  Security:     ['Security Analyst','Senior Analyst','Security Director','SOC Operator','Penetration Tester','CISO'],
  Operations:   ['Operations Manager','Operations Analyst','Site Manager','Logistics Coordinator','Operations Director','Field Technician'],
  Finance:      ['Financial Analyst','Senior Analyst','Finance Manager','Controller','CFO','Accountant'],
  Legal:        ['Legal Counsel','Senior Counsel','Compliance Officer','Legal Director','General Counsel'],
  HR:           ['HR Coordinator','HR Manager','Talent Acquisition','People Operations','HR Director','CHRO'],
  Facilities:   ['Facilities Coordinator','Facilities Manager','Maintenance Tech','Site Engineer','Head of Facilities'],
  IT:           ['IT Support','Network Engineer','Systems Administrator','IT Manager','Infrastructure Lead','CTO'],
  Sales:        ['Sales Representative','Account Executive','Sales Manager','Regional Director','VP Sales','Business Development'],
  Marketing:    ['Marketing Coordinator','Content Strategist','Marketing Manager','Brand Director','CMO','Growth Manager'],
  Executive:    ['Chief of Staff','Executive Assistant','VP Operations','Chief Strategy Officer','CEO','COO'],
  Research:     ['Research Scientist','Senior Researcher','Research Lead','Principal Scientist','Director of Research','Lab Technician'],
}

// Weighted department distribution
const DEPT_WEIGHTS: Array<[string, number]> = [
  ['Engineering', 18], ['Operations', 20], ['Security', 10], ['IT', 12],
  ['Sales', 10], ['Finance', 8], ['HR', 6], ['Marketing', 8],
  ['Legal', 4], ['Facilities', 6], ['Executive', 3], ['Research', 5],
]

function weightedPick(items: Array<[string, number]>, seed: number): string {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let r = seed % total
  for (const [item, weight] of items) {
    r -= weight
    if (r < 0) return item
  }
  return items[0][0]
}

function seededInt(seed: number, max: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) % max
}

export const USERS: User[] = Array.from({ length: 2000 }, (_, i) => {
  const idx = i + 1
  const fnIdx     = seededInt(idx * 7,  FIRST_NAMES.length)
  const lnIdx     = seededInt(idx * 13, LAST_NAMES.length)
  const firstName = FIRST_NAMES[fnIdx]
  const lastName  = LAST_NAMES[lnIdx]

  const dept  = weightedPick(DEPT_WEIGHTS, idx * 31)
  const roles = ROLES_BY_DEPT[dept]
  const role  = roles[seededInt(idx * 17, roles.length)]

  // clearanceLevel: L1 35%, L2 30%, L3 20%, L4 10%, L5 5%
  const clrRoll = seededInt(idx * 23, 100)
  const clearanceLevel =
    clrRoll < 35 ? 1 :
    clrRoll < 65 ? 2 :
    clrRoll < 85 ? 3 :
    clrRoll < 95 ? 4 : 5

  // type: employee 80%, contractor 12%, visitor 8%
  const typeRoll = seededInt(idx * 41, 100)
  const userType: 'employee' | 'contractor' | 'visitor' =
    typeRoll < 80 ? 'employee' :
    typeRoll < 92 ? 'contractor' : 'visitor'

  // status: active 85%, inactive 10%, suspended 5%
  const statusRoll = seededInt(idx * 53, 100)
  const status: 'active' | 'inactive' | 'suspended' =
    statusRoll < 85 ? 'active' :
    statusRoll < 95 ? 'inactive' : 'suspended'

  const emailLocal = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}.${idx}`
  const customAttributes: Record<string, string> = userType === 'contractor'
    ? { contractExpiry: '2026-12-31', company: `ExtCo-${(idx % 50) + 1}` }
    : {}

  return {
    id:               `u-${String(idx).padStart(4, '0')}`,
    name:             `${firstName} ${lastName}`,
    email:            `${emailLocal}@axon-global.io`,
    department:       dept,
    role,
    clearanceLevel,
    type:             userType,
    status,
    customAttributes,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS (40)
// ─────────────────────────────────────────────────────────────────────────────

function firstUserIds(predicate: (u: User) => boolean, count: number): string[] {
  return USERS.filter(predicate).slice(0, count).map(u => u.id)
}

export const GROUPS: Group[] = [
  // ── Dynamic groups (25) ────────────────────────────────────────────────────
  {
    id: 'group-engineering',
    name: 'Engineering Team',
    description: 'All users in the Engineering department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-eng-1', leftSide: 'user.department', operator: '==', rightSide: 'Engineering' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-audit-log-access'],
  },
  {
    id: 'group-security',
    name: 'Security Team',
    description: 'All users in the Security department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-sec-1', leftSide: 'user.department', operator: '==', rightSide: 'Security' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-audit-log-access'],
  },
  {
    id: 'group-operations',
    name: 'Operations Team',
    description: 'All users in the Operations department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-ops-1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-finance',
    name: 'Finance Team',
    description: 'All users in the Finance department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-fin-1', leftSide: 'user.department', operator: '==', rightSide: 'Finance' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-audit-log-access'],
  },
  {
    id: 'group-hr',
    name: 'HR Team',
    description: 'All users in the HR department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-hr-1', leftSide: 'user.department', operator: '==', rightSide: 'HR' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-it',
    name: 'IT Team',
    description: 'All users in the IT department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-it-1', leftSide: 'user.department', operator: '==', rightSide: 'IT' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-zone-den-restricted'],
  },
  {
    id: 'group-legal',
    name: 'Legal Team',
    description: 'All users in the Legal department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-leg-1', leftSide: 'user.department', operator: '==', rightSide: 'Legal' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-audit-log-access'],
  },
  {
    id: 'group-facilities',
    name: 'Facilities Team',
    description: 'All users in the Facilities department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-fac-1', leftSide: 'user.department', operator: '==', rightSide: 'Facilities' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-sales',
    name: 'Sales Team',
    description: 'All users in the Sales department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-sal-1', leftSide: 'user.department', operator: '==', rightSide: 'Sales' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-marketing',
    name: 'Marketing Team',
    description: 'All users in the Marketing department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-mkt-1', leftSide: 'user.department', operator: '==', rightSide: 'Marketing' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-executive',
    name: 'Executive Team',
    description: 'All users in the Executive department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-exe-1', leftSide: 'user.department', operator: '==', rightSide: 'Executive' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-emergency-override'],
  },
  {
    id: 'group-research',
    name: 'Research Team',
    description: 'All users in the Research department.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-res-1', leftSide: 'user.department', operator: '==', rightSide: 'Research' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-zone-bos-secure'],
  },
  {
    id: 'group-senior-staff',
    name: 'Senior Staff',
    description: 'All staff with clearance level 3 or above.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-snr-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    subGroups: ['group-engineering', 'group-security'],
    inheritedPermissions: ['grant-basic-unlock', 'grant-audit-log-access'],
  },
  {
    id: 'group-management',
    name: 'Management',
    description: 'All staff with clearance level 4 or above — management grade.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-mgmt-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' }],
    subGroups: ['group-senior-staff'],
    inheritedPermissions: ['grant-basic-unlock', 'grant-emergency-override', 'grant-audit-log-access'],
  },
  {
    id: 'group-executives',
    name: 'Executives',
    description: 'Top-level executives with clearance level 5.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-exec-1', leftSide: 'user.clearanceLevel', operator: '==', rightSide: '5' }],
    subGroups: ['group-management'],
    inheritedPermissions: ['grant-lockdown-authority', 'grant-global-admin'],
  },
  {
    id: 'group-active-employees',
    name: 'Active Employees',
    description: 'All users of type employee with active status.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [
      { id: 'mr-ae-1', leftSide: 'user.type',   operator: '==', rightSide: 'employee' },
      { id: 'mr-ae-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-active-contractors',
    name: 'Active Contractors',
    description: 'All active contractor users.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [
      { id: 'mr-ac-1', leftSide: 'user.type',   operator: '==', rightSide: 'contractor' },
      { id: 'mr-ac-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-night-operations',
    name: 'Night Operations',
    description: 'Operations department staff with clearance 2+ for night shift coverage.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [
      { id: 'mr-no-1', leftSide: 'user.department',    operator: '==', rightSide: 'Operations' },
      { id: 'mr-no-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-security-operations',
    name: 'Security Operations',
    description: 'Security department operations group.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-so-1', leftSide: 'user.department', operator: '==', rightSide: 'Security' }],
    subGroups: ['group-security'],
    inheritedPermissions: ['grant-basic-unlock', 'grant-audit-log-access', 'grant-emergency-override'],
  },
  {
    id: 'group-lab-personnel',
    name: 'Lab Personnel',
    // OR logic: users qualify if they are in a lab department OR have clearance 3+.
    // This is intentionally permissive — a high-clearance user from any dept can access labs.
    description: 'Research and Engineering staff with clearance 3+ for lab access.',
    membershipType: 'dynamic',
    membershipLogic: 'OR',
    members: [],
    membershipRules: [
      { id: 'mr-lab-1', leftSide: 'user.department',    operator: 'IN', rightSide: ['Research', 'Engineering'] },
      { id: 'mr-lab-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-zone-bos-secure', 'grant-zone-sfo-secure'],
  },
  {
    id: 'group-all-active-staff',
    name: 'All Active Staff',
    description: 'Every user with active status regardless of type.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-aas-1', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-restricted-eligible',
    name: 'Restricted Zone Eligible',
    description: 'Staff with clearance level 4 or above — eligible for restricted zones.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-rze-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' }],
    subGroups: [],
    inheritedPermissions: ['grant-zone-den-restricted', 'grant-zone-cbr-restricted'],
  },
  {
    id: 'group-visitor-escorts',
    name: 'Visitor Escorts',
    description: 'Employees with clearance 3+ authorized to escort visitors.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [
      { id: 'mr-ve-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { id: 'mr-ve-2', leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-datacentre-ops',
    name: 'Data Centre Ops',
    // OR logic: match users who work in any of the relevant departments OR have the required clearance.
    // This allows a clearance-4 user from any dept to qualify for data centre access.
    description: 'IT, Engineering, and Security staff with clearance 4+ for data centre operations.',
    membershipType: 'dynamic',
    membershipLogic: 'OR',
    members: [],
    membershipRules: [
      { id: 'mr-dco-1', leftSide: 'user.department',    operator: 'IN', rightSide: ['IT', 'Engineering', 'Security'] },
      { id: 'mr-dco-2', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
    ],
    subGroups: ['group-it', 'group-engineering'],
    inheritedPermissions: ['grant-zone-den-restricted', 'grant-basic-unlock'],
  },
  {
    id: 'group-contractors-restricted',
    name: 'Contractors Restricted',
    description: 'Contractors are restricted to contractor hours only.',
    membershipType: 'dynamic',
    membershipLogic: 'AND',
    members: [],
    membershipRules: [{ id: 'mr-cr-1', leftSide: 'user.type', operator: '==', rightSide: 'contractor' }],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },

  // ── Static groups (15) ─────────────────────────────────────────────────────
  {
    id: 'group-crisis-response',
    name: 'Crisis Response Team',
    description: 'Handpicked crisis response team — 8 members with clearance 4+.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.clearanceLevel >= 4 && u.type === 'employee', 8),
    membershipRules: [],
    subGroups: ['group-security-operations'],
    inheritedPermissions: ['grant-emergency-override', 'grant-lockdown-authority'],
  },
  {
    id: 'group-exec-leadership',
    name: 'Executive Leadership',
    description: 'Top executive leadership team — 5 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.clearanceLevel === 5, 5),
    membershipRules: [],
    subGroups: ['group-executives'],
    inheritedPermissions: ['grant-global-admin', 'grant-lockdown-authority'],
  },
  {
    id: 'group-board-observers',
    name: 'Board Observers',
    description: 'Non-executive board observers with read-only access.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: ['u-0001', 'u-0002', 'u-0003', 'u-0004'],
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-audit-log-access'],
  },
  {
    id: 'group-datacentre-team',
    name: 'Data Centre Team',
    description: 'Core data centre operations team — 12 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => (u.department === 'IT' || u.department === 'Engineering') && u.clearanceLevel >= 3, 12),
    membershipRules: [],
    subGroups: ['group-datacentre-ops'],
    inheritedPermissions: ['grant-zone-den-restricted', 'grant-basic-unlock'],
  },
  {
    id: 'group-soc',
    name: 'Security Operations Center',
    description: 'SOC team — 10 members from Security department.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'Security' && u.status === 'active', 10),
    membershipRules: [],
    subGroups: ['group-security-operations'],
    inheritedPermissions: ['grant-audit-log-access', 'grant-emergency-override'],
  },
  {
    id: 'group-incident-response',
    name: 'Incident Response',
    // OR logic: members are drawn from Security OR IT — reflecting a cross-department team
    // where belonging to either department qualifies a user for the static roster.
    description: 'Incident response team — 7 members across security and IT.',
    membershipType: 'static',
    membershipLogic: 'OR',
    members: firstUserIds(u => (u.department === 'Security' || u.department === 'IT') && u.clearanceLevel >= 3, 7),
    membershipRules: [],
    subGroups: ['group-soc'],
    inheritedPermissions: ['grant-emergency-override', 'grant-audit-log-access'],
  },
  {
    id: 'group-facilities-mgmt',
    name: 'Facilities Management',
    description: 'Facilities management team — 6 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'Facilities' && u.status === 'active', 6),
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-it-ops',
    name: 'IT Operations',
    description: 'IT operations team — 15 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'IT' && u.status === 'active', 15),
    membershipRules: [],
    subGroups: ['group-it'],
    inheritedPermissions: ['grant-basic-unlock', 'grant-zone-den-restricted'],
  },
  {
    id: 'group-research-core',
    name: 'Research Core',
    description: 'Core research team — 9 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'Research' && u.clearanceLevel >= 3, 9),
    membershipRules: [],
    subGroups: ['group-research'],
    inheritedPermissions: ['grant-zone-bos-secure', 'grant-zone-sfo-secure'],
  },
  {
    id: 'group-compliance',
    name: 'Compliance Officers',
    description: 'Compliance and regulatory team — 5 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'Legal' && u.status === 'active', 5),
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-audit-log-access', 'grant-basic-unlock'],
  },
  {
    id: 'group-netops',
    name: 'Network Operations',
    description: 'Network operations center — 8 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'IT' && u.clearanceLevel >= 2 && u.status === 'active', 8),
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock', 'grant-zone-den-restricted'],
  },
  {
    id: 'group-hr-leadership',
    name: 'HR Leadership',
    description: 'Senior HR leadership team — 4 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'HR' && u.clearanceLevel >= 3, 4),
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-basic-unlock'],
  },
  {
    id: 'group-finance-committee',
    name: 'Finance Committee',
    description: 'Finance oversight committee — 6 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'Finance' && u.clearanceLevel >= 3, 6),
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-audit-log-access', 'grant-basic-unlock'],
  },
  {
    id: 'group-legal-core',
    name: 'Legal Core',
    description: 'Core legal team — 5 members.',
    membershipType: 'static',
    membershipLogic: 'AND',
    members: firstUserIds(u => u.department === 'Legal' && u.clearanceLevel >= 3, 5),
    membershipRules: [],
    subGroups: ['group-compliance'],
    inheritedPermissions: ['grant-audit-log-access'],
  },
  {
    id: 'group-devops-guild',
    name: 'DevOps Guild',
    // OR logic: the guild welcomes users from Engineering OR IT — a cross-functional team
    // where membership in either department (with sufficient clearance) qualifies a user.
    description: 'Cross-functional DevOps guild — 10 members.',
    membershipType: 'static',
    membershipLogic: 'OR',
    members: firstUserIds(u => (u.department === 'Engineering' || u.department === 'IT') && u.clearanceLevel >= 2 && u.status === 'active', 10),
    membershipRules: [],
    subGroups: ['group-it-ops'],
    inheritedPermissions: ['grant-basic-unlock', 'grant-zone-den-restricted'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS (150 generated — 7-8 per site)
// ─────────────────────────────────────────────────────────────────────────────

const SITE_PREFIXES: Record<string, string> = {
  'site-syd': 'ALC-SYD', 'site-mel': 'ALC-MEL', 'site-bne': 'ALC-BNE',
  'site-akl': 'ALC-AKL', 'site-cbr': 'SEC-CBR', 'site-nyc': 'PAC-NYC',
  'site-sfo': 'PAC-SFO', 'site-chi': 'PAC-CHI', 'site-dal': 'PAC-DAL',
  'site-sea': 'PAC-SEA', 'site-bos': 'PAC-BOS', 'site-den': 'SEC-DEN',
  'site-lon': 'PAC-LON', 'site-fra': 'EUR-FRA', 'site-par': 'EUR-PAR',
  'site-ams': 'EUR-AMS', 'site-dub': 'EUR-DUB', 'site-sto': 'EUR-STO',
  'site-sgp': 'ALC-SGP', 'site-tko': 'SEC-TKO',
}

const CTRL_LOCATIONS = [
  'Basement Level 1', 'Ground Floor Reception', 'Floor 1 North Wing',
  'Floor 2 South Wing', 'Floor 3 East Wing', 'Roof Level Plant Room',
  'Loading Dock Area', 'Server Room Corridor',
]

export const CONTROLLERS: Controller[] = SITES.flatMap((site, siteIdx) => {
  const prefix  = SITE_PREFIXES[site.id]
  const siteKey = site.id.replace('site-', '')
  const siteDoors = doorsForSite(site.id)
  const ctrlCount = 7 + (siteIdx % 2) // alternates 7 and 8

  return Array.from({ length: ctrlCount }, (_, n) => {
    const doorCount = 3 + (n % 2) // 3 or 4 doors per controller
    const startIdx  = (n * 3) % Math.max(siteDoors.length - doorCount, 1)
    const managedDoors = siteDoors.slice(startIdx, startIdx + doorCount)

    return {
      id:          `ctrl-${siteKey}-${String(n + 1).padStart(2, '0')}`,
      name:        `${prefix}-${String(n + 1).padStart(2, '0')}`,
      location:    CTRL_LOCATIONS[n % CTRL_LOCATIONS.length],
      siteId:      site.id,
      doorIds:     managedDoors,
      customAttributes: {},
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POLICIES (150 generated)
// ─────────────────────────────────────────────────────────────────────────────

interface PolicyTemplate {
  namePrefix: string
  description: string
  rules: Omit<Rule, 'id'>[]
  logicalOperator: 'AND' | 'OR'
  scheduleKey?: string
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    namePrefix: 'Lab Access Policy',
    description: 'Controls access to laboratory areas for research and engineering personnel.',
    rules: [
      { leftSide: 'user.department',    operator: 'IN', rightSide: ['Research', 'Engineering'] },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-aest-biz',
  },
  {
    namePrefix: 'Executive Wing Policy',
    description: 'Grants access to executive areas for senior leadership and support.',
    rules: [
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
      { leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-executive',
  },
  {
    namePrefix: 'Contractor Restricted Policy',
    description: 'Limits contractor access to business hours only in non-secure areas.',
    rules: [
      { leftSide: 'user.type',   operator: '==', rightSide: 'contractor' },
      { leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-contractor',
  },
  {
    namePrefix: 'Server Room Access Policy',
    description: 'Restricts server room access to IT and Engineering with high clearance.',
    rules: [
      { leftSide: 'user.department',    operator: 'IN', rightSide: ['IT', 'Engineering'] },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
      { leftSide: 'user.status',         operator: '==', rightSide: 'active' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-24-7',
  },
  {
    namePrefix: 'General Employee Access Policy',
    description: 'Standard access policy for all active employees during business hours.',
    rules: [
      { leftSide: 'user.type',   operator: '==', rightSide: 'employee' },
      { leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    logicalOperator: 'AND',
  },
  {
    namePrefix: 'Security Operations Policy',
    description: 'Access policy for security operations center personnel.',
    rules: [
      { leftSide: 'user.department',    operator: '==', rightSide: 'Security' },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-24-7',
  },
  {
    namePrefix: 'Night Shift Operations Policy',
    description: 'Extended access for operations staff on night shift.',
    rules: [
      { leftSide: 'user.department',    operator: '==', rightSide: 'Operations' },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-night-shift',
  },
  {
    namePrefix: 'Finance Secure Access Policy',
    description: 'Secure area access for finance department senior staff.',
    rules: [
      { leftSide: 'user.department',    operator: '==', rightSide: 'Finance' },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    logicalOperator: 'AND',
  },
  {
    namePrefix: 'Visitor Perimeter Policy',
    description: 'Allows visitors access to perimeter zones only.',
    rules: [
      { leftSide: 'user.type',   operator: '==', rightSide: 'visitor' },
      { leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    logicalOperator: 'AND',
  },
  {
    namePrefix: 'Maintenance Access Policy',
    description: 'Facilities access during scheduled maintenance windows.',
    rules: [
      { leftSide: 'user.department', operator: '==', rightSide: 'Facilities' },
      { leftSide: 'user.status',     operator: '==', rightSide: 'active' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-maintenance',
  },
  {
    namePrefix: 'Emergency Override Policy',
    description: 'Emergency access override for senior personnel in critical situations.',
    rules: [
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-emergency',
  },
  {
    namePrefix: 'HR Confidential Zone Policy',
    description: 'Restricts access to HR confidential areas.',
    rules: [
      { leftSide: 'user.department',    operator: 'IN', rightSide: ['HR', 'Legal'] },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
    ],
    logicalOperator: 'AND',
  },
  {
    namePrefix: 'Cross-Department Senior Policy',
    description: 'Senior staff from multiple departments with clearance 3+.',
    rules: [
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' },
      { leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
      { leftSide: 'user.status',         operator: '==', rightSide: 'active' },
    ],
    logicalOperator: 'AND',
  },
  {
    namePrefix: 'Weekend Operations Policy',
    description: 'Extended access for essential staff during weekends.',
    rules: [
      { leftSide: 'user.department',    operator: 'IN', rightSide: ['Operations', 'Security', 'IT'] },
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '2' },
    ],
    logicalOperator: 'OR',
    scheduleKey: 'sched-weekend',
  },
  {
    namePrefix: 'Data Centre Critical Policy',
    description: 'Critical access policy for data centre operations — highest clearance required.',
    rules: [
      { leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' },
      { leftSide: 'user.department',     operator: 'IN', rightSide: ['IT', 'Engineering', 'Security'] },
      { leftSide: 'user.type',           operator: '==', rightSide: 'employee' },
    ],
    logicalOperator: 'AND',
    scheduleKey: 'sched-24-7',
  },
]

export const POLICIES: Policy[] = Array.from({ length: 150 }, (_, i) => {
  const template   = POLICY_TEMPLATES[i % POLICY_TEMPLATES.length]
  const site       = SITES[i % SITES.length]
  const siteDoors  = doorsForSite(site.id)

  // Pick 2-5 doors from this site
  const doorCount  = 2 + (i % 4)
  const startIdx   = (i * 2) % Math.max(siteDoors.length - doorCount, 1)
  const doorIds    = siteDoors.slice(startIdx, startIdx + doorCount)

  const rules: Rule[] = template.rules.map((r, rIdx) => ({
    id:        `pr-${i + 1}-${rIdx + 1}`,
    leftSide:  r.leftSide,
    operator:  r.operator,
    rightSide: r.rightSide,
  }))

  // ~30% have a schedule
  const scheduleId = (i % 10 < 3) && template.scheduleKey ? template.scheduleKey : undefined

  return {
    id:              `policy-${String(i + 1).padStart(3, '0')}`,
    name:            `${template.namePrefix} — ${site.name.split(' ')[0]} ${String(i + 1).padStart(3, '0')}`,
    description:     `${template.description} Applied at ${site.name}.`,
    rules,
    logicalOperator: template.logicalOperator,
    doorIds,
    scheduleId,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// HARDWARE I/O DEVICES
// Generated deterministically from DOORS, ZONES, CONTROLLERS.
//
// Status distribution (deterministic from device index):
//   95% online, 2% offline, 2% tamper, 1% fault
// ─────────────────────────────────────────────────────────────────────────────

function deviceStatus(idx: number): DeviceStatus {
  const v = idx % 100
  if (v < 95) return 'online'
  if (v < 97) return 'offline'
  if (v < 99) return 'tamper'
  return 'fault'
}

// Per-controller port counter (resets per controller)
const inputPortCounters:  Record<string, number> = {}
const outputPortCounters: Record<string, number> = {}

function nextInputPort(controllerId: string): number {
  inputPortCounters[controllerId] = (inputPortCounters[controllerId] ?? 0) + 1
  return inputPortCounters[controllerId]
}

function nextOutputPort(controllerId: string): number {
  outputPortCounters[controllerId] = (outputPortCounters[controllerId] ?? 0) + 1
  return outputPortCounters[controllerId]
}

function controllerForDoor(doorId: string): string {
  const ctrl = CONTROLLERS.find(c => c.doorIds.includes(doorId))
  // Fallback: assign to first controller at same site — should not occur with well-formed seed
  if (!ctrl) {
    const door = DOORS.find(d => d.id === doorId)
    const fallback = CONTROLLERS.find(c => c.siteId === door?.siteId)
    return fallback?.id ?? 'ctrl-unknown'
  }
  return ctrl.id
}

// Zones typed Secure or Restricted (elevated-security zones)
function isSecureZone(zoneId: string): boolean {
  const zone = ZONES.find(z => z.id === zoneId)
  return zone?.type === 'Secure' || zone?.type === 'Restricted'
}

function isPerimeterZone(zoneId: string): boolean {
  const zone = ZONES.find(z => z.id === zoneId)
  return zone?.type === 'Perimeter'
}

// Extract siteKey from a door id: door-{siteKey}-{zoneKey}-{n}
function siteKeyFromDoorId(doorId: string): string {
  return doorId.split('-')[1]
}

// Global device index counters for deterministic status
let iDevGlobalIdx = 0
let oDevGlobalIdx = 0

const INPUT_DEVICES_LIST:  InputDevice[]  = []
const OUTPUT_DEVICES_LIST: OutputDevice[] = []

DOORS.forEach((door, doorIdx) => {
  const siteKey    = siteKeyFromDoorId(door.id)
  const controllerId = controllerForDoor(door.id)
  const secureZone  = door.zoneId != null && isSecureZone(door.zoneId)

  // ── Per-door input devices ─────────────────────────────────────────────────

  // 1. Card reader (all doors)
  INPUT_DEVICES_LIST.push({
    id:           `idev-${siteKey}-${doorIdx}-1`,
    name:         `${door.name} Reader`,
    type:         'card_reader',
    doorId:       door.id,
    controllerId,
    port:         nextInputPort(controllerId),
    status:       deviceStatus(iDevGlobalIdx++),
    config:       { wiegandBits: '26' },
  })

  // 2. REX button (all doors)
  INPUT_DEVICES_LIST.push({
    id:           `idev-${siteKey}-${doorIdx}-2`,
    name:         `${door.name} REX`,
    type:         'rex_button',
    doorId:       door.id,
    controllerId,
    port:         nextInputPort(controllerId),
    status:       deviceStatus(iDevGlobalIdx++),
    config:       {},
  })

  // 3. Door contact (all doors)
  INPUT_DEVICES_LIST.push({
    id:           `idev-${siteKey}-${doorIdx}-3`,
    name:         `${door.name} Contact`,
    type:         'door_contact',
    doorId:       door.id,
    controllerId,
    port:         nextInputPort(controllerId),
    status:       deviceStatus(iDevGlobalIdx++),
    config:       { normalState: 'closed' },
  })

  // 4. PIR sensor — Secure/Restricted zones only
  if (secureZone) {
    INPUT_DEVICES_LIST.push({
      id:           `idev-${siteKey}-${doorIdx}-4`,
      name:         `${door.name} PIR`,
      type:         'pir_sensor',
      doorId:       door.id,
      controllerId,
      port:         nextInputPort(controllerId),
      status:       deviceStatus(iDevGlobalIdx++),
      config:       { sensitivity: 'high' },
    })
  }

  // ── Per-door output devices ────────────────────────────────────────────────

  // 1. Lock (electric_strike for normal, mag_lock for Secure/Restricted)
  OUTPUT_DEVICES_LIST.push({
    id:           `odev-${siteKey}-${doorIdx}-1`,
    name:         `${door.name} Lock`,
    type:         secureZone ? 'mag_lock' : 'electric_strike',
    doorId:       door.id,
    controllerId,
    port:         nextOutputPort(controllerId),
    status:       deviceStatus(oDevGlobalIdx++),
    config:       {
      lockType: secureZone ? 'fail-secure' : 'fail-safe',
      holdTime: '5',
    },
  })

  // 2. Camera trigger — Secure/Restricted zones only
  if (secureZone) {
    OUTPUT_DEVICES_LIST.push({
      id:           `odev-${siteKey}-${doorIdx}-2`,
      name:         `${door.name} Cam`,
      type:         'camera_trigger',
      doorId:       door.id,
      controllerId,
      port:         nextOutputPort(controllerId),
      status:       deviceStatus(oDevGlobalIdx++),
      config:       { preRecordSec: '10' },
    })
  }
})

// ── Zone-level devices ─────────────────────────────────────────────────────
// Perimeter zones: 2 PIR inputs + siren + strobe (zone-level, no doorId)
// Secure/Restricted zones: 1 glass_break input + siren + strobe

ZONES.forEach((zone, zoneIdx) => {
  const siteKey   = zone.siteId.replace('site-', '')
  const doorsInZone = DOORS.filter(d => d.zoneId === zone.id)
  const firstDoor  = doorsInZone[0]

  // All zone-level devices are assigned to the controller managing the first door in the zone
  const zoneControllerId = firstDoor ? controllerForDoor(firstDoor.id) : CONTROLLERS.find(c => c.siteId === zone.siteId)?.id ?? 'ctrl-unknown'

  if (isPerimeterZone(zone.id)) {
    const anchorDoorId = firstDoor?.id ?? ''

    // 2 PIR sensors
    INPUT_DEVICES_LIST.push({
      id:           `idev-${siteKey}-zone-${zoneIdx}-1`,
      name:         `${zone.name} PIR 1`,
      type:         'pir_sensor',
      doorId:       anchorDoorId,
      controllerId: zoneControllerId,
      port:         nextInputPort(zoneControllerId),
      status:       deviceStatus(iDevGlobalIdx++),
      config:       { sensitivity: 'medium' },
    })
    INPUT_DEVICES_LIST.push({
      id:           `idev-${siteKey}-zone-${zoneIdx}-2`,
      name:         `${zone.name} PIR 2`,
      type:         'pir_sensor',
      doorId:       anchorDoorId,
      controllerId: zoneControllerId,
      port:         nextInputPort(zoneControllerId),
      status:       deviceStatus(iDevGlobalIdx++),
      config:       { sensitivity: 'medium' },
    })

    // Siren (zone-level)
    OUTPUT_DEVICES_LIST.push({
      id:           `odev-${siteKey}-zone-${zoneIdx}-1`,
      name:         `${zone.name} Siren`,
      type:         'siren',
      zoneId:       zone.id,
      controllerId: zoneControllerId,
      port:         nextOutputPort(zoneControllerId),
      status:       deviceStatus(oDevGlobalIdx++),
      config:       {},
    })

    // Strobe (zone-level)
    OUTPUT_DEVICES_LIST.push({
      id:           `odev-${siteKey}-zone-${zoneIdx}-2`,
      name:         `${zone.name} Strobe`,
      type:         'strobe',
      zoneId:       zone.id,
      controllerId: zoneControllerId,
      port:         nextOutputPort(zoneControllerId),
      status:       deviceStatus(oDevGlobalIdx++),
      config:       {},
    })
  }

  if (isSecureZone(zone.id)) {
    const anchorDoorId = firstDoor?.id ?? ''

    // Glass break (zone-level, anchored to first door)
    INPUT_DEVICES_LIST.push({
      id:           `idev-${siteKey}-zone-${zoneIdx}-1`,
      name:         `${zone.name} Glass Break`,
      type:         'glass_break',
      doorId:       anchorDoorId,
      controllerId: zoneControllerId,
      port:         nextInputPort(zoneControllerId),
      status:       deviceStatus(iDevGlobalIdx++),
      config:       {},
    })

    // Siren (zone-level)
    OUTPUT_DEVICES_LIST.push({
      id:           `odev-${siteKey}-zone-${zoneIdx}-1`,
      name:         `${zone.name} Siren`,
      type:         'siren',
      zoneId:       zone.id,
      controllerId: zoneControllerId,
      port:         nextOutputPort(zoneControllerId),
      status:       deviceStatus(oDevGlobalIdx++),
      config:       {},
    })

    // Strobe (zone-level)
    OUTPUT_DEVICES_LIST.push({
      id:           `odev-${siteKey}-zone-${zoneIdx}-2`,
      name:         `${zone.name} Strobe`,
      type:         'strobe',
      zoneId:       zone.id,
      controllerId: zoneControllerId,
      port:         nextOutputPort(zoneControllerId),
      status:       deviceStatus(oDevGlobalIdx++),
      config:       {},
    })
  }
})

export const INPUT_DEVICES:  InputDevice[]  = INPUT_DEVICES_LIST
export const OUTPUT_DEVICES: OutputDevice[] = OUTPUT_DEVICES_LIST
