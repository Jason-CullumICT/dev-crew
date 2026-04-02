import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  User, Group, Grant, Site, Zone, Door, Controller, Policy, Task, ArmingLog 
} from '../types';

interface SOCState {
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
  
  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  deleteGroup: (id: string) => void;
  
  setGrants: (grants: Grant[]) => void;
  addGrant: (grant: Grant) => void;
  updateGrant: (grant: Grant) => void;
  deleteGrant: (id: string) => void;
  
  setSites: (sites: Site[]) => void;
  addSite: (site: Site) => void;
  updateSite: (site: Site) => void;
  deleteSite: (id: string) => void;
  
  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  updateZone: (zone: Zone) => void;
  deleteZone: (id: string) => void;

  setDoors: (doors: Door[]) => void;
  addDoor: (door: Door) => void;
  updateDoor: (door: Door) => void;
  deleteDoor: (id: string) => void;
  
  setControllers: (controllers: Controller[]) => void;
  addController: (controller: Controller) => void;
  updateController: (controller: Controller) => void;
  deleteController: (id: string) => void;
  
  setPolicies: (policies: Policy[]) => void;
  addPolicy: (policy: Policy) => void;
  updatePolicy: (policy: Policy) => void;
  deletePolicy: (id: string) => void;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;

  addArmingLog: (log: ArmingLog) => void;
  clearAll: () => void;
}

export const useStore = create<SOCState>()(
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

      setUsers: (users) => set({ users }),
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (user) => set((state) => ({ users: state.users.map((u) => u.id === user.id ? user : u) })),
      deleteUser: (id) => set((state) => ({ users: state.users.filter((u) => u.id !== id) })),

      setGroups: (groups) => set({ groups }),
      addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
      updateGroup: (group) => set((state) => ({ groups: state.groups.map((g) => g.id === group.id ? group : g) })),
      deleteGroup: (id) => set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

      setGrants: (grants) => set({ grants }),
      addGrant: (grant) => set((state) => ({ grants: [...state.grants, grant] })),
      updateGrant: (grant) => set((state) => ({ grants: state.grants.map((g) => g.id === grant.id ? grant : g) })),
      deleteGrant: (id) => set((state) => ({ grants: state.grants.filter((g) => g.id !== id) })),

      setSites: (sites) => set({ sites }),
      addSite: (site) => set((state) => ({ sites: [...state.sites, site] })),
      updateSite: (site) => set((state) => ({ sites: state.sites.map((s) => s.id === site.id ? site : s) })),
      deleteSite: (id) => set((state) => ({ sites: state.sites.filter((s) => s.id !== id) })),

      setZones: (zones) => set({ zones }),
      addZone: (zone) => set((state) => ({ zones: [...state.zones, zone] })),
      updateZone: (zone) => set((state) => ({ zones: state.zones.map((z) => z.id === zone.id ? zone : z) })),
      deleteZone: (id) => set((state) => ({ zones: state.zones.filter((z) => z.id !== id) })),

      setDoors: (doors) => set({ doors }),
      addDoor: (door) => set((state) => ({ doors: [...state.doors, door] })),
      updateDoor: (door) => set((state) => ({ doors: state.doors.map((d) => d.id === door.id ? door : d) })),
      deleteDoor: (id) => set((state) => ({ doors: state.doors.filter((d) => d.id !== id) })),

      setControllers: (controllers) => set({ controllers }),
      addController: (controller) => set((state) => ({ controllers: [...state.controllers, controller] })),
      updateController: (controller) => set((state) => ({ controllers: state.controllers.map((c) => c.id === controller.id ? controller : c) })),
      deleteController: (id) => set((state) => ({ controllers: state.controllers.filter((c) => c.id !== id) })),

      setPolicies: (policies) => set({ policies }),
      addPolicy: (policy) => set((state) => ({ policies: [...state.policies, policy] })),
      updatePolicy: (policy) => set((state) => ({ policies: state.policies.map((p) => p.id === policy.id ? policy : p) })),
      deletePolicy: (id) => set((state) => ({ policies: state.policies.filter((p) => p.id !== id) })),

      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (task) => set((state) => ({ tasks: state.tasks.map((t) => t.id === task.id ? task : t) })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      addArmingLog: (log) => set((state) => ({ armingLogs: [log, ...state.armingLogs].slice(0, 20) })),

      clearAll: () => set({ users: [], groups: [], grants: [], sites: [], zones: [], doors: [], controllers: [], policies: [], tasks: [], armingLogs: [] }),
    }),
    {
      name: 'abac-soc-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
