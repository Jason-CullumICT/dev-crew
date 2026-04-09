import type {
  User, Group, Grant, NamedSchedule, Policy,
  Door, Zone, Site, Controller,
} from '../types'

// ── Sites ────────────────────────────────────────────────────────────────────

export const SITES: Site[] = [
  { id: 'site-alpha', name: 'Alpha HQ', address: '1 Collins St, Melbourne VIC', timezone: 'Australia/Melbourne', status: 'Disarmed' },
  { id: 'site-beta',  name: 'Beta Campus', address: '200 Tech Ave, Sydney NSW', timezone: 'Australia/Sydney', status: 'Armed' },
  { id: 'site-gamma', name: 'Gamma Depot', address: '45 Harbour Rd, Brisbane QLD', timezone: 'Australia/Brisbane', status: 'Disarmed' },
]

// ── Zones ────────────────────────────────────────────────────────────────────

export const ZONES: Zone[] = [
  { id: 'z-alpha-perimeter', siteId: 'site-alpha', name: 'Perimeter', type: 'Perimeter', status: 'Disarmed' },
  { id: 'z-alpha-restricted', siteId: 'site-alpha', name: 'Restricted Labs', type: 'Restricted', status: 'Disarmed' },
  { id: 'z-alpha-interior', siteId: 'site-alpha', name: 'General Interior', type: 'Interior', status: 'Disarmed' },
  { id: 'z-beta-secure', siteId: 'site-beta', name: 'Secure Wing', type: 'Secure', status: 'Armed' },
  { id: 'z-beta-public', siteId: 'site-beta', name: 'Public Lobby', type: 'Public', status: 'Disarmed' },
  { id: 'z-gamma-interior', siteId: 'site-gamma', name: 'Warehouse', type: 'Interior', status: 'Disarmed' },
]

// ── Doors ────────────────────────────────────────────────────────────────────

export const DOORS: Door[] = [
  { id: 'door-alpha-server', name: 'Server Room A', siteId: 'site-alpha', zoneId: 'z-alpha-restricted', description: 'Primary server cluster', customAttributes: {} },
  { id: 'door-alpha-comms', name: 'Comms Hub', siteId: 'site-alpha', zoneId: 'z-alpha-restricted', description: 'Network operations', customAttributes: {} },
  { id: 'door-alpha-lab3', name: 'Lab 3', siteId: 'site-alpha', zoneId: 'z-alpha-restricted', description: 'Research lab', customAttributes: {} },
  { id: 'door-alpha-lobby', name: 'Main Lobby', siteId: 'site-alpha', zoneId: 'z-alpha-interior', description: 'Reception entrance', customAttributes: {} },
  { id: 'door-alpha-carpark', name: 'Car Park Entry', siteId: 'site-alpha', zoneId: 'z-alpha-perimeter', description: 'Underground parking', customAttributes: {} },
  { id: 'door-beta-dc', name: 'Data Centre', siteId: 'site-beta', zoneId: 'z-beta-secure', description: 'Beta primary DC', customAttributes: {} },
  { id: 'door-beta-noc', name: 'NOC Room', siteId: 'site-beta', zoneId: 'z-beta-secure', description: 'Network operations centre', customAttributes: {} },
  { id: 'door-beta-lobby', name: 'Beta Lobby', siteId: 'site-beta', zoneId: 'z-beta-public', description: 'Main entrance', customAttributes: {} },
  { id: 'door-gamma-main', name: 'Warehouse Main', siteId: 'site-gamma', zoneId: 'z-gamma-interior', description: 'Primary warehouse entry', customAttributes: {} },
  { id: 'door-gamma-office', name: 'Depot Office', siteId: 'site-gamma', zoneId: 'z-gamma-interior', description: 'Admin office', customAttributes: {} },
]

// ── Users ────────────────────────────────────────────────────────────────────

