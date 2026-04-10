import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Group, Grant, Site, Zone, Door, Controller, Policy, Task, ArmingLog, NamedSchedule } from '../types';

interface AppState {
  users: User[];
  groups: Group[];
  grants: Grant[];
  sites: Site[];
  zones: Zone[];
  doors: Door[];
  controllers: Controller[];
  policies: Policy[];
  tasks: Task[];
  armingLogs: ArmingLog[];
  schedules: NamedSchedule[];

  // Users
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;

  // Groups
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  deleteGroup: (id: string) => void;

  // Grants
  setGrants: (grants: Grant[]) => void;
  addGrant: (grant: Grant) => void;
  updateGrant: (grant: Grant) => void;
  deleteGrant: (id: string) => void;

  // Sites
  setSites: (sites: Site[]) => void;
  addSite: (site: Site) => void;
  updateSite: (site: Site) => void;
  deleteSite: (id: string) => void;

  // Zones
  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  updateZone: (zone: Zone) => void;
  deleteZone: (id: string) => void;

  // Doors
  setDoors: (doors: Door[]) => void;
  addDoor: (door: Door) => void;
  updateDoor: (door: Door) => void;
  deleteDoor: (id: string) => void;

  // Controllers
  setControllers: (controllers: Controller[]) => void;
  addController: (controller: Controller) => void;
  updateController: (controller: Controller) => void;
  deleteController: (id: string) => void;

  // Policies
  setPolicies: (policies: Policy[]) => void;
  addPolicy: (policy: Policy) => void;
  updatePolicy: (policy: Policy) => void;
  deletePolicy: (id: string) => void;

  // Tasks
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;

  // ArmingLogs
  setArmingLogs: (logs: ArmingLog[]) => void;
  addArmingLog: (log: ArmingLog) => void;

  // Schedules
  setSchedules: (schedules: NamedSchedule[]) => void;
  addSchedule: (s: NamedSchedule) => void;
  updateSchedule: (s: NamedSchedule) => void;
  deleteSchedule: (id: string) => void;
}


export const useStore = create<AppState>()(
  persist(
    (set) => ({
      users: [],
      groups: [],
      grants: [],
      sites: [],
      zones: [],
      doors: [],
      controllers: [],
      policies: [],
      tasks: [],
      armingLogs: [],
      schedules: [],

      setUsers: (users) => set({ users }),
      addUser: (user) => set((s) => ({ users: [...s.users, user] })),
      updateUser: (user) => set((s) => ({ users: s.users.map((x) => (x.id === user.id ? user : x)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((x) => x.id !== id) })),

      setGroups: (groups) => set({ groups }),
      addGroup: (group) => set((s) => ({ groups: [...s.groups, group] })),
      updateGroup: (group) => set((s) => ({ groups: s.groups.map((x) => (x.id === group.id ? group : x)) })),
      deleteGroup: (id) => set((s) => ({ groups: s.groups.filter((x) => x.id !== id) })),

      setGrants: (grants) => set({ grants }),
      addGrant: (grant) => set((s) => ({ grants: [...s.grants, grant] })),
      updateGrant: (grant) => set((s) => ({ grants: s.grants.map((x) => (x.id === grant.id ? grant : x)) })),
      deleteGrant: (id) => set((s) => ({ grants: s.grants.filter((x) => x.id !== id) })),

      setSites: (sites) => set({ sites }),
      addSite: (site) => set((s) => ({ sites: [...s.sites, site] })),
      updateSite: (site) => set((s) => ({ sites: s.sites.map((x) => (x.id === site.id ? site : x)) })),
      deleteSite: (id) => set((s) => ({ sites: s.sites.filter((x) => x.id !== id) })),

      setZones: (zones) => set({ zones }),
      addZone: (zone) => set((s) => ({ zones: [...s.zones, zone] })),
      updateZone: (zone) => set((s) => ({ zones: s.zones.map((x) => (x.id === zone.id ? zone : x)) })),
      deleteZone: (id) => set((s) => ({ zones: s.zones.filter((x) => x.id !== id) })),

      setDoors: (doors) => set({ doors }),
      addDoor: (door) => set((s) => ({ doors: [...s.doors, door] })),
      updateDoor: (door) => set((s) => ({ doors: s.doors.map((x) => (x.id === door.id ? door : x)) })),
      deleteDoor: (id) => set((s) => ({ doors: s.doors.filter((x) => x.id !== id) })),

      setControllers: (controllers) => set({ controllers }),
      addController: (controller) => set((s) => ({ controllers: [...s.controllers, controller] })),
      updateController: (controller) => set((s) => ({ controllers: s.controllers.map((x) => (x.id === controller.id ? controller : x)) })),
      deleteController: (id) => set((s) => ({ controllers: s.controllers.filter((x) => x.id !== id) })),

      setPolicies: (policies) => set({ policies }),
      addPolicy: (policy) => set((s) => ({ policies: [...s.policies, policy] })),
      updatePolicy: (policy) => set((s) => ({ policies: s.policies.map((x) => (x.id === policy.id ? policy : x)) })),
      deletePolicy: (id) => set((s) => ({ policies: s.policies.filter((x) => x.id !== id) })),

      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      updateTask: (task) => set((s) => ({ tasks: s.tasks.map((x) => (x.id === task.id ? task : x)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),

      setArmingLogs: (armingLogs) => set({ armingLogs }),
      addArmingLog: (log) => set((s) => ({ armingLogs: [log, ...s.armingLogs] })),

      setSchedules: (schedules) => set({ schedules }),
      addSchedule: (s) => set((st) => ({ schedules: [...st.schedules, s] })),
      updateSchedule: (s) => set((st) => ({ schedules: st.schedules.map((x) => (x.id === s.id ? s : x)) })),
      deleteSchedule: (id) => set((st) => ({ schedules: st.schedules.filter((x) => x.id !== id) })),
    }),
    {
      name: 'soc-demo-store-v5',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
