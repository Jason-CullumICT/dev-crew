import { v4 as uuidv4 } from 'uuid';
import type { User, Door, Controller, Policy, ClearanceLevel } from '../types';

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
const DEPARTMENTS = ['Engineering', 'Security', 'Operations', 'Executive'];

export function generateTestData() {
  const users: User[] = [];
  const doors: Door[] = [];
  const controllers: Controller[] = [];
  const policies: Policy[] = [];

  // Generate Controllers
  const c1: Controller = { id: uuidv4(), name: 'North Wing Controller', location: 'Server Room A', doorIds: [] };
  const c2: Controller = { id: uuidv4(), name: 'South Wing Controller', location: 'Maintenance Closet B', doorIds: [] };
  const c3: Controller = { id: uuidv4(), name: 'Executive Controller', location: 'Penthouse IT Room', doorIds: [] };
  controllers.push(c1, c2, c3);

  // Generate Doors
  const doorConfigs = [
    { name: 'Engineering Lab', location: 'Level 2', ctrl: c1 },
    { name: 'Hardware Shop', location: 'Level 2', ctrl: c1 },
    { name: 'Server Room', location: 'Basement', ctrl: c1 },
    { name: 'General Office', location: 'Level 1', ctrl: c2 },
    { name: 'Operations Center', location: 'Level 3', ctrl: c2 },
    { name: 'Storage Vault', location: 'Basement', ctrl: c2 },
    { name: 'Emergency Exit North', location: 'Level 1', ctrl: c1 },
    { name: 'Emergency Exit South', location: 'Level 1', ctrl: c2 },
    { name: 'CEO Office', location: 'Level 5', ctrl: c3 },
    { name: 'Boardroom', location: 'Level 5', ctrl: c3 },
    { name: 'Executive Lounge', location: 'Level 5', ctrl: c3 },
    { name: 'Archives', location: 'Basement', ctrl: c2 },
  ];

  doorConfigs.forEach(config => {
    const door: Door = {
      id: uuidv4(),
      name: config.name,
      location: config.location,
      controllerId: config.ctrl.id,
      description: `Secure access to ${config.name}`
    };
    doors.push(door);
    config.ctrl.doorIds.push(door.id);
  });

  // Generate Users
  for (let i = 0; i < 30; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i + 5) % LAST_NAMES.length];
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    
    let clearance: ClearanceLevel = 'Unclassified';
    const rand = Math.random();
    if (rand > 0.9) clearance = 'TopSecret';
    else if (rand > 0.7) clearance = 'Secret';
    else if (rand > 0.4) clearance = 'Confidential';

    users.push({
      id: uuidv4(),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@enterprise.com`,
      department: dept,
      role: i % 5 === 0 ? 'Manager' : 'Staff',
      clearanceLevel: clearance,
      customAttributes: dept === 'Engineering' ? { 'specialty': i % 2 === 0 ? 'Software' : 'Hardware' } : {}
    });
  }

  // Generate Policies
  
  // 1. Simple Department Check (Engineering Lab)
  const p1: Policy = {
    id: uuidv4(),
    name: 'Engineering Only',
    description: 'Only engineers can enter the lab',
    logicalOperator: 'AND',
    doorIds: [doors[0].id, doors[1].id],
    rules: [{
      id: uuidv4(),
      attribute: 'user.department',
      operator: '==',
      value: 'Engineering'
    }]
  };

  // 2. Clearance Level Check (Archives)
  const p2: Policy = {
    id: uuidv4(),
    name: 'Confidential Access',
    description: 'Requires at least Confidential clearance',
    logicalOperator: 'AND',
    doorIds: [doors[11].id],
    rules: [{
      id: uuidv4(),
      attribute: 'user.clearanceLevel',
      operator: '>=',
      value: 'Confidential'
    }]
  };

  // 3. Combined Department + Clearance (Server Room)
  const p3: Policy = {
    id: uuidv4(),
    name: 'Secure Tech Ops',
    description: 'Security or Engineering with Secret clearance',
    logicalOperator: 'OR',
    doorIds: [doors[2].id],
    rules: [
      {
        id: uuidv4(),
        attribute: 'user.clearanceLevel',
        operator: '>=',
        value: 'TopSecret'
      },
      {
        id: uuidv4(),
        attribute: 'user.department',
        operator: 'IN',
        value: ['Security', 'Engineering']
      }
    ]
  };

  // 4. Multi-Department Access (General Office)
  const p4: Policy = {
    id: uuidv4(),
    name: 'General Access',
    description: 'All departments except external contractors',
    logicalOperator: 'AND',
    doorIds: [doors[3].id, doors[6].id, doors[7].id],
    rules: [{
      id: uuidv4(),
      attribute: 'user.department',
      operator: 'IN',
      value: ['Engineering', 'Security', 'Operations', 'Executive']
    }]
  };

  // 5. Executive Access (Level 5)
  const p5: Policy = {
    id: uuidv4(),
    name: 'Executive Lockdown',
    description: 'Executive department or TopSecret clearance',
    logicalOperator: 'OR',
    doorIds: [doors[8].id, doors[9].id, doors[10].id],
    rules: [
      {
        id: uuidv4(),
        attribute: 'user.department',
        operator: '==',
        value: 'Executive'
      },
      {
        id: uuidv4(),
        attribute: 'user.clearanceLevel',
        operator: '==',
        value: 'TopSecret'
      }
    ]
  };

  policies.push(p1, p2, p3, p4, p5);

  return { users, doors, controllers, policies };
}
