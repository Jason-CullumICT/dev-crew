import { v4 as uuidv4 } from 'uuid';
import type { User, Group, Grant, Site, Zone, Door, Controller, Policy, Task, ArmingLog } from '../types';
import { useStore } from '../store/store';

export function generateTestData() {
  // ── Sites ──
  const s1 = uuidv4(), s2 = uuidv4(), s3 = uuidv4(), s4 = uuidv4(), s5 = uuidv4();
  const sites: Site[] = [
    { id: s1, name: 'HQ Office', address: '1 Corporate Drive, Auckland', timezone: 'Pacific/Auckland', status: 'Armed', assignedManagerIds: [], zones: [] },
    { id: s2, name: 'Regional Office', address: '45 Regional Blvd, Wellington', timezone: 'Pacific/Auckland', status: 'Armed', assignedManagerIds: [], zones: [] },
    { id: s3, name: 'Data Centre Alpha', address: '99 Server Lane, Christchurch', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [] },
    { id: s4, name: 'Central Warehouse', address: '200 Industrial Way, Hamilton', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [] },
    { id: s5, name: 'Executive Suite', address: '10 Boardroom St, Auckland', timezone: 'Pacific/Auckland', status: 'Disarmed', assignedManagerIds: [], zones: [] },
  ];

  // ── Zones ──
  const zones: Zone[] = [];
  function zone(siteId: string, name: string, type: Zone['type'], status: Zone['status']): Zone {
    const z: Zone = { id: uuidv4(), siteId, name, type, status, doorIds: [] };
    zones.push(z);
    return z;
  }
  const z_hq_peri = zone(s1, 'HQ Perimeter', 'Perimeter', 'Armed');
  const z_hq_int  = zone(s1, 'HQ Interior', 'Interior', 'Armed');
  const z_hq_sec  = zone(s1, 'HQ Secure Lab', 'Secure', 'Armed');
  const z_reg_peri = zone(s2, 'Regional Perimeter', 'Perimeter', 'Armed');
  const z_reg_int  = zone(s2, 'Regional Interior', 'Interior', 'Disarmed');
  const z_reg_pub  = zone(s2, 'Regional Lobby', 'Public', 'Disarmed');
  const z_dc_sec   = zone(s3, 'DC Secure Zone', 'Secure', 'Armed');
  const z_dc_int   = zone(s3, 'DC Operations', 'Interior', 'Disarmed');
  const z_dc_emg   = zone(s3, 'DC Emergency', 'Emergency', 'Disarmed');
  const z_wh_peri  = zone(s4, 'Warehouse Perimeter', 'Perimeter', 'Disarmed');
  const z_wh_int   = zone(s4, 'Warehouse Floor', 'Interior', 'Disarmed');
  const z_ex_sec   = zone(s5, 'Executive Secure', 'Secure', 'Disarmed');
  const z_ex_pub   = zone(s5, 'Executive Lobby', 'Public', 'Disarmed');

  // ── Controllers ──
  const ctrl1: Controller = { id: uuidv4(), name: 'HQ-CTRL-01', location: 'HQ Server Room', siteId: s1, doorIds: [] };
  const ctrl2: Controller = { id: uuidv4(), name: 'DC-CTRL-01', location: 'DC Control Room', siteId: s3, doorIds: [] };
  const ctrl3: Controller = { id: uuidv4(), name: 'REG-CTRL-01', location: 'Regional IT Closet', siteId: s2, doorIds: [] };
  const controllers: Controller[] = [ctrl1, ctrl2, ctrl3];

  // ── Doors ──
  function door(name: string, location: string, siteId: string, zoneId: string, controllerId: string, lockState: Door['lockState'] = 'Locked'): Door {
    const d: Door = { id: uuidv4(), name, location, siteId, zoneId, controllerId, description: `${name} access point`, lockState };
    ctrl1.doorIds = ctrl1.siteId === siteId ? [...ctrl1.doorIds, d.id] : ctrl1.doorIds;
    ctrl2.doorIds = ctrl2.siteId === siteId ? [...ctrl2.doorIds, d.id] : ctrl2.doorIds;
    ctrl3.doorIds = ctrl3.siteId === siteId ? [...ctrl3.doorIds, d.id] : ctrl3.doorIds;
    return d;
  }
  const d1  = door('HQ Main Entrance', 'Ground Floor', s1, z_hq_peri.id, ctrl1.id, 'Locked');
  const d2  = door('HQ Side Gate', 'Car Park', s1, z_hq_peri.id, ctrl1.id, 'Locked');
  const d3  = door('HQ Lab Door', 'Level 3', s1, z_hq_sec.id, ctrl1.id, 'Locked');
  const d4  = door('HQ Server Room', 'Basement', s1, z_hq_int.id, ctrl1.id, 'Locked');
  const d5  = door('Regional Front Door', 'Ground Floor', s2, z_reg_peri.id, ctrl3.id, 'Unlocked');
  const d6  = door('Regional Meeting Rooms', 'Level 2', s2, z_reg_int.id, ctrl3.id, 'Locked');
  const d7  = door('DC Primary Access', 'Entry Lobby', s3, z_dc_sec.id, ctrl2.id, 'Locked');
  const d8  = door('DC Operations Room', 'Level 1', s3, z_dc_int.id, ctrl2.id, 'Locked');
  const d9  = door('DC Emergency Exit', 'East Wing', s3, z_dc_emg.id, ctrl2.id, 'Locked');
  const d10 = door('Warehouse Gate A', 'North Entry', s4, z_wh_peri.id, ctrl1.id, 'Unlocked');
  const d11 = door('Warehouse Floor Access', 'Loading Bay', s4, z_wh_int.id, ctrl1.id, 'Locked');
  const d12 = door('Executive Suite Entry', 'Level 20', s5, z_ex_sec.id, ctrl1.id, 'Locked');
  const doors: Door[] = [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12];

  // Assign doors to zones
  z_hq_peri.doorIds = [d1.id, d2.id];
  z_hq_sec.doorIds  = [d3.id];
  z_hq_int.doorIds  = [d4.id];
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
  const g1: Grant = { id: uuidv4(), name: 'Global Admin', description: 'Full access to all actions', scope: 'global', actions: ['arm','disarm','unlock','lockdown','view_logs','manage_users','manage_tasks','override'] };
  const g2: Grant = { id: uuidv4(), name: 'Global View', description: 'View logs globally', scope: 'global', actions: ['view_logs'] };
  const g3: Grant = { id: uuidv4(), name: 'HQ Arm/Disarm', description: 'Arm and disarm HQ', scope: 'site', targetId: s1, actions: ['arm','disarm'] };
  const g4: Grant = { id: uuidv4(), name: 'HQ Unlock', description: 'Unlock HQ doors', scope: 'site', targetId: s1, actions: ['unlock'] };
  const g5: Grant = { id: uuidv4(), name: 'DC Secure Access', description: 'Full DC access', scope: 'site', targetId: s3, actions: ['arm','disarm','unlock','lockdown','override'] };
  const g6: Grant = { id: uuidv4(), name: 'Regional Operator', description: 'Operate regional office', scope: 'site', targetId: s2, actions: ['arm','disarm','unlock'] };
  const g7: Grant = { id: uuidv4(), name: 'Warehouse Access', description: 'Warehouse arm/unlock', scope: 'site', targetId: s4, actions: ['arm','disarm','unlock'] };
  const g8: Grant = { id: uuidv4(), name: 'Task Manager', description: 'Create and manage tasks globally', scope: 'global', actions: ['manage_tasks'] };
  const grants: Grant[] = [g1, g2, g3, g4, g5, g6, g7, g8];

  // ── Groups ──
  const grp_exec: Group   = { id: uuidv4(), name: 'Executives', description: 'Executive leadership team', memberUserIds: [], inheritedPermissions: [g1.id] };
  const grp_sec: Group    = { id: uuidv4(), name: 'Senior Security', description: 'Senior security officers', memberUserIds: [], inheritedPermissions: [g3.id, g4.id, g5.id, g6.id, g7.id] };
  const grp_ops: Group    = { id: uuidv4(), name: 'Operations Team', description: 'General operations staff', memberUserIds: [], inheritedPermissions: [g2.id, g8.id] };
  const grp_eng: Group    = { id: uuidv4(), name: 'Engineering Lead', description: 'Engineering department leads', memberUserIds: [], inheritedPermissions: [g4.id, g5.id] };
  const grp_fac: Group    = { id: uuidv4(), name: 'Facilities', description: 'Facilities management', memberUserIds: [], inheritedPermissions: [g3.id, g7.id] };
  const grp_ro: Group     = { id: uuidv4(), name: 'Read-Only', description: 'Audit/read-only access', memberUserIds: [], inheritedPermissions: [g2.id] };
  const groups: Group[] = [grp_exec, grp_sec, grp_ops, grp_eng, grp_fac, grp_ro];

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
      dept === 'Executive' ? [grp_exec.id] :
      dept === 'Security' ? [grp_sec.id] :
      dept === 'Operations' ? [grp_ops.id] :
      dept === 'Engineering' ? [grp_eng.id] :
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

  // Add users to groups
  users.forEach((u) => {
    u.groupIds.forEach((gid) => {
      const g = groups.find((g) => g.id === gid);
      if (g) g.memberUserIds.push(u.id);
    });
  });

  // Add a few read-only users
  [users[20], users[21], users[22]].forEach((u) => {
    u.groupIds.push(grp_ro.id);
    grp_ro.memberUserIds.push(u.id);
  });

  // Assign managers
  sites[0].assignedManagerIds = [users[0].id, users[1].id];
  sites[1].assignedManagerIds = [users[5].id];
  sites[2].assignedManagerIds = [users[10].id];

  // ── ABAC Policies ──
  const policies: Policy[] = [
    {
      id: uuidv4(),
      name: 'Engineering Department Only',
      description: 'Allow only Engineering department members',
      rules: [{ id: uuidv4(), attribute: 'department', operator: '==', value: 'Engineering' }],
      logicalOperator: 'AND',
      doorIds: [d3.id, d4.id],
    },
    {
      id: uuidv4(),
      name: 'Secret+ Clearance',
      description: 'Requires Secret or higher clearance',
      rules: [{ id: uuidv4(), attribute: 'clearanceLevel', operator: '>=', value: 'Secret' }],
      logicalOperator: 'AND',
      doorIds: [d7.id, d12.id],
    },
    {
      id: uuidv4(),
      name: 'Security & Active Status',
      description: 'Security department with Active status',
      rules: [
        { id: uuidv4(), attribute: 'department', operator: '==', value: 'Security' },
        { id: uuidv4(), attribute: 'status', operator: '==', value: 'Active' },
      ],
      logicalOperator: 'AND',
      doorIds: [d1.id, d2.id],
    },
    {
      id: uuidv4(),
      name: 'Ops or Facilities',
      description: 'Operations or Facilities teams',
      rules: [
        { id: uuidv4(), attribute: 'department', operator: 'IN', value: ['Operations', 'Facilities'] },
      ],
      logicalOperator: 'AND',
      doorIds: [d10.id, d11.id],
    },
    {
      id: uuidv4(),
      name: 'TopSecret Executive Access',
      description: 'TopSecret Executive access only',
      rules: [
        { id: uuidv4(), attribute: 'clearanceLevel', operator: '==', value: 'TopSecret' },
        { id: uuidv4(), attribute: 'department', operator: '==', value: 'Executive' },
      ],
      logicalOperator: 'AND',
      doorIds: [d12.id],
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
