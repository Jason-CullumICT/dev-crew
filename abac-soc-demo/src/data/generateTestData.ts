import { v4 as uuidv4 } from 'uuid';
import type { 
  User, Group, Grant, Site, Zone, Door, Controller, Policy, Task, ClearanceLevel 
} from '../types';

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const DEPARTMENTS = ['Engineering', 'Security', 'Operations', 'Executive', 'Facilities'];

export function generateTestData() {
  const users: User[] = [];
  const groups: Group[] = [];
  const grants: Grant[] = [];
  const sites: Site[] = [];
  const zones: Zone[] = [];
  const doors: Door[] = [];
  const controllers: Controller[] = [];
  const policies: Policy[] = [];
  const tasks: Task[] = [];

  // Generate Sites
  const siteConfigs = [
    { name: 'HQ Office', address: '100 Main St', tz: 'America/New_York' },
    { name: 'Regional Office', address: '200 Broad St', tz: 'America/Chicago' },
    { name: 'Data Centre Alpha', address: '99 Tech Way', tz: 'America/Denver' },
    { name: 'Central Warehouse', address: '500 Logistics Blvd', tz: 'America/Los_Angeles' },
    { name: 'Executive Suite', address: '1 Penthouse Ave', tz: 'America/New_York' },
  ];

  siteConfigs.forEach(s => {
    sites.push({
      id: uuidv4(),
      name: s.name,
      address: s.address,
      timezone: s.tz,
      status: 'Disarmed',
      assignedManagerIds: [],
      zones: []
    });
  });

  // Generate Zones
  sites.forEach(site => {
    const numZones = Math.floor(Math.random() * 3) + 3; // 3 to 5 zones
    for (let i = 0; i < numZones; i++) {
      const zone: Zone = {
        id: uuidv4(),
        siteId: site.id,
        name: `${site.name} Zone ${i + 1}`,
        type: i === 0 ? 'Perimeter' : (i === 1 ? 'Interior' : 'Secure'),
        status: 'Disarmed',
        doorIds: []
      };
      zones.push(zone);
      site.zones.push(zone.id);
    }
  });

  // Generate Controllers & Doors
  for (let i = 0; i < 3; i++) {
    controllers.push({
      id: uuidv4(),
      name: `Controller ${i + 1}`,
      location: `Server Room ${i + 1}`,
      siteId: sites[i % sites.length].id,
      doorIds: []
    });
  }

  for (let i = 0; i < 12; i++) {
    const site = sites[i % sites.length];
    const zoneId = site.zones[i % site.zones.length];
    const ctrl = controllers[i % controllers.length];
    const door: Door = {
      id: uuidv4(),
      name: `Door ${i + 1} - ${site.name}`,
      location: `Level ${Math.floor(Math.random() * 5) + 1}`,
      siteId: site.id,
      zoneId: zoneId,
      controllerId: ctrl.id,
      description: `Access to ${site.name}`,
      lockState: 'Locked'
    };
    doors.push(door);
    ctrl.doorIds.push(door.id);
    const zone = zones.find(z => z.id === zoneId);
    if (zone) zone.doorIds.push(door.id);
  }

  // Generate Grants
  const globalArmGrant: Grant = { id: uuidv4(), name: 'Global Arm', description: 'Arm any site', scope: 'global', actions: ['arm', 'disarm', 'unlock', 'view_logs'] };
  const globalAdminGrant: Grant = { id: uuidv4(), name: 'Global Admin', description: 'Full access', scope: 'global', actions: ['arm', 'disarm', 'unlock', 'lockdown', 'view_logs', 'manage_users', 'manage_tasks', 'override'] };
  const hqArmGrant: Grant = { id: uuidv4(), name: 'HQ Arm', description: 'Arm HQ', scope: 'site', targetId: sites[0].id, actions: ['arm', 'disarm', 'unlock'] };
  const hqTasksGrant: Grant = { id: uuidv4(), name: 'HQ Tasks', description: 'Manage HQ tasks', scope: 'site', targetId: sites[0].id, actions: ['manage_tasks'] };
  const dcArmGrant: Grant = { id: uuidv4(), name: 'DC Arm', description: 'Arm Data Centre', scope: 'site', targetId: sites[2].id, actions: ['arm', 'disarm', 'unlock'] };
  
  grants.push(globalArmGrant, globalAdminGrant, hqArmGrant, hqTasksGrant, dcArmGrant);

  // Generate Groups
  const execGroup: Group = { id: uuidv4(), name: 'Executives', description: 'Exec team', memberUserIds: [], inheritedPermissions: [globalAdminGrant.id] };
  const secGroup: Group = { id: uuidv4(), name: 'Senior Security', description: 'Security team', memberUserIds: [], inheritedPermissions: [globalArmGrant.id] };
  const opsGroup: Group = { id: uuidv4(), name: 'Operations Team', description: 'Ops team', memberUserIds: [], inheritedPermissions: [hqArmGrant.id, dcArmGrant.id] };
  const facilGroup: Group = { id: uuidv4(), name: 'Facilities', description: 'Facilities team', memberUserIds: [], inheritedPermissions: [hqTasksGrant.id] };
  
  groups.push(execGroup, secGroup, opsGroup, facilGroup);

  // Generate Users
  for (let i = 0; i < 30; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    let clearance: ClearanceLevel = 'Unclassified';
    const rand = Math.random();
    if (rand > 0.9) clearance = 'TopSecret';
    else if (rand > 0.7) clearance = 'Secret';
    else if (rand > 0.4) clearance = 'Confidential';

    const user: User = {
      id: uuidv4(),
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i + 5) % LAST_NAMES.length]}`,
      email: `${FIRST_NAMES[i % FIRST_NAMES.length].toLowerCase()}.${LAST_NAMES[(i + 5) % LAST_NAMES.length].toLowerCase()}@soc.com`,
      department: dept,
      role: i % 5 === 0 ? 'Manager' : 'Staff',
      clearanceLevel: clearance,
      status: 'Active',
      customAttributes: {},
      grantedPermissions: [],
      groupIds: []
    };

    if (dept === 'Executive') {
      user.groupIds.push(execGroup.id);
      execGroup.memberUserIds.push(user.id);
    } else if (dept === 'Security') {
      user.groupIds.push(secGroup.id);
      secGroup.memberUserIds.push(user.id);
    } else if (dept === 'Operations') {
      user.groupIds.push(opsGroup.id);
      opsGroup.memberUserIds.push(user.id);
    } else if (dept === 'Facilities') {
      user.groupIds.push(facilGroup.id);
      facilGroup.memberUserIds.push(user.id);
    }

    // Give a direct grant to the first user for testing
    if (i === 0) {
      user.grantedPermissions.push(globalAdminGrant.id);
    }

    users.push(user);
  }

  // Generate Policies
  const p1: Policy = {
    id: uuidv4(),
    name: 'General Access',
    description: 'All active users',
    logicalOperator: 'AND',
    doorIds: [doors[0].id, doors[1].id, doors[2].id],
    rules: [{ id: uuidv4(), attribute: 'user.status', operator: '==', value: 'Active' }]
  };
  const p2: Policy = {
    id: uuidv4(),
    name: 'Secure Area',
    description: 'Secret clearance required',
    logicalOperator: 'AND',
    doorIds: [doors[3].id, doors[4].id],
    rules: [{ id: uuidv4(), attribute: 'user.clearanceLevel', operator: '>=', value: 'Secret' }]
  };
  const p3: Policy = {
    id: uuidv4(),
    name: 'Engineering Lab',
    description: 'Engineers only',
    logicalOperator: 'AND',
    doorIds: [doors[5].id],
    rules: [{ id: uuidv4(), attribute: 'user.department', operator: '==', value: 'Engineering' }]
  };
  
  policies.push(p1, p2, p3);

  // Generate Tasks
  for (let i = 0; i < 15; i++) {
    tasks.push({
      id: uuidv4(),
      title: `Task ${i + 1} - ${i % 2 === 0 ? 'Maintenance' : 'Inspection'}`,
      description: 'Routine check',
      siteId: sites[i % sites.length].id,
      assignedToUserId: users[i].id,
      createdByUserId: users[0].id,
      priority: i % 4 === 0 ? 'High' : 'Medium',
      status: i % 3 === 0 ? 'Complete' : 'Open',
      dueDate: new Date(Date.now() + i * 86400000).toISOString(),
      category: i % 2 === 0 ? 'Maintenance' : 'Inspection',
      notes: []
    });
  }

  // Set 2 sites to Armed
  sites[0].status = 'Armed';
  sites[1].status = 'Armed';

  return { users, groups, grants, sites, zones, doors, controllers, policies, tasks };
}
