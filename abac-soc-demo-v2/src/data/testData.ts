import { v4 as uuidv4 } from 'uuid';
import type { User, Group, Grant, Site, Zone, Door, Controller, Policy, Task, ArmingLog } from '../types';
import { useStore } from '../store/store';

export function generateTestData() {
  // ── Sites ──
  const s1 = uuidv4(), s2 = uuidv4(), s3 = uuidv4(), s4 = uuidv4(), s5 = uuidv4();
  const sites: Site[] = [
    { id: s1, name: 'HQ Office', address: '1 Corporate Drive, Auckland', timezone: 'Pacific/Auckland', status: 'Armed', assignedManagerIds: [], zones: [], customAttributes: { operationalStatus: 'Active' } },
    { id: s2, name: 'Regional Office', address: '45 Regional Blvd, Wellington', timezone: 'Pacific/Auckland', status: 'Armed', assignedManagerIds: [], zones: [], customAttributes: {} },
    { id: s3, name: 'Data Centre Alpha', address: '99 Server Lane, Christchurch', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [], customAttributes: {} },
    { id: s4, name: 'Central Warehouse', address: '200 Industrial Way, Hamilton', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [], customAttributes: {} },
    { id: s5, name: 'Executive Suite', address: '10 Boardroom St, Auckland', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [], customAttributes: {} },
  ];

  // ── Zones ──
  const zones: Zone[] = [];
  function zone(siteId: string, name: string, type: Zone['type'], status: Zone['status'], customAttributes: Record<string, string> = {}): Zone {
    const z: Zone = { id: uuidv4(), siteId, name, type, status, doorIds: [], customAttributes };
    zones.push(z);
    return z;
  }
  const z_hq_peri  = zone(s1, 'HQ Perimeter', 'Perimeter', 'Armed');
  const z_hq_int   = zone(s1, 'HQ Interior', 'Interior', 'Armed');
  const z_hq_sec   = zone(s1, 'HQ Secure Lab', 'Secure', 'Armed', { classification: 'Secure' });
  const z_reg_peri = zone(s2, 'Regional Perimeter', 'Perimeter', 'Armed');
  const z_reg_int  = zone(s2, 'Regional Interior', 'Interior', 'Disarmed');
  const z_reg_pub  = zone(s2, 'Regional Lobby', 'Public', 'Disarmed', { classification: 'Standard' });
  const z_dc_sec   = zone(s3, 'DC Secure Zone', 'Secure', 'Armed', { classification: 'Secure' });
  const z_dc_int   = zone(s3, 'DC Operations', 'Interior', 'Disarmed');
  const z_dc_emg   = zone(s3, 'DC Emergency', 'Emergency', 'Disarmed');
  const z_wh_peri  = zone(s4, 'Warehouse Perimeter', 'Perimeter', 'Disarmed');
  const z_wh_int   = zone(s4, 'Warehouse Floor', 'Interior', 'Disarmed');
  const z_ex_sec   = zone(s5, 'Executive Secure', 'Secure', 'Disarmed');
  const z_ex_pub   = zone(s5, 'Executive Lobby', 'Public', 'Disarmed');

  // ── Controllers ──
  const ctrl1: Controller = { id: uuidv4(), name: 'HQ-CTRL-01', location: 'HQ Server Room', siteId: s1, doorIds: [], customAttributes: {} };
  const ctrl2: Controller = { id: uuidv4(), name: 'DC-CTRL-01', location: 'DC Control Room', siteId: s3, doorIds: [], customAttributes: {} };
  const ctrl3: Controller = { id: uuidv4(), name: 'REG-CTRL-01', location: 'Regional IT Closet', siteId: s2, doorIds: [], customAttributes: {} };
  const controllers: Controller[] = [ctrl1, ctrl2, ctrl3];

  // ── Doors ──
  function door(
    name: string,
    location: string,
    siteId: string,
    zoneId: string,
    controllerId: string,
    lockState: Door['lockState'] = 'Locked',
    customAttributes: Record<string, string> = {},
  ): Door {
    const d: Door = { id: uuidv4(), name, location, siteId, zoneId, controllerId, description: `${name} access point`, lockState, customAttributes };
    ctrl1.doorIds = ctrl1.siteId === siteId ? [...ctrl1.doorIds, d.id] : ctrl1.doorIds;
    ctrl2.doorIds = ctrl2.siteId === siteId ? [...ctrl2.doorIds, d.id] : ctrl2.doorIds;
    ctrl3.doorIds = ctrl3.siteId === siteId ? [...ctrl3.doorIds, d.id] : ctrl3.doorIds;
    return d;
  }
  const d1  = door('HQ Main Entrance',       'Ground Floor',  s1, z_hq_peri.id, ctrl1.id, 'Locked',    { securityLevel: 'High' });
  const d2  = door('HQ Side Gate',           'Car Park',      s1, z_hq_peri.id, ctrl1.id, 'Locked',    { securityLevel: 'Low' });
  const d3  = door('HQ Lab Door',            'Level 3',       s1, z_hq_sec.id,  ctrl1.id, 'Locked',    { securityLevel: 'High', requiredClearance: 'Secret' });
  const d4  = door('HQ Server Room',         'Basement',      s1, z_hq_int.id,  ctrl1.id, 'Locked',    { securityLevel: 'High', requiredClearance: 'TopSecret' });
  const d5  = door('Regional Front Door',    'Ground Floor',  s2, z_reg_peri.id, ctrl3.id, 'Unlocked', {});
  const d6  = door('Regional Meeting Rooms', 'Level 2',       s2, z_reg_int.id,  ctrl3.id, 'Locked',   {});
  const d7  = door('DC Primary Access',      'Entry Lobby',   s3, z_dc_sec.id,  ctrl2.id, 'Locked',    { securityLevel: 'High', requiredClearance: 'Secret' });
  const d8  = door('DC Operations Room',     'Level 1',       s3, z_dc_int.id,  ctrl2.id, 'Locked',    { securityLevel: 'Low' });
  const d9  = door('DC Emergency Exit',      'East Wing',     s3, z_dc_emg.id,  ctrl2.id, 'Locked',    {});
  const d10 = door('Warehouse Gate A',       'North Entry',   s4, z_wh_peri.id, ctrl1.id, 'Unlocked',  {});
  const d11 = door('Warehouse Floor Access', 'Loading Bay',   s4, z_wh_int.id,  ctrl1.id, 'Locked',    {});
  const d12 = door('Executive Suite Entry',  'Level 20',      s5, z_ex_sec.id,  ctrl1.id, 'Locked',    { securityLevel: 'High', requiredClearance: 'TopSecret' });
  const doors: Door[] = [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12];

  // Assign doors to zones
  z_hq_peri.doorIds  = [d1.id, d2.id];
  z_hq_sec.doorIds   = [d3.id];
  z_hq_int.doorIds   = [d4.id];
  z_reg_peri.doorIds = [d5.id];
  z_reg_int.doorIds  = [d6.id];
  z_dc_sec.doorIds   = [d7.id];
  z_dc_int.doorIds   = [d8.id];
  z_dc_emg.doorIds   = [d9.id];
  z_wh_peri.doorIds  = [d10.id];
  z_wh_int.doorIds   = [d11.id];
  z_ex_sec.doorIds   = [d12.id];

  // Assign zones to sites
  sites[0].zones = [z_hq_peri.id, z_hq_int.id, z_hq_sec.id];
  sites[1].zones = [z_reg_peri.id, z_reg_int.id, z_reg_pub.id];
  sites[2].zones = [z_dc_sec.id, z_dc_int.id, z_dc_emg.id];
  sites[3].zones = [z_wh_peri.id, z_wh_int.id];
  sites[4].zones = [z_ex_sec.id, z_ex_pub.id];

  // ── Grants ──
  const g1: Grant = { id: uuidv4(), name: 'Global Admin', description: 'Full access to all actions', scope: 'global', actions: ['arm','disarm','unlock','lockdown','view_logs','manage_users','manage_tasks','override'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g2: Grant = { id: uuidv4(), name: 'Global View', description: 'View logs globally', scope: 'global', actions: ['view_logs'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g3: Grant = { id: uuidv4(), name: 'HQ Arm/Disarm', description: 'Arm and disarm HQ', scope: 'site', targetId: s1, actions: ['arm','disarm'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g4: Grant = { id: uuidv4(), name: 'HQ Unlock', description: 'Unlock HQ doors', scope: 'site', targetId: s1, actions: ['unlock'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g5: Grant = { id: uuidv4(), name: 'DC Secure Access', description: 'Full DC access', scope: 'site', targetId: s3, actions: ['arm','disarm','unlock','lockdown','override'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g6: Grant = { id: uuidv4(), name: 'Regional Operator', description: 'Operate regional office', scope: 'site', targetId: s2, actions: ['arm','disarm','unlock'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g7: Grant = { id: uuidv4(), name: 'Warehouse Access', description: 'Warehouse arm/unlock', scope: 'site', targetId: s4, actions: ['arm','disarm','unlock'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };
  const g8: Grant = { id: uuidv4(), name: 'Task Manager', description: 'Create and manage tasks globally', scope: 'global', actions: ['manage_tasks'], applicationMode: 'assigned', conditions: [], conditionLogic: 'AND', customAttributes: {}, schedule: null };

  const gDayShift: Grant = {
    id: 'grant-day-shift',
    name: 'Day Shift Access',
    description: 'Unlock access restricted to business hours Mon–Fri',
    scope: 'global',
    actions: ['unlock'],
    applicationMode: 'assigned',
    conditions: [],
    conditionLogic: 'AND',
    customAttributes: { tier: 'standard' },
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '18:00',
      timezone: 'Australia/Sydney',
    },
  };

  const gAdminAuto: Grant = {
    id: 'grant-admin-auto',
    name: 'Admin Auto-Grant',
    description: 'Automatically granted to any user with role == Administrator',
    scope: 'global',
    actions: ['unlock', 'arm', 'disarm', 'manage_users'],
    applicationMode: 'auto',
    conditions: [{ id: 'c-aa-1', leftSide: 'user.role', operator: '==', rightSide: 'Administrator' }],
    conditionLogic: 'AND',
    customAttributes: { tier: 'admin' },
    schedule: null,
  };

  const gHighSec: Grant = {
    id: 'grant-high-sec',
    name: 'High Security Access',
    description: 'Assigned grant that only counts for Secret-cleared users',
    scope: 'global',
    actions: ['unlock', 'override'],
    applicationMode: 'conditional',
    conditions: [{ id: 'c-hs-1', leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'Secret' }],
    conditionLogic: 'AND',
    customAttributes: { tier: 'secure' },
    schedule: null,
  };

  const grants: Grant[] = [g1, g2, g3, g4, g5, g6, g7, g8, gDayShift, gAdminAuto, gHighSec];

  // ── Groups ──
  // Executives — explicit
  const grp_exec: Group = {
    id: uuidv4(),
    name: 'Executives',
    description: 'Executive leadership team',
    members: [],
    membershipRules: [],
    membershipLogic: 'AND' as const,
    membershipType: 'explicit' as const,
    targetEntityType: 'user' as const,
    inheritedPermissions: [g1.id],
  };

  // Senior Security — dynamic: department == Security AND status == Active
  const grp_sec: Group = {
    id: uuidv4(),
    name: 'Senior Security',
    description: 'Senior security officers',
    members: [],
    membershipRules: [
      { id: 'mr-sec-1', leftSide: 'user.department', operator: '==', rightSide: 'Security' },
      { id: 'mr-sec-2', leftSide: 'user.status',     operator: '==', rightSide: 'Active' },
    ],
    membershipLogic: 'AND' as const,
    membershipType: 'dynamic' as const,
    targetEntityType: 'user' as const,
    inheritedPermissions: [g3.id, g4.id, g5.id, g6.id, g7.id],
  };

  // Operations Team — explicit
  const grp_ops: Group = {
    id: uuidv4(),
    name: 'Operations Team',
    description: 'General operations staff',
    members: [],
    membershipRules: [],
    membershipLogic: 'AND' as const,
    membershipType: 'explicit' as const,
    targetEntityType: 'user' as const,
    inheritedPermissions: [g2.id, g8.id],
  };

  // Engineering Lead — hybrid: explicit members + dynamic rule for Engineering dept
  const grp_eng: Group = {
    id: uuidv4(),
    name: 'Engineering Lead',
    description: 'Engineering department leads',
    members: [],
    membershipRules: [
      { id: 'mr-eng-1', leftSide: 'user.department', operator: '==', rightSide: 'Engineering' },
    ],
    membershipLogic: 'AND' as const,
    membershipType: 'hybrid' as const,
    targetEntityType: 'user' as const,
    inheritedPermissions: [g4.id, g5.id],
  };

  // Facilities — explicit
  const grp_fac: Group = {
    id: uuidv4(),
    name: 'Facilities',
    description: 'Facilities management',
    members: [],
    membershipRules: [],
    membershipLogic: 'AND' as const,
    membershipType: 'explicit' as const,
    targetEntityType: 'user' as const,
    inheritedPermissions: [g3.id, g7.id],
  };

  // Read-Only — explicit
  const grp_ro: Group = {
    id: uuidv4(),
    name: 'Read-Only',
    description: 'Audit/read-only access',
    members: [],
    membershipRules: [],
    membershipLogic: 'AND' as const,
    membershipType: 'explicit' as const,
    targetEntityType: 'user' as const,
    inheritedPermissions: [g2.id],
  };

  // High Security Doors — dynamic, targets doors
  const grp_high_sec_doors: Group = {
    id: 'group-high-security-doors',
    name: 'High Security Doors',
    description: 'Doors with securityLevel == High',
    members: [],
    membershipRules: [
      { id: 'mr-hsd-1', leftSide: 'door.securityLevel', operator: '==', rightSide: 'High' },
    ],
    membershipLogic: 'AND' as const,
    membershipType: 'dynamic' as const,
    targetEntityType: 'door' as const,
    inheritedPermissions: [],
  };

  // Secure Zones — dynamic, targets zones
  const grp_secure_zones: Group = {
    id: 'group-secure-zones',
    name: 'Secure Zones',
    description: 'Zones with type == Secure',
    members: [],
    membershipRules: [
      { id: 'mr-sz-1', leftSide: 'zone.type', operator: '==', rightSide: 'Secure' },
    ],
    membershipLogic: 'AND' as const,
    membershipType: 'dynamic' as const,
    targetEntityType: 'zone' as const,
    inheritedPermissions: [],
  };

  const groups: Group[] = [grp_exec, grp_sec, grp_ops, grp_eng, grp_fac, grp_ro, grp_high_sec_doors, grp_secure_zones];

  // ── Users (30) ──
  const depts = ['Engineering', 'Security', 'Operations', 'Executive', 'Facilities'];
  const roles = ['Engineer', 'Security Officer', 'Operator', 'Director', 'Facilities Manager', 'Analyst', 'Administrator'];
  const names = [
    'Alice Chen', 'Bob Martinez', 'Carol Smith', 'David Johnson', 'Eve Williams',
    'Frank Brown', 'Grace Lee', 'Henry Davis', 'Iris Wilson', 'Jack Anderson',
    'Karen Taylor', 'Leo Thomas', 'Mia Jackson', 'Nathan White', 'Olivia Harris',
    'Paul Martin', 'Quinn Thompson', 'Rachel Garcia', 'Sam Robinson', 'Tina Clark',
    'Uma Lewis', 'Victor Walker', 'Wendy Hall', 'Xavier Young', 'Yara Allen',
    'Zoe King', 'Aaron Wright', 'Bella Scott', 'Carlos Green', 'Diana Adams',
  ];

  const users: User[] = names.map((name, i) => {
    const dept = depts[i % depts.length];
    const role = roles[i % roles.length];
    const clearances: User['clearanceLevel'][] = ['Unclassified', 'Confidential', 'Secret', 'TopSecret'];
    const clearanceLevel = clearances[i % 4];
    const groupList =
      dept === 'Executive'    ? [grp_exec.id] :
      dept === 'Security'     ? [grp_sec.id] :
      dept === 'Operations'   ? [grp_ops.id] :
      dept === 'Engineering'  ? [grp_eng.id] :
      [grp_fac.id];
    const u: User = {
      id: uuidv4(),
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      department: dept,
      role,
      clearanceLevel,
      status: i === 5 ? 'Suspended' : i === 12 ? 'Pending' : 'Active',
      customAttributes: { team: dept.toLowerCase(), shift: i % 2 === 0 ? 'Day' : 'Night' },
      grantedPermissions: i === 0 ? [g1.id] : [],
      groupIds: groupList,
    };
    return u;
  });

  // Add users to explicit/hybrid groups as GroupMember entries
  users.forEach((u) => {
    u.groupIds.forEach((gid) => {
      const g = groups.find((grp) => grp.id === gid);
      if (g && (g.membershipType === 'explicit' || g.membershipType === 'hybrid')) {
        g.members.push({ entityType: 'user', entityId: u.id });
      }
    });
  });

  // Add a few read-only users
  [users[20], users[21], users[22]].forEach((u) => {
    u.groupIds.push(grp_ro.id);
    grp_ro.members.push({ entityType: 'user', entityId: u.id });
  });

  // Assign managers
  sites[0].assignedManagerIds = [users[0].id, users[1].id];
  sites[1].assignedManagerIds = [users[5].id];
  sites[2].assignedManagerIds = [users[10].id];

  // Assign day-shift grant to a few users (demonstrates schedule filtering)
  users[1].grantedPermissions.push(gDayShift.id);
  users[2].grantedPermissions.push(gDayShift.id);
  users[3].grantedPermissions.push(gDayShift.id);

  // Assign conditional high-sec grant to Secret+ cleared users
  users.filter((u) => ['Secret', 'TopSecret'].includes(u.clearanceLevel))
       .forEach((u) => u.grantedPermissions.push(gHighSec.id));

  // ── ABAC Policies ──
  const policies: Policy[] = [
    {
      id: uuidv4(),
      name: 'Engineering Department Only',
      description: 'Allow only Engineering department members',
      rules: [{ id: uuidv4(), leftSide: 'user.department', operator: '==', rightSide: 'Engineering' }],
      logicalOperator: 'AND',
      doorIds: [d3.id, d4.id],
    },
    {
      id: uuidv4(),
      name: 'Secret+ Clearance',
      description: 'Requires Secret or higher clearance',
      rules: [{ id: uuidv4(), leftSide: 'user.clearanceLevel', operator: '>=', rightSide: 'Secret' }],
      logicalOperator: 'AND',
      doorIds: [d7.id, d12.id],
    },
    {
      id: uuidv4(),
      name: 'Security & Active Status',
      description: 'Security department with Active status',
      rules: [
        { id: uuidv4(), leftSide: 'user.department', operator: '==', rightSide: 'Security' },
        { id: uuidv4(), leftSide: 'user.status',     operator: '==', rightSide: 'Active' },
      ],
      logicalOperator: 'AND',
      doorIds: [d1.id, d2.id],
    },
    {
      id: uuidv4(),
      name: 'Ops or Facilities',
      description: 'Operations or Facilities teams',
      rules: [
        { id: uuidv4(), leftSide: 'user.department', operator: 'IN', rightSide: ['Operations', 'Facilities'] },
      ],
      logicalOperator: 'AND',
      doorIds: [d10.id, d11.id],
    },
    {
      id: uuidv4(),
      name: 'TopSecret Executive Access',
      description: 'TopSecret Executive access only',
      rules: [
        { id: uuidv4(), leftSide: 'user.clearanceLevel', operator: '==', rightSide: 'TopSecret' },
        { id: uuidv4(), leftSide: 'user.department',     operator: '==', rightSide: 'Executive' },
      ],
      logicalOperator: 'AND',
      doorIds: [d12.id],
    },
    {
      id: 'policy-cross-clearance',
      name: 'Cross-entity Clearance Check',
      description: 'Grants access when user clearance meets door requirement',
      rules: [{
        id: 'rule-cc-1',
        leftSide: 'user.clearanceLevel',
        operator: '>=' as const,
        rightSide: 'door.requiredClearance',
      }],
      logicalOperator: 'AND',
      doorIds: [d3.id, d7.id],
    },
    {
      id: 'policy-door-group-membership',
      name: 'High Security Door Access',
      description: 'Grants access when door is in High Security Doors group',
      rules: [{
        id: 'rule-dg-1',
        leftSide: 'door',
        operator: 'IN' as const,
        rightSide: 'group.High Security Doors',
      }],
      logicalOperator: 'AND',
      doorIds: [d1.id, d4.id, d12.id],
    },
  ];

  // ── Tasks ──
  const taskStatuses: Task['status'][] = ['Open', 'InProgress', 'Blocked', 'Complete', 'Open'];
  const tasks: Task[] = Array.from({ length: 15 }, (_, i) => ({
    id: uuidv4(),
    title: [
      'Monthly fire exit inspection', 'CCTV calibration', 'Door controller firmware update',
      'Access audit Q1', 'Smoke detector test', 'Badge reader replacement – HQ',
      'Incident report review', 'Staff security training', 'Data centre cooling check',
      'Perimeter fence repair', 'Key card issuance audit', 'Emergency lighting test',
      'Lockdown drill preparation', 'Visitor access policy review', 'Annual security assessment',
    ][i],
    description: 'Scheduled task for facility maintenance and security operations.',
    siteId: sites[i % 5].id,
    zoneId: zones[i % zones.length].id,
    assignedToUserId: users[i % users.length].id,
    createdByUserId: users[0].id,
    priority: (['Low','Medium','High','Critical'] as Task['priority'][])[i % 4],
    status: taskStatuses[i % taskStatuses.length],
    dueDate: new Date(Date.now() + (i - 7) * 86400000).toISOString().split('T')[0],
    category: (['Inspection','Maintenance','Incident','Audit','Training','Other'] as Task['category'][])[i % 6],
    notes: [],
  }));

  // ── Arming Logs ──
  const armingLogs: ArmingLog[] = Array.from({ length: 10 }, (_, i) => ({
    id: uuidv4(),
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    userName: users[i % users.length].name,
    action: ['Armed', 'Disarmed', 'Partial Arm', 'Lockdown', 'Clear Alarm'][i % 5],
    siteName: sites[i % 5].name,
    result: i === 3 ? 'Denied' : 'Success',
  }));

  const store = useStore.getState();
  store.setUsers(users);
  store.setGroups(groups);
  store.setGrants(grants);
  store.setSites(sites);
  store.setZones(zones);
  store.setDoors(doors);
  store.setControllers(controllers);
  store.setPolicies(policies);
  store.setTasks(tasks);
  store.setArmingLogs(armingLogs);
}