export const USERS: User[] = [
  { id: 'u-sarah',   name: 'Sarah Chen',     email: 'sarah.chen@axon.io',    department: 'Operations', role: 'Senior Analyst',    clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-marcus',  name: 'Marcus Webb',     email: 'marcus.webb@axon.io',   department: 'Security',   role: 'Security Director', clearanceLevel: 5, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-aisha',   name: 'Aisha Tanaka',    email: 'aisha.tanaka@axon.io',  department: 'Operations', role: 'Analyst',           clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-james',   name: 'James Park',      email: 'james.park@axon.io',    department: 'Operations', role: 'Junior Analyst',    clearanceLevel: 2, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-rachel',  name: 'Rachel Liu',      email: 'rachel.liu@axon.io',    department: 'Engineering', role: 'DevOps Engineer',  clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-tom',     name: 'Tom Okafor',      email: 'tom.okafor@axon.io',    department: 'Security',   role: 'Analyst',           clearanceLevel: 4, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-priya',   name: 'Priya Sharma',    email: 'priya.sharma@axon.io',  department: 'Engineering', role: 'SRE',              clearanceLevel: 2, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-ben',     name: 'Ben Kowalski',    email: 'ben.kowalski@axon.io',  department: 'Operations', role: 'Night Operator',    clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-nina',    name: 'Nina Rodriguez',  email: 'nina.r@axon.io',        department: 'Facilities', role: 'Manager',           clearanceLevel: 2, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-alex',    name: 'Alex Nguyen',     email: 'alex.n@contractor.io',  department: 'Engineering', role: 'Contractor',       clearanceLevel: 1, type: 'contractor', status: 'active',    customAttributes: { contractExpiry: '2026-12-31' } },
  { id: 'u-zoe',     name: 'Zoe Williams',    email: 'zoe.w@axon.io',         department: 'Operations', role: 'Weekend Operator',  clearanceLevel: 3, type: 'employee',   status: 'active',    customAttributes: {} },
  { id: 'u-inactive',name: 'David Foster',    email: 'd.foster@axon.io',      department: 'Security',   role: 'Analyst',           clearanceLevel: 3, type: 'employee',   status: 'suspended', customAttributes: {} },
]

// ── Named Schedules ───────────────────────────────────────────────────────────

export const SCHEDULES: NamedSchedule[] = [
  {
    id: 'sched-business',
    name: 'Business Hours',
    timezone: 'Australia/Melbourne',
    windows: [{ id: 'w-bh', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '07:00', endTime: '19:00' }],
    holidays: [
      { id: 'h-christmas', name: 'Christmas Day', month: 12, day: 25, behavior: 'deny_all', overrideGrantIds: [] },
      { id: 'h-boxing',    name: 'Boxing Day',    month: 12, day: 26, behavior: 'deny_all', overrideGrantIds: [] },
      { id: 'h-newyear',   name: "New Year's Day",month: 1,  day: 1,  behavior: 'deny_all', overrideGrantIds: [] },
      { id: 'h-anzac',     name: 'ANZAC Day',     month: 4,  day: 25, behavior: 'allow_with_override', overrideGrantIds: ['grant-emergency'], requiredClearance: 3 },
    ],
  },
  {
    id: 'sched-night',
    name: 'Night Operations',
    timezone: 'Australia/Melbourne',
    windows: [{ id: 'w-night', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '20:00', endTime: '06:00' }],
    holidays: [
      { id: 'h-night-christmas', name: 'Christmas Day', month: 12, day: 25, behavior: 'deny_all', overrideGrantIds: [] },
    ],
  },
  {
    id: 'sched-247',
    name: '24/7 Always On',
    timezone: 'Australia/Melbourne',
    windows: [
      { id: 'w-247-wd', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '00:00', endTime: '23:59' },
      { id: 'w-247-we', days: ['Sat', 'Sun'], startTime: '00:00', endTime: '23:59' },
    ],
    holidays: [],
  },
]

// ── Grants ───────────────────────────────────────────────────────────────────

export const GRANTS: Grant[] = [
  {
    id: 'grant-general-access',
    name: 'General Access',
    description: 'Business hours access to non-restricted areas',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    scheduleId: 'sched-business',
    customAttributes: {},
  },
  {
    id: 'grant-night-ops',
    name: 'Night Ops',
    description: 'Night access to restricted areas for Operations staff',
    scope: 'site',
    targetId: 'site-alpha',
    actions: ['unlock', 'arm', 'disarm'],
    applicationMode: 'conditional',
    conditions: [{ id: 'c-night-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-night',
    customAttributes: {},
  },
  {
    id: 'grant-security-ops',
    name: 'Security Ops',
    description: 'Full access for Security department staff',
    scope: 'global',
    actions: ['unlock', 'arm', 'disarm', 'lockdown', 'view_logs'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    scheduleId: 'sched-247',
    customAttributes: {},
  },
  {
    id: 'grant-emergency',
    name: 'Emergency Access',
    description: 'L4+ staff — auto-applies in emergencies, overrides holiday schedules',
    scope: 'global',
    actions: ['unlock', 'arm', 'disarm', 'override'],
    applicationMode: 'auto',
    conditions: [{ id: 'c-emg-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '4' }],
    conditionLogic: 'AND',
    customAttributes: {},
  },
  {
    id: 'grant-lab-access',
    name: 'Lab Access',
    description: 'Access to research labs during business hours',
    scope: 'zone',
    targetId: 'z-alpha-restricted',
    actions: ['unlock', 'view_logs'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    scheduleId: 'sched-business',
    customAttributes: {},
  },
  {
    id: 'grant-contractor',
    name: 'Contractor Lobby',
    description: 'Lobby-only access for contractors during business hours',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'auto',
    conditions: [{ id: 'c-con-1', leftSide: 'user.type', operator: '==', rightSide: 'contractor' }],
    conditionLogic: 'AND',
    scheduleId: 'sched-business',
    customAttributes: {},
  },
]

// ── Groups ───────────────────────────────────────────────────────────────────

export const GROUPS: Group[] = [
  {
    id: 'g-noc',
    name: 'NOC Team',
    description: 'Network Operations Centre — all Operations department staff',
    membershipType: 'dynamic',
    members: [],
    membershipRules: [
      { id: 'gr-noc-1', leftSide: 'user.department', operator: '==', rightSide: 'Operations' },
      { id: 'gr-noc-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: ['g-night-shift', 'g-weekend-crew'],
    inheritedPermissions: ['grant-general-access', 'grant-lab-access'],
  },
  {
    id: 'g-night-shift',
    name: 'Night Shift',
    description: 'Operations staff rostered for overnight shifts',
    membershipType: 'static',
    members: ['u-sarah', 'u-aisha', 'u-ben'],
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-night-ops'],
  },
  {
    id: 'g-weekend-crew',
    name: 'Weekend Crew',
    description: 'Operations staff rostered for weekend coverage',
    membershipType: 'static',
    members: ['u-zoe', 'u-ben', 'u-james'],
    membershipRules: [],
    subGroups: [],
    inheritedPermissions: ['grant-general-access'],
  },
  {
    id: 'g-security',
    name: 'Security Operations',
    description: 'Security department — full site access',
    membershipType: 'dynamic',
    members: [],
    membershipRules: [
      { id: 'gr-sec-1', leftSide: 'user.department', operator: '==', rightSide: 'Security' },
      { id: 'gr-sec-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-security-ops'],
  },
  {
    id: 'g-engineering',
    name: 'Engineering',
    description: 'Engineering staff — general access only',
    membershipType: 'dynamic',
    members: [],
    membershipRules: [
      { id: 'gr-eng-1', leftSide: 'user.department', operator: '==', rightSide: 'Engineering' },
      { id: 'gr-eng-2', leftSide: 'user.status', operator: '==', rightSide: 'active' },
    ],
    subGroups: [],
    inheritedPermissions: ['grant-general-access'],
  },
]

// ── Policies ─────────────────────────────────────────────────────────────────

export const POLICIES: Policy[] = [
  {
    id: 'pol-restricted-zone',
    name: 'Restricted Zone Clearance',
    description: 'Restricted zones require clearance level 3 or above',
    rules: [{ id: 'pr-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: '3' }],
    logicalOperator: 'AND',
    doorIds: ['door-alpha-server', 'door-alpha-comms', 'door-alpha-lab3', 'door-beta-dc', 'door-beta-noc'],
  },
  {
    id: 'pol-active-only',
    name: 'Active Users Only',
    description: 'Suspended or inactive users are blocked everywhere',
    rules: [{ id: 'pr-2', leftSide: 'user.status', operator: '==', rightSide: 'active' }],
    logicalOperator: 'AND',
    doorIds: [
      'door-alpha-server', 'door-alpha-comms', 'door-alpha-lab3',
      'door-alpha-lobby', 'door-alpha-carpark',
      'door-beta-dc', 'door-beta-noc', 'door-beta-lobby',
      'door-gamma-main', 'door-gamma-office',
    ],
  },
]

// ── Controllers ───────────────────────────────────────────────────────────────

export const CONTROLLERS: Controller[] = [
  { id: 'ctrl-alpha-1', name: 'Alpha Panel A', location: 'Server Room corridor', siteId: 'site-alpha', doorIds: ['door-alpha-server', 'door-alpha-comms'], customAttributes: {} },
  { id: 'ctrl-alpha-2', name: 'Alpha Panel B', location: 'Main lobby', siteId: 'site-alpha', doorIds: ['door-alpha-lobby', 'door-alpha-carpark'], customAttributes: {} },
  { id: 'ctrl-alpha-3', name: 'Alpha Panel C', location: 'Lab corridor', siteId: 'site-alpha', doorIds: ['door-alpha-lab3'], customAttributes: {} },
  { id: 'ctrl-beta-1',  name: 'Beta Panel A',  location: 'DC floor', siteId: 'site-beta', doorIds: ['door-beta-dc', 'door-beta-noc'], customAttributes: {} },
  { id: 'ctrl-beta-2',  name: 'Beta Panel B',  location: 'Lobby', siteId: 'site-beta', doorIds: ['door-beta-lobby'], customAttributes: {} },
  { id: 'ctrl-gamma-1', name: 'Gamma Panel A', location: 'Warehouse entrance', siteId: 'site-gamma', doorIds: ['door-gamma-main', 'door-gamma-office'], customAttributes: {} },
]
